import express from 'express';
import crypto from 'crypto';

const DEFAULT_CODE_EXPIRY_SECONDS = 3600;
const TRUST_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export const SECURITY_REAUTH_ACTIONS = {
  CHANGE_PASSWORD: 'change_password',
  CHANGE_EMAIL: 'change_email',
  DISABLE_2FA: 'disable_2fa',
};

const TRUST_GATED_ACTIONS = new Set([
  SECURITY_REAUTH_ACTIONS.CHANGE_EMAIL,
  SECURITY_REAUTH_ACTIONS.DISABLE_2FA,
]);

const SENSITIVE_ACTIONS = new Set(Object.values(SECURITY_REAUTH_ACTIONS));

const normalizeSensitiveAction = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return SENSITIVE_ACTIONS.has(normalized) ? normalized : null;
};

const normalizeTrustAction = (value) => {
  const normalized = normalizeSensitiveAction(value);
  return normalized && TRUST_GATED_ACTIONS.has(normalized) ? normalized : null;
};

const normalizeCode = (value) => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const maskEmailAddress = (email) => {
  if (!email) return '';
  const [localPart, domain = ''] = email.split('@');
  if (!localPart) return email;
  if (localPart.length <= 2) {
    return `${localPart[0] || '*'}*@${domain}`;
  }

  return `${localPart.slice(0, 2)}${'*'.repeat(Math.max(1, localPart.length - 2))}@${domain}`;
};

const secondsUntil = (value) => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 0;
  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
};

const getCodeExpirySeconds = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_CODE_EXPIRY_SECONDS;
  }

  return Math.max(60, Math.floor(parsed));
};

const buildActionLabel = (action) => {
  switch (action) {
    case SECURITY_REAUTH_ACTIONS.CHANGE_PASSWORD:
      return 'change your password';
    case SECURITY_REAUTH_ACTIONS.CHANGE_EMAIL:
      return 'change your email address';
    case SECURITY_REAUTH_ACTIONS.DISABLE_2FA:
      return 'disable two-factor authentication';
    default:
      return 'continue this secure action';
  }
};

const buildEmailChangeRedirectUrl = (appBaseUrl) => {
  const normalizedBase = String(appBaseUrl || 'https://www.pickleplay.ph').trim().replace(/\/+$/, '');
  const url = new URL(`${normalizedBase}/auth/callback`);
  url.searchParams.set('redirect', '/profile?tab=security&emailChange=confirmed');
  return url.toString();
};

const getSupabaseAuthBaseUrl = (supabaseUrl) => `${String(supabaseUrl || '').replace(/\/+$/, '')}/auth/v1`;

const parseJsonResponse = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const buildTrustError = (status, code, message) => ({ ok: false, status, code, message });

