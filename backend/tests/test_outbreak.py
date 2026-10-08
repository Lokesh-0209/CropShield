from unittest.mock import MagicMock
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.outbreak import ClusterSummary, OutbreakClustersResponse
from app.services.outbreak_service import (
    OutbreakService,
    get_outbreak_service,
    haversine_distance_km,
)

client = TestClient(app)

# Coordinates for testing
# Group 1: Hyderabad Cluster (~100m - 200m apart)
HYD_CASE_1 = {"id": "c1-hyd", "latitude": 17.3850, "longitude": 78.4860, "status": "VERIFIED"}
HYD_CASE_2 = {"id": "c2-hyd", "latitude": 17.3855, "longitude": 78.4862, "status": "VERIFIED"}
HYD_CASE_3 = {"id": "c3-hyd", "latitude": 17.3848, "longitude": 78.4858, "status": "VERIFIED"}

# Group 2: Nashik Cluster (>600km away from Hyderabad, ~80m apart from each other)
NSK_CASE_1 = {"id": "c4-nsk", "latitude": 19.9975, "longitude": 73.7898, "status": "VERIFIED"}
NSK_CASE_2 = {"id": "c5-nsk", "latitude": 19.9980, "longitude": 73.7900, "status": "VERIFIED"}
NSK_CASE_3 = {"id": "c6-nsk", "latitude": 19.9970, "longitude": 73.7895, "status": "VERIFIED"}

# Isolated case: Pune (~150km from Nashik, ~500km from Hyderabad)
PUNE_ISOLATED = {"id": "c7-pune", "latitude": 18.5204, "longitude": 73.8567, "status": "VERIFIED"}


# ==============================================================================
# 1. HAVERSINE DISTANCE VERIFICATION
# ==============================================================================

def test_haversine_identical_points_is_zero():
    assert haversine_distance_km(17.3850, 78.4860, 17.3850, 78.4860) == 0.0


def test_haversine_calculation_precision():
    # Known distance between Hyderabad (17.3850, 78.4860) and Mumbai (19.0760, 72.8777) is ~621 km
    dist = haversine_distance_km(17.3850, 78.4860, 19.0760, 72.8777)
    assert 615.0 < dist < 625.0


# ==============================================================================
# 2. DBSCAN CLUSTERING CORE TESTS
# ==============================================================================

def test_three_or_more_nearby_verified_cases_form_one_cluster():
    """Requirement 1: Three or more nearby VERIFIED cases form one cluster."""
    service = OutbreakService()
    cases = [HYD_CASE_1, HYD_CASE_2, HYD_CASE_3]

    clusters = service.cluster_cases(cases, eps_km=2.0, min_samples=3)

    assert len(clusters) == 1
    cluster = clusters[0]
    assert cluster.cluster_id == 0
    assert cluster.case_count == 3
    assert set(cluster.case_ids) == {"c1-hyd", "c2-hyd", "c3-hyd"}


def test_two_geographically_separated_groups_form_separate_clusters():
    """Requirement 2: Two geographically separated groups form separate clusters."""
    service = OutbreakService()
    cases = [HYD_CASE_1, HYD_CASE_2, HYD_CASE_3, NSK_CASE_1, NSK_CASE_2, NSK_CASE_3]

    clusters = service.cluster_cases(cases, eps_km=2.0, min_samples=3)

    assert len(clusters) == 2
    c0, c1 = clusters[0], clusters[1]
    assert c0.case_count == 3
    assert c1.case_count == 3

    hyd_ids = {"c1-hyd", "c2-hyd", "c3-hyd"}
    nsk_ids = {"c4-nsk", "c5-nsk", "c6-nsk"}
    assert (set(c0.case_ids) == hyd_ids and set(c1.case_ids) == nsk_ids) or \
           (set(c0.case_ids) == nsk_ids and set(c1.case_ids) == hyd_ids)


def test_isolated_verified_case_treated_as_dbscan_noise():
    """Requirement 3: Isolated VERIFIED case treated as DBSCAN noise and excluded from clusters."""
    service = OutbreakService()
    cases = [HYD_CASE_1, HYD_CASE_2, HYD_CASE_3, PUNE_ISOLATED]

    clusters = service.cluster_cases(cases, eps_km=2.0, min_samples=3)

    assert len(clusters) == 1
    assert clusters[0].case_count == 3
    assert "c7-pune" not in clusters[0].case_ids


def test_non_verified_cases_completely_ignored():
    """Requirement 4: Non-VERIFIED cases are completely ignored."""
    service = OutbreakService()
    # 3 nearby cases, but only 1 is VERIFIED and 2 are PENDING_ANALYSIS
    mixed_cases = [
        HYD_CASE_1,  # VERIFIED
        {"id": "c-pending-1", "latitude": 17.3855, "longitude": 78.4862, "status": "PENDING_ANALYSIS"},
        {"id": "c-pending-2", "latitude": 17.3848, "longitude": 78.4858, "status": "NEEDS_VERIFICATION"},
    ]
    # With min_samples=3, 1 verified case cannot form a cluster
    clusters = service.cluster_cases(mixed_cases, eps_km=2.0, min_samples=3)
    assert len(clusters) == 0

    # 3 VERIFIED cases + 2 REJECTED cases nearby: only verified are in the cluster
    mixed_cases_2 = [
        HYD_CASE_1,
        HYD_CASE_2,
        HYD_CASE_3,
        {"id": "c-rejected-1", "latitude": 17.3851, "longitude": 78.4861, "status": "REJECTED"},
        {"id": "c-more-info", "latitude": 17.3852, "longitude": 78.4860, "status": "MORE_INFO_REQUIRED"},
    ]
    clusters_2 = service.cluster_cases(mixed_cases_2, eps_km=2.0, min_samples=3)
    assert len(clusters_2) == 1
    assert clusters_2[0].case_count == 3
    assert set(clusters_2[0].case_ids) == {"c1-hyd", "c2-hyd", "c3-hyd"}


