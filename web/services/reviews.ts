import { supabase } from './supabase';

export interface CourtReview {
    id: string;
    court_id: string;
    user_id: string;
    booking_id?: string;
    rating: number;
    title?: string;
    comment?: string;
    created_at: string;
    user?: {
        username?: string;
        full_name?: string;
        avatar_url?: string;
    };
}

/**
 * Get all reviews for a specific court
 */
export const getCourtReviews = async (courtId: string): Promise<{ data: CourtReview[] | null; error: any }> => {
    try {
        const { data, error } = await supabase
            .from('court_reviews')
            .select(`
        *,
        profiles:user_id (
          username,
          full_name,
          avatar_url
        )
      `)
            .eq('court_id', courtId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform the data to flatten the user profile
        const reviews = (data || []).map((review: any) => ({
            ...review,
            user: review.profiles
        }));

        return { data: reviews, error: null };
    } catch (err: any) {
        // Silently handle missing table errors
        if (err?.code !== '42P01' && err?.message?.indexOf('does not exist') === -1) {
            console.error('Error fetching court reviews:', err);
        }
        return { data: null, error: err };
    }
};

/**
 * Submit a new court review
 */
export const submitCourtReview = async (
    courtId: string,
    userId: string,
    rating: number,
    comment?: string,
    title?: string,
    bookingId?: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('court_reviews')
            .insert({
                court_id: courtId,
                user_id: userId,
                booking_id: bookingId,
                rating,
                title,
                comment
            });

        if (error) throw error;

        return { success: true };
    } catch (err: any) {
        // Silently handle missing table errors
        if (err?.code !== '42P01' && err?.message?.indexOf('does not exist') === -1) {
            console.error('Error submitting review:', err);
        }
        return { success: false, error: err.message };
    }
};

/**
 * Check if user has already reviewed a specific booking
 */
export const hasUserReviewedBooking = async (bookingId: string, userId: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase
            .from('court_reviews')
            .select('id')
            .eq('booking_id', bookingId)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;

        return !!data;
    } catch (err: any) {
        // Silently handle missing table errors
        if (err?.code !== '42P01' && err?.message?.indexOf('does not exist') === -1) {
            console.error('Error checking review status:', err);
        }
        return false;
    }
};

/**
 * Get average rating for a court
 */
export const getCourtAverageRating = async (courtId: string): Promise<{ average: number; count: number }> => {
    try {
        const { data, error } = await supabase
            .from('court_reviews')
            .select('rating')
            .eq('court_id', courtId);

        if (error) throw error;

        if (!data || data.length === 0) {
            return { average: 0, count: 0 };
        }

        const sum = data.reduce((acc, review) => acc + review.rating, 0);
        return { average: Math.round((sum / data.length) * 10) / 10, count: data.length };
    } catch (err: any) {
        // Silently handle missing table errors
        if (err?.code !== '42P01' && err?.message?.indexOf('does not exist') === -1) {
            console.error('Error getting average rating:', err);
        }
        return { average: 0, count: 0 };
    }
};
