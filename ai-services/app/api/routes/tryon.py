from fastapi import APIRouter
from app.schemas.tryon import TryOnRequest, TryOnResponse
from app.services.tryon_service import run_virtual_tryon

router = APIRouter(prefix="/tryon", tags=["Virtual Try-On"])

@router.post("/generate", response_model=TryOnResponse)
async def generate_tryon(req: TryOnRequest) -> TryOnResponse:
    result = await run_virtual_tryon(
        person_image_base64=req.person_image_base64,
        garment_image_url=req.garment_image_url,
        garment_description=req.garment_description,
        steps=req.steps,
        seed=req.seed,
    )
    return TryOnResponse(**result)