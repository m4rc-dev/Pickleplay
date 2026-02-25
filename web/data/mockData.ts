
import { Court, ProfessionalApplication, SocialPost, SocialComment, Tournament, TournamentRegistration, TournamentRound, TournamentMatch, UserRole } from '../types';

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
  // ── UPCOMING ────────────────────────────────────────────────────────────────
  {
    id: 't-1',
    name: 'Metro Manila Open 2026',
    date: '2026-03-15',
    location: 'Riverside Elite Courts, Pasig City',
    prizePool: '₱500,000',
    status: 'UPCOMING',
    skillLevel: '4.0 - 5.5',
    maxPlayers: 64,
    registeredCount: 42,
    organizerId: 'court-owner-1',
    courtId: '1',
    description: 'The biggest annual open pickleball tournament in Metro Manila. Featuring elite players from across the Philippines competing in singles and doubles.',
    format: 'single_elim',
    eventType: 'singles',
    category: 'advanced',
    startTime: '2026-03-15T08:00:00',
    checkInTime: '2026-03-15T07:00:00',
    registrationDeadline: '2026-03-10T23:59:00',
    numCourts: 8,
    isApproved: true,
    isFeatured: true,
    rules: 'Standard USA Pickleball rules apply. Best of 3 games to 11, win by 2. Finals best of 5.',
    prizes: '1st: ₱250,000 | 2nd: ₱150,000 | 3rd: ₱50,000 each',
    announcement: 'Registration closes March 10! Slots filling up fast.',
    registrationMode: 'player',
    image: 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=800',
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 't-2',
    name: 'BGC Doubles Classic',
    date: '2026-04-05',
    location: 'BGC Premium Courts, Bonifacio Global City',
    prizePool: '₱200,000',
    status: 'UPCOMING',
    skillLevel: '3.5 - 4.5',
    maxPlayers: 32,
    registeredCount: 18,
    organizerId: 'court-owner-1',
    courtId: '5',
    description: 'Doubles-only tournament at the premium BGC courts. Great prizes and a festive atmosphere. Bring your partner and compete in the heart of BGC!',
    format: 'double_elim',
    eventType: 'doubles',
    category: 'intermediate',
    startTime: '2026-04-05T09:00:00',
    checkInTime: '2026-04-05T08:00:00',
    registrationDeadline: '2026-04-01T23:59:00',
    numCourts: 6,
    isApproved: true,
    isFeatured: false,
    rules: 'USA Pickleball rally scoring. Games to 15, win by 2. Round robin pool play then single elimination.',
    prizes: '1st pair: ₱100,000 | 2nd pair: ₱60,000 | 3rd pair: ₱20,000 each',
    registrationMode: 'both',
    image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=800',
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 't-3',
    name: 'Beginners Bash – Spring Edition',
    date: '2026-03-28',
    location: 'West Garden Courts, City Sports Hub',
    prizePool: '₱30,000',
    status: 'UPCOMING',
    skillLevel: 'Beginner (2.5 - 3.5)',
    maxPlayers: 24,
    registeredCount: 10,
    organizerId: 'court-owner-2',
    courtId: '3',
    description: 'A welcoming tournament for new and developing players. No pressure, all fun! Round-robin format ensures everyone plays multiple matches.',
    format: 'round_robin',
    eventType: 'mixed_doubles',
    category: 'beginner',
    startTime: '2026-03-28T10:00:00',
    checkInTime: '2026-03-28T09:00:00',
    registrationDeadline: '2026-03-25T23:59:00',
    numCourts: 3,
    isApproved: true,
    isFeatured: false,
    rules: 'Rally scoring, games to 11. Friendly play encouraged. Referees provided.',
    prizes: '1st: ₱15,000 | 2nd: ₱10,000 | 3rd: ₱5,000',
    registrationMode: 'player',
    image: 'https://images.unsplash.com/photo-1511067007398-7e4b90cfa4bc?auto=format&fit=crop&q=80&w=800',
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 't-4',
    name: 'Cebu Island Cup 2026',
    date: '2026-05-20',
    location: 'Cebu Sports Complex, Cebu City',
    prizePool: '₱350,000',
    status: 'UPCOMING',
    skillLevel: '3.5 - 5.0',
    maxPlayers: 48,
    registeredCount: 5,
    organizerId: 'court-owner-3',
    description: 'The premier pickleball event in the Visayas region. Open to all skill levels 3.5+. Travel and accommodation packages available for out-of-town participants.',
    format: 'single_elim',
    eventType: 'singles',
    category: 'open',
    startTime: '2026-05-20T08:00:00',
    checkInTime: '2026-05-20T07:00:00',
    registrationDeadline: '2026-05-15T23:59:00',
    numCourts: 6,
    isApproved: true,
    isFeatured: true,
    rules: 'USA Pickleball rules. Single elimination with consolation bracket. Games to 11.',
    prizes: '1st: ₱175,000 | 2nd: ₱100,000 | 3rd-4th: ₱37,500 each',
    registrationMode: 'player',
    image: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&q=80&w=800',
    createdAt: '2026-02-05T10:00:00Z',
  },
  {
    id: 't-5',
    name: 'Mixed Doubles Fiesta',
    date: '2026-04-19',
    location: 'Pasay Bay Courts, Pasay City',
    prizePool: '₱80,000',
    status: 'UPCOMING',
    skillLevel: '3.0 - 4.5',
    maxPlayers: 32,
    registeredCount: 20,
    organizerId: 'court-owner-1',
    courtId: '6',
    description: 'Celebrate the sport with mixed doubles action! Partners are randomly drawn for the round-robin phase. Bring your best game with anyone beside you.',
    format: 'round_robin',
    eventType: 'mixed_doubles',
    category: 'intermediate',
    startTime: '2026-04-19T09:00:00',
    checkInTime: '2026-04-19T08:00:00',
    registrationDeadline: '2026-04-15T23:59:00',
    numCourts: 4,
    isApproved: true,
    isFeatured: false,
    rules: 'Partners randomly drawn before tournament. Round robin then top-4 playoff. Rally scoring to 15.',
    prizes: '1st pair: ₱40,000 | 2nd pair: ₱25,000 | 3rd pair: ₱15,000',
    registrationMode: 'player',
    image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=800',
    createdAt: '2026-02-10T10:00:00Z',
  },

  // ── LIVE ────────────────────────────────────────────────────────────────────
  {
    id: 't-6',
    name: 'Davao Dink Masters',
    date: '2026-02-22',
    location: 'Davao Sports Dome, Davao City',
    prizePool: '₱150,000',
    status: 'LIVE',
    skillLevel: '4.0 - 5.0',
    maxPlayers: 32,
    registeredCount: 32,
    organizerId: 'court-owner-3',
    description: 'Currently LIVE! Watch the best Mindanao players battle it out in this single-elimination dink masters event. Spectators welcome.',
    format: 'single_elim',
    eventType: 'singles',
    category: 'advanced',
    startTime: '2026-02-22T08:00:00',
    checkInTime: '2026-02-22T07:00:00',
    registrationDeadline: '2026-02-20T23:59:00',
    numCourts: 4,
    isApproved: true,
    isFeatured: true,
    rules: 'USA Pickleball standard rules. Single elimination. Games to 11, finals to 15.',
    prizes: '1st: ₱75,000 | 2nd: ₱45,000 | 3rd-4th: ₱15,000 each',
    registrationMode: 'player',
    image: 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=800',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 't-7',
    name: 'Quezon City Smash Series – Round 3',
    date: '2026-02-22',
    location: 'QC Memorial Circle Sports Complex',
    prizePool: '₱60,000',
    status: 'LIVE',
    skillLevel: '3.0 - 4.0',
    maxPlayers: 24,
    registeredCount: 24,
    organizerId: 'court-owner-2',
    description: 'Round 3 of the QC Smash Series is underway! Pool play finals happening now. Come support your local players.',
    format: 'round_robin',
    eventType: 'doubles',
    category: 'intermediate',
    startTime: '2026-02-22T09:00:00',
    checkInTime: '2026-02-22T08:30:00',
    registrationDeadline: '2026-02-21T18:00:00',
    numCourts: 3,
    isApproved: true,
    isFeatured: false,
    rules: 'Rally scoring to 15. Round robin with top 4 proceeding to playoffs.',
    prizes: '1st: ₱30,000 | 2nd: ₱18,000 | 3rd: ₱12,000',
    registrationMode: 'both',
    image: 'https://images.unsplash.com/photo-1511067007398-7e4b90cfa4bc?auto=format&fit=crop&q=80&w=800',
    createdAt: '2026-01-25T10:00:00Z',
  },

  // ── COMPLETED ───────────────────────────────────────────────────────────────
  {
    id: 't-8',
    name: 'New Year Invitational 2026',
    date: '2026-01-10',
    location: 'Riverside Elite Courts, Pasig City',
    prizePool: '₱120,000',
    status: 'COMPLETED',
    skillLevel: '4.0+',
    maxPlayers: 16,
    registeredCount: 16,
    organizerId: 'court-owner-1',
    courtId: '1',
    description: 'The kickoff tournament of 2026 saw elite players compete in this exclusive invitational format. All 16 spots were invitation-only.',
    format: 'single_elim',
    eventType: 'singles',
    category: 'advanced',
    startTime: '2026-01-10T08:00:00',
    checkInTime: '2026-01-10T07:00:00',
    registrationDeadline: '2026-01-08T23:59:00',
    numCourts: 4,
    isApproved: true,
    isFeatured: false,
    prizes: '1st: ₱60,000 | 2nd: ₱36,000 | 3rd-4th: ₱12,000 each',
    registrationMode: 'player',
    image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=800',
    createdAt: '2025-12-01T10:00:00Z',
  },
  {
    id: 't-9',
    name: 'Metro Manila Open 2025',
    date: '2025-11-15',
    location: 'Riverside Elite Courts, Pasig City',
    prizePool: '₱500,000',
    status: 'COMPLETED',
    skillLevel: '4.0 - 5.5',
    maxPlayers: 64,
    registeredCount: 64,
    organizerId: 'court-owner-1',
    courtId: '1',
    description: 'The biggest pickleball event of 2025 is now history. Congratulations to all participants! Final standings have been published.',
    format: 'single_elim',
    eventType: 'singles',
    category: 'advanced',
    startTime: '2025-11-15T08:00:00',
    checkInTime: '2025-11-15T07:00:00',
    registrationDeadline: '2025-11-10T23:59:00',
    numCourts: 8,
    isApproved: true,
    isFeatured: false,
    prizes: '1st: ₱250,000 | 2nd: ₱150,000 | 3rd: ₱50,000 each',
    registrationMode: 'player',
    image: 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=800',
    createdAt: '2025-09-01T10:00:00Z',
  },
  {
    id: 't-10',
    name: 'Holiday Doubles Showdown',
    date: '2025-12-20',
    location: 'BGC Premium Courts, Bonifacio Global City',
    prizePool: '₱90,000',
    status: 'COMPLETED',
    skillLevel: '3.5 - 4.5',
    maxPlayers: 32,
    registeredCount: 30,
    organizerId: 'court-owner-1',
    courtId: '5',
    description: 'A festive holiday doubles tournament that brought out the Christmas spirit with competitive pickleball action.',
    format: 'double_elim',
    eventType: 'doubles',
    category: 'intermediate',
    startTime: '2025-12-20T09:00:00',
    checkInTime: '2025-12-20T08:00:00',
    registrationDeadline: '2025-12-18T23:59:00',
    numCourts: 6,
    isApproved: true,
    isFeatured: false,
    prizes: '1st pair: ₱45,000 | 2nd pair: ₱27,000 | 3rd pair: ₱18,000',
    registrationMode: 'both',
    image: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&q=80&w=800',
    createdAt: '2025-11-01T10:00:00Z',
  },
  {
    id: 't-11',
    name: 'Cebu Beginner Open – Sept 2025',
    date: '2025-09-14',
    location: 'Cebu Sports Complex, Cebu City',
    prizePool: '₱25,000',
    status: 'COMPLETED',
    skillLevel: 'Beginner (2.5 - 3.5)',
    maxPlayers: 20,
    registeredCount: 18,
    organizerId: 'court-owner-3',
    description: 'A great introductory tournament for new players in Cebu. All 18 participants gained valuable match experience.',
    format: 'round_robin',
    eventType: 'mixed_doubles',
    category: 'beginner',
    startTime: '2025-09-14T10:00:00',
    checkInTime: '2025-09-14T09:00:00',
    registrationDeadline: '2025-09-12T23:59:00',
    numCourts: 3,
    isApproved: true,
    isFeatured: false,
    prizes: '1st: ₱12,500 | 2nd: ₱8,000 | 3rd: ₱4,500',
    registrationMode: 'player',
    image: 'https://images.unsplash.com/photo-1511067007398-7e4b90cfa4bc?auto=format&fit=crop&q=80&w=800',
    createdAt: '2025-08-01T10:00:00Z',
  },

  // ── CANCELLED ───────────────────────────────────────────────────────────────
  {
    id: 't-12',
    name: 'Typhoon Relief Charity Tournament',
    date: '2025-10-25',
    location: 'Metro Dink Hub, Downtown Manila',
    prizePool: '₱50,000 donated to charity',
    status: 'CANCELLED',
    skillLevel: 'All Levels',
    maxPlayers: 40,
    registeredCount: 22,
    organizerId: 'court-owner-2',
    courtId: '4',
    description: 'Cancelled due to Typhoon Carina. All registration fees have been refunded. We will reschedule this event in Q1 2026.',
    format: 'round_robin',
    eventType: 'doubles',
    category: 'open',
    startTime: '2025-10-25T09:00:00',
    checkInTime: '2025-10-25T08:00:00',
    registrationDeadline: '2025-10-22T23:59:00',
    numCourts: 5,
    isApproved: true,
    isFeatured: false,
    announcement: 'EVENT CANCELLED: Due to severe weather. Full refunds issued within 3-5 business days.',
    registrationMode: 'player',
    image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=800',
    createdAt: '2025-09-15T10:00:00Z',
  },
];

