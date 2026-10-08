"""Tests for the Case Analysis orchestration service and endpoint in CropShield."""
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.models.case import CaseStatus
from app.models.risk import RiskLevel
from app.schemas.ai import AIInferenceResult
from app.schemas.risk import RiskAnalysisResponse
from app.services.ai_inference_service import AIInferenceService, ModelNotAvailableError
from app.services.case_analysis_service import CaseAnalysisService, get_case_analysis_service
from app.services.case_service import CaseService, get_case_service
from app.services.image_preprocessor import ImageValidationError
from app.services.risk_service import RiskService

client = TestClient(app)

SAMPLE_CASE_ID = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22"

SAMPLE_PENDING_CASE = {
    "id": SAMPLE_CASE_ID,
    "crop": "Tomato",
    "growth_stage": "Flowering",
    "latitude": 19.9975,
    "longitude": 73.7898,
    "location_name": "Nashik Field 1",
    "symptoms": "Brown leaf spots with yellow halo",
    "image_url": "https://example.com/leaf.jpg",
    "disease": None,
    "confidence": None,
    "risk_score": None,
    "risk_level": None,
    "status": "PENDING_ANALYSIS",
    "created_at": "2026-09-29T12:00:00+00:00",
    "verified_at": None,
    "officer_note": None,
}


def _setup_analysis_env(
    case_data=SAMPLE_PENDING_CASE,
    ai_result=None,
    ai_exception=None,
    risk_result=None,
    image_bytes=b"dummy-image-bytes",
):
    """Configures mock services and dependency overrides for analysis tests."""
    mock_db = MagicMock()

    # Mock DB select for case
    select_query = MagicMock()
    select_resp = MagicMock()
    select_resp.data = [case_data] if case_data is not None else []
    select_query.execute.return_value = select_resp
    mock_db.table.return_value.select.return_value.eq.return_value = select_query

    # Mock DB update
    update_query = MagicMock()
    update_resp = MagicMock()

    def get_updated_data(*args, **kwargs):
        if case_data is None:
            update_resp.data = []
        else:
            updated = dict(case_data)
            # update call arg payload
            if mock_db.table.return_value.update.call_args:
                payload = mock_db.table.return_value.update.call_args[0][0]
                updated.update(payload)
            update_resp.data = [updated]
        return update_resp

    update_query.execute.side_effect = get_updated_data
    mock_db.table.return_value.update.return_value.eq.return_value = update_query

    case_service = CaseService(db_client=mock_db)

    # Mock AI Service
    mock_ai = MagicMock(spec=AIInferenceService)
    if ai_exception:
        mock_ai.infer.side_effect = ai_exception
    elif ai_result:
        mock_ai.infer.return_value = ai_result
    else:
        mock_ai.infer.return_value = AIInferenceResult(
            disease="Tomato Early Blight",
            confidence=0.92,
        )

    # Mock Risk Service
    mock_risk = MagicMock(spec=RiskService)
    if risk_result:
        mock_risk.calculate_risk.return_value = risk_result
    else:
        mock_risk.calculate_risk.return_value = RiskAnalysisResponse(
            risk_score=75,
            risk_level=RiskLevel.HIGH,
        )

    # Mock Image Loader
    mock_image_loader = MagicMock(return_value=image_bytes)

    analysis_service = CaseAnalysisService(
        case_service=case_service,
        ai_service=mock_ai,
        risk_service=mock_risk,
        image_loader=mock_image_loader,
    )

    app.dependency_overrides[get_case_service] = lambda: case_service
    app.dependency_overrides[get_case_analysis_service] = lambda: analysis_service

    return {
        "mock_db": mock_db,
        "mock_ai": mock_ai,
        "mock_risk": mock_risk,
        "mock_image_loader": mock_image_loader,
        "case_service": case_service,
        "analysis_service": analysis_service,
    }


# ==============================================================================
# 1. SUCCESSFUL ORCHESTRATION TESTS
# ==============================================================================

