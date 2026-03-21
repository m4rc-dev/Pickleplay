import { supabase } from './supabase';

export type TwoFactorPurpose = 'login' | 'setup';

export interface TwoFactorStatus {
  success: boolean;
  authProvider: string;
  twoFactorEnabled: boolean;
  requiresTwoFactor: boolean;
  pending: boolean;
  verified: boolean;
  maskedEmail: string;
  codeExpiresAt: string | null;
  resendCooldownSeconds: number;
  attemptsRemaining: number;
  backupCodesAvailable: boolean;
}

export interface TwoFactorSendResult extends TwoFactorStatus {
  alreadySent?: boolean;
  message: string;
}

export interface TwoFactorVerifyResult extends TwoFactorStatus {
  message: string;
  backupCodes?: string[] | null;
  usedBackupCode?: boolean;
}

const getServerBaseUrl = () => {
  if (import.meta.env.DEV) {
    return '';
  }

  return import.meta.env.VITE_SERVER_URL?.trim() || '';
};

const resolveAccessToken = async (accessToken?: string) => {
  if (accessToken) {
    return accessToken;
  }

  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
};

const requestTwoFactorJson = async <T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string
): Promise<T> => {
  const token = await resolveAccessToken(accessToken);
  if (!token) {
    throw new Error('Missing access token');
  }

  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${getServerBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || 'Request failed') as Error & Record<string, unknown>;
    Object.assign(error, payload);
    throw error;
  }

  return payload as T;
};

export const bootstrapTwoFactorSession = async (accessToken?: string) =>
  requestTwoFactorJson<TwoFactorStatus>(
    '/api/auth/2fa/bootstrap',
    {
      method: 'POST',
    },
    accessToken
  );

export const getTwoFactorStatus = async (accessToken?: string) =>
  requestTwoFactorJson<TwoFactorStatus>(
    '/api/auth/2fa/status',
    {
      method: 'GET',
    },
    accessToken
  );

export const sendTwoFactorCode = async (
  purpose: TwoFactorPurpose,
  forceResend = false,
  accessToken?: string
) =>
  requestTwoFactorJson<TwoFactorSendResult>(
    '/api/auth/2fa/send',
    {
      method: 'POST',
      body: JSON.stringify({ purpose, forceResend }),
    },
    accessToken
  );

export const verifyTwoFactorCode = async (
  code: string,
  purpose: TwoFactorPurpose,
  accessToken?: string
) =>
  requestTwoFactorJson<TwoFactorVerifyResult>(
    '/api/auth/2fa/verify',
    {
      method: 'POST',
      body: JSON.stringify({ code, purpose }),
    },
    accessToken
  );

export const disableTwoFactorAuth = async (trustToken: string, accessToken?: string) =>
  requestTwoFactorJson<{ success: boolean; message: string }>(
    '/api/auth/2fa/disable',
    {
      method: 'POST',
      body: JSON.stringify({ trustToken }),
    },
    accessToken
  );

export const notifyTwoFactorStateChanged = () => {
  window.dispatchEvent(new Event('pickleplay:2fa-status-changed'));
};