export const createSecurityReauthToolkit = ({
  supabaseAdmin,
  supabaseUrl,
  supabaseAnonKey,
  appBaseUrl,
  requireSupabaseAdmin,
  requireAuthenticatedSession,
  authLimiter,
  emailLimiter,
  trustSecret,
  codeExpirySeconds = DEFAULT_CODE_EXPIRY_SECONDS,
}) => {
  const router = express.Router();
  const authBaseUrl = getSupabaseAuthBaseUrl(supabaseUrl);
  const effectiveCodeExpirySeconds = getCodeExpirySeconds(codeExpirySeconds);
  const trustHashSecret = String(trustSecret || supabaseAnonKey || 'pickleplay-security-trust').trim();

  const hashTrustToken = (value) =>
    crypto.createHmac('sha256', trustHashSecret).update(String(value || '')).digest('hex');

  const insertAuditLog = async ({ userId, eventType, sessionId, ipAddress, userAgent, metadata = {} }) => {
    const { error } = await supabaseAdmin
      .from('security_audit_logs')
      .insert({
        user_id: userId,
        event_type: eventType,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        metadata: {
          ...metadata,
          sessionId,
        },
      });

    if (error) {
      console.error('Failed to write security reauth audit log:', error.message);
    }
  };

  const getReauthState = async (userId) => {
    const { data, error } = await supabaseAdmin.rpc('pickleplay_get_reauth_state', {
      p_user_id: userId,
      p_expiry_seconds: effectiveCodeExpirySeconds,
    });

    if (error) throw error;
    return data || {};
  };

  const requestSupabaseReauth = async (accessToken) => {
    const response = await fetch(`${authBaseUrl}/reauthenticate`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
      },
    });

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      const normalizedMessage = String(payload?.msg || payload?.message || payload?.error_description || payload?.error || 'Failed to send security code.').toLowerCase();

      if (normalizedMessage.includes('verify your email')) {
        return buildTrustError(400, 'email_not_confirmed', 'Please verify your email address before requesting a security code.');
      }

      return buildTrustError(response.status, payload?.code || 'reauth_start_failed', payload?.msg || payload?.message || payload?.error_description || 'Failed to send security code.');
    }

    return { ok: true };
  };

  const proxySupabaseUserUpdate = async ({ accessToken, body, redirectTo }) => {
    const requestUrl = new URL(`${authBaseUrl}/user`);
    if (redirectTo) {
      requestUrl.searchParams.set('redirect_to', redirectTo);
    }

    const response = await fetch(requestUrl.toString(), {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const payload = await parseJsonResponse(response);
    return { response, payload };
  };

  const revokeExistingTrustTokens = async ({ userId, sessionId, actionType }) => {
    const { error } = await supabaseAdmin
      .from('security_reauth_trusts')
      .update({
        consumed_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .eq('action_type', actionType)
      .is('consumed_at', null);

    if (error) throw error;
  };

  const issueTrustToken = async ({ userId, sessionId, actionType, ipAddress, userAgent, metadata = {} }) => {
    await revokeExistingTrustTokens({ userId, sessionId, actionType });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TRUST_TTL_MS).toISOString();

    const { error } = await supabaseAdmin
      .from('security_reauth_trusts')
      .insert({
        user_id: userId,
        session_id: sessionId,
        action_type: actionType,
        token_hash: hashTrustToken(rawToken),
        verified_at: new Date().toISOString(),
        expires_at: expiresAt,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        metadata,
      });

    if (error) throw error;

    return {
      trustToken: rawToken,
      trustExpiresAt: expiresAt,
    };
  };

  const validateTrustToken = async ({ userId, sessionId, actionType, rawToken }) => {
    if (!rawToken) {
      return buildTrustError(401, 'trust_missing', 'For your security, please verify again before continuing.');
    }

    const { data, error } = await supabaseAdmin
      .from('security_reauth_trusts')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .eq('action_type', actionType)
      .eq('token_hash', hashTrustToken(rawToken))
      .maybeSingle();

    if (error) {
      console.error('Trust lookup error:', error);
      return buildTrustError(500, 'trust_lookup_failed', 'We could not validate your security check. Please try again.');
    }

    if (!data) {
      return buildTrustError(401, 'trust_invalid', 'That security approval is invalid. Please verify again.');
    }

    if (data.action_type !== actionType) {
      return buildTrustError(409, 'trust_action_mismatch', 'This security approval was created for a different action.');
    }

    if (data.consumed_at) {
      return buildTrustError(409, 'trust_already_used', 'This security approval has already been used. Please verify again.');
    }

    if (new Date(data.expires_at).getTime() <= Date.now()) {
      return buildTrustError(401, 'trust_expired', 'This security approval has expired. Please verify again.');
    }

    return { ok: true, record: data };
  };

  const consumeTrustToken = async ({ userId, sessionId, actionType, rawToken, metadata = {} }) => {
    const validation = await validateTrustToken({ userId, sessionId, actionType, rawToken });
    if (!validation.ok) {
      return validation;
    }

    const { error } = await supabaseAdmin
      .from('security_reauth_trusts')
      .update({
        consumed_at: new Date().toISOString(),
        metadata: {
          ...(validation.record.metadata || {}),
          ...metadata,
        },
      })
      .eq('id', validation.record.id)
      .is('consumed_at', null);

    if (error) {
      console.error('Trust consume error:', error);
      return buildTrustError(500, 'trust_consume_failed', 'We could not finalize your security approval. Please try again.');
    }

    return { ok: true, record: validation.record };
  };

  router.post('/reauth/start', emailLimiter, async (req, res) => {
    try {
      const guard = requireSupabaseAdmin();
      if (!guard.ok) {
        return res.status(500).json({ error: guard.message });
      }

      const session = await requireAuthenticatedSession(req, res);
      if (!session) return;

      const action = normalizeSensitiveAction(req.body?.action);
      if (!action) {
        return res.status(400).json({ error: 'Unsupported security action.' });
      }

      const forceResend = Boolean(req.body?.forceResend);
      const state = await getReauthState(session.user.id);
      const maskedEmail = maskEmailAddress(state?.email || session.user.email || '');
      const sentAt = state?.reauthenticationSentAt ? new Date(state.reauthenticationSentAt) : null;
      const resendAvailableAt = sentAt ? new Date(sentAt.getTime() + RESEND_COOLDOWN_MS) : null;

      if (!forceResend && state?.hasPendingChallenge && resendAvailableAt && resendAvailableAt.getTime() > Date.now()) {
        return res.json({
          success: true,
          action,
          alreadySent: true,
          maskedEmail,
          codeExpiresAt: new Date(sentAt.getTime() + effectiveCodeExpirySeconds * 1000).toISOString(),
          resendCooldownSeconds: secondsUntil(resendAvailableAt),
          message: `We already sent a verification code to ${maskedEmail}. Enter it below to ${buildActionLabel(action)}.`,
        });
      }

      const reauthResult = await requestSupabaseReauth(session.accessToken);
      if (!reauthResult.ok) {
        return res.status(reauthResult.status).json({
          error: reauthResult.message,
          code: reauthResult.code,
        });
      }

      const updatedState = await getReauthState(session.user.id);
      const effectiveSentAt = updatedState?.reauthenticationSentAt
        ? new Date(updatedState.reauthenticationSentAt)
        : new Date();

      await insertAuditLog({
        userId: session.user.id,
        eventType: forceResend ? 'security_reauth_code_resent' : 'security_reauth_code_sent',
        sessionId: session.sessionId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          action,
          authProvider: session.authProvider,
        },
      });

      res.json({
        success: true,
        action,
        alreadySent: false,
        maskedEmail: maskEmailAddress(updatedState?.email || session.user.email || ''),
        codeExpiresAt: new Date(effectiveSentAt.getTime() + effectiveCodeExpirySeconds * 1000).toISOString(),
        resendCooldownSeconds: secondsUntil(new Date(effectiveSentAt.getTime() + RESEND_COOLDOWN_MS)),
        message: `We sent a verification code to ${maskEmailAddress(updatedState?.email || session.user.email || '')}. Enter it below to ${buildActionLabel(action)}.`,
      });
    } catch (error) {
      console.error('Security reauth start error:', error);
      res.status(500).json({ error: error.message || 'Failed to send the security code.' });
    }
  });

  router.post('/reauth/verify', authLimiter, async (req, res) => {
    try {
      const guard = requireSupabaseAdmin();
      if (!guard.ok) {
        return res.status(500).json({ error: guard.message });
      }

      const session = await requireAuthenticatedSession(req, res);
      if (!session) return;

      const action = normalizeTrustAction(req.body?.action);
      if (!action) {
        return res.status(400).json({ error: 'This action does not use a PicklePlay trust gate.' });
      }

      const code = normalizeCode(req.body?.code);
      if (!code) {
        return res.status(400).json({ error: 'Enter the security code from your email.', code: 'invalid_code' });
      }

      const { data, error } = await supabaseAdmin.rpc('pickleplay_verify_reauth_nonce', {
        p_user_id: session.user.id,
        p_nonce: code,
        p_expiry_seconds: effectiveCodeExpirySeconds,
      });

      if (error) throw error;

      if (!data?.success) {
        return res.status(data?.code === 'expired_code' ? 401 : 400).json({
          error: data?.message || 'That security code is invalid.',
          code: data?.code || 'invalid_code',
        });
      }

      const trust = await issueTrustToken({
        userId: session.user.id,
        sessionId: session.sessionId,
        actionType: action,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          authProvider: session.authProvider,
          verifiedVia: 'supabase_reauthentication',
        },
      });

      await insertAuditLog({
        userId: session.user.id,
        eventType: 'security_reauth_verified',
        sessionId: session.sessionId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          action,
          authProvider: session.authProvider,
          trustExpiresAt: trust.trustExpiresAt,
        },
      });

      res.json({
        success: true,
        action,
        trustToken: trust.trustToken,
        trustExpiresAt: trust.trustExpiresAt,
        message: 'Identity confirmed. Continue your secure action.',
      });
    } catch (error) {
      console.error('Security reauth verify error:', error);
      res.status(500).json({ error: error.message || 'Failed to verify the security code.' });
    }
  });

  router.post('/password', authLimiter, async (req, res) => {
    try {
      const guard = requireSupabaseAdmin();
      if (!guard.ok) {
        return res.status(500).json({ error: guard.message });
      }

      const session = await requireAuthenticatedSession(req, res);
      if (!session) return;

      const password = String(req.body?.password || '');
      const currentPassword = String(req.body?.currentPassword || '');
      const nonce = normalizeCode(req.body?.nonce);

      if (!password) {
        return res.status(400).json({ error: 'Enter a new password.' });
      }

      if (!nonce) {
        return res.status(400).json({ error: 'Enter the security code from your email.', code: 'invalid_code' });
      }

      const { response, payload } = await proxySupabaseUserUpdate({
        accessToken: session.accessToken,
        body: {
          password,
          nonce,
          ...(currentPassword ? { current_password: currentPassword } : {}),
        },
      });

      if (!response.ok) {
        const errorCode = payload?.code || payload?.error_code || '';
        const normalizedMessage = String(payload?.msg || payload?.message || payload?.error_description || payload?.error || '').toLowerCase();

        if (errorCode === 'reauthentication_not_valid' || normalizedMessage.includes('reauthentication')) {
          return res.status(401).json({ error: 'That security code is invalid or has expired. Request a new one and try again.', code: 'invalid_code' });
        }

        if (errorCode === 'current_password_mismatch') {
          return res.status(400).json({ error: 'Your current password is incorrect.', code: errorCode });
        }

        if (errorCode === 'current_password_required') {
          return res.status(400).json({ error: 'Your current password is required for this change.', code: errorCode });
        }

        if (errorCode === 'same_password') {
          return res.status(400).json({ error: 'Your new password must be different from the current one.', code: errorCode });
        }

        if (errorCode === 'weak_password') {
          return res.status(400).json({ error: payload?.msg || payload?.message || 'Your new password is too weak.', code: errorCode });
        }

        return res.status(response.status).json({
          error: payload?.msg || payload?.message || payload?.error_description || 'Unable to update your password right now.',
          code: errorCode || 'password_update_failed',
        });
      }

      await insertAuditLog({
        userId: session.user.id,
        eventType: 'security_password_updated',
        sessionId: session.sessionId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          authProvider: session.authProvider,
        },
      });

      res.json({
        success: true,
        message: 'Password updated successfully.',
      });
    } catch (error) {
      console.error('Security password update error:', error);
      res.status(500).json({ error: error.message || 'Failed to update your password.' });
    }
  });

  router.post('/email', authLimiter, async (req, res) => {
    try {
      const guard = requireSupabaseAdmin();
      if (!guard.ok) {
        return res.status(500).json({ error: guard.message });
      }

      const session = await requireAuthenticatedSession(req, res);
      if (!session) return;

      const trustAction = SECURITY_REAUTH_ACTIONS.CHANGE_EMAIL;
      const validation = await validateTrustToken({
        userId: session.user.id,
        sessionId: session.sessionId,
        actionType: trustAction,
        rawToken: req.body?.trustToken,
      });

      if (!validation.ok) {
        return res.status(validation.status).json({
          error: validation.message,
          code: validation.code,
        });
      }

      const nextEmail = normalizeEmail(req.body?.email);
      const currentEmail = normalizeEmail(session.user.email);

      if (!nextEmail) {
        return res.status(400).json({ error: 'Enter a new email address.' });
      }

      if (!isValidEmail(nextEmail)) {
        return res.status(400).json({ error: 'Enter a valid email address.', code: 'invalid_email' });
      }

      if (nextEmail === currentEmail) {
        return res.status(400).json({ error: 'Your new email must be different from your current email address.', code: 'same_email' });
      }

      const { response, payload } = await proxySupabaseUserUpdate({
        accessToken: session.accessToken,
        body: {
          email: nextEmail,
        },
        redirectTo: buildEmailChangeRedirectUrl(appBaseUrl),
      });

      if (!response.ok) {
        const errorCode = payload?.code || payload?.error_code || '';
        const normalizedMessage = String(payload?.msg || payload?.message || payload?.error_description || payload?.error || '').toLowerCase();

        if (errorCode === 'email_exists' || normalizedMessage.includes('already') && normalizedMessage.includes('email')) {
          return res.status(400).json({ error: 'That email address is already in use. Try a different one.', code: 'email_exists' });
        }

        if (normalizedMessage.includes('invalid email') || normalizedMessage.includes('validate email')) {
          return res.status(400).json({ error: 'Enter a valid email address.', code: 'invalid_email' });
        }

        return res.status(response.status).json({
          error: payload?.msg || payload?.message || payload?.error_description || 'Unable to start your email change right now.',
          code: errorCode || 'email_update_failed',
        });
      }

      const consumeResult = await consumeTrustToken({
        userId: session.user.id,
        sessionId: session.sessionId,
        actionType: trustAction,
        rawToken: req.body?.trustToken,
        metadata: {
          completedAction: trustAction,
        },
      });

      if (!consumeResult.ok) {
        return res.status(consumeResult.status).json({
          error: consumeResult.message,
          code: consumeResult.code,
        });
      }

      await insertAuditLog({
        userId: session.user.id,
        eventType: 'security_email_change_requested',
        sessionId: session.sessionId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          authProvider: session.authProvider,
          newEmail: nextEmail,
        },
      });

      res.json({
        success: true,
        message: 'We sent a confirmation link to your new email address. Your current sign-in email stays active until you verify the change.',
        pendingEmail: payload?.new_email || nextEmail,
        trustConsumed: true,
      });
    } catch (error) {
      console.error('Security email update error:', error);
      res.status(500).json({ error: error.message || 'Failed to start your email change.' });
    }
  });

  return {
    router,
    consumeTrustToken,
    validateTrustToken,
  };
};
