# app/api/routes/product_photography.py
# ======================================================
# POST /api/v1/product/photography
# Provider-aware: IMAGE_PROVIDER=hf | gemini
# ======================================================

import logging
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.dependencies import verify_internal_key
from app.config import settings
from app.schemas.product_analysis import ErrorDetail, ErrorResponse
from app.schemas.product_photography import PhotographyRequest
from app.utils.image_utils import preprocess_image

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/product",
    tags=["product-photography"],
    dependencies=[Depends(verify_internal_key)],
)

ALLOWED_MIME = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_BYTES = 5 * 1024 * 1024


def _get_service():
    """Pick provider based on .env IMAGE_PROVIDER."""
    provider = (settings.IMAGE_PROVIDER or "hf").lower()

    if provider == "hf":
        from app.services.hugging_face.hf_photography import get_hf_photography
        return get_hf_photography()

    from app.services.gemini_photography import get_gemini_photography
    return get_gemini_photography()


@router.post(
    "/photography",
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    summary="Generate an AI-photographed product scene",
)
async def generate_product_photography(
    image: UploadFile = File(...),
    scene: str = Form("studio"),
    lighting: str = Form("soft daylight"),
    include_model: bool = Form(False),
    aspect_ratio: str = Form("4:5"),
    extra_notes: str = Form(""),
    brand_context: str = Form(""),     # ← NEW — Sprint 26
):
    if image.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(
                code="INVALID_IMAGE",
                message=f"Unsupported type: {image.content_type}",
            ).model_dump(),
        )

    contents = await image.read()
    if not contents:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(code="INVALID_IMAGE", message="Empty file").model_dump(),
        )
    if len(contents) > MAX_BYTES:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(
                code="INVALID_IMAGE",
                message=f"Image too large (max {MAX_BYTES // (1024*1024)} MB)",
            ).model_dump(),
        )

    try:
        contents = preprocess_image(contents)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(code="INVALID_IMAGE", message=str(e)).model_dump(),
        )

    try:
        req = PhotographyRequest(
            scene=scene,  # type: ignore
            lighting=lighting,
            include_model=include_model,
            aspect_ratio=aspect_ratio,
            extra_notes=extra_notes,
            brand_context=(brand_context or "").strip()[:2000] or None,  # ← NEW
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(code="INVALID_REQUEST", message=str(e)).model_dump(),
        )

    try:
        svc = _get_service()
        result = await svc.generate(req, contents)
        return {"success": True, "data": result.model_dump()}
    except Exception as e:
        msg = str(e)
        if any(k in msg.lower() for k in ["429", "quota", "rate", "hfquotaerror"]):
            logger.warning("Photography provider limit: %s", msg[:200])
            raise HTTPException(
                status_code=429,
                detail=ErrorDetail(
                    code="RATE_LIMIT",
                    message=(
                        "AI image provider rate limit reached. "
                        "Please wait 1–2 minutes and try again."
                    ),
                ).model_dump(),
            )

        logger.exception("Photography generation failed")
        raise HTTPException(
            status_code=500,
            detail=ErrorDetail(
                code="AI_FAILURE",
                message="Photography generation failed. Please try again.",
            ).model_dump(),
        )