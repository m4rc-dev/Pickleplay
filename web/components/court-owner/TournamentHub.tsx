import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Trophy, Users, Megaphone, GitBranch, CheckCircle2, Clock,
  UserCheck, UserX, Shuffle, Plus, Loader2, Radio, BarChart3,
  Settings2, Zap, Star, ChevronUp, ChevronDown, SlidersHorizontal, RotateCcw
} from 'lucide-react';
import ConfirmDialog from '../ui/ConfirmDialog';
import {
  fetchTournamentById, fetchRegistrations, updateTournamentStatus,
  postAnnouncement, generateBracket, checkInParticipant, checkInAll,
  removeRegistrantByAdmin, createTeamByOwner, fetchTeams, resolveParticipantNames,
  getPendingRegistrationsDetailed, approveRegistration, rejectRegistration,
  fetchRegistrationsWithRatings, fetchTournamentChampion,
  type PendingRegistrationDetailed
} from '../../services/tournaments';
import type { Tournament, TournamentRegistration, TournamentTeam } from '../../types';
import TournamentBracket from '../tournaments/TournamentBracket';
import PlayerApprovalCard from '../tournaments/PlayerApprovalCard';
import MatchScoreModal from '../tournaments/MatchScoreModal';
import MarketingPosterModal, { PosterData } from '../MarketingPosterModal';
import { supabase } from '../../services/supabase';

type HubTab = 'overview' | 'participants' | 'teams' | 'bracket' | 'announcements';

// ─── Mock data for presentations ──────────────────────────────────────────────
const MOCK_PLAYER_IDS = ['pm-alex','pm-sarah','pm-marcus','pm-emily','pm-david','pm-lisa','pm-tom','pm-jenna'];
const MOCK_NAMES: Record<string, { name: string; avatar?: string }> = {
  'pm-alex':   { name: 'Alex Rodriguez' },
  'pm-sarah':  { name: 'Sarah Chen' },
  'pm-marcus': { name: 'Marcus Johnson' },
  'pm-emily':  { name: 'Emily Watts' },
  'pm-david':  { name: 'David Kim' },
  'pm-lisa':   { name: 'Lisa Park' },
  'pm-tom':    { name: 'Tom Harris' },
  'pm-jenna':  { name: 'Jenna Moore' },
};

function buildMockHubData() {
  const tournament: import('../../types').Tournament = {
    id: 'mock-hub-1',
    name: 'Summer Smash Open 2026',
    description: 'The premier mixed doubles event of the season. Compete for glory and the championship trophy!',
    status: 'LIVE',
    format: 'single_elim',
    eventType: 'Mixed Doubles',
    date: '2026-08-15',
    location: 'PicklePlay Arena, Manila',
    maxPlayers: 16,
    isFeatured: true,
    isApproved: true,
    registrationFee: 500,
    prizePool: 20000,
    registrationDeadline: '2026-08-10',
    registrationMode: 'open',
    announcement: 'Quarter-finals begin at 2:00 PM today. Bracket is posted in the main lobby. Good luck to all participants!',
    courtOwnerId: 'mock-owner',
    createdAt: '2026-07-01T08:00:00Z',
    updatedAt: new Date().toISOString(),
  };

  const registrations: import('../../types').TournamentRegistration[] = [
    { id: 'mr-1', tournamentId: 'mock-hub-1', playerId: 'pm-alex',   teamId: 'mt-1', checkedIn: true,  status: 'confirmed', registeredAt: '2026-07-10T09:00:00Z' },
    { id: 'mr-2', tournamentId: 'mock-hub-1', playerId: 'pm-sarah',  teamId: 'mt-1', checkedIn: true,  status: 'confirmed', registeredAt: '2026-07-10T09:05:00Z' },
    { id: 'mr-3', tournamentId: 'mock-hub-1', playerId: 'pm-marcus', teamId: 'mt-2', checkedIn: true,  status: 'confirmed', registeredAt: '2026-07-11T10:00:00Z' },
    { id: 'mr-4', tournamentId: 'mock-hub-1', playerId: 'pm-emily',  teamId: 'mt-2', checkedIn: true,  status: 'confirmed', registeredAt: '2026-07-11T10:05:00Z' },
    { id: 'mr-5', tournamentId: 'mock-hub-1', playerId: 'pm-david',  checkedIn: true,  status: 'confirmed', registeredAt: '2026-07-12T11:00:00Z' },
    { id: 'mr-6', tournamentId: 'mock-hub-1', playerId: 'pm-lisa',   checkedIn: true,  status: 'confirmed', registeredAt: '2026-07-12T11:05:00Z' },
    { id: 'mr-7', tournamentId: 'mock-hub-1', playerId: 'pm-tom',    checkedIn: false, status: 'confirmed', registeredAt: '2026-07-13T14:00:00Z' },
    { id: 'mr-8', tournamentId: 'mock-hub-1', playerId: 'pm-jenna',  checkedIn: false, status: 'confirmed', registeredAt: '2026-07-13T14:05:00Z' },
  ];

  const teams: import('../../types').TournamentTeam[] = [
    { id: 'mt-1', tournamentId: 'mock-hub-1', player1Id: 'pm-alex',   player2Id: 'pm-sarah',  teamName: 'Alex & Sarah',   seed: 1 },
    { id: 'mt-2', tournamentId: 'mock-hub-1', player1Id: 'pm-marcus', player2Id: 'pm-emily',  teamName: 'Marcus & Emily', seed: 2 },
  ];

  const makePlayer = (id: string, username: string, fullName: string, dupr: number, rating: number): import('../../services/tournaments').PlayerApprovalDetails => ({
    id,
    username,
    fullName,
    avatarUrl: null,
    skillRating: rating,
    duprRating: dupr,
    dateOfBirth: '1995-04-12',
    gender: 'M',
    playingSince: '2021-01-01',
    memberSince: '2023-01-01T00:00:00Z',
    tournamentsPlayed: 12,
    tournamentsWon: 3,
    matchesWon: 34,
    matchesLost: 10,
    winRate: 77,
    noShowCount: 0,
    lateCancelCount: 1,
    recentLateCancels: 0,
    verification: { emailVerified: true, phoneVerified: true },
    socialProof: { endorsements: 8, reviewCount: 14, avgRating: 4.6 },
    tournamentHistory: [],
  });

  const pendingRegistrations: import('../../services/tournaments').PendingRegistrationDetailed[] = [
    {
      id: 'pending-1',
      tournamentId: 'mock-hub-1',
      playerId: 'pm-carlos',
      status: 'pending',
      registeredAt: '2026-08-08T10:00:00Z',
      applicationMessage: 'Really looking forward to this event! I have competed in 5 local tournaments this year.',
      player: makePlayer('pm-carlos', 'carlosd', 'Carlos Diaz', 3.8, 4),
      recommendation: { action: 'approve', confidence: 'high', score: 88, reasons: ['Strong win rate', 'Verified account'] },
    },
    {
      id: 'pending-2',
      tournamentId: 'mock-hub-1',
      playerId: 'pm-nina',
      status: 'pending',
      registeredAt: '2026-08-09T14:30:00Z',
      applicationMessage: null,
      player: makePlayer('pm-nina', 'ninas', 'Nina Santos', 3.5, 3),
      recommendation: { action: 'review', confidence: 'medium', score: 62, reasons: ['New player', 'No tournament history'] },
    },
  ];

  const nameMap = new Map<string, { name: string; avatar?: string }>(
    Object.entries(MOCK_NAMES)
  );
  // Also add pending players to nameMap
  nameMap.set('pm-carlos', { name: 'Carlos Diaz' });
  nameMap.set('pm-nina',   { name: 'Nina Santos' });

  const seedingPlayers: { playerId: string; name: string; avatar?: string; duprRating?: number | null }[] = [
    { playerId: 'pm-alex',   name: 'Alex Rodriguez', duprRating: 4.50 },
    { playerId: 'pm-sarah',  name: 'Sarah Chen',      duprRating: 4.30 },
    { playerId: 'pm-marcus', name: 'Marcus Johnson',  duprRating: 4.10 },
    { playerId: 'pm-emily',  name: 'Emily Watts',     duprRating: 3.90 },
    { playerId: 'pm-david',  name: 'David Kim',       duprRating: 3.75 },
    { playerId: 'pm-lisa',   name: 'Lisa Park',       duprRating: 3.55 },
    { playerId: 'pm-tom',    name: 'Tom Harris',      duprRating: 3.35 },
    { playerId: 'pm-jenna',  name: 'Jenna Moore',     duprRating: 3.10 },
  ];

  return { tournament, registrations, teams, pendingRegistrations, nameMap, seedingPlayers };
}
// ──────────────────────────────────────────────────────────────────────────────

