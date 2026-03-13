import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Eye, EyeOff, Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const UpdatePassword: React.FC = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Clean up the recovery flag now that we've arrived on this page
        sessionStorage.removeItem('password_recovery_pending');

        // Quick check to see if we have an active session (user followed the email link)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('Your password reset link is invalid or has expired. Please request a new one.');
            }
        };
        checkSession();
    }, []);

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

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) throw updateError;

            setSuccess(true);

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
                    <h1 className="text-2xl font-black text-white tracking-tight mb-1">Reset Password</h1>
                    <p className="text-blue-200 text-sm font-medium">
                        Please create a new secure password
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
                        <form onSubmit={handleUpdatePassword} className="space-y-5">
                            {error && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-3 text-rose-600 text-sm">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <p className="font-medium">{error}</p>
                                </div>
                            )}

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
                                        disabled={error !== null && error.includes('invalid')}
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
                                        disabled={error !== null && error.includes('invalid')}
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
                                disabled={loading || !newPassword || !confirmPassword || (error !== null && error.includes('invalid'))}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black h-14 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-blue-900/20"
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : '🔒 Update Password'}
                            </button>
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

export default UpdatePassword;
