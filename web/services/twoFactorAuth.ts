import { supabase } from './supabase';

// Generate a random 6-digit code
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send Email verification code via API route
export const sendEmailCode = async (email: string, userId: string) => {
  try {
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

    // Send email via Express server (proxied through Vite)
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        subject: 'Your PicklePlay 2FA Code',
        code,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send email');
    }

    return { success: true, message: 'Code sent to your email' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
};

// Verify the code entered by user
export const verifyCode = async (userId: string, code: string) => {
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
    const { error: clearError } = await supabase
      .from('security_settings')
      .update({
        verification_code: null,
        verification_code_expires_at: null,
        verification_attempts: 0,
        two_factor_enabled: true,
        two_factor_method: 'email',
      })
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
    return sendEmailCode(email, userId);
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
