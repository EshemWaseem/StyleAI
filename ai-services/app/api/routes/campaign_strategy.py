# ai-services/app/api/routes/campaign_strategy.py
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.api.dependencies import verify_internal_key
from app.services.llm_service import llm_service # Assume this exists in your project

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/api/v1/campaign",
    tags=["campaign"],
    dependencies=[Depends(verify_internal_key)],
)

class StrategyRequest(BaseModel):
    product_name: str
    category: Optional[str] = "fashion"
    price: Optional[float] = 0.0

class StrategyResponse(BaseModel):
    target_audience: str
    suggested_budget: str
    campaign_objective: str
    ad_headline: str
    ad_copy: str
    ai_insight: str

@router.post("/strategy", response_model=StrategyResponse)
async def generate_strategy(req: StrategyRequest):
    prompt = f"""
    You are an expert marketing strategist. Analyze this product and provide a campaign strategy.
    Product: {req.product_name}
    Category: {req.category}
    Price: ${req.price}
    
    Respond strictly in JSON format with these keys:
    - target_audience: (e.g., "Mothers aged 28-45 with high purchasing power")
    - suggested_budget: (e.g., "20.00")
    - campaign_objective: (e.g., "OUTCOME_SALES")
    - ad_headline: (Short, punchy headline)
    - ad_copy: (Engaging primary text, max 2 sentences)
    - ai_insight: (Brief explanation of why this strategy was chosen)
    """
    try:
        response = await llm_service.generate_json(prompt=prompt, temperature=0.7)
        return StrategyResponse(**response)
    except Exception as e:
        logger.error(f"Strategy generation failed: {e}")
        # Fallback strategy if AI fails
        return StrategyResponse(
            target_audience="General audience",
            suggested_budget="10.00",
            campaign_objective="OUTCOME_TRAFFIC",
            ad_headline="Discover our new collection",
            ad_copy=f"Check out our latest {req.product_name}.",
            ai_insight="Fallback strategy generated."
        )