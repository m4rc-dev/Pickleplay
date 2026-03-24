import React from 'react';
import ReactDOM from 'react-dom';
import { AlertCircle, CheckCircle2, Loader2, Mail, Shield, X } from 'lucide-react';
import type { SecurityReauthAction } from '../services/securityReauth';

interface SecurityReauthModalProps {
  open: boolean;
  action: SecurityReauthAction | null;
  code: string;
  maskedEmail: string;
  codeExpiresAt: string | null;
  resendCooldown: number;
  isSending: boolean;
  isSubmitting: boolean;
  message: { type: 'success' | 'error' | 'info'; text: string } | null;
  onCodeChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onResend: () => void;
}

const getActionCopy = (action: SecurityReauthAction | null) => {
  switch (action) {
    case 'change_password':
      return {
        actionLabel: 'Change Password',
        body: 'Enter the security code sent to your email to continue updating your password.',
      };
    case 'change_email':
      return {
        actionLabel: 'Change Email Address',
        body: 'Enter the security code sent to your email before we submit your new email address securely.',
      };
    case 'disable_2fa':
      return {
        actionLabel: 'Disable Two-Factor Authentication',
        body: 'Enter the security code sent to your email before we turn off two-factor authentication.',
      };
    default:
      return {
        actionLabel: 'Account Security',
        body: 'Enter the security code sent to your email to continue this secure action.',
      };
  }
};

const formatExpiry = (value: string | null) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;

  const minutesRemaining = Math.max(0, Math.ceil((timestamp - Date.now()) / 60000));
  if (minutesRemaining <= 0) {
    return 'Code expired. Request a new one to continue.';
  }

  if (minutesRemaining === 1) {
    return 'Code expires in about 1 minute.';
  }

  return `Code expires in about ${minutesRemaining} minutes.`;
};

const normalizeCodeInput = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

const SecurityReauthModal: React.FC<SecurityReauthModalProps> = ({
  open,
  action,
  code,
  maskedEmail,
  codeExpiresAt,
  resendCooldown,
  isSending,
  isSubmitting,
  message,
  onCodeChange,
  onClose,
  onSubmit,
  onResend,
}) => {
  if (!open) {
    return null;
  }

  const copy = getActionCopy(action);
  const expiryText = formatExpiry(codeExpiresAt);
  const resendLabel = resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code';

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-[38rem] overflow-hidden rounded-[26px] border border-white/10 bg-white shadow-[0_34px_90px_rgba(2,6,23,0.42)]">
        <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(135deg,#08172b_0%,#0d2854_56%,#1567d8_100%)]" />
        <div className="absolute top-20 left-0 right-0 h-16 bg-[radial-gradient(circle_at_top,rgba(132,204,22,0.18),rgba(132,204,22,0))]" />

        <div className="relative px-5 pt-5 pb-6 sm:px-7 sm:pt-6 sm:pb-7">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2.5 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm ring-1 ring-white/15">
                <img
                  src="/images/PicklePlayLogo.jpg"
                  alt="PicklePlay"
                  className="h-8 w-8 rounded-lg border border-white/15 object-cover"
                />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-100">PicklePlay</p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/60">Account Security</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 shadow-[0_12px_24px_rgba(15,23,42,0.16)]">
                <Shield size={13} className="text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Confirm It&apos;s You</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-white/12 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              aria-label="Close reauthentication modal"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-6 rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.12)] sm:px-6 sm:py-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lime-300 shadow-[0_16px_30px_rgba(132,204,22,0.28)]">
                  <Mail size={19} className="text-slate-900" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">{copy.actionLabel}</p>
                  <h3 className="mt-1.5 text-[2.2rem] leading-none font-black tracking-[-0.05em] text-slate-950">Confirm it&apos;s you</h3>
                  <p className="mt-2.5 text-[15px] leading-7 text-slate-500">{copy.body}</p>
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Verification Email</p>
                <div className="mt-2 flex flex-wrap items-center gap-2.5">
                  <p className="text-[15px] font-black text-slate-900">{maskedEmail || 'Your email address'}</p>
                  {expiryText && <p className="text-xs font-bold text-slate-500">{expiryText}</p>}
                </div>
                <p className="mt-2 text-[13px] leading-6 text-slate-500">
                  We sent a verification code to continue this secure action. If you did not request this, you can safely close this window.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Security Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(event) => onCodeChange(normalizeCodeInput(event.target.value))}
                  className="mt-2 w-full rounded-[22px] border-2 border-slate-200 bg-white px-5 py-3.5 text-center text-[1.7rem] font-black tracking-[0.3em] text-slate-900 outline-none transition-all focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)]"
                  placeholder="------"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                />
              </div>

              {message && (
                <div
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
                    message.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50'
                      : message.type === 'error'
                        ? 'border-red-200 bg-red-50'
                        : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                  ) : message.type === 'error' ? (
                    <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
                  ) : (
                    <Shield size={18} className="mt-0.5 shrink-0 text-blue-600" />
                  )}
                  <p
                    className={`text-sm font-bold leading-6 ${
                      message.type === 'success'
                        ? 'text-emerald-900'
                        : message.type === 'error'
                          ? 'text-red-900'
                          : 'text-blue-900'
                    }`}
                  >
                    {message.text}
                  </p>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-2xl bg-slate-200 px-4 py-2.5 font-bold text-slate-900 transition-all hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onResend}
                    disabled={isSending || resendCooldown > 0}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 font-bold text-slate-700 transition-all hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSending && <Loader2 size={16} className="animate-spin" />}
                    {isSending ? 'Sending...' : resendLabel}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={isSubmitting || isSending}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 font-bold text-white shadow-[0_16px_28px_rgba(37,99,235,0.26)] transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {isSubmitting ? 'Verifying...' : 'Verify and Continue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SecurityReauthModal;
