// ── Dynamic Open Graph renderer for /news/:slug ──
//
// Social crawlers (Facebook, Messenger, Twitter, LinkedIn, Discord, Slack, etc.)
// do NOT execute JavaScript. Our SPA updates meta tags via useSEO after mount,
// so those crawlers only see the static default meta in index.html and show
// the generic PicklePlay logo instead of the article's featured image.
//
// This endpoint:
//   1. Fetches the article metadata (title, summary, image) by slug.
//   2. Fetches the built index.html (served statically by Vercel).
//   3. Rewrites the <title>, og:*, twitter:*, description, and canonical tags
//      to reflect the article, then returns the full HTML.
//
// Vercel rewrites /news/:slug (and /news/:id/:slug) to this function, so both
// normal users AND crawlers receive the article-specific HTML, while the SPA
// still hydrates and routes client-side as before.

const SITE_URL = 'https://www.pickleplay.ph';
const DEFAULT_IMAGE = `${SITE_URL}/images/PicklePlayLogo.jpg`;
const DEFAULT_TITLE = 'PicklePlay Philippines – Find Pickleball Courts Near You & Play';
const DEFAULT_DESCRIPTION =
    'Find pickleball courts near you across the Philippines. Book courts in Manila, Cebu, Davao, join tournaments, and connect with players.';

// ── Simple in-memory rate limiter ──
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
    return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function buildDescription(article) {
    const candidates = [article?.excerpt, article?.summary, article?.description];
    for (const candidate of candidates) {
        const cleaned = stripHtml(candidate);
        if (cleaned) return clamp(cleaned, 200);
    }

    // Fallback: derive from content_blocks text nodes.
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

// Try the external API's direct slug endpoint first (fast single-article lookup).
// Falls back to the existing paginated proxy if needed.
async function fetchArticleDirect(baseUrl, apiKey, slug) {
    try {
        const response = await fetch(
            `${baseUrl}/api/external/articles/${encodeURIComponent(slug)}`,
            {
                headers: {
                    'X-Site-Api-Key': apiKey,
                    'X-Site-Key': apiKey,
                    Accept: 'application/json',
                },
            }
        );
        if (!response.ok) return null;
        const payload = await response.json();
        return payload?.article || payload?.data || null;
    } catch (err) {
        console.warn('OG renderer: direct article fetch failed:', err?.message);
        return null;
    }
}

async function fetchArticleViaInternalProxy(origin, slug) {
    try {
        const response = await fetch(
            `${origin}/api/v1/news/articles/slug/${encodeURIComponent(slug)}`,
            { headers: { Accept: 'application/json' } }
        );
        if (!response.ok) return null;
        const payload = await response.json();
        return payload?.data || null;
    } catch (err) {
        console.warn('OG renderer: internal proxy fetch failed:', err?.message);
        return null;
    }
}

async function fetchIndexHtml(origin) {
    try {
        const response = await fetch(`${origin}/index.html`, {
            headers: { 'User-Agent': 'PicklePlayOGRenderer/1.0' },
        });
        if (!response.ok) return null;
        return await response.text();
    } catch (err) {
        console.warn('OG renderer: failed to load index.html:', err?.message);
        return null;
    }
}

function buildMetaBlock({ title, description, image, url }) {
    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeImage = escapeHtml(image);
    const safeUrl = escapeHtml(url);

    return `
    <!-- ── Dynamic Open Graph (injected by /api/news/og) ─── -->
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
    <!-- ── End dynamic Open Graph ─── -->`;
}

function injectMeta(html, meta) {
    // Strip any existing tags we're about to replace so crawlers don't see stale ones.
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
    // Extremely unlikely, but fall back to prepending inside <html>.
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
<p>Redirecting to <a href="${escapeHtml(meta.url)}">${escapeHtml(meta.title)}</a>…</p>
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

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.setHeader('Allow', 'GET, HEAD');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.socket?.remoteAddress
        || 'unknown';
    if (isRateLimited(clientIp)) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(429).send('Too many requests. Please slow down.');
    }

    const rawSlug = req.query?.slug;
    const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
    const origin = resolveOrigin(req);
    const canonicalUrl = slug
        ? `${SITE_URL}/news/${encodeURIComponent(String(slug))}`
        : `${SITE_URL}/news`;

    let title = DEFAULT_TITLE;
    let description = DEFAULT_DESCRIPTION;
    let image = DEFAULT_IMAGE;

    try {
        if (slug && typeof slug === 'string') {
            const NEWS_API_URL = process.env.HOMESPH_NEWS_API_URL;
            const NEWS_API_KEY = process.env.HOMESPH_NEWS_API_KEY;

            let article = null;
            if (NEWS_API_URL && NEWS_API_KEY) {
                article = await fetchArticleDirect(NEWS_API_URL, NEWS_API_KEY, slug);
            }
            if (!article) {
                article = await fetchArticleViaInternalProxy(origin, slug);
            }

            if (article) {
                const articleTitle = stripHtml(article.title) || DEFAULT_TITLE;
                title = `${articleTitle} | Pickleball News Philippines`;
                description = buildDescription(article);
                image = pickImage(article);
            }
        }
    } catch (err) {
        console.error('OG renderer: unexpected error resolving article:', err?.message);
    }

    const meta = { title, description, image, url: canonicalUrl };

    // Fetch the built SPA shell so real users still get the full app,
    // while crawlers see the article-specific meta tags.
    const baseHtml = await fetchIndexHtml(origin);
    const html = baseHtml ? injectMeta(baseHtml, meta) : renderFallbackHtml(meta);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Cache at the edge briefly — long enough to absorb crawler bursts
    // but short enough that article edits surface quickly.
    res.setHeader(
        'Cache-Control',
        'public, s-maxage=300, stale-while-revalidate=86400'
    );
    return res.status(200).send(html);
}
