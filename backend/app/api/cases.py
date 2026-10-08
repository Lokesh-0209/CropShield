from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from app.models.case import CaseStatus
from app.schemas.case import (
    CaseCreate,
    CaseResponse,
    CaseStatusUpdate,
    CaseVerificationRequest,
    CaseAnalysisRequest,
    CaseDetailResponse,
    CaseListResponse,
)
from app.services.case_service import CaseService, get_case_service
from app.services.case_analysis_service import (
    CaseAnalysisService,
    get_case_analysis_service,
)

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.post(
    "",
    response_model=CaseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new crop disease case",
    description="Registers a new crop case from field observations with initial status PENDING_ANALYSIS.",
)
@router.post(
    "/",
    response_model=CaseResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_case(
    case_in: CaseCreate,
    case_service: CaseService = Depends(get_case_service),
) -> CaseResponse:
    """Create and persist a new crop case."""
    created_case = case_service.create_case(case_in)
    return CaseResponse.model_validate(created_case)


@router.get(
    "",
    response_model=CaseListResponse,
    status_code=status.HTTP_200_OK,
    summary="List crop disease cases",
    description="Returns a paginated list of cases, optionally filtered by status.",
)
@router.get(
    "/",
    response_model=CaseListResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
def list_cases(
    status_filter: Optional[CaseStatus] = Query(None, alias="status", description="Filter cases by status"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of cases to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    case_service: CaseService = Depends(get_case_service),
) -> CaseListResponse:
    """List cases with optional status filter and pagination."""
    result = case_service.list_cases(status_filter=status_filter, limit=limit, offset=offset)
    return CaseListResponse.model_validate(result)


@router.get(
    "/{case_id}",
    response_model=CaseDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get case details by ID",
    description="Returns the complete state of a single crop disease case.",
)
def get_case(
    case_id: UUID,
    case_service: CaseService = Depends(get_case_service),
) -> CaseDetailResponse:
    """Retrieve full details of a specific case."""
    case = case_service.get_case_by_id(str(case_id))
    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID '{case_id}' not found.",
        )
    return CaseDetailResponse.model_validate(case)


@router.patch(
    "/{case_id}/status",
    response_model=CaseDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Update case status",
    description="Performs a controlled lifecycle transition for a case.",
)
def update_case_status(
    case_id: UUID,
    status_update: CaseStatusUpdate,
    case_service: CaseService = Depends(get_case_service),
) -> CaseDetailResponse:
    """Perform a controlled lifecycle transition on a case."""
    updated_case = case_service.update_case_status(str(case_id), status_update)
    return CaseDetailResponse.model_validate(updated_case)


@router.patch(
    "/{case_id}/verify",
    response_model=CaseDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Officer verification review of a case",
    description="Allows an agricultural officer to review and verify, reject, or request more information for a case currently in NEEDS_VERIFICATION status.",
)
def verify_case(
    case_id: UUID,
    verification: CaseVerificationRequest,
    case_service: CaseService = Depends(get_case_service),
) -> CaseDetailResponse:
    """Perform officer verification on a case in NEEDS_VERIFICATION status."""
    updated_case = case_service.verify_case(str(case_id), verification)
    return CaseDetailResponse.model_validate(updated_case)


@router.post(
    "/{case_id}/analyze",
    response_model=CaseDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze a case using AI inference and risk assessment",
    description="Orchestrates AI disease prediction from the case image and computes deterministic outbreak risk, transitioning the case from PENDING_ANALYSIS to ANALYZED.",
)
def analyze_case(
    case_id: UUID,
    analysis_in: Optional[CaseAnalysisRequest] = Body(default=None),
    analysis_service: CaseAnalysisService = Depends(get_case_analysis_service),
) -> CaseDetailResponse:
    """Analyze a pending case with AI computer vision and deterministic risk assessment."""
    request_data = analysis_in or CaseAnalysisRequest()
    updated_case = analysis_service.analyze_case(str(case_id), request_data)
    return CaseDetailResponse.model_validate(updated_case)


