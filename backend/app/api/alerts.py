"""
Alerts API for CropShield.

Provides endpoints to retrieve outbreak warning alerts generated from
existing ClusterIntelligence.
"""

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status

from app.schemas.alert import AlertListResponse, WarningAlert
from app.services.alert_service import AlertService, get_alert_service

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get(
    "",
    response_model=AlertListResponse,
    status_code=status.HTTP_200_OK,
    summary="List outbreak warning alerts",
    description=(
        "Generates outbreak warning alerts from verified-case DBSCAN clusters "
        "and their synthesized intelligence. Each cluster produces one warning "
        "with severity mapped directly from its outbreak level."
    ),
)
def list_alerts(
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
    alert_service: AlertService = Depends(get_alert_service),
) -> AlertListResponse:
    """Returns all outbreak warning alerts for the current dataset."""
    alerts = alert_service.get_alerts(eps_km=eps_km, min_samples=min_samples)
    return AlertListResponse(alerts=alerts)


@router.get(
    "/{cluster_id}",
    response_model=WarningAlert,
    status_code=status.HTTP_200_OK,
    summary="Get warning alert for a specific cluster",
    description="Returns the outbreak warning for a specific DBSCAN cluster by its ID.",
)
def get_alert_by_cluster(
    cluster_id: int = Path(..., ge=0, description="Cluster identifier index (0-indexed)"),
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
    alert_service: AlertService = Depends(get_alert_service),
) -> WarningAlert:
    """Returns the warning for a single cluster, or 404 if it does not exist."""
    alert = alert_service.get_alert_by_cluster_id(
        cluster_id=cluster_id,
        eps_km=eps_km,
        min_samples=min_samples,
    )
    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No outbreak cluster found with cluster_id={cluster_id}.",
        )
    return alert
