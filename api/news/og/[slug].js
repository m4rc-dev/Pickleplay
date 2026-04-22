// ─── Server-rendered Open Graph meta for shared news articles ────────────────
// Facebook/Messenger/LinkedIn/Twitter crawlers don't execute JavaScript, so the
// client-side useSEO hook can't set article-specific og:image/title/description
// for them. This serverless function intercepts /news/:slug (and the legacy
// /news/:id/:slug pattern) via a Vercel rewrite, looks up the article, and
// serves index.html with article-specific meta tags injected. Real users get
// the same SPA experience because the injected HTML still loads the React
// bundle and React Router takes over client-side.

const BASE_URL = 'https://www.pickleplay.ph';
const DEFAULT_IMAGE = `${BASE_URL}/images/PicklePlayLogo.jpg`;
const DEFAULT_TITLE = 'PicklePlay Philippines – Find Pickleball Courts Near You & Play';
const DEFAULT_DESCRIPTION =
    'Find pickleball courts near you across the Philippines. Book courts in Manila, Cebu, Davao, join tournaments, and connect with players.';

// Cache fetched articles for a short window to avoid repeatedly paginating the
// upstream News API when a shared URL gets many crawler/user hits at once.
const articleCache = new Map(); // slug -> { value, expiresAt }
const ARTICLE_CACHE_TTL_MS = 5 * 60 * 1000;

const htmlCache = { value: null, etag: null, expiresAt: 0 };
const HTML_CACHE_TTL_MS = 60 * 1000;

function normalizeSlug(value) {
    return String(value || 'article')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'article';
}

function isMatchingSlug(article, slug) {
    if (!article) return false;
    return normalizeSlug(article.slug || article.title) === normalizeSlug(slug);
}

function getNewsApiHeaders(apiKey) {
    return {
        'X-Site-Api-Key': apiKey,
        'X-Site-Key': apiKey,
        Accept: 'application/json',
    };
}

async function fetchNewsArticlesPage(baseUrl, apiKey, page) {
    const response = await fetch(`${baseUrl}/api/external/articles?page=${page}`, {
        headers: getNewsApiHeaders(apiKey),
    });
    if (!response.ok) {
        const err = new Error(`News API returned ${response.status}`);
        err.status = response.status;
        throw err;
    }
    return response.json();
}

async function fetchArticleDirect(baseUrl, apiKey, identifier) {
    try {
        const response = await fetch(
            `${baseUrl}/api/external/articles/${encodeURIComponent(identifier)}`,
            { headers: getNewsApiHeaders(apiKey) }
        );
        if (!response.ok) return null;
        const result = await response.json();
        return result?.article || result?.data || null;
    } catch {
        return null;
    }
}

async function findArticleBySlug(baseUrl, apiKey, slug) {
    const direct = await fetchArticleDirect(baseUrl, apiKey, slug);
    if (direct && isMatchingSlug(direct, slug)) return direct;

    const firstPage = await fetchNewsArticlesPage(baseUrl, apiKey, 1);
    const firstItems = firstPage?.data?.data || [];
    const firstMatch = firstItems.find((a) => isMatchingSlug(a, slug));
    if (firstMatch) return firstMatch;

    const lastPage = Math.max(1, Number(firstPage?.data?.last_page) || 1);
    for (let page = 2; page <= lastPage; page += 1) {
        const pageData = await fetchNewsArticlesPage(baseUrl, apiKey, page);
        const items = pageData?.data?.data || [];
        const match = items.find((a) => isMatchingSlug(a, slug));
        if (match) return match;
    }
    return null;
}

async function getArticle(slug) {
    const now = Date.now();
    const cached = articleCache.get(slug);
    if (cached && cached.expiresAt > now) return cached.value;

    const NEWS_API_URL = process.env.HOMESPH_NEWS_API_URL;
    const NEWS_API_KEY = process.env.HOMESPH_NEWS_API_KEY;
    if (!NEWS_API_URL || !NEWS_API_KEY) return null;

    const article = await findArticleBySlug(NEWS_API_URL, NEWS_API_KEY, slug);
    articleCache.set(slug, { value: article, expiresAt: now + ARTICLE_CACHE_TTL_MS });
    return article;
}

