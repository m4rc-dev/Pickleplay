import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Eye,
    EyeOff,
    Loader2,
    LockKeyhole,
    LogIn,
    LogOut,
    Mail,
    Shield,
    Smartphone,
    UserCheck,
    UserPlus
} from 'lucide-react';
import {
    acceptCourtManagerInvite,
    getManagerInviteDetails,
    registerCourtManager
} from '../../services/courtManagers';
import { supabase } from '../../services/supabase';
import type { CourtManagerInviteDetails } from '../../services/courtManagers';

type SuccessState = 'registered' | 'accepted' | null;
type SessionUser = {
    id: string;
    email: string;
} | null;

const ManagerInvitePage: React.FC = () => {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const token = params.get('token') || '';
    const [isLoading, setIsLoading] = useState(true);
    const [invite, setInvite] = useState<CourtManagerInviteDetails | null>(null);
    const [currentUser, setCurrentUser] = useState<SessionUser>(null);
    const [error, setError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAccepting, setIsAccepting] = useState(false);
    const [successState, setSuccessState] = useState<SuccessState>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        contactNumber: '',
        password: '',
    });

    useEffect(() => {
        let isMounted = true;

        const syncCurrentUser = async () => {
            const { data } = await supabase.auth.getUser();
            if (!isMounted) return;

            const user = data.user;
            setCurrentUser(user ? { id: user.id, email: user.email || '' } : null);
        };

        syncCurrentUser();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const user = session?.user;
            setCurrentUser(user ? { id: user.id, email: user.email || '' } : null);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!token) {
            setError('Invite token is missing.');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        getManagerInviteDetails(token)
            .then((data) => {
                setInvite(data);
                setFormData((current) => ({
                    ...current,
                    fullName: data.managerName || '',
                    email: data.managerEmail || '',
                }));
            })
            .catch((err) => setError(err.message || 'Failed to load invite.'))
            .finally(() => setIsLoading(false));
    }, [token]);

    const expiryLabel = useMemo(() => {
        if (!invite?.expiresAt) return 'This invite expires soon';
        return new Date(invite.expiresAt).toLocaleString();
    }, [invite]);

    const inviteReturnPath = useMemo(() => (
        token ? `/manager-invite?token=${encodeURIComponent(token)}` : '/manager-invite'
    ), [token]);

    const loginHref = useMemo(() => {
        const query = new URLSearchParams();
        if (invite?.managerEmail) {
            query.set('email', invite.managerEmail);
        }
        query.set('redirect', inviteReturnPath);
        return `/login?${query.toString()}`;
    }, [invite?.managerEmail, inviteReturnPath]);

    const normalizedInviteEmail = (invite?.managerEmail || '').trim().toLowerCase();
    const normalizedCurrentUserEmail = (currentUser?.email || '').trim().toLowerCase();
    const isSignedIn = Boolean(currentUser?.id);
    const isExistingAccountInvite = Boolean(invite?.existingAccount);
    const inviteStatus = invite?.status || null;
    const isPendingApprovalState = successState === 'registered' || successState === 'accepted' || inviteStatus === 'pending_approval';
    const isActiveState = inviteStatus === 'active';
    const isSignedInWithInvitedEmail = Boolean(
        isSignedIn &&
        normalizedInviteEmail &&
        normalizedCurrentUserEmail === normalizedInviteEmail
    );

    const headerTitle = useMemo(() => {
        if (isActiveState) return 'Manager Access Active';
        if (isPendingApprovalState) return 'Pending Approval';
        if (successState === 'registered') return 'Registration Submitted';
        if (successState === 'accepted') return 'Invitation Accepted';
        if (isExistingAccountInvite && !isSignedIn) return 'Sign In to Accept';
        if (isExistingAccountInvite && !isSignedInWithInvitedEmail) return 'Use the Invited Account';
        if (isExistingAccountInvite) return 'Accept Invitation';
        return 'Secure Registration';
    }, [isActiveState, isExistingAccountInvite, isPendingApprovalState, isSignedIn, isSignedInWithInvitedEmail, successState]);

    const headerDescription = useMemo(() => {
        if (isActiveState) {
            return 'This Court Manager assignment is active. Sign in and switch to Court Manager mode to use it.';
        }
        if (isPendingApprovalState) {
            return 'Your Court Manager invitation has been accepted and is now waiting for Court Owner approval.';
        }
        if (isExistingAccountInvite && !isSignedIn) {
            return 'This email already has a PicklePlay account. Sign in to accept your Court Manager invitation.';
        }
        if (isExistingAccountInvite && !isSignedInWithInvitedEmail) {
            return 'You need to sign in with the invited email before this court manager invite can be accepted.';
        }
        if (isExistingAccountInvite) {
            return 'You are signed in with the invited email. Accept the invite to send it to the owner for approval.';
        }
        return 'Use the assigned invite details to finish your registration.';
    }, [isActiveState, isExistingAccountInvite, isPendingApprovalState, isSignedIn, isSignedInWithInvitedEmail]);

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitError('');
        setIsSubmitting(true);

        try {
            await registerCourtManager({
                token,
                fullName: formData.fullName,
                email: formData.email,
                contactNumber: formData.contactNumber,
                password: formData.password,
            });
            setSuccessState('registered');
        } catch (err: any) {
            setSubmitError(err.message || 'Registration failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAcceptInvite = async () => {
        setSubmitError('');
        setIsAccepting(true);

        try {
            await acceptCourtManagerInvite(token);
            setSuccessState('accepted');
        } catch (err: any) {
            setSubmitError(err.message || 'Failed to accept invite.');
        } finally {
            setIsAccepting(false);
        }
    };

    const handleSwitchAccount = async () => {
        setSubmitError('');

        try {
            await supabase.auth.signOut();
            navigate(loginHref);
        } catch (err: any) {
            setSubmitError(err.message || 'Failed to switch accounts.');
        }
    };

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

            <div className="absolute top-[10%] left-[10%] w-[40rem] h-[40rem] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[20%] right-[15%] w-[35rem] h-[35rem] rounded-full bg-blue-600/15 blur-[100px] pointer-events-none" />
            <div className="absolute top-[40%] right-[30%] w-[30rem] h-[30rem] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none animate-pulse" />

            <img src="/images/Ball.png" alt="" style={{ '--dur': '12s', '--rot': '15deg' } as React.CSSProperties} className="absolute -top-10 -left-10 w-64 h-64 opacity-[0.12] animate-float pointer-events-none select-none blur-[1px] drop-shadow-[0_0_30px_rgba(163,230,53,0.2)]" />
            <img src="/images/Ball.png" alt="" style={{ '--dur': '15s', '--rot': '-10deg' } as React.CSSProperties} className="absolute top-[5%] right-[20%] w-48 h-48 opacity-[0.08] animate-float pointer-events-none select-none drop-shadow-[0_0_20px_rgba(163,230,53,0.15)]" />
            <img src="/images/Ball.png" alt="" style={{ '--dur': '18s', '--rot': '45deg' } as React.CSSProperties} className="absolute bottom-[20%] -left-20 w-80 h-80 opacity-[0.1] animate-float pointer-events-none select-none blur-[2px] drop-shadow-[0_0_40px_rgba(163,230,53,0.18)]" />
            <img src="/images/Ball.png" alt="" style={{ '--dur': '14s', '--rot': '-25deg' } as React.CSSProperties} className="absolute top-[40%] -right-16 w-72 h-72 opacity-[0.09] animate-float pointer-events-none select-none blur-[1px]" />
            <img src="/images/Ball.png" alt="" style={{ '--dur': '20s', '--rot': '30deg' } as React.CSSProperties} className="absolute bottom-[5%] right-[5%] w-56 h-56 opacity-[0.06] animate-float pointer-events-none select-none" />

            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.03] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-[56.25rem] mb-4">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white/80 transition-colors"
                >
                    <ArrowLeft size={14} />
                    Back to Home
                </Link>
            </div>

            <div className="relative z-10 w-full max-w-[56.25rem] bg-white rounded-[32px] shadow-2xl shadow-black/50 border border-white/5 overflow-hidden animate-fade-in-blur">
                <div className="flex flex-col lg:flex-row min-h-[37rem]">
                    <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden rounded-l-3xl">
                        <img
                            src="/images/home-images/pb3.jpg"
                            alt="Pickleball court"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/65 to-slate-900/80" />

                        <div className="relative z-10 flex flex-col justify-between p-9 w-full">
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

                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <p className="text-[0.625rem] font-black uppercase tracking-[0.35em] text-blue-300">Court Manager Invite</p>
                                    <h2 className="text-3xl xl:text-4xl font-black text-white leading-[1.1] tracking-tight">
                                        Claim your
                                        <br />
                                        <span className="text-lime-400">assigned court access.</span>
                                    </h2>
                                    <p className="text-white/55 text-sm leading-relaxed max-w-sm">
                                        {isExistingAccountInvite
                                            ? 'Use your existing PicklePlay account to accept this invite, then wait for the court owner to approve your manager access.'
                                            : 'Register with the invited email, complete your details, and wait for the court owner to approve your access before you sign in.'}
                                    </p>
                                </div>

                                <div className="rounded-[28px] border border-white/10 bg-white/10 backdrop-blur-xl p-5 space-y-4">
                                    <div>
                                        <p className="text-[0.625rem] font-black uppercase tracking-[0.3em] text-blue-200">Assigned Court</p>
                                        <p className="mt-2 text-2xl font-black tracking-tight text-white">{invite?.courtName || 'Loading invite...'}</p>
                                    </div>
                                    <div className="grid gap-3">
                                        <div className="flex items-start gap-3">
                                            <Mail size={16} className="text-blue-300 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-[0.5625rem] font-black uppercase tracking-[0.22em] text-white/35">Invited Email</p>
                                                <p className="text-sm font-semibold text-white/85 break-all">{invite?.managerEmail || 'Locked to the invite'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Shield size={16} className="text-lime-400 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-[0.5625rem] font-black uppercase tracking-[0.22em] text-white/35">Security</p>
                                                <p className="text-sm font-semibold text-white/85">Email locked, court locked, one-time acceptance, owner approval required.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <LockKeyhole size={16} className="text-white/70 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-[0.5625rem] font-black uppercase tracking-[0.22em] text-white/35">Invite Expiry</p>
                                                <p className="text-sm font-semibold text-white/85">{expiryLabel}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-white/20 text-[0.625rem] font-bold uppercase tracking-widest">Court-side access only</p>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center px-7 py-9 sm:px-10 lg:px-12 lg:border-l border-slate-200">
                        <div className="lg:hidden flex justify-center mb-5">
                            <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="w-12 h-12 rounded-xl object-contain shadow-md" />
                        </div>

                        <div className="mb-7 text-center lg:text-left">
                            <p className="text-[0.625rem] font-extrabold uppercase tracking-[0.28em] text-blue-600 mb-2">Court Manager Invite</p>
                            <h1 className="text-2xl font-black text-slate-950 tracking-tight">{headerTitle}</h1>
                            <p className="mt-2 text-sm font-medium text-slate-500">{headerDescription}</p>
                        </div>

                        {isLoading ? (
                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-600">
                                <Loader2 size={18} className="animate-spin text-blue-600" />
                                Validating invite...
                            </div>
                        ) : error ? (
                            <div className="space-y-5">
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-600 text-sm">
                                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold uppercase tracking-widest text-[0.625rem] mb-1">Invite unavailable</p>
                                        <p className="font-medium">{error}</p>
                                    </div>
                                </div>
                                <Link
                                    to="/login"
                                    className="w-full bg-slate-900 hover:bg-slate-950 text-white font-black h-14 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    Go to Login
                                </Link>
                            </div>
                        ) : (isPendingApprovalState || isActiveState) ? (
                            <div className="space-y-5">
                                <div className={`rounded-2xl border p-5 ${isActiveState ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                                    <div className={`mb-3 flex items-center gap-3 ${isActiveState ? 'text-emerald-700' : 'text-amber-700'}`}>
                                        {isActiveState ? <CheckCircle2 size={20} /> : <Shield size={20} />}
                                        <p className="text-[0.625rem] font-extrabold uppercase tracking-[0.25em]">
                                            {isActiveState ? 'Access Active' : 'Waiting for Approval'}
                                        </p>
                                    </div>
                                    <p className={`text-sm font-medium leading-relaxed ${isActiveState ? 'text-emerald-900' : 'text-amber-900'}`}>
                                        {isActiveState ? (
                                            <>Your Court Manager access for <strong>{invite?.courtName}</strong> is active. Sign in with <strong>{invite?.managerEmail}</strong> and switch to Court Manager mode from your dashboard.</>
                                        ) : successState === 'accepted' || isExistingAccountInvite ? (
                                            <>Your PicklePlay account <strong>{invite?.managerEmail}</strong> is linked to this court manager invitation. You can keep using your normal PicklePlay account while the Court Owner reviews your assignment.</>
                                        ) : (
                                            <>Your PicklePlay account for <strong>{invite?.managerEmail}</strong> is ready. You can sign in now and use normal player features while Court Manager access waits for owner approval.</>
                                        )}
                                    </p>
                                </div>
                                <Link
                                    to={isSignedIn ? '/dashboard' : loginHref}
                                    className="w-full bg-[#1E40AF] hover:bg-blue-800 text-white font-black h-14 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-blue-900/20"
                                >
                                    {isSignedIn ? <UserCheck size={16} /> : <LogIn size={16} />}
                                    {isSignedIn ? 'Go to Dashboard' : isActiveState ? 'Sign In to Continue' : 'Sign In While Approval Is Pending'}
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <div className="lg:hidden rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-blue-700">
                                        <Shield size={15} />
                                        <p className="text-[0.625rem] font-extrabold uppercase tracking-[0.24em]">Invite Security</p>
                                    </div>
                                    <p className="text-sm font-black text-slate-900">{invite?.courtName}</p>
                                    <p className="text-sm text-slate-600">Use the invited email only: <strong>{invite?.managerEmail}</strong></p>
                                    <p className="text-[0.625rem] font-bold uppercase tracking-widest text-slate-400">Expires {expiryLabel}</p>
                                </div>

                                {submitError && (
                                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-3 text-rose-600 text-sm">
                                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                        <p className="font-medium">{submitError}</p>
                                    </div>
                                )}

                                {isExistingAccountInvite && !isSignedIn && (
                                    <div className="space-y-5">
                                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 space-y-3">
                                            <div className="flex items-center gap-3 text-blue-700">
                                                <Mail size={18} />
                                                <p className="text-[0.625rem] font-extrabold uppercase tracking-[0.24em]">Existing PicklePlay Account</p>
                                            </div>
                                            <p className="text-sm leading-relaxed text-slate-700 font-medium">
                                                This email already has a PicklePlay account. Sign in to accept your Court Manager invitation.
                                            </p>
                                            <p className="text-sm leading-relaxed text-slate-500">
                                                Sign in with <strong>{invite?.managerEmail}</strong>, then come back to this page to accept the invite and send it for owner approval.
                                            </p>
                                        </div>

                                        <Link
                                            to={loginHref}
                                            className="w-full bg-[#1E40AF] hover:bg-blue-800 text-white font-black h-14 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-blue-900/20"
                                        >
                                            <LogIn size={16} />
                                            Sign In to Accept
                                        </Link>
                                    </div>
                                )}

                                {isExistingAccountInvite && isSignedIn && !isSignedInWithInvitedEmail && (
                                    <div className="space-y-5">
                                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
                                            <div className="flex items-center gap-3 text-amber-700">
                                                <AlertCircle size={18} />
                                                <p className="text-[0.625rem] font-extrabold uppercase tracking-[0.24em]">Wrong Account Signed In</p>
                                            </div>
                                            <p className="text-sm leading-relaxed text-slate-700 font-medium">
                                                This invite is locked to <strong>{invite?.managerEmail}</strong>, but you are currently signed in as <strong>{currentUser?.email}</strong>.
                                            </p>
                                            <p className="text-sm leading-relaxed text-slate-500">
                                                Sign out and sign back in with the invited email to accept this court manager invitation securely.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleSwitchAccount}
                                            className="w-full bg-slate-900 hover:bg-slate-950 text-white font-black h-14 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                        >
                                            <LogOut size={16} />
                                            Sign Out and Switch Account
                                        </button>
                                    </div>
                                )}

                                {isExistingAccountInvite && isSignedInWithInvitedEmail && (
                                    <div className="space-y-5">
                                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 space-y-3">
                                            <div className="flex items-center gap-3 text-emerald-700">
                                                <UserCheck size={18} />
                                                <p className="text-[0.625rem] font-extrabold uppercase tracking-[0.24em]">Ready to Accept</p>
                                            </div>
                                            <p className="text-sm leading-relaxed text-slate-700 font-medium">
                                                You are signed in with <strong>{currentUser?.email}</strong>. Accepting this invite will link your existing PicklePlay account to <strong>{invite?.courtName}</strong> and send it to the court owner for approval.
                                            </p>
                                            <p className="text-sm leading-relaxed text-slate-500">
                                                Your current roles stay intact. COURT_MANAGER will be added after the owner approves this specific court assignment.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleAcceptInvite}
                                            disabled={isAccepting}
                                            className="w-full bg-[#1E40AF] hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black h-14 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-blue-900/20"
                                        >
                                            {isAccepting ? <Loader2 size={18} className="animate-spin" /> : <UserCheck size={16} />}
                                            Accept Invitation
                                        </button>
                                    </div>
                                )}

                                {!isExistingAccountInvite && (
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        {isSignedIn && normalizedCurrentUserEmail && normalizedCurrentUserEmail !== normalizedInviteEmail && (
                                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-slate-700 font-medium">
                                                You are currently signed in as <strong>{currentUser?.email}</strong>. This invite will create a separate PicklePlay account for <strong>{invite?.managerEmail}</strong>.
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            <label className="text-[0.625rem] font-extrabold uppercase tracking-widest text-slate-700 ml-1">Full Name</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.fullName}
                                                    onChange={(e) => handleChange('fullName', e.target.value)}
                                                    className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#1E40AF] focus:ring-2 focus:ring-blue-100 rounded-xl py-3.5 px-4 text-slate-900 text-sm font-semibold placeholder:text-slate-400 outline-none transition-all"
                                                    placeholder="Your full name"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[0.625rem] font-extrabold uppercase tracking-widest text-slate-700 ml-1">Email Address</label>
                                            <div className="relative">
                                                <input
                                                    type="email"
                                                    required
                                                    value={formData.email}
                                                    readOnly
                                                    className="w-full bg-slate-100 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 text-slate-500 text-sm font-semibold outline-none"
                                                />
                                                <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            </div>
                                            <p className="text-[0.625rem] font-bold uppercase tracking-widest text-slate-400 ml-1">
                                                This email is locked to the original invite for security.
                                            </p>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[0.625rem] font-extrabold uppercase tracking-widest text-slate-700 ml-1">Contact Number</label>
                                            <div className="relative">
                                                <input
                                                    type="tel"
                                                    required
                                                    value={formData.contactNumber}
                                                    onChange={(e) => handleChange('contactNumber', e.target.value)}
                                                    className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#1E40AF] focus:ring-2 focus:ring-blue-100 rounded-xl py-3.5 pl-11 pr-4 text-slate-900 text-sm font-semibold placeholder:text-slate-400 outline-none transition-all"
                                                    placeholder="09XX XXX XXXX"
                                                />
                                                <Smartphone size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[0.625rem] font-extrabold uppercase tracking-widest text-slate-700 ml-1">Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    required
                                                    minLength={8}
                                                    value={formData.password}
                                                    onChange={(e) => handleChange('password', e.target.value)}
                                                    className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#1E40AF] focus:ring-2 focus:ring-blue-100 rounded-xl py-3.5 pl-11 pr-12 text-slate-900 text-sm font-semibold placeholder:text-slate-400 outline-none transition-all"
                                                    placeholder="Create a strong password"
                                                />
                                                <LockKeyhole size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword((current) => !current)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full bg-[#1E40AF] hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black h-14 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-blue-900/20"
                                        >
                                            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={16} />}
                                            Complete Registration
                                        </button>

                                        <p className="text-center text-slate-500 text-sm font-medium">
                                            Already registered?{' '}
                                            <Link to={loginHref} className="text-[#1E40AF] font-bold hover:text-blue-700 transition-all">
                                                Go to login
                                            </Link>
                                        </p>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagerInvitePage;
