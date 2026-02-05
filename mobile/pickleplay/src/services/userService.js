import { supabase } from '../lib/supabase';

/**
 * User/Profile Service
 * Handles all user-related database operations (CRUD)
 */

// ==================== CREATE ====================

/**
 * Create user profile in users table after registration
 */
export const createUserProfile = async (userId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: profileData.email,
        full_name: profileData.full_name || null,
        roles: profileData.roles || ['PLAYER'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error creating user profile:', err);
    return { data: null, error: err };
  }
};

/**
 * Create or update user profile (upsert)
 */
export const upsertUserProfile = async (userId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error upserting user profile:', err);
    return { data: null, error: err };
  }
};

// ==================== READ ====================

/**
 * Get user profile by ID
 */
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return { data: null, error: err };
  }
};

/**
 * Get current user's profile
 */
export const getCurrentUserProfile = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching current user profile:', err);
    return { data: null, error: err };
  }
};

/**
 * Get user profile with related data (player profile, preferences, statistics)
 */
export const getFullUserProfile = async (userId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    
    const targetUserId = userId || user?.id;
    if (!targetUserId) throw new Error('No user ID provided');

    // Fetch user from profiles table
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single();

    // Fetch player profile
    const { data: playerProfile } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    // Fetch user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    // Fetch user statistics
    const { data: statistics } = await supabase
      .from('user_statistics')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    return {
      data: {
        ...userData,
        player_profile: playerProfile,
        preferences: preferences,
        statistics: statistics,
      },
      error: null,
    };
  } catch (err) {
    console.error('Error fetching full user profile:', err);
    return { data: null, error: err };
  }
};

// ==================== UPDATE ====================

/**
 * Update user profile
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error updating user profile:', err);
    return { data: null, error: err };
  }
};

/**
 * Update user auth metadata
 */
export const updateUserAuthMetadata = async (updates) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: updates,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error updating user auth metadata:', err);
    return { data: null, error: err };
  }
};

// ==================== DELETE ====================

/**
 * Delete user account (soft delete - sets status to inactive)
 */
export const deactivateUserAccount = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error deactivating user account:', err);
    return { data: null, error: err };
  }
};

/**
 * Delete user account permanently
 * Note: This requires admin privileges or a Supabase Edge Function
 */
export const deleteUserAccount = async () => {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Not authenticated');

    // Delete from profiles table first
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (deleteError) throw deleteError;

    // Sign out the user
    await supabase.auth.signOut();

    return { data: { message: 'Account deleted successfully' }, error: null };
  } catch (err) {
    console.error('Error deleting user account:', err);
    return { data: null, error: err };
  }
};

/**
 * Get player profile
 */
export const getPlayerProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching player profile:', err);
    return { data: null, error: err };
  }
};

/**
 * Update or create player profile
 */
export const upsertPlayerProfile = async (userId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('player_profiles')
      .upsert({
        user_id: userId,
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error updating player profile:', err);
    return { data: null, error: err };
  }
};

/**
 * Upload profile photo
 */
export const uploadProfilePhoto = async (userId, file) => {
  try {
    const fileExt = file.uri.split('.').pop();
    const fileName = `${userId}/profile.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        upsert: true,
        contentType: `image/${fileExt}`,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Update user profile with new photo URL
    await updateUserProfile(userId, { profile_photo_url: publicUrl });

    return { data: publicUrl, error: null };
  } catch (err) {
    console.error('Error uploading profile photo:', err);
    return { data: null, error: err };
  }
};

export default {
  // CREATE
  createUserProfile,
  upsertUserProfile,
  // READ
  getUserProfile,
  getCurrentUserProfile,
  getFullUserProfile,
  // UPDATE
  updateUserProfile,
  updateUserAuthMetadata,
  // DELETE
  deactivateUserAccount,
  deleteUserAccount,
  // Player Profile
  getPlayerProfile,
  upsertPlayerProfile,
  // Storage
  uploadProfilePhoto,
};
