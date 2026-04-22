// ── Consolidated proxy for /api/v1/news/* ──
//
// A single Serverless Function that dispatches based on the catch-all
// `path` segments. This replaces what used to be three separate files
// (articles/index.js, articles/[id].js, articles/slug/[slug].js) to keep
// us under Vercel Hobby's 12-function limit while leaving the public URLs
// and response shapes identical.
//
//   GET /api/v1/news/articles                  → list (page, category)
//   GET /api/v1/news/articles/:id              → single article by id
//   GET /api/v1/news/articles/slug/:slug       → single article by slug

// ── Simple in-memory rate limiter ──
const ipHits = new Map();
const RATE_WINDOW = 60_000;
const RATE_MAX = 30;

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

const getNewsApiHeaders = (apiKey) => ({
    'X-Site-Api-Key': apiKey,
    'Accept': 'application/json',
});

async function fetchNewsArticlesPage(baseUrl, apiKey, page = 1, category = '') {
    const params = new URLSearchParams({ page: String(page) });
    if (category) params.set('category', category);

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
    return (
        String(value || 'article')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'article'
    );
}

function isMatchingNewsArticleSlug(article, articleSlug) {
    if (!article) return false;
    return (
        normalizeNewsArticleSlug(article.slug || article.title) ===
        normalizeNewsArticleSlug(articleSlug)
    );
}

function isMatchingNewsArticleById(article, articleId) {
    if (!article) return false;
    return (
        String(article.id || '') === String(articleId) ||
        String(article.article_id || '') === String(articleId)
    );
}

async function findNewsArticle(baseUrl, apiKey, matcher) {
    const firstPage = await fetchNewsArticlesPage(baseUrl, apiKey, 1);
    const firstPageArticles = firstPage?.data?.data || [];
    const firstMatch = firstPageArticles.find(matcher);
    if (firstMatch) return firstMatch;

    const lastPage = Math.max(1, Number(firstPage?.data?.last_page) || 1);
    for (let page = 2; page <= lastPage; page += 1) {
        const pageData = await fetchNewsArticlesPage(baseUrl, apiKey, page);
        const articles = pageData?.data?.data || [];
        const match = articles.find(matcher);
        if (match) return match;
    }
    return null;
}

function sendError(res, status, message) {
    return res.status(status).json({ error: message });
}

async function handleList(req, res, { NEWS_API_URL, NEWS_API_KEY }) {
    try {
        const page = req.query.page || 1;
        const category = req.query.category || '';

        const data = await fetchNewsArticlesPage(NEWS_API_URL, NEWS_API_KEY, page, category);
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(data);
    } catch (error) {
        if (error.details) {
            console.error('❌ News list upstream error:', error.status, error.details);
        }
        console.error('❌ News list error:', error.message);
        return sendError(res, error.status || 500, 'Failed to fetch news articles');
    }
}

async function handleById(req, res, articleId, { NEWS_API_URL, NEWS_API_KEY }) {
    if (!articleId || !/^[\w-]+$/.test(articleId)) {
        return sendError(res, 400, 'Invalid article ID.');
    }

    try {
        const article = await findNewsArticle(NEWS_API_URL, NEWS_API_KEY, (a) =>
            isMatchingNewsArticleById(a, articleId)
        );
        if (!article) return sendError(res, 404, 'Article not found');
        return res.status(200).json({ data: article });
    } catch (error) {
        if (error.details) {
            console.error('❌ News article detail upstream error:', error.status, error.details);
        }
        console.error('❌ News article detail error:', error.message);
        return sendError(res, error.status || 500, error.message || 'Failed to fetch article');
    }
}

async function handleBySlug(req, res, articleSlug, { NEWS_API_URL, NEWS_API_KEY }) {
    if (!articleSlug || typeof articleSlug !== 'string') {
        return sendError(res, 400, 'Invalid article slug.');
    }

    try {
        const article = await findNewsArticle(NEWS_API_URL, NEWS_API_KEY, (a) =>
            isMatchingNewsArticleSlug(a, articleSlug)
        );
        if (!article) return sendError(res, 404, 'Article not found');
        return res.status(200).json({ data: article });
    } catch (error) {
        if (error.details) {
            console.error('❌ News slug lookup upstream error:', error.status, error.details);
        }
        console.error('❌ News slug lookup error:', error.message);
        return sendError(res, error.status || 500, error.message || 'Failed to fetch article');
    }
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return sendError(res, 405, 'Method not allowed');
    }

    const clientIp =
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown';
    if (isRateLimited(clientIp)) {
        return sendError(res, 429, 'Too many requests. Please slow down.');
    }

    const NEWS_API_URL = process.env.HOMESPH_NEWS_API_URL;
    const NEWS_API_KEY = process.env.HOMESPH_NEWS_API_KEY;
    if (!NEWS_API_URL || !NEWS_API_KEY) {
        console.error('❌ News API not configured in environment variables');
        return sendError(res, 500, 'News API not configured on server.');
    }
    const env = { NEWS_API_URL, NEWS_API_KEY };

    // Vercel passes catch-all segments as an array in req.query.path.
    const rawPath = req.query?.path;
    const segments = Array.isArray(rawPath)
        ? rawPath
        : (typeof rawPath === 'string' && rawPath.length > 0 ? [rawPath] : []);

    // Route: /api/v1/news/articles[/...]
    if (segments[0] !== 'articles') {
        return sendError(res, 404, 'Not found');
    }

    // /api/v1/news/articles
    if (segments.length === 1) {
        return handleList(req, res, env);
    }

    // /api/v1/news/articles/slug/:slug
    if (segments.length === 3 && segments[1] === 'slug') {
        return handleBySlug(req, res, segments[2], env);
    }

    // /api/v1/news/articles/:id
    if (segments.length === 2) {
        return handleById(req, res, segments[1], env);
    }

    return sendError(res, 404, 'Not found');
}
