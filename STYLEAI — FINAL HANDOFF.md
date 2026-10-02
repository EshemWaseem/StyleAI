# STYLEAI — FINAL PROJECT HANDOFF
# ==========================================
# Generated: 01 Oct 2026
# Status: ~92% SRS complete. Production-ready for MVP.
# ==========================================

## 🎯 PROJECT OVERVIEW

**Name:** StyleAI
**Type:** Multi-tenant SaaS — Fashion E-commerce + Influencer Marketing
**Reference:** StyleAI_SRS.pdf

**Vision:** Automate product → AI understanding → influencer match → campaign → analytics.

**Target Users:**
- SUPER_ADMIN — platform moderation
- BRAND_OWNER — main customer (uploads products, hires influencers)
- BRAND_TEAM_MEMBER — scoped permissions
- INFLUENCER — content creator (profile, pricing, campaigns)
- AGENCY — manages multiple brands
- SHOPPER — end customer (storefront)

---

## 🏗️ ARCHITECTURE
[Frontend :3000] React 18 + Vite + TanStack + Tailwind
↓ HTTP + JWT
[Backend :4000] Node.js + Express + Prisma
↓ HTTP + X-Internal-Key
[AI Service :8000] FastAPI + Ollama + Gemini
↓
[PostgreSQL :5433] with pgvector extension


### Hard Rules (Never Violate)
1. React NEVER calls FastAPI directly
2. FastAPI NEVER touches the database
3. AI NEVER saves to DB directly (human-in-the-loop)
4. Node is the only DB writer
5. Multi-tenancy enforced — Brand A can't see Brand B

---

## 💻 TECH STACK (LOCKED)

### Frontend
- React 18, Vite, TypeScript
- TanStack Router + Query
- Tailwind + shadcn/ui (40+ components)
- Recharts (analytics)
- Zod (validation)

### Backend
- Express 5, Prisma ORM, PostgreSQL 16 (Docker :5433)
- JWT (HS256, 1h expiry), bcryptjs
- Cloudinary, Multer
- pgvector for RAG

### AI Service
- FastAPI 0.141, Uvicorn, Python 3.13.2
- Ollama (qwen2.5:7b local)
- Gemini (vision + embeddings)
- Hugging Face (image gen — fallback)

---

## ✅ WHAT'S COMPLETE (Sprints 1-27)

### Sprint 1-3 — Foundation
- Auth (register/login/me) with JWT
- Multi-tenant (Organization, Brand)
- RBAC (6 roles, 37 permissions)
- Products CRUD + Cloudinary
- Brand team roles + invitations

### Sprint 3B — AI Product Content
- Vision analysis (Gemini) → attributes
- Content generation (qwen2.5:7b) → title, description, SEO
- Price prediction, SKU auto-gen

### Sprint 4-5 — Influencer Domain
- Profiles + social accounts (10 platforms)
- Per-platform pricing grid
- Categories, audience, favorites
- Bookmarks (org saves)

### Sprint 6 — Custom Offers
- **Direct-to-influencer flow** (no admin approval — Sprint 27 update)
- Offer lifecycle: DRAFT → SENT_TO_INFLUENCER → ACCEPTED/DECLINED
- Wallet escrow on create
- Brand cancel before influencer reviews

### Sprint 7 — Influencer Listings
- Public offers with expiry
- Browse + claim

### Sprint 8-10 — Wallet System (Upwork-style)
- Dual commission (brand + influencer)
- Escrow hold/release/refund
- Wallet balance + ledger
- Withdrawal request + admin approval

### Sprint 11 — Campaigns + Content Pipeline
- Auto-created on offer acceptance
- Workflow: raw → edit → approve → publish → metrics
- Agency acting-as-brand middleware

### Sprint 12 — Analytics
- Platform, brand, agency, influencer views
- ROI, top creators, channel breakdown

### Sprint 13-17 — Chat + Content Studio
- Campaign chat (per-campaign messaging)
- Direct chat (brand ↔ influencer ↔ agency)
- AI Content Studio (Instagram/TikTok/YouTube/Blog)
- 5s polling for real-time feel

### Sprint 18 — AI Photography (PARTIAL)
- Hugging Face FLUX text-to-image
- Gemini vision extracts product attributes
- QA check via Gemini Vision
- **⚠️ Limitation:** FLUX is text-to-image only — no product preservation
- **Status:** 60% — needs paid image-to-image (Replicate, Gemini image-to-image)

### Sprint 19 — Recommendations
- Deterministic insights (ROI, escrow, category)
- Modular signals (product, campaign, tips)
- **Endpoint:** `GET /api/recommendations`

### Sprint 20 — Billing (MOCK → replaced by Sprint 24)
- ~~Mock subscription upgrade~~ — replaced

### Sprint 21 — Knowledge Base (RAG)
- Document upload → chunk → embed → pgvector
- Semantic search (cosine similarity)
- Embeddings: gemini-embedding-001 (768 dims)
- Per-org isolation

### Sprint 22-23 — AI Assistant
- Persistent conversations with memory
- RAG-powered (searches brand docs)
- Memory of last 10 messages
- Sources shown under replies
- Sidebar with history

### Sprint 24 — Payments (Stripe + JazzCash + Easypaisa + COD)
- Multi-gateway architecture with plug-and-play registry
- Stripe (international) — full checkout + webhook
- JazzCash + Easypaisa (Pakistan) — form POST + callback
- COD — confirm-on-delivery
- Webhook signature verification
- Idempotency protection

