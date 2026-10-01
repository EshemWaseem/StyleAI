# app/prompts/image_angle_prompts.py
# ======================================================
# Prompts for Gemini 2.5 Flash Image — product angle generation
# CRITICAL: preserve the product EXACTLY. Only change camera angle.
# ======================================================

BASE_PRESERVATION_RULE = """CRITICAL — PRESERVE THE PRODUCT EXACTLY:
- Keep the same color, material, texture, pattern, stitching, logo, and brand markings.
- Keep the same shape, proportions, and size.
- Do NOT redesign, recolor, or add/remove any features.
- Do NOT add or remove accessories not in the original.
- Keep background and lighting style consistent with the original.
- Only change the CAMERA ANGLE / viewing perspective.
- Output a clean, professional e-commerce product photo."""


ANGLES = [
    {
        "key": "side",
        "label": "Side view",
        "prompt": (
            "Show the product from the SIDE at 90 degrees. "
            "Same product, same lighting, clean white background.\n\n"
            + BASE_PRESERVATION_RULE
        ),
    },
    {
        "key": "three_quarter",
        "label": "3/4 angle",
        "prompt": (
            "Show the product from a 3/4 perspective (about 45 degrees rotated). "
            "Same product, same lighting, clean white background.\n\n"
            + BASE_PRESERVATION_RULE
        ),
    },
    {
        "key": "detail",
        "label": "Detail close-up",
        "prompt": (
            "Show a CLOSE-UP DETAIL of the product — focus on fabric texture, "
            "stitching, hardware, or material finish. Same product, zoomed in.\n\n"
            + BASE_PRESERVATION_RULE
        ),
    },
    {
        "key": "back",
        "label": "Back view",
        "prompt": (
            "Show the product from the BACK (180 degrees). "
            "Same product, same lighting, clean white background.\n\n"
            + BASE_PRESERVATION_RULE
        ),
    },
    {
        "key": "flat_lay",
        "label": "Flat lay",
        "prompt": (
            "Show the product laid flat on a neutral white surface, "
            "photographed from directly above. Same product details.\n\n"
            + BASE_PRESERVATION_RULE
        ),
    },
]

DEFAULT_KEYS = ["side", "three_quarter", "detail"]


def get_angles_by_keys(keys: list[str] | None) -> list[dict]:
    """Return angle definitions for requested keys. Default = side + 3/4 + detail."""
    if not keys:
        keys = DEFAULT_KEYS
    out = []
    for k in keys:
        match = next((a for a in ANGLES if a["key"] == k), None)
        if match:
            out.append(match)
    return out or [a for a in ANGLES if a["key"] in DEFAULT_KEYS]