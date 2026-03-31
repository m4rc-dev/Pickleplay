# HomesPhNews Integration Audit

This document summarizes the current state of the HomesPhNews External API integration in the Pickleplay web app, identifies gaps against the partner contract defined in `External.MD`, and lists actionable work items.

---

## Current State

### What Already Exists

| Component | Location | Description |
|-----------|----------|-------------|
| Environment variables | `.env` | `HOMESPH_NEWS_API_URL` and `HOMESPH_NEWS_API_KEY` are configured |
| Backend proxy | `server.js` (lines 755–829+) | Express routes that forward requests to HomesPhNews API and expose `/api/v1/news/articles` to the frontend |
| News feed UI | `components/News.tsx` | Full news listing page with article detail view |
| Community sidebar | `components/community/Community.tsx` | "Latest news" widget that fetches from `/api/v1/news/articles` |
| Routes | `App.tsx` | `/news`, `/news/:slug`, `/news/:legacyArticleId/:slug` |

---

## Issues Found

### 1. Auth Header Name Mismatch (Critical)

**Problem:** `External.MD` specifies the header must be `X-Site-Key`, but `server.js` sends `X-Site-Api-Key`.

**Location:** `server.js` line 760

```js
// Current (incorrect)
'X-Site-Api-Key': NEWS_API_KEY,

// Should be
'X-Site-Key': NEWS_API_KEY,
```

**Impact:** Requests may be returning `401 API Key missing` because the API does not recognize the header name.

---

### 2. `content_blocks` Rendering Not Implemented (Critical)

**Problem:** The API returns article bodies as `content_blocks` (a JSON array of structured blocks). There is no top-level `content` or `body` HTML string in the external payload. However, `News.tsx` only reads `raw.body || raw.content`, completely ignoring `content_blocks`.

**Location:** `components/News.tsx` line 96

```ts
body: raw.body || raw.content || '',
```

**Impact:** Article bodies are likely empty or incomplete. The `formatArticleBody` function has nothing meaningful to render.

**Required work:**
- Parse `content_blocks` from the API response
- Build a renderer that handles these block types:
  - `text` — `block.content.text` (HTML string)
  - `image` / `centered-image` — `block.content.src`, `block.content.caption`
  - `left-image` / `right-image` — `block.content.image` + `block.content.text`
  - `grid` — `block.content.images` (array of URLs)
  - `split-left` / `split-right` — `block.content.image` + `block.content.text`
  - `dynamic-images` — `block.content.images` (array of URLs)
- Apply `block.settings` (textAlign, fontSize, color, fontWeight, isItalic, isUnderline, listType)

---

### 3. Single-Article Endpoint Not Used (High)

**Problem:** The API provides `GET /api/external/articles/{identifier}` to fetch a single article by UUID or slug. The current code does not use it. Instead, `findNewsArticleById` and `findNewsArticleBySlug` in `server.js` iterate through every page of the list endpoint to find a match.

**Location:** `server.js` lines 800–829

**Impact:** Fetching a single article is extremely slow, especially when the article is on a later page. It also makes unnecessary API calls.

**Fix:** Call `GET {NEWS_API_URL}/api/external/articles/{slug}` directly.

---

### 4. `summary` Field Not Mapped (High)

**Problem:** The API returns `summary` as a key article field (used for excerpts/descriptions). The `normalizeArticle` function in `News.tsx` does not read `summary` — it relies on `body`/`content` which are likely empty (see issue #2).

**Location:** `components/News.tsx` — `normalizeArticle` and `buildExcerpt` functions

**Fix:** Include `raw.summary` as a fallback in `buildExcerpt` and in the normalization logic.

---

### 5. Missing Filter Query Parameters (Medium)

**Problem:** The API supports filtering by `search`/`q`, `country`, `province`, `city`, `topic`, and `per_page`/`limit`. The proxy in `server.js` only forwards `page` and `category`.

**Location:** `server.js` — `fetchNewsArticlesPage` function (line 764)

**Fix:** Forward all supported query parameters from the frontend through the proxy to the API.

---

### 6. Metadata Endpoints Not Implemented (Medium)

**Problem:** The API provides endpoints for populating filter dropdowns, but none of them have proxy routes or frontend integration.

| Endpoint | Purpose |
|----------|---------|
| `GET /api/external/categories` | Category dropdown data |
| `GET /api/external/countries` | Country dropdown data |
| `GET /api/external/provinces?country_id=` | Province dropdown (filtered by country) |
| `GET /api/external/cities?country_id=&province_id=` | City dropdown (filtered by country/province) |

**Fix:** Add proxy routes in `server.js` and use them to build filter dropdowns in `News.tsx`.

---

### 7. Restaurants Endpoint Not Implemented (Low)

**Problem:** `GET /api/external/restaurants` is documented in the partner contract but has no proxy route, service, component, or page.

**Details:** Supports filtering by `search`, `country`, `city`, `cuisine_type`/`topic`, and pagination via `per_page`/`limit` and `page`.

**Decision needed:** Determine whether restaurant listings are relevant to Pickleplay. If yes, build out a proxy route, service, and UI page.

---

### 8. Subscribe Endpoint Not Implemented (Low)

**Problem:** `POST /api/external/subscribe` for newsletter subscriptions from partner widgets is documented but not implemented.

**Details:** Accepts `email`, `categories[]`, `countries[]`, `company_name`, `features`, `time`, and optional `logo` file upload.

**Decision needed:** Determine whether a subscription widget is needed. If yes, build a proxy route and form component.

---

### 9. No Dedicated Service Module (Low)

**Problem:** All HomesPhNews logic lives inline in `server.js` (backend) and `News.tsx` (frontend). Every other feature in the app has a dedicated service file under `services/` (e.g., `services/tournaments.ts`, `services/matches.ts`).

**Fix:** Extract news API calls and types into `services/news.ts` for consistency and maintainability.

---

## Priority Matrix

| Priority | Issue | Effort |
|----------|-------|--------|
| Critical | #1 — Fix auth header (`X-Site-Api-Key` → `X-Site-Key`) | Small (one-line change) |
| Critical | #2 — Implement `content_blocks` rendering | Large (new component + block type handling) |
| High | #3 — Use single-article endpoint | Medium (refactor proxy logic) |
| High | #4 — Map `summary` field | Small (add fallback in normalizer) |
| Medium | #5 — Forward all filter query params | Medium (proxy + frontend updates) |
| Medium | #6 — Add metadata endpoints for filter dropdowns | Medium (new proxy routes + dropdown components) |
| Low | #7 — Restaurants endpoint + UI | Large (new feature) |
| Low | #8 — Subscribe endpoint + widget | Medium (new feature) |
| Low | #9 — Extract into `services/news.ts` | Small (refactor) |

---

## Recommended Implementation Order

1. Fix the auth header (immediate, one-line fix)
2. Map `summary` field in article normalization
3. Use the single-article endpoint for detail views
4. Build `content_blocks` renderer for article bodies
5. Forward all filter params and add metadata endpoint proxies
6. Build filter dropdown UI using metadata endpoints
7. Evaluate and optionally implement restaurants and subscribe features
8. Refactor into `services/news.ts`

---

## Reference Files

| File | Role |
|------|------|
| `External.MD` | Partner API contract from HomesPhNews |
| `.env` | API URL and key configuration |
| `server.js` | Backend proxy (Express) |
| `components/News.tsx` | News feed and article detail UI |
| `components/community/Community.tsx` | Community sidebar news widget |
| `App.tsx` | Route definitions |
