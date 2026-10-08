import uuid
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.models.case import CaseStatus
from app.services.case_service import CaseService, get_case_service

client = TestClient(app)

VALID_PAYLOAD = {
    "crop": "Tomato",
    "growth_stage": "Flowering",
    "latitude": 19.9975,
    "longitude": 73.7898,
    "location_name": "Nashik Zone 3",
    "symptoms": "Brown spots appearing on lower leaves",
    "image_url": None,
}

SAMPLE_CASE_DETAIL = {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "crop": "Tomato",
    "growth_stage": "Flowering",
    "latitude": 19.9975,
    "longitude": 73.7898,
    "location_name": "Nashik Zone 3",
    "symptoms": "Brown spots appearing on lower leaves",
    "image_url": None,
    "disease": None,
    "confidence": None,
    "risk_score": None,
    "risk_level": None,
    "status": "PENDING_ANALYSIS",
    "created_at": "2026-09-29T14:00:00+00:00",
    "verified_at": None,
    "officer_note": None,
}


# ==============================================================================
# EXISTING VALIDATION TESTS (Preserved)
# ==============================================================================

def test_validation_rejects_invalid_latitude_high():
    payload = {**VALID_PAYLOAD, "latitude": 95.5}
    response = client.post("/api/cases", json=payload)
    assert response.status_code == 422
    assert "latitude" in response.text.lower()


def test_validation_rejects_invalid_latitude_low():
    payload = {**VALID_PAYLOAD, "latitude": -95.5}
    response = client.post("/api/cases", json=payload)
    assert response.status_code == 422
    assert "latitude" in response.text.lower()


def test_validation_rejects_invalid_longitude_high():
    payload = {**VALID_PAYLOAD, "longitude": 185.0}
    response = client.post("/api/cases", json=payload)
    assert response.status_code == 422
    assert "longitude" in response.text.lower()


def test_validation_rejects_invalid_longitude_low():
    payload = {**VALID_PAYLOAD, "longitude": -185.0}
    response = client.post("/api/cases", json=payload)
    assert response.status_code == 422
    assert "longitude" in response.text.lower()


def test_validation_rejects_empty_crop_and_symptoms():
    payload = {**VALID_PAYLOAD, "crop": "   ", "symptoms": ""}
    response = client.post("/api/cases", json=payload)
    assert response.status_code == 422


# ==============================================================================
# POST /api/cases TESTS (Preserved & Extended)
# ==============================================================================

def test_case_creation_uses_status_pending_analysis():
    mock_db = MagicMock()
    inserted_records = []

    def mock_insert(record):
        inserted_records.append(record)
        mock_query = MagicMock()
        mock_response = MagicMock()
        mock_response.data = [{
            "id": record["id"],
            "status": record["status"],
            "created_at": record["created_at"],
        }]
        mock_query.execute.return_value = mock_response
        return mock_query

    mock_db.table.return_value.insert = mock_insert

    test_service = CaseService(db_client=mock_db)
    app.dependency_overrides[get_case_service] = lambda: test_service

    try:
        response = client.post("/api/cases", json=VALID_PAYLOAD)
        assert response.status_code == 201

        data = response.json()
        assert data["status"] == "PENDING_ANALYSIS"
        assert "id" in data
        assert "created_at" in data

        assert len(inserted_records) == 1
        persisted = inserted_records[0]
        assert persisted["status"] == "PENDING_ANALYSIS"
        assert persisted["crop"] == "Tomato"
        assert persisted["disease"] is None
        assert persisted["confidence"] is None
        assert persisted["risk_score"] is None
        assert persisted["risk_level"] is None
        assert persisted["verified_at"] is None
        assert persisted["officer_note"] is None
    finally:
        app.dependency_overrides.clear()


