# app/schemas/platform_content.py
# ======================================================
# Schemas for per-platform content generation
# ======================================================

from typing import List, Optional, Literal
from pydantic import BaseModel, Field


Platform = Literal["instagram", "tiktok", "youtube", "blog"]


class PlatformContentRequest(BaseModel):
    platform: Platform
    product_name: str
    category: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    material: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = "USD"
    brand_name: Optional[str] = None
    brand_voice: Optional[str] = "minimal"
    tone: Optional[str] = "confident"
    extra_notes: Optional[str] = None
    # NEW — Sprint 26
    brand_context: Optional[str] = None


class InstagramContent(BaseModel):
    caption: str
    hashtags: List[str] = Field(default_factory=list)
    cta: str
    story_script: str
    reel_script: str


class TikTokContent(BaseModel):
    hook: str
    scenes: List[str] = Field(default_factory=list)
    voiceover: str
    cta: str
    hashtags: List[str] = Field(default_factory=list)


class YouTubeContent(BaseModel):
    title: str
    description: str
    script: str
    shorts_script: str
    tags: List[str] = Field(default_factory=list)


class BlogContent(BaseModel):
    seo_title: str
    meta_description: str
    article: str
    faq: List[dict] = Field(default_factory=list)


class PlatformContentResponse(BaseModel):
    platform: str
    content: dict
    provider: str
    model: str
    latency_ms: int
    retried: bool = False