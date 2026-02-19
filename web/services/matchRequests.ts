import { supabase } from './supabase';

export interface MatchRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  proposed_date: string;
  proposed_time?: string;
  court_id?: string;
  game_type: 'singles' | 'doubles' | 'mixed_doubles';
  duration_minutes?: number;
  message?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  sender?: any;
  receiver?: any;
  court?: any;
}

/**
 * Send a match request to another player
 */
export const sendMatchRequest = async (params: {
  receiver_id: string;
  proposed_date: string;
  proposed_time?: string;
  court_id?: string;
  game_type: 'singles' | 'doubles' | 'mixed_doubles';
  duration_minutes?: number;
  message?: string;
}) => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('match_requests')
    .insert({
      sender_id: user.user.id,
      ...params,
    })
    .select(`
      *,
      sender:profiles!match_requests_sender_id_fkey(id, full_name, avatar_url, skill_level),
      receiver:profiles!match_requests_receiver_id_fkey(id, full_name, avatar_url, skill_level),
      court:courts(id, name, location)
    `)
    .single();

  if (error) throw error;
  return data as MatchRequest;
};

/**
 * Get received match requests (inbox)
 */
export const getReceivedMatchRequests = async (status?: 'pending' | 'accepted' | 'declined') => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  let query = supabase
    .from('match_requests')
    .select(`
      *,
      sender:profiles!match_requests_sender_id_fkey(id, full_name, avatar_url, skill_level),
      court:courts(id, name, location)
    `)
    .eq('receiver_id', user.user.id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as MatchRequest[];
};

/**
 * Get sent match requests (outbox)
 */
export const getSentMatchRequests = async (status?: 'pending' | 'accepted' | 'declined' | 'cancelled') => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  let query = supabase
    .from('match_requests')
    .select(`
      *,
      receiver:profiles!match_requests_receiver_id_fkey(id, full_name, avatar_url, skill_level),
      court:courts(id, name, location)
    `)
    .eq('sender_id', user.user.id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as MatchRequest[];
};

/**
 * Accept a match request
 */
export const acceptMatchRequest = async (requestId: string) => {
  const { data, error } = await supabase
    .from('match_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .select(`
      *,
      sender:profiles!match_requests_sender_id_fkey(id, full_name, avatar_url, skill_level),
      court:courts(id, name, location)
    `)
    .single();

  if (error) throw error;
  return data as MatchRequest;
};

/**
 * Decline a match request
 */
export const declineMatchRequest = async (requestId: string) => {
  const { data, error } = await supabase
    .from('match_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)
    .select(`
      *,
      sender:profiles!match_requests_sender_id_fkey(id, full_name, avatar_url, skill_level),
      court:courts(id, name, location)
    `)
    .single();

  if (error) throw error;
  return data as MatchRequest;
};

/**
 * Cancel a sent match request (sender only)
 */
export const cancelMatchRequest = async (requestId: string) => {
  const { data, error } = await supabase
    .from('match_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .select(`
      *,
      receiver:profiles!match_requests_receiver_id_fkey(id, full_name, avatar_url, skill_level),
      court:courts(id, name, location)
    `)
    .single();

  if (error) throw error;
  return data as MatchRequest;
};

/**
 * Get a single match request by ID
 */
export const getMatchRequest = async (requestId: string) => {
  const { data, error } = await supabase
    .from('match_requests')
    .select(`
      *,
      sender:profiles!match_requests_sender_id_fkey(id, full_name, avatar_url, skill_level),
      receiver:profiles!match_requests_receiver_id_fkey(id, full_name, avatar_url, skill_level),
      court:courts(id, name, location)
    `)
    .eq('id', requestId)
    .single();

  if (error) throw error;
  return data as MatchRequest;
};

/**
 * Subscribe to match request updates
 */
export const subscribeToMatchRequests = (
  callback: (request: MatchRequest) => void
) => {
  const channel = supabase
    .channel('match_requests')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'match_requests',
      },
      async (payload) => {
        // Fetch full request with joined data
        if (payload.new) {
          const { data } = await supabase
            .from('match_requests')
            .select(`
              *,
              sender:profiles!match_requests_sender_id_fkey(id, full_name, avatar_url, skill_level),
              receiver:profiles!match_requests_receiver_id_fkey(id, full_name, avatar_url, skill_level),
              court:courts(id, name, location)
            `)
            .eq('id', (payload.new as any).id)
            .single();

          if (data) callback(data as MatchRequest);
        }
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
};
