// SkillRatingQuiz - Interactive quiz to determine player skill level
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Trophy,
    ChevronLeft,
    ChevronRight,
    ArrowRight,
    Lock,
    Star,
    Target,
    Award,
    Sparkles,
    RotateCcw,
    Share2,
    CheckCircle,
    Clock,
    TrendingUp,
    Zap
} from 'lucide-react';
import {
    getGuideBySlug,
    getQuizQuestions,
    getSkillLevels,
    calculateSkillLevel,
    saveQuizResult,
    getLatestQuizResult,
    Guide,
    QuizQuestion,
    SkillLevel,
    UserQuizResult
} from '../../services/guides';
import { supabase } from '../../services/supabase';

interface SkillRatingQuizProps {
    isLoggedIn: boolean;
}

const SkillRatingQuiz: React.FC<SkillRatingQuizProps> = ({ isLoggedIn }) => {
    const navigate = useNavigate();
    const [guide, setGuide] = useState<Guide | null>(null);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [skillLevels, setSkillLevels] = useState<SkillLevel[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    // Quiz State
    const [started, setStarted] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<{ question_id: string; selected_option: string; skill_points: number }[]>([]);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [result, setResult] = useState<SkillLevel | null>(null);
    const [totalScore, setTotalScore] = useState(0);
    const [startTime, setStartTime] = useState<number>(0);
    const [previousResult, setPreviousResult] = useState<UserQuizResult | null>(null);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);

    // Preview limit for non-logged-in users (first 3 questions free)
    const FREE_QUESTIONS = 3;

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
        const fetchData = async () => {
            const [guideResult, skillResult] = await Promise.all([
                getGuideBySlug('skill-rating'),
                getSkillLevels()
            ]);

            if (guideResult.success && guideResult.data) {
                setGuide(guideResult.data);

                const questionsResult = await getQuizQuestions(guideResult.data.id);
                if (questionsResult.success) {
                    setQuestions(questionsResult.data);
                }

                // Fetch previous result if logged in
                if (userId) {
                    const prevResult = await getLatestQuizResult(userId, guideResult.data.id);
                    if (prevResult.success && prevResult.data) {
                        setPreviousResult(prevResult.data);
                    }
                }
            }

            if (skillResult.success) {
                setSkillLevels(skillResult.data);
            }

            setLoading(false);
        };
        fetchData();
    }, [userId]);

    const handleStart = () => {
        setStarted(true);
        setStartTime(Date.now());
    };

    const handleSelectOption = (option: { text: string; value: string; skill_points: number }) => {
        setSelectedOption(option.value);
    };

    const handleNext = () => {
        if (!selectedOption) return;

        const question = questions[currentQuestion];
        const selectedOpt = question.options.find(o => o.value === selectedOption);

        if (!selectedOpt) return;

        const newAnswers = [...answers, {
            question_id: question.id,
            selected_option: selectedOption,
            skill_points: selectedOpt.skill_points
        }];
        setAnswers(newAnswers);

        const nextQuestion = currentQuestion + 1;

        // Check if non-logged-in user has reached the free question limit
        if (!isLoggedIn && nextQuestion >= FREE_QUESTIONS) {
            setShowLoginPrompt(true);
            return;
        }

        if (nextQuestion < questions.length) {
            setCurrentQuestion(nextQuestion);
            setSelectedOption(null);
        } else {
            // Calculate final result
            const score = newAnswers.reduce((sum, a) => sum + a.skill_points, 0);
            setTotalScore(score);

            const skillLevel = calculateSkillLevel(score, skillLevels);
            setResult(skillLevel);
            setShowResult(true);

            // Save result if logged in
            if (userId && guide && skillLevel) {
                const timeTaken = Math.round((Date.now() - startTime) / 1000);
                saveQuizResult(userId, guide.id, score, skillLevel, newAnswers, timeTaken);
            }
        }
    };

    const handleRetake = () => {
        setStarted(false);
        setCurrentQuestion(0);
        setAnswers([]);
        setSelectedOption(null);
        setShowResult(false);
        setResult(null);
        setTotalScore(0);
        setStartTime(0);
    };

    const getSkillLevelColor = (color: string) => {
        const colors: { [key: string]: string } = {
            'gray': 'from-gray-500 to-gray-600',
            'slate': 'from-slate-500 to-slate-600',
            'blue': 'from-blue-500 to-blue-600',
            'cyan': 'from-cyan-500 to-cyan-600',
            'green': 'from-green-500 to-green-600',
            'lime': 'from-lime-500 to-lime-600',
            'yellow': 'from-blue-500 to-blue-600',
            'orange': 'from-blue-600 to-blue-700',
            'rose': 'from-rose-500 to-rose-600'
        };
        return colors[color] || colors['gray'];
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 pt-24 pb-12 px-4 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-lime-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white/60 font-medium">Loading quiz...</p>
                </div>
            </div>
        );
    }

    // Login Prompt Modal
    if (showLoginPrompt) {
        return (
            <div className="min-h-screen bg-slate-950 pt-20 pb-12 px-4 flex items-center justify-center">
                <div className="bg-white w-full max-w-lg rounded-3xl p-8 md:p-10 shadow-2xl text-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Trophy className="text-blue-500" size={40} />
                    </div>

                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-3">
                        You're Doing Great! 🎉
                    </h2>
                    <p className="text-slate-500 mb-6">
                        You've answered {FREE_QUESTIONS} questions. Sign up for free to complete the quiz and get your official skill rating!
                    </p>

                    <div className="bg-slate-50 rounded-2xl p-6 mb-6">
                        <h4 className="font-bold text-slate-900 mb-3">What you'll get:</h4>
                        <ul className="space-y-2 text-left text-slate-600">
                            <li className="flex items-center gap-2">
                                <CheckCircle className="text-green-500 shrink-0" size={18} />
                                Your official skill rating (1.0 - 5.0+)
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="text-green-500 shrink-0" size={18} />
                                Personalized recommendations to improve
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="text-green-500 shrink-0" size={18} />
                                Save your rating to your profile
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="text-green-500 shrink-0" size={18} />
                                Find players at your skill level
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <Link
                            to="/signup"
                            className="block w-full bg-lime-500 text-white py-4 rounded-2xl font-black hover:bg-lime-600 transition-colors"
                        >
                            Sign Up Free & Get My Rating
                        </Link>
                        <Link
                            to="/login"
                            className="block w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                        >
                            I Already Have an Account
                        </Link>
                        <Link
                            to="/guides"
                            className="block text-slate-400 hover:text-slate-600 text-sm font-medium pt-2"
                        >
                            ← Back to Guides
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Result Screen
    if (showResult && result) {
        return (
            <div className="min-h-screen bg-slate-950 pt-20 pb-12 px-4">
                <div className="max-w-2xl mx-auto">
                    {/* Celebration */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
                            <Sparkles className="text-blue-400" size={16} />
                            Quiz Complete!
                        </div>
                    </div>

                    {/* Result Card */}
                    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-2xl text-center">
                        <div className={`w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br ${getSkillLevelColor(result.color)} flex items-center justify-center mb-6 shadow-lg`}>
                            <span className="text-4xl md:text-5xl font-black text-white">{result.level}</span>
                        </div>

                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">
                            {result.name}
                        </h1>
                        <p className="text-slate-500 mb-6 max-w-md mx-auto">
                            {result.description}
                        </p>

                        {/* Score breakdown */}
                        <div className="bg-slate-50 rounded-2xl p-6 mb-6">
                            <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                                <span>Your Score</span>
                                <span className="font-bold text-slate-900">{totalScore} points</span>
                            </div>
                            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full bg-gradient-to-r ${getSkillLevelColor(result.color)} transition-all duration-1000`}
                                    style={{ width: `${Math.min(100, (totalScore / 685) * 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Recommendations */}
                        {result.recommendations && result.recommendations.length > 0 && (
                            <div className="text-left bg-lime-50 rounded-2xl p-6 mb-6">
                                <h4 className="font-bold text-lime-800 mb-3 flex items-center gap-2">
                                    <TrendingUp size={18} />
                                    Next Steps to Improve
                                </h4>
                                <ul className="space-y-2">
                                    {result.recommendations.map((rec, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-lime-700">
                                            <Zap className="text-lime-500 shrink-0 mt-0.5" size={16} />
                                            {rec}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Previous Result Comparison */}
                        {previousResult && previousResult.skill_rating !== result.level && (
                            <div className="bg-blue-50 rounded-2xl p-4 mb-6 text-sm">
                                <p className="text-blue-700">
                                    <strong>Previous Rating:</strong> {previousResult.skill_rating}
                                    {parseFloat(result.level) > parseFloat(previousResult.skill_rating) && (
                                        <span className="text-green-600 ml-2">↑ You've improved!</span>
                                    )}
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-3">
                            {!isLoggedIn ? (
                                <>
                                    <Link
                                        to="/signup"
                                        className="block w-full bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-colors"
                                    >
                                        Sign Up to Save Your Rating
                                    </Link>
                                    <button
                                        onClick={handleRetake}
                                        className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                                    >
                                        <RotateCcw size={18} />
                                        Retake Quiz
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/profile"
                                        className="block w-full bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-colors"
                                    >
                                        View My Profile
                                    </Link>
                                    <button
                                        onClick={handleRetake}
                                        className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                                    >
                                        <RotateCcw size={18} />
                                        Retake Quiz
                                    </button>
                                </>
                            )}
                            <Link
                                to="/guides"
                                className="block text-slate-500 hover:text-slate-700 font-medium pt-2"
                            >
                                ← Back to Guides
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Start Screen
    if (!started) {
        return (
            <div className="min-h-screen bg-slate-950 pt-20 pb-12 px-4">
                <div className="max-w-2xl mx-auto">
                    {/* Back Link */}
                    <Link to="/guides" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-8">
                        <ChevronLeft size={20} />
                        Back to Guides
                    </Link>

                    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-2xl">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Trophy className="text-blue-500" size={40} />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">
                                What's My Skill Rating?
                            </h1>
                            <p className="text-slate-500 max-w-md mx-auto">
                                Answer 10 quick questions to discover your pickleball skill level.
                                Perfect for finding the right playing partners!
                            </p>
                        </div>

                        {/* Quiz Info */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="text-center p-4 bg-slate-50 rounded-2xl">
                                <Target className="mx-auto text-blue-500 mb-2" size={24} />
                                <p className="text-2xl font-black text-slate-900">10</p>
                                <p className="text-xs text-slate-500 font-medium">Questions</p>
                            </div>
                            <div className="text-center p-4 bg-slate-50 rounded-2xl">
                                <Clock className="mx-auto text-green-500 mb-2" size={24} />
                                <p className="text-2xl font-black text-slate-900">5</p>
                                <p className="text-xs text-slate-500 font-medium">Minutes</p>
                            </div>
                            <div className="text-center p-4 bg-slate-50 rounded-2xl">
                                <Award className="mx-auto text-blue-500 mb-2" size={24} />
                                <p className="text-2xl font-black text-slate-900">1.0-5.0+</p>
                                <p className="text-xs text-slate-500 font-medium">Rating Scale</p>
                            </div>
                        </div>

                        {/* Previous Result */}
                        {previousResult && (
                            <div className="bg-blue-50 rounded-2xl p-4 mb-6 text-center">
                                <p className="text-blue-700 text-sm">
                                    <strong>Your Last Rating:</strong> {previousResult.skill_rating} ({result?.name || ''})
                                </p>
                                <p className="text-blue-500 text-xs mt-1">
                                    Take the quiz again to see if you've improved!
                                </p>
                            </div>
                        )}

                        {/* Guide Content Preview */}
                        {guide && guide.content.length > 0 && (
                            <div className="bg-slate-50 rounded-2xl p-6 mb-6">
                                {guide.content.map((section, idx) => (
                                    <div key={idx} className="mb-4 last:mb-0">
                                        <h3 className="font-bold text-slate-900 mb-2">{section.title}</h3>
                                        <p className="text-slate-600 text-sm">{section.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Start Button */}
                        <button
                            onClick={handleStart}
                            className="w-full bg-lime-500 hover:bg-lime-600 text-white py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2"
                        >
                            Start Quiz
                            <ArrowRight size={20} />
                        </button>

                        {!isLoggedIn && (
                            <p className="text-center text-slate-400 text-sm mt-4">
                                <Lock className="inline mr-1" size={14} />
                                First {FREE_QUESTIONS} questions free. Sign up to complete the quiz!
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Question Screen
    const question = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
        <div className="min-h-screen bg-slate-950 pt-20 pb-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Progress Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between text-white/60 text-sm mb-3">
                        <span>Question {currentQuestion + 1} of {questions.length}</span>
                        <span>{Math.round(progress)}% Complete</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-lime-500 to-lime-400 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Question Card */}
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl">
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-6">
                        {question.question_text}
                    </h2>

                    {/* Options */}
                    <div className="space-y-3 mb-8">
                        {question.options.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSelectOption(option)}
                                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selectedOption === option.value
                                    ? 'border-lime-500 bg-lime-50'
                                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selectedOption === option.value
                                        ? 'border-lime-500 bg-lime-500'
                                        : 'border-slate-300'
                                        }`}>
                                        {selectedOption === option.value && (
                                            <CheckCircle className="text-white" size={14} />
                                        )}
                                    </div>
                                    <span className={`font-medium ${selectedOption === option.value ? 'text-lime-700' : 'text-slate-700'
                                        }`}>
                                        {option.text}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Next Button */}
                    <button
                        onClick={handleNext}
                        disabled={!selectedOption}
                        className="w-full bg-lime-500 hover:bg-lime-600 disabled:bg-slate-100 disabled:text-slate-400 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                        {currentQuestion < questions.length - 1 ? 'Next Question' : 'See My Result'}
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Non-logged-in warning */}
                {!isLoggedIn && currentQuestion >= FREE_QUESTIONS - 1 && (
                    <div className="mt-4 bg-blue-500/20 text-blue-200 p-4 rounded-2xl text-center text-sm">
                        <Lock className="inline mr-2" size={14} />
                        This is the last free question. Sign up to complete the quiz!
                    </div>
                )}
            </div>
        </div>
    );
};

export default SkillRatingQuiz;
