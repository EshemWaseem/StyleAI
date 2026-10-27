# app/api/routes/matching.py
import logging

from fastapi import APIRouter, Depends, HTTPException
from app.api.dependencies import verify_internal_key
from app.schemas.matching import MatchRequest, MatchResponse
from app.services.matching_service import match_influencers

logger = logging.getLogger("styleai.matching.route")

router = APIRouter(
    prefix="/api/v1/match",
    tags=["matching"],
    dependencies=[Depends(verify_internal_key)],
)

@router.post("/influencers", response_model=MatchResponse)
async def match_influencers_endpoint(req: MatchRequest):
    try:
        return await match_influencers(req)
    except Exception as e:
        logger.exception("Matching endpoint failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))