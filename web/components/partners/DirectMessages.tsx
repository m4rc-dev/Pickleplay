import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';
import {
  getUserConversations,
  getConversationMessages,
  getOrCreateConversation,
  sendMessage,
  markConversationAsRead,
  subscribeToConversation,
  subscribeToAllConversations,
  checkMutualFollow,
  followUser,
  type ConversationWithDetails,
  type DirectMessage
} from '../../services/directMessages';
import { ConversationList } from './ConversationList';
import { ChatArea } from './ChatArea';

const POLL_INTERVAL_MS = 3000; // poll every 3 seconds as realtime fallback

interface DirectMessagesProps {
  onConversationRead?: () => void;
}

const DirectMessages: React.FC<DirectMessagesProps> = ({ onConversationRead }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationIdFromUrl = searchParams.get('conversation');

  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState(() => searchParams.get('prefill') || '');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canMessage, setCanMessage] = useState<boolean | null>(null);
  // Set of conversation IDs that are "message requests" (non-mutual + has messages)
  const [requestConvIds, setRequestConvIds] = useState<Set<string>>(new Set());

  // Friends chatheads
  const [friends, setFriends] = useState<Array<{ id: string; full_name: string; avatar_url?: string }>>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Deduplicate helper — prevents double-render from optimistic + realtime
  const addMessageDeduped = (msg: DirectMessage) => {
    setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
  };

  // Update a conversation's last_message preview in-place (no full reload)
  const updateConversationPreview = (msg: DirectMessage) => {
    setConversations(prev =>
      prev.map(c =>
        c.id === (msg as any).conversation_id
          ? { ...c, last_message: msg, last_message_at: msg.created_at }
          : c
      ).sort((a, b) =>
        new Date(b.last_message_at || b.created_at).getTime() -
        new Date(a.last_message_at || a.created_at).getTime()
      )
    );
  };

  useEffect(() => {
    loadCurrentUser();
    loadConversations();
    loadFriends();
  }, []);

  // Global realtime: catch messages in any conversation to update previews + load new convs
  useEffect(() => {
    const unsubscribe = subscribeToAllConversations(() => {
      // Silently refresh conversation list (no spinner) for new conversations only
      getUserConversations()
        .then(fresh => {
          setConversations(prev => {
            // Add any brand-new conversations that didn't exist before
            const existingIds = new Set(prev.map(c => c.id));
            const newOnes = fresh.filter(c => !existingIds.has(c.id));
            if (newOnes.length > 0) return [...newOnes, ...prev];
            return prev; // preview updates come from per-conversation subscription
          });
        })
        .catch(() => {});
    });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (conversationIdFromUrl && conversations.length > 0) {
      const conv = conversations.find(c => c.id === conversationIdFromUrl);
      if (conv) selectConversation(conv);
    }
  }, [conversationIdFromUrl, conversations]);

  // Check mutual follow whenever the selected conversation changes
  useEffect(() => {
    if (!selectedConversation?.other_user?.id) return;
    setCanMessage(null);
    checkMutualFollow(selectedConversation.other_user.id).then(setCanMessage);
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (!selectedConversation) return;
    loadMessages();
    markConversationAsRead(selectedConversation.id).then(() => {
      onConversationRead?.();
    }).catch(() => {});

    // Try Supabase Realtime (will work if table is in supabase_realtime publication)
    const unsubscribe = subscribeToConversation(
      selectedConversation.id,
      (message) => {
        addMessageDeduped(message);
        updateConversationPreview(message);
        markConversationAsRead(selectedConversation.id).then(() => {
          onConversationRead?.();
        }).catch(() => {});
      }
    );

    // Polling fallback: re-fetch messages every few seconds to guarantee freshness
    const pollTimer = setInterval(async () => {
      try {
        const fresh = await getConversationMessages(selectedConversation.id);
        setMessages(fresh);
      } catch (_) {}
    }, POLL_INTERVAL_MS);

    return () => {
      unsubscribe();
      clearInterval(pollTimer);
    };
  }, [selectedConversation?.id]);

  // Poll conversations list for sidebar freshness (new convos, updated previews)
  useEffect(() => {
    const pollConvos = setInterval(async () => {
      try {
        const fresh = await getUserConversations();
        setConversations(fresh);
      } catch (_) {}
    }, POLL_INTERVAL_MS * 2); // slightly slower cadence for the list

    return () => clearInterval(pollConvos);
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadFriends = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: iFollow } = await supabase
        .from('user_follows').select('followed_id').eq('follower_id', user.id);
      const iFollowIds = (iFollow || []).map((r: any) => r.followed_id);
      if (!iFollowIds.length) { setFriends([]); return; }
      const { data: theyFollow } = await supabase
        .from('user_follows').select('follower_id')
        .eq('followed_id', user.id).in('follower_id', iFollowIds);
      const mutualIds = (theyFollow || []).map((r: any) => r.follower_id);
      if (!mutualIds.length) { setFriends([]); return; }
      const { data: profiles } = await supabase
        .from('profiles').select('id, full_name, avatar_url').in('id', mutualIds);
      setFriends(profiles || []);
    } catch (_) {}
  };

  // Supabase Realtime Presence — track who's online
  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase.channel('dm-presence', {
      config: { presence: { key: currentUserId } }
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ user_id: string }>();
        const ids = new Set<string>();
        Object.values(state).forEach(presences =>
          (presences as any[]).forEach(p => p.user_id && ids.add(p.user_id))
        );
        setOnlineUserIds(ids);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: currentUserId, online_at: new Date().toISOString() });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  // Compute which conversations are "message requests" (other user not a mutual follow)
  const computeRequestConvIds = useCallback(async (convs: ConversationWithDetails[], myId: string) => {
    if (convs.length === 0) return;
    try {
      const [iFollowRes, followsMeRes] = await Promise.all([
        supabase.from('user_follows').select('followed_id').eq('follower_id', myId),
        supabase.from('user_follows').select('follower_id').eq('followed_id', myId),
      ]);
      const iFollowSet = new Set((iFollowRes.data || []).map((r: any) => r.followed_id));
      const followsMeSet = new Set((followsMeRes.data || []).map((r: any) => r.follower_id));
      const mutualSet = new Set([...iFollowSet].filter(id => followsMeSet.has(id)));
      const reqIds = new Set(
        convs
          .filter(c => c.other_user?.id && c.last_message && !mutualSet.has(c.other_user.id))
          .map(c => c.id)
      );
      setRequestConvIds(reqIds);
    } catch (_) {}
  }, []);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const convs = await getUserConversations();
      setConversations(convs);
      // Get current user id for follow-check (may be loaded asynchronously)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) computeRequestConvIds(convs, user.id);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedConversation) return;
    try {
      setMessages(await getConversationMessages(selectedConversation.id));
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const selectConversation = (conversation: ConversationWithDetails) => {
    setSelectedConversation(conversation);
    setSearchParams({ conversation: conversation.id });
    // Mark as read immediately and clear the nav badge
    markConversationAsRead(conversation.id).then(() => {
      onConversationRead?.();
    }).catch(() => {});
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || isSending) return;
    setIsSending(true);
    const text = newMessage.trim();
    setNewMessage('');
    try {
      const message = await sendMessage(selectedConversation.id, text);
      addMessageDeduped(message);      // deduplicated — realtime echo won't duplicate
      updateConversationPreview(message);
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(text); // restore on failure
      alert('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setSearchParams({});
  };

  // Accept a message request: follow the other user, then re-check mutual follow to unlock chat
  const handleAcceptRequest = async () => {
    if (!selectedConversation?.other_user?.id) return;
    await followUser(selectedConversation.other_user.id);
    const mutual = await checkMutualFollow(selectedConversation.other_user.id);
    setCanMessage(mutual);
    // Remove from request set since we've now followed them
    setRequestConvIds(prev => { const next = new Set(prev); next.delete(selectedConversation.id); return next; });
  };

  const handleFriendClick = async (friendId: string) => {
    try {
      const convId = await getOrCreateConversation(friendId);
      // Find in existing list or reload
      let conv = conversations.find(c => c.id === convId);
      if (!conv) {
        const fresh = await getUserConversations();
        setConversations(fresh);
        conv = fresh.find(c => c.id === convId);
      }
      if (conv) selectConversation(conv);
    } catch (err) {
      console.error('Error opening friend chat:', err);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] md:h-screen bg-white flex flex-col md:flex-row overflow-hidden">
      {/* Conversation list — above on mobile (compact strip), sidebar on desktop */}
      <div className="flex shrink-0 md:h-full max-h-36 md:max-h-none">
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversation?.id}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={selectConversation}
          isLoading={isLoading}
          currentUserId={currentUserId}
          requestConvIds={requestConvIds}
          friends={friends}
          onlineUserIds={onlineUserIds}
          onFriendClick={handleFriendClick}
        />
      </div>

      {selectedConversation ? (
        <ChatArea
          conversation={selectedConversation}
          messages={messages}
          currentUserId={currentUserId}
          newMessage={newMessage}
          isSending={isSending}
          canMessage={canMessage}
          onAcceptRequest={handleAcceptRequest}
          onNewMessageChange={setNewMessage}
          onSendMessage={handleSendMessage}
          onBack={handleBack}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center bg-slate-50">
          <div className="text-center">
            <MessageCircle className="text-slate-300 mx-auto mb-4" size={64} />
            <h2 className="text-xl font-black text-slate-400 uppercase tracking-tight mb-1">
              Your Messages
            </h2>
            <p className="text-slate-400 text-sm md:block hidden">Select a conversation to start chatting</p>
            <p className="text-slate-400 text-sm md:hidden">Tap a conversation above to start</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectMessages;
