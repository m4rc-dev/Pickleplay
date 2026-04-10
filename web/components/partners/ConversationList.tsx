import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, MessageCircle, Search, SquarePen, UserCheck, Users, X } from 'lucide-react';
import { type ConversationWithDetails } from '../../services/directMessages';
import { AvatarImg } from './PlaceholderAvatar';

interface Friend {
  id: string;
  full_name: string;
  avatar_url?: string;
  username?: string | null;
}

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  selectedConversationId?: string;
  /** Initial tab when opening Messages (e.g. from Find Partners with tab=chats). */
  initialListTab?: 'chats' | 'requests';
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (conversation: ConversationWithDetails) => void;
  isLoading: boolean;
  currentUserId: string | null;
  requestConvIds?: Set<string>;
  friends?: Friend[];
  onlineUserIds?: Set<string>;
  onFriendClick?: (friendId: string) => void;
  /** Warm cache before click — same idea as squad preloading */
  onConversationHover?: (conversationId: string) => void;
  /** Opens the new-message panel (search + suggested). */
  onNewMessage?: () => void;
  /** Empty non-mutual draft threads — show remove control. */
  isDismissibleEmptyThread?: (conv: ConversationWithDetails) => boolean;
  onDismissEmptyConversation?: (conv: ConversationWithDetails) => void;
  /** While inbox + mutual friends are loading — shows Friends strip skeleton (no online dots). */
  friendsLoading?: boolean;
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

/** Placeholder row matching Friends chatheads layout — no online/status dots while loading. */
const FriendsChatheadsSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={className} aria-busy="true" aria-label="Loading friends">
    <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-400">Friends</p>
    <div
      className="-mx-1 flex flex-row flex-nowrap gap-4 overflow-x-hidden px-2 py-2"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex shrink-0 flex-col items-center gap-1">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full border-2 border-white bg-slate-100 shadow-md" />
          <div className="h-2 w-9 animate-pulse rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  </div>
);

/** Matches avatar row + label height so tabs below don’t jump when swapping skeleton → real data. */
const FRIENDS_STRIP_MIN_PX = 92;

/**
 * Crossfades skeleton and real chatheads in one slot so layout height stays stable
 * (no jump on Chats / Requests tabs).
 */
const FriendsStripCrossfade: React.FC<{
  friendsLoading: boolean;
  friends: Friend[];
  onlineUserIds: Set<string>;
  onFriendClick?: (friendId: string) => void;
  className?: string;
}> = ({ friendsLoading, friends, onlineUserIds, onFriendClick, className = '' }) => {
  if (!friendsLoading && friends.length === 0) return null;

  return (
    <div
      className={`relative isolate transition-[min-height] duration-300 ease-out motion-reduce:transition-none ${className}`}
      style={{
        minHeight: friendsLoading ? `${FRIENDS_STRIP_MIN_PX}px` : undefined,
      }}
    >
      {/* Skeleton layer — fades out when data is ready */}
      <div
        className={`transition-opacity duration-300 ease-out motion-reduce:transition-none ${
          friendsLoading
            ? 'relative z-[2] opacity-100'
            : 'pointer-events-none absolute inset-x-0 top-0 z-0 opacity-0'
        }`}
        aria-hidden={!friendsLoading}
      >
        <FriendsChatheadsSkeleton />
      </div>
      {/* Real layer — fades in */}
      <div
        className={`transition-opacity duration-300 ease-out motion-reduce:transition-none ${
          friendsLoading
            ? 'pointer-events-none absolute inset-x-0 top-0 z-[1] opacity-0'
            : 'relative z-[1] opacity-100'
        }`}
      >
        {!friendsLoading && (
          <FriendsChatheads
            friends={friends}
            onlineUserIds={onlineUserIds}
            onFriendClick={onFriendClick}
          />
        )}
      </div>
    </div>
  );
};

