const fs = require('fs');
const path = require('path');

const APP_PATH = path.join(__dirname, '..', 'App.tsx');

// Read and normalize line endings to LF for consistent patching
let c = fs.readFileSync(APP_PATH, 'utf8').replace(/\r\n/g, '\n');
let ok = 0, fail = 0;

function patch(label, search, replacement) {
  if (c.includes(search)) {
    c = c.replace(search, replacement);
    console.log(`  ✅ ${label}`);
    ok++;
    return true;
  } else {
    console.log(`  ❌ ${label} - pattern not found`);
    fail++;
    return false;
  }
}

console.log('Applying patches to App.tsx...\n');

// ── P1: Add imports ──
patch('P1: imports',
  "import { supabase, createSession, getSecuritySettings } from './services/supabase';\n",
  "import { supabase, createSession, getSecuritySettings } from './services/supabase';\nimport { getMaintenanceStatus, getEnabledFeaturesForRole, isFeatureEnabled } from './services/maintenance';\nimport MaintenanceScreen from './components/MaintenanceScreen';\n"
);

// ── P3: NavigationHandler props type - add maintenance/feature props ──
patch('P3: NavigationHandler props type',
  "  handleConfirmUsername: (newName: string) => Promise<void>;\n}> = (props)",
  "  handleConfirmUsername: (newName: string) => Promise<void>;\n  isMaintenanceMode: boolean;\n  maintenanceChecked: boolean;\n  maintenanceMessage: string;\n  enabledFeatures: Set<string>;\n  featuresLoaded: boolean;\n  isActualAdmin: boolean;\n}> = (props)"
);

// ── P3b: NavigationHandler destructuring ──
patch('P3b: props destructuring',
  "    initialNameForModal, handleConfirmUsername\n  } = props;",
  "    initialNameForModal, handleConfirmUsername,\n    isMaintenanceMode, maintenanceChecked, maintenanceMessage, enabledFeatures, featuresLoaded, isActualAdmin\n  } = props;"
);

// ── P4: feat() function + FeatureGate effect (insert before isSimulating) ──
patch('P4: feat() and FeatureGate',
  "  const themeColor = getThemeColor();\n\n  const isSimulating",
  `  const themeColor = getThemeColor();

  // Distinguish maintenance bypass (account-level admin) from feature bypass (role-based)
  const isAdminForMaintenance = isActualAdmin || localStorage.getItem('is_actual_admin') === 'true';
  const isAdminForFeatures = role === 'ADMIN';

  // Helper: check if a feature is accessible for the current user.
  const feat = (feature: string): boolean => {
    if (isAdminForFeatures) return true;
    if (!featuresLoaded) return true;
    const allowed = isFeatureEnabled(enabledFeatures, feature, role);
    console.log(\`[feat] \${feature} → \${allowed ? 'ALLOW' : 'DENY'} (role=\${role}, enabledFeatures=[\${[...enabledFeatures].join(',')}])\`);
    return allowed;
  };

  // ── Feature Access Enforcement ──
  useEffect(() => {
    if (isAdminForFeatures || role === 'guest') return;
    if (!featuresLoaded) return;
    const PATH_FEATURE_MAP: Record<string, string> = {
      '/booking': 'booking', '/my-bookings': 'booking', '/court/': 'booking',
      '/messages': 'messages', '/tournaments': 'tournaments', '/guides': 'guides',
      '/teams': 'teams', '/partners': 'partners', '/coaches': 'coaches',
      '/community': 'community', '/dashboard': 'dashboard', '/news': 'news',
      '/shop': 'shop', '/profile': 'profile', '/rankings': 'rankings',
      '/academy': 'academy', '/students': 'students', '/clinics': 'clinics',
      '/schedule': 'schedule', '/locations': 'locations',
      '/bookings-admin': 'bookings-admin', '/court-calendar': 'court-calendar',
      '/tournaments-admin': 'tournaments-admin', '/revenue': 'revenue',
      '/court-policies': 'court-policies',
    };
    const currentPath = location.pathname;
    const matchedFeature = Object.entries(PATH_FEATURE_MAP).find(([path]) =>
      currentPath === path || currentPath.startsWith(path + '/')
    )?.[1];
    console.log('[FeatureGate] check', { role, currentPath, matchedFeature, enabledFeatures: [...enabledFeatures] });
    if (matchedFeature && !enabledFeatures.has(matchedFeature)) {
      console.warn('[FeatureGate] BLOCK', { role, currentPath, matchedFeature, enabledFeatures: [...enabledFeatures] });
      navigate('/', { replace: true });
    }
  }, [enabledFeatures, location.pathname, role, featuresLoaded, isAdminForFeatures]);

  const isSimulating`
);

