import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, RefreshCw, Trophy, Users, Star, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../services/supabase';
import { verifyMatchParticipation, getMatchDetails } from '../services/matches';

const MatchVerifyPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const matchId = searchParams.get('id');
    const verificationCode = searchParams.get('code');

    const [status, setStatus] = useState<'loading' | 'verifying' | 'success' | 'error' | 'guest'>('loading');
    const [error, setError] = useState<string>('');
    const [matchInfo, setMatchInfo] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);

            if (matchId) {
                const { data } = await getMatchDetails(matchId);
                setMatchInfo(data);
            }

            if (user) {
                if (matchId && verificationCode) {
                    handleVerification(user.id, matchId, verificationCode);
                }
            } else {
                setStatus('guest');
            }
        };

        checkAuth();
    }, [matchId, verificationCode]);

    const handleVerification = async (userId: string, mId: string, code: string) => {
        setStatus('verifying');
        const { success, error: verifyError } = await verifyMatchParticipation(userId, mId, code);

        if (success) {
            setStatus('success');
            // Store a flag to show a success message on dashboard
            localStorage.setItem('match_verified_message', 'Match successfully verified! You can now rate your opponent after the match.');
            setTimeout(() => {
                navigate('/dashboard');
            }, 3000);
        } else {
            setError(verifyError || 'Could not verify match participation.');
            setStatus('error');
        }
    };

    if (status === 'loading' || status === 'verifying') {
        return (
            <div className="min-h-screen bg-[#EBEBE6] flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                        <RefreshCw className="text-indigo-600 animate-spin" size={32} />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">
                        {status === 'loading' ? 'Fetching Match Intelligence...' : 'Authenticating Participation...'}
                    </p>
                </div>
            </div>
        );
    }

    if (status === 'guest') {
        return (
            <div className="min-h-screen bg-[#EBEBE6] flex flex-col items-center justify-center p-6">
                <div className="max-w-xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {/* Brand */}
                    <div className="flex justify-center">
                        <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="w-24 h-24 rounded-[32px] shadow-2xl" />
                    </div>

                    {/* Hero Card */}
                    <div className="bg-white rounded-[48px] p-10 shadow-2xl border border-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -mr-8 -mt-8"></div>

                        <div className="relative space-y-6">
                            <div className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                <Trophy size={14} /> Match Challenge
                            </div>

                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none uppercase">
                                You've Been<br />
                                <span className="text-indigo-600">Challenged!</span>
                            </h1>

                            <p className="text-slate-500 font-medium text-lg leading-relaxed">
                                Someone wants to log a match with you on <span className="font-bold text-slate-900">PicklePlay</span>. Sign up now to verify this match and start building your <span className="text-indigo-600 font-bold">Verified Player Rating</span>.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Match Type</div>
                                    <div className="text-slate-900 font-black flex items-center gap-2 text-lg">
                                        <Users size={18} className="text-indigo-600" />
                                        {matchInfo?.type || 'Match Detected'}
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">System Status</div>
                                    <div className="text-emerald-600 font-black flex items-center gap-2 text-lg">
                                        <ShieldCheck size={18} />
                                        READY
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-4">
                                <Link
                                    to={`/signup?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                                    className="w-full bg-slate-950 text-white py-5 rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-600 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    CREATE ACCOUNT TO VERIFY <ArrowRight size={18} />
                                </Link>
                                <Link
                                    to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                                    className="w-full bg-white text-slate-400 py-4 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:text-slate-900 transition-all text-center"
                                >
                                    Already have an account? Login
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Features Info */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center space-y-2">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center mx-auto text-indigo-600">
                                <Star size={20} fill="currentColor" />
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Verified Ratings</p>
                        </div>
                        <div className="text-center space-y-2">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center mx-auto text-indigo-600">
                                <Users size={20} />
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Find Partners</p>
                        </div>
                        <div className="text-center space-y-2">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center mx-auto text-indigo-600">
                                <Trophy size={20} />
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Ranking</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen bg-[#EBEBE6] flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto shadow-2xl animate-bounce">
                        <CheckCircle2 size={48} />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Participation<br />Verified!</h2>
                        <p className="text-slate-500 font-medium">You've successfully joined the match. Redirecting you to your dashboard...</p>
                    </div>
                    <div className="flex gap-2 justify-center">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse [animation-delay:200ms]"></div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse [animation-delay:400ms]"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#EBEBE6] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-[32px] flex items-center justify-center mx-auto shadow-xl">
                    <AlertCircle size={40} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Verification Failed</h2>
                    <p className="text-slate-500 font-medium mt-2">{error}</p>
                </div>
                <Link to="/dashboard" className="inline-block bg-slate-950 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">
                    BACK TO DASHBOARD
                </Link>
            </div>
        </div>
    );
};

export default MatchVerifyPage;
