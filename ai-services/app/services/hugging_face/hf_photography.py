# app/services/hugging_face/hf_photography.py
# ======================================================
# Product photography via HF image-to-image
# PRESERVES the input product image — only changes scene.
# Sprint 26: brand_context appended as a short style hint.
# ======================================================

import base64
import logging
import time
from typing import Optional

from app.config import settings
from app.services.image_qa import check_quality
from app.services.hugging_face.hf_image import get_hf_image, HFQuotaError
from app.schemas.product_photography import (
    PhotographyRequest, GeneratedScene, PhotographyResponse,
)

logger = logging.getLogger("styleai.hf_photography")


def _aspect_to_size(ratio: str) -> tuple[int, int]:
    mapping = {
        "1:1": (1024, 1024),
        "4:5": (896, 1120),
        "3:4": (896, 1152),
        "16:9": (1280, 720),
        "9:16": (720, 1280),
    }
    return mapping.get(ratio, (1024, 1024))


def _build_scene_only_prompt(req: PhotographyRequest) -> str:
    """
    For image-to-image, prompt should describe ONLY the scene change,
    not the product (input image already shows the product).
    """
    scene = (req.scene or "studio").lower()

    scene_prompts = {
        "studio": (
            "Place this exact same product on a clean white studio background, "
            "soft even lighting, professional e-commerce product shot, "
            "keep product colors, shape, and details exactly the same"
        ),
        "luxury": (
            "Place this exact same product on dark marble with warm golden side-lighting, "
            "cinematic luxury editorial, keep product colors and details exactly the same"
        ),
        "lifestyle": (
            "Place this exact same product in a bright neutral home interior, "
            "soft linen textures, warm daylight, keep product exactly the same"
        ),
        "outdoor": (
            "Place this exact same product on smooth stone outdoors, "
            "soft morning light, blurred greenery background, keep product exactly the same"
        ),
        "street": (
            "Place this exact same product on urban sidewalk, moody street lighting, "
            "keep product colors and shape exactly the same"
        ),
        "minimal": (
            "Place this exact same product on plain beige surface, minimal composition, "
            "single soft shadow, keep product exactly the same"
        ),
        "editorial": (
            "Place this exact same product in a fashion magazine editorial scene, "
            "strong directional light, elegant backdrop, keep product exactly the same"
        ),
        "ecommerce": (
            "Place this exact same product on pure white background with soft front lighting, "
            "sharp clean listing shot, keep product exactly the same"
        ),
        "social": (
            "Place this exact same product in a vibrant Instagram-friendly styled scene, "
            "bright colors, playful composition, keep product exactly the same"
        ),
    }

    base = scene_prompts.get(scene, scene_prompts["studio"])

    if req.lighting:
        base += f", {req.lighting}"

    if req.extra_notes:
        base += f", {req.extra_notes[:150]}"

    # Brand visual style — short, aesthetic-only, must not override product
    brand_ctx = getattr(req, "brand_context", None)
    if brand_ctx and str(brand_ctx).strip():
        short_style = str(brand_ctx).strip().replace("\n", " ")[:200]
        base += f", brand visual mood: {short_style}"

    base += ". Preserve original product exactly."

    return base


class HFPhotography:
    def __init__(self) -> None:
        self.client = get_hf_image()

    async def generate(
        self, req: PhotographyRequest, product_bytes: bytes
    ) -> PhotographyResponse:
        start = time.time()

        prompt = _build_scene_only_prompt(req)
        context_injected = bool(getattr(req, "brand_context", None) and str(req.brand_context).strip())
        logger.info("[HF:photo] brand_context injected: %s", context_injected)
        logger.info("[HF:photo] scene prompt: %s", prompt[:250])

        # strength: lower = keep more of original (product), higher = more scene change
        strength = 0.65

        try:
            image_bytes, gen_ms = await self.client.generate_from_image(
                image_bytes=product_bytes,
                prompt=prompt,
                strength=strength,
            )
            logger.info("[HF:photo] generated in %dms", gen_ms)
        except HFQuotaError as e:
            logger.warning("HF quota: %s", e)
            raise
        except Exception as e:
            logger.exception("HF generation failed")
            raise ValueError(f"HF generation failed: {e}") from e

        # QA — Gemini vision (soft-pass on failure)
        quality = await check_quality(product_bytes, image_bytes)

        latency = int((time.time() - start) * 1000)

        return PhotographyResponse(
            scene=req.scene,
            variant=GeneratedScene(
                scene=req.scene,
                mime="image/png",
                base64=base64.b64encode(image_bytes).decode("ascii"),
                width=0,
                height=0,
            ),
            quality=quality,
            provider="huggingface",
            model=settings.HF_IMAGE_MODEL,
            latency_ms=latency,
            regenerated=False,
        )


_instance: Optional[HFPhotography] = None


def get_hf_photography() -> HFPhotography:
    global _instance
    if _instance is None:
        _instance = HFPhotography()
    return _instance