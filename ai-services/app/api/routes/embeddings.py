# app/api/routes/embeddings.py
import logging
from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import verify_internal_key
from app.schemas.embeddings import EmbedRequest, EmbedResponse
from app.services.embedding_service import get_embedding_service, EMBED_MODEL, EMBED_DIMS

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/embeddings",
    tags=["embeddings"],
    dependencies=[Depends(verify_internal_key)],
)


@router.post("/embed", response_model=EmbedResponse)
async def embed_texts(req: EmbedRequest):
    try:
        svc = get_embedding_service()
        embeddings, latency = await svc.embed(req.texts)
        return EmbedResponse(
            embeddings=embeddings,
            dims=EMBED_DIMS,
            provider="gemini",
            model=EMBED_MODEL,
            latency_ms=latency,
        )
    except Exception as e:
        logger.exception("Embedding failed")
        raise HTTPException(status_code=500, detail=str(e))