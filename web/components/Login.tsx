import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase, createSession, getSecuritySettings } from '../services/supabase';
import {
    Trophy,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    AlertCircle,
    Loader2,
    ArrowLeft
} from 'lucide-react';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '/dashboard';

    const handleSocialLogin = async (provider: 'google' | 'facebook') => {
        setLoading(true);
        setError(null);
        try {
            // Store redirect URL in localStorage for after OAuth callback
            if (redirectUrl && redirectUrl !== '/dashboard') {
                localStorage.setItem('auth_redirect', redirectUrl);
            }
            const { error: authError } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`
                }
            });
            if (authError) throw authError;
        } catch (err: any) {
            setError(err.message || `Failed to sign in with ${provider}.`);
            setLoading(false);
        }
    };

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
                // Create session record with IP address
                const deviceName = navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser';
                try {
                    const ipResponse = await fetch('https://api.ipify.org?format=json');
                    const ipData = await ipResponse.json();
                    await createSession(data.user.id, deviceName, ipData.ip);
                } catch {
                    await createSession(data.user.id, deviceName);
                }

                // Check if user has 2FA enabled
                const settings = await getSecuritySettings(data.user.id);
                if (settings.data?.two_factor_enabled) {
                    // Store redirect for after 2FA verification
                    const storedRedirect = localStorage.getItem('auth_redirect');
                    const finalRedirect = storedRedirect || redirectUrl;
                    if (finalRedirect && finalRedirect !== '/dashboard') {
                        localStorage.setItem('auth_redirect', finalRedirect);
                    }
                    navigate('/verify-2fa');
                } else {
                    // No 2FA, go directly to dashboard
                    const storedRedirect = localStorage.getItem('auth_redirect');
                    localStorage.removeItem('auth_redirect');
                    const finalRedirect = storedRedirect || redirectUrl;
                    navigate(finalRedirect);
                }
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
                {/* Back to Home Button */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4 text-sm font-bold uppercase tracking-widest"
                >
                    <ArrowLeft size={16} />
                    Back to Home
                </Link>

                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[48px] p-8 md:p-12 shadow-2xl overflow-hidden relative group">
                    {/* Animated border effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                    <div className="text-center mb-10">
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

                    {/* Social Login Section */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                            <span className="bg-[#0f172a] px-4 text-slate-500">Or continue with</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <button
                            type="button"
                            onClick={() => handleSocialLogin('google')}
                            className="flex items-center justify-center gap-3 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl py-4 transition-all active:scale-[0.95] group"
                        >
                            <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span className="text-white text-xs font-black uppercase tracking-widest">Google</span>
                        </button>
                    </div>

                    <p className="mt-8 text-center text-slate-400 text-sm font-medium">
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-white font-black hover:text-lime-400 transition-colors uppercase tracking-tight ml-1">
                            Join for free
                        </Link>
                    </p>
                </div>

                {/* Footer info */}
                <div className="mt-8 flex justify-center gap-6">
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">© 2026 PICKLEPLAY</p>
                    <div className="w-1 h-1 bg-slate-800 rounded-full my-auto" />
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Privacy Policy</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
