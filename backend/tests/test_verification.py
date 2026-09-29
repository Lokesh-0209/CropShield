"""Tests for the Officer Verification workflow in CropShield."""
import uuid
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.models.case import CaseStatus, VerificationStatus
from app.services.case_service import CaseService, get_case_service

client = TestClient(app)

SAMPLE_CASE_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"

SAMPLE_CASE_BASE = {
    "id": SAMPLE_CASE_ID,
    "crop": "Tomato",
    "growth_stage": "Flowering",
    "latitude": 19.9975,
    "longitude": 73.7898,
    "location_name": "Nashik Zone 3",
    "symptoms": "Brown spots appearing on lower leaves",
    "image_url": "https://example.com/leaf.jpg",
    "disease": "Early Blight",
    "confidence": 0.94,
    "risk_score": 75.0,
    "risk_level": "HIGH",
    "status": "NEEDS_VERIFICATION",
    "created_at": "2026-09-29T14:00:00+00:00",
    "verified_at": None,
    "officer_note": None,
}


def _setup_mock_service(initial_case, update_return_data=None):
    mock_db = MagicMock()

    # Mock select
    select_query = MagicMock()
    select_resp = MagicMock()
    select_resp.data = [initial_case] if initial_case is not None else []
    select_query.execute.return_value = select_resp
    mock_db.table.return_value.select.return_value.eq.return_value = select_query

    # Mock update
    update_query = MagicMock()
    update_resp = MagicMock()
    if update_return_data is not None:
        update_resp.data = [update_return_data]
    else:
        update_resp.data = [initial_case] if initial_case is not None else []
    update_query.execute.return_value = update_resp
    mock_db.table.return_value.update.return_value.eq.return_value = update_query

    test_service = CaseService(db_client=mock_db)
    app.dependency_overrides[get_case_service] = lambda: test_service
    return mock_db


