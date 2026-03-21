import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import {
  getTwoFactorStatus,
  notifyTwoFactorStateChanged,
  sendTwoFactorCode,
  verifyTwoFactorCode,
} from '../services/twoFactorAuth';
import { Shield, ArrowLeft, RefreshCw, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const maskEmailFallback = (email: string) => {
  if (!email) return '';
  const [localPart, domain = ''] = email.split('@');
  if (!localPart) return email;
  if (localPart.length <= 2) {
    return `${localPart[0] || '*'}*@${domain}`;
  }

  return `${localPart.slice(0, 2)}${'*'.repeat(Math.max(1, localPart.length - 2))}@${domain}`;
};

const formatExpiryLabel = (expiresAt: string | null) => {
  if (!expiresAt) return null;

  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) {
    return 'Code expired. Request a new one.';
  }

  const remainingMinutes = Math.ceil(remainingMs / 60000);
  return `Code expires in ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}.`;
};

const normalizeBackupCode = (value: string) =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

const TwoFactorVerify: React.FC = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const codeSentRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const loadTwoFactorState = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        const status = await getTwoFactorStatus();
        if (!isMounted) return;

        setMaskedEmail(status.maskedEmail || maskEmailFallback(user.email || ''));
        setResendCooldown(status.resendCooldownSeconds || 0);
        setCodeExpiresAt(status.codeExpiresAt);
        setAttemptsRemaining(status.attemptsRemaining);

        if (!status.pending) {
          notifyTwoFactorStateChanged();
          const storedRedirect = localStorage.getItem('auth_redirect');
          localStorage.removeItem('auth_redirect');
          navigate(storedRedirect || '/');
          return;
        }

        if (!codeSentRef.current) {
          codeSentRef.current = true;
          const sendResult = await sendTwoFactorCode('login');
          if (!isMounted) return;

          setMaskedEmail(sendResult.maskedEmail || status.maskedEmail || maskEmailFallback(user.email || ''));
          setResendCooldown(sendResult.resendCooldownSeconds || 0);
          setCodeExpiresAt(sendResult.codeExpiresAt);
          setAttemptsRemaining(sendResult.attemptsRemaining);

          if (sendResult.message) {
            setSuccess(sendResult.message);
            window.setTimeout(() => {
              if (isMounted) {
                setSuccess(null);
              }
            }, 2500);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Unable to load two-factor verification right now.');
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    loadTwoFactorState();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => setResendCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!useBackupCode) {
      inputRefs.current[0]?.focus();
    }
  }, [useBackupCode, isBootstrapping]);

  const expiryLabel = useMemo(() => formatExpiryLabel(codeExpiresAt), [codeExpiresAt]);

  const resetOtpInputs = () => {
    setCode(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const nextCode = [...code];
    nextCode[index] = value.slice(-1);
    setCode(nextCode);
    setError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === 5) {
      const fullCode = nextCode.join('');
      if (fullCode.length === 6) {
        void handleVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent) => {
    if (event.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const nextCode = [...code];

    for (let index = 0; index < pasted.length; index += 1) {
      nextCode[index] = pasted[index];
    }

    setCode(nextCode);
    setError(null);

    if (pasted.length === 6) {
      void handleVerify(pasted);
    } else {
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const handleVerify = async (manualCode?: string) => {
    const candidate = useBackupCode ? normalizeBackupCode(backupCode) : (manualCode || code.join(''));

    if (!useBackupCode && candidate.length !== 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    if (useBackupCode && candidate.length !== 8) {
      setError('Enter the full 8-character backup code.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const result = await verifyTwoFactorCode(candidate, 'login');
      setAttemptsRemaining(result.attemptsRemaining);
      setCodeExpiresAt(result.codeExpiresAt);
      setSuccess(result.usedBackupCode ? 'Backup code accepted. Redirecting...' : 'Verified! Redirecting...');
      notifyTwoFactorStateChanged();

      window.setTimeout(() => {
        const storedRedirect = localStorage.getItem('auth_redirect');
        localStorage.removeItem('auth_redirect');
        navigate(storedRedirect || '/');
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');

      if (typeof err.attemptsRemaining === 'number') {
        setAttemptsRemaining(err.attemptsRemaining);
      }

      if (typeof err.cooldownSeconds === 'number') {
        setResendCooldown(err.cooldownSeconds);
      }

      if (!useBackupCode) {
        resetOtpInputs();
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setError(null);

    try {
      const result = await sendTwoFactorCode('login', true);
      setSuccess(result.message || 'A new code is on its way.');
      setResendCooldown(result.resendCooldownSeconds || 0);
      setCodeExpiresAt(result.codeExpiresAt);
      setAttemptsRemaining(result.attemptsRemaining);
      resetOtpInputs();
      setBackupCode('');

      window.setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend the code.');
      if (typeof err.cooldownSeconds === 'number') {
        setResendCooldown(err.cooldownSeconds);
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToLogin = async () => {
    await supabase.auth.signOut();
    notifyTwoFactorStateChanged();
    navigate('/login');
  };

  if (isBootstrapping) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-slate-950 via-slate-950/80 to-indigo-900/40" />
        <div className="relative z-20 flex flex-col items-center gap-4 text-center px-6">
          <Loader2 size={40} className="animate-spin text-indigo-400" />
          <p className="text-white font-bold tracking-tight">Preparing secure verification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 scale-105"
        style={{ backgroundImage: 'url("/login-bg.png")' }}
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-br from-slate-950 via-slate-950/80 to-indigo-900/40" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-lime-400/10 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-20 w-full max-w-md px-6">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[48px] p-8 md:p-12 shadow-2xl overflow-hidden relative">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500 rounded-3xl mb-6 shadow-2xl shadow-indigo-500/20 transform hover:rotate-12 transition-transform duration-300">
              <Shield size={32} className="text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase mb-2">
              Verify Identity
            </h1>
            <p className="text-slate-400 font-medium tracking-tight">
              {useBackupCode ? 'Enter one of your recovery codes' : 'Enter the 6-digit code sent to'}
            </p>
            {!useBackupCode && <p className="text-indigo-400 font-bold text-sm mt-1">{maskedEmail}</p>}
            {expiryLabel && (
              <p className={`text-xs font-bold mt-3 ${expiryLabel.startsWith('Code expired') ? 'text-amber-300' : 'text-slate-400'}`}>
                {expiryLabel}
              </p>
            )}
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mt-2">
              {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining
            </p>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-3 text-rose-400 text-sm mb-6 animate-in fade-in">
              <AlertCircle size={18} className="shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 text-emerald-400 text-sm mb-6 animate-in fade-in">
              <CheckCircle size={18} className="shrink-0" />
              <p className="font-medium">{success}</p>
            </div>
          )}

          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(false);
                setError(null);
                setBackupCode('');
              }}
              className={`flex-1 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.2em] transition-all ${
                !useBackupCode
                  ? 'bg-white text-slate-950'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'
              }`}
            >
              Email Code
            </button>
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(true);
                setError(null);
                resetOtpInputs();
              }}
              className={`flex-1 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.2em] transition-all ${
                useBackupCode
                  ? 'bg-white text-slate-950'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'
              }`}
            >
              Backup Code
            </button>
          </div>

          {!useBackupCode ? (
            <div className="flex justify-center gap-3 mb-8" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => { inputRefs.current[index] = element; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handleChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  className={`w-12 h-14 text-center text-2xl font-black rounded-2xl border-2 bg-white/5 text-white outline-none transition-all duration-200 ${
                    digit
                      ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
                      : 'border-white/10 hover:border-white/20'
                  } focus:border-indigo-400 focus:shadow-lg focus:shadow-indigo-500/30`}
                />
              ))}
            </div>
          ) : (
            <div className="mb-8">
              <input
                type="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                value={backupCode}
                onChange={(event) => {
                  const normalized = normalizeBackupCode(event.target.value);
                  const formatted = normalized.length > 4
                    ? `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}`
                    : normalized;
                  setBackupCode(formatted);
                  setError(null);
                }}
                className="w-full h-16 rounded-2xl border-2 border-white/10 bg-white/5 px-5 text-center text-2xl font-black tracking-[0.35em] text-white outline-none transition-all focus:border-indigo-400 focus:shadow-lg focus:shadow-indigo-500/30"
                placeholder="ABCD-EFGH"
              />
              <p className="mt-3 text-center text-xs text-slate-400">
                Backup codes work once each and bypass the email step when you need recovery access.
              </p>
            </div>
          )}

          <button
            onClick={() => void handleVerify()}
            disabled={isVerifying || (!useBackupCode ? code.join('').length !== 6 : normalizeBackupCode(backupCode).length !== 8)}
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

          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleBackToLogin}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Login
            </button>

            <button
              onClick={handleResend}
              disabled={useBackupCode || resendCooldown > 0 || isResending}
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