def test_changing_eps_km_changes_cluster_formation():
    """Requirement 5: Changing eps_km changes cluster formation appropriately."""
    service = OutbreakService()
    # Coordinates approx 1.0 km apart along latitude:
    # 0.009 degrees latitude is approx 1.0 km
    p1 = {"id": "p1", "latitude": 17.000, "longitude": 78.000, "status": "VERIFIED"}
    p2 = {"id": "p2", "latitude": 17.009, "longitude": 78.000, "status": "VERIFIED"}  # ~1.0 km from p1
    p3 = {"id": "p3", "latitude": 17.018, "longitude": 78.000, "status": "VERIFIED"}  # ~1.0 km from p2

    cases = [p1, p2, p3]

    # With eps_km = 1.5, each point is within 1.5 km of its neighbor, forming a cluster
    clusters_wide = service.cluster_cases(cases, eps_km=1.5, min_samples=3)
    assert len(clusters_wide) == 1
    assert clusters_wide[0].case_count == 3

    # With eps_km = 0.5, the distance (~1.0 km) exceeds eps, so no points are neighbors
    clusters_narrow = service.cluster_cases(cases, eps_km=0.5, min_samples=3)
    assert len(clusters_narrow) == 0


def test_changing_min_samples_changes_cluster_qualification():
    """Requirement 6: Changing min_samples changes whether a dense group qualifies as a cluster."""
    service = OutbreakService()
    cases = [HYD_CASE_1, HYD_CASE_2, HYD_CASE_3]  # 3 cases

    # With min_samples = 3: qualifies as a cluster
    clusters_3 = service.cluster_cases(cases, eps_km=2.0, min_samples=3)
    assert len(clusters_3) == 1

    # With min_samples = 4: density requirement not met, treated as noise
    clusters_4 = service.cluster_cases(cases, eps_km=2.0, min_samples=4)
    assert len(clusters_4) == 0


def test_zero_verified_cases_returns_empty_clusters():
    """Requirement 7: Zero verified cases returns empty cluster list."""
    service = OutbreakService()
    clusters = service.cluster_cases([], eps_km=2.0, min_samples=3)
    assert clusters == []


def test_cluster_center_correctly_calculated_from_coordinates():
    """Requirement 9: Cluster center is correctly calculated from cluster coordinates."""
    service = OutbreakService()
    p1 = {"id": "c1", "latitude": 10.0, "longitude": 20.000, "status": "VERIFIED"}
    p2 = {"id": "c2", "latitude": 10.0, "longitude": 20.003, "status": "VERIFIED"}
    p3 = {"id": "c3", "latitude": 10.0, "longitude": 20.006, "status": "VERIFIED"}

    clusters = service.cluster_cases([p1, p2, p3], eps_km=2.0, min_samples=3)
    assert len(clusters) == 1
    cluster = clusters[0]
    assert cluster.center_latitude == 10.0
    assert pytest.approx(cluster.center_longitude, 0.00001) == 20.003


# ==============================================================================
# 3. API ENDPOINT & VALIDATION TESTS
# ==============================================================================

def test_api_outbreak_clusters_endpoint_success():
    mock_service = MagicMock()
    mock_service.get_outbreak_clusters.return_value = [
        ClusterSummary(
            cluster_id=0,
            case_count=3,
            case_ids=["c1-hyd", "c2-hyd", "c3-hyd"],
            center_latitude=17.3851,
            center_longitude=78.4860,
        )
    ]

    app.dependency_overrides[get_outbreak_service] = lambda: mock_service

    try:
        response = client.get("/api/outbreaks/clusters?eps_km=2.0&min_samples=3")
        assert response.status_code == 200
        data = response.json()
        assert "clusters" in data
        assert len(data["clusters"]) == 1
        c = data["clusters"][0]
        assert c["cluster_id"] == 0
        assert c["case_count"] == 3
        assert len(c["case_ids"]) == 3
        assert c["center_latitude"] == 17.3851
        assert c["center_longitude"] == 78.4860
    finally:
        app.dependency_overrides.clear()


def test_api_outbreak_clusters_rejects_invalid_parameters():
    """Requirement 8: Invalid parameters produce HTTP 422 validation error."""
    # eps_km <= 0
    resp_zero_eps = client.get("/api/outbreaks/clusters?eps_km=0")
    assert resp_zero_eps.status_code == 422

    resp_neg_eps = client.get("/api/outbreaks/clusters?eps_km=-1.5")
    assert resp_neg_eps.status_code == 422

    # min_samples < 1
    resp_zero_samples = client.get("/api/outbreaks/clusters?min_samples=0")
    assert resp_zero_samples.status_code == 422

    resp_neg_samples = client.get("/api/outbreaks/clusters?min_samples=-3")
    assert resp_neg_samples.status_code == 422
