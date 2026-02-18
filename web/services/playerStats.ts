import { supabase } from './supabase';

export interface PlayerStats {
  user_id: string;
  total_games: number;
  total_wins: number;
  total_losses: number;
  win_rate: number;
  average_rating: number;
  endorsement_count: number;
  last_played_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerReview {
  id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  match_request_id?: string;
  rating: number;
  skill_rating: number;
  communication_rating: number;
  punctuality_rating: number;
  sportsmanship_rating: number;
  comment?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  reviewer?: any;
}

export interface PlayerEndorsement {
  id: string;
  endorser_id: string;
  endorsed_user_id: string;
  endorsement_type: 'great_partner' | 'skilled_player' | 'excellent_communicator' | 
                    'always_on_time' | 'great_sportsmanship' | 'fun_to_play_with' | 
                    'strategic_player' | 'team_player';
  created_at: string;
  // Joined data
  endorser?: any;
}

/**
 * Get player stats for a user
 */
export const getPlayerStats = async (userId: string) => {
  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  // If no stats exist, return default stats
  if (error && error.code === 'PGRST116') {
    return {
      user_id: userId,
      total_games: 0,
      total_wins: 0,
      total_losses: 0,
      win_rate: 0,
      average_rating: 0,
      endorsement_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as PlayerStats;
  }

  if (error) throw error;
  return data as PlayerStats;
};

/**
 * Update player stats (after a game)
 */
export const updatePlayerStats = async (
  userId: string,
  won: boolean,
  rating?: number
) => {
  const stats = await getPlayerStats(userId);

  const updates = {
    total_games: stats.total_games + 1,
    total_wins: won ? stats.total_wins + 1 : stats.total_wins,
    total_losses: !won ? stats.total_losses + 1 : stats.total_losses,
    last_played_at: new Date().toISOString()
  };

  const newWinRate = updates.total_games > 0 
    ? (updates.total_wins / updates.total_games) * 100 
    : 0;

  const { data, error } = await supabase
    .from('player_stats')
    .upsert({
      user_id: userId,
      ...updates,
      win_rate: newWinRate
    })
    .select()
    .single();

  if (error) throw error;
  return data as PlayerStats;
};

/**
 * Get reviews for a user
 */
export const getUserReviews = async (userId: string, limit = 20) => {
  const { data, error } = await supabase
    .from('partner_reviews')
    .select(`
      *,
      reviewer:profiles!partner_reviews_reviewer_id_fkey(id, full_name, avatar_url, skill_level)
    `)
    .eq('reviewed_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as PartnerReview[];
};

/**
 * Get reviews given by a user
 */
export const getReviewsByUser = async (userId: string) => {
  const { data, error } = await supabase
    .from('partner_reviews')
    .select(`
      *,
      reviewed_user:profiles!partner_reviews_reviewed_user_id_fkey(id, full_name, avatar_url)
    `)
    .eq('reviewer_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as PartnerReview[];
};

/**
 * Create a review for a partner
 */
export const createPartnerReview = async (params: {
  reviewed_user_id: string;
  match_request_id?: string;
  rating: number;
  skill_rating: number;
  communication_rating: number;
  punctuality_rating: number;
  sportsmanship_rating: number;
  comment?: string;
}) => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  // Check if review already exists
  const { data: existing } = await supabase
    .from('partner_reviews')
    .select('id')
    .eq('reviewer_id', user.user.id)
    .eq('reviewed_user_id', params.reviewed_user_id)
    .eq('match_request_id', params.match_request_id || '')
    .single();

  if (existing) {
    throw new Error('You have already reviewed this partner for this match');
  }

  const { data, error } = await supabase
    .from('partner_reviews')
    .insert({
      reviewer_id: user.user.id,
      ...params
    })
    .select(`
      *,
      reviewer:profiles!partner_reviews_reviewer_id_fkey(id, full_name, avatar_url)
    `)
    .single();

  if (error) throw error;

  // Update average rating in player stats
  await updateAverageRating(params.reviewed_user_id);

  return data as PartnerReview;
};

/**
 * Update average rating for a user
 */
const updateAverageRating = async (userId: string) => {
  const { data, error } = await supabase
    .rpc('calculate_average_review_rating', { target_user_id: userId });

  if (error) throw error;

  // Update player stats with new average
  await supabase
    .from('player_stats')
    .upsert({
      user_id: userId,
      average_rating: data || 0
    });
};

/**
 * Get endorsements for a user
 */
export const getUserEndorsements = async (userId: string) => {
  const { data, error } = await supabase
    .from('player_endorsements')
    .select(`
      *,
      endorser:profiles!player_endorsements_endorser_id_fkey(id, full_name, avatar_url)
    `)
    .eq('endorsed_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Group by endorsement type and count
  const grouped = (data || []).reduce((acc: any, endorsement: any) => {
    const type = endorsement.endorsement_type;
    if (!acc[type]) {
      acc[type] = {
        type,
        count: 0,
        endorsers: []
      };
    }
    acc[type].count++;
    acc[type].endorsers.push(endorsement.endorser);
    return acc;
  }, {});

  return {
    all: data as PlayerEndorsement[],
    grouped: Object.values(grouped)
  };
};

/**
 * Give an endorsement to a user
 */
export const endorsePlayer = async (
  endorsedUserId: string,
  endorsementType: PlayerEndorsement['endorsement_type']
) => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  // Check if already endorsed with this type
  const { data: existing } = await supabase
    .from('player_endorsements')
    .select('id')
    .eq('endorser_id', user.user.id)
    .eq('endorsed_user_id', endorsedUserId)
    .eq('endorsement_type', endorsementType)
    .single();

  if (existing) {
    throw new Error('You have already given this endorsement');
  }

  const { data, error } = await supabase
    .from('player_endorsements')
    .insert({
      endorser_id: user.user.id,
      endorsed_user_id: endorsedUserId,
      endorsement_type: endorsementType
    })
    .select(`
      *,
      endorser:profiles!player_endorsements_endorser_id_fkey(id, full_name, avatar_url)
    `)
    .single();

  if (error) throw error;

  // Update endorsement count in player stats
  const { data: count } = await supabase
    .from('player_endorsements')
    .select('id', { count: 'exact', head: true })
    .eq('endorsed_user_id', endorsedUserId);

  await supabase
    .from('player_stats')
    .upsert({
      user_id: endorsedUserId,
      endorsement_count: count || 0
    });

  return data as PlayerEndorsement;
};

/**
 * Remove an endorsement
 */
export const removeEndorsement = async (endorsementId: string) => {
  const { error } = await supabase
    .from('player_endorsements')
    .delete()
    .eq('id', endorsementId);

  if (error) throw error;
};

/**
 * Get available players (for finding partners)
 */
export const findAvailablePlayers = async (params: {
  skill_level?: string;
  game_type?: string;
  max_distance_km?: number;
  min_rating?: number;
  date?: string;
  time?: string;
}) => {
  // This would use the find_available_players function from migration 024
  // For now, a simplified version:
  
  let query = supabase
    .from('profiles')
    .select(`
      *,
      player_stats(*)
    `)
    .neq('id', (await supabase.auth.getUser()).data.user?.id || '');

  if (params.skill_level) {
    query = query.eq('skill_level', params.skill_level);
  }

  const { data, error } = await query.limit(50);

  if (error) throw error;
  return data;
};
