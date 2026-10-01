# app/api/routes/chat.py
# ======================================================
# POST /api/v1/chat/text — raw text completion (no JSON)
# ======================================================

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.dependencies import verify_internal_key
from app.config import settings
from app.services.ollama_service import ollama_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/chat",
    tags=["chat"],
    dependencies=[Depends(verify_internal_key)],
)


class TextRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=20000)
    temperature: float = 0.5
    num_predict: int = 800


class TextResponse(BaseModel):
    text: str
    provider: str
    model: str


@router.post("/text", response_model=TextResponse)
async def chat_text(req: TextRequest):
    try:
        text = await ollama_service.generate_text(
            prompt=req.prompt,
            temperature=req.temperature,
            num_predict=req.num_predict,
        )
        return TextResponse(
            text=text,
            provider="ollama",
            model=settings.OLLAMA_TEXT_MODEL,
        )
    except Exception as e:
        logger.exception("Chat text failed")
        raise HTTPException(status_code=500, detail=str(e))