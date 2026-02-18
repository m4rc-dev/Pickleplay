import { supabase } from './supabase';
import { PlayerInvitation, BookingWaitingList } from '../types';

export const createInvitation = async (
  bookingId: string,
  inviterId: string,
  method: PlayerInvitation['invitation_method'],
  inviteeId?: string,
  inviteeEmail?: string,
  message?: string
) => {
  try {
    const invitationLink = `${window.location.origin}/#/invite/${crypto.randomUUID()}`;

    const { data, error } = await supabase.from('player_invitations').insert({
      booking_id: bookingId,
      inviter_id: inviterId,
      invitee_id: inviteeId || null,
      invitee_email: inviteeEmail || null,
      invitation_method: method,
      invitation_link: invitationLink,
      qr_code_data: invitationLink,
      message: message || null,
      status: 'pending'
    }).select().single();

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
};

export const getInvitationsForBooking = async (bookingId: string) => {
  try {
    const { data, error } = await supabase
      .from('player_invitations')
      .select(`
        *,
        inviter:profiles!player_invitations_inviter_id_fkey(full_name, avatar_url, username),
        invitee:profiles!player_invitations_invitee_id_fkey(full_name, avatar_url, username)
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
};

export const getMyInvitations = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('player_invitations')
      .select(`
        *,
        inviter:profiles!player_invitations_inviter_id_fkey(full_name, avatar_url, username),
        booking:bookings(
          booking_date, start_time, end_time,
          court:courts(name)
        )
      `)
      .eq('invitee_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
};

export const respondToInvitation = async (invitationId: string, accept: boolean) => {
  try {
    const { data, error } = await supabase
      .from('player_invitations')
      .update({
        status: accept ? 'accepted' : 'declined',
        responded_at: new Date().toISOString()
      })
      .eq('id', invitationId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
};

export const searchPlayers = async (query: string, excludeIds: string[] = []) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, username, dupr_rating')
      .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .limit(10);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
};

export const getWaitingList = async (bookingId: string) => {
  try {
    const { data, error } = await supabase
      .from('booking_waiting_list')
      .select(`
        *,
        user:profiles(full_name, avatar_url)
      `)
      .eq('booking_id', bookingId)
      .order('position', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
};

export const joinWaitingList = async (bookingId: string, userId: string) => {
  try {
    const { data, error } = await supabase
      .from('booking_waiting_list')
      .insert({ booking_id: bookingId, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
};

export const leaveWaitingList = async (bookingId: string, userId: string) => {
  try {
    const { error } = await supabase
      .from('booking_waiting_list')
      .delete()
      .eq('booking_id', bookingId)
      .eq('user_id', userId);

    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
};