def test_successful_analysis_orchestration():
    """
    Connects AI inference and risk analysis into one case-analysis workflow:
    Pending case with image -> AI inference -> save disease + confidence ->
    risk calculation -> save risk_score + risk_level -> ANALYZED.
    """
    ai_result = AIInferenceResult(disease="Tomato Early Blight", confidence=0.94)
    risk_result = RiskAnalysisResponse(risk_score=78, risk_level=RiskLevel.HIGH)

    env = _setup_analysis_env(
        case_data=SAMPLE_PENDING_CASE,
        ai_result=ai_result,
        risk_result=risk_result,
    )

    try:
        response = client.post(
            f"/api/cases/{SAMPLE_CASE_ID}/analyze",
            json={
                "temperature": 26.0,
                "humidity": 82.0,
                "rainfall": 15.0,
                "nearby_verified_cases": 3,
            },
        )
        assert response.status_code == 200
        data = response.json()

        # Disease and confidence persisted
        assert data["disease"] == "Tomato Early Blight"
        assert data["confidence"] == 0.94

        # Risk score and risk level persisted
        assert data["risk_score"] == 78.0
        assert data["risk_level"] == "HIGH"

        # Status updated to ANALYZED
        assert data["status"] == "ANALYZED"

        # Verify DB update payload
        env["mock_db"].table.return_value.update.assert_called_once()
        update_payload = env["mock_db"].table.return_value.update.call_args[0][0]
        assert update_payload["disease"] == "Tomato Early Blight"
        assert update_payload["confidence"] == 0.94
        assert update_payload["risk_score"] == 78.0
        assert update_payload["risk_level"] == "HIGH"
        assert update_payload["status"] == "ANALYZED"
    finally:
        app.dependency_overrides.clear()


def test_successful_analysis_with_default_environmental_values():
    """Analysis succeeds when request body is empty or omitted, using default weather values."""
    env = _setup_analysis_env(case_data=SAMPLE_PENDING_CASE)

    try:
        response = client.post(f"/api/cases/{SAMPLE_CASE_ID}/analyze")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ANALYZED"
        assert data["disease"] == "Tomato Early Blight"
        assert data["confidence"] == 0.92
    finally:
        app.dependency_overrides.clear()


# ==============================================================================
# 2. LIFECYCLE & STATE VALIDATION TESTS
# ==============================================================================

def test_analysis_of_non_pending_case_returns_409():
    """Analysis of a case not in PENDING_ANALYSIS (e.g. ANALYZED, NEEDS_VERIFICATION, VERIFIED) returns 409 Conflict."""
    for invalid_status in ["ANALYZED", "NEEDS_VERIFICATION", "VERIFIED", "REJECTED", "MORE_INFO_REQUIRED"]:
        case_data = dict(SAMPLE_PENDING_CASE, status=invalid_status)
        env = _setup_analysis_env(case_data=case_data)

        try:
            response = client.post(f"/api/cases/{SAMPLE_CASE_ID}/analyze", json={})
            assert response.status_code == 409
            assert "PENDING_ANALYSIS" in response.json()["detail"]
            # DB update must not have been called
            env["mock_db"].table.return_value.update.assert_not_called()
        finally:
            app.dependency_overrides.clear()


def test_analyzed_case_can_continue_to_needs_verification():
    """After successful analysis, the case in ANALYZED status can continue to NEEDS_VERIFICATION."""
    env = _setup_analysis_env(case_data=SAMPLE_PENDING_CASE)

    try:
        # Step 1: Analyze case -> ANALYZED
        resp1 = client.post(f"/api/cases/{SAMPLE_CASE_ID}/analyze")
        assert resp1.status_code == 200
        assert resp1.json()["status"] == "ANALYZED"

        # Update mock case to reflect ANALYZED status for subsequent status update call
        analyzed_case = dict(SAMPLE_PENDING_CASE, status="ANALYZED")
        env["case_service"].get_case_by_id = MagicMock(return_value=analyzed_case)

        # Step 2: Transition ANALYZED -> NEEDS_VERIFICATION via existing status endpoint
        resp2 = client.patch(
            f"/api/cases/{SAMPLE_CASE_ID}/status",
            json={"status": "NEEDS_VERIFICATION"},
        )
        assert resp2.status_code == 200
        assert resp2.json()["status"] == "NEEDS_VERIFICATION"
    finally:
        app.dependency_overrides.clear()


# ==============================================================================
# 3. MISSING MODEL / MISSING IMAGE / ERROR BEHAVIOR TESTS
# ==============================================================================

def test_missing_image_does_not_produce_fake_ai_output():
    """Case with missing or empty image_url returns 400 and does not run AI or update DB."""
    for empty_img in [None, "", "   "]:
        case_data = dict(SAMPLE_PENDING_CASE, image_url=empty_img)
        env = _setup_analysis_env(case_data=case_data)

        try:
            response = client.post(f"/api/cases/{SAMPLE_CASE_ID}/analyze")
            assert response.status_code == 400
            assert "image" in response.json()["detail"].lower()
            env["mock_ai"].infer.assert_not_called()
            env["mock_db"].table.return_value.update.assert_not_called()
        finally:
            app.dependency_overrides.clear()


