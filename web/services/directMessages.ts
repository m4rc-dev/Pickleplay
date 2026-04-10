import { supabase } from './supabase';

function debounceLead(fn: () => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn();
    }, ms);
  };
}

/**
 * Get total count of unread messages across all conversations
 */
export const getTotalUnreadCount = async (): Promise<number> => {
  const uid = await getMyUserId();
  if (!uid) return 0;
  const user = { id: uid };
  try {
    const { data: rpcCount, error: rpcErr } = await supabase.rpc('get_dm_unread_total');
    if (!rpcErr && typeof rpcCount === 'number') return rpcCount;

    const { data: participantData } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);
    const convIds = (participantData || []).map((p: any) => p.conversation_id);
    if (convIds.length === 0) return 0;
    const { data: readReceipts } = await supabase
      .from('message_read_receipts')
      .select('message_id')
      .eq('user_id', user.id);
    const readIds = new Set((readReceipts || []).map((r: any) => r.message_id));
    const { data: incoming } = await supabase
      .from('direct_messages')
      .select('id')
      .in('conversation_id', convIds)
      .neq('sender_id', user.id)
      .is('deleted_at', null);
    return (incoming || []).filter((m: any) => !readIds.has(m.id)).length;
  } catch {
    return 0;
  }
};

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  // Joined data
  participants?: any[];
  last_message?: DirectMessage;
  unread_count?: number;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  // Joined data
  sender?: any;
}

export interface ConversationWithDetails extends Conversation {
  other_user?: any;
}

/** Cached session id — avoids network round-trip on every call. */
let _cachedUserId: string | null = null;
const getMyUserId = async (): Promise<string | null> => {
  if (_cachedUserId) return _cachedUserId;
  const { data: { session } } = await supabase.auth.getSession();
  _cachedUserId = session?.user?.id ?? null;
  return _cachedUserId;
};
supabase.auth.onAuthStateChange((_event, session) => {
  _cachedUserId = session?.user?.id ?? null;
});

/**
 * Check if two users mutually follow each other (consent gate for messaging)
 */
export const checkMutualFollow = async (otherUserId: string): Promise<boolean> => {
  const myId = await getMyUserId();
  if (!myId) return false;
  const [{ count: iFollow }, { count: theyFollow }] = await Promise.all([
    supabase.from('user_follows').select('*', { count: 'exact', head: true })
      .eq('follower_id', myId).eq('followed_id', otherUserId),
    supabase.from('user_follows').select('*', { count: 'exact', head: true })
      .eq('follower_id', otherUserId).eq('followed_id', myId),
  ]);
  return (iFollow ?? 0) > 0 && (theyFollow ?? 0) > 0;
};

/**
 * Follow another user — used when accepting a message request
 */
export const followUser = async (targetUserId: string): Promise<void> => {
  const myId = await getMyUserId();
  if (!myId) return;

  const { count: existingFollowCount } = await supabase
    .from('user_follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', myId)
    .eq('followed_id', targetUserId);

  if ((existingFollowCount ?? 0) > 0) return;

  await supabase.from('user_follows').upsert(
    { follower_id: myId, followed_id: targetUserId },
    { onConflict: 'follower_id,followed_id', ignoreDuplicates: true }
  );

  try {
    await supabase.from('notifications').insert({
      user_id: targetUserId,
      actor_id: myId,
      type: 'FOLLOW',
      message: 'started following you.',
    });
  } catch (_) { /* non-critical */ }
};

/**
 * Get or create a conversation with another user
 */
