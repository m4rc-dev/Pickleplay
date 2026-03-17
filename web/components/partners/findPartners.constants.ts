import type {
  FilterOption,
  FilterState,
  PartnerTab,
  PlayStyle,
  SessionPreference,
  SkillBand,
  SortOption,
  GamePreference,
} from './findPartners.types';

export const VIEWER_PROFILE_SELECT =
  'location, dupr_rating, preferred_skill_min, preferred_skill_max, preferred_location_ids, preferred_court_ids, preferred_court_type';

export const PLAYER_PROFILE_SELECT = `
  id,
  full_name,
  username,
  avatar_url,
  dupr_rating,
  location,
  bio,
  availability_status,
  availability_start,
  availability_end,
  availability_note,
  preferred_skill_min,
  preferred_skill_max,
  preferred_location_ids,
  preferred_court_ids,
  preferred_court_type,
  phone_verified,
  id_verified,
  skill_verified,
  created_at
`;

export const DEFAULT_FILTERS: FilterState = {
  location: 'all',
  skill: 'all',
  playStyle: 'all',
  availability: 'all',
  gameType: 'all',
  session: 'all',
  verifiedOnly: false,
  activeRecently: false,
};

export const PARTNER_TABS: Array<{ value: PartnerTab; label: string }> = [
  { value: 'search', label: 'Find Players' },
  { value: 'requests', label: 'Received' },
  { value: 'sent', label: 'Sent' },
  { value: 'invites', label: 'Invites' },
];

export const SORT_OPTIONS: Array<FilterOption<SortOption>> = [
  { value: 'best_match', label: 'Best match' },
  { value: 'nearest', label: 'Nearest' },
  { value: 'most_active', label: 'Most active' },
  { value: 'highest_rated', label: 'Highest rated' },
  { value: 'recently_joined', label: 'Recently joined' },
];

export const SKILL_LABELS: Record<SkillBand, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  elite: 'Elite',
};

export const STYLE_LABELS: Record<PlayStyle, string> = {
  balanced: 'Balanced',
  aggressive: 'Aggressive',
  control: 'Control',
  social: 'Social',
};

export const GAME_LABELS: Record<GamePreference, string> = {
  singles: 'Singles',
  doubles: 'Doubles',
  flexible: 'Flexible',
};

export const SESSION_LABELS: Record<SessionPreference, string> = {
  casual: 'Casual',
  competitive: 'Competitive',
  flexible: 'Flexible',
};

export const SKILL_FILTER_OPTIONS: Array<FilterOption<FilterState['skill']>> = [
  { value: 'all', label: 'Any' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'elite', label: 'Elite' },
];

export const STYLE_FILTER_OPTIONS: Array<FilterOption<FilterState['playStyle']>> = [
  { value: 'all', label: 'Any' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'aggressive', label: 'Aggressive' },
  { value: 'control', label: 'Control' },
  { value: 'social', label: 'Social' },
];

export const AVAILABILITY_FILTER_OPTIONS: Array<FilterOption<FilterState['availability']>> = [
  { value: 'all', label: 'Any' },
  { value: 'looking', label: 'Looking now' },
  { value: 'busy', label: 'Busy' },
  { value: 'offline', label: 'Offline' },
];

export const GAME_FILTER_OPTIONS: Array<FilterOption<FilterState['gameType']>> = [
  { value: 'all', label: 'Any' },
  { value: 'singles', label: 'Singles' },
  { value: 'doubles', label: 'Doubles' },
  { value: 'flexible', label: 'Flexible' },
];

export const SESSION_FILTER_OPTIONS: Array<FilterOption<FilterState['session']>> = [
  { value: 'all', label: 'Any' },
  { value: 'casual', label: 'Casual' },
  { value: 'competitive', label: 'Competitive' },
  { value: 'flexible', label: 'Flexible' },
];
