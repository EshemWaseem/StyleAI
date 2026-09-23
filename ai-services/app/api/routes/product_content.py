"""
AI Product Content endpoint.

POST /api/v1/product/content
"""

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import verify_internal_key
from app.schemas.product_content import (
    ContentResponse,
    ErrorDetail,
    ErrorResponse,
    ProductContentRequest,
)
from app.services.content_generator import content_generator

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/product",
    tags=["product-content"],
    dependencies=[Depends(verify_internal_key)],
)


@router.post(
    "/content",
    response_model=ContentResponse,
    responses={500: {"model": ErrorResponse}},
    summary="Generate e-commerce content from verified attributes",
)
async def generate_content(req: ProductContentRequest) -> ContentResponse:
    try:
        content, meta = await content_generator.generate(req)
    except Exception:
        logger.exception("Content generation failed")
        raise HTTPException(
            status_code=500,
            detail=ErrorDetail(
                code="AI_FAILURE",
                message="Content generation failed. Please try again.",
            ).model_dump(),
        )

    return ContentResponse(success=True, data=content, meta=meta)