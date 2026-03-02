import { supabase } from './supabase';
import { getOrCreateConversation, sendMessage } from './directMessages';

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
      receiver_id: params.receiver_id,
      proposed_date: params.proposed_date,
      ...(params.court_id ? { court_id: params.court_id } : {}),
      game_type: params.game_type,
      ...(params.duration_minutes ? { duration_minutes: params.duration_minutes } : {}),
      ...(params.message ? { message: params.message } : {}),
      // proposed_time is not a DB column — omitted intentionally
    })
    .select('*')
    .single();

  if (error) throw error;

  // Manually fetch profiles and court to avoid FK-name dependency
  const [{ data: senderProfile }, { data: receiverProfile }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, avatar_url, dupr_rating').eq('id', user.user.id).single(),
    supabase.from('profiles').select('id, full_name, avatar_url, dupr_rating').eq('id', params.receiver_id).single(),
  ]);
  let court = null;
  if (params.court_id) {
    const { data: courtData } = await supabase.from('courts').select('id, name, location').eq('id', params.court_id).single();
    court = courtData ?? null;
  }

  // Auto-send a DM so the request appears in Messages
  try {
    const gameLabel: Record<string, string> = {
      singles: 'Singles (1v1)',
      doubles: 'Doubles (2v2)',
      mixed_doubles: 'Mixed Doubles',
    };
    const dateStr = new Date(params.proposed_date).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    const timeStr = params.proposed_time ? ` at ${params.proposed_time}` : '';
    const courtStr = court ? `\n🏟️ ${(court as any).name}${(court as any).location ? ` · ${(court as any).location}` : ''}` : '';
    const noteStr = params.message ? `\n\n"${params.message}"` : '';
    const dmBody =
      `🏓 Match Challenge from ${(senderProfile as any)?.full_name || 'a player'}!\n` +
      `📅 ${dateStr}${timeStr}\n` +
      `🎮 ${gameLabel[params.game_type] || params.game_type}` +
      courtStr +
      noteStr +
      `\n\nRespond in Find Partners → Received tab.`;
    const conversationId = await getOrCreateConversation(params.receiver_id);
    await sendMessage(conversationId, dmBody);
  } catch (_) { /* non-critical — don't block the request */ }

  return { ...(data as any), sender: senderProfile ?? null, receiver: receiverProfile ?? null, court } as MatchRequest;
};

/**
 * Get received match requests (inbox)
 */
export const getReceivedMatchRequests = async (status?: 'pending' | 'accepted' | 'declined') => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  let query = supabase
    .from('match_requests')
    .select('*')
    .eq('receiver_id', user.user.id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  const requests = (data || []) as any[];

  // Batch-fetch sender profiles
  const senderIds = [...new Set(requests.map(r => r.sender_id).filter(Boolean))] as string[];
  let senderMap: Record<string, any> = {};
  if (senderIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, dupr_rating').in('id', senderIds);
    (profiles || []).forEach((p: any) => { senderMap[p.id] = p; });
  }

  // Batch-fetch courts
  const courtIds = [...new Set(requests.map(r => r.court_id).filter(Boolean))] as string[];
  let courtMap: Record<string, any> = {};
  if (courtIds.length > 0) {
    const { data: courts } = await supabase.from('courts').select('id, name, location').in('id', courtIds);
    (courts || []).forEach((c: any) => { courtMap[c.id] = c; });
  }

  return requests.map(r => ({
    ...r,
    sender: senderMap[r.sender_id] ?? null,
    court: r.court_id ? courtMap[r.court_id] ?? null : null,
  })) as MatchRequest[];
};

/**
 * Get sent match requests (outbox)
 */
export const getSentMatchRequests = async (status?: 'pending' | 'accepted' | 'declined' | 'cancelled') => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  let query = supabase
    .from('match_requests')
    .select('*')
    .eq('sender_id', user.user.id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  const requests = (data || []) as any[];

  // Batch-fetch receiver profiles
  const receiverIds = [...new Set(requests.map(r => r.receiver_id).filter(Boolean))] as string[];
  let receiverMap: Record<string, any> = {};
  if (receiverIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, dupr_rating').in('id', receiverIds);
    (profiles || []).forEach((p: any) => { receiverMap[p.id] = p; });
  }

  // Batch-fetch courts
  const courtIds2 = [...new Set(requests.map(r => r.court_id).filter(Boolean))] as string[];
  let courtMap2: Record<string, any> = {};
  if (courtIds2.length > 0) {
    const { data: courts } = await supabase.from('courts').select('id, name, location').in('id', courtIds2);
    (courts || []).forEach((c: any) => { courtMap2[c.id] = c; });
  }

  return requests.map(r => ({
    ...r,
    receiver: receiverMap[r.receiver_id] ?? null,
    court: r.court_id ? courtMap2[r.court_id] ?? null : null,
  })) as MatchRequest[];
};

/**
 * Accept a match request
 */
export const acceptMatchRequest = async (requestId: string) => {
  const { data, error } = await supabase
    .from('match_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .select('*')
    .single();

  if (error) throw error;
  const req = data as any;
  const [{ data: senderProfile }, courtResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, avatar_url, dupr_rating').eq('id', req.sender_id).single(),
    req.court_id ? supabase.from('courts').select('id, name, location').eq('id', req.court_id).single() : Promise.resolve({ data: null }),
  ]);
  return { ...req, sender: senderProfile ?? null, court: (courtResult as any).data ?? null } as MatchRequest;
};

/**
 * Decline a match request
 */
export const declineMatchRequest = async (requestId: string) => {
  const { data, error } = await supabase
    .from('match_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)
    .select('*')
    .single();

  if (error) throw error;
  const req = data as any;
  const [{ data: senderProfile }, courtResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, avatar_url, dupr_rating').eq('id', req.sender_id).single(),
    req.court_id ? supabase.from('courts').select('id, name, location').eq('id', req.court_id).single() : Promise.resolve({ data: null }),
  ]);
  return { ...req, sender: senderProfile ?? null, court: (courtResult as any).data ?? null } as MatchRequest;
};

/**
 * Cancel a sent match request (sender only)
 */
export const cancelMatchRequest = async (requestId: string) => {
  const { data, error } = await supabase
    .from('match_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .select('*')
    .single();

  if (error) throw error;
  const req = data as any;
  const [{ data: receiverProfile }, courtResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, avatar_url, dupr_rating').eq('id', req.receiver_id).single(),
    req.court_id ? supabase.from('courts').select('id, name, location').eq('id', req.court_id).single() : Promise.resolve({ data: null }),
  ]);
  return { ...req, receiver: receiverProfile ?? null, court: (courtResult as any).data ?? null } as MatchRequest;
};

/**
 * Get a single match request by ID
 */
export const getMatchRequest = async (requestId: string) => {
  const { data, error } = await supabase
    .from('match_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (error) throw error;
  const req = data as any;
  const [{ data: senderProfile }, { data: receiverProfile }, courtResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, avatar_url, dupr_rating').eq('id', req.sender_id).single(),
    supabase.from('profiles').select('id, full_name, avatar_url, dupr_rating').eq('id', req.receiver_id).single(),
    req.court_id ? supabase.from('courts').select('id, name, location').eq('id', req.court_id).single() : Promise.resolve({ data: null }),
  ]);
  return { ...req, sender: senderProfile ?? null, receiver: receiverProfile ?? null, court: (courtResult as any).data ?? null } as MatchRequest;
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
        if (payload.new) {
          try {
            const req = await getMatchRequest((payload.new as any).id);
            callback(req);
          } catch (_) {}
        }
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
};
