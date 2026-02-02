import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import {
    Trophy,
    Mail,
    Lock,
    User,
    Eye,
    EyeOff,
    ArrowRight,
    AlertCircle,
    Loader2,
    CheckCircle2
} from 'lucide-react';

const Signup: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    }
                }
            });

            if (authError) throw authError;

            if (data.user) {
                setSuccess(true);
                setTimeout(() => navigate('/login'), 3000);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/80 to-blue-900/40 z-10" />
                <div className="relative z-20 text-center space-y-6 max-w-sm px-6">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-lime-400 rounded-full mb-4 shadow-3xl shadow-lime-400/20 animate-bounce">
                        <CheckCircle2 size={48} className="text-slate-950" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Success!</h1>
                    <p className="text-slate-400 font-medium text-lg leading-relaxed">
                        Your account has been created. Redirecting you to the login page...
                    </p>
                    <div className="flex justify-center">
                        <Loader2 className="animate-spin text-lime-400" size={32} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950">
            {/* Background stays consistent with Login */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-30 scale-105"
                style={{ backgroundImage: 'url("/login-bg.png")' }}
            />

            <div className="absolute inset-0 z-10 bg-gradient-to-br from-slate-950 via-slate-950/80 to-blue-900/40" />
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-20 w-full max-w-md px-6 my-12">
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[48px] p-8 md:p-12 shadow-2xl">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-3xl mb-6 shadow-2xl shadow-blue-600/20">
                            <Trophy size={32} className="text-white" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase mb-2">Join the Elite.</h1>
                        <p className="text-slate-400 font-medium tracking-tight">Create your Pickleball PH account.</p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-5">
                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-3 text-rose-400 text-sm">
                                <AlertCircle size={18} className="shrink-0" />
                                <p className="font-medium">{error}</p>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-14 pr-14 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-600 tracking-tight ml-4 mt-2">Must be at least 8 characters long.</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black h-16 rounded-2xl uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-2xl shadow-blue-600/20"
                        >
                            {loading ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : (
                                <>
                                    Create Account <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-slate-400 text-sm font-medium">
                        Already have an account?{' '}
                        <Link to="/login" className="text-white font-black hover:text-blue-500 transition-colors uppercase tracking-tight ml-1">
                            Log in instead
                        </Link>
                    </p>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em] max-w-[280px] mx-auto leading-relaxed">
                        By signing up, you agree to our <span className="text-slate-400">Terms of Service</span> and <span className="text-slate-400">Privacy Policy</span>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Signup;
