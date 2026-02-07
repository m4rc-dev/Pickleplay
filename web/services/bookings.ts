import { supabase } from './supabase';

/**
 * Automatically cancel bookings that are past their check-in time and haven't been checked in
 * This helps free up slots for other players
 */
export const autoCancelLateBookings = async (): Promise<{ cancelled: number; error?: string }> => {
    try {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

        // Find all pending bookings for today that have passed their start time by 15+ minutes
        const { data: lateBookings, error: fetchError } = await supabase
            .from('bookings')
            .select('id, start_time, court_id, player_id')
            .eq('date', todayStr)
            .eq('status', 'pending')
            .eq('is_checked_in', false)
            .lt('start_time', currentTimeStr);

        if (fetchError) {
            console.error('Error fetching late bookings:', fetchError);
            return { cancelled: 0, error: fetchError.message };
        }

        if (!lateBookings || lateBookings.length === 0) {
            return { cancelled: 0 };
        }

        // Filter to only include bookings that are 15+ minutes late
        const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
        const lateBookingsToCancel = lateBookings.filter(booking => {
            const [hours, minutes] = booking.start_time.split(':').map(Number);
            const bookingTime = new Date(now);
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
