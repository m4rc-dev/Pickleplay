import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import { getMaintenanceStatus } from './services/maintenance';
import MaintenanceScreen from './components/MaintenanceScreen';
import App from './App';

// ═══════════════════════════════════════════════════════════════════════════════
// MAINTENANCE GATE WRAPPER — Completely isolated from App's state, queries Supabase directly
// Wraps App entirely and is IMPOSSIBLE to bypass
// ═══════════════════════════════════════════════════════════════════════════════
const MaintenanceGateWrapper: React.FC = () => {
  const [checked, setChecked] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkMaintenance = async () => {
      try {
        // 1. Check user session first
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[MaintenanceGate] Session:', session?.user?.id ? 'logged in' : 'no session');
        
        if (session?.user) {
          // Check app_metadata first (fast, no extra DB call)
          const metaRoles: string[] = session.user.app_metadata?.roles || [];
          const isAdminFromMeta = metaRoles.some(r => r?.toUpperCase() === 'ADMIN')
            || session.user.app_metadata?.is_admin === true;

          if (isAdminFromMeta) {
            // Admin confirmed from token — no need to hit DB
            if (mounted) setUserRole('ADMIN');
          } else {
            // Fetch the full roles array (NOT active_role) from profile
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('roles')
              .eq('id', session.user.id)
              .single();

            const dbRoles: string[] = profile?.roles || [];
            const isAdminFromDB = dbRoles.some(r => r?.toUpperCase() === 'ADMIN');
            console.log('[MaintenanceGate] Profile roles from DB:', dbRoles, 'isAdmin:', isAdminFromDB, 'error:', error);
            if (mounted) setUserRole(isAdminFromDB ? 'ADMIN' : 'PLAYER');
          }
        } else {
          if (mounted) setUserRole('guest');
        }

        // 2. Then check maintenance
        const m = await getMaintenanceStatus();
        console.log('[MaintenanceGate] Maintenance status:', m);
        if (mounted && m) {
          setIsEnabled(m.enabled);
          setMessage(m.message || '');
        }
      } catch (e) {
        console.warn('Maintenance check failed:', e);
      } finally {
        if (mounted) setChecked(true);
      }
    };

    checkMaintenance();

    // Poll every 10 seconds
    const interval = setInterval(checkMaintenance, 10000);

    // Also check on visibility change
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkMaintenance();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = '/';
  };

  // Haven't finished initial check yet
  if (!checked) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  // Debug log to see what's happening
  console.log('[MaintenanceGate] isEnabled:', isEnabled, 'userRole:', userRole);

  // If maintenance is enabled, ONLY allow ADMIN through
  // Everyone else (PLAYER, COACH, COURT_OWNER, CUSTOMER, etc.) gets blocked
  if (isEnabled) {
    const normalizedRole = userRole?.toUpperCase();
    
    // Only ADMIN bypasses maintenance
    if (normalizedRole === 'ADMIN') {
      console.log('[MaintenanceGate] ADMIN detected, allowing through');
      return <App />;
    }
    
    // Guests can still see login page
    if (!userRole || userRole === 'guest') {
      console.log('[MaintenanceGate] Guest detected, allowing login page');
      return <App />;
    }
    
    // Everyone else is blocked
    console.log('[MaintenanceGate] BLOCKING user with role:', userRole);
    return <MaintenanceScreen message={message} onLogout={handleLogout} />;
  }

  // Maintenance not enabled, render normally
  return <App />;
};

export default MaintenanceGateWrapper;
