
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Share2, Bookmark, AlertCircle, ExternalLink, Newspaper, RefreshCw, Clock, TrendingUp, Eye, ChevronRight, ChevronLeft, Flame, Zap, Trophy, UsersRound } from 'lucide-react';

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
    <div className="min-h-screen bg-[#F1F5F9] animate-fade-in pb-24 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] -z-0 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-lime-400/5 blur-[120px] -z-0 pointer-events-none"></div>

      {/* Header bar with back button */}
      <div className="sticky top-0 z-50 bg-[#F1F5F9]/80 backdrop-blur-md border-b border-slate-200/50 mb-0">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-blue-600 transition-all group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            BACK TO NEWSFEED
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-12">
        {/* Main Content Card */}
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-200/60 overflow-hidden relative">
          {/* Header Accents */}
          <div className="p-8 md:p-12 pb-0">
            <div className="flex items-center gap-3 mb-6">
              <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20">
                {article.category}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Clock size={12} className="text-slate-300" />
                {formatDateLong(article.date)}
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.05] mb-8 uppercase">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 mb-10 pb-10 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-lime-400 font-black text-sm shadow-xl shadow-slate-900/10">
                  {article.author.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Written by</p>
                  <p className="text-base font-black text-slate-900 leading-none lowercase first-letter:uppercase">{article.author}</p>
                </div>
              </div>

              <div className="h-10 w-px bg-slate-100 hidden sm:block"></div>

              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Reading Time</p>
                <p className="text-base font-black text-slate-900 leading-none">{article.readTime}</p>
              </div>

              <div className="ml-auto flex gap-2">
                <button className="w-11 h-11 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-500 hover:text-blue-600 transition-all border border-slate-100"><Share2 size={18} /></button>
                <button className="w-11 h-11 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-500 hover:text-blue-600 transition-all border border-slate-100"><Bookmark size={18} /></button>
              </div>
            </div>
          </div>

          <div className="px-8 md:px-12 pb-12">
            {/* Hero Image */}
            <div className="aspect-[16/9] w-full rounded-[32px] overflow-hidden mb-12 shadow-2xl relative">
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-[32px]"></div>
            </div>

            {/* ── External Source Disclaimer Banner ── */}
            <div className="bg-slate-950 rounded-[32px] p-8 md:p-10 mb-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xl border border-white/5">
              {/* Abstract decorations */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] -translate-y-1/2 translate-x-1/4"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-lime-400/5 blur-[80px] translate-y-1/2 -translate-x-1/4"></div>

              <div className="relative z-10 flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <ExternalLink size={24} className="text-lime-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-white text-sm md:text-base font-black uppercase tracking-widest">
                    External News
                  </p>
                  <p className="text-slate-400 text-xs md:text-sm font-medium">
                    This article was originally published on an external news site.
                  </p>
                </div>
              </div>

              <a
                href={article.sourceUrl || (article.slug ? `https://news.homes.ph/article/${article.slug}` : 'https://news.homes.ph/')}
                target="_blank"
                rel="noopener noreferrer"
                className="relative z-10 bg-lime-400 hover:bg-lime-500 text-slate-950 px-10 py-5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-lime-400/20 whitespace-nowrap"
              >
                VIEW ORIGINAL SOURCE
              </a>
            </div>

            {/* Article Content */}
            {article.body ? (
              <div
                className="prose prose-lg prose-slate max-w-none
                  prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-950 prose-headings:uppercase
                  prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-lg prose-p:font-medium
                  prose-a:text-blue-600 prose-a:font-black prose-a:no-underline hover:prose-a:underline
                  prose-img:rounded-[32px] prose-img:shadow-2xl
                  prose-blockquote:border-l-blue-600 prose-blockquote:bg-blue-50/50 prose-blockquote:rounded-3xl prose-blockquote:py-2 prose-blockquote:px-8 prose-blockquote:text-blue-900 prose-blockquote:font-black
                  mb-12"
                dangerouslySetInnerHTML={{ __html: article.body }}
              />
            ) : (
              <div className="text-slate-600 text-lg leading-relaxed mb-12 space-y-6 font-medium">
                <p>{article.excerpt}</p>
                {article.sourceUrl && (
                  <div className="pt-4">
                    <a
                      href={article.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                    >
                      READ FULL ARTICLE <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </div>
            )}

            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-10 border-t border-slate-50 mb-10">
                {article.tags.map((tag, i) => (
                  <span key={i} className="px-4 py-2 bg-slate-50 text-slate-500 hover:bg-slate-100 cursor-default rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-slate-100">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={onBack}
                className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95"
              >
                <ArrowLeft size={16} />
                BACK TO STORIES
              </button>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-100 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95"
              >
                BACK TO TOP
              </button>
            </div>
          </div>
        </div>
      </div>
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
  <div className="animate-pulse space-y-16">
    {/* Hero Split Skeleton */}
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="lg:w-2/3">
        <div className="aspect-[16/9] md:aspect-[21/10] bg-slate-200 rounded-[40px]" />
      </div>
      <div className="lg:w-1/3 space-y-6">
        <div className="h-6 bg-slate-200 rounded-full w-32 mb-4" />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-4">
            <div className="w-24 h-24 bg-slate-200 rounded-[20px] shrink-0" />
            <div className="flex-1 space-y-2 py-2">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Fresh Picks Row */}
    <div className="space-y-6">
      <div className="h-6 bg-slate-200 rounded-full w-40" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="space-y-4">
            <div className="aspect-[4/3] bg-slate-200 rounded-[28px]" />
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>

    {/* Ad Banner Skeleton */}
    <div className="h-[400px] bg-slate-200 rounded-[48px]" />
  </div>
);

// ─── Main News Component ────────────────────────────────────────
const News: React.FC = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<NormalizedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<NormalizedArticle | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'featured' | 'trending' | 'pro'>('all');

  const fetchArticles = useCallback(async (pageNum: number) => {
    setLoading(true);
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
    }
  }, []);

  useEffect(() => {
    fetchArticles(page);
  }, [page, fetchArticles]);

  const handleImageError = (articleId: string) => {
    setImageErrors(prev => new Set(prev).add(articleId));
  };

  const getArticleImage = (article: NormalizedArticle | undefined) => {
    if (!article) return FALLBACK_IMAGE;
    return imageErrors.has(article.id) ? FALLBACK_IMAGE : article.image;
  };

  if (selectedArticle) {
    return <ArticleDetail article={selectedArticle} onBack={() => setSelectedArticle(null)} />;
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen py-20">
        <div className="max-w-md mx-auto bg-white rounded-[40px] p-12 text-center shadow-xl border border-slate-100">
          <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center mb-6 mx-auto">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Unable to Load News</h3>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">{error}</p>
          <button
            onClick={() => fetchArticles(page)}
            className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
          >
            <RefreshCw size={16} /> TRY AGAIN
          </button>
        </div>
      </div>
    );
  }

  // ── Loading Skeleton ──
  if (loading) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen pt-12 px-6">
        <div className="max-w-[1500px] mx-auto">
          <NewsSkeleton />
        </div>
      </div>
    );
  }

  // ── Empty State ──
  if (articles.length === 0) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen py-20">
        <div className="max-w-md mx-auto bg-white rounded-[40px] p-12 text-center shadow-xl border border-slate-100">
          <div className="w-24 h-24 rounded-[40px] bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-8 mx-auto relative">
            <Newspaper size={40} className="text-blue-600" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">No Articles Found</h3>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">
            We couldn't find any articles at the moment. Please check back later for the latest updates.
          </p>
          <button
            onClick={() => fetchArticles(page)}
            className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95"
          >
            <RefreshCw size={16} /> REFRESH FEED
          </button>
        </div>
      </div>
    );
  }

  // ── Layout Distribution (Matching Mockup) ──
  const mainFeature = articles[0];
  const topStack = articles.slice(1, 4);
  const freshGrid = articles.slice(4, 8);
  const middleBanner = articles[8] || articles[0];
  const listContent = articles.slice(9, 13);
  const bottomGrid = articles.slice(13, 17);

  return (
    <div className="bg-[#F8FAFC] min-h-screen animate-fade-in font-sans pb-20">
      {/* ── CINEMATIC TOP HERO (MATCHING MOCKUP TOP) ── */}
      <section className="max-w-[1500px] mx-auto px-6 pt-10 pb-16">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Featured (Left side of mockup top) */}
          <div className="lg:w-2/3 group cursor-pointer" onClick={() => setSelectedArticle(mainFeature)}>
            <div className="relative aspect-[16/9] md:aspect-[21/10] rounded-[40px] overflow-hidden shadow-2xl border border-slate-200/50">
              <img src={getArticleImage(mainFeature)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full">
                <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg mb-4 inline-block">
                  FEATURED STORY
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-white leading-[1.1] uppercase tracking-tighter mb-4 group-hover:text-lime-400 transition-colors">
                  {mainFeature?.title || "Loading main story..."}
                </h2>
                <div className="flex items-center gap-4 text-slate-300 text-xs font-bold uppercase tracking-widest">
                  <span>{mainFeature?.author}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                  <span>{mainFeature?.readTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Stack (Right side of mockup top) */}
          <div className="lg:w-1/3 flex flex-col gap-6">
            <SectionHeader title="TRENDING NEWS" icon={<Flame size={18} />} accent="HOT" />
            <div className="space-y-6">
              {topStack.map((article, idx) => (
                <div key={article.id} className="flex gap-4 group cursor-pointer" onClick={() => setSelectedArticle(article)}>
                  <div className="w-24 h-24 rounded-[20px] overflow-hidden shrink-0 border border-slate-100 shadow-sm">
                    <img src={getArticleImage(article)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-blue-600 text-[9px] font-black uppercase tracking-widest">{article.category}</span>
                    <h3 className="text-sm font-black text-slate-900 leading-tight line-clamp-2 uppercase group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{article.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FRESH PICK GRID (MATCHING MOCKUP ROW 2) ── */}
      <section className="max-w-[1500px] mx-auto px-6 py-12 border-y border-slate-200/60 bg-white shadow-sm">
        <SectionHeader title="FRESH PICKS" icon={<Zap size={18} />} extra={<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Updated 5m ago</p>} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {freshGrid.map((article) => (
            <div key={article.id} className="group cursor-pointer space-y-4" onClick={() => setSelectedArticle(article)}>
              <div className="aspect-[4/3] rounded-[28px] overflow-hidden border border-slate-100 shadow-md">
                <img src={getArticleImage(article)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
              </div>
              <div>
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1 block">{article.category}</span>
                <h3 className="text-base font-black text-slate-900 leading-snug line-clamp-2 uppercase group-hover:text-blue-600">
                  {article.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CLEAN ADS PORTION (HIGH-END INTEGRATED BANNER) ── */}
      <section className="max-w-[1500px] mx-auto px-6 py-16">
        <div className="bg-slate-900 rounded-[48px] p-8 md:p-16 flex flex-col lg:flex-row items-center justify-between gap-12 relative overflow-hidden shadow-2xl border border-white/5">
          {/* Abstract glassmorphism decorations */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 blur-[130px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-lime-400/5 blur-[100px] rounded-full" />

          <div className="relative z-10 lg:w-1/2 text-center lg:text-left">
            <span className="bg-lime-400 text-slate-950 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 inline-block">
              LIMITED PRO OFFER
            </span>
            <h2 className="text-4xl md:text-6xl font-black text-white leading-none uppercase tracking-tighter mb-6">
              UPGRADE YOUR <br />
              <span className="text-blue-400">PICKLE GAME.</span>
            </h2>
            <p className="text-slate-400 text-sm md:text-lg font-medium max-w-sm mb-8 leading-relaxed">
              Get 20% off on all pro-level paddles and equipment. Dominate the court with the best gear.
            </p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95">
              SHOP THE PRO COLLECTION
            </button>
          </div>

          <div className="relative z-10 lg:w-1/2 flex justify-center">
            <div className="w-full max-w-md aspect-[4/3] rounded-[40px] bg-gradient-to-br from-blue-600 to-lime-400 p-1">
              <div className="w-full h-full rounded-[38px] bg-slate-900/40 backdrop-blur-xl flex items-center justify-center border border-white/10 hover:bg-slate-900/20 transition-all group overflow-hidden">
                <img src="/images/home-images/pb11.jpg" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="Ads" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-3xl shadow-2xl">
                    <p className="text-slate-950 font-black text-xl tracking-tighter uppercase whitespace-nowrap">PH POWER PACK</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTENT SPLIT VIEW (MATCHING MOCKUP SECTION 4) ── */}
      <section className="max-w-[1500px] mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Main List View (Left side) */}
          <div className="lg:w-2/3 space-y-10">
            <SectionHeader title="LATEST STORIES" icon={<Newspaper size={18} />} />
            <div className="space-y-10">
              {listContent.map((article) => (
                <div key={article.id} className="flex flex-col md:flex-row gap-8 group cursor-pointer" onClick={() => setSelectedArticle(article)}>
                  <div className="md:w-2/5 aspect-[16/10] rounded-[32px] overflow-hidden border border-slate-100 shadow-lg">
                    <img src={getArticleImage(article)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                  </div>
                  <div className="md:w-3/5 space-y-4">
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest inline-block">
                      {article.category}
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 leading-tight uppercase group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-slate-500 text-sm font-medium line-clamp-2 leading-relaxed">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">
                      <span>{article.author}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span>{article.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setPage(p => p + 1)}
              className="w-full py-5 rounded-[24px] bg-white border-2 border-slate-100 text-slate-900 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all shadow-sm"
            >
              LOAD MORE STORIES
            </button>
          </div>

          {/* Sidebar / Leaderboard (Right side of mockup) */}
          <div className="lg:w-1/3 space-y-10">
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl" />
              <SectionHeader title="TOP CONTRIBUTORS" icon={<Trophy size={18} />} />
              <div className="space-y-6 mt-8">
                {["Coach Mike", "Jojo Rivera", "Sara Lim", "Alex Tan"].map((name, i) => (
                  <div key={i} className="flex items-center gap-4 group cursor-pointer hover:translate-x-1 transition-transform">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-lime-400 font-black text-sm shadow-lg">
                      {name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 uppercase">{name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Verified Contributor</p>
                    </div>
                    <div className="ml-auto">
                      <Zap size={16} className="text-lime-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10">
                <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-4 opacity-70">Weekly Hub</p>
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-6 leading-none">JOIN OUR <br /><span className="text-lime-400 italic">VIBER COMMUNITY</span></h3>
                <button className="bg-white text-blue-600 w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-950/20 active:scale-95 transition-all">
                  JOIN CHANNEL
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM GRID (MATCHING MOCKUP ROW 6) ── */}
      <section className="max-w-[1500px] mx-auto px-6 py-20 pb-32">
        <SectionHeader title="PEOPLE ALREADY PICKLED" icon={<UsersRound size={18} />} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {bottomGrid.map((article) => (
            <div key={article.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group cursor-pointer h-full flex flex-col" onClick={() => setSelectedArticle(article)}>
              <div className="aspect-square rounded-[24px] overflow-hidden mb-6">
                <img src={getArticleImage(article)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
              </div>
              <div className="flex-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{article.date}</span>
                <h3 className="text-lg font-black text-slate-900 leading-tight uppercase group-hover:text-blue-600 transition-colors">
                  {article.title}
                </h3>
              </div>
              <div className="pt-6 mt-auto">
                <div className="flex items-center gap-3 text-xs font-black text-blue-600 uppercase tracking-widest">
                  READ STORY <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default News;
