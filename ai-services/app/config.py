# config.py
"""
Application configuration.

Loads from .env via pydantic-settings. All values can be overridden
by editing ai-services/.env — no code change needed.
"""

from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ---------- Server ----------
    APP_NAME: str = "StyleAI AI Service"
    APP_VERSION: str = "0.3.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # ---------- Security ----------
    # Must match AI_INTERNAL_KEY in backend/.env
    INTERNAL_KEY: str = "dev-internal-key-change-me"

    # ---------- Limits ----------
    AI_REQUEST_TIMEOUT: int = 900
    MAX_IMAGE_SIZE_MB: int = 5

    # ---------- Image enhancement (future) ----------
    ENHANCE_OUTPUT_DIR: str = "storage/enhanced"
    ENHANCE_OUTPUT_SIZE: int = 1024

    # ==================================================
    # VISION PROVIDER — ollama | gemini | groq
    # ==================================================
    VISION_PROVIDER: str = "gemini"

    # ---------- Ollama (local) ----------
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_TEXT_MODEL: str = "qwen2.5:7b"
    OLLAMA_VISION_MODEL: str = "qwen2.5:7b"

    # ---------- Gemini (cloud) ----------
    GEMINI_API_KEY: str = ""
    GEMINI_VISION_MODEL: str = "gemini-flash-latest"
    GEMINI_FALLBACK_MODELS: str = ""
    GEMINI_IMAGE_MODEL: str = "gemini-2.5-flash-image"
    GEMINI_IMAGE_FALLBACK_MODELS: str = ""

    # ---------- Groq (cloud) ----------
    GROQ_API_KEY: str = ""
    GROQ_VISION_MODEL: str = ""
    GROQ_FALLBACK_MODELS: str = ""

    # ==================================================
    # IMAGE GENERATION PROVIDER — hf | gemini
    # ==================================================
    # "hf"     → Hugging Face Inference API (free, cloud, no local model)
    # "gemini" → Gemini Image (paid only, ignores free tier)
    IMAGE_PROVIDER: str = "hf"

    # ---------- Hugging Face (free image generation) ----------
    HF_API_TOKEN: str = ""
    HF_IMAGE_MODEL: str = "black-forest-labs/FLUX.1-schnell"
    HF_IMAGE_TIMEOUT: int = 120

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---------- Helpers ----------
    @property
    def gemini_fallbacks(self) -> List[str]:
        return [m.strip() for m in self.GEMINI_FALLBACK_MODELS.split(",") if m.strip()]

    @property
    def groq_fallbacks(self) -> List[str]:
        return [m.strip() for m in self.GROQ_FALLBACK_MODELS.split(",") if m.strip()]

    @property
    def gemini_image_fallbacks(self) -> List[str]:
        return [m.strip() for m in self.GEMINI_IMAGE_FALLBACK_MODELS.split(",") if m.strip()]


settings = Settings()