import { supabase } from './supabase';
import { Match, MatchPlayer, PlayerRating, MatchType, MatchStatus } from '../types';

/**
 * Creates a new match and adds the host as a verified participant.
 */
export const createMatch = async (
    hostId: string,
    type: MatchType,
    courtId?: string,
    matchDate?: string,
    startTime?: string
): Promise<{ data: Match | null; error: string | null }> => {
    try {
        const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const { data: match, error: matchError } = await supabase
            .from('matches')
            .insert({
                host_id: hostId,
                type,
                court_id: courtId,
                status: 'Upcoming',
                verification_code: verificationCode,
                match_date: matchDate || new Date().toISOString().split('T')[0],
                start_time: startTime
            })
            .select()
            .maybeSingle();

        if (matchError) throw matchError;
        if (!match) throw new Error('Match could not be created. Please try again.');

        // Add host to match_players
        const { error: playerError } = await supabase
            .from('match_players')
            .insert({
                match_id: match.id,
                player_id: hostId,
                is_verified: true,
                verified_at: new Date().toISOString()
            });

        if (playerError) throw playerError;

        return { data: match, error: null };
    } catch (err: any) {
        console.error('Error creating match:', err);
        return { data: null, error: err.message };
    }
};


/**
 * Joins a match by verifying the code.
 */
export const verifyMatchParticipation = async (
    playerId: string,
    matchId: string,
    verificationCode: string
): Promise<{ success: boolean; error: string | null }> => {
    try {
        // 1. Fetch match — use maybeSingle() so missing rows return null instead of throwing
        const { data: match, error: fetchError } = await supabase
            .from('matches')
            .select('verification_code, status')
            .eq('id', matchId)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!match) throw new Error('Match not found. The QR code may be expired or invalid.');
        if (match.verification_code !== verificationCode) throw new Error('Invalid verification code');
        if (match.status === 'Cancelled') throw new Error('Match has been cancelled');

        // 2. Add player to match_players
        const { error: joinError } = await supabase
            .from('match_players')
            .upsert({
                match_id: matchId,
                player_id: playerId,
                is_verified: true,
                verified_at: new Date().toISOString()
            });

        if (joinError) throw joinError;

        return { success: true, error: null };
    } catch (err: any) {
        console.error('Error verifying match:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Updates match status (e.g., to 'Completed').
 */
export const updateMatchStatus = async (
    matchId: string,
    status: MatchStatus,
    score?: string
): Promise<{ success: boolean; error: string | null }> => {
    try {
        const { error } = await supabase
            .from('matches')
            .update({ status, score, updated_at: new Date().toISOString() })
            .eq('id', matchId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (err: any) {
        console.error('Error updating match status:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Submits a rating for an opponent.
 */
export const submitPlayerRating = async (rating: Omit<PlayerRating, 'id' | 'created_at'>): Promise<{ success: boolean; error: string | null }> => {
    try {
        const { error } = await supabase
            .from('player_ratings')
            .insert(rating);

        if (error) throw error;
        return { success: true, error: null };
    } catch (err: any) {
        console.error('Error submitting rating:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Fetches match details including verified participants.
 */
export const getMatchDetails = async (matchId: string): Promise<{ data: (Match & { players: MatchPlayer[] }) | null; error: string | null }> => {
    try {
        const { data: match, error: matchError } = await supabase
            .from('matches')
            .select(`
                *,
                players:match_players(
                    *,
                    profiles:profiles(full_name, avatar_url, username)
                )
            `)
            .eq('id', matchId)
            .single();

        if (matchError) throw matchError;
        return { data: match, error: null };
    } catch (err: any) {
        console.error('Error fetching match details:', err);
        return { data: null, error: err.message };
    }
};

/**
 * Fetches pending ratings for a user (matches completed but not rated yet).
 */
export const getPendingRatings = async (userId: string): Promise<{ data: Match[] | null; error: string | null }> => {
    try {
        // Matches where user is verified participant, match is completed, 
        // and user has not yet rated others in that match.
        // This is a bit complex for a single query, so we'll fetch completed matches first.
        const { data: matches, error: fetchError } = await supabase
            .from('matches')
            .select(`
                *,
                participants:match_players!inner(*)
            `)
            .eq('status', 'Completed')
            .eq('participants.player_id', userId)
            .eq('participants.is_verified', true);

        if (fetchError) throw fetchError;

        // Filter those where a rating from this user already exists
        const pending = [];
        for (const m of (matches || [])) {
            const { count } = await supabase
                .from('player_ratings')
                .select('*', { count: 'exact', head: true })
                .eq('match_id', m.id)
                .eq('rater_id', userId);

            // In a real singles match, there's 1 opponent. In doubles, 2 or 3.
            // For simplicity, if count is 0, it's pending.
            if (count === 0) {
                pending.push(m);
            }
        }

        return { data: pending, error: null };
    } catch (err: any) {
        console.error('Error fetching pending ratings:', err);
        return { data: null, error: err.message };
    }
};

/**
 * Fetches all ratings received by a specific user, including rater profile info.
 */
export const getReceivedRatings = async (userId: string): Promise<{
    data: (PlayerRating & { rater: { full_name: string | null; username: string | null; avatar_url: string | null } })[] | null;
    error: string | null;
}> => {
    try {
        const { data, error } = await supabase
            .from('player_ratings')
            .select(`
                *,
                rater:profiles!player_ratings_rater_id_fkey(full_name, username, avatar_url)
            `)
            .eq('ratee_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data: data as any, error: null };
    } catch (err: any) {
        console.error('Error fetching received ratings:', err);
        return { data: null, error: err.message };
    }
};
