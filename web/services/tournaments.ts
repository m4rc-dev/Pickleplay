import { supabase } from './supabase';
import type {
  Tournament,
  TournamentTeam,
  TournamentRound,
  TournamentMatch,
  TournamentRegistration,
  TournamentFormat,
  TournamentEventType,
  TournamentCategory,
  TournamentStatus,
  SquadRequirements,
  TournamentMode,
  RegistrationMode,
  RosterLockTiming,
  SquadRegistration,
  TournamentRosterPlayer,
  MatchLineup,
  SubstitutionLog,
  RosterPlayerStatus,
  SquadRegStatus,
} from '../types';
import type { Squad } from './squads';

// ════════════════════════════════════════════════════════════════
// DB → TS mappers
// ════════════════════════════════════════════════════════════════

export function mapTournament(t: any): Tournament {
  return {
    id: t.id,
    name: t.name,
    date: t.date,
    location: t.location,
    prizePool: t.prize_pool ?? '',
    status: t.status as TournamentStatus,
    skillLevel: t.skill_level ?? '',
    maxPlayers: t.max_players ?? 0,
    registeredCount: t.registered_count ?? 0,
    image: t.image_url,
    organizerId: t.organizer_id ?? t.owner_id,
    courtId: t.court_id,
    locationId: t.location_id,
    description: t.description,
    format: t.format as TournamentFormat | undefined,
    eventType: t.event_type as TournamentEventType | undefined,
    category: t.category as TournamentCategory | undefined,
    startTime: t.start_time,
    checkInTime: t.check_in_time,
    registrationDeadline: t.registration_deadline,
    numCourts: t.num_courts,
    isApproved: t.is_approved,
    isFeatured: t.is_featured,
    rules: t.rules,
    prizes: t.prizes,
    sponsorBannerUrl: t.sponsor_banner_url,
    announcement: t.announcement,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    registrationMode: t.registration_mode,
    squadRequirements: t.squad_requirements || undefined,
    allowSoloFallback: t.allow_solo_fallback,
    tournamentMode: t.tournament_mode || 'casual',
    rosterLockTiming: t.roster_lock_timing || 'bracket_generated',
  };
}

function mapRound(r: any): TournamentRound {
  return {
    id: r.id,
    tournamentId: r.tournament_id,
    roundNumber: r.round_number,
    roundName: r.round_name,
    createdAt: r.created_at,
    matches: r.tournament_matches?.map(mapMatch),
  };
}

function mapMatch(m: any): TournamentMatch {
  return {
    id: m.id,
    tournamentId: m.tournament_id,
    roundId: m.round_id,
    matchNumber: m.match_number,
    courtNumber: m.court_number,
    participantAId: m.participant_a_id,
    participantBId: m.participant_b_id,
    scoreA: m.score_a,
    scoreB: m.score_b,
    winnerId: m.winner_id,
    matchTime: m.match_time,
    status: m.status,
    notes: m.notes,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  };
}

function mapRegistration(r: any): TournamentRegistration {
  return {
    id: r.id,
    tournamentId: r.tournament_id,
    playerId: r.player_id,
    teamId: r.team_id,
    checkedIn: r.checked_in,
    status: r.status,
    registeredAt: r.registered_at ?? r.created_at,
    player: r.profiles
      ? { id: r.profiles.id, full_name: r.profiles.full_name, avatar_url: r.profiles.avatar_url }
      : undefined,
  };
}

function mapTeam(t: any): TournamentTeam {
  return {
    id: t.id,
    tournamentId: t.tournament_id,
    player1Id: t.player1_id,
    player2Id: t.player2_id,
    teamName: t.team_name,
    seed: t.seed,
    registeredAt: t.registered_at,
  };
}


// ════════════════════════════════════════════════════════════════
// CRUD — Tournaments
// ════════════════════════════════════════════════════════════════

export interface FetchTournamentsFilters {
  status?: TournamentStatus;
  category?: TournamentCategory;
  organizerId?: string;
  approvedOnly?: boolean;
  featuredOnly?: boolean;
}

export async function fetchTournaments(filters?: FetchTournamentsFilters): Promise<Tournament[]> {
  let q = supabase.from('tournaments').select('*').order('date', { ascending: true });

  if (filters?.status) q = q.eq('status', filters.status);
  if (filters?.category) q = q.eq('category', filters.category);
  if (filters?.organizerId) q = q.or(`organizer_id.eq.${filters.organizerId},owner_id.eq.${filters.organizerId}`);
  if (filters?.approvedOnly) q = q.eq('is_approved', true);
  if (filters?.featuredOnly) q = q.eq('is_featured', true);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapTournament);
}

export async function fetchTournamentById(id: string): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data ? mapTournament(data) : null;
}

export interface CreateTournamentInput {
  name: string;
  date: string;
  location: string;
  prizePool?: string;
  skillLevel?: string;
  maxPlayers: number;
  description?: string;
  format?: TournamentFormat;
  eventType?: TournamentEventType;
  category?: TournamentCategory;
  startTime?: string;
  checkInTime?: string;
  registrationDeadline?: string;
  numCourts?: number;
  rules?: string;
  prizes?: string;
  courtId?: string;
  locationId?: string;
  sponsorBannerUrl?: string;
  imageFile?: File;
  // Tournament mode & registration
  tournamentMode?: TournamentMode;
  registrationMode?: RegistrationMode;
  rosterLockTiming?: RosterLockTiming;
  squadRequirements?: import('../types').SquadRequirements;
  /** @deprecated */
  allowSoloFallback?: boolean;
}

export async function createTournament(input: CreateTournamentInput): Promise<Tournament> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let imageUrl = '';
  if (input.imageFile) {
    imageUrl = await uploadTournamentPoster(input.imageFile);
  }

  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      owner_id: user.id,
      organizer_id: user.id,
      name: input.name,
      date: input.date,
      location: input.location,
      prize_pool: input.prizePool || '',
      skill_level: input.skillLevel || 'All Levels',
      max_players: input.maxPlayers,
      image_url: imageUrl,
      status: 'UPCOMING',
      description: input.description,
      format: input.format || 'single_elim',
      event_type: input.eventType || 'singles',
      category: input.category || 'open',
      start_time: input.startTime,
      check_in_time: input.checkInTime,
      registration_deadline: input.registrationDeadline,
      num_courts: input.numCourts || 1,
      rules: input.rules,
      prizes: input.prizes,
      court_id: input.courtId,
      location_id: input.locationId,
      sponsor_banner_url: input.sponsorBannerUrl,
      registration_mode: input.registrationMode || 'individual',
      squad_requirements: input.squadRequirements || null,
      allow_solo_fallback: input.allowSoloFallback ?? false,
      tournament_mode: input.tournamentMode || 'casual',
      roster_lock_timing: input.rosterLockTiming || 'bracket_generated',
      // set pending by default; admins will approve
      is_approved: null,
      is_featured: false,
    })
    .select()
    .single();

  if (error) throw error;
  return mapTournament(data);
}

/** Clear the registration deadline so registration is open indefinitely. */
export async function openTournamentRegistration(id: string): Promise<Tournament> {
  const { data, error } = await supabase
    .from('tournaments')
    .update({ registration_deadline: null })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapTournament(data);
}

export async function updateTournament(id: string, updates: Partial<CreateTournamentInput>): Promise<Tournament> {
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.date !== undefined) payload.date = updates.date;
  if (updates.location !== undefined) payload.location = updates.location;
  if (updates.prizePool !== undefined) payload.prize_pool = updates.prizePool;
  if (updates.skillLevel !== undefined) payload.skill_level = updates.skillLevel;
  if (updates.maxPlayers !== undefined) payload.max_players = updates.maxPlayers;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.format !== undefined) payload.format = updates.format;
  if (updates.eventType !== undefined) payload.event_type = updates.eventType;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.startTime !== undefined) payload.start_time = updates.startTime;
  if (updates.checkInTime !== undefined) payload.check_in_time = updates.checkInTime;
  if (updates.registrationDeadline !== undefined) payload.registration_deadline = updates.registrationDeadline;
  if (updates.numCourts !== undefined) payload.num_courts = updates.numCourts;
  if (updates.rules !== undefined) payload.rules = updates.rules;
  if (updates.prizes !== undefined) payload.prizes = updates.prizes;
  if (updates.courtId !== undefined) payload.court_id = updates.courtId;
  if (updates.locationId !== undefined) payload.location_id = updates.locationId;
  if (updates.sponsorBannerUrl !== undefined) payload.sponsor_banner_url = updates.sponsorBannerUrl;
  if (updates.registrationMode !== undefined) payload.registration_mode = updates.registrationMode;
  if (updates.squadRequirements !== undefined) payload.squad_requirements = updates.squadRequirements;
  if (updates.allowSoloFallback !== undefined) payload.allow_solo_fallback = updates.allowSoloFallback;
  if (updates.tournamentMode !== undefined) payload.tournament_mode = updates.tournamentMode;
  if (updates.rosterLockTiming !== undefined) payload.roster_lock_timing = updates.rosterLockTiming;

  if (updates.imageFile) {
    payload.image_url = await uploadTournamentPoster(updates.imageFile);
  }

  const { data, error } = await supabase
    .from('tournaments')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapTournament(data);
}

