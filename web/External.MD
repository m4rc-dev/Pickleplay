# HomesPhNews External API (Partner Integration Guide)

This document is for external partner sites consuming the `/api/external/*` endpoints.
It focuses on "what to call" and "how to render" for a partner frontend integration.

---

## Getting Started (Partner)

1. Get your partner `API key` from HomesPhNews admin (site must be marked `active`).
2. Use the base URL for your environment (see `Base URLs` below).
3. Authenticate every request using `X-Site-Key: {your_api_key}` (see `Authentication` below).
4. Recommended security: if calling from a browser would expose your API key in the Network tab, call the API through your own backend proxy instead.

---

## Base URLs

| Environment | Base URL |
|---|---|
| Production | `https://homesphnews-api-394504332858.asia-southeast1.run.app/api` |
| Local (server) | `http://127.0.0.1:8000/api` |

All partner endpoints live under:

`{baseUrl}/api/external`

---

## Authentication (External Partner)

Partner sites integrate via API key.
The API uses the `site.auth` middleware which reads the `X-Site-Key` header to identify the requesting site.

### Required header

| Header | Value |
|---|---|
| `X-Site-Key` | Your partner site API key |

Example (generic):

```bash
curl "{baseUrl}/api/external/articles?page=1" \
  -H "X-Site-Key: YOUR_SITE_KEY"
```

### Origin validation (production)

When the request includes an `Origin` header (typical for browser requests), the API validates that the origin domain matches the registered `site_url` for your API key.
If it does not match, you may receive `403 Unauthorized Origin`.

### Common error responses

| Status | Error | Meaning |
|---|---|---|
| `401` | `API Key missing` | `X-Site-Key` header not provided |
| `403` | `Invalid or Suspended API Key` | Key not found or site not active |
| `403` | `Unauthorized Origin` | `Origin` header does not match your registered `site_url` (only when `Origin` header exists) |

---

## Endpoints Overview

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/external/articles` | List/filter published articles |
| `GET` | `/api/external/articles/{identifier}` | Single article by UUID or slug |
| `GET` | `/api/external/restaurants` | List/filter published restaurants |
| `POST` | `/api/external/subscribe` | Register subscription from partner widget |
| `GET` | `/api/external/categories` | Active categories (dropdown data) |
| `GET` | `/api/external/countries` | Active countries (dropdown data) |
| `GET` | `/api/external/provinces` | Provinces (optionally filtered by country) |
| `GET` | `/api/external/cities` | Cities (optionally filtered by country and/or province) |

---

## GET `/api/external/articles`

Returns paginated articles published to your partner site.
Uses the partner-specific article payload shape (based on `ExternalArticleResource`).

### Query parameters

| Parameter | Type | Description |
|---|---|---|
| `search` / `q` | string | Server-side LIKE search on `title`, `summary`, `keywords`, and `topics` (does NOT search `content_blocks`) |
| `category` | string | Exact match on article category (e.g. `Business & Economy`) |
| `country` | string | Exact match on article country (e.g. `Philippines`) |
| `province` | integer | Filter by `province_id` |
| `city` | integer | Filter by `city_id` |
| `topic` | string | Matches one element inside JSON `topics` using `JSON_CONTAINS(topics, json_encode($topic))` |
| `per_page` / `limit` | integer | Results per page (server clamps to `1..100`), default: `20` |
| `page` | integer | Page number, default: `1` |

Sort order:
`published_at` descending, then `created_at` descending.

### Content blocks search (important)

There is currently **no** query parameter that searches within `content_blocks` for `/api/external/articles`.
Filtering/search is limited to:
- `search` / `q` across `title`, `summary`, `keywords`, `topics`
- exact filters (`category`, `country`, `province`, `city`)
- `topic` (JSON element match inside `topics`)

### Response shape (example)

```json
{
  "site": { "name": "...", "url": "...", "description": "..." },
  "data": {
    "data": [ { "id": "...", "slug": "...", "title": "...", "..." } ],
    "current_page": 1,
    "per_page": 20,
    "total": 58,
    "last_page": 3,
    "from": 1,
    "to": 20
  }
}
```

### Article object fields (high level)

Key fields you can expect:
`id`, `slug`, `title`, `summary`, `category`, `country`, `status`, `published_at`, `created_at`,
`views_count`, `image`, `location`, `description`, `date`, `views`, `published_sites`,
`topics`, `keywords`, `content_blocks`, `author`, `province_id`, `city_id`,
`province_name`, `city_name`.

Note:
There is no separate top-level flattened `content` string in the current payload.
Article body rendering is handled via `content_blocks` (see "Article body: HTML rendering" section below).

### Example request

```bash
curl "{baseUrl}/api/external/articles?page=1&category=Healthcare&country=Philippines" \
  -H "X-Site-Key: YOUR_SITE_KEY"
