
import React, { useState, useEffect, useCallback } from 'react';
import useSEO from '../hooks/useSEO';
import { ArrowLeft, ArrowRight, Share2, Bookmark, AlertCircle, ExternalLink, Newspaper, RefreshCw, Clock, TrendingUp, Eye, ChevronRight, Flame, Zap } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────
interface ApiArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  content: string | null;
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
  source: string | null;
  url: string | null;
  external_url: string | null;
}

interface NormalizedArticle {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  date: string;
  rawDate: string;
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

function normalizeArticle(raw: ApiArticle, index: number): NormalizedArticle {
  const image = raw.image || raw.image_url || raw.featured_image || raw.thumbnail || PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
  const date = raw.published_at || raw.created_at || raw.date || '';
  const readTime = raw.read_time || raw.reading_time || `${Math.max(2, Math.ceil((raw.body || raw.content || '').length / 1000))} min read`;

  return {
    id: String(raw.id),
    title: raw.title || 'Untitled Article',
    excerpt: raw.excerpt || (raw.body || raw.content || '').substring(0, 180) + '...',
    body: raw.body || raw.content || '',
    category: raw.category || raw.category_name || 'General',
    date: date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
    rawDate: date,
    image,
    readTime,
    author: raw.author || raw.author_name || 'Staff',
    slug: raw.slug || '',
    tags: raw.tags || [],
    sourceUrl: raw.url || raw.external_url || '',
  };
}

function formatTimeShort(dateStr: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const hours = d.getHours();
    const mins = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    return `${h}:${String(mins).padStart(2, '0')} ${ampm}`;
  } catch {
    return '';
  }
}

