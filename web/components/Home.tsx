
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Navigation,
  Search,
  ArrowRight,
  Shield,
  Zap,
  Star,
  Trophy,
  ArrowUpRight,
  ChevronRight,
  ShoppingBag,
  Plus,
  Newspaper,
  Globe,
  Activity,
  ChevronDown,
  GraduationCap,
  Play,
  Facebook,
  Instagram,
  Twitter,
  Mail,
  Phone
} from 'lucide-react';
import { Product, NewsArticle } from '../types';

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=1920",
  "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=1920",
  "https://images.unsplash.com/photo-1511067007398-7e4b90cfa4bc?auto=format&fit=crop&q=80&w=1920"
];

const PARTNERS = [
  "FILIPINO HOMES", "FILIPINO HOMES", "FILIPINO HOMES", "FILIPINO HOMES", "FILIPINO HOMES", "FILIPINO HOMES"
];

const MOCK_COURTS = [
  { name: "Riverside Elite PH", location: "Riverside, Manila", rating: 4.9 },
  { name: "Central Cebu Pickleball Hub", location: "Cebu City", rating: 4.8 },
  { name: "Davao Smash Lab", location: "West Davao", rating: 4.7 },
  { name: "Metro Baguio Dinking Spot", location: "Baguio City", rating: 4.6 }
];

const LATEST_NEWS: Partial<NewsArticle>[] = [
  {
    id: '1',
    title: 'THE 2025 PHILIPPINE NATIONALS: DATES CONFIRMED',
    category: 'Tournament',
    date: 'Oct 15',
    image: 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: '2',
    title: 'WHY PH PLAYERS ARE REDEFINING THE META',
    category: 'Gear',
    date: 'Oct 12',
    image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=600'
  }
];
const POPULAR_PLACES = [
  "Metro Manila", "Cebu City", "Davao City", "Quezon City",
  "Makati", "Taguig (BGC)", "Baguio City", "Iloilo City",
  "Bacolod", "Dumaguete", "Pasig", "Angeles City"
];

