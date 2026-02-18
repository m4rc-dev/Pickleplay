import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Filter, Send, Clock } from 'lucide-react';
import { supabase } from '../../services/supabase';
import {
  sendMatchRequest,
  getReceivedMatchRequests,
  getSentMatchRequests,
  acceptMatchRequest,
  declineMatchRequest,
  cancelMatchRequest,
  type MatchRequest
} from '../../services/matchRequests';
import { getOrCreateConversation } from '../../services/directMessages';
import { PlayerCard } from './PlayerCard';
import { MatchRequestCard } from './MatchRequestCard';
import { SendRequestModal } from './SendRequestModal';

interface Player {
  id: string;
  full_name: string;
  avatar_url?: string;
  skill_level?: string;
  location?: string;
  bio?: string;
  player_stats?: any;
}

const FindPartners: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'search' | 'requests' | 'sent'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<MatchRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<MatchRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const [requestForm, setRequestForm] = useState({
    proposed_date: '',
    proposed_time: '',
    game_type: 'singles' as 'singles' | 'doubles' | 'mixed_doubles',
    message: ''
  });

  useEffect(() => {
    if (activeTab === 'search') {
      loadPlayers();
    } else if (activeTab === 'requests') {
      loadReceivedRequests();
    } else {
      loadSentRequests();
    }
  }, [activeTab]);

  const loadPlayers = async () => {
    setIsLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, skill_level, location, bio')
        .neq('id', user.user.id)
        .limit(20);
      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReceivedRequests = async () => {
    setIsLoading(true);
    try {
      setReceivedRequests(await getReceivedMatchRequests());
    } catch (error) {
      console.error('Error loading received requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSentRequests = async () => {
    setIsLoading(true);
    try {
      setSentRequests(await getSentMatchRequests());
    } catch (error) {
      console.error('Error loading sent requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedPlayer) return;
    try {
      await sendMatchRequest({ receiver_id: selectedPlayer.id, ...requestForm });
      setShowRequestModal(false);
      setRequestForm({ proposed_date: '', proposed_time: '', game_type: 'singles', message: '' });
      alert('Match request sent!');
    } catch (error) {
      console.error('Error sending request:', error);
      alert('Failed to send request');
    }
  };

  const handleAcceptRequest = async (id: string) => {
    try { await acceptMatchRequest(id); loadReceivedRequests(); alert('Match request accepted!'); }
    catch (err) { console.error('Error accepting request:', err); }
  };

  const handleDeclineRequest = async (id: string) => {
    try { await declineMatchRequest(id); loadReceivedRequests(); }
    catch (err) { console.error('Error declining request:', err); }
  };

  const handleCancelRequest = async (id: string) => {
    try { await cancelMatchRequest(id); loadSentRequests(); }
    catch (err) { console.error('Error cancelling request:', err); }
  };

  const handleMessage = async (userId: string) => {
    try {
      const conversationId = await getOrCreateConversation(userId);
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const filteredPlayers = players.filter(p =>
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.skill_level?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Partners</h1>
          <p className="text-gray-600">Connect with players and schedule matches</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button onClick={() => setActiveTab('search')} className={`flex-1 px-6 py-4 font-medium transition-colors ${activeTab === 'search' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
              <Users className="inline mr-2 w-5 h-5" />
              Find Players
            </button>
            <button onClick={() => setActiveTab('requests')} className={`flex-1 px-6 py-4 font-medium transition-colors relative ${activeTab === 'requests' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
              <Clock className="inline mr-2 w-5 h-5" />
              Requests
              {receivedRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {receivedRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
            <button onClick={() => setActiveTab('sent')} className={`flex-1 px-6 py-4 font-medium transition-colors ${activeTab === 'sent' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
              <Send className="inline mr-2 w-5 h-5" />
              Sent Requests
            </button>
          </div>
        </div>

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div>
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by name, location, or skill level..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition-colors">
                  <Filter className="w-5 h-5" />
                  Filters
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlayers.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    onSendRequest={(p) => { setSelectedPlayer(p); setShowRequestModal(true); }}
                    onMessage={handleMessage}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Received Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>
            ) : receivedRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No match requests</h3>
                <p className="text-gray-600">When players send you match requests, they'll appear here</p>
              </div>
            ) : (
              receivedRequests.map((request) => (
                <MatchRequestCard
                  key={request.id}
                  request={request}
                  type="received"
                  onAccept={handleAcceptRequest}
                  onDecline={handleDeclineRequest}
                />
              ))
            )}
          </div>
        )}

        {/* Sent Requests Tab */}
        {activeTab === 'sent' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>
            ) : sentRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Send className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No sent requests</h3>
                <p className="text-gray-600">Start finding partners and send match requests</p>
              </div>
            ) : (
              sentRequests.map((request) => (
                <MatchRequestCard
                  key={request.id}
                  request={request}
                  type="sent"
                  onCancel={handleCancelRequest}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Send Request Modal */}
      {showRequestModal && selectedPlayer && (
        <SendRequestModal
          player={selectedPlayer}
          form={requestForm}
          onChange={setRequestForm}
          onSend={handleSendRequest}
          onClose={() => { setShowRequestModal(false); setSelectedPlayer(null); }}
        />
      )}
    </div>
  );
};

export default FindPartners;