// Mock registrations for t-1 (includes pending, confirmed, waitlisted)
export const MOCK_REGISTRATIONS: TournamentRegistration[] = [
  { id: 'reg-1', tournamentId: 't-1', playerId: 'u1', status: 'confirmed', registeredAt: '2026-01-15T10:00:00Z', player: { id: 'u1', full_name: 'David Smith', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David' } },
  { id: 'reg-2', tournamentId: 't-1', playerId: 'u3', status: 'confirmed', registeredAt: '2026-01-18T10:00:00Z', player: { id: 'u3', full_name: 'Elena Rodriguez', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena' } },
  { id: 'reg-3', tournamentId: 't-1', playerId: 'player-current', status: 'pending', registeredAt: '2026-02-01T10:00:00Z', player: { id: 'player-current', full_name: 'John Player', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John' } },
  { id: 'reg-4', tournamentId: 't-6', playerId: 'u1', status: 'confirmed', registeredAt: '2026-02-10T10:00:00Z', player: { id: 'u1', full_name: 'David Smith', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David' } },
  { id: 'reg-5', tournamentId: 't-6', playerId: 'player-current', status: 'confirmed', registeredAt: '2026-02-10T12:00:00Z', player: { id: 'player-current', full_name: 'John Player', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John' } },
];

export const INITIAL_APPLICATIONS: ProfessionalApplication[] = [];

// ════════════════════════════════════════════════════════════════
// MOCK BRACKET DATA
// ════════════════════════════════════════════════════════════════
//
// Two pre-built brackets:
//   • t-8  – "New Year Invitational 2026" (COMPLETED, 16 players, single-elim)
//   • t-6  – "Davao Dink Masters"         (LIVE,      8-player QF onwards, single-elim)

// ── Extra players used only in bracket mock data ─────────────────
export const MOCK_BRACKET_PLAYERS: Record<string, { id: string; name: string; avatar: string }> = {
  'mp-5':  { id: 'mp-5',  name: 'Carlos Reyes',    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos' },
  'mp-6':  { id: 'mp-6',  name: 'Sofia Lim',       avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia' },
  'mp-7':  { id: 'mp-7',  name: 'Ramon Torres',    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ramon' },
  'mp-8':  { id: 'mp-8',  name: 'Jasmine Uy',      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasmine' },
  'mp-9':  { id: 'mp-9',  name: 'Andrei Cruz',     avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Andrei' },
  'mp-10': { id: 'mp-10', name: 'Nadia Santos',    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nadia' },
  'mp-11': { id: 'mp-11', name: 'Jerome Tan',      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jerome' },
  'mp-12': { id: 'mp-12', name: 'Bianca Flores',   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bianca' },
  'mp-13': { id: 'mp-13', name: 'Miguel Ocampo',   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Miguel' },
  'mp-14': { id: 'mp-14', name: 'Patricia Gomez',  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Patricia' },
  'mp-15': { id: 'mp-15', name: 'Ivan Villanueva', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ivan' },
  'mp-16': { id: 'mp-16', name: 'Grace Aquino',    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Grace' },
  // t-6 extras
  'mp-17': { id: 'mp-17', name: 'Kevin dela Paz',  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kevin' },
  'mp-18': { id: 'mp-18', name: 'Liza Mercado',    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Liza' },
  'mp-19': { id: 'mp-19', name: 'Renz Bautista',   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Renz' },
  'mp-20': { id: 'mp-20', name: 'Carmela Dizon',   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carmela' },
};

// Convenience: all bracket-visible player name/avatar maps (combines MOCK_USERS + MOCK_BRACKET_PLAYERS)
export function getMockParticipantInfo(id: string): { id: string; name: string; avatar?: string } {
  if (id === 'u1')             return { id, name: 'David Smith',    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David' };
  if (id === 'u2')             return { id, name: 'Marcus Chen',    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus&mood[]=sad' };
  if (id === 'u3')             return { id, name: 'Elena Rodriguez',avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena' };
  if (id === 'player-current') return { id, name: 'John Player',    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John' };
  const p = MOCK_BRACKET_PLAYERS[id];
  return p ? { id, name: p.name, avatar: p.avatar } : { id, name: 'Unknown Player' };
}

// ────────────────────────────────────────────────────────────────
// t-8: New Year Invitational 2026
//      COMPLETED · 16 players · single-elim · 4 rounds
//
// Bracket seed order:
//   [1] u1 (David Smith)         vs  [16] mp-5
//   [2] mp-6                     vs  [15] mp-7
//   [3] u3 (Elena Rodriguez)     vs  [14] mp-8
//   [4] mp-9                     vs  [13] mp-10
//   [5] player-current           vs  [12] mp-11
//   [6] mp-12                    vs  [11] mp-13
//   [7] u2 (Marcus Chen)         vs  [10] mp-14
//   [8] mp-15                    vs   [9] mp-16
//
// Results: David Smith wins; Marcus Chen runner-up
// ────────────────────────────────────────────────────────────────

export const MOCK_ROUNDS_T8: TournamentRound[] = [
  {
    id: 'r-t8-1', tournamentId: 't-8', roundNumber: 1, roundName: 'Round of 16',
    createdAt: '2026-01-10T07:00:00Z',
  },
  {
    id: 'r-t8-2', tournamentId: 't-8', roundNumber: 2, roundName: 'Quarterfinal',
    createdAt: '2026-01-10T07:00:00Z',
  },
  {
    id: 'r-t8-3', tournamentId: 't-8', roundNumber: 3, roundName: 'Semifinal',
    createdAt: '2026-01-10T07:00:00Z',
  },
  {
    id: 'r-t8-4', tournamentId: 't-8', roundNumber: 4, roundName: 'Final',
    createdAt: '2026-01-10T07:00:00Z',
  },
];

export const MOCK_MATCHES_T8: TournamentMatch[] = [
  // ── Round of 16 ─────────────────────────────────────────────
  {
    id: 'm-t8-r1-1', tournamentId: 't-8', roundId: 'r-t8-1', matchNumber: 1, courtNumber: 1,
    participantAId: 'u1',   participantBId: 'mp-5',
    participantA:   getMockParticipantInfo('u1'),   participantB: getMockParticipantInfo('mp-5'),
    scoreA: 11, scoreB: 7, winnerId: 'u1',
    matchTime: '2026-01-10T08:00:00Z', status: 'completed',
  },
  {
    id: 'm-t8-r1-2', tournamentId: 't-8', roundId: 'r-t8-1', matchNumber: 2, courtNumber: 2,
    participantAId: 'mp-6', participantBId: 'mp-7',
    participantA:   getMockParticipantInfo('mp-6'), participantB: getMockParticipantInfo('mp-7'),
    scoreA: 11, scoreB: 8, winnerId: 'mp-6',
    matchTime: '2026-01-10T08:00:00Z', status: 'completed',
  },
  {
    id: 'm-t8-r1-3', tournamentId: 't-8', roundId: 'r-t8-1', matchNumber: 3, courtNumber: 3,
    participantAId: 'u3',   participantBId: 'mp-8',
    participantA:   getMockParticipantInfo('u3'),   participantB: getMockParticipantInfo('mp-8'),
    scoreA: 11, scoreB: 9, winnerId: 'u3',
    matchTime: '2026-01-10T08:00:00Z', status: 'completed',
  },
  {
    id: 'm-t8-r1-4', tournamentId: 't-8', roundId: 'r-t8-1', matchNumber: 4, courtNumber: 4,
    participantAId: 'mp-9', participantBId: 'mp-10',
    participantA:   getMockParticipantInfo('mp-9'), participantB: getMockParticipantInfo('mp-10'),
    scoreA: 11, scoreB: 6, winnerId: 'mp-9',
    matchTime: '2026-01-10T08:00:00Z', status: 'completed',
  },
  {
    id: 'm-t8-r1-5', tournamentId: 't-8', roundId: 'r-t8-1', matchNumber: 5, courtNumber: 1,
    participantAId: 'player-current', participantBId: 'mp-11',
    participantA:   getMockParticipantInfo('player-current'), participantB: getMockParticipantInfo('mp-11'),
    scoreA: 11, scoreB: 8, winnerId: 'player-current',
    matchTime: '2026-01-10T08:45:00Z', status: 'completed',
  },
  {
    id: 'm-t8-r1-6', tournamentId: 't-8', roundId: 'r-t8-1', matchNumber: 6, courtNumber: 2,
    participantAId: 'mp-12', participantBId: 'mp-13',
    participantA:   getMockParticipantInfo('mp-12'), participantB: getMockParticipantInfo('mp-13'),
    scoreA: 11, scoreB: 5, winnerId: 'mp-12',
    matchTime: '2026-01-10T08:45:00Z', status: 'completed',
  },
  {
    id: 'm-t8-r1-7', tournamentId: 't-8', roundId: 'r-t8-1', matchNumber: 7, courtNumber: 3,
    participantAId: 'u2',   participantBId: 'mp-14',
    participantA:   getMockParticipantInfo('u2'),   participantB: getMockParticipantInfo('mp-14'),
    scoreA: 11, scoreB: 3, winnerId: 'u2',
    matchTime: '2026-01-10T08:45:00Z', status: 'completed',
  },
  {
    id: 'm-t8-r1-8', tournamentId: 't-8', roundId: 'r-t8-1', matchNumber: 8, courtNumber: 4,
    participantAId: 'mp-15', participantBId: 'mp-16',
    participantA:   getMockParticipantInfo('mp-15'), participantB: getMockParticipantInfo('mp-16'),
    scoreA: 11, scoreB: 9, winnerId: 'mp-15',
    matchTime: '2026-01-10T08:45:00Z', status: 'completed',
  },

  // ── Quarterfinal ────────────────────────────────────────────
  {
    id: 'm-t8-r2-1', tournamentId: 't-8', roundId: 'r-t8-2', matchNumber: 1, courtNumber: 1,
    participantAId: 'u1',   participantBId: 'mp-6',
    participantA:   getMockParticipantInfo('u1'),   participantB: getMockParticipantInfo('mp-6'),
    scoreA: 11, scoreB: 5, winnerId: 'u1',
    matchTime: '2026-01-10T10:00:00Z', status: 'completed',
  },
  {
    id: 'm-t8-r2-2', tournamentId: 't-8', roundId: 'r-t8-2', matchNumber: 2, courtNumber: 2,
    participantAId: 'u3',   participantBId: 'mp-9',
    participantA:   getMockParticipantInfo('u3'),   participantB: getMockParticipantInfo('mp-9'),
    scoreA: 11, scoreB: 8, winnerId: 'u3',
    matchTime: '2026-01-10T10:00:00Z', status: 'completed',
  },
  {
    id: 'm-t8-r2-3', tournamentId: 't-8', roundId: 'r-t8-2', matchNumber: 3, courtNumber: 3,
    participantAId: 'player-current', participantBId: 'mp-12',
    participantA:   getMockParticipantInfo('player-current'), participantB: getMockParticipantInfo('mp-12'),
    scoreA: 11, scoreB: 7, winnerId: 'player-current',
    matchTime: '2026-01-10T10:00:00Z', status: 'completed',
  },
  {
    id: 'm-t8-r2-4', tournamentId: 't-8', roundId: 'r-t8-2', matchNumber: 4, courtNumber: 4,
    participantAId: 'u2',   participantBId: 'mp-15',
    participantA:   getMockParticipantInfo('u2'),   participantB: getMockParticipantInfo('mp-15'),
    scoreA: 11, scoreB: 6, winnerId: 'u2',
    matchTime: '2026-01-10T10:00:00Z', status: 'completed',
  },

  // ── Semifinal ───────────────────────────────────────────────
  {
    id: 'm-t8-r3-1', tournamentId: 't-8', roundId: 'r-t8-3', matchNumber: 1, courtNumber: 1,
    participantAId: 'u1',             participantBId: 'u3',
    participantA:   getMockParticipantInfo('u1'),             participantB: getMockParticipantInfo('u3'),
    scoreA: 11, scoreB: 8, winnerId: 'u1',
    matchTime: '2026-01-10T12:00:00Z', status: 'completed',
    notes: 'Close match – both dropped serve twice in a tiebreaker.',
  },
  {
    id: 'm-t8-r3-2', tournamentId: 't-8', roundId: 'r-t8-3', matchNumber: 2, courtNumber: 2,
    participantAId: 'player-current', participantBId: 'u2',
    participantA:   getMockParticipantInfo('player-current'), participantB: getMockParticipantInfo('u2'),
    scoreA: 9, scoreB: 11, winnerId: 'u2',
    matchTime: '2026-01-10T12:00:00Z', status: 'completed',
    notes: 'Marcus edged John in the final two points with back-to-back winners.',
  },

  // ── Final ───────────────────────────────────────────────────
  {
    id: 'm-t8-r4-1', tournamentId: 't-8', roundId: 'r-t8-4', matchNumber: 1, courtNumber: 1,
    participantAId: 'u1', participantBId: 'u2',
    participantA:   getMockParticipantInfo('u1'), participantB: getMockParticipantInfo('u2'),
    scoreA: 11, scoreB: 8, winnerId: 'u1',
    matchTime: '2026-01-10T14:00:00Z', status: 'completed',
    notes: '🏆 David Smith wins the New Year Invitational 2026! Outstanding performance throughout.',
  },
];

// Attach matches to their rounds (convenient for TournamentBracket component)
export const MOCK_ROUNDS_T8_WITH_MATCHES: TournamentRound[] = MOCK_ROUNDS_T8.map(r => ({
  ...r,
  matches: MOCK_MATCHES_T8.filter(m => m.roundId === r.id),
}));

// ────────────────────────────────────────────────────────────────
// t-6: Davao Dink Masters
//      LIVE · 8 remaining competitors (QF onwards) · single-elim
//      – R1 (QF) 2 completed / 2 live, R2 (SF) scheduled, R3 (Final) scheduled
// ────────────────────────────────────────────────────────────────

export const MOCK_ROUNDS_T6: TournamentRound[] = [
  {
    id: 'r-t6-1', tournamentId: 't-6', roundNumber: 1, roundName: 'Quarterfinal',
    createdAt: '2026-02-22T07:00:00Z',
  },
  {
    id: 'r-t6-2', tournamentId: 't-6', roundNumber: 2, roundName: 'Semifinal',
    createdAt: '2026-02-22T07:00:00Z',
  },
  {
    id: 'r-t6-3', tournamentId: 't-6', roundNumber: 3, roundName: 'Final',
    createdAt: '2026-02-22T07:00:00Z',
  },
];

export const MOCK_MATCHES_T6: TournamentMatch[] = [
  // ── Quarterfinal ────────────────────────────────────────────
  {
    id: 'm-t6-r1-1', tournamentId: 't-6', roundId: 'r-t6-1', matchNumber: 1, courtNumber: 1,
    participantAId: 'u1',    participantBId: 'mp-17',
    participantA:   getMockParticipantInfo('u1'),    participantB: getMockParticipantInfo('mp-17'),
    scoreA: 11, scoreB: 9, winnerId: 'u1',
    matchTime: '2026-02-22T09:00:00Z', status: 'completed',
  },
  {
    id: 'm-t6-r1-2', tournamentId: 't-6', roundId: 'r-t6-1', matchNumber: 2, courtNumber: 2,
    participantAId: 'mp-18', participantBId: 'mp-19',
    participantA:   getMockParticipantInfo('mp-18'), participantB: getMockParticipantInfo('mp-19'),
    scoreA: 11, scoreB: 7, winnerId: 'mp-18',
    matchTime: '2026-02-22T09:00:00Z', status: 'completed',
  },
  {
    id: 'm-t6-r1-3', tournamentId: 't-6', roundId: 'r-t6-1', matchNumber: 3, courtNumber: 3,
    participantAId: 'u2',    participantBId: 'mp-20',
    participantA:   getMockParticipantInfo('u2'),    participantB: getMockParticipantInfo('mp-20'),
    scoreA: 6,  scoreB: 7,  // IN PROGRESS – live score
    matchTime: '2026-02-22T10:30:00Z', status: 'live',
  },
  {
    id: 'm-t6-r1-4', tournamentId: 't-6', roundId: 'r-t6-1', matchNumber: 4, courtNumber: 4,
    participantAId: 'u3',    participantBId: 'mp-15',
    participantA:   getMockParticipantInfo('u3'),    participantB: getMockParticipantInfo('mp-15'),
    matchTime: '2026-02-22T10:30:00Z', status: 'live',
    scoreA: 4,  scoreB: 3,
  },

  // ── Semifinal (scheduled) ───────────────────────────────────
  {
    id: 'm-t6-r2-1', tournamentId: 't-6', roundId: 'r-t6-2', matchNumber: 1, courtNumber: 1,
    participantAId: 'u1',    // Only left slot filled (winner of QF M1)
    participantA:   getMockParticipantInfo('u1'),
    matchTime: '2026-02-22T13:00:00Z', status: 'scheduled',
  },
  {
    id: 'm-t6-r2-2', tournamentId: 't-6', roundId: 'r-t6-2', matchNumber: 2, courtNumber: 2,
    matchTime: '2026-02-22T13:00:00Z', status: 'scheduled',
  },

  // ── Final (scheduled) ────────────────────────────────────────
  {
    id: 'm-t6-r3-1', tournamentId: 't-6', roundId: 'r-t6-3', matchNumber: 1, courtNumber: 1,
    matchTime: '2026-02-22T15:30:00Z', status: 'scheduled',
  },
];

export const MOCK_ROUNDS_T6_WITH_MATCHES: TournamentRound[] = MOCK_ROUNDS_T6.map(r => ({
  ...r,
  matches: MOCK_MATCHES_T6.filter(m => m.roundId === r.id),
}));

// ── Convenience lookup for any tournament ───────────────────────
export const MOCK_BRACKETS: Record<string, TournamentRound[]> = {
  't-8': MOCK_ROUNDS_T8_WITH_MATCHES,
  't-6': MOCK_ROUNDS_T6_WITH_MATCHES,
};
