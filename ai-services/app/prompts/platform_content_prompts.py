# app/prompts/platform_content_prompts.py
# ======================================================
# Prompts for per-platform content generation
# Kept short + one concrete example per platform (qwen-friendly)
# Sprint 26: brand_context inject block.
# ======================================================

_BASE_RULES = """Rules:
- Return ONLY valid JSON. No markdown fences, no prose.
- Use ONLY the given product attributes. Never invent materials, certifications, features.
- No exaggerated claims ("amazing", "premium masterpiece").
- Match the requested tone and brand voice.
- If brand guidelines are provided, they take priority over generic tone.
- Include a clear call-to-action where asked.
- Keep every field non-empty and specific."""


def _brand_block(req) -> str:
    ctx = getattr(req, "brand_context", None)
    if not ctx or not str(ctx).strip():
        return ""
    return f"\nBRAND GUIDELINES (match these closely):\n{str(ctx).strip()}\n"


def _product_block(req) -> str:
    parts = [f"Product: {req.product_name}"]
    if req.category: parts.append(f"Category: {req.category}")
    if req.color: parts.append(f"Color: {req.color}")
    if req.material: parts.append(f"Material: {req.material}")
    if req.price is not None:
        parts.append(f"Price: {req.currency or 'USD'} {req.price}")
    if req.brand_name: parts.append(f"Brand: {req.brand_name}")
    if req.brand_voice: parts.append(f"Brand voice: {req.brand_voice}")
    if req.tone: parts.append(f"Tone: {req.tone}")
    if req.description: parts.append(f"Short description: {req.description[:300]}")
    if req.extra_notes: parts.append(f"Notes: {req.extra_notes[:200]}")
    return "\n".join(parts)


def build_prompt(req) -> str:
    p = _product_block(req)
    b = _brand_block(req)

    if req.platform == "instagram":
        return f"""You are an Instagram content writer for fashion brands.
{b}
{p}

{_BASE_RULES}

Return EXACTLY this JSON:
{{
  "caption": "<2-3 sentences, engaging, ends with emoji>",
  "hashtags": ["<10-15 lowercase hashtags without #>"],
  "cta": "<one short call-to-action sentence>",
  "story_script": "<3-4 short story frames, one per line>",
  "reel_script": "<5-7 shot descriptions separated by → >"
}}

Example:
{{"caption":"Meet the dress that does the talking. Fluid silk, sculpted neckline — made for evenings that matter. ✨","hashtags":["silkdress","eveningwear","quietluxury","fashionreel","ootd","styleinspo"],"cta":"Tap the link in bio to shop.","story_script":"Slide 1: Close-up of fabric.\\nSlide 2: Full-length walk.\\nSlide 3: Product card with price.","reel_script":"Fabric close-up → step into light → mirror twirl → walk-away shot → product card"}}

Return ONLY the JSON, starting with {{ and ending with }}."""

    if req.platform == "tiktok":
        return f"""You are a TikTok scriptwriter for fashion brands.
{b}
{p}

{_BASE_RULES}

Return EXACTLY this JSON:
{{
  "hook": "<first 1-3 seconds hook line>",
  "scenes": ["<scene 1>", "<scene 2>", "<scene 3>", "<scene 4>"],
  "voiceover": "<30-45 second voiceover script>",
  "cta": "<one short CTA>",
  "hashtags": ["<8-12 lowercase hashtags without #>"]
}}

Example:
{{"hook":"POV: you found the dress.","scenes":["Close-up on silk","Model steps into frame","Twirl in slow-mo","Product card"],"voiceover":"This is the dress everyone will ask about. Fluid silk, sculpted neckline, easy to style.","cta":"Link in bio.","hashtags":["fashiontok","fyp","dress","eveningwear","ootd"]}}

Return ONLY the JSON, starting with {{ and ending with }}."""

    if req.platform == "youtube":
        return f"""You are a YouTube creator for fashion brands.
{b}
{p}

{_BASE_RULES}

Return EXACTLY this JSON:
{{
  "title": "<under 70 chars, clickable>",
  "description": "<2-3 paragraphs, includes product link placeholder>",
  "script": "<2-4 minute video script with intro / body / outro>",
  "shorts_script": "<30-60 second short script>",
  "tags": ["<10-15 lowercase tags without #>"]
}}

Example:
{{"title":"Noir Evening Dress — Full Review & Styling","description":"A full look at the Noir Evening Dress.\\n\\nTimestamps below.\\n\\nShop: [link]","script":"[Intro] Welcome back... [Body] Let's look at the dress... [Outro] Thanks for watching...","shorts_script":"Hook: This is the dress I keep getting asked about...","tags":["fashion","dress","eveningwear","review","styling"]}}

Return ONLY the JSON, starting with {{ and ending with }}."""

    # blog
    return f"""You are an SEO copywriter for a fashion brand's blog.
{b}
{p}

{_BASE_RULES}

Return EXACTLY this JSON:
{{
  "seo_title": "<under 60 chars>",
  "meta_description": "<under 160 chars>",
  "article": "<4-6 paragraphs separated by blank lines>",
  "faq": [{{"q":"<question>","a":"<answer>"}}, {{"q":"<question>","a":"<answer>"}}]
}}

Example:
{{"seo_title":"Noir Evening Dress — Styling Guide","meta_description":"How to style the Noir Evening Dress for weddings, galas, and evenings out.","article":"The Noir Evening Dress is a quiet-luxury staple...\\n\\nPair it with...\\n\\nFor a modern take...","faq":[{{"q":"What material is it?","a":"Fluid silk."}},{{"q":"Is it machine washable?","a":"Dry clean only."}}]}}

Return ONLY the JSON, starting with {{ and ending with }}."""