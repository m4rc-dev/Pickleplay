import { useEffect } from 'react';

const SITE_NAME = 'PicklePlay Philippines';
const DEFAULT_TITLE = `${SITE_NAME} - Book Courts & Play Pickleball`;
const DEFAULT_DESCRIPTION =
    'PicklePlay is the home of pickleball in the Philippines. Find and book courts, join tournaments, track rankings, connect with players, and grow your game all in one place.';
const DEFAULT_IMAGE = 'https://www.pickleplay.ph/images/PicklePlayLogo.jpg';
const BASE_URL = 'https://www.pickleplay.ph';

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    canonical?: string;
    noIndex?: boolean;
    ogType?: string;
    structuredData?: Record<string, unknown> | Record<string, unknown>[] | null;
}

/** Sets document.title, key meta tags, canonical, and JSON-LD without extra deps. */
const useSEO = ({
    title = DEFAULT_TITLE,
    description = DEFAULT_DESCRIPTION,
    image = DEFAULT_IMAGE,
    canonical,
    noIndex = false,
    ogType = 'website',
    structuredData = null,
}: SEOProps = {}) => {
    useEffect(() => {
        document.title = title.includes(SITE_NAME) ? title : `${title} - ${SITE_NAME}`;

        const setMeta = (selector: string, attr: string, value: string) => {
            let el = document.querySelector<HTMLMetaElement>(selector);
            if (!el) {
                el = document.createElement('meta');
                const [, attrName, attrValue] = selector.match(/\[(\w+[:\w]*)=["']?([^"'\]]+)["']?\]/) || [];
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

        const setStructuredData = (value: Record<string, unknown> | Record<string, unknown>[] | null) => {
            const selector = 'script[data-dynamic-seo="structured-data"]';
            const existing = document.querySelector<HTMLScriptElement>(selector);

            if (!value) {
                existing?.remove();
                return;
            }

            const script = existing ?? document.createElement('script');
            script.type = 'application/ld+json';
            script.setAttribute('data-dynamic-seo', 'structured-data');
            script.textContent = JSON.stringify(value);

            if (!existing) {
                document.head.appendChild(script);
            }
        };

        const fullTitle = document.title;
        const canonicalUrl = canonical || BASE_URL + window.location.pathname;

        setMeta('meta[name="description"]', 'content', description);
        setMeta(
            'meta[name="robots"]',
            'content',
            noIndex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large'
        );

        setMeta('meta[property="og:type"]', 'content', ogType);
        setMeta('meta[property="og:title"]', 'content', fullTitle);
        setMeta('meta[property="og:description"]', 'content', description);
        setMeta('meta[property="og:image"]', 'content', image);
        setMeta('meta[property="og:url"]', 'content', canonicalUrl);

        setMeta('meta[name="twitter:title"]', 'content', fullTitle);
        setMeta('meta[name="twitter:description"]', 'content', description);
        setMeta('meta[name="twitter:image"]', 'content', image);

        setLink('canonical', canonicalUrl);
        setStructuredData(structuredData);
    }, [title, description, image, canonical, noIndex, ogType, structuredData]);
};

export default useSEO;
