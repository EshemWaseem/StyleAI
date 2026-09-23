"""
Image preprocessing for AI analysis.
Resize to max 1024px on the longest side, re-encode as JPEG.
Reduces vision inference time 3-5x on CPU.
"""

import io
import logging

from PIL import Image

logger = logging.getLogger(__name__)

MAX_SIDE = 1024
JPEG_QUALITY = 85


def preprocess_image(image_bytes: bytes) -> bytes:
    """
    Downscale and re-encode image for faster vision inference.
    Returns JPEG bytes. Raises ValueError on bad input.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        raise ValueError(f"Could not decode image: {e}") from e

    if img.mode in ("RGBA", "LA", "P"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        img = img.convert("RGBA")
        background.paste(img, mask=img.split()[-1])
        img = background
    else:
        img = img.convert("RGB")

    w, h = img.size
    longest = max(w, h)
    if longest > MAX_SIDE:
        scale = MAX_SIDE / longest
        new_size = (int(w * scale), int(h * scale))
        img = img.resize(new_size, Image.LANCZOS)
        logger.info("Resized image %sx%s -> %s", w, h, new_size)

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return out.getvalue()