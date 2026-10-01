# app/services/gemini_image.py
# ======================================================
# Gemini 2.5 Flash Image — product-preserving angle generation
# Falls back across models on 503 / rate-limit.
# ======================================================

import asyncio
import logging
import time
from typing import List, Tuple

from google import genai
from google.genai import types
from google.genai.errors import ServerError, ClientError

from app.config import settings
from app.prompts.image_angle_prompts import get_angles_by_keys

logger = logging.getLogger(__name__)

MAX_ATTEMPTS_PER_MODEL = 3
BACKOFF_BASE_SECONDS = 4
RETRYABLE_CODES = {429, 500, 502, 503, 504}


def _sniff_mime(data: bytes) -> str:
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def _extract_image_bytes(response) -> bytes | None:
    """Grab the first image part from a Gemini response."""
    try:
        parts = response.candidates[0].content.parts
    except (AttributeError, IndexError, TypeError):
        return None
    for part in parts:
        inline = getattr(part, "inline_data", None)
        if inline and getattr(inline, "data", None):
            return inline.data
    return None


class GeminiImage:
    def __init__(self) -> None:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set")

        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.primary_model = settings.GEMINI_IMAGE_MODEL
        self.fallback_models = settings.gemini_image_fallbacks

        logger.info(
            "GeminiImage initialized. Primary: %s. Fallbacks: %s",
            self.primary_model,
            self.fallback_models,
        )

    def _model_chain(self) -> List[str]:
        chain = [self.primary_model]
        for m in self.fallback_models:
            if m and m not in chain:
                chain.append(m)
        return chain

    async def _generate_one(
        self,
        model: str,
        image_bytes: bytes,
        prompt: str,
    ) -> bytes | None:
        image_part = types.Part.from_bytes(
            data=image_bytes,
            mime_type=_sniff_mime(image_bytes),
        )
        response = await self.client.aio.models.generate_content(
            model=model,
            contents=[image_part, prompt],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            ),
        )
        return _extract_image_bytes(response)

    async def _generate_with_fallback(
        self,
        image_bytes: bytes,
        prompt: str,
        label: str,
    ) -> bytes | None:
        """Try primary, then fallbacks. Retry on 429/5xx."""
        last_error: Exception | None = None

        for model in self._model_chain():
            for attempt in range(1, MAX_ATTEMPTS_PER_MODEL + 1):
                try:
                    logger.info(
                        "[ANGLE:%s] Attempt %d/%d model=%s",
                        label, attempt, MAX_ATTEMPTS_PER_MODEL, model,
                    )
                    img = await self._generate_one(model, image_bytes, prompt)
                    if img:
                        return img
                    last_error = ValueError("Empty image response")
                    logger.warning("[ANGLE:%s] empty response from %s", label, model)

                except ServerError as e:
                    status = getattr(e, "status_code", None) or getattr(e, "code", None)
                    last_error = e
                    if status in RETRYABLE_CODES or status is None:
                        wait = BACKOFF_BASE_SECONDS * attempt
                        logger.warning(
                            "[ANGLE:%s] ServerError %s on %s. Retry in %ds…",
                            label, status, model, wait,
                        )
                        await asyncio.sleep(wait)
                        continue
                    logger.error("[ANGLE:%s] Non-retryable %s on %s", label, status, model)
                    break

                except ClientError as e:
                    last_error = e
                    logger.error("[ANGLE:%s] ClientError on %s: %s", label, model, e)
                    break

                except Exception as e:
                    last_error = e
                    logger.error(
                        "[ANGLE:%s] %s on %s: %s",
                        label, type(e).__name__, model, e,
                    )
                    await asyncio.sleep(BACKOFF_BASE_SECONDS * attempt)
                    continue

            logger.warning("[ANGLE:%s] Model %s exhausted. Trying next…", label, model)

        logger.error("[ANGLE:%s] Failed after all retries: %s", label, last_error)
        return None

    async def generate_angles(
        self,
        image_bytes: bytes,
        requested_keys: list[str] | None = None,
    ) -> Tuple[List[dict], dict]:
        """
        Returns (variants, meta).
        Each variant: { key, label, image_bytes }
        """
        start = time.time()
        angles = get_angles_by_keys(requested_keys)

        variants: list[dict] = []
        for angle in angles:
            img = await self._generate_with_fallback(
                image_bytes, angle["prompt"], angle["key"]
            )
            if img:
                variants.append({
                    "key": angle["key"],
                    "label": angle["label"],
                    "image_bytes": img,
                })

        meta = {
            "provider": "gemini",
            "model": self.primary_model,
            "latency_ms": int((time.time() - start) * 1000),
            "count": len(variants),
            "preserved_features": [
                "color", "material", "pattern", "logo", "shape", "proportions",
            ],
            "fallback_used": len(variants) < len(angles),
        }
        return variants, meta


_gemini_image_instance: GeminiImage | None = None


def get_gemini_image() -> GeminiImage:
    global _gemini_image_instance
    if _gemini_image_instance is None:
        _gemini_image_instance = GeminiImage()
    return _gemini_image_instance