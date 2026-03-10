// ── Simple in-memory rate limiter for serverless ──
const ipHits = new Map();
const RATE_WINDOW = 60_000; // 1 minute
const RATE_MAX = 30;        // 30 requests per minute per IP

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

export default async function handler(req, res) {
    // Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limit by IP
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
        return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }

    const NEWS_API_URL = process.env.HOMESPH_NEWS_API_URL;
    const NEWS_API_KEY = process.env.HOMESPH_NEWS_API_KEY;

    try {
        if (!NEWS_API_URL || !NEWS_API_KEY) {
            console.error('❌ News API not configured in environment variables');
            return res.status(500).json({ error: 'News API not configured on server.' });
        }

        const page = req.query.page || 1;
        const category = req.query.category || '';

        // Build URL with optional category filter
        let url = `${NEWS_API_URL}/api/external/articles?page=${page}`;
        if (category) {
            url += `&category=${category}`;
        }

        console.log(`📡 Fetching from: ${url}`);

        const response = await fetch(url, {
            headers: {
                'X-Site-Api-Key': NEWS_API_KEY,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ News API error:', response.status, errorText);
            return res.status(response.status).json({ error: `News API returned ${response.status}` });
        }

        const data = await response.json();
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(data);
    } catch (error) {
        console.error('❌ News proxy error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch news articles' });
    }
}
