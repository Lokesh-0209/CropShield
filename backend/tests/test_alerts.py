"""Tests for the Warning/Alert layer in CropShield."""

from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.models.case import CaseStatus
from app.schemas.outbreak import ClusterIntelligence
from app.services.alert_service import (
    AlertService,
    generate_warning_from_intelligence,
    get_alert_service,
)
from app.services.case_service import CaseService, get_case_service
from app.services.outbreak_service import OutbreakService
from app.services.outbreak_intelligence_service import (
    OutbreakIntelligenceService,
    get_outbreak_intelligence_service,
)

client = TestClient(app)

# ---- Coordinate fixtures ----
NASHIK_LAT = 19.9975
NASHIK_LON = 73.7898
PUNE_LAT = 18.5204
PUNE_LON = 73.8567


def _make_verified_case(
    case_id: str,
    lat: float,
    lon: float,
    disease: str = "Leaf Blight",
    risk_score: float = 75.0,
    risk_level: str = "HIGH",
    status: str = "VERIFIED",
):
    return {
        "id": case_id,
        "latitude": lat,
        "longitude": lon,
        "crop": "Tomato",
        "growth_stage": "Flowering",
        "location_name": "Test Zone",
        "symptoms": "Leaf spots",
        "disease": disease,
        "confidence": 0.9,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "status": status,
        "created_at": "2026-09-29T12:00:00+00:00",
        "verified_at": "2026-09-29T14:00:00+00:00",
        "officer_note": "Verified by officer",
    }


def _setup_mock_service(cases_data):
    """Wire up a mock Supabase client and override FastAPI dependencies."""
    mock_db = MagicMock()
    select_query = MagicMock()
    select_resp = MagicMock()
    select_resp.data = cases_data
    select_query.execute.return_value = select_resp
    mock_db.table.return_value.select.return_value.eq.return_value = select_query

    case_service = CaseService(db_client=mock_db)
    outbreak_service = OutbreakService(case_service=case_service)
    intelligence_service = OutbreakIntelligenceService(
        case_service=case_service,
        outbreak_service=outbreak_service,
    )
    alert_service = AlertService(intelligence_service=intelligence_service)

    app.dependency_overrides[get_case_service] = lambda: case_service
    app.dependency_overrides[get_outbreak_intelligence_service] = lambda: intelligence_service
    app.dependency_overrides[get_alert_service] = lambda: alert_service

    return {
        "mock_db": mock_db,
        "case_service": case_service,
        "outbreak_service": outbreak_service,
        "intelligence_service": intelligence_service,
        "alert_service": alert_service,
    }


def _make_cluster_intelligence(
    cluster_id: int = 0,
    case_count: int = 4,
    outbreak_level: str = "HIGH",
    dominant_disease: str = "Leaf Blight",
    average_risk_score: float = 76.5,
    center_latitude: float = 17.385,
    center_longitude: float = 78.486,
) -> ClusterIntelligence:
    return ClusterIntelligence(
        cluster_id=cluster_id,
        case_count=case_count,
        case_ids=[f"case-{i}" for i in range(case_count)],
        center_latitude=center_latitude,
        center_longitude=center_longitude,
        dominant_disease=dominant_disease,
        average_risk_score=average_risk_score,
        highest_risk_level=outbreak_level,
        outbreak_level=outbreak_level,
    )


# ==============================================================================
# 1. HIGH outbreak generates HIGH warning
# ==============================================================================

def test_high_outbreak_generates_high_warning():
    intel = _make_cluster_intelligence(outbreak_level="HIGH")
    warning = generate_warning_from_intelligence(intel)
    assert warning.outbreak_level == "HIGH"
    assert warning.title == "High Disease Risk Detected"


# ==============================================================================
# 2. MEDIUM outbreak generates MEDIUM warning
# ==============================================================================

def test_medium_outbreak_generates_medium_warning():
    intel = _make_cluster_intelligence(outbreak_level="MEDIUM", average_risk_score=45.0)
    warning = generate_warning_from_intelligence(intel)
    assert warning.outbreak_level == "MEDIUM"
    assert warning.title == "Moderate Disease Risk Detected"


# ==============================================================================
# 3. LOW outbreak generates informational warning
# ==============================================================================

def test_low_outbreak_generates_informational_warning():
    intel = _make_cluster_intelligence(outbreak_level="LOW", average_risk_score=20.0)
    warning = generate_warning_from_intelligence(intel)
    assert warning.outbreak_level == "LOW"
    assert warning.title == "Low Disease Risk — Informational"


# ==============================================================================
# 4. Warning preserves cluster information
# ==============================================================================

def test_warning_preserves_cluster_info():
    intel = _make_cluster_intelligence(
        cluster_id=2,
        case_count=5,
        center_latitude=19.9975,
        center_longitude=73.7898,
        average_risk_score=82.3,
    )
    warning = generate_warning_from_intelligence(intel)
    assert warning.warning_id == "cluster-2"
    assert warning.cluster_id == 2
    assert warning.case_count == 5
    assert warning.center_latitude == 19.9975
    assert warning.center_longitude == 73.7898
    assert warning.average_risk_score == 82.3


# ==============================================================================
# 5. Dominant disease is preserved
# ==============================================================================

def test_dominant_disease_preserved():
    intel = _make_cluster_intelligence(dominant_disease="Powdery Mildew")
    warning = generate_warning_from_intelligence(intel)
    assert warning.dominant_disease == "Powdery Mildew"
    assert "Powdery Mildew" in warning.message


