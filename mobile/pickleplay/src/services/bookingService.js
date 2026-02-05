import { supabase } from '../lib/supabase';

/**
 * Booking Service
 * Handles all booking-related database operations
 */

/**
 * Create a new booking
 */
export const createBooking = async (bookingData) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        court_id: bookingData.courtId,
        booking_date: bookingData.date,
        start_time: bookingData.startTime,
        end_time: bookingData.endTime,
        total_amount: bookingData.totalAmount,
        status: 'pending',
        notes: bookingData.notes || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error creating booking:', err);
    return { data: null, error: err };
  }
};

/**
 * Get user's bookings
 */
export const getUserBookings = async (status = null) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('bookings')
      .select(`
        *,
        court:courts (
          id,
          name,
          address,
          city,
          image_url
        )
      `)
      .eq('user_id', user.id)
      .order('booking_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching bookings:', err);
    return { data: null, error: err };
  }
};

/**
 * Get upcoming bookings
 */
export const getUpcomingBookings = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Not authenticated');

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        court:courts (
          id,
          name,
          address,
          city,
          image_url
        )
      `)
      .eq('user_id', user.id)
      .gte('booking_date', today)
      .in('status', ['confirmed', 'pending'])
      .order('booking_date', { ascending: true })
      .limit(5);

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching upcoming bookings:', err);
    return { data: null, error: err };
  }
};

/**
 * Get booking by ID
 */
export const getBookingById = async (bookingId) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        court:courts (*)
      `)
      .eq('id', bookingId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching booking:', err);
    return { data: null, error: err };
  }
};

/**
 * Cancel a booking
 */
export const cancelBooking = async (bookingId) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error cancelling booking:', err);
    return { data: null, error: err };
  }
};

/**
 * Update booking status
 */
export const updateBookingStatus = async (bookingId, status) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error updating booking status:', err);
    return { data: null, error: err };
  }
};

export default {
  createBooking,
  getUserBookings,
  getUpcomingBookings,
  getBookingById,
  cancelBooking,
  updateBookingStatus,
};
