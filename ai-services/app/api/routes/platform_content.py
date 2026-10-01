# app/api/routes/platform_content.py
# ======================================================
# POST /api/v1/content/platform
# Generates per-platform content (Instagram / TikTok / YouTube / Blog)
# ======================================================

import logging
from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import verify_internal_key
from app.schemas.platform_content import (
    PlatformContentRequest, PlatformContentResponse,
)
from app.services.platform_content_service import generate_platform_content

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/content",
    tags=["content"],
    dependencies=[Depends(verify_internal_key)],
)


@router.post("/platform", response_model=PlatformContentResponse)
async def platform_content(req: PlatformContentRequest):
    try:
        return await generate_platform_content(req)
    except Exception as e:
        logger.exception("Platform content generation failed")
        raise HTTPException(status_code=500, detail=str(e))