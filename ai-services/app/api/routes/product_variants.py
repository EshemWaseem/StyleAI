"""
POST /api/v1/product/variants — generate 3 image views from one upload.
Returns base64 images. Node uploads them to Cloudinary.
"""

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.dependencies import verify_internal_key
from app.schemas.product_analysis import ErrorDetail, ErrorResponse
from app.services.image_variants import generate_variants
from app.utils.image_utils import preprocess_image

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/product",
    tags=["product-variants"],
    dependencies=[Depends(verify_internal_key)],
)

ALLOWED_MIME = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_BYTES = 5 * 1024 * 1024


@router.post(
    "/variants",
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    summary="Generate 3 image variants from one uploaded product image",
)
async def generate_product_variants(image: UploadFile = File(...)) -> dict:
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
        variants = generate_variants(contents)
    except ValueError as e:
        logger.warning("Variant generation failed: %s", e)
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(code="INVALID_IMAGE", message=str(e)).model_dump(),
        )
    except Exception:
        logger.exception("Variant generation failed")
        raise HTTPException(
            status_code=500,
            detail=ErrorDetail(
                code="AI_FAILURE",
                message="Variant generation failed. Please try again.",
            ).model_dump(),
        )

    return {"success": True, "data": {"variants": variants}}