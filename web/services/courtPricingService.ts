/**
 * Court Pricing Service
 * 
 * Fetches time-based pricing rules for courts from the court_pricing_rules table.
 * Falls back to the court's base_price when no specific pricing rule exists.
 * 
 * Priority: specific_date rules > day_of_week rules for today > 
 *           any rule matching time range > min rule price > base_price
 * 
 * All date calculations use Philippine Time (Asia/Manila).
 */
import { supabase } from './supabase';

const PH_TIMEZONE = 'Asia/Manila';

/** Get current date string in PH timezone as YYYY-MM-DD */
function toPhDateStr(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PH_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // 'YYYY-MM-DD'
}

/** Get day-of-week (0=Sun) for a YYYY-MM-DD string, in PH timezone */
function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Create a date at noon UTC to avoid any timezone edge cases
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  // Get the day in PH timezone
  const phDayStr = new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TIMEZONE,
    weekday: 'short',
  }).format(dateObj);
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return dayMap[phDayStr] ?? dateObj.getUTCDay();
}

export interface PricingRule {
  id: string;
  court_id: string;
  specific_date: string | null;
  day_of_week: number | null;
  start_time: string; // HH:MM:SS
  end_time: string;   // HH:MM:SS
  price_per_hour: number;
  label: string | null;
  is_active: boolean;
}

/**
 * Converts a 12-hour slot string like "08:00 AM" to 24-hour "HH:MM:SS" format
 */
export function slotTo24h(slot: string): string {
  const [time, period] = slot.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  else if (period === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
}

/**
 * Fetches all active pricing rules for a court.
 * Cache this per court per session to avoid repeated DB calls.
 */
export async function fetchCourtPricingRules(courtId: string): Promise<PricingRule[]> {
  const { data, error } = await supabase
    .from('court_pricing_rules')
    .select('*')
    .eq('court_id', courtId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching court pricing rules:', error);
    return [];
  }
  return data || [];
}

/**
 * Get the applicable price for a court at a specific date and time slot.
 * Uses Philippine Time for all date/day-of-week calculations.
 * 
 * Lookup order:
 *  1. specific_date rule for this exact date + time range
 *  2. day_of_week rule for this day + time range
 *  3. ANY rule (any day/date) whose time range covers this slot
 *  4. Minimum rule price (court has pricing but slot falls outside all time ranges)
 *  5. base_price fallback (only when zero rules exist)
 */
export async function getSlotPrice(
  courtId: string,
  dateStr: string,
  slotTime: string,
  basePricePerHour: number,
  cachedRules?: PricingRule[]
): Promise<number> {
  const rules = cachedRules ?? await fetchCourtPricingRules(courtId);
  if (rules.length === 0) return basePricePerHour;

  // Convert slot to 24h for comparison
  const time24 = slotTime.includes(' ') ? slotTo24h(slotTime) : slotTime;

  // Get day of week using PH timezone
  const dayOfWeek = getDayOfWeek(dateStr);

  // 1. Specific-date rules for THIS exact date (highest priority)
  const dateRules = rules.filter(r => r.specific_date === dateStr);
  for (const rule of dateRules) {
    if (isTimeInRange(time24, rule.start_time, rule.end_time)) {
      return rule.price_per_hour;
    }
  }

  // 2. Day-of-week rules matching THIS day
  const dowRules = rules.filter(r => r.day_of_week === dayOfWeek && r.specific_date === null);
  for (const rule of dowRules) {
    if (isTimeInRange(time24, rule.start_time, rule.end_time)) {
      return rule.price_per_hour;
    }
  }

  // 3. ANY rule whose time range covers this slot (cross-day / cross-date fallback).
  //    Check day-of-week rules from other days first, then date-specific rules.
  const otherDowRules = rules.filter(r => r.day_of_week !== null && r.day_of_week !== dayOfWeek && r.specific_date === null);
  for (const rule of otherDowRules) {
    if (isTimeInRange(time24, rule.start_time, rule.end_time)) {
      return rule.price_per_hour;
    }
  }
  const otherDateRules = rules.filter(r => r.specific_date !== null && r.specific_date !== dateStr);
  for (const rule of otherDateRules) {
    if (isTimeInRange(time24, rule.start_time, rule.end_time)) {
      return rule.price_per_hour;
    }
  }

  // 4. Slot falls outside all time ranges — use minimum rule price as effective rate
  return Math.min(...rules.map(r => r.price_per_hour));
}

/**
 * Get prices for all slots at once (batch lookup).
 * Returns a Map from slot string to price.
 */
export async function getSlotPrices(
  courtId: string,
  dateStr: string,
  slots: string[],
  basePricePerHour: number
): Promise<Map<string, number>> {
  const rules = await fetchCourtPricingRules(courtId);
  const priceMap = new Map<string, number>();

  for (const slot of slots) {
    const price = await getSlotPrice(courtId, dateStr, slot, basePricePerHour, rules);
    priceMap.set(slot, price);
  }

  return priceMap;
}

/**
 * Check if a time (HH:MM:SS) falls within a range [start, end).
 */
function isTimeInRange(time: string, rangeStart: string, rangeEnd: string): boolean {
  const t = timeToMinutes(time);
  const s = timeToMinutes(rangeStart);
  const e = timeToMinutes(rangeEnd);

  // Normal range (e.g., 08:00 to 17:00)
  if (s < e) {
    return t >= s && t < e;
  }
  // Overnight range (e.g., 22:00 to 06:00) — unlikely but handled
  return t >= s || t < e;
}

function timeToMinutes(time: string): number {
  const parts = time.split(':').map(Number);
  return parts[0] * 60 + (parts[1] || 0);
}
