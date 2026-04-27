import { resolveNewsApiBase } from '../shared/newsImage.js';

const BASE_URL = 'https://www.pickleplay.ph';

const STATIC_ROUTES = [
  { path: '/', lastmod: '2026-03-18', changefreq: 'weekly', priority: '1.0' },
  { path: '/booking', lastmod: '2026-03-18', changefreq: 'daily', priority: '0.9' },
  { path: '/news', lastmod: '2026-03-18', changefreq: 'daily', priority: '0.8' },
  { path: '/tournaments', lastmod: '2026-03-18', changefreq: 'weekly', priority: '0.8' },
  { path: '/academy', lastmod: '2026-03-18', changefreq: 'weekly', priority: '0.8' },
  { path: '/guides', lastmod: '2026-03-18', changefreq: 'weekly', priority: '0.7' },
  { path: '/guides/skill-rating', lastmod: '2026-03-18', changefreq: 'monthly', priority: '0.6' },
  { path: '/rankings', lastmod: '2026-03-18', changefreq: 'weekly', priority: '0.7' },
  { path: '/shop', lastmod: '2026-03-18', changefreq: 'weekly', priority: '0.7' },
  { path: '/faq', lastmod: '2026-03-18', changefreq: 'monthly', priority: '0.5' },
  { path: '/terms', lastmod: '2026-03-18', changefreq: 'yearly', priority: '0.3' },
  { path: '/policy', lastmod: '2026-03-18', changefreq: 'yearly', priority: '0.3' },
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeNewsArticleSlug(article) {
  const candidate = article?.slug || article?.title || 'article';
  const safeSlug = String(candidate)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return safeSlug || 'article';
}

function formatLastmod(value, fallback = '2026-03-18') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString().slice(0, 10);
}

async function fetchNewsPage(newsApiUrl, newsApiKey, page) {
  const response = await fetch(`${newsApiUrl}/api/external/articles?page=${page}`, {
    headers: {
      'X-Site-Api-Key': newsApiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const details = await response.text();
    const error = new Error(`News API returned ${response.status}`);
    error.status = response.status;
    error.details = details;
    throw error;
  }

  return response.json();
}

async function fetchAllNewsArticles(newsApiUrl, newsApiKey) {
  const firstPage = await fetchNewsPage(newsApiUrl, newsApiKey, 1);
  const articles = Array.isArray(firstPage?.data?.data) ? [...firstPage.data.data] : [];
  const lastPage = Math.max(1, Number(firstPage?.data?.last_page || 1));

  for (let page = 2; page <= lastPage; page += 1) {
    const currentPage = await fetchNewsPage(newsApiUrl, newsApiKey, page);
    const pageItems = Array.isArray(currentPage?.data?.data) ? currentPage.data.data : [];
    articles.push(...pageItems);
  }

  return articles;
}

function buildUrlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
    `    <changefreq>${escapeXml(changefreq)}</changefreq>`,
    `    <priority>${escapeXml(priority)}</priority>`,
    '  </url>',
  ].join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  const newsApiUrl = resolveNewsApiBase();
  const newsApiKey = process.env.HOMESPH_NEWS_API_KEY;

  const staticEntries = STATIC_ROUTES.map((route) =>
    buildUrlEntry({
      loc: `${BASE_URL}${route.path}`,
      lastmod: route.lastmod,
      changefreq: route.changefreq,
      priority: route.priority,
    })
  );

  let articleEntries = [];

  if (newsApiUrl && newsApiKey) {
    try {
      const articles = await fetchAllNewsArticles(newsApiUrl, newsApiKey);
      const seen = new Set();

      articleEntries = articles
        .map((article) => {
          const slug = normalizeNewsArticleSlug(article);
          if (seen.has(slug)) return null;
          seen.add(slug);

          return buildUrlEntry({
            loc: `${BASE_URL}/news/${slug}`,
            lastmod: formatLastmod(article?.published_at || article?.updated_at || article?.created_at),
            changefreq: 'weekly',
            priority: '0.7',
          });
        })
        .filter(Boolean);
    } catch (error) {
      console.error('Failed to build dynamic news sitemap entries:', error.message);
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticEntries,
    ...articleEntries,
    '</urlset>',
  ].join('\n');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(xml);
}
