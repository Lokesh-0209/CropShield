import base64
import os
from typing import Any, Callable, Dict, Optional
import httpx
from fastapi import HTTPException, status
from app.models.case import CaseStatus
from app.schemas.ai import AIInferenceResult
from app.schemas.case import CaseAnalysisRequest
from app.schemas.risk import RiskAnalysisRequest, RiskAnalysisResponse
from app.services.ai_inference_service import (
    AIInferenceService,
    ModelNotAvailableError,
    get_ai_inference_service,
)
from app.services.case_service import CaseService, get_case_service
from app.services.image_preprocessor import ImageValidationError
from app.services.outbreak_service import haversine_distance_km
from app.services.risk_service import RiskService, get_risk_service


class CaseAnalysisService:
    """
    Orchestration service that connects AI computer vision inference
    and deterministic risk assessment into a unified case-analysis pipeline.
    """

    def __init__(
        self,
        case_service: Optional[CaseService] = None,
        ai_service: Optional[AIInferenceService] = None,
        risk_service: Optional[RiskService] = None,
        image_loader: Optional[Callable[[str], bytes]] = None,
    ):
        self._case_service = case_service
        self._ai_service = ai_service
        self._risk_service = risk_service
        self._image_loader = image_loader

    @property
    def case_service(self) -> CaseService:
        if self._case_service is not None:
            return self._case_service
        return get_case_service()

    @property
    def ai_service(self) -> AIInferenceService:
        if self._ai_service is not None:
            return self._ai_service
        return get_ai_inference_service()

    @property
    def risk_service(self) -> RiskService:
        if self._risk_service is not None:
            return self._risk_service
        return get_risk_service()

    def load_image_bytes(self, image_source: str) -> bytes:
        """
        Loads raw image bytes from the case's configured image source.
        Supports custom image_loader, local file path, remote HTTP/HTTPS URL, and base64 data URIs.
        """
        if self._image_loader is not None:
            return self._image_loader(image_source)

        source = (image_source or "").strip()
        if not source:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty image source path or URL.",
            )

        # 1. Local file path
        if os.path.exists(source):
            try:
                with open(source, "rb") as f:
                    return f.read()
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to read image from local path '{source}': {str(exc)}",
                )

        # 2. Remote HTTP/HTTPS URL
        if source.startswith(("http://", "https://")):
            try:
                with httpx.Client(timeout=10.0) as client:
                    resp = client.get(source)
                    if resp.status_code != 200:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Failed to download image from '{source}': HTTP {resp.status_code}",
                        )
                    return resp.content
            except HTTPException:
                raise
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to fetch image from URL '{source}': {str(exc)}",
                )

        # 3. Base64 Data URL (data:image/...)
        if source.startswith("data:image/"):
            try:
                _, data = source.split(",", 1)
                return base64.b64decode(data)
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to decode base64 image data: {str(exc)}",
                )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image source '{source}' could not be resolved or accessed.",
        )

    def _count_nearby_verified_cases(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 5.0,
    ) -> int:
        """
        Queries verified cases in Supabase and counts how many are located
        within radius_km of the given geographic coordinates.
        """
        client = self.case_service.db
        if client is None:
            return 0

        try:
            response = (
                client.table("cases")
                .select("latitude, longitude, status")
                .eq("status", CaseStatus.VERIFIED.value)
                .execute()
            )
            verified = response.data or []
            count = 0
            for item in verified:
                lat = float(item["latitude"])
                lon = float(item["longitude"])
                if haversine_distance_km(latitude, longitude, lat, lon) <= radius_km:
                    count += 1
            return count
        except Exception:
            return 0

    def analyze_case(
        self,
        case_id: str,
        analysis_req: CaseAnalysisRequest,
    ) -> Dict[str, Any]:
        """
        Executes the unified case-analysis workflow:
        1. Loads the case by ID (404 if missing).
        2. Validates that case is in PENDING_ANALYSIS (409 if not).
        3. Validates that case has an image source configured (400 if missing).
        4. Loads image bytes from image_url.
        5. Executes AIInferenceService.infer() (raises 503 if ModelNotAvailableError, 400 if ImageValidationError).
        6. Extracts disease and confidence.
        7. Computes risk using RiskService with case crop, growth_stage, and environmental parameters.
        8. Saves disease, confidence, risk_score, risk_level and updates status to ANALYZED.
        9. Returns the updated case record.
        """
        client = self.case_service._ensure_db_client()

        # Step 1: Load existing case
        case = self.case_service.get_case_by_id(case_id)
        if case is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Case with ID '{case_id}' not found.",
            )

        # Step 2: Validate status == PENDING_ANALYSIS
        current_status = case.get("status")
        if current_status != CaseStatus.PENDING_ANALYSIS.value:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Case status is '{current_status}'. Analysis can only be performed when status is '{CaseStatus.PENDING_ANALYSIS.value}'.",
            )

        # Step 3 & 4: Require image source & load image bytes
        image_url = case.get("image_url")
        if not image_url or not str(image_url).strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Case does not have an image configured for AI analysis.",
            )

        image_bytes = self.load_image_bytes(str(image_url))

        # Step 5: AI inference (raises ModelNotAvailableError or ImageValidationError on failure)
        try:
            ai_result = self.ai_service.infer(image_bytes)
        except ModelNotAvailableError as exc:
            # Model is not available; do NOT fake prediction; do NOT update case status
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(exc),
            )
        except ImageValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image validation failed: {str(exc)}",
            )

        # Step 6 & 7: Risk calculation using existing RiskService
        if analysis_req.nearby_verified_cases is not None:
            nearby_cases = analysis_req.nearby_verified_cases
        else:
            nearby_cases = self._count_nearby_verified_cases(
                latitude=float(case["latitude"]),
                longitude=float(case["longitude"]),
            )

        risk_request = RiskAnalysisRequest(
            temperature=analysis_req.temperature,
            humidity=analysis_req.humidity,
            rainfall=analysis_req.rainfall,
            crop=case["crop"],
            growth_stage=case["growth_stage"],
            nearby_verified_cases=nearby_cases,
        )
        risk_result = self.risk_service.calculate_risk(risk_request)

        # Step 8 & 9: Persist analysis results & change status to ANALYZED
        update_payload: Dict[str, Any] = {
            "disease": ai_result.disease,
            "confidence": ai_result.confidence,
            "risk_score": float(risk_result.risk_score),
            "risk_level": risk_result.risk_level.value,
            "status": CaseStatus.ANALYZED.value,
        }

        try:
            response = client.table("cases").update(update_payload).eq("id", case_id).execute()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database update failed: {str(exc)}",
            )

        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database update failed to return updated record.",
            )

        return response.data[0]


def get_case_analysis_service() -> CaseAnalysisService:
    """Dependency provider for CaseAnalysisService."""
    return CaseAnalysisService()
