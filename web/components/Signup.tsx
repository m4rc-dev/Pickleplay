import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import {
    Eye,
    EyeOff,
    AlertCircle,
    Loader2,
    CheckCircle2,
    ArrowLeft,
    X,
    Shield
} from 'lucide-react';

// ─── Default T&C ──────────────────────────────────────────────────────────────
const DEFAULT_TERMS = `
<h1>Terms and Conditions</h1>
<p><strong>Effective Date:</strong> February 18, 2026</p>
<p>Welcome to PicklePlay Philippines. By creating an account and using our platform, you agree to the following terms and conditions.</p>

<h2>1. Acceptance of Terms</h2>
<p>By registering for and using the PicklePlay platform (&ldquo;Service&rdquo;), you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions (&ldquo;Terms&rdquo;). If you do not agree to these Terms, you may not use the Service.</p>

<h2>2. Account Registration</h2>
<p>You must provide accurate, current, and complete information during the registration process. You are responsible for safeguarding your password and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.</p>

<h2>3. User Conduct</h2>
<p>You agree not to:</p>
<ul>
<li>Use the Service for any unlawful purpose or in violation of any applicable law</li>
<li>Impersonate any person or entity, or misrepresent your affiliation</li>
<li>Upload or transmit any harmful, offensive, or inappropriate content</li>
<li>Attempt to gain unauthorized access to any part of the Service</li>
<li>Interfere with or disrupt the Service or servers</li>
</ul>

<h2>4. Court Bookings &amp; Payments</h2>
<p>All court bookings made through the platform are subject to availability and the policies of the respective court owners. Cancellation and refund policies are determined by individual court owners and will be displayed at the time of booking.</p>

<h2>5. Professional Roles</h2>
<p>Users who apply for Coach or Court Owner roles are subject to additional verification and approval. PicklePlay reserves the right to approve or reject applications at its sole discretion.</p>

<h2>6. Privacy &amp; Data</h2>
<p>Your use of the Service is also governed by our Privacy Policy. We collect and process personal data as described therein. By using the Service, you consent to such processing.</p>

<h2>7. Intellectual Property</h2>
<p>All content, trademarks, and intellectual property on the platform are owned by PicklePlay Philippines. You may not copy, reproduce, or distribute any content without prior written permission.</p>

<h2>8. Limitation of Liability</h2>
<p>PicklePlay is provided &ldquo;as is&rdquo; without warranties of any kind. We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.</p>

<h2>9. Termination</h2>
<p>We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion.</p>

<h2>10. Changes to Terms</h2>
<p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>

<h2>11. Contact</h2>
<p>For questions about these Terms, please contact us through the platform&rsquo;s support channels.</p>
`;

// ─── Terms Modal ──────────────────────────────────────────────────────────────
const TermsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [termsContent, setTermsContent] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        (async () => {
            try {
                const { data } = await supabase.from('platform_content').select('content').eq('slug', 'terms-and-conditions').maybeSingle();
                setTermsContent(data?.content || DEFAULT_TERMS);
            } catch { setTermsContent(DEFAULT_TERMS); }
            finally { setLoading(false); }
        })();
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><Shield size={18} className="text-blue-600" /></div>
                        <div>
                            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Terms & Conditions</h2>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">PicklePlay Philippines</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 text-sm text-slate-700 leading-relaxed">
                    {loading ? (
                        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-blue-600" /></div>
                    ) : (
                        <div className="prose prose-sm prose-slate max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-slate-900 prose-h1:text-lg prose-h1:mb-3 prose-h1:mt-4 prose-h2:text-sm prose-h2:mb-2 prose-h2:mt-4 prose-p:mb-2 prose-p:text-slate-600 prose-li:text-slate-600 prose-li:mb-0.5 prose-strong:text-slate-900 prose-ul:my-2 prose-ol:my-2" dangerouslySetInnerHTML={{ __html: termsContent }} />
                    )}
                </div>
                <div className="px-6 py-4 border-t border-slate-100 shrink-0">
                    <button onClick={onClose} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold py-3.5 rounded-xl uppercase tracking-wider text-xs transition-all active:scale-[0.98] shadow-lg shadow-blue-600/25">
                        I Understand
                    </button>
                </div>
            </div>
        </div>
    );
};

const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 01-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

