import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Search, Filter, Send, Clock, X, CheckCircle2, Mail, UserPlus, MessageCircle, Shield, ChevronDown, ChevronUp } from 'lucide-react';
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
import { InvitePlayerModal } from './InvitePlayerModal';
import PlayInvitesTab from './PlayInvitesTab';

interface Player {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  dupr_rating?: number;
  location?: string;
  bio?: string;
  player_stats?: any;
}

type SortOption = 'name_asc' | 'dupr_high' | 'dupr_low';

interface FindPartnersProps {
  followedUsers?: string[];
  onFollow?: (userId: string, userName: string) => void;
}

const FindPartners: React.FC<FindPartnersProps> = ({ followedUsers: propFollowedUsers, onFollow: propOnFollow }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'search' | 'requests' | 'sent' | 'invites'>(
    (searchParams.get('tab') as any) || 'search'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  const [showFollowingOnly, setShowFollowingOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<MatchRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<MatchRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [requestForm, setRequestForm] = useState({
    proposed_date: '',
    proposed_time: '',
    game_type: 'singles' as 'singles' | 'doubles' | 'mixed_doubles',
    message: ''
  });
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const [loadingFollowIds, setLoadingFollowIds] = useState<Set<string>>(new Set());
  const [invitePlayer, setInvitePlayer] = useState<Player | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [pendingInviteCount, setPendingInviteCount] = useState(0);
  const [showGuidelines, setShowGuidelines] = useState(
    localStorage.getItem('fp_guidelines_dismissed') !== 'true'
  );

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    init();
    loadFollowedUsers();
    loadPendingRequestCount();
  }, []);

  // Sync local follow state with App-level followedUsers prop (for cross-page consistency)
  useEffect(() => {
    if (propFollowedUsers) {
      setFollowedUserIds(new Set(propFollowedUsers));
    }
  }, [propFollowedUsers]);

  useEffect(() => {
    if (activeTab === 'search') {
      loadPlayers();
    } else if (activeTab === 'requests') {
      loadReceivedRequests();
    } else if (activeTab === 'sent') {
      loadSentRequests();
    }
    // 'invites' tab loads itself via PlayInvitesTab
  }, [activeTab]);

  const loadPendingRequestCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from('match_requests')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending');
      setPendingRequestCount(count || 0);
    } catch (_) { /* silent */ }
  };

  const loadFollowedUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_follows')
        .select('followed_id')
        .eq('follower_id', user.id);
      setFollowedUserIds(new Set((data || []).map((r: any) => r.followed_id)));
    } catch (err) {
      console.error('Error loading follows:', err);
    }
  };

  const handleFollowToggle = useCallback(async (userId: string) => {
    if (!currentUserId || loadingFollowIds.has(userId)) return;
    const isFollowing = followedUserIds.has(userId);
    // optimistic update
    setFollowedUserIds(prev => {
      const next = new Set(prev);
      isFollowing ? next.delete(userId) : next.add(userId);
      return next;
    });
    setLoadingFollowIds(prev => new Set([...prev, userId]));
    try {
      if (propOnFollow) {
        // Use App-level handler: handles DB write + notification + App state update
        await propOnFollow(userId, players.find(p => p.id === userId)?.full_name || '');
        if (!isFollowing) {
          showToast('Followed! Chat unlocks when they follow you back.');
        } else {
          showToast('Unfollowed');
        }
      } else {
        // Fallback: local DB operation (no App state sync)
        if (isFollowing) {
          await supabase.from('user_follows').delete().eq('follower_id', currentUserId).eq('followed_id', userId);
        } else {
          await supabase.from('user_follows').insert({ follower_id: currentUserId, followed_id: userId });
          showToast('Following!');
        }
      }
    } catch (err) {
      // revert optimistic update
      setFollowedUserIds(prev => {
        const next = new Set(prev);
        isFollowing ? next.add(userId) : next.delete(userId);
        return next;
      });
      console.error('Error toggling follow:', err);
    } finally {
      setLoadingFollowIds(prev => { const next = new Set(prev); next.delete(userId); return next; });
    }
  }, [currentUserId, followedUserIds, loadingFollowIds, propOnFollow, players, navigate, showToast]);

  const loadPlayers = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, dupr_rating, location, bio')
        .neq('id', user.id)
        .not('full_name', 'is', null)
        .order('full_name', { ascending: true })
        .limit(50);
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
      const data = await getReceivedMatchRequests();
      setReceivedRequests(data);
      const pending = data.filter(r => r.status === 'pending').length;
      setPendingRequestCount(pending);
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
      showToast(`Match request sent to ${selectedPlayer.full_name}!`);
    } catch (error) {
      console.error('Error sending request:', error);
      showToast('Failed to send match request.', 'error');
    }
  };

  const handleAcceptRequest = async (id: string) => {
    try { await acceptMatchRequest(id); loadReceivedRequests(); showToast('Match request accepted!'); }
    catch (err) { console.error('Error accepting request:', err); showToast('Failed to accept request.', 'error'); }
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

  const handleViewProfile = useCallback((userId: string, username?: string) => {
    navigate(`/profile/${username || userId}`);
  }, [navigate]);

  const activeFilterCount = [
    sortBy !== 'name_asc',
    showFollowingOnly,
  ].filter(Boolean).length;

  const filteredPlayers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = players.filter(p =>
      !q ||
      p.full_name?.toLowerCase().includes(q) ||
      p.location?.toLowerCase().includes(q)
    );
    if (showFollowingOnly) {
      result = result.filter(p => followedUserIds.has(p.id));
    }
    result = [...result].sort((a, b) => {
      if (sortBy === 'dupr_high') return (b.dupr_rating || 0) - (a.dupr_rating || 0);
      if (sortBy === 'dupr_low') return (a.dupr_rating || 0) - (b.dupr_rating || 0);
      return (a.full_name || '').localeCompare(b.full_name || '');
    });
    return result;
  }, [players, searchQuery, sortBy, showFollowingOnly, followedUserIds]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* Typographic Header */}
      <div className="mb-12">
        <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.4em] mb-4">
          PICKLEPLAY / FIND PARTNERS
        </p>
        <h1 className="text-4xl md:text-6xl font-black text-slate-950 tracking-tighter leading-[1] uppercase mb-6">
          FIND YOUR <br />
          <span className="text-blue-600">PARTNER.</span>
        </h1>
        <p className="text-slate-500 text-base md:text-lg max-w-xl leading-relaxed">
          Browse players near you, follow, message, and schedule your next match.
        </p>
      </div>

      {/* Community Guidelines Banner */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 overflow-hidden">
        <button
          onClick={() => setShowGuidelines(prev => !prev)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-2">
            <Shield size={15} className="text-blue-600 shrink-0" />
            <span className="text-[11px] font-black uppercase tracking-widest text-blue-700">
              Community Guidelines
            </span>
          </div>
          {showGuidelines ? (
            <ChevronUp size={15} className="text-blue-400" />
          ) : (
            <ChevronDown size={15} className="text-blue-400" />
          )}
        </button>

        {showGuidelines && (
          <div className="px-5 pb-5 border-t border-blue-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <UserPlus size={14} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-800 uppercase tracking-wide mb-1">Follow First</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Follow a player before sending a match challenge. It shows genuine interest and respect.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <MessageCircle size={14} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-800 uppercase tracking-wide mb-1">Be Respectful</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Keep messages friendly and on-topic. Harassment or spam will result in removal from the platform.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <Shield size={14} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-800 uppercase tracking-wide mb-1">Match Your Level</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Challenge players within a similar skill range for a fair and enjoyable game for everyone.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowGuidelines(false);
                  localStorage.setItem('fp_guidelines_dismissed', 'true');
                }}
                className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-600 transition-colors"
              >
                Got it — don't show again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col gap-4">
        {/* Tab row — always visible */}
        <div className="flex gap-2 flex-wrap">
          {(['search', 'requests', 'sent', 'invites'] as const).map(tab => {
            const labels: Record<string, string> = {
              search: 'Find Players',
              requests: 'Received',
              sent: 'Sent',
              invites: 'Invites',
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {labels[tab]}
                {tab === 'requests' && pendingRequestCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                    {pendingRequestCount}
                  </span>
                )}
                {tab === 'invites' && pendingInviteCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                    {pendingInviteCount}
                  </span>
                )}
                {tab === 'sent' && sentRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                    {sentRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search + Filter — only shown on Find Players tab */}
        {activeTab === 'search' && (
        <div className="flex flex-col gap-4">
        <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by name or location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-14 pr-10 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-400">
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative px-4 rounded-2xl border transition-all shrink-0 ${
                showFilters || activeFilterCount > 0
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100'
                  : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Filter size={18} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sort by</p>
                <div className="flex flex-wrap gap-2">
                  {([['name_asc', 'Name A→Z'], ['dupr_high', 'DUPR High→Low'], ['dupr_low', 'DUPR Low→High']] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setSortBy(val)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                        sortBy === val ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Show</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFollowingOnly(!showFollowingOnly)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      showFollowingOnly ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Following Only
                  </button>
                </div>
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setSortBy('name_asc'); setShowFollowingOnly(false); }}
                  className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 transition-colors"
                >
                  Reset Filters
                </button>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      {/* SEARCH TAB */}
      {activeTab === 'search' && (
        <>
          {!isLoading && players.length > 0 && (
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest -mb-8">
              {filteredPlayers.length === players.length
                ? `${players.length} player${players.length !== 1 ? 's' : ''}`
                : `${filteredPlayers.length} of ${players.length} players`}
            </p>
          )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 h-36 animate-pulse" />
            ))
          ) : filteredPlayers.length === 0 ? (
            <div className="col-span-full py-32 text-center">
              <Users className="w-24 h-24 text-slate-200 mx-auto mb-8" />
              <h3 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">
                {searchQuery.trim() ? 'No players found' : 'No players yet'}
              </h3>
              <p className="text-slate-400 font-medium">
                {searchQuery.trim() ? 'Try a different name or location.' : 'Check back soon as more players join.'}
              </p>
            </div>
          ) : (
            filteredPlayers.map(player => (
              <PlayerCard
                key={player.id}
                player={player}
                onSendRequest={p => { setSelectedPlayer(p); setShowRequestModal(true); }}
                onMessage={handleMessage}
                onFollow={handleFollowToggle}
                onInvite={p => setInvitePlayer(p)}
                onViewProfile={(_id) => handleViewProfile(_id, player.username)}
                isFollowing={followedUserIds.has(player.id)}
                isFollowLoading={loadingFollowIds.has(player.id)}
              />
            ))
          )}
        </div>
        </>
      )}

      {/* REQUESTS TAB */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-slate-100 h-32 animate-pulse" />
            ))
          ) : receivedRequests.length === 0 ? (
            <div className="py-32 text-center">
              <Clock className="w-24 h-24 text-slate-200 mx-auto mb-8" />
              <h3 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">No match requests</h3>
              <p className="text-slate-400 font-medium">When players send you match requests, they'll appear here.</p>
            </div>
          ) : (
            receivedRequests.map(request => (
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

      {/* SENT REQUESTS TAB */}
      {activeTab === 'sent' && (
        <div className="space-y-4">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-slate-100 h-32 animate-pulse" />
            ))
          ) : sentRequests.length === 0 ? (
            <div className="py-32 text-center">
              <Send className="w-24 h-24 text-slate-200 mx-auto mb-8" />
              <h3 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">No sent requests</h3>
              <p className="text-slate-400 font-medium">Find a partner and send your first match request.</p>
            </div>
          ) : (
            sentRequests.map(request => (
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

      {/* INVITES TAB */}
      {activeTab === 'invites' && (
        <PlayInvitesTab onCountChange={setPendingInviteCount} />
      )}

      {/* Modals */}
      {showRequestModal && selectedPlayer && (
        <SendRequestModal
          player={selectedPlayer}
          form={requestForm}
          onChange={setRequestForm}
          onSend={handleSendRequest}
          onClose={() => { setShowRequestModal(false); setSelectedPlayer(null); }}
        />
      )}
      {invitePlayer && (
        <InvitePlayerModal
          player={invitePlayer}
          onClose={() => setInvitePlayer(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-black text-sm uppercase tracking-wider transition-all animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'error'
            ? 'bg-rose-600 text-white'
            : 'bg-slate-900 text-white'
        }`}>
          {toast.type !== 'error' && <CheckCircle2 size={16} className="text-lime-400 shrink-0" />}
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default FindPartners;
