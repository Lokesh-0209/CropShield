from collections import Counter
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from app.models.case import CaseStatus
from app.schemas.outbreak import ClusterIntelligence, ClusterSummary
from app.services.case_service import CaseService, get_case_service
from app.services.outbreak_service import OutbreakService, get_outbreak_service


def determine_dominant_disease(cluster_cases: List[Dict[str, Any]]) -> str:
    """
    Extracts disease values from cluster cases, ignoring missing or empty values.
    Returns the most frequent disease. If no disease data exists, returns 'UNKNOWN'.
    Ties are resolved deterministically by alphabetical order.
    """
    diseases = [
        str(c["disease"]).strip()
        for c in cluster_cases
        if c.get("disease") and str(c["disease"]).strip()
    ]
    if not diseases:
        return "UNKNOWN"

    counts = Counter(diseases)
    # Sort deterministically: highest count first (-count), then alphabetically (disease)
    dominant = sorted(counts.items(), key=lambda item: (-item[1], item[0]))[0][0]
    return dominant


def calculate_risk_summary(cluster_cases: List[Dict[str, Any]]) -> Tuple[float, str]:
    """
    Computes:
    - average_risk_score across cluster cases with a valid risk score (rounded to 1 decimal place; default 0.0)
    - highest_risk_level present according to ordering HIGH > MEDIUM > LOW (default 'LOW')
    """
    scores = [
        float(c["risk_score"])
        for c in cluster_cases
        if c.get("risk_score") is not None
    ]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    levels = [
        str(c.get("risk_level")).strip().upper()
        for c in cluster_cases
        if c.get("risk_level") and str(c.get("risk_level")).strip()
    ]

    if "HIGH" in levels:
        highest_level = "HIGH"
    elif "MEDIUM" in levels:
        highest_level = "MEDIUM"
    else:
        highest_level = "LOW"

    return avg_score, highest_level


def derive_outbreak_level(case_count: int, average_risk_score: float, highest_risk_level: str) -> str:
    """
    Derives outbreak severity level (HIGH, MEDIUM, LOW) based on:
    - cluster case count
    - average risk score
    - highest risk level

    Rule thresholds:
    1. HIGH:
       - highest_risk_level == 'HIGH' and (average_risk_score >= 60.0 or case_count >= 5), OR
       - average_risk_score >= 70.0, OR
       - case_count >= 8
    2. MEDIUM:
       - highest_risk_level in ('HIGH', 'MEDIUM'), OR
       - average_risk_score >= 40.0, OR
       - case_count >= 4
    3. LOW:
       - All remaining clusters.
    """
    # HIGH severity criteria
    if (highest_risk_level == "HIGH" and (average_risk_score >= 60.0 or case_count >= 5)) or \
       (average_risk_score >= 70.0) or \
       (case_count >= 8):
        return "HIGH"

    # MEDIUM severity criteria
    if (highest_risk_level in ("HIGH", "MEDIUM")) or \
       (average_risk_score >= 40.0) or \
       (case_count >= 4):
        return "MEDIUM"

    # Default to LOW
    return "LOW"


class OutbreakIntelligenceService:
    """
    Service that analyzes DBSCAN geographic clusters of VERIFIED cases to synthesize
    actionable disease intelligence, aggregated risk statistics, and outbreak severity levels.
    """

    def __init__(
        self,
        case_service: Optional[CaseService] = None,
        outbreak_service: Optional[OutbreakService] = None,
    ):
        self._case_service = case_service
        self._outbreak_service = outbreak_service

    @property
    def case_service(self) -> CaseService:
        if self._case_service is not None:
            return self._case_service
        return get_case_service()

    @property
    def outbreak_service(self) -> OutbreakService:
        if self._outbreak_service is not None:
            return self._outbreak_service
        return get_outbreak_service()

    def get_outbreak_intelligence(
        self,
        eps_km: float = 2.0,
        min_samples: int = 3,
    ) -> List[ClusterIntelligence]:
        """
        Retrieves all VERIFIED cases from Supabase and interprets clusters discovered by DBSCAN.
        """
        if eps_km <= 0:
            raise ValueError("eps_km must be strictly greater than 0.")
        if min_samples < 1:
            raise ValueError("min_samples must be at least 1.")

        client = self.case_service.db
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service not configured. Please set SUPABASE_URL and SUPABASE_KEY in .env.",
            )

        try:
            response = (
                client.table("cases")
                .select("id, latitude, longitude, status, disease, risk_score, risk_level")
                .eq("status", CaseStatus.VERIFIED.value)
                .execute()
            )
            verified_cases = response.data or []
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database query failed: {str(exc)}",
            )

        return self.analyze_clusters(verified_cases, eps_km=eps_km, min_samples=min_samples)

    def analyze_clusters(
        self,
        cases: List[Dict[str, Any]],
        eps_km: float = 2.0,
        min_samples: int = 3,
    ) -> List[ClusterIntelligence]:
        """
        Interprets clusters discovered by OutbreakService.cluster_cases().
        Strictly filters for cases where status == VERIFIED.
        """
        verified_cases = [
            c for c in cases
            if c.get("status") == CaseStatus.VERIFIED.value or c.get("status") == "VERIFIED"
        ]

        if not verified_cases:
            return []

        # Delegate geographic DBSCAN clustering to existing OutbreakService
        clusters: List[ClusterSummary] = self.outbreak_service.cluster_cases(
            verified_cases,
            eps_km=eps_km,
            min_samples=min_samples,
        )

        if not clusters:
            return []

        case_map = {str(c["id"]): c for c in verified_cases}
        intelligence_list: List[ClusterIntelligence] = []

        for cluster in clusters:
            c_cases = [case_map[cid] for cid in cluster.case_ids if cid in case_map]

            dominant_disease = determine_dominant_disease(c_cases)
            avg_risk, highest_risk = calculate_risk_summary(c_cases)
            outbreak_lvl = derive_outbreak_level(cluster.case_count, avg_risk, highest_risk)

            intelligence_list.append(
                ClusterIntelligence(
                    cluster_id=cluster.cluster_id,
                    case_count=cluster.case_count,
                    case_ids=cluster.case_ids,
                    center_latitude=cluster.center_latitude,
                    center_longitude=cluster.center_longitude,
                    dominant_disease=dominant_disease,
                    average_risk_score=avg_risk,
                    highest_risk_level=highest_risk,
                    outbreak_level=outbreak_lvl,
                )
            )

        return intelligence_list


def get_outbreak_intelligence_service() -> OutbreakIntelligenceService:
    """Dependency provider for OutbreakIntelligenceService."""
    return OutbreakIntelligenceService()
