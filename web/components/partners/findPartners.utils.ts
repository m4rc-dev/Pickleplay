import {
  GAME_LABELS,
  SESSION_LABELS,
  SKILL_LABELS,
  STYLE_LABELS,
} from './findPartners.constants';
import type {
  ActiveFilterChip,
  FilterOption,
  FilterState,
  MatchHeroStat,
  Player,
  SmartPlayer,
  SortOption,
  ViewerProfile,
} from './findPartners.types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const asArray = (value: string[] | null | undefined) => Array.isArray(value) ? value : [];

export const getLocationKey = (location?: string | null) => {
  if (!location) return 'unlisted';
  return location
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
};

export const getLocationLabel = (location?: string | null) => {
  if (!location) return 'Location pending';
  return location.split(',')[0].trim();
};

export const getSkillBand = (dupr?: number | null) => {
  if (dupr != null && dupr >= 4.75) return 'elite';
  if (dupr != null && dupr >= 4.0) return 'advanced';
  if (dupr != null && dupr >= 3.25) return 'intermediate';
  return 'beginner';
};

const inferPlayStyle = (player: Player) => {
  const source = `${player.bio || ''} ${player.availability_note || ''}`.toLowerCase();
  if (/(aggressive|attack|fast|power|speedup|poach)/.test(source) || (player.dupr_rating ?? 0) >= 4.6) return 'aggressive';
  if (/(control|patient|reset|dink|defense|defence|consisten)/.test(source)) return 'control';
  if (/(fun|social|friendly|casual|weekend)/.test(source)) return 'social';
  return 'balanced';
};

const inferGamePreference = (player: Player) => {
  const source = `${player.bio || ''} ${player.availability_note || ''}`.toLowerCase();
  if (/(singles|one on one|1v1)/.test(source)) return 'singles';
  if (/(doubles|mixed|partner play|2v2)/.test(source)) return 'doubles';
  if ((player.dupr_rating ?? 0) >= 4.35) return 'singles';
  if ((player.dupr_rating ?? 0) <= 3.1) return 'doubles';
  return 'flexible';
};

const inferSessionPreference = (player: Player) => {
  const source = `${player.bio || ''} ${player.availability_note || ''}`.toLowerCase();
  if (/(league|tournament|compete|serious|ranked|drill)/.test(source) || (player.dupr_rating ?? 0) >= 4.15) return 'competitive';
  if (/(casual|fun|social|relaxed|friendly)/.test(source)) return 'casual';
  return 'flexible';
};

const formatAvailabilityLabel = (player: Player) => {
  if (player.availability_status === 'looking') {
    if (player.availability_start && player.availability_end) return `${player.availability_start} - ${player.availability_end}`;
    return player.availability_note?.trim() || 'Looking now';
  }
  if (player.availability_status === 'busy') return 'Busy right now';
  return 'Offline';
};

const formatLastActiveLabel = (player: Player) => {
  if (player.availability_status === 'looking') return 'Active now';
  if (player.availability_status === 'busy') return 'Checked in today';
  if (!player.created_at) return 'Recently joined';

  const diffMs = Date.now() - new Date(player.created_at).getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  if (diffDays <= 7) return 'Joined this week';
  if (diffDays <= 30) return 'Joined this month';
  return 'Recently on PicklePlay';
};

const getVerificationCount = (player: Player) =>
  [player.phone_verified, player.id_verified, player.skill_verified].filter(Boolean).length;

const getFavoriteCourtLabel = (player: Player, courtNameMap: Record<string, string>) => {
  const firstCourtId = asArray(player.preferred_court_ids)[0];
  if (firstCourtId && courtNameMap[firstCourtId]) return courtNameMap[firstCourtId];
  return getLocationLabel(player.location);
};

const getCommonCourtLabel = (
  player: Player,
  viewerPreferredCourts: Set<string>,
  courtNameMap: Record<string, string>
) => {
  const sharedCourtId = asArray(player.preferred_court_ids).find((courtId) => viewerPreferredCourts.has(courtId));
  if (sharedCourtId && courtNameMap[sharedCourtId]) return courtNameMap[sharedCourtId];
  return getFavoriteCourtLabel(player, courtNameMap);
};

