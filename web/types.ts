
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

export interface Court {
  id: string;
  name: string;
  type: 'Indoor' | 'Outdoor';
  location: string;
  pricePerHour: number;
  availability: string[]; // ISO strings
  latitude?: number;
  longitude?: number;
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
  content: string;
  image?: string;
  likes: string[]; // Array of user IDs
  comments: SocialComment[];
  timestamp: string;
  tags?: string[];
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
  type: 'FOLLOW' | 'MENTION' | 'SYSTEM' | 'MATCH_RESULT';
  message: string;
  actor: {
    name: string;
    avatar: string;
  };
  timestamp: string;
  isRead: boolean;
}