// ── P5: Render-time gates before main return ──
patch('P5: render gates',
  "  return (\n    <div className=\"min-h-screen h-full w-full flex flex-col md:flex-row relative text-slate-900 overflow-hidden\"",
  `  // ── RENDER-TIME LOGGING ──
  console.log('[NavigationHandler RENDER]', { role, featuresLoaded, maintenanceChecked, enabledFeaturesArray: [...enabledFeatures], pathname: location.pathname });

  // ── Block render until maintenance checked AND features loaded ──
  if (role !== 'guest' && !isAuthPage) {
    if (!maintenanceChecked || !featuresLoaded) {
      return <div className="min-h-screen bg-slate-950" />;
    }
  }

  // ── Maintenance gate ──
  if (isMaintenanceMode && !isAdminForMaintenance && role !== 'guest' && !isAuthPage) {
    return <MaintenanceScreen message={maintenanceMessage} onLogout={onLogoutClick} />;
  }

  return (
    <div className="min-h-screen h-full w-full flex flex-col md:flex-row relative text-slate-900 overflow-hidden"`
);

// ── P6a: Gate dashboard overview in sidebar ──
patch('P6a: gate dashboard overview',
  "{role !== 'PLAYER' && (\n              <NavItem to=\"/dashboard\"",
  "{role !== 'PLAYER' && feat('dashboard') && (\n              <NavItem to=\"/dashboard\""
);

// ── P6b: Gate news in sidebar ──
patch('P6b: gate news',
  "<NavItem to=\"/news\" icon={<Newspaper size={22} />} label=\"Newsfeed\" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />",
  "{feat('news') && <NavItem to=\"/news\" icon={<Newspaper size={22} />} label=\"Newsfeed\" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}"
);

// ── P7: Gate route elements ──
const routeGates = [
  ['/shop', 'shop'], ['/news', 'news'], ['/academy', 'academy'], ['/rankings', 'rankings'],
  ['/dashboard', 'dashboard'], ['/booking', 'booking'], ['/my-bookings', 'booking'],
  ['/tournaments', 'tournaments'], ['/coaches', 'coaches'], ['/community', 'community'],
  ['/partners', 'partners'], ['/messages', 'messages'], ['/teams', 'teams'],
  ['/profile', 'profile'], ['/students', 'students'], ['/clinics', 'clinics'],
  ['/schedule', 'schedule'], ['/locations', 'locations'], ['/bookings-admin', 'bookings-admin'],
  ['/court-calendar', 'court-calendar'], ['/tournaments-admin', 'tournaments-admin'],
  ['/revenue', 'revenue'], ['/court-policies', 'court-policies'],
];

for (const [routePath, feature] of routeGates) {
  const search = `<Route path="${routePath}" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : `;
  if (c.includes(search) && !c.includes(`path="${routePath}" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat(`)) {
    c = c.replace(search, `${search}!feat('${feature}') ? <Navigate to="/" replace /> : `);
    console.log(`  ✅ P7: gate route ${routePath}`);
    ok++;
  }
}

// Gate /court/:courtId
if (!c.includes('path="/court/:courtId" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat')) {
  patch('P7: gate /court/:courtId',
    '<Route path="/court/:courtId" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : ',
    '<Route path="/court/:courtId" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat(\'booking\') ? <Navigate to="/" replace /> : '
  );
}

// Gate /guides sub-routes
for (const gpath of ['/guides/skill-rating', '/guides/:slug']) {
  const s = `<Route path="${gpath}" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : `;
  if (c.includes(s) && !c.includes(`path="${gpath}" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat`)) {
    c = c.replace(s, `${s}!feat('guides') ? <Navigate to="/" replace /> : `);
    console.log(`  ✅ P7: gate route ${gpath}`);
    ok++;
  }
}

// Gate community group sub-routes
for (const gpath of ['/community/groups/:groupId', '/community/groups/:groupId/manage']) {
  const s = `<Route path="${gpath}" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : role`;
  if (c.includes(s) && !c.includes(`path="${gpath}" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat`)) {
    c = c.replace(s, `<Route path="${gpath}" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('community') ? <Navigate to="/" replace /> : role`);
    console.log(`  ✅ P7: gate route ${gpath}`);
    ok++;
  }
}

// Gate /locations/:locationId
patch('P7: gate /locations/:locationId',
  '<Route path="/locations/:locationId" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : role',
  '<Route path="/locations/:locationId" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat(\'locations\') ? <Navigate to="/" replace /> : role'
);

// Gate /profile/:userId
patch('P7: gate /profile/:userId',
  '<Route path="/profile/:userId" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : role',
  '<Route path="/profile/:userId" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat(\'profile\') ? <Navigate to="/" replace /> : role'
);