const getMatchBadge = (score: number) => {
  if (score >= 92) return 'Top fit';
  if (score >= 84) return 'Strong fit';
  if (score >= 76) return 'Recommended';
  return 'Warm lead';
};

export const buildSmartPlayers = (
  players: Player[],
  viewerProfile: ViewerProfile | null,
  followedUserIds: Set<string>,
  courtNameMap: Record<string, string>
): SmartPlayer[] => {
  const viewerLocationKey = getLocationKey(viewerProfile?.location);
  const viewerPreferredLocations = new Set(asArray(viewerProfile?.preferred_location_ids));
  const viewerPreferredCourts = new Set(asArray(viewerProfile?.preferred_court_ids));
  const viewerCourtType = viewerProfile?.preferred_court_type || 'Both';
  const viewerSkillMin = viewerProfile?.preferred_skill_min;
  const viewerSkillMax = viewerProfile?.preferred_skill_max;
  const viewerDupr = viewerProfile?.dupr_rating;

  return players.map((player) => {
    const skillBand = getSkillBand(player.dupr_rating);
    const playStyleKey = inferPlayStyle(player);
    const gamePreferenceKey = inferGamePreference(player);
    const sessionKey = inferSessionPreference(player);
    const verificationCount = getVerificationCount(player);
    const isVerified = verificationCount >= 2;
    const locationKey = getLocationKey(player.location);
    const locationLabel = getLocationLabel(player.location);
    const favoriteCourtLabel = getFavoriteCourtLabel(player, courtNameMap);
    const commonCourtLabel = getCommonCourtLabel(player, viewerPreferredCourts, courtNameMap);
    const isFollowing = followedUserIds.has(player.id);
    const sharedPreferredLocation = asArray(player.preferred_location_ids).some((id) => viewerPreferredLocations.has(id));
    const sharedPreferredCourt = asArray(player.preferred_court_ids).some((id) => viewerPreferredCourts.has(id));
    const sameCourtType =
      viewerCourtType === 'Both' ||
      !player.preferred_court_type ||
      player.preferred_court_type === 'Both' ||
      player.preferred_court_type === viewerCourtType;
    const skillInRange =
      player.dupr_rating != null &&
      (viewerSkillMin == null || player.dupr_rating >= viewerSkillMin) &&
      (viewerSkillMax == null || player.dupr_rating <= viewerSkillMax);
    const duprGap =
      viewerDupr != null && player.dupr_rating != null
        ? Math.abs(viewerDupr - player.dupr_rating)
        : null;
    const joinedTimestamp = player.created_at ? new Date(player.created_at).getTime() : 0;
    const isActiveRecently =
      player.availability_status === 'looking' ||
      (joinedTimestamp > 0 && (Date.now() - joinedTimestamp) / (1000 * 60 * 60 * 24) <= 21);

    const locationRank =
      locationKey !== 'unlisted' && locationKey === viewerLocationKey
        ? 3
        : sharedPreferredLocation
          ? 2
          : locationKey !== 'unlisted' &&
              viewerLocationKey !== 'unlisted' &&
              (locationKey.includes(viewerLocationKey) || viewerLocationKey.includes(locationKey))
            ? 1
            : 0;

    const ratingScore =
      duprGap == null
        ? player.dupr_rating != null
          ? 8
          : 4
        : clamp(Math.round(20 - (duprGap * 8)), 2, 20);

    const freshnessScore = player.availability_status === 'looking' ? 8 : isActiveRecently ? 4 : 0;
    const matchScore = clamp(
      Math.round(
        42 +
          (locationRank * 8) +
          (sharedPreferredCourt ? 10 : 0) +
          (skillInRange ? 10 : 0) +
          (sameCourtType ? 4 : 0) +
          freshnessScore +
          (isVerified ? 6 : verificationCount * 2) +
          (isFollowing ? 6 : 0) +
          ratingScore
      ),
      52,
      98
    );

    const matchReasons = [
      locationRank > 0 ? `Near ${locationLabel}` : null,
      sharedPreferredCourt ? 'Common court' : null,
      skillInRange ? 'Skill aligned' : null,
      player.availability_status === 'looking' ? 'Ready to play' : null,
      isVerified ? 'Verified profile' : null,
      isFollowing ? 'Already connected' : null,
      sameCourtType && !sharedPreferredCourt ? `${player.preferred_court_type || 'Both'} courts` : null,
      isActiveRecently ? 'Recently active' : null,
    ].filter(Boolean) as string[];

    return {
      ...player,
      locationKey,
      locationLabel,
      skillBand,
      skillLabel: SKILL_LABELS[skillBand],
      playStyleKey,
      playStyleLabel: STYLE_LABELS[playStyleKey],
      availabilityLabel: formatAvailabilityLabel(player),
      gamePreferenceKey,
      gamePreferenceLabel: GAME_LABELS[gamePreferenceKey],
      sessionKey,
      sessionLabel: SESSION_LABELS[sessionKey],
      commonCourtLabel,
      favoriteCourtLabel,
      lastActiveLabel: formatLastActiveLabel(player),
      matchScore,
      matchBadge: getMatchBadge(matchScore),
      matchReasons: matchReasons.slice(0, 3).length > 0 ? matchReasons.slice(0, 3) : ['Potential chemistry'],
      isVerified,
      verificationCount,
      locationRank,
      joinedTimestamp,
      isActiveRecently,
    };
  });
};