export async function deleteTournament(id: string): Promise<void> {
  const { error } = await supabase.from('tournaments').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadTournamentPoster(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const ext = file.name.split('.').pop();
  const path = `posters/${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('tournaments').upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from('tournaments').getPublicUrl(path);
  return data.publicUrl;
}


// ════════════════════════════════════════════════════════════════
// Admin actions
// ════════════════════════════════════════════════════════════════

export async function approveTournament(id: string): Promise<void> {
  const { error } = await supabase
    .from('tournaments')
    .update({ is_approved: true })
    .eq('id', id);
  if (error) throw error;
}

export async function rejectTournament(id: string): Promise<void> {
  const { error } = await supabase
    .from('tournaments')
    .update({ is_approved: false, status: 'CANCELLED' })
    .eq('id', id);
  if (error) throw error;
}

export async function featureTournament(id: string, featured: boolean): Promise<void> {
  const { error } = await supabase
    .from('tournaments')
    .update({ is_featured: featured })
    .eq('id', id);
  if (error) throw error;
}

export async function updateTournamentStatus(id: string, status: TournamentStatus): Promise<void> {
  const { error } = await supabase
    .from('tournaments')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function postAnnouncement(id: string, message: string): Promise<void> {
  const { error } = await supabase
    .from('tournaments')
    .update({ announcement: message })
    .eq('id', id);
  if (error) throw error;
}


// ════════════════════════════════════════════════════════════════
// Registrations
// ════════════════════════════════════════════════════════════════

export async function fetchRegistrations(tournamentId: string): Promise<TournamentRegistration[]> {
  console.log('[Service] fetchRegistrations (confirmed only):', { tournamentId });
  const { data, error } = await supabase
    .from('tournament_registrations')
    .select('*, profiles:player_id(id, full_name, avatar_url)')
    .eq('tournament_id', tournamentId)
    .eq('status', 'confirmed')
    .order('registered_at', { ascending: true });

  if (error) {
    console.error('[Service] fetchRegistrations error:', error);
    throw error;
  }
  console.log('[Service] fetchRegistrations result:', data?.length, 'confirmed registrations');
  return (data ?? []).map(mapRegistration);
}

export async function registerPlayer(
  tournamentId: string, 
  playerId: string,
  applicationMessage?: string
): Promise<void> {
  console.log('[Service] registerPlayer:', { tournamentId, playerId, applicationMessage });

  // Guardrails: ensure tournament is accepting registrations
  const tournament = await fetchTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  if (tournament.status !== 'UPCOMING') {
    throw new Error('Registration is closed');
  }

  if (tournament.registrationDeadline && new Date() > new Date(tournament.registrationDeadline)) {
    throw new Error('Registration deadline has passed');
  }

  if ((tournament.registeredCount ?? 0) >= (tournament.maxPlayers ?? Number.MAX_SAFE_INTEGER)) {
    throw new Error('Tournament is full');
  }

  // Optional: call conflict checker (DB RPC). Errors block, warnings allowed.
  try {
    const conflicts = await checkRegistrationConflicts(tournamentId, playerId);
    const errorConflict = conflicts?.find(c => c.severity === 'error');
    if (errorConflict) {
      throw new Error(errorConflict.message || 'Unable to register');
    }
  } catch (e) {
    // If RPC is unavailable, proceed without blocking here; UI already guards
    if (e instanceof Error && e.message) throw e;
  }
  const { error } = await supabase
    .from('tournament_registrations')
    .upsert(
      { 
        tournament_id: tournamentId, 
        player_id: playerId, 
        status: 'pending',
        registered_at: new Date().toISOString(),
        approved_by: null,
        approved_at: null,
        application_message: applicationMessage || null
      },
      { 
        onConflict: 'tournament_id,player_id',
        ignoreDuplicates: false 
      }
    );
  if (error) {
    console.error('[Service] registerPlayer error:', error);
    throw error;
  }
  console.log('[Service] registerPlayer success');
}

export async function withdrawRegistration(tournamentId: string, playerId: string): Promise<void> {
  const { error } = await supabase
    .from('tournament_registrations')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('player_id', playerId);
  if (error) throw error;
}

export async function getPlayerRegistration(
  tournamentId: string,
  playerId: string
): Promise<TournamentRegistration | null> {
  const { data, error } = await supabase
    .from('tournament_registrations')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRegistration(data) : null;
}

export async function approveRegistration(
  tournamentId: string,
  playerId: string,
  organizerId: string
): Promise<void> {
  console.log('[Service] approveRegistration:', { tournamentId, playerId, organizerId });
  const { error } = await supabase
    .from('tournament_registrations')
    .update({
      status: 'confirmed',
      approved_by: organizerId,
      approved_at: new Date().toISOString()
    })
    .eq('tournament_id', tournamentId)
    .eq('player_id', playerId);
  
  if (error) {
    console.error('[Service] approveRegistration error:', error);
    throw error;
  }
  console.log('[Service] approveRegistration success');
}

export async function rejectRegistration(
  tournamentId: string,
  playerId: string,
  organizerId: string
): Promise<void> {
  console.log('[Service] rejectRegistration:', { tournamentId, playerId, organizerId });
  const { error } = await supabase
    .from('tournament_registrations')
    .update({
      status: 'rejected',
      approved_by: organizerId,
      approved_at: new Date().toISOString()
    })
    .eq('tournament_id', tournamentId)
    .eq('player_id', playerId);
  
  if (error) {
    console.error('[Service] rejectRegistration error:', error);
    throw error;
  }
  console.log('[Service] rejectRegistration success');
}

export async function getPendingRegistrations(tournamentId: string): Promise<TournamentRegistration[]> {
  console.log('[Service] getPendingRegistrations:', { tournamentId });
  const { data, error } = await supabase
    .from('tournament_registrations')
    .select(`
      *,
      player:profiles!tournament_registrations_player_id_fkey(
        id,
        username,
        full_name,
        avatar_url,
        rating
      )
    `)
    .eq('tournament_id', tournamentId)
    .eq('status', 'pending')
    .order('registered_at', { ascending: true });

  if (error) {
    console.error('[Service] getPendingRegistrations error:', error);
    throw error;
  }
  console.log('[Service] getPendingRegistrations result:', data?.length, 'records');
  return (data ?? []).map(mapRegistration);
}

// ════════════════════════════════════════════════════════════════
// Conflict Detection & Verification
// ════════════════════════════════════════════════════════════════

export interface TournamentConflict {
  type: 'verification' | 'time_conflict' | 'pending_limit' | 'capacity';
  severity: 'error' | 'warning';
  field?: string;
  count?: number;
  limit?: number;
  message: string;
}

export interface VerificationStatus {
  email_verified: boolean;
  phone_verified: boolean;
  id_verified: boolean;
  skill_verified: boolean;
  verification_level: 'basic' | 'standard' | 'full';
}

export async function checkRegistrationConflicts(
  tournamentId: string,
  playerId: string
): Promise<TournamentConflict[]> {
  console.log('[Service] checkRegistrationConflicts:', { tournamentId, playerId });
  
  const { data, error } = await supabase.rpc('check_tournament_conflicts', {
    p_player_id: playerId,
    p_tournament_id: tournamentId
  });

  if (error) {
    console.error('[Service] checkRegistrationConflicts error:', error);
    throw error;
  }

  const conflicts = (data as TournamentConflict[]) || [];
  console.log('[Service] checkRegistrationConflicts result:', conflicts.length, 'conflicts');
  return conflicts;
}

export async function getPlayerVerificationStatus(playerId: string): Promise<VerificationStatus> {
  console.log('[Service] getPlayerVerificationStatus:', { playerId });
  
  const { data, error } = await supabase.rpc('get_player_verification_status', {
    p_player_id: playerId
  });

  if (error) {
    console.error('[Service] getPlayerVerificationStatus error:', error);
    throw error;
  }

  return data as VerificationStatus;
}

// ════════════════════════════════════════════════════════════════
// Player Approval Details
// ════════════════════════════════════════════════════════════════

export interface PlayerVerification {
  emailVerified: boolean;
  phoneVerified: boolean;
  idVerified: boolean;
  skillVerified: boolean;
}

export interface PlayerSocialProof {
  endorsements: number;
  reviewCount: number;
  avgRating: number;
}

export interface TournamentHistoryItem {
  id: string;
  name: string;
  start_date: string;
  status: string;
  registered_at: string;
}

export interface PlayerApprovalDetails {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  skillRating: number;
  duprRating: number | null;
  dateOfBirth: string | null;
  gender: string | null;
  playingSince: string | null;
  memberSince: string;
  tournamentsPlayed: number;
  tournamentsWon: number;
  matchesWon: number;
  matchesLost: number;
  winRate: number;
  noShowCount: number;
  lateCancelCount: number;
  recentLateCancels: number;
  verification: PlayerVerification;
  socialProof: PlayerSocialProof;
  tournamentHistory: TournamentHistoryItem[];
}

export interface ApprovalRecommendation {
  action: 'approve' | 'review' | 'reject';
  confidence: 'high' | 'medium' | 'low';
  score: number;
  reasons: string[];
}

export interface PendingRegistrationDetailed {
  id: string;
  tournamentId: string;
  playerId: string;
  status: string;
  registeredAt: string;
  applicationMessage: string | null;
  player: PlayerApprovalDetails;
  recommendation?: ApprovalRecommendation;
}

// Helper to build a minimal PlayerApprovalDetails when columns are unavailable
function buildMinimalPlayerDetails(p: any, playerId: string): PlayerApprovalDetails {
  return {
    id: p.id ?? playerId,
    username: p.username ?? '',
    fullName: p.full_name ?? '',
    avatarUrl: p.avatar_url ?? null,
    skillRating: p.rating ?? 0,
    duprRating: p.dupr_rating ?? null,
    dateOfBirth: p.date_of_birth ?? null,
    gender: p.gender ?? null,
    playingSince: p.playing_since ?? null,
    memberSince: p.created_at ?? new Date().toISOString(),
    tournamentsPlayed: p.tournaments_played ?? 0,
    tournamentsWon: p.tournaments_won ?? 0,
    matchesWon: p.matches_won ?? 0,
    matchesLost: p.matches_lost ?? 0,
    winRate: (p.matches_won ?? 0) + (p.matches_lost ?? 0) > 0
      ? Math.round(((p.matches_won ?? 0) / ((p.matches_won ?? 0) + (p.matches_lost ?? 0))) * 100)
      : 0,
    noShowCount: p.no_show_count ?? 0,
    lateCancelCount: p.late_cancel_count ?? 0,
    recentLateCancels: 0,
    verification: {
      emailVerified: false,
      phoneVerified: p.phone_verified ?? false,
      idVerified: p.id_verified ?? false,
      skillVerified: p.skill_verified ?? false,
    },
    socialProof: {
      endorsements: p.player_endorsements ?? 0,
      reviewCount: p.player_review_count ?? 0,
      avgRating: p.player_avg_rating ?? 0,
    },
    tournamentHistory: [],
  };
}

export async function getPendingRegistrationsDetailed(
  tournamentId: string
): Promise<PendingRegistrationDetailed[]> {
  console.log('[Service] getPendingRegistrationsDetailed:', { tournamentId });
  
  // Try the rich RPC function first (requires migration 071)
  const { data, error } = await supabase.rpc('get_pending_registrations_detailed', {
    p_tournament_id: tournamentId
  });

  if (!error && data) {
    const registrations = (data as PendingRegistrationDetailed[]) || [];
    console.log('[Service] getPendingRegistrationsDetailed (RPC) result:', registrations.length, 'records');
    return registrations;
  }

  // Fallback: basic query if migration 071 not yet applied
  console.warn('[Service] RPC not available, falling back to basic query. Apply migration 071 for full player details.');
  
  // Build the most complete profile select we can, with graceful degradation
  const { data: fallbackData, error: fallbackError } = await supabase
    .from('tournament_registrations')
    .select(`
      id,
      tournament_id,
      player_id,
      status,
      registered_at,
      created_at,
      application_message,
      profiles!tournament_registrations_player_id_fkey(
        id,
        username,
        full_name,
        avatar_url,
        rating,
        phone_verified,
        id_verified,
        skill_verified,
        tournaments_played,
        tournaments_won,
        matches_won,
        matches_lost,
        no_show_count,
        late_cancel_count,
        player_endorsements,
        player_review_count,
        player_avg_rating,
        playing_since,
        date_of_birth,
        gender,
        dupr_rating,
        created_at
      )
    `)
    .eq('tournament_id', tournamentId)
    .eq('status', 'pending')
    .order('registered_at', { ascending: true });

  if (fallbackError) {
    // If columns don't exist (migration 071 not applied), try minimal fallback
    console.warn('[Service] Full profile columns not available, trying minimal fallback:', fallbackError.message);
    const { data: minimalData, error: minimalError } = await supabase
      .from('tournament_registrations')
      .select(`
        id,
        tournament_id,
        player_id,
        status,
        registered_at,
        created_at,
        profiles!tournament_registrations_player_id_fkey(
          id,
          username,
          full_name,
          avatar_url,
          rating
        )
      `)
      .eq('tournament_id', tournamentId)
      .eq('status', 'pending')
      .order('registered_at', { ascending: true });

    if (minimalError) {
      console.error('[Service] getPendingRegistrationsDetailed minimal fallback error:', minimalError);
      throw minimalError;
    }

    return (minimalData ?? []).map((row: any): PendingRegistrationDetailed => {
      const p = row.profiles || {};
      return {
        id: row.id,
        tournamentId: row.tournament_id,
        playerId: row.player_id,
        status: row.status,
        registeredAt: row.registered_at ?? row.created_at,
        applicationMessage: null,
        player: buildMinimalPlayerDetails(p, row.player_id),
      };
    });
  }

  // Map fallback data to PendingRegistrationDetailed shape
  return (fallbackData ?? []).map((row: any): PendingRegistrationDetailed => ({
    id: row.id,
    tournamentId: row.tournament_id,
    playerId: row.player_id,
    status: row.status,
    registeredAt: row.registered_at ?? row.created_at,
    applicationMessage: row.application_message ?? null,
    player: buildMinimalPlayerDetails(row.profiles || {}, row.player_id),
  }));
}

export async function getApprovalRecommendation(
  playerId: string,
  tournamentId: string,
  playerData?: PlayerApprovalDetails
): Promise<ApprovalRecommendation> {
  console.log('[Service] getApprovalRecommendation:', { playerId, tournamentId });
  
  // Try RPC first (requires migration 071)
  const { data, error } = await supabase.rpc('get_approval_recommendation', {
    p_player_id: playerId,
    p_tournament_id: tournamentId
  });

  if (!error && data) {
    return data as ApprovalRecommendation;
  }

  // Fallback: compute recommendation client-side from player data
  console.warn('[Service] get_approval_recommendation RPC not available, using client-side scoring.');
  
  const p = playerData;
  if (!p) {
    return { action: 'review', confidence: 'low', score: 50, reasons: ['Insufficient data to assess'] };
  }

  let score = 50;
  const reasons: string[] = [];

  if (p.verification.emailVerified) score += 10;
  if (p.verification.phoneVerified) { score += 15; reasons.push('✓ Phone verified'); }
  if (p.verification.idVerified) { score += 20; reasons.push('✓ ID verified'); }
  if (p.verification.skillVerified) { score += 15; reasons.push('✓ Skill verified'); }

  if (p.tournamentsPlayed > 10) { score += 15; reasons.push(`✓ Very experienced (${p.tournamentsPlayed} tournaments)`); }
  else if (p.tournamentsPlayed > 5) { score += 10; reasons.push('✓ Experienced player'); }
  else if (p.tournamentsPlayed === 0) { reasons.push('○ New to tournaments'); }

  if (p.winRate >= 70) { score += 15; reasons.push(`✓ Strong win rate (${p.winRate}%)`); }
  else if (p.winRate >= 50) score += 5;

  if (p.tournamentsWon > 0) { score += 10; reasons.push('✓ Has tournament wins'); }
  if (p.socialProof.avgRating >= 4.5) { score += 15; reasons.push('✓ Highly rated by players'); }
  else if (p.socialProof.avgRating >= 4.0) score += 8;
  if (p.socialProof.endorsements >= 10) { score += 10; reasons.push('✓ Well-endorsed by community'); }

  if (p.noShowCount > 2) { score -= 40; reasons.push(`⚠️ Multiple no-shows (${p.noShowCount})`); }
  else if (p.noShowCount > 0) { score -= 25; reasons.push(`⚠️ Has ${p.noShowCount} no-show(s)`); }

  if (p.recentLateCancels > 2) { score -= 30; reasons.push(`⚠️ ${p.recentLateCancels} late cancellations recently`); }
  else if (p.recentLateCancels > 0) { score -= 15; reasons.push('○ Recent late cancellation'); }

  if (!p.verification.emailVerified) { score -= 25; reasons.push('⚠️ Email not verified'); }

  let action: 'approve' | 'review' | 'reject';
  let confidence: 'high' | 'medium' | 'low';

  if (score >= 80) { action = 'approve'; confidence = 'high'; }
  else if (score >= 60) { action = 'approve'; confidence = 'medium'; }
  else if (score >= 40) { action = 'review'; confidence = 'medium'; }
  else if (score >= 25) { action = 'review'; confidence = 'low'; }
  else { action = 'reject'; confidence = 'high'; }

  return { action, confidence, score, reasons };
}

export async function getPlayerApprovalDetails(playerId: string): Promise<PlayerApprovalDetails> {
  console.log('[Service] getPlayerApprovalDetails:', { playerId });
  
  const { data, error } = await supabase.rpc('get_player_approval_details', {
    p_player_id: playerId
  });

  if (error) {
    console.error('[Service] getPlayerApprovalDetails error:', error);
    throw error;
  }

  return data as PlayerApprovalDetails;
}

// Squad eligibility helper
export function evaluateSquadEligibility(
  requirements: SquadRequirements | undefined,
  squad: Pick<Squad, 'members_count' | 'avg_rating' | 'name'>
): { eligible: boolean; reasons: string[] } {
  if (!requirements) return { eligible: true, reasons: [] };
  const reasons: string[] = [];

  if (requirements.minSize && squad.members_count < requirements.minSize) {
    reasons.push(`Needs at least ${requirements.minSize} members (has ${squad.members_count})`);
  }

  if (requirements.ratingMin !== undefined && squad.avg_rating !== null && squad.avg_rating !== undefined) {
    if (squad.avg_rating < requirements.ratingMin) {
      reasons.push(`Rating too low (avg ${squad.avg_rating.toFixed(1)} < ${requirements.ratingMin})`);
    }
  }

  if (requirements.ratingMax !== undefined && squad.avg_rating !== null && squad.avg_rating !== undefined) {
    if (squad.avg_rating > requirements.ratingMax) {
      reasons.push(`Rating too high (avg ${squad.avg_rating.toFixed(1)} > ${requirements.ratingMax})`);
    }
  }

  // Regions and membership are not yet on squad records; leave as informational when present in requirements
  if (requirements.regions && requirements.regions.length > 0) {
    reasons.push('Region eligibility not enforced yet');
  }
  if (requirements.membership && requirements.membership !== 'any') {
    reasons.push('Membership eligibility not enforced yet');
  }

  return { eligible: reasons.length === 0, reasons };
}


// ════════════════════════════════════════════════════════════════
// Teams
// ════════════════════════════════════════════════════════════════

export async function fetchTeams(tournamentId: string): Promise<TournamentTeam[]> {
  const { data, error } = await supabase
    .from('tournament_teams')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('registered_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapTeam);
}

export async function registerTeam(
  tournamentId: string,
  player1Id: string,
  player2Id?: string,
  teamName?: string
): Promise<TournamentTeam> {
  const { data, error } = await supabase
    .from('tournament_teams')
    .insert({
      tournament_id: tournamentId,
      player1_id: player1Id,
      player2_id: player2Id,
      team_name: teamName,
    })
    .select()
    .single();

  if (error) throw error;
  return mapTeam(data);
}


// ════════════════════════════════════════════════════════════════
// Rounds & Matches
// ════════════════════════════════════════════════════════════════

export async function fetchRounds(tournamentId: string): Promise<TournamentRound[]> {
  const { data, error } = await supabase
    .from('tournament_rounds')
    .select('*, tournament_matches(*)')
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapRound);
}

export async function fetchMatches(tournamentId: string): Promise<TournamentMatch[]> {
  const { data, error } = await supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('match_number', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapMatch);
}

export async function submitMatchScore(
  matchId: string,
  scoreA: number,
  scoreB: number,
  winnerId: string
): Promise<void> {
  // 1. Fetch current match to know tournament, round, and match number
  const { data: match, error: matchErr } = await supabase
    .from('tournament_matches')
    .select('tournament_id, round_id, match_number')
    .eq('id', matchId)
    .single();

  if (matchErr) throw matchErr;

  // 2. Write result
  const { error } = await supabase
    .from('tournament_matches')
    .update({
      score_a: scoreA,
      score_b: scoreB,
      winner_id: winnerId,
      status: 'completed',
    })
    .eq('id', matchId);

  if (error) throw error;

  // 3. Advance winner to next round (single/double-elim)
  //    Next round is the one with round_number = current + 1 in the same tournament.
  //    Next match slot = ceil(matchNumber / 2); odd = slot A, even = slot B.
  try {
    const { data: currentRound } = await supabase
      .from('tournament_rounds')
      .select('round_number')
      .eq('id', match.round_id)
      .single();

    if (!currentRound) return;

    const { data: nextRound } = await supabase
      .from('tournament_rounds')
      .select('id')
      .eq('tournament_id', match.tournament_id)
      .eq('round_number', currentRound.round_number + 1)
      .maybeSingle();

    if (!nextRound) return; // already the final round

    const nextMatchNumber = Math.ceil(match.match_number / 2);
    const slotField = match.match_number % 2 === 1 ? 'participant_a_id' : 'participant_b_id';

    await supabase
      .from('tournament_matches')
      .update({ [slotField]: winnerId })
      .eq('round_id', nextRound.id)
      .eq('match_number', nextMatchNumber);
  } catch (advanceErr) {
    // Non-fatal — DB trigger may already handle this; log and continue
    console.warn('[Service] submitMatchScore: winner advancement skipped:', advanceErr);
  }
}

export async function rescheduleMatch(matchId: string, newTime: string): Promise<void> {
  const { error } = await supabase
    .from('tournament_matches')
    .update({ match_time: newTime })
    .eq('id', matchId);

  if (error) throw error;
}

export async function reassignMatchCourt(matchId: string, courtNumber: number): Promise<void> {
  const { error } = await supabase
    .from('tournament_matches')
    .update({ court_number: courtNumber })
    .eq('id', matchId);

  if (error) throw error;
}


// ════════════════════════════════════════════════════════════════
// Bracket generation (client-side)
// ════════════════════════════════════════════════════════════════

export async function generateBracket(tournamentId: string, orderedParticipantIds?: string[]): Promise<void> {
  const tournament = await fetchTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const registrations = await fetchRegistrations(tournamentId);
  const confirmed = registrations.filter(r => r.status === 'confirmed');

  if (confirmed.length < 2) throw new Error('Need at least 2 confirmed participants to generate a bracket');

  // ── Wipe any existing bracket data first ──────────────────────
  await supabase.from('tournament_matches').delete().eq('tournament_id', tournamentId);
  await supabase.from('tournament_rounds').delete().eq('tournament_id', tournamentId);

  let participants: string[];
  if (orderedParticipantIds && orderedParticipantIds.length >= 2) {
    // Use custom seeding order (only include confirmed participant IDs)
    const confirmedSet = new Set(confirmed.map(r => r.playerId));
    participants = orderedParticipantIds.filter(id => confirmedSet.has(id));
    // Append any confirmed players not in the custom order
    confirmed.map(r => r.playerId).forEach(id => { if (!participants.includes(id)) participants.push(id); });
  } else {
    // Random shuffle
    participants = confirmed.map(r => r.playerId);
    for (let i = participants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [participants[i], participants[j]] = [participants[j], participants[i]];
    }
  }

  const format = tournament.format || 'single_elim';
  const numCourts = tournament.numCourts || 1;

  if (format === 'single_elim') {
    await generateSingleElimBracket(tournamentId, participants, numCourts, tournament.date, tournament.startTime);
  } else if (format === 'round_robin') {
    await generateRoundRobinBracket(tournamentId, participants, numCourts, tournament.date, tournament.startTime);
  } else if (format === 'double_elim') {
    await generateDoubleElimBracket(tournamentId, participants, numCourts, tournament.date, tournament.startTime);
  }

  // Update tournament status
  await updateTournamentStatus(tournamentId, 'UPCOMING');
}


// ── Single Elimination ──────────────────────────────────────────

async function generateSingleElimBracket(
  tournamentId: string,
  participants: string[],
  numCourts: number,
  tournamentDate: string,
  startTime?: string
): Promise<void> {
  const n = participants.length;
  const totalRounds = Math.ceil(Math.log2(n));
  const bracketSize = Math.pow(2, totalRounds);

  // Create round names
  const roundNames: string[] = [];
  for (let r = 1; r <= totalRounds; r++) {
    const remaining = bracketSize / Math.pow(2, r - 1);
    if (remaining === 2) roundNames.push('Final');
    else if (remaining === 4) roundNames.push('Semifinal');
    else if (remaining === 8) roundNames.push('Quarterfinal');
    else roundNames.push(`Round of ${remaining}`);
  }

  // Insert rounds
  const roundInserts = roundNames.map((name, i) => ({
    tournament_id: tournamentId,
    round_number: i + 1,
    round_name: name,
  }));

  const { data: rounds, error: roundErr } = await supabase
    .from('tournament_rounds')
    .insert(roundInserts)
    .select();

  if (roundErr) throw roundErr;
  if (!rounds) throw new Error('Failed to create rounds');

  const sortedRounds = rounds.sort((a: any, b: any) => a.round_number - b.round_number);

  // Build first-round matches
  const firstRound = sortedRounds[0];
  const matchesInFirstRound = bracketSize / 2;
  const dateOnly = (tournamentDate || '').split('T')[0];
  const baseTime = new Date(`${dateOnly}T${startTime || '08:00'}`);
  const matchInserts: any[] = [];

  for (let m = 0; m < matchesInFirstRound; m++) {
    const pA = m < participants.length ? participants[m * 2] : undefined;
    const pB = m * 2 + 1 < participants.length ? participants[m * 2 + 1] : undefined;
    const isBye = !pA || !pB;

    const matchTime = new Date(baseTime);
    matchTime.setMinutes(matchTime.getMinutes() + Math.floor(m / numCourts) * 45);

    matchInserts.push({
      tournament_id: tournamentId,
      round_id: firstRound.id,
      match_number: m + 1,
      court_number: (m % numCourts) + 1,
      participant_a_id: pA || null,
      participant_b_id: pB || null,
      match_time: matchTime.toISOString(),
      status: isBye ? 'bye' : 'scheduled',
      // If bye, auto-set winner
      winner_id: isBye ? (pA || pB || null) : null,
    });
  }

  // Insert subsequent round matches (empty, to be filled by trigger)
  for (let r = 1; r < sortedRounds.length; r++) {
    const matchesInRound = bracketSize / Math.pow(2, r + 1);
    for (let m = 0; m < matchesInRound; m++) {
      const matchTime = new Date(baseTime);
      matchTime.setMinutes(matchTime.getMinutes() + (r * matchesInFirstRound + m) * 45 / numCourts);

      matchInserts.push({
        tournament_id: tournamentId,
        round_id: sortedRounds[r].id,
        match_number: m + 1,
        court_number: (m % numCourts) + 1,
        participant_a_id: null,
        participant_b_id: null,
        match_time: matchTime.toISOString(),
        status: 'scheduled',
      });
    }
  }

  const { error: matchErr } = await supabase
    .from('tournament_matches')
    .insert(matchInserts);

  if (matchErr) throw matchErr;

  // Process byes: for each bye match, trigger winner advancement manually
  // The DB trigger handles this on UPDATE, but byes are inserted already completed
  // We need to update the bye matches to trigger the advancement
  const byeMatches = matchInserts.filter(m => m.status === 'bye' && m.winner_id);
  for (const bye of byeMatches) {
    // The trigger fires on UPDATE when status changes to 'completed'
    // Since we inserted as 'bye', manually advance
    const nextMatchNumber = Math.ceil(bye.match_number / 2);
    const isSlotA = bye.match_number % 2 === 1;
    const nextRound = sortedRounds[1]; // second round

    if (nextRound) {
      const updateField = isSlotA ? 'participant_a_id' : 'participant_b_id';
      await supabase
        .from('tournament_matches')
        .update({ [updateField]: bye.winner_id })
        .eq('round_id', nextRound.id)
        .eq('match_number', nextMatchNumber);
    }
  }
}


// ── Round Robin ─────────────────────────────────────────────────

async function generateRoundRobinBracket(
  tournamentId: string,
  participants: string[],
  numCourts: number,
  tournamentDate: string,
  startTime?: string
): Promise<void> {
  const n = participants.length;
  // If odd number, add a "bye" placeholder
  const players = [...participants];
  if (n % 2 !== 0) players.push('BYE');

  const numPlayers = players.length;
  const numRounds = numPlayers - 1;
  const matchesPerRound = numPlayers / 2;

  // Insert rounds
  const roundInserts = [];
  for (let r = 0; r < numRounds; r++) {
    roundInserts.push({
      tournament_id: tournamentId,
      round_number: r + 1,
      round_name: `Round ${r + 1}`,
    });
  }

  const { data: rounds, error: roundErr } = await supabase
    .from('tournament_rounds')
    .insert(roundInserts)
    .select();

  if (roundErr) throw roundErr;
  if (!rounds) throw new Error('Failed to create rounds');

  const sortedRounds = rounds.sort((a: any, b: any) => a.round_number - b.round_number);

  // Generate round-robin schedule using the circle method
  const dateOnly = (tournamentDate || '').split('T')[0];
  const baseTime = new Date(`${dateOnly}T${startTime || '08:00'}`);
  const matchInserts: any[] = [];
  let globalMatchNum = 0;

  const fixed = players[0];
  const rotating = players.slice(1);

  for (let r = 0; r < numRounds; r++) {
    const roundPlayers = [fixed, ...rotating];

    for (let m = 0; m < matchesPerRound; m++) {
      const pA = roundPlayers[m];
      const pB = roundPlayers[numPlayers - 1 - m];
      const isBye = pA === 'BYE' || pB === 'BYE';

      const matchTime = new Date(baseTime);
      matchTime.setMinutes(matchTime.getMinutes() + (r * matchesPerRound + m) * 45 / numCourts);

      globalMatchNum++;
      matchInserts.push({
        tournament_id: tournamentId,
        round_id: sortedRounds[r].id,
        match_number: globalMatchNum,
        court_number: (m % numCourts) + 1,
        participant_a_id: isBye ? null : pA,
        participant_b_id: isBye ? null : pB,
        match_time: matchTime.toISOString(),
        status: isBye ? 'bye' : 'scheduled',
        winner_id: isBye ? (pA === 'BYE' ? pB : pA) : null,
      });
    }

    // Rotate: move last element to front of rotating array
    rotating.unshift(rotating.pop()!);
  }

  const { error: matchErr } = await supabase
    .from('tournament_matches')
    .insert(matchInserts);

  if (matchErr) throw matchErr;
}


// ── Double Elimination ─────────────────────────────────────────

async function generateDoubleElimBracket(
  tournamentId: string,
  participants: string[],
  numCourts: number,
  tournamentDate: string,
  startTime?: string
): Promise<void> {
  const n = participants.length;
  const wbRounds = Math.ceil(Math.log2(n));
  const bracketSize = Math.pow(2, wbRounds);
  const lbRounds = 2 * (wbRounds - 1);

  // ── Build round names ──────────────────────────────────────────
  const roundInserts: { tournament_id: string; round_number: number; round_name: string }[] = [];

  // Winners Bracket rounds
  for (let r = 1; r <= wbRounds; r++) {
    const remaining = bracketSize / Math.pow(2, r - 1);
    let name: string;
    if (r === wbRounds) name = 'WB Final';
    else if (r === wbRounds - 1 && wbRounds > 1) name = 'WB Semifinal';
    else if (remaining === 8) name = 'WB Quarterfinal';
    else name = `WB Round ${r}`;
    roundInserts.push({ tournament_id: tournamentId, round_number: r, round_name: name });
  }

  // Losers Bracket rounds
  for (let r = 1; r <= lbRounds; r++) {
    let name: string;
    if (r === lbRounds) name = 'LB Final';
    else if (r === lbRounds - 1 && lbRounds > 1) name = 'LB Semifinal';
    else name = `LB Round ${r}`;
    roundInserts.push({ tournament_id: tournamentId, round_number: wbRounds + r, round_name: name });
  }

  // Grand Finals
  roundInserts.push({ tournament_id: tournamentId, round_number: wbRounds + lbRounds + 1, round_name: 'Grand Finals' });

  const { data: rounds, error: roundErr } = await supabase
    .from('tournament_rounds')
    .insert(roundInserts)
    .select();
  if (roundErr) throw roundErr;
  if (!rounds) throw new Error('Failed to create rounds');

  const sortedRounds = rounds.sort((a: any, b: any) => a.round_number - b.round_number);

  // ── Build match slots ──────────────────────────────────────────
  const dateOnly = (tournamentDate || '').split('T')[0];
  const baseTime = new Date(`${dateOnly}T${startTime || '08:00'}`);
  const matchInserts: any[] = [];
  let slot = 0;

  // WB Round 1 — seeded participants
  const wbR1MatchCount = bracketSize / 2;
  for (let m = 0; m < wbR1MatchCount; m++) {
    const pA = m * 2 < participants.length ? participants[m * 2] : undefined;
    const pB = m * 2 + 1 < participants.length ? participants[m * 2 + 1] : undefined;
    const isBye = !pA || !pB;
    const mt = new Date(baseTime);
    mt.setMinutes(mt.getMinutes() + Math.floor(slot / numCourts) * 45);
    slot++;
    matchInserts.push({
      tournament_id: tournamentId, round_id: sortedRounds[0].id,
      match_number: m + 1, court_number: (m % numCourts) + 1,
      participant_a_id: pA || null, participant_b_id: pB || null,
      match_time: mt.toISOString(),
      status: isBye ? 'bye' : 'scheduled',
      winner_id: isBye ? (pA || pB || null) : null,
    });
  }

  // WB Rounds 2..Final — empty slots
  for (let r = 1; r < wbRounds; r++) {
    const matchCount = bracketSize / Math.pow(2, r + 1);
    for (let m = 0; m < matchCount; m++) {
      const mt = new Date(baseTime);
      mt.setMinutes(mt.getMinutes() + Math.floor(slot / numCourts) * 45);
      slot++;
      matchInserts.push({
        tournament_id: tournamentId, round_id: sortedRounds[r].id,
        match_number: m + 1, court_number: (m % numCourts) + 1,
        participant_a_id: null, participant_b_id: null,
        match_time: mt.toISOString(), status: 'scheduled',
      });
    }
  }

  // LB Rounds — empty slots; match count = 2^(wbRounds-1-ceil(r/2))
  for (let r = 1; r <= lbRounds; r++) {
    const k = Math.ceil(r / 2);
    const matchCount = Math.max(1, Math.pow(2, wbRounds - 1 - k));
    const rnd = sortedRounds[wbRounds - 1 + r];
    for (let m = 0; m < matchCount; m++) {
      const mt = new Date(baseTime);
      mt.setMinutes(mt.getMinutes() + Math.floor(slot / numCourts) * 45);
      slot++;
      matchInserts.push({
        tournament_id: tournamentId, round_id: rnd.id,
        match_number: m + 1, court_number: (m % numCourts) + 1,
        participant_a_id: null, participant_b_id: null,
        match_time: mt.toISOString(), status: 'scheduled',
      });
    }
  }

  // Grand Finals — 1 empty slot
  const gfRound = sortedRounds[wbRounds + lbRounds];
  const gfTime = new Date(baseTime);
  gfTime.setMinutes(gfTime.getMinutes() + Math.floor(slot / numCourts) * 45);
  matchInserts.push({
    tournament_id: tournamentId, round_id: gfRound.id,
    match_number: 1, court_number: 1,
    participant_a_id: null, participant_b_id: null,
    match_time: gfTime.toISOString(), status: 'scheduled',
  });

  const { error: matchErr } = await supabase.from('tournament_matches').insert(matchInserts);
  if (matchErr) throw matchErr;

  // Advance WB R1 bye winners to WB R2
  const byeMatches = matchInserts.filter(m => m.status === 'bye' && m.winner_id && m.round_id === sortedRounds[0].id);
  for (const bye of byeMatches) {
    const nextMatchNumber = Math.ceil(bye.match_number / 2);
    const isSlotA = bye.match_number % 2 === 1;
    const nextRound = sortedRounds[1];
    if (nextRound) {
      await supabase
        .from('tournament_matches')
        .update({ [isSlotA ? 'participant_a_id' : 'participant_b_id']: bye.winner_id })
        .eq('round_id', nextRound.id)
        .eq('match_number', nextMatchNumber);
    }
  }
}


// ════════════════════════════════════════════════════════════════
// Champion & seeding helpers
// ════════════════════════════════════════════════════════════════

/** Fetch the winner of the last (highest round) completed final match */
export async function fetchTournamentChampion(
  tournamentId: string
): Promise<{ id: string; name: string; avatar?: string } | null> {
  const { data: rounds } = await supabase
    .from('tournament_rounds')
    .select('id, round_name, round_number')
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: false })
    .limit(1);
  if (!rounds || rounds.length === 0) return null;

  const { data: match } = await supabase
    .from('tournament_matches')
    .select('winner_id')
    .eq('round_id', rounds[0].id)
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle();
  if (!match?.winner_id) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', match.winner_id)
    .maybeSingle();
  if (!profile) return null;
  return { id: profile.id, name: profile.full_name || 'Unknown', avatar: profile.avatar_url };
}

/** Fetch confirmed participants with their DUPR ratings for manual seeding */
export async function fetchRegistrationsWithRatings(
  tournamentId: string
): Promise<Array<{ playerId: string; name: string; avatar?: string; duprRating: number | null }>> {
  const { data, error } = await supabase
    .from('tournament_registrations')
    .select('player_id, profiles:player_id(id, full_name, avatar_url, dupr_rating)')
    .eq('tournament_id', tournamentId)
    .eq('status', 'confirmed');
  if (error) throw error;
  return (data || []).map((r: any) => ({
    playerId: r.player_id,
    name: r.profiles?.full_name || 'Unknown',
    avatar: r.profiles?.avatar_url ?? undefined,
    duprRating: r.profiles?.dupr_rating ?? null,
  }));
}


// ════════════════════════════════════════════════════════════════
// Participant name resolution
// ════════════════════════════════════════════════════════════════

export async function resolveParticipantNames(
  participantIds: string[]
): Promise<Map<string, { name: string; avatar?: string }>> {
  const uniqueIds = [...new Set(participantIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', uniqueIds);

  const map = new Map<string, { name: string; avatar?: string }>();
  (data ?? []).forEach((p: any) => {
    map.set(p.id, { name: p.full_name || 'Unknown', avatar: p.avatar_url });
  });
  return map;
}


// ════════════════════════════════════════════════════════════════
// Owner / Admin participant management
// ════════════════════════════════════════════════════════════════

/** Toggle check-in status for a single registrant (court owner use) */
export async function checkInParticipant(
  tournamentId: string,
  playerId: string,
  value: boolean
): Promise<void> {
  const { error } = await supabase
    .from('tournament_registrations')
    .update({ checked_in: value })
    .eq('tournament_id', tournamentId)
    .eq('player_id', playerId);
  if (error) throw error;
}

/** Check in ALL registered participants at once */
export async function checkInAll(tournamentId: string): Promise<void> {
  const { error } = await supabase
    .from('tournament_registrations')
    .update({ checked_in: true })
    .eq('tournament_id', tournamentId);
  if (error) throw error;
}

/** Force-remove a participant (owner/admin only) */
export async function removeRegistrantByAdmin(
  tournamentId: string,
  playerId: string
): Promise<void> {
  const { error } = await supabase
    .from('tournament_registrations')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('player_id', playerId);
  if (error) throw error;
}

/** Create a doubles team and link both players' registrations to it */
export async function createTeamByOwner(
  tournamentId: string,
  player1Id: string,
  player2Id: string,
  teamName: string
): Promise<TournamentTeam> {
  // 1. Insert team
  const { data: teamData, error: teamErr } = await supabase
    .from('tournament_teams')
    .insert({
      tournament_id: tournamentId,
      player1_id: player1Id,
      player2_id: player2Id,
      team_name: teamName,
    })
    .select()
    .single();
  if (teamErr) throw teamErr;

  // 2. Link both player registrations to the team
  const { error: linkErr } = await supabase
    .from('tournament_registrations')
    .update({ team_id: teamData.id })
    .eq('tournament_id', tournamentId)
    .in('player_id', [player1Id, player2Id]);
  if (linkErr) throw linkErr;

  return mapTeam(teamData);
}


// ════════════════════════════════════════════════════════════════
// Squad Registration System
// ════════════════════════════════════════════════════════════════

function mapSquadRegistration(r: any): SquadRegistration {
  return {
    id: r.id,
    tournamentId: r.tournament_id,
    squadId: r.squad_id,
    registeredBy: r.registered_by,
    status: r.status,
    rosterLockedAt: r.roster_locked_at,
    registeredAt: r.registered_at,
    approvedBy: r.approved_by,
    approvedAt: r.approved_at,
    applicationMessage: r.application_message,
    squad: r.squad ? {
      id: r.squad.id,
      name: r.squad.name,
      image_url: r.squad.image_url,
      members_count: undefined,
      avg_rating: undefined,
    } : undefined,
    roster: r.tournament_roster?.map(mapRosterPlayer) ?? undefined,
  };
}

function mapRosterPlayer(r: any): TournamentRosterPlayer {
  return {
    id: r.id,
    squadRegistrationId: r.squad_registration_id,
    playerId: r.player_id,
    status: r.status,
    replacedBy: r.replaced_by,
    injuryNote: r.injury_note,
    addedAt: r.added_at,
    player: r.profiles ? {
      id: r.profiles.id,
      full_name: r.profiles.full_name,
      avatar_url: r.profiles.avatar_url,
      rating: r.profiles.rating ?? r.profiles.dupr_rating,
    } : undefined,
  };
}

function mapMatchLineup(l: any): MatchLineup {
  return {
    id: l.id,
    matchId: l.match_id,
    squadRegistrationId: l.squad_registration_id,
    playerId: l.player_id,
    partnerId: l.partner_id,
    teamNumber: l.team_number,
    isBench: l.is_bench,
    confirmedAt: l.confirmed_at,
  };
}

function mapSubstitutionLog(s: any): SubstitutionLog {
  return {
    id: s.id,
    tournamentId: s.tournament_id,
    squadRegistrationId: s.squad_registration_id,
    requestedBy: s.requested_by,
    playerOut: s.player_out,
    playerIn: s.player_in,
    reason: s.reason,
    adminOverride: s.admin_override,
    approvedBy: s.approved_by,
    status: s.status,
    createdAt: s.created_at,
    resolvedAt: s.resolved_at,
  };
}

/**
 * Register a squad for a tournament.
 * Only the squad owner/captain can call this.
 * Validates: roster size, divisibility by teamSize, rating (competitive), no duplicate registrations.
 */
export async function registerSquad(
  tournamentId: string,
  squadId: string,
  ownerId: string,
  rosterPlayerIds: string[],
  applicationMessage?: string
): Promise<SquadRegistration> {
  console.log('[Service] registerSquad:', { tournamentId, squadId, ownerId, rosterCount: rosterPlayerIds.length });

  // 1. Fetch tournament
  const tournament = await fetchTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');
  if (tournament.status !== 'UPCOMING') throw new Error('Registration is closed');
  if (tournament.registrationMode !== 'squad') throw new Error('This tournament does not accept squad registrations');

  if (tournament.registrationDeadline && new Date() > new Date(tournament.registrationDeadline)) {
    throw new Error('Registration deadline has passed');
  }

  // 2. Determine team size from event type
  const teamSize = (tournament.eventType === 'doubles' || tournament.eventType === 'mixed_doubles') ? 2 : 1;

  // 3. Validate roster
  if (rosterPlayerIds.length < 2) {
    throw new Error('Roster must have at least 2 players');
  }
  if (rosterPlayerIds.length % teamSize !== 0) {
    throw new Error(`Roster size (${rosterPlayerIds.length}) must be divisible by team size (${teamSize})`);
  }
  const minSize = tournament.squadRequirements?.minSize ?? 2;
  if (rosterPlayerIds.length < minSize) {
    throw new Error(`Roster needs at least ${minSize} players (has ${rosterPlayerIds.length})`);
  }

  // 4. Check squad ownership
  const { data: memberRole } = await supabase
    .from('squad_members')
    .select('role')
    .eq('squad_id', squadId)
    .eq('user_id', ownerId)
    .single();
  if (!memberRole || memberRole.role !== 'OWNER') {
    throw new Error('Only squad owners can register their squad');
  }

  // 5. Check all roster players are squad members
  const { data: squadMembers } = await supabase
    .from('squad_members')
    .select('user_id')
    .eq('squad_id', squadId);
  const memberIds = new Set((squadMembers ?? []).map((m: any) => m.user_id));
  const nonMembers = rosterPlayerIds.filter(id => !memberIds.has(id));
  if (nonMembers.length > 0) {
    throw new Error(`${nonMembers.length} player(s) are not members of this squad`);
  }

  // 6. Check no duplicate squad registration
  const { data: existing } = await supabase
    .from('squad_registrations')
    .select('id, status')
    .eq('tournament_id', tournamentId)
    .eq('squad_id', squadId)
    .maybeSingle();
  if (existing && existing.status !== 'withdrawn' && existing.status !== 'rejected') {
    throw new Error('This squad is already registered for this tournament');
  }

  // 7. Check players aren't registered with another squad in same tournament
  const { data: otherRegs } = await supabase
    .from('tournament_roster')
    .select('player_id, squad_registration_id, squad_registrations!inner(tournament_id, status)')
    .in('player_id', rosterPlayerIds);
  const conflicting = (otherRegs ?? []).filter((r: any) =>
    r.squad_registrations?.tournament_id === tournamentId &&
    r.squad_registrations?.status !== 'withdrawn' &&
    r.squad_registrations?.status !== 'rejected'
  );
  if (conflicting.length > 0) {
    throw new Error('One or more players are already registered with another squad in this tournament');
  }

  // 8. Rating validation (competitive mode)
  if (tournament.tournamentMode === 'competitive') {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, rating, dupr_rating')
      .in('id', rosterPlayerIds);
    const ratings = (profiles ?? []).map((p: any) => p.rating ?? p.dupr_rating).filter((r: number) => r != null);
    if (ratings.length > 0) {
      const avgRating = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length;
      const req = tournament.squadRequirements;
      if (req?.ratingMin !== undefined && avgRating < req.ratingMin) {
        throw new Error(`Squad average rating (${avgRating.toFixed(1)}) is below minimum (${req.ratingMin})`);
      }
      if (req?.ratingMax !== undefined && avgRating > req.ratingMax) {
        throw new Error(`Squad average rating (${avgRating.toFixed(1)}) exceeds maximum (${req.ratingMax})`);
      }
    }
  }

  // 9. Insert squad_registration
  const { data: regData, error: regErr } = await supabase
    .from('squad_registrations')
    .upsert({
      tournament_id: tournamentId,
      squad_id: squadId,
      registered_by: ownerId,
      status: 'pending',
      application_message: applicationMessage || null,
      registered_at: new Date().toISOString(),
    }, { onConflict: 'tournament_id,squad_id' })
    .select()
    .single();
  if (regErr) throw regErr;

  // 10. Insert roster rows
  const rosterInserts = rosterPlayerIds.map(pid => ({
    squad_registration_id: regData.id,
    player_id: pid,
    status: 'active',
    added_at: new Date().toISOString(),
  }));
  const { error: rosterErr } = await supabase
    .from('tournament_roster')
    .upsert(rosterInserts, { onConflict: 'squad_registration_id,player_id' });
  if (rosterErr) throw rosterErr;

  console.log('[Service] registerSquad success:', regData.id);
  return mapSquadRegistration(regData);
}

/** Enrich roster players with profile data (separate query to avoid nested-join 400 errors) */
async function enrichRosterWithProfiles(
  roster: any[]
): Promise<any[]> {
  if (!roster || roster.length === 0) return roster;
  const playerIds = [...new Set(roster.map((r: any) => r.player_id).filter(Boolean))];
  if (playerIds.length === 0) return roster;
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, rating, dupr_rating')
    .in('id', playerIds);
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  return roster.map((r: any) => ({
    ...r,
    profiles: profileMap.get(r.player_id) ?? null,
  }));
}

/** Fetch all squad registrations for a tournament, with roster and squad names */
export async function getSquadRegistrations(tournamentId: string): Promise<SquadRegistration[]> {
  // Step 1: fetch registrations + squad info + raw roster (no nested profiles join)
  const { data, error } = await supabase
    .from('squad_registrations')
    .select(`
      *,
      squad:squads!squad_registrations_squad_id_fkey(id, name, image_url),
      tournament_roster(*)
    `)
    .eq('tournament_id', tournamentId)
    .order('registered_at', { ascending: true });

  if (error) {
    console.error('[Service] getSquadRegistrations error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      tournamentId,
    });
    throw error;
  }

  // Step 2: enrich each registration's roster with profile data
  const enriched = await Promise.all(
    (data ?? []).map(async (reg: any) => ({
      ...reg,
      tournament_roster: await enrichRosterWithProfiles(reg.tournament_roster ?? []),
    }))
  );
  return enriched.map(mapSquadRegistration);
}

/** Fetch a specific squad's registration for a tournament */
export async function getSquadRegistration(
  tournamentId: string,
  squadId: string
): Promise<SquadRegistration | null> {
  // Step 1: fetch registration + squad info + raw roster (no nested profiles join)
  const { data, error } = await supabase
    .from('squad_registrations')
    .select(`
      *,
      squad:squads!squad_registrations_squad_id_fkey(id, name, image_url),
      tournament_roster(*)
    `)
    .eq('tournament_id', tournamentId)
    .eq('squad_id', squadId)
    .maybeSingle();

  if (error) {
    console.error('[Service] getSquadRegistration error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      tournamentId,
      squadId,
    });
    throw error;
  }
  if (!data) return null;

  // Step 2: enrich roster with profile data
  const enriched = {
    ...data,
    tournament_roster: await enrichRosterWithProfiles(data.tournament_roster ?? []),
  };
  return mapSquadRegistration(enriched);
}

/** Approve a squad registration (organizer only) */
export async function approveSquadRegistration(
  squadRegistrationId: string,
  approvedBy: string
): Promise<void> {
  const { error } = await supabase
    .from('squad_registrations')
    .update({
      status: 'confirmed',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', squadRegistrationId);
  if (error) throw error;
}

/** Reject a squad registration (organizer only) */
export async function rejectSquadRegistration(
  squadRegistrationId: string,
  approvedBy: string
): Promise<void> {
  const { error } = await supabase
    .from('squad_registrations')
    .update({
      status: 'rejected',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', squadRegistrationId);
  if (error) throw error;
}

/** Withdraw a squad registration (captain only) */
export async function withdrawSquadRegistration(
  squadRegistrationId: string
): Promise<void> {
  const { error } = await supabase
    .from('squad_registrations')
    .update({ status: 'withdrawn' })
    .eq('id', squadRegistrationId);
  if (error) throw error;
}

/** Lock roster for a squad registration. Called when bracket is generated. */
export async function lockRoster(squadRegistrationId: string): Promise<void> {
  const { error } = await supabase
    .from('squad_registrations')
    .update({ roster_locked_at: new Date().toISOString() })
    .eq('id', squadRegistrationId);
  if (error) throw error;
}

/** Lock rosters for ALL confirmed squads in a tournament */
export async function lockAllRosters(tournamentId: string): Promise<void> {
  const { error } = await supabase
    .from('squad_registrations')
    .update({ roster_locked_at: new Date().toISOString() })
    .eq('tournament_id', tournamentId)
    .eq('status', 'confirmed')
    .is('roster_locked_at', null);
  if (error) throw error;
}

/**
 * Mark a roster player as injured.
 * Does NOT require roster to be unlocked — injuries can happen anytime.
 * Returns whether the squad can still field enough teams.
 */
export async function markPlayerInjured(
  rosterPlayerId: string,
  injuryNote?: string
): Promise<{ success: boolean; activeCount: number; insufficientPlayers: boolean }> {
  // Update player status
  const { data: updatedRow, error } = await supabase
    .from('tournament_roster')
    .update({
      status: 'inactive_injured' as RosterPlayerStatus,
      injury_note: injuryNote || null,
    })
    .eq('id', rosterPlayerId)
    .select('squad_registration_id')
    .single();
  if (error) throw error;

  // Count remaining active players
  const { data: activeRoster } = await supabase
    .from('tournament_roster')
    .select('id')
    .eq('squad_registration_id', updatedRow.squad_registration_id)
    .eq('status', 'active');

  const activeCount = activeRoster?.length ?? 0;

  // Check if they can still form at least 1 team (doubles = 2)
  return {
    success: true,
    activeCount,
    insufficientPlayers: activeCount < 2,
  };
}

/** Mark a roster player as withdrawn (voluntary) */
export async function withdrawRosterPlayer(rosterPlayerId: string): Promise<void> {
  const { error } = await supabase
    .from('tournament_roster')
    .update({ status: 'withdrawn' as RosterPlayerStatus })
    .eq('id', rosterPlayerId);
  if (error) throw error;
}

/**
 * Set match lineup for a squad in a specific match.
 * Captain selects which roster players play (active only) and pairs them into teams.
 * Validates all players are in the locked roster and active.
 */
export async function setMatchLineup(
  matchId: string,
  squadRegistrationId: string,
  teams: Array<{ playerId: string; partnerId?: string; teamNumber: number }>,
  benchPlayerIds: string[] = []
): Promise<MatchLineup[]> {
  // 1. Verify roster is locked (bracket must be generated)
  const { data: reg } = await supabase
    .from('squad_registrations')
    .select('roster_locked_at')
    .eq('id', squadRegistrationId)
    .single();
  if (!reg?.roster_locked_at) {
    throw new Error('Roster is not locked yet. Bracket must be generated first.');
  }

  // 2. Get active roster players for this squad
  const { data: roster } = await supabase
    .from('tournament_roster')
    .select('player_id, status')
    .eq('squad_registration_id', squadRegistrationId)
    .eq('status', 'active');
  const rosterIds = new Set((roster ?? []).map((r: any) => r.player_id));

  // 3. Validate all lineup players are in active roster
  const allPlayerIds = [
    ...teams.map(t => t.playerId),
    ...teams.filter(t => t.partnerId).map(t => t.partnerId!),
    ...benchPlayerIds,
  ];
  const invalid = allPlayerIds.filter(id => !rosterIds.has(id));
  if (invalid.length > 0) {
    throw new Error('One or more players are not in the active roster');
  }

  // 4. Check no duplicate players in lineup
  const uniqueCheck = new Set(allPlayerIds);
  if (uniqueCheck.size !== allPlayerIds.length) {
    throw new Error('A player cannot appear in multiple teams');
  }

  // 5. Delete existing lineup for this match + squad
  await supabase
    .from('match_lineups')
    .delete()
    .eq('match_id', matchId)
    .eq('squad_registration_id', squadRegistrationId);

  // 6. Insert new lineup
  const inserts: any[] = [];
  for (const team of teams) {
    inserts.push({
      match_id: matchId,
      squad_registration_id: squadRegistrationId,
      player_id: team.playerId,
      partner_id: team.partnerId || null,
      team_number: team.teamNumber,
      is_bench: false,
      confirmed_at: new Date().toISOString(),
    });
  }
  for (const benchId of benchPlayerIds) {
    inserts.push({
      match_id: matchId,
      squad_registration_id: squadRegistrationId,
      player_id: benchId,
      partner_id: null,
      team_number: 0,
      is_bench: true,
      confirmed_at: null,
    });
  }

  const { data, error } = await supabase
    .from('match_lineups')
    .insert(inserts)
    .select();
  if (error) throw error;
  return (data ?? []).map(mapMatchLineup);
}

/** Get match lineup for a squad in a specific match */
export async function getMatchLineup(
  matchId: string,
  squadRegistrationId: string
): Promise<MatchLineup[]> {
  const { data, error } = await supabase
    .from('match_lineups')
    .select('*')
    .eq('match_id', matchId)
    .eq('squad_registration_id', squadRegistrationId)
    .order('team_number', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapMatchLineup);
}

/**
 * Request a substitution (add player from outside locked roster — admin override).
 * For normal lineup rotation within the roster, use setMatchLineup instead.
 */
export async function requestSubstitution(
  tournamentId: string,
  squadRegistrationId: string,
  playerOutId: string,
  playerInId: string,
  reason: string,
  requestedBy: string
): Promise<SubstitutionLog> {
  // Check tournament mode
  const tournament = await fetchTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  // Check player_in isn't already in another squad for this tournament
  const { data: otherRegs } = await supabase
    .from('tournament_roster')
    .select('id, squad_registration_id, squad_registrations!inner(tournament_id, status)')
    .eq('player_id', playerInId);
  const conflict = (otherRegs ?? []).find((r: any) =>
    r.squad_registrations?.tournament_id === tournamentId &&
    r.squad_registrations?.status !== 'withdrawn' &&
    r.squad_registrations?.status !== 'rejected'
  );
  if (conflict) {
    throw new Error('Replacement player is already registered with another squad in this tournament');
  }

  // For competitive: validate rating proximity
  if (tournament.tournamentMode === 'competitive') {
    const tolerance = tournament.squadRequirements?.ratingReplacementTolerance ?? 0.5;
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, rating')
      .in('id', [playerOutId, playerInId]);
    const outRating = profiles?.find((p: any) => p.id === playerOutId)?.rating;
    const inRating = profiles?.find((p: any) => p.id === playerInId)?.rating;
    if (outRating != null && inRating != null && Math.abs(inRating - outRating) > tolerance) {
      throw new Error(`Rating difference (${Math.abs(inRating - outRating).toFixed(1)}) exceeds allowed tolerance (±${tolerance})`);
    }
  }

  const { data, error } = await supabase
    .from('substitution_logs')
    .insert({
      tournament_id: tournamentId,
      squad_registration_id: squadRegistrationId,
      requested_by: requestedBy,
      player_out: playerOutId,
      player_in: playerInId,
      reason,
      admin_override: true,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return mapSubstitutionLog(data);
}

/** Resolve a substitution request (organizer). If approved, updates roster. */
export async function resolveSubstitution(
  logId: string,
  approvedBy: string,
  decision: 'approved' | 'rejected'
): Promise<void> {
  // 1. Update log
  const { data: log, error: logErr } = await supabase
    .from('substitution_logs')
    .update({
      status: decision,
      approved_by: approvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', logId)
    .select()
    .single();
  if (logErr) throw logErr;

  if (decision === 'approved') {
    // 2. Mark old player as substituted in roster
    await supabase
      .from('tournament_roster')
      .update({
        status: 'substituted' as RosterPlayerStatus,
        replaced_by: log.player_in,
      })
      .eq('squad_registration_id', log.squad_registration_id)
      .eq('player_id', log.player_out);

    // 3. Add new player to roster
    await supabase
      .from('tournament_roster')
      .upsert({
        squad_registration_id: log.squad_registration_id,
        player_id: log.player_in,
        status: 'active',
        added_at: new Date().toISOString(),
      }, { onConflict: 'squad_registration_id,player_id' });
  }
}

/** Get substitution logs for a tournament */
export async function getSubstitutionLogs(tournamentId: string): Promise<SubstitutionLog[]> {
  const { data, error } = await supabase
    .from('substitution_logs')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapSubstitutionLog);
}

/** Get pending substitution requests for a tournament */
export async function getPendingSubstitutions(tournamentId: string): Promise<SubstitutionLog[]> {
  const { data, error } = await supabase
    .from('substitution_logs')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapSubstitutionLog);
}

/** Enhanced evaluateSquadEligibility with roster validation */
export function evaluateSquadRosterEligibility(
  requirements: SquadRequirements | undefined,
  squad: Pick<Squad, 'members_count' | 'avg_rating' | 'name'>,
  rosterSize: number,
  teamSize: number
): { eligible: boolean; reasons: string[] } {
  const base = evaluateSquadEligibility(requirements, squad);
  const reasons = [...base.reasons];

  if (rosterSize < 2) {
    reasons.push('Roster must have at least 2 players');
  }
  if (rosterSize % teamSize !== 0) {
    reasons.push(`Roster size (${rosterSize}) must be divisible by team size (${teamSize})`);
  }
  const minSize = requirements?.minSize ?? 2;
  if (rosterSize < minSize) {
    reasons.push(`Roster needs at least ${minSize} players (has ${rosterSize})`);
  }

  return { eligible: reasons.length === 0, reasons };
}
