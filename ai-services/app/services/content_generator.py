# app/services/content_generator.py
"""
Content generation:
   attributes (+ optional brand_context) → prompt → Ollama → JSON → sanitize → Pydantic
"""

import logging
import time
from typing import Tuple

from pydantic import ValidationError

from app.config import settings
from app.prompts.content_prompts import (
    CONTENT_GENERATION_PROMPT,
    CONTENT_RETRY_PROMPT,
    build_brand_block,
)
from app.schemas.product_content import ProductContent, ProductContentRequest
from app.services.ollama_service import ollama_service

logger = logging.getLogger(__name__)

_EXPECTED_KEYS = {
    "product_name",
    "short_description",
    "description",
    "tags",
    "seo_title",
    "seo_description",
}


def _sanitize_key(k: str) -> str:
    k = str(k).strip()
    if not k or len(k.strip()) == 0:
        return "__junk__"
    return k


def _sanitize_raw(raw: dict) -> dict:
    if not isinstance(raw, dict):
        return {}
    clean: dict = {}
    for k, v in raw.items():
        key = _sanitize_key(k)
        if key == "__junk__":
            continue
        if isinstance(v, str) and v in _EXPECTED_KEYS:
            continue
        clean[key] = v
    return clean


def _coerce_to_dict(raw) -> dict:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, list) and raw and isinstance(raw[0], dict):
        return raw[0]
    return {}


class ContentGenerator:
    async def generate(
        self, req: ProductContentRequest
    ) -> Tuple[ProductContent, dict]:
        start = time.time()
        retried = False

        attrs = {
            "category": req.category,
            "product_type": req.product_type,
            "color": req.color,
            "material": req.material,
            "target_gender": req.target_gender,
            "pattern": req.pattern,
            "style": req.style,
            "attributes": req.attributes,
        }
        attrs_clean = {k: v for k, v in attrs.items() if v not in (None, {}, [])}

        brand_block = build_brand_block(getattr(req, "brand_context", None))
        context_injected = bool(brand_block.strip())

        try:
            raw = await ollama_service.generate_json(
                prompt=CONTENT_GENERATION_PROMPT.format(
                    brand_block=brand_block,
                    attributes=attrs_clean,
                    brand_name=req.brand_name or "not provided",
                    brand_voice=req.brand_voice or "minimal",
                ),
                temperature=0.3,
                num_predict=1200,
            )
            content = self._validate(raw, attrs_clean)
        except (ValidationError, ValueError, KeyError, TypeError) as e:
            logger.warning("Retry due to: %s", e)
            retried = True
            raw = await ollama_service.generate_json(
                prompt=CONTENT_RETRY_PROMPT.format(
                    brand_block=brand_block,
                    attributes=attrs_clean,
                ),
                temperature=0.0,
                num_predict=1200,
            )
            content = self._validate(raw, attrs_clean)

        meta = {
            "provider": f"ollama:{settings.OLLAMA_TEXT_MODEL}",
            "duration_ms": int((time.time() - start) * 1000),
            "retried": retried,
            "context_injected": context_injected,
        }
        return content, meta

    def _validate(self, raw, attrs_clean: dict) -> ProductContent:
        raw_dict = _coerce_to_dict(raw)
        raw_dict = _sanitize_raw(raw_dict)

        fallback_name = self._derive_name(attrs_clean)

        name = str(raw_dict.get("product_name") or "").strip()
        raw_dict["product_name"] = name or fallback_name

        sd = str(raw_dict.get("short_description") or "").strip()
        if not sd:
            sd = self._derive_short_description(attrs_clean, raw_dict["product_name"])
        raw_dict["short_description"] = sd[:300]

        desc = str(raw_dict.get("description") or "").strip()
        if not desc:
            desc = raw_dict["short_description"]
        raw_dict["description"] = desc

        tags = raw_dict.get("tags")
        if not isinstance(tags, list):
            tags = []
        tags = [str(t).strip().lower() for t in tags if str(t).strip()]
        raw_dict["tags"] = tags[:12]

        if raw_dict.get("seo_title"):
            raw_dict["seo_title"] = str(raw_dict["seo_title"]).strip()[:60]
        else:
            raw_dict["seo_title"] = raw_dict["product_name"][:60]

        if raw_dict.get("seo_description"):
            raw_dict["seo_description"] = str(raw_dict["seo_description"]).strip()[:160]
        else:
            raw_dict["seo_description"] = raw_dict["short_description"][:160]

        content = ProductContent(**raw_dict)

        if not content.description.strip():
            content.description = content.short_description

        return content

    @staticmethod
    def _derive_name(attrs: dict) -> str:
        color = (attrs.get("color") or "").strip()
        ptype = (attrs.get("product_type") or attrs.get("category") or "").strip()
        parts = [p for p in (color, ptype) if p]
        return " ".join(parts).title() or "Fashion Product"

    @staticmethod
    def _derive_short_description(attrs: dict, name: str) -> str:
        color = attrs.get("color") or ""
        material = attrs.get("material") or ""
        style = attrs.get("style") or ""
        bits = []
        if style:
            bits.append(style)
        if color:
            bits.append(color)
        if material and material.lower() != "unknown":
            bits.append(f"in {material}")
        clause = " ".join(bits) or "A refined wardrobe staple"
        return f"{clause.title()} — {name.lower()} designed for everyday wear."


content_generator = ContentGenerator()