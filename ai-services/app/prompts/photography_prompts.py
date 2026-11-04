BASE_PRESERVATION = (
    "CRITICAL — PRESERVE THE PRODUCT EXACTLY: "
    "Keep the same color, material, texture, pattern, logo, shape and proportions. "
    "Do NOT redesign, recolor, or alter any product detail. "
    "Product must be the visual hero of the frame."
)

SCENE_PROMPTS = {
    "studio": (
        "Clean seamless white studio background. "
        "Soft even studio lighting with gentle drop shadow. "
        "Professional ecommerce product shot."
    ),
    "luxury": (
        "Dark marble surface with warm golden accent reflections. "
        "Dramatic cinematic side-lighting. High-end editorial luxury feel."
    ),
    "lifestyle": (
        "Bright natural home interior, soft neutral linen tones, "
        "warm window daylight. Effortless lifestyle editorial."
    ),
    "outdoor": (
        "Smooth stone surface outdoors, soft morning golden light. "
        "Blurred greenery bokeh in background. Natural airy mood."
    ),
    "street": (
        "Urban sidewalk or concrete surface, moody street lighting, "
        "muted desaturated tones. Modern streetwear editorial."
    ),
    "minimal": (
        "Plain off-white surface, single crisp shadow, extreme negative space. "
        "Ultra-minimal Scandinavian composition."
    ),
    "editorial": (
        "Fashion magazine editorial, strong directional Rembrandt lighting, "
        "elegant dark backdrop. Timeless high-fashion aesthetic."
    ),
    "ecommerce": (
        "Pure white background, soft front fill lighting, "
        "no shadows, no props. Clean listing-ready shot."
    ),
    "social": (
        "Vibrant Instagram flat-lay, bright natural light, "
        "playful props arrangement. Optimized for social media feed."
    ),
}

GARMENT_CLEAN_PROMPT = (
    "Flat-lay product photo on pure white background. "
    "No mannequin, no person, no wrinkles, no props. "
    "Centered, sharp, professional ecommerce style. "
    "Garment must be fully visible and neatly presented."
)


def _brand_block(brand_context) -> str:
    if not brand_context or not str(brand_context).strip():
        return ""
    snippet = str(brand_context).strip()[:500]
    return (
        "\nBRAND VISUAL STYLE (mood and color only — never override product): "
        f"{snippet}\n"
    )


def build_scene_prompt(req) -> str:
    base = SCENE_PROMPTS.get(req.scene, SCENE_PROMPTS["studio"])

    parts = []
    if req.lighting:
        parts.append(f"Lighting: {req.lighting}.")
    if getattr(req, "include_model", False):
        parts.append(
            "Include one model subtly posing — face partially cropped "
            "to keep focus on the product."
        )
    if getattr(req, "aspect_ratio", None):
        parts.append(f"Aspect ratio: {req.aspect_ratio}.")
    if getattr(req, "extra_notes", None):
        parts.append(f"Direction: {str(req.extra_notes)[:200]}")

    extra = (" " + " ".join(parts)) if parts else ""
    brand = _brand_block(getattr(req, "brand_context", None))

    return f"{base}{extra}\n{brand}\n{BASE_PRESERVATION}"


QA_PROMPT = """You are a strict product-image quality inspector.

Compare the ORIGINAL product image (first) with the GENERATED scene (second).
Score each dimension 0–100 (100 = perfect fidelity to original).

Rate:
- product_similarity: overall match with original
- color_accuracy: same colors?
- shape_fidelity: same shape and proportions?
- logo_marking: logo/brand markings preserved?
- texture: same material look?
- artifact_check: AI artifacts, distortion, garbled detail? (100 = none)
- human_anatomy: if person present, anatomy correct? (100 = perfect or no person)

passed: true if product_similarity >= 75 AND artifact_check >= 70 AND color_accuracy >= 80

Return ONLY this JSON:
{
  "passed": <bool>,
  "overall": <0-100>,
  "checks": [
    {"label":"Product similarity","value":<0-100>},
    {"label":"Colour accuracy","value":<0-100>},
    {"label":"Shape fidelity","value":<0-100>},
    {"label":"Logo & markings","value":<0-100>},
    {"label":"Texture","value":<0-100>},
    {"label":"Artifact check","value":<0-100>},
    {"label":"Human anatomy","value":<0-100>}
  ],
  "feedback": "<one short sentence>"
}"""