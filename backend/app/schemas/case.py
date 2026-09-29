from typing import Optional, Union, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.models.case import CaseStatus, VerificationStatus


class CaseCreate(BaseModel):
    crop: str = Field(..., min_length=1, max_length=100, description="Crop name")
    growth_stage: str = Field(..., min_length=1, max_length=100, description="Growth stage of the crop")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")
    location_name: str = Field(..., min_length=1, max_length=255, description="Human-readable location")
    symptoms: str = Field(..., min_length=1, max_length=3000, description="Observed crop symptoms")
    image_url: Optional[str] = Field(None, description="Optional image URL of the affected crop")

    @field_validator("crop", "growth_stage", "location_name", "symptoms")
    @classmethod
    def validate_non_empty_stripped(cls, value: str, info) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError(f"{info.field_name} must not be empty or contain only whitespace.")
        return stripped


class CaseResponse(BaseModel):
    """Response returned upon case creation."""
    model_config = ConfigDict(from_attributes=True)

    id: Union[str, UUID]
    status: str
    created_at: Union[str, datetime]


class CaseStatusUpdate(BaseModel):
    """Request body for updating case lifecycle status."""
    status: CaseStatus = Field(..., description="Target case status")
    officer_note: Optional[str] = Field(None, max_length=2000, description="Optional officer note")

    @field_validator("officer_note")
    @classmethod
    def sanitize_officer_note(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            stripped = value.strip()
            return stripped if stripped else None
        return None


class CaseVerificationRequest(BaseModel):
    """Request body for officer verification review."""
    model_config = ConfigDict(extra="forbid")

    status: VerificationStatus = Field(
        ...,
        description="Target verification status (VERIFIED, REJECTED, or MORE_INFO_REQUIRED)",
    )
    officer_note: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Mandatory officer review note detailing verification observations or requirements",
    )

    @field_validator("officer_note")
    @classmethod
    def validate_non_empty_note(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("officer_note is mandatory and cannot be empty or contain only whitespace.")
        return stripped


class CaseAnalysisRequest(BaseModel):
    """Optional environmental / weather inputs for case AI and risk analysis."""
    model_config = ConfigDict(extra="forbid")

    temperature: float = Field(
        default=25.0,
        ge=-50.0,
        le=60.0,
        description="Ambient temperature in degrees Celsius (-50°C to 60°C)",
    )
    humidity: float = Field(
        default=70.0,
        ge=0.0,
        le=100.0,
        description="Relative humidity percentage (0% to 100%)",
    )
    rainfall: float = Field(
        default=0.0,
        ge=0.0,
        le=1000.0,
        description="Recent precipitation / rainfall in millimeters (>= 0 mm)",
    )
    nearby_verified_cases: Optional[int] = Field(
        default=None,
        ge=0,
        description="Count of confirmed/verified cases in the nearby zone. If omitted, calculated from database.",
    )


class CaseDetailResponse(BaseModel):
    """Complete detail representation of a single crop disease case."""
    model_config = ConfigDict(from_attributes=True)

    id: Union[str, UUID]
    crop: str
    growth_stage: str
    latitude: float
    longitude: float
    location_name: str
    symptoms: str
    image_url: Optional[str] = None
    disease: Optional[str] = None
    confidence: Optional[float] = None
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    status: CaseStatus
    created_at: Union[str, datetime]
    verified_at: Optional[Union[str, datetime]] = None
    officer_note: Optional[str] = None


class CaseListResponse(BaseModel):
    """Predictable response wrapper for listing cases."""
    model_config = ConfigDict(from_attributes=True)

    items: List[CaseDetailResponse]
    limit: int
    offset: int
