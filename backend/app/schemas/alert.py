from typing import List
from pydantic import BaseModel, Field, ConfigDict


class WarningAlert(BaseModel):
    """Outbreak warning alert generated from cluster intelligence."""
    model_config = ConfigDict(from_attributes=True)

    warning_id: str = Field(..., description="Unique warning identifier (e.g. cluster-0)")
    cluster_id: int = Field(..., description="Cluster identifier index (0-indexed)")
    outbreak_level: str = Field(..., description="Outbreak severity level (HIGH, MEDIUM, or LOW)")
    title: str = Field(..., description="Warning headline title")
    message: str = Field(..., description="Actionable descriptive warning message")
    center_latitude: float = Field(..., description="Mean latitude coordinate of cases in the cluster")
    center_longitude: float = Field(..., description="Mean longitude coordinate of cases in the cluster")
    case_count: int = Field(..., description="Number of verified cases in this cluster")
    dominant_disease: str = Field(..., description="Dominant crop disease or UNKNOWN")
    average_risk_score: float = Field(..., description="Mean risk score across cases in the cluster")
    created_at: str = Field(..., description="ISO 8601 UTC timestamp when the warning was generated")


class AlertListResponse(BaseModel):
    """Response payload for listing outbreak warning alerts."""
    model_config = ConfigDict(from_attributes=True)

    alerts: List[WarningAlert] = Field(..., description="List of active outbreak warning alerts")
