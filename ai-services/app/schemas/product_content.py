# app/schemas/product_content.py
"""
Schemas for AI product content.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class ProductContentRequest(BaseModel):
    category: Optional[str] = None
    product_type: Optional[str] = None
    color: Optional[str] = None
    material: Optional[str] = None
    target_gender: Optional[str] = None
    pattern: Optional[str] = None
    style: Optional[str] = None
    attributes: Dict[str, Any] = Field(default_factory=dict)
    brand_name: Optional[str] = None
    brand_voice: Optional[str] = "minimal"
    currency: Optional[str] = "USD"
    # NEW — Sprint 26: brand knowledge base context for prompt injection
    brand_context: Optional[str] = None


class ProductContent(BaseModel):
    product_name: str = Field(..., min_length=2, max_length=120)
    short_description: str = Field(..., min_length=10, max_length=300)
    description: str = Field(..., min_length=40)
    tags: List[str] = Field(default_factory=list)
    seo_title: str = Field(..., min_length=5, max_length=60)
    seo_description: str = Field(..., min_length=20, max_length=160)

    # ---- Price prediction ----
    suggested_price: Optional[float] = Field(default=None, ge=0)
    price_currency: Optional[str] = Field(default="USD", max_length=3)
    price_confidence: Optional[float] = Field(default=0.0, ge=0.0, le=1.0)
    price_reasoning: Optional[str] = Field(default=None, max_length=300)

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, v: List[str]) -> List[str]:
        seen, out = set(), []
        for tag in v:
            t = str(tag).strip().lower()
            if t and t not in seen:
                seen.add(t)
                out.append(t)
        return out[:10]


class ContentResponse(BaseModel):
    success: bool = True
    data: ProductContent
    meta: Dict[str, Any] = Field(default_factory=dict)


class ErrorDetail(BaseModel):
    code: str
    message: str
    recoverable: bool = True


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail