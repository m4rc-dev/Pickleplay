
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Share2, Bookmark, AlertCircle, ExternalLink, Newspaper, RefreshCw, Clock, TrendingUp, Eye, ChevronRight, ChevronLeft, Flame, Zap, Trophy, UsersRound, Search, Filter, Loader2, Calendar, User, Tag, BookOpen, ArrowUpRight, Facebook, Copy } from 'lucide-react';
import useSEO from '../hooks/useSEO';

// ─── Types ──────────────────────────────────────────────────────
interface ContentBlockSettings {
  textAlign?: string;
  fontSize?: string;
  color?: string;
  fontWeight?: string;
  isItalic?: boolean;
  isUnderline?: boolean;
  listType?: 'bullet' | 'number';
}

interface ContentBlock {
  id?: string | number;
  type: string;
  content?: any;
  settings?: ContentBlockSettings;
  image?: string;
  caption?: string;
}

interface ApiArticle {
  id: number | string;
  title: string;
  slug: string;
  summary: string | null;
  excerpt: string | null;
  body: string | null;
  content: string | null;
  content_blocks: ContentBlock[] | string | null;
  image: string | null;
  image_url: string | null;
  featured_image: string | null;
  thumbnail: string | null;
  category: string | null;
  category_name: string | null;
  author: string | null;
  author_name: string | null;
  published_at: string | null;
  created_at: string | null;
  date: string | null;
  read_time: string | null;
  reading_time: string | null;
  tags: string[] | null;
  topics: string[] | null;
  keywords: string[] | null;
  source: string | null;
  url: string | null;
  external_url: string | null;
  views_count: number | null;
  province_name: string | null;
  city_name: string | null;
}

interface NormalizedArticle {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  contentBlocks: ContentBlock[];
  category: string;
  date: string;
  rawDate: string;
  publishedAt: string | null;
  image: string;
  readTime: string;
  author: string;
  slug: string;
  tags: string[];
  sourceUrl: string;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// ─── Helpers ────────────────────────────────────────────────────
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=800';

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1511067007398-7e4b90cfa4bc?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=800',
];

const getNewsArticleSlug = (article: Pick<NormalizedArticle, 'slug' | 'title'>) => {
  const safeSlug = (article.slug || article.title || 'article')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return safeSlug || 'article';
};

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

function parseContentBlocks(raw: ApiArticle): ContentBlock[] {
  let blocks = raw.content_blocks;
  if (!blocks) return [];
  if (typeof blocks === 'string') {
    try { blocks = JSON.parse(blocks); } catch { return []; }
  }
  return Array.isArray(blocks) ? blocks : [];
}

function getTextFromBlocks(blocks: ContentBlock[]): string {
  return blocks
    .filter(b => b.type === 'text' && b.content?.text)
    .map(b => stripHtml(b.content.text))
    .join(' ')
    .trim();
}

const buildExcerpt = (raw: ApiArticle) => {
  const explicitExcerpt = stripHtml(raw.excerpt || '');
  if (explicitExcerpt) return explicitExcerpt;

  const summary = stripHtml(raw.summary || '');
  if (summary) return summary.length > 220 ? `${summary.substring(0, 220)}...` : summary;

  const blocks = parseContentBlocks(raw);
  if (blocks.length > 0) {
    const blockText = getTextFromBlocks(blocks);
    if (blockText) return blockText.length > 220 ? `${blockText.substring(0, 220)}...` : blockText;
  }

  const plainBody = stripHtml(raw.body || raw.content || '');
  if (!plainBody) return 'No preview available.';
  return plainBody.length > 180 ? `${plainBody.substring(0, 180)}...` : plainBody;
};

function normalizeArticle(raw: ApiArticle, index: number): NormalizedArticle {
  const image = raw.image || raw.image_url || raw.featured_image || raw.thumbnail || PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
  const publishedAt = raw.published_at || null;
  const date = publishedAt || raw.created_at || raw.date || '';
  const contentBlocks = parseContentBlocks(raw);

  const bodyText = raw.body || raw.content || '';
  const blockText = getTextFromBlocks(contentBlocks);
  const textForReadTime = bodyText || blockText || raw.summary || '';
  const readTime = raw.read_time || raw.reading_time || `${Math.max(2, Math.ceil(textForReadTime.length / 1000))} min read`;

  return {
    id: String(raw.id),
    title: raw.title || 'Untitled Article',
    excerpt: buildExcerpt(raw),
    body: bodyText,
    contentBlocks,
    category: raw.category || raw.category_name || 'General',
    date: date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
    rawDate: date,
    publishedAt,
    image,
    readTime,
    author: raw.author || raw.author_name || 'Staff',
    slug: raw.slug || '',
    tags: raw.tags || raw.topics || raw.keywords || [],
    sourceUrl: raw.url || raw.external_url || '',
  };
}

const buildNewsArticlePath = (article: NormalizedArticle) => {
  return `/news/${getNewsArticleSlug(article)}`;
};

const buildAbsoluteNewsArticleUrl = (article: NormalizedArticle) => {
  const articlePath = buildNewsArticlePath(article);
  if (typeof window === 'undefined') {
    return `https://www.pickleplay.ph${articlePath}`;
  }
  return new URL(articlePath, window.location.origin).toString();
};

function formatDateLong(dateStr: string) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function buildBlockStyle(settings?: ContentBlockSettings): React.CSSProperties {
  if (!settings) return {};
  const style: React.CSSProperties = {};
  if (settings.textAlign) style.textAlign = settings.textAlign as any;
  if (settings.fontSize) style.fontSize = settings.fontSize;
  if (settings.color) style.color = settings.color;
  if (settings.fontWeight) style.fontWeight = settings.fontWeight;
  if (settings.isItalic) style.fontStyle = 'italic';
  if (settings.isUnderline) style.textDecoration = 'underline';
  return style;
}

function isValidImageUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

