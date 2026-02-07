
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, ArrowRight, ArrowLeft, ChevronRight, Share2, Bookmark, Loader2, AlertCircle, ExternalLink, Newspaper, RefreshCw } from 'lucide-react';

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
    image,
    readTime,
    author: raw.author || raw.author_name || 'Staff',
    slug: raw.slug || '',
    tags: raw.tags || [],
    sourceUrl: raw.url || raw.external_url || '',
  };
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
    <div className="animate-fade-in pb-20 pt-32 max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors mb-8 group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Newsfeed
      </button>

      {/* Category & Meta */}
      <div className="flex items-center gap-4 mb-6">
        <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
          {article.category}
        </span>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {formatDateLong(article.date)}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-950 tracking-tighter leading-[0.95] mb-8">
        {article.title}
      </h1>

      {/* Author & Read Time */}
      <div className="flex items-center gap-6 mb-10 pb-8 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black text-sm">
            {article.author.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">{article.author}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{article.readTime}</p>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <button className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all"><Share2 size={18} /></button>
          <button className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all"><Bookmark size={18} /></button>
          {article.sourceUrl && (
            <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all">
              <ExternalLink size={18} />
            </a>
          )}
        </div>
      </div>

      {/* Featured Image */}
      <div className="aspect-[16/9] w-full rounded-[32px] overflow-hidden mb-12 shadow-xl">
        <img
          src={article.image}
          alt={article.title}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
        />
      </div>

      {/* Article Body */}
      {article.body ? (
        <div
          className="prose prose-lg prose-slate max-w-none
            prose-headings:font-black prose-headings:tracking-tight
            prose-p:text-slate-600 prose-p:leading-relaxed
            prose-a:text-blue-600 prose-a:font-bold prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-2xl prose-img:shadow-lg
            prose-blockquote:border-l-blue-600 prose-blockquote:bg-blue-50 prose-blockquote:rounded-r-2xl prose-blockquote:py-1
            mb-16"
          dangerouslySetInnerHTML={{ __html: article.body }}
        />
      ) : (
        <div className="text-slate-600 text-lg leading-relaxed mb-16 space-y-6">
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

      {/* Tags */}
      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-10 border-b border-slate-200 mb-10">
          {article.tags.map((tag, i) => (
            <span key={i} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Back to Newsfeed */}
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

// ─── Skeleton Loader ───────────────────────────────────────────
const ArticleSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="aspect-[4/3] rounded-[40px] bg-slate-200" />
    <div className="space-y-3 px-2">
      <div className="h-3 bg-slate-200 rounded w-1/3" />
      <div className="h-6 bg-slate-200 rounded w-full" />
      <div className="h-6 bg-slate-200 rounded w-2/3" />
      <div className="h-4 bg-slate-200 rounded w-full" />
      <div className="h-4 bg-slate-200 rounded w-4/5" />
    </div>
  </div>
);

const FeaturedSkeleton: React.FC = () => (
  <div className="aspect-[21/9] w-full rounded-[48px] bg-slate-200 animate-pulse" />
);

// ─── Main News Component ────────────────────────────────────────
const News: React.FC = () => {
  const [articles, setArticles] = useState<NormalizedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<NormalizedArticle | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

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

      // Handle the nested response: result.data.data = articles array
      const rawArticles: ApiArticle[] = result?.data?.data || result?.data || result?.articles || [];

      console.log('📝 Extracted articles:', rawArticles.length, 'articles');

      // Empty state is OK - set empty array
      const normalized = rawArticles.map((a: ApiArticle, i: number) => normalizeArticle(a, i));
      setArticles(normalized);

      // Extract pagination meta
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
      <div className="space-y-12 animate-fade-in pb-20 pt-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-4">THE FEED</p>
            <h1 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tighter">LATEST <br />UPDATES.</h1>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center mb-6">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Unable to Load Articles</h3>
          <p className="text-slate-500 text-sm max-w-md mb-6">{error}</p>
          <button
            onClick={() => fetchArticles(page)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all"
          >
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Empty State (no articles yet) ──
  if (!loading && articles.length === 0) {
    return (
      <div className="space-y-12 animate-fade-in pb-20 pt-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-4">THE FEED</p>
            <h1 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tighter">LATEST <br />UPDATES.</h1>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-8 relative">
            <Newspaper size={40} className="text-blue-400" />
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-lime-400 flex items-center justify-center text-slate-900 font-black text-xs">0</div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-3">No Articles Yet</h3>
          <p className="text-slate-500 text-base max-w-md mb-8 leading-relaxed">
            Your news feed is empty right now. Articles will appear here once they're published to your site.
          </p>
          <button
            onClick={() => fetchArticles(page)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            <RefreshCw size={14} /> Check Again
          </button>
        </div>

        {/* Newsletter Signup - Still show even when empty */}
        <section className="bg-blue-600 rounded-[48px] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-blue-200">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 space-y-8 max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">STAY IN THE <span className="italic text-blue-200">KITCHEN.</span></h2>
            <p className="text-blue-100 text-lg font-medium">Get notified when new articles are published. We'll send updates straight to your inbox.</p>
            <form className="flex flex-col sm:flex-row gap-4" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Enter your email address..."
                className="flex-1 h-16 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-blue-200/50 px-8 font-medium outline-none focus:ring-4 focus:ring-white/20 transition-all"
              />
              <button className="h-16 px-10 rounded-2xl bg-white text-blue-600 font-black text-sm uppercase tracking-widest hover:bg-lime-400 hover:text-slate-900 transition-all">Subscribe</button>
            </form>
            <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest opacity-60">Zero spam. Pure pickleball.</p>
          </div>
        </section>
      </div>
    );
  }

  const featured = articles[0];
  const gridArticles = articles.slice(1);

  return (
    <div className="space-y-12 animate-fade-in pb-20 pt-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-4">THE FEED / LIVE</p>
          <h1 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tighter">LATEST <br />UPDATES.</h1>
        </div>
        {pagination && (
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {pagination.total} article{pagination.total !== 1 ? 's' : ''} — Page {pagination.current_page} of {pagination.last_page}
          </p>
        )}
      </div>

      {/* Loading */}
      {loading ? (
        <>
          <FeaturedSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[1, 2, 3].map(i => <ArticleSkeleton key={i} />)}
          </div>
        </>
      ) : (
        <>
          {/* Featured Article */}
          {featured && (
            <section className="relative group cursor-pointer" onClick={() => setSelectedArticle(featured)}>
              <div className="aspect-[21/9] w-full rounded-[48px] overflow-hidden bg-slate-900 border border-slate-100 shadow-2xl relative">
                <img
                  src={getArticleImage(featured)}
                  className="w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105"
                  alt={featured.title}
                  onError={() => handleImageError(featured.id)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-8 md:p-16 max-w-4xl space-y-6">
                  <span className="bg-lime-400 text-slate-950 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {featured.category}
                  </span>
                  <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none group-hover:text-white transition-colors">
                    {featured.title}
                  </h2>
                  <p className="text-slate-300 text-lg font-medium leading-relaxed line-clamp-2">
                    {featured.excerpt}
                  </p>
                  <div className="flex items-center gap-6 text-white/60 text-xs font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-2"><Calendar size={14} /> {featured.date}</span>
                    <span className="flex items-center gap-2"><Clock size={14} /> {featured.readTime}</span>
                    <span className="flex items-center gap-2 font-black text-lime-400">READ FULL STORY <ArrowRight size={14} /></span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Article Grid */}
          {gridArticles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {gridArticles.map((article) => (
                <article
                  key={article.id}
                  className="group cursor-pointer space-y-6"
                  onClick={() => setSelectedArticle(article)}
                >
                  <div className="aspect-[4/3] rounded-[40px] overflow-hidden border border-slate-100 shadow-sm relative">
                    <img
                      src={getArticleImage(article)}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      alt={article.title}
                      onError={() => handleImageError(article.id)}
                    />
                    <div className="absolute top-6 left-6">
                      <span className="glass-dark text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">
                        {article.category}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4 px-2">
                    <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-2"><Calendar size={12} /> {article.date}</span>
                      <span>{article.readTime}</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-950 leading-tight group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">
                      {article.excerpt}
                    </p>
                    <div className="pt-4 flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-900 border-b-2 border-lime-400 pb-1 group-hover:text-blue-600 group-hover:border-blue-600 transition-all">
                        CONTINUE READING
                      </span>
                      <div className="flex gap-2">
                        <button
                          className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"
                          onClick={(e) => { e.stopPropagation(); }}
                        >
                          <Share2 size={16} />
                        </button>
                        <button
                          className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"
                          onClick={(e) => { e.stopPropagation(); }}
                        >
                          <Bookmark size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.last_page > 1 && (
            <div className="flex items-center justify-center gap-4 pt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowLeft size={14} /> Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(pagination.last_page, 5) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${pageNum === page
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {pagination.last_page > 5 && (
                  <>
                    <span className="text-slate-400 px-1">...</span>
                    <button
                      onClick={() => setPage(pagination.last_page)}
                      className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${pagination.last_page === page
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
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
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ArrowRight size={14} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Newsletter Signup */}
      <section className="bg-blue-600 rounded-[48px] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-blue-200">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 space-y-8 max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">STAY IN THE <span className="italic text-blue-200">KITCHEN.</span></h2>
          <p className="text-blue-100 text-lg font-medium">Get the latest tournament invites, gear drops, and pro drills delivered directly to your inbox every Monday.</p>
          <form className="flex flex-col sm:flex-row gap-4" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Enter your email address..."
              className="flex-1 h-16 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-blue-200/50 px-8 font-medium outline-none focus:ring-4 focus:ring-white/20 transition-all"
            />
            <button className="h-16 px-10 rounded-2xl bg-white text-blue-600 font-black text-sm uppercase tracking-widest hover:bg-lime-400 hover:text-slate-900 transition-all">Subscribe</button>
          </form>
          <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest opacity-60">Zero spam. Pure pickleball.</p>
        </div>
      </section>
    </div>
  );
};

export default News;
