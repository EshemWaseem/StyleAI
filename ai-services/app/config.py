# config.py
"""
Application configuration.
Loads from .env via pydantic-settings.
"""

from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ---------- Server ----------
    APP_NAME: str = "StyleAI AI Service"
    APP_VERSION: str = "0.4.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # ---------- Security ----------
    INTERNAL_KEY: str = "dev-internal-key-change-me"

    # ---------- Limits ----------
    AI_REQUEST_TIMEOUT: int = 900
    MAX_IMAGE_SIZE_MB: int = 5

    # ---------- Image enhancement ----------
    ENHANCE_OUTPUT_DIR: str = "storage/enhanced"
    ENHANCE_OUTPUT_SIZE: int = 1024

    # ==================================================
    # TEXT / LLM PROVIDER — groq | gemini | ollama
    # ==================================================
    LLM_PROVIDER: str = "groq"

    # ---------- Groq (text + optional vision) ----------
    GROQ_API_KEY: str = ""
    GROQ_TEXT_MODEL: str = "openai/gpt-oss-120b"
    GROQ_TEXT_FALLBACK_MODELS: str = "openai/gpt-oss-20b"
    GROQ_VISION_MODEL: str = "qwen/qwen3.8-27b"
    GROQ_FALLBACK_MODELS: str = "openai/gpt-oss-20b"

    # ==================================================
    # VISION PROVIDER — gemini | groq | ollama
    # ==================================================
    VISION_PROVIDER: str = "gemini"

    # ---------- Gemini (vision + embeddings + text) ----------
    GEMINI_API_KEY: str = ""
    GEMINI_TEXT_MODEL: str = "gemini-flash-latest"
    GEMINI_VISION_MODEL: str = "gemini-flash-latest"
    GEMINI_FALLBACK_MODELS: str = "gemini-flash-lite-latest"
    GEMINI_IMAGE_MODEL: str = "gemini-2.5-flash-image"
    GEMINI_IMAGE_FALLBACK_MODELS: str = "gemini-2.0-flash-exp-image-generation"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"

    # ==================================================
    # OLLAMA (legacy — used only if LLM_PROVIDER=ollama)
    # ==================================================
    OLLAMA_URL: str = "http://host.docker.internal:11434"
    OLLAMA_TEXT_MODEL: str = "qwen2.5:7b"
    OLLAMA_VISION_MODEL: str = "qwen2.5:7b"

    # ==================================================
    # IMAGE GENERATION — hf | gemini
    # ==================================================
    IMAGE_PROVIDER: str = "hf"

    # ---------- Hugging Face ----------
    HF_API_TOKEN: str = ""
    HF_IMAGE_MODEL: str = "black-forest-labs/FLUX.1-Kontext-dev"
    HF_IMAGE_TIMEOUT: int = 120

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ==================================================
    # RESOLVERS — pick correct model for the active provider
    # ==================================================
    @property
    def text_model(self) -> str:
        provider = (self.LLM_PROVIDER or "groq").lower()
        if provider == "groq":
            return self.GROQ_TEXT_MODEL or "openai/gpt-oss-120b"
        if provider == "gemini":
            return self.GEMINI_TEXT_MODEL or "gemini-flash-latest"
        return self.OLLAMA_TEXT_MODEL

    @property
    def vision_model(self) -> str:
        provider = (self.VISION_PROVIDER or "gemini").lower()
        if provider == "gemini":
            return self.GEMINI_VISION_MODEL or "gemini-flash-latest"
        if provider == "groq":
            return self.GROQ_VISION_MODEL or "qwen/qwen3.8-27b"
        return self.OLLAMA_VISION_MODEL

    # ==================================================
    # FALLBACK LISTS
    # ==================================================
    @property
    def gemini_fallbacks(self) -> List[str]:
        return [m.strip() for m in self.GEMINI_FALLBACK_MODELS.split(",") if m.strip()]

    @property
    def groq_fallbacks(self) -> List[str]:
        return [m.strip() for m in self.GROQ_FALLBACK_MODELS.split(",") if m.strip()]

    @property
    def groq_text_fallbacks(self) -> List[str]:
        return [m.strip() for m in self.GROQ_TEXT_FALLBACK_MODELS.split(",") if m.strip()]

    @property
    def gemini_image_fallbacks(self) -> List[str]:
        return [m.strip() for m in self.GEMINI_IMAGE_FALLBACK_MODELS.split(",") if m.strip()]


settings = Settings()