def test_case_creation_returns_503_when_database_unconfigured():
    test_service = CaseService(db_client=None)
    app.dependency_overrides[get_case_service] = lambda: test_service

    try:
        response = client.post("/api/cases", json=VALID_PAYLOAD)
        assert response.status_code == 503
        assert "Database service not configured" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_case_creation_returns_500_on_database_error():
    mock_db = MagicMock()
    mock_db.table.return_value.insert.side_effect = Exception("Connection timeout to PostgreSQL")

    test_service = CaseService(db_client=mock_db)
    app.dependency_overrides[get_case_service] = lambda: test_service

    try:
        response = client.post("/api/cases", json=VALID_PAYLOAD)
        assert response.status_code == 500
        assert "Database insertion failed" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


# ==============================================================================
# GET /api/cases/{case_id} TESTS
# ==============================================================================

def test_get_case_by_id_returns_created_case():
    case_id = SAMPLE_CASE_DETAIL["id"]
    mock_db = MagicMock()
    mock_query = MagicMock()
    mock_response = MagicMock()
    mock_response.data = [dict(SAMPLE_CASE_DETAIL)]
    mock_query.execute.return_value = mock_response
    mock_db.table.return_value.select.return_value.eq.return_value = mock_query

    test_service = CaseService(db_client=mock_db)
    app.dependency_overrides[get_case_service] = lambda: test_service

    try:
        response = client.get(f"/api/cases/{case_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == case_id
        assert data["crop"] == "Tomato"
        assert data["status"] == "PENDING_ANALYSIS"
        assert data["location_name"] == "Nashik Zone 3"
        assert "created_at" in data
    finally:
        app.dependency_overrides.clear()


def test_get_case_by_id_unknown_returns_404():
    unknown_id = str(uuid.uuid4())
    mock_db = MagicMock()
    mock_query = MagicMock()
    mock_response = MagicMock()
    mock_response.data = []
    mock_query.execute.return_value = mock_response
    mock_db.table.return_value.select.return_value.eq.return_value = mock_query

    test_service = CaseService(db_client=mock_db)
    app.dependency_overrides[get_case_service] = lambda: test_service

    try:
        response = client.get(f"/api/cases/{unknown_id}")
        assert response.status_code == 404
        assert f"Case with ID '{unknown_id}' not found." in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_get_case_by_id_invalid_uuid_returns_422():
    response = client.get("/api/cases/not-a-valid-uuid")
    assert response.status_code == 422


# ==============================================================================
# GET /api/cases LIST & FILTERING TESTS
# ==============================================================================

def test_list_cases_supports_status_filtering():
    mock_db = MagicMock()
    mock_select = MagicMock()
    mock_eq = MagicMock()
    mock_order = MagicMock()
    mock_range = MagicMock()
    mock_response = MagicMock()

    filtered_case = dict(SAMPLE_CASE_DETAIL, status="NEEDS_VERIFICATION")
    mock_response.data = [filtered_case]
    mock_range.execute.return_value = mock_response

    mock_db.table.return_value.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq
    mock_eq.order.return_value = mock_order
    mock_order.range.return_value = mock_range

    test_service = CaseService(db_client=mock_db)
    app.dependency_overrides[get_case_service] = lambda: test_service

    try:
        response = client.get("/api/cases?status=NEEDS_VERIFICATION&limit=10&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert data["limit"] == 10
        assert data["offset"] == 0
        assert len(data["items"]) == 1
        assert data["items"][0]["status"] == "NEEDS_VERIFICATION"
        # Verify status filter was passed to DB
        mock_select.eq.assert_called_with("status", "NEEDS_VERIFICATION")
    finally:
        app.dependency_overrides.clear()


def test_list_cases_rejects_invalid_status_filter():
    response = client.get("/api/cases?status=INVALID_STATUS")
    assert response.status_code == 422


# ==============================================================================
# PATCH /api/cases/{case_id}/status LIFECYCLE TESTS
# ==============================================================================

def test_patch_status_valid_transition_pending_to_analyzed():
    case_id = SAMPLE_CASE_DETAIL["id"]
    current_case = dict(SAMPLE_CASE_DETAIL, status="PENDING_ANALYSIS")
    updated_case = dict(SAMPLE_CASE_DETAIL, status="ANALYZED")

    mock_db = MagicMock()

    # Mock get_case_by_id
    select_query = MagicMock()
    select_resp = MagicMock()
    select_resp.data = [current_case]
    select_query.execute.return_value = select_resp
    mock_db.table.return_value.select.return_value.eq.return_value = select_query

    # Mock update
    update_query = MagicMock()
    update_resp = MagicMock()
    update_resp.data = [updated_case]
    update_query.execute.return_value = update_resp
    mock_db.table.return_value.update.return_value.eq.return_value = update_query

    test_service = CaseService(db_client=mock_db)
    app.dependency_overrides[get_case_service] = lambda: test_service

    try:
        response = client.patch(f"/api/cases/{case_id}/status", json={"status": "ANALYZED"})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ANALYZED"
    finally:
        app.dependency_overrides.clear()


def test_patch_status_valid_transition_analyzed_to_needs_verification():
    case_id = SAMPLE_CASE_DETAIL["id"]
    current_case = dict(SAMPLE_CASE_DETAIL, status="ANALYZED")
    updated_case = dict(SAMPLE_CASE_DETAIL, status="NEEDS_VERIFICATION")

    mock_db = MagicMock()

    select_query = MagicMock()
    select_resp = MagicMock()
    select_resp.data = [current_case]
    select_query.execute.return_value = select_resp
    mock_db.table.return_value.select.return_value.eq.return_value = select_query

    update_query = MagicMock()
    update_resp = MagicMock()
    update_resp.data = [updated_case]
    update_query.execute.return_value = update_resp
    mock_db.table.return_value.update.return_value.eq.return_value = update_query

    test_service = CaseService(db_client=mock_db)
    app.dependency_overrides[get_case_service] = lambda: test_service

    try:
        response = client.patch(f"/api/cases/{case_id}/status", json={"status": "NEEDS_VERIFICATION"})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "NEEDS_VERIFICATION"
    finally:
        app.dependency_overrides.clear()


def test_patch_status_valid_transition_needs_verification_to_more_info_required():
    case_id = SAMPLE_CASE_DETAIL["id"]
    current_case = dict(SAMPLE_CASE_DETAIL, status="NEEDS_VERIFICATION")
    note = "Please upload a clearer image of the affected leaves."
    updated_case = dict(SAMPLE_CASE_DETAIL, status="MORE_INFO_REQUIRED", officer_note=note)

    mock_db = MagicMock()

    select_query = MagicMock()
    select_resp = MagicMock()
    select_resp.data = [current_case]
    select_query.execute.return_value = select_resp
    mock_db.table.return_value.select.return_value.eq.return_value = select_query

    update_query = MagicMock()
    update_resp = MagicMock()
    update_resp.data = [updated_case]
    update_query.execute.return_value = update_resp
    mock_db.table.return_value.update.return_value.eq.return_value = update_query

    test_service = CaseService(db_client=mock_db)
    app.dependency_overrides[get_case_service] = lambda: test_service

    try:
        response = client.patch(
            f"/api/cases/{case_id}/status",
            json={"status": "MORE_INFO_REQUIRED", "officer_note": note},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "MORE_INFO_REQUIRED"
        assert data["officer_note"] == note
    finally:
        app.dependency_overrides.clear()


def test_patch_status_valid_transition_more_info_to_needs_verification():
    case_id = SAMPLE_CASE_DETAIL["id"]
    current_case = dict(SAMPLE_CASE_DETAIL, status="MORE_INFO_REQUIRED")
    updated_case = dict(SAMPLE_CASE_DETAIL, status="NEEDS_VERIFICATION")

    mock_db = MagicMock()

    select_query = MagicMock()
    select_resp = MagicMock()
    select_resp.data = [current_case]
    select_query.execute.return_value = select_resp
    mock_db.table.return_value.select.return_value.eq.return_value = select_query

    update_query = MagicMock()
    update_resp = MagicMock()
    update_resp.data = [updated_case]
    update_query.execute.return_value = update_resp
    mock_db.table.return_value.update.return_value.eq.return_value = update_query

    test_service = CaseService(db_client=mock_db)
    app.dependency_overrides[get_case_service] = lambda: test_service

    try:
        response = client.patch(f"/api/cases/{case_id}/status", json={"status": "NEEDS_VERIFICATION"})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "NEEDS_VERIFICATION"
    finally:
        app.dependency_overrides.clear()


def test_patch_status_transition_to_verified_sets_verified_at():
    case_id = SAMPLE_CASE_DETAIL["id"]
    current_case = dict(SAMPLE_CASE_DETAIL, status="NEEDS_VERIFICATION", verified_at=None)

    captured_updates = []

    def mock_update(payload):
        captured_updates.append(payload)
        q = MagicMock()
        r = MagicMock()
        r.data = [{**current_case, **payload}]
        q.execute.return_value = r
        return q

    mock_db = MagicMock()

    select_query = MagicMock()
    select_resp = MagicMock()
    select_resp.data = [current_case]
    select_query.execute.return_value = select_resp
    mock_db.table.return_value.select.return_value.eq.return_value = select_query
    mock_db.table.return_value.update.side_effect = lambda p: MagicMock(eq=lambda col, val: mock_update(p))

    test_service = CaseService(db_client=mock_db)
    app.dependency_overrides[get_case_service] = lambda: test_service

    try:
        response = client.patch(f"/api/cases/{case_id}/status", json={"status": "VERIFIED"})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "VERIFIED"
        assert data["verified_at"] is not None
        # Verify verified_at was included in the update payload sent to DB
        assert len(captured_updates) == 1
        assert "verified_at" in captured_updates[0]
        assert captured_updates[0]["verified_at"] is not None
    finally:
        app.dependency_overrides.clear()


def test_patch_status_invalid_transitions_are_rejected():
    invalid_cases = [
        ("PENDING_ANALYSIS", "VERIFIED"),
        ("PENDING_ANALYSIS", "REJECTED"),
        ("ANALYZED", "VERIFIED"),
        ("VERIFIED", "PENDING_ANALYSIS"),
        ("REJECTED", "VERIFIED"),
        ("VERIFIED", "ANALYZED"),
    ]

    for start_status, invalid_target in invalid_cases:
        case_id = SAMPLE_CASE_DETAIL["id"]
        current_case = dict(SAMPLE_CASE_DETAIL, status=start_status)

        mock_db = MagicMock()
        select_query = MagicMock()
        select_resp = MagicMock()
        select_resp.data = [current_case]
        select_query.execute.return_value = select_resp
        mock_db.table.return_value.select.return_value.eq.return_value = select_query

        test_service = CaseService(db_client=mock_db)
        app.dependency_overrides[get_case_service] = lambda: test_service

        try:
            response = client.patch(f"/api/cases/{case_id}/status", json={"status": invalid_target})
            assert response.status_code == 409, f"Expected 409 for {start_status} -> {invalid_target}, got {response.status_code}"
            assert f"Invalid status transition from '{start_status}' to '{invalid_target}'." in response.json()["detail"]
        finally:
            app.dependency_overrides.clear()


def test_patch_status_invalid_status_value_rejected():
    case_id = SAMPLE_CASE_DETAIL["id"]
    response = client.patch(f"/api/cases/{case_id}/status", json={"status": "INVALID_STATUS_VALUE"})
    assert response.status_code == 422


def test_patch_status_non_existent_case_returns_404():
    unknown_id = str(uuid.uuid4())
    mock_db = MagicMock()
    select_query = MagicMock()
    select_resp = MagicMock()
    select_resp.data = []
    select_query.execute.return_value = select_resp
    mock_db.table.return_value.select.return_value.eq.return_value = select_query

    test_service = CaseService(db_client=mock_db)
    app.dependency_overrides[get_case_service] = lambda: test_service

    try:
        response = client.patch(f"/api/cases/{unknown_id}/status", json={"status": "ANALYZED"})
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()
