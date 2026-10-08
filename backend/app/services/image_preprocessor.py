import io
from typing import Tuple, Union
import numpy as np
from PIL import Image, UnidentifiedImageError


class ImageValidationError(ValueError):
    """Raised when the input data cannot be decoded as a valid, readable image."""
    pass


class ImagePreprocessor:
    """
    Handles validation, conversion, resizing, and normalization of crop images
    into model input tensors for MobileNetV3 / TFLite inference.
    """

    def __init__(
        self,
        target_size: Tuple[int, int] = (224, 224),
        normalize_scale: float = 255.0,
    ):
        self.target_size = target_size
        self.normalize_scale = normalize_scale

    def preprocess(self, image_data: Union[bytes, io.BytesIO]) -> np.ndarray:
        """
        Executes the full image preprocessing pipeline:
        1. Decode raw bytes into an Image object
        2. Validate image integrity
        3. Convert color space to RGB
        4. Resize to target model dimensions (default: 224x224)
        5. Convert to float array and normalize
        6. Expand dimensions to (1, H, W, C)
        """
        if isinstance(image_data, bytes):
            if not image_data:
                raise ImageValidationError("Empty image payload provided.")
            stream = io.BytesIO(image_data)
        elif isinstance(image_data, io.BytesIO):
            stream = image_data
        else:
            raise ImageValidationError("Unsupported image input type; expected bytes or BytesIO.")

        try:
            image = Image.open(stream)
            # Verify image format and integrity
            image.verify()
        except (UnidentifiedImageError, OSError, SyntaxError) as exc:
            raise ImageValidationError(f"Invalid or corrupted image data: {str(exc)}") from exc

        # Re-open after verify() because PIL marks image as closed/exhausted after verify()
        stream.seek(0)
        try:
            image = Image.open(stream)
            image.load()
        except Exception as exc:
            raise ImageValidationError(f"Failed to decode image pixels: {str(exc)}") from exc

        # Convert to RGB if needed (handles RGBA, Grayscale, etc.)
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Resize to target dimensions with high-quality resampling
        image = image.resize(self.target_size, Image.Resampling.BILINEAR)

        # Convert to numpy array
        img_array = np.asarray(image, dtype=np.float32)

        # Normalize pixel values
        if self.normalize_scale > 0:
            img_array = img_array / self.normalize_scale

        # Add batch dimension: (H, W, C) -> (1, H, W, C)
        tensor = np.expand_dims(img_array, axis=0)
        return tensor
