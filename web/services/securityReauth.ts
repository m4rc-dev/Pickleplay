import { supabase } from './supabase';

export type SecurityReauthAction = 'change_password' | 'change_email' | 'disable_2fa';

export interface SecurityReauthStartResult {
  success: boolean;
  action: SecurityReauthAction;
  alreadySent?: boolean;
  maskedEmail: string;
  codeExpiresAt: string | null;
  resendCooldownSeconds: number;
  message: string;
}

export interface SecurityTrustVerificationResult {
  success: boolean;
  action: Extract<SecurityReauthAction, 'change_email' | 'disable_2fa'>;
  trustToken: string;
  trustExpiresAt: string;
  message: string;
}

export interface SecurityPasswordUpdateResult {
  success: boolean;
  message: string;
}

export interface SecurityEmailUpdateResult {
  success: boolean;
  message: string;
  pendingEmail: string;
  trustConsumed: boolean;
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

const requestSecurityJson = async <T>(
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

export const isSecurityTrustStillValid = (expiresAt?: string | null) => {
  if (!expiresAt) {
    return false;
  }

  const timestamp = new Date(expiresAt).getTime();
  return Number.isFinite(timestamp) && timestamp > Date.now();
};

export const startSecurityReauth = async (
  action: SecurityReauthAction,
  forceResend = false,
  accessToken?: string
) =>
  requestSecurityJson<SecurityReauthStartResult>(
    '/api/auth/security/reauth/start',
    {
      method: 'POST',
      body: JSON.stringify({ action, forceResend }),
    },
    accessToken
  );

export const verifySecurityTrust = async (
  action: Extract<SecurityReauthAction, 'change_email' | 'disable_2fa'>,
  code: string,
  accessToken?: string
) =>
  requestSecurityJson<SecurityTrustVerificationResult>(
    '/api/auth/security/reauth/verify',
    {
      method: 'POST',
      body: JSON.stringify({ action, code }),
    },
    accessToken
  );

export const updatePasswordWithReauth = async (
  {
    password,
    nonce,
    currentPassword,
  }: {
    password: string;
    nonce: string;
    currentPassword?: string;
  },
  accessToken?: string
) =>
  requestSecurityJson<SecurityPasswordUpdateResult>(
    '/api/auth/security/password',
    {
      method: 'POST',
      body: JSON.stringify({
        password,
        nonce,
        ...(currentPassword ? { currentPassword } : {}),
      }),
    },
    accessToken
  );

export const updateEmailWithTrust = async (
  {
    email,
    trustToken,
  }: {
    email: string;
    trustToken: string;
  },
  accessToken?: string
) =>
  requestSecurityJson<SecurityEmailUpdateResult>(
    '/api/auth/security/email',
    {
      method: 'POST',
      body: JSON.stringify({
        email,
        trustToken,
      }),
    },
    accessToken
  );
