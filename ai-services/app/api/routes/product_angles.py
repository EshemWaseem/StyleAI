# app/api/routes/product_angles.py
# ======================================================
# POST /api/v1/product/angles
# Multipart: image + optional "keys" (comma-separated)
# Returns: { success: true, data: { variants: [...], meta: {...} } }
# ======================================================

import base64
import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.dependencies import verify_internal_key
from app.config import settings
from app.schemas.product_analysis import ErrorDetail, ErrorResponse
from app.services.gemini_image import get_gemini_image
from app.utils.image_utils import preprocess_image

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/product",
    tags=["product-angles"],
    dependencies=[Depends(verify_internal_key)],
)

ALLOWED_MIME = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_BYTES = 5 * 1024 * 1024


@router.post(
    "/angles",
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    summary="Generate AI-powered product angles (side/3-4/detail) from one image",
)
async def generate_product_angles(
    image: UploadFile = File(...),
    keys: str = Form(""),
) -> dict:
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

    requested = [k.strip() for k in (keys or "").split(",") if k.strip()]

    try:
        svc = get_gemini_image()
        variants, meta = await svc.generate_angles(contents, requested)
    except Exception:
        logger.exception("Angle generation failed")
        raise HTTPException(
            status_code=500,
            detail=ErrorDetail(
                code="AI_FAILURE",
                message="Angle generation failed. Please try again.",
            ).model_dump(),
        )

    if not variants:
        raise HTTPException(
            status_code=500,
            detail=ErrorDetail(
                code="AI_FAILURE",
                message="AI could not generate any angle. Try again or use a different image.",
            ).model_dump(),
        )

    payload = [
        {
            "key": v["key"],
            "label": v["label"],
            "mime": "image/png",
            "base64": base64.b64encode(v["image_bytes"]).decode("ascii"),
            "width": 0,
            "height": 0,
        }
        for v in variants
    ]

    return {"success": True, "data": {"variants": payload, "meta": meta}}