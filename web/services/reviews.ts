import { supabase } from './supabase';

/**
 * Court Reviews Service
 */

/**
 * Submit a review for a court
 */
export const submitCourtReview = async (reviewData: {
    court_id: string;
    user_id: string;
    booking_id: string;
    rating: number;
    comment: string;
}) => {
    try {
        const { data, error } = await supabase
            .from('court_reviews')
            .insert([reviewData])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (err: any) {
        console.error('Error submitting court review:', err);
        return { success: false, message: err.message };
    }
};

/**
 * Get reviews for a specific court
 */
export const getCourtReviews = async (courtId: string) => {
    try {
        const { data, error } = await supabase
            .from('court_reviews')
            .select(`
                *,
                user:profiles(full_name, avatar_url)
            `)
            .eq('court_id', courtId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (err: any) {
        console.error('Error fetching court reviews:', err);
        return { success: false, message: err.message };
    }
};

/**
 * Check if a booking has already been reviewed
 */
export const hasUserReviewedBooking = async (bookingId: string, userId: string) => {
    try {
        const { data, error } = await supabase
            .from('court_reviews')
            .select('id')
            .eq('booking_id', bookingId)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        return { success: true, reviewed: !!data };
    } catch (err: any) {
        console.error('Error checking review status:', err);
        return { success: false, message: err.message };
    }
};
