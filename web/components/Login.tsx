import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import {
    Trophy,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    AlertCircle,
    Loader2
} from 'lucide-react';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            if (data.user) {
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to sign in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950">
            {/* Dynamic Background Image */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 scale-105 animate-pulse-slow"
                style={{ backgroundImage: 'url("/login-bg.png")' }}
            />

            {/* Overlays */}
            <div className="absolute inset-0 z-10 bg-gradient-to-br from-slate-950 via-slate-950/80 to-blue-900/40" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-lime-400/10 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />

            {/* Login Card */}
            <div className="relative z-20 w-full max-w-md px-6">
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[48px] p-8 md:p-12 shadow-2xl overflow-hidden relative group">
                    {/* Animated border effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-lime-400 rounded-3xl mb-6 shadow-2xl shadow-lime-400/20 transform hover:rotate-12 transition-transform duration-300">
                            <Trophy size={32} className="text-slate-950" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase mb-2">Welcome Back.</h1>
                        <p className="text-slate-400 font-medium tracking-tight">Access the Pickleball PH network.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-3 text-rose-400 text-sm animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={18} className="shrink-0" />
                                <p className="font-medium">{error}</p>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
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
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-14 pr-14 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
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
                        </div>

                        <div className="flex items-center justify-end px-2">
                            <button type="button" className="text-xs font-black uppercase tracking-widest text-lime-400 hover:text-lime-300 transition-colors">
                                Forgot Password?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-lime-400 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black h-16 rounded-2xl uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-2xl shadow-lime-400/20"
                        >
                            {loading ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : (
                                <>
                                    Enter Network <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-slate-400 text-sm font-medium">
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-white font-black hover:text-lime-400 transition-colors uppercase tracking-tight ml-1">
                            Join for free
                        </Link>
                    </p>
                </div>

                {/* Footer info */}
                <div className="mt-8 flex justify-center gap-6">
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">© 2026 PICKLEBALL PH</p>
                    <div className="w-1 h-1 bg-slate-800 rounded-full my-auto" />
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Privacy Policy</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
