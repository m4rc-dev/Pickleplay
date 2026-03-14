/**
 * Court Operation Hours Service
 *
 * Manages per-court, per-day-of-week (and date-override) operation hours.
 * Courts no longer depend solely on the Location's opening_time / closing_time.
 *
 * Priority for determining a court's hours on a given date:
 *   1. specific_date row in court_operation_hours  (highest)
 *   2. day_of_week row  in court_operation_hours
 *   3. Location opening_time / closing_time        (lowest fallback)
 */
import { supabase } from './supabase';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────
export interface CourtOperationHours {
  id: string;
  court_id: string;
  owner_id: string;
  day_of_week: number | null;    // 0=Sunday … 6=Saturday
  specific_date: string | null;  // YYYY-MM-DD
  open_time: string;             // HH:MM:SS (24h)
  close_time: string;            // HH:MM:SS (24h)
  is_closed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EffectiveHours {
  open_time: string;   // HH:MM (24h)
  close_time: string;  // HH:MM (24h)
  is_closed: boolean;
  source: 'court_date' | 'court_weekly' | 'location' | 'default';
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_OPEN = '08:00';
const DEFAULT_CLOSE = '18:00';

// ────────────────────────────────────────────────────────────────
// CRUD Operations
// ────────────────────────────────────────────────────────────────

/** Fetch all operation hour entries for a court */
export async function fetchCourtOperationHours(courtId: string): Promise<CourtOperationHours[]> {
  const { data, error } = await supabase
    .from('court_operation_hours')
    .select('*')
    .eq('court_id', courtId)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true });

  if (error) {
    console.error('Error fetching court operation hours:', error);
    return [];
  }
  return data || [];
}

