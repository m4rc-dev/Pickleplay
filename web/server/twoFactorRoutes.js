import express from 'express';
import crypto from 'crypto';

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const SEND_WINDOW_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_SENDS_PER_WINDOW = 5;

const LOGIN_PURPOSE = 'login';
const SETUP_PURPOSE = 'setup';

const normalizeCode = (value) => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

const generateOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateBackupCodes = (count = 10) =>
  Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
  });

const maskEmailAddress = (email) => {
  if (!email) return '';
  const [localPart, domain = ''] = email.split('@');
  if (!localPart) return email;
  if (localPart.length <= 2) {
    return `${localPart[0] || '*'}*@${domain}`;
  }

  return `${localPart.slice(0, 2)}${'*'.repeat(Math.max(1, localPart.length - 2))}@${domain}`;
};

const normalizeTimestampValue = (value) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  // Supabase/Postgres `timestamp` columns drop timezone information. We store
  // 2FA timestamps in UTC, so treat naive DB timestamps as UTC on read.
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed)) {
    return `${trimmed.replace(' ', 'T')}Z`;
  }

  return trimmed;
};

const safeIsoString = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(normalizeTimestampValue(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const getSecondsUntil = (value) => {
  const iso = safeIsoString(value);
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
};

const parseBackupCodeHashes = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((entry) => typeof entry === 'string');

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === 'string') : [];
    } catch {
      return [];
    }
  }

  return [];
};

const isOtpActiveForPurpose = (settings, purpose) => {
  const expiresAt = safeIsoString(settings?.verification_code_expires_at);
  return Boolean(
    settings?.verification_code &&
    expiresAt &&
    settings?.verification_purpose === purpose &&
    new Date(expiresAt).getTime() > Date.now()
  );
};

const buildTwoFactorEmailHtml = ({ code, expiresInMinutes, appName = 'PicklePlay' }) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${appName} Security Code</title>
  </head>
  <body style="margin:0;padding:0;background:#020617;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#020617;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid rgba(148,163,184,0.18);">
            <tr>
              <td style="padding:40px 36px 24px;background:linear-gradient(135deg,#1e1b4b 0%,#1d4ed8 100%);">
                <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.24em;font-weight:700;text-transform:uppercase;color:#bfdbfe;">Account Security</p>
                <h1 style="margin:0;font-size:32px;line-height:1.05;font-weight:900;color:#ffffff;">Verify your sign in</h1>
                <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.86);">
                  Use this one-time code to finish signing in to your PicklePlay account.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 36px 18px;">
                <div style="padding:20px 18px;border-radius:24px;background:#eff6ff;border:1px solid #bfdbfe;text-align:center;">
                  <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.18em;font-weight:800;text-transform:uppercase;color:#1d4ed8;">Verification Code</p>
                  <p style="margin:0;font-size:42px;line-height:1;font-weight:900;letter-spacing:0.28em;color:#0f172a;">${code}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 36px 32px;">
                <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#334155;">
                  This code expires in ${expiresInMinutes} minutes. If you did not request this login, you can ignore this email and your account will stay secure.
                </p>
                <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;">
                  For your safety, only the newest code stays valid and older codes stop working as soon as a new one is sent.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const buildTwoFactorEmailText = ({ code, expiresInMinutes }) =>
  `PicklePlay security code\n\nYour verification code is ${code}.\nIt expires in ${expiresInMinutes} minutes.\nOnly the newest code remains valid.\n\nIf you did not request this login, you can ignore this email.`;