function formatFeaturedDate(dateStr: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function formatDateLong(dateStr: string) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ─── Article Detail View ────────────────────────────────────────
const ArticleDetail: React.FC<{ article: NormalizedArticle; onBack: () => void }> = ({ article, onBack }) => {
  return (
    <div className="animate-fade-in pb-20 max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors mb-8 group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Newsfeed
      </button>

      <div className="flex items-center gap-3 mb-5">
        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
          {article.category}
        </span>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {formatDateLong(article.date)}
        </span>
      </div>

      <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-[1.05] mb-6">
        {article.title}
      </h1>

      <div className="flex items-center gap-6 mb-8 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white font-black text-xs">
            {article.author.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{article.author}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{article.readTime}</p>
          </div>
        </div>
        <div className="ml-auto flex gap-1.5">
          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all"><Share2 size={16} /></button>
          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all"><Bookmark size={16} /></button>
          {article.sourceUrl && (
            <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all">
              <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>

      <div className="aspect-[16/9] w-full rounded-xl overflow-hidden mb-10 shadow-lg">
        <img
          src={article.image}
          alt={article.title}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
        />
      </div>

      {article.body ? (
        <div
          className="prose prose-lg prose-slate max-w-none
            prose-headings:font-black prose-headings:tracking-tight
            prose-p:text-slate-600 prose-p:leading-relaxed
            prose-a:text-blue-600 prose-a:font-bold prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-xl prose-img:shadow-lg
            prose-blockquote:border-l-blue-600 prose-blockquote:bg-blue-50 prose-blockquote:rounded-r-xl prose-blockquote:py-1
            mb-12"
          dangerouslySetInnerHTML={{ __html: article.body }}
        />
      ) : (
        <div className="text-slate-600 text-lg leading-relaxed mb-12 space-y-6">
          <p>{article.excerpt}</p>
          {article.sourceUrl && (
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 font-black text-sm uppercase tracking-widest hover:gap-3 transition-all"
            >
              Read Full Article <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}

      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-8 border-b border-slate-200 mb-8">
          {article.tags.map((tag, i) => (
            <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest">
              {tag}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={onBack}
        className="flex items-center gap-3 text-sm font-black text-blue-600 uppercase tracking-widest hover:gap-4 transition-all"
      >
        <ArrowLeft size={16} />
        Back to All Stories
      </button>
    </div>
  );
};

// ─── Section Header Component ──────────────────────────────────
const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; accent?: string; extra?: React.ReactNode }> = ({ icon, title, accent, extra }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <span className="text-lime-500">{icon}</span>
      <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter">{title}</h2>
      {accent && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">{accent}</span>}
    </div>
    {extra}
  </div>
);

// ─── Skeleton ───────────────────────────────────────────────────
const NewsSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-6">
    <div className="bg-white rounded-2xl p-5">
      <div className="h-5 bg-slate-200 rounded w-32 mb-4" />
      <div className="aspect-[16/9] bg-slate-200 rounded-xl mb-4" />
      <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-slate-200 rounded w-full" />
    </div>
    <div className="grid grid-cols-2 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-2xl p-4">
          <div className="aspect-[4/3] bg-slate-200 rounded-lg mb-3" />
          <div className="h-4 bg-slate-200 rounded w-full mb-2" />
          <div className="h-3 bg-slate-200 rounded w-2/3" />
        </div>
      ))}
    </div>
  </div>
);

// ─── Main News Component ────────────────────────────────────────
const News: React.FC = () => {
  useSEO({
    title: 'Pickleball News Philippines',
    description: 'Latest pickleball news, tournament results, community updates, and events from across the Philippines.',
    canonical: 'https://www.pickleplay.ph/news',
  });
  const [articles, setArticles] = useState<NormalizedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<NormalizedArticle | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'featured' | 'trending'>('all');

  const fetchArticles = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/news/articles?page=${pageNum}`);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();
      console.log('📰 API Response:', result);

      const rawArticles: ApiArticle[] = result?.data?.data || result?.data || result?.articles || [];
      console.log('📝 Extracted articles:', rawArticles.length, 'articles');

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
      console.error('News fetch error:', err);
      setError(err.message || 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles(page);
  }, [page, fetchArticles]);

  const handleImageError = (articleId: string) => {
    setImageErrors(prev => new Set(prev).add(articleId));
  };

  const getArticleImage = (article: NormalizedArticle) => {
    return imageErrors.has(article.id) ? FALLBACK_IMAGE : article.image;
  };

  // ── Article Detail View ──
  if (selectedArticle) {
    return <ArticleDetail article={selectedArticle} onBack={() => setSelectedArticle(null)} />;
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="animate-fade-in pb-20">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
            <AlertCircle size={28} className="text-red-400" />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-2">Unable to Load Articles</h3>
          <p className="text-slate-500 text-sm max-w-md mb-5">{error}</p>
          <button
            onClick={() => fetchArticles(page)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Empty State ──
  if (!loading && articles.length === 0) {
    return (
      <div className="animate-fade-in pb-20">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-6 relative">
            <Newspaper size={36} className="text-blue-600" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">No Articles Yet</h3>
          <p className="text-slate-500 text-sm max-w-md mb-6 leading-relaxed">
            Your news feed is empty. Articles will appear here once they're published.
          </p>
          <button
            onClick={() => fetchArticles(page)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            <RefreshCw size={14} /> Check Again
          </button>
        </div>
      </div>
    );
  }

  // ── Distribute articles ──
  const featured = articles[0];
  const latestNews = articles.slice(0, 6);
  const secondaryFeatured = articles.slice(1, 4);
  const mostPopular = articles.slice(0, 6);
  const todaysPicks = articles.slice(0, 4);

  return (
    <div className="animate-fade-in pb-8">
      {/* Loading */}
      {loading ? (
        <NewsSkeleton />
      ) : (
        <>
          {/* ═══════ SPORTS-STYLE TICKER BAR ═══════ */}
          <div className="bg-blue-600 rounded-xl px-4 py-2.5 mb-6 flex items-center gap-3 overflow-hidden shadow-lg shadow-blue-100">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">LIVE</span>
            </div>
            <div className="h-4 w-px bg-white/20 flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
              <div className="flex gap-8 animate-marquee whitespace-nowrap">
                {articles.slice(0, 5).map((a, i) => (
                  <span key={i} className="text-xs text-white/90 font-medium cursor-pointer hover:text-lime-300 transition-colors" onClick={() => setSelectedArticle(a)}>
                    <span className="text-lime-400 font-black mr-1">▸</span> {a.title}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ═══════ TAB NAVIGATION ═══════ */}
          <div className="flex items-center gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm border border-slate-100">
            {([
              { key: 'all', label: 'All News', icon: <Newspaper size={14} /> },
              { key: 'featured', label: 'Featured', icon: <Flame size={14} /> },
              { key: 'trending', label: 'Trending', icon: <TrendingUp size={14} /> },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ═══════ MAIN LAYOUT — RESPONSIVE 2-COLUMN ═══════ */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* ──── LEFT / MAIN CONTENT ──── */}
            <div className="space-y-6 min-w-0">

              {/* HERO FEATURED ARTICLE */}
              {featured && (
                <div
                  className="relative bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 cursor-pointer group"
                  onClick={() => setSelectedArticle(featured)}
                >
                  <div className="aspect-[16/9] w-full overflow-hidden relative">
                    <img
                      src={getArticleImage(featured)}
                      alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      onError={() => handleImageError(featured.id)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    {/* Live badge */}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span className="bg-red-600 text-white px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Zap size={10} /> Featured
                      </span>
                      <span className="bg-white/20 backdrop-blur-sm text-white px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                        {featured.category}
                      </span>
                    </div>
                    {/* Title overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                      <p className="text-lime-400 text-[11px] font-black uppercase tracking-wider mb-2">
                        {formatFeaturedDate(featured.rawDate)}
                      </p>
                      <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-white leading-tight mb-2 group-hover:text-lime-300 transition-colors">
                        {featured.title}
                      </h2>
                      <p className="text-white/70 text-sm leading-relaxed line-clamp-2 hidden sm:block">
                        {featured.excerpt}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-white/50 text-[10px] font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-1"><Clock size={11} /> {featured.readTime}</span>
                        <span className="flex items-center gap-1 text-lime-400 font-black">READ STORY <ArrowRight size={11} /></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECONDARY FEATURED — 3 CARDS ROW */}
              {secondaryFeatured.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {secondaryFeatured.map((article) => (
                    <div
                      key={article.id}
                      className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 cursor-pointer group hover:shadow-md transition-shadow"
                      onClick={() => setSelectedArticle(article)}
                    >
                      <div className="aspect-[4/3] overflow-hidden relative">
                        <img
                          src={getArticleImage(article)}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={() => handleImageError(article.id)}
                        />
                      </div>
                      <div className="p-3.5">
                        <h3 className="text-[13px] font-bold text-slate-900 leading-snug line-clamp-2 mb-1.5 group-hover:text-blue-600 transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                          {article.excerpt.substring(0, 70)}...
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ═══════ TODAY'S TOP PICKS ═══════ */}
              <div>
                <SectionHeader icon={<Flame size={16} />} title="Today's Top Picks" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {todaysPicks.map((article) => (
                    <div
                      key={`pick-${article.id}`}
                      className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 cursor-pointer group hover:shadow-md transition-all flex"
                      onClick={() => setSelectedArticle(article)}
                    >
                      <div className="w-28 sm:w-32 flex-shrink-0 overflow-hidden">
                        <img
                          src={getArticleImage(article)}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={() => handleImageError(article.id)}
                        />
                      </div>
                      <div className="flex-1 p-3.5 min-w-0 flex flex-col justify-center">
                        <h3 className="text-[13px] font-bold text-slate-900 leading-snug line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{article.excerpt.substring(0, 60)}...</p>
                        <div className="flex items-center gap-2 mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <Clock size={10} /> {article.readTime}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FULL ARTICLES LIST */}
              {articles.length > 4 && (
                <div>
                  <SectionHeader icon={<Newspaper size={16} />} title="All Stories" accent={`${articles.length} articles`} />
                  <div className="space-y-3">
                    {articles.slice(4).map((article, idx) => (
                      <div
                        key={`all-${article.id}`}
                        className="bg-white rounded-xl shadow-sm border border-slate-100 cursor-pointer group hover:shadow-md transition-all flex overflow-hidden"
                        onClick={() => setSelectedArticle(article)}
                      >
                        <div className="w-24 sm:w-28 flex-shrink-0 overflow-hidden">
                          <img
                            src={getArticleImage(article)}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={() => handleImageError(article.id)}
                          />
                        </div>
                        <div className="flex-1 p-3.5 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{article.category}</span>
                            <span className="text-[9px] text-slate-300">•</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{article.date}</span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {article.title}
                          </h3>
                          <p className="text-xs text-slate-400 leading-relaxed line-clamp-1 mt-1">{article.excerpt.substring(0, 80)}...</p>
                        </div>
                        <div className="hidden sm:flex items-center pr-4 flex-shrink-0">
                          <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pagination */}
              {pagination && pagination.last_page > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(pagination.last_page, 5) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${pageNum === page
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                            : 'text-slate-500 hover:bg-slate-100'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {pagination.last_page > 5 && (
                      <>
                        <span className="text-slate-400 px-0.5">...</span>
                        <button
                          onClick={() => setPage(pagination.last_page)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${pagination.last_page === page
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                            : 'text-slate-500 hover:bg-slate-100'
                            }`}
                        >
                          {pagination.last_page}
                        </button>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
                    disabled={page >= pagination.last_page}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>

            {/* ──── RIGHT SIDEBAR ──── */}
            <div className="space-y-5">

              {/* LATEST NEWS SIDEBAR */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="bg-blue-600 px-4 py-3 flex items-center gap-2">
                  <Zap size={14} className="text-lime-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Latest News</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {latestNews.map((article, idx) => (
                    <div
                      key={`side-${article.id}`}
                      className="flex gap-3 p-3.5 cursor-pointer group hover:bg-slate-50 transition-colors"
                      onClick={() => setSelectedArticle(article)}
                    >
                      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={getArticleImage(article)}
                          alt={article.title}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(article.id)}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[12px] font-bold text-slate-900 leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {article.title}
                        </h4>
                        <p className="text-[10px] font-bold text-blue-600 mt-1">
                          {formatTimeShort(article.rawDate)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AD SPACE */}
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">ADVERTISEMENT</p>
                <p className="text-[11px] text-slate-400">Ad space reserved</p>
              </div>

              {/* MOST POPULAR */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 flex items-center gap-2">
                  <TrendingUp size={14} className="text-white" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Most Popular</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {mostPopular.map((article, idx) => (
                    <div
                      key={`pop-${article.id}`}
                      className="flex gap-3 p-3.5 cursor-pointer group hover:bg-slate-50 transition-colors"
                      onClick={() => setSelectedArticle(article)}
                    >
                      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                        <span className="text-xs font-black text-white">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[12px] font-bold text-slate-900 leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {article.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1">{article.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* QUICK CATEGORIES */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tighter mb-3">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(articles.map(a => a.category))).slice(0, 8).map((cat, i) => (
                    <span key={i} className="px-3 py-1.5 bg-slate-50 border border-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-600 hover:text-white hover:border-blue-600 cursor-pointer transition-all">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Marquee CSS */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default News;
