# app/schemas/embeddings.py
from typing import List
from pydantic import BaseModel, Field


class EmbedRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, max_length=50)


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dims: int
    provider: str
    model: str
    latency_ms: int