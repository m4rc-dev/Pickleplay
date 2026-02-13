import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getSecuritySettings } from '../services/supabase';
import { verifyCode, sendEmailCode } from '../services/twoFactorAuth';
import { Shield, ArrowLeft, RefreshCw, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const TwoFactorVerify: React.FC = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const codeSentRef = useRef(false); // Prevent duplicate sends in strict mode
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || '');

      // Check if user actually has 2FA enabled
      const settings = await getSecuritySettings(user.id);
      if (!settings.data?.two_factor_enabled) {
        // No 2FA, go straight to dashboard
        localStorage.removeItem('two_factor_pending');
        const storedRedirect = localStorage.getItem('auth_redirect');
        localStorage.removeItem('auth_redirect');
        navigate(storedRedirect || '/dashboard');
        return;
      }

      // Send verification code automatically (once)
      if (user.email && !codeSentRef.current) {
        codeSentRef.current = true;
        await sendEmailCode(user.email, user.id);
      }
    };

    checkAuth();
  }, [navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only keep last digit
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    if (pasted.length === 6) {
      handleVerify(pasted);
    } else {
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const codeStr = fullCode || code.join('');
    if (codeStr.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const result = await verifyCode(userId, codeStr, false); // false = login verification, don't re-enable
      if (result.success) {
        setSuccess('Verified! Redirecting...');
        // Re-enable 2FA since verifyCode sets it to true (it's already enabled)
        setTimeout(() => {
          localStorage.removeItem('two_factor_pending');
          const storedRedirect = localStorage.getItem('auth_redirect');
          localStorage.removeItem('auth_redirect');
          navigate(storedRedirect || '/dashboard');
        }, 1000);
      } else {
        setError(result.message);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setError(null);

    try {
      const result = await sendEmailCode(userEmail, userId, true); // Force resend
      if (result.success) {
        setSuccess('New code sent to your email!');
        setResendCooldown(60);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message);
      }
    } catch {
      setError('Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToLogin = async () => {
    localStorage.removeItem('two_factor_pending');
    await supabase.auth.signOut();
    navigate('/login');
  };

  const maskedEmail = userEmail
    ? userEmail.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(b.length) + c)
    : '';

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950">
      {/* Background */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 scale-105"
        style={{ backgroundImage: 'url("/login-bg.png")' }}
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-br from-slate-950 via-slate-950/80 to-indigo-900/40" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-lime-400/10 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />

      {/* Card */}
      <div className="relative z-20 w-full max-w-md px-6">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[48px] p-8 md:p-12 shadow-2xl overflow-hidden relative">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500 rounded-3xl mb-6 shadow-2xl shadow-indigo-500/20 transform hover:rotate-12 transition-transform duration-300">
              <Shield size={32} className="text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase mb-2">
              Verify Identity
            </h1>
            <p className="text-slate-400 font-medium tracking-tight">
              Enter the 6-digit code sent to
            </p>
            <p className="text-indigo-400 font-bold text-sm mt-1">{maskedEmail}</p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-3 text-rose-400 text-sm mb-6 animate-in fade-in">
              <AlertCircle size={18} className="shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 text-emerald-400 text-sm mb-6 animate-in fade-in">
              <CheckCircle size={18} className="shrink-0" />
              <p className="font-medium">{success}</p>
            </div>
          )}

          {/* Code Input */}
          <div className="flex justify-center gap-3 mb-8" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`w-12 h-14 text-center text-2xl font-black rounded-2xl border-2 bg-white/5 text-white outline-none transition-all duration-200 ${
                  digit
                    ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
                    : 'border-white/10 hover:border-white/20'
                } focus:border-indigo-400 focus:shadow-lg focus:shadow-indigo-500/30`}
              />
            ))}
          </div>

          {/* Verify Button */}
          <button
            onClick={() => handleVerify()}
            disabled={isVerifying || code.join('').length !== 6}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:from-indigo-500 hover:to-indigo-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 mb-6"
          >
            {isVerifying ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify & Continue'
            )}
          </button>

          {/* Resend & Back */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToLogin}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Login
            </button>

            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending}
              className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorVerify;
