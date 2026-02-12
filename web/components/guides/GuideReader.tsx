// GuideReader - Component for reading guide content with login gate
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
    BookOpen,
    Clock,
    Eye,
    ChevronLeft,
    ChevronRight,
    Lock,
    Lightbulb,
    CheckCircle,
    ArrowRight,
    Home,
    LogIn,
    Star,
    Share2,
    Bookmark
} from 'lucide-react';
import { getGuideBySlug, updateGuideProgress, getUserGuideProgress, Guide, GuideSection } from '../../services/guides';
import { supabase } from '../../services/supabase';

interface GuideReaderProps {
    isLoggedIn: boolean;
}

const GuideReader: React.FC<GuideReaderProps> = ({ isLoggedIn }) => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [guide, setGuide] = useState<Guide | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentSection, setCurrentSection] = useState(0);
    const [userId, setUserId] = useState<string | null>(null);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
            }
        };
        checkUser();
    }, []);

    useEffect(() => {
        const fetchGuide = async () => {
            if (!slug) return;
            
            const result = await getGuideBySlug(slug);
            if (result.success && result.data) {
                setGuide(result.data);
                
                // Fetch user's progress if logged in
                if (userId) {
                    const progressResult = await getUserGuideProgress(userId, result.data.id);
                    if (progressResult.success && progressResult.data) {
                        setCurrentSection(progressResult.data.current_section);
                    }
                }
            }
            setLoading(false);
        };
        fetchGuide();
    }, [slug, userId]);

    // Save progress when section changes
    useEffect(() => {
        if (userId && guide) {
            updateGuideProgress(userId, guide.id, currentSection, guide.content.length);
        }
    }, [currentSection, userId, guide]);

    const handleNextSection = () => {
        if (!guide) return;
        
        const nextSection = currentSection + 1;
        const section = guide.content[nextSection];
        
        // Check if user can access the next section
        if (!isLoggedIn && section && !section.is_free) {
            setShowLoginPrompt(true);
            return;
        }
        
        if (nextSection < guide.content.length) {
            setCurrentSection(nextSection);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrevSection = () => {
        if (currentSection > 0) {
            setCurrentSection(currentSection - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSectionClick = (index: number) => {
        if (!guide) return;
        
        const section = guide.content[index];
        if (!isLoggedIn && !section.is_free) {
            setShowLoginPrompt(true);
            return;
        }
        
        setCurrentSection(index);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Loading state for logged-in users (cleaner layout)
    if (loading && isLoggedIn) {
        return (
            <div className="space-y-10 animate-fade-in pb-12">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-slate-200 rounded-xl w-32"></div>
                    <div className="h-12 bg-slate-200 rounded-2xl w-3/4"></div>
                    <div className="h-64 bg-slate-200 rounded-3xl"></div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 md:px-8">
                <div className="max-w-4xl mx-auto">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-slate-200 rounded-xl w-32"></div>
                        <div className="h-12 bg-slate-200 rounded-2xl w-3/4"></div>
                        <div className="h-64 bg-slate-200 rounded-3xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Not found state for logged-in users
    if (!guide && isLoggedIn) {
        return (
            <div className="space-y-10 animate-fade-in pb-12">
                <div className="text-center py-16">
                    <BookOpen className="mx-auto text-slate-300 mb-4" size={64} />
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Guide Not Found</h1>
                    <p className="text-slate-500 mb-6">The guide you're looking for doesn't exist.</p>
                    <Link to="/guides" className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-700 transition-colors">
                        Browse All Guides
                    </Link>
                </div>
            </div>
        );
    }

    if (!guide) {
        return (
            <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 md:px-8">
                <div className="max-w-4xl mx-auto text-center">
                    <BookOpen className="mx-auto text-slate-300 mb-4" size={64} />
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Guide Not Found</h1>
                    <p className="text-slate-500 mb-6">The guide you're looking for doesn't exist.</p>
                    <Link to="/guides" className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-700 transition-colors">
                        Browse All Guides
                    </Link>
                </div>
            </div>
        );
    }

    const section = guide.content[currentSection];
    const progress = ((currentSection + 1) / guide.content.length) * 100;
    const isLastSection = currentSection === guide.content.length - 1;
    const canAccessNextSection = isLoggedIn || (guide.content[currentSection + 1]?.is_free ?? false);

    // Common elements used in both views
    const loginPromptModal = showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl relative animate-in slide-in-from-bottom-4 duration-300">
                <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Lock className="text-blue-600" size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Unlock Full Guide</h2>
                    <p className="text-slate-500 mb-6">
                        You've reached the preview limit! Sign up for free to continue reading and track your progress.
                    </p>
                    
                    <div className="space-y-3">
                        <Link 
                            to="/signup" 
                            className="block w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-colors"
                        >
                            Sign Up Free
                        </Link>
                        <Link 
                            to="/login" 
                            className="block w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                        >
                            I Already Have an Account
                        </Link>
                        <button 
                            onClick={() => setShowLoginPrompt(false)}
                            className="text-slate-400 hover:text-slate-600 text-sm font-medium"
                        >
                            Continue Reading Preview
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const sectionContent = (
        <>
            {/* Section Content */}
            <article className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-10 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black shrink-0">
                        {section.section}
                    </div>
                    <h2 className="text-lg md:text-2xl font-black text-slate-900">
                        {section.title}
                    </h2>
                </div>

                <div className="prose prose-lg max-w-none">
                    {section.content.split('\n\n').map((paragraph, idx) => (
                        <p key={idx} className="text-slate-600 leading-relaxed mb-4 whitespace-pre-wrap text-sm md:text-base">
                            {paragraph.split('**').map((text, i) => 
                                i % 2 === 1 ? <strong key={i} className="text-slate-900">{text}</strong> : text
                            )}
                        </p>
                    ))}
                </div>

                {/* Tip Box */}
                {section.tip && (
                    <div className="mt-8 bg-lime-50 border border-lime-200 rounded-2xl p-4 md:p-6 flex gap-3 md:gap-4">
                        <div className="shrink-0">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-lime-500 rounded-xl flex items-center justify-center">
                                <Lightbulb className="text-white" size={16} />
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-lime-800 mb-1 text-sm md:text-base">Pro Tip</h4>
                            <p className="text-lime-700 text-sm md:text-base">{section.tip}</p>
                        </div>
                    </div>
                )}
            </article>

            {/* Navigation */}
            <div className="mt-6 md:mt-8 flex items-center justify-between gap-2 md:gap-4">
                <button
                    onClick={handlePrevSection}
                    disabled={currentSection === 0}
                    className="flex items-center gap-1 md:gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-full font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors text-sm md:text-base"
                >
                    <ChevronLeft size={18} />
                    <span className="hidden sm:inline">Previous</span>
                </button>

                {!isLastSection ? (
                    <button
                        onClick={handleNextSection}
                        className={`flex items-center gap-1 md:gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-full font-bold transition-colors text-sm md:text-base ${
                            canAccessNextSection 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {canAccessNextSection ? (
                            <>
                                <span className="hidden sm:inline">Next</span>
                                <span className="sm:hidden">Next</span>
                            </>
                        ) : (
                            <>
                                <Lock size={14} />
                                <span className="hidden sm:inline">Unlock Next</span>
                                <span className="sm:hidden">Unlock</span>
                            </>
                        )}
                        <ChevronRight size={18} />
                    </button>
                ) : (
                    <Link
                        to="/guides"
                        className="flex items-center gap-1 md:gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-full font-bold bg-lime-500 text-white hover:bg-lime-600 transition-colors text-sm md:text-base"
                    >
                        <CheckCircle size={18} />
                        <span className="hidden sm:inline">Complete! More Guides</span>
                        <span className="sm:hidden">Done</span>
                    </Link>
                )}
            </div>

            {/* Section Navigation Dots */}
            <div className="mt-6 md:mt-8 flex flex-wrap justify-center gap-1.5 md:gap-2">
                {guide.content.map((s, idx) => {
                    const isAccessible = isLoggedIn || s.is_free;
                    const isCurrent = idx === currentSection;
                    const isCompleted = idx < currentSection;

                    return (
                        <button
                            key={idx}
                            onClick={() => handleSectionClick(idx)}
                            className={`group relative w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all ${
                                isCurrent 
                                    ? 'bg-blue-600 text-white' 
                                    : isCompleted
                                        ? 'bg-lime-500 text-white'
                                        : isAccessible 
                                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' 
                                            : 'bg-slate-100 text-slate-300'
                            }`}
                            title={s.title}
                        >
                            {isCompleted ? (
                                <CheckCircle size={12} />
                            ) : !isAccessible ? (
                                <Lock size={10} />
                            ) : (
                                <span className="text-xs font-bold">{idx + 1}</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </>
    );

    // =============================================
    // LOGGED IN USER VIEW - Sidebar compatible layout
    // =============================================
    if (isLoggedIn) {
        return (
            <div className="space-y-6 animate-fade-in pb-12">
                {loginPromptModal}

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <Link to="/guides" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-3">
                            <ChevronLeft size={18} />
                            <span className="font-medium text-sm">All Guides</span>
                        </Link>
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-950 tracking-tighter">
                            {guide.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <Clock size={14} />
                                {guide.estimated_read_time} min
                            </span>
                            <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-medium capitalize text-xs">
                                {guide.difficulty_level}
                            </span>
                            <span className="text-slate-400">
                                Section {currentSection + 1} of {guide.content.length}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">
                            <Share2 size={18} className="text-slate-500" />
                        </button>
                        <button className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">
                            <Bookmark size={18} className="text-slate-500" />
                        </button>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-slate-500">Progress</span>
                        <span className="font-bold text-slate-900">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-lime-500 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                {sectionContent}
            </div>
        );
    }

    // =============================================
    // NON-LOGGED IN USER VIEW - Original full-page layout
    // =============================================
    return (
        <div className="min-h-screen bg-slate-50 pt-20 pb-24">
            {loginPromptModal}

            {/* Header */}
            <header className="bg-white border-b border-slate-100 sticky top-16 z-40">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link to="/guides" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
                            <ChevronLeft size={20} />
                            <span className="font-medium text-sm hidden sm:inline">All Guides</span>
                        </Link>
                        
                        <div className="flex items-center gap-2 sm:gap-4">
                            <span className="text-sm text-slate-400">
                                {currentSection + 1} / {guide.content.length}
                            </span>
                            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <Share2 size={18} className="text-slate-400" />
                            </button>
                            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <Bookmark size={18} className="text-slate-400" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-lime-500 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-6 md:py-8">
                {/* Title (only on first section) */}
                {currentSection === 0 && (
                    <div className="mb-6 md:mb-8">
                        <div className="flex flex-wrap items-center gap-2 text-slate-400 text-xs sm:text-sm mb-4">
                            <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
                            <ChevronRight size={12} />
                            <Link to="/guides" className="hover:text-blue-600 transition-colors">Guides</Link>
                            <ChevronRight size={12} />
                            <span className="text-slate-600 truncate max-w-[150px] sm:max-w-none">{guide.title}</span>
                        </div>
                        
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">
                            {guide.title}
                        </h1>
                        
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <Clock size={14} />
                                {guide.estimated_read_time} min read
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Eye size={14} />
                                {guide.view_count} views
                            </span>
                            <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-medium capitalize text-xs">
                                {guide.difficulty_level}
                            </span>
                        </div>
                    </div>
                )}

                {sectionContent}
            </main>

            {/* Login Banner (for non-logged-in users) */}
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 sm:py-4 px-4 z-30">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Star className="text-yellow-400 shrink-0" size={20} />
                        <p className="font-medium text-center sm:text-left text-sm sm:text-base">
                            <span className="font-bold">Sign up free</span> to unlock all sections!
                        </p>
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                        <Link 
                            to="/login" 
                            className="px-4 sm:px-5 py-2 rounded-full font-bold text-white/90 hover:text-white transition-colors text-sm"
                        >
                            Log In
                        </Link>
                        <Link 
                            to="/signup" 
                            className="bg-white text-blue-600 px-4 sm:px-5 py-2 rounded-full font-bold hover:bg-blue-50 transition-colors text-sm"
                        >
                            Sign Up Free
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuideReader;
