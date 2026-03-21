import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { bootstrapTwoFactorSession } from '../services/twoFactorAuth';
import { shouldBlockUnverifiedEmailSession } from '../services/authAccess';
import { Loader2 } from 'lucide-react';

const AuthCallback: React.FC = () => {
    const navigate = useNavigate();

    const getSafeRedirectPath = () => {
        const searchParams = new URLSearchParams(window.location.search);
        const hashFragment = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
        const hashParams = new URLSearchParams(hashFragment);
        const redirect = searchParams.get('redirect') || hashParams.get('redirect');

        if (!redirect || !redirect.startsWith('/')) {
            return null;
        }

        return redirect;
    };

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {

                // Extract referral code from URL query parameters if present
                const urlParams = new URLSearchParams(window.location.search);
                const referralCode = urlParams.get('ref');
                const referralType = urlParams.get('type');

                if (referralCode) {
                    localStorage.setItem('referral_code', referralCode);
                } else {
                }

                // Store court-owner referral type if present
                if (referralType === 'court-owner') {
                    localStorage.setItem('referral_type', 'court-owner');
                }

                // Verify localStorage

                // ── EARLY RECOVERY CHECK ──────────────────────────────────────────
                // The module-level listener in supabase.ts stores this flag when it
                // intercepts PASSWORD_RECOVERY before React renders. Check it here
                // FIRST to avoid any dashboard flash caused by route redirect logic.
                const pendingRecovery = sessionStorage.getItem('password_recovery_pending') === 'true';
                if (pendingRecovery) {
                    sessionStorage.removeItem('password_recovery_pending');
                    navigate('/update-password', { replace: true });
                    return;
                }

                const isRecovery = window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery');


                // Parse parameters from both hash and search
                const oauthHash = window.location.hash.substring(1);
                const hashParams = new URLSearchParams(oauthHash);
                const searchParams = new URLSearchParams(window.location.search);

                // Check for errors in the URL (e.g., otp_expired)
                const errorCode = hashParams.get('error') || searchParams.get('error');
                const errorMessage = hashParams.get('error_description') || searchParams.get('error_description');

                if (errorCode) {
                    // Explicitly handle recovery failure
                    if (isRecovery) {
                        navigate(`/login?error=${encodeURIComponent(errorMessage || 'Your password reset link is invalid or has expired.')}`);
                        return;
                    }
                    navigate(`/login?error=${encodeURIComponent(errorMessage || errorCode)}`);
                    return;
                }

                const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');


                let session = null;
                let error = null;

                if (accessToken && refreshToken) {
                    // Manually set the session using the tokens from the URL
                    const result = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });
                    session = result.data.session;
                    error = result.error;
                } else {
                    // Fallback to getSession if no tokens in URL
                    // BUT: if we were expecting a recovery/token and it's missing, we should be wary
                    const result = await supabase.auth.getSession();
                    session = result.data.session;
                    error = result.error;

                    // If it was a recovery attempt and we didn't get a session from the URL,
                    // and the current session is just an old one, this might be a failed state.
                }

                if (error) throw error;

                if (session?.user) {

                    if (isRecovery) {
                        navigate('/update-password');
                        return;
                    }

                    // 1.5 Block accounts without email (e.g. Facebook OAuth without email permission)
                    if (!session.user.email) {
                        await supabase.auth.signOut();
                        navigate('/login?error=email_required');
                        return;
                    }

                    if (shouldBlockUnverifiedEmailSession(session.user)) {
                        await supabase.auth.signOut();
                        localStorage.removeItem('auth_redirect');
                        navigate('/login?error=verify_email_required', { replace: true });
                        return;
                    }

                    const twoFactorStatus = await bootstrapTwoFactorSession(session.access_token).catch(async (bootstrapError) => {
                        await supabase.auth.signOut();
                        throw bootstrapError;
                    });

                    if (twoFactorStatus.pending) {
                        navigate('/verify-2fa');
                        return;
                    }

                    // 4. Handle Redirection
                    const callbackRedirect = getSafeRedirectPath();
                    const storedRedirect = localStorage.getItem('auth_redirect');
                    localStorage.removeItem('auth_redirect');


                    if (callbackRedirect) {
                        navigate(callbackRedirect);
                    } else if (storedRedirect) {
                        navigate(storedRedirect);
                    } else {
                        navigate('/');
                    }
                } else {
                    console.warn('⚠️ AuthCallback: No session found after retries, redirecting to login');
                    navigate('/login');
                }
            } catch (err) {
                console.error('❌ Auth callback error:', err);
                navigate('/login');
            }
        };

        handleAuthCallback();
    }, [navigate]);

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-950">
            <div className="text-center space-y-6">
                <Loader2 className="animate-spin text-lime-400 mx-auto" size={48} />
                <p className="text-white font-medium text-lg">Signing you in...</p>
            </div>
        </div>
    );
};

export default AuthCallback;
