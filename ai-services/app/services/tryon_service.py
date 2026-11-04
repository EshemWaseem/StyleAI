import asyncio
import base64
import os
import tempfile
import time
import httpx
from gradio_client import Client, handle_file

HF_SPACE = "yisol/IDM-VTON"

async def _download_to_temp(url: str, suffix: str = ".jpg") -> str:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    tmp.write(resp.content)
    tmp.close()
    return tmp.name

def _cleanup(*paths: str) -> None:
    for p in paths:
        if p and os.path.exists(p):
            try:
                os.unlink(p)
            except Exception:
                pass

def _call_hf_space(person_path: str, garment_path: str, description: str, steps: int, seed: int) -> str:
    client = Client(HF_SPACE)
    result = client.predict(
        dict={
            "background": handle_file(person_path),
            "layers": [],
            "composite": None,
        },
        garm_img=handle_file(garment_path),
        garment_des=description,
        is_checked=True,
        is_checked_crop=False,
        denoise_steps=steps,
        seed=seed,
        api_name="/tryon",
    )
    return result[0]

async def run_virtual_tryon(
    person_image_base64: str,
    garment_image_url: str,
    garment_description: str = "",
    steps: int = 30,
    seed: int = 42,
) -> dict:
    start = time.time()
    person_path = None
    garment_path = None

    try:
        person_bytes = base64.b64decode(person_image_base64)
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as pf:
            pf.write(person_bytes)
            person_path = pf.name

        garment_path = await _download_to_temp(garment_image_url)

        loop = asyncio.get_event_loop()
        output_path = await loop.run_in_executor(
            None,
            _call_hf_space,
            person_path,
            garment_path,
            garment_description,
            steps,
            seed,
        )

        with open(output_path, "rb") as f:
            result_b64 = base64.b64encode(f.read()).decode("utf-8")

        return {
            "success": True,
            "result_image_base64": result_b64,
            "processing_time_seconds": round(time.time() - start, 2),
        }

    except Exception as exc:
        return {
            "success": False,
            "error": str(exc),
            "processing_time_seconds": round(time.time() - start, 2),
        }

    finally:
        _cleanup(person_path, garment_path)