// ─── Main Signup ──────────────────────────────────────────────────────────────
const Signup: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '/dashboard';

    const normalizeUsername = (value: string) =>
        value.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 30);

    const handleSocialLogin = async (provider: 'google' | 'facebook') => {
        if (!agreedToTerms) { setError('You must agree to the Terms & Conditions before signing up.'); return; }
        setLoading(true);
        setError(null);
        try {
            const referralCode = searchParams.get('ref');
            if (referralCode) localStorage.setItem('referral_code', referralCode);
            if (redirectUrl && redirectUrl !== '/dashboard') localStorage.setItem('auth_redirect', redirectUrl);
            localStorage.setItem('terms_accepted_at', new Date().toISOString());
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

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agreedToTerms) { setError('You must agree to the Terms & Conditions before signing up.'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters long.'); return; }
        setLoading(true);
        setError(null);
        try {
            const referralCode = searchParams.get('ref');
            const { data, error: authError } = await supabase.auth.signUp({
                email, password,
                options: { data: { full_name: fullName, username: fullName.toLowerCase().replace(/\s+/g, '_'), referred_by_code: referralCode } }
            });
            if (authError) throw authError;
            if (data.user) {
                if (data.session) {
                    const { error: profileError } = await supabase.from('profiles').upsert({
                        id: data.user.id, email: data.user.email || email, full_name: fullName,
                        username: normalizeUsername(fullName || data.user.email?.split('@')[0] || 'player'),
                        terms_accepted_at: new Date().toISOString()
                    }, { onConflict: 'id' });
                    if (profileError) console.error('Failed to upsert profile fields during signup:', profileError);
                }
                setSuccess(true);
                const loginUrl = redirectUrl !== '/dashboard' ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login';
                setTimeout(() => navigate(loginUrl), 3000);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create account. Please try again.');
        } finally { setLoading(false); }
    };

    /* ── Success ── */
    if (success) {
        return (
            <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center px-4">
                <div className="text-center space-y-5 max-w-sm">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-lime-400 rounded-full shadow-xl shadow-lime-400/30 animate-bounce">
                        <CheckCircle2 size={40} className="text-slate-900" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase">Account Created!</h1>
                    <p className="text-white/50 text-base leading-relaxed">You're all set. Redirecting you to login...</p>
                    <Loader2 className="animate-spin text-lime-400 mx-auto" size={28} />
                </div>
            </div>
        );
    }

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
            <div className="absolute top-[15%] right-[10%] w-[35rem] h-[35rem] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />
            <div className="absolute bottom-[10%] left-[5%] w-[45rem] h-[45rem] rounded-full bg-blue-600/15 blur-[110px] pointer-events-none animate-pulse" />
            <div className="absolute top-[50%] left-[20%] w-[30rem] h-[30rem] rounded-full bg-indigo-500/10 blur-[140px] pointer-events-none" />

            {/* ── Background Pickleballs (Matching Reference Image) ── */}
            <img src="/images/Ball.png" alt="" style={{ '--dur': '14s', '--rot': '-15deg' } as any} className="absolute -top-12 right-[10%] w-64 h-64 opacity-[0.1] animate-float pointer-events-none select-none blur-[1px] drop-shadow-[0_0_30px_rgba(163,230,53,0.15)]" />
            <img src="/images/Ball.png" alt="" style={{ '--dur': '16s', '--rot': '10deg' } as any} className="absolute top-[10%] -left-16 w-52 h-52 opacity-[0.08] animate-float pointer-events-none select-none drop-shadow-[0_0_20px_rgba(163,230,53,0.12)]" />
            <img src="/images/Ball.png" alt="" style={{ '--dur': '19s', '--rot': '-35deg' } as any} className="absolute bottom-[15%] -right-20 w-80 h-80 opacity-[0.12] animate-float pointer-events-none select-none blur-[2px] drop-shadow-[0_0_40px_rgba(163,230,53,0.2)]" />
            <img src="/images/Ball.png" alt="" style={{ '--dur': '13s', '--rot': '25deg' } as any} className="absolute bottom-[5%] left-[5%] w-64 h-64 opacity-[0.07] animate-float pointer-events-none select-none" />

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
                    Back to Home
                </Link>
            </div>

            {/* ═══════ CENTERED CARD ═══════ */}
            <div className="relative z-10 w-full max-w-[56.25rem] bg-white rounded-[32px] shadow-2xl shadow-black/50 border border-white/5 overflow-hidden animate-fade-in-blur">
                <div className="flex flex-col lg:flex-row min-h-[35rem]">

                    {/* ── LEFT COLUMN — Pickleball photo + branding ── */}
                    <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden rounded-l-3xl">
                        <img
                            src="/images/home-images/pb7.jpg"
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
                                    Launch your game<br />
                                    <span className="text-lime-400">to the next level.</span>
                                </h2>
                                <div className="flex gap-3">
                                    <div className="w-1 rounded-full bg-blue-500 shrink-0" />
                                    <p className="text-white/50 text-sm leading-relaxed">
                                        Build your player profile and get<br />matched with top courts & events.
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
                        <h1 className="text-2xl font-black text-slate-950 tracking-tight text-center lg:text-center mb-6 animate-fade-in-up">Create Account</h1>

                        <form onSubmit={handleSignup} className="space-y-4">
                            {error && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-3 text-rose-600 text-sm animate-fade-in">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <p className="font-medium">{error}</p>
                                </div>
                            )}

                            {/* Full Name */}
                            <div className="space-y-1.5 animate-fade-in-up animate-stagger-1">
                                <label className="text-[0.625rem] font-extrabold uppercase tracking-widest text-slate-700 ml-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#1E40AF] focus:ring-2 focus:ring-blue-100 rounded-xl py-3.5 px-4 text-slate-900 text-sm font-semibold placeholder:text-slate-400 outline-none transition-all"
                                    placeholder="Juan Dela Cruz"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5 animate-fade-in-up animate-stagger-2">
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

                            {/* Password + Confirm */}
                            <div className="grid grid-cols-2 gap-3 animate-fade-in-up animate-stagger-3">
                                <div className="space-y-1.5">
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
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[0.625rem] font-extrabold uppercase tracking-widest text-slate-700 ml-1">Confirm</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={`w-full bg-slate-50/50 border rounded-xl py-3.5 px-4 text-slate-900 text-sm font-semibold placeholder:text-slate-400 outline-none transition-all focus:ring-2 ${confirmPassword && confirmPassword !== password
                                                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                                                : 'border-slate-200 focus:border-[#1E40AF] focus:ring-blue-100'
                                                }`}
                                            placeholder="••••••••"
                                        />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Terms */}
                            <div className="flex items-start gap-2.5 pt-1 animate-fade-in-up animate-stagger-4">
                                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                    <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="w-4 h-4 mt-0.5 rounded border-slate-400 text-blue-600 focus:ring-blue-600/20" />
                                    <span className="text-xs text-slate-700 font-medium leading-relaxed">
                                        I agree to the{' '}
                                        <button type="button" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }} className="text-blue-600 font-bold hover:text-blue-700 underline underline-offset-2 transition-colors">
                                            Terms & Privacy Policy
                                        </button>
                                    </span>
                                </label>
                            </div>

                            {/* CTA */}
                            <button
                                type="submit"
                                disabled={loading || !agreedToTerms}
                                className={`w-full font-black h-14 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl animate-fade-in-up animate-stagger-5 ${agreedToTerms
                                    ? 'bg-[#1E40AF] hover:bg-blue-800 text-white shadow-blue-900/20'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                    }`}
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Create Account'}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-5 animate-fade-in delay-500">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-300" /></div>
                            <div className="relative flex justify-center text-[0.625rem] font-bold uppercase tracking-widest">
                                <span className="bg-white px-4 text-slate-500">sign up with</span>
                            </div>
                        </div>

                        {/* Google */}
                        <button
                            type="button"
                            onClick={() => handleSocialLogin('google')}
                            disabled={!agreedToTerms}
                            className={`w-full flex items-center justify-center gap-3 border rounded-xl py-3 transition-all active:scale-[0.97] group animate-fade-in delay-700 ${agreedToTerms
                                ? 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                                : 'bg-slate-100 border-slate-100 opacity-50 cursor-not-allowed'
                                }`}
                        >
                            <GoogleIcon />
                        </button>

                        {/* Bottom link */}
                        <p className="mt-5 text-center text-slate-600 text-sm font-medium">
                            Already have an account?{' '}
                            <Link to="/login" className="text-[#1E40AF] font-bold hover:text-blue-700 transition-all">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Terms Modal */}
            <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
        </div>
    );
};

export default Signup;
