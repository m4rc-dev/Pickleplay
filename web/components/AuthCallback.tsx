import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getSecuritySettings } from '../services/supabase';
import { Loader2 } from 'lucide-react';

const AuthCallback: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                console.log('🔍 AuthCallback: Starting...');
                console.log('🔍 AuthCallback: Full URL:', window.location.href);
                console.log('🔍 AuthCallback: Hash:', window.location.hash);
                console.log('🔍 AuthCallback: Search params:', window.location.search);

                // Extract referral code from URL query parameters if present
                const urlParams = new URLSearchParams(window.location.search);
                const referralCode = urlParams.get('ref');
                const referralType = urlParams.get('type');
                console.log('🔍 AuthCallback: Referral code from URL:', referralCode);

                if (referralCode) {
                    console.log('✅ AuthCallback: Referral code found, storing in localStorage:', referralCode);
                    localStorage.setItem('referral_code', referralCode);
                    console.log('✅ AuthCallback: Stored referral_code in localStorage');
                } else {
                    console.log('ℹ️ AuthCallback: No referral code in URL');
                }

                // Store court-owner referral type if present
                if (referralType === 'court-owner') {
                    localStorage.setItem('referral_type', 'court-owner');
                    console.log('✅ AuthCallback: Stored referral_type=court-owner in localStorage');
                }

                // Verify localStorage
                const storedCode = localStorage.getItem('referral_code');
                console.log('🔍 AuthCallback: Current localStorage referral_code:', storedCode);

                // Extract OAuth parameters from the URL
                // With BrowserRouter, they should be in the search params or hash depending on Supabase config
                // but usually they come in the hash after a redirect: #access_token=...
                const oauthHash = window.location.hash.substring(1);

                console.log('🔍 AuthCallback: OAuth hash:', oauthHash);

                // Parse the OAuth parameters
                const params = new URLSearchParams(oauthHash || window.location.search);
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                console.log('🔍 AuthCallback: Access token exists:', !!accessToken);
                console.log('🔍 AuthCallback: Refresh token exists:', !!refreshToken);

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
                    console.log('✅ AuthCallback: Session set manually:', session);
                } else {
                    // Fallback to getSession if no tokens in URL
                    const result = await supabase.auth.getSession();
                    session = result.data.session;
                    error = result.error;
                    console.log('🔍 AuthCallback: Session from getSession:', session);
                }

                if (error) throw error;

                if (session?.user) {
                    console.log('✅ AuthCallback: User found:', session.user.id);

                    // 1.5 Block accounts without email (e.g. Facebook OAuth without email permission)
                    if (!session.user.email) {
                        console.warn('⚠️ AuthCallback: User has no email — signing out and redirecting');
                        await supabase.auth.signOut();
                        navigate('/login?error=email_required');
                        return;
                    }

                    // 2. Handle MFA check
                    const settings = await getSecuritySettings(session.user.id);
                    if (settings.data?.two_factor_enabled) {
                        localStorage.setItem('two_factor_pending', 'true');
                        navigate('/verify-2fa');
                        return;
                    }

                    // 4. Handle Redirection
                    const storedRedirect = localStorage.getItem('auth_redirect');
                    localStorage.removeItem('auth_redirect');

                    console.log('🔍 AuthCallback: Redirecting to:', storedRedirect || '/');

                    if (storedRedirect) {
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
