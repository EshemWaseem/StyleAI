"""
Health and readiness endpoints.
"""

from fastapi import APIRouter

from app.config import settings
from app.schemas.health import HealthResponse, ReadinessResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Liveness — is the process running?"""
    return HealthResponse(
        status="ok",
        service=settings.APP_NAME,
        version=settings.APP_VERSION,
    )


@router.get("/readiness", response_model=ReadinessResponse)
async def readiness() -> ReadinessResponse:
    """
    Readiness — is the service ready to serve traffic?

    Reports warmup state for text and vision models.
    """
    from app.main import WARMUP_STATE

    text = WARMUP_STATE["text_model"]
    vision = WARMUP_STATE["vision_model"]

    # Ready if text model is ready (vision optional)
    if text == "ready":
        overall = "ok"
    elif text in ("pending", "warming"):
        overall = "warming"
    else:
        overall = "degraded"

    return ReadinessResponse(
        status=overall,
        checks={
            "config_loaded": True,
            "provider": settings.AI_PROVIDER,
            "ollama_url": settings.OLLAMA_URL,
            "text_model": settings.OLLAMA_TEXT_MODEL,
            "vision_model": settings.OLLAMA_VISION_MODEL,
            "text_model_state": text,
            "vision_model_state": vision,
            "warmup_errors": WARMUP_STATE.get("errors", {}),
        },
    )


# """
# Health check endpoints.

# - /health    → service alive? (liveness)
# - /readiness → service ready to serve? (readiness)
# """

# from fastapi import APIRouter

# from app.config import settings
# from app.schemas.health import HealthResponse, ReadinessResponse

# router = APIRouter(tags=["health"])


# @router.get("/health", response_model=HealthResponse)
# async def health() -> HealthResponse:
#     """Liveness check — is the process running?"""
#     return HealthResponse(
#         status="ok",
#         service=settings.APP_NAME,
#         version=settings.APP_VERSION,
#     )


# @router.get("/readiness", response_model=ReadinessResponse)
# async def readiness() -> ReadinessResponse:
#     """
#     Readiness check — is the service ready to handle requests?

#     Checks:
#     - config loaded?
#     - AI provider configured?
#     """
#     return ReadinessResponse(
#         status="ok",
#         checks={
#             "config_loaded": True,
#             "provider": settings.AI_PROVIDER,
#         },
#     )