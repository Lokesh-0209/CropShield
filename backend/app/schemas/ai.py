from pydantic import BaseModel, Field, field_validator, ConfigDict


class AIInferenceResult(BaseModel):
    """
    Structured result returned by the CropShield AI inference service.
    Contains the preliminary disease prediction and the model's confidence value.
    """
    model_config = ConfigDict(from_attributes=True)

    disease: str = Field(
        ...,
        min_length=1,
        max_length=150,
        description="Predicted crop disease name",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Prediction confidence score strictly between 0.0 and 1.0",
    )

    @field_validator("disease")
    @classmethod
    def validate_disease_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Disease name cannot be empty or contain only whitespace.")
        return stripped
