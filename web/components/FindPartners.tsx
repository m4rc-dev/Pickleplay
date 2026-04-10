import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  MapPin,
  Star,
  Calendar,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  MessageCircle,
  Award,
  TrendingUp,
  X,
  Swords
} from 'lucide-react';
import { supabase } from '../services/supabase';
import {
  sendMatchRequest,
  getReceivedMatchRequests,
  getSentMatchRequests,
  acceptMatchRequest,
  declineMatchRequest,
  cancelMatchRequest,
  type MatchRequest
} from '../services/matchRequests';
import { PlaceholderAvatar } from './partners/PlaceholderAvatar';
import { getPlayerStats, getUserReviews, getUserEndorsements } from '../services/playerStats';
import { getOrCreateConversation } from '../services/directMessages';

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
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);

  // Match request form
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
        .select(`
          id,
          full_name,
          avatar_url,
          skill_level,
          location,
          bio
        `)
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
      const requests = await getReceivedMatchRequests();
      setReceivedRequests(requests);
    } catch (error) {
      console.error('Error loading received requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSentRequests = async () => {
    setIsLoading(true);
    try {
      const requests = await getSentMatchRequests();
      setSentRequests(requests);
    } catch (error) {
      console.error('Error loading sent requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedPlayer) return;

    try {
      await sendMatchRequest({
        receiver_id: selectedPlayer.id,
        ...requestForm
      });

      setShowRequestModal(false);
      setRequestForm({
        proposed_date: '',
        proposed_time: '',
        game_type: 'singles',
        message: ''
      });

      alert('Match request sent!');
    } catch (error) {
      console.error('Error sending request:', error);
      alert('Failed to send request');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptMatchRequest(requestId);
      loadReceivedRequests();
      alert('Match request accepted!');
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await declineMatchRequest(requestId);
      loadReceivedRequests();
    } catch (error) {
      console.error('Error declining request:', error);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelMatchRequest(requestId);
      loadSentRequests();
    } catch (error) {
      console.error('Error cancelling request:', error);
    }
  };

  const handleMessage = async (userId: string) => {
    try {
      const conversationId = await getOrCreateConversation(userId);
      try {
        sessionStorage.setItem('pickleplay_dm_outbound_conv', conversationId);
      } catch {
        /* ignore */
      }
      navigate(`/messages?conversation=${conversationId}&tab=chats`);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const filteredPlayers = players.filter(player =>
    player.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.skill_level?.toLowerCase().includes(searchQuery.toLowerCase())
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
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${activeTab === 'search'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Users className="inline mr-2 w-5 h-5" />
              Find Players
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 px-6 py-4 font-medium transition-colors relative ${activeTab === 'requests'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Clock className="inline mr-2 w-5 h-5" />
              Requests
              {receivedRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {receivedRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${activeTab === 'sent'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Send className="inline mr-2 w-5 h-5" />
              Sent Requests
            </button>
          </div>
        </div>

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div>
            {/* Search Bar */}
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

            {/* Players Grid */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlayers.map((player) => (
                  <div key={player.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4 mb-4">
                      {player.avatar_url ? (
                        <img src={player.avatar_url} alt={player.full_name} className="h-16 w-16 rounded-full object-cover" />
                      ) : (
                        <PlaceholderAvatar className="h-16 w-16" iconSize={32} />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">{player.full_name}</h3>
                        {player.skill_level && (
                          <span className="inline-flex items-center gap-1 text-sm text-blue-600">
                            <Award className="w-4 h-4" />
                            {player.skill_level}
                          </span>
                        )}
                        {player.location && (
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <MapPin className="w-4 h-4" />
                            {player.location}
                          </p>
                        )}
                      </div>
                    </div>

                    {player.bio && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{player.bio}</p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedPlayer(player);
                          setShowRequestModal(true);
                        }}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        Send Request
                      </button>
                      <button
                        onClick={() => handleMessage(player.id)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Received Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : receivedRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No match requests</h3>
                <p className="text-gray-600">When players send you match requests, they'll appear here</p>
              </div>
            ) : (
              receivedRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-start gap-4">
                    {request.sender?.avatar_url ? (
                      <img
                        src={request.sender.avatar_url}
                        alt={request.sender?.full_name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <PlaceholderAvatar className="h-12 w-12" iconSize={24} />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{request.sender?.full_name}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${request.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                            request.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1 mb-3">
                        <p className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(request.proposed_date).toLocaleDateString()}
                          {request.proposed_time && ` at ${request.proposed_time}`}
                        </p>
                        <p className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {request.game_type.replace('_', ' ')}
                        </p>
                      </div>
                      {request.message && (
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{request.message}</p>
                      )}

                      {request.status === 'pending' && (
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => handleAcceptRequest(request.id)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(request.id)}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg flex items-center gap-2 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Sent Requests Tab */}
        {activeTab === 'sent' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : sentRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Send className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No sent requests</h3>
                <p className="text-gray-600">Start finding partners and send match requests</p>
              </div>
            ) : (
              sentRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-start gap-4">
                    {request.receiver?.avatar_url ? (
                      <img
                        src={request.receiver.avatar_url}
                        alt={request.receiver?.full_name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <PlaceholderAvatar className="h-12 w-12" iconSize={24} />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{request.receiver?.full_name}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${request.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                            request.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              request.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                          }`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1 mb-3">
                        <p className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(request.proposed_date).toLocaleDateString()}
                          {request.proposed_time && ` at ${request.proposed_time}`}
                        </p>
                        <p className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {request.game_type.replace('_', ' ')}
                        </p>
                      </div>
                      {request.message && (
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{request.message}</p>
                      )}

                      {request.status === 'pending' && (
                        <button
                          onClick={() => handleCancelRequest(request.id)}
                          className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Send Request Modal */}
      {showRequestModal && selectedPlayer && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowRequestModal(false); setSelectedPlayer(null); } }}
        >
          <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Swords size={17} className="text-blue-600" />
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider leading-tight">Match Request</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Challenge to a game</p>
                </div>
              </div>
              <button onClick={() => { setShowRequestModal(false); setSelectedPlayer(null); }} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                <X size={17} className="text-slate-400" />
              </button>
            </div>

            {/* Player strip */}
            <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-50 border-b border-slate-100">
              {selectedPlayer.avatar_url ? (
                <img
                  src={selectedPlayer.avatar_url}
                  alt={selectedPlayer.full_name}
                  className="h-8 w-8 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <PlaceholderAvatar
                  roundedClassName="rounded-xl"
                  className="h-8 w-8 shrink-0"
                  iconSize={16}
                />
              )}
              <div>
                <p className="text-xs font-black text-slate-900 uppercase tracking-tight leading-tight">{selectedPlayer.full_name}</p>
                {selectedPlayer.dupr_rating != null && (
                  <p className="text-[10px] text-blue-600 font-bold leading-tight">DUPR {selectedPlayer.dupr_rating.toFixed(2)}</p>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5">

              {/* Game Type pills */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Game Type</p>
                <div className="grid grid-cols-3 gap-2">
                  {([['singles','Singles','1v1'],['doubles','Doubles','2v2'],['mixed_doubles','Mixed','MX']] as const).map(([val, label, icon]) => {
                    const active = requestForm.game_type === val;
                    return (
                      <button key={val} onClick={() => setRequestForm({ ...requestForm, game_type: val })}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                          active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                        }`}>
                        <span className={`text-[11px] font-black ${active ? 'text-blue-600' : 'text-slate-400'}`}>{icon}</span>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${active ? 'text-slate-900' : 'text-slate-500'}`}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Calendar size={10} /> Date *</p>
                  <input type="date" value={requestForm.proposed_date}
                    onChange={(e) => setRequestForm({ ...requestForm, proposed_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]} required
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-400 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Clock size={10} /> Time</p>
                  <input type="time" value={requestForm.proposed_time}
                    onChange={(e) => setRequestForm({ ...requestForm, proposed_time: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-400 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Message <span className="text-slate-300 normal-case font-medium">(optional)</span></p>
                <textarea value={requestForm.message}
                  onChange={(e) => setRequestForm({ ...requestForm, message: e.target.value })}
                  rows={3} placeholder={`Hey ${selectedPlayer.full_name.split(' ')[0]}, want to play a match?`}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-400 rounded-xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/10 resize-none transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowRequestModal(false); setSelectedPlayer(null); }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-black text-slate-400 uppercase tracking-wide transition-colors">
                  Cancel
                </button>
                <button onClick={handleSendRequest} disabled={!requestForm.proposed_date}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-black uppercase tracking-wide transition-colors flex items-center justify-center gap-2">
                  <Send size={14} /> Send Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindPartners;
