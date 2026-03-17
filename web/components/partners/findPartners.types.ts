export interface Player {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  dupr_rating?: number | null;
  location?: string | null;
  bio?: string | null;
  availability_status?: 'looking' | 'busy' | 'offline' | null;
  availability_start?: string | null;
  availability_end?: string | null;
  availability_note?: string | null;
  preferred_skill_min?: number | null;
  preferred_skill_max?: number | null;
  preferred_location_ids?: string[] | null;
  preferred_court_ids?: string[] | null;
  preferred_court_type?: 'Indoor' | 'Outdoor' | 'Both' | null;
  phone_verified?: boolean | null;
  id_verified?: boolean | null;
  skill_verified?: boolean | null;
  created_at?: string | null;
}

export interface ViewerProfile {
  location?: string | null;
  dupr_rating?: number | null;
  preferred_skill_min?: number | null;
  preferred_skill_max?: number | null;
  preferred_location_ids?: string[] | null;
  preferred_court_ids?: string[] | null;
  preferred_court_type?: 'Indoor' | 'Outdoor' | 'Both' | null;
}

export type PartnerTab = 'search' | 'requests' | 'sent' | 'invites';
export type SortOption = 'best_match' | 'nearest' | 'most_active' | 'highest_rated' | 'recently_joined';
export type SkillBand = 'beginner' | 'intermediate' | 'advanced' | 'elite';
export type PlayStyle = 'balanced' | 'aggressive' | 'control' | 'social';
export type GamePreference = 'singles' | 'doubles' | 'flexible';
export type SessionPreference = 'casual' | 'competitive' | 'flexible';

export interface FilterState {
  location: string;
  skill: 'all' | SkillBand;
  playStyle: 'all' | PlayStyle;
  availability: 'all' | 'looking' | 'busy' | 'offline';
  gameType: 'all' | GamePreference;
  session: 'all' | SessionPreference;
  verifiedOnly: boolean;
  activeRecently: boolean;
}

export interface SmartPlayerCardData {
  id: string;
  full_name: string;
  avatar_url?: string;
  location?: string;
  username?: string;
  skillLabel: string;
  playStyleLabel: string;
  availabilityLabel: string;
  gamePreferenceLabel: string;
  sessionLabel: string;
  commonCourtLabel: string;
  favoriteCourtLabel: string;
  lastActiveLabel: string;
  matchScore: number;
  matchBadge: string;
  matchReasons: string[];
  isVerified: boolean;
  verificationCount: number;
}

export interface SmartPlayer extends Player, SmartPlayerCardData {
  locationKey: string;
  locationLabel: string;
  skillBand: SkillBand;
  playStyleKey: PlayStyle;
  gamePreferenceKey: GamePreference;
  sessionKey: SessionPreference;
  locationRank: number;
  joinedTimestamp: number;
  isActiveRecently: boolean;
}

export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
}

export interface ActiveFilterChip {
  key: keyof FilterState;
  label: string;
}

export interface MatchHeroStat {
  label: string;
  value: number;
  accentClass: string;
  helper: string;
}
