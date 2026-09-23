"""
Programmatic image variants — produces 3 views from one upload.
NOT true AI regeneration. Real angles need SDXL/Flux + GPU.

Views:
  1. Front   — cleaned, white bg, centered
  2. Side    — mirrored (perceived opposite side)
  3. Detail  — center crop, zoomed

To upgrade to real AI angles later:
  replace generate_variants() with a call to Replicate/ComfyUI.
"""

import base64
import io
import logging
from typing import List, Dict

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

logger = logging.getLogger(__name__)

OUTPUT_SIZE = 1024
JPEG_QUALITY = 88


def _clean(img: Image.Image) -> Image.Image:
    """Fit to white square canvas, enhance."""
    w, h = img.size
    canvas = Image.new("RGB", (OUTPUT_SIZE, OUTPUT_SIZE), (255, 255, 255))

    # Scale to fit 85% of canvas
    max_side = int(OUTPUT_SIZE * 0.85)
    scale = min(max_side / w, max_side / h)
    new_size = (int(w * scale), int(h * scale))
    img = img.resize(new_size, Image.LANCZOS)

    x = (OUTPUT_SIZE - img.width) // 2
    y = (OUTPUT_SIZE - img.height) // 2
    canvas.paste(img, (x, y))

    canvas = ImageOps.autocontrast(canvas, cutoff=1)
    canvas = ImageEnhance.Color(canvas).enhance(1.05)
    canvas = ImageEnhance.Contrast(canvas).enhance(1.04)
    canvas = canvas.filter(
        ImageFilter.UnsharpMask(radius=1.2, percent=70, threshold=3)
    )
    return canvas


def _to_jpeg_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return buf.getvalue()


def generate_variants(image_bytes: bytes) -> List[Dict]:
    """
    Return 3 variants.
    Each: { label: str, base64: str, mime: str, width: int, height: int }
    """
    try:
        src = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        raise ValueError(f"Could not decode image: {e}") from e

    variants = []

    # ---- View 1: Front ----
    front = _clean(src)
    variants.append({
        "label": "Front",
        "base64": base64.b64encode(_to_jpeg_bytes(front)).decode("ascii"),
        "mime": "image/jpeg",
        "width": OUTPUT_SIZE,
        "height": OUTPUT_SIZE,
    })

    # ---- View 2: Side (mirrored) ----
    mirrored = _clean(ImageOps.mirror(src))
    variants.append({
        "label": "Side",
        "base64": base64.b64encode(_to_jpeg_bytes(mirrored)).decode("ascii"),
        "mime": "image/jpeg",
        "width": OUTPUT_SIZE,
        "height": OUTPUT_SIZE,
    })

    # ---- View 3: Detail (center crop, zoomed) ----
    w, h = src.size
    cw, ch = int(w * 0.6), int(h * 0.6)
    cx, cy = w // 2, h // 2
    detail = src.crop((cx - cw // 2, cy - ch // 2, cx + cw // 2, cy + ch // 2))
    detail = _clean(detail)
    variants.append({
        "label": "Detail",
        "base64": base64.b64encode(_to_jpeg_bytes(detail)).decode("ascii"),
        "mime": "image/jpeg",
        "width": OUTPUT_SIZE,
        "height": OUTPUT_SIZE,
    })

    return variants