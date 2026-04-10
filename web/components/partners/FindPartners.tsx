import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, Send } from 'lucide-react';
import { supabase } from '../../services/supabase';
import {
  acceptMatchRequest,
  cancelMatchRequest,
  declineMatchRequest,
  getReceivedMatchRequests,
  getSentMatchRequests,
  sendMatchRequest,
  type MatchRequest,
} from '../../services/matchRequests';
import { getOrCreateConversation } from '../../services/directMessages';
import { CommunityGuidelinesNotice } from './CommunityGuidelinesNotice';
import { InvitePlayerModal } from './InvitePlayerModal';
import { MatchFiltersPanel } from './MatchFiltersPanel';
import { MatchmakingEmptyState } from './MatchmakingEmptyState';
import { MatchmakingHero } from './MatchmakingHero';
import { MatchRequestCard } from './MatchRequestCard';
import { PlayersSection } from './PlayersSection';
import PlayInvitesTab from './PlayInvitesTab';
import { SendRequestModal } from './SendRequestModal';
import {
  DEFAULT_FILTERS,
  PARTNER_TABS,
  PLAYER_PROFILE_SELECT,
  SORT_OPTIONS,
  VIEWER_PROFILE_SELECT,
} from './findPartners.constants';
import {
  asArray,
  buildActiveFilterChips,
  buildLocationOptions,
  buildSmartPlayers,
  filterSmartPlayers,
  getActiveFilterCount,
  getBestMatches,
  getEmptyStateCopy,
  getHeroStats,
  getNearbyPlayers,
  normalizePlayerRow,
  searchPartnerProfiles,
  sortSmartPlayers,
} from './findPartners.utils';
import type {
  FilterState,
  PartnerTab,
  Player,
  SmartPlayer,
  SortOption,
  ViewerProfile,
} from './findPartners.types';

interface FindPartnersProps {
  followedUsers?: string[];
  onFollow?: (userId: string, userName: string) => void;
}

const DEFAULT_REQUEST_FORM = {
  proposed_date: '',
  proposed_time: '',
  game_type: 'singles' as 'singles' | 'doubles' | 'mixed_doubles',
  message: '',
};

const getInitialTab = (value: string | null): PartnerTab => {
  if (value === 'requests' || value === 'sent' || value === 'invites') {
    return value;
  }
  return 'search';
};