const TournamentHub: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Read initial tab from URL parameter, default to 'participants' for management
  const initialTab = (searchParams.get('tab') as HubTab) || 'participants';

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistrationDetailed[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [nameMap, setNameMap] = useState<Map<string, { name: string; avatar?: string }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<HubTab>(initialTab);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [announcementText, setAnnouncementText] = useState('');
  const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);

  // Match scoring
  const [scoringMatch, setScoringMatch] = useState<import('../../types').TournamentMatch | null>(null);
  const [showPoster, setShowPoster] = useState(false);

  // Mock bracket rounds (managed locally for interactive demo)
  const [mockRounds, setMockRounds] = useState<import('../../types').TournamentRound[] | null>(null);

  // Seeding
  type SeedPlayer = { playerId: string; name: string; avatar?: string; duprRating?: number | null };
  const [seedingPlayers, setSeedingPlayers] = useState<SeedPlayer[]>([]);
  const [showSeeding, setShowSeeding] = useState(false);
  const [seedingLoaded, setSeedingLoaded] = useState(false);

  // Champion
  const [champion, setChampion] = useState<{ id: string; name: string; avatar?: string } | null>(null);

  // Team builder
  const [selectedP1, setSelectedP1] = useState<string | null>(null);
  const [selectedP2, setSelectedP2] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'warning' | 'danger' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'warning' });

  const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'warning' | 'danger' | 'info' = 'warning') => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm, variant });
  };

  const closeConfirm = () => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
  };

  const handleConfirm = () => {
    confirmDialog.onConfirm();
    closeConfirm();
  };

  // Sync activeTab with URL parameter changes
  useEffect(() => {
    const tabFromUrl = (searchParams.get('tab') as HubTab) || 'participants';
    setActiveTab(tabFromUrl);
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!tournamentId) return;
    setIsLoading(true);
    try {
      // ── Mock mode for presentations ────────────────────────────────────────
      if (tournamentId.startsWith('mock-')) {
        await new Promise(r => setTimeout(r, 600)); // brief loading feel
        const mock = buildMockHubData();
        setTournament(mock.tournament);
        setRegistrations(mock.registrations);
        setTeams(mock.teams);
        setPendingRegistrations(mock.pendingRegistrations);
        setNameMap(mock.nameMap);
        setSeedingPlayers(mock.seedingPlayers);
        setSeedingLoaded(true);
        setAnnouncementText(mock.tournament.announcement || '');
        setCurrentUserId('mock-owner');
        return;
      }
      // ──────────────────────────────────────────────────────────────────────

      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);

      const [t, regs, tms, pending] = await Promise.all([
        fetchTournamentById(tournamentId),
        fetchRegistrations(tournamentId),
        fetchTeams(tournamentId),
        getPendingRegistrationsDetailed(tournamentId!),
      ]);
      setTournament(t);
      setRegistrations(regs);
      setTeams(tms);
      setPendingRegistrations(pending);
      setAnnouncementText(t?.announcement || '');
      // Load champion when completed
      if (t?.status === 'COMPLETED') {
        fetchTournamentChampion(tournamentId!).then(c => setChampion(c)).catch(() => {});
      }
      // Resolve names for confirmed + pending players
      const allPlayerIds = [
        ...regs.map(r => r.playerId),
        ...pending.map(p => p.playerId),
      ];
      if (allPlayerIds.length > 0) {
        const map = await resolveParticipantNames(allPlayerIds);
        setNameMap(map);
      }
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (status: 'UPCOMING' | 'LIVE' | 'COMPLETED') => {
    if (!tournament || tournament.status === status) return;
    showConfirm(
      `Change to ${status}?`,
      `This will update the tournament status from ${tournament.status} to ${status}. This action affects how the tournament appears to participants.`,
      async () => {
        setIsProcessing('status');
        try {
          if (tournamentId?.startsWith('mock-')) {
            await new Promise(resolve => setTimeout(resolve, 400));
            setTournament(prev => prev ? { ...prev, status } : null);
          } else {
            await updateTournamentStatus(tournament.id, status);
            await load();
          }
        } catch (err: any) { alert(err.message || 'Failed'); } finally { setIsProcessing(null); }
      },
      'info'
    );
  };

  const handleCheckIn = async (playerId: string, current: boolean) => {
    setIsProcessing(`ci-${playerId}`);
    try {
      // Mock mode: just update state locally
      if (tournamentId?.startsWith('mock-')) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setRegistrations(prev => prev.map(r => r.playerId === playerId ? { ...r, checkedIn: !current } : r));
      } else {
        await checkInParticipant(tournamentId!, playerId, !current);
        setRegistrations(prev => prev.map(r => r.playerId === playerId ? { ...r, checkedIn: !current } : r));
      }
    } catch (err: any) { alert(err.message || 'Failed'); } finally { setIsProcessing(null); }
  };

  const handleCheckInAll = async () => {
    showConfirm(
      'Check in all participants?',
      `This will mark all ${registrations.length} registered participants as checked in. You can still toggle individual check-ins afterward.`,
      async () => {
        setIsProcessing('ci-all');
        try {
          if (tournamentId?.startsWith('mock-')) {
            await new Promise(resolve => setTimeout(resolve, 500));
            setRegistrations(prev => prev.map(r => ({ ...r, checkedIn: true })));
          } else {
            await checkInAll(tournamentId!);
            setRegistrations(prev => prev.map(r => ({ ...r, checkedIn: true })));
          }
        } catch (err: any) { alert(err.message || 'Failed'); } finally { setIsProcessing(null); }
      },
      'info'
    );
  };

  const handleRemove = async (playerId: string, name: string) => {
    showConfirm(
      'Remove participant?',
      `This will permanently remove ${name} from this tournament. They will need to re-register if they want to participate again. This action cannot be undone.`,
      async () => {
        setIsProcessing(`rm-${playerId}`);
        try {
          if (tournamentId?.startsWith('mock-')) {
            await new Promise(resolve => setTimeout(resolve, 300));
            setRegistrations(prev => prev.filter(r => r.playerId !== playerId));
          } else {
            await removeRegistrantByAdmin(tournamentId!, playerId);
            setRegistrations(prev => prev.filter(r => r.playerId !== playerId));
            await load();
          }
        } catch (err: any) { alert(err.message || 'Failed'); } finally { setIsProcessing(null); }
      },
      'danger'
    );
  };

  const handleAutoPair = async () => {
    const unassigned = registrations.filter(r => !r.teamId);
    if (unassigned.length < 2) { alert('Need at least 2 unpaired players.'); return; }
    showConfirm(
      'Auto-pair teams?',
      `This will randomly pair ${unassigned.length} unpaired players into ${Math.floor(unassigned.length / 2)} doubles teams. Team names will be auto-generated.`,
      async () => {
        setIsProcessing('autopair');
        try {
          if (tournamentId?.startsWith('mock-')) {
            await new Promise(resolve => setTimeout(resolve, 600));
            const shuffled = [...unassigned].sort(() => Math.random() - 0.5);
            const newTeams: import('../../types').TournamentTeam[] = [];
            for (let i = 0; i + 1 < shuffled.length; i += 2) {
              const p1 = shuffled[i].playerId, p2 = shuffled[i + 1].playerId;
              const n1 = nameMap.get(p1)?.name?.split(' ')[0] || 'P1';
              const n2 = nameMap.get(p2)?.name?.split(' ')[0] || 'P2';
              const newTeam: import('../../types').TournamentTeam = {
                id: `mt-auto-${Date.now()}-${i}`,
                tournamentId: tournamentId!,
                player1Id: p1,
                player2Id: p2,
                teamName: `${n1} & ${n2}`,
                seed: teams.length + newTeams.length + 1,
              };
              newTeams.push(newTeam);
            }
            setTeams(prev => [...prev, ...newTeams]);
            setRegistrations(prev => prev.map(r => {
              const team = newTeams.find(t => t.player1Id === r.playerId || t.player2Id === r.playerId);
              return team ? { ...r, teamId: team.id } : r;
            }));
          } else {
            const shuffled = [...unassigned].sort(() => Math.random() - 0.5);
            for (let i = 0; i + 1 < shuffled.length; i += 2) {
              const p1 = shuffled[i].playerId, p2 = shuffled[i + 1].playerId;
              const n1 = nameMap.get(p1)?.name?.split(' ')[0] || 'P1';
              const n2 = nameMap.get(p2)?.name?.split(' ')[0] || 'P2';
              await createTeamByOwner(tournamentId!, p1, p2, `${n1} & ${n2}`);
            }
            await load();
          }
        } catch (err: any) { alert(err.message || 'Auto-pair failed'); } finally { setIsProcessing(null); }
      },
      'info'
    );
  };

  const handleCreateTeam = async () => {
    if (!selectedP1 || !selectedP2) { alert('Select two players.'); return; }
    if (selectedP1 === selectedP2) { alert('Select two different players.'); return; }
    const name = teamName.trim() ||
      `${nameMap.get(selectedP1)?.name?.split(' ')[0] || 'P1'} & ${nameMap.get(selectedP2)?.name?.split(' ')[0] || 'P2'}`;
    setIsCreatingTeam(true);
    try {
      if (tournamentId?.startsWith('mock-')) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const newTeam: import('../../types').TournamentTeam = {
          id: `mt-${Date.now()}`,
          tournamentId: tournamentId!,
          player1Id: selectedP1,
          player2Id: selectedP2,
          teamName: name,
          seed: teams.length + 1,
        };
        setTeams(prev => [...prev, newTeam]);
        setRegistrations(prev => prev.map(r => 
          r.playerId === selectedP1 || r.playerId === selectedP2 
            ? { ...r, teamId: newTeam.id } 
            : r
        ));
        setSelectedP1(null); setSelectedP2(null); setTeamName('');
      } else {
        await createTeamByOwner(tournamentId!, selectedP1, selectedP2, name);
        setSelectedP1(null); setSelectedP2(null); setTeamName('');
        await load();
      }
    } catch (err: any) { alert(err.message || 'Failed'); } finally { setIsCreatingTeam(false); }
  };

  const handlePostAnnouncement = async () => {
    if (!announcementText.trim()) return;
    setIsPostingAnnouncement(true);
    try {
      if (tournamentId?.startsWith('mock-')) {
        await new Promise(resolve => setTimeout(resolve, 400));
        setTournament(prev => prev ? { ...prev, announcement: announcementText.trim() } : null);
        alert('✓ Announcement posted (demo mode)');
      } else {
        await postAnnouncement(tournamentId!, announcementText.trim());
        await load();
      }
    } catch (err: any) { alert(err.message || 'Failed'); } finally { setIsPostingAnnouncement(false); }
  };

  const handleGenerateBracket = async () => {
    const customOrder = showSeeding && seedingPlayers.length > 0
      ? seedingPlayers.map(p => p.playerId)
      : undefined;
    showConfirm(
      'Generate bracket?',
      'This will create a new tournament bracket from the current participants. Any existing bracket and match results will be permanently overwritten. This action cannot be undone.',
      async () => {
        setIsProcessing('bracket');
        try {
          if (tournamentId?.startsWith('mock-')) {
            await new Promise(resolve => setTimeout(resolve, 800));
            // Build bracket from current registrations
            const players = customOrder || registrations.map(r => r.playerId);
            const numRounds = Math.ceil(Math.log2(players.length));
            const rounds: import('../../types').TournamentRound[] = [];
            // Round 1: pair players
            const r1Matches: import('../../types').TournamentMatch[] = [];
            for (let i = 0; i + 1 < players.length; i += 2) {
              r1Matches.push({
                id: `mock-gen-m${i / 2 + 1}`, tournamentId: tournamentId!, roundId: 'mock-gen-r1',
                matchNumber: i / 2 + 1, participantAId: players[i], participantBId: players[i + 1],
                status: 'scheduled',
              });
            }
            // Odd player auto-advances to next round
            if (players.length % 2 === 1) {
              r1Matches.push({
                id: `mock-gen-adv-${Date.now()}`, tournamentId: tournamentId!, roundId: 'mock-gen-r1',
                matchNumber: r1Matches.length + 1, participantAId: players[players.length - 1],
                status: 'bye', winnerId: players[players.length - 1],
              });
            }
            rounds.push({
              id: 'mock-gen-r1', tournamentId: tournamentId!, roundNumber: 1,
              roundName: numRounds <= 1 ? 'Finals' : numRounds === 2 ? 'Semifinals' : numRounds === 3 ? 'Quarterfinals' : `Round 1`,
              matches: r1Matches,
            });
            // Subsequent rounds: empty matches waiting for winners
            const roundNames = ['', 'Finals', 'Semifinals', 'Quarterfinals'];
            for (let r = 2; r <= numRounds; r++) {
              const matchCount = Math.ceil(players.length / Math.pow(2, r));
              const rMatches: import('../../types').TournamentMatch[] = [];
              for (let m = 0; m < matchCount; m++) {
                rMatches.push({
                  id: `mock-gen-r${r}-m${m + 1}`, tournamentId: tournamentId!, roundId: `mock-gen-r${r}`,
                  matchNumber: m + 1, status: 'scheduled',
                });
              }
              rounds.push({
                id: `mock-gen-r${r}`, tournamentId: tournamentId!, roundNumber: r,
                roundName: r === numRounds ? 'Finals' : r === numRounds - 1 ? 'Semifinals' : `Round ${r}`,
                matches: rMatches,
              });
            }
            setMockRounds(rounds);
          } else {
            await generateBracket(tournamentId!, customOrder);
            await load();
          }
        } catch (err: any) { alert(err.message || 'Failed'); } finally { setIsProcessing(null); }
      },
      'warning'
    );
  };

  /** Handle scoring a match in mock mode — updates local state and advances winner */
  const handleMockScore = (matchId: string, scoreA: number, scoreB: number, winnerId: string) => {
    if (!mockRounds) return;
    const newRounds = mockRounds.map(round => ({
      ...round,
      matches: (round.matches || []).map(m =>
        m.id === matchId ? { ...m, scoreA, scoreB, winnerId, status: 'completed' as const } : m
      ),
    }));

    // Find which round/match was scored to advance winner to next round
    for (let ri = 0; ri < newRounds.length - 1; ri++) {
      const round = newRounds[ri];
      const nextRound = newRounds[ri + 1];
      const scoredIdx = (round.matches || []).findIndex(m => m.id === matchId);
      if (scoredIdx === -1) continue;
      // Determine which slot in the next round this feeds into
      const nextMatchIdx = Math.floor(scoredIdx / 2);
      const isTopSlot = scoredIdx % 2 === 0;
      if (nextRound.matches && nextRound.matches[nextMatchIdx]) {
        const nextMatch = { ...nextRound.matches[nextMatchIdx] };
        if (isTopSlot) {
          nextMatch.participantAId = winnerId;
        } else {
          nextMatch.participantBId = winnerId;
        }
        // Next match stays scheduled – court owner uses "Go Live" button manually
        nextRound.matches = nextRound.matches.map((m, i) => i === nextMatchIdx ? nextMatch : m);
      }
      break;
    }
    setMockRounds(newRounds);
  };

  const handleLoadSeeding = async () => {
    if (seedingLoaded) { setShowSeeding(s => !s); return; }
    try {
      if (tournamentId?.startsWith('mock-')) {
        // Mock data already loaded in buildMockHubData
        setSeedingLoaded(true);
        setShowSeeding(true);
      } else {
        const players = await fetchRegistrationsWithRatings(tournamentId!);
        // Sort by DUPR descending by default
        const sorted = [...players].sort((a, b) => (b.duprRating ?? 0) - (a.duprRating ?? 0));
        setSeedingPlayers(sorted);
        setSeedingLoaded(true);
        setShowSeeding(true);
      }
    } catch (err: any) { alert('Failed to load player ratings'); }
  };

  const moveSeed = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= seedingPlayers.length) return;
    setSeedingPlayers(prev => {
      const arr = [...prev];
      [arr[index], arr[next]] = [arr[next], arr[index]];
      return arr;
    });
  };

  const autoSortByDUPR = () => {
    setSeedingPlayers(prev => [...prev].sort((a, b) => (b.duprRating ?? 0) - (a.duprRating ?? 0)));
  };

  const handleApprove = async (playerId: string) => {
    if (!currentUserId) return;
    try {
      if (tournamentId?.startsWith('mock-')) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const approved = pendingRegistrations.find(p => p.playerId === playerId);
        if (approved) {
          setPendingRegistrations(prev => prev.filter(p => p.playerId !== playerId));
          setRegistrations(prev => [...prev, {
            id: `mr-approved-${Date.now()}`,
            tournamentId: tournamentId!,
            playerId,
            checkedIn: false,
            status: 'confirmed',
            registeredAt: new Date().toISOString(),
          }]);
        }
      } else {
        await approveRegistration(tournamentId!, playerId, currentUserId);
        await load();
      }
    } catch (err: any) { alert(err.message || 'Failed to approve'); }
  };

  const handleReject = async (playerId: string, reason?: string) => {
    if (!currentUserId) return;
    try {
      if (tournamentId?.startsWith('mock-')) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setPendingRegistrations(prev => prev.filter(p => p.playerId !== playerId));
      } else {
        await rejectRegistration(tournamentId!, playerId, currentUserId);
        const pending = await getPendingRegistrationsDetailed(tournamentId!);
        setPendingRegistrations(pending);
      }
    } catch (err: any) { alert(err.message || 'Failed to reject'); }
  };

  const isDoubles = tournament?.eventType?.toLowerCase().includes('double') ||
                    tournament?.eventType?.toLowerCase().includes('mixed');
  const checkedInCount = registrations.filter(r => r.checkedIn).length;
  const unassignedRegs = registrations.filter(r => !r.teamId);
  const fillPct = Math.min(100, Math.round((registrations.length / (tournament?.maxPlayers || 1)) * 100));

  const pendingSuffix = pendingRegistrations.length > 0 ? ` +${pendingRegistrations.length}⏳` : '';
  const participantsLabel = tournament?.registrationMode === 'squad'
    ? `Squads (${registrations.length}${pendingSuffix})`
    : tournament?.registrationMode === 'both'
      ? `Players/Squads (${registrations.length}${pendingSuffix})`
      : `Players (${registrations.length}${pendingSuffix})`;

  const tabs: { key: HubTab; label: string; icon: React.ElementType; hidden?: boolean }[] = [
    { key: 'overview',      label: 'Overview',                        icon: BarChart3  },
    { key: 'participants',  label: participantsLabel, icon: Users    },
    { key: 'teams',         label: `Teams (${teams.length})`,          icon: Shuffle, hidden: !isDoubles },
    { key: 'bracket',       label: 'Bracket',                          icon: GitBranch },
    { key: 'announcements', label: 'Announce',                         icon: Megaphone },
  ];

  const statusRing: Record<string, string> = {
    UPCOMING:  'bg-blue-100 text-blue-700 border-blue-200',
    LIVE:      'bg-emerald-100 text-emerald-700 border-emerald-200',
    COMPLETED: 'bg-slate-100 text-slate-600 border-slate-200',
    CANCELLED: 'bg-rose-100 text-rose-600 border-rose-200',
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen gap-4 p-8">
        <Trophy className="w-16 h-16 text-slate-200" />
        <p className="font-black text-slate-400 uppercase tracking-widest">Tournament not found</p>
        <button
          onClick={() => navigate('/tournaments-admin')}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all"
        >
          Back to Tournaments
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 animate-in fade-in duration-300">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex items-center gap-5">

          {/* Back */}
          <button
            onClick={() => navigate('/tournaments-admin')}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-black text-[10px] uppercase tracking-widest shrink-0"
          >
            <ArrowLeft size={18} />
            <span className="hidden md:block">Tournaments</span>
          </button>

          <div className="w-px h-8 bg-slate-200 shrink-0" />

          {/* Tournament identity */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {tournament.image ? (
              <img
                src={tournament.image}
                alt={tournament.name}
                className="w-12 h-12 rounded-2xl object-cover shrink-0 border border-slate-100 shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                <Trophy size={22} />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter leading-tight truncate">
                {tournament.name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusRing[tournament.status] || statusRing.UPCOMING}`}>
                  {tournament.status}
                </span>
                {tournament.isFeatured && (
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-yellow-100 text-yellow-700 border border-yellow-200 flex items-center gap-1">
                    <Star size={9} /> Featured
                  </span>
                )}
                <span className="text-[10px] font-bold text-slate-400 hidden md:block">
                  {tournament.location} · {new Date(tournament.date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {tournamentId?.startsWith('mock-') && (
            <button
              onClick={() => {
                const mock = buildMockHubData();
                setTournament(mock.tournament);
                setRegistrations(mock.registrations);
                setTeams(mock.teams);
                setPendingRegistrations(mock.pendingRegistrations);
                setNameMap(mock.nameMap);
                setSeedingPlayers(mock.seedingPlayers);
                setSeedingLoaded(true);
                setChampion(null);
                setAnnouncementText('');
                setMockRounds(null);
              }}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all font-black text-[9px] uppercase tracking-widest border border-amber-200"
              title="Reset mock data to original state"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          )}

          {/* Make Poster button */}
          <button
            onClick={() => setShowPoster(true)}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all font-black text-[9px] uppercase tracking-widest border border-indigo-200"
            title="Generate a marketing poster for this tournament"
          >
            <Megaphone size={14} />
            Make Poster
          </button>

          <div className="shrink-0 p-2.5 rounded-xl bg-indigo-50 text-indigo-500">
            <Settings2 size={20} />
          </div>
        </div>

        {/* Tab Bar */}
        <div className="max-w-7xl mx-auto px-2 md:px-10 flex gap-1 overflow-x-auto">
          {tabs.filter(t => !t.hidden).map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  navigate(`/tournaments-admin/manage/${tournamentId}?tab=${tab.key}`, { replace: true });
                }}
                className={`flex items-center gap-2 px-5 py-3.5 font-black text-[10px] uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Page Body ── */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-10">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-200">

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Registered"   value={`${registrations.length} / ${tournament.maxPlayers}`} sub="players"       color="indigo"  />
              <StatCard label="Fill Rate"    value={`${fillPct}%`}                                          sub="capacity"     color="violet"  />
              <StatCard label="Checked In"   value={`${checkedInCount} / ${registrations.length}`}          sub="participants" color="emerald" />
              <StatCard label={isDoubles ? 'Teams Formed' : 'Format'}
                        value={isDoubles ? `${teams.length}` : (tournament.format?.replace('_', ' ') || '–')}
                        sub={isDoubles ? 'doubles pairs' : 'bracket type'}
                        color="amber" />
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="font-black text-slate-900 text-sm uppercase tracking-tight">Registration Progress</p>
                <p className="font-black text-indigo-600 text-sm">{registrations.length} / {tournament.maxPlayers}</p>
              </div>
              <div className="bg-slate-100 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                  style={{ width: `${fillPct}%` }}
                />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{fillPct}% full</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <Radio size={15} className="text-indigo-500" />
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight">Lifecycle Status</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['UPCOMING', 'LIVE', 'COMPLETED'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={isProcessing === 'status'}
                    className={`py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-60 shadow-sm ${
                      tournament.status === s
                        ? s === 'UPCOMING' ? 'bg-blue-600 text-white shadow-blue-200'
                          : s === 'LIVE'    ? 'bg-emerald-600 text-white shadow-emerald-200'
                          :                   'bg-slate-700 text-white shadow-slate-200'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 shadow-none border border-slate-100'
                    }`}
                  >
                    {isProcessing === 'status' && tournament.status !== s
                      ? <Loader2 size={13} className="animate-spin mx-auto" />
                      : s}
                  </button>
                ))}
              </div>
            </div>

            {/* Champion card — shown when tournament is completed or mock finals is won */}
            {(tournament.status === 'COMPLETED' || (tournamentId?.startsWith('mock-') && champion)) && champion && (
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-3xl p-6 flex items-center gap-5 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-yellow-100 flex items-center justify-center shrink-0">
                  {champion.avatar
                    ? <img src={champion.avatar} alt={champion.name} className="w-full h-full rounded-2xl object-cover" />
                    : <Trophy size={32} className="text-yellow-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest mb-0.5">Tournament Champion</p>
                  <p className="text-xl font-black text-slate-900 uppercase tracking-tighter truncate">{champion.name}</p>
                </div>
                <Trophy size={40} className="text-yellow-300 shrink-0" />
              </div>
            )}

            {tournament.announcement && (
              <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex items-start gap-4">
                <Megaphone size={20} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Active Announcement</p>
                  <p className="text-sm font-bold text-blue-900">{tournament.announcement}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PARTICIPANTS */}
        {activeTab === 'participants' && (
          <div className="space-y-6 animate-in fade-in duration-200">

            {/* Pending Approvals */}
            {pendingRegistrations.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-600">Pending Approvals</h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black">{pendingRegistrations.length}</span>
                </div>
                {pendingRegistrations.map(reg => (
                  <PlayerApprovalCard
                    key={reg.id}
                    registration={reg}
                    tournamentId={tournamentId!}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Confirmed Participants</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  {checkedInCount} of {registrations.length} checked in
                </p>
              </div>
              <button
                onClick={handleCheckInAll}
                disabled={isProcessing === 'ci-all' || registrations.length === 0}
                className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
              >
                {isProcessing === 'ci-all' ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
                Check In All
              </button>
            </div>

            {registrations.length === 0 ? (
              <EmptyState icon={Users} message="No participants registered yet" />
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {registrations.map((reg, i) => {
                  const info = nameMap.get(reg.playerId);
                  const displayName = info?.name || reg.playerId.slice(0, 12) + '…';
                  const ciKey = `ci-${reg.playerId}`;
                  const rmKey = `rm-${reg.playerId}`;
                  return (
                    <div key={reg.id} className={`flex items-center gap-4 px-6 py-4 group hover:bg-slate-50 transition-colors ${i < registrations.length - 1 ? 'border-b border-slate-50' : ''}`}>
                      <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center font-black text-xs shrink-0">{i + 1}</span>
                      {info?.avatar
                        ? <img src={info.avatar} alt={displayName} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        : <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-sm shrink-0">{displayName[0]?.toUpperCase()}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-slate-900 truncate">{displayName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {new Date(reg.registeredAt).toLocaleDateString()}{reg.teamId && ' · In Team'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCheckIn(reg.playerId, !!reg.checkedIn)}
                        disabled={isProcessing === ciKey}
                        className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-1.5 shrink-0 ${
                          reg.checkedIn
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {isProcessing === ciKey
                          ? <Loader2 size={11} className="animate-spin" />
                          : reg.checkedIn ? <><CheckCircle2 size={11} /> Checked In</> : <><Clock size={11} /> Check In</>}
                      </button>
                      <button
                        onClick={() => handleRemove(reg.playerId, displayName)}
                        disabled={isProcessing === rmKey}
                        className="p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        {isProcessing === rmKey ? <Loader2 size={15} className="animate-spin" /> : <UserX size={15} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TEAMS */}
        {activeTab === 'teams' && isDoubles && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Auto-pair */}
            <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Shuffle size={15} className="text-violet-500" />
                  <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight">Auto-Pair</h3>
                </div>
                <p className="text-sm text-slate-500 font-medium">
                  {unassignedRegs.length} unpaired · {Math.floor(unassignedRegs.length / 2)} pairs possible
                </p>
              </div>
              <button
                onClick={handleAutoPair}
                disabled={isProcessing === 'autopair' || unassignedRegs.length < 2}
                className="px-7 py-3.5 bg-violet-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
              >
                {isProcessing === 'autopair' ? <Loader2 size={13} className="animate-spin" /> : <Shuffle size={13} />}
                Auto-Pair
              </button>
            </div>

            {/* Manual builder */}
            <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Plus size={15} className="text-indigo-500" />
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight">Manual Team Builder</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                {[{label:'Player 1', val:selectedP1, set:setSelectedP1, exclude:selectedP2},
                  {label:'Player 2', val:selectedP2, set:setSelectedP2, exclude:selectedP1}].map(({label,val,set,exclude})=>(
                  <div key={label}>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">{label}</label>
                    <select
                      value={val||''}
                      onChange={e=>set(e.target.value||null)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="">Select player…</option>
                      {registrations.filter(r=>!r.teamId && r.playerId!==exclude).map(r=>(
                        <option key={r.id} value={r.playerId}>{nameMap.get(r.playerId)?.name||r.playerId.slice(0,12)}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="mb-5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Team Name (optional)</label>
                <input type="text" value={teamName} onChange={e=>setTeamName(e.target.value)} placeholder="Auto-generated if blank"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <button
                onClick={handleCreateTeam}
                disabled={isCreatingTeam||!selectedP1||!selectedP2}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
              >
                {isCreatingTeam ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Create Team
              </button>
            </div>

            {/* Teams list */}
            <div>
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight mb-4 flex items-center gap-2">
                <Users size={15} className="text-indigo-500" /> Formed Teams ({teams.length})
              </h3>
              {teams.length === 0
                ? <EmptyState icon={Shuffle} message="No teams formed yet" />
                : (
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    {teams.map((team, i) => (
                      <div key={team.id} className={`flex items-center gap-4 px-6 py-4 ${i < teams.length-1 ? 'border-b border-slate-50' : ''}`}>
                        <span className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-black text-xs shrink-0">{i+1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-slate-900">{team.teamName || `Team ${i+1}`}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {nameMap.get(team.player1Id)?.name||team.player1Id.slice(0,10)} · {team.player2Id?(nameMap.get(team.player2Id)?.name||team.player2Id.slice(0,10)):'—'}
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-violet-50 text-violet-600 text-[9px] font-black uppercase tracking-widest border border-violet-100">Paired</span>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          </div>
        )}

        {/* BRACKET */}
        {activeTab === 'bracket' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Tournament Bracket</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{tournament.format?.replace('_',' ')||'Single Elimination'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLoadSeeding}
                  className={`px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all border ${
                    showSeeding ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <SlidersHorizontal size={13} /> Seed Order
                </button>
                <button
                  onClick={handleGenerateBracket}
                  disabled={isProcessing==='bracket'}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-50"
                >
                  {isProcessing==='bracket' ? <Loader2 size={13} className="animate-spin" /> : <GitBranch size={13} />} Generate Bracket
                </button>
              </div>
            </div>

            {/* Seeding panel */}
            {showSeeding && seedingPlayers.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={14} className="text-indigo-500" />
                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight">Player Seed Order</h3>
                  </div>
                  <button
                    onClick={autoSortByDUPR}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-100 transition-all"
                  >
                    Auto-sort by DUPR
                  </button>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                  Seed #1 gets the best bracket position. Drag or use arrows to reorder.
                </p>
                <div className="space-y-2">
                  {seedingPlayers.map((p, i) => (
                    <div key={p.playerId} className="flex items-center gap-3 py-2.5 px-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="w-6 text-center text-[10px] font-black text-slate-400">{i + 1}</span>
                      {p.avatar
                        ? <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-xl object-cover" />
                        : <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-500">{p.name[0]}</div>
                      }
                      <span className="flex-1 text-sm font-bold text-slate-800 truncate">{p.name}</span>
                      {p.duprRating != null && (
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest px-2 py-0.5 bg-indigo-50 rounded-full border border-indigo-100">
                          DUPR {p.duprRating.toFixed(2)}
                        </span>
                      )}
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveSeed(i, -1)}
                          disabled={i === 0}
                          className="p-1 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition-all"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          onClick={() => moveSeed(i, 1)}
                          disabled={i === seedingPlayers.length - 1}
                          className="p-1 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition-all"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(tournament.status === 'LIVE' || (tournamentId?.startsWith('mock-') && mockRounds)) && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
                <Radio size={13} className="text-emerald-500 animate-pulse" />
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                  {tournamentId?.startsWith('mock-') ? 'Interactive demo — click any match to enter scores' : 'Live — click any scheduled match to enter scores'}
                </p>
              </div>
            )}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
              <TournamentBracket
                tournamentId={tournamentId!}
                format={tournament.format||'single_elim'}
                externalRounds={tournamentId?.startsWith('mock-') && mockRounds ? mockRounds : undefined}
                externalNames={tournamentId?.startsWith('mock-') && mockRounds ? nameMap : undefined}
                onMatchClick={(match) => {
                  if ((match.status === 'live' || match.status === 'scheduled') && match.participantAId && match.participantBId) {
                    setScoringMatch(match);
                  }
                }}
                onSetLive={tournamentId?.startsWith('mock-') && mockRounds ? (match) => {
                  if (match.status !== 'scheduled' || !match.participantAId || !match.participantBId) return;
                  setMockRounds(prev => (prev || []).map(round => ({
                    ...round,
                    matches: (round.matches || []).map(m =>
                      m.id === match.id ? { ...m, status: 'live' as const } : m
                    ),
                  })));
                } : undefined}
                onAutoAdvance={tournamentId?.startsWith('mock-') && mockRounds ? (match) => {
                  if (!match.participantAId || match.participantBId) return;
                  const winnerId = match.participantAId;
                  // Mark as bye with winner
                  const newRounds = (mockRounds || []).map(round => ({
                    ...round,
                    matches: (round.matches || []).map(m =>
                      m.id === match.id ? { ...m, status: 'bye' as const, winnerId } : m
                    ),
                  }));
                  // Advance winner to next round
                  for (let ri = 0; ri < newRounds.length - 1; ri++) {
                    const round = newRounds[ri];
                    const nextRound = newRounds[ri + 1];
                    const scoredIdx = (round.matches || []).findIndex(m => m.id === match.id);
                    if (scoredIdx === -1) continue;
                    const nextMatchIdx = Math.floor(scoredIdx / 2);
                    const isTopSlot = scoredIdx % 2 === 0;
                    if (nextRound.matches && nextRound.matches[nextMatchIdx]) {
                      const nextMatch = { ...nextRound.matches[nextMatchIdx] };
                      if (isTopSlot) nextMatch.participantAId = winnerId;
                      else nextMatch.participantBId = winnerId;
                      nextRound.matches = nextRound.matches.map((m, i) => i === nextMatchIdx ? nextMatch : m);
                    }
                    break;
                  }
                  setMockRounds(newRounds);
                } : undefined}
                onDeclareWinner={tournamentId?.startsWith('mock-') && mockRounds ? (match, winnerId) => {
                  if (!match.participantAId || !match.participantBId) return;
                  const scoreA = winnerId === match.participantAId ? 11 : 0;
                  const scoreB = winnerId === match.participantBId ? 11 : 0;
                  // Mark match completed with winner
                  const newRounds = (mockRounds || []).map(round => ({
                    ...round,
                    matches: (round.matches || []).map(m =>
                      m.id === match.id ? { ...m, scoreA, scoreB, winnerId, status: 'completed' as const } : m
                    ),
                  }));
                  // Advance winner to next round
                  let isFinals = false;
                  for (let ri = 0; ri < newRounds.length - 1; ri++) {
                    const round = newRounds[ri];
                    const nextRound = newRounds[ri + 1];
                    const scoredIdx = (round.matches || []).findIndex(m => m.id === match.id);
                    if (scoredIdx === -1) continue;
                    const nextMatchIdx = Math.floor(scoredIdx / 2);
                    const isTopSlot = scoredIdx % 2 === 0;
                    if (nextRound.matches && nextRound.matches[nextMatchIdx]) {
                      const nextMatch = { ...nextRound.matches[nextMatchIdx] };
                      if (isTopSlot) nextMatch.participantAId = winnerId;
                      else nextMatch.participantBId = winnerId;
                      nextRound.matches = nextRound.matches.map((m, i) => i === nextMatchIdx ? nextMatch : m);
                    }
                    break;
                  }
                  // Detect Finals: match is in the last round
                  const lastRound = newRounds[newRounds.length - 1];
                  if (lastRound?.matches?.some(m => m.id === match.id)) {
                    isFinals = true;
                    const winnerInfo = nameMap.get(winnerId);
                    setChampion({ id: winnerId, name: winnerInfo?.name || 'Champion', avatar: winnerInfo?.avatar });
                  }
                  setMockRounds(newRounds);
                } : undefined}
              />
            </div>
          </div>
        )}

        {/* ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {tournament.announcement && (
              <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex items-start gap-4">
                <Zap size={20} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Active Announcement</p>
                  <p className="text-sm font-bold text-blue-900">{tournament.announcement}</p>
                </div>
              </div>
            )}
            <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <Megaphone size={16} className="text-indigo-500" />
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight">Post New Announcement</h3>
              </div>
              <textarea
                value={announcementText}
                onChange={e=>setAnnouncementText(e.target.value)}
                rows={6}
                placeholder="Write your announcement… e.g. 'Bracket is set! Check-in opens at 07:30. Good luck everyone!'"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none mb-4"
              />
              <button
                onClick={handlePostAnnouncement}
                disabled={isPostingAnnouncement||!announcementText.trim()}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
              >
                {isPostingAnnouncement ? <><Loader2 size={14} className="animate-spin" /> Posting…</> : <><Megaphone size={14} /> Post Announcement</>}
              </button>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mt-3">
                Replaces the current announcement visible to all participants.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Marketing Poster Modal */}
    {tournament && (
      <MarketingPosterModal
        isOpen={showPoster}
        onClose={() => setShowPoster(false)}
        data={{
          courtName: tournament.name,
          locationName: tournament.location,
          date: tournament.date,
          startTime: tournament.startTime,
          skillLevel: tournament.skillLevel,
          availableSlots: tournament.maxPlayers - tournament.registeredCount,
          imageUrl: tournament.sponsorBannerUrl || tournament.image,
          joinLink: `${window.location.origin}/tournaments/${tournament.id}`,
          amenities: [
            tournament.format ? tournament.format.replace('_', ' ').toUpperCase() : '',
            tournament.eventType || '',
            tournament.prizePool ? `Prize: ${tournament.prizePool}` : '',
          ].filter(Boolean),
        } as PosterData}
      />
    )}

    {/* Match Score Modal */}
    {scoringMatch && (
      <MatchScoreModal
        match={scoringMatch}
        isOpen={!!scoringMatch}
        onClose={() => setScoringMatch(null)}
        onScored={() => {
          setScoringMatch(null);
          if (!tournamentId?.startsWith('mock-')) load();
        }}
        onMockScore={tournamentId?.startsWith('mock-') ? handleMockScore : undefined}
        participantNames={Object.fromEntries(
          [...nameMap.entries()].map(([id, v]) => [id, v.name])
        )}
      />
    )}

    {/* Confirmation Dialog */}
    <ConfirmDialog
      isOpen={confirmDialog.isOpen}
      title={confirmDialog.title}
      message={confirmDialog.message}
      onConfirm={handleConfirm}
      onCancel={closeConfirm}
      variant={confirmDialog.variant}
    />
  </>
  );
};

// Sub-components
const colorMap: Record<string, { card: string; value: string }> = {
  indigo:  { card: 'bg-white border-indigo-100',  value: 'text-indigo-700'  },
  violet:  { card: 'bg-white border-violet-100',  value: 'text-violet-700'  },
  emerald: { card: 'bg-white border-emerald-100', value: 'text-emerald-700' },
  amber:   { card: 'bg-white border-amber-100',   value: 'text-amber-700'   },
};

const StatCard: React.FC<{ label: string; value: string; sub: string; color: string }> = ({ label, value, sub, color }) => {
  const c = colorMap[color] || colorMap.indigo;
  return (
    <div className={`rounded-3xl border shadow-sm p-6 ${c.card}`}>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-3xl font-black ${c.value} leading-none`}>{value}</p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{sub}</p>
    </div>
  );
};

const EmptyState: React.FC<{ icon: React.ElementType; message: string }> = ({ icon: Icon, message }) => (
  <div className="py-20 text-center bg-white rounded-3xl border border-slate-100">
    <Icon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
    <p className="font-black text-slate-300 uppercase text-sm">{message}</p>
  </div>
);

export default TournamentHub;
