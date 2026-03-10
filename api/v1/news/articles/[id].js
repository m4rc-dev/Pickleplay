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
    const { id } = req.query;

    // Sanitize ID — only allow alphanumeric, hyphens, underscores
    if (!id || !/^[\w-]+$/.test(id)) {
        return res.status(400).json({ error: 'Invalid article ID.' });
    }

    try {
        if (!NEWS_API_URL || !NEWS_API_KEY) {
            return res.status(500).json({ error: 'News API not configured.' });
        }

        const url = `${NEWS_API_URL}/api/external/articles/${id}`;

        const response = await fetch(url, {
            headers: {
                'X-Site-Api-Key': NEWS_API_KEY,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: `News API returned ${response.status}` });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error('❌ News article detail error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch article' });
    }
}