/** Save/upsert operation hours for a single day of week */
export async function saveCourtDayHours(
  courtId: string,
  ownerId: string,
  dayOfWeek: number,
  openTime: string,
  closeTime: string,
  isClosed: boolean = false
): Promise<{ success: boolean; error?: string }> {
  // Check if entry already exists
  const { data: existing } = await supabase
    .from('court_operation_hours')
    .select('id')
    .eq('court_id', courtId)
    .eq('day_of_week', dayOfWeek)
    .is('specific_date', null)
    .maybeSingle();

  const payload = {
    court_id: courtId,
    owner_id: ownerId,
    day_of_week: dayOfWeek,
    specific_date: null,
    open_time: openTime + ':00',
    close_time: closeTime + ':00',
    is_closed: isClosed,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabase
      .from('court_operation_hours')
      .update(payload)
      .eq('id', existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase
      .from('court_operation_hours')
      .insert(payload);
    if (error) return { success: false, error: error.message };
  }

  return { success: true };
}

/** Save operation hours for ALL 7 days at once (bulk upsert) */
export async function saveAllDayHours(
  courtId: string,
  ownerId: string,
  schedule: Array<{
    dayOfWeek: number;
    openTime: string;   // HH:MM
    closeTime: string;  // HH:MM
    isClosed: boolean;
  }>
): Promise<{ success: boolean; error?: string }> {
  // Delete existing weekly entries for this court
  const { error: deleteError } = await supabase
    .from('court_operation_hours')
    .delete()
    .eq('court_id', courtId)
    .not('day_of_week', 'is', null);

  if (deleteError) return { success: false, error: deleteError.message };

  // Insert all 7 days
  const rows = schedule.map(s => ({
    court_id: courtId,
    owner_id: ownerId,
    day_of_week: s.dayOfWeek,
    specific_date: null,
    open_time: s.openTime + ':00',
    close_time: s.closeTime + ':00',
    is_closed: s.isClosed,
    is_active: true,
    updated_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabase
    .from('court_operation_hours')
    .insert(rows);

  if (insertError) return { success: false, error: insertError.message };
  return { success: true };
}

/** Save a date-specific override */
export async function saveDateOverrideHours(
  courtId: string,
  ownerId: string,
  dateStr: string,
  openTime: string,
  closeTime: string,
  isClosed: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const { data: existing } = await supabase
    .from('court_operation_hours')
    .select('id')
    .eq('court_id', courtId)
    .eq('specific_date', dateStr)
    .is('day_of_week', null)
    .maybeSingle();

  const payload = {
    court_id: courtId,
    owner_id: ownerId,
    day_of_week: null,
    specific_date: dateStr,
    open_time: openTime + ':00',
    close_time: closeTime + ':00',
    is_closed: isClosed,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabase
      .from('court_operation_hours')
      .update(payload)
      .eq('id', existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase
      .from('court_operation_hours')
      .insert(payload);
    if (error) return { success: false, error: error.message };
  }

  return { success: true };
}

/** Delete an operation hours entry */
export async function deleteCourtHoursEntry(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('court_operation_hours')
    .delete()
    .eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ────────────────────────────────────────────────────────────────
// Resolution: Get effective hours for a court on a given date
// ────────────────────────────────────────────────────────────────

/**
 * Determine the effective operation hours for a court on a specific date.
 *
 * Resolution priority:
 *  1. Date-specific override in court_operation_hours
 *  2. Day-of-week entry in court_operation_hours
 *  3. Location opening_time / closing_time
 *  4. Default 08:00 – 18:00
 */
export async function getEffectiveHours(
  courtId: string,
  dateStr: string,
  locationOpenTime?: string,
  locationCloseTime?: string,
  cachedHours?: CourtOperationHours[]
): Promise<EffectiveHours> {
  const hours = cachedHours ?? await fetchCourtOperationHours(courtId);

  // 1. Date-specific override
  const dateMatch = hours.find(h => h.specific_date === dateStr);
  if (dateMatch) {
    return {
      open_time: dateMatch.open_time.slice(0, 5),
      close_time: dateMatch.close_time.slice(0, 5),
      is_closed: dateMatch.is_closed,
      source: 'court_date',
    };
  }

  // 2. Day-of-week entry
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dow = dateObj.getDay();
  const dowMatch = hours.find(h => h.day_of_week === dow && h.specific_date === null);
  if (dowMatch) {
    return {
      open_time: dowMatch.open_time.slice(0, 5),
      close_time: dowMatch.close_time.slice(0, 5),
      is_closed: dowMatch.is_closed,
      source: 'court_weekly',
    };
  }

  // 3. Location fallback
  if (locationOpenTime && locationCloseTime) {
    return {
      open_time: locationOpenTime,
      close_time: locationCloseTime,
      is_closed: false,
      source: 'location',
    };
  }

  // 4. Hardcoded default
  return {
    open_time: DEFAULT_OPEN,
    close_time: DEFAULT_CLOSE,
    is_closed: false,
    source: 'default',
  };
}

/**
 * Batch fetch effective hours for every day of a week (Sun–Sat)
 * for the current week starting from a reference date.
 * Returns a map: dayOfWeek → EffectiveHours
 */
export async function getWeeklyEffectiveHours(
  courtId: string,
  locationOpenTime?: string,
  locationCloseTime?: string
): Promise<Map<number, EffectiveHours>> {
  const hours = await fetchCourtOperationHours(courtId);
  const result = new Map<number, EffectiveHours>();

  for (let dow = 0; dow <= 6; dow++) {
    const match = hours.find(h => h.day_of_week === dow && h.specific_date === null);
    if (match) {
      result.set(dow, {
        open_time: match.open_time.slice(0, 5),
        close_time: match.close_time.slice(0, 5),
        is_closed: match.is_closed,
        source: 'court_weekly',
      });
    } else if (locationOpenTime && locationCloseTime) {
      result.set(dow, {
        open_time: locationOpenTime,
        close_time: locationCloseTime,
        is_closed: false,
        source: 'location',
      });
    } else {
      result.set(dow, {
        open_time: DEFAULT_OPEN,
        close_time: DEFAULT_CLOSE,
        is_closed: false,
        source: 'default',
      });
    }
  }

  return result;
}
