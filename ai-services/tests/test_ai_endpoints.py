# ai-services/tests/test_ai_endpoints.py
# Run: pytest tests/ -v
# Flags: -m "not slow" | -m slow

import os
import pytest
import httpx

# Load .env so INTERNAL_KEY is available inside pytest subprocess
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BASE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8000").rstrip("/")
INTERNAL_KEY = os.getenv("AI_INTERNAL_KEY") or os.getenv("INTERNAL_KEY") or ""

HEADERS = {"Content-Type": "application/json"}
if INTERNAL_KEY:
    HEADERS["X-Internal-Key"] = INTERNAL_KEY

FAST_TIMEOUT = 30.0
SLOW_TIMEOUT = 120.0

# Actual paths from /openapi.json — /health has NO prefix
HEALTH_CANDIDATES = ["/health", "/readiness", "/api/v1/health", "/"]


def _resolve_health_path():
    for path in HEALTH_CANDIDATES:
        try:
            r = httpx.get(f"{BASE_URL}{path}", timeout=3.0)
            if r.status_code == 200:
                return path
        except Exception:
            continue
    return None


_HEALTH_PATH = _resolve_health_path()


@pytest.fixture(scope="module", autouse=True)
def ensure_service():
    if not _HEALTH_PATH:
        pytest.skip(f"AI service unreachable at {BASE_URL} (tried {HEALTH_CANDIDATES})")


@pytest.fixture
def client():
    with httpx.Client(base_url=BASE_URL, headers=HEADERS) as c:
        yield c


# ═══════════════════════════════════════════════════════════════
# HEALTH
# ═══════════════════════════════════════════════════════════════

def test_health(client):
    r = client.get(_HEALTH_PATH, timeout=5.0)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)


# ═══════════════════════════════════════════════════════════════
# MATCHING
# ═══════════════════════════════════════════════════════════════

def test_match_influencers(client):
    payload = {
        "product": {
            "id": "test-p", "name": "Silk Evening Dress",
            "category": "Clothing", "style": "luxury",
            "price": 5000, "currency": "PKR",
        },
        "candidates": [
            {"id": "inf-1", "display_name": "Aisha K", "categories": ["Clothing", "Fashion"],
             "follower_count": 50000, "engagement_rate": 0.045, "price_per_post": 8000},
            {"id": "inf-2", "display_name": "Maria S", "categories": ["Beauty"],
             "follower_count": 120000, "engagement_rate": 0.02, "price_per_post": 15000},
        ],
    }
    r = client.post("/api/v1/match/influencers", json=payload, timeout=FAST_TIMEOUT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "results" in data
    assert isinstance(data["results"], list)
    assert len(data["results"]) > 0
    first = data["results"][0]
    assert "influencer_id" in first
    assert isinstance(first["score"], (int, float))
    assert 0 <= first["score"] <= 100


def test_match_empty_candidates(client):
    payload = {"product": {"id": "p1", "name": "Test", "category": "Clothing"}, "candidates": []}
    r = client.post("/api/v1/match/influencers", json=payload, timeout=FAST_TIMEOUT)
    assert r.status_code in (200, 400, 422)


# ═══════════════════════════════════════════════════════════════
# PLATFORM CONTENT
# ═══════════════════════════════════════════════════════════════

@pytest.mark.parametrize("platform", ["instagram", "tiktok", "youtube", "blog"])
def test_platform_content(client, platform):
    payload = {
        "platform": platform, "product_name": "Silk Evening Dress",
        "category": "Clothing", "brand_voice": "elegant",
    }
    r = client.post("/api/v1/content/platform", json=payload, timeout=SLOW_TIMEOUT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("platform") == platform
    assert isinstance(data.get("content"), dict)
    assert len(data["content"]) > 0


def test_platform_content_invalid_platform(client):
    payload = {"platform": "myspace", "product_name": "Test"}
    r = client.post("/api/v1/content/platform", json=payload, timeout=FAST_TIMEOUT)
    assert r.status_code in (400, 422)


# ═══════════════════════════════════════════════════════════════
# PRODUCT CONTENT  — FIXED path: /api/v1/product/content
# ═══════════════════════════════════════════════════════════════

def test_product_content(client):
    payload = {"product_name": "Silk Evening Dress", "category": "Clothing", "tone": "luxury"}
    r = client.post("/api/v1/product/content", json=payload, timeout=SLOW_TIMEOUT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("description") or data.get("caption") or data.get("product_name")


# ═══════════════════════════════════════════════════════════════
# PRODUCT ANALYZE (vision)  — FIXED path: /api/v1/product/analyze
# ═══════════════════════════════════════════════════════════════

@pytest.mark.slow
def test_product_analyze(client):
    img = httpx.get("https://picsum.photos/400/400", timeout=10.0).content
    files = {"image": ("test.jpg", img, "image/jpeg")}
    r = client.post("/api/v1/product/analyze", files=files, timeout=SLOW_TIMEOUT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("category") or data.get("attributes")


# ═══════════════════════════════════════════════════════════════
# AUTH / SECURITY
# ═══════════════════════════════════════════════════════════════

@pytest.mark.skipif(not INTERNAL_KEY, reason="Neither AI_INTERNAL_KEY nor INTERNAL_KEY set")
def test_missing_internal_key_rejected():
    with httpx.Client(base_url=BASE_URL, headers={"Content-Type": "application/json"}) as c:
        r = c.post("/api/v1/match/influencers", json={"product": {}, "candidates": []}, timeout=10.0)
        assert r.status_code in (401, 403)