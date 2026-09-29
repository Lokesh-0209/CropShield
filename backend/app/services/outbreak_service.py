import math
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from app.models.case import CaseStatus
from app.schemas.outbreak import ClusterSummary
from app.services.case_service import CaseService, get_case_service

EARTH_RADIUS_KM = 6371.0088


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates the great-circle geographic distance between two points
    on the Earth's surface using the Haversine formula, returning distance in kilometers.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    # Clip to avoid domain errors from floating point precision
    a = min(1.0, max(0.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_KM * c


class OutbreakService:
    """
    Service implementing Outbreak Intelligence via Density-Based Spatial Clustering
    of Applications with Noise (DBSCAN) using true geographic Haversine distances.
    Only confirmed VERIFIED cases are evaluated for outbreak clustering.
    """

    def __init__(self, case_service: Optional[CaseService] = None):
        self._case_service = case_service

    @property
    def case_service(self) -> CaseService:
        if self._case_service is not None:
            return self._case_service
        return get_case_service()

    def get_outbreak_clusters(
        self,
        eps_km: float = 2.0,
        min_samples: int = 3,
    ) -> List[ClusterSummary]:
        """
        Retrieves all VERIFIED cases from storage and runs DBSCAN clustering.
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
            # Query only VERIFIED cases for outbreak clustering
            response = (
                client.table("cases")
                .select("id, latitude, longitude, status")
                .eq("status", CaseStatus.VERIFIED.value)
                .execute()
            )
            verified_cases = response.data or []
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database query failed: {str(exc)}",
            )

        return self.cluster_cases(verified_cases, eps_km=eps_km, min_samples=min_samples)

    def cluster_cases(
        self,
        cases: List[Dict[str, Any]],
        eps_km: float = 2.0,
        min_samples: int = 3,
    ) -> List[ClusterSummary]:
        """
        Executes DBSCAN spatial clustering on the provided case records.
        Strictly filters for cases where status == VERIFIED.
        """
        # Step 1: Select only VERIFIED cases (ignore all other lifecycle states)
        verified_cases = [
            c for c in cases
            if c.get("status") == CaseStatus.VERIFIED.value or c.get("status") == "VERIFIED"
        ]

        n = len(verified_cases)
        # Step 6: Edge cases - fewer cases than min_samples or zero cases
        if n < min_samples:
            return []

        # Step 2: Prepare coordinates while retaining case IDs
        coords: List[Tuple[float, float]] = [
            (float(c["latitude"]), float(c["longitude"])) for c in verified_cases
        ]
        case_ids: List[str] = [str(c["id"]) for c in verified_cases]

        # Step 3 & 4: Precompute Haversine neighbor lists
        neighbors: List[List[int]] = []
        for i in range(n):
            n_list: List[int] = []
            lat1, lon1 = coords[i]
            for j in range(n):
                lat2, lon2 = coords[j]
                if haversine_distance_km(lat1, lon1, lat2, lon2) <= eps_km:
                    n_list.append(j)
            neighbors.append(n_list)

        # Execute DBSCAN clustering
        labels = [-1] * n  # -1 represents noise or unassigned
        visited = [False] * n
        cluster_id = 0

        for i in range(n):
            if visited[i]:
                continue
            visited[i] = True

            if len(neighbors[i]) < min_samples:
                # Mark as noise (can later become border point)
                labels[i] = -1
            else:
                # Core point discovered - expand cluster
                labels[i] = cluster_id
                seed_set = list(neighbors[i])

                for q in seed_set:
                    if not visited[q]:
                        visited[q] = True
                        if len(neighbors[q]) >= min_samples:
                            # q is also a core point, expand seed_set
                            for neighbor_of_q in neighbors[q]:
                                if neighbor_of_q not in seed_set:
                                    seed_set.append(neighbor_of_q)

                    if labels[q] == -1:
                        labels[q] = cluster_id

                cluster_id += 1

        # Step 5: Build cluster summaries (ignore noise points with label == -1)
        clusters: List[ClusterSummary] = []
        for c_id in range(cluster_id):
            member_indices = [idx for idx in range(n) if labels[idx] == c_id]
            if not member_indices:
                continue

            member_case_ids = [case_ids[idx] for idx in member_indices]
            mean_lat = sum(coords[idx][0] for idx in member_indices) / len(member_indices)
            mean_lon = sum(coords[idx][1] for idx in member_indices) / len(member_indices)

            clusters.append(
                ClusterSummary(
                    cluster_id=c_id,
                    case_count=len(member_case_ids),
                    case_ids=member_case_ids,
                    center_latitude=round(mean_lat, 6),
                    center_longitude=round(mean_lon, 6),
                )
            )

        return clusters


def get_outbreak_service() -> OutbreakService:
    """Dependency provider for OutbreakService."""
    return OutbreakService()