const buildStatusPayload = ({ authProvider, settings, loginSession, email }) => {
  const activeLoginOtp = isOtpActiveForPurpose(settings, LOGIN_PURPOSE);

  return {
    success: true,
    authProvider: authProvider || 'unknown',
    twoFactorEnabled: Boolean(settings?.two_factor_enabled),
    requiresTwoFactor: Boolean(loginSession?.required && loginSession?.status === 'pending'),
    pending: loginSession?.status === 'pending',
    verified: loginSession?.status === 'verified' || loginSession?.status === 'exempt',
    maskedEmail: maskEmailAddress(email || ''),
    codeExpiresAt: activeLoginOtp ? safeIsoString(settings?.verification_code_expires_at) : null,
    resendCooldownSeconds: getSecondsUntil(
      settings?.verification_code_sent_at
        ? new Date(new Date(settings.verification_code_sent_at).getTime() + RESEND_COOLDOWN_MS)
        : null
    ),
    attemptsRemaining: Math.max(0, MAX_VERIFY_ATTEMPTS - Number(settings?.verification_attempts || 0)),
    backupCodesAvailable: parseBackupCodeHashes(settings?.backup_codes).length > 0,
  };
};

export const createTwoFactorRouter = ({
  supabaseAdmin,
  requireSupabaseAdmin,
  requireAuthenticatedSession,
  authLimiter,
  emailLimiter,
  sendTwoFactorEmail,
  secret,
  consumeSecurityTrust,
}) => {
  const router = express.Router();

  const hashSecret = secret || 'pickleplay-two-factor-dev-secret';

  const hashValue = (value) =>
    crypto.createHmac('sha256', hashSecret).update(normalizeCode(value)).digest('hex');

  const ensureSecuritySettings = async (userId) => {
    const { data, error } = await supabaseAdmin
      .from('security_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return data;
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('security_settings')
      .insert({
        user_id: userId,
        two_factor_enabled: false,
        two_factor_method: 'none',
      })
      .select('*')
      .single();

    if (insertError) throw insertError;
    return inserted;
  };

  const getLoginSession = async (userId, sessionId) => {
    const { data, error } = await supabaseAdmin
      .from('two_factor_auth_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) throw error;
    return data;
  };

  const upsertLoginSession = async ({ userId, sessionId, authProvider, status, required, verifiedAt = null }) => {
    const payload = {
      session_id: sessionId,
      user_id: userId,
      auth_provider: authProvider || 'unknown',
      status,
      required: Boolean(required),
      verified_at: safeIsoString(verifiedAt),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from('two_factor_auth_sessions')
      .upsert(payload, { onConflict: 'session_id' });

    if (error) throw error;
  };

  const clearLoginPendingState = async ({ userId, sessionId, authProvider }) => {
    await upsertLoginSession({
      userId,
      sessionId,
      authProvider,
      status: 'verified',
      required: false,
      verifiedAt: new Date(),
    });
  };

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
      console.error('Failed to write 2FA audit log:', error.message);
    }
  };

  const countRecentSendEvents = async (userId) => {
    const sinceIso = new Date(Date.now() - SEND_WINDOW_MS).toISOString();
    const { data, error } = await supabaseAdmin
      .from('security_audit_logs')
      .select('id')
      .eq('user_id', userId)
      .in('event_type', ['two_factor_code_sent', 'two_factor_code_resent'])
      .gte('created_at', sinceIso);

    if (error) throw error;
    return Array.isArray(data) ? data.length : 0;
  };

  const resetVerificationFields = async (userId, updates = {}) => {
    const { error } = await supabaseAdmin
      .from('security_settings')
      .update({
        verification_code: null,
        verification_code_expires_at: null,
        verification_attempts: 0,
        verification_code_sent_at: null,
        verification_purpose: null,
        ...updates,
      })
      .eq('user_id', userId);

    if (error) throw error;
  };

  const verifyBackupCode = (rawCode, backupCodeHashes) => {
    const normalized = normalizeCode(rawCode);
    const hashed = hashValue(normalized);
    const matchIndex = backupCodeHashes.findIndex((entry) => entry === hashed);
    return {
      matched: matchIndex >= 0,
      remaining: matchIndex >= 0
        ? backupCodeHashes.filter((_, index) => index !== matchIndex)
        : backupCodeHashes,
    };
  };

  router.post('/bootstrap', async (req, res) => {
    try {
      const guard = requireSupabaseAdmin();
      if (!guard.ok) {
        return res.status(500).json({ error: guard.message });
      }

      const session = await requireAuthenticatedSession(req, res);
      if (!session) return;

      const settings = await ensureSecuritySettings(session.user.id);
      const loginSession = await getLoginSession(session.user.id, session.sessionId);

      if (session.authProvider === 'google' || !settings.two_factor_enabled) {
        await upsertLoginSession({
          userId: session.user.id,
          sessionId: session.sessionId,
          authProvider: session.authProvider,
          status: 'exempt',
          required: false,
          verifiedAt: new Date(),
        });

        return res.json(buildStatusPayload({
          authProvider: session.authProvider,
          settings,
          loginSession: { status: 'exempt', required: false },
          email: session.user.email,
        }));
      }

      if (loginSession?.status === 'verified') {
        return res.json(buildStatusPayload({
          authProvider: session.authProvider,
          settings,
          loginSession,
          email: session.user.email,
        }));
      }

      await upsertLoginSession({
        userId: session.user.id,
        sessionId: session.sessionId,
        authProvider: session.authProvider,
        status: 'pending',
        required: true,
      });

      return res.json(buildStatusPayload({
        authProvider: session.authProvider,
        settings,
        loginSession: { status: 'pending', required: true },
        email: session.user.email,
      }));
    } catch (error) {
      console.error('2FA bootstrap error:', error);
      res.status(500).json({ error: error.message || 'Failed to initialize two-factor verification.' });
    }
  });

  router.get('/status', async (req, res) => {
    try {
      const guard = requireSupabaseAdmin();
      if (!guard.ok) {
        return res.status(500).json({ error: guard.message });
      }

      const session = await requireAuthenticatedSession(req, res);
      if (!session) return;

      const settings = await ensureSecuritySettings(session.user.id);
      const loginSession = await getLoginSession(session.user.id, session.sessionId);

      res.json(buildStatusPayload({
        authProvider: session.authProvider,
        settings,
        loginSession,
        email: session.user.email,
      }));
    } catch (error) {
      console.error('2FA status error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch two-factor status.' });
    }
  });

  router.post('/send', emailLimiter, async (req, res) => {
    try {
      const guard = requireSupabaseAdmin();
      if (!guard.ok) {
        return res.status(500).json({ error: guard.message });
      }

      const session = await requireAuthenticatedSession(req, res);
      if (!session) return;

      const purpose = req.body?.purpose === SETUP_PURPOSE ? SETUP_PURPOSE : LOGIN_PURPOSE;
      const forceResend = Boolean(req.body?.forceResend);
      const settings = await ensureSecuritySettings(session.user.id);
      const loginSession = purpose === LOGIN_PURPOSE
        ? await getLoginSession(session.user.id, session.sessionId)
        : null;

      if (!session.user.email) {
        return res.status(400).json({ error: 'Your account must have a verified email address to receive a security code.' });
      }

      if (purpose === LOGIN_PURPOSE) {
        if (session.authProvider === 'google') {
          return res.status(409).json({ error: 'Google sign-ins do not require PicklePlay email OTP verification.' });
        }

        if (!settings.two_factor_enabled) {
          return res.status(409).json({ error: 'Two-factor authentication is not enabled on this account.' });
        }

        if (loginSession?.status === 'verified' || loginSession?.status === 'exempt') {
          return res.status(409).json({ error: 'This session has already completed two-factor verification.' });
        }

        if (!loginSession) {
          await upsertLoginSession({
            userId: session.user.id,
            sessionId: session.sessionId,
            authProvider: session.authProvider,
            status: 'pending',
            required: true,
          });
        }
      } else {
        const hasPasswordIdentity = Array.isArray(session.user.identities)
          && session.user.identities.some((identity) => identity?.provider === 'email');

        if (!hasPasswordIdentity) {
          return res.status(409).json({ error: 'Set an email password on your account before enabling 2FA.' });
        }

        if (settings.two_factor_enabled) {
          return res.status(409).json({ error: 'Two-factor authentication is already enabled.' });
        }
      }

      if (!forceResend && isOtpActiveForPurpose(settings, purpose)) {
        return res.json({
          ...buildStatusPayload({
            authProvider: session.authProvider,
            settings,
            loginSession,
            email: session.user.email,
          }),
          success: true,
          alreadySent: true,
          message: 'Code already sent. Check your email.',
        });
      }

      const resendCooldownSeconds = getSecondsUntil(
        settings?.verification_code_sent_at
          ? new Date(new Date(settings.verification_code_sent_at).getTime() + RESEND_COOLDOWN_MS)
          : null
      );

      if (forceResend && resendCooldownSeconds > 0) {
        return res.status(429).json({
          error: `Please wait ${resendCooldownSeconds}s before requesting another code.`,
          cooldownSeconds: resendCooldownSeconds,
        });
      }

      const recentSendCount = await countRecentSendEvents(session.user.id);
      if (recentSendCount >= MAX_SENDS_PER_WINDOW) {
        return res.status(429).json({
          error: 'Too many verification codes requested. Please wait 10 minutes before trying again.',
          cooldownSeconds: getSecondsUntil(new Date(Date.now() + SEND_WINDOW_MS)),
        });
      }

      const code = generateOtpCode();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();
      const nowIso = new Date().toISOString();

      const { error: updateError } = await supabaseAdmin
        .from('security_settings')
        .update({
          verification_code: hashValue(code),
          verification_code_expires_at: expiresAt,
          verification_attempts: 0,
          verification_code_sent_at: nowIso,
          verification_purpose: purpose,
          two_factor_method: settings.two_factor_enabled ? 'email' : settings.two_factor_method,
        })
        .eq('user_id', session.user.id);

      if (updateError) throw updateError;

      await sendTwoFactorEmail({
        to: session.user.email,
        code,
        purpose,
        expiresInMinutes: OTP_EXPIRY_MS / (60 * 1000),
      });

      await insertAuditLog({
        userId: session.user.id,
        eventType: forceResend ? 'two_factor_code_resent' : 'two_factor_code_sent',
        sessionId: session.sessionId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          purpose,
          authProvider: session.authProvider,
        },
      });

      const freshSettings = {
        ...settings,
        verification_code: 'redacted',
        verification_code_expires_at: expiresAt,
        verification_attempts: 0,
        verification_code_sent_at: nowIso,
        verification_purpose: purpose,
      };

      res.json({
        ...buildStatusPayload({
          authProvider: session.authProvider,
          settings: freshSettings,
          loginSession,
          email: session.user.email,
        }),
        success: true,
        message: forceResend ? 'A new code is on its way.' : 'Code sent to your email.',
      });
    } catch (error) {
      console.error('2FA send error:', error);
      res.status(500).json({ error: error.message || 'Failed to send the security code.' });
    }
  });

  router.post('/verify', authLimiter, async (req, res) => {
    try {
      const guard = requireSupabaseAdmin();
      if (!guard.ok) {
        return res.status(500).json({ error: guard.message });
      }

      const session = await requireAuthenticatedSession(req, res);
      if (!session) return;

      const purpose = req.body?.purpose === SETUP_PURPOSE ? SETUP_PURPOSE : LOGIN_PURPOSE;
      const rawCode = req.body?.code;
      const normalizedCode = normalizeCode(rawCode);

      if (!normalizedCode) {
        return res.status(400).json({ error: 'A verification code is required.' });
      }

      const settings = await ensureSecuritySettings(session.user.id);
      const loginSession = purpose === LOGIN_PURPOSE
        ? await getLoginSession(session.user.id, session.sessionId)
        : null;

      if (purpose === LOGIN_PURPOSE) {
        if (loginSession?.status !== 'pending') {
          return res.status(409).json({ error: 'This session does not have a pending two-factor challenge.' });
        }
      } else if (settings.two_factor_enabled) {
        return res.status(409).json({ error: 'Two-factor authentication is already enabled.' });
      }

      const attempts = Number(settings.verification_attempts || 0);
      if (attempts >= MAX_VERIFY_ATTEMPTS) {
        return res.status(429).json({
          error: 'Too many failed attempts. Request a new code.',
          attemptsRemaining: 0,
        });
      }

      const backupCodeHashes = parseBackupCodeHashes(settings.backup_codes);
      const backupAttempt = purpose === LOGIN_PURPOSE && normalizedCode.length >= 8
        ? verifyBackupCode(normalizedCode, backupCodeHashes)
        : { matched: false, remaining: backupCodeHashes };

      const verificationPurpose = settings.verification_purpose || LOGIN_PURPOSE;
      const hasMatchingOtpContext = verificationPurpose === purpose && settings.verification_code;
      const otpExpiresAt = safeIsoString(settings.verification_code_expires_at);
      const otpExpired = !otpExpiresAt || new Date(otpExpiresAt).getTime() <= Date.now();

      if (!backupAttempt.matched && hasMatchingOtpContext && otpExpired) {
        await insertAuditLog({
          userId: session.user.id,
          eventType: 'two_factor_verify_failure',
          sessionId: session.sessionId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: {
            purpose,
            authProvider: session.authProvider,
            attempts,
            reason: 'expired_code',
          },
        });

        return res.status(410).json({
          error: 'This code has expired. Request a new one to continue.',
          attemptsRemaining: Math.max(0, MAX_VERIFY_ATTEMPTS - attempts),
        });
      }

      const otpMatches = Boolean(
        hasMatchingOtpContext &&
        !otpExpired &&
        settings.verification_code === hashValue(normalizedCode)
      );

      if (!backupAttempt.matched && !otpMatches) {
        if (!hasMatchingOtpContext) {
          return res.status(400).json({
            error: 'Request a new verification code to continue.',
            attemptsRemaining: Math.max(0, MAX_VERIFY_ATTEMPTS - attempts),
          });
        }

        const { error: attemptError } = await supabaseAdmin
          .from('security_settings')
          .update({ verification_attempts: attempts + 1 })
          .eq('user_id', session.user.id);

        if (attemptError) throw attemptError;

        await insertAuditLog({
          userId: session.user.id,
          eventType: 'two_factor_verify_failure',
          sessionId: session.sessionId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: {
            purpose,
            authProvider: session.authProvider,
            attempts: attempts + 1,
            reason: 'invalid_code',
          },
        });

        return res.status(400).json({
          error: 'Invalid verification code. Try again.',
          attemptsRemaining: Math.max(0, MAX_VERIFY_ATTEMPTS - attempts - 1),
        });
      }

      const nowIso = new Date().toISOString();
      let backupCodes = null;
      let auditEvent = 'two_factor_verify_success';
      let auditMetadata = {
        purpose,
        authProvider: session.authProvider,
        usedBackupCode: backupAttempt.matched,
      };

      if (purpose === SETUP_PURPOSE) {
        backupCodes = generateBackupCodes();
        await resetVerificationFields(session.user.id, {
          two_factor_enabled: true,
          two_factor_method: 'email',
          backup_codes: backupCodes.map((entry) => hashValue(entry)),
          backup_codes_generated_at: nowIso,
          last_2fa_used: nowIso,
        });
        auditEvent = 'two_factor_enabled';
      } else if (backupAttempt.matched) {
        await resetVerificationFields(session.user.id, {
          backup_codes: backupAttempt.remaining,
          last_backup_code_used_at: nowIso,
          last_2fa_used: nowIso,
        });
        auditMetadata = { ...auditMetadata, remainingBackupCodes: backupAttempt.remaining.length };
        await insertAuditLog({
          userId: session.user.id,
          eventType: 'backup_code_used',
          sessionId: session.sessionId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: {
            authProvider: session.authProvider,
            remainingBackupCodes: backupAttempt.remaining.length,
          },
        });
      } else {
        await resetVerificationFields(session.user.id, {
          last_2fa_used: nowIso,
        });
      }

      if (purpose === LOGIN_PURPOSE) {
        await clearLoginPendingState({
          userId: session.user.id,
          sessionId: session.sessionId,
          authProvider: session.authProvider,
        });
      }

      await insertAuditLog({
        userId: session.user.id,
        eventType: auditEvent,
        sessionId: session.sessionId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: auditMetadata,
      });

      const updatedSettings = {
        ...settings,
        two_factor_enabled: purpose === SETUP_PURPOSE ? true : settings.two_factor_enabled,
        two_factor_method: purpose === SETUP_PURPOSE ? 'email' : settings.two_factor_method,
        backup_codes: purpose === SETUP_PURPOSE
          ? backupCodes.map((entry) => hashValue(entry))
          : backupAttempt.matched
            ? backupAttempt.remaining
            : settings.backup_codes,
        verification_code: null,
        verification_code_expires_at: null,
        verification_attempts: 0,
        verification_code_sent_at: null,
        verification_purpose: null,
      };

      res.json({
        ...buildStatusPayload({
          authProvider: session.authProvider,
          settings: updatedSettings,
          loginSession: purpose === LOGIN_PURPOSE ? { status: 'verified', required: false } : loginSession,
          email: session.user.email,
        }),
        success: true,
        message: purpose === SETUP_PURPOSE
          ? '2FA enabled successfully.'
          : backupAttempt.matched
            ? 'Backup code accepted.'
            : 'Verification successful.',
        backupCodes,
        usedBackupCode: backupAttempt.matched,
      });
    } catch (error) {
      console.error('2FA verify error:', error);
      res.status(500).json({ error: error.message || 'Failed to verify the security code.' });
    }
  });

  router.post('/disable', authLimiter, async (req, res) => {
    try {
      const guard = requireSupabaseAdmin();
      if (!guard.ok) {
        return res.status(500).json({ error: guard.message });
      }

      const session = await requireAuthenticatedSession(req, res);
      if (!session) return;

      if (typeof consumeSecurityTrust !== 'function') {
        return res.status(500).json({ error: 'Security reauthentication is not configured.' });
      }

      const trustResult = await consumeSecurityTrust({
        userId: session.user.id,
        sessionId: session.sessionId,
        actionType: 'disable_2fa',
        rawToken: req.body?.trustToken,
        metadata: {
          completedAction: 'disable_2fa',
        },
      });

      if (!trustResult.ok) {
        return res.status(trustResult.status).json({
          error: trustResult.message,
          code: trustResult.code,
        });
      }

      const nowIso = new Date().toISOString();

      const { error: updateError } = await supabaseAdmin
        .from('security_settings')
        .update({
          two_factor_enabled: false,
          two_factor_method: 'none',
          backup_codes: null,
          backup_codes_generated_at: null,
          verification_code: null,
          verification_code_expires_at: null,
          verification_attempts: 0,
          verification_code_sent_at: null,
          verification_purpose: null,
          last_backup_code_used_at: null,
          updated_at: nowIso,
        })
        .eq('user_id', session.user.id);

      if (updateError) throw updateError;

      const { error: sessionError } = await supabaseAdmin
        .from('two_factor_auth_sessions')
        .update({
          status: 'exempt',
          required: false,
          verified_at: nowIso,
          auth_provider: session.authProvider,
          updated_at: nowIso,
        })
        .eq('user_id', session.user.id);

      if (sessionError) throw sessionError;

      await insertAuditLog({
        userId: session.user.id,
        eventType: 'two_factor_disabled',
        sessionId: session.sessionId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          authProvider: session.authProvider,
          reauthVerified: true,
        },
      });

      res.json({
        success: true,
        message: 'Two-factor authentication disabled.',
      });
    } catch (error) {
      console.error('2FA disable error:', error);
      res.status(500).json({ error: error.message || 'Failed to disable two-factor authentication.' });
    }
  });

  return router;
};
