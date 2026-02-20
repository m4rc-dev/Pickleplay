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
        <div className="min-h-screen w-full bg-[#030712] flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(var(--rot)); }
                    50% { transform: translateY(-30px) rotate(var(--rot)); }
                }
                @keyframes fadeInBlur {
                    from { opacity: 0; filter: blur(10px); transform: scale(0.98) translateY(20px); }
                    to { opacity: 1; filter: blur(0); transform: scale(1) translateY(0); }
                }
                .animate-float {
                    animation: float var(--dur) ease-in-out infinite;
                }
                .animate-fade-in-blur {
                    animation: fadeInBlur 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>

            {/* ── Background Gradients ── */}
            <div className="absolute top-[10%] left-[10%] w-[40rem] h-[40rem] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[20%] right-[15%] w-[35rem] h-[35rem] rounded-full bg-blue-600/15 blur-[100px] pointer-events-none" />
            <div className="absolute top-[40%] right-[30%] w-[30rem] h-[30rem] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none animate-pulse" />

            {/* ── Background Pickleballs (Matching Reference Image) ── */}
            <img src="/images/Ball.png" alt="" style={{ '--dur': '12s', '--rot': '15deg' } as any} className="absolute -top-10 -left-10 w-64 h-64 opacity-[0.12] animate-float pointer-events-none select-none blur-[1px] drop-shadow-[0_0_30px_rgba(163,230,53,0.2)]" />
            <img src="/images/Ball.png" alt="" style={{ '--dur': '15s', '--rot': '-10deg' } as any} className="absolute top-[5%] right-[20%] w-48 h-48 opacity-[0.08] animate-float pointer-events-none select-none drop-shadow-[0_0_20px_rgba(163,230,53,0.15)]" />
            <img src="/images/Ball.png" alt="" style={{ '--dur': '18s', '--rot': '45deg' } as any} className="absolute bottom-[20%] -left-20 w-80 h-80 opacity-[0.1] animate-float pointer-events-none select-none blur-[2px] drop-shadow-[0_0_40px_rgba(163,230,53,0.18)]" />
            <img src="/images/Ball.png" alt="" style={{ '--dur': '14s', '--rot': '-25deg' } as any} className="absolute top-[40%] -right-16 w-72 h-72 opacity-[0.09] animate-float pointer-events-none select-none blur-[1px]" />
            <img src="/images/Ball.png" alt="" style={{ '--dur': '20s', '--rot': '30deg' } as any} className="absolute bottom-[5%] right-[5%] w-56 h-56 opacity-[0.06] animate-float pointer-events-none select-none" />

            {/* ── Subtle Pattern overlay ── */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.03] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

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
            <div className="relative z-10 w-full max-w-[56.25rem] bg-white rounded-[32px] shadow-2xl shadow-black/50 border border-white/5 overflow-hidden animate-fade-in-blur">
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
                        <h1 className="text-2xl font-black text-slate-950 tracking-tight text-center lg:text-center mb-7 animate-fade-in-up">Login</h1>

                        <form onSubmit={handleLogin} className="space-y-5">
                            {error && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-3 text-rose-600 text-sm animate-fade-in">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <p className="font-medium">{error}</p>
                                </div>
                            )}

                            {/* Email */}
                            <div className="space-y-1.5 animate-fade-in-up animate-stagger-1">
                                <label className="text-[0.625rem] font-extrabold uppercase tracking-widest text-slate-700 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#1E40AF] focus:ring-2 focus:ring-blue-100 rounded-xl py-3.5 px-4 text-slate-900 text-sm font-semibold placeholder:text-slate-400 outline-none transition-all"
                                    placeholder="name@example.com"
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5 animate-fade-in-up animate-stagger-2">
                                <label className="text-[0.625rem] font-extrabold uppercase tracking-widest text-slate-700 ml-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#1E40AF] focus:ring-2 focus:ring-blue-100 rounded-xl py-3.5 px-4 text-slate-900 text-sm font-semibold placeholder:text-slate-400 outline-none transition-all"
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
                            <div className="flex items-center justify-between animate-fade-in-up animate-stagger-3">
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
                                className="w-full bg-[#1E40AF] hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black h-14 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-blue-900/20 animate-fade-in-up animate-stagger-4"
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-6 animate-fade-in delay-500">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-300" /></div>
                            <div className="relative flex justify-center text-[0.625rem] font-bold uppercase tracking-widest">
                                <span className="bg-white px-4 text-slate-500">continue with</span>
                            </div>
                        </div>

                        {/* Google */}
                        <button
                            type="button"
                            onClick={() => handleSocialLogin('google')}
                            className="w-full flex items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-300 hover:border-slate-400 rounded-xl py-3 transition-all active:scale-[0.97] group animate-fade-in delay-700"
                        >
                            <GoogleIcon />
                        </button>

                        {/* Bottom link */}
                        <p className="mt-6 text-center text-slate-600 text-sm font-medium">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-[#1E40AF] font-bold hover:text-blue-700 transition-all">
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
