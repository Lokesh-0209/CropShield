from datetime import datetime, timezone
import uuid
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from supabase import Client
from app.db.supabase import get_supabase_client
from app.models.case import CaseStatus, VerificationStatus, ALLOWED_TRANSITIONS
from app.schemas.case import CaseCreate, CaseStatusUpdate, CaseVerificationRequest


_DEFAULT_CLIENT = object()


class CaseService:
    """Service handling business logic, lifecycle transitions, and persistence for crop disease cases."""

    def __init__(self, db_client: Any = _DEFAULT_CLIENT):
        if db_client is _DEFAULT_CLIENT:
            self._db_client = get_supabase_client()
        else:
            self._db_client = db_client

    @property
    def db(self) -> Optional[Client]:
        return self._db_client

    def _ensure_db_client(self) -> Client:
        client = self.db
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service not configured. Please set SUPABASE_URL and SUPABASE_KEY in .env.",
            )
        return client

    def create_case(self, case_in: CaseCreate) -> Dict[str, Any]:
        """
        Creates a new crop disease case record and persists it to Supabase.
        Initial status is set to PENDING_ANALYSIS.
        """
        client = self._ensure_db_client()

        case_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()

        record = {
            "id": case_id,
            "crop": case_in.crop,
            "growth_stage": case_in.growth_stage,
            "latitude": case_in.latitude,
            "longitude": case_in.longitude,
            "location_name": case_in.location_name,
            "symptoms": case_in.symptoms,
            "image_url": case_in.image_url,
            "disease": None,
            "confidence": None,
            "risk_score": None,
            "risk_level": None,
            "status": CaseStatus.PENDING_ANALYSIS.value,
            "created_at": created_at,
            "verified_at": None,
            "officer_note": None,
        }

        try:
            response = client.table("cases").insert(record).execute()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database insertion failed: {str(exc)}",
            )

        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database failed to return inserted case record.",
            )

        inserted = response.data[0]
        return {
            "id": inserted.get("id", case_id),
            "status": inserted.get("status", CaseStatus.PENDING_ANALYSIS.value),
            "created_at": inserted.get("created_at", created_at),
        }

    def get_case_by_id(self, case_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves the complete state of a single case by its ID.
        Returns None if the case does not exist.
        """
        client = self._ensure_db_client()

        try:
            response = client.table("cases").select("*").eq("id", case_id).execute()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database query failed: {str(exc)}",
            )

        if not response.data or len(response.data) == 0:
            return None

        return response.data[0]

    def list_cases(
        self,
        status_filter: Optional[CaseStatus] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Returns a paginated list of cases, optionally filtered by status.
        """
        client = self._ensure_db_client()

        try:
            query = client.table("cases").select("*")
            if status_filter is not None:
                query = query.eq("status", status_filter.value)

            query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
            response = query.execute()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database query failed: {str(exc)}",
            )

        return {
            "items": response.data or [],
            "limit": limit,
            "offset": offset,
        }

    def update_case_status(
        self,
        case_id: str,
        status_update: CaseStatusUpdate,
    ) -> Dict[str, Any]:
        """
        Performs a validated lifecycle status transition on a case.
        Rejects invalid transitions with HTTP 409 Conflict.
        """
        client = self._ensure_db_client()

        existing_case = self.get_case_by_id(case_id)
        if existing_case is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Case with ID '{case_id}' not found.",
            )

        current_status_raw = existing_case.get("status")
        try:
            current_status = CaseStatus(current_status_raw)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Case currently has unrecognized status: '{current_status_raw}'.",
            )

        target_status = status_update.status
        allowed_targets = ALLOWED_TRANSITIONS.get(current_status, set())

        if target_status not in allowed_targets:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Invalid status transition from '{current_status.value}' to '{target_status.value}'.",
            )

        update_payload: Dict[str, Any] = {
            "status": target_status.value,
        }

        # Set verified_at on transition to VERIFIED if not already set
        if target_status == CaseStatus.VERIFIED:
            if not existing_case.get("verified_at"):
                update_payload["verified_at"] = datetime.now(timezone.utc).isoformat()

        # Preserve / update officer_note if supplied in the request
        if status_update.officer_note is not None:
            update_payload["officer_note"] = status_update.officer_note

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

    def verify_case(
        self,
        case_id: str,
        verification: CaseVerificationRequest,
    ) -> Dict[str, Any]:
        """
        Performs an officer verification action on a case.
        Enforces that the case is currently in NEEDS_VERIFICATION status.
        Transitions the case to VERIFIED, REJECTED, or MORE_INFO_REQUIRED.
        Sets verified_at if status is VERIFIED, or keeps it None otherwise.
        Records officer_note.
        """
        client = self._ensure_db_client()

        existing_case = self.get_case_by_id(case_id)
        if existing_case is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Case with ID '{case_id}' not found.",
            )

        current_status_raw = existing_case.get("status")
        try:
            current_status = CaseStatus(current_status_raw)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Case currently has unrecognized status: '{current_status_raw}'.",
            )

        if current_status != CaseStatus.NEEDS_VERIFICATION:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Case status is '{current_status.value}'. Verification can only be performed when status is '{CaseStatus.NEEDS_VERIFICATION.value}'.",
            )

        target_status = verification.status
        update_payload: Dict[str, Any] = {
            "status": target_status.value,
            "officer_note": verification.officer_note,
        }

        if target_status == VerificationStatus.VERIFIED:
            update_payload["verified_at"] = datetime.now(timezone.utc).isoformat()
        else:
            update_payload["verified_at"] = None

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


def get_case_service() -> CaseService:
    """Dependency provider for CaseService."""
    return CaseService()
