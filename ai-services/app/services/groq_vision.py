"""
Groq vision — fast free-tier cloud vision via Llama 3.2 Vision.
Free tier: 14,400 requests/day (no billing required).

Setup:
  1. Get API key: https://console.groq.com/keys
  2. Add to .env: GROQ_API_KEY=gsk_...
  3. Set: VISION_PROVIDER=groq
  4. Restart FastAPI
"""

import asyncio
import base64
import json
import logging
import re
import time
from typing import List, Tuple

import httpx

from app.config import settings
from app.prompts.product_prompts import PRODUCT_ANALYSIS_PROMPT
from app.schemas.product_analysis import ProductAnalysis
from app.services.product_analyzer import validate_and_normalize

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Retryable status codes
RETRYABLE_CODES = {429, 500, 502, 503, 504}
MAX_ATTEMPTS_PER_MODEL = 2
BACKOFF_BASE_SECONDS = 3


def _strip_json_fences(text: str) -> str:
    """Remove markdown fences and extract JSON object."""
    text = text.strip()

    m = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if m:
        text = m.group(1).strip()

    s = text.find("{")
    e = text.rfind("}")
    if s != -1 and e != -1 and e > s:
        text = text[s : e + 1]

    return text


class GroqVision:
    def __init__(self) -> None:
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not set")

        self.api_key = settings.GROQ_API_KEY
        self.primary_model = settings.GROQ_VISION_MODEL
        self.fallback_models = settings.groq_fallbacks

        logger.info(
            "GroqVision initialized. Primary: %s. Fallbacks: %s",
            self.primary_model,
            self.fallback_models,
        )

    def _model_chain(self) -> List[str]:
        chain = [self.primary_model]
        for m in self.fallback_models:
            if m and m not in chain:
                chain.append(m)
        return chain

    async def _call_once(
        self, model: str, prompt: str, image_bytes: bytes
    ) -> str:
        """Single Groq API call. Returns raw text."""
        b64 = base64.b64encode(image_bytes).decode("ascii")

        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{b64}"
                            },
                        },
                    ],
                }
            ],
            "temperature": 0.1,
            "max_tokens": 800,
            "response_format": {"type": "json_object"},
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(GROQ_API_URL, json=payload, headers=headers)

        if resp.status_code != 200:
            raise httpx.HTTPStatusError(
                f"Groq {resp.status_code}: {resp.text[:300]}",
                request=resp.request,
                response=resp,
            )

        data = resp.json()

        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise ValueError(f"Unexpected Groq response shape: {data}") from e

    async def _call_with_retry(
        self, prompt: str, image_bytes: bytes
    ) -> Tuple[str, str]:
        """Try primary model, then fallbacks. Retry on 429/5xx."""
        last_error = None

        for model in self._model_chain():
            for attempt in range(1, MAX_ATTEMPTS_PER_MODEL + 1):
                try:
                    logger.info(
                        "[GROQ] Attempt %d/%d model=%s",
                        attempt, MAX_ATTEMPTS_PER_MODEL, model,
                    )
                    raw = await self._call_once(model, prompt, image_bytes)
                    return raw, model

                except httpx.HTTPStatusError as e:
                    code = e.response.status_code
                    last_error = e

                    if code in RETRYABLE_CODES:
                        wait = BACKOFF_BASE_SECONDS * attempt
                        logger.warning(
                            "[GROQ] %s on %s (attempt %d). Retry in %ds…",
                            code, model, attempt, wait,
                        )
                        await asyncio.sleep(wait)
                        continue
                    else:
                        logger.error("[GROQ] Non-retryable %s on %s: %s",
                                     code, model, e.response.text[:200])
                        break

                except Exception as e:
                    last_error = e
                    logger.error(
                        "[GROQ] Unexpected %s on %s: %s",
                        type(e).__name__, model, e,
                    )
                    break

            logger.warning("[GROQ] Model %s exhausted. Trying next…", model)

        raise ValueError(f"Groq unavailable on all models: {last_error}") from last_error

    async def analyze(self, image_bytes: bytes) -> Tuple[ProductAnalysis, dict]:
        start = time.time()
        logger.info("[GROQ] Request — %d bytes", len(image_bytes))

        raw_text, model_used = await self._call_with_retry(
            PRODUCT_ANALYSIS_PROMPT, image_bytes
        )

        logger.info(
            "[GROQ] Response from %s (%d chars):\n%s",
            model_used, len(raw_text), raw_text[:500],
        )

        # Parse
        raw = None
        try:
            cleaned = _strip_json_fences(raw_text)
            raw = json.loads(cleaned)
            logger.info("[GROQ] JSON parsed")
        except json.JSONDecodeError as e:
            logger.warning("[GROQ] Parse failed: %s. Retrying with strict prompt…", e)
            strict_prompt = (
                "Return ONLY a JSON object. Start with { and end with }. "
                "No prose. No code fences.\n\n"
                + PRODUCT_ANALYSIS_PROMPT
            )
            retry_text, _ = await self._call_with_retry(strict_prompt, image_bytes)
            cleaned = _strip_json_fences(retry_text)
            try:
                raw = json.loads(cleaned)
            except json.JSONDecodeError as e2:
                raise ValueError(f"Invalid JSON from Groq after retry: {e2}") from e2

        analysis = validate_and_normalize(raw)
        logger.info("[GROQ] Validation passed")

        meta = {
            "provider": f"groq:{model_used}",
            "duration_ms": int((time.time() - start) * 1000),
        }
        return analysis, meta


_groq_instance: GroqVision | None = None


def get_groq_vision() -> GroqVision:
    global _groq_instance
    if _groq_instance is None:
        _groq_instance = GroqVision()
    return _groq_instance