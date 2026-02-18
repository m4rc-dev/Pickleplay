import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase, createSession, getSecuritySettings } from '../services/supabase';
import {
    Eye,
    EyeOff,
    AlertCircle,
    Loader2,
    ArrowLeft
} from 'lucide-react';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberSession, setRememberSession] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '/';

    const normalizeUsername = (value: string) =>
        value.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 30);

    const ensureProfileFields = async (user: any) => {
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('email, full_name, username')
            .eq('id', user.id)
            .maybeSingle();

        const resolvedFullName = existingProfile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '';
        const resolvedEmail = existingProfile?.email || user?.email || null;
        const baseUsername = normalizeUsername(
            existingProfile?.username || resolvedFullName || user?.email?.split('@')[0] || 'player'
        ) || 'player';

        let candidateUsername = existingProfile?.username || baseUsername;
        for (let attempt = 0; attempt < 5; attempt++) {
            const { error } = await supabase
                .from('profiles')
                .upsert({ id: user.id, email: resolvedEmail, full_name: resolvedFullName, username: candidateUsername }, { onConflict: 'id' });
            if (!error) return;
            if (error.code === '23505') {
                candidateUsername = `${baseUsername.slice(0, 22)}_${Math.random().toString(36).slice(2, 7)}`;
                continue;
            }
            console.error('Failed to upsert profile fields during login:', error);
            return;
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'facebook') => {
        setLoading(true);
        setError(null);
        try {
            const referralCode = searchParams.get('ref');
            if (referralCode) localStorage.setItem('referral_code', referralCode);
            if (redirectUrl && redirectUrl !== '/dashboard') localStorage.setItem('auth_redirect', redirectUrl);
            const callbackUrl = referralCode
                ? `${window.location.origin}/#/auth/callback?ref=${referralCode}`
                : `${window.location.origin}/#/auth/callback`;
            const { error: authError } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: callbackUrl } });
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
            const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) throw authError;
            if (data.user) {
                await ensureProfileFields(data.user);
                const deviceName = navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser';
                try {
                    const ipResponse = await fetch('https://api.ipify.org?format=json');
                    const ipData = await ipResponse.json();
                    await createSession(data.user.id, deviceName, ipData.ip);
                } catch { await createSession(data.user.id, deviceName); }

                const settings = await getSecuritySettings(data.user.id);
                if (settings.data?.two_factor_enabled) {
                    localStorage.setItem('two_factor_pending', 'true');
                    const storedRedirect = localStorage.getItem('auth_redirect');
                    const finalRedirect = storedRedirect || redirectUrl;
                    if (finalRedirect && finalRedirect !== '/dashboard') localStorage.setItem('auth_redirect', finalRedirect);
                    navigate('/verify-2fa');
                } else {
                    localStorage.removeItem('two_factor_pending');
                    const storedRedirect = localStorage.getItem('auth_redirect');
                    localStorage.removeItem('auth_redirect');
                    navigate(storedRedirect || redirectUrl);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to sign in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const GoogleIcon = () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 01-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-100 flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
            {/* ── Scattered Ball.png background decorations ── */}
            <img src="/images/Ball.png" alt="" className="absolute top-[5%] left-[3%] w-14 h-14 opacity-[0.06] rotate-12 pointer-events-none select-none" />
            <img src="/images/Ball.png" alt="" className="absolute top-[12%] right-[8%] w-10 h-10 opacity-[0.05] -rotate-[20deg] pointer-events-none select-none" />
            <img src="/images/Ball.png" alt="" className="absolute top-[35%] left-[7%] w-8 h-8 opacity-[0.04] rotate-45 pointer-events-none select-none" />
            <img src="/images/Ball.png" alt="" className="absolute top-[60%] right-[4%] w-12 h-12 opacity-[0.06] rotate-[30deg] pointer-events-none select-none" />
            <img src="/images/Ball.png" alt="" className="absolute bottom-[15%] left-[5%] w-11 h-11 opacity-[0.05] -rotate-[15deg] pointer-events-none select-none" />
            <img src="/images/Ball.png" alt="" className="absolute bottom-[8%] right-[12%] w-9 h-9 opacity-[0.04] rotate-[60deg] pointer-events-none select-none" />
            <img src="/images/Ball.png" alt="" className="absolute top-[22%] left-[45%] w-7 h-7 opacity-[0.03] -rotate-[40deg] pointer-events-none select-none" />
            <img src="/images/Ball.png" alt="" className="absolute bottom-[30%] right-[30%] w-8 h-8 opacity-[0.04] rotate-[15deg] pointer-events-none select-none" />
            <img src="/images/Ball.png" alt="" className="absolute top-[75%] left-[25%] w-10 h-10 opacity-[0.05] rotate-[50deg] pointer-events-none select-none" />
            <img src="/images/Ball.png" alt="" className="absolute top-[4%] left-[55%] w-6 h-6 opacity-[0.03] -rotate-[25deg] pointer-events-none select-none" />

            {/* Back to Home — above card */}
            <div className="w-full max-w-[900px] mb-4">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors"
                >
                    <ArrowLeft size={14} />
                    Back to Home
                </Link>
            </div>

            {/* ═══════ CENTERED CARD ═══════ */}
            <div className="w-full max-w-[900px] bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/60 overflow-hidden">
                <div className="flex flex-col lg:flex-row min-h-[520px]">

                    {/* ── LEFT COLUMN — Pickleball photo + branding ── */}
                    <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden rounded-l-3xl">
                        <img
                            src="/images/home-images/pb3.jpg"
                            alt="Pickleball action"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/75 via-slate-900/55 to-slate-900/75" />

                        <div className="relative z-10 flex flex-col justify-between p-9 w-full">
                            {/* Logo */}
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="absolute -inset-1.5 bg-white/20 rounded-xl blur-md" />
                                    <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="relative w-11 h-11 rounded-xl object-contain shadow-lg ring-2 ring-white/20" />
                                </div>
                                <div>
                                    <span className="text-white font-black text-base tracking-tight">PicklePlay</span>
                                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Philippines</p>
                                </div>
                            </div>

                            {/* Headline */}
                            <div className="space-y-5">
                                <h2 className="text-3xl xl:text-4xl font-black text-white leading-[1.15] tracking-tight">
                                    Welcome back<br />
                                    <span className="text-lime-400">to the court.</span>
                                </h2>
                                <div className="flex gap-3">
                                    <div className="w-1 rounded-full bg-blue-500 shrink-0" />
                                    <p className="text-white/50 text-sm leading-relaxed">
                                        Access your personalized dashboard<br />and continue your journey.
                                    </p>
                                </div>
                            </div>

                            <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">© 2026 PicklePlay PH</p>
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN — Form ── */}
                    <div className="flex-1 flex flex-col justify-center px-7 py-9 sm:px-10 lg:px-12 lg:border-l border-slate-100">
                        {/* Mobile logo */}
                        <div className="lg:hidden flex justify-center mb-5">
                            <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="w-12 h-12 rounded-xl object-contain shadow-md" />
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight text-center lg:text-center mb-7">Login</h1>

                        <form onSubmit={handleLogin} className="space-y-5">
                            {error && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-3 text-rose-600 text-sm">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <p className="font-medium">{error}</p>
                                </div>
                            )}

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all"
                                    placeholder="name@example.com"
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 ml-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 pr-12 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Remember + Forgot */}
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input type="checkbox" checked={rememberSession} onChange={(e) => setRememberSession(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600/20" />
                                    <span className="text-xs text-slate-500 font-medium">Remember session</span>
                                </label>
                                <button type="button" className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors">
                                    Forgot Password?
                                </button>
                            </div>

                            {/* CTA */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold h-[48px] rounded-xl uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/25"
                            >
                                {loading ? <Loader2 size={22} className="animate-spin" /> : 'Sign In'}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                                <span className="bg-white px-4 text-slate-400">continue with</span>
                            </div>
                        </div>

                        {/* Google */}
                        <button
                            type="button"
                            onClick={() => handleSocialLogin('google')}
                            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl py-3 transition-all active:scale-[0.97] group"
                        >
                            <GoogleIcon />
                        </button>

                        {/* Bottom link */}
                        <p className="mt-6 text-center text-slate-500 text-sm">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-blue-600 font-bold hover:text-blue-700 transition-colors underline underline-offset-2">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
