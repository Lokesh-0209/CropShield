import json
import os
from typing import Any, List, Optional
import numpy as np
from app.schemas.ai import AIInferenceResult
from app.services.image_preprocessor import ImagePreprocessor, ImageValidationError


class ModelNotAvailableError(RuntimeError):
    """Raised when AI inference is requested but no model artifact is configured or loaded."""
    pass


class AIInferenceService:
    """
    Service responsible for loading the CropShield MobileNetV3 / TFLite model,
    running preprocessed image tensors through inference, and returning structured
    preliminary disease predictions with confidence scores.
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        labels_path: Optional[str] = None,
        interpreter: Any = None,
        labels: Optional[List[str]] = None,
        preprocessor: Optional[ImagePreprocessor] = None,
    ):
        self.model_path = model_path or os.getenv("CROPSHIELD_MODEL_PATH", "").strip()
        self.labels_path = labels_path or os.getenv("CROPSHIELD_LABELS_PATH", "").strip()
        self.preprocessor = preprocessor or ImagePreprocessor()
        self._interpreter = interpreter
        self._labels = labels

        # Initialize model and labels if paths are provided and interpreter not injected
        if self._interpreter is None and self.model_path:
            self._load_model()

        if self._labels is None and self.labels_path:
            self._load_labels()

    def _load_model(self) -> None:
        """Attempts to load a TFLite model from the configured path."""
        if not os.path.exists(self.model_path):
            self._interpreter = None
            return

        # Attempt to import TFLite runtime or full TensorFlow Lite
        try:
            from tflite_runtime.interpreter import Interpreter
            self._interpreter = Interpreter(model_path=self.model_path)
            self._interpreter.allocate_tensors()
        except ImportError:
            try:
                import tensorflow.lite as tflite
                self._interpreter = tflite.Interpreter(model_path=self.model_path)
                self._interpreter.allocate_tensors()
            except ImportError:
                # TFLite runtime not installed in the environment
                self._interpreter = None

    def _load_labels(self) -> None:
        """Loads class labels from a JSON or text file."""
        if not os.path.exists(self.labels_path):
            self._labels = None
            return

        try:
            with open(self.labels_path, "r", encoding="utf-8") as f:
                if self.labels_path.endswith(".json"):
                    data = json.load(f)
                    if isinstance(data, list):
                        self._labels = data
                    elif isinstance(data, dict):
                        # Dictionary mapping index to label name
                        self._labels = [data[str(i)] for i in range(len(data))]
                else:
                    self._labels = [line.strip() for line in f if line.strip()]
        except Exception:
            self._labels = None

    def is_model_available(self) -> bool:
        """Returns True only if a valid model interpreter is loaded and operational."""
        return self._interpreter is not None

    def infer(self, image_data: bytes) -> AIInferenceResult:
        """
        Executes the AI inference pipeline on raw image data.
        Returns AIInferenceResult with predicted disease and confidence.
        Raises ModelNotAvailableError if model is not configured.
        Raises ImageValidationError if input image is invalid.
        """
        if not self.is_model_available():
            raise ModelNotAvailableError(
                "AI inference model is not configured or available. "
                "Please configure CROPSHIELD_MODEL_PATH with a valid MobileNetV3 TFLite model."
            )

        # 1. Preprocess input image to model input tensor
        tensor = self.preprocessor.preprocess(image_data)

        # 2. Run inference through interpreter
        output_data = self._run_interpreter(tensor)

        # 3. Decode output prediction and confidence
        return self._decode_output(output_data)

    def _run_interpreter(self, input_tensor: np.ndarray) -> np.ndarray:
        """Feeds the preprocessed tensor to the interpreter and returns output."""
        interpreter = self._interpreter
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()

        # Set input tensor
        interpreter.set_tensor(input_details[0]["index"], input_tensor)
        interpreter.invoke()

        # Extract output tensor
        output_data = interpreter.get_tensor(output_details[0]["index"])
        return output_data

    def _decode_output(self, output_data: np.ndarray) -> AIInferenceResult:
        """Decodes model probabilities into class label and confidence score."""
        # Ensure 1D array of class probabilities
        probabilities = np.atleast_1d(np.squeeze(output_data))

        # If logits instead of probabilities, apply softmax if necessary
        if np.any(probabilities < 0) or np.any(probabilities > 1.0):
            exp_scores = np.exp(probabilities - np.max(probabilities))
            probabilities = exp_scores / np.sum(exp_scores)

        predicted_index = int(np.argmax(probabilities))
        raw_confidence = float(probabilities[predicted_index])

        # Strictly clamp confidence to [0.0, 1.0]
        confidence = max(0.0, min(1.0, round(raw_confidence, 4)))

        # Determine label
        if self._labels and 0 <= predicted_index < len(self._labels):
            disease_name = self._labels[predicted_index]
        else:
            disease_name = f"Class_{predicted_index}"

        return AIInferenceResult(
            disease=disease_name,
            confidence=confidence,
        )


def get_ai_inference_service() -> AIInferenceService:
    """Dependency provider for AIInferenceService."""
    return AIInferenceService()