export const getOrCreateConversation = async (otherUserId: string) => {
  const myId = await getMyUserId();
  if (!myId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .rpc('get_or_create_conversation', {
      user1_id: myId,
      user2_id: otherUserId
    });

  if (error) throw error;
  return data as string; // Returns conversation ID
};

async function getUserConversationsLegacy(): Promise<ConversationWithDetails[]> {
  const myId = await getMyUserId();
  if (!myId) throw new Error('Not authenticated');

  const { data: myParticipantRows, error: participantError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', myId);

  if (participantError) throw participantError;

  const conversationIds = (myParticipantRows || []).map((p: any) => p.conversation_id);
  if (conversationIds.length === 0) return [];

  const [convResult, participantsResult, readReceiptsResult] = await Promise.all([
    supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false, nullsFirst: false }),
    supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', conversationIds),
    supabase
      .from('message_read_receipts')
      .select('message_id')
      .eq('user_id', myId),
  ]);

  if (convResult.error) throw convResult.error;

  const conversations = convResult.data || [];
  const allParticipantRows = participantsResult.data || [];
  const readIds = new Set((readReceiptsResult.data || []).map((r: any) => r.message_id));

  const otherUserIds = [
    ...new Set(
      allParticipantRows
        .filter((p: any) => p.user_id !== myId)
        .map((p: any) => p.user_id)
    )
  ];

  // Fetch last message per conversation + incoming messages + profiles in parallel
  const [profilesResult, ...perConvResults] = await Promise.all([
    otherUserIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, full_name, avatar_url, dupr_rating')
          .in('id', otherUserIds)
      : Promise.resolve({ data: [] as any[] }),
    ...conversations.map((conv) =>
      Promise.all([
        supabase
          .from('direct_messages')
          .select('id, content, created_at, sender_id')
          .eq('conversation_id', conv.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('direct_messages')
          .select('id')
          .eq('conversation_id', conv.id)
          .neq('sender_id', myId)
          .is('deleted_at', null),
      ])
    ),
  ]);

  const profileMap: Record<string, any> = {};
  ((profilesResult as any).data || []).forEach((p: any) => { profileMap[p.id] = p; });

  return conversations.map((conv, idx) => {
    const [lastMsgRes, incomingRes] = perConvResults[idx] as [any, any];
    const lastMessage = lastMsgRes?.data?.[0] ?? null;
    const incoming = incomingRes?.data || [];
    const unreadCount = incoming.filter((m: any) => !readIds.has(m.id)).length;

    const otherParticipant = allParticipantRows.find(
      (p: any) => p.conversation_id === conv.id && p.user_id !== myId
    );
    const otherUser = otherParticipant ? profileMap[otherParticipant.user_id] ?? null : null;

    return {
      ...conv,
      last_message: lastMessage,
      unread_count: unreadCount,
      other_user: otherUser,
      participants: allParticipantRows
        .filter((p: any) => p.conversation_id === conv.id)
        .map((p: any) => ({ user: profileMap[p.user_id] ?? { id: p.user_id } }))
    };
  }) as ConversationWithDetails[];
}

/**
 * Get all conversations for the current user (single RPC when available)
 */
export const getUserConversations = async () => {
  const myId = await getMyUserId();
  if (!myId) throw new Error('Not authenticated');

  const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_conversations_enriched');
  if (!rpcError && rpcData != null) {
    if (Array.isArray(rpcData)) return rpcData as ConversationWithDetails[];
    if (typeof rpcData === 'string') {
      try {
        const p = JSON.parse(rpcData) as unknown;
        if (Array.isArray(p)) return p as ConversationWithDetails[];
      } catch {
        /* fall through */
      }
    }
  }

  return getUserConversationsLegacy();
};

/**
 * Get messages for a conversation
 */
export const getConversationMessages = async (
  conversationId: string,
  limit = 50,
  beforeMessageId?: string
) => {
  let query = supabase
    .from('direct_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (beforeMessageId) {
    const { data: beforeMessage } = await supabase
      .from('direct_messages')
      .select('created_at')
      .eq('id', beforeMessageId)
      .single();

    if (beforeMessage) {
      query = query.lt('created_at', (beforeMessage as any).created_at);
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  const messages = (data || []) as DirectMessage[];

  // Fetch sender profiles in one batch query
  const senderIds = [...new Set(messages.map((m: any) => m.sender_id).filter(Boolean))];
  let senderMap: Record<string, any> = {};
  if (senderIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', senderIds);
    (profiles || []).forEach((p: any) => { senderMap[p.id] = p; });
  }

  return messages
    .map((m: any) => ({ ...m, sender: senderMap[m.sender_id] ?? null }))
    .reverse() as DirectMessage[];
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (conversationId: string, content: string) => {
  const myId = await getMyUserId();
  if (!myId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: myId,
      content
    })
    .select('*')
    .single();

  if (error) throw error;

  const [senderProfileRes, participantsRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, avatar_url').eq('id', myId).single(),
    supabase.from('conversation_participants').select('user_id').eq('conversation_id', conversationId).neq('user_id', myId),
  ]);
  const messageWithSender = { ...(data as any), sender: senderProfileRes.data ?? null };

  // Notify the other participant (fire-and-forget)
  const participants = participantsRes.data;
  if (participants && participants.length > 0) {
    const recipientId = participants[0].user_id;
    const preview = content.length > 60 ? content.substring(0, 60) + '…' : content;
    void Promise.all([
      followUser(recipientId),
      supabase.from('notifications').insert({
        user_id: recipientId,
        actor_id: myId,
        related_user_id: myId,
        type: 'new_message',
        title: 'New message',
        message: preview,
        action_url: `/messages?conversation=${conversationId}`
      }),
    ]).catch(() => {});
  }

  return messageWithSender as DirectMessage;
};

/**
 * Edit a message
 */
export const editMessage = async (messageId: string, newContent: string) => {
  const { data, error } = await supabase
    .from('direct_messages')
    .update({
      content: newContent,
      is_edited: true
    })
    .eq('id', messageId)
    .select('*')
    .single();

  if (error) throw error;

  // Fetch sender profile separately
  const msg = data as any;
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', msg.sender_id)
    .single();

  return { ...msg, sender: senderProfile ?? null } as DirectMessage;
};

/**
 * Delete a message
 */
export const deleteMessage = async (messageId: string) => {
  const { error } = await supabase
    .from('direct_messages')
    .delete()
    .eq('id', messageId);

  if (error) throw error;
};

/**
 * Mark message as read
 */
export const markMessageAsRead = async (messageId: string) => {
  const myId = await getMyUserId();
  if (!myId) throw new Error('Not authenticated');

  await supabase
    .from('message_read_receipts')
    .upsert(
      { message_id: messageId, user_id: myId },
      { onConflict: 'message_id,user_id', ignoreDuplicates: true }
    );
};

/**
 * Mark in-app "New message" notifications for this thread read (bell badge / panel).
 */
export const markNewMessageNotificationsReadForConversation = async (
  conversationId: string
): Promise<void> => {
  const myId = await getMyUserId();
  if (!myId) return;
  const pattern = `%conversation=${conversationId}%`;
  const { data: rows, error: selErr } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', myId)
    .eq('type', 'new_message')
    .eq('is_read', false)
    .like('action_url', pattern);
  if (selErr || !rows?.length) return;
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .in('id', rows.map((r) => r.id));
};

/**
 * Mark all messages in a conversation as read
 */
export const markConversationAsRead = async (conversationId: string) => {
  const myId = await getMyUserId();
  if (!myId) throw new Error('Not authenticated');

  const [msgsRes, notifPromise] = [
    await supabase
      .from('direct_messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .neq('sender_id', myId)
      .is('deleted_at', null),
    markNewMessageNotificationsReadForConversation(conversationId).catch(() => {}),
  ];

  const messages = msgsRes.data;
  if (messages && messages.length > 0) {
    const allIds = messages.map(m => m.id);
    const batchSize = 200;
    for (let i = 0; i < allIds.length; i += batchSize) {
      const slice = allIds.slice(i, i + batchSize);
      await supabase
        .from('message_read_receipts')
        .upsert(
          slice.map(id => ({ message_id: id, user_id: myId })),
          { onConflict: 'message_id,user_id', ignoreDuplicates: true }
        );
    }
  }

  await notifPromise;
};

/**
 * Subscribe to new messages in a conversation (requires `direct_messages` in publication `supabase_realtime`).
 */
export const subscribeToConversation = (
  conversationId: string,
  callback: (message: DirectMessage) => void
) => {
  const channel = supabase
    .channel(`dm-open:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        const newMsg = payload.new as Record<string, unknown>;
        if (!newMsg?.id || String(newMsg.conversation_id) !== conversationId) return;
        const senderId = newMsg.sender_id as string;
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', senderId)
          .maybeSingle();
        callback({ ...newMsg, sender: senderProfile ?? null } as DirectMessage);
      }
    )
    .subscribe((status, err) => {
      if (import.meta.env.DEV && status !== 'SUBSCRIBED') {
        console.warn('[DM realtime]', conversationId.slice(0, 8), status, err?.message ?? err ?? '');
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
};

const DM_REALTIME_CHUNK = 36;

/**
 * Subscribe to DM list–relevant changes only (avoids global direct_messages fan-out).
 * Also listens for new rows in conversation_participants for this user (new threads).
 */
export const subscribeToConversationListUpdates = (
  userId: string,
  conversationIds: string[],
  onRefresh: () => void
) => {
  const debounced = debounceLead(onRefresh, 450);
  const channels: ReturnType<typeof supabase.channel>[] = [];

  const participantsCh = supabase
    .channel(`dm_cp_${userId.slice(0, 12)}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'conversation_participants',
        filter: `user_id=eq.${userId}`,
      },
      () => debounced()
    );
  participantsCh.subscribe();
  channels.push(participantsCh);

  for (let i = 0; i < conversationIds.length; i += DM_REALTIME_CHUNK) {
    const chunk = conversationIds.slice(i, i + DM_REALTIME_CHUNK);
    const filter = `conversation_id=in.(${chunk.join(',')})`;
    const msgCh = supabase
      .channel(`dm_dm_${userId.slice(0, 8)}_${i}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter,
        },
        () => debounced()
      );
    msgCh.subscribe();
    channels.push(msgCh);
  }

  return () => {
    channels.forEach((c) => {
      void supabase.removeChannel(c);
    });
  };
};
