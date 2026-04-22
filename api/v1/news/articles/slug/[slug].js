// Article-by-slug endpoint.
//
// Primary mode (JSON):
//   GET /api/v1/news/articles/slug/:slug         -> { data: article }
//
// OG mode (HTML):
//   GET /api/v1/news/articles/slug/:slug?format=html
// Used by the vercel.json rewrite that sends /news/:slug through here so
// social crawlers (Facebook, Messenger, Twitter, LinkedIn, Discord, Slack,
// etc.) see article-specific Open Graph meta tags. Regular browsers still
// end up with the full SPA because we inject those tags into the built
// index.html and return it intact.

// Simple in-memory rate limiter for serverless
const ipHits = new Map();
const RATE_WINDOW = 60_000;
const RATE_MAX = 60;

function isRateLimited(ip) {
    const now = Date.now();
    const entry = ipHits.get(ip);
    if (!entry || now - entry.start > RATE_WINDOW) {
        ipHits.set(ip, { start: now, count: 1 });
        return false;
    }
    entry.count++;
    return entry.count > RATE_MAX;
}

// Defaults used when OG mode falls back
const SITE_URL = 'https://www.pickleplay.ph';
const DEFAULT_IMAGE = `${SITE_URL}/images/PicklePlayLogo.jpg`;
const DEFAULT_TITLE = 'PicklePlay Philippines - Find Pickleball Courts Near You & Play';
const DEFAULT_DESCRIPTION =
    'Find pickleball courts near you across the Philippines. Book courts in Manila, Cebu, Davao, join tournaments, and connect with players.';

const getNewsApiHeaders = (apiKey) => ({
    'X-Site-Api-Key': apiKey,
    'X-Site-Key': apiKey,
    'Accept': 'application/json',
});

async function fetchNewsArticlesPage(baseUrl, apiKey, page = 1) {
    const params = new URLSearchParams({ page: String(page) });
    const response = await fetch(`${baseUrl}/api/external/articles?${params.toString()}`, {
        headers: getNewsApiHeaders(apiKey),
    });

    if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`News API returned ${response.status}`);
        error.status = response.status;
        error.details = errorText;
        throw error;
    }

    return response.json();
}

function normalizeNewsArticleSlug(value) {
    return String(value || 'article')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'article';
}

function isMatchingNewsArticleSlug(article, articleSlug) {
    if (!article) return false;
    return normalizeNewsArticleSlug(article.slug || article.title) === normalizeNewsArticleSlug(articleSlug);
}

async function fetchArticleDirect(baseUrl, apiKey, slug) {
    try {
        const response = await fetch(
            `${baseUrl}/api/external/articles/${encodeURIComponent(slug)}`,
            { headers: getNewsApiHeaders(apiKey) }
        );
        if (!response.ok) return null;
        const payload = await response.json();
        return payload?.article || payload?.data || null;
    } catch {
        return null;
    }
}

async function findNewsArticleBySlug(baseUrl, apiKey, articleSlug) {
    // Fast path: the external API supports /articles/{identifier} where
    // identifier can be a slug. Falls back to the original page walk if
    // that endpoint is unavailable or returns nothing.
    const direct = await fetchArticleDirect(baseUrl, apiKey, articleSlug);
    if (direct) return direct;

    const firstPage = await fetchNewsArticlesPage(baseUrl, apiKey, 1);
    const firstPageArticles = firstPage?.data?.data || [];
    const firstMatch = firstPageArticles.find((article) => isMatchingNewsArticleSlug(article, articleSlug));
    if (firstMatch) return firstMatch;

    const lastPage = Math.max(1, Number(firstPage?.data?.last_page) || 1);
    for (let page = 2; page <= lastPage; page += 1) {
        const pageData = await fetchNewsArticlesPage(baseUrl, apiKey, page);
        const articles = pageData?.data?.data || [];
        const match = articles.find((article) => isMatchingNewsArticleSlug(article, articleSlug));
        if (match) return match;
    }

    return null;
}

