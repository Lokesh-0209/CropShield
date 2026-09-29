from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.models.risk import RiskLevel


class RiskAnalysisRequest(BaseModel):
    """Input payload for deterministic crop disease risk assessment."""
    model_config = ConfigDict(extra="forbid")

    temperature: float = Field(
        ...,
        ge=-50.0,
        le=60.0,
        description="Ambient temperature in degrees Celsius (-50°C to 60°C)",
    )
    humidity: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Relative humidity percentage (0% to 100%)",
    )
    rainfall: float = Field(
        ...,
        ge=0.0,
        le=1000.0,
        description="Recent precipitation / rainfall in millimeters (>= 0 mm)",
    )
    crop: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Target crop name (e.g., Tomato)",
    )
    growth_stage: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Crop physiological growth stage (e.g., Flowering)",
    )
    nearby_verified_cases: int = Field(
        ...,
        ge=0,
        description="Count of confirmed/verified cases in the nearby surveillance zone",
    )

    @field_validator("crop", "growth_stage")
    @classmethod
    def validate_non_empty_string(cls, value: str, info) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError(f"{info.field_name} cannot be empty or whitespace.")
        return stripped


class RiskAnalysisResponse(BaseModel):
    """Deterministic risk analysis result."""
    model_config = ConfigDict(from_attributes=True)

    risk_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Composite disease outbreak risk score bounded from 0 to 100",
    )
    risk_level: RiskLevel = Field(
        ...,
        description="Categorical risk band (LOW: 0-39, MEDIUM: 40-69, HIGH: 70-100)",
    )
