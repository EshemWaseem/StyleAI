# app/services/gemini_photography.py
# ======================================================
# Product photography orchestrator (Gemini Image provider)
# 1. Generate scene using Gemini Image with product as reference
# 2. Run QA (compare generated vs original)
# 3. If QA fails → regenerate once with stricter prompt
# Sprint 26: brand_context flows into build_scene_prompt()
# ======================================================

import asyncio
import logging
import time
from typing import Optional

from google import genai
from google.genai import types
from google.genai.errors import ServerError, ClientError

from app.config import settings
from app.prompts.photography_prompts import build_scene_prompt
from app.services.image_qa import check_quality
from app.schemas.product_photography import (
    PhotographyRequest, GeneratedScene, PhotographyResponse,
)

logger = logging.getLogger("styleai.photography")

MAX_ATTEMPTS_PER_MODEL = 3
BACKOFF_BASE = 4
RETRYABLE_CODES = {429, 500, 502, 503, 504}


def _sniff_mime(data: bytes) -> str:
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def _extract_image_bytes(response) -> Optional[bytes]:
    try:
        parts = response.candidates[0].content.parts
    except (AttributeError, IndexError, TypeError):
        return None
    for part in parts:
        inline = getattr(part, "inline_data", None)
        if inline and getattr(inline, "data", None):
            return inline.data
    return None


class GeminiPhotography:
    def __init__(self) -> None:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set")
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = settings.GEMINI_IMAGE_MODEL
        logger.info("GeminiPhotography initialized. Model: %s", self.model)

    async def _generate_once(self, image_bytes: bytes, prompt: str) -> Optional[bytes]:
        image_part = types.Part.from_bytes(
            data=image_bytes,
            mime_type=_sniff_mime(image_bytes),
        )
        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=[image_part, prompt],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            ),
        )
        return _extract_image_bytes(response)

    async def _generate_with_retry(
        self, image_bytes: bytes, prompt: str, attempt_label: str
    ) -> Optional[bytes]:
        for attempt in range(1, MAX_ATTEMPTS_PER_MODEL + 1):
            try:
                logger.info("[PHOTO:%s] attempt %d/%d", attempt_label, attempt, MAX_ATTEMPTS_PER_MODEL)
                img = await self._generate_once(image_bytes, prompt)
                if img:
                    return img
                logger.warning("[PHOTO:%s] empty response", attempt_label)
            except ServerError as e:
                status = getattr(e, "status_code", None) or getattr(e, "code", None)
                if status in RETRYABLE_CODES or status is None:
                    wait = BACKOFF_BASE * attempt
                    logger.warning("[PHOTO:%s] ServerError %s, retry in %ds", attempt_label, status, wait)
                    await asyncio.sleep(wait)
                    continue
                break
            except ClientError as e:
                logger.error("[PHOTO:%s] ClientError: %s", attempt_label, e)
                break
            except Exception as e:
                logger.error("[PHOTO:%s] %s", attempt_label, type(e).__name__)
                await asyncio.sleep(BACKOFF_BASE * attempt)
        return None

    async def generate(
        self, req: PhotographyRequest, product_bytes: bytes
    ) -> PhotographyResponse:
        start = time.time()
        prompt = build_scene_prompt(req)

        context_injected = bool(getattr(req, "brand_context", None) and str(req.brand_context).strip())
        logger.info("[GEMINI:photo] brand_context injected: %s", context_injected)

        # ---- Attempt 1 ----
        image_bytes = await self._generate_with_retry(product_bytes, prompt, "gen1")
        if not image_bytes:
            raise ValueError("Image generation failed after retries")

        # ---- QA ----
        quality = await check_quality(product_bytes, image_bytes)

        regenerated = False

        # ---- If QA failed → regenerate once with stricter prompt ----
        if not quality.passed:
            regenerated = True
            stricter = (
                "STRICT FIDELITY MODE. Follow these rules without exception:\n"
                "- Preserve the product EXACTLY as in the reference image.\n"
                "- Do not modify color, material, shape, or any markings.\n"
                "- Only change the background / scene around the product.\n\n"
                + prompt
            )
            retry_bytes = await self._generate_with_retry(product_bytes, stricter, "gen2")
            if retry_bytes:
                retry_quality = await check_quality(product_bytes, retry_bytes)
                if retry_quality.overall > quality.overall:
                    image_bytes = retry_bytes
                    quality = retry_quality

        latency = int((time.time() - start) * 1000)

        return PhotographyResponse(
            scene=req.scene,
            variant=GeneratedScene(
                scene=req.scene,
                mime="image/png",
                base64=__import__("base64").b64encode(image_bytes).decode("ascii"),
                width=0,
                height=0,
            ),
            quality=quality,
            provider="gemini",
            model=self.model,
            latency_ms=latency,
            regenerated=regenerated,
        )


_photo_instance: Optional[GeminiPhotography] = None


def get_gemini_photography() -> GeminiPhotography:
    global _photo_instance
    if _photo_instance is None:
        _photo_instance = GeminiPhotography()
    return _photo_instance