```

---

## GET `/api/external/articles/{identifier}`

Fetch a single published article for your partner site.

`{identifier}` can be either:
- UUID (example: `218ffda0-6df7-497e-95b3-09ffbd1c9d68`)
- Slug (example: `philippines-joins-regional-tourism-drive`)

Returns `404` if:
- the article is not found
- the article is not published
- the article is not assigned to your site

### Response shape (example)

```json
{ "article": { "id": "...", "slug": "...", "title": "...", "...": "..." } }
```

### Example request

```bash
curl "{baseUrl}/api/external/articles/philippines-joins-regional-tourism-drive" \
  -H "X-Site-Key: YOUR_SITE_KEY"
```

---

## Article body: HTML rendering (Partner Contract)

Partner sites must render the article body such that **real HTML from the editorial pipeline** is not double-processed into visible entity text (like literal `&lt;p&gt;`).

The API assumes **trusted** publisher markup for external sites that mirror HomesPhNews behavior.

### What the API provides

- `content_blocks`: JSON array of structured blocks (the source of truth for the article body).
- There is currently no top-level flattened HTML `content` string in the external payload.

### `content_blocks` block schema (what to expect)

Each block is typically shaped like:

```ts
{
  id?: string | number;
  type: string; // e.g. "text", "image", "grid", ...
  content?: any; // block-specific payload
  settings?: {
    textAlign?: string;
    fontSize?: string;
    color?: string;
    fontWeight?: string;
    isItalic?: boolean;
    isUnderline?: boolean;
    listType?: "bullet" | "number";
  }
}
```

Common `type` values used by the HomesPhNews frontend renderer, and where the data lives:

- `text`: `block.content.text` (HTML string); renderer uses it to build paragraphs
- `image` / `centered-image`: `block.content.src` (or `block.image` fallback), `block.content.caption` (or `block.caption`)
- `left-image` / `right-image`: `block.content.image` (or `block.content.src`), `block.content.text` (HTML string), `block.content.caption`
- `grid`: `block.content.images` (array of image URLs)
- `split-left` / `split-right`: `block.content.image` and `block.content.text` (HTML string)
- `dynamic-images`: `block.content.images` (array of image URLs)

Server note: if `content_blocks` is stored as a JSON string in the DB, the API decodes it into an array before returning.

### Recommended frontend rendering logic (high level)

1. **If you receive a non-empty `content` string (reserved for future/supplements)**:
   - If it *looks like HTML* (starts with `<` and contains `>` or contains common tags like `<p`, `<figure`, `<div`, headings, lists, `</p>`, `</figure>`, tables):
     - inject as HTML as-is.
     - do NOT globally escape the string before injecting.
   - Otherwise:
     - treat it as plain text and wrap paragraphs into `<p>...</p>` with HTML entity encoding inside the paragraph text.

2. **If `content` is absent or empty**:
   - Build HTML from `content_blocks`:
     - For plain-text blocks:
       - escape `<`, `&`, quotes as needed
       - wrap in `<p>...</p>` (or an equivalent paragraph element)
     - For block text that matches the same "HTML-like" heuristic:
       - output without paragraph wrapping, as escaped plain text (avoid "entity soup")
     - For image blocks:
       - synthesize markup like `<img>` / `<figure>`
       - only allow `http:` / `https:` URLs
       - escape HTML attributes (`src`, `alt`, caption) in generated markup
       - optionally omit an embedded image whose `src` equals the article hero `image` URL

3. **Hero media vs embedded body**:
   - If the body HTML already includes lead media tags (`<img`, `<figure`, `<picture`), consider hiding the template hero above the body to avoid duplicates.

### Sanitization expectations

For this partner contract:
- Do not strip or rewrite partner HTML at render time.
- Avoid aggressive client-side sanitizers (like DOMPurify) unless you are handling untrusted input.
- Raw HTML injection (for example, React `dangerouslySetInnerHTML`) is appropriate only when the source is fully trusted (HomesPhNews API plus your authenticated path).

### Internal reference implementation (for behavior matching)

HomesPhNews frontend renders `content_blocks` mainly using:
- `client/components/features/article/ContentBlocksRenderer.tsx`
  - interprets `block.type`, uses `block.content` and `block.settings`
  - renders text blocks using `dangerouslySetInnerHTML`
- `client/lib/converter/blocksToHtml.ts`
  - legacy conversion of blocks into an HTML string (useful for SEO/compat)

External partners should mirror the same block-to-HTML behavior for consistent rendering.

---

## GET `/api/external/restaurants`

Returns paginated restaurants published to your partner site.

### Query parameters

| Parameter | Type | Description |
|---|---|---|
| `search` | string | LIKE search on `name`, `description` |
| `country` | string | Exact match on restaurant `country` (string, not FK) |
| `city` | string | Exact match on restaurant `city` (string, not FK) |
| `cuisine_type` / `topic` | string | If `cuisine_type` is missing, server falls back to `topic`; both match `cuisine_type` column |
| `per_page` / `limit` | integer | Results per page (server clamps to `1..100`), default: `20` |
| `page` | integer | Page number, default: `1` |

Sort order:
`created_at` descending.

Notes:
- Results are scoped to the authenticated partner site using `published_sites` containing `site_name`.
- Restaurant `city` is a plain string column (not a foreign key to the `cities` table).

### Response shape (example)

```json
{
  "site": { "name": "...", "url": "...", "description": "..." },
  "data": {
    "data": [ { "...": "..." } ],
    "current_page": 1,
    "per_page": 20,
    "total": 12,
    "last_page": 1,
    "from": 1,
    "to": 12
  }
}
```

---

## POST `/api/external/subscribe`

Register a user subscription from a partner site widget.

### Request body fields

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | yes | Subscriber email |
| `categories[]` | array | yes | Category preferences (server validates as `required|array`) |
| `countries[]` | array | yes | Country preferences (server validates as `required|array`) |
| `company_name` | string | no | Company name |
| `features` | string | no | Features description |
| `time` | string | no | Preferred send time |
| `logo` | file | no | Optional logo upload (`multipart/form-data`; server uses `$request->hasFile('logo')`) |

Client reference in HomesPhNews admin (for form mapping):
`client/app/admin/sites/integration/page.tsx:72`

Example (generic):

```bash
curl -X POST "{baseUrl}/api/external/subscribe" \
  -H "X-Site-Key: YOUR_SITE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "categories": [1, 2],
    "countries": ["PH"],
    "company_name": "Example Co"
  }'
