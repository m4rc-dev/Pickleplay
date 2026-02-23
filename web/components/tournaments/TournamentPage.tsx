import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Trophy, Calendar, MapPin, Users, Award, Clock, Shield, Swords,
  ChevronRight, CheckCircle2, Star, Megaphone, UserPlus, UserMinus, Settings2,
  AlertTriangle, Phone, FileText, BadgeCheck, X
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import {
  fetchTournamentById, fetchRegistrations, registerPlayer, withdrawRegistration,
  getPlayerRegistration, evaluateSquadEligibility, approveRegistration,
  rejectRegistration, getPendingRegistrationsDetailed, checkRegistrationConflicts,
  fetchTournamentChampion,
  type TournamentConflict, type PendingRegistrationDetailed
} from '../../services/tournaments';
import { squadsService, type Squad } from '../../services/squads';
import type { Tournament, TournamentRegistration } from '../../types';
import TournamentBracket from './TournamentBracket';
import PlayerApprovalCard from './PlayerApprovalCard';
import ConfirmDialog from '../ui/ConfirmDialog';
import Toast, { ToastType } from '../ui/Toast';

type Tab = 'overview' | 'bracket' | 'participants';

const TournamentPage: React.FC = () => {
  const { id: tournamentId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistrationDetailed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [userSquads, setUserSquads] = useState<Squad[]>([]);
  const [selectedSquadId, setSelectedSquadId] = useState<string>('');
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [conflicts, setConflicts] = useState<TournamentConflict[]>([]);
  const [showConflictsDialog, setShowConflictsDialog] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [champion, setChampion] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [squadNames, setSquadNames] = useState<Map<string, string>>(new Map());

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'info',
    isVisible: false,
  });

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'warning' | 'danger' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'warning' });

  const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'warning' | 'danger' | 'info' = 'warning') => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm, variant });
  };

  const closeConfirm = () => {
    setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'warning' });
  };

  const handleConfirm = () => {
    confirmDialog.onConfirm();
    closeConfirm();
  };

  useEffect(() => {
    if (!tournamentId) return;
    const load = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      setCurrentUserId(userId);

      const [t, regs] = await Promise.all([
        fetchTournamentById(tournamentId),
        fetchRegistrations(tournamentId),
      ]);

      setTournament(t);
      setRegistrations(regs);

      if (userId && t) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('roles')
          .eq('id', userId)
          .single();

        const { data: court } = t.courtId
          ? await supabase.from('courts').select('owner_id').eq('id', t.courtId).single()
          : { data: null };

        const isAdmin = profile?.roles?.includes('ADMIN') || false;
        const isCreator = t.organizerId === userId;
        const isCourtOwner = court?.owner_id === userId;
        const organizerStatus = isAdmin || isCreator || isCourtOwner;

        setIsOrganizer(organizerStatus);

        if (organizerStatus) {
          const pending = await getPendingRegistrationsDetailed(tournamentId);
          setPendingRegistrations(pending);
        }
      }

      if (userId) {
        const reg = await getPlayerRegistration(tournamentId, userId);
        const hasActiveRegistration = reg && reg.status !== 'rejected' && reg.status !== 'withdrawn';
        setIsRegistered(!!hasActiveRegistration);
        setRegistrationStatus(reg?.status || null);
        if (t?.registrationMode === 'squad' || t?.registrationMode === 'both') {
          const squads = await squadsService.getUserSquads(userId);
          setUserSquads(squads);
          if (squads.length > 0) setSelectedSquadId(squads[0].id);
        } else {
          setUserSquads([]);
          setSelectedSquadId('');
        }
      }
      setIsLoading(false);
    };
    load();
  }, [tournamentId]);

  const handleJoin = async () => {
    if (!currentUserId) return;
    try {
      const detectedConflicts = await checkRegistrationConflicts(tournamentId!, currentUserId);
      const errors = detectedConflicts.filter(c => c.severity === 'error');
      const warnings = detectedConflicts.filter(c => c.severity === 'warning');

      if (errors.length > 0 || warnings.length > 0) {
        setConflicts(detectedConflicts);
        setShowConflictsDialog(true);
        return;
      }
      await proceedWithRegistration();
    } catch (err: any) {
      showToast('Failed to check registration requirements', 'error');
    }
  };

  const proceedWithRegistration = async () => {
    if (!currentUserId || !tournamentId) return;
    setIsJoining(true);
    try {
      await registerPlayer(tournamentId, currentUserId, applicationMessage || undefined);
      setIsRegistered(true);
      setRegistrationStatus('pending');
      setShowConflictsDialog(false);
      setApplicationMessage('');
      const [t, regs] = await Promise.all([
        fetchTournamentById(tournamentId),
        fetchRegistrations(tournamentId),
      ]);
      setTournament(t);
      setRegistrations(regs);
      const reg = await getPlayerRegistration(tournamentId, currentUserId);
      setRegistrationStatus(reg?.status || 'pending');
      showToast('Registration submitted! Awaiting organizer approval.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to register', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!currentUserId || !tournamentId) return;
    showConfirm(
      'Withdraw from Tournament?',
      'Are you sure you want to withdraw from this tournament? You can register again later if spots are available.',
      async () => {
        setIsJoining(true);
        try {
          await withdrawRegistration(tournamentId, currentUserId);
          setIsRegistered(false);
          setRegistrationStatus(null);
          const [t, regs] = await Promise.all([
            fetchTournamentById(tournamentId),
            fetchRegistrations(tournamentId),
          ]);
          setTournament(t);
          setRegistrations(regs);
          showToast('Successfully withdrawn from tournament.', 'success');
        } catch (err: any) {
          showToast(err.message || 'Failed to withdraw', 'error');
        } finally {
          setIsJoining(false);
        }
      },
      'warning'
    );
  };

  const handleApprove = async (playerId: string) => {
    if (!currentUserId || !tournamentId) return;
    try {
      await approveRegistration(tournamentId, playerId, currentUserId);
      const [t, regs, pending] = await Promise.all([
        fetchTournamentById(tournamentId),
        fetchRegistrations(tournamentId),
        getPendingRegistrationsDetailed(tournamentId),
      ]);
      setTournament(t);
      setRegistrations(regs);
      setPendingRegistrations(pending);
      showToast('Registration approved!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to approve registration', 'error');
    }
  };

  const handleReject = async (playerId: string, reason?: string) => {
    if (!currentUserId || !tournamentId) return;
    try {
      await rejectRegistration(tournamentId, playerId, currentUserId);
      const pending = await getPendingRegistrationsDetailed(tournamentId);
      setPendingRegistrations(pending);
      showToast('Registration rejected.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to reject registration', 'error');
    }
  };

  // ── Derived state ────────────────────────────────────────
  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'bracket', label: 'Bracket' },
    { key: 'participants', label: `Participants (${registrations.length}${isOrganizer && pendingRegistrations.length > 0 ? ` +${pendingRegistrations.length} pending` : ''})` },
  ];

  const isFull = tournament ? (tournament.registeredCount || 0) >= (tournament.maxPlayers || 0) : false;
  const regMode = tournament?.registrationMode || 'player';
  const isSquadOnly = regMode === 'squad';
  const isSquadMode = regMode === 'squad' || regMode === 'both';
  const selectedSquad = userSquads.find(s => s.id === selectedSquadId);
  const squadCheck = isSquadMode && tournament
    ? evaluateSquadEligibility(tournament.squadRequirements, selectedSquad || { members_count: 0, avg_rating: 0, name: '' })
    : { eligible: true, reasons: [] };
  const squadNeeded = isSquadMode && !selectedSquad && !tournament?.allowSoloFallback;
  const squadEligibleOrFallback = !isSquadMode
    ? true
    : selectedSquad
      ? squadCheck.eligible
      : !!tournament?.allowSoloFallback;

  const canRegister = tournament?.status === 'UPCOMING'
    && !isFull
    && !isRegistered
    && !!currentUserId
    && (!isSquadOnly ? true : squadEligibleOrFallback)
    && !(isSquadOnly && squadNeeded);
  const isPast = tournament?.status === 'COMPLETED';

  if (!tournamentId) return null;

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Page header bar ── */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 sm:px-6 h-14 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-xs font-black uppercase tracking-widest text-slate-400">
          Tournaments
        </span>
        {tournament && (
          <>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-700 truncate">
              {tournament.name}
            </span>
          </>
        )}
      </div>

      {/* ── Body ── */}
      {isLoading ? (
        <div className="px-4 sm:px-6 py-8 space-y-4 max-w-3xl mx-auto">
          <div className="h-56 bg-slate-200 animate-pulse rounded-3xl" />
          <div className="h-10 bg-slate-100 animate-pulse rounded-2xl" />
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        </div>
      ) : !tournament ? (
        <div className="flex flex-col items-center justify-center py-32 text-center px-4">
          <Trophy className="w-16 h-16 text-slate-200 mb-4" />
          <p className="font-black text-slate-400 uppercase tracking-widest">Tournament not found</p>
          <button
            onClick={() => navigate('/tournaments')}
            className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors"
          >
            Back to Tournaments
          </button>
        </div>
      ) : (
        <div className="w-full">
          {/* ── Hero image ── */}
          <div className="relative h-56 sm:h-72 overflow-hidden">
            <img
              src={tournament.image || 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=1200'}
              alt={tournament.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

            {/* Badges */}
            <div className="absolute bottom-4 left-6 flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                tournament.status === 'LIVE' ? 'bg-emerald-500 text-white' :
                tournament.status === 'UPCOMING' ? 'bg-blue-600 text-white' :
                'bg-slate-600 text-white'
              }`}>
                {tournament.status}
              </span>
              {tournament.isFeatured && (
                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-yellow-400 text-yellow-900 flex items-center gap-1">
                  <Star size={10} /> Featured
                </span>
              )}
              {tournament.format && (
                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/20 text-white backdrop-blur-sm">
                  {tournament.format.replace('_', ' ')}
                </span>
              )}
            </div>

            {/* Tournament name */}
            <div className="absolute bottom-4 right-6 text-right max-w-[60%]">
              <h1 className="text-2xl font-black text-white uppercase tracking-tight drop-shadow-lg leading-tight">
                {tournament.name}
              </h1>
            </div>
          </div>

          {/* ── Tab bar ── */}
          <div className="flex border-b border-slate-100 bg-white px-4 sm:px-8 sticky top-14 z-20">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-4 font-black text-[10px] uppercase tracking-widest transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab content ── */}
          <div className={activeTab === 'bracket' ? 'pb-24' : 'px-4 sm:px-8 py-6 pb-28 max-w-3xl mx-auto'}>
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Champion banner */}
                {tournament.status === 'COMPLETED' && champion && (
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-yellow-100 flex items-center justify-center shrink-0">
                      {champion.avatar
                        ? <img src={champion.avatar} alt={champion.name} className="w-full h-full rounded-2xl object-cover" />
                        : <Trophy size={28} className="text-yellow-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest mb-0.5">Tournament Champion</p>
                      <p className="text-lg font-black text-slate-900 uppercase tracking-tight truncate">{champion.name}</p>
                    </div>
                    <Trophy size={36} className="text-yellow-200 shrink-0" />
                  </div>
                )}

                {/* Announcement */}
                {tournament.announcement && (
                  <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <Megaphone size={18} className="text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-sm font-bold text-blue-900">{tournament.announcement}</p>
                  </div>
                )}

                {/* Info cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <InfoCard icon={Calendar} label="Date" value={new Date(tournament.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} />
                  <InfoCard icon={Clock} label="Start" value={tournament.startTime || '—'} />
                  <InfoCard icon={MapPin} label="Venue" value={tournament.location} />
                  <InfoCard icon={Users} label="Players" value={`${tournament.registeredCount} / ${tournament.maxPlayers}`} />
                </div>

                {/* Pending approvals indicator */}
                {isOrganizer && pendingRegistrations.length > 0 && (
                  <button
                    onClick={() => setActiveTab('participants')}
                    className="w-full bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-amber-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Clock className="text-amber-600" size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-amber-900">
                          {pendingRegistrations.length} {pendingRegistrations.length === 1 ? 'Registration' : 'Registrations'} Pending
                        </p>
                        <p className="text-xs text-amber-600 font-medium">Review in Participants tab</p>
                      </div>
                    </div>
                    <ChevronRight className="text-amber-400" size={20} />
                  </button>
                )}

                {/* Description */}
                {tournament.description && (
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">About</h3>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{tournament.description}</p>
                  </div>
                )}

                {/* Details grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tournament.eventType && (
                    <DetailRow icon={Swords} label="Event Type" value={tournament.eventType.replace('_', ' ')} />
                  )}
                  {tournament.category && (
                    <DetailRow icon={Shield} label="Category" value={tournament.category} />
                  )}
                  {tournament.skillLevel && (
                    <DetailRow icon={Trophy} label="Skill Level" value={tournament.skillLevel} />
                  )}
                  {tournament.checkInTime && (
                    <DetailRow icon={Clock} label="Check-in" value={tournament.checkInTime} />
                  )}
                  {tournament.numCourts && (
                    <DetailRow icon={MapPin} label="Courts" value={`${tournament.numCourts}`} />
                  )}
                  {tournament.registrationDeadline && (
                    <DetailRow icon={Calendar} label="Reg. Deadline" value={new Date(tournament.registrationDeadline).toLocaleDateString()} />
                  )}
                </div>

                {/* Registration mode */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Registration Mode</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${regMode === 'squad' ? 'bg-slate-900 text-white' : 'bg-blue-50 text-blue-700'}`}>
                        {regMode === 'both' ? 'Players + Squads' : regMode === 'squad' ? 'Squads Only' : 'Players'}
                      </span>
                      {tournament.allowSoloFallback && regMode !== 'player' && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100">Solo fallback allowed</span>
                      )}
                    </div>
                  </div>

                  {(tournament.squadRequirements && (tournament.registrationMode === 'squad' || tournament.registrationMode === 'both')) && (
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Squad Requirements</p>
                      <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                        <li>Min size: {tournament.squadRequirements.minSize ?? 2}</li>
                        {tournament.squadRequirements.ratingMin !== undefined && (
                          <li>Rating min: {tournament.squadRequirements.ratingMin}</li>
                        )}
                        {tournament.squadRequirements.ratingMax !== undefined && (
                          <li>Rating max: {tournament.squadRequirements.ratingMax}</li>
                        )}
                        {tournament.squadRequirements.regions && tournament.squadRequirements.regions.length > 0 && (
                          <li>Regions: {tournament.squadRequirements.regions.join(', ')}</li>
                        )}
                        <li>Membership: {tournament.squadRequirements.membership || 'any'}</li>
                      </ul>
                      {isSquadMode && userSquads.length > 0 && (
                        <div className="mt-3 text-xs text-slate-500 font-bold">
                          You have {userSquads.length} squad{userSquads.length > 1 ? 's' : ''} that could register.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Rules */}
                {tournament.rules && (
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rules</h3>
                    <div className="bg-slate-50 rounded-2xl p-4">
                      <p className="text-sm text-slate-600 whitespace-pre-line">{tournament.rules}</p>
                    </div>
                  </div>
                )}

                {/* Prizes */}
                {(tournament.prizePool || tournament.prizes) && (
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Prizes</h3>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                      {tournament.prizePool && (
                        <p className="text-lg font-black text-emerald-700 mb-1">Prize Pool: {tournament.prizePool}</p>
                      )}
                      {tournament.prizes && (
                        <p className="text-sm text-emerald-600 whitespace-pre-line">{tournament.prizes}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'bracket' && (
              <div className="animate-in fade-in duration-200 w-full">
                <TournamentBracket
                  tournamentId={tournamentId}
                  format={tournament.format || 'single_elim'}
                />
              </div>
            )}

            {activeTab === 'participants' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {regMode === 'squad' && (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-600 font-bold">
                    Squad-based signups are enabled for this event.
                  </div>
                )}

                {/* Pending approvals — organizers only */}
                {isOrganizer && pendingRegistrations.length > 0 && (
                  <div className="space-y-3 pb-4 border-b border-amber-100">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600">Pending Approvals</h4>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black">{pendingRegistrations.length}</span>
                    </div>
                    {pendingRegistrations.map((reg) => (
                      <PlayerApprovalCard
                        key={reg.id}
                        registration={reg}
                        tournamentId={tournamentId}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        isProcessing={isJoining}
                      />
                    ))}
                  </div>
                )}

                {regMode === 'squad' || regMode === 'both' ? (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Squads</h4>
                    {(() => {
                      const squadRegs = registrations.filter(r => (r as any).squadId);
                      if (squadRegs.length === 0) {
                        return (
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-400 font-bold">
                            No squad registrations yet.
                          </div>
                        );
                      }
                      // Group by squadId
                      const grouped = new Map<string, typeof squadRegs>();
                      squadRegs.forEach(r => {
                        const sid = (r as any).squadId as string;
                        if (!grouped.has(sid)) grouped.set(sid, []);
                        grouped.get(sid)!.push(r);
                      });
                      return Array.from(grouped.entries()).map(([sid, members]) => (
                        <div key={sid} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {squadNames.get(sid) || `Squad ${sid.slice(0, 6)}…`}
                          </p>
                          {members.map(m => (
                            <div key={m.id} className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-500">
                                {(m.player?.full_name || '?')[0]}
                              </div>
                              <span className="text-sm font-bold text-slate-800">{m.player?.full_name || `Player ${m.playerId.slice(0,6)}…`}</span>
                            </div>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>
                ) : null}

                {registrations.length === 0 ? (
                  <div className="text-center py-16">
                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="font-black text-slate-300 uppercase text-sm">No participants yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Players</h4>
                    {registrations.map((reg, i) => (
                      <div key={reg.id} className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-slate-100">
                        <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-slate-900">{reg.player?.full_name || `${reg.playerId.slice(0, 8)}...`}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">
                            Registered {new Date(reg.registeredAt).toLocaleDateString()}
                          </p>
                        </div>
                        {reg.checkedIn && (
                          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                            Checked In
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Sticky footer action ── */}
          <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-slate-100 px-4 py-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
              {isOrganizer ? (
                <button
                  onClick={() => navigate(`/tournaments-admin/manage/${tournamentId}`)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                >
                  <Settings2 size={16} /> Manage Tournament
                </button>
              ) : !isPast && (
                <>
                  {registrationStatus === 'rejected' ? (
                    <div className="space-y-3">
                      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 text-center">
                        <p className="text-sm font-bold text-rose-600 mb-0.5">Registration Not Approved</p>
                        <p className="text-xs text-rose-500">You can reapply below.</p>
                      </div>
                      <button
                        onClick={handleJoin}
                        disabled={isJoining || !canRegister}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          canRegister ? 'bg-slate-900 text-white hover:bg-indigo-600 shadow-lg shadow-slate-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <UserPlus size={18} /> {isJoining ? 'Reapplying...' : 'Reapply'}
                      </button>
                    </div>
                  ) : isRegistered ? (
                    <div className="flex gap-3">
                      <div className={`flex-[3] flex items-center justify-center gap-2 py-4 rounded-2xl border font-black text-xs uppercase tracking-widest ${
                        registrationStatus === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {registrationStatus === 'pending' ? 'Pending Approval' : "You're Registered ✓"}
                      </div>
                      <button
                        onClick={handleLeave}
                        disabled={isJoining}
                        className="flex-1 flex items-center justify-center gap-2 bg-rose-50 text-rose-500 hover:bg-rose-100 py-4 rounded-2xl border border-rose-100 font-black text-[10px] uppercase tracking-widest transition-colors disabled:opacity-50"
                      >
                        <UserMinus size={16} /> Withdraw
                      </button>
                    </div>
                  ) : canRegister ? (
                    <div className="space-y-3">
                      {isSquadMode && (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Select Squad</p>
                          <select
                            value={selectedSquadId}
                            onChange={e => setSelectedSquadId(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700"
                          >
                            <option value="">Choose a squad</option>
                            {userSquads.map(s => (
                              <option key={s.id} value={s.id}>{s.name} — {s.members_count} members</option>
                            ))}
                          </select>
                          {selectedSquad && squadCheck.reasons.length > 0 && (
                            <p className="text-[11px] text-rose-500 font-bold mt-1">{squadCheck.reasons[0]}</p>
                          )}
                          {!selectedSquad && isSquadOnly && !tournament?.allowSoloFallback && (
                            <p className="text-[11px] text-rose-500 font-bold mt-1">Select a squad to register.</p>
                          )}
                        </div>
                      )}
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                          Message to Organizer (Optional)
                        </label>
                        <textarea
                          value={applicationMessage}
                          onChange={(e) => setApplicationMessage(e.target.value)}
                          placeholder="Tell the organizer why you'd like to join..."
                          className="w-full p-2 text-sm border border-slate-200 rounded-xl resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          maxLength={500}
                        />
                        <p className="text-[9px] text-slate-400 text-right mt-1">{applicationMessage.length}/500</p>
                      </div>
                      <button
                        onClick={handleJoin}
                        disabled={isJoining || (isSquadOnly && !squadEligibleOrFallback)}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                      >
                        {isJoining ? 'Registering...' : <><UserPlus size={16} /> Register for Tournament</>}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-slate-400 font-bold text-xs uppercase">
                        {isFull ? 'Tournament is full'
                          : !currentUserId ? 'Log in to register'
                          : isSquadOnly
                            ? tournament?.allowSoloFallback ? 'Solo fallback allowed if no squad selected' : 'Squad signup required'
                            : 'Registration closed'}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Dialogs ── */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
        variant={confirmDialog.variant}
      />

      {/* Conflicts dialog */}
      {showConflictsDialog && conflicts.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${conflicts.some(c => c.severity === 'error') ? 'bg-rose-100' : 'bg-amber-100'}`}>
                  <AlertTriangle size={24} className={conflicts.some(c => c.severity === 'error') ? 'text-rose-600' : 'text-amber-600'} />
                </div>
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tight text-slate-900">
                    {conflicts.some(c => c.severity === 'error') ? 'Registration Blocked' : 'Registration Warnings'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {conflicts.filter(c => c.severity === 'error').length > 0 ? 'Resolve these issues before registering' : 'Review before continuing'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowConflictsDialog(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto">
              {conflicts.map((conflict, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border ${conflict.severity === 'error' ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${conflict.severity === 'error' ? 'text-rose-600' : 'text-amber-600'}`}>
                      {conflict.type === 'verification' && conflict.field === 'phone' && <Phone size={18} />}
                      {conflict.type === 'verification' && conflict.field === 'id' && <FileText size={18} />}
                      {conflict.type === 'verification' && conflict.field === 'skill' && <BadgeCheck size={18} />}
                      {conflict.type !== 'verification' && <AlertTriangle size={18} />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${conflict.severity === 'error' ? 'text-rose-900' : 'text-amber-900'}`}>{conflict.message}</p>
                      {conflict.type === 'verification' && (
                        <button
                          onClick={() => { setShowConflictsDialog(false); window.location.href = '/profile?tab=verification'; }}
                          className={`mt-2 text-xs font-black uppercase tracking-wide ${conflict.severity === 'error' ? 'text-rose-600 hover:text-rose-700' : 'text-amber-600 hover:text-amber-700'}`}
                        >
                          Complete Verification →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowConflictsDialog(false)} className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 font-black text-xs uppercase tracking-widest text-slate-700 transition-colors">
                Cancel
              </button>
              {!conflicts.some(c => c.severity === 'error') && (
                <button
                  onClick={proceedWithRegistration}
                  disabled={isJoining}
                  className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
                >
                  {isJoining ? 'Registering...' : 'Register Anyway'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const InfoCard: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="bg-white rounded-2xl p-4 text-center border border-slate-100">
    <Icon size={18} className="text-blue-600 mx-auto mb-2" />
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-bold text-slate-900 mt-1 truncate">{value}</p>
  </div>
);

const DetailRow: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-slate-100">
    <Icon size={16} className="text-blue-600 shrink-0" />
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-slate-900 capitalize">{value}</p>
    </div>
  </div>
);

export default TournamentPage;
