
// Fix: Moved UserRole type from App.tsx to types.ts to centralize type definitions.
export type UserRole = 'guest' | 'ADMIN' | 'PLAYER' | 'CUSTOMER' | 'COURT_OWNER' | 'COACH';

export interface Player {
  id: string;
  name: string;
  skillLevel: number; // DUPR rating
  avatar: string;
  matchesPlayed: number;
  winRate: number;
}

export type CourtStatus = 'Available' | 'Fully Booked' | 'Coming Soon' | 'Maintenance';

export interface Court {
  id: string;
  name: string;
  type: 'Indoor' | 'Outdoor';
  location: string;
  location_id?: string; // Foreign key to locations table
  pricePerHour: number;
  availability: string[]; // ISO strings
  latitude?: number;
  longitude?: number;
  numCourts?: number;
  amenities?: string[];
  ownerId?: string;
  cleaningTimeMinutes?: number; // Buffer time between bookings for cleaning
  locationId?: string; // References parent location venue
  locationCourtCount?: number; // Total number of courts at this location
  imageUrl?: string;
  courtType?: 'Indoor' | 'Outdoor' | 'Both';
  status?: CourtStatus; // Per-court status
}

export type LocationStatus = 'Active' | 'Closed' | 'Maintenance' | 'Coming Soon';

export interface Location {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  postal_code?: string;
  region?: string;
  barangay?: string;
  latitude: number;
  longitude: number;
  amenities: string[];
  phone?: string;
  base_cleaning_time: number;
  is_active: boolean;
  status?: LocationStatus;
  created_at?: string;
  updated_at?: string;
  court_count?: number; // Virtual field for UI
  image_url?: string;
  court_type?: 'Indoor' | 'Outdoor' | 'Both';
  opening_time?: string; // e.g. '08:00'
  closing_time?: string; // e.g. '17:00'
}

export type LocationClosureReason = 'Holiday' | 'Tournament' | 'Maintenance' | 'Private Event' | 'Weather' | 'Other';

export interface LocationClosure {
  id: string;
  location_id: string;
  date: string; // YYYY-MM-DD
  reason: LocationClosureReason;
  description?: string;
  created_at?: string;
}

export type CourtClosureReason = 'Holiday' | 'Tournament' | 'Maintenance' | 'Private Event' | 'Weather' | 'Other';

export interface CourtClosure {
  id: string;
  court_id: string;
  date: string; // YYYY-MM-DD
  reason: CourtClosureReason;
  description?: string;
  created_at?: string;
}

export interface Match {
  id: string;
  date: string;
  type: 'Singles' | 'Doubles';
  players: string[];
  score: string;
  status: 'Upcoming' | 'Completed';
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface Product {
  id: string;
  name: string;
  category: 'Paddles' | 'Apparel' | 'Accessories';
  price: number;
  image: string;
  isNew?: boolean;
  isLimited?: boolean;
}

export type CartItem = Product & { quantity: number };

export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  category: 'Tournament' | 'Gear' | 'Community' | 'Pro Tips';
  date: string;
  image: string;
  readTime: string;
  author: string;
}

export interface ProfessionalApplication {
  id: string;
  playerId: string;
  playerName: string;
  requestedRole: 'COACH' | 'COURT_OWNER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submissionDate: string;
  documentName: string;
  experienceSummary: string;
}

export interface SocialComment {
  id: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  timestamp: string;
  likes: string[]; // User IDs who liked this comment
  replies: SocialComment[]; // Nested replies
}

export interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  // Fix: Use the centralized UserRole type for better type safety.
  authorRole: UserRole;
  authorAvailabilityStatus?: 'looking' | 'busy' | 'offline';
  authorAvailabilityStart?: string | null;
  authorAvailabilityEnd?: string | null;
  authorAvailabilityNote?: string | null;
  authorPreferredSkillMin?: number | null;
  authorPreferredSkillMax?: number | null;
  authorPreferredLocationIds?: string[] | null;
  authorPreferredCourtIds?: string[] | null;
  authorPreferredCourtType?: 'Indoor' | 'Outdoor' | 'Both' | null;
  authorPreferredLocationMode?: 'auto' | 'manual' | null;
  content: string;
  image?: string;
  likes: string[]; // Array of user IDs
  comments: SocialComment[];
  timestamp: string;
  tags?: string[];
  isEdited?: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  prizePool: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  skillLevel: string;
  maxPlayers: number;
  registeredCount: number;
  image?: string;
}

