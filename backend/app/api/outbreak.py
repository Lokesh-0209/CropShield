from fastapi import APIRouter, Depends, Query, status
from app.schemas.outbreak import OutbreakClustersResponse, OutbreakIntelligenceResponse
from app.services.outbreak_service import OutbreakService, get_outbreak_service
from app.services.outbreak_intelligence_service import (
    OutbreakIntelligenceService,
    get_outbreak_intelligence_service,
)

router = APIRouter(prefix="/api/outbreaks", tags=["outbreaks"])


@router.get(
    "/clusters",
    response_model=OutbreakClustersResponse,
    status_code=status.HTTP_200_OK,
    summary="Detect geographic outbreak clusters",
    description="Discovers spatial clusters among confirmed VERIFIED cases using DBSCAN with Haversine distance in kilometers.",
)
def get_outbreak_clusters(
    eps_km: float = Query(
        2.0,
        gt=0.0,
        description="DBSCAN neighborhood radius in kilometers (default: 2.0 km)",
    ),
    min_samples: int = Query(
        3,
        ge=1,
        description="Minimum number of verified cases required to form a cluster (default: 3)",
    ),
    outbreak_service: OutbreakService = Depends(get_outbreak_service),
) -> OutbreakClustersResponse:
    """Discovers geographic clusters among verified disease cases."""
    clusters = outbreak_service.get_outbreak_clusters(eps_km=eps_km, min_samples=min_samples)
    return OutbreakClustersResponse(clusters=clusters)


@router.get(
    "/intelligence",
    response_model=OutbreakIntelligenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Outbreak cluster intelligence",
    description="Synthesizes actionable epidemiological intelligence across verified case DBSCAN clusters, including dominant disease, aggregated risk scores, and outbreak severity levels.",
)
def get_outbreak_intelligence(
    eps_km: float = Query(
        2.0,
        gt=0.0,
        description="DBSCAN neighborhood radius in kilometers (default: 2.0 km)",
    ),
    min_samples: int = Query(
        3,
        ge=1,
        description="Minimum number of verified cases required to form a cluster (default: 3)",
    ),
    intelligence_service: OutbreakIntelligenceService = Depends(get_outbreak_intelligence_service),
) -> OutbreakIntelligenceResponse:
    """Computes synthesized outbreak intelligence across verified DBSCAN clusters."""
    clusters = intelligence_service.get_outbreak_intelligence(eps_km=eps_km, min_samples=min_samples)
    return OutbreakIntelligenceResponse(clusters=clusters)

