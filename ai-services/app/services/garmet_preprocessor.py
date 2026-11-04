import io
import logging

from PIL import Image
from rembg import remove, new_session

logger = logging.getLogger("styleai.garment_preprocessor")

_SESSION = None


def _get_session():
    global _SESSION
    if _SESSION is None:
        _SESSION = new_session("u2net")
    return _SESSION


def preprocess_garment(image_bytes: bytes) -> bytes:
    """
    Rough garment image ko clean karo:
    1. Background remove (rembg - free, local)
    2. White background par paste
    3. 768x1024 resize (IDM-VTON optimal size)
    4. JPEG output
    """
    try:
        logger.info("Removing background from garment image...")
        session = _get_session()
        removed = remove(image_bytes, session=session)

        garment_rgba = Image.open(io.BytesIO(removed)).convert("RGBA")

        white_bg = Image.new("RGBA", garment_rgba.size, (255, 255, 255, 255))
        white_bg.paste(garment_rgba, mask=garment_rgba.split()[3])

        result_rgb = white_bg.convert("RGB")

        target_w, target_h = 768, 1024
        orig_w, orig_h = result_rgb.size
        ratio = min(target_w / orig_w, target_h / orig_h)
        new_w = int(orig_w * ratio)
        new_h = int(orig_h * ratio)
        resized = result_rgb.resize((new_w, new_h), Image.LANCZOS)

        final = Image.new("RGB", (target_w, target_h), (255, 255, 255))
        paste_x = (target_w - new_w) // 2
        paste_y = (target_h - new_h) // 2
        final.paste(resized, (paste_x, paste_y))

        out = io.BytesIO()
        final.save(out, format="JPEG", quality=95)
        logger.info("Garment preprocessing complete: %dx%d", target_w, target_h)
        return out.getvalue()

    except Exception as exc:
        logger.warning("Garment preprocessing failed (%s) — using original image", exc)
        return image_bytes


def person_normalize(image_bytes: bytes) -> bytes:
    """
    Person photo ko bhi normalize karo:
    1. 768x1024 crop/resize
    2. Quality normalize
    """
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        target_w, target_h = 768, 1024
        orig_w, orig_h = img.size

        scale = max(target_w / orig_w, target_h / orig_h)
        new_w = int(orig_w * scale)
        new_h = int(orig_h * scale)
        img = img.resize((new_w, new_h), Image.LANCZOS)

        left = (new_w - target_w) // 2
        top = (new_h - target_h) // 2
        img = img.crop((left, top, left + target_w, top + target_h))

        out = io.BytesIO()
        img.save(out, format="JPEG", quality=92)
        return out.getvalue()

    except Exception as exc:
        logger.warning("Person normalization failed (%s) — using original", exc)
        return image_bytes