export interface Notification {
  id: string;
  type: 'FOLLOW' | 'MENTION' | 'SYSTEM' | 'MATCH_RESULT' | 'BOOKING';
  message: string;
  actor: {
    name: string;
    avatar: string;
    id?: string;
  };
  timestamp: string;
  isRead: boolean;
  userId?: string;
  bookingId?: string; // Optional reference to booking for navigation
}

export type CourtEventType = 'maintenance' | 'private_event' | 'cleaning' | 'closure' | 'other';

export interface CourtEvent {
  id: string;
  court_id: string;
  owner_id: string;
  title: string;
  description?: string;
  start_datetime: string; // ISO 8601 timestamp
  end_datetime: string; // ISO 8601 timestamp
  event_type: CourtEventType;
  blocks_bookings: boolean; // If true, prevents player bookings during this time
  color?: string; // Hex color for calendar display
  created_at?: string;
  updated_at?: string;
}

export interface CourtReview {
  id: string;
  court_id: string;
  user_id: string;
  booking_id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string;
    avatar_url: string;
  };
}
export interface Subscription {
  id: string;
  court_owner_id: string;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  trial_started_at: string;
  trial_ends_at: string;
  subscription_started_at?: string;
  current_period_start?: string;
  current_period_end?: string;
  plan_type: 'monthly' | 'yearly';
  amount?: number;
  currency: string;
  payment_provider?: string;
  payment_provider_subscription_id?: string;
  payment_provider_customer_id?: string;
  created_at?: string;
  updated_at?: string;
  cancelled_at?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price_monthly: number;
  price_yearly?: number;
  currency: string;
  max_courts?: number;
  max_bookings_per_month?: number;
  features: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Player Invitation System
export interface PlayerInvitation {
  id: string;
  booking_id: string;
  inviter_id: string;
  invitee_id?: string | null;
  invitee_email?: string | null;
  invitee_username?: string | null;
  invitation_method: 'username' | 'email' | 'link' | 'qr' | 'social';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invitation_link?: string;
  qr_code_data?: string;
  message?: string;
  created_at?: string;
  responded_at?: string;
  expires_at?: string;
  inviter?: { full_name: string; avatar_url: string; username: string };
  invitee?: { full_name: string; avatar_url: string; username: string };
  booking?: {
    booking_date: string;
    start_time: string;
    end_time: string;
    court?: { name: string; location?: string };
  };
}

export interface BookingWaitingList {
  id: string;
  booking_id: string;
  user_id: string;
  position: number;
  joined_at?: string;
  notified: boolean;
  user?: { full_name: string; avatar_url: string };
}

// Achievements & Certificates
export interface Achievement {
  id: string;
  name: string;
  description: string;
  badge_icon?: string;
  badge_color?: string;
  category: 'milestone' | 'skill' | 'social' | 'attendance' | 'special';
  requirement_type: 'matches_played' | 'hours_played' | 'rating' | 'attendance_rate' | 'streak' | 'opponents' | 'tournaments';
  requirement_value: number;
  points_reward: number;
  is_active: boolean;
  created_at?: string;
}

export interface PlayerAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at?: string;
  progress: number;
  is_completed: boolean;
  achievement?: Achievement;
}

export interface Certificate {
  id: string;
  user_id: string;
  certificate_type: 'achievement' | 'tournament' | 'milestone' | 'special';
  title: string;
  description?: string;
  template_name?: string;
  certificate_data?: Record<string, any>;
  certificate_url?: string;
  issued_at?: string;
  certificate_number?: string;
  is_public: boolean;
}

export interface PlayerStats {
  id: string;
  user_id: string;
  total_matches: number;
  matches_completed: number;
  total_hours_played: number;
  win_count: number;
  loss_count: number;
  attendance_rate: number;
  current_streak: number;
  longest_streak: number;
  unique_opponents: number;
  tournaments_played: number;
  tournaments_won: number;
  total_points: number;
  last_played_at?: string;
  updated_at?: string;
}