// ── P9: Add maintenance & feature state to App component ──
patch('P9: state vars',
  "  const [initialNameForModal, setInitialNameForModal] = useState('');\n\n  useEffect(() => {",
  `  const [initialNameForModal, setInitialNameForModal] = useState('');

  // Maintenance & feature access
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(new Set());
  const [featuresLoaded, setFeaturesLoaded] = useState(false);
  const [isActualAdmin, setIsActualAdmin] = useState(() => localStorage.getItem('is_actual_admin') === 'true');

  const hasAdminRole = (roles: (string | UserRole)[] | null | undefined) =>
    Array.isArray(roles) && roles.some(r => (r || '').toString().toUpperCase() === 'ADMIN');

  useEffect(() => {`
);

// ── P10: Add feature polling BEFORE "// 1. Robust Session Sync Logic" ──
patch('P10: feature polling',
  "    });\n\n    // 1. Robust Session Sync Logic",
  `    });

    // Refetch maintenance + features on tab focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        getMaintenanceStatus().then(m => {
          if (m) { setIsMaintenanceMode(m.enabled); setMaintenanceMessage(m.message || ''); }
        });
        const r = (localStorage.getItem('active_role') as UserRole) || 'PLAYER';
        if (r !== 'guest') {
          getEnabledFeaturesForRole(r as UserRole).then(f => { setEnabledFeatures(f); setFeaturesLoaded(true); });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const pollMaintenance = () => {
      getMaintenanceStatus().then(m => {
        if (m) { setIsMaintenanceMode(m.enabled); setMaintenanceMessage(m.message || ''); }
      });
    };
    const pollInterval = setInterval(pollMaintenance, 15000);

    const pollFeatures = async () => {
      const r = (localStorage.getItem('active_role') as UserRole) || 'PLAYER';
      if (r !== 'guest') {
        const features = await getEnabledFeaturesForRole(r as UserRole);
        console.log('[Features] pollFeatures loaded', r, [...features]);
        setEnabledFeatures(features);
        setFeaturesLoaded(true);
      } else {
        setEnabledFeatures(new Set(['*']));
        setFeaturesLoaded(true);
      }
    };
    const featurePollInterval = setInterval(pollFeatures, 5000);
    pollFeatures();

    const featureChannel = supabase
      .channel('feature-access-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_feature_access' }, () => {
        const r = (localStorage.getItem('active_role') as UserRole) || 'PLAYER';
        if (r !== 'guest') {
          getEnabledFeaturesForRole(r as UserRole).then(f => { setEnabledFeatures(f); setFeaturesLoaded(true); });
        }
      })
      .subscribe();

    // 1. Robust Session Sync Logic`
);

// ── P11: Add maintenance + feature loading in syncUserSession ──
patch('P11: sync session features',
  "      setCurrentUserId(session.user.id);\n      // Initial state from session auth metadata",
  `      setCurrentUserId(session.user.id);

      const metaRoles: UserRole[] = (session.user.app_metadata?.roles as UserRole[]) || [];
      const metaActiveRole: UserRole = (session.user.app_metadata?.active_role as UserRole) || 'PLAYER';
      const metaIsAdminFlag = session.user.app_metadata?.is_admin === true;

      const [profileRolesRes, maintenanceResult] = await Promise.all([
        supabase.from('profiles').select('roles, active_role').eq('id', session.user.id).single(),
        getMaintenanceStatus()
      ]);

      const dbRolesEarly: UserRole[] = profileRolesRes.data?.roles || [];
      const dbActiveRole = (profileRolesRes.data?.active_role as UserRole) || metaActiveRole || 'PLAYER';
      const isAdmin = hasAdminRole(dbRolesEarly) || hasAdminRole(metaRoles)
        || (dbActiveRole?.toUpperCase?.() === 'ADMIN') || (metaActiveRole?.toUpperCase?.() === 'ADMIN') || metaIsAdminFlag;

      if (isAdmin) { localStorage.setItem('is_actual_admin', 'true'); setIsActualAdmin(true); }
      else { localStorage.removeItem('is_actual_admin'); }

      if (maintenanceResult) { setIsMaintenanceMode(maintenanceResult.enabled); setMaintenanceMessage(maintenanceResult.message || ''); }
      setMaintenanceChecked(true);
      setRole(dbActiveRole);
      localStorage.setItem('active_role', dbActiveRole);

      const features = await getEnabledFeaturesForRole(dbActiveRole);
      console.log('[Features] syncUserSession loaded', dbActiveRole, [...features]);
      setEnabledFeatures(features);
      setFeaturesLoaded(true);

      // Initial state from session auth metadata`
);

