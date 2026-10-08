"""API package for CropShield."""
from app.api.cases import router as cases_router
from app.api.risk import router as risk_router
from app.api.outbreak import router as outbreak_router
from app.api.alerts import router as alerts_router

__all__ = ["cases_router", "risk_router", "outbreak_router", "alerts_router"]