# ==============================================================================
# 6. Multiple clusters generate separate warnings
# ==============================================================================

def test_multiple_clusters_generate_separate_warnings():
    cases = [
        # Cluster near Nashik
        _make_verified_case("n1", NASHIK_LAT, NASHIK_LON, "Leaf Blight", 80.0, "HIGH"),
        _make_verified_case("n2", NASHIK_LAT + 0.001, NASHIK_LON, "Leaf Blight", 80.0, "HIGH"),
        _make_verified_case("n3", NASHIK_LAT, NASHIK_LON + 0.001, "Leaf Blight", 80.0, "HIGH"),
        # Cluster near Pune
        _make_verified_case("p1", PUNE_LAT, PUNE_LON, "Downy Mildew", 40.0, "MEDIUM"),
        _make_verified_case("p2", PUNE_LAT + 0.001, PUNE_LON, "Downy Mildew", 40.0, "MEDIUM"),
        _make_verified_case("p3", PUNE_LAT, PUNE_LON + 0.001, "Downy Mildew", 40.0, "MEDIUM"),
    ]
    _setup_mock_service(cases)

    try:
        response = client.get("/api/alerts?eps_km=2.0&min_samples=3")
        assert response.status_code == 200
        data = response.json()
        assert len(data["alerts"]) == 2

        ids = {a["cluster_id"] for a in data["alerts"]}
        assert ids == {0, 1}

        # Verify each alert has distinct disease
        diseases = {a["dominant_disease"] for a in data["alerts"]}
        assert len(diseases) == 2
    finally:
        app.dependency_overrides.clear()


# ==============================================================================
# 7. No clusters returns an empty list
# ==============================================================================

def test_no_clusters_returns_empty_alert_list():
    _setup_mock_service([])

    try:
        response = client.get("/api/alerts")
        assert response.status_code == 200
        data = response.json()
        assert data["alerts"] == []
    finally:
        app.dependency_overrides.clear()


# ==============================================================================
# 8. GET /api/alerts/{cluster_id} returns the correct warning
# ==============================================================================

def test_get_alert_by_cluster_id_returns_correct_warning():
    cases = [
        _make_verified_case("c1", NASHIK_LAT, NASHIK_LON, "Leaf Blight", 75.0, "HIGH"),
        _make_verified_case("c2", NASHIK_LAT + 0.001, NASHIK_LON + 0.001, "Leaf Blight", 85.0, "HIGH"),
        _make_verified_case("c3", NASHIK_LAT - 0.001, NASHIK_LON - 0.001, "Leaf Blight", 70.0, "HIGH"),
    ]
    _setup_mock_service(cases)

    try:
        response = client.get("/api/alerts/0")
        assert response.status_code == 200
        data = response.json()
        assert data["cluster_id"] == 0
        assert data["warning_id"] == "cluster-0"
        assert data["dominant_disease"] == "Leaf Blight"
        assert data["outbreak_level"] == "HIGH"
        assert data["case_count"] == 3
    finally:
        app.dependency_overrides.clear()


# ==============================================================================
# 9. Unknown cluster returns 404
# ==============================================================================

def test_unknown_cluster_id_returns_404():
    _setup_mock_service([])

    try:
        response = client.get("/api/alerts/99")
        assert response.status_code == 404
        assert "cluster_id=99" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


# ==============================================================================
# 10. Query parameter validation works
# ==============================================================================

def test_query_parameter_validation():
    # eps_km <= 0 → 422
    r1 = client.get("/api/alerts?eps_km=0.0")
    assert r1.status_code == 422

    r2 = client.get("/api/alerts?eps_km=-1.5")
    assert r2.status_code == 422

    # min_samples < 1 → 422
    r3 = client.get("/api/alerts?min_samples=0")
    assert r3.status_code == 422

    # Same validation on the single-cluster endpoint
    r4 = client.get("/api/alerts/0?eps_km=0.0")
    assert r4.status_code == 422

    r5 = client.get("/api/alerts/0?min_samples=0")
    assert r5.status_code == 422


# ==============================================================================
# Additional: end-to-end integration with HIGH cluster through the API
# ==============================================================================

def test_alert_api_integration_high_cluster():
    """Full pipeline: verified cases → DBSCAN → intelligence → warning alert via API."""
    cases = [
        _make_verified_case("h1", NASHIK_LAT, NASHIK_LON, "Leaf Blight", 80.0, "HIGH"),
        _make_verified_case("h2", NASHIK_LAT + 0.001, NASHIK_LON, "Leaf Blight", 78.0, "HIGH"),
        _make_verified_case("h3", NASHIK_LAT, NASHIK_LON + 0.001, "Leaf Blight", 71.0, "HIGH"),
        _make_verified_case("h4", NASHIK_LAT + 0.001, NASHIK_LON + 0.001, "Leaf Blight", 77.0, "HIGH"),
    ]
    _setup_mock_service(cases)

    try:
        response = client.get("/api/alerts")
        assert response.status_code == 200
        data = response.json()
        assert len(data["alerts"]) == 1

        alert = data["alerts"][0]
        assert alert["outbreak_level"] == "HIGH"
        assert alert["title"] == "High Disease Risk Detected"
        assert alert["dominant_disease"] == "Leaf Blight"
        assert alert["case_count"] == 4
        assert "4 verified cases" in alert["message"]
        assert "Leaf Blight" in alert["message"]
        assert alert["warning_id"] == "cluster-0"
        assert "created_at" in alert
    finally:
        app.dependency_overrides.clear()
