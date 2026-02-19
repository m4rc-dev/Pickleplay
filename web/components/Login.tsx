import React, { useState, useEffect } from 'react';
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
    const [cameFromLogout, setCameFromLogout] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Read the logout flag once on mount, then clear it immediately
    useEffect(() => {
        if (localStorage.getItem('came_from_logout')) {
            setCameFromLogout(true);
            localStorage.removeItem('came_from_logout');
        }
    }, []);
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
                ? `${window.location.origin}/auth/callback?ref=${referralCode}`
                : `${window.location.origin}/auth/callback`;
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
        <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
            {/* ── Chromatic gradient blobs ── */}
            <div className="absolute -top-[20%] -left-[15%] w-[43.75rem] h-[43.75rem] rounded-full bg-gradient-to-br from-lime-500/20 via-green-500/15 to-emerald-500/10 blur-[7.5rem] pointer-events-none" />
            <div className="absolute -bottom-[20%] -right-[15%] w-[43.75rem] h-[43.75rem] rounded-full bg-gradient-to-tl from-blue-600/20 via-blue-500/15 to-cyan-500/10 blur-[7.5rem] pointer-events-none" />
            <div className="absolute top-[30%] left-[50%] -translate-x-1/2 w-[31.25rem] h-[31.25rem] rounded-full bg-gradient-to-r from-lime-400/10 to-blue-500/10 blur-[6.25rem] pointer-events-none" />

            {/* ── Large & clear Ball.png background decorations ── */}
            <img src="/images/Ball.png" alt="" className="absolute z-0 top-[-2%] left-[-3%] w-28 h-28 sm:w-36 sm:h-36 lg:w-48 lg:h-48 opacity-[0.18] rotate-12 drop-shadow-[0_8px_30px_rgba(132,204,22,0.15)] pointer-events-none select-none" />
            <img src="/images/Ball.png" alt="" className="absolute z-0 top-[5%] right-[-2%] w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 opacity-[0.15] -rotate-[20deg] drop-shadow-[0_6px_25px_rgba(59,130,246,0.15)] pointer-events-none select-none" />
            <img src="/images/Ball.png" alt="" className="absolute z-0 top-[30%] left-[2%] w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 opacity-[0.14] rotate-45 drop-shadow-[0_6px_22px_rgba(132,204,22,0.12)] pointer-events-none select-none" />
            <img src="/images/Ball.png" alt="" className="absolute z-0 top-[55%] right-[1%] w-28 h-28 sm:w-36 sm:h-36 lg:w-44 lg:h-44 opacity-[0.17] rotate-[30deg] drop-shadow-[0_8px_28px_rgba(59,130,246,0.15)] pointer-events-none select-none" />
            <img src="/images/Ball.png" alt="" className="absolute z-0 bottom-[5%] left-[1%] w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 opacity-[0.15] -rotate-[15deg] drop-shadow-[0_6px_25px_rgba(132,204,22,0.12)] pointer-events-none select-none" />
            <img src="/images/Ball.png" alt="" className="absolute z-0 bottom-[-3%] right-[8%] w-20 h-20 sm:w-28 sm:h-28 lg:w-36 lg:h-36 opacity-[0.14] rotate-[60deg] drop-shadow-[0_6px_22px_rgba(59,130,246,0.12)] pointer-events-none select-none" />
            <img src="/images/Ball.png" alt="" className="absolute z-0 top-[18%] left-[40%] w-16 h-16 sm:w-20 sm:h-20 lg:w-28 lg:h-28 opacity-[0.12] -rotate-[40deg] drop-shadow-[0_4px_18px_rgba(132,204,22,0.10)] pointer-events-none select-none" />
            <img src="/images/Ball.png" alt="" className="absolute z-0 bottom-[25%] right-[25%] w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 opacity-[0.14] rotate-[15deg] drop-shadow-[0_6px_22px_rgba(59,130,246,0.12)] pointer-events-none select-none" />
            <img src="/images/Ball.png" alt="" className="absolute z-0 top-[70%] left-[20%] w-20 h-20 sm:w-28 sm:h-28 lg:w-36 lg:h-36 opacity-[0.14] rotate-[50deg] drop-shadow-[0_6px_22px_rgba(132,204,22,0.12)] pointer-events-none select-none" />
            <img src="/images/Ball.png" alt="" className="absolute z-0 top-[-1%] left-[55%] w-14 h-14 sm:w-18 sm:h-18 lg:w-24 lg:h-24 opacity-[0.11] -rotate-[25deg] drop-shadow-[0_4px_16px_rgba(59,130,246,0.10)] pointer-events-none select-none" />

            {/* Back to Home — above card */}
            <div className="relative z-10 w-full max-w-[56.25rem] mb-4">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white/80 transition-colors"
                >
                    <ArrowLeft size={14} />
                    {cameFromLogout ? 'Homepage' : 'Back to Home'}
                </Link>
            </div>

            {/* ═══════ CENTERED CARD ═══════ */}
            <div className="relative z-10 w-full max-w-[56.25rem] bg-white rounded-3xl shadow-2xl shadow-black/30 border border-white/10 overflow-hidden">
                <div className="flex flex-col lg:flex-row min-h-[32.5rem]">

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
                                    <p className="text-white/40 text-[0.5625rem] font-bold uppercase tracking-widest">Philippines</p>
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

                            <p className="text-white/20 text-[0.625rem] font-bold uppercase tracking-widest">© 2026 PicklePlay PH</p>
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN — Form ── */}
                    <div className="flex-1 flex flex-col justify-center px-7 py-9 sm:px-10 lg:px-12 lg:border-l border-slate-200">
                        {/* Mobile logo */}
                        <div className="lg:hidden flex justify-center mb-5">
                            <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="w-12 h-12 rounded-xl object-contain shadow-md" />
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl font-black text-slate-950 tracking-tight text-center lg:text-center mb-7">Login</h1>

                        <form onSubmit={handleLogin} className="space-y-5">
                            {error && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-3 text-rose-600 text-sm">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <p className="font-medium">{error}</p>
                                </div>
                            )}

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="text-[0.625rem] font-extrabold uppercase tracking-widest text-slate-700 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-50/50 border border-slate-300 rounded-xl py-3 px-4 text-slate-950 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:bg-white transition-all"
                                    placeholder="name@example.com"
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <label className="text-[0.625rem] font-extrabold uppercase tracking-widest text-slate-700 ml-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-50/50 border border-slate-300 rounded-xl py-3 px-4 pr-12 text-slate-950 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:bg-white transition-all"
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
                                    <input type="checkbox" checked={rememberSession} onChange={(e) => setRememberSession(e.target.checked)} className="w-4 h-4 rounded border-slate-400 text-blue-600 focus:ring-blue-600/20" />
                                    <span className="text-xs text-slate-700 font-semibold">Remember session</span>
                                </label>
                                <button type="button" className="text-[0.625rem] font-extrabold uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors">
                                    Forgot Password?
                                </button>
                            </div>

                            {/* CTA */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold h-12 rounded-xl uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/25"
                            >
                                {loading ? <Loader2 size={22} className="animate-spin" /> : 'Sign In'}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-300" /></div>
                            <div className="relative flex justify-center text-[0.625rem] font-bold uppercase tracking-widest">
                                <span className="bg-white px-4 text-slate-500">continue with</span>
                            </div>
                        </div>

                        {/* Google */}
                        <button
                            type="button"
                            onClick={() => handleSocialLogin('google')}
                            className="w-full flex items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-300 hover:border-slate-400 rounded-xl py-3 transition-all active:scale-[0.97] group"
                        >
                            <GoogleIcon />
                        </button>

                        {/* Bottom link */}
                        <p className="mt-6 text-center text-slate-600 text-sm font-medium">
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
