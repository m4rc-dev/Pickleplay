import { useEffect } from 'react';

const SITE_NAME = 'PicklePlay Philippines';
const DEFAULT_TITLE = `${SITE_NAME} – Book Courts & Play Pickleball`;
const DEFAULT_DESCRIPTION =
    'PicklePlay is the home of pickleball in the Philippines. Find and book courts, join tournaments, track rankings, connect with players, and grow your game — all in one place.';
const DEFAULT_IMAGE = 'https://www.pickleplay.ph/images/PicklePlayLogo.jpg';
const BASE_URL = 'https://www.pickleplay.ph';

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    canonical?: string;
    noIndex?: boolean;
}

/** Sets document.title and key meta tags imperatively. No extra deps required. */
const useSEO = ({
    title = DEFAULT_TITLE,
    description = DEFAULT_DESCRIPTION,
    image = DEFAULT_IMAGE,
    canonical,
    noIndex = false,
}: SEOProps = {}) => {
    useEffect(() => {
        // ── Title ──
        document.title = title.includes(SITE_NAME) ? title : `${title} – ${SITE_NAME}`;

        // ── Helper ──
        const setMeta = (selector: string, attr: string, value: string) => {
            let el = document.querySelector<HTMLMetaElement>(selector);
            if (!el) {
                el = document.createElement('meta');
                const [, attrName, , attrValue] = selector.match(/\[(\w+[:\w]*)=["']?([^"'\]]+)["']?\]/) || [];
                if (attrName && attrValue) el.setAttribute(attrName, attrValue);
                document.head.appendChild(el);
            }
            el.setAttribute(attr, value);
        };

        const setLink = (rel: string, href: string) => {
            let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
            if (!el) {
                el = document.createElement('link');
                el.rel = rel;
                document.head.appendChild(el);
            }
            el.href = href;
        };

        const fullTitle = document.title;

        // ── Primary ──
        setMeta('meta[name="description"]', 'content', description);
        setMeta('meta[name="robots"]', 'content', noIndex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large');

        // ── Open Graph ──
        setMeta('meta[property="og:title"]', 'content', fullTitle);
        setMeta('meta[property="og:description"]', 'content', description);
        setMeta('meta[property="og:image"]', 'content', image);
        setMeta('meta[property="og:url"]', 'content', canonical || BASE_URL + window.location.pathname);

        // ── Twitter ──
        setMeta('meta[name="twitter:title"]', 'content', fullTitle);
        setMeta('meta[name="twitter:description"]', 'content', description);
        setMeta('meta[name="twitter:image"]', 'content', image);

        // ── Canonical ──
        setLink('canonical', canonical || BASE_URL + window.location.pathname);
    }, [title, description, image, canonical, noIndex]);
};

export default useSEO;
