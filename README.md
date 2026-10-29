<div align="center">

<br/>

# StyleAI

### AI-Powered Fashion Commerce & Influencer Marketing Platform

*An end-to-end multi-tenant SaaS + B2C e-commerce ecosystem — brands upload products, AI understands them, matches creators, generates ads, and manages campaigns. Fully automated, end to end.*

<br/>

![Status](https://img.shields.io/badge/MVP-~88%25%20Complete-22c55e?style=flat-square)
![Tests](https://img.shields.io/badge/Backend%20Tests-86%20Passed%20%2F%200%20Failed-22c55e?style=flat-square)
![AI Tests](https://img.shields.io/badge/AI%20Service%20Tests-10%20Passed%20%2F%200%20Failed-22c55e?style=flat-square)
![Node](https://img.shields.io/badge/Node.js-20%20LTS-339933?style=flat-square&logo=node.js&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20+%20pgvector-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python%203.13-009688?style=flat-square&logo=fastapi&logoColor=white)

</div>

---

## 📖 Table of Contents

- [Overview & Vision](#-overview--vision)
- [Business Model](#-business-model)
- [System Architecture](#️-system-architecture)
- [Technology Stack](#-technology-stack)
- [User Roles & Permissions](#-user-roles--permissions)
- [Key Features](#-key-features)
- [AI Pipeline](#-ai-pipeline)
- [Repository Structure](#-repository-structure)
- [Environment Configuration](#️-environment-configuration)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [Security](#-security)
- [Test Suite](#-test-suite)
- [Current Status & Roadmap](#-current-status--roadmap)
- [Key Design Decisions](#-key-design-decisions)
- [License](#-license)

---

## 📌 Overview & Vision

StyleAI automates the complete journey from product upload to influencer campaign performance — powered by a dedicated Python AI microservice.

```
Brand uploads product
        │
        ▼
  AI Vision Analysis         ← Gemini Vision / Groq Vision
        │
        ├──► AI Description Generator   (title, SEO, FAQs, keywords)
        ├──► AI Photography Angles       (lifestyle shot recommendations)
        ├──► Vector Embeddings           (pgvector → RAG + matching)
        │
        ▼
  AI Influencer Matching     ← 6-dimension scoring model
        │
        ▼
  Offer → Escrow → Campaign  ← Wallet-escrow with ACID transactions
        │
        ▼
  Content Pipeline           ← raw → review → approve → publish
        │
        ▼
  Analytics + AI Learning    ← campaign signals feed recommendations
```

**Platform Status:** MVP ~88% complete — production-ready for controlled/beta launch.
**Test Results:** Backend 86/0 · AI Service 10/10 · Frontend build ✅ clean.

---

## 💼 Business Model

| Stream | Who Pays | What For |
|---|---|---|
| **B2B SaaS** | Brands, Agencies, Influencers | Monthly subscriptions (Stripe) — tiered plans |
| **B2C E-commerce** | Shoppers | Product purchases via Stripe card or Cash on Delivery |
| **Ad Platform** | Agencies | Running Meta (FB/IG) + Google Ads for client brands |

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│   Frontend  ·  React 19 + TanStack Router 1.168.32 + Vite 8.1.6 │
│   Port: 3000                                                     │
│   ─ Public storefront + SSR product pages (no auth required)     │
│   ─ Authenticated brand/influencer/agency dashboard (SPA)        │
│   ─ Admin panel (/admin/*)                                       │
└──────────────────────────┬───────────────────────────────────────┘
                           │  HTTPS + JWT + SSE + WebSocket
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│   Backend  ·  Node.js + Express 4 + Prisma 5                     │
│   Port: 4000                                                     │
│   ─ Auth, RBAC (6 roles, 37 permissions), multi-tenancy          │
│   ─ Products, Orders, Campaigns, Offers, Wallet                  │
│   ─ Payment gateways (Stripe, COD, JazzCash, Easypaisa)          │
│   ─ Queue (BullMQ) · WebSocket chat · SSE notifications          │
│   ─ Admin approval workflow (PENDING → APPROVED / REJECTED)      │
└───────┬──────────────────────────────────┬───────────────────────┘
        │  REST (X-Internal-Key auth)       │
        ▼                                  ▼
┌───────────────────────┐        ┌───────────────────────────────┐
│  AI Service           │        │  PostgreSQL 16 + pgvector     │
│  Python FastAPI       │        │  25+ tables · Prisma ORM      │
│  Port: 8000           │        └───────────────────────────────┘
│  ─ Ollama / Groq LLM  │
│  ─ Gemini Vision      │        ┌───────────────────────────────┐
│  ─ HuggingFace FLUX   │        │  Redis 6379                   │
│  ─ Embeddings / RAG   │        │  Cache + BullMQ job queue     │
└───────────────────────┘        └───────────────────────────────┘
```

### Architectural Rules (Never Violate)

| Rule | Reason |
|---|---|
| React never calls FastAPI directly | All AI calls go through Node backend |
| FastAPI never touches the database | Stateless compute only — Node is the only DB writer |
| AI never saves to DB directly | Human-in-the-loop validation via Node |
| Every query scoped by `organizationId` or `userId` | Hard multi-tenancy at ORM level |
| Agency context via `X-Acting-Brand` header | Clean brand-switching without re-auth |
| LLM output always schema-validated | Never execute raw AI output |

---

## 🛠️ Technology Stack

### Frontend

| Category | Technology | Version |
|---|---|---|
| Framework | React | 19 |
| Router / SSR | TanStack Router + TanStack Start | **1.168.32** (pinned — see Known Issues) |
| Build | Vite + Rolldown | 8.1.6 |
| Styling | Tailwind CSS (single source: `styles.css`) | v4 |
| UI Primitives | shadcn/ui + Radix UI | — |
| Charts | Recharts | — |
| Data Fetching | TanStack Query | — |
| Forms | React Hook Form + Zod | — |
| Notifications | SweetAlert2 (themed via `lib/swal.ts`) | — |
| Real-time | Socket.IO client (WebSocket + SSE) | — |
| Language | TypeScript | — |

### Backend

| Category | Technology | Version |
|---|---|---|
| Runtime | Node.js | 20 LTS (24 works but not recommended) |
| Framework | Express | 4 |
| ORM | Prisma | 5 |
| Database | PostgreSQL + pgvector | 16 |
| Cache / Queue | Redis + BullMQ | 7 |
| Auth | JWT (HS256) + bcrypt + token versioning | — |
| File Storage | Cloudinary + Multer | — |
| Email | Gmail SMTP (dev) · SendGrid/Resend (prod) | — |
| Payments | Stripe · COD · JazzCash · Easypaisa | — |

### AI Service

| Category | Technology |
|---|---|
| Runtime | Python 3.13 |
| Framework | FastAPI + Uvicorn |
| LLM | Ollama `qwen2.5:7b` (local) · Groq `llama-3.3-70b-versatile` (cloud) |
| Vision | Gemini Vision `gemini-2.0-flash` |
| Image Generation | HuggingFace FLUX · Gemini Image (fallback) |
| Embeddings | Gemini · HuggingFace |
| Matching | Custom ML scoring engine |

### External Integrations

| Service | Purpose |
|---|---|
| Meta Graph API v20 | Facebook + Instagram Ads |
| Google Ads API v17 | Google Ads campaign management |
| Stripe | Subscriptions + card payments + webhooks |
| Cloudinary | Image storage + transformation |
| Ngrok | Local OAuth callback tunneling (dev) |

---

## 👥 User Roles & Permissions

| Role | Description |
|---|---|
| `SUPER_ADMIN` | Full platform control — user approvals, finance, AI ops, audit |
| `BRAND_OWNER` | Main paying customer — products, campaigns, influencers, analytics |
| `BRAND_TEAM_MEMBER` | Scoped permissions under a brand (Marketing, Content, Analyst, etc.) |
| `INFLUENCER` | Content creator — receives offers, delivers campaigns, manages earnings |
| `AGENCY` | Manages multiple client brands, runs ad campaigns |
| `SHOPPER` | End consumer — browses, carts, checks out (bypasses approval gate) |

The platform has **37 granular permissions** enforced via `authorize()` and `requirePermission()` middleware. Every admin action additionally requires `assertSuperAdmin()`.

### Admin Approval Workflow

All business role signups pass through a 2-stage approval gate:

```
Register (BRAND_OWNER / INFLUENCER / AGENCY / BRAND_TEAM_MEMBER)
        │
        ▼
  status = PENDING
        │
        ▼
  Admin notified (SSE + email + dashboard badge)
        │
        ├── Approve → User notified → Login enabled
        └── Reject  → User notified with mandatory reason → Login blocked
```

> **SHOPPER bypasses the gate** — gating B2C converts kills conversion.
> **Existing users auto-APPROVED** via `@default(APPROVED)` — zero migration disruption.

---

## ✨ Key Features

### 🏢 For Brands

- **AI Product Upload** — Upload an image; vision model auto-detects category, subcategory, colors, material, style, occasion, formality, and visual aesthetic.
- **AI Description Generator** — Generates short/long descriptions, SEO title, meta description, keywords, and FAQs — in the brand's defined voice.
- **AI Photography Studio** — Photography angle recommendations + lifestyle image generation per product type.
- **Influencer Discovery** — Search and filter by niche, platform, follower count, engagement rate, geography, and audience demographics.
- **AI Matching Engine** — 6-dimension ML scoring ranks influencers by compatibility with a specific product and brand profile.
- **Campaign Management** — Send offers, escrow wallet funds, track deliverables through a full pipeline (raw → edit → approve → publish), monitor metrics.
- **Platform Content Studio** — AI generates platform-specific ad copy for Instagram, TikTok, YouTube, Facebook, and blogs.
- **Brand AI Assistant (RAG)** — Upload brand guidelines or lookbooks; the AI assistant uses them as grounded context for all generation tasks.
- **Recommendations Engine** — Signal-based recommendations from campaign, offer, product, and performance history.
- **Team & Role Management** — Invite team members with per-permission access control.

### 🎨 For Influencers

- **Profile & Portfolio** — Connect Instagram, TikTok, YouTube, and 7 other platforms with verified audience data.
- **Per-Platform Pricing Grid** — Set custom rates per content type and per platform.
- **Offer Deal Flow** — Receive, review, accept, negotiate, and decline brand offers.
- **Campaign Deliverables** — Submit raw content, receive brand feedback, track approval stages.
- **Earnings Wallet** — Automatic campaign payouts via escrow release, withdrawal requests with admin approval.

### 🏢 For Agencies

- **Multi-Brand Workspace** — Manage multiple client brands from a single agency account using `X-Acting-Brand` header-based context switching.
- **Meta Ads Integration** — Create and manage Facebook/Instagram campaigns (created PAUSED by default — no accidental spend).
- **Google Ads Shell** — Basic campaign creation (AdGroup + Keywords in progress).
- **Engagement Tracking** — Content performance monitoring across all managed clients.

### 🛍️ For Shoppers (B2C)

- **Public Storefront** — SSR-rendered product pages with JSON-LD structured data, sitemap, and full SEO.
- **AI-Curated Collections** — Editorial sections and influencer-styled product feeds, admin-controlled.
- **Cart & Checkout** — Guest-friendly cart (localStorage), full checkout flow with address management.
- **Payment Methods** — Stripe (international), JazzCash, Easypaisa, Cash on Delivery.
- **Order Tracking** — Real-time status: placed → confirmed → shipped → delivered.

### 🛡️ For Super Admins

- **User Approval Queue** — Review, approve, or reject PENDING business signups with mandatory rejection reasons.
- **Platform Finance** — Commission rates, wallet oversight, withdrawal approvals, transaction ledger.
- **AI Ops Dashboard** — API requests, token usage, cost per model, latency, and error rate monitoring.
- **Model Management** — Track versions, accuracy scores, evaluation results, deploy/rollback production models.
- **Storefront Control** — Hero sections, editorial collections, brand feature approvals, homepage curation.
- **Order Management** — Confirm COD delivery, cancel orders, trigger wallet credits.
- **Audit Logs** — Immutable event trail via `writeAudit()` on all sensitive operations.

### 🌐 SEO & Public Pages

- `robots.txt` — Public shop allowed, `/dashboard`/`/admin` blocked
- `sitemap.xml` — Categories + gender pages dynamically generated
- JSON-LD structured data — Organization, WebSite, Product, Breadcrumb, ItemList, CollectionPage, FAQPage
- OG tags + Twitter cards on all public pages
- `noindex` meta tag on 16 protected/auth-only pages
- Canonical URLs with trailing-slash normalization
- `/why-styleai` — Premium marketing landing page (4 persona sections: brand, creator, agency, shopper)

---

## 🤖 AI Pipeline

### Product Understanding

```
Image uploaded by brand
        │
        ▼
  Gemini Vision (gemini-2.0-flash)
        │
        ▼
  Structured JSON (Pydantic validated):
  { category, subcategory, colors, material,
    style, occasion, formality, aesthetic,
    gender, estimatedAgeGroup }
        │
        ├──► Content Generator (Groq llama-3.3-70b)
        │    └── title · short desc · long desc · SEO · FAQs
        │
        ├──► Embedding Service → pgvector
        │    └── stored for RAG search + matching
        │
        └──► Photography Angle Generator (Gemini)
             └── shot list per product type + occasion
```

### Influencer Matching (6-Dimension Scoring)

```
Brand selects product
        │
        ▼
  Product vector fetched from pgvector
        │
        ▼
  Matching Service applies 6-dimension model:
    1. Style compatibility (vector cosine similarity)
    2. Audience demographics alignment
    3. Engagement rate quality score
    4. Historical campaign performance
    5. Niche / category match
    6. Price segment fit
        │
        ▼
  Ranked list with numeric score + natural-language explanation
```

### RAG Brand Knowledge Base

```
Brand uploads doc (PDF, DOCX, brand guidelines)
        │
        ▼
  Chunker (overlapping segments)
        │
        ▼
  Embedder → vectors stored in pgvector
        │
        ▼
  User sends query to Brand AI Assistant
        │
        ▼
  Query Expander (semantic variants)
        │
        ▼
  pgvector top-k similarity search
        │
        ▼
  Reranker (relevance filter)
        │
        ▼
  LLM generates response grounded in brand context
```

### AI Safety Pipeline

```
LLM generates output
        │
        ▼
  Pydantic / Zod schema validation
        │
        ▼
  Permission check
        │
        ▼
  Application logic (safe, scoped execution)

  ← LLM output is NEVER blindly executed →
```

---

## 📂 Repository Structure

```
StyleAI/
├── backend/
│   ├── prisma/
│   │   ├── schema/                    # Multi-file Prisma schema
│   │   │   ├── user.prisma            # User + RBAC + AdminApprovalStatus
│   │   │   ├── commerce.prisma        # Order + OrderItem + Cart
│   │   │   └── ...                    # 25+ tables total
│   │   ├── seed.js                    # Roles + permissions seed
│   │   ├── create-admin.js            # Env-based admin bootstrap
│   │   └── seed-ai-models.js          # AI model registry
│   └── src/
│       ├── server.js                  # Express bootstrap + middleware mount
│       ├── config/
│       │   ├── prisma.js · redis.js · cloudinary.js
│       │   └── payment_service/       # Gateway context per provider
│       ├── controllers/               # 31 thin HTTP handlers
│       ├── middleware/
│       │   ├── auth.js                # JWT + RBAC + approval gate
│       │   ├── actingBrand.js         # X-Acting-Brand for agencies
│       │   ├── trialCheck.js          # Trial enforcement
│       │   ├── quotaCheck.js          # Plan quota enforcement
│       │   └── upload.js              # Multer + Cloudinary
│       ├── routes/                    # 35+ Express route files
│       ├── services/
│       │   ├── admin/
│       │   │   ├── approval.js        # listPending · approve · reject
│       │   │   ├── users.js · storefront.js · finance.js
│       │   ├── payments/
│       │   │   ├── core/gateway.js    # Abstract PaymentGateway base class
│       │   │   ├── cod/ · stripe/ · jazzcash/ · easypaisa/
│       │   ├── wallet/
│       │   │   ├── helpers.js         # Ledger-based truth pattern
│       │   │   ├── offerFlow.js · orderFlow.js · platform.js
│       │   ├── notifications/
│       │   │   └── emit.js            # notifyUser · notifyAdmins (SSE)
│       │   ├── email/
│       │   │   └── templates.js       # 21 email templates
│       │   ├── knowledge/             # RAG: chunker · embedder · reranker
│       │   ├── matching/              # ML scoring engine + cache
│       │   ├── assistant/             # Brand AI chat + RAG search
│       │   └── recommendations/       # Signal-based recommendation engine
│       └── scripts/
│           └── test-everything.js     # Master test suite (86 checks)
│
├── frontend/
│   └── src/
│       ├── routes/
│       │   ├── __root.tsx             # App shell auth gate
│       │   ├── index.tsx              # Public storefront homepage (SSR)
│       │   ├── why-styleai.tsx        # Premium marketing landing page
│       │   ├── pending.tsx            # Admin-pending UX with Swal
│       │   ├── login.tsx              # Swal popup for PENDING/REJECTED
│       │   ├── register.tsx           # Swal popup on PENDING signup
│       │   ├── dashboard.tsx          # Role-adaptive workspace
│       │   ├── admin/                 # Admin panel pages (users, finance, AI ops)
│       │   ├── campaigns.*.tsx        # Campaign management
│       │   ├── influencers.*.tsx      # Discovery + profiles
│       │   ├── studio.*.tsx           # Content + photography studio
│       │   └── ...
│       ├── components/
│       │   ├── app-shell/             # Sidebar + nav (split into 13 files)
│       │   ├── ui/                    # shadcn/ui primitives + skeletons
│       │   └── ...
│       ├── lib/
│       │   ├── api.ts                 # Fetch wrapper (JWT · 401 · 402 · 429)
│       │   ├── role.tsx               # AuthContext + AuthUser interface
│       │   ├── swal.ts                # Themed SweetAlert2 wrapper
│       │   └── admin/api.ts           # Admin API client
│       └── styles.css                 # ⚠️ SINGLE source of truth — all design tokens
│
├── ai-services/
│   └── app/
│       ├── main.py                    # FastAPI bootstrap
│       ├── api/routes/                # health · matching · content · vision
│       ├── services/
│       │   ├── llm_service.py         # Multi-provider LLM abstraction
│       │   ├── gemini_vision.py       # Product image analysis
│       │   ├── matching_service.py    # ML scoring engine
│       │   ├── embedding_service.py   # Vector pipeline
│       │   └── content_generator.py   # Multi-format content generation
│       ├── prompts/                   # Modular prompt templates per domain
│       └── schemas/                   # Pydantic request/response schemas
│
├── docker-compose.yml                 # Local dev (PostgreSQL + Redis)
├── docker-compose.prod.yml            # Production deployment
└── README.md
```

---

## ⚙️ Environment Configuration

> **Never commit `.env` files.** Commit `.env.example` only.

### `backend/.env`

```env
# ─── Database & Cache ───────────────────────────────────────
DATABASE_URL=postgresql://postgres:password@localhost:5433/styleai?schema=public
REDIS_URL=redis://localhost:6379

# ─── Server ─────────────────────────────────────────────────
PORT=4000
NODE_ENV=development
FRONTEND_URL="https://app.yourdomain.com"
API_URL="https://api.yourdomain.com"

# ─── Auth ───────────────────────────────────────────────────
# Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET="<64-char-hex>"
OAUTH_STATE_SECRET="<32-char-hex>"

# ─── AI Service ─────────────────────────────────────────────
AI_SERVICE_URL="http://localhost:8000"
AI_INTERNAL_KEY="<shared-secret>"
INTERNAL_KEY="<same-as-above>"

# ─── OAuth ──────────────────────────────────────────────────
META_APP_ID="..."
META_APP_SECRET="..."
META_REDIRECT_URI="https://api.yourdomain.com/api/agency/integrations/META/callback"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="https://api.yourdomain.com/api/agency/integrations/GOOGLE/callback"

# ─── Payments (Global) ──────────────────────────────────────
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# ─── Payments (Pakistan) ────────────────────────────────────
JAZZCASH_MERCHANT_ID="..."
JAZZCASH_PASSWORD="..."
JAZZCASH_INTEGRITY_SALT="..."
EASYPAISA_STORE_ID="..."
EASYPAISA_HASH_KEY="..."
COD_ENABLED=true
COD_MIN_AMOUNT=500
COD_MAX_AMOUNT=200000

# ─── Cloudinary ─────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# ─── Email ──────────────────────────────────────────────────
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="noreply@yourdomain.com"
EMAIL_PASSWORD="<app-password>"
ADMIN_EMAIL="admin@yourdomain.com"

# ─── Queue ──────────────────────────────────────────────────
QUEUE_ENABLED=true
QUEUE_PREFIX=styleai

# ─── Seed ───────────────────────────────────────────────────
SEED_ADMIN_EMAIL="admin@yourdomain.com"
SEED_ADMIN_PASSWORD="<strong-password>"
```

### `frontend/.env`

```env
VITE_API_URL="https://api.yourdomain.com"
VITE_PUBLIC_URL="https://app.yourdomain.com"
```

### `ai-services/.env`

```env
# ─── Security ───────────────────────────────────────────────
INTERNAL_KEY="<same-as-backend-AI_INTERNAL_KEY>"

# ─── LLM ────────────────────────────────────────────────────
LLM_PROVIDER="groq"                         # groq | gemini | ollama
GROQ_API_KEY="gsk_..."
GROQ_TEXT_MODEL="llama-3.3-70b-versatile"

# ─── Vision ─────────────────────────────────────────────────
VISION_PROVIDER="gemini"
GEMINI_API_KEY="AIza..."
GEMINI_VISION_MODEL="gemini-2.0-flash"

# ─── Image Generation ───────────────────────────────────────
HF_API_TOKEN="hf_..."

# ─── Local LLM (optional) ───────────────────────────────────
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="qwen2.5:7b"
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 LTS | Node 24 works but causes Vite/Rolldown hangs |
| Python | 3.13+ | |
| Docker Desktop | v2+ | For PostgreSQL + Redis |
| Ollama | Latest | Optional — local LLM inference |

### Step 1 — Clone

```bash
git clone https://github.com/your-username/styleai.git
cd styleai
```

### Step 2 — Start Infrastructure

```bash
docker-compose up -d
# Starts:
#   styleai-postgres  →  PostgreSQL 16 + pgvector  (port 5433)
#   styleai-redis     →  Redis 7                   (port 6379)

docker-compose ps   # verify both are healthy
```

### Step 3 — Backend

```bash
cd backend
cp .env.example .env          # fill in all values

npm install
npx prisma generate
npx prisma db push
npm run seed:admin            # creates SUPER_ADMIN from SEED_* env vars
npm run dev
# → Server running on port 4000
```

### Step 4 — AI Service

```bash
cd ai-services
python -m venv .venv
source .venv/bin/activate     # Windows: .\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
cp .env.example .env          # fill in all values

uvicorn app.main:app --reload --port 8000
# → Application startup complete
```

### Step 5 — Frontend

```bash
cd frontend
cp .env.example .env

npm install
npm run dev
# → VITE ready on port 3000
```

### Step 6 — Verify Everything Works

```bash
# Backend test suite (should print: Passed: 86 / Failed: 0)
cd backend
node src/scripts/test-everything.js

# AI service tests
cd ai-services
pytest tests/ -v -m "not slow"
```

### Optional — Prisma Studio

```bash
cd backend
npx prisma studio
# Opens database browser at http://localhost:5555
```

---

## 📡 API Reference

All routes are prefixed with `/api/v1`. Protected routes require `Authorization: Bearer <JWT>`.

| Domain | Endpoint Prefix |
|---|---|
| Authentication | `/api/v1/auth` |
| Users | `/api/v1/users` |
| Brands | `/api/v1/brands` |
| Products | `/api/v1/products` |
| Product AI Analysis | `/api/v1/products/:id/analyze` |
| Influencers | `/api/v1/influencers` |
| Influencer Search | `/api/v1/influencers/search` |
| Matching | `/api/v1/matching` |
| Match Recommendations | `/api/v1/matching/recommend` |
| Campaigns | `/api/v1/campaigns` |
| Offers | `/api/v1/offers` |
| Content Generation | `/api/v1/content/generate` |
| Image Generation | `/api/v1/images/generate` |
| Knowledge Base (RAG) | `/api/v1/knowledge` |
| Analytics | `/api/v1/analytics` |
| Wallet | `/api/v1/wallet` |
| Payments | `/api/v1/payments` |
| Billing | `/api/v1/billing` |
| Notifications | `/api/v1/notifications` |
| Admin | `/api/v1/admin` |
| AI Ops | `/api/v1/ai` |

### AI Service Endpoints (Internal — `X-Internal-Key` required)

| Endpoint | Purpose |
|---|---|
| `GET  /health` | Health check |
| `POST /api/v1/product/analyze` | Vision analysis → structured attributes |
| `POST /api/v1/product/content` | Description + SEO generation |
| `POST /api/v1/product/photography` | AI photography + angles |
| `POST /api/v1/product/variants` | Variant generation |
| `POST /api/v1/product/angles` | Shot angle recommendations |
| `POST /api/v1/match/influencers` | 6-dimension influencer matching |
| `POST /api/v1/content/platform` | Platform-specific ad copy |
| `POST /api/v1/embeddings/embed` | Vector embedding generation |
| `POST /api/v1/chat/text` | Text chat (assistant) |

---

## 🔒 Security

### Multi-Tenancy

Every database query is scoped by `organizationId` or `userId` at the Prisma ORM layer — not just the application layer. Brand A is architecturally prevented from accessing Brand B's products, campaigns, embeddings, or analytics.

### Payment Security

- **Stripe** — Webhook events verified via signature before processing.
- **JazzCash / Easypaisa** — Callbacks verified via HMAC hash comparison.
- **Wallet transactions** — Run inside ACID-compliant database transactions. `WalletTransaction` is the source of truth; `Wallet.balanceCache` is always derived, never trusted alone.
- **Idempotency keys** — Enforced on all payment operations to prevent double-spend.

### Auth & Access

| Control | Implementation |
|---|---|
| Password hashing | bcrypt (10 rounds) |
| JWT | HS256, 1h expiry + token versioning (logout-all-devices) |
| Rate limiting | Redis-backed on login, signup, and password reset |
| Account lockout | 5 failed attempts → 15-minute lock |
| CSRF | JWT-signed OAuth state (10-min expiry) |
| SQL injection | Prisma parameterizes all queries |
| Audit trail | `writeAudit()` on all sensitive operations |

### ⚠️ Known Security Gap — TanStack CVE-2026-102989

**Issue:** Unauthenticated reflected XSS in server-function responses.
**Patched in:** `@tanstack/react-start@1.168.60+`
**Current version:** `1.168.32` (stable but unpatched)
**Why not upgraded:** `1.168.60+` crashes SSR with `object is not iterable` (issue #8584).

**Mitigation plan:**
- Monitor for `1.168.61+` which is expected to fix both the crash and the CVE.
- Before public production launch: upgrade or add WAF rules + strict CSP headers.
- **Risk level:** Low for private/beta deployment. **Unacceptable for public launch.**

---

## 🧪 Test Suite

### Backend (`test-everything.js`)

```
══  1. Environment             ══  ✅
══  2. File Structure          ══  ✅  29 files verified
══  3. Database & Schema       ══  ✅  25 tables, all enums
══  4. Authentication          ══  ✅  JWT, roles, lockout
══  5. Payment Gateways        ══  ✅  Stripe + COD registered
══  6. Wallet                  ══  ✅  Credit · insufficient-balance reject
══  7. Test Data Setup         ══  ✅  Org, brand, 3 products
══  8. COD Order Flow          ══  ✅  Full lifecycle + wallet credit
══  9. Storefront Flow         ══  ✅  Apply → Approve → Visible → Toggle
══ 10. AI Service              ══  ✅  (requires AI service running)
══ 11. HTTP Endpoints          ══  ✅  (requires backend running)
══ 12. Cleanup                 ══  ✅

Result: Passed: 86  ·  Failed: 0
```

```bash
cd backend
node src/scripts/test-everything.js           # full run
node src/scripts/test-everything.js --skip-ai # skip AI integration
node src/scripts/test-everything.js --verbose # detailed output
```

### AI Service (pytest)

```bash
cd ai-services
pytest tests/ -v -m "not slow"
# Result: 10 passed, 1 deselected (slow marker)
```

### Frontend

```bash
cd frontend
npm run typecheck   # TypeScript validation
npm run lint        # ESLint
npm run build       # Production build verification
```

---

## 📊 Current Status & Roadmap

### Module Completion

| Module | Status |
|---|---|
| Authentication (JWT, OAuth, lockout, email verify) | ✅ Complete |
| Admin approval workflow (PENDING → APPROVED/REJECTED) | ✅ Complete |
| RBAC (6 roles, 37 permissions) | ✅ Complete |
| Product CRUD + Cloudinary upload | ✅ Complete |
| AI Product Analysis (Gemini Vision) | ✅ Complete |
| AI Description Generator | ✅ Complete |
| Influencer profiles + 10 platforms | ✅ Complete |
| AI Matching (6-dimension scoring) | ✅ Complete |
| Campaign lifecycle + content pipeline | ✅ Complete |
| Campaign chat (per-campaign WebSocket) | ✅ Complete |
| Wallet + escrow + dual-commission system | ✅ Complete |
| Stripe subscriptions + COD + JazzCash + Easypaisa | ✅ Complete |
| Agency multi-brand workspace | ✅ Complete |
| Meta Ads integration | ✅ Complete |
| B2C storefront + cart + checkout | ✅ Complete |
| SEO (JSON-LD, sitemap, robots, OG tags) | ✅ Complete |
| Admin panel (full) | ✅ Complete |
| Audit logs | ✅ Complete |
| RAG knowledge base | ✅ Complete |
| AI Photography | ⚠️ 60% — needs paid image-to-image API |
| Google Ads integration | ⚠️ Shell only — AdGroup + Keywords pending |
| Shopify / WooCommerce import | ❌ Not yet |

### Blockers for Public Launch

| Blocker | Resolution |
|---|---|
| TanStack XSS CVE-2026-102989 | Wait for `1.168.61+` or add WAF / strict CSP |
| Meta App Review | `ads_management` Advanced Access — submit for review |
| Google Ads API Access | Request Standard Access from Google |
| Stripe production keys | Requires legal entity (LLC or equivalent) |
| Permanent domain | Replace ngrok with real domain + Cloudflare |

### Roadmap

**P0 — Immediate**
- Manual smoke test of full admin approval flow
- Pin TanStack version in `package.json` (no `^` caret)

**P1 — 1–2 days**
- Email notification audit (21 templates)
- Auto-cancel stale `AWAITING_PAYMENT` orders (cron)
- Shipment tracking UI (`services/campaigns/shipping.js` exists — needs wiring)
- Google Ads full campaign (AdGroup + Keywords + RSA)

**P2 — Production Hardening**
- TanStack upgrade to `1.168.61+`
- Sentry + OpenTelemetry error tracking
- GitHub Actions CI/CD pipeline
- Switch `prisma db push` → `prisma migrate deploy`
- Docker Compose production config

**P3 — Post-Launch**
- TikTok Ads integration
- Fine-tuned fashion LLM (LoRA on Qwen2.5 / Llama-3)
- Campaign outcome prediction ML model
- A/B testing framework
- Advanced real-time collaboration

---

## 🧠 Key Design Decisions

| Decision | Rationale |
|---|---|
| **Approval field on `User`, not separate table** | Auth middleware runs on every request — O(1) field check vs. JOIN latency. Stripe/Shopify/AWS use this same pattern. |
| **`@default(APPROVED)` for existing users** | Zero disruption on migration — existing users never locked out when approval system goes live. |
| **SHOPPER bypasses approval** | B2C conversion killer if gated. Approval is for business entities only. |
| **Wallet ledger is source of truth** | `WalletTransaction` records every movement. `Wallet.balanceCache` is always derived, never the authority. |
| **Ads created PAUSED by default** | Prevents accidental live spend. Users activate manually. |
| **Payment Gateway class pattern** | Every gateway extends `PaymentGateway` abstract base class. Registry resolves by name. Adding a gateway = 1 file + 1 registry entry. |
| **Node is the only DB writer** | AI service is stateless compute. Keeps DB as single source of truth, avoids race conditions, enables clean audit trails. |
| **`styles.css` is single source of truth** | All design tokens in one file — no inline styles, no component-level CSS drift. |
| **TanStack `1.168.32` pinned (no `^`)** | `1.168.60+` patches XSS but crashes SSR. Locked until `1.168.61+` resolves both. |

---

## 📄 License

This project is **proprietary and confidential**.
All rights reserved © StyleAI. Unauthorized use, reproduction, or distribution is strictly prohibited.

---

<div align="center">

*Built for the future of fashion commerce.*

</div>