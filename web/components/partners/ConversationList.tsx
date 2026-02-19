import React from 'react';
import { Search, MessageCircle } from 'lucide-react';
import { type ConversationWithDetails, type DirectMessage } from '../../services/directMessages';

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  selectedConversationId?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (conversation: ConversationWithDetails) => void;
  isLoading: boolean;
  currentUserId: string | null;
  isHiddenOnMobile?: boolean;
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  searchQuery,
  onSearchChange,
  onSelect,
  isLoading,
  currentUserId,
  isHiddenOnMobile = false,
}) => {
  const filtered = conversations.filter(conv =>
    conv.other_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`${isHiddenOnMobile ? 'hidden md:block' : 'block'} w-full md:w-80 bg-white border-r border-gray-200`}>
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold mb-4">Messages</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="overflow-y-auto" style={{ height: 'calc(100vh - 180px)' }}>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No conversations yet</p>
          </div>
        ) : (
          filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b ${
                selectedConversationId === conv.id ? 'bg-blue-50' : ''
              }`}
            >
              <img
                src={conv.other_user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.other_user?.full_name || 'User')}`}
                alt={conv.other_user?.full_name}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 text-left overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {conv.other_user?.full_name}
                  </h3>
                  {conv.last_message && (
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatTime(conv.last_message.created_at)}
                    </span>
                  )}
                </div>
                {conv.last_message && (
                  <p className="text-sm text-gray-600 truncate">
                    {conv.last_message.sender_id === currentUserId ? 'You: ' : ''}
                    {conv.last_message.content}
                  </p>
                )}
                {conv.unread_count && conv.unread_count > 0 && (
                  <span className="inline-block mt-1 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                    {conv.unread_count}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