// ── P12: Add cleanup return before }, [currentUserId]); ──
// The original file has no cleanup return so we add one before the closing of the useEffect
patch('P12: cleanup',
  "    fetchInitialData();\n  }, [currentUserId]);",
  `    fetchInitialData();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollInterval);
      clearInterval(featurePollInterval);
      supabase.removeChannel(featureChannel);
    };
  }, [currentUserId]);`
);

// ── P13: maintenance realtime subscription ──
patch('P13: maintenance realtime',
  "  // Separate Effect for Community Feed Realtime",
  `  // Dedicated effect: maintenance realtime subscription
  useEffect(() => {
    const maintenanceSub = supabase
      .channel('maintenance_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_settings' }, (payload: any) => {
        const row = payload.new as { enabled: boolean; message: string };
        if (row && row.enabled !== undefined) { setIsMaintenanceMode(row.enabled); setMaintenanceMessage(row.message || ''); }
      })
      .subscribe();
    return () => { supabase.removeChannel(maintenanceSub); };
  }, []);

  // Separate Effect for Community Feed Realtime`
);

// ── P14: Fix handleLogout ──
patch('P14: handleLogout',
  "    localStorage.removeItem('active_role');\n    setRole('guest');\n    setAuthorizedProRoles([]);",
  "    localStorage.removeItem('active_role');\n    localStorage.removeItem('is_actual_admin');\n    setRole('guest');\n    setAuthorizedProRoles([]);\n    setIsActualAdmin(false);"
);

// ── P15: Add maintenance/feature props to NavigationHandler usage ──
patch('P15: NavigationHandler props',
  "          handleConfirmUsername={handleConfirmUsername}\n        />",
  "          handleConfirmUsername={handleConfirmUsername}\n          isMaintenanceMode={isMaintenanceMode}\n          maintenanceChecked={maintenanceChecked}\n          maintenanceMessage={maintenanceMessage}\n          enabledFeatures={enabledFeatures}\n          featuresLoaded={featuresLoaded}\n          isActualAdmin={isActualAdmin}\n        />"
);

// ── Write result ──
// Restore CRLF for Windows
c = c.replace(/\n/g, '\r\n');
fs.writeFileSync(APP_PATH, c, 'utf8');

const lineCount = c.split('\r\n').length;
console.log(`\n✅ App.tsx written to disk (${lineCount} lines)`);
console.log(`   Patches: ${ok} succeeded, ${fail} failed\n`);

// Final verification
const checks = [
  ['import getMaintenanceStatus', c.includes('getMaintenanceStatus')],
  ['import getEnabledFeaturesForRole', c.includes('getEnabledFeaturesForRole')],
  ['import isFeatureEnabled', c.includes('isFeatureEnabled')],
  ['import MaintenanceScreen', c.includes('MaintenanceScreen')],
  ['feat() function', c.includes('const feat = (feature: string): boolean')],
  ['FeatureGate effect', c.includes('[FeatureGate]')],
  ['NavigationHandler RENDER log', c.includes('[NavigationHandler RENDER]')],
  ['enabledFeatures state', c.includes('setEnabledFeatures')],
  ['featuresLoaded state', c.includes('setFeaturesLoaded')],
  ['maintenanceChecked state', c.includes('setMaintenanceChecked')],
  ['pollFeatures', c.includes('pollFeatures')],
  ['featureChannel', c.includes('featureChannel')],
  ["feat('dashboard') sidebar", c.includes("feat('dashboard')")],
  ["feat('news') sidebar", c.includes("feat('news')")],
  ["gate /dashboard route", c.includes("path=\"/dashboard\" element={isTwoFactorPending ? <Navigate to=\"/verify-2fa\" replace /> : !feat('dashboard')")],
  ["gate /booking route", c.includes("path=\"/booking\" element={isTwoFactorPending ? <Navigate to=\"/verify-2fa\" replace /> : !feat('booking')")],
  ['isActualAdmin prop', c.includes('isActualAdmin={isActualAdmin}')],
  ['maintenance realtime', c.includes('maintenance_realtime')],
  ['handleLogout cleanup', c.includes("localStorage.removeItem('is_actual_admin')")],
  ['cleanup return', c.includes('clearInterval(pollInterval)')],
];

let allPass = true;
for (const [name, pass] of checks) {
  console.log(`  ${pass ? '✅' : '❌'} ${name}`);
  if (!pass) allPass = false;
}

if (!allPass) {
  console.error('\n⚠️  Some checks failed!');
  process.exit(1);
} else {
  console.log('\n🎉 All checks passed! App.tsx is fully patched.');
}
