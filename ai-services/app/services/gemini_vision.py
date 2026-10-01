"""
Gemini vision — cloud-based product image analysis.

Uses the official `google-genai` SDK.

Key points:
  * Retries on 429/500/502/503/504 with exponential backoff
  * Cycles through GEMINI_FALLBACK_MODELS when primary fails
  * Image goes FIRST, text prompt SECOND.
  * Defensive JSON cleanup + ONE extra retry per model before giving up.
"""

import asyncio
import json
import logging
import re
import time
from typing import List, Tuple

from google import genai
from google.genai import types
from google.genai.errors import ServerError, ClientError

from app.config import settings
from app.prompts.product_prompts import PRODUCT_ANALYSIS_PROMPT
from app.schemas.product_analysis import ProductAnalysis
from app.services.product_analyzer import ProductAnalyzer

logger = logging.getLogger(__name__)

MAX_OUTPUT_TOKENS = 4096
RETRYABLE_CODES = {429, 500, 502, 503, 504}
MAX_ATTEMPTS_PER_MODEL = 3
BACKOFF_BASE_SECONDS = 3

RETRY_SUFFIX = (
    "\n\nReturn ONLY the JSON object, starting with { and ending with }. "
    "No prose. No code fences."
)

_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)


def _sniff_mime(data: bytes) -> str:
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def _extract_json(text: str) -> dict:
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
        self.primary_model = settings.GEMINI_VISION_MODEL
        self.fallback_models = settings.gemini_fallbacks

        self.config = types.GenerateContentConfig(
            response_mime_type="application/json",
            max_output_tokens=MAX_OUTPUT_TOKENS,
            thinking_config=types.ThinkingConfig(
                thinking_level=types.ThinkingLevel.LOW
            ),
        )

        logger.info(
            "GeminiVision initialized. Primary: %s. Fallbacks: %s",
            self.primary_model,
            self.fallback_models,
        )

    def _model_chain(self) -> List[str]:
        chain = [self.primary_model]
        for m in self.fallback_models:
            if m and m not in chain:
                chain.append(m)
        return chain

    async def _generate_once(
        self,
        model: str,
        image_part: types.Part,
        prompt: str,
    ) -> str:
        response = await self.client.aio.models.generate_content(
            model=model,
            contents=[image_part, prompt],
            config=self.config,
        )

        finish_reason = None
        try:
            finish_reason = response.candidates[0].finish_reason
        except (IndexError, TypeError, AttributeError):
            pass

        usage = getattr(response, "usage_metadata", None)
        logger.info(
            "[GEMINI] model=%s finish=%s prompt=%s thought=%s output=%s",
            model,
            finish_reason,
            getattr(usage, "prompt_token_count", None),
            getattr(usage, "thoughts_token_count", None),
            getattr(usage, "candidates_token_count", None),
        )

        return (response.text or "").strip()

    async def _generate_with_fallback(
        self,
        image_part: types.Part,
        prompt: str,
    ) -> Tuple[str, str]:
        """Try primary, then fallbacks. Retry on 429/5xx with backoff."""
        last_error: Exception | None = None

        for model in self._model_chain():
            for attempt in range(1, MAX_ATTEMPTS_PER_MODEL + 1):
                try:
                    logger.info(
                        "[GEMINI] Attempt %d/%d model=%s",
                        attempt,
                        MAX_ATTEMPTS_PER_MODEL,
                        model,
                    )
                    raw = await self._generate_once(model, image_part, prompt)
                    return raw, model

                except ServerError as e:
                    status = getattr(e, "status_code", None) or getattr(e, "code", None)
                    last_error = e
                    if status in RETRYABLE_CODES or status is None:
                        wait = BACKOFF_BASE_SECONDS * attempt
                        logger.warning(
                            "[GEMINI] ServerError on %s (attempt %d): %s. Retry in %ds…",
                            model,
                            attempt,
                            e,
                            wait,
                        )
                        await asyncio.sleep(wait)
                        continue
                    logger.error("[GEMINI] Non-retryable ServerError on %s: %s", model, e)
                    break

                except ClientError as e:
                    last_error = e
                    logger.error("[GEMINI] ClientError on %s: %s", model, e)
                    # Bad request → don't retry same model, move to next
                    break

                except Exception as e:
                    last_error = e
                    logger.error(
                        "[GEMINI] Unexpected %s on %s: %s",
                        type(e).__name__,
                        model,
                        e,
                    )
                    wait = BACKOFF_BASE_SECONDS * attempt
                    await asyncio.sleep(wait)
                    continue

            logger.warning("[GEMINI] Model %s exhausted. Trying next…", model)

        raise ValueError(f"Gemini unavailable on all models: {last_error}") from last_error

    async def analyze(self, image_bytes: bytes) -> Tuple[ProductAnalysis, dict]:
        start = time.time()

        image_part = types.Part.from_bytes(
            data=image_bytes,
            mime_type=_sniff_mime(image_bytes),
        )

        # ---- Attempt 1 (with fallback chain) ----
        raw_text, model_used = await self._generate_with_fallback(
            image_part, PRODUCT_ANALYSIS_PROMPT
        )

        try:
            raw = _extract_json(raw_text)
        except json.JSONDecodeError as first_err:
            logger.warning(
                "Gemini JSON parse failed (attempt 1, model=%s): %s | RAW: %r",
                model_used,
                first_err,
                raw_text[:400],
            )

            # ---- Attempt 2 (stricter suffix, again with fallback chain) ----
            retry_text, model_used = await self._generate_with_fallback(
                image_part, PRODUCT_ANALYSIS_PROMPT + RETRY_SUFFIX
            )
            try:
                raw = _extract_json(retry_text)
            except json.JSONDecodeError as second_err:
                logger.error(
                    "Gemini JSON parse failed (attempt 2, model=%s): %s | RAW: %r",
                    model_used,
                    second_err,
                    retry_text[:400],
                )
                raise ValueError(
                    f"Invalid JSON from Gemini after retry: {second_err}"
                ) from second_err

        validator = ProductAnalyzer()
        analysis = validator._validate(raw)

        meta = {
            "provider": f"gemini:{model_used}",
            "duration_ms": int((time.time() - start) * 1000),
        }
        return analysis, meta


_gemini_instance: GeminiVision | None = None


def get_gemini_vision() -> GeminiVision:
    global _gemini_instance
    if _gemini_instance is None:
        _gemini_instance = GeminiVision()
    return _gemini_instance