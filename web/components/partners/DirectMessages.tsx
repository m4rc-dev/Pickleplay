import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
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
  subscribeToConversationListUpdates,
  checkMutualFollow,
  followUser,
  type ConversationWithDetails,
  type DirectMessage
} from '../../services/directMessages';
import { ConversationList } from './ConversationList';
import { ChatArea, type MessageGateState } from './ChatArea';

/** Fallback when Realtime is off or RLS blocks events (see migration 013_enable_dm_realtime_publication.sql) */
const MESSAGE_POLL_FALLBACK_MS = 6000;
const CONVERSATION_POLL_FALLBACK_MS = 55000;

interface DirectMessagesProps {
  /** Fired after we attempt to mark the thread read — use to refresh nav / bell badges */
  onConversationRead?: (conversationId: string) => void;
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
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  // Inbound message requests only.
  const [requestConvIds, setRequestConvIds] = useState<Set<string>>(new Set());

  // Friends chatheads
  const [friends, setFriends] = useState<Array<{ id: string; full_name: string; avatar_url?: string }>>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const messageCacheRef = useRef<Map<string, DirectMessage[]>>(new Map());
  const loadGenRef = useRef(0);
  const selectedConversationRef = useRef<ConversationWithDetails | null>(null);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  const prefetchConversationMessages = useCallback((conversationId: string) => {
    if (messageCacheRef.current.has(conversationId)) return;
    void getConversationMessages(conversationId).then((msgs) => {
      messageCacheRef.current.set(conversationId, msgs);
    }).catch(() => {});
  }, []);

  // Deep link: warm cache as soon as the list is available (squad-style preload)
  useEffect(() => {
    if (!conversationIdFromUrl || conversations.length === 0) return;
    prefetchConversationMessages(conversationIdFromUrl);
  }, [conversationIdFromUrl, conversations.length, prefetchConversationMessages]);

  // Deduplicate helper — prevents double-render from optimistic + realtime
  const addMessageDeduped = (msg: DirectMessage) => {
    setMessages((prev) => {
      const next = prev.some((m) => m.id === msg.id) ? prev : [...prev, msg];
      const sel = selectedConversationRef.current;
      if (sel?.id === msg.conversation_id) {
        messageCacheRef.current.set(msg.conversation_id, next);
      }
      return next;
    });
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

  const refreshConversationsQuiet = useCallback(async () => {
    try {
      const fresh = await getUserConversations();
      setConversations(fresh);
    } catch {
      /* ignore */
    }
  }, []);

  const conversationIdsKey = useMemo(
    () => [...conversations].map((c) => c.id).sort().join(','),
    [conversations]
  );

  // Realtime: only this user's threads + new participant rows (new conversations)
  useEffect(() => {
    if (!currentUserId) return;
    const ids = conversationIdsKey ? conversationIdsKey.split(',').filter(Boolean) : [];
    return subscribeToConversationListUpdates(currentUserId, ids, () => {
      void refreshConversationsQuiet();
    });
  }, [currentUserId, conversationIdsKey, refreshConversationsQuiet]);

  useEffect(() => {
    if (conversationIdFromUrl && conversations.length > 0) {
      const conv = conversations.find(c => c.id === conversationIdFromUrl);
      if (conv) {
        setSelectedConversation(prev => prev?.id === conv.id ? { ...prev, ...conv } : conv);
      }
    }
  }, [conversationIdFromUrl, conversations]);

  // Check mutual follow whenever the selected conversation changes
  useEffect(() => {
    if (!selectedConversation?.other_user?.id) {
      setCanMessage(null);
      return;
    }
    setCanMessage(null);
    checkMutualFollow(selectedConversation.other_user.id).then(setCanMessage);
  }, [selectedConversation?.id]);

  useLayoutEffect(() => {
    if (!selectedConversation) return;
    const id = selectedConversation.id;
    const cached = messageCacheRef.current.get(id);
    if (cached) {
      setMessages(cached);
      setIsMessagesLoading(false);
    } else {
      setMessages([]);
      setIsMessagesLoading(true);
    }
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (!selectedConversation) return;
    const id = selectedConversation.id;
    const gen = ++loadGenRef.current;

    void (async () => {
      try {
        const fresh = await getConversationMessages(id);
        if (loadGenRef.current !== gen) return;
        messageCacheRef.current.set(id, fresh);
        setMessages(fresh);
      } catch (error) {
        console.error('Error loading messages:', error);
        if (loadGenRef.current === gen) setMessages([]);
      } finally {
        if (loadGenRef.current === gen) setIsMessagesLoading(false);
      }
    })();

    void markConversationAsRead(id)
      .catch(() => {})
      .finally(() => {
        onConversationRead?.(id);
        void refreshConversationsQuiet();
      });

    const unsubscribe = subscribeToConversation(id, (message) => {
      addMessageDeduped(message);
      updateConversationPreview(message);
      void markConversationAsRead(id)
        .catch(() => {})
        .finally(() => {
          onConversationRead?.(id);
          void refreshConversationsQuiet();
        });
    });

    const pollTimer = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const fresh = await getConversationMessages(id);
        if (loadGenRef.current !== gen || selectedConversationRef.current?.id !== id) return;
        messageCacheRef.current.set(id, fresh);
        setMessages(fresh);
      } catch {
        /* ignore */
      }
    }, MESSAGE_POLL_FALLBACK_MS);

    const refetchOpenThread = () => {
      if (document.visibilityState !== 'visible') return;
      void (async () => {
        try {
          const fresh = await getConversationMessages(id);
          if (loadGenRef.current !== gen || selectedConversationRef.current?.id !== id) return;
          messageCacheRef.current.set(id, fresh);
          setMessages(fresh);
        } catch {
          /* ignore */
        }
      })();
    };
    const onVisibility = () => refetchOpenThread();
    const onFocus = () => refetchOpenThread();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      unsubscribe();
      clearInterval(pollTimer);
    };
  }, [selectedConversation?.id, refreshConversationsQuiet, onConversationRead]);

  useEffect(() => {
    const pollConvos = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      await refreshConversationsQuiet();
    }, CONVERSATION_POLL_FALLBACK_MS);

    return () => clearInterval(pollConvos);
  }, [refreshConversationsQuiet]);

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

  // Compute inbound message requests (non-mutual and last message came from them).
  const computeRequestConvIds = useCallback(async (convs: ConversationWithDetails[], myId: string) => {
    if (convs.length === 0) {
      setRequestConvIds(new Set());
      return;
    }
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
          .filter(c =>
            c.other_user?.id &&
            c.last_message &&
            c.last_message.sender_id !== myId &&
            !mutualSet.has(c.other_user.id)
          )
          .map(c => c.id)
      );
      setRequestConvIds(reqIds);
    } catch (_) {
      setRequestConvIds(new Set());
    }
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setRequestConvIds(new Set());
      return;
    }
    computeRequestConvIds(conversations, currentUserId);
  }, [computeRequestConvIds, conversations, currentUserId]);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const convs = await getUserConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectConversation = (conversation: ConversationWithDetails) => {
    setCanMessage(null);
    setSelectedConversation(conversation);
    setSearchParams({ conversation: conversation.id });
    prefetchConversationMessages(conversation.id);
  };

  /**
   * Composer UI without a "checking access" pause: infer from messages while mutual-follow loads.
   * Empty thread defaults to normal chat composer; flips to new_request if not mutual.
   */
  const composerGateState: MessageGateState = (() => {
    if (!selectedConversation) return 'chat';

    if (canMessage === true) return 'chat';

    const hasOwnMessages = currentUserId
      ? messages.some((message) => message.sender_id === currentUserId)
      : false;
    const hasIncomingMessages = currentUserId
      ? messages.some((message) => message.sender_id !== currentUserId)
      : messages.length > 0;

    if (canMessage === false) {
      if (hasIncomingMessages) return 'incoming_request';
      if (hasOwnMessages) return 'outgoing_request';
      return 'new_request';
    }

    // canMessage === null — access check still in flight
    if (hasIncomingMessages && hasOwnMessages) return 'chat';
    if (hasIncomingMessages) return 'incoming_request';
    if (hasOwnMessages) return 'outgoing_request';
    return 'chat';
  })();

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || isSending) return;
    if (composerGateState !== 'chat' && composerGateState !== 'new_request') return;
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
    setMessages([]);
    setCanMessage(null);
    setSelectedConversation(null);
    setSearchParams({});
  };

  // Accept a message request: follow the other user, then re-check mutual follow to unlock chat
  const handleAcceptRequest = async () => {
    if (!selectedConversation?.other_user?.id) return;
    await followUser(selectedConversation.other_user.id);
    const mutual = await checkMutualFollow(selectedConversation.other_user.id);
    setCanMessage(mutual);
    await loadFriends();
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
          onConversationHover={prefetchConversationMessages}
        />
      </div>

      {selectedConversation ? (
        <ChatArea
          conversation={selectedConversation}
          messages={messages}
          currentUserId={currentUserId}
          newMessage={newMessage}
          isSending={isSending}
          messageGateState={composerGateState}
          isThreadLoading={isMessagesLoading && messages.length === 0}
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