const FindPartners: React.FC<FindPartnersProps> = ({
  followedUsers: propFollowedUsers,
  onFollow: propOnFollow,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<PartnerTab>(getInitialTab(searchParams.get('tab')));
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('best_match');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [browsePlayers, setBrowsePlayers] = useState<Player[]>([]);
  const [searchPlayers, setSearchPlayers] = useState<Player[] | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [viewerProfile, setViewerProfile] = useState<ViewerProfile | null>(null);
  const [courtNameMap, setCourtNameMap] = useState<Record<string, string>>({});
  const [receivedRequests, setReceivedRequests] = useState<MatchRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<MatchRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<SmartPlayer | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [requestForm, setRequestForm] = useState(DEFAULT_REQUEST_FORM);
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const [loadingFollowIds, setLoadingFollowIds] = useState<Set<string>>(new Set());
  const [invitePlayer, setInvitePlayer] = useState<SmartPlayer | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [pendingInviteCount, setPendingInviteCount] = useState(0);
  const [showGuidelinesNotice, setShowGuidelinesNotice] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('fp_guidelines_dismissed') !== 'true';
  });
  const [guidelinesOpen, setGuidelinesOpen] = useState(true);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };

    void init();
    void loadFollowedUsers();
    void loadPendingRequestCount();
  }, []);

  useEffect(() => {
    if (propFollowedUsers) {
      setFollowedUserIds(new Set(propFollowedUsers));
    }
  }, [propFollowedUsers]);

  useEffect(() => {
    if (activeTab === 'search') {
      void loadPlayers();
      return;
    }

    if (activeTab === 'requests') {
      void loadReceivedRequests();
      return;
    }

    if (activeTab === 'sent') {
      void loadSentRequests();
    }
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
    } catch {
      // silent
    }
  };

  const loadFollowedUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_follows')
        .select('followed_id')
        .eq('follower_id', user.id);

      setFollowedUserIds(new Set((data || []).map((row: { followed_id: string }) => row.followed_id)));
    } catch (error) {
      console.error('Error loading follows:', error);
    }
  };

  const loadPlayers = async () => {
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const [viewerResult, playersResult] = await Promise.all([
        supabase
          .from('profiles')
          .select(VIEWER_PROFILE_SELECT)
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select(PLAYER_PROFILE_SELECT)
          .neq('id', user.id)
          .or('full_name.not.is.null,username.not.is.null')
          .order('created_at', { ascending: false })
          .limit(400),
      ]);

      if (playersResult.error) throw playersResult.error;

      const loadedPlayers = ((playersResult.data || []) as Player[]).map(normalizePlayerRow);
      const viewerData = (viewerResult.data || null) as ViewerProfile | null;

      setBrowsePlayers(loadedPlayers);
      setViewerProfile(viewerData);

      const allCourtIds = Array.from(new Set([
        ...asArray(viewerData?.preferred_court_ids),
        ...loadedPlayers.flatMap((player) => asArray(player.preferred_court_ids)),
      ]));

      if (allCourtIds.length === 0) {
        setCourtNameMap({});
        return;
      }

      const { data: courts, error: courtsError } = await supabase
        .from('courts')
        .select('id, name')
        .in('id', allCourtIds);

      if (courtsError) throw courtsError;

      const nextCourtNameMap = (courts || []).reduce<Record<string, string>>((accumulator, court: { id: string; name: string }) => {
        accumulator[court.id] = court.name;
        return accumulator;
      }, {});

      setCourtNameMap(nextCourtNameMap);
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchPlayers(null);
      setIsSearchLoading(false);
      return;
    }
    if (!currentUserId) {
      setIsSearchLoading(true);
      return;
    }

    let cancelled = false;
    setIsSearchLoading(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const rows = await searchPartnerProfiles(supabase, currentUserId, q);
          if (cancelled) return;
          setSearchPlayers(rows);

          const allCourtIds = Array.from(
            new Set([
              ...asArray(viewerProfile?.preferred_court_ids),
              ...rows.flatMap((player) => asArray(player.preferred_court_ids)),
            ])
          );
          if (allCourtIds.length === 0) return;

          const { data: courts, error: courtsError } = await supabase
            .from('courts')
            .select('id, name')
            .in('id', allCourtIds);

          if (courtsError || cancelled) return;

          setCourtNameMap((prev) => ({
            ...prev,
            ...(courts || []).reduce<Record<string, string>>((acc, court: { id: string; name: string }) => {
              acc[court.id] = court.name;
              return acc;
            }, {}),
          }));
        } catch (error) {
          console.error('Error searching players:', error);
          if (!cancelled) setSearchPlayers([]);
        } finally {
          if (!cancelled) setIsSearchLoading(false);
        }
      })();
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, currentUserId, viewerProfile?.preferred_court_ids]);

  const players = useMemo(() => {
    if (!searchQuery.trim()) return browsePlayers;
    return searchPlayers ?? [];
  }, [searchQuery, browsePlayers, searchPlayers]);

  const listLoading =
    isLoading || (Boolean(searchQuery.trim()) && (!currentUserId || isSearchLoading));

  const loadReceivedRequests = async () => {
    setIsLoading(true);

    try {
      const data = await getReceivedMatchRequests();
      setReceivedRequests(data);
      setPendingRequestCount(data.filter((request) => request.status === 'pending').length);
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

  const handleFollowToggle = useCallback(async (userId: string) => {
    if (!currentUserId || loadingFollowIds.has(userId)) return;

    const isFollowing = followedUserIds.has(userId);
    const playerName = players.find((player) => player.id === userId)?.full_name || '';

    setFollowedUserIds((current) => {
      const next = new Set(current);
      if (isFollowing) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
    setLoadingFollowIds((current) => new Set([...current, userId]));

    try {
      if (propOnFollow) {
        await propOnFollow(userId, playerName);
        showToast(isFollowing ? 'Removed from your court radar.' : 'Added to your court radar.');
      } else if (isFollowing) {
        await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('followed_id', userId);
      } else {
        await supabase
          .from('user_follows')
          .insert({ follower_id: currentUserId, followed_id: userId });
        showToast('Added to your court radar.');
      }
    } catch (error) {
      setFollowedUserIds((current) => {
        const next = new Set(current);
        if (isFollowing) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
      console.error('Error toggling follow:', error);
      showToast('Could not update your follow list.', 'error');
    } finally {
      setLoadingFollowIds((current) => {
        const next = new Set(current);
        next.delete(userId);
        return next;
      });
    }
  }, [currentUserId, followedUserIds, loadingFollowIds, players, propOnFollow, showToast]);

  const handleSendRequest = async () => {
    if (!selectedPlayer) return;

    try {
      await sendMatchRequest({ receiver_id: selectedPlayer.id, ...requestForm });
      setShowRequestModal(false);
      setSelectedPlayer(null);
      setRequestForm(DEFAULT_REQUEST_FORM);
      showToast(`Match request sent to ${selectedPlayer.full_name}.`);
    } catch (error) {
      console.error('Error sending request:', error);
      showToast('Failed to send match request.', 'error');
    }
  };

  const handleAcceptRequest = async (id: string) => {
    try {
      await acceptMatchRequest(id);
      void loadReceivedRequests();
      showToast('Match request accepted.');
    } catch (error) {
      console.error('Error accepting request:', error);
      showToast('Failed to accept request.', 'error');
    }
  };

  const handleDeclineRequest = async (id: string) => {
    try {
      await declineMatchRequest(id);
      void loadReceivedRequests();
    } catch (error) {
      console.error('Error declining request:', error);
    }
  };

  const handleCancelRequest = async (id: string) => {
    try {
      await cancelMatchRequest(id);
      void loadSentRequests();
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
      showToast('Could not open messages.', 'error');
    }
  };

  const handleViewProfile = useCallback((player: SmartPlayer) => {
    navigate(`/profile/${player.username || player.id}`);
  }, [navigate]);

  const smartPlayers = useMemo(
    () => buildSmartPlayers(players, viewerProfile, followedUserIds, courtNameMap),
    [courtNameMap, followedUserIds, players, viewerProfile]
  );
  const locationOptions = useMemo(() => buildLocationOptions(smartPlayers), [smartPlayers]);
  const activeFilterCount = useMemo(() => getActiveFilterCount(filters), [filters]);
  const activeFilterChips = useMemo(
    () => buildActiveFilterChips(filters, locationOptions),
    [filters, locationOptions]
  );
  const filteredPlayers = useMemo(
    () => filterSmartPlayers(smartPlayers, filters, searchQuery),
    [filters, searchQuery, smartPlayers]
  );
  const sortedPlayers = useMemo(
    () => sortSmartPlayers(filteredPlayers, sortBy),
    [filteredPlayers, sortBy]
  );
  const bestMatches = useMemo(() => getBestMatches(filteredPlayers), [filteredPlayers]);
  const nearbyPlayers = useMemo(
    () => getNearbyPlayers(filteredPlayers, bestMatches),
    [bestMatches, filteredPlayers]
  );
  const heroStats = useMemo(() => getHeroStats(smartPlayers), [smartPlayers]);
  const emptyStateCopy = useMemo(
    () => getEmptyStateCopy(searchQuery, activeFilterCount),
    [activeFilterCount, searchQuery]
  );

  const sortedLabel = SORT_OPTIONS.find((option) => option.value === sortBy)?.label;
  const readyNowCount = smartPlayers.filter((player) => player.availability_status === 'looking').length;

  return (
    <div className="animate-in fade-in space-y-8 pb-4 duration-700">
      <div className="flex flex-wrap gap-2">
        {PARTNER_TABS.map((tab) => {
          const count =
            tab.value === 'requests'
              ? pendingRequestCount
              : tab.value === 'sent'
                ? sentRequests.filter((request) => request.status === 'pending').length
                : tab.value === 'invites'
                  ? pendingInviteCount
                  : 0;

          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] transition-all ${
                activeTab === tab.value
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                  activeTab === tab.value ? 'bg-lime-300 text-slate-950' : 'bg-blue-600 text-white'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'search' && (
        <div className="space-y-5">
          <MatchmakingHero
            searchQuery={searchQuery}
            sortBy={sortBy}
            heroStats={heroStats}
            activeFilterCount={activeFilterCount}
            showFilters={showFilters}
            onSearchChange={setSearchQuery}
            onClearSearch={() => setSearchQuery('')}
            onSortChange={setSortBy}
            onToggleFilters={() => setShowFilters((current) => !current)}
          />

          {activeFilterChips.length > 0 && !showFilters && (
            <div className="flex flex-wrap gap-2">
              {activeFilterChips.map((chip) => (
                <button
                  key={`${chip.key}-${chip.label}`}
                  onClick={() => setFilters((current) => ({ ...current, [chip.key]: DEFAULT_FILTERS[chip.key] }))}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-100"
                >
                  {chip.label}
                </button>
              ))}
              <button
                onClick={() => setShowFilters(true)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
              >
                Edit filters
              </button>
            </div>
          )}

          {showGuidelinesNotice && (
            <CommunityGuidelinesNotice
              isOpen={guidelinesOpen}
              onToggle={() => setGuidelinesOpen((current) => !current)}
              onDismiss={() => {
                setShowGuidelinesNotice(false);
                window.localStorage.setItem('fp_guidelines_dismissed', 'true');
              }}
            />
          )}

          {showFilters && (
            <MatchFiltersPanel
              filters={filters}
              locationOptions={locationOptions}
              activeFilterCount={activeFilterCount}
              activeFilterChips={activeFilterChips}
              onFiltersChange={setFilters}
              onResetFilters={() => setFilters(DEFAULT_FILTERS)}
            />
          )}

          {!listLoading && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 pb-3 text-[11px] font-semibold text-slate-500">
              <span>
                {sortedPlayers.length} of {smartPlayers.length} players
              </span>
              <span>Sorted by {sortedLabel}</span>
              <span>{readyNowCount} ready now</span>
            </div>
          )}

          {listLoading ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-[360px] animate-pulse rounded-2xl border border-slate-100 bg-white" />
              ))}
            </div>
          ) : sortedPlayers.length === 0 ? (
            <MatchmakingEmptyState
              title={emptyStateCopy.title}
              description={emptyStateCopy.description}
              searchQuery={searchQuery}
              activeFilterChips={activeFilterChips}
              onClearSearch={() => setSearchQuery('')}
              onResetFilters={() => setFilters(DEFAULT_FILTERS)}
            />
          ) : (
            <>
              <PlayersSection
                title="Best Matches for You"
                subtitle="Recommended first based on fit, location, and current activity."
                players={bestMatches}
                emptyText="Try widening your search or switching the active filter chips."
                onSendRequest={(player) => {
                  setSelectedPlayer(player);
                  setShowRequestModal(true);
                }}
                onMessage={handleMessage}
                onFollow={handleFollowToggle}
                onInvite={setInvitePlayer}
                onViewProfile={handleViewProfile}
                followedUserIds={followedUserIds}
                loadingFollowIds={loadingFollowIds}
              />

              <PlayersSection
                title="Nearby Players"
                subtitle="Players from your area and preferred playing zones."
                players={nearbyPlayers}
                emptyText="Add a broader location filter to uncover more nearby options."
                onSendRequest={(player) => {
                  setSelectedPlayer(player);
                  setShowRequestModal(true);
                }}
                onMessage={handleMessage}
                onFollow={handleFollowToggle}
                onInvite={setInvitePlayer}
                onViewProfile={handleViewProfile}
                followedUserIds={followedUserIds}
                loadingFollowIds={loadingFollowIds}
              />

              <PlayersSection
                title="All Players"
                subtitle="The full discovery pool, sorted the way you prefer."
                players={sortedPlayers}
                emptyText="Clear the filters to restore the full player list."
                onSendRequest={(player) => {
                  setSelectedPlayer(player);
                  setShowRequestModal(true);
                }}
                onMessage={handleMessage}
                onFollow={handleFollowToggle}
                onInvite={setInvitePlayer}
                onViewProfile={handleViewProfile}
                followedUserIds={followedUserIds}
                loadingFollowIds={loadingFollowIds}
              />
            </>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <section className="space-y-4 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">Incoming</p>
              <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-950">Received Requests</h2>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
              {receivedRequests.length} total
            </span>
          </div>

          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-3xl border border-slate-100 bg-slate-50" />
            ))
          ) : receivedRequests.length === 0 ? (
            <div className="py-24 text-center">
              <Clock3 className="mx-auto mb-6 text-slate-200" size={44} />
              <h3 className="text-2xl font-black uppercase tracking-tight text-slate-300">No match requests</h3>
              <p className="mt-2 text-sm text-slate-400">When players challenge you to a game, they will show up here.</p>
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
        </section>
      )}

      {activeTab === 'sent' && (
        <section className="space-y-4 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">Outbound</p>
              <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-950">Sent Requests</h2>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
              {sentRequests.length} total
            </span>
          </div>

          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-3xl border border-slate-100 bg-slate-50" />
            ))
          ) : sentRequests.length === 0 ? (
            <div className="py-24 text-center">
              <Send className="mx-auto mb-6 text-slate-200" size={44} />
              <h3 className="text-2xl font-black uppercase tracking-tight text-slate-300">No sent requests</h3>
              <p className="mt-2 text-sm text-slate-400">Pick a strong match and send your first invite to play.</p>
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
        </section>
      )}

      {activeTab === 'invites' && (
        <PlayInvitesTab onCountChange={setPendingInviteCount} />
      )}

      {showRequestModal && selectedPlayer && (
        <SendRequestModal
          player={selectedPlayer}
          form={requestForm}
          onChange={setRequestForm}
          onSend={handleSendRequest}
          onClose={() => {
            setShowRequestModal(false);
            setSelectedPlayer(null);
          }}
        />
      )}

      {invitePlayer && (
        <InvitePlayerModal
          player={invitePlayer}
          onClose={() => setInvitePlayer(null)}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 rounded-2xl px-5 py-3.5 text-sm font-black uppercase tracking-[0.18em] shadow-2xl ${
          toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-950 text-white'
        }`}>
          <div className="flex items-center gap-3">
            {toast.type !== 'error' && <CheckCircle2 size={16} className="text-lime-400" />}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default FindPartners;