// --- OG HTML rendering helpers ---

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function stripHtml(value) {
    return String(value ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function clamp(text, max) {
    if (!text) return '';
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}...`;
}

function buildDescription(article) {
    const candidates = [article?.excerpt, article?.summary, article?.description];
    for (const candidate of candidates) {
        const cleaned = stripHtml(candidate);
        if (cleaned) return clamp(cleaned, 200);
    }

    let blocks = article?.content_blocks;
    if (typeof blocks === 'string') {
        try { blocks = JSON.parse(blocks); } catch { blocks = []; }
    }
    if (Array.isArray(blocks)) {
        const joined = blocks
            .filter((b) => b?.type === 'text' && b?.content?.text)
            .map((b) => stripHtml(b.content.text))
            .join(' ')
            .trim();
        if (joined) return clamp(joined, 200);
    }

    return DEFAULT_DESCRIPTION;
}

function toAbsoluteImage(raw) {
    if (!raw) return null;
    const url = String(raw).trim();
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `${SITE_URL}${url}`;
    return url;
}

function pickImage(article) {
    const candidates = [
        article?.image,
        article?.image_url,
        article?.featured_image,
        article?.thumbnail,
    ];
    for (const candidate of candidates) {
        const absolute = toAbsoluteImage(candidate);
        if (absolute) return absolute;
    }
    return DEFAULT_IMAGE;
}

function buildMetaBlock({ title, description, image, url }) {
    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeImage = escapeHtml(image);
    const safeUrl = escapeHtml(url);

    return `
    <!-- Dynamic Open Graph (injected by /api/v1/news/articles/slug) -->
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}">
    <link rel="canonical" href="${safeUrl}">

    <meta property="og:type" content="article">
    <meta property="og:site_name" content="PicklePlay Philippines">
    <meta property="og:locale" content="en_PH">
    <meta property="og:url" content="${safeUrl}">
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDescription}">
    <meta property="og:image" content="${safeImage}">
    <meta property="og:image:secure_url" content="${safeImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${safeTitle}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@PicklePlayPH">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDescription}">
    <meta name="twitter:image" content="${safeImage}">
    <meta name="twitter:image:alt" content="${safeTitle}">
    <!-- End dynamic Open Graph -->`;
}

function injectMeta(html, meta) {
    const stripped = html
        .replace(/<title>[\s\S]*?<\/title>/i, '')
        .replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
        .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '')
        .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '')
        .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');

    const block = buildMetaBlock(meta);
    if (/<\/head>/i.test(stripped)) {
        return stripped.replace(/<\/head>/i, `${block}\n</head>`);
    }
    return `${block}\n${stripped}`;
}

function renderFallbackHtml(meta) {
    const block = buildMetaBlock(meta);
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${block}
<meta http-equiv="refresh" content="0; url=${escapeHtml(meta.url)}">
</head>
<body>
<p>Redirecting to <a href="${escapeHtml(meta.url)}">${escapeHtml(meta.title)}</a>...</p>
<script>window.location.replace(${JSON.stringify(meta.url)});</script>
</body>
</html>`;
}

function resolveOrigin(req) {
    const forwardedHost = req.headers['x-forwarded-host'];
    const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost)
        || req.headers.host
        || 'www.pickleplay.ph';
    const forwardedProto = req.headers['x-forwarded-proto'];
    const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)
        || (host.includes('localhost') ? 'http' : 'https');
    return `${proto}://${host}`;
}

async function fetchIndexHtml(origin) {
    try {
        const response = await fetch(`${origin}/index.html`, {
            headers: { 'User-Agent': 'PicklePlayOGRenderer/1.0' },
        });
        if (!response.ok) return null;
        return await response.text();
    } catch {
        return null;
    }
}

// --- Main handler ---

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.setHeader('Allow', 'GET, HEAD');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(clientIp)) {
        return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }

    const NEWS_API_URL = process.env.HOMESPH_NEWS_API_URL;
    const NEWS_API_KEY = process.env.HOMESPH_NEWS_API_KEY;
    const rawSlug = req.query?.slug;
    const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
    const format = String(req.query?.format || '').toLowerCase();
    const wantsHtml = format === 'html';

    if (!slug || typeof slug !== 'string') {
        if (wantsHtml) {
            return respondHtml(res, renderFallbackHtml({
                title: DEFAULT_TITLE,
                description: DEFAULT_DESCRIPTION,
                image: DEFAULT_IMAGE,
                url: `${SITE_URL}/news`,
            }));
        }
        return res.status(400).json({ error: 'Invalid article slug.' });
    }

    if (!NEWS_API_URL || !NEWS_API_KEY) {
        if (wantsHtml) {
            return respondHtml(res, renderFallbackHtml({
                title: DEFAULT_TITLE,
                description: DEFAULT_DESCRIPTION,
                image: DEFAULT_IMAGE,
                url: `${SITE_URL}/news/${encodeURIComponent(slug)}`,
            }));
        }
        return res.status(500).json({ error: 'News API not configured.' });
    }

    let article = null;
    try {
        article = await findNewsArticleBySlug(NEWS_API_URL, NEWS_API_KEY, slug);
    } catch (error) {
        if (error.details) {
            console.error('News article slug upstream error:', error.status, error.details);
        }
        console.error('News article slug error:', error.message);
        if (!wantsHtml) {
            return res.status(error.status || 500).json({ error: error.message || 'Failed to fetch article' });
        }
        // HTML mode: fall through with null article and let the renderer
        // return the SPA shell with default OG tags so the share card at
        // least displays the brand instead of a server error page.
    }

    if (wantsHtml) {
        return renderOgResponse(req, res, slug, article);
    }

    if (!article) {
        return res.status(404).json({ error: 'Article not found' });
    }
    return res.status(200).json({ data: article });
}

function respondHtml(res, html) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    return res.status(200).send(html);
}

async function renderOgResponse(req, res, slug, article) {
    const canonicalUrl = `${SITE_URL}/news/${encodeURIComponent(slug)}`;
    let meta;
    if (article) {
        const articleTitle = stripHtml(article.title) || DEFAULT_TITLE;
        meta = {
            title: `${articleTitle} | Pickleball News Philippines`,
            description: buildDescription(article),
            image: pickImage(article),
            url: canonicalUrl,
        };
    } else {
        meta = {
            title: DEFAULT_TITLE,
            description: DEFAULT_DESCRIPTION,
            image: DEFAULT_IMAGE,
            url: canonicalUrl,
        };
    }

    const origin = resolveOrigin(req);
    const baseHtml = await fetchIndexHtml(origin);
    const html = baseHtml ? injectMeta(baseHtml, meta) : renderFallbackHtml(meta);
    return respondHtml(res, html);
}
