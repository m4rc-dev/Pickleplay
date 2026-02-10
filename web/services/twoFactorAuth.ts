import { supabase } from './supabase';
import emailjs from '@emailjs/browser';

// EmailJS Configuration
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

// Generate a random 6-digit code
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Check if there's already a valid code that hasn't expired
export const hasValidCode = async (userId: string): Promise<boolean> => {
  try {
    const { data: settings, error } = await supabase
      .from('security_settings')
      .select('verification_code, verification_code_expires_at')
      .eq('user_id', userId)
      .single();

    if (error || !settings?.verification_code || !settings?.verification_code_expires_at) {
      return false;
    }

    // Check if code hasn't expired
    const expiresAtUTC = new Date(settings.verification_code_expires_at + 'Z');
    const nowUTC = new Date();
    
    return nowUTC <= expiresAtUTC;
  } catch {
    return false;
  }
};

// Send Email verification code via EmailJS (no backend needed)
export const sendEmailCode = async (email: string, userId: string, forceResend: boolean = false) => {
  try {
    // Check if there's already a valid code (unless forcing resend)
    if (!forceResend) {
      const hasValid = await hasValidCode(userId);
      if (hasValid) {
        return { success: true, message: 'Code already sent. Check your email.', alreadySent: true };
      }
    }

    const code = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes in milliseconds

    // Save code to database
    const { error: updateError } = await supabase
      .from('security_settings')
      .update({
        verification_code: code,
        verification_code_expires_at: new Date(expiresAt).toISOString(),
        verification_attempts: 0,
      })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    // Send email via EmailJS
    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: email,
        verification_code: code,
        app_name: 'PicklePlay',
      },
      EMAILJS_PUBLIC_KEY
    );

    if (result.status !== 200) {
      throw new Error('Failed to send email');
    }

    return { success: true, message: 'Code sent to your email' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
};

// Verify the code entered by user
// enableAfterVerify: true when setting up 2FA for first time, false when verifying during login
export const verifyCode = async (userId: string, code: string, enableAfterVerify: boolean = true) => {
  try {
    const { data: settings, error: fetchError } = await supabase
      .from('security_settings')
      .select('verification_code, verification_code_expires_at, verification_attempts')
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    // Parse timestamps correctly accounting for timezone
    const expiresAtUTC = settings.verification_code_expires_at ? new Date(settings.verification_code_expires_at + 'Z') : null;
    const nowUTC = new Date();
    
    if (!expiresAtUTC || nowUTC > expiresAtUTC) {
      return { success: false, message: 'Code has expired. Request a new one.' };
    }

    // Check attempts
    if (settings.verification_attempts >= 5) {
      return { success: false, message: 'Too many failed attempts. Request a new code.' };
    }

    // Check if code matches
    if (settings.verification_code !== code) {
      // Increment failed attempts
      await supabase
        .from('security_settings')
        .update({ verification_attempts: settings.verification_attempts + 1 })
        .eq('user_id', userId);

      return { success: false, message: 'Invalid code. Try again.' };
    }

    // Code is valid - clear the verification fields
    const updateData: any = {
      verification_code: null,
      verification_code_expires_at: null,
      verification_attempts: 0,
    };

    // Only enable 2FA if this is the initial setup (not login verification)
    if (enableAfterVerify) {
      updateData.two_factor_enabled = true;
      updateData.two_factor_method = 'email';
    }

    const { error: clearError } = await supabase
      .from('security_settings')
      .update(updateData)
      .eq('user_id', userId);

    if (clearError) throw clearError;

    return { success: true, message: '2FA enabled successfully!' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
};

// Resend the code (rate limited to prevent abuse)
export const resendCode = async (userId: string) => {
  try {
    const { data: authUser } = await supabase.auth.getUser();
    const email = authUser.user?.email;

    if (!email) throw new Error('Email not found');
    return sendEmailCode(email, userId, true); // Force resend
  } catch (err: any) {
    return { success: false, message: err.message };
  }
};

// Generate backup codes for account recovery
export const generateBackupCodes = (): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
  }
  return codes;
};

// Save backup codes
export const saveBackupCodes = async (userId: string, codes: string[]) => {
  try {
    const { error } = await supabase
      .from('security_settings')
      .update({ backup_codes: JSON.stringify(codes) })
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true, codes };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
};
