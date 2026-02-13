export default async function handler(req, res) {
    const NEWS_API_URL = process.env.HOMESPH_NEWS_API_URL;
    const NEWS_API_KEY = process.env.HOMESPH_NEWS_API_KEY;
    const { id } = req.query;

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
