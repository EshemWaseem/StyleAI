# app/schemas/image_angles.py
# ======================================================
# Schemas for AI product image angle generation
# ======================================================

from typing import List
from pydantic import BaseModel, Field


class AngleVariant(BaseModel):
    label: str                        # "Side view"
    key: str                          # "side" — stable identifier
    mime: str = "image/png"
    base64: str = ""                  # image payload
    width: int = 0
    height: int = 0


class AngleGenerationMeta(BaseModel):
    provider: str                     # "gemini"
    model: str                        # "gemini-2.5-flash-image"
    latency_ms: int
    count: int
    preserved_features: List[str] = Field(default_factory=list)
    fallback_used: bool = False