const Home: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState(POPULAR_PLACES);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/booking?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
    } else {
      navigate('/booking');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value.trim()) {
      const filtered = POPULAR_PLACES.filter(place =>
        place.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions(POPULAR_PLACES);
    }
  };

  const handleSuggestionClick = (place: string) => {
    setSearchQuery(place);
    setShowSuggestions(false);
    navigate(`/booking?q=${encodeURIComponent(place)}`);
  };

  return (
    <div className="bg-white selection:bg-lime-400 selection:text-black min-h-screen">
      {/* Cinematic Hero */}
      <section className="relative min-h-[80vh] md:min-h-[95vh] flex flex-col items-center justify-center pt-20 bg-slate-950 z-40">
        <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
          <div
            className="absolute inset-0 flex transition-transform duration-1000 cubic-bezier(0.4, 0, 0.2, 1)"
            style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}
          >
            {HERO_IMAGES.map((img, idx) => (
              <div key={idx} className="min-w-full h-full flex-shrink-0 relative">
                <img src={img} className="w-full h-full object-cover grayscale-[20%] brightness-[0.7] contrast-125" alt={`Slide ${idx}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="absolute inset-0 bg-slate-950/30"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent"></div>
          <div className="absolute inset-0 hero-pattern opacity-10"></div>
        </div>

        <div className="relative z-30 w-full max-w-[1800px] mx-auto px-6 md:px-24 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-sm text-lime-400 px-4 py-1.5 rounded-full font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] mb-6 md:mb-8">
            The National Network for Philippines
          </div>
          <h1 className="font-black text-white leading-[0.9] md:leading-[0.8] tracking-tighter mb-6 md:mb-8 uppercase">
            <span className="text-4xl sm:text-6xl md:text-8xl lg:text-[13rem]">PICKLEBALL</span> <br />
            <span className="text-lime-400 text-5xl sm:text-7xl md:text-9xl lg:text-[11rem]">PHILIPPINES.</span>
          </h1>
          <p className="text-base md:text-2xl text-slate-300 max-w-4xl mx-auto font-medium leading-relaxed mb-10 md:mb-12">
            The professional digital home for the fastest-growing sport in the Philippines. Join the elite ladder from Manila to Davao.
          </p>
          <div className="flex flex-wrap justify-center gap-6 animate-slide-up w-full px-4">
            <form onSubmit={handleSearch} className="relative group w-full max-w-2xl">
              <div className="relative flex items-center bg-slate-900/90 border border-white/20 backdrop-blur-xl rounded-full p-2 h-16 md:h-20 shadow-3xl">
                <Search className="ml-4 md:ml-6 text-slate-500" size={20} />
                <input
                  type="text"
                  placeholder="Find PH dink spots..."
                  value={searchQuery}
                  onChange={handleInputChange}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="flex-1 bg-transparent border-none text-white px-3 md:px-6 text-base md:text-xl font-medium outline-none placeholder:text-slate-600"
                />
                <button type="submit" className="bg-lime-400 hover:bg-lime-300 text-slate-950 h-12 md:h-16 px-6 md:px-10 rounded-full font-black flex items-center gap-3 transition-all active:scale-95 whitespace-nowrap text-xs md:text-lg">
                  LOCATE <ArrowRight size={18} />
                </button>
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-4 bg-slate-900/95 border border-white/10 backdrop-blur-2xl rounded-[32px] py-4 shadow-3xl z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="px-8 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Popular Spots</p>
                  <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                    {filteredSuggestions.map((place, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSuggestionClick(place)}
                        className="w-full text-left px-8 py-4 hover:bg-white/5 flex items-center gap-4 group transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-lime-400 group-hover:text-slate-950 transition-all">
                          <MapPin size={18} />
                        </div>
                        <span className="text-white font-bold group-hover:text-lime-400 transition-colors">{place}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* Beginner Welcome Section - Interactive Guide */}
      <section className="py-16 md:py-24 bg-white px-6 md:px-24 lg:px-32 relative overflow-hidden">
        <div className="max-w-[1800px] mx-auto">
          {/* Section Header */}
          <div className="mb-12 md:mb-16">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-tight">
              Learn to play pickleball with our <span className="text-lime-500 underline decoration-lime-400 decoration-4 underline-offset-8">how to play guides  →</span>
            </h2>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            {/* Left Column - Guide Cards */}
            <div className="space-y-6">
              {/* Guide Card 1 */}
              <Link to="/guides/rules" className="group flex gap-4 md:gap-6 items-start hover:bg-slate-50 p-4 rounded-3xl transition-all">
                <div className="w-32 h-24 md:w-48 md:h-32 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=400"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt="Players on court"
                  />
                </div>
                <div className="flex-1 pt-2">
                  <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-3">
                    Guides
                  </span>
                  <h3 className="text-lg md:text-xl font-black text-slate-950 leading-tight group-hover:text-blue-600 transition-colors">
                    How to play pickleball - 9 simple rules for beginners
                  </h3>
                </div>
              </Link>

              {/* Guide Card 2 */}
              <Link to="/guides/skill-rating" className="group flex gap-4 md:gap-6 items-start hover:bg-slate-50 p-4 rounded-3xl transition-all">
                <div className="w-32 h-24 md:w-48 md:h-32 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=400"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt="Player serving"
                  />
                </div>
                <div className="flex-1 pt-2">
                  <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-3">
                    Guides
                  </span>
                  <h3 className="text-lg md:text-xl font-black text-slate-950 leading-tight group-hover:text-blue-600 transition-colors">
                    What is my pickleball skill rating? Take this quiz to get rated
                  </h3>
                </div>
              </Link>

              {/* Guide Card 3 */}
              <Link to="/guides/equipment" className="group flex gap-4 md:gap-6 items-start hover:bg-slate-50 p-4 rounded-3xl transition-all">
                <div className="w-32 h-24 md:w-48 md:h-32 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=400"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt="Pickleball equipment"
                  />
                </div>
                <div className="flex-1 pt-2">
                  <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-3">
                    Guides
                  </span>
                  <h3 className="text-lg md:text-xl font-black text-slate-950 leading-tight group-hover:text-blue-600 transition-colors">
                    Essential gear guide - What you need to start playing
                  </h3>
                </div>
              </Link>
            </div>

            {/* Right Column - Video Player */}
            <div className="relative">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl relative group cursor-pointer">
                <img
                  src="https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&q=80&w=1200"
                  className="w-full h-full object-cover"
                  alt="Players on court"
                />
                {/* Video Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/20 to-transparent"></div>

                {/* Play Button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 md:w-28 md:h-28 bg-lime-500 rounded-full flex items-center justify-center shadow-2xl shadow-lime-500/30 group-hover:scale-110 group-hover:bg-lime-400 transition-all duration-300">
                    <Play className="text-white fill-white" size={40} />
                  </div>
                </div>
              </div>

              {/* Video Description */}
              <div className="mt-8 space-y-6">
                {/* Tags */}
                <div className="flex gap-3">
                  <span className="bg-blue-100 text-black px-5 py-2.5 rounded-full text-sm font-black uppercase tracking-wide">
                    Guides
                  </span>
                  <span className="bg-blue-100 text-black px-5 py-2.5 rounded-full text-sm font-black uppercase tracking-wide">
                    Learn
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-950 leading-tight">
                  How To Play Pickleball: Free Virtual Clinic for Beginners
                </h3>

                {/* CTA Buttons */}
                <div className="flex flex-wrap items-center gap-4">
                  <button className="bg-lime-500 hover:bg-lime-600 text-white px-8 py-4 rounded-full font-black text-base transition-all shadow-lg shadow-lime-500/30 hover:shadow-xl hover:shadow-lime-500/40 active:scale-95">
                    Watch Now
                  </button>
                  <Link to="/guides" className="flex items-center gap-2 text-slate-950 font-black text-base hover:text-lime-600 transition-colors group">
                    Or read our guides
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="bg-slate-50 py-3 md:py-4 border-y border-slate-100 overflow-hidden relative">
        <div className="animate-marquee whitespace-nowrap flex items-center gap-12 md:gap-24">
          {[...PARTNERS, ...PARTNERS].map((partner, i) => (
            <span key={i} className="text-slate-900/5 font-black text-4xl md:text-6xl tracking-tighter italic select-none uppercase">{partner}</span>
          ))}
        </div>
      </div>

      {/* News Highlight Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-[1800px] mx-auto px-6 md:px-24 lg:px-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-12 gap-6">
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-4">NATIONAL NEWS / INTEL</p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-950 tracking-tighter uppercase">WHAT'S NEW IN PH.</h2>
            </div>
            <Link to="/news" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors">
              VIEW FULL PH FEED <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
            {LATEST_NEWS.map((article) => (
              <Link to="/news" key={article.id} className="group relative aspect-video md:aspect-[21/9] rounded-[32px] md:rounded-[48px] overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
                <img src={article.image} className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 md:bottom-10 md:left-10 md:right-10">
                  <span className="bg-lime-400 text-slate-950 px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest mb-3 md:mb-4 inline-block">{article.category}</span>
                  <h3 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight group-hover:text-lime-400 transition-colors uppercase">{article.title}</h3>
                </div>
                <div className="absolute top-6 right-6 md:top-10 md:right-10 bg-white/10 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-widest">
                  {article.date}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>


      {/* Feature Section */}
      <section className="bg-slate-50 py-16 px-6 md:px-24 lg:px-32">
        <div className="max-w-[1800px] mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-12 md:mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 tracking-tighter mb-4 md:mb-6 uppercase">THE PH SYSTEM.</h2>
            <p className="text-slate-500 font-medium text-base md:text-xl">Engineered for Filipino players who treat pickleball as a science.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            <FeatureCard icon={<Shield size={32} className="text-blue-600" />} title="PH DUPR SYNC" description="Official Philippine DUPR API integration. Watch your rating climb against national rivals." tag="PH CERTIFIED" />
            <FeatureCard icon={<Activity size={32} className="text-lime-500" />} title="OPEN PLAY PH" description="Instant skill-matched court reservations across all major Philippine cities." tag="FAST PH" />
            <FeatureCard icon={<Trophy size={32} className="text-slate-900" />} title="PH LADDER" description="Automated league management. Regional brackets and city-wide titles." tag="COMPETITIVE" />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 px-6 md:px-24 lg:px-32">
        <div className="max-w-[1800px] mx-auto bg-slate-950 rounded-[40px] md:rounded-[80px] p-12 md:p-32 text-center relative overflow-hidden shadow-3xl">
          <div className="absolute top-0 right-0 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-blue-600/20 blur-[120px]"></div>
          <div className="absolute bottom-0 left-0 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-lime-400/10 blur-[120px]"></div>
          <div className="relative z-10 space-y-8 md:space-y-12">
            <h2 className="text-4xl md:text-9xl font-black text-white tracking-tighter leading-none uppercase">READY TO <br /><span className="text-lime-400 italic">DOMINATE PH?</span></h2>
            <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center">
              <button className="bg-lime-400 hover:bg-lime-300 text-slate-950 h-16 md:h-24 px-8 md:px-16 rounded-2xl md:rounded-[32px] font-black text-base md:text-xl uppercase tracking-widest transition-all active:scale-95 shadow-2xl shadow-lime-400/20">JOIN PH NETWORK</button>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-20 md:py-24 px-6 md:px-24 lg:px-32 border-t border-slate-100 bg-white">
        <div className="max-w-[1800px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-16 mb-20">
            {/* Brand Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-slate-950 font-black text-2xl tracking-tighter uppercase">
                <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="w-10 h-10 object-contain rounded-xl" />
                <div className="flex flex-col leading-none">
                  <span className="text-2xl">PICKLEPLAY</span>
                  <span className="text-sm tracking-wider text-blue-600">PHILIPPINES</span>
                </div>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs font-medium">
                The premier destination for the Philippine pickleball community. Join the movement, find your squad, and dominate the court.
              </p>
              <div className="flex gap-4 pt-2">
                <a href="#" className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                  <Facebook size={18} />
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                  <Instagram size={18} />
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                  <Twitter size={18} />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-8">Platform</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Booking System</a></li>
                <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Academy Classes</a></li>
                <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Community Hub</a></li>
                <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Pro Shop</a></li>
              </ul>
            </div>

            {/* Legal Section */}
            <div>
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-8">Legal & Policy</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">PH Partners Agreement</a></li>
                <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Cookie Settings</a></li>
              </ul>
            </div>

            {/* Contact Section */}
            <div>
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-8">Contact Us</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="text-blue-600 shrink-0 mt-0.5" />
                  <span className="text-sm font-bold text-slate-500">Metro Manila, Philippines</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={18} className="text-blue-600 shrink-0" />
                  <span className="text-sm font-bold text-slate-500">hello@pickleballph.com</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} className="text-blue-600 shrink-0" />
                  <span className="text-sm font-bold text-slate-500">+63 (2) 123 4567</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
              © 2026 PICKLEBALL PHILIPPINES LTD. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string, tag: string }> = ({ icon, title, description, tag }) => (
  <div className="p-10 md:p-16 rounded-[40px] md:rounded-[60px] bg-white border border-slate-200 shadow-sm hover:shadow-3xl transition-all group relative overflow-hidden text-center md:text-left">
    <div className="flex flex-col md:flex-row justify-between items-center md:items-start mb-8 md:mb-12 relative z-10 gap-6">
      <div className="w-16 h-16 md:w-24 md:h-24 flex items-center justify-center group-hover:scale-110 transition-all duration-500">
        {icon}
      </div>
      <span className="text-[8px] md:text-[10px] font-black bg-slate-100 text-slate-400 px-3 py-1.5 md:px-4 md:py-2 rounded-full group-hover:bg-lime-400 group-hover:text-slate-950 transition-colors uppercase tracking-widest">{tag}</span>
    </div>
    <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 md:mb-6 tracking-tighter uppercase relative z-10">{title}</h3>
    <p className="text-slate-500 text-base md:text-lg leading-relaxed font-medium mb-8 md:mb-10 relative z-10">{description}</p>
    <div className="h-1 md:h-1.5 w-12 md:w-16 bg-slate-100 group-hover:w-full group-hover:bg-blue-600 transition-all duration-700 relative z-10 mx-auto md:mx-0"></div>
  </div>
);

export default Home;
