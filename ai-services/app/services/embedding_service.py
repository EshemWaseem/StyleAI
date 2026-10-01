# app/services/embedding_service.py
# ======================================================
# Text embeddings via Gemini (gemini-embedding-001, 768 dims)
# ======================================================

import logging
import time
from typing import List

from google import genai
from google.genai import types
from google.genai.errors import ServerError

from app.config import settings

logger = logging.getLogger("styleai.embeddings")

EMBED_MODEL = "gemini-embedding-001"
EMBED_DIMS = 768


class EmbeddingService:
    def __init__(self) -> None:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set")
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        logger.info("EmbeddingService initialized. Model: %s", EMBED_MODEL)

    async def embed(self, texts: List[str]) -> tuple[List[List[float]], int]:
        start = time.time()
        try:
            response = await self.client.aio.models.embed_content(
                model=EMBED_MODEL,
                contents=texts,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_DOCUMENT",
                    output_dimensionality=EMBED_DIMS,
                ),
            )
            embeddings = [e.values for e in response.embeddings]
            latency = int((time.time() - start) * 1000)
            logger.info("Embedded %d texts in %dms", len(texts), latency)
            return embeddings, latency
        except ServerError as e:
            logger.error("Embedding server error: %s", e)
            raise ValueError(f"Embedding unavailable: {e}") from e
        except Exception as e:
            logger.error("Embedding failed: %s", e)
            raise ValueError(f"Embedding failed: {e}") from e


_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    global _service
    if _service is None:
        _service = EmbeddingService()
    return _service