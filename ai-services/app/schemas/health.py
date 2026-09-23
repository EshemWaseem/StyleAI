"""
Health check response schemas.
"""

from typing import Any, Dict

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(..., example="ok")
    service: str = Field(..., example="StyleAI AI Service")
    version: str = Field(..., example="0.2.0")


class ReadinessResponse(BaseModel):
    status: str = Field(..., example="ok")
    checks: Dict[str, Any] = Field(...)




# """
# Health check response schemas.
# """

# from pydantic import BaseModel, Field


# class HealthResponse(BaseModel):
#     """Basic health response — is the service alive?"""

#     status: str = Field(..., example="ok")
#     service: str = Field(..., example="StyleAI AI Service")
#     version: str = Field(..., example="0.1.0")


# class ReadinessResponse(BaseModel):
#     """Readiness — is the service ready to serve traffic?"""

#     status: str = Field(..., example="ok")
#     checks: dict = Field(
#         ...,
#         example={
#             "config_loaded": True,
#             "provider": "ollama",
#         },
#     )