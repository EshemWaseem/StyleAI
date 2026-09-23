"""
Shared API dependencies.

Every request from Node.js backend must include X-Internal-Key header.
This prevents direct browser access to the AI service.
"""

from fastapi import Header, HTTPException, status

from app.config import settings


async def verify_internal_key(
    x_internal_key: str = Header(..., alias="X-Internal-Key"),
) -> None:
    """
    Verify request came from our Node backend.

    Raises:
        HTTPException 403 if key is missing or invalid.
    """
    if x_internal_key != settings.INTERNAL_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing internal key",
        )