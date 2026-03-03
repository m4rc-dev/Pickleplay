import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Eye, EyeOff, Lock, Loader2, CheckCircle2, AlertCircle, ShieldCheck, KeyRound } from 'lucide-react';

const ForcePasswordReset: React.FC = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const passwordStrength = (() => {
        if (!newPassword) return { score: 0, label: '', color: '' };
        let score = 0;
        if (newPassword.length >= 8) score++;
        if (/[A-Z]/.test(newPassword)) score++;
        if (/[a-z]/.test(newPassword)) score++;
        if (/[0-9]/.test(newPassword)) score++;
        if (/[^A-Za-z0-9]/.test(newPassword)) score++;
        if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
        if (score <= 3) return { score, label: 'Fair', color: 'bg-yellow-500' };
        if (score <= 4) return { score, label: 'Good', color: 'bg-blue-500' };
        return { score, label: 'Strong', color: 'bg-green-500' };
    })();

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!currentPassword) {
            setError('Please enter your current (temporary) password.');
            return;
        }

        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        if (newPassword === currentPassword) {
            setError('New password must be different from your current password.');
            return;
        }

        setLoading(true);
        try {
            // Step 1: Verify current password by re-signing in
            const { data: { session } } = await supabase.auth.getSession();
            const userEmail = session?.user?.email;

            if (!userEmail) {
                setError('Session expired. Please log in again.');
                setLoading(false);
                navigate('/login');
                return;
            }

            // Verify the current password is correct
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: userEmail,
                password: currentPassword,
            });

            if (signInError) {
                setError('Current password is incorrect. Please try again.');
                setLoading(false);
                return;
            }

            // Step 2: Update the password in Supabase Auth
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
                data: { must_reset_password: false },
            });

            if (updateError) throw updateError;

            // Clear the flag in profiles table (safely handle missing column)
            const { data: { session: updatedSession } } = await supabase.auth.getSession();
            if (updatedSession?.user) {
                try {
                    await supabase
                        .from('profiles')
                        .update({ must_reset_password: false })
                        .eq('id', updatedSession.user.id);
                } catch {
                    // Column may not exist yet — ignore
                }
            }

            // Clear the local storage flag
            localStorage.removeItem('must_reset_password');

            setSuccess(true);

            // Redirect to dashboard after success
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to update password. Please try again.');
        } finally {
            setLoading(false);
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
                .animate-float { animation: float var(--dur) ease-in-out infinite; }
                .animate-fade-in-blur { animation: fadeInBlur 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>

            {/* Background Gradients */}
            <div className="absolute top-[10%] left-[10%] w-[40rem] h-[40rem] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[20%] right-[15%] w-[35rem] h-[35rem] rounded-full bg-lime-500/10 blur-[100px] pointer-events-none" />
            <div className="absolute top-[40%] right-[30%] w-[30rem] h-[30rem] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none animate-pulse" />

            {/* Background Pickleballs */}
            <img src="/images/Ball.png" alt="" style={{ '--dur': '12s', '--rot': '15deg' } as any} className="absolute -top-10 -left-10 w-64 h-64 opacity-[0.12] animate-float pointer-events-none select-none blur-[1px]" />
            <img src="/images/Ball.png" alt="" style={{ '--dur': '18s', '--rot': '45deg' } as any} className="absolute bottom-[20%] -right-20 w-80 h-80 opacity-[0.1] animate-float pointer-events-none select-none blur-[2px]" />

            {/* Pattern overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            {/* Card */}
            <div className="relative z-10 w-full max-w-md bg-white rounded-[28px] shadow-2xl shadow-black/50 border border-white/5 overflow-hidden animate-fade-in-blur">
                {/* Header */}
                <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 px-8 py-8 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="relative">
                            <div className="absolute -inset-2 bg-white/20 rounded-2xl blur-md" />
                            <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="relative w-16 h-16 rounded-2xl object-contain shadow-lg ring-2 ring-white/30" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight mb-1">Set New Password</h1>
                    <p className="text-blue-200 text-sm font-medium">
                        Please create a secure password for your account
                    </p>
                </div>

                {/* Form */}
                <div className="px-8 py-8">
                    {success ? (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-lime-100 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-lime-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Password Updated!</h3>
                            <p className="text-slate-500 text-sm">Redirecting you to dashboard...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-5">
                            {/* Security Notice */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                                <ShieldCheck size={18} className="text-blue-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-blue-800 text-xs font-semibold leading-relaxed">
                                        You signed in with a temporary password. For your security, please set a new password now.
                                    </p>
                                    <p className="text-blue-600 text-[0.625rem] font-medium leading-relaxed mt-1.5">
                                        Your current password is your <strong>Firstname + Booking Reference ID</strong> (e.g. <strong className="font-mono">FrankA10BE2AB</strong>).
                                    </p>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-3 text-rose-600 text-sm">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <p className="font-medium">{error}</p>
                                </div>
                            )}

                            {/* Current Password */}
                            <div className="space-y-1.5">
                                <label className="text-[0.625rem] font-extrabold uppercase tracking-widest text-slate-700 ml-1">Current Password (Temporary)</label>
                                <div className="relative">
                                    <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" />
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        required
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full bg-amber-50/50 border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 rounded-xl py-3.5 pl-11 pr-12 text-slate-900 text-sm font-semibold placeholder:text-slate-400 outline-none transition-all"
                                        placeholder="Enter your temporary password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                                <div className="relative flex justify-center text-[0.625rem] font-bold uppercase tracking-widest">
                                    <span className="bg-white px-4 text-slate-400">choose your new password</span>
                                </div>
                            </div>

                            {/* New Password */}
                            <div className="space-y-1.5">
                                <label className="text-[0.625rem] font-extrabold uppercase tracking-widest text-slate-700 ml-1">New Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-slate-50/50 border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl py-3.5 pl-11 pr-12 text-slate-900 text-sm font-semibold placeholder:text-slate-400 outline-none transition-all"
                                        placeholder="Enter new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {/* Password Strength */}
                                {newPassword && (
                                    <div className="mt-2 space-y-1.5">
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= passwordStrength.score ? passwordStrength.color : 'bg-slate-200'}`} />
                                            ))}
                                        </div>
                                        <p className="text-[0.625rem] font-bold text-slate-500 ml-0.5">{passwordStrength.label}</p>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-1.5">
                                <label className="text-[0.625rem] font-extrabold uppercase tracking-widest text-slate-700 ml-1">Confirm Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`w-full bg-slate-50/50 border ${confirmPassword && confirmPassword !== newPassword ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-600 focus:ring-blue-100'} focus:ring-2 rounded-xl py-3.5 pl-11 pr-12 text-slate-900 text-sm font-semibold placeholder:text-slate-400 outline-none transition-all`}
                                        placeholder="Confirm new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {confirmPassword && confirmPassword === newPassword && (
                                    <p className="text-xs text-lime-600 font-semibold flex items-center gap-1 ml-1 mt-1">
                                        <CheckCircle2 size={12} /> Passwords match
                                    </p>
                                )}
                                {confirmPassword && confirmPassword !== newPassword && (
                                    <p className="text-xs text-rose-500 font-semibold ml-1 mt-1">Passwords do not match</p>
                                )}
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black h-14 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-blue-900/20"
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : '🔒 Set New Password'}
                            </button>

                            {/* Requirements */}
                            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                                <p className="text-[0.625rem] font-extrabold uppercase tracking-widest text-slate-500 mb-2">Password Requirements</p>
                                {[
                                    { met: newPassword.length >= 8, text: 'At least 8 characters' },
                                    { met: /[A-Z]/.test(newPassword), text: 'One uppercase letter' },
                                    { met: /[a-z]/.test(newPassword), text: 'One lowercase letter' },
                                    { met: /[0-9]/.test(newPassword), text: 'One number' },
                                ].map((req, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${req.met ? 'bg-lime-500' : 'bg-slate-300'} transition-colors`}>
                                            {req.met && <CheckCircle2 size={10} className="text-white" />}
                                        </div>
                                        <span className={`text-xs font-semibold ${req.met ? 'text-slate-700' : 'text-slate-400'} transition-colors`}>{req.text}</span>
                                    </div>
                                ))}
                            </div>
                        </form>
                    )}
                </div>

                {/* Bottom brand */}
                <div className="bg-slate-50 border-t border-slate-100 px-8 py-4 text-center">
                    <p className="text-[0.625rem] font-bold uppercase tracking-widest text-slate-400">
                        © 2026 PicklePlay Philippines
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForcePasswordReset;
