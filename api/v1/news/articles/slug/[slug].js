// ── Simple in-memory rate limiter for serverless ──
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

async function findNewsArticleBySlug(baseUrl, apiKey, articleSlug) {
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

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(clientIp)) {
        return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }

    const NEWS_API_URL = process.env.HOMESPH_NEWS_API_URL;
    const NEWS_API_KEY = process.env.HOMESPH_NEWS_API_KEY;
    const { slug } = req.query;

    if (!slug || typeof slug !== 'string') {
        return res.status(400).json({ error: 'Invalid article slug.' });
    }

    try {
        if (!NEWS_API_URL || !NEWS_API_KEY) {
            return res.status(500).json({ error: 'News API not configured.' });
        }

        const article = await findNewsArticleBySlug(NEWS_API_URL, NEWS_API_KEY, slug);
        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        return res.status(200).json({ data: article });
    } catch (error) {
        if (error.details) {
            console.error('❌ News article slug lookup upstream error:', error.status, error.details);
        }
        console.error('❌ News article slug lookup error:', error.message);
        return res.status(error.status || 500).json({ error: error.message || 'Failed to fetch article' });
    }
}