def test_verify_case_verified_success():
    """NEEDS_VERIFICATION -> VERIFIED sets verified_at and officer_note."""
    current_case = dict(SAMPLE_CASE_BASE, status="NEEDS_VERIFICATION")
    updated_case = dict(
        SAMPLE_CASE_BASE,
        status="VERIFIED",
        officer_note="Symptoms and image are consistent with Early Blight.",
        verified_at="2026-09-29T16:30:00+00:00",
    )
    mock_db = _setup_mock_service(current_case, updated_case)

    try:
        response = client.patch(
            f"/api/cases/{SAMPLE_CASE_ID}/verify",
            json={
                "status": "VERIFIED",
                "officer_note": "Symptoms and image are consistent with Early Blight.",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "VERIFIED"
        assert data["officer_note"] == "Symptoms and image are consistent with Early Blight."
        assert data["verified_at"] is not None

        # Verify update payload sent to Supabase
        update_call_arg = mock_db.table.return_value.update.call_args[0][0]
        assert update_call_arg["status"] == "VERIFIED"
        assert update_call_arg["officer_note"] == "Symptoms and image are consistent with Early Blight."
        assert update_call_arg["verified_at"] is not None
    finally:
        app.dependency_overrides.clear()


def test_verify_case_rejected_success():
    """NEEDS_VERIFICATION -> REJECTED keeps verified_at None and saves officer_note."""
    current_case = dict(SAMPLE_CASE_BASE, status="NEEDS_VERIFICATION")
    updated_case = dict(
        SAMPLE_CASE_BASE,
        status="REJECTED",
        officer_note="Image shows mechanical leaf damage, not a pathogen.",
        verified_at=None,
    )
    mock_db = _setup_mock_service(current_case, updated_case)

    try:
        response = client.patch(
            f"/api/cases/{SAMPLE_CASE_ID}/verify",
            json={
                "status": "REJECTED",
                "officer_note": "Image shows mechanical leaf damage, not a pathogen.",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "REJECTED"
        assert data["officer_note"] == "Image shows mechanical leaf damage, not a pathogen."
        assert data["verified_at"] is None

        update_call_arg = mock_db.table.return_value.update.call_args[0][0]
        assert update_call_arg["status"] == "REJECTED"
        assert update_call_arg["officer_note"] == "Image shows mechanical leaf damage, not a pathogen."
        assert update_call_arg["verified_at"] is None
    finally:
        app.dependency_overrides.clear()


def test_verify_case_more_info_required_success():
    """NEEDS_VERIFICATION -> MORE_INFO_REQUIRED keeps verified_at None and saves officer_note."""
    current_case = dict(SAMPLE_CASE_BASE, status="NEEDS_VERIFICATION")
    updated_case = dict(
        SAMPLE_CASE_BASE,
        status="MORE_INFO_REQUIRED",
        officer_note="Please upload a clearer close-up photograph of the leaf underside.",
        verified_at=None,
    )
    mock_db = _setup_mock_service(current_case, updated_case)

    try:
        response = client.patch(
            f"/api/cases/{SAMPLE_CASE_ID}/verify",
            json={
                "status": "MORE_INFO_REQUIRED",
                "officer_note": "Please upload a clearer close-up photograph of the leaf underside.",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "MORE_INFO_REQUIRED"
        assert data["officer_note"] == "Please upload a clearer close-up photograph of the leaf underside."
        assert data["verified_at"] is None

        update_call_arg = mock_db.table.return_value.update.call_args[0][0]
        assert update_call_arg["status"] == "MORE_INFO_REQUIRED"
        assert update_call_arg["verified_at"] is None
    finally:
        app.dependency_overrides.clear()


def test_verify_case_rejects_empty_officer_note():
    """officer_note is mandatory and cannot be empty or whitespace."""
    response = client.patch(
        f"/api/cases/{SAMPLE_CASE_ID}/verify",
        json={
            "status": "VERIFIED",
            "officer_note": "   ",
        },
    )
    assert response.status_code == 422
    assert "officer_note" in response.text.lower()


def test_verify_case_rejects_missing_officer_note():
    """Missing officer_note returns 422."""
    response = client.patch(
        f"/api/cases/{SAMPLE_CASE_ID}/verify",
        json={
            "status": "VERIFIED",
        },
    )
    assert response.status_code == 422


def test_verify_case_rejects_invalid_status_value():
    """Invalid verification status value (e.g. PENDING_ANALYSIS, ANALYZED, or random) returns 422."""
    response = client.patch(
        f"/api/cases/{SAMPLE_CASE_ID}/verify",
        json={
            "status": "PENDING_ANALYSIS",
            "officer_note": "Trying to set back to pending",
        },
    )
    assert response.status_code == 422

    response2 = client.patch(
        f"/api/cases/{SAMPLE_CASE_ID}/verify",
        json={
            "status": "APPROVED",
            "officer_note": "Invalid enum value",
        },
    )
    assert response2.status_code == 422


def test_verify_case_conflict_from_pending_analysis():
    """Calling verify when case is in PENDING_ANALYSIS returns 409 Conflict."""
    current_case = dict(SAMPLE_CASE_BASE, status="PENDING_ANALYSIS")
    _setup_mock_service(current_case)

    try:
        response = client.patch(
            f"/api/cases/{SAMPLE_CASE_ID}/verify",
            json={
                "status": "VERIFIED",
                "officer_note": "Premature verification attempt",
            },
        )
        assert response.status_code == 409
        assert "NEEDS_VERIFICATION" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_verify_case_conflict_from_analyzed():
    """Calling verify when case is in ANALYZED returns 409 Conflict."""
    current_case = dict(SAMPLE_CASE_BASE, status="ANALYZED")
    _setup_mock_service(current_case)

    try:
        response = client.patch(
            f"/api/cases/{SAMPLE_CASE_ID}/verify",
            json={
                "status": "VERIFIED",
                "officer_note": "Attempted before needs verification",
            },
        )
        assert response.status_code == 409
        assert "NEEDS_VERIFICATION" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_verify_case_conflict_from_already_verified():
    """VERIFIED is terminal; calling verify again returns 409 Conflict."""
    current_case = dict(SAMPLE_CASE_BASE, status="VERIFIED")
    _setup_mock_service(current_case)

    try:
        response = client.patch(
            f"/api/cases/{SAMPLE_CASE_ID}/verify",
            json={
                "status": "REJECTED",
                "officer_note": "Attempt to change terminal status",
            },
        )
        assert response.status_code == 409
    finally:
        app.dependency_overrides.clear()


def test_verify_case_conflict_from_already_rejected():
    """REJECTED is terminal; calling verify again returns 409 Conflict."""
    current_case = dict(SAMPLE_CASE_BASE, status="REJECTED")
    _setup_mock_service(current_case)

    try:
        response = client.patch(
            f"/api/cases/{SAMPLE_CASE_ID}/verify",
            json={
                "status": "VERIFIED",
                "officer_note": "Attempt to change terminal status",
            },
        )
        assert response.status_code == 409
    finally:
        app.dependency_overrides.clear()


def test_more_info_required_can_return_to_needs_verification():
    """MORE_INFO_REQUIRED can transition back to NEEDS_VERIFICATION via /api/cases/{id}/status."""
    current_case = dict(SAMPLE_CASE_BASE, status="MORE_INFO_REQUIRED")
    updated_case = dict(SAMPLE_CASE_BASE, status="NEEDS_VERIFICATION", officer_note="Additional photo submitted by farmer.")
    _setup_mock_service(current_case, updated_case)

    try:
        response = client.patch(
            f"/api/cases/{SAMPLE_CASE_ID}/status",
            json={
                "status": "NEEDS_VERIFICATION",
                "officer_note": "Additional photo submitted by farmer.",
            },
        )
        assert response.status_code == 200
        assert response.json()["status"] == "NEEDS_VERIFICATION"
    finally:
        app.dependency_overrides.clear()


def test_verify_case_not_found():
    """Calling verify on non-existent case ID returns 404."""
    _setup_mock_service(None)

    try:
        response = client.patch(
            f"/api/cases/{SAMPLE_CASE_ID}/verify",
            json={
                "status": "VERIFIED",
                "officer_note": "Non-existent case note",
            },
        )
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_verify_case_rejects_extra_fields():
    """Forbidden extra fields in verification request body return 422."""
    response = client.patch(
        f"/api/cases/{SAMPLE_CASE_ID}/verify",
        json={
            "status": "VERIFIED",
            "officer_note": "Valid note",
            "extra_field": "disallowed",
        },
    )
    assert response.status_code == 422
