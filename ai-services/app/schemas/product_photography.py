# app/schemas/product_photography.py
# ======================================================
# Schemas for AI product photography (scene generation + QA)
# ======================================================

from typing import List, Optional, Literal
from pydantic import BaseModel, Field


SceneMode = Literal[
    "studio", "luxury", "lifestyle", "outdoor", "street",
    "minimal", "editorial", "ecommerce", "social",
]


class PhotographyRequest(BaseModel):
    scene: SceneMode
    lighting: Optional[str] = "soft daylight"
    include_model: Optional[bool] = False
    aspect_ratio: Optional[str] = "4:5"
    extra_notes: Optional[str] = None
    # NEW — Sprint 26
    brand_context: Optional[str] = None


class GeneratedScene(BaseModel):
    scene: str
    mime: str = "image/png"
    base64: str = ""
    width: int = 0
    height: int = 0


class QACheck(BaseModel):
    label: str
    value: float = Field(..., ge=0, le=100)


class QualityReport(BaseModel):
    passed: bool
    overall: float = Field(..., ge=0, le=100)
    checks: List[QACheck] = Field(default_factory=list)
    feedback: str = ""


class PhotographyResponse(BaseModel):
    scene: str
    variant: GeneratedScene
    quality: QualityReport
    provider: str
    model: str
    latency_ms: int
    regenerated: bool = False