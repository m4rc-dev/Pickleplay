
import { Court, ProfessionalApplication, SocialPost, SocialComment, Tournament, UserRole } from '../types';

export const MOCK_USERS: Record<string, any> = {
  'player-current': {
    id: 'player-current',
    name: 'John Player',
    role: 'PLAYER',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    location: 'Metro Manila, PH',
    bio: 'Competitive pickleball enthusiast looking to master the third shot drop.',
    dupr: 4.35,
    winRate: 68,
    matches: 122,
    email: 'john@pickleplay.com'
  },
  'u1': {
    id: 'u1',
    name: 'David Smith',
    role: 'PLAYER',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    level: '5.0',
    location: 'Cebu City, PH',
    tags: ['Tournament Ready'],
    bio: '5.0 DUPR player, always looking for a competitive match.',
    dupr: 5.12,
    winRate: 82,
    matches: 156
  },
  'u2': {
    id: 'u2',
    name: 'Marcus Chen',
    role: 'COACH',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus&mood[]=sad',
    level: '4.5',
    location: 'Quezon City, PH',
    tags: ['Power', 'Aggressive'],
    bio: 'Certified PPR coach specializing in power-up clinics and advanced strategy.',
    dupr: 4.85,
    winRate: 75,
    matches: 210
  },
  'u3': {
    id: 'u3',
    name: 'Elena Rodriguez',
    role: 'PLAYER',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
    level: '3.8',
    location: 'Davao City, PH',
    tags: ['Casual', 'Dinking'],
    bio: 'Social player who loves a good dink rally. Looking for fun matches on weekends.',
    dupr: 3.85,
    winRate: 59,
    matches: 112
  }
};

export const INITIAL_COURTS: Court[] = [
  { id: '1', name: 'Center Court 1', type: 'Indoor', location: 'Riverside Park', pricePerHour: 25, availability: [], latitude: 14.5995, longitude: 121.0437 },
  { id: '2', name: 'Center Court 2', type: 'Indoor', location: 'Riverside Park', pricePerHour: 25, availability: [], latitude: 14.6010, longitude: 121.0450 },
  { id: '3', name: 'West Garden 1', type: 'Outdoor', location: 'City Courts', pricePerHour: 15, availability: [], latitude: 14.5547, longitude: 121.0244 },
  { id: '4', name: 'Metro Dink Hub', type: 'Outdoor', location: 'Downtown', pricePerHour: 20, availability: [], latitude: 14.5995, longitude: 120.9842 },
  { id: '5', name: 'BGC Premium Courts', type: 'Indoor', location: 'Bonifacio Global City', pricePerHour: 50, availability: [], latitude: 14.5507, longitude: 121.0494 },
  { id: '6', name: 'Pasay Bay Courts', type: 'Outdoor', location: 'Pasay City', pricePerHour: 22, availability: [], latitude: 14.5378, longitude: 120.9896 },
];

export const INITIAL_POSTS: SocialPost[] = [
  {
    id: 'p-1',
    authorId: 'u2',
    authorName: 'Marcus Chen',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus&mood[]=sad',
    authorRole: 'COACH',
    content: "Just finished an intensive clinic on third-shot drops. The key is to keep your paddle face open and use your legs for lift, not your wrist. Who's practicing this weekend?",
    image: 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=1200',
    likes: ['player-current', 'u1'],
    comments: [
      {
        id: 'c-1',
        authorName: 'David Smith',
        authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
        content: 'Great tips Coach! My drop has been hitting the tape lately, I will try focusing on the legs.',
        timestamp: new Date().toISOString(),
        likes: [],
        replies: []
      }
    ],
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    tags: ['Strategy', 'Coaching']
  },
  {
    id: 'p-2',
    authorId: 'u1',
    authorName: 'David Smith',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    authorRole: 'PLAYER',
    content: "Just hit 5.1 DUPR! The grind is real. Thanks to everyone who pushed me in the last tournament.",
    image: 'https://images.unsplash.com/photo-1511067007398-7e4b90cfa4bc?auto=format&fit=crop&q=80&w=1200',
    likes: ['player-current', 'u2', 'u3'],
    comments: [],
    timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    tags: ['DUPR', 'Milestone']
  }
];

export const INITIAL_TOURNAMENTS: Tournament[] = [
  {
    id: 't-1',
    name: 'Metro Manila Open 2025',
    date: '2025-11-15',
    location: 'Riverside Elite Courts',
    prizePool: '₱500,000',
    status: 'UPCOMING',
    skillLevel: '4.0 - 5.5',
    maxPlayers: 64,
    registeredCount: 42,
    image: 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=800'
  }
];

export const INITIAL_APPLICATIONS: ProfessionalApplication[] = [];
