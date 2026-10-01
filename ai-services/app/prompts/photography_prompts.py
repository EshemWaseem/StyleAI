# app/prompts/photography_prompts.py
# ======================================================
# Scene prompts + QA prompt for product photography
# Sprint 26: brand_context optional block (visual style only)
# ======================================================

BASE_PRESERVATION = """CRITICAL — PRESERVE THE PRODUCT EXACTLY:
- Keep the same color, material, texture, pattern, logo, brand markings, shape, proportions.
- Do NOT redesign, recolor, or add/remove any product feature.
- Do NOT add or remove accessories not in the original.
- Product must be the visual hero of the frame."""


SCENE_PROMPTS = {
    "studio": (
        "Place the product on a clean, seamless white studio background. "
        "Soft, even studio lighting with gentle shadows. "
        "Professional e-commerce product shot."
    ),
    "luxury": (
        "Place the product on a dark marble surface with warm golden accents. "
        "Dramatic side-lighting creating soft highlights on the product. "
        "Cinematic, editorial luxury feel."
    ),
    "lifestyle": (
        "Place the product in a bright, natural home interior — soft neutral tones, "
        "linen textures, warm daylight. Effortless lifestyle editorial."
    ),
    "outdoor": (
        "Place the product on a smooth stone surface outdoors with soft morning light. "
        "Blurred greenery in the background. Natural, airy mood."
    ),
    "street": (
        "Place the product on an urban sidewalk or concrete surface. "
        "Moody street lighting, muted tones. Modern streetwear editorial."
    ),
    "minimal": (
        "Place the product on a plain beige or off-white surface with a single shadow. "
        "Extremely minimal composition, negative space around the product."
    ),
    "editorial": (
        "Place the product in a fashion magazine editorial scene — "
        "artistic composition, strong directional light, elegant backdrop. "
        "Timeless, high-fashion feel."
    ),
    "ecommerce": (
        "Place the product on a pure white background with soft front lighting. "
        "Sharp, clean, ready for a product listing."
    ),
    "social": (
        "Place the product in a vibrant, Instagram-friendly flat-lay or styled scene. "
        "Bright colors, playful composition. Optimized for social media feed."
    ),
}


def _brand_style_block(brand_context: str | None) -> str:
    """
    Extract a short visual-style note from brand context.
    Only aesthetic guidance — must NOT override product preservation.
    """
    if not brand_context or not str(brand_context).strip():
        return ""
    snippet = str(brand_context).strip()[:600]
    return (
        "\nBRAND VISUAL STYLE (apply to mood, colors, and composition "
        "— but NEVER override product preservation):\n"
        f"{snippet}\n"
    )


def build_scene_prompt(req) -> str:
    base = SCENE_PROMPTS.get(req.scene, SCENE_PROMPTS["studio"])

    extra = []
    if req.lighting:
        extra.append(f"Lighting: {req.lighting}.")
    if req.include_model:
        extra.append(
            "Include a single model subtly posing with the product — "
            "face partially cropped or turned away to keep focus on the product."
        )
    if req.aspect_ratio:
        extra.append(f"Aspect ratio: {req.aspect_ratio}.")
    if req.extra_notes:
        extra.append(f"Additional direction: {req.extra_notes[:200]}")

    extra_block = ("\n" + " ".join(extra)) if extra else ""

    brand_block = _brand_style_block(getattr(req, "brand_context", None))

    return f"{base}{extra_block}\n{brand_block}\n{BASE_PRESERVATION}"


# ------------------------------------------------------
# QA prompt (unchanged)
# ------------------------------------------------------
QA_PROMPT = """You are a strict product-image quality inspector.

Compare the ORIGINAL product image (first) with the GENERATED scene (second).
Score each dimension 0-100 where 100 = perfect fidelity to the original.

Rate:
- product_similarity: overall how much the generated product matches the original
- color_accuracy: same colors?
- shape_fidelity: same shape and proportions?
- logo_marking: logo/brand markings preserved?
- texture: same material look?
- artifact_check: any visible AI artifacts, distortion, or garbled detail? (100 = none)
- human_anatomy: if a person is present, is anatomy correct? (100 = perfect or no person)

Then decide:
- passed: true if product_similarity >= 75 AND artifact_check >= 70 AND color_accuracy >= 80
- feedback: ONE short sentence explaining the verdict.

Return ONLY this JSON:
{
  "passed": <bool>,
  "overall": <0-100 average>,
  "checks": [
    {"label":"Product similarity","value":<0-100>},
    {"label":"Colour accuracy","value":<0-100>},
    {"label":"Shape fidelity","value":<0-100>},
    {"label":"Logo & markings","value":<0-100>},
    {"label":"Texture","value":<0-100>},
    {"label":"Artifact check","value":<0-100>},
    {"label":"Human anatomy","value":<0-100>}
  ],
  "feedback": "<short sentence>"
}"""