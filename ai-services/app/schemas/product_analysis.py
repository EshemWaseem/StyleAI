"""
Schemas for vision-based product analysis.
"""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class GenderEnum(str, Enum):
    MALE = "Male"
    FEMALE = "Female"
    UNISEX = "Unisex"
    UNKNOWN = "Unknown"


class CategoryEnum(str, Enum):
    CLOTHING = "Clothing"
    FOOTWEAR = "Footwear"
    ACCESSORIES = "Accessories"
    BAGS = "Bags"
    OUTERWEAR = "Outerwear"


class ProductAnalysis(BaseModel):
    target_gender: GenderEnum = GenderEnum.UNKNOWN
    category: Optional[CategoryEnum] = None
    product_type: Optional[str] = None
    color: Optional[str] = None
    secondary_colors: List[str] = Field(default_factory=list)
    pattern: Optional[str] = None
    material: Optional[str] = None
    style: Optional[str] = None
    attributes: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    uncertain_fields: List[str] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    success: bool = True
    data: ProductAnalysis
    meta: Dict[str, Any] = Field(default_factory=dict)


class ErrorDetail(BaseModel):
    code: str
    message: str
    recoverable: bool = True


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail