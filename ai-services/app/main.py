# main.py
"""
StyleAI AI Service — FastAPI entry point.

Responsibilities:
- Initialize FastAPI app
- Configure CORS + logging
- Mount routes
- Warm models on startup (only if Ollama is the active provider)
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
from app.api.routes import product_variants as product_variants_routes
from app.api.routes import matching as matching_routes
from app.api.routes import product_angles as product_angles_routes
from app.api.routes import platform_content as platform_content_routes
from app.api.routes import product_photography as product_photography_routes
from app.api.routes import embeddings as embeddings_routes
from app.api.routes import chat as chat_routes
from app.services.ollama_service import ollama_service


# ======================================================
# LOGGING
# ======================================================
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)

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
    """Warm only the models we actually use.

    Cloud providers (groq, gemini) don't need warmup — no local inference.
    Only Ollama (local) needs a warmup call.
    """
    tasks = []

    # ---- TEXT ----
    if settings.LLM_PROVIDER == "ollama":
        text_model = settings.OLLAMA_TEXT_MODEL
        if text_model:
            tasks.append(_warmup_one("text", text_model))
        else:
            WARMUP_STATE["text_model"] = "failed"
            WARMUP_STATE["errors"]["text"] = "OLLAMA_TEXT_MODEL not set"
    else:
        WARMUP_STATE["text_model"] = "skipped"
        logger.info(
            "Text warmup skipped — LLM_PROVIDER=%s (cloud, model=%s)",
            settings.LLM_PROVIDER,
            settings.text_model,
        )

    # ---- VISION ----
    if settings.VISION_PROVIDER == "ollama":
        vision_model = settings.OLLAMA_VISION_MODEL
        if vision_model and vision_model != settings.OLLAMA_TEXT_MODEL:
            tasks.append(_warmup_one("vision", vision_model))
        elif vision_model == settings.OLLAMA_TEXT_MODEL:
            WARMUP_STATE["vision_model"] = "ready"
        else:
            WARMUP_STATE["vision_model"] = "failed"
            WARMUP_STATE["errors"]["vision"] = "OLLAMA_VISION_MODEL not set"
    else:
        WARMUP_STATE["vision_model"] = "skipped"
        logger.info(
            "Vision warmup skipped — VISION_PROVIDER=%s (cloud, model=%s)",
            settings.VISION_PROVIDER,
            settings.vision_model,
        )

    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


# ======================================================
# LIFESPAN
# ======================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)
    logger.info(
        "LLM provider:    %s (model=%s)",
        settings.LLM_PROVIDER,
        settings.text_model,
    )
    logger.info(
        "Vision provider: %s (model=%s)",
        settings.VISION_PROVIDER,
        settings.vision_model,
    )
    logger.info(
        "Image provider:  %s",
        settings.IMAGE_PROVIDER,
    )
    if settings.LLM_PROVIDER == "ollama" or settings.VISION_PROVIDER == "ollama":
        logger.info("Ollama URL:      %s", settings.OLLAMA_URL)

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

# ---- Mount routes ----
app.include_router(health_routes.router)
app.include_router(product_content_routes.router)
app.include_router(product_analyze_routes.router)
app.include_router(product_variants_routes.router)
app.include_router(matching_routes.router)
app.include_router(product_angles_routes.router)
app.include_router(platform_content_routes.router)
app.include_router(product_photography_routes.router)
app.include_router(embeddings_routes.router)
app.include_router(chat_routes.router)


@app.get("/", include_in_schema=False)
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
        "readiness": "/readiness",
    }