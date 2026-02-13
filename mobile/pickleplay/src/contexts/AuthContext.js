import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import { createUserProfile, upsertUserProfile, deactivateUserAccount, deleteUserAccount } from '../services/userService';

// Required for auth session
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs
const GOOGLE_WEB_CLIENT_ID = '208609136535-fmlvhfhle01ahs7hg00hsmnatuq9fh8n.apps.googleusercontent.com';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const inactivityTimeoutRef = React.useRef(null);
  
  const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds

  // Handle user activity - just record the time
  const recordActivity = React.useCallback(() => {
    setLastActivityTime(Date.now());
  }, []);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setLastActivityTime(Date.now());
        }
      } catch (err) {
        console.error('Error getting session:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (__DEV__) {
          console.log('Auth state changed:', event);
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          setLastActivityTime(Date.now());
        } else {
          // Clear timeout when logged out
          if (inactivityTimeoutRef.current) {
            clearTimeout(inactivityTimeoutRef.current);
          }
        }
      }
    );

    // Monitor app state for inactivity check when resuming
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && session?.user) {
        // App came to foreground - check inactivity
        const timeSinceLastActivity = Date.now() - lastActivityTime;
        if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
          console.log('🔐 Session expired - app was inactive too long');
          // Perform logout by signing out from Supabase
          supabase.auth.signOut().catch(err => console.error('Auto-logout error:', err));
        } else {
          setLastActivityTime(Date.now());
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
      appStateSubscription?.remove();
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Sign up with email and password
   */
  const signUp = async (email, password, metadata = {}) => {
    try {
      setError(null);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata, // first_name, last_name, etc.
        },
      });

      if (error) throw error;

      // Create user profile in users table
      if (data?.user) {
        try {
          await createUserProfile(data.user.id, {
            email: email,
            full_name: metadata.full_name || `${metadata.first_name || ''} ${metadata.last_name || ''}`.trim(),
            roles: ['PLAYER'],
          });
        } catch (profileError) {
          console.log('Profile creation skipped (may already exist):', profileError.message);
        }
      }

      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign in with email and password
   */
  const signIn = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign in with Google using the ID token from expo-auth-session
   * @param {string} idToken - The Google ID token
   * @param {string} nonce - Optional nonce for ID token validation
   */
  const signInWithGoogle = async (idToken, nonce) => {
    try {
      setError(null);
      setLoading(true);

      console.log('=== Google Sign-In with Supabase ===');

      if (!idToken) {
        throw new Error('No ID token provided');
      }

      // Sign in to Supabase using the Google ID token with nonce if present
      const authOptions = {
        provider: 'google',
        token: idToken,
      };
      
      // Include nonce if provided (required for ID token validation)
      if (nonce) {
        authOptions.nonce = nonce;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.signInWithIdToken(authOptions);

      if (sessionError) {
        console.log('Supabase auth error:', sessionError);
        throw sessionError;
      }

      console.log('Supabase session created successfully');

      // Sync Google user profile data to PicklePlay
      if (sessionData?.user) {
        await syncGoogleUserProfile(sessionData.user);
      }

      return { data: sessionData, error: null };
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError(err.message);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out from Google (placeholder for compatibility)
   */
  const signOutFromGoogle = async () => {
    // No-op for expo-auth-session - session is handled by Supabase
    console.log('Google sign out - session handled by Supabase');
  };

  /**
   * Sync Google user data to PicklePlay profile
   */
  const syncGoogleUserProfile = async (user) => {
    try {
      if (!user) return;

      // Extract user metadata from Google OAuth
      const userMetadata = user.user_metadata || {};
      
      // Get name parts from Google data
      const fullName = userMetadata.full_name || userMetadata.name || '';
      const nameParts = fullName.split(' ');
      const firstName = userMetadata.given_name || nameParts[0] || '';
      const lastName = userMetadata.family_name || nameParts.slice(1).join(' ') || '';

      // Prepare profile data
      const profileData = {
        email: user.email || userMetadata.email,
        full_name: fullName,
        avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
        roles: ['PLAYER'],
      };

      console.log('Syncing Google user profile:', profileData);

      // Create or update user profile
      const { data, error } = await upsertUserProfile(user.id, profileData);
      
      if (error) {
        console.error('Error syncing Google user profile:', error);
      } else {
        console.log('Google user profile synced successfully:', data);
      }

      return { data, error };
    } catch (err) {
      console.error('Error in syncGoogleUserProfile:', err);
      return { data: null, error: err };
    }
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    try {
      console.log('🔐 Signing out from auth...');
      setError(null);
      
      // Sign out from Google if signed in with Google
      await signOutFromGoogle();
      
      console.log('🔐 Calling supabase.auth.signOut()...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('🔐 Supabase signOut error:', error);
        throw error;
      }
      
      console.log('🔐 Clearing user and session...');
      setUser(null);
      setSession(null);
      console.log('🔐 Logout complete');
      
      return { error: null };
    } catch (err) {
      console.error('🔐 SignOut catch block error:', err);
      setError(err.message);
      throw err; // Re-throw the error so caller can handle it
    }
  };

  /**
   * Reset password
   */
  const resetPassword = async (email) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    }
  };

  /**
   * Update user profile
   */
  const updateProfile = async (updates) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.updateUser({
        data: updates,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    }
  };

  /**
   * Deactivate user account (soft delete)
   */
  const deactivateAccount = async () => {
    try {
      setError(null);
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await deactivateUserAccount(user.id);
      if (error) throw error;
      
      // Sign out after deactivation
      await signOut();
      return { error: null };
    } catch (err) {
      setError(err.message);
      return { error: err };
    }
  };

  /**
   * Delete user account permanently
   */
  const deleteAccount = async () => {
    try {
      setError(null);
      const { error } = await deleteUserAccount();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
      return { error: null };
    } catch (err) {
      setError(err.message);
      return { error: err };
    }
  };

  const value = {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateProfile,
    deactivateAccount,
    deleteAccount,
    recordActivity,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
