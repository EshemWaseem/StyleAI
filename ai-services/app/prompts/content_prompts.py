# app/prompts/content_prompts.py
# ======================================================
# Prompts for product content generation
# Kept SHORT — qwen2.5:7b performs better with fewer rules
# + one real example.
# Sprint 26: brand_context optional block.
# ======================================================

CONTENT_GENERATION_PROMPT = """You are an e-commerce copywriter for fashion products.
{brand_block}
Attributes: {attributes}
Brand name: {brand_name}
Brand voice: {brand_voice}

Return ONLY valid JSON with EXACTLY these keys:
product_name, short_description, description, tags, seo_title, seo_description

Rules:
- product_name: 3-7 words
- short_description: 1-2 sentences (min 20 chars)
- description: 3-5 short paragraphs separated by blank lines
- tags: array of 5-10 lowercase strings
- seo_title: under 60 chars
- seo_description: under 160 chars
- Use ONLY given attributes. Do not invent materials or brands.
- If brand guidelines are provided above, match their tone and vocabulary. Prefer them over generic phrasing.

Example output:
{{"product_name":"Beige Chino Trousers","short_description":"Classic beige chinos with a straight fit. Perfect for smart-casual looks.","description":"Clean straight-leg silhouette in soft cotton twill.\\n\\nMid-rise waist with a button fly.\\n\\nEveryday essential that pairs with shirts or knitwear.","tags":["chinos","beige","trousers","casual","cotton","men"],"seo_title":"Beige Chino Trousers – Smart Casual","seo_description":"Straight-fit beige chinos in soft cotton twill. Mid-rise waist with button fly. An everyday essential for smart-casual looks."}}

Return ONLY the JSON object, starting with {{ and ending with }}."""


CONTENT_RETRY_PROMPT = """Return ONLY a JSON object. No prose, no code fences.
{brand_block}
Attributes: {attributes}

The JSON MUST have EXACTLY these keys:
product_name, short_description, description, tags, seo_title, seo_description

- short_description must be non-empty (at least 20 characters).
- description must be non-empty.
- tags must be an array of strings.

Example:
{{"product_name":"Beige Chinos","short_description":"Classic beige chinos with a straight fit for everyday wear.","description":"Straight-leg beige chinos in soft cotton.\\n\\nMid-rise waist with button fly.\\n\\nPairs well with shirts and knitwear.","tags":["chinos","beige","casual"],"seo_title":"Beige Chinos","seo_description":"Straight-fit beige chinos in soft cotton. Everyday smart-casual essential."}}

Return the JSON now."""


def build_brand_block(brand_context: str | None) -> str:
    """Return a formatted brand guidelines block or empty string."""
    if not brand_context or not str(brand_context).strip():
        return ""
    return (
        "\nBRAND GUIDELINES (match tone, vocabulary, and style; these take "
        "priority over generic phrasing):\n"
        f"{str(brand_context).strip()}\n"
    )