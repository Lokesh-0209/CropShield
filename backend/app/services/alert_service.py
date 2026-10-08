"""
Alert service for CropShield.

Generates outbreak warning alerts from existing ClusterIntelligence records.
Does NOT introduce any new clustering, risk, or outbreak-level algorithms —
all intelligence is delegated to OutbreakIntelligenceService.
"""

from datetime import datetime, timezone
from typing import List, Optional

from app.schemas.alert import WarningAlert
from app.schemas.outbreak import ClusterIntelligence
from app.services.outbreak_intelligence_service import (
    OutbreakIntelligenceService,
    get_outbreak_intelligence_service,
)


# ---------------------------------------------------------------------------
# Deterministic title & message templates keyed by outbreak level
# ---------------------------------------------------------------------------

_LEVEL_TITLES = {
    "HIGH": "High Disease Risk Detected",
    "MEDIUM": "Moderate Disease Risk Detected",
    "LOW": "Low Disease Risk — Informational",
}


def _build_warning_message(intel: ClusterIntelligence) -> str:
    """
    Generates a concise, deterministic warning message that incorporates
    cluster context: verified case count, dominant disease, and average risk.
    """
    return (
        f"{intel.case_count} verified case{'s' if intel.case_count != 1 else ''} "
        f"of {intel.dominant_disease} detected in a nearby cluster. "
        f"Average risk score: {intel.average_risk_score}."
    )


def generate_warning_from_intelligence(
    intel: ClusterIntelligence,
    created_at: Optional[str] = None,
) -> WarningAlert:
    """
    Converts a single ClusterIntelligence record into a WarningAlert.

    Mapping:
        HIGH   outbreak_level  →  HIGH   warning
        MEDIUM outbreak_level  →  MEDIUM warning
        LOW    outbreak_level  →  LOW    informational warning
    """
    ts = created_at or datetime.now(timezone.utc).isoformat()

    return WarningAlert(
        warning_id=f"cluster-{intel.cluster_id}",
        cluster_id=intel.cluster_id,
        outbreak_level=intel.outbreak_level,
        title=_LEVEL_TITLES.get(intel.outbreak_level, _LEVEL_TITLES["LOW"]),
        message=_build_warning_message(intel),
        center_latitude=intel.center_latitude,
        center_longitude=intel.center_longitude,
        case_count=intel.case_count,
        dominant_disease=intel.dominant_disease,
        average_risk_score=intel.average_risk_score,
        created_at=ts,
    )


class AlertService:
    """
    Service that generates outbreak warning alerts by wrapping the existing
    OutbreakIntelligenceService. No duplicate clustering or risk logic.
    """

    def __init__(
        self,
        intelligence_service: Optional[OutbreakIntelligenceService] = None,
    ):
        self._intelligence_service = intelligence_service

    @property
    def intelligence_service(self) -> OutbreakIntelligenceService:
        if self._intelligence_service is not None:
            return self._intelligence_service
        return get_outbreak_intelligence_service()

    def get_alerts(
        self,
        eps_km: float = 2.0,
        min_samples: int = 3,
    ) -> List[WarningAlert]:
        """
        Obtains outbreak intelligence and generates one warning per cluster.
        """
        clusters = self.intelligence_service.get_outbreak_intelligence(
            eps_km=eps_km,
            min_samples=min_samples,
        )
        # Use a single timestamp so all warnings from the same request share
        # the same created_at, ensuring consistency.
        ts = datetime.now(timezone.utc).isoformat()
        return [
            generate_warning_from_intelligence(c, created_at=ts)
            for c in clusters
        ]

    def get_alert_by_cluster_id(
        self,
        cluster_id: int,
        eps_km: float = 2.0,
        min_samples: int = 3,
    ) -> Optional[WarningAlert]:
        """
        Returns the warning for a specific cluster_id, or None if that
        cluster does not exist in the current intelligence results.
        """
        alerts = self.get_alerts(eps_km=eps_km, min_samples=min_samples)
        for alert in alerts:
            if alert.cluster_id == cluster_id:
                return alert
        return None


def get_alert_service() -> AlertService:
    """Dependency provider for AlertService."""
    return AlertService()
