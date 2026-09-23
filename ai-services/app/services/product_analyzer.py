






"""
Product analyzer — shared validation/normalization + local (Ollama) vision path.

Used by:
  * gemini_vision.py    -> ProductAnalyzer()._validate(raw)
  * product_analyze.py  -> ProductAnalyzer().analyze(bytes)
                           (only when VISION_PROVIDER != "gemini")

NOTE: no self-import in this file. The `product_analyzer` instance is
created at the bottom.
"""

import base64
import logging
import time
from typing import Any, Optional, Tuple

from pydantic import ValidationError

from app.config import settings
from app.prompts.product_prompts import (
    PRODUCT_ANALYSIS_PROMPT,
    PRODUCT_ANALYSIS_RETRY_PROMPT,
)
from app.schemas.product_analysis import ProductAnalysis
from app.services.ollama_service import ollama_service

logger = logging.getLogger(__name__)

_GENDERS = {
    "male": "Male",
    "female": "Female",
    "unisex": "Unisex",
    "both": "Unisex",
    "unknown": "Unknown",
}

_CATEGORIES = {
    c.lower(): c
    for c in ("Clothing", "Footwear", "Accessories", "Bags", "Outerwear")
}

_NULL_STRINGS = {"", "null", "none", "n/a"}


def _clean_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return None if text.lower() in _NULL_STRINGS else text


def _clean_str_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    out = []
    for item in value:
        text = _clean_str(item)
        if text:
            out.append(text)
    return out


class ProductAnalyzer:
    # ------------------------------------------------------------------
    # Shared validation / normalization (also used by GeminiVision)
    # ------------------------------------------------------------------
    def _validate(self, raw: Any) -> ProductAnalysis:
        if not isinstance(raw, dict):
            raise ValueError("Model output is not a JSON object")

        gender = _GENDERS.get(
            str(raw.get("target_gender") or "").strip().lower(), "Unknown"
        )

        category = _CATEGORIES.get(str(raw.get("category") or "").strip().lower())
        if category is None:
            raise ValueError(f"Unrecognized category: {raw.get('category')!r}")

        try:
            confidence = float(raw.get("confidence"))
        except (TypeError, ValueError):
            confidence = 0.0
        confidence = max(0.0, min(1.0, confidence))

        attributes = raw.get("attributes")
        if not isinstance(attributes, dict):
            attributes = {}

        cleaned = {
            "target_gender": gender,
            "category": category,
            "product_type": _clean_str(raw.get("product_type")),
            "color": _clean_str(raw.get("color")),
            "secondary_colors": _clean_str_list(raw.get("secondary_colors")),
            "pattern": _clean_str(raw.get("pattern")),
            "material": _clean_str(raw.get("material")),
            "style": _clean_str(raw.get("style")),
            "attributes": attributes,
            "confidence": confidence,
            "uncertain_fields": _clean_str_list(raw.get("uncertain_fields")),
        }

        try:
            return ProductAnalysis(**cleaned)
        except ValidationError as e:
            raise ValueError(f"Analysis failed schema validation: {e}") from e

    # ------------------------------------------------------------------
    # Local vision path (Ollama). Only used if VISION_PROVIDER != "gemini".
    # ------------------------------------------------------------------
    async def analyze(self, image_bytes: bytes) -> Tuple[ProductAnalysis, dict]:
        start = time.time()
        model = settings.OLLAMA_VISION_MODEL
        image_b64 = base64.b64encode(image_bytes).decode("ascii")

        last_err: Optional[Exception] = None
        for prompt in (PRODUCT_ANALYSIS_PROMPT, PRODUCT_ANALYSIS_RETRY_PROMPT):
            try:
                raw = await ollama_service.generate_json(
                    prompt=prompt,
                    model=model,
                    images=[image_b64],
                    temperature=0.1,
                    num_predict=800,
                )
                analysis = self._validate(raw)
                meta = {
                    "provider": f"ollama:{model}",
                    "duration_ms": int((time.time() - start) * 1000),
                }
                return analysis, meta
            except ValueError as e:
                last_err = e
                logger.warning("Local vision attempt failed: %s", e)

        raise ValueError(f"Local vision analysis failed: {last_err}") from last_err


# Singleton instance (created AFTER the class; never import this module from itself)
product_analyzer = ProductAnalyzer()