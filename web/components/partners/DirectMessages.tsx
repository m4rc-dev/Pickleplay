import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';
import {
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markConversationAsRead,
  subscribeToConversation,
  subscribeToAllConversations,
  type ConversationWithDetails,
  type DirectMessage
} from '../../services/directMessages';
import { ConversationList } from './ConversationList';
import { ChatArea } from './ChatArea';

const DirectMessages: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationIdFromUrl = searchParams.get('conversation');

  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
    loadConversations();
    const unsubscribe = subscribeToAllConversations(() => loadConversations());
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (conversationIdFromUrl && conversations.length > 0) {
      const conv = conversations.find(c => c.id === conversationIdFromUrl);
      if (conv) selectConversation(conv);
    }
  }, [conversationIdFromUrl, conversations]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
      markConversationAsRead(selectedConversation.id);
      const unsubscribe = subscribeToConversation(
        selectedConversation.id,
        (message) => {
          setMessages((prev) => [...prev, message]);
          markConversationAsRead(selectedConversation.id);
        }
      );
      return () => { unsubscribe(); };
    }
  }, [selectedConversation]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      setConversations(await getUserConversations());
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
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || isSending) return;
    setIsSending(true);
    try {
      const message = await sendMessage(selectedConversation.id, newMessage.trim());
      setMessages((prev) => [...prev, message]);
      setNewMessage('');
      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <ConversationList
        conversations={conversations}
        selectedConversationId={selectedConversation?.id}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelect={selectConversation}
        isLoading={isLoading}
        currentUserId={currentUserId}
        isHiddenOnMobile={!!selectedConversation}
      />

      {selectedConversation ? (
        <ChatArea
          conversation={selectedConversation}
          messages={messages}
          currentUserId={currentUserId}
          newMessage={newMessage}
          isSending={isSending}
          onNewMessageChange={setNewMessage}
          onSendMessage={handleSendMessage}
          onBack={handleBack}
        />
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageCircle className="w-24 h-24 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your Messages</h2>
            <p className="text-gray-600">Select a conversation to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectMessages;
