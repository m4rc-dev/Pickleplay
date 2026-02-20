import { supabase } from './supabase';
import type { UserRole } from '../types';

// ── Maintenance Settings ─────────────────────────────────────────────────────

export interface MaintenanceSettings {
  id: string;
  enabled: boolean;
  message: string;
  updated_at: string;
  updated_by: string | null;
}

export const getMaintenanceStatus = async (): Promise<MaintenanceSettings | null> => {
  const { data, error } = await supabase
    .from('maintenance_settings')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.warn('Failed to fetch maintenance settings:', error.message);
    return null;
  }
  return data as MaintenanceSettings;
};

export const updateMaintenanceStatus = async (
  enabled: boolean,
  message: string
): Promise<{ success: boolean; error?: string }> => {
  const { data: { user } } = await supabase.auth.getUser();

  // Try to get existing row id
  const { data: existing } = await supabase
    .from('maintenance_settings')
    .select('id')
    .limit(1)
    .single();

  if (existing?.id) {
    // Update existing row
    const { error } = await supabase
      .from('maintenance_settings')
      .update({
        enabled,
        message,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null,
      })
      .eq('id', existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    // Insert first row (table exists but no seed row yet)
    const { error } = await supabase
      .from('maintenance_settings')
      .insert({
        enabled,
        message,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null,
      });
    if (error) return { success: false, error: error.message };
  }

  return { success: true };
};


// ── Role-Based Feature Access ────────────────────────────────────────────────

export interface FeatureAccess {
  role: string;
  feature: string;
  is_enabled: boolean;
}

/**
 * Fetch all feature access settings.
 * Returns a flat array of { role, feature, is_enabled }.
 */
export const getAllFeatureAccess = async (): Promise<FeatureAccess[]> => {
  const { data, error } = await supabase
    .from('role_feature_access')
    .select('role, feature, is_enabled')
    .order('role')
    .order('feature');

  if (error) {
    console.warn('Failed to fetch feature access:', error.message);
    return [];
  }
  return (data || []) as FeatureAccess[];
};

/**
 * Fetch enabled features for a specific role.
 * Returns a Set<string> of feature names that are enabled.
 * '*' means "allow all" (fail-open) — enforcement skips when this is returned.
 */
export const getEnabledFeaturesForRole = async (role: UserRole): Promise<Set<string>> => {
  if (role === 'ADMIN') return new Set(['*']);

  try {
    // Fetch ALL rows for this specific role
    const { data, error } = await supabase
      .from('role_feature_access')
      .select('feature, is_enabled')
      .eq('role', role);

    if (error) {
      console.warn('Failed to fetch features for role:', error.message);
      return new Set(); // Fail-closed on DB error
    }

    // No rows for this role at all → table not seeded for this role → fail-closed
    if (!data || data.length === 0) {
      console.info(`No feature rows for role "${role}", failing closed.`);
      return new Set();
    }

    // We have rows — return only the enabled ones (admin may have disabled some)
    const enabled = new Set(
      data.filter((d: any) => d.is_enabled).map((d: any) => d.feature as string)
    );
    console.log(`[Features] Loaded for ${role}:`, [...enabled]);
    return enabled;
  } catch (e) {
    console.warn('Unexpected error in getEnabledFeaturesForRole:', e);
    return new Set();
  }
};

/**
 * Toggle a single feature for a role.
 * Uses upsert so it works even if the row doesn't exist yet.
 */
export const toggleFeatureAccess = async (
  role: string,
  feature: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('role_feature_access')
    .upsert(
      { role, feature, is_enabled: enabled, updated_at: new Date().toISOString() },
      { onConflict: 'role,feature' }
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
};

/**
 * Bulk-update all features for a role at once (e.g., enable all / disable all).
 * Uses upsert so it works even if rows don't exist yet.
 */
export const setAllFeaturesForRole = async (
  role: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> => {
  const roleFeatures = DEFAULT_FEATURES_PER_ROLE[role] || [];
  if (roleFeatures.length === 0) {
    return { success: false, error: 'No features defined for this role' };
  }

  // Upsert each feature for this role
  const rows = roleFeatures.map(feature => ({
    role,
    feature,
    is_enabled: enabled,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('role_feature_access')
    .upsert(rows, { onConflict: 'role,feature' });

  if (error) return { success: false, error: error.message };
  return { success: true };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert the flat array into a map: role -> feature -> enabled */
export const buildAccessMatrix = (
  accessList: FeatureAccess[]
): Record<string, Record<string, boolean>> => {
  const matrix: Record<string, Record<string, boolean>> = {};
  for (const item of accessList) {
    if (!matrix[item.role]) matrix[item.role] = {};
    matrix[item.role][item.feature] = item.is_enabled;
  }
  return matrix;
};

/** Checks if a feature is accessible for a given role (admin always true) */
export const isFeatureEnabled = (
  enabledFeatures: Set<string>,
  feature: string,
  role: UserRole
): boolean => {
  if (role === 'ADMIN') return true;
  // Guests use '*' to see public surfaces
  if (role === 'guest' && enabledFeatures.has('*')) return true;
  return enabledFeatures.has(feature);
};

/** All manageable features with labels */
export const ALL_FEATURES: { key: string; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard / Overview' },
  { key: 'booking', label: 'Book Courts' },
  { key: 'messages', label: 'Messages' },
  { key: 'tournaments', label: 'Tournaments' },
  { key: 'guides', label: 'Guides & Quizzes' },
  { key: 'teams', label: 'Squads / Teams' },
  { key: 'partners', label: 'Find Partners' },
  { key: 'coaches', label: 'Find a Coach' },
  { key: 'community', label: 'Community Hub' },
  { key: 'news', label: 'Newsfeed' },
  { key: 'shop', label: 'Pro Shop' },
  { key: 'profile', label: 'Profile' },
  { key: 'rankings', label: 'Rankings' },
  { key: 'academy', label: 'Academy' },
  { key: 'students', label: 'My Students' },
  { key: 'clinics', label: 'Manage Clinics' },
  { key: 'schedule', label: 'Lesson Schedule' },
  { key: 'locations', label: 'My Locations' },
  { key: 'bookings-admin', label: 'Court Bookings' },
  { key: 'court-calendar', label: 'Court Events Calendar' },
  { key: 'tournaments-admin', label: 'Manage Tournaments' },
  { key: 'revenue', label: 'Revenue Analytics' },
  { key: 'court-policies', label: 'Court Policies' },
];

/** Roles that appear in the access matrix (admin excluded) */
export const MANAGEABLE_ROLES: { key: UserRole; label: string }[] = [
  { key: 'PLAYER', label: 'Player' },
  { key: 'COACH', label: 'Coach' },
  { key: 'COURT_OWNER', label: 'Court Owner' },
  { key: 'CUSTOMER', label: 'Customer' },
];

/** Default features per role (mirrors the migration seed data) */
export const DEFAULT_FEATURES_PER_ROLE: Record<string, string[]> = {
  PLAYER: ['booking', 'messages', 'tournaments', 'guides', 'teams', 'partners', 'coaches', 'community', 'dashboard', 'news', 'shop', 'profile', 'rankings', 'academy'],
  COACH: ['dashboard', 'students', 'clinics', 'schedule', 'teams', 'news', 'shop', 'profile', 'tournaments', 'community'],
  COURT_OWNER: ['dashboard', 'locations', 'bookings-admin', 'court-calendar', 'tournaments-admin', 'revenue', 'court-policies', 'news', 'shop', 'profile', 'teams'],
  CUSTOMER: ['booking', 'dashboard', 'news', 'shop', 'profile', 'tournaments', 'community'],
};
