from typing import List
from pydantic import BaseModel, Field, ConfigDict


class ClusterSummary(BaseModel):
    """Geographic cluster / hotspot summary of verified crop disease cases."""
    model_config = ConfigDict(from_attributes=True)

    cluster_id: int = Field(..., description="Cluster identifier index (0-indexed)")
    case_count: int = Field(..., description="Number of verified cases in this cluster")
    case_ids: List[str] = Field(..., description="List of verified case IDs belonging to this cluster")
    center_latitude: float = Field(..., description="Mean latitude coordinate of cases in the cluster")
    center_longitude: float = Field(..., description="Mean longitude coordinate of cases in the cluster")


class OutbreakClustersResponse(BaseModel):
    """Response payload for outbreak cluster analysis."""
    model_config = ConfigDict(from_attributes=True)

    clusters: List[ClusterSummary]


class ClusterIntelligence(BaseModel):
    """Interpreted outbreak intelligence for a DBSCAN cluster of verified cases."""
    model_config = ConfigDict(from_attributes=True)

    cluster_id: int = Field(..., description="Cluster identifier index (0-indexed)")
    case_count: int = Field(..., description="Number of verified cases in this cluster")
    case_ids: List[str] = Field(..., description="List of verified case IDs belonging to this cluster")
    center_latitude: float = Field(..., description="Mean latitude coordinate of cases in the cluster")
    center_longitude: float = Field(..., description="Mean longitude coordinate of cases in the cluster")
    dominant_disease: str = Field(..., description="Most frequent disease in cluster or UNKNOWN")
    average_risk_score: float = Field(..., description="Mean risk score across cases in the cluster")
    highest_risk_level: str = Field(..., description="Highest individual case risk level (HIGH > MEDIUM > LOW)")
    outbreak_level: str = Field(..., description="Synthesized outbreak severity (HIGH, MEDIUM, or LOW)")


class OutbreakIntelligenceResponse(BaseModel):
    """Response payload for outbreak intelligence analysis."""
    model_config = ConfigDict(from_attributes=True)

    clusters: List[ClusterIntelligence]

