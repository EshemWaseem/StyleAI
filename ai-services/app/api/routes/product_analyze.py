





"""
POST /api/v1/product/analyze — analyze an uploaded product image.
Routes to Gemini (cloud) or Ollama (local) based on config.

NOTE: /api/v1/product/content lives in product_content.py, not here.
"""

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.dependencies import verify_internal_key
from app.config import settings
from app.schemas.product_analysis import (
    AnalyzeResponse,
    ErrorDetail,
    ErrorResponse,
)
from app.utils.image_utils import preprocess_image

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/product",
    tags=["product-analyze"],
    dependencies=[Depends(verify_internal_key)],
)

ALLOWED_MIME = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_BYTES = 5 * 1024 * 1024

# Local (Ollama) analyzer is created lazily, only if VISION_PROVIDER != "gemini".
# This avoids importing the `product_analyzer` instance at module level,
# which is what was breaking startup.
_local_analyzer = None


def _get_local_analyzer():
    global _local_analyzer
    if _local_analyzer is None:
        from app.services.product_analyzer import ProductAnalyzer

        _local_analyzer = ProductAnalyzer()
    return _local_analyzer


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    summary="Analyze product image and return structured attributes",
)
async def analyze_product(image: UploadFile = File(...)) -> AnalyzeResponse:
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
        if settings.VISION_PROVIDER == "gemini":
            from app.services.gemini_vision import get_gemini_vision

            analyzer = get_gemini_vision()
            analysis, meta = await analyzer.analyze(contents)
        else:
            analysis, meta = await _get_local_analyzer().analyze(contents)
    except ValueError as e:
        logger.warning("Analyze failed: %s", e)
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(code="INVALID_IMAGE", message=str(e)).model_dump(),
        )
    except Exception:
        logger.exception("Analyze failed")
        raise HTTPException(
            status_code=500,
            detail=ErrorDetail(
                code="AI_FAILURE",
                message="Image analysis failed. Please try again.",
            ).model_dump(),
        )

    return AnalyzeResponse(success=True, data=analysis, meta=meta)