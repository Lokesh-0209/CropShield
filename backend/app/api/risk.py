from fastapi import APIRouter, Depends, status
from app.schemas.risk import RiskAnalysisRequest, RiskAnalysisResponse
from app.services.risk_service import RiskService, get_risk_service

router = APIRouter(prefix="/api/risk", tags=["risk"])


@router.post(
    "/analyze",
    response_model=RiskAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Compute deterministic crop disease risk",
    description="Calculates a composite prototype disease risk score (0-100) and categorical risk level (LOW/MEDIUM/HIGH) from weather, crop, and local disease pressure.",
)
def analyze_risk(
    request: RiskAnalysisRequest,
    risk_service: RiskService = Depends(get_risk_service),
) -> RiskAnalysisResponse:
    """Analyze crop disease outbreak risk."""
    return risk_service.calculate_risk(request)
