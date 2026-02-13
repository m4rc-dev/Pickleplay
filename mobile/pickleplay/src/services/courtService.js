import { supabase } from '../lib/supabase';

/**
 * Court Service
 * Handles all court-related database operations
 */

/**
 * Get all courts with optional filters
 */
export const getCourts = async (filters = {}) => {
  try {
    let query = supabase
      .from('courts')
      .select(`
        *,
        location:location_id (
          id,
          name,
          address,
          city,
          state,
          postal_code,
          latitude,
          longitude,
          amenities,
          phone
        ),
        court_reviews (
          rating
        )
      `)
      .eq('is_active', true);

    // Apply filters
    if (filters.city) {
      query = query.ilike('location.city', `%${filters.city}%`);
    }
    if (filters.courtType) {
      query = query.eq('court_type', filters.courtType);
    }
    if (filters.surfaceType) {
      query = query.eq('surface_type', filters.surfaceType);
    }

    // Ordering
    query = query.order('name', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    // Calculate average rating for each court
    const courtsWithRatings = data?.map(court => {
      const reviews = court.court_reviews || [];
      const avgRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
        : 0;

      return {
        ...court,
        rating: parseFloat(avgRating),
        reviewCount: reviews.length,
      };
    });

    return { data: courtsWithRatings, error: null };
  } catch (err) {
    console.error('Error fetching courts:', err);
    return { data: null, error: err };
  }
};

/**
 * Get court by ID
 */
export const getCourtById = async (courtId) => {
  try {
    const { data, error } = await supabase
      .from('courts')
      .select(`
        *,
        location:location_id (
          id,
          name,
          address,
          city,
          state,
          postal_code,
          latitude,
          longitude,
          amenities,
          phone
        ),
        court_reviews (
          *,
          user:user_id (
            id,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('id', courtId)
      .single();

    if (error) throw error;

    // Calculate average rating
    const reviews = data.court_reviews || [];
    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
      : 0;

    return {
      data: {
        ...data,
        rating: parseFloat(avgRating),
        reviewCount: reviews.length,
      },
      error: null
    };
  } catch (err) {
    console.error('Error fetching court:', err);
    return { data: null, error: err };
  }
};

/**
 * Get nearby courts based on coordinates
 */
export const getNearbyCourts = async (latitude, longitude, radiusKm = 10) => {
  try {
    // Query courts with location data
    const { data, error } = await supabase
      .from('courts')
      .select(`
        *,
        location:location_id (
          id,
          name,
          address,
          city,
          state,
          latitude,
          longitude
        )
      `)
      .eq('is_active', true);

    if (error) throw error;

    // Calculate distance and filter
    const courtsWithDistance = data
      .filter(court => court.location?.latitude && court.location?.longitude)
      .map(court => ({
        ...court,
        distance: calculateDistance(latitude, longitude, court.location.latitude, court.location.longitude),
      }))
      .filter(court => court.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    return { data: courtsWithDistance, error: null };
  } catch (err) {
    console.error('Error fetching nearby courts:', err);
    return { data: null, error: err };
  }
};

/**
 * Search courts by name or location
 */
export const searchCourts = async (searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('courts')
      .select(`
        *,
        location:location_id (
          id,
          name,
          address,
          city,
          state
        )
      `)
      .eq('is_active', true)
      .or(`name.ilike.%${searchTerm}%`)
      .order('name');

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error searching courts:', err);
    return { data: null, error: err };
  }
};

/**
 * Get court availability for a specific date
 */
export const getCourtAvailability = async (courtId, date) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('court_id', courtId)
      .eq('booking_date', date)
      .in('status', ['confirmed', 'pending']);

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching court availability:', err);
    return { data: null, error: err };
  }
};

/**
 * Get user's completed bookings for a specific court
 */
export const getUserCourtBookings = async (userId, courtId) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .eq('court_id', courtId)
      .eq('status', 'completed')
      .order('booking_date', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching user court bookings:', err);
    return { data: null, error: err };
  }
};

/**
 * Add a review for a court
 */
export const addCourtReview = async (courtId, userId, rating, comment, bookingId = null) => {
  try {
    const reviewData = {
      court_id: courtId,
      user_id: userId,
      rating: rating,
      comment: comment,
      created_at: new Date().toISOString(),
    };

    // Only add booking_id if provided
    if (bookingId) {
      reviewData.booking_id = bookingId;
    }

    const { data, error } = await supabase
      .from('court_reviews')
      .insert([reviewData])
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error adding court review:', err);
    return { data: null, error: err };
  }
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg) => deg * (Math.PI / 180);

export default {
  getCourts,
  getCourtById,
  getNearbyCourts,
  searchCourts,
  getCourtAvailability,
  getUserCourtBookings,
  addCourtReview,
};
