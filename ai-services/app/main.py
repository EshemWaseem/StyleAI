"""
StyleAI AI Service — FastAPI entry point.

Responsibilities:
- Initialize FastAPI app
- Configure CORS + logging
- Mount routes
- Warm Ollama models on startup (text always, vision only if local)
- Clean shutdown

NO business logic here.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes import health as health_routes
from app.api.routes import product_content as product_content_routes
from app.api.routes import product_analyze as product_analyze_routes
from app.services.ollama_service import ollama_service
from app.api import routes
from app.api.routes import product_variants as product_variants_routes

# ======================================================
# LOGGING
# ======================================================
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)

# Silence noisy HTTP client debug logs
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)

logger = logging.getLogger("styleai")


# ======================================================
# WARMUP STATE
# ======================================================
WARMUP_STATE = {
    "text_model": "pending",     # pending | warming | ready | failed | skipped
    "vision_model": "pending",
    "errors": {},
}

_warmup_task: asyncio.Task | None = None


async def _warmup_one(kind: str, model: str) -> None:
    """Warm a single Ollama model. Never raises — records state instead."""
    WARMUP_STATE[f"{kind}_model"] = "warming"
    try:
        logger.info("Warming up %s model: %s", kind, model)
        await ollama_service.generate_json(
            prompt='Return ONLY JSON: {"ok": true}',
            model=model,
            temperature=0.0,
            num_predict=64,
        )
        WARMUP_STATE[f"{kind}_model"] = "ready"
        logger.info("%s model ready: %s", kind.capitalize(), model)
    except Exception as e:
        WARMUP_STATE[f"{kind}_model"] = "failed"
        WARMUP_STATE["errors"][kind] = str(e)
        logger.warning("%s warmup failed (%s): %s", kind, model, e)


async def _warmup_all() -> None:
    """Warm only the models we actually use."""
    tasks = []

    # ---- TEXT: always warm (Ollama) ----
    text_model = settings.OLLAMA_TEXT_MODEL
    if text_model:
        tasks.append(_warmup_one("text", text_model))
    else:
        WARMUP_STATE["text_model"] = "failed"
        WARMUP_STATE["errors"]["text"] = "OLLAMA_TEXT_MODEL not set"

    # ---- VISION: only warm if we're actually using local Ollama for vision ----
    if settings.VISION_PROVIDER == "ollama":
        vision_model = settings.OLLAMA_VISION_MODEL
        if vision_model and vision_model != text_model:
            tasks.append(_warmup_one("vision", vision_model))
        elif vision_model == text_model:
            WARMUP_STATE["vision_model"] = "ready"
        else:
            WARMUP_STATE["vision_model"] = "failed"
            WARMUP_STATE["errors"]["vision"] = "OLLAMA_VISION_MODEL not set"
    else:
        # Gemini (or any cloud provider) — no local warmup needed
        WARMUP_STATE["vision_model"] = "skipped"
        logger.info(
            "Vision warmup skipped — VISION_PROVIDER=%s (cloud)",
            settings.VISION_PROVIDER,
        )

    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


# ======================================================
# LIFESPAN
# ======================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)
    logger.info("Ollama URL:    %s", settings.OLLAMA_URL)
    logger.info("Text model:    %s", settings.OLLAMA_TEXT_MODEL)
    logger.info("Vision provider: %s", settings.VISION_PROVIDER)
    if settings.VISION_PROVIDER == "ollama":
        logger.info("Vision model:  %s", settings.OLLAMA_VISION_MODEL)
    else:
        logger.info("Vision model:  (cloud — %s)", settings.VISION_PROVIDER)

    global _warmup_task
    _warmup_task = asyncio.create_task(_warmup_all())

    yield

    logger.info("Shutting down...")
    if _warmup_task and not _warmup_task.done():
        _warmup_task.cancel()
        try:
            await _warmup_task
        except asyncio.CancelledError:
            pass
    await ollama_service.close()
    logger.info("Shutdown complete.")


# ======================================================
# APP
# ======================================================
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI service for StyleAI.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4000",
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_routes.router)
app.include_router(product_content_routes.router)
app.include_router(product_analyze_routes.router)
app.include_router(product_variants_routes.router)

@app.get("/", include_in_schema=False)
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
        "readiness": "/readiness",
    }











    

# """
# StyleAI AI Service — FastAPI entry point.

# Responsibilities:
# - Initialize FastAPI app
# - Mount routes
# - Global error handling
# - CORS for local dev

# NO business logic here. Keep it clean.
# """

# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware

# from app.config import settings
# from app.api.routes import health as health_routes

# # ======================================================
# # CREATE APP
# # ======================================================
# app = FastAPI(
#     title=settings.APP_NAME,
#     version=settings.APP_VERSION,
#     description="AI service for StyleAI — product analysis, content generation, image enhancement.",
#     docs_url="/docs",
#     redoc_url="/redoc",
# )

# # ======================================================
# # CORS — allow Node backend + local dev
# # ======================================================
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[
#         "http://localhost:4000",  # Node backend
#         "http://localhost:3000",  # Frontend (for direct testing only)
#     ],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # ======================================================
# # MOUNT ROUTES
# # ======================================================
# app.include_router(health_routes.router)


# # ======================================================
# # ROOT
# # ======================================================
# @app.get("/", include_in_schema=False)
# async def root():
#     return {
#         "service": settings.APP_NAME,
#         "version": settings.APP_VERSION,
#         "docs": "/docs",
#         "health": "/health",
#     }









