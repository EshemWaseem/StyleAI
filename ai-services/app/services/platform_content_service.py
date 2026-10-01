# app/services/platform_content_service.py
# ======================================================
# Per-platform content generation via Ollama text model
# Falls back across prompt retries if JSON invalid
# Sprint 26: brand_context flows through build_prompt()
# ======================================================

import json
import logging
import re
import time
from typing import Any, Dict

from pydantic import ValidationError

from app.config import settings
from app.services.ollama_service import ollama_service
from app.prompts.platform_content_prompts import build_prompt
from app.schemas.platform_content import (
    PlatformContentRequest,
    InstagramContent, TikTokContent, YouTubeContent, BlogContent,
)

logger = logging.getLogger("styleai.platform_content")

_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)

MODELS = {
    "instagram": InstagramContent,
    "tiktok": TikTokContent,
    "youtube": YouTubeContent,
    "blog": BlogContent,
}


def _extract_json(text: str) -> dict:
    cleaned = _FENCE_RE.sub("", (text or "").strip()).strip()
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise json.JSONDecodeError("No JSON object found", cleaned, 0)
    return json.loads(cleaned[start:end + 1])


def _sanitize_dict(raw: Any) -> dict:
    if not isinstance(raw, dict):
        return {}
    out = {}
    for k, v in raw.items():
        if not isinstance(k, str) or not k.strip():
            continue
        if isinstance(v, str) and not v.strip():
            continue
        out[k.strip()] = v
    return out


async def generate_platform_content(req: PlatformContentRequest) -> Dict[str, Any]:
    start = time.time()
    model = settings.OLLAMA_TEXT_MODEL
    retried = False

    context_injected = bool(getattr(req, "brand_context", None) and str(req.brand_context).strip())

    prompt = build_prompt(req)

    try:
        raw = await ollama_service.generate_json(
            prompt=prompt, model=model, temperature=0.4, num_predict=1500,
        )
        content = _validate(req.platform, raw)
    except (ValidationError, ValueError, KeyError, json.JSONDecodeError) as e:
        logger.warning("Retry — attempt 1 failed: %s", e)
        retried = True
        strict = (
            "Return ONLY a JSON object. Start with { and end with }. No prose.\n\n"
            + prompt
        )
        raw = await ollama_service.generate_json(
            prompt=strict, model=model, temperature=0.0, num_predict=1500,
        )
        content = _validate(req.platform, raw)

    latency = int((time.time() - start) * 1000)
    return {
        "platform": req.platform,
        "content": content.model_dump(),
        "provider": "ollama",
        "model": model,
        "latency_ms": latency,
        "retried": retried,
        "context_injected": context_injected,
    }


def _validate(platform: str, raw: Any):
    cleaned = _sanitize_dict(raw)
    Model = MODELS[platform]
    return Model(**cleaned)