<div align="center">

<br/>

<h1>StyleAI</h1>

<p><strong>AI-Powered Fashion Commerce & Influencer Marketing Platform</strong></p>

<p>An end-to-end multi-tenant SaaS and B2C e-commerce ecosystem. Brands upload products, AI understands them, matches creators, generates content, and manages campaigns at scale — fully automated, end to end.</p>

<br/>

[![MVP Status](https://img.shields.io/badge/MVP-~95%25%20Complete-22c55e?style=flat-square)](https://github.com)
[![Backend Tests](https://img.shields.io/badge/Backend%20Tests-86%20Passed-22c55e?style=flat-square)](https://github.com)
[![AI Tests](https://img.shields.io/badge/AI%20Service%20Tests-10%20Passed-22c55e?style=flat-square)](https://github.com)
[![Node.js](https://img.shields.io/badge/Node.js-20%20LTS-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20+%20pgvector-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python%203.13-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)

<br/>

</div>

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Business Model](#business-model)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [User Roles](#user-roles)
- [Features](#features)
- [AI Pipeline](#ai-pipeline)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Security](#security)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [Design Decisions](#design-decisions)
- [License](#license)

---

## Overview

StyleAI is a production-grade platform that automates the entire influencer marketing lifecycle — from the moment a brand uploads a product image to the final campaign performance report. A dedicated Python AI microservice handles all intelligence: vision analysis, content generation, semantic search, influencer matching, and RAG-powered brand assistance.

The platform serves four distinct user types through a single codebase: brands running influencer campaigns, influencers managing their portfolio and earnings, agencies operating across multiple client brands, and shoppers purchasing through the public B2C storefront.

---

## How It Works

A brand uploads a product image. The AI vision model identifies category, colors, material, style, occasion, formality, and aesthetic — producing a validated structured output. From that single upload, the platform generates product descriptions, SEO content, photography shot lists, and vector embeddings for semantic search.

Those embeddings power the influencer matching engine, which scores candidates across six dimensions and returns a ranked list with numeric scores and natural-language explanations. The brand sends an offer, funds are held in escrow, and the campaign enters a structured content pipeline — raw submission, brand review, approval, and publish. Analytics and performance signals continuously improve future recommendations.

---

## Business Model

| Revenue Stream | Payer | Description |
|---|---|---|
| B2B SaaS | Brands, Agencies, Influencers | Tiered monthly subscriptions via Stripe |
| B2C E-commerce | Shoppers | Product purchases via card or Cash on Delivery |
| Ad Platform | Agencies | Managed Meta (Facebook/Instagram) and Google Ads for client brands |

---

## Architecture

StyleAI is composed of three independently deployable services that communicate over HTTP.

**Frontend** is a React 19 application with server-side rendering via TanStack Start. It serves a public storefront for shoppers, an authenticated SPA dashboard for brands, influencers, and agencies, and a full admin panel.

**Backend** is a Node.js and Express API that owns all business logic, database writes, authentication, payments, and real-time communication. It is the only service that writes to the database. All AI requests from the frontend pass through the backend before reaching the AI service — the frontend never calls the AI service directly.

**AI Service** is a stateless Python FastAPI microservice. It handles LLM calls, vision analysis, embeddings, influencer matching, and content generation. It performs no database writes and holds no application state.

**Infrastructure** consists of PostgreSQL 16 with the pgvector extension for relational data and vector storage, and Redis for caching and the BullMQ job queue.

### Core Rules

| Rule | Rationale |
|---|---|
| Frontend never calls the AI service directly | All AI traffic routes through the backend for auth, quota, and audit |
| AI service has no database access | Stateless compute only — the backend is the sole DB writer |
| AI output is always schema-validated | Raw LLM output is never executed or persisted |
| Every query is scoped by tenant | Multi-tenancy enforced at the ORM layer, not the application layer |
| Wallet ledger is the source of truth | The balance cache is always derived, never authoritative |
| Ads are created paused by default | Prevents accidental live spend — activation is always a deliberate action |

---

## Technology Stack

### Frontend

| Category | Technology |
|---|---|
| Framework | React 19 |
| Router and SSR | TanStack Router + TanStack Start |
| Build Tool | Vite + Rolldown |
| Styling | Tailwind CSS v4 — single source: `styles.css` |
| UI Components | shadcn/ui + Radix UI |
| Charts | Recharts |
| Data Fetching | TanStack Query |
| Forms | React Hook Form + Zod |
| Real-time | Socket.IO (WebSocket + SSE) |
| Language | TypeScript |

### Backend

| Category | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express 4 |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 + pgvector |
| Cache and Queue | Redis + BullMQ |
| Auth | JWT HS256 + bcrypt + token versioning |
| File Storage | Cloudinary |
| Email | SMTP in development, SendGrid or Resend in production |
| Payments | Stripe, Cash on Delivery, JazzCash, Easypaisa |

### AI Service

| Category | Technology |
|---|---|
| Runtime | Python 3.13 |
| Framework | FastAPI + Uvicorn |
| Text LLM — Cloud | Groq (`openai/gpt-oss-120b`, `openai/gpt-oss-20b` fallback) |
| Text LLM — Local | Ollama `qwen2.5:7b` — only active when `LLM_PROVIDER=ollama` |
| Vision | Gemini Vision `gemini-flash-latest` · Groq Vision `llama-4-scout-17b-16e-instruct` |
| Image Generation | HuggingFace FLUX `FLUX.1-Kontext-dev` · Pollinations AI (free fallback) |
| Embeddings | Gemini `gemini-embedding-001` |
| Matching Engine | Custom 6-dimension ML scoring with dynamic provider routing |

### External Integrations

| Service | Purpose |
|---|---|
| Meta Graph API | Facebook and Instagram Ads management |
| Google Ads API | Google Ads campaign creation |
| Stripe | Subscriptions, card payments, and webhooks |
| Cloudinary | Image storage and transformation |

---

## User Roles

The platform enforces six roles and 37 granular permissions.

| Role | Description |
|---|---|
| `SUPER_ADMIN` | Full platform control — user approvals, finance, AI ops, audit logs |
| `BRAND_OWNER` | Main paying customer — products, campaigns, influencers, analytics |
| `BRAND_TEAM_MEMBER` | Scoped access under a brand — Marketing, Content, Analyst, and similar |
| `INFLUENCER` | Content creator — receives offers, delivers content, manages earnings |
| `AGENCY` | Manages multiple client brands and runs ad campaigns |
| `SHOPPER` | End consumer — browses, adds to cart, and checks out |

### Admin Approval Workflow

All business-role signups (`BRAND_OWNER`, `INFLUENCER`, `AGENCY`) enter a pending state and require admin review before the account is active. The admin is notified via SSE, email, and dashboard badge. On approval or rejection, the user is notified immediately.

`SHOPPER` accounts bypass this gate entirely. Gating B2C purchases with an approval queue kills conversion.

---

## Features

### For Brands

**AI Product Upload.** Upload a product image and the vision model automatically identifies category, subcategory, colors, material, style, occasion, formality, and aesthetic — returning a validated structured output with no manual tagging required.

**AI Description Generator.** From the vision output, the platform generates a short description, long description, SEO title, meta description, keyword set, and FAQ block — all written in the brand's configured voice.

**AI Photography Studio.** Per product type, the system generates a shot-angle list covering recommended lighting, backgrounds, and lifestyle compositions. Image-to-image generation is available via HuggingFace FLUX with Pollinations AI as a free fallback.

**Influencer Discovery.** Search and filter the influencer database by niche, platform, follower count, engagement rate, geography, and audience demographics.

**AI Matching Engine.** The 6-dimension scoring model ranks influencers by compatibility with a specific product and brand profile. Each result includes a numeric score and a natural-language explanation.

**Campaign Management.** Full offer-to-completion lifecycle — send offers, hold escrow, track deliverables through a structured pipeline (raw upload, brand review, approval, publish), and monitor performance metrics.

**Platform Content Studio.** AI-generated ad copy optimized per platform — Instagram, TikTok, YouTube, Facebook, and blog.

**Brand AI Assistant.** Upload brand guidelines, lookbooks, or product catalogs. The RAG-powered assistant uses these documents as grounded context for every generation task, ensuring output stays on-brand.

**Recommendations Engine.** Signal-based suggestions derived from campaign history, offer outcomes, and performance data — improving over time as the brand runs more campaigns.

**Team and Role Management.** Invite team members with granular per-permission access control. Each member sees only the parts of the platform their role allows.

### For Influencers

**Profile and Portfolio.** Connect Instagram, TikTok, YouTube, and seven additional platforms with verified audience data including follower count, engagement rate, and demographics.

**Per-Platform Pricing.** Set custom rates for each content type on each connected platform.

**Offer Deal Flow.** Receive, review, accept, negotiate, or decline brand offers through a structured interface.

**Campaign Deliverables.** Submit raw content, receive brand feedback with revision rounds, and track approval stages in real time.

**Earnings Wallet.** Campaign payments are released from escrow automatically on content approval. Withdrawal requests are submitted and processed with admin confirmation.

### For Agencies

**Multi-Brand Workspace.** Manage multiple client brands from a single agency account. Context switches cleanly between brands without re-authentication.

**Meta Ads Integration.** Create and manage Facebook and Instagram ad campaigns directly from the platform. Campaigns are created in a paused state by default to prevent accidental spend.

**Google Ads.** Basic campaign creation is available. AdGroup and keyword management are in progress.

**Engagement Tracking.** Monitor content performance across all managed client brands from a single view.

### For Shoppers

**Public Storefront.** Server-side rendered product pages with full SEO — JSON-LD structured data, Open Graph tags, Twitter cards, and canonical URLs.

**AI-Curated Collections.** Editorial sections and influencer-styled product feeds, managed and published by the admin team.

**Cart and Checkout.** Guest-friendly cart that persists across sessions, with a full checkout flow including address management and order confirmation.

**Payment Methods.** Stripe for international card payments, JazzCash and Easypaisa for Pakistan, and Cash on Delivery.

**Order Tracking.** Real-time status from placement through confirmation, shipping, and delivery.

### For Admins

**User Approval Queue.** A dedicated dashboard for reviewing, approving, or rejecting pending business signups. Rejections require a reason which is communicated to the user.

**Platform Finance.** Commission rate management, full wallet oversight, withdrawal approvals, and a complete transaction ledger.

**AI Ops Dashboard.** Live view of API requests, token consumption, cost per model, latency, and error rates across all AI providers.

**Model Management.** Track model versions, accuracy scores, and evaluation results. Supports deploy and rollback workflows.

**Storefront Control.** Manage hero sections, editorial collections, featured brand slots, and homepage curation without a code deployment.

**Audit Logs.** An immutable event trail on all sensitive operations across the platform.

### SEO

The public storefront is fully optimized for search engines. `robots.txt` allows the public shop and blocks all dashboard and admin routes. `sitemap.xml` is dynamically generated for category and gender pages. JSON-LD structured data covers Organization, WebSite, Product, Breadcrumb, CollectionPage, and FAQPage schemas. All auth-only pages carry a `noindex` directive.

---

## AI Pipeline

### Product Intelligence

When a brand uploads a product image, the AI service runs vision analysis through Gemini Vision or Groq Vision, returning a Pydantic-validated structured object covering category, subcategory, colors, material, style, occasion, formality, aesthetic, gender, and estimated age group.

That output is passed to three parallel processes. The content generator uses a Groq LLM to produce title, descriptions, SEO content, and FAQs. The embedding service generates a vector representation stored in pgvector for semantic search and matching. The photography angle generator produces a shot list tailored to the product type and occasion.

### Influencer Matching

When a brand initiates matching for a product, the platform fetches the product's stored embedding from pgvector and runs it through the 6-dimension scoring engine:

1. Style compatibility — vector cosine similarity between product and influencer profile
2. Audience demographics alignment — overlap between product target and influencer audience
3. Engagement rate quality — adjusted for platform and follower tier
4. Historical campaign performance — weighted by recency
5. Niche and category match — semantic and categorical overlap
6. Price segment fit — alignment between product price point and influencer positioning

Each result returns a numeric score and a natural-language explanation.

### RAG Brand Knowledge Base

Brands upload documents — PDFs, DOCX files, brand guidelines, lookbooks. The chunker splits documents into overlapping segments. The embedder generates vectors stored in pgvector. When a user queries the Brand AI Assistant, the query is semantically expanded, run against pgvector for top-k retrieval, filtered through a reranker, and passed to the LLM as grounded context. The model responds only with information found in the brand's documents.

### Dynamic Provider Routing

The AI service includes a provider routing guard that prevents local model names from being sent to cloud APIs and cloud model names from being sent to Ollama. This eliminates a class of 404 errors that occur when provider configuration changes without updating model names.

### AI Safety

All LLM output is validated against a Pydantic or Zod schema before it enters any application logic. Raw model output is never executed, stored, or forwarded. If validation fails, the request fails cleanly with an error — no partial or malformed data reaches the database.

---

## Project Structure

```
styleai/
├── backend/
│   ├── prisma/
│   │   ├── schema/                    # Multi-file Prisma schema — 25+ tables
│   │   └── seed.js                    # Roles, permissions, and admin bootstrap
│   └── src/
│       ├── server.js                  # Express entry point and middleware mount
│       ├── config/                    # Database, cache, storage, payment gateway config
│       ├── controllers/               # Thin HTTP request handlers — 31 files
│       ├── middleware/                # Auth, RBAC, quota enforcement, file upload
│       ├── routes/                    # Express route definitions — 35+ files
│       ├── services/
│       │   ├── payments/              # Gateway abstraction — Stripe, COD, JazzCash, Easypaisa
│       │   ├── wallet/                # Ledger-based wallet engine and escrow
│       │   ├── knowledge/             # RAG pipeline — chunker, embedder, reranker
│       │   ├── matching/              # ML scoring engine with result caching
│       │   ├── assistant/             # Brand AI chat with RAG context
│       │   ├── notifications/         # SSE-based real-time notification system
│       │   ├── email/                 # 21 transactional email templates
│       │   ├── campaigns/             # Full campaign lifecycle — create through complete
│       │   ├── recommendations/       # Signal-based recommendation engine
│       │   └── ...                    # Additional domain services
│       └── utils/                     # JWT helpers, SKU generation
│
├── frontend/
│   └── src/
│       ├── routes/
│       │   ├── index.tsx              # Public storefront — SSR
│       │   ├── dashboard.tsx          # Role-adaptive authenticated workspace
│       │   ├── admin/                 # Full admin panel — users, finance, AI ops, audit
│       │   ├── campaigns.*.tsx        # Campaign management pages
│       │   ├── studio.*.tsx           # Content and photography studio
│       │   └── ...                    # All other route pages
│       ├── components/
│       │   ├── ui/                    # shadcn/ui primitives
│       │   └── ...                    # Feature-level components
│       ├── lib/                       # API clients, auth context, type definitions
│       └── styles.css                 # Single source of truth for all design tokens
│
├── ai-services/
│   └── app/
│       ├── main.py                    # FastAPI application entry point
│       ├── api/routes/                # Endpoints — health, matching, content, vision
│       ├── services/                  # LLM routing, vision, embedding, matching, content
│       ├── prompts/                   # Domain-organized prompt templates
│       └── schemas/                   # Pydantic request and response schemas
│
├── docker-compose.yml                 # Local development — PostgreSQL and Redis
├── docker-compose.prod.yml            # Production deployment configuration
└── README.md
```

---

## Getting Started

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 LTS | Newer major versions may cause Vite and Rolldown compatibility issues |
| Python | 3.13 or later | Required for the AI service |
| Docker Desktop | v2 or later | Runs PostgreSQL and Redis locally |
| Ollama | Latest | Optional — only needed for local LLM inference |

### Step 1 — Clone

```bash
git clone https://github.com/your-username/styleai.git
cd styleai
```

### Step 2 — Start Infrastructure

```bash
docker-compose up -d
docker-compose ps
```

This starts PostgreSQL 16 with the pgvector extension and Redis. Confirm both services show as healthy before proceeding.

### Step 3 — Backend

```bash
cd backend
cp .env.example .env

npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

`npm run seed` creates the roles, permissions, and the initial admin account from the values in your `.env` file.

### Step 4 — AI Service

```bash
cd ai-services
python -m venv .venv

# macOS and Linux
source .venv/bin/activate

# Windows
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### Step 5 — Frontend

```bash
cd frontend
cp .env.example .env

npm install
npm run dev
```

### Step 6 — Verify

```bash
# Backend — should report 86 passed, 0 failed
cd backend
node src/scripts/test-everything.js

# AI service — should report 10 passed
cd ai-services
pytest tests/ -v -m "not slow"
```

### Optional — Prisma Studio

```bash
cd backend
npx prisma studio
```

Opens a visual database browser useful for inspecting seeded data and debugging schema changes.

---

## Environment Variables

Each service ships with an `.env.example` file that documents every required variable with descriptions. Copy it to `.env` and fill in the values. Never commit `.env` files — they are excluded via `.gitignore`.

The table below lists variable categories, not individual variable names, to avoid exposing internal configuration surface.

### Backend

| Category | What It Covers |
|---|---|
| Database | PostgreSQL connection string and schema name |
| Cache | Redis connection string |
| Server | Environment mode and allowed origins |
| Auth | JWT signing secret and OAuth state secret |
| AI Service | Internal service base URL and shared authentication secret |
| OAuth | Meta and Google app credentials and redirect URIs |
| Stripe | Secret key and webhook signing secret |
| JazzCash | Merchant credentials and integrity salt |
| Easypaisa | Store ID and hash key |
| Cash on Delivery | Enabled flag, minimum and maximum order amounts |
| Cloudinary | Cloud name, API key, and API secret |
| Email | SMTP host, port, user, and password or API key |
| Queue | Enabled flag and key prefix |
| Seed | Admin email and password for initial bootstrap |

### AI Service

| Category | What It Covers |
|---|---|
| Security | Shared internal key — must match the backend value |
| LLM Provider | Provider selection (`groq`, `gemini`, or `ollama`) and API key |
| Vision | Vision provider, Gemini API key, and model name |
| Image Generation | HuggingFace API token |
| Pollinations | Base URL for the free image generation fallback |
| Ollama | Base URL and model name — only needed when using local inference |

### Frontend

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |
| `VITE_PUBLIC_URL` | Frontend public base URL |

---

## API Reference

All routes are prefixed with `/api/v1`. Authenticated routes require an `Authorization: Bearer <token>` header.

### Backend

| Domain | Prefix |
|---|---|
| Authentication | `/api/v1/auth` |
| Users | `/api/v1/users` |
| Brands | `/api/v1/brands` |
| Products | `/api/v1/products` |
| Product AI Analysis | `/api/v1/products/:id/analyze` |
| Influencers | `/api/v1/influencers` |
| Matching | `/api/v1/matching` |
| Campaigns | `/api/v1/campaigns` |
| Offers | `/api/v1/offers` |
| Content Generation | `/api/v1/content/generate` |
| Knowledge Base | `/api/v1/knowledge` |
| Analytics | `/api/v1/analytics` |
| Wallet | `/api/v1/wallet` |
| Payments | `/api/v1/payments` |
| Billing | `/api/v1/billing` |
| Notifications | `/api/v1/notifications` |
| Admin | `/api/v1/admin` |
| AI Operations | `/api/v1/ai` |

### AI Service

The AI service is internal-only. All requests require a shared authentication key set in the service's environment configuration. No AI service endpoints are publicly reachable.

| Endpoint | Purpose |
|---|---|
| `GET /health` | Service health check |
| `POST /api/v1/product/analyze` | Vision analysis — returns structured product attributes |
| `POST /api/v1/product/content` | Description, SEO, and FAQ generation |
| `POST /api/v1/product/photography` | Shot-angle recommendations |
| `POST /api/v1/product/variants` | Product variant generation |
| `POST /api/v1/match/influencers` | 6-dimension influencer matching and scoring |
| `POST /api/v1/content/platform` | Platform-specific ad copy generation |
| `POST /api/v1/embeddings/embed` | Vector embedding generation |
| `POST /api/v1/chat/text` | Text-based brand assistant response |

---

## Security

### Multi-Tenancy

Every database query is scoped to a tenant at the ORM layer. Brand A cannot access Brand B's products, campaigns, embeddings, or analytics — not because the application checks permissions, but because the query predicate makes it structurally impossible.

### Payment Integrity

Stripe webhook events are verified by signature before any processing begins. JazzCash and Easypaisa callbacks are verified via HMAC hash comparison. All wallet operations run inside ACID-compliant database transactions. Idempotency keys are enforced on every payment operation to prevent double-processing. The `WalletTransaction` table is the source of truth — the balance cache is always a derivative and is never the authority for financial decisions.

### Authentication and Access Control

| Control | Detail |
|---|---|
| Password hashing | bcrypt |
| JWT | Short-lived tokens with token versioning — supports logout across all devices |
| Rate limiting | Redis-backed on login, signup, and password reset endpoints |
| Account lockout | Temporary lockout after repeated authentication failures |
| CSRF protection | JWT-signed OAuth state tokens with short expiry |
| SQL injection | All queries parameterized through Prisma ORM — no raw string interpolation |
| Audit trail | Immutable event log on all sensitive operations — user approvals, financial actions, admin changes |

### Dependency Management

Frontend dependencies are pinned to exact versions with no semver caret ranges. This prevents silent upgrades to patch releases that may introduce regressions. Any version bump is an explicit, reviewed change.

---

## Testing

### Backend Test Suite

```bash
cd backend

# Full suite
node src/scripts/test-everything.js

# Skip AI service integration checks
node src/scripts/test-everything.js --skip-ai

# Detailed per-check output
node src/scripts/test-everything.js --verbose
```

The suite runs 12 test groups covering environment validation, file structure, database schema and enums, JWT and RBAC, payment gateway registration, wallet credit and insufficient-balance handling, test data setup, COD order lifecycle, storefront visibility flow, AI service integration, HTTP endpoint connectivity, and teardown.

**Current result: 86 passed, 0 failed.**

### AI Service

```bash
cd ai-services
pytest tests/ -v -m "not slow"
```

**Current result: 10 passed.**

### Frontend

```bash
cd frontend

# TypeScript validation
npm run typecheck

# ESLint
npm run lint

# Production build check
npm run build
```

---

## Roadmap

### Module Status

| Module | Status |
|---|---|
| Authentication — JWT, lockout, email verification | Complete |
| Admin approval workflow | Complete |
| RBAC — 6 roles, 37 permissions | Complete |
| Product CRUD and cloud image upload | Complete |
| AI product analysis — vision | Complete |
| AI description generator | Complete |
| Influencer profiles — 10 platform integrations | Complete |
| AI matching — 6-dimension scoring | Complete |
| Campaign lifecycle and content pipeline | Complete |
| Campaign chat over WebSocket | Complete |
| Wallet, escrow, and commission system | Complete |
| Stripe, COD, JazzCash, and Easypaisa | Complete |
| Agency multi-brand workspace | Complete |
| Meta Ads integration | Complete |
| B2C storefront, cart, and checkout | Complete |
| SEO — JSON-LD, sitemap, OG tags | Complete |
| Admin panel — full feature set | Complete |
| Audit logs | Complete |
| RAG knowledge base | Complete |
| AI photography and image-to-image — Pollinations fallback active | Complete |
| Google Ads — AdGroup and keyword management | In progress |
| Shopify and WooCommerce product import | Not started |

### Pre-Launch Requirements

| Item | Required Action |
|---|---|
| Frontend dependency security patch | Upgrade TanStack Start once upstream SSR regression is resolved |
| Meta App Review | Submit for `ads_management` Advanced Access |
| Google Ads API | Apply for Standard Access |
| Stripe production activation | Complete business entity verification |
| Production domain | Configure DNS, TLS termination, and CDN |

### Near-Term Development

- End-to-end smoke test of the full admin approval flow
- Audit of all 21 transactional email templates for content and deliverability
- Cron job to auto-cancel stale pending-payment orders
- Shipment tracking UI — backend service is complete, frontend wiring is pending
- Google Ads full campaign with AdGroup and Responsive Search Ads

### Post-Launch

- Sentry and OpenTelemetry for error tracking and distributed tracing
- GitHub Actions CI/CD pipeline with automated test gates
- Migration from `prisma db push` to versioned `prisma migrate deploy`
- TikTok Ads integration
- Fine-tuned fashion LLM via LoRA on Qwen2.5
- Campaign outcome prediction model
- A/B testing framework for content variants

---

## Design Decisions

| Decision | Rationale |
|---|---|
| Approval status as a field on the User model | Auth middleware runs on every request. A single field read is O(1). A join to a separate approvals table is not. This is the same pattern used by Stripe, Shopify, and AWS Cognito. |
| Existing users default to approved | Zero-disruption migration. No existing user is locked out when the approval system activates on a live database. |
| Shoppers bypass the approval gate | B2C purchase conversion is incompatible with an async approval queue. The gate exists for business entities only. |
| Wallet ledger as the source of truth | Every balance movement is recorded as an immutable `WalletTransaction`. The cached balance on the `Wallet` model is always derived and never trusted alone for financial decisions. |
| Ads created in a paused state | Prevents accidental live spend during campaign setup. Activation requires an explicit user action after reviewing all settings. |
| Payment gateway class abstraction | Every gateway — Stripe, JazzCash, Easypaisa, COD — extends a shared abstract base class and registers itself in a central registry. Adding a new payment method requires one implementation file and one registry entry. No other files change. |
| AI service has no database access | The backend is the single DB writer. This eliminates race conditions, simplifies audit trails, and makes the AI service trivially replaceable or horizontally scalable. |
| Single `styles.css` for all design tokens | No inline styles, no CSS modules, no component-level drift. One file governs the entire visual system. Any designer can find any token without reading component code. |
| Frontend versions pinned without semver caret | Prevents silent upgrades to patch releases that break SSR. Every version bump is a deliberate, reviewed change with a known diff. |
| Dynamic AI provider routing guard | Prevents local model names from being forwarded to cloud APIs and cloud model names from being sent to Ollama. Eliminates a class of 404 errors that surface when provider configuration changes without a corresponding model name update. |

---

## License

This project is proprietary and confidential. All rights reserved © StyleAI. Unauthorized use, reproduction, or distribution is strictly prohibited.

---

<div align="center">
<sub>Built for the future of fashion commerce.</sub>
</div>