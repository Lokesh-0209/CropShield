import io
from unittest.mock import MagicMock
import numpy as np
import pytest
from PIL import Image
from pydantic import ValidationError

from app.schemas.ai import AIInferenceResult
from app.services.image_preprocessor import ImagePreprocessor, ImageValidationError
from app.services.ai_inference_service import (
    AIInferenceService,
    ModelNotAvailableError,
)


# ==============================================================================
# TEST FIXTURES & HELPERS
# ==============================================================================

def create_test_image_bytes(format: str = "JPEG", mode: str = "RGB", size: tuple = (100, 100)) -> bytes:
    """Generates an in-memory test image and returns raw encoded bytes."""
    image = Image.new(mode, size, color="green")
    buffer = io.BytesIO()
    image.save(buffer, format=format)
    return buffer.getvalue()


# ==============================================================================
# 1. AI INFERENCE RESULT SCHEMA TESTS
# ==============================================================================

def test_inference_result_schema_valid_confidence_accepted():
    for valid_conf in [0.0, 0.25, 0.87, 0.9999, 1.0]:
        res = AIInferenceResult(disease="Early Blight", confidence=valid_conf)
        assert res.disease == "Early Blight"
        assert res.confidence == valid_conf


def test_inference_result_schema_confidence_above_one_rejected():
    with pytest.raises(ValidationError):
        AIInferenceResult(disease="Early Blight", confidence=1.01)


def test_inference_result_schema_confidence_below_zero_rejected():
    with pytest.raises(ValidationError):
        AIInferenceResult(disease="Early Blight", confidence=-0.05)


def test_inference_result_schema_empty_disease_rejected():
    with pytest.raises(ValidationError):
        AIInferenceResult(disease="   ", confidence=0.85)


# ==============================================================================
# 2. IMAGE PREPROCESSING TESTS
# ==============================================================================

def test_preprocessor_accepts_valid_image():
    preprocessor = ImagePreprocessor(target_size=(224, 224))
    image_bytes = create_test_image_bytes(format="JPEG", size=(300, 200))

    tensor = preprocessor.preprocess(image_bytes)

    # Must be 4D tensor with shape (1, 224, 224, 3)
    assert isinstance(tensor, np.ndarray)
    assert tensor.shape == (1, 224, 224, 3)
    assert tensor.dtype == np.float32

    # Normalized between 0.0 and 1.0
    assert tensor.min() >= 0.0
    assert tensor.max() <= 1.0


def test_preprocessor_converts_rgba_to_rgb():
    preprocessor = ImagePreprocessor(target_size=(224, 224))
    image_bytes = create_test_image_bytes(format="PNG", mode="RGBA", size=(50, 50))

    tensor = preprocessor.preprocess(image_bytes)
    assert tensor.shape == (1, 224, 224, 3)


def test_preprocessor_rejects_corrupted_image_cleanly():
    preprocessor = ImagePreprocessor()
    corrupt_bytes = b"this is completely corrupted non-image binary data"

    with pytest.raises(ImageValidationError) as exc_info:
        preprocessor.preprocess(corrupt_bytes)

    assert "Invalid or corrupted image data" in str(exc_info.value)


def test_preprocessor_rejects_empty_bytes():
    preprocessor = ImagePreprocessor()

    with pytest.raises(ImageValidationError) as exc_info:
        preprocessor.preprocess(b"")

    assert "Empty image payload" in str(exc_info.value)


# ==============================================================================
# 3. MISSING MODEL CONFIGURATION & ZERO FAKE PREDICTIONS
# ==============================================================================

def test_missing_model_configuration_handled_explicitly():
    service = AIInferenceService(model_path="")
    assert service.is_model_available() is False


def test_invalid_model_path_handled_explicitly():
    service = AIInferenceService(model_path="non/existent/cropshield_model.tflite")
    assert service.is_model_available() is False


def test_missing_model_does_not_produce_fake_prediction():
    service = AIInferenceService(model_path="")
    image_bytes = create_test_image_bytes()

    # The service MUST NOT return a fake prediction when model is absent
    with pytest.raises(ModelNotAvailableError) as exc_info:
        service.infer(image_bytes)

    assert "AI inference model is not configured or available" in str(exc_info.value)


# ==============================================================================
# 4. MOCKED INFERENCE TESTS (Explicitly Isolated from Real Model Execution)
# ==============================================================================

def test_mocked_inference_produces_structured_result():
    """
    [MOCKED INFERENCE TEST]
    Uses an isolated mock interpreter adapter to verify service-level decoding
    and result contract without claiming real model performance.
    """
    mock_interpreter = MagicMock()
    mock_interpreter.get_input_details.return_value = [{"index": 0}]
    mock_interpreter.get_output_details.return_value = [{"index": 1}]

    # Simulate 3 classes: [Healthy=0.05, Early Blight=0.88, Late Blight=0.07]
    mock_interpreter.get_tensor.return_value = np.array([[0.05, 0.88, 0.07]], dtype=np.float32)

    labels = ["Healthy", "Early Blight", "Late Blight"]
    service = AIInferenceService(interpreter=mock_interpreter, labels=labels)

    assert service.is_model_available() is True

    image_bytes = create_test_image_bytes()
    result = service.infer(image_bytes)

    assert isinstance(result, AIInferenceResult)
    assert result.disease == "Early Blight"
    assert result.confidence == 0.88
    assert 0.0 <= result.confidence <= 1.0


def test_mocked_inference_clamps_confidence_bounds():
    """
    [MOCKED INFERENCE TEST]
    Ensures confidence score is strictly bounded in [0.0, 1.0].
    """
    mock_interpreter = MagicMock()
    mock_interpreter.get_input_details.return_value = [{"index": 0}]
    mock_interpreter.get_output_details.return_value = [{"index": 1}]
    # Simulate single class with probability 1.0
    mock_interpreter.get_tensor.return_value = np.array([[1.0]], dtype=np.float32)

    service = AIInferenceService(interpreter=mock_interpreter, labels=["Tomato Yellow Leaf Curl"])
    image_bytes = create_test_image_bytes()
    result = service.infer(image_bytes)

    assert result.disease == "Tomato Yellow Leaf Curl"
    assert result.confidence == 1.0
