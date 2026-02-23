// GuidesIndex - Main page showing all available guides
import React, { useState, useEffect } from 'react';
import useSEO from '../../hooks/useSEO';
import { Link } from 'react-router-dom';
import {
    BookOpen,
    Play,
    Trophy,
    Clock,
    Eye,
    ChevronRight,
    Sparkles,
    Target,
    ShoppingBag,
    ArrowRight,
    Star,
    Search,
    Filter,
    GraduationCap
} from 'lucide-react';
import { getAllGuides, Guide } from '../../services/guides';

interface GuidesIndexProps {
    isLoggedIn: boolean;
}

const GuidesIndex: React.FC<GuidesIndexProps> = ({ isLoggedIn }) => {
    useSEO({
        title: 'Pickleball Guides & Quizzes',
        description: 'Learn pickleball with guides, quizzes, and tutorials written by Philippine coaches. Skill rating, rules, tactics, and equipment guides.',
        canonical: 'https://www.pickleplay.ph/guides',
    });
    const [guides, setGuides] = useState<Guide[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('all');

    useEffect(() => {
        const fetchGuides = async () => {
            const result = await getAllGuides();
            if (result.success) {
                setGuides(result.data);
            }
            setLoading(false);
        };
        fetchGuides();
    }, []);

    const getTypeIcon = (type: string, size: number = 20) => {
        switch (type) {
            case 'quiz': return <Trophy className="text-blue-500" size={size} />;
            case 'video': return <Play className="text-red-500" size={size} />;
            default: return <BookOpen className="text-blue-500" size={size} />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'quiz': return 'Interactive Quiz';
            case 'video': return 'Video Tutorial';
            default: return 'Reading Guide';
        }
    };

    const getDifficultyColor = (level: string) => {
        switch (level) {
            case 'beginner': return 'bg-green-100 text-green-700';
            case 'intermediate': return 'bg-blue-100 text-blue-700';
            case 'advanced': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    // Filter guides based on search and type
    const filteredGuides = guides.filter(guide => {
        const matchesSearch = guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            guide.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || guide.type === filterType;
        return matchesSearch && matchesType;
    });

    // Loading state for logged-in users
    if (loading && isLoggedIn) {
        return (
            <div className="space-y-10 animate-fade-in pb-12">
                <div className="animate-pulse space-y-8">
                    <div className="h-12 bg-slate-200 rounded-2xl w-1/2"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-80 bg-slate-200 rounded-3xl"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Loading state for non-logged-in users  
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 md:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="animate-pulse space-y-8">
                        <div className="h-12 bg-slate-200 rounded-2xl w-1/2"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-80 bg-slate-200 rounded-3xl"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // =============================================
    // LOGGED IN USER VIEW - Sidebar compatible layout
    // =============================================
    if (isLoggedIn) {
        return (
            <div className="space-y-10 animate-fade-in pb-12">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div>
                        <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-4">LEARNING HUB</p>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-950 tracking-tighter uppercase">Guides & Quizzes.</h1>
                        <p className="text-slate-500 mt-3 max-w-xl">Master pickleball with our beginner-friendly guides, quizzes, and tutorials.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search guides..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 shadow-sm"
                            />
                        </div>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-white border border-slate-200 px-4 py-3 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Types</option>
                            <option value="guide">Guides</option>
                            <option value="quiz">Quizzes</option>
                            <option value="video">Videos</option>
                        </select>
                    </div>
                </div>

                {/* Quick Access Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Link
                        to="/guides/rules"
                        className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 hover:shadow-xl hover:scale-[1.02] transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                                <BookOpen className="text-white" size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white truncate">Pickleball Rules</h3>
                                <p className="text-sm text-white/70 truncate">9 simple rules for beginners</p>
                            </div>
                            <ChevronRight className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" size={20} />
                        </div>
                    </Link>

                    <Link
                        to="/guides/skill-rating"
                        className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 hover:shadow-xl hover:scale-[1.02] transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                                <Trophy className="text-white" size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white truncate">Skill Rating Quiz</h3>
                                <p className="text-sm text-white/70 truncate">Find your pickleball level</p>
                            </div>
                            <ChevronRight className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" size={20} />
                        </div>
                    </Link>

                    <Link
                        to="/guides/equipment"
                        className="group bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 hover:shadow-xl hover:scale-[1.02] transition-all sm:col-span-2 lg:col-span-1"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                                <ShoppingBag className="text-white" size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white truncate">Equipment Guide</h3>
                                <p className="text-sm text-white/70 truncate">What gear you need to start</p>
                            </div>
                            <ChevronRight className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" size={20} />
                        </div>
                    </Link>
                </div>

                {/* All Guides Section */}
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <GraduationCap className="text-blue-600" size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">All Guides</h2>
                                <p className="text-sm text-slate-500">{filteredGuides.length} guides available</p>
                            </div>
                        </div>
                    </div>

                    {/* Guides Grid */}
                    {filteredGuides.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredGuides.map((guide) => (
                                <Link
                                    key={guide.id}
                                    to={guide.type === 'quiz' ? '/guides/skill-rating' : `/guides/${guide.slug}`}
                                    className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-xl hover:border-slate-300 transition-all"
                                >
                                    {/* Thumbnail */}
                                    <div className="aspect-[16/10] relative overflow-hidden">
                                        <img
                                            src={guide.thumbnail_url || '/images/home-images/pb1.jpg'}
                                            alt={guide.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

                                        {/* Type Badge */}
                                        <div className="absolute top-3 left-3 flex items-center gap-2 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
                                            {getTypeIcon(guide.type, 16)}
                                            <span className="text-xs font-bold text-slate-700">{getTypeLabel(guide.type)}</span>
                                        </div>

                                        {/* Featured Badge */}
                                        {guide.is_featured && (
                                            <div className="absolute top-3 right-3 bg-lime-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">
                                                Featured
                                            </div>
                                        )}

                                        {/* Bottom Info */}
                                        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${getDifficultyColor(guide.difficulty_level)}`}>
                                                {guide.difficulty_level}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-white/90 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">
                                                <Clock size={10} />
                                                {guide.estimated_read_time} min
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <h3 className="font-bold text-base text-slate-900 mb-1.5 group-hover:text-blue-600 transition-colors line-clamp-2">
                                            {guide.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                                            {guide.description}
                                        </p>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center text-blue-600 font-bold text-sm">
                                                {guide.type === 'quiz' ? 'Take Quiz' : 'Read Guide'}
                                                <ArrowRight size={14} className="ml-1.5 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                            <span className="flex items-center gap-1 text-xs text-slate-400">
                                                <Eye size={12} />
                                                {guide.view_count}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                            <BookOpen className="mx-auto text-slate-300 mb-4" size={48} />
                            <h3 className="text-xl font-bold text-slate-900 mb-2">
                                {searchQuery || filterType !== 'all' ? 'No matching guides' : 'No guides yet'}
                            </h3>
                            <p className="text-slate-500">
                                {searchQuery || filterType !== 'all'
                                    ? 'Try adjusting your search or filter'
                                    : 'Check back soon for new content!'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // =============================================
    // NON-LOGGED IN USER VIEW - Original hero design
    // =============================================
    return (
        <div className="min-h-screen bg-slate-50 pt-20 pb-12">
            {/* Hero Section */}
            <section className="bg-slate-950 text-white py-16 md:py-24 px-4 md:px-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-lime-500/10"></div>
                <div className="absolute top-10 right-10 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl"></div>

                <div className="max-w-6xl mx-auto relative">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="text-lime-400" size={24} />
                        <span className="text-lime-400 font-black text-sm uppercase tracking-widest">Learning Hub</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
                        Learn Pickleball<br />
                        <span className="text-lime-400">The Fun Way</span>
                    </h1>
                    <p className="text-lg md:text-xl text-white/70 max-w-2xl mb-8">
                        Whether you're picking up a paddle for the first time or looking to level up your game,
                        our guides have you covered. Start your pickleball journey today!
                    </p>

                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 md:p-6 border border-white/20 inline-block w-full md:w-auto">
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="w-12 h-12 bg-lime-500 rounded-xl flex items-center justify-center shrink-0">
                                <Star className="text-white" size={24} />
                            </div>
                            <div className="text-center md:text-left">
                                <p className="font-bold text-white">Unlock Full Access</p>
                                <p className="text-sm text-white/60">Sign up free to access all guides, take quizzes, and track your progress!</p>
                            </div>
                            <Link
                                to="/signup"
                                className="bg-lime-500 hover:bg-lime-400 text-white px-6 py-3 rounded-full font-bold text-sm transition-all shrink-0 w-full md:w-auto text-center"
                            >
                                Sign Up Free
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Guides Grid */}
            <section className="py-12 md:py-16 px-4 md:px-8">
                <div className="max-w-6xl mx-auto">
                    {/* Quick Links */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                        <Link to="/guides/rules" className="group bg-white rounded-2xl p-5 md:p-6 border border-slate-100 hover:shadow-lg hover:border-blue-200 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors shrink-0">
                                    <BookOpen className="text-blue-600 group-hover:text-white transition-colors" size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-900 truncate">Pickleball Rules</h3>
                                    <p className="text-sm text-slate-500 truncate">9 simple rules for beginners</p>
                                </div>
                                <ChevronRight className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" size={20} />
                            </div>
                        </Link>

                        <Link to="/guides/skill-rating" className="group bg-white rounded-2xl p-5 md:p-6 border border-slate-100 hover:shadow-lg hover:border-blue-200 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors shrink-0">
                                    <Trophy className="text-blue-600 group-hover:text-white transition-colors" size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-900 truncate">Skill Rating Quiz</h3>
                                    <p className="text-sm text-slate-500 truncate">Find your pickleball level</p>
                                </div>
                                <ChevronRight className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" size={20} />
                            </div>
                        </Link>

                        <Link to="/guides/equipment" className="group bg-white rounded-2xl p-5 md:p-6 border border-slate-100 hover:shadow-lg hover:border-green-200 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-500 transition-colors shrink-0">
                                    <ShoppingBag className="text-green-600 group-hover:text-white transition-colors" size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-900 truncate">Equipment Guide</h3>
                                    <p className="text-sm text-slate-500 truncate">What gear you need to start</p>
                                </div>
                                <ChevronRight className="text-slate-300 group-hover:text-green-500 group-hover:translate-x-1 transition-all shrink-0" size={20} />
                            </div>
                        </Link>
                    </div>

                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">All Guides</h2>
                            <p className="text-slate-500 mt-1">Start learning with our beginner-friendly content</p>
                        </div>
                    </div>

                    {/* Guides Grid */}
                    {guides.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {guides.map((guide) => (
                                <Link
                                    key={guide.id}
                                    to={guide.type === 'quiz' ? '/guides/skill-rating' : `/guides/${guide.slug}`}
                                    className="group bg-white rounded-3xl overflow-hidden border border-slate-100 hover:shadow-xl hover:border-slate-200 transition-all"
                                >
                                    {/* Thumbnail */}
                                    <div className="aspect-video relative overflow-hidden">
                                        <img
                                            src={guide.thumbnail_url || '/images/home-images/pb1.jpg'}
                                            alt={guide.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>

                                        {/* Type Badge */}
                                        <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                            {getTypeIcon(guide.type)}
                                            <span className="text-xs font-bold text-slate-700">{getTypeLabel(guide.type)}</span>
                                        </div>

                                        {/* Featured Badge */}
                                        {guide.is_featured && (
                                            <div className="absolute top-4 right-4 bg-lime-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                                                Featured
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-5 md:p-6">
                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${getDifficultyColor(guide.difficulty_level)}`}>
                                                {guide.difficulty_level}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-slate-400">
                                                <Clock size={12} />
                                                {guide.estimated_read_time} min
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-slate-400">
                                                <Eye size={12} />
                                                {guide.view_count}
                                            </span>
                                        </div>

                                        <h3 className="font-bold text-lg text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                                            {guide.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                                            {guide.description}
                                        </p>

                                        <div className="flex items-center text-blue-600 font-bold text-sm">
                                            {guide.type === 'quiz' ? 'Take Quiz' : 'Read Guide'}
                                            <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                            <BookOpen className="mx-auto text-slate-300 mb-4" size={48} />
                            <h3 className="text-xl font-bold text-slate-900 mb-2">No guides yet</h3>
                            <p className="text-slate-500">Check back soon for new content!</p>
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-12 px-4 md:px-8">
                <div className="max-w-4xl mx-auto bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-black mb-4 relative">
                        Ready to Start Playing?
                    </h2>
                    <p className="text-base md:text-lg text-white/80 mb-8 max-w-xl mx-auto relative">
                        Create a free account to unlock all guides, track your progress,
                        save your skill rating, and join our community!
                    </p>
                    <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 relative">
                        <Link
                            to="/signup"
                            className="bg-white text-blue-600 px-8 py-4 rounded-full font-black hover:bg-blue-50 transition-colors"
                        >
                            Sign Up Free
                        </Link>
                        <Link
                            to="/login"
                            className="bg-white/20 text-white px-8 py-4 rounded-full font-black hover:bg-white/30 transition-colors"
                        >
                            Log In
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default GuidesIndex;
