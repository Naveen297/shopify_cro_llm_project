# Shopify CRO Opportunity Engine

Evidence-grounded conversion-rate-optimization audits for Shopify storefronts. Point it at any store URL and it samples the real catalog, collections, product pages, and cart, extracts deterministic facts, and asks an LLM to reason over that evidence — never guess — to produce ranked, actionable CRO findings with experiment briefs.

No screenshots, no vibes-based recommendations. Every finding is required to cite a literal fact pulled from the store itself.

## Table of contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Using the app](#using-the-app)
- [How the evidence pipeline works](#how-the-evidence-pipeline-works)
- [LLM grounding rules](#llm-grounding-rules)
- [Scoring](#scoring)
- [Scripts](#scripts)
- [Testing](#testing)
- [Assumptions](#assumptions)
- [Known limitations](#known-limitations)

## What it does

Give the engine a Shopify domain (and optionally a competitor's domain) and it will:

1. Confirm the target is actually a Shopify storefront.
2. Crawl its public storefront JSON and HTML — catalog, collections, sampled PDPs, homepage, and cart.
3. Turn that raw data into a structured set of deterministic facts (image counts, thin descriptions, out-of-stock ratios, missing trust copy, filter/sort availability, review-app signals, and more).
4. Send those facts to an LLM, which reasons over them and returns prioritized CRO findings, each tied to a specific piece of evidence.
5. Score every finding with a transparent `impact × confidence ÷ effort` formula, computed in code — the model never sets the final score.
6. Optionally repeat the process for a competitor and surface head-to-head gaps.

The result is a ranked list of opportunities across five surfaces — catalog, collections, PDP, cart, and merchandising — plus ready-to-run experiment briefs for the top findings.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS, lucide-react icons |
| Backend | Node.js + Express (TypeScript), run with `tsx` |
| Storefront fetching | Native `fetch` with timeouts, Cheerio for HTML parsing |
| LLM | Anthropic Claude (`@anthropic-ai/sdk`), configurable model |
| Validation | Zod schemas shared between client and server |
| Testing | Vitest |

**Why Express instead of Next.js?** This project needs a focused server-side proxy, deterministic analysis modules, and a hard boundary around the LLM call and API key — not routing or SSR. Vite keeps the client fast and simple; Express owns every external fetch and the Anthropic call so secrets never reach the browser bundle.

## Project structure

```
.
├── index.html                  Vite entry HTML (loads Inter font, mounts #root)
├── src/
│   ├── main.tsx                React root
│   ├── App.tsx                 Top-level state + layout orchestration
│   ├── styles.css              Tailwind entry + global polish (scrollbars, selection)
│   ├── shared/
│   │   └── schemas.ts          Zod schemas & types shared by client and server
│   ├── lib/
│   │   └── format.ts           Small formatting/UI helpers
│   └── components/
│       ├── Header.tsx          Sticky top bar
│       ├── AuditForm.tsx       Hero + store/competitor URL form
│       ├── LoadingPanel.tsx    Multi-stage progress indicator
│       ├── ErrorPanel.tsx      Error state (with NON_SHOPIFY messaging)
│       ├── EmptyState.tsx      Pre-audit placeholder
│       ├── SummaryHeader.tsx   Readiness gauge + top-level stats
│       ├── ReadinessGauge.tsx  Circular 0–100 readiness meter
│       ├── SurfaceFilter.tsx   Findings filter pills
│       ├── FindingCard.tsx     Individual ranked finding
│       ├── ScoreMeter.tsx      Impact / confidence / effort meter
│       ├── ExperimentBriefs.tsx
│       └── CompetitorPanel.tsx
├── server/
│   ├── index.ts                Express app + /api/audit route
│   ├── fetchers/shopify.ts     Shopify JSON/HTML fetching, timeouts, sampling caps
│   ├── analyzers/storeEvidence.ts  Pure evidence extraction from raw data
│   ├── llm/
│   │   ├── prompts.ts          System + user prompt construction
│   │   └── anthropic.ts        Anthropic call, JSON extraction, Zod validation, repair retry
│   ├── scoring/priority.ts     Deterministic priority scoring
│   └── utils/                  errors.ts, http.ts, url.ts
└── tests/
    ├── analyzer.test.ts
    └── scoring.test.ts
```

## Getting started

**Prerequisites:** Node.js 18.18+ and an Anthropic API key.

```bash
npm install
cp .env.example .env
# add your ANTHROPIC_API_KEY to .env
npm run dev
```

This starts both processes concurrently:

- Frontend — `http://127.0.0.1:5173`
- Backend API — `http://127.0.0.1:8787`

Open the frontend URL, enter a Shopify store URL, and run an audit.

## Environment variables

Set these in `.env` (see `.env.example`):

| Variable | Required | Description |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key. The server refuses to run an audit without it. |
| `ANTHROPIC_MODEL` | No | Model override. Defaults to `claude-3-5-sonnet-latest`. |
| `PORT` | No | Backend port. Defaults to `8787`. |

## Using the app

1. Enter a **Store URL** (e.g. `https://brand.com`). A **Competitor URL** is optional and unlocks the competitor gap panel.
2. Click **Run audit**. The loading panel walks through six pipeline stages in real time.
3. Review the summary — headline, readiness score (0–100), and top themes.
4. Filter findings by surface (catalog, collections, PDP, cart, merchandising) using the pill filters.
5. Each finding card shows impact, confidence, and effort meters plus the exact evidence and recommendation behind it.
6. Scroll down for **experiment briefs** (ready-to-run A/B test outlines for the top 5 findings) and, if provided, the **competitor gap** comparison.

If the target URL isn't a detectable Shopify storefront, the app returns a `NON_SHOPIFY` error instead of guessing at findings.

## How the evidence pipeline works

1. **Normalize** the user-provided URL to a storefront origin.
2. **Fetch Shopify-first structured data:**
   - `/products.json?limit=250&page=N`, capped at 500 products.
   - `/collections.json?limit=250`.
   - `/collections/{handle}/products.json` for up to 10 sampled collections.
   - `/products/{handle}.json` and PDP HTML for up to 8 sampled products.
   - Homepage HTML, `/cart`, and `/cart.json`.
3. **Confirm Shopify** before auditing. If product JSON is unavailable and no Shopify HTML/header markers are present, the API returns `NON_SHOPIFY` instead of guessing.
4. **Compute deterministic facts:** image counts, thin descriptions, out-of-stock ratio, tag coverage, compare-at pricing, collection size/copy, filter/sort detection, JSON-LD coverage, review-app signals, cart free-shipping messaging, upsell/trust signals, and search/nav/homepage merchandising signals.
5. **Send the evidence bundle and literal fact list** to Anthropic.
6. **Validate the model response with Zod.** If malformed, retry once with a repair prompt. Raw model JSON is never trusted without schema validation.
7. **Compute `priorityScore` in code** and sort findings descending.

Prompt/response logs are written to `.audit-logs/` for auditability and are git-ignored.

## LLM grounding rules

The LLM is used purely as a reasoning layer, never as an extractor:

- It receives precomputed evidence and must cite one literal fact in every finding.
- It does **not** compute priority scores — the server always does that.
- It is explicitly forbidden from inventing metrics, apps, counts, or generic best-practice advice.
- Confidence is expected to be lower when evidence comes from small samples or ambiguous HTML.

## Scoring

Findings are ranked with a transparent weighted ICE variant:

```ts
priorityScore = (impact * confidence) / effort
```

This keeps high-impact, high-confidence, low-effort work at the top and makes the tradeoff legible in the UI. With real analytics in place, the `impact` input would be replaced by observed funnel leakage, revenue/session opportunity, traffic share by template, and experiment history.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Runs frontend (Vite) and backend (tsx watch) concurrently |
| `npm run dev:client` | Frontend only |
| `npm run dev:server` | Backend only |
| `npm run build` | Type-checks (`tsc --noEmit`) and builds the production frontend bundle |
| `npm run test` | Runs the Vitest suite |
| `npm run preview` | Serves the production build locally |

## Testing

```bash
npm run test
npm run build
```

Tests cover the deterministic evidence analyzer and the priority scoring function — the two modules whose correctness the whole audit depends on.

## Assumptions

- Shopify JSON endpoints are publicly reachable for the audited store.
- Sampling 8 PDPs and 10 collections is enough to identify directional CRO opportunities without making slow stores hang.
- HTML detection for apps, trust copy, filters, and cart incentives is heuristic because themes and apps vary widely.
- Anthropic is the configured provider; the model can be changed with `ANTHROPIC_MODEL`.

## Known limitations

- Some stores block JSON endpoints or bot-like requests; the tool fails gracefully but cannot bypass those controls.
- Cart analysis uses an empty-cart context, so checkout steps and post-add cart drawers aren't fully observable.
- Above-the-fold and visual layout quality are inferred from markup/text, not screenshot rendering.
- Product reviews can exist without JSON-LD or a detectable app script; those cases lower confidence rather than being missed entirely.
- Competitor comparison is optional and intentionally lightweight so it doesn't bloat the core audit flow.
# shopify_cro_llm_project
