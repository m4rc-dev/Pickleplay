import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Loader2 } from 'lucide-react';

const AuthCallback: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                // Get the session from the URL hash
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('Auth callback error:', error);
                    navigate('/login');
                    return;
                }

                if (session) {
                    // Check for stored redirect URL
                    const storedRedirect = localStorage.getItem('auth_redirect');
                    localStorage.removeItem('auth_redirect'); // Clean up
                    
                    if (storedRedirect) {
                        navigate(storedRedirect);
                    } else {
                        navigate('/dashboard');
                    }
                } else {
                    navigate('/login');
                }
            } catch (err) {
                console.error('Auth callback error:', err);
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