function stripHtml(value) {
    return String(value || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function pickArticleImage(article) {
    if (!article) return DEFAULT_IMAGE;
    const candidate =
        article.image ||
        article.image_url ||
        article.featured_image ||
        article.thumbnail ||
        article.cover_image ||
        article.photo;
    if (!candidate) return DEFAULT_IMAGE;
    if (/^https?:\/\//i.test(candidate)) return candidate;
    const base = process.env.HOMESPH_NEWS_API_URL || '';
    if (!base) return DEFAULT_IMAGE;
    return `${base.replace(/\/$/, '')}/${String(candidate).replace(/^\//, '')}`;
}

function pickArticleDescription(article) {
    if (!article) return DEFAULT_DESCRIPTION;
    const text =
        stripHtml(article.excerpt) ||
        stripHtml(article.summary) ||
        stripHtml(article.body) ||
        stripHtml(article.content) ||
        DEFAULT_DESCRIPTION;
    return text.length > 240 ? `${text.slice(0, 237)}...` : text;
}

function pickArticleTitle(article) {
    return article?.title?.trim() || DEFAULT_TITLE;
}

function pickPublishedAt(article) {
    return article?.published_at || article?.created_at || article?.date || null;
}

function escapeAttr(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function escapeHtmlText(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

async function loadIndexHtml(req) {
    const now = Date.now();
    if (htmlCache.value && htmlCache.expiresAt > now) return htmlCache.value;

    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const origin = host ? `${proto}://${host}` : BASE_URL;

    const response = await fetch(`${origin}/index.html`, {
        headers: { 'User-Agent': 'PicklePlay-OG-Renderer/1.0' },
    });
    if (!response.ok) {
        throw new Error(`Failed to load index.html (${response.status})`);
    }
    const html = await response.text();
    htmlCache.value = html;
    htmlCache.expiresAt = now + HTML_CACHE_TTL_MS;
    return html;
}

function replaceMeta(html, selectorAttr, selectorValue, contentAttr, newContent) {
    // Replace any existing <meta> tag whose `selectorAttr` equals `selectorValue`.
    const pattern = new RegExp(
        `<meta\\s+[^>]*${selectorAttr}\\s*=\\s*["']${selectorValue}["'][^>]*>`,
        'i'
    );
    const replacement = `<meta ${selectorAttr}="${selectorValue}" ${contentAttr}="${escapeAttr(newContent)}">`;
    if (pattern.test(html)) {
        return html.replace(pattern, replacement);
    }
    // If not found, inject before </head>.
    return html.replace(/<\/head>/i, `    ${replacement}\n</head>`);
}

function replaceLinkRel(html, rel, newHref) {
    const pattern = new RegExp(`<link\\s+[^>]*rel\\s*=\\s*["']${rel}["'][^>]*>`, 'i');
    const replacement = `<link rel="${rel}" href="${escapeAttr(newHref)}">`;
    if (pattern.test(html)) return html.replace(pattern, replacement);
    return html.replace(/<\/head>/i, `    ${replacement}\n</head>`);
}

function injectArticleMeta(html, article, canonicalUrl) {
    const title = pickArticleTitle(article);
    const description = pickArticleDescription(article);
    const image = pickArticleImage(article);
    const publishedAt = pickPublishedAt(article);
    const fullTitle = `${title} - PicklePlay Philippines`;

    let out = html;

    // <title>
    out = out.replace(
        /<title>[\s\S]*?<\/title>/i,
        `<title>${escapeHtmlText(fullTitle)}</title>`
    );

    // meta description
    out = replaceMeta(out, 'name', 'description', 'content', description);

    // Open Graph
    out = replaceMeta(out, 'property', 'og:type', 'content', 'article');
    out = replaceMeta(out, 'property', 'og:title', 'content', fullTitle);
    out = replaceMeta(out, 'property', 'og:description', 'content', description);
    out = replaceMeta(out, 'property', 'og:image', 'content', image);
    out = replaceMeta(out, 'property', 'og:image:alt', 'content', title);
    out = replaceMeta(out, 'property', 'og:url', 'content', canonicalUrl);

    // Remove the hardcoded 1200x630 logo dimensions — they don't apply to a
    // dynamic article thumbnail and can make Facebook reject the image.
    out = out.replace(/<meta\s+property=["']og:image:width["'][^>]*>\s*/gi, '');
    out = out.replace(/<meta\s+property=["']og:image:height["'][^>]*>\s*/gi, '');

    // Twitter card
    out = replaceMeta(out, 'name', 'twitter:card', 'content', 'summary_large_image');
    out = replaceMeta(out, 'name', 'twitter:title', 'content', fullTitle);
    out = replaceMeta(out, 'name', 'twitter:description', 'content', description);
    out = replaceMeta(out, 'name', 'twitter:image', 'content', image);
    out = replaceMeta(out, 'name', 'twitter:image:alt', 'content', title);

    // Article-specific OG tags
    if (publishedAt) {
        out = replaceMeta(out, 'property', 'article:published_time', 'content', publishedAt);
    }

    // Canonical link
    out = replaceLinkRel(out, 'canonical', canonicalUrl);

    return out;
}

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.setHeader('Allow', 'GET, HEAD');
        return res.status(405).send('Method not allowed');
    }

    const rawSlug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
    const slug = typeof rawSlug === 'string' ? rawSlug.trim() : '';

    const canonicalSlug = slug ? normalizeSlug(slug) : '';
    const canonicalUrl = canonicalSlug
        ? `${BASE_URL}/news/${canonicalSlug}`
        : `${BASE_URL}/news`;

    try {
        const html = await loadIndexHtml(req);

        if (!slug) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
            return res.status(200).send(html);
        }

        let article = null;
        try {
            article = await getArticle(slug);
        } catch (error) {
            console.error('❌ News OG article lookup failed:', error?.message || error);
        }

        // Whether the article resolved or not, serve the SPA shell. If no
        // article was found we still fall back to the default site meta tags
        // so the page continues to work for users even when the crawler can't
        // find a match.
        const finalHtml = article
            ? injectArticleMeta(html, article, canonicalUrl)
            : html;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader(
            'Cache-Control',
            article
                ? 'public, s-maxage=300, stale-while-revalidate=86400'
                : 'public, s-maxage=60, stale-while-revalidate=300'
        );
        return res.status(200).send(finalHtml);
    } catch (error) {
        console.error('❌ News OG handler error:', error?.message || error);
        // Last-resort fallback: redirect to the canonical SPA URL. Crawlers
        // will follow the redirect and at least render the default site card.
        res.setHeader('Cache-Control', 'no-store');
        return res.status(500).send('Failed to render article preview');
    }
}
