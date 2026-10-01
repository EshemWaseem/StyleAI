# app/services/image_qa.py
# ======================================================
# Image QA — Gemini vision compares original vs generated
# Returns QualityReport; falls back to a soft pass on failure.
# ======================================================

import json
import logging
import re
import time

from google import genai
from google.genai import types

from app.config import settings
from app.prompts.photography_prompts import QA_PROMPT
from app.schemas.product_photography import QACheck, QualityReport

logger = logging.getLogger("styleai.image_qa")

_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)


def _extract_json(text: str) -> dict:
    cleaned = _FENCE_RE.sub("", (text or "").strip()).strip()
    s, e = cleaned.find("{"), cleaned.rfind("}")
    if s == -1 or e == -1 or e <= s:
        raise json.JSONDecodeError("No JSON", cleaned, 0)
    return json.loads(cleaned[s:e + 1])


def _soft_pass(reason: str) -> QualityReport:
    """Neutral fallback if QA model fails."""
    return QualityReport(
        passed=True,
        overall=75.0,
        checks=[
            QACheck(label="Product similarity", value=75),
            QACheck(label="Colour accuracy", value=75),
            QACheck(label="Shape fidelity", value=75),
            QACheck(label="Logo & markings", value=75),
            QACheck(label="Texture", value=75),
            QACheck(label="Artifact check", value=75),
            QACheck(label="Human anatomy", value=75),
        ],
        feedback=f"QA unavailable — human review recommended. ({reason[:60]})",
    )


async def check_quality(original_bytes: bytes, generated_bytes: bytes) -> QualityReport:
    if not settings.GEMINI_API_KEY:
        return _soft_pass("no gemini key")

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        original_part = types.Part.from_bytes(data=original_bytes, mime_type="image/jpeg")
        generated_part = types.Part.from_bytes(data=generated_bytes, mime_type="image/png")

        response = await client.aio.models.generate_content(
            model=settings.GEMINI_VISION_MODEL,
            contents=[original_part, generated_part, QA_PROMPT],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                max_output_tokens=1024,
                thinking_config=types.ThinkingConfig(
                    thinking_level=types.ThinkingLevel.LOW
                ),
            ),
        )

        raw = _extract_json(response.text or "")

        checks = [
            QACheck(
                label=str(c.get("label", ""))[:40],
                value=max(0.0, min(100.0, float(c.get("value", 0)))),
            )
            for c in (raw.get("checks") or [])
            if isinstance(c, dict)
        ]

        return QualityReport(
            passed=bool(raw.get("passed", False)),
            overall=max(0.0, min(100.0, float(raw.get("overall", 0)))),
            checks=checks,
            feedback=str(raw.get("feedback", ""))[:200],
        )

    except Exception as e:
        logger.warning("QA check failed: %s", e)
        return _soft_pass(str(e))