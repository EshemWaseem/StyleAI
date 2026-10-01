# app/services/matching_service.py
# ======================================================
# Matching inference — pure function, no DB, no side-effects
# Uses Ollama text model via existing ollama_service.
# Falls back to heuristic if LLM fails.
# ======================================================

import re
import time
import logging
from typing import List, Dict, Any

from app.config import settings
from app.services.ollama_service import ollama_service
from app.prompts.matching_prompts import SYSTEM_PROMPT, build_user_prompt
from app.schemas.matching import MatchRequest, MatchResultItem

logger = logging.getLogger("styleai.matching")

# qwen2.5:7b on CPU struggles with large JSON output.
# Keep the batch small so the model can finish the array.
MAX_CANDIDATES_PER_CALL = 12

_VALID_SCORE_KEYS = {
    "score",
    "category_score",
    "niche_score",
    "engagement_score",
    "audience_score",
    "price_score",
    "verdict",
}


# ------------------------------------------------------
# Heuristic fallback (no AI)
# ------------------------------------------------------
def _heuristic_score(product: dict, candidate: dict) -> dict:
    pc = (product.get("category") or "").lower()
    inf_cats = [c.lower() for c in (candidate.get("categories") or [])]

    if pc and pc in inf_cats:
        cat = 100
    elif pc and any(pc in c or c in pc for c in inf_cats):
        cat = 75
    else:
        cat = 20

    scores = [
        candidate.get("fashion_score") or 0,
        candidate.get("luxury_score") or 0,
        candidate.get("beauty_score") or 0,
        candidate.get("lifestyle_score") or 0,
    ]
    niche = (max(scores) * 100) if any(scores) else 50

    er = candidate.get("engagement_rate") or 0
    if er >= 0.06:
        eng = 100
    elif er >= 0.04:
        eng = 85
    elif er >= 0.02:
        eng = 55
    elif er >= 0.01:
        eng = 40
    else:
        eng = 20

    aud = 50

    pp = candidate.get("price_per_post") or 0
    prod_p = product.get("price") or 0
    if pp and prod_p:
        ratio = pp / prod_p
        if 0.5 <= ratio <= 3:
            price = 85
        elif ratio <= 5:
            price = 65
        elif ratio <= 10:
            price = 45
        else:
            price = 25
    else:
        price = 50

    total = cat * 0.4 + niche * 0.25 + eng * 0.15 + aud * 0.1 + price * 0.1

    return {
        "influencer_id": candidate["id"],
        "score": round(total, 1),
        "category_score": round(cat),
        "niche_score": round(niche),
        "engagement_score": round(eng),
        "audience_score": round(aud),
        "price_score": round(price),
        "reasons": ["Heuristic score (AI unavailable)"],
        "verdict": "Computed without AI.",
    }


# ------------------------------------------------------
# JSON sanitizer — qwen2.5:7b emits messy keys
# ------------------------------------------------------
def _sanitize_key(k: str) -> str:
    k = str(k).strip()
    # duplicate suffix: influencer_id_id → influencer_id
    if k.endswith("_id_id"):
        k = k[:-3]  # remove trailing '_id'
    # key is whitespace or empty
    if not k or len(k.strip()) == 0:
        return "__junk__"
    return k


def _sanitize_item(raw: Any) -> dict | None:
    if not isinstance(raw, dict):
        return None

    clean: Dict[str, Any] = {}
    for k, v in raw.items():
        key = _sanitize_key(k)
        if key == "__junk__":
            continue
        # value is a string equal to another schema key → garbage
        if isinstance(v, str) and v in _VALID_SCORE_KEYS:
            continue
        clean[key] = v

    inf_id = clean.get("influencer_id")
    if not inf_id or "score" not in clean:
        return None

    try:
        score = float(clean.get("score", 0))
    except (TypeError, ValueError):
        return None

    def num(field: str, default: float = 50.0) -> float:
        try:
            v = float(clean.get(field, default))
            return max(0.0, min(100.0, v))
        except (TypeError, ValueError):
            return default

    reasons = clean.get("reasons") or []
    if not isinstance(reasons, list):
        reasons = [str(reasons)] if reasons else []
    reasons = [str(r)[:120] for r in reasons[:4]]

    verdict = clean.get("verdict")
    verdict = str(verdict)[:200] if verdict else ""

    return {
        "influencer_id": str(inf_id),
        "score": max(0.0, min(100.0, score)),
        "category_score": num("category_score"),
        "niche_score": num("niche_score"),
        "engagement_score": num("engagement_score"),
        "audience_score": num("audience_score"),
        "price_score": num("price_score"),
        "reasons": reasons,
        "verdict": verdict,
    }


def _extract_results(raw: Any) -> List[dict]:
    if isinstance(raw, dict):
        arr = raw.get("results")
    elif isinstance(raw, list):
        arr = raw
    else:
        return []

    if not isinstance(arr, list):
        return []

    cleaned = []
    for item in arr:
        s = _sanitize_item(item)
        if s:
            cleaned.append(s)
    return cleaned


# ------------------------------------------------------
# MAIN
# ------------------------------------------------------
async def match_influencers(req: MatchRequest) -> Dict[str, Any]:
    start = time.time()

    product = req.product.model_dump()
    all_candidates = [c.model_dump() for c in req.candidates]

    candidates = all_candidates[:MAX_CANDIDATES_PER_CALL]
    if len(all_candidates) > MAX_CANDIDATES_PER_CALL:
        logger.info(
            "Truncating candidates from %d to %d for LLM call",
            len(all_candidates),
            MAX_CANDIDATES_PER_CALL,
        )

    combined_prompt = (
        f"{SYSTEM_PROMPT}\n\n---\n\n"
        f"{build_user_prompt(product, candidates)}"
    )

    model_name = settings.OLLAMA_TEXT_MODEL

    try:
        raw = await ollama_service.generate_json(
            prompt=combined_prompt,
            model=model_name,
            temperature=0.1,
            num_predict=8192,
        )

        items = _extract_results(raw)

        if not items:
            logger.warning(
                "No valid items parsed from LLM output. Raw: %s",
                str(raw)[:500],
            )
            raise ValueError("No valid results from LLM")

        validated: List[MatchResultItem] = []
        for r in items:
            try:
                validated.append(MatchResultItem(**r))
            except Exception as e:
                logger.warning("Pydantic reject: %s | item=%s", e, r)

        if not validated:
            raise ValueError("No items passed pydantic validation")

        validated.sort(key=lambda x: x.score, reverse=True)
        latency = int((time.time() - start) * 1000)
        logger.info("AI matched %d influencers in %dms", len(validated), latency)

        return {
            "results": [i.model_dump() for i in validated],
            "provider": "ollama",
            "model": model_name,
            "latency_ms": latency,
            "fallback_used": False,
        }

    except Exception as e:
        logger.error("LLM matching failed: %s. Falling back to heuristic.", e)
        fallback = [_heuristic_score(product, c) for c in all_candidates]
        fallback.sort(key=lambda x: x["score"], reverse=True)
        latency = int((time.time() - start) * 1000)

        return {
            "results": fallback,
            "provider": "heuristic",
            "model": "rule_based_v1",
            "latency_ms": latency,
            "fallback_used": True,
        }