### Sprint 25 — SSE Notifications
- Server-Sent Events (replaces 30s polling)
- In-process EventEmitter bus
- Auto-reconnect with exponential backoff
- Heartbeat every 25s
- Multi-tab safe

### Sprint 26 — Brand Knowledge → AI Prompt Injection
- `getBrandContext()` fetches relevant chunks
- Injected into: product content, platform content, photography
- 5-min cache with invalidation on doc changes
- Fallback: silent degradation if knowledge base empty

### Sprint 27 — Role-Aware SaaS Billing
- 3 roles: BRAND / AGENCY / INFLUENCER
- 3-day trial (brands/agencies) → auto-expiry
- 7-day trial (influencers) → free tier fallback
- Plans:
  - **Brand:** Trial / Starter (PKR 5K) / Growth (PKR 15K) / Studio (PKR 35K) / Enterprise
  - **Agency:** Trial / Solo (PKR 20K) / Pro (PKR 50K) / Scale (PKR 120K)
  - **Influencer:** Trial / Free / Creator (PKR 2K) / Pro (PKR 6K) / Elite (PKR 15K)
- Commission slabs: Higher tier = lower take rate
  - Brand: 8% → 6% → 4% → 2.5%
  - Influencer: 12% → 9% → 6%
- Monthly usage counters (auto-reset)
- Quota enforcement middleware
- Trial cron (6h sweep) — reminders + expiry
- Trial guard middleware (frontend redirect)

---

## 🚧 WHAT'S PENDING (with reasons)

### 1. AI Photography Proper (Sprint 18 finish)
- **Blocker:** HF free credits depleted, image-to-image is paid
- **Fix:** Enable Replicate API (~$0.01/image) OR Gemini image billing
- **Effort:** 3 msg + budget

### 2. Model Management Dashboard (SRS §48-49)
- AI operations dashboard (cost, latency, success rate)
- Model versions registry (base, accuracy, eval)
- **Effort:** 2 msg

### 3. Advanced RAG
- Reranking, hybrid search, metadata filters
- **Effort:** 3 msg

### 4. Email Notifications
- Resend/SendGrid integration
- Trial reminders, campaign events
- **Effort:** 2 msg

### 5. Redis + BullMQ Background Jobs
- Heavy AI tasks (photo gen) → queue
- Retry logic for failed webhooks
- **Effort:** 3 msg

### 6. Real Stripe Live Mode
- Requires US LLC (Pakistan mein Stripe nahi banta)
- OR Payoneer Online Checkout (rollout pending)
- **Blocker:** Legal + bank setup

### 7. Phase 3 SRS Features
- Fine-tuned fashion LLM (LoRA/QLoRA)
- Custom ranking model (needs 1000+ campaign pairs)
- Image generation + QA pipeline
- Real-time collaboration (WebSockets)
- A/B testing framework
- AI negotiation assistant
- Stripe Connect for payouts

---

## 📁 FOLDER STRUCTURE

### Backend `backend/src/`

server.js
config/
prisma.js, cloudinary.js, fetchTimeout.js
platformCatalog.js, platformSettings.js, brandTeamPermissions.js
payment_service/ (shared, stripe, jazzcash, easypaisa, cod, index)

controllers/ (31 controllers)
middleware/ (auth, authSSE, errorHandler, upload, actingBrand,
trialCheck, quotaCheck)

routes/ (30 route files)

services/
aiService.js, brandService.js, productService.js, userService.js, ...
admin/ (12 files)
analytics/ (agency, brand, platform, influencer)
assistant/ (7 files — chat, RAG, prompt, cache)
billing/ (index, plans, helpers, roles, usage, cron)
campaigns/ (9 files)
chat/ (5 files)
influencer/ (8 files)
knowledge/ (chunker, embedder, ingest, search, brandContext)
matching/ (6 files)
notifications/ (emit, list, markRead, delete, sse, eventBus)
offers/ (create, list, get, update, submit, cancel,
adminReview, influencerReview, estimate, helpers)
payments/ (core, shared, stripe/, jazzcash/, easypaisa/, cod/)
pricing/ (index, updatePricing, validatePricing)
recommendations/ (forBrand, helpers, signals/)
wallet/ (8 files)

### Frontend `frontend/src/`

components/ (app-shell, ui/, 15 domain folders)
lib/ (13 domain API clients)
routes/ (40+ pages including 14 admin pages)


### AI Service `ai-services/app/`

api/routes/ (10 route files)
prompts/ (6 prompt modules)
schemas/ (Pydantic models)
services/ (12 service modules)
hugging_face/ (hf_image, hf_photography)


---

## 🔧 ENVIRONMENT SETUP

### Backend `.env`
```env
DATABASE_URL=postgresql://postgres:...@localhost:5433/postgres
PORT=4000
NODE_ENV=development
JWT_SECRET=<long-random-string>
FRONTEND_URL=http://localhost:3000,http://localhost:5173
AI_SERVICE_URL=http://localhost:8000
AI_INTERNAL_KEY=<matches-ai-service>
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Payments
STRIPE_SECRET_KEY=sk_test_... (from stripe sandbox)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
JAZZCASH_MERCHANT_ID=MC00000
JAZZCASH_PASSWORD=...
JAZZCASH_INTEGRITY_SALT=...
EASYPAISA_STORE_ID=00000
EASYPAISA_HASH_KEY=...
COD_MIN_AMOUNT=500
COD_MAX_AMOUNT=200000
COD_AUTO_CONFIRM_DAYS=7
USD_PKR_RATE=278