export const buildLocationOptions = (players: SmartPlayer[]): Array<FilterOption<string>> => {
  const values = Array.from(
    new Set(players.map((player) => player.locationKey).filter((location) => location !== 'unlisted'))
  ).slice(0, 6);

  return [
    { value: 'all', label: 'Any' },
    ...values.map((value) => ({
      value,
      label: players.find((player) => player.locationKey === value)?.locationLabel || value,
    })),
  ];
};

export const getActiveFilterCount = (filters: FilterState) =>
  [
    filters.location !== 'all',
    filters.skill !== 'all',
    filters.playStyle !== 'all',
    filters.availability !== 'all',
    filters.gameType !== 'all',
    filters.session !== 'all',
    filters.verifiedOnly,
    filters.activeRecently,
  ].filter(Boolean).length;

export const buildActiveFilterChips = (
  filters: FilterState,
  locationOptions: Array<FilterOption<string>>
): ActiveFilterChip[] => {
  const locationLabel = locationOptions.find((option) => option.value === filters.location)?.label;

  return [
    filters.location !== 'all' ? { key: 'location', label: locationLabel ? `Location: ${locationLabel}` : 'Location' } : null,
    filters.skill !== 'all' ? { key: 'skill', label: `Skill: ${SKILL_LABELS[filters.skill]}` } : null,
    filters.playStyle !== 'all' ? { key: 'playStyle', label: `Style: ${STYLE_LABELS[filters.playStyle]}` } : null,
    filters.availability !== 'all'
      ? {
          key: 'availability',
          label: `Availability: ${
            filters.availability === 'looking'
              ? 'Looking now'
              : filters.availability === 'busy'
                ? 'Busy'
                : 'Offline'
          }`,
        }
      : null,
    filters.gameType !== 'all' ? { key: 'gameType', label: `Format: ${GAME_LABELS[filters.gameType]}` } : null,
    filters.session !== 'all' ? { key: 'session', label: `Vibe: ${SESSION_LABELS[filters.session]}` } : null,
    filters.verifiedOnly ? { key: 'verifiedOnly', label: 'Verified only' } : null,
    filters.activeRecently ? { key: 'activeRecently', label: 'Active recently' } : null,
  ].filter(Boolean) as ActiveFilterChip[];
};