const ContentBlocksRenderer: React.FC<{ blocks: ContentBlock[]; heroImage?: string }> = ({ blocks, heroImage }) => {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="sports-article-body">
      {blocks.map((block, idx) => {
        const style = buildBlockStyle(block.settings);
        const key = block.id ?? idx;

        switch (block.type) {
          case 'text': {
            const text = block.content?.text;
            if (!text) return null;

            if (block.settings?.listType === 'bullet') {
              return <ul key={key} className="list-disc pl-6 space-y-2 text-[1.0625rem] leading-[1.6] text-slate-500 font-normal my-5" style={style} dangerouslySetInnerHTML={{ __html: text }} />;
            }
            if (block.settings?.listType === 'number') {
              return <ol key={key} className="list-decimal pl-6 space-y-2 text-[1.0625rem] leading-[1.6] text-slate-500 font-normal my-5" style={style} dangerouslySetInnerHTML={{ __html: text }} />;
            }

            return (
              <div
                key={key}
                className="sports-text-block"
                style={style}
                dangerouslySetInnerHTML={{ __html: text }}
              />
            );
          }

          case 'image':
          case 'centered-image': {
            const src = block.content?.src || block.image;
            const caption = block.content?.caption || block.caption;
            if (!isValidImageUrl(src)) return null;
            if (heroImage && src === heroImage) return null;
            return (
              <figure key={key} className="my-10 -mx-2 sm:mx-0">
                <img src={src} alt={caption || ''} className="w-full rounded-xl" loading="lazy" />
                {caption && <figcaption className="text-[13px] text-slate-400 mt-3 italic font-medium">{caption}</figcaption>}
              </figure>
            );
          }

          case 'left-image':
          case 'right-image': {
            const imgSrc = block.content?.image || block.content?.src;
            const text = block.content?.text || '';
            const caption = block.content?.caption;
            const isLeft = block.type === 'left-image';
            return (
              <div key={key} className={`flex flex-col ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'} gap-6 my-10 items-start`}>
                {isValidImageUrl(imgSrc) && (
                  <figure className="md:w-2/5 shrink-0">
                    <img src={imgSrc} alt={caption || ''} className="w-full rounded-xl" loading="lazy" />
                    {caption && <figcaption className="text-[13px] text-slate-400 mt-2 italic font-medium">{caption}</figcaption>}
                  </figure>
                )}
                <div className="flex-1 sports-text-block" style={style} dangerouslySetInnerHTML={{ __html: text }} />
              </div>
            );
          }

          case 'split-left':
          case 'split-right': {
            const imgSrc = block.content?.image || block.content?.src;
            const text = block.content?.text || '';
            const isLeft = block.type === 'split-left';
            return (
              <div key={key} className={`flex flex-col ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'} gap-6 my-10 items-center`}>
                {isValidImageUrl(imgSrc) && (
                  <div className="md:w-1/2 shrink-0">
                    <img src={imgSrc} alt="" className="w-full rounded-xl" loading="lazy" />
                  </div>
                )}
                <div className="flex-1 sports-text-block" style={style} dangerouslySetInnerHTML={{ __html: text }} />
              </div>
            );
          }

          case 'grid': {
            const images: string[] = block.content?.images || [];
            const validImages = images.filter(isValidImageUrl);
            if (validImages.length === 0) return null;
            const cols = validImages.length <= 2 ? 'grid-cols-2' : validImages.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-3';
            return (
              <div key={key} className={`grid ${cols} gap-3 my-10`}>
                {validImages.map((src, i) => (
                  <img key={i} src={src} alt="" className="w-full rounded-xl object-cover aspect-square" loading="lazy" />
                ))}
              </div>
            );
          }

          case 'dynamic-images': {
            const images: string[] = block.content?.images || [];
            const validImages = images.filter(isValidImageUrl);
            if (validImages.length === 0) return null;
            return (
              <div key={key} className="flex flex-wrap gap-3 my-10">
                {validImages.map((src, i) => (
                  <img key={i} src={src} alt="" className="rounded-xl max-h-72 object-cover" loading="lazy" />
                ))}
              </div>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
};

/** Format plain body text into paragraphs — preserve original structure */
function formatArticleBody(body: string): string {
  if (!body) return '';

  const hasHtml = /<[a-z][\s\S]*>/i.test(body);

  if (hasHtml) {
    return body;
  }

  const paragraphs = body.split(/\n\n+/).map(p => p.replace(/\n/g, ' ').trim()).filter(Boolean);

  const formatted = paragraphs.map((p) => {
    let html = p.trim();
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<p>${html}</p>`;
  }).join('');

  return formatted;
}


// ─── Article Detail View ────────────────────────────────────────
const ArticleDetail: React.FC<{ article: NormalizedArticle; onBack: () => void }> = ({ article, onBack }) => {
  const hasContentBlocks = article.contentBlocks && article.contentBlocks.length > 0;
  const formattedBody = !hasContentBlocks ? formatArticleBody(article.body) : '';
  const [copiedLink, setCopiedLink] = useState(false);
  const handleFacebookShare = () => {
    const shareUrl = buildAbsoluteNewsArticleUrl(article);
    const shareWindowUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(shareWindowUrl, '_blank', 'noopener,noreferrer,width=640,height=720');
  };

  const handleCopyLink = async () => {
    try {
      const shareUrl = buildAbsoluteNewsArticleUrl(article);
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      console.error('Failed to copy article link:', error);
    }
  };

  const handleShareMore = async () => {
    const shareUrl = buildAbsoluteNewsArticleUrl(article);

    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt,
          url: shareUrl,
        });
        return;
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
      }
    }

    await handleCopyLink();
  };

  return (
    <div className="animate-in fade-in duration-700 pb-12">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2.5 mb-6 text-slate-500 hover:text-slate-900 font-bold text-xs uppercase tracking-widest transition-colors active:scale-95"
      >
        <ArrowLeft size={14} />
        Back to Newsfeed
      </button>

      {/* Article Content Card */}
      <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
        {/* ── Top Bar: category accent stripe ── */}
        <div className="h-1.5 bg-gradient-to-r from-blue-600 via-blue-500 to-lime-400" />

        {/* ── Header Section ── */}
        <div className="px-6 sm:px-8 md:px-14 lg:px-20 pt-10 md:pt-14">
          {/* Category + Date */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-[0.2em]">
              {article.category}
            </span>
            {(article.publishedAt || article.rawDate) && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <Calendar size={12} />
                {formatDateLong(article.publishedAt || article.rawDate)}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] lg:text-5xl font-black text-slate-950 tracking-[-0.03em] leading-[1.08] mb-5">
            {article.title}
          </h1>

          {/* Excerpt / Lede */}
          {article.excerpt && (
            <p className="text-base md:text-lg text-slate-500 font-normal leading-[1.6] mb-8 max-w-2xl antialiased">
              {article.excerpt}
            </p>
          )}

          {/* Author & Meta Row */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-5 pb-8 border-b-2 border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-lime-400 font-black text-sm ring-2 ring-slate-200">
                {article.author.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 leading-tight">{article.author}</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{article.readTime}</p>
              </div>
            </div>

            <div className="ml-auto flex flex-wrap justify-end gap-2">
              <button
                onClick={handleFacebookShare}
                className="h-9 px-3.5 flex items-center justify-center gap-1.5 bg-[#1877F2] hover:bg-[#166FE5] rounded-lg text-white transition-all text-[10px] font-bold uppercase tracking-wider"
              >
                <Facebook size={14} /> Share
              </button>
              <button
                onClick={() => void handleCopyLink()}
                className="h-9 px-3.5 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-all text-[10px] font-bold uppercase tracking-wider"
              >
                <Copy size={14} /> {copiedLink ? 'Copied!' : 'Link'}
              </button>
              <button
                onClick={() => void handleShareMore()}
                className="h-9 px-3.5 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-all text-[10px] font-bold uppercase tracking-wider"
              >
                <Share2 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Hero Image */}
        <div className="px-6 sm:px-8 md:px-14 lg:px-20 pt-10">
          <div className="max-w-3xl mx-auto rounded-xl overflow-hidden mb-2">
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-auto object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
            />
          </div>
          <p className="max-w-3xl mx-auto text-[12px] text-slate-400 italic mb-10 font-medium">Photo credit: HomesPhNews</p>
        </div>

        {/* External Source Banner */}
        <div className="px-6 sm:px-8 md:px-14 lg:px-20">
          <div className="max-w-3xl mx-auto bg-slate-950 rounded-xl p-5 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ExternalLink size={16} className="text-lime-400 shrink-0" />
              <p className="text-slate-300 text-sm font-medium">Originally published on <span className="text-white font-bold">HomesPhNews</span></p>
            </div>
            <a
              href={article.sourceUrl || (article.slug ? `https://news.homes.ph/article/${article.slug}` : 'https://news.homes.ph/')}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-lime-400 hover:bg-lime-300 text-slate-950 px-5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap flex items-center gap-1.5"
            >
              View Source <ArrowUpRight size={12} />
            </a>
          </div>
        </div>

        {/* ── Article Body ── */}
        <div className="px-6 sm:px-8 md:px-14 lg:px-20 pb-10">
          <div className="max-w-3xl mx-auto">
            {hasContentBlocks ? (
              <ContentBlocksRenderer blocks={article.contentBlocks} heroImage={article.image} />
            ) : article.body ? (
              <div className="sports-article-body" dangerouslySetInnerHTML={{ __html: formattedBody }} />
            ) : (
              <div className="space-y-6">
                <p className="text-base md:text-lg text-slate-500 font-normal leading-[1.6] antialiased">{article.excerpt}</p>
                {article.sourceUrl && (
                  <a
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
                  >
                    Read Full Article <ExternalLink size={14} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="max-w-3xl mx-auto flex flex-wrap gap-2 pt-8 mt-10 border-t-2 border-slate-100">
              <Tag size={14} className="text-slate-300 mt-0.5" />
              {article.tags.map((tag, i) => (
                <span key={i} className="px-3 py-1 bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 cursor-default rounded-md text-[10px] font-bold uppercase tracking-widest transition-colors border border-slate-100">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="border-t-2 border-slate-100">
          <div className="px-6 sm:px-8 md:px-14 lg:px-20 py-6">
            <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto">
              <button
                onClick={onBack}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
              >
                <ArrowLeft size={14} /> More Stories
              </button>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 py-3.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 border border-slate-200"
              >
                Back to Top
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// ─── Skeleton ───────────────────────────────────────────────────
const NewsSkeleton: React.FC = () => (
  <div className="space-y-8 animate-in fade-in duration-700 pb-12">
    <div>
      <div className="h-10 bg-slate-200 rounded-xl w-64 mb-2 animate-pulse" />
      <div className="h-5 bg-slate-100 rounded-lg w-80 animate-pulse" />
    </div>
    <div className="bg-white rounded-[32px] border border-slate-100 p-4 animate-pulse">
      <div className="h-14 bg-slate-50 rounded-[20px] w-full" />
    </div>
    <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden animate-pulse">
      <div className="flex flex-col lg:flex-row">
        <div className="lg:w-3/5 aspect-[16/10] lg:aspect-auto bg-slate-100 min-h-[300px]" />
        <div className="lg:w-2/5 p-10 space-y-4">
          <div className="h-3 bg-slate-100 rounded w-20" />
          <div className="h-8 bg-slate-100 rounded w-full" />
          <div className="h-8 bg-slate-100 rounded w-3/4" />
          <div className="h-4 bg-slate-100 rounded w-full" />
          <div className="h-4 bg-slate-100 rounded w-2/3" />
        </div>
      </div>
    </div>
    <div className="bg-white rounded-[32px] border border-slate-100 p-8 animate-pulse">
      <div className="h-5 bg-slate-100 rounded w-32 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="space-y-4 rounded-[24px] border border-slate-50 p-1">
            <div className="aspect-[16/10] bg-slate-100 rounded-[20px]" />
            <div className="px-4 pb-4 space-y-3">
              <div className="h-3 bg-slate-100 rounded w-16" />
              <div className="h-5 bg-slate-100 rounded w-full" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const NewsLoadingCard: React.FC<{ title?: string; subtitle?: string }> = ({
  title = 'Loading News',
  subtitle = 'Fetching the latest stories for you.',
}) => (
  <div className="space-y-8 animate-in fade-in duration-700 pb-12">
    <div>
      <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Newsfeed</h1>
      <p className="text-slate-500 font-medium tracking-tight">Stay updated with the latest stories.</p>
    </div>
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-5 mx-auto">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
      <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">{title}</h3>
      <p className="text-slate-500 text-sm font-medium">{subtitle}</p>
    </div>
  </div>
);

// ─── Main News Component ────────────────────────────────────────
const News: React.FC = () => {
  const navigate = useNavigate();
  const { legacyArticleId, slug } = useParams<{ legacyArticleId?: string; slug?: string }>();
  const isArticleRoute = Boolean(slug || legacyArticleId);
  const [articles, setArticles] = useState<NormalizedArticle[]>([]);
  const [loading, setLoading] = useState(isArticleRoute);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<NormalizedArticle | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchArticles = useCallback(async (pageNum: number) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/news/articles?page=${pageNum}`);
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const result = await response.json();
      const rawArticles: ApiArticle[] = result?.data?.data || result?.data || result?.articles || [];
      const normalized = rawArticles.map((a: ApiArticle, i: number) => normalizeArticle(a, i));
      setArticles(normalized);
      if (result?.data) {
        setPagination({
          current_page: result.data.current_page || pageNum,
          last_page: result.data.last_page || 1,
          per_page: result.data.per_page || rawArticles.length,
          total: result.data.total || rawArticles.length,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load articles');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (isArticleRoute) return;
    fetchArticles(page);
  }, [isArticleRoute, page, fetchArticles]);

  const fetchArticleDetail = useCallback(async (options: { legacyId?: string; articleSlug?: string }) => {
    setLoading(true);
    setError(null);
    try {
      let rawArticle: ApiArticle | null = null;

      if (options.articleSlug) {
        const slugResponse = await fetch(`/api/v1/news/articles/slug/${encodeURIComponent(options.articleSlug)}`);
        if (slugResponse.ok) {
          const slugResult = await slugResponse.json();
          rawArticle = slugResult?.data || slugResult?.article || slugResult || null;
        }
      }

      if (!rawArticle && options.legacyId) {
        const response = await fetch(`/api/v1/news/articles/${options.legacyId}`);
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
        const result = await response.json();
        rawArticle = result?.data || result?.article || result || null;
      }

      if (!rawArticle) throw new Error('Article not found');
      setSelectedArticle(normalizeArticle(rawArticle, 0));
    } catch (err: any) {
      setSelectedArticle(null);
      setError(err.message || 'Failed to load article');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isArticleRoute) {
      setSelectedArticle(null);
      setLoading(false);
      return;
    }
    fetchArticleDetail({ legacyId: legacyArticleId, articleSlug: slug });
  }, [fetchArticleDetail, isArticleRoute, legacyArticleId, slug]);

  useEffect(() => {
    if (!legacyArticleId || !selectedArticle) return;
    navigate(buildNewsArticlePath(selectedArticle), { replace: true });
  }, [legacyArticleId, navigate, selectedArticle]);

  const handleImageError = (articleId: string) => {
    setImageErrors(prev => new Set(prev).add(articleId));
  };

  const getArticleImage = (article: NormalizedArticle | undefined) => {
    if (!article) return FALLBACK_IMAGE;
    return imageErrors.has(article.id) ? FALLBACK_IMAGE : article.image;
  };

  useSEO(
    isArticleRoute && selectedArticle
      ? {
          title: `${selectedArticle.title} | Pickleball News Philippines`,
          description: selectedArticle.excerpt,
          canonical: `https://www.pickleplay.ph${buildNewsArticlePath(selectedArticle)}`,
          ogType: 'article',
          image: selectedArticle.image,
          structuredData: {
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: selectedArticle.title,
            description: selectedArticle.excerpt,
            image: [selectedArticle.image],
            author: {
              '@type': 'Person',
              name: selectedArticle.author,
            },
            datePublished: selectedArticle.rawDate || undefined,
            dateModified: selectedArticle.rawDate || undefined,
            mainEntityOfPage: `https://www.pickleplay.ph${buildNewsArticlePath(selectedArticle)}`,
            publisher: {
              '@type': 'Organization',
              name: 'PicklePlay Philippines',
              logo: {
                '@type': 'ImageObject',
                url: 'https://www.pickleplay.ph/images/PicklePlayLogo.jpg',
              },
            },
          },
        }
      : {
          title: 'Pickleball News Philippines | PicklePlay',
          description:
            'Stay updated with pickleball news in the Philippines, including tournaments, player highlights, community stories, and local updates.',
          canonical: 'https://www.pickleplay.ph/news',
          structuredData: {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Pickleball News Philippines',
            url: 'https://www.pickleplay.ph/news',
            description:
              'Latest pickleball news, stories, and community updates from the Philippines.',
          },
        }
  );

  // ── Article Detail ──
  if (isArticleRoute && selectedArticle) {
    return <ArticleDetail article={selectedArticle} onBack={() => navigate('/news')} />;
  }

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(articles.map(a => a.category.toLowerCase())))];

  // Filter articles
  const filteredArticles = articles.filter(a => {
    const matchesSearch = !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || a.category.toLowerCase() === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredArticle = filteredArticles[0];
  const gridArticles = filteredArticles.slice(1);

  // ── Error State ──
  if (error) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700 pb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Newsfeed</h1>
          <p className="text-slate-500 font-medium tracking-tight">Stay updated with the latest stories.</p>
        </div>
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-5 mx-auto">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Unable to Load News</h3>
          <p className="text-slate-500 text-sm mb-6 font-medium">{error}</p>
          <button
            onClick={() => (isArticleRoute ? fetchArticleDetail({ legacyId: legacyArticleId, articleSlug: slug }) : fetchArticles(page))}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95"
          >
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return isArticleRoute
      ? <NewsLoadingCard title="Loading Article" subtitle="Opening this story for you." />
      : <NewsSkeleton />;
  }

  if (isArticleRoute) {
    return <NewsLoadingCard title="Loading Article" subtitle="Opening this story for you." />;
  }

  // ── Empty State ──
  if (articles.length === 0) {
    return <NewsLoadingCard title="Loading News" subtitle="Fetching the latest stories for you." />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Newsfeed</h1>
          <p className="text-slate-500 font-medium tracking-tight">Stay updated with the latest stories and community highlights.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => (isArticleRoute ? fetchArticleDetail({ legacyId: legacyArticleId, articleSlug: slug }) : fetchArticles(page))}
            className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Search + Category Filter Bar ── */}
      <div className="bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search articles by title, content, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-transparent rounded-[20px] focus:bg-white focus:border-blue-200 outline-none transition-all font-medium"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          {categories.slice(0, 6).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-3.5 rounded-[20px] font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
              }`}
            >
              {cat === 'all' ? 'All News' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Featured Story Card ── */}
      {featuredArticle && (
        <div
          className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden cursor-pointer group"
          onClick={() => navigate(buildNewsArticlePath(featuredArticle))}
        >
          <div className="flex flex-col lg:flex-row">
            <div className="lg:w-3/5 relative aspect-[16/10] lg:aspect-auto overflow-hidden">
              <img
                src={getArticleImage(featuredArticle)}
                alt={featuredArticle.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 min-h-[280px] lg:min-h-[360px]"
                onError={() => handleImageError(featuredArticle.id)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent lg:hidden" />
              <div className="absolute top-4 left-4">
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                  Featured
                </span>
              </div>
              {/* Mobile title overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 lg:hidden">
                <h2 className="text-xl font-black text-white leading-tight uppercase tracking-tight">
                  {featuredArticle.title}
                </h2>
              </div>
            </div>
            <div className="lg:w-2/5 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">{featuredArticle.category}</span>
              <h2 className="hidden lg:block text-2xl xl:text-3xl font-black text-slate-900 tracking-tight leading-tight uppercase mb-4 group-hover:text-blue-600 transition-colors">
                {featuredArticle.title}
              </h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-3 mb-6">
                {featuredArticle.excerpt}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-lime-400 font-black text-[9px]">
                    {featuredArticle.author.charAt(0).toUpperCase()}
                  </div>
                  <span>{featuredArticle.author}</span>
                </div>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span>{featuredArticle.date}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="flex items-center gap-1"><Clock size={10} /> {featuredArticle.readTime}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Articles Grid ── */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-50">
          <div className="flex items-center gap-2">
            <Newspaper size={18} className="text-blue-600" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              {activeCategory === 'all' ? 'All Stories' : activeCategory}
            </h2>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">{filteredArticles.length}</span>
          </div>
          {pagination && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Page {pagination.current_page} of {pagination.last_page}
            </span>
          )}
        </div>

        {filteredArticles.length === 0 && searchQuery ? (
          <div className="p-16 text-center">
            <Search size={32} className="text-slate-200 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-400">No articles match "{searchQuery}"</p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 md:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {gridArticles.map((article) => (
                <div
                  key={article.id}
                  className="group cursor-pointer rounded-[20px] sm:rounded-[24px] border border-slate-100 hover:border-blue-200 bg-white hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
                  onClick={() => navigate(buildNewsArticlePath(article))}
                >
                  {/* Image */}
                  <div className="aspect-[16/10] overflow-hidden relative">
                    <img
                      src={getArticleImage(article)}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={() => handleImageError(article.id)}
                    />
                    <div className="absolute top-3 left-3">
                      <span className="bg-blue-600/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                        {article.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug uppercase tracking-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed line-clamp-2 mb-4 flex-1">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-slate-900 flex items-center justify-center text-lime-400 font-black text-[7px] sm:text-[8px]">
                          {article.author.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">{article.author}</span>
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 uppercase">{article.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Promo Banner ── */}
      <div className="bg-slate-900 rounded-[32px] p-6 sm:p-8 md:p-12 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-10 relative overflow-hidden shadow-lg border border-white/5">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-lime-400/5 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 lg:w-1/2 text-center lg:text-left">
          <span className="bg-lime-400 text-slate-950 px-3.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 inline-block">
            Limited Pro Offer
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-none uppercase tracking-tighter mb-4">
            Upgrade Your <br />
            <span className="text-blue-400">Pickle Game.</span>
          </h2>
          <p className="text-slate-400 text-sm font-medium max-w-sm mx-auto lg:mx-0 mb-6 leading-relaxed">
            Get 20% off on all pro-level paddles and equipment. Dominate the court with the best gear.
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95">
            Shop the Pro Collection
          </button>
        </div>

        <div className="relative z-10 lg:w-1/2 flex justify-center">
          <div className="w-full max-w-xs sm:max-w-sm aspect-[4/3] rounded-[24px] sm:rounded-[28px] bg-gradient-to-br from-blue-600 to-lime-400 p-1">
            <div className="w-full h-full rounded-[22px] sm:rounded-[26px] bg-slate-900/40 backdrop-blur-xl flex items-center justify-center border border-white/10 overflow-hidden group hover:bg-slate-900/20 transition-all relative">
              <img src="/images/home-images/pb11.jpg" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="Ads" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/90 backdrop-blur-md px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl shadow-xl">
                  <p className="text-slate-950 font-black text-base sm:text-lg tracking-tighter uppercase">PH Power Pack</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Cards Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Contributors Card */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <Trophy size={18} className="text-lime-500" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Top Contributors</h3>
          </div>
          <div className="space-y-4 sm:space-y-5">
            {["Coach Mike", "Jojo Rivera", "Sara Lim", "Alex Tan"].map((name, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-lime-400 font-black text-sm shadow-md shrink-0">
                  {name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 uppercase truncate">{name}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Verified Contributor</p>
                </div>
                <Zap size={14} className="text-lime-500 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Viber Community Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[32px] p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative z-10">
            <p className="text-[9px] font-black tracking-widest uppercase mb-3 opacity-70">Pickle Hub</p>
            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter mb-2 leading-none">Join Our</h3>
            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter mb-6 leading-none text-lime-400 italic">Viber Community</h3>
            <button className="bg-white text-blue-600 w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all hover:bg-blue-50">
              Join Channel
            </button>
          </div>
        </div>

        {/* Quick Stats Card */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 sm:p-8 md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={18} className="text-blue-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Feed Stats</h3>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between p-3.5 sm:p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Newspaper size={16} className="text-blue-600" />
                <span className="text-xs font-bold text-slate-600">Total Articles</span>
              </div>
              <span className="text-lg font-black text-slate-900">{articles.length}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 sm:p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Tag size={16} className="text-emerald-600" />
                <span className="text-xs font-bold text-slate-600">Categories</span>
              </div>
              <span className="text-lg font-black text-slate-900">{categories.length - 1}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 sm:p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Flame size={16} className="text-orange-500" />
                <span className="text-xs font-bold text-slate-600">Trending</span>
              </div>
              <span className="text-lg font-black text-slate-900">{Math.min(articles.length, 5)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Pagination ── */}
      {pagination && pagination.last_page > 1 && (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(pagination.last_page, 5) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${
                  page === p
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
            disabled={page >= pagination.last_page}
            className="flex items-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default News;