/** Horizontal mutual-friends strip — shared by desktop header and mobile Chats tab. */
const FriendsChatheads: React.FC<{
  friends: Friend[];
  onlineUserIds: Set<string>;
  onFriendClick?: (friendId: string) => void;
  className?: string;
}> = ({ friends, onlineUserIds, onFriendClick, className = '' }) => {
  if (friends.length === 0) return null;
  return (
    <div className={className}>
      <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-400">Friends</p>
      <div
        className="-mx-1 flex flex-row flex-nowrap gap-4 overflow-x-auto px-2 py-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {friends.map((friend) => {
          const isOnline = onlineUserIds.has(friend.id);
          return (
            <button
              key={friend.id}
              type="button"
              onClick={() => onFriendClick?.(friend.id)}
              className="group flex shrink-0 flex-col items-center gap-1"
              title={friend.full_name}
            >
              <div className="relative isolate">
                <div className="h-11 w-11 rounded-full border-2 border-white bg-slate-100 shadow-md transition-colors duration-200 group-hover:border-lime-400 group-hover:shadow-lg">
                  <div className="h-full w-full overflow-hidden rounded-full">
                    <AvatarImg
                      src={friend.avatar_url}
                      alt={friend.full_name}
                      className="h-full w-full object-cover"
                      placeholderClassName="h-full w-full"
                      placeholderIconSize={22}
                    />
                  </div>
                </div>
                <span
                  className={`absolute bottom-0 right-0 z-10 h-3 w-3 rounded-full border-2 border-white shadow-sm transition-colors ${
                    isOnline ? 'bg-emerald-400' : 'bg-slate-300'
                  }`}
                  aria-hidden
                />
              </div>
              <span className="w-11 truncate text-center text-[9px] font-semibold text-slate-500 transition-colors group-hover:text-slate-800">
                {(friend.full_name || '').split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  initialListTab = 'chats',
  searchQuery,
  onSearchChange,
  onSelect,
  isLoading,
  currentUserId,
  requestConvIds = new Set(),
  friends = [],
  onlineUserIds = new Set(),
  onFriendClick,
  onConversationHover,
  onNewMessage,
  isDismissibleEmptyThread,
  onDismissEmptyConversation,
  friendsLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'chats' | 'requests'>(() =>
    initialListTab === 'requests' ? 'requests' : 'chats'
  );

  // Auto-switch to the correct tab when a conversation is selected externally (e.g. via URL)
  useEffect(() => {
    if (!selectedConversationId) return;
    if (requestConvIds.has(selectedConversationId)) {
      setActiveTab('requests');
    } else if (conversations.some(c => c.id === selectedConversationId)) {
      setActiveTab('chats');
    }
  }, [selectedConversationId, requestConvIds, conversations]);

  const filtered = conversations.filter(conv =>
    conv.other_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const chatConvs    = filtered.filter(c => !requestConvIds.has(c.id));
  const requestConvs = filtered.filter(c =>  requestConvIds.has(c.id));
  const displayed    = activeTab === 'chats' ? chatConvs : requestConvs;

  const unreadChats    = chatConvs.reduce((n, c) => n + (c.unread_count ?? 0), 0);
  const unreadRequests = requestConvs.length; // every request is "new"

  return (
    <div className="flex min-h-0 flex-1 flex-col border-b border-slate-100 bg-white md:h-full md:w-80 md:shrink-0 md:flex-none lg:w-96 md:border-b-0 md:border-r">
      {/* Header — desktop only */}
      <div className="hidden md:block px-5 pt-6 pb-3 shrink-0">
        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-1">
          Pickleplay
        </p>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-xl font-black uppercase tracking-tighter leading-none text-slate-900">
            Messages
          </h1>
          {onNewMessage && (
            <button
              type="button"
              onClick={onNewMessage}
              title="New message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              <SquarePen size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-2xl py-2.5 pl-10 pr-9 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <FriendsStripCrossfade
          friendsLoading={friendsLoading}
          friends={friends}
          onlineUserIds={onlineUserIds}
          onFriendClick={onFriendClick}
          className="mt-4"
        />
      </div>

      {/* Tabs — visible on both mobile and desktop */}
      <div className="flex gap-1 px-3 py-2 shrink-0 border-b border-slate-100 bg-white">
        <button
          onClick={() => setActiveTab('chats')}
          className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'chats'
              ? 'bg-lime-400 text-slate-900'
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
        >
          <UserCheck size={11} />
          <span className="whitespace-nowrap">Chats</span>
          {!isLoading && unreadChats > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none">
              {unreadChats}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'requests'
              ? 'bg-amber-500 text-white'
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Bell size={11} />
          <span className="whitespace-nowrap">Requests</span>
          {!isLoading && unreadRequests > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-amber-400 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none">
              {unreadRequests}
            </span>
          )}
        </button>
        {onNewMessage && (
          <button
            type="button"
            onClick={onNewMessage}
            title="New message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700 md:hidden"
          >
            <SquarePen size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Mobile: same Friends strip under Chats tab (desktop shows it in header above) */}
      {activeTab === 'chats' && (
        <FriendsStripCrossfade
          friendsLoading={friendsLoading}
          friends={friends}
          onlineUserIds={onlineUserIds}
          onFriendClick={onFriendClick}
          className="shrink-0 border-b border-slate-100 bg-white px-3 pb-3 pt-1 md:hidden"
        />
      )}

      {/* List — vertical rows on mobile + desktop (inbox style) */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-3 space-y-1 px-3 pb-3 pt-1">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex w-full items-center gap-3 rounded-2xl p-3">
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-slate-100" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-100" />
                  <div className="h-2.5 w-4/5 animate-pulse rounded-full bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 md:py-20 text-center px-6">
            {activeTab === 'requests' ? (
              <>
                <Bell className="text-slate-200 mb-3" size={40} />
                <p className="text-slate-400 font-black text-sm uppercase tracking-wider">No requests</p>
                <p className="text-slate-400 text-xs mt-1">
                  {searchQuery ? 'Try a different name' : 'No one has messaged you yet'}
                </p>
              </>
            ) : (
              <>
                <MessageCircle className="text-slate-200 mb-3" size={40} />
                <p className="text-slate-400 font-black text-sm uppercase tracking-wider">
                  {searchQuery ? 'No results' : 'No conversations'}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  {searchQuery ? 'Try a different name' : 'Find a partner and start chatting'}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1 px-3 pb-3 md:space-y-1 md:px-3 md:pb-4">
            {displayed.map((conv) => {
              const isActive = selectedConversationId === conv.id;
              const hasUnread = (conv.unread_count ?? 0) > 0;
              const isRequest = requestConvIds.has(conv.id);
              const showDismiss =
                Boolean(isDismissibleEmptyThread?.(conv) && onDismissEmptyConversation);
              return (
                <div
                  key={conv.id}
                  className={`group relative flex w-full items-stretch gap-0.5 rounded-2xl border transition-all ${
                    isActive
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(conv)}
                    onMouseEnter={() => onConversationHover?.(conv.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
                  >
                    <div className="relative shrink-0">
                      <AvatarImg
                        src={conv.other_user?.avatar_url}
                        alt={conv.other_user?.full_name || 'User'}
                        className="h-11 w-11 rounded-full object-cover"
                        placeholderClassName="h-11 w-11"
                        placeholderIconSize={22}
                      />
                      {isRequest ? (
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-black leading-none text-white">!</span>
                      ) : hasUnread ? (
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black leading-none text-white">{conv.unread_count}</span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center justify-between gap-1">
                        <span
                          className={`truncate text-sm font-black uppercase tracking-tight ${
                            isActive ? 'text-blue-700' : 'text-slate-800'
                          }`}
                        >
                          {conv.other_user?.full_name || 'Unknown'}
                        </span>
                        <div className="flex shrink-0 items-center gap-1">
                          {conv.last_message && (
                            <span className="text-[10px] font-semibold text-slate-400">
                              {formatTime(conv.last_message.created_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      {conv.last_message ? (
                        <p
                          className={`truncate text-xs ${
                            hasUnread ? 'font-semibold text-slate-700' : 'text-slate-400'
                          }`}
                        >
                          {conv.last_message.sender_id === currentUserId ? 'You: ' : ''}
                          {conv.last_message.content}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400">No messages yet</p>
                      )}
                    </div>
                  </button>
                  {showDismiss && (
                    <button
                      type="button"
                      title="Remove from list"
                      aria-label="Remove draft conversation from list"
                      className="flex shrink-0 items-center justify-center self-center rounded-xl px-2 text-slate-400 transition-colors hover:bg-slate-200/80 hover:text-slate-700 max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDismissEmptyConversation?.(conv);
                      }}
                    >
                      <X size={18} strokeWidth={2.25} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile footer — Explore / Find Partners (flat, no card chrome) */}
      <div className="shrink-0 border-t border-slate-100 bg-slate-50/90 px-4 py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <Link to="/partners" className="flex items-start gap-3 text-left active:opacity-80">
          <Users className="mt-0.5 shrink-0 text-blue-600" size={22} strokeWidth={2} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Explore</p>
            <p className="mt-0.5 text-base font-black uppercase tracking-tight text-slate-900">Find Partners</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Browse players, compare skills, send match invites, and open full profiles — same as Find Partners.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-blue-600">
              More details
              <ArrowRight size={14} strokeWidth={2.5} />
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default ConversationList;