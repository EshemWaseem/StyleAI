"""
Content generation:
   attributes → prompt → Ollama → JSON → Pydantic validation
"""

import logging
import time
from typing import Tuple

from pydantic import ValidationError

from app.config import settings
from app.prompts.content_prompts import (
    CONTENT_GENERATION_PROMPT,
    CONTENT_RETRY_PROMPT,
)
from app.schemas.product_content import ProductContent, ProductContentRequest
from app.services.ollama_service import ollama_service

logger = logging.getLogger(__name__)


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

        try:
            raw = await ollama_service.generate_json(
                prompt=CONTENT_GENERATION_PROMPT.format(
                    attributes=attrs_clean,
                    brand_name=req.brand_name or "not provided",
                    brand_voice=req.brand_voice or "minimal",
                ),
                temperature=0.4,
                num_predict=600,
            )
            content = self._validate(raw)
        except (ValidationError, ValueError, KeyError) as e:
            logger.warning("Retry due to: %s", e)
            retried = True
            raw = await ollama_service.generate_json(
                prompt=CONTENT_RETRY_PROMPT.format(attributes=attrs_clean),
                temperature=0.0,
                num_predict=600,
            )
            content = self._validate(raw)

        meta = {
            "provider": f"ollama:{settings.OLLAMA_TEXT_MODEL}",
            "duration_ms": int((time.time() - start) * 1000),
            "retried": retried,
        }
        return content, meta

    def _validate(self, raw: dict) -> ProductContent:
        raw = dict(raw)

        if raw.get("seo_title"):
            raw["seo_title"] = str(raw["seo_title"]).strip()[:60]
        if raw.get("seo_description"):
            raw["seo_description"] = str(raw["seo_description"]).strip()[:160]
        if raw.get("short_description"):
            raw["short_description"] = str(raw["short_description"]).strip()[:300]

        if not isinstance(raw.get("tags"), list):
            raw["tags"] = []

        content = ProductContent(**raw)

        if not content.description.strip():
            content.description = content.short_description

        return content


content_generator = ContentGenerator()