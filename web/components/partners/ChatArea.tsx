import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Lock, MessageCircle, Send, UserPlus } from 'lucide-react';
import { type ConversationWithDetails, type DirectMessage } from '../../services/directMessages';

export type MessageGateState =
  | 'loading'
  | 'chat'
  | 'new_request'
  | 'incoming_request'
  | 'outgoing_request';

interface ChatAreaProps {
  conversation: ConversationWithDetails;
  messages: DirectMessage[];
  currentUserId: string | null;
  newMessage: string;
  isSending: boolean;
  messageGateState: MessageGateState;
  onAcceptRequest?: () => Promise<void>;
  onNewMessageChange: (value: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onBack: () => void;
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

const formatDateSeparator = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
};

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  messages,
  currentUserId,
  newMessage,
  isSending,
  messageGateState,
  onAcceptRequest,
  onNewMessageChange,
  onSendMessage,
  onBack,
}) => {
  const otherName = conversation.other_user?.full_name?.split(' ')[0] || 'them';
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isAcceptingRequest, setIsAcceptingRequest] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onNewMessageChange(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
  };

  const grouped: { date: string; msgs: DirectMessage[] }[] = [];
  messages.forEach((msg) => {
    const day = new Date(msg.created_at).toDateString();
    const last = grouped[grouped.length - 1];
    if (!last || last.date !== day) {
      grouped.push({ date: day, msgs: [msg] });
    } else {
      last.msgs.push(msg);
    }
  });

  const otherUser = conversation.other_user;
  const avatarSrc =
    otherUser?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.full_name || 'User')}&background=1e40af&color=fff&size=96`;

  const renderComposer = (helperText: string, banner?: React.ReactNode) => (
    <div className="bg-white border-t border-slate-100 px-4 py-3 shrink-0">
      {banner}
      <form onSubmit={onSendMessage}>
        <div className="flex items-end gap-3">
          <div className="flex-1 bg-slate-100 rounded-2xl px-4 py-2.5 min-h-[44px] flex items-end">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSendMessage(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-sm resize-none outline-none max-h-32 leading-relaxed"
              style={{ minHeight: '22px' }}
            />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="w-11 h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl flex items-center justify-center transition-all shrink-0 shadow-sm shadow-blue-200"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-300 mt-2 font-medium">
          {helperText}
        </p>
      </form>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-w-0">
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest transition-all shadow-sm shrink-0"
        >
          <ArrowLeft size={13} />
          Back
        </button>

        <Link
          to={otherUser?.id ? `/profile/${otherUser.id}` : '#'}
          className="flex items-center gap-3 min-w-0 group flex-1"
        >
          <img
            src={avatarSrc}
            alt={otherUser?.full_name || 'User'}
            className="w-10 h-10 rounded-xl object-cover shrink-0 ring-2 ring-transparent group-hover:ring-blue-400 transition-all"
          />
          <div className="min-w-0">
            <h2 className="font-black text-slate-900 uppercase tracking-tight text-sm leading-none truncate group-hover:text-blue-600 transition-colors">
              {otherUser?.full_name || 'Unknown'}
            </h2>
            {otherUser?.dupr_rating != null ? (
              <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-0.5">
                DUPR {otherUser.dupr_rating.toFixed(2)}
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5 group-hover:text-blue-400 transition-colors">
                View profile
              </p>
            )}
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <MessageCircle className="text-slate-300 mb-4" size={56} />
            <p className="font-black text-slate-400 text-sm uppercase tracking-wider">
              No messages yet
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  {formatDateSeparator(group.msgs[0].created_at)}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <div className="space-y-1">
                {group.msgs.map((message, idx) => {
                  const isOwn = message.sender_id === currentUserId;
                  const prevMsg = group.msgs[idx - 1];
                  const showAvatar = !isOwn && (!prevMsg || prevMsg.sender_id !== message.sender_id);

                  return (
                    <div
                      key={message.id}
                      className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isOwn && (
                        <div className="w-7 shrink-0 mb-1">
                          {showAvatar ? (
                            <img
                              src={avatarSrc}
                              alt={otherUser?.full_name || 'User'}
                              className="w-7 h-7 rounded-xl object-cover"
                            />
                          ) : null}
                        </div>
                      )}

                      <div className={`max-w-[72%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div
                          className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                            isOwn
                              ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm shadow-sm shadow-blue-200'
                              : 'bg-white text-slate-800 rounded-2xl rounded-bl-sm shadow-sm shadow-slate-100 border border-slate-100'
                          }`}
                        >
                          {message.content}
                          {message.is_edited && (
                            <span className="text-[10px] opacity-60 ml-2">edited</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {messageGateState === 'loading' ? (
        <div className="bg-white border-t border-slate-100 px-4 py-4 shrink-0">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
            <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
            <div>
              <p className="text-xs font-black text-slate-700 uppercase tracking-wide">
                Checking chat access
              </p>
              <p className="text-[11px] text-slate-500">
                Loading this conversation...
              </p>
            </div>
          </div>
        </div>
      ) : messageGateState === 'incoming_request' ? (
        <div className="bg-white border-t border-slate-100 px-4 py-4 shrink-0">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <MessageCircle size={13} className="text-amber-600" />
              </div>
              <p className="text-xs font-black text-amber-800 uppercase tracking-wide">
                Message Request
              </p>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              <span className="font-semibold">{otherName}</span> sent you a message. Accept to follow back and unlock replies.
            </p>
            <div className="flex gap-2 mt-0.5">
              <button
                onClick={async () => {
                  if (!onAcceptRequest) return;
                  setIsAcceptingRequest(true);
                  try {
                    await onAcceptRequest();
                  } finally {
                    setIsAcceptingRequest(false);
                  }
                }}
                disabled={isAcceptingRequest}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-black uppercase tracking-wide transition-colors"
              >
                {isAcceptingRequest ? (
                  <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle size={12} />
                )}
                {isAcceptingRequest ? 'Accepting...' : 'Accept & Reply'}
              </button>
              <a
                href="/partners"
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wide transition-colors"
              >
                Find on Partners
              </a>
            </div>
          </div>
        </div>
      ) : messageGateState === 'outgoing_request' ? (
        <div className="bg-white border-t border-slate-100 px-4 py-4 shrink-0">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <MessageCircle size={13} className="text-blue-600" />
              </div>
              <p className="text-xs font-black text-blue-800 uppercase tracking-wide">
                Request Sent
              </p>
            </div>
            <p className="text-[11px] text-blue-700 leading-relaxed">
              Your first message was sent to <span className="font-semibold">{otherName}</span>. They need to accept before the chat unlocks.
            </p>
          </div>
        </div>
      ) : messageGateState === 'new_request' ? (
        renderComposer(
          'Send one message request. They will need to accept before the chat unlocks.',
          <div className="mb-3 rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3">
            <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">
              New Message Request
            </p>
            <p className="text-[11px] text-blue-700 leading-relaxed">
              Your first message will also follow <span className="font-semibold">{otherName}</span> so they can accept and reply.
            </p>
          </div>
        )
      ) : messageGateState === 'chat' ? (
        renderComposer('Enter to send - Shift+Enter for new line')
      ) : (
        <div className="bg-white border-t border-slate-100 px-4 py-4 shrink-0">
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
              <Lock size={15} className="text-slate-400" />
            </div>
            <p className="text-xs font-black text-slate-600 uppercase tracking-wide">
              Messaging locked
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-[260px]">
              You and <span className="font-semibold text-slate-600">{otherName}</span> need to follow each other before you can chat.
            </p>
            <a
              href="/partners"
              className="mt-1 flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wide transition-colors"
            >
              <UserPlus size={12} />
              Go to Find Partners
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatArea;
