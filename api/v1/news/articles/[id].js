import { resolveNewsApiBase, withResolvedArticleImage } from '../../../../shared/newsImage.js';

// Simple in-memory rate limiter for serverless
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

function isMatchingNewsArticle(article, articleId) {
    if (!article) return false;
    return String(article.id || '') === String(articleId) || String(article.article_id || '') === String(articleId);
}

async function findNewsArticleById(baseUrl, apiKey, articleId) {
    const firstPage = await fetchNewsArticlesPage(baseUrl, apiKey, 1);
    const firstPageArticles = firstPage?.data?.data || [];
    const firstMatch = firstPageArticles.find((article) => isMatchingNewsArticle(article, articleId));
    if (firstMatch) return firstMatch;

    const lastPage = Math.max(1, Number(firstPage?.data?.last_page) || 1);
    for (let page = 2; page <= lastPage; page += 1) {
        const pageData = await fetchNewsArticlesPage(baseUrl, apiKey, page);
        const articles = pageData?.data?.data || [];
        const match = articles.find((article) => isMatchingNewsArticle(article, articleId));
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

    const NEWS_API_URL = resolveNewsApiBase();
    const NEWS_API_KEY = process.env.HOMESPH_NEWS_API_KEY;
    const { id } = req.query;

    // Sanitize ID - only allow alphanumeric, hyphens, underscores
    if (!id || !/^[\w-]+$/.test(id)) {
        return res.status(400).json({ error: 'Invalid article ID.' });
    }

    try {
        if (!NEWS_API_KEY) {
            return res.status(500).json({ error: 'News API not configured.' });
        }

        const article = await findNewsArticleById(NEWS_API_URL, NEWS_API_KEY, id);
        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        return res.status(200).json({
            data: withResolvedArticleImage(article, NEWS_API_URL),
        });
    } catch (error) {
        if (error.details) {
            console.error('News article detail upstream error:', error.status, error.details);
        }
        console.error('News article detail error:', error.message);
        return res.status(error.status || 500).json({ error: error.message || 'Failed to fetch article' });
    }
}
