import { supabase } from './supabase';

// ─── Philippine Time Helper ───
const PH_TIMEZONE = 'Asia/Manila';
const toPhDateStr = (date: Date): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: PH_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
  return formatter.format(date);
};

/**
 * Check if a player has already booked for a given date at a specific court location
 * (1 booking per day per court location rule).
 * Uses Philippine Time (Asia/Manila) for date validation.
 * FAIL-CLOSED: if the query errors, booking is blocked for safety.
 *
 * @param locationId — the location to scope the limit to.
 *   When provided, the player is limited to 1 booking/day at courts belonging to this location.
 *   When omitted (legacy fallback), checks across ALL courts (stricter).
 */
export const checkDailyBookingLimit = async (
  playerId: string,
  date: string, // 'YYYY-MM-DD' in Philippine Time
  locationId?: string
): Promise<{ hasReachedLimit: boolean; totalHoursBooked: number; bookings: any[] }> => {
  try {
    console.log('[DailyLimit] Checking for player:', playerId, 'date (PH):', date, 'locationId:', locationId || 'ALL');

    // Fetch all non-cancelled bookings for this player on the given date,
    // joining to courts to get each booking's location_id.
    const { data: existingBookings, error } = await supabase
      .from('bookings')
      .select('id, court_id, start_time, end_time, status, courts!inner(location_id)')
      .eq('player_id', playerId)
      .eq('date', date)
      .neq('status', 'cancelled');

    if (error) {
      console.error('[DailyLimit] Query error — BLOCKING booking as safety measure:', error);
      return { hasReachedLimit: true, totalHoursBooked: 0, bookings: [] };
    }

    let bookings = existingBookings || [];

    // If a locationId is provided, only count bookings whose court belongs to that location
    if (locationId) {
      bookings = bookings.filter((b: any) => {
        const courtLocationId = b.courts?.location_id;
        return courtLocationId === locationId;
      });
    }

    const totalHoursBooked = bookings.length;

    console.log('[DailyLimit] Found', totalHoursBooked, 'existing booking(s) for this date at location:', locationId || 'ALL', bookings.map((b: any) => b.id));

    return {
      hasReachedLimit: totalHoursBooked >= 1,
      totalHoursBooked,
      bookings
    };
  } catch (err: any) {
    console.error('[DailyLimit] Exception — BLOCKING booking as safety measure:', err);
    return { hasReachedLimit: true, totalHoursBooked: 0, bookings: [] };
  }
};

/**
 * Automatically cancel bookings that are past their check-in time and haven't been checked in
 * This helps free up slots for other players
 */
export const autoCancelLateBookings = async (): Promise<{ cancelled: number; error?: string }> => {
    try {
        // Use Philippine Time for date/time calculations
        const nowUtc = new Date();
        const phStr = nowUtc.toLocaleString('en-US', { timeZone: PH_TIMEZONE });
        const nowPH = new Date(phStr);
        const todayStr = toPhDateStr(nowUtc);
        const currentTimeStr = `${nowPH.getHours().toString().padStart(2, '0')}:${nowPH.getMinutes().toString().padStart(2, '0')}:00`;

        // Find all pending bookings for today that have passed their start time by 15+ minutes
        const { data: lateBookings, error: fetchError } = await supabase
            .from('bookings')
            .select('id, start_time, court_id, player_id')
            .eq('date', todayStr)
            .eq('status', 'pending')
            .lt('start_time', currentTimeStr);

        if (fetchError) {
            console.error('Error fetching late bookings:', fetchError);
            return { cancelled: 0, error: fetchError.message };
        }

        if (!lateBookings || lateBookings.length === 0) {
            return { cancelled: 0 };
        }

        // Filter to only include bookings that are 15+ minutes late
        const fifteenMinutesAgo = new Date(nowPH.getTime() - 15 * 60 * 1000);
        const lateBookingsToCancel = lateBookings.filter(booking => {
            const [hours, minutes] = booking.start_time.split(':').map(Number);
            const bookingTime = new Date(nowPH);
            bookingTime.setHours(hours, minutes, 0, 0);
            return bookingTime <= fifteenMinutesAgo;
        });

        if (lateBookingsToCancel.length === 0) {
            return { cancelled: 0 };
        }

        // Cancel these bookings
        const { error: cancelError } = await supabase
            .from('bookings')
            .update({ status: 'cancelled', cancelled_reason: 'auto_cancelled_no_show' })
            .in('id', lateBookingsToCancel.map(b => b.id));

        if (cancelError) {
            console.error('Error cancelling late bookings:', cancelError);
            return { cancelled: 0, error: cancelError.message };
        }

        console.log(`Auto-cancelled ${lateBookingsToCancel.length} late bookings`);
        return { cancelled: lateBookingsToCancel.length };
    } catch (err: any) {
        console.error('Error in autoCancelLateBookings:', err);
        return { cancelled: 0, error: err.message };
    }
};
