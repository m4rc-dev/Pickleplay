import { supabase } from './supabase';

/**
 * Automatically cancels late bookings (confirmed but not checked in within 10 minutes of start time)
 * This is a "Lazy Update" pattern called when viewing bookings or checking availability.
 */
export const autoCancelLateBookings = async () => {
    try {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];

        // Calculate 10 minutes ago to find bookings whose start time was >10 mins ago
        const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);
        const hours = tenMinsAgo.getHours().toString().padStart(2, '0');
        const minutes = tenMinsAgo.getMinutes().toString().padStart(2, '0');
        const timeLimitStr = `${hours}:${minutes}:00`;

        console.log(`Checking for late bookings before ${timeLimitStr} on ${dateStr}`);

        // 1. Find confirmend bookings that are late and not checked in
        const { data: lateBookings, error: findError } = await supabase
            .from('bookings')
            .select('id')
            .eq('date', dateStr)
            .eq('status', 'confirmed')
            .is('checked_in_at', null)
            .lt('start_time', timeLimitStr);

        if (findError) throw findError;

        if (!lateBookings || lateBookings.length === 0) {
            return { success: true, count: 0 };
        }

        const idsToCancel = lateBookings.map(b => b.id);
        console.log(`Auto-cancelling ${idsToCancel.length} late bookings:`, idsToCancel);

        // 2. Perform the update
        const { error: updateError } = await supabase
            .from('bookings')
            .update({
                status: 'cancelled',
                // Optional: add a note or cancellation reason if the schema allows
            })
            .in('id', idsToCancel);

        if (updateError) throw updateError;

        return { success: true, count: idsToCancel.length };
    } catch (err) {
        console.error('Error in autoCancelLateBookings:', err);
        return { success: false, error: err };
    }
};
