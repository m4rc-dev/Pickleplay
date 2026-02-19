import { supabase } from './supabase';
import type { Group, GroupMember, GroupEvent, EventRsvp, DirectMessage, MessageThread, GroupMemberStatus, RsvpStatus } from '../types';

// ---------- GROUPS ----------

export async function getGroups(privacy?: 'public' | 'private') {
  const { data: { user } } = await supabase.auth.getUser();
  
  let query = supabase
    .from('groups')
    .select('*, group_members!left(user_id, status)')
    .order('created_at', { ascending: false });

  if (privacy) {
    query = query.eq('privacy', privacy);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  // Transform the data to include user_is_member flag
  const groups = (data || []).map(group => {
    const members = Array.isArray(group.group_members) ? group.group_members : [];
    const userMembership = members.find((m: any) => m.user_id === user?.id);
    const { group_members, ...groupData } = group;
    
    return {
      ...groupData,
      user_is_member: userMembership?.status === 'active'
    } as Group;
  });
  
  return groups;
}

export async function getGroupById(groupId: string) {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (error) throw error;
  return data as Group;
}

export async function createGroup(group: {
  name: string;
  description?: string;
  privacy: 'public' | 'private';
  avatar_url?: string;
  cover_url?: string;
  location?: string;
  tags?: string[];
  rules?: string;
  settings?: Record<string, any>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('groups')
    .insert({
      ...group,
      created_by: user.id,
      tags: group.tags || [],
      settings: group.settings || {}
    })
    .select()
    .single();

  if (error) throw error;
  return data as Group;
}

export async function updateGroup(groupId: string, updates: Partial<Group>) {
  const { data, error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', groupId)
    .select()
    .single();

  if (error) throw error;
  return data as Group;
}

export async function deleteGroup(groupId: string) {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId);

  if (error) throw error;
}

// ---------- GROUP MEMBERS ----------

export async function getGroupMembers(groupId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      *,
      user:profiles(
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('group_id', groupId)
    .order('joined_at', { ascending: false });

  if (error) {
    console.error('getGroupMembers error:', error);
    throw error;
  }
  
  return (data || []) as (GroupMember & { user: any })[];
}

export async function getUserGroups(userId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const targetUserId = userId || user?.id;
  if (!targetUserId) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('group_members')
    .select(`
      *,
      group:groups (*)
    `)
    .eq('user_id', targetUserId)
    .eq('status', 'active');

  if (error) throw error;
  return data;
}

export async function joinGroup(groupId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Check if group is public or private
  const group = await getGroupById(groupId);
  
  const { data, error } = await supabase
    .from('group_members')
    .insert({
      group_id: groupId,
      user_id: user.id,
      role: 'member',
      status: group.privacy === 'public' ? 'active' : 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data as GroupMember;
}

export async function leaveGroup(groupId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function updateGroupMember(
  groupId: string,
  userId: string,
  updates: { role?: 'admin' | 'moderator' | 'member'; status?: GroupMemberStatus }
) {
  const { data, error } = await supabase
    .from('group_members')
    .update(updates)
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as GroupMember;
}

export async function getUserMembershipStatus(groupId: string): Promise<GroupMemberStatus | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('group_members')
    .select('status')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data?.status || null;
}

// ---------- GROUP EVENTS ----------

export async function getGroupEvents(groupId: string, onlyFuture = false) {
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('group_events')
    .select(`
      *,
      rsvps:event_rsvps(count)
    `)
    .eq('group_id', groupId);

  // Only filter for future events if explicitly requested
  if (onlyFuture) {
    query = query.gte('start_time', new Date().toISOString());
  }

  const { data, error } = await query.order('start_time', { ascending: true });

  if (error) throw error;

  // Get user's RSVP status if authenticated
  if (user) {
    const eventIds = data.map(e => e.id);
    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('event_id, status')
      .in('event_id', eventIds)
      .eq('user_id', user.id);

    const rsvpMap = new Map(rsvps?.map(r => [r.event_id, r.status]) || []);
    
    return data.map(event => ({
      ...event,
      rsvp_count: event.rsvps[0]?.count || 0,
      user_rsvp_status: rsvpMap.get(event.id) || null
    })) as GroupEvent[];
  }

  return data.map(event => ({
    ...event,
    rsvp_count: event.rsvps[0]?.count || 0,
    user_rsvp_status: null
  })) as GroupEvent[];
}

export async function createGroupEvent(event: {
  group_id: string;
  title: string;
  description?: string;
  event_type?: 'meetup' | 'tournament' | 'social' | 'training' | 'other';
  location?: string;
  start_time: string;
  end_time?: string;
  max_attendees?: number;
  settings?: Record<string, any>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('group_events')
    .insert({
      ...event,
      created_by: user.id,
      settings: event.settings || {}
    })
    .select()
    .single();

  if (error) throw error;
  return data as GroupEvent;
}

export async function updateGroupEvent(eventId: string, updates: Partial<GroupEvent>) {
  const { data, error } = await supabase
    .from('group_events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return data as GroupEvent;
}

export async function deleteGroupEvent(eventId: string) {
  const { error } = await supabase
    .from('group_events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
}

// ---------- EVENT RSVPS ----------

export async function getEventRsvps(eventId: string) {
  const { data, error } = await supabase
    .from('event_rsvps')
    .select(`
      *,
      user:profiles(
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as (EventRsvp & { user: any })[];
}

export async function rsvpToEvent(eventId: string, status: RsvpStatus) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('event_rsvps')
    .upsert({
      event_id: eventId,
      user_id: user.id,
      status
    }, {
      onConflict: 'event_id,user_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data as EventRsvp;
}

export async function removeRsvp(eventId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('event_rsvps')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', user.id);

  if (error) throw error;
}

// ---------- DIRECT MESSAGES ----------

export async function getOrCreateThread(otherUserId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const [p1, p2] = [user.id, otherUserId].sort();

  // Try to find existing thread
  const { data: existing } = await supabase
    .from('message_threads')
    .select('id')
    .eq('participant_1', p1)
    .eq('participant_2', p2)
    .maybeSingle();

  if (existing) return existing.id;

  // Create new thread
  const { data, error } = await supabase
    .from('message_threads')
    .insert({
      participant_1: p1,
      participant_2: p2
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getUserThreads() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('message_threads')
    .select(`
      *,
      messages:direct_messages!thread_id(
        id, content, created_at, sender_id, is_read
      )
    `)
    .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  return data as MessageThread[];
}

export async function getThreadMessages(threadId: string) {
  const { data, error } = await supabase
    .from('direct_messages')
    .select(`
      *,
      sender:profiles(
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as (DirectMessage & { sender: any })[];
}

export async function sendMessage(recipientId: string, content: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const threadId = await getOrCreateThread(recipientId);

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      sender_id: user.id,
      recipient_id: recipientId,
      content,
      thread_id: threadId
    })
    .select()
    .single();

  if (error) throw error;
  return data as DirectMessage;
}

export async function markMessageAsRead(messageId: string) {
  const { error } = await supabase
    .from('direct_messages')
    .update({ is_read: true })
    .eq('id', messageId);

  if (error) throw error;
}

export async function deleteMessage(messageId: string) {
  const { error } = await supabase
    .from('direct_messages')
    .delete()
    .eq('id', messageId);

  if (error) throw error;
}

// ---------- FOLLOWED TAGS ----------

export async function getFollowedTags(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('followed_tags')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data?.followed_tags || [];
}

export async function updateFollowedTags(tags: string[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({ followed_tags: tags })
    .eq('id', user.id);

  if (error) throw error;
}

export async function followTag(tag: string) {
  const currentTags = await getFollowedTags();
  if (!currentTags.includes(tag)) {
    await updateFollowedTags([...currentTags, tag]);
  }
}

export async function unfollowTag(tag: string) {
  const currentTags = await getFollowedTags();
  await updateFollowedTags(currentTags.filter(t => t !== tag));
}

// ---------- REALTIME SUBSCRIPTIONS ----------

export function subscribeToGroupUpdates(groupId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`group:${groupId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'groups',
      filter: `id=eq.${groupId}`
    }, callback)
    .subscribe();
}

export function subscribeToGroupEvents(groupId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`group_events:${groupId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'group_events',
      filter: `group_id=eq.${groupId}`
    }, callback)
    .subscribe();
}

export function subscribeToMessages(threadId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`messages:${threadId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'direct_messages',
      filter: `thread_id=eq.${threadId}`
    }, callback)
    .subscribe();
}
