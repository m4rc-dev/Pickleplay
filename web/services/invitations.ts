import { supabase } from './supabase';

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';
export type InvitationMethod = 'username' | 'email' | 'link' | 'qr' | 'social';

export interface PlayerInvitation {
  id: string;
  booking_id: string | null;
  inviter_id: string | null;
  invitee_id: string | null;
  invitee_email: string | null;
  invitee_username: string | null;
  invitation_method: InvitationMethod | null;
  status: InvitationStatus;
  message: string | null;
  created_at: string;
  responded_at: string | null;
  expires_at: string | null;
  // joined
  inviter?: { id: string; full_name: string | null; username: string | null; avatar_url: string | null };
  invitee?: { id: string; full_name: string | null; username: string | null; avatar_url: string | null };
  booking?: {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    court: { id: string; name: string; location: { name: string; city: string } | null } | null;
  };
}

/* ─────────────────────────────────────────────
   Send an invitation for a booking
───────────────────────────────────────────── */
export const sendInvitation = async ({
  bookingId,
  inviteeId,
  inviteeEmail,
  inviteeUsername,
  message,
}: {
  bookingId: string;
  inviteeId?: string;
  inviteeEmail?: string;
  inviteeUsername?: string;
  message?: string;
}): Promise<{ success: boolean; error?: string }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { success: false, error: 'Not authenticated' };

  const inviterId = session.user.id;

  // Determine method
  const method: InvitationMethod = inviteeId ? 'username' : inviteeEmail ? 'email' : 'username';

  // Check for duplicate pending invitation
  let dupQuery = supabase
    .from('player_invitations')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('status', 'pending');

  if (inviteeId) dupQuery = dupQuery.eq('invitee_id', inviteeId);
  else if (inviteeEmail) dupQuery = dupQuery.eq('invitee_email', inviteeEmail.toLowerCase());

  const { data: existing } = await dupQuery.maybeSingle();
  if (existing) return { success: false, error: 'This player already has a pending invitation for this booking.' };

  // Insert invitation
  const { data: invitation, error: insertErr } = await supabase
    .from('player_invitations')
    .insert({
      booking_id: bookingId,
      inviter_id: inviterId,
      invitee_id: inviteeId ?? null,
      invitee_email: inviteeEmail?.toLowerCase() ?? null,
      invitee_username: inviteeUsername ?? null,
      invitation_method: method,
      status: 'pending',
      message: message?.trim() || null,
    })
    .select()
    .single();

  if (insertErr) return { success: false, error: insertErr.message };

  // Fetch booking details for notification message
  const { data: booking } = await supabase
    .from('bookings')
    .select('date, start_time, courts(name)')
    .eq('id', bookingId)
    .maybeSingle();

  const courtName = (booking?.courts as any)?.name ?? 'a court';
  const dateStr = booking?.date
    ? new Date(booking.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  // Fetch inviter name for notification
  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('id', inviterId)
    .maybeSingle();

  const inviterName = inviterProfile?.full_name || inviterProfile?.username || 'Someone';

  // Send notification to invitee (if we have their user id)
  const resolvedInviteeId = inviteeId ?? (await resolveUserIdByEmail(inviteeEmail));
  if (resolvedInviteeId) {
    await supabase.from('notifications').insert({
      user_id: resolvedInviteeId,
      type: 'player_invitation',
      title: `${inviterName} invited you to play!`,
      message: `You're invited to ${courtName}${dateStr ? ' on ' + dateStr : ''}. Open My Courts → Invitations to respond.`,
      related_user_id: inviterId,
      booking_id: bookingId,
      action_url: '/my-bookings?tab=invitations',
    });
  }

  return { success: true };
};

/* ─────────────────────────────────────────────
   Get all invitations sent FOR a specific booking
───────────────────────────────────────────── */
export const getInvitationsForBooking = async (bookingId: string): Promise<PlayerInvitation[]> => {
  const { data: rows, error } = await supabase
    .from('player_invitations')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  // Batch-fetch invitee profiles
  const inviteeIds = [...new Set(rows.map(r => r.invitee_id).filter(Boolean))];
  let profileMap: Record<string, any> = {};
  if (inviteeIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', inviteeIds);
    (profiles ?? []).forEach(p => { profileMap[p.id] = p; });
  }

  return rows.map(r => ({
    ...r,
    invitee: r.invitee_id ? profileMap[r.invitee_id] ?? null : null,
  })) as PlayerInvitation[];
};

/* ─────────────────────────────────────────────
   Get sent invitations for the current user
───────────────────────────────────────────── */
export const getSentInvitations = async (): Promise<PlayerInvitation[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];

  // Step 1: fetch raw rows + booking details (no profile join)
  const { data: rows, error } = await supabase
    .from('player_invitations')
    .select(`
      *,
      booking:bookings(
        id, date, start_time, end_time,
        court:courts(id, name, location:locations(name, city))
      )
    `)
    .eq('inviter_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) { console.error('getSentInvitations error:', error); return []; }
  if (!rows || rows.length === 0) return [];

  // Step 2: batch-fetch invitee profiles separately
  const inviteeIds = [...new Set(rows.map(r => r.invitee_id).filter(Boolean))];
  let profileMap: Record<string, any> = {};
  if (inviteeIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', inviteeIds);
    (profiles ?? []).forEach(p => { profileMap[p.id] = p; });
  }

  return rows.map(r => ({
    ...r,
    invitee: r.invitee_id ? profileMap[r.invitee_id] ?? null : null,
  })) as PlayerInvitation[];
};

