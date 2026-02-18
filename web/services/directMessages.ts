import { supabase } from './supabase';

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

/**
 * Get or create a conversation with another user
 */
export const getOrCreateConversation = async (otherUserId: string) => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .rpc('get_or_create_conversation', {
      user1_id: user.user.id,
      user2_id: otherUserId
    });

  if (error) throw error;
  return data as string; // Returns conversation ID
};

/**
 * Get all conversations for the current user
 */
export const getUserConversations = async () => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  // Get conversations the user is part of
  const { data: participantData, error: participantError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.user.id);

  if (participantError) throw participantError;

  const conversationIds = participantData.map(p => p.conversation_id);

  if (conversationIds.length === 0) {
    return [];
  }

  // Get conversation details with last message
  const { data: conversations, error: conversationError } = await supabase
    .from('conversations')
    .select(`
      *,
      participants:conversation_participants(
        user:profiles(id, full_name, avatar_url, skill_level)
      )
    `)
    .in('id', conversationIds)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (conversationError) throw conversationError;

  // Get last message for each conversation
  const conversationsWithMessages = await Promise.all(
    (conversations || []).map(async (conv) => {
      // Get last message
      const { data: lastMessage } = await supabase
        .from('direct_messages')
        .select(`
          *,
          sender:profiles(id, full_name, avatar_url)
        `)
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get unread count
      const { data: unreadData } = await supabase
        .from('direct_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .neq('sender_id', user.user!.id)
        .not('id', 'in', 
          `(SELECT message_id FROM message_read_receipts WHERE user_id = '${user.user!.id}')`
        );

      // Filter out current user from participants to get "other user"
      const otherUser = conv.participants?.find(
        (p: any) => p.user.id !== user.user!.id
      )?.user;

      return {
        ...conv,
        last_message: lastMessage,
        unread_count: 0, // TODO: Fix this query
        other_user: otherUser
      };
    })
  );

  return conversationsWithMessages as ConversationWithDetails[];
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
    .select(`
      *,
      sender:profiles(id, full_name, avatar_url)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (beforeMessageId) {
    const { data: beforeMessage } = await supabase
      .from('direct_messages')
      .select('created_at')
      .eq('id', beforeMessageId)
      .single();

    if (beforeMessage) {
      query = query.lt('created_at', beforeMessage.created_at);
    }
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data as DirectMessage[]).reverse(); // Return in chronological order
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (conversationId: string, content: string) => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.user.id,
      content
    })
    .select(`
      *,
      sender:profiles(id, full_name, avatar_url)
    `)
    .single();

  if (error) throw error;
  return data as DirectMessage;
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
    .select(`
      *,
      sender:profiles(id, full_name, avatar_url)
    `)
    .single();

  if (error) throw error;
  return data as DirectMessage;
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
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('message_read_receipts')
    .insert({
      message_id: messageId,
      user_id: user.user.id
    });

  // Ignore duplicate key errors (already marked as read)
  if (error && error.code !== '23505') throw error;
};

/**
 * Mark all messages in a conversation as read
 */
export const markConversationAsRead = async (conversationId: string) => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  // Get all unread messages in the conversation
  const { data: messages } = await supabase
    .from('direct_messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.user.id);

  if (!messages || messages.length === 0) return;

  // Mark all as read
  const receipts = messages.map(msg => ({
    message_id: msg.id,
    user_id: user.user.id
  }));

  const { error } = await supabase
    .from('message_read_receipts')
    .insert(receipts);

  // Ignore duplicate key errors
  if (error && error.code !== '23505') throw error;
};

/**
 * Subscribe to new messages in a conversation
 */
export const subscribeToConversation = (
  conversationId: string,
  callback: (message: DirectMessage) => void
) => {
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        // Fetch full message with sender data
        const { data } = await supabase
          .from('direct_messages')
          .select(`
            *,
            sender:profiles(id, full_name, avatar_url)
          `)
          .eq('id', (payload.new as any).id)
          .single();

        if (data) callback(data as DirectMessage);
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
};

/**
 * Subscribe to all conversations (for conversation list updates)
 */
export const subscribeToAllConversations = (
  callback: () => void
) => {
  const channel = supabase
    .channel('all_conversations')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'direct_messages',
      },
      () => {
        callback();
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
};