export const filterSmartPlayers = (
  players: SmartPlayer[],
  filters: FilterState,
  searchQuery: string
) => {
  const query = searchQuery.trim().toLowerCase();

  return players.filter((player) => {
    const haystack = [
      player.full_name,
      player.username,
      player.locationLabel,
      player.skillLabel,
      player.playStyleLabel,
      player.availabilityLabel,
      player.gamePreferenceLabel,
      player.sessionLabel,
      player.commonCourtLabel,
      player.favoriteCourtLabel,
      player.lastActiveLabel,
      ...player.matchReasons,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (query && !haystack.includes(query)) return false;
    if (filters.location !== 'all' && player.locationKey !== filters.location) return false;
    if (filters.skill !== 'all' && player.skillBand !== filters.skill) return false;
    if (filters.playStyle !== 'all' && player.playStyleKey !== filters.playStyle) return false;
    if (filters.availability !== 'all' && player.availability_status !== filters.availability) return false;
    if (filters.gameType !== 'all' && player.gamePreferenceKey !== filters.gameType) return false;
    if (filters.session !== 'all' && player.sessionKey !== filters.session) return false;
    if (filters.verifiedOnly && !player.isVerified) return false;
    if (filters.activeRecently && !player.isActiveRecently) return false;
    return true;
  });
};

export const sortSmartPlayers = (players: SmartPlayer[], sortBy: SortOption) => {
  const next = [...players];

  next.sort((a, b) => {
    switch (sortBy) {
      case 'nearest':
        return b.locationRank - a.locationRank || b.matchScore - a.matchScore || (b.dupr_rating || 0) - (a.dupr_rating || 0);
      case 'most_active':
        return (
          Number(b.isActiveRecently) - Number(a.isActiveRecently) ||
          (b.availability_status === 'looking' ? 2 : b.availability_status === 'busy' ? 1 : 0) -
            (a.availability_status === 'looking' ? 2 : a.availability_status === 'busy' ? 1 : 0) ||
          b.matchScore - a.matchScore
        );
      case 'highest_rated':
        return (b.dupr_rating || 0) - (a.dupr_rating || 0) || b.matchScore - a.matchScore;
      case 'recently_joined':
        return b.joinedTimestamp - a.joinedTimestamp || b.matchScore - a.matchScore;
      case 'best_match':
      default:
        return b.matchScore - a.matchScore || b.verificationCount - a.verificationCount || (b.dupr_rating || 0) - (a.dupr_rating || 0);
    }
  });

  return next;
};

export const getBestMatches = (players: SmartPlayer[], limit = 4) =>
  [...players].sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);

export const getNearbyPlayers = (players: SmartPlayer[], featuredPlayers: SmartPlayer[], limit = 4) => {
  const featuredIds = new Set(featuredPlayers.map((player) => player.id));
  return players
    .filter((player) => player.locationRank > 0 && !featuredIds.has(player.id))
    .sort((a, b) => b.locationRank - a.locationRank || b.matchScore - a.matchScore)
    .slice(0, limit);
};

export const getHeroStats = (players: SmartPlayer[]): MatchHeroStat[] => {
  const readyNow = players.filter((player) => player.availability_status === 'looking').length;
  const verified = players.filter((player) => player.isVerified).length;
  const nearby = players.filter((player) => player.locationRank > 0).length;

  return [
    { label: 'Ready now', value: readyNow, accentClass: 'text-lime-300', helper: 'players open for a session' },
    { label: 'Verified', value: verified, accentClass: 'text-white', helper: 'trusted profiles in your pool' },
    { label: 'Nearby', value: nearby, accentClass: 'text-blue-100', helper: 'local players near your courts' },
  ];
};

export const getEmptyStateCopy = (searchQuery: string, activeFilterCount: number) => {
  if (searchQuery.trim()) {
    return {
      title: `No players for "${searchQuery.trim()}"`,
      description: 'Try a city, player name, court, style, or clear the current search phrase.',
    };
  }

  if (activeFilterCount > 0) {
    return {
      title: 'Your filters are too tight',
      description: 'Open up one or two chips to widen the matchmaking pool without losing relevance.',
    };
  }

  return {
    title: 'No players in your pool yet',
    description: 'As more players finish their profiles and activity signals sync, your recommended lanes will fill in here.',
  };
};
