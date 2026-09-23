





"""
Gemini vision — cloud-based product image analysis.

Uses the official `google-genai` SDK (the old `google-generativeai` is deprecated).

Key points:
  * On Gemini 3.x models, `max_output_tokens` is ONE shared budget for
    thinking tokens + visible output. Default thinking is "medium", so with a
    small budget the JSON gets cut off mid-string ("Unterminated string").
    Fix = low thinking level + bigger token budget.
  * Image goes FIRST, text prompt SECOND.
  * Defensive JSON cleanup + ONE retry before giving up.
"""

import json
import logging
import re
import time
from typing import Tuple

from google import genai
from google.genai import types

from app.config import settings
from app.prompts.product_prompts import PRODUCT_ANALYSIS_PROMPT
from app.schemas.product_analysis import ProductAnalysis
from app.services.product_analyzer import ProductAnalyzer

logger = logging.getLogger(__name__)

MAX_OUTPUT_TOKENS = 4096

RETRY_SUFFIX = (
    "\n\nReturn ONLY the JSON object, starting with { and ending with }. "
    "No prose. No code fences."
)

# Leading ```json / ``` and trailing ```
_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)


def _sniff_mime(data: bytes) -> str:
    """Detect the real image type instead of always claiming JPEG."""
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def _extract_json(text: str) -> dict:
    """Strip fences/whitespace, slice first '{' .. last '}', then parse."""
    cleaned = _FENCE_RE.sub("", (text or "").strip()).strip()
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise json.JSONDecodeError("No JSON object found in response", cleaned, 0)
    return json.loads(cleaned[start : end + 1])


class GeminiVision:
    def __init__(self) -> None:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set")

        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model_name = settings.GEMINI_VISION_MODEL

        # NOTE: temperature/top_p/top_k are deprecated on Gemini 3.x, so they
        # are intentionally not set. JSON mode already constrains the output.
        self.config = types.GenerateContentConfig(
            response_mime_type="application/json",
            max_output_tokens=MAX_OUTPUT_TOKENS,
            thinking_config=types.ThinkingConfig(
                thinking_level=types.ThinkingLevel.LOW
            ),
        )

        logger.info("GeminiVision initialized with model: %s", self.model_name)

    async def _generate(self, image_part: types.Part, prompt: str) -> str:
        response = await self.client.aio.models.generate_content(
            model=self.model_name,
            contents=[image_part, prompt],  # image FIRST, text SECOND
            config=self.config,
        )

        finish_reason = None
        try:
            finish_reason = response.candidates[0].finish_reason
        except (IndexError, TypeError, AttributeError):
            pass

        usage = getattr(response, "usage_metadata", None)
        logger.info(
            "Gemini finish_reason=%s prompt_tokens=%s thought_tokens=%s output_tokens=%s",
            finish_reason,
            getattr(usage, "prompt_token_count", None),
            getattr(usage, "thoughts_token_count", None),
            getattr(usage, "candidates_token_count", None),
        )

        return (response.text or "").strip()

    async def analyze(self, image_bytes: bytes) -> Tuple[ProductAnalysis, dict]:
        start = time.time()

        image_part = types.Part.from_bytes(
            data=image_bytes,
            mime_type=_sniff_mime(image_bytes),
        )

        # ---- Attempt 1 ----
        raw_text = await self._generate(image_part, PRODUCT_ANALYSIS_PROMPT)
        try:
            raw = _extract_json(raw_text)
        except json.JSONDecodeError as first_err:
            logger.warning(
                "Gemini JSON parse failed (attempt 1): %s | RAW TEXT: %r",
                first_err,
                raw_text,
            )

            # ---- Attempt 2 (one retry, stricter instruction) ----
            retry_text = await self._generate(
                image_part, PRODUCT_ANALYSIS_PROMPT + RETRY_SUFFIX
            )
            try:
                raw = _extract_json(retry_text)
            except json.JSONDecodeError as second_err:
                logger.error(
                    "Gemini JSON parse failed (attempt 2): %s | RAW TEXT: %r",
                    second_err,
                    retry_text,
                )
                raise ValueError(
                    f"Invalid JSON from Gemini after retry: {second_err}"
                ) from second_err

        validator = ProductAnalyzer()
        analysis = validator._validate(raw)

        meta = {
            "provider": f"gemini:{self.model_name}",
            "duration_ms": int((time.time() - start) * 1000),
        }
        return analysis, meta


_gemini_instance: GeminiVision | None = None


def get_gemini_vision() -> GeminiVision:
    global _gemini_instance
    if _gemini_instance is None:
        _gemini_instance = GeminiVision()
    return _gemini_instance