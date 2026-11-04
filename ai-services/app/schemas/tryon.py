from pydantic import BaseModel
from typing import Optional

class TryOnRequest(BaseModel):
    person_image_base64: str
    garment_image_url: str
    garment_description: str = ""
    steps: int = 30
    seed: int = 42

class TryOnResponse(BaseModel):
    success: bool
    result_image_base64: Optional[str] = None
    error: Optional[str] = None
    processing_time_seconds: Optional[float] = None