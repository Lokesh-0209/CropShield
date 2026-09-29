"""Tests for the Outbreak Intelligence service and endpoint in CropShield."""
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.models.case import CaseStatus
from app.schemas.outbreak import OutbreakIntelligenceResponse
from app.services.case_service import CaseService, get_case_service
from app.services.outbreak_service import OutbreakService
from app.services.outbreak_intelligence_service import (
    OutbreakIntelligenceService,
    get_outbreak_intelligence_service,
    determine_dominant_disease,
    calculate_risk_summary,
    derive_outbreak_level,
)

client = TestClient(app)

# Helper cases for clustering (Cluster A around Nashik: ~100m spread)
NASHIK_LAT = 19.9975
NASHIK_LON = 73.7898

# Cluster B around Pune: ~160km away from Nashik
PUNE_LAT = 18.5204
PUNE_LON = 73.8567


def _make_verified_case(
    case_id: str,
    lat: float,
    lon: float,
    disease: str = "Tomato Early Blight",
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

    app.dependency_overrides[get_case_service] = lambda: case_service
    app.dependency_overrides[get_outbreak_intelligence_service] = lambda: intelligence_service

    return {
        "mock_db": mock_db,
        "case_service": case_service,
        "outbreak_service": outbreak_service,
        "intelligence_service": intelligence_service,
    }


# ==============================================================================
# 1. UNIT LOGIC TESTS (Dominant Disease, Risk Summary, Outbreak Level)
# ==============================================================================

def test_dominant_disease_calculated_correctly_by_frequency():
    """Dominant disease should be the most frequently occurring disease."""
    cases = [
        {"disease": "Tomato Early Blight"},
        {"disease": "Tomato Early Blight"},
        {"disease": "Tomato Late Blight"},
    ]
    assert determine_dominant_disease(cases) == "Tomato Early Blight"


def test_dominant_disease_handles_ties_deterministically():
    """In case of equal frequency, tie-break deterministically (alphabetical order)."""
    cases = [
        {"disease": "Septoria Leaf Spot"},
        {"disease": "Bacterial Spot"},
    ]
    # 'Bacterial Spot' comes before 'Septoria Leaf Spot' alphabetically
    assert determine_dominant_disease(cases) == "Bacterial Spot"


def test_missing_disease_values_handled_cleanly():
    """Cases with missing, empty, or whitespace disease values are ignored; returns UNKNOWN if none exist."""
    cases_all_missing = [
        {"disease": None},
        {"disease": ""},
        {"disease": "   "},
    ]
    assert determine_dominant_disease(cases_all_missing) == "UNKNOWN"

    cases_partial_missing = [
        {"disease": None},
        {"disease": "Tomato Early Blight"},
        {"disease": ""},
    ]
    assert determine_dominant_disease(cases_partial_missing) == "Tomato Early Blight"


def test_average_risk_score_calculated_correctly():
    """Average risk score averages numeric values and ignores missing risk scores."""
    cases = [
        {"risk_score": 80.0, "risk_level": "HIGH"},
        {"risk_score": 70.0, "risk_level": "HIGH"},
        {"risk_score": None, "risk_level": "HIGH"},
    ]
    avg, highest = calculate_risk_summary(cases)
    assert avg == 75.0
    assert highest == "HIGH"

    # All missing risk scores
    avg_empty, _ = calculate_risk_summary([{"risk_score": None}])
    assert avg_empty == 0.0


def test_highest_risk_level_ordering():
    """Risk ordering HIGH > MEDIUM > LOW is strictly followed."""
    # HIGH takes precedence over MEDIUM and LOW
    _, h1 = calculate_risk_summary([
        {"risk_score": 50, "risk_level": "LOW"},
        {"risk_score": 60, "risk_level": "HIGH"},
        {"risk_score": 55, "risk_level": "MEDIUM"},
    ])
    assert h1 == "HIGH"

    # MEDIUM takes precedence over LOW
    _, h2 = calculate_risk_summary([
        {"risk_score": 30, "risk_level": "LOW"},
        {"risk_score": 45, "risk_level": "MEDIUM"},
    ])
    assert h2 == "MEDIUM"

    # Only LOW present
    _, h3 = calculate_risk_summary([
        {"risk_score": 20, "risk_level": "LOW"},
        {"risk_score": 25, "risk_level": "LOW"},
    ])
    assert h3 == "LOW"


def test_outbreak_level_deterministic_rules():
    """
    Tests exact outbreak level derivation:
    - HIGH when avg_risk >= 70 or (highest == HIGH and case_count >= 5) or case_count >= 8
    - MEDIUM when highest in (HIGH, MEDIUM) or avg_risk >= 40 or case_count >= 4
    - LOW for remaining
    """
    # 1. HIGH from high average risk
    assert derive_outbreak_level(case_count=4, average_risk_score=76.5, highest_risk_level="HIGH") == "HIGH"

    # 2. HIGH from large cluster (case_count >= 8) even with low individual score
    assert derive_outbreak_level(case_count=9, average_risk_score=35.0, highest_risk_level="LOW") == "HIGH"

    # 3. HIGH from highest_risk_level == HIGH and case_count >= 5
    assert derive_outbreak_level(case_count=5, average_risk_score=62.0, highest_risk_level="HIGH") == "HIGH"

    # 4. MEDIUM from moderate risk level
    assert derive_outbreak_level(case_count=3, average_risk_score=45.0, highest_risk_level="MEDIUM") == "MEDIUM"

    # 5. MEDIUM from case_count >= 4
    assert derive_outbreak_level(case_count=4, average_risk_score=30.0, highest_risk_level="LOW") == "MEDIUM"

    # 6. LOW for small cluster with low severity
    assert derive_outbreak_level(case_count=3, average_risk_score=25.0, highest_risk_level="LOW") == "LOW"


# ==============================================================================
# 2. INTEGRATION & API TESTS
# ==============================================================================

def test_cluster_with_multiple_cases_produces_intelligence():
    """A cluster of verified cases produces complete intelligence record."""
    cluster_cases = [
        _make_verified_case("c1", NASHIK_LAT, NASHIK_LON, "Tomato Early Blight", 75.0, "HIGH"),
        _make_verified_case("c2", NASHIK_LAT + 0.001, NASHIK_LON + 0.001, "Tomato Early Blight", 85.0, "HIGH"),
        _make_verified_case("c3", NASHIK_LAT - 0.001, NASHIK_LON - 0.001, "Tomato Late Blight", 70.0, "HIGH"),
    ]
    _setup_mock_service(cluster_cases)

    try:
        response = client.get("/api/outbreaks/intelligence?eps_km=2.0&min_samples=3")
        assert response.status_code == 200
        data = response.json()
        assert len(data["clusters"]) == 1

        cluster = data["clusters"][0]
        assert cluster["cluster_id"] == 0
        assert cluster["case_count"] == 3
        assert set(cluster["case_ids"]) == {"c1", "c2", "c3"}
        assert cluster["dominant_disease"] == "Tomato Early Blight"
        assert cluster["average_risk_score"] == 76.7
        assert cluster["highest_risk_level"] == "HIGH"
        assert cluster["outbreak_level"] == "HIGH"
        assert round(cluster["center_latitude"], 4) == round(NASHIK_LAT, 4)
        assert round(cluster["center_longitude"], 4) == round(NASHIK_LON, 4)
    finally:
        app.dependency_overrides.clear()


def test_multiple_clusters_produce_separate_intelligence_records():
    """Two geographically separated groups of verified cases form 2 distinct intelligence records."""
    cases = [
        # Cluster 0 in Nashik
        _make_verified_case("n1", NASHIK_LAT, NASHIK_LON, "Tomato Early Blight", 80.0, "HIGH"),
        _make_verified_case("n2", NASHIK_LAT + 0.001, NASHIK_LON, "Tomato Early Blight", 80.0, "HIGH"),
        _make_verified_case("n3", NASHIK_LAT, NASHIK_LON + 0.001, "Tomato Early Blight", 80.0, "HIGH"),
        # Cluster 1 in Pune
        _make_verified_case("p1", PUNE_LAT, PUNE_LON, "Potato Late Blight", 40.0, "MEDIUM"),
        _make_verified_case("p2", PUNE_LAT + 0.001, PUNE_LON, "Potato Late Blight", 40.0, "MEDIUM"),
        _make_verified_case("p3", PUNE_LAT, PUNE_LON + 0.001, "Potato Late Blight", 40.0, "MEDIUM"),
    ]
    _setup_mock_service(cases)

    try:
        response = client.get("/api/outbreaks/intelligence?eps_km=2.0&min_samples=3")
        assert response.status_code == 200
        data = response.json()
        assert len(data["clusters"]) == 2

        c0 = data["clusters"][0]
        c1 = data["clusters"][1]

        # Verify cluster 0
        assert c0["case_count"] == 3
        assert c0["dominant_disease"] == "Tomato Early Blight"
        assert c0["average_risk_score"] == 80.0
        assert c0["highest_risk_level"] == "HIGH"
        assert c0["outbreak_level"] == "HIGH"

        # Verify cluster 1
        assert c1["case_count"] == 3
        assert c1["dominant_disease"] == "Potato Late Blight"
        assert c1["average_risk_score"] == 40.0
        assert c1["highest_risk_level"] == "MEDIUM"
        assert c1["outbreak_level"] == "MEDIUM"
    finally:
        app.dependency_overrides.clear()


def test_no_verified_clusters_returns_empty_list():
    """When zero verified clusters exist, returns an empty list."""
    _setup_mock_service([])

    try:
        response = client.get("/api/outbreaks/intelligence")
        assert response.status_code == 200
        data = response.json()
        assert data["clusters"] == []
    finally:
        app.dependency_overrides.clear()


def test_non_verified_cases_never_contribute_to_intelligence():
    """Cases with status other than VERIFIED are strictly excluded from intelligence analysis."""
    mixed_cases = [
        # 2 verified cases (insufficient for min_samples=3)
        _make_verified_case("v1", NASHIK_LAT, NASHIK_LON, status="VERIFIED"),
        _make_verified_case("v2", NASHIK_LAT + 0.001, NASHIK_LON, status="VERIFIED"),
        # Other lifecycle statuses that must be ignored
        _make_verified_case("nv1", NASHIK_LAT, NASHIK_LON + 0.001, status="PENDING_ANALYSIS"),
        _make_verified_case("nv2", NASHIK_LAT + 0.002, NASHIK_LON, status="ANALYZED"),
        _make_verified_case("nv3", NASHIK_LAT, NASHIK_LON + 0.002, status="NEEDS_VERIFICATION"),
        _make_verified_case("nv4", NASHIK_LAT + 0.001, NASHIK_LON + 0.001, status="REJECTED"),
        _make_verified_case("nv5", NASHIK_LAT - 0.001, NASHIK_LON, status="MORE_INFO_REQUIRED"),
    ]
    env = _setup_mock_service(mixed_cases)

    try:
        # Direct service call to verify filtering
        clusters = env["intelligence_service"].analyze_clusters(mixed_cases, eps_km=2.0, min_samples=3)
        # Should be empty because only 2 verified cases exist (< min_samples 3)
        assert len(clusters) == 0
    finally:
        app.dependency_overrides.clear()


def test_api_parameter_validation():
    """Query parameter validation rejects eps_km <= 0 or min_samples < 1."""
    # eps_km <= 0
    r1 = client.get("/api/outbreaks/intelligence?eps_km=0.0")
    assert r1.status_code == 422

    r2 = client.get("/api/outbreaks/intelligence?eps_km=-1.5")
    assert r2.status_code == 422

    # min_samples < 1
    r3 = client.get("/api/outbreaks/intelligence?min_samples=0")
    assert r3.status_code == 422
