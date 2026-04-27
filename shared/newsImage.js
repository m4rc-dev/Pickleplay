// Shared utilities for HomesPh / api.homes.ph news article payloads.
//
// 1. Thumbnail resolver (resolveArticleImage / withResolvedArticleImage)
//    The upstream API is inconsistent: for some articles the image is a plain
//    URL string, for others it's nested inside an object (e.g.
//    { url, src, path, file, original, large, thumbnail }) or the first
//    element of an images[] array, or a site-relative path like
//    "storage/articles/xxx.jpg". This module centralises that mess so every
//    place that surfaces an article image (the list/detail/slug proxies, the
//    OG renderer, and the React newsfeed) gets the same behaviour: a
//    guaranteed absolute URL, or null if nothing usable can be found.
//
// 2. API base resolver (resolveNewsApiBase)
//    Defensive resolver for the news API host. Falls back to the current
//    production host when the env var is missing OR still points at the
//    decommissioned Cloud Run deployment. See function for details.

const DEFAULT_NEWS_API_BASE = 'https://api.homes.ph';
// Hosts that used to serve the news API but no longer respond (return 404).
// We override env vars that still reference these so a stale Vercel config
// doesn't 404 the production newsfeed.
const DECOMMISSIONED_NEWS_API_HOSTS = [
    'homesphnews-api-394504332858',
];

/**
 * Resolves the base URL for the HomesPh / api.homes.ph external news API.
 *
 * Resolution order:
 *   1. `process.env.HOMESPH_NEWS_API_URL` — when set AND not pointing at a
 *      known-decommissioned host.
 *   2. `https://api.homes.ph` — the current production host.
 *
 * The override on (1) exists because the previous Cloud Run host
 * (homesphnews-api-394504332858.asia-southeast1.run.app) was retired and now
 * returns HTTP 404. Some deployed environments still have that host pinned
 * in their env vars; rather than silently 404 the entire newsfeed we route
 * those callers at the live host.
 */
export function resolveNewsApiBase() {
    const raw = String(process.env.HOMESPH_NEWS_API_URL || '').trim();
    if (!raw) return DEFAULT_NEWS_API_BASE;
    if (DECOMMISSIONED_NEWS_API_HOSTS.some((host) => raw.includes(host))) {
        return DEFAULT_NEWS_API_BASE;
    }
    return raw.replace(/\/+$/, '');
}

const IMAGE_KEYS_IN_PRIORITY = [
    'image',
    'image_url',
    'imageUrl',
    'featured_image',
    'featuredImage',
    'thumbnail',
    'thumbnail_url',
    'thumbnailUrl',
    'cover_image',
    'coverImage',
    'cover',
    'hero_image',
    'heroImage',
    'main_image',
    'mainImage',
    'photo',
    'photo_url',
    'banner',
    'banner_url',
];

// Inside an object-shaped image, these are the most common places the URL hides.
const NESTED_URL_KEYS = [
    'url',
    'src',
    'href',
    'link',
    'path',
    'file',
    'original',
    'full',
    'large',
    'medium',
    'small',
    'thumbnail',
    'thumb',
    'secure_url',
    'public_url',
];

function stripTrailingSlash(value) {
    return String(value || '').replace(/\/+$/, '');
}

function isLikelyUrl(value) {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    // data: / blob: URLs are fine to pass through
    if (/^data:image\//i.test(trimmed)) return true;
    if (/^blob:/i.test(trimmed)) return true;
    if (/^https?:\/\//i.test(trimmed)) return true;
    if (trimmed.startsWith('//')) return true;
    if (trimmed.startsWith('/')) return true;
    // Relative path like "storage/articles/xxx.jpg"
    return /\.(jpe?g|png|webp|gif|avif|svg)(\?.*)?$/i.test(trimmed);
}

function toAbsoluteUrl(value, apiBase) {
    if (typeof value !== 'string') return null;
    const url = value.trim();
    if (!url) return null;

    if (/^(https?:\/\/|data:|blob:)/i.test(url)) return url;
    if (url.startsWith('//')) return `https:${url}`;

    const base = stripTrailingSlash(apiBase || '');
    if (!base) return null; // can't absolutise without a base

    if (url.startsWith('/')) return `${base}${url}`;
    return `${base}/${url}`;
}

// Deeply inspect an arbitrary value and return the first string that looks
// like a URL. Handles strings, arrays, and plain objects.
function extractUrlString(value, depth = 0) {
    if (depth > 4 || value == null) return null;

    if (typeof value === 'string') {
        return isLikelyUrl(value) ? value.trim() : null;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const found = extractUrlString(item, depth + 1);
            if (found) return found;
        }
        return null;
    }

    if (typeof value === 'object') {
        // Prefer the well-known keys so we don't accidentally pick a caption
        // field or similar.
        for (const key of NESTED_URL_KEYS) {
            if (key in value) {
                const found = extractUrlString(value[key], depth + 1);
                if (found) return found;
            }
        }
        // Fallback: any string value that looks like a URL.
        for (const key of Object.keys(value)) {
            if (NESTED_URL_KEYS.includes(key)) continue;
            const found = extractUrlString(value[key], depth + 1);
            if (found) return found;
        }
    }

    return null;
}

/**
 * Returns the best absolute image URL for an article, or null if nothing
 * usable can be resolved.
 *
 * @param {object} article - Raw article object from the HomesPhNews API.
 * @param {string} [apiBase] - Base URL of the HomesPhNews API (used to
 *   absolutise site-relative paths). Safe to omit; relative URLs are dropped
 *   when no base is provided.
 */
export function resolveArticleImage(article, apiBase) {
    if (!article || typeof article !== 'object') return null;

    for (const key of IMAGE_KEYS_IN_PRIORITY) {
        if (!(key in article)) continue;
        const candidate = extractUrlString(article[key]);
        if (candidate) {
            const absolute = toAbsoluteUrl(candidate, apiBase);
            if (absolute) return absolute;
        }
    }

    // Last resort: some APIs nest everything under an images[] array.
    if (Array.isArray(article.images)) {
        const candidate = extractUrlString(article.images);
        if (candidate) {
            const absolute = toAbsoluteUrl(candidate, apiBase);
            if (absolute) return absolute;
        }
    }

    return null;
}

/**
 * Returns a shallow clone of the article with a normalised absolute `image`
 * field (or the original value untouched when unresolved). Other image-shaped
 * fields are left alone so downstream consumers can still inspect them.
 */
export function withResolvedArticleImage(article, apiBase) {
    if (!article || typeof article !== 'object') return article;
    const resolved = resolveArticleImage(article, apiBase);
    if (!resolved) {
        // Even if we couldn't resolve, make sure image is a string/null so
        // the client never receives an unexpected object shape.
        const currentIsObject =
            article.image != null && typeof article.image !== 'string';
        if (currentIsObject) {
            return { ...article, image: null };
        }
        return article;
    }
    return { ...article, image: resolved };
}
