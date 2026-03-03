import React, { useState, useEffect } from 'react';
import { Search, MessageCircle, X, UserCheck, Bell } from 'lucide-react';
import { type ConversationWithDetails } from '../../services/directMessages';

interface Friend {
  id: string;
  full_name: string;
  avatar_url?: string;
}

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  selectedConversationId?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (conversation: ConversationWithDetails) => void;
  isLoading: boolean;
  currentUserId: string | null;
  requestConvIds?: Set<string>;
  friends?: Friend[];
  onlineUserIds?: Set<string>;
  onFriendClick?: (friendId: string) => void;
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

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  searchQuery,
  onSearchChange,
  onSelect,
  isLoading,
  currentUserId,
  requestConvIds = new Set(),
  friends = [],
  onlineUserIds = new Set(),
  onFriendClick,
}) => {
  const [activeTab, setActiveTab] = useState<'chats' | 'requests'>('chats');

  // Auto-switch to the correct tab when a conversation is selected externally (e.g. via URL)
  useEffect(() => {
    if (!selectedConversationId) return;
    if (requestConvIds.has(selectedConversationId)) {
      setActiveTab('requests');
    } else if (conversations.some(c => c.id === selectedConversationId)) {
      setActiveTab('chats');
    }
  }, [selectedConversationId]);

  const filtered = conversations.filter(conv =>
    conv.other_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const chatConvs    = filtered.filter(c => !requestConvIds.has(c.id));
  const requestConvs = filtered.filter(c =>  requestConvIds.has(c.id));
  const displayed    = activeTab === 'chats' ? chatConvs : requestConvs;

  const unreadChats    = chatConvs.reduce((n, c) => n + (c.unread_count ?? 0), 0);
  const unreadRequests = requestConvs.length; // every request is "new"

  return (
    <div className="flex flex-col w-full md:w-80 lg:w-96 bg-white border-b md:border-b-0 md:border-r border-slate-100 shrink-0 md:h-full">
      {/* Header — desktop only */}
      <div className="hidden md:block px-5 pt-6 pb-3 shrink-0">
        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-1">
          Pickleplay
        </p>
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-4">
          Messages
        </h1>
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

        {/* Friends chatheads — below search */}
        {friends.length > 0 && (
          <div className="mt-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Friends</p>
            <div
              className="flex flex-row flex-nowrap gap-3 overflow-x-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {friends.map(friend => {
                const isOnline = onlineUserIds.has(friend.id);
                return (
                  <button
                    key={friend.id}
                    onClick={() => onFriendClick?.(friend.id)}
                    className="flex flex-col items-center gap-1 shrink-0 group"
                    title={friend.full_name}
                  >
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-white shadow-md group-hover:ring-lime-400 transition-all duration-200">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt={friend.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-600 font-black text-base">
                            {(friend.full_name || '?')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white transition-colors ${
                        isOnline ? 'bg-emerald-400' : 'bg-slate-300'
                      }`} />
                    </div>
                    <span className="text-[9px] font-semibold text-slate-500 w-11 truncate text-center group-hover:text-slate-800 transition-colors">
                      {(friend.full_name || '').split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
          Chats
          {unreadChats > 0 && (
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
          Requests
          {unreadRequests > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-amber-400 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none">
              {unreadRequests}
            </span>
          )}
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto md:overflow-y-auto overflow-x-auto">
        {isLoading ? (
          <div className="flex md:flex-col gap-3 md:gap-0 px-3 md:px-3 pb-3 md:pb-0 md:pt-1 md:space-y-1 flex-row">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex md:flex-row flex-col items-center md:items-center gap-2 md:gap-3 p-3 rounded-2xl shrink-0 md:shrink md:w-auto w-20">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 animate-pulse shrink-0" />
                <div className="hidden md:flex flex-1 flex-col space-y-2 w-full">
                  <div className="h-3 bg-slate-100 rounded-full animate-pulse w-2/3" />
                  <div className="h-2.5 bg-slate-100 rounded-full animate-pulse w-4/5" />
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
          <div className="flex md:flex-col gap-2 md:gap-0 px-3 pb-3 md:pb-4 md:px-3 md:space-y-1 flex-row md:flex-nowrap flex-nowrap md:overflow-visible overflow-x-auto">
            {displayed.map((conv) => {
              const isActive = selectedConversationId === conv.id;
              const hasUnread = (conv.unread_count ?? 0) > 0;
              const isRequest = requestConvIds.has(conv.id);
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv)}
                  className={`shrink-0 md:shrink md:w-full transition-all text-left ${
                    isActive
                      ? 'md:bg-blue-50 md:border-blue-200'
                      : 'md:hover:bg-slate-50'
                  } md:rounded-2xl md:p-3 md:flex md:items-center md:gap-3 md:border md:border-transparent`}
                >
                  {/* Mobile: avatar-only pill */}
                  <div className="flex md:hidden flex-col items-center gap-1 pt-1">
                    <div className="relative">
                      <img
                        src={
                          conv.other_user?.avatar_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.other_user?.full_name || 'User')}&background=2563eb&color=fff&size=80`
                        }
                        alt={conv.other_user?.full_name || 'User'}
                        className={`w-12 h-12 rounded-2xl object-cover border-2 ${
                          isActive ? 'border-blue-500' : 'border-slate-100'
                        }`}
                      />
                      {isRequest ? (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-amber-400 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none">!</span>
                      ) : hasUnread ? (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none">{conv.unread_count}</span>
                      ) : null}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-tight w-14 text-center truncate leading-tight ${
                      isActive ? 'text-blue-600' : 'text-slate-600'
                    }`}>
                      {(conv.other_user?.full_name || 'Unknown').split(' ')[0]}
                    </span>
                  </div>

                  {/* Desktop: full row */}
                  <div className="hidden md:flex items-center gap-3 w-full">
                    <div className="relative shrink-0">
                      <img
                        src={
                          conv.other_user?.avatar_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.other_user?.full_name || 'User')}&background=2563eb&color=fff&size=96`
                        }
                        alt={conv.other_user?.full_name || 'User'}
                        className="w-11 h-11 rounded-xl object-cover"
                      />
                      {isRequest ? (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-amber-400 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none">!</span>
                      ) : hasUnread ? (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none">{conv.unread_count}</span>
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`font-black text-sm uppercase tracking-tight truncate ${
                          isActive ? 'text-blue-700' : 'text-slate-800'
                        }`}>
                          {conv.other_user?.full_name || 'Unknown'}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {conv.last_message && (
                            <span className="text-[10px] font-semibold text-slate-400">
                              {formatTime(conv.last_message.created_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      {conv.last_message ? (
                        <p className={`text-xs truncate ${
                          hasUnread ? 'text-slate-700 font-semibold' : 'text-slate-400'
                        }`}>
                          {conv.last_message.sender_id === currentUserId ? 'You: ' : ''}
                          {conv.last_message.content}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400">No messages yet</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;