/* ─────────────────────────────────────────────
   Get received invitations for the current user
───────────────────────────────────────────── */
export const getReceivedInvitations = async (): Promise<PlayerInvitation[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];

  const userId = session.user.id;

  // Fetch current user email for fallback matching
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();

  // Step 1: fetch raw invitation rows ONLY (no joins — avoid RLS block on bookings)
  let query = supabase
    .from('player_invitations')
    .select('*')
    .order('created_at', { ascending: false });

  if (profile?.email) {
    query = query.or(`invitee_id.eq.${userId},invitee_email.eq.${profile.email}`);
  } else {
    query = query.eq('invitee_id', userId);
  }

  const { data: rows, error } = await query;
  if (error) { console.error('getReceivedInvitations error:', error); return []; }
  if (!rows || rows.length === 0) return [];

  // Step 2: batch-fetch inviter profiles
  const inviterIds = [...new Set(rows.map(r => r.inviter_id).filter(Boolean))];
  let inviterMap: Record<string, any> = {};
  if (inviterIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', inviterIds);
    (profiles ?? []).forEach(p => { inviterMap[p.id] = p; });
  }

  // Step 3: batch-fetch booking details (now allowed by the "Invitees can view invited bookings" RLS policy)
  const bookingIds = [...new Set(rows.map(r => r.booking_id).filter(Boolean))];
  let bookingMap: Record<string, any> = {};
  if (bookingIds.length > 0) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, date, start_time, end_time, court:courts(id, name, location:locations(name, city))')
      .in('id', bookingIds);
    (bookings ?? []).forEach(b => { bookingMap[b.id] = b; });
  }

  return rows.map(r => ({
    ...r,
    inviter: r.inviter_id ? inviterMap[r.inviter_id] ?? null : null,
    booking: r.booking_id ? bookingMap[r.booking_id] ?? null : null,
  })) as PlayerInvitation[];
};

/* ─────────────────────────────────────────────
   Respond to an invitation (accept / decline)
───────────────────────────────────────────── */
export const respondToInvitation = async (
  invitationId: string,
  status: 'accepted' | 'declined'
): Promise<{ success: boolean; error?: string }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { success: false, error: 'Not authenticated' };

  // Fetch invitation first
  const { data: inv, error: fetchErr } = await supabase
    .from('player_invitations')
    .select(`
      *,
      booking:bookings(
        date, start_time,
        court:courts(name)
      )
    `)
    .eq('id', invitationId)
    .maybeSingle();

  if (fetchErr || !inv) return { success: false, error: 'Invitation not found.' };
  if (inv.status !== 'pending') return { success: false, error: 'Invitation has already been responded to.' };

  // Update invitation
  const { error: updateErr } = await supabase
    .from('player_invitations')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', invitationId);

  if (updateErr) return { success: false, error: updateErr.message };

  // Notify inviter
  const { data: inviteeProfile } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('id', session.user.id)
    .maybeSingle();

  const inviteeName = inviteeProfile?.full_name || inviteeProfile?.username || 'A player';
  const courtName = (inv.booking?.court as any)?.name ?? 'the court';
  const dateStr = inv.booking?.date
    ? new Date(inv.booking.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  if (inv.inviter_id) {
    await supabase.from('notifications').insert({
      user_id: inv.inviter_id,
      type: status === 'accepted' ? 'invitation_accepted' : 'invitation_declined',
      title: status === 'accepted'
        ? `${inviteeName} accepted your invitation! 🎉`
        : `${inviteeName} declined your invitation`,
      message: status === 'accepted'
        ? `${inviteeName} is joining you at ${courtName}${dateStr ? ' on ' + dateStr : ''}!`
        : `${inviteeName} can't make it to ${courtName}${dateStr ? ' on ' + dateStr : ''}.`,
      related_user_id: session.user.id,
      booking_id: inv.booking_id ?? undefined,
      action_url: '/my-bookings?tab=invitations',
    });
  }

  return { success: true };
};

/* ─────────────────────────────────────────────
   Cancel a sent invitation (inviter only)
───────────────────────────────────────────── */
export const cancelInvitation = async (
  invitationId: string
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('player_invitations')
    .delete()
    .eq('id', invitationId);

  if (error) return { success: false, error: error.message };
  return { success: true };
};

/* ─────────────────────────────────────────────
   Search for a player by username or email
───────────────────────────────────────────── */
export const searchPlayerForInvite = async (
  query: string
): Promise<{ id: string; full_name: string | null; username: string | null; avatar_url: string | null; email: string | null } | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const q = query.trim().toLowerCase();

  // Try by username first
  const { data: byUsername } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, email')
    .ilike('username', q)
    .neq('id', session.user.id)
    .maybeSingle();

  if (byUsername) return byUsername;

  // Try by email
  const { data: byEmail } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, email')
    .ilike('email', q)
    .neq('id', session.user.id)
    .maybeSingle();

  return byEmail ?? null;
};

/* ─────────────────────────────────────────────
   Internal helper: resolve user ID from email
───────────────────────────────────────────── */
const resolveUserIdByEmail = async (email?: string): Promise<string | null> => {
  if (!email) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', email.trim().toLowerCase())
    .maybeSingle();
  return data?.id ?? null;
};
