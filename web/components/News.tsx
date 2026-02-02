
import React from 'react';
import { Calendar, Clock, ArrowRight, ChevronRight, Share2, Bookmark } from 'lucide-react';
import { NewsArticle } from '../types';

const NEWS_DATA: NewsArticle[] = [
  {
    id: '1',
    title: 'THE 2025 OPEN: SAN FRANCISCO FINALS ANNOUNCED',
    excerpt: 'The biggest tournament of the year returns to the Bay Area with a record-breaking $250k prize pool and world-class facilities.',
    category: 'Tournament',
    date: 'Oct 12, 2025',
    image: 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=1200',
    readTime: '5 min read',
    author: 'Sarah Jenkins'
  },
  {
    id: '2',
    title: 'WHY CARBON FIBER IS REVOLUTIONIZING THE DINK',
    excerpt: 'A deep dive into the engineering behind the latest paddle technology and why the pros are switching to raw carbon surfaces.',
    category: 'Gear',
    date: 'Oct 10, 2025',
    image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=800',
    readTime: '8 min read',
    author: 'Dr. Michael Chen'
  },
  {
    id: '3',
    title: 'MASTERING THE THIRD SHOT DROP',
    excerpt: 'Coach Dink breaks down the most critical shot in the game. Learn the footwork and paddle angle secrets used by top DUPR players.',
    category: 'Pro Tips',
    date: 'Oct 08, 2025',
    image: 'https://images.unsplash.com/photo-1511067007398-7e4b90cfa4bc?auto=format&fit=crop&q=80&w=800',
    readTime: '4 min read',
    author: 'Coach Dink'
  },
  {
    id: '4',
    title: 'COMMUNITY SPOTLIGHT: RIVERSIDE PARK HUB',
    excerpt: 'How one local park transformed into a national pickleball destination through community funding and passion.',
    category: 'Community',
    date: 'Oct 05, 2025',
    image: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=800',
    readTime: '6 min read',
    author: 'James Wilson'
  }
];

const News: React.FC = () => {
  return (
    <div className="space-y-12 animate-fade-in pb-20 pt-32">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-4">THE FEED / OCT 2025</p>
          <h1 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tighter">LATEST <br />UPDATES.</h1>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">All Stories</button>
          <button className="px-6 py-3 bg-white border border-slate-200 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:text-slate-900 transition-all">Trending</button>
        </div>
      </div>

      {/* Featured Article */}
      <section className="relative group cursor-pointer">
        <div className="aspect-[21/9] w-full rounded-[48px] overflow-hidden bg-slate-900 border border-slate-100 shadow-2xl relative">
          <img src={NEWS_DATA[0].image} className="w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
          <div className="absolute bottom-0 left-0 p-8 md:p-16 max-w-4xl space-y-6">
            <span className="bg-lime-400 text-slate-950 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">FEATURED STORY</span>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none group-hover:text-white transition-colors">
              {NEWS_DATA[0].title}
            </h2>
            <p className="text-slate-300 text-lg font-medium leading-relaxed line-clamp-2">
              {NEWS_DATA[0].excerpt}
            </p>
            <div className="flex items-center gap-6 text-white/60 text-xs font-bold uppercase tracking-widest">
              <span className="flex items-center gap-2"><Calendar size={14} /> {NEWS_DATA[0].date}</span>
              <span className="flex items-center gap-2"><Clock size={14} /> {NEWS_DATA[0].readTime}</span>
              <span className="flex items-center gap-2 font-black text-lime-400">READ FULL STORY <ArrowRight size={14} /></span>
            </div>
          </div>
        </div>
      </section>

      {/* Article Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {NEWS_DATA.slice(1).map((article) => (
          <article key={article.id} className="group cursor-pointer space-y-6">
            <div className="aspect-[4/3] rounded-[40px] overflow-hidden border border-slate-100 shadow-sm relative">
              <img src={article.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
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
                <span className="text-[10px] font-black text-slate-900 border-b-2 border-lime-400 pb-1 group-hover:text-blue-600 group-hover:border-blue-600 transition-all">CONTINUE READING</span>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><Share2 size={16} /></button>
                  <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><Bookmark size={16} /></button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Newsletter Signup */}
      <section className="bg-blue-600 rounded-[48px] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-blue-200">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 space-y-8 max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">STAY IN THE <span className="italic text-blue-200">KITCHEN.</span></h2>
          <p className="text-blue-100 text-lg font-medium">Get the latest tournament invites, gear drops, and pro drills delivered directly to your inbox every Monday.</p>
          <form className="flex flex-col sm:flex-row gap-4">
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
