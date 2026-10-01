# app/schemas/matching.py
# ======================================================
# Pydantic schemas for product → influencer matching
# ======================================================

from typing import List, Optional

from pydantic import BaseModel, Field


# ------------------------------------------------------
# INPUT — influencer brief sent from Node.js
# ------------------------------------------------------
class InfluencerBrief(BaseModel):
    id: str
    display_name: str
    username: str
    categories: List[str] = Field(default_factory=list)
    follower_count: int = 0
    engagement_rate: float = 0.0
    country: Optional[str] = None
    price_per_post: Optional[float] = None
    currency: str = "USD"

    # AI scores (0.0–1.0)
    fashion_score: Optional[float] = None
    luxury_score: Optional[float] = None
    beauty_score: Optional[float] = None
    lifestyle_score: Optional[float] = None


# ------------------------------------------------------
# INPUT — product brief sent from Node.js
# ------------------------------------------------------
class ProductBrief(BaseModel):
    id: str
    name: str
    sku: str
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    gender: Optional[str] = None
    season: Optional[str] = None
    occasion: Optional[str] = None
    brand_name: Optional[str] = None


# ------------------------------------------------------
# REQUEST
# ------------------------------------------------------
class MatchRequest(BaseModel):
    product: ProductBrief
    candidates: List[InfluencerBrief] = Field(..., min_length=1, max_length=50)


# ------------------------------------------------------
# OUTPUT — one scored influencer
# ------------------------------------------------------
class MatchResultItem(BaseModel):
    influencer_id: str

    # Total (weighted) score 0-100
    score: float = Field(..., ge=0, le=100)

    # Per-dimension subscores 0-100
    category_score: float = Field(..., ge=0, le=100)
    niche_score: float = Field(..., ge=0, le=100)
    engagement_score: float = Field(..., ge=0, le=100)
    audience_score: float = Field(..., ge=0, le=100)
    price_score: float = Field(..., ge=0, le=100)

    # Human-readable reasons — max 6 short phrases
    reasons: List[str] = Field(default_factory=list, max_length=6)

    # One-line verdict, e.g. "Strong luxury alignment."
    verdict: str = ""


# ------------------------------------------------------
# RESPONSE — full payload back to Node.js
# ------------------------------------------------------
class MatchResponse(BaseModel):
    results: List[MatchResultItem]

    # Where the scoring came from
    provider: str                # "ollama" | "heuristic" | "heuristic-local"
    model: str                   # "qwen2.5:7b" | "rule_based_v1" | etc.

    # How long the match took (server-side)
    latency_ms: int

    # True if we had to fall back to heuristic scoring
    fallback_used: bool = False