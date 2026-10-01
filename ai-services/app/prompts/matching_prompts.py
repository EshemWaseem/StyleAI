# app/prompts/matching_prompts.py
# ======================================================
# Prompts for product → influencer matching
# Kept deliberately SHORT — qwen2.5:7b performs better
# with fewer instructions and a real example.
# ======================================================

import json


SYSTEM_PROMPT = """You score fashion influencer fit for a product.

Return ONLY a JSON object with a "results" array. One entry per candidate.
No prose, no markdown, no explanations.

Each entry MUST have exactly these keys:
influencer_id, score, category_score, niche_score, engagement_score, audience_score, price_score, reasons, verdict

Rules:
- All *_score fields: integer 0-100.
- score = category_score*0.4 + niche_score*0.25 + engagement_score*0.15 + audience_score*0.1 + price_score*0.1
- reasons: 1-3 short strings (max 12 words each).
- verdict: one short sentence.

Example output for one candidate:
{"results":[{"influencer_id":"abc","score":87,"category_score":100,"niche_score":90,"engagement_score":85,"audience_score":75,"price_score":60,"reasons":["Exact fashion match","Strong luxury signals"],"verdict":"Excellent fit for evening wear."}]}

Score every candidate. Use ONLY the given data."""


def build_user_prompt(product: dict, candidates: list) -> str:
    return (
        "PRODUCT:\n"
        + json.dumps(product, separators=(",", ":"), default=str)
        + "\n\nCANDIDATES:\n"
        + json.dumps(candidates, separators=(",", ":"), default=str)
        + "\n\nScore every candidate. Return the JSON now."
    )