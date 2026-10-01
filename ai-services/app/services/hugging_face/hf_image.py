# app/services/hugging_face/hf_image.py
# ======================================================
# Hugging Face Inference — text-to-image + image-to-image
# ======================================================

import asyncio
import io
import logging
import time
from typing import Optional

from huggingface_hub import InferenceClient
from PIL import Image

from app.config import settings

logger = logging.getLogger("styleai.hf_image")


class HFQuotaError(Exception):
    """Raised when HF free tier rate limit is hit."""
    pass


class HFImageService:
    def __init__(self) -> None:
        if not settings.HF_API_TOKEN:
            raise ValueError("HF_API_TOKEN is not set")

        self.client = InferenceClient(
            token=settings.HF_API_TOKEN,
            timeout=settings.HF_IMAGE_TIMEOUT,
        )
        self.model = settings.HF_IMAGE_MODEL
        logger.info("HFImageService initialized. Model: %s", self.model)

    # --------------------------------------------------
    # TEXT → IMAGE (generic scene)
    # --------------------------------------------------
    def _text_to_image_sync(self, prompt: str, width: int, height: int) -> bytes:
        try:
            image = self.client.text_to_image(
                prompt=prompt,
                model=self.model,
                width=width,
                height=height,
            )
            buf = io.BytesIO()
            image.save(buf, format="PNG")
            return buf.getvalue()
        except Exception as e:
            msg = str(e).lower()
            if any(k in msg for k in ["rate", "429", "quota", "too many"]):
                raise HFQuotaError(f"HF rate limit: {e}") from e
            raise

    # --------------------------------------------------
    # IMAGE + TEXT → IMAGE (preserves input image)
    # --------------------------------------------------
    def _image_to_image_sync(
        self, image_bytes: bytes, prompt: str, strength: float = 0.65
    ) -> bytes:
        try:
            # Load input image
            input_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

            # Resize to a reasonable square (SDXL/FLUX work best at multiples of 8)
            input_img.thumbnail((1024, 1024), Image.LANCZOS)

            # Make square canvas if not square
            w, h = input_img.size
            if w != h:
                side = max(w, h)
                canvas = Image.new("RGB", (side, side), (255, 255, 255))
                canvas.paste(input_img, ((side - w) // 2, (side - h) // 2))
                input_img = canvas

            image = self.client.image_to_image(
                image=input_img,
                prompt=prompt,
                model=self.model,
                strength=strength,   # 0.0 = keep original, 1.0 = ignore original
            )
            buf = io.BytesIO()
            image.save(buf, format="PNG")
            return buf.getvalue()

        except Exception as e:
            msg = str(e).lower()
            if any(k in msg for k in ["rate", "429", "quota", "too many"]):
                raise HFQuotaError(f"HF rate limit: {e}") from e
            raise

    # --------------------------------------------------
    # ASYNC WRAPPERS
    # --------------------------------------------------
    async def generate(
        self, prompt: str, width: int = 1024, height: int = 1024
    ) -> tuple[bytes, int]:
        start = time.time()
        image_bytes = await asyncio.to_thread(
            self._text_to_image_sync, prompt, width, height
        )
        return image_bytes, int((time.time() - start) * 1000)

    async def generate_from_image(
        self,
        image_bytes: bytes,
        prompt: str,
        strength: float = 0.65,
    ) -> tuple[bytes, int]:
        start = time.time()
        out = await asyncio.to_thread(
            self._image_to_image_sync, image_bytes, prompt, strength
        )
        return out, int((time.time() - start) * 1000)


_service: Optional[HFImageService] = None


def get_hf_image() -> HFImageService:
    global _service
    if _service is None:
        _service = HFImageService()
    return _service