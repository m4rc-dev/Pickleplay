import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, MessageCircle, Users } from 'lucide-react';
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
import { NewMessagePanel } from './NewMessagePanel';

/** Fallback when Realtime is off or RLS blocks events (see migration 013_enable_dm_realtime_publication.sql) */
const MESSAGE_POLL_FALLBACK_MS = 6000;
const CONVERSATION_POLL_FALLBACK_MS = 55000;

const DISMISSED_EMPTY_CONV_KEY = 'pickleplay_dm_dismissed_empty';

function loadDismissedEmptyConvIds(): Set<string> {
  try {
    if (typeof sessionStorage === 'undefined') return new Set();
    const raw = sessionStorage.getItem(DISMISSED_EMPTY_CONV_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function persistDismissedEmptyConvIds(ids: Set<string>) {
  try {
    sessionStorage.setItem(DISMISSED_EMPTY_CONV_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

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
  /** Conv opened from Find Partners → Message (you send first). Drives Chats vs Requests for empty threads. */
  const [outboundConversationId, setOutboundConversationId] = useState<string | null>(() => {
    try {
      return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pickleplay_dm_outbound_conv') : null;
    } catch {
      return null;
    }
  });
  /** Mutual follow pairs — used to move threads from Requests → Chats once both follow. */
  const [mutualUserIds, setMutualUserIds] = useState<Set<string> | null>(null);
  /** Conv IDs where the viewer has sent ≥1 message — keeps reply threads out of Requests for the initiator. */
  const [convIdsWhereViewerSent, setConvIdsWhereViewerSent] = useState<Set<string>>(() => new Set());
  /** Empty non-mutual threads removed from the inbox until opened again or a message exists. */
  const [dismissedEmptyConvIds, setDismissedEmptyConvIds] = useState<Set<string>>(loadDismissedEmptyConvIds);

  const refreshMutualFollows = useCallback(async () => {
    if (!currentUserId) {
      setMutualUserIds(null);
      return;
    }
    try {
      const [iFollowRes, followsMeRes] = await Promise.all([
        supabase.from('user_follows').select('followed_id').eq('follower_id', currentUserId),
        supabase.from('user_follows').select('follower_id').eq('followed_id', currentUserId),
      ]);
      const iFollowSet = new Set((iFollowRes.data || []).map((r: any) => r.followed_id));
      const followsMeSet = new Set((followsMeRes.data || []).map((r: any) => r.follower_id));
      const mutual = new Set([...iFollowSet].filter(id => followsMeSet.has(id)));
      setMutualUserIds(mutual);
    } catch {
      setMutualUserIds(new Set());
    }
  }, [currentUserId]);

  useEffect(() => {
    void refreshMutualFollows();
  }, [refreshMutualFollows]);

  // Friends chatheads
  const [friends, setFriends] = useState<
    Array<{ id: string; full_name: string; avatar_url?: string; username?: string | null }>
  >([]);
  const [showNewMessagePanel, setShowNewMessagePanel] = useState(false);
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
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id || null;
      setCurrentUserId(uid);
      if (!uid) {
        setIsLoading(false);
        return;
      }
      await Promise.all([loadConversations(), loadFriends(uid)]);
    })();
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

  /** Which threads include an outgoing message from the viewer (so replies stay in Chats, not Requests). */
  useEffect(() => {
    if (!currentUserId) {
      setConvIdsWhereViewerSent(new Set());
      return;
    }
    const convIds = [...new Set(conversations.map((c) => c.id).filter(Boolean))];
    if (convIds.length === 0) {
      setConvIdsWhereViewerSent(new Set());
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .eq('sender_id', currentUserId)
        .is('deleted_at', null)
        .limit(1000);
      if (cancelled || error) return;
      const found = new Set<string>();
      for (const row of data || []) {
        found.add((row as { conversation_id: string }).conversation_id);
      }
      if (cancelled) return;
      setConvIdsWhereViewerSent((prev) => {
        if (found.size === 0 && prev.size === 0) return prev;
        const next = new Set(prev);
        found.forEach((id) => next.add(id));
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, conversationIdsKey]);

  /**
   * Requests tab only: last message from them, not mutual, and you never sent a message (true inbound request).
   */
  const requestConvIds = useMemo(() => {
    if (!currentUserId) return new Set<string>();
    const ids = new Set<string>();
    for (const c of conversations) {
      const otherId = c.other_user?.id;
      if (!otherId || !c.last_message) continue;
      if (c.last_message.sender_id === currentUserId) continue;
      if (mutualUserIds?.has(otherId)) continue;
      if (convIdsWhereViewerSent.has(c.id)) continue;
      ids.add(c.id);
    }
    return ids;
  }, [conversations, currentUserId, mutualUserIds, convIdsWhereViewerSent]);

  // Realtime: only this user's threads + new participant rows (new conversations)
  useEffect(() => {
    if (!currentUserId) return;
    const ids = conversationIdsKey ? conversationIdsKey.split(',').filter(Boolean) : [];
    return subscribeToConversationListUpdates(currentUserId, ids, () => {
      void refreshConversationsQuiet();
    });
  }, [currentUserId, conversationIdsKey, refreshConversationsQuiet]);

  useEffect(() => {
    if (!conversationIdFromUrl || conversations.length === 0) return;
    const conv = conversations.find(c => c.id === conversationIdFromUrl);
    if (!conv) return;
    const isGhostInbound =
      !conv.last_message && conversationIdFromUrl !== outboundConversationId;
    if (isGhostInbound) {
      setSelectedConversation(null);
      setSearchParams({});
      return;
    }
    setSelectedConversation(prev => (prev?.id === conv.id ? { ...prev, ...conv } : conv));
  }, [conversationIdFromUrl, conversations, outboundConversationId, setSearchParams]);

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
      if (currentUserId && message.sender_id === currentUserId) {
        setConvIdsWhereViewerSent((prev) => new Set(prev).add(id));
      }
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
  }, [selectedConversation?.id, refreshConversationsQuiet, onConversationRead, currentUserId]);

  useEffect(() => {
    const pollConvos = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      await refreshConversationsQuiet();
    }, CONVERSATION_POLL_FALLBACK_MS);

    return () => clearInterval(pollConvos);
  }, [refreshConversationsQuiet]);

  const loadFriends = async (uid?: string) => {
    try {
      const userId = uid || currentUserId;
      if (!userId) return;
      const [iFollowRes, followsMeRes] = await Promise.all([
        supabase.from('user_follows').select('followed_id').eq('follower_id', userId),
        supabase.from('user_follows').select('follower_id').eq('followed_id', userId),
      ]);
      const iFollowIds = new Set((iFollowRes.data || []).map((r: any) => r.followed_id));
      const followsMeIds = (followsMeRes.data || []).map((r: any) => r.follower_id);
      const mutualIds = followsMeIds.filter((id: string) => iFollowIds.has(id));
      if (!mutualIds.length) { setFriends([]); return; }
      const { data: profiles } = await supabase
        .from('profiles').select('id, full_name, avatar_url, username').in('id', mutualIds);
      setFriends(profiles || []);
    } catch (_) {}
  };

  /**
   * Hide inbound empty shells (other person has not sent anything yet) so they do not appear in Chats/Requests.
   * Always show: threads with any message, your outbound composer session, mutual friends' empty threads.
   */
  const visibleConversations = useMemo(() => {
    if (!currentUserId) return conversations;
    const friendIds = new Set(friends.map(f => f.id));
    return conversations.filter(c => {
      if (c.last_message) return true;
      if (dismissedEmptyConvIds.has(c.id)) return false;
      if (c.id === outboundConversationId) return true;
      const otherId = c.other_user?.id;
      if (otherId && friendIds.has(otherId)) return true;
      if (otherId && mutualUserIds?.has(otherId)) return true;
      return false;
    });
  }, [conversations, currentUserId, outboundConversationId, mutualUserIds, friends, dismissedEmptyConvIds]);

  /** Empty thread with someone who is not a mutual friend — draft message request only. */
  const isDismissibleEmptyThread = useCallback(
    (c: ConversationWithDetails) => {
      if (c.last_message) return false;
      const oid = c.other_user?.id;
      if (!oid) return false;
      if (friends.some((f) => f.id === oid)) return false;
      if (mutualUserIds?.has(oid)) return false;
      return true;
    },
    [friends, mutualUserIds]
  );

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
    setDismissedEmptyConvIds((prev) => {
      if (!prev.has(conversation.id)) return prev;
      const next = new Set(prev);
      next.delete(conversation.id);
      persistDismissedEmptyConvIds(next);
      return next;
    });
    setShowNewMessagePanel(false);
    setCanMessage(null);
    setSelectedConversation(conversation);
    const tab = searchParams.get('tab');
    if (tab === 'chats' || tab === 'requests') {
      setSearchParams({ conversation: conversation.id, tab });
    } else {
      setSearchParams({ conversation: conversation.id });
    }
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
      // If I messaged first, their reply is not a new "request" — no Accept banner for me.
      if (hasIncomingMessages && !hasOwnMessages) return 'incoming_request';
      if (hasOwnMessages && hasIncomingMessages) return 'chat';
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
      setConvIdsWhereViewerSent((prev) => new Set(prev).add(selectedConversation.id));
      addMessageDeduped(message);      // deduplicated — realtime echo won't duplicate
      updateConversationPreview(message);
      if (selectedConversation.id === outboundConversationId) {
        try {
          sessionStorage.removeItem('pickleplay_dm_outbound_conv');
        } catch {
          /* ignore */
        }
        setOutboundConversationId(null);
      }
      void refreshMutualFollows();
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(text); // restore on failure
      alert('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleBack = () => {
    setShowNewMessagePanel(false);
    setMessages([]);
    setCanMessage(null);
    setSelectedConversation(null);
    const tab = searchParams.get('tab');
    setSearchParams(tab === 'chats' || tab === 'requests' ? { tab } : {});
  };

  /** Remove an empty draft “message request” thread from the Chats list (client-side; not deleted on server). */
  const dismissEmptyConversation = useCallback(
    (conv: ConversationWithDetails) => {
      if (!isDismissibleEmptyThread(conv)) return;
      setDismissedEmptyConvIds((prev) => {
        const next = new Set(prev);
        next.add(conv.id);
        persistDismissedEmptyConvIds(next);
        return next;
      });
      messageCacheRef.current.delete(conv.id);
      if (selectedConversationRef.current?.id === conv.id) {
        setShowNewMessagePanel(false);
        setMessages([]);
        setCanMessage(null);
        setSelectedConversation(null);
        const tab = searchParams.get('tab');
        setSearchParams(tab === 'chats' || tab === 'requests' ? { tab } : {});
      }
      if (outboundConversationId === conv.id) {
        setOutboundConversationId(null);
        try {
          sessionStorage.removeItem('pickleplay_dm_outbound_conv');
        } catch {
          /* ignore */
        }
      }
    },
    [isDismissibleEmptyThread, outboundConversationId, searchParams, setSearchParams]
  );

  // Accept a message request: follow the other user, then re-check mutual follow to unlock chat
  const handleAcceptRequest = async () => {
    if (!selectedConversation?.other_user?.id) return;
    await followUser(selectedConversation.other_user.id);
    const mutual = await checkMutualFollow(selectedConversation.other_user.id);
    setCanMessage(mutual);
    await loadFriends();
    await refreshMutualFollows();
  };

  /** Open or create a DM from Friends, New Message panel, etc. Marks outbound empty threads so they are not cleared as “ghost” inbound shells (same as Find Partners → Message). */
  const handleFriendClick = async (otherUserId: string) => {
    try {
      const convId = await getOrCreateConversation(otherUserId);
      try {
        sessionStorage.setItem('pickleplay_dm_outbound_conv', convId);
      } catch {
        /* ignore */
      }
      setOutboundConversationId(convId);

      let conv = conversations.find(c => c.id === convId);
      if (!conv) {
        const fresh = await getUserConversations();
        setConversations(fresh);
        conv = fresh.find(c => c.id === convId);
      }
      if (conv) selectConversation(conv);
    } catch (err) {
      console.error('Error opening direct message:', err);
    }
  };

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden bg-white md:h-screen md:max-h-none md:flex-row">
      {/* Conversation list — mobile: full-height inbox; hidden while a thread is open. */}
      <div
        className={`md:max-h-none ${
          selectedConversation
            ? 'hidden shrink-0 md:flex md:h-full md:flex-col'
            : 'flex min-h-0 flex-col max-md:flex-1 md:h-full md:shrink-0 md:flex-initial'
        }`}
      >
        <ConversationList
          conversations={visibleConversations}
          selectedConversationId={selectedConversation?.id}
          initialListTab={searchParams.get('tab') === 'requests' ? 'requests' : 'chats'}
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
          onNewMessage={() => setShowNewMessagePanel(true)}
          isDismissibleEmptyThread={isDismissibleEmptyThread}
          onDismissEmptyConversation={dismissEmptyConversation}
        />
      </div>

      {selectedConversation ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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
        </div>
      ) : (
        /* Desktop only: placeholder when no thread selected (mobile uses full-height list only). */
        <div className="hidden min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-slate-50 px-6 py-12 md:flex">
          <div className="w-full max-w-sm text-center">
            <MessageCircle className="mx-auto mb-4 text-slate-300" size={64} />
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-400">Your Messages</h2>
            <p className="mt-2 text-sm text-slate-500">Send a message to start a chat.</p>
            <button
              type="button"
              onClick={() => setShowNewMessagePanel(true)}
              className="mt-8 w-full max-w-xs rounded-2xl bg-blue-600 px-8 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-md transition-colors hover:bg-blue-700"
            >
              Send message
            </button>
            <p className="mt-6 text-xs text-slate-400">Or select a conversation from the list</p>

            <div className="mt-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Users size={22} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Explore</p>
                  <p className="mt-0.5 text-base font-black uppercase tracking-tight text-slate-900">Find Partners</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                    Browse players, compare skills, send match invites, and open full profiles — same as Find Partners.
                  </p>
                  <Link
                    to="/partners"
                    className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-blue-600 transition-colors hover:text-blue-700"
                  >
                    More details
                    <ArrowRight size={14} strokeWidth={2.5} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewMessagePanel && (
        <>
          <button
            type="button"
            aria-label="Close new message"
            className="fixed inset-0 z-[100] cursor-default bg-slate-900/25 backdrop-blur-[1px]"
            onClick={() => setShowNewMessagePanel(false)}
          />
          <div className="fixed inset-y-0 right-0 z-[101] flex w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-xl md:max-w-md">
            <NewMessagePanel
              onClose={() => setShowNewMessagePanel(false)}
              currentUserId={currentUserId}
              suggested={friends}
              onSelectUser={async (userId) => {
                await handleFriendClick(userId);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default DirectMessages;
