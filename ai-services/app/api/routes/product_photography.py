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


def _build_req(scene, lighting, include_model, aspect_ratio, extra_notes, brand_context):
    return PhotographyRequest(
        scene=scene,
        lighting=lighting,
        include_model=include_model,
        aspect_ratio=aspect_ratio,
        extra_notes=extra_notes,
        brand_context=(brand_context or "").strip()[:2000] or None,
    )


def _is_paid_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(k in msg for k in ["402", "payment required", "no remaining credits", "purchase"])


def _is_recoverable(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(k in msg for k in ["429", "quota", "rate", "timeout", "503", "500", "unavailable"])


async def _try_hf(req: PhotographyRequest, image_bytes: bytes):
    from app.services.hugging_face.hf_photography import get_hf_photography
    svc = get_hf_photography()
    return await svc.generate(req, image_bytes)


async def _try_pollinations(req: PhotographyRequest, image_bytes: bytes):
    from app.services.pollinations_photography import PollinationsPhotographyService
    svc = PollinationsPhotographyService()
    return await svc.generate(req, image_bytes)


async def _generate(req: PhotographyRequest, image_bytes: bytes) -> dict:
    provider = (getattr(settings, "IMAGE_PROVIDER", "pollinations") or "pollinations").lower()

    if provider == "pollinations":
        logger.info("Provider: pollinations (direct)")
        result = await _try_pollinations(req, image_bytes)
        return {"success": True, "data": result.model_dump()}

    if provider == "hf":
        logger.info("Provider: hf (with pollinations fallback)")
        try:
            result = await _try_hf(req, image_bytes)
            return {"success": True, "data": result.model_dump()}
        except Exception as hf_err:
            if _is_paid_error(hf_err):
                logger.warning(
                    "HF has no credits (402). Switching to Pollinations. "
                    "Set IMAGE_PROVIDER=pollinations in .env to skip HF permanently."
                )
            elif _is_recoverable(hf_err):
                logger.warning("HF temporarily unavailable: %s", str(hf_err)[:100])
            else:
                logger.error("HF failed: %s", str(hf_err)[:200])

            logger.info("Falling back to Pollinations...")
            result = await _try_pollinations(req, image_bytes)
            return {"success": True, "data": result.model_dump()}

    from app.services.gemini_photography import get_gemini_photography
    logger.info("Provider: gemini (with pollinations fallback)")
    try:
        svc = get_gemini_photography()
        result = await svc.generate(req, image_bytes)
        return {"success": True, "data": result.model_dump()}
    except Exception as gem_err:
        logger.warning("Gemini failed: %s — falling back to Pollinations", str(gem_err)[:100])
        result = await _try_pollinations(req, image_bytes)
        return {"success": True, "data": result.model_dump()}


@router.post(
    "/photography",
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    summary="Generate AI product photography from a product image",
)
async def generate_product_photography(
    image: UploadFile = File(...),
    scene: str = Form("studio"),
    lighting: str = Form("soft daylight"),
    include_model: bool = Form(False),
    aspect_ratio: str = Form("4:5"),
    extra_notes: str = Form(""),
    brand_context: str = Form(""),
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
            detail=ErrorDetail(code="INVALID_IMAGE", message="Empty file uploaded").model_dump(),
        )

    if len(contents) > MAX_BYTES:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(
                code="IMAGE_TOO_LARGE",
                message=f"Max size is {MAX_BYTES // (1024 * 1024)} MB",
            ).model_dump(),
        )

    try:
        contents = preprocess_image(contents)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(code="INVALID_IMAGE", message=str(exc)).model_dump(),
        ) from exc

    try:
        req = _build_req(scene, lighting, include_model, aspect_ratio, extra_notes, brand_context)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=ErrorDetail(code="INVALID_REQUEST", message=str(exc)).model_dump(),
        ) from exc

    try:
        return await _generate(req, contents)
    except Exception as exc:
        logger.exception("All providers failed")
        raise HTTPException(
            status_code=500,
            detail=ErrorDetail(
                code="ALL_PROVIDERS_FAILED",
                message="Photography generation failed. Please try again.",
            ).model_dump(),
        ) from exc