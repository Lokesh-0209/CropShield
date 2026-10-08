import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.models.risk import RiskLevel
from app.schemas.risk import RiskAnalysisRequest, RiskAnalysisResponse
from app.services.risk_service import RiskService

client = TestClient(app)

PROMPT_EXAMPLE_PAYLOAD = {
    "temperature": 28,
    "humidity": 78,
    "rainfall": 12,
    "crop": "Tomato",
    "growth_stage": "Flowering",
    "nearby_verified_cases": 4,
}


# ==============================================================================
# 1. CORE CALCULATION & SPECIFICATION TESTS
# ==============================================================================

def test_risk_calculation_matches_specification():
    """Verifies that the reference input from the prompt produces risk_score 78 and HIGH."""
    service = RiskService()
    req = RiskAnalysisRequest(**PROMPT_EXAMPLE_PAYLOAD)
    result = service.calculate_risk(req)

    assert isinstance(result, RiskAnalysisResponse)
    assert result.risk_score == 78
    assert result.risk_level == RiskLevel.HIGH


def test_risk_calculation_is_deterministic():
    """Verifies that identical inputs produce bitwise identical outputs every execution."""
    service = RiskService()
    req = RiskAnalysisRequest(**PROMPT_EXAMPLE_PAYLOAD)

    first_run = service.calculate_risk(req)
    for _ in range(10):
        subsequent_run = service.calculate_risk(req)
        assert subsequent_run.risk_score == first_run.risk_score
        assert subsequent_run.risk_level == first_run.risk_level


# ==============================================================================
# 2. BOUNDARY TESTS (LOW: 0–39, MEDIUM: 40–69, HIGH: 70–100)
# ==============================================================================

def test_risk_level_boundaries():
    service = RiskService()

    # 1. LOW boundary condition (cold, dry, non-susceptible crop, zero cases)
    low_req = RiskAnalysisRequest(
        temperature=5.0,
        humidity=20.0,
        rainfall=0.0,
        crop="Wheat",
        growth_stage="Mature",
        nearby_verified_cases=0,
    )
    low_res = service.calculate_risk(low_req)
    assert 0 <= low_res.risk_score <= 39
    assert low_res.risk_level == RiskLevel.LOW

    # 2. MEDIUM boundary condition (mild conditions, moderate rain/humidity)
    med_req = RiskAnalysisRequest(
        temperature=20.0,
        humidity=66.0,
        rainfall=5.0,
        crop="Wheat",
        growth_stage="Vegetative",
        nearby_verified_cases=1,
    )
    med_res = service.calculate_risk(med_req)
    assert 40 <= med_res.risk_score <= 69
    assert med_res.risk_level == RiskLevel.MEDIUM

    # 3. HIGH boundary condition (hot, high humidity, moderate rain, nearby cases)
    high_req = RiskAnalysisRequest(
        temperature=26.0,
        humidity=88.0,
        rainfall=15.0,
        crop="Tomato",
        growth_stage="Flowering",
        nearby_verified_cases=5,
    )
    high_res = service.calculate_risk(high_req)
    assert 70 <= high_res.risk_score <= 100
    assert high_res.risk_level == RiskLevel.HIGH


def test_risk_score_is_always_clamped_between_0_and_100():
    service = RiskService()

    # Extreme high condition: maximum humidity, huge rainfall, 500 cases
    extreme_high = RiskAnalysisRequest(
        temperature=25.0,
        humidity=100.0,
        rainfall=900.0,
        crop="Tomato",
        growth_stage="Flowering",
        nearby_verified_cases=500,
    )
    high_res = service.calculate_risk(extreme_high)
    assert high_res.risk_score <= 100
    assert high_res.risk_score >= 0
    assert high_res.risk_level == RiskLevel.HIGH

    # Extreme low condition: freezing, 0% humidity, 0 rain, 0 cases
    extreme_low = RiskAnalysisRequest(
        temperature=-30.0,
        humidity=0.0,
        rainfall=0.0,
        crop="Barley",
        growth_stage="Harvesting",
        nearby_verified_cases=0,
    )
    low_res = service.calculate_risk(extreme_low)
    assert low_res.risk_score >= 0
    assert low_res.risk_score <= 100
    assert low_res.risk_level == RiskLevel.LOW


# ==============================================================================
# 3. INPUT VALIDATION TESTS
# ==============================================================================

def test_invalid_humidity_above_100_rejected():
    with pytest.raises(ValidationError):
        RiskAnalysisRequest(**{**PROMPT_EXAMPLE_PAYLOAD, "humidity": 105.0})


def test_invalid_humidity_below_0_rejected():
    with pytest.raises(ValidationError):
        RiskAnalysisRequest(**{**PROMPT_EXAMPLE_PAYLOAD, "humidity": -5.0})


def test_invalid_negative_rainfall_rejected():
    with pytest.raises(ValidationError):
        RiskAnalysisRequest(**{**PROMPT_EXAMPLE_PAYLOAD, "rainfall": -2.0})


def test_invalid_negative_nearby_cases_rejected():
    with pytest.raises(ValidationError):
        RiskAnalysisRequest(**{**PROMPT_EXAMPLE_PAYLOAD, "nearby_verified_cases": -1})


def test_invalid_empty_crop_rejected():
    with pytest.raises(ValidationError):
        RiskAnalysisRequest(**{**PROMPT_EXAMPLE_PAYLOAD, "crop": "   "})


def test_invalid_empty_growth_stage_rejected():
    with pytest.raises(ValidationError):
        RiskAnalysisRequest(**{**PROMPT_EXAMPLE_PAYLOAD, "growth_stage": ""})


# ==============================================================================
# 4. API ENDPOINT TESTS (POST /api/risk/analyze)
# ==============================================================================

def test_api_risk_analyze_endpoint_returns_200_and_expected_data():
    response = client.post("/api/risk/analyze", json=PROMPT_EXAMPLE_PAYLOAD)
    assert response.status_code == 200

    data = response.json()
    assert data["risk_score"] == 78
    assert data["risk_level"] == "HIGH"


def test_api_risk_analyze_endpoint_rejects_invalid_input_with_422():
    invalid_payload = {**PROMPT_EXAMPLE_PAYLOAD, "humidity": 125.0}
    response = client.post("/api/risk/analyze", json=invalid_payload)
    assert response.status_code == 422
    assert "humidity" in response.text.lower()


def test_api_risk_analyze_endpoint_rejects_negative_cases_with_422():
    invalid_payload = {**PROMPT_EXAMPLE_PAYLOAD, "nearby_verified_cases": -5}
    response = client.post("/api/risk/analyze", json=invalid_payload)
    assert response.status_code == 422