```

If you need to upload `logo`, use `multipart/form-data` and send `logo` as a file input.

---

## Metadata Endpoints (Filter Dropdowns)

These endpoints provide reference data for partner sites to populate filter dropdowns.
Responses are **simple JSON arrays** (not paginated).

### GET `/api/external/categories`

Returns all active categories.

Example:

```json
[ { "id": 1, "name": "Business & Economy", "slug": "business-economy" } ]
```

### GET `/api/external/countries`

Returns all active countries.

Example:

```json
[ { "id": "PH", "name": "Philippines" } ]
```

### GET `/api/external/provinces`

Query parameter:
`country_id` (string)

Example:

```json
[ { "id": 1, "name": "Cebu", "country_id": "PH" } ]
```

### GET `/api/external/cities`

Query parameters:
- `country_id` (string)
- `province_id` (integer)

Example:

```json
[ { "city_id": 1, "name": "Cebu City", "province_id": 1, "country_id": "PH" } ]
```

---

## Integration Pattern: Cookies + Filters (Recommended)

Partner sites can:
- use metadata endpoints to build dropdowns
- persist user selections in cookies
- pass them back as query params on subsequent requests

Suggested flow:

1. On first load:
   - call `/api/external/categories`
   - call `/api/external/countries`
2. When a country is selected:
   - call `/api/external/provinces?country_id=PH`
   - then `/api/external/cities?country_id=PH&province_id=1`
3. Store user selections in cookies, for example:
   - `category=Healthcare&country=Philippines`
4. On each page load:
   - read cookies and pass them as query params:
     `/api/external/articles?category=Healthcare&country=Philippines&page=1`
5. When a user clicks an article:
   - navigate to the detail page using the article slug:
     `/api/external/articles/philippines-joins-regional-tourism-drive`