def test_missing_model_returns_503_and_does_not_save_fake_prediction():
    """
    When model artifact is not configured / unavailable:
    - returns 503 Service Unavailable
    - does not save fake disease or confidence
    - does not mark the case ANALYZED
    """
    env = _setup_analysis_env(
        case_data=SAMPLE_PENDING_CASE,
        ai_exception=ModelNotAvailableError("AI inference model is not configured or available."),
    )

    try:
        response = client.post(f"/api/cases/{SAMPLE_CASE_ID}/analyze")
        assert response.status_code == 503
        assert "not configured or available" in response.json()["detail"]

        # Crucial: DB update was NEVER invoked; case remains untouched
        env["mock_db"].table.return_value.update.assert_not_called()
    finally:
        app.dependency_overrides.clear()


def test_corrupted_image_failure_does_not_partially_mark_case_analyzed():
    """Corrupted/invalid image bytes raise 400 and prevent partial case analysis update."""
    env = _setup_analysis_env(
        case_data=SAMPLE_PENDING_CASE,
        ai_exception=ImageValidationError("Failed to decode image pixels: corrupted file"),
    )

    try:
        response = client.post(f"/api/cases/{SAMPLE_CASE_ID}/analyze")
        assert response.status_code == 400
        assert "image validation failed" in response.json()["detail"].lower()
        env["mock_db"].table.return_value.update.assert_not_called()
    finally:
        app.dependency_overrides.clear()


# ==============================================================================
# 4. RISK INPUTS & PARAMETER PASS-THROUGH TESTS
# ==============================================================================

def test_risk_service_called_with_correct_case_and_environment_inputs():
    """
    Verifies that RiskService.calculate_risk is called with:
    - temperature, humidity, rainfall from analysis request
    - crop, growth_stage from case record
    - nearby_verified_cases from analysis request
    """
    env = _setup_analysis_env(case_data=SAMPLE_PENDING_CASE)

    try:
        client.post(
            f"/api/cases/{SAMPLE_CASE_ID}/analyze",
            json={
                "temperature": 31.5,
                "humidity": 88.0,
                "rainfall": 45.0,
                "nearby_verified_cases": 6,
            },
        )

        env["mock_risk"].calculate_risk.assert_called_once()
        risk_req = env["mock_risk"].calculate_risk.call_args[0][0]

        # Verify values received by RiskService
        assert risk_req.temperature == 31.5
        assert risk_req.humidity == 88.0
        assert risk_req.rainfall == 45.0
        assert risk_req.crop == "Tomato"  # from case
        assert risk_req.growth_stage == "Flowering"  # from case
        assert risk_req.nearby_verified_cases == 6
    finally:
        app.dependency_overrides.clear()


def test_analysis_request_validates_environmental_bounds():
    """Validation rejects out-of-range temperatures, humidities, negative rainfalls, or extra fields."""
    # Temperature too high
    r1 = client.post(f"/api/cases/{SAMPLE_CASE_ID}/analyze", json={"temperature": 100.0})
    assert r1.status_code == 422

    # Humidity above 100
    r2 = client.post(f"/api/cases/{SAMPLE_CASE_ID}/analyze", json={"humidity": 120.0})
    assert r2.status_code == 422

    # Negative rainfall
    r3 = client.post(f"/api/cases/{SAMPLE_CASE_ID}/analyze", json={"rainfall": -5.0})
    assert r3.status_code == 422

    # Negative nearby cases
    r4 = client.post(f"/api/cases/{SAMPLE_CASE_ID}/analyze", json={"nearby_verified_cases": -2})
    assert r4.status_code == 422

    # Extra disallowed fields
    r5 = client.post(f"/api/cases/{SAMPLE_CASE_ID}/analyze", json={"unsupported_field": "test"})
    assert r5.status_code == 422


# ==============================================================================
# 5. UNKNOWN CASE NOT FOUND (404)
# ==============================================================================

def test_unknown_case_returns_404():
    """Analysis on a non-existent case UUID returns 404 Not Found."""
    env = _setup_analysis_env(case_data=None)

    try:
        response = client.post(f"/api/cases/{SAMPLE_CASE_ID}/analyze")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()
