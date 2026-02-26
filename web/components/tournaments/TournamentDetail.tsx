import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  X, Trophy, Calendar, MapPin, Users, Award, Clock, Shield, Swords,
  ChevronRight, CheckCircle2, Star, Megaphone, UserPlus, UserMinus, Settings2,
  AlertTriangle, Phone, FileText, BadgeCheck
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import {
  fetchTournamentById, fetchRegistrations, registerPlayer, withdrawRegistration,
  getPlayerRegistration, evaluateSquadEligibility, approveRegistration, 
  rejectRegistration, getPendingRegistrationsDetailed, checkRegistrationConflicts,
  type TournamentConflict, type PendingRegistrationDetailed
} from '../../services/tournaments';
import { squadsService, type Squad } from '../../services/squads';
import type { Tournament, TournamentRegistration } from '../../types';
import TournamentBracket from './TournamentBracket';
import PlayerApprovalCard from './PlayerApprovalCard';
import ConfirmDialog from '../ui/ConfirmDialog';
import Toast, { ToastType } from '../ui/Toast';

interface Props {
  tournamentId: string;
  isOpen: boolean;
  onClose: () => void;
  /** When true, renders Manage button instead of Register/Withdraw (court-owner view) */
  isOwnerView?: boolean;
  onManage?: () => void;
}

type Tab = 'overview' | 'bracket' | 'participants';

const TournamentDetail: React.FC<Props> = ({ tournamentId, isOpen, onClose, isOwnerView = false, onManage }) => {
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

  // Confirm dialog helpers
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
    if (!isOpen) return;
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

      // Check if user is organizer
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
        
        console.log('🔐 Organizer Check:', {
          userId,
          tournamentId,
          roles: profile?.roles,
          isAdmin,
          isCreator,
          organizerId: t.organizerId,
          isCourtOwner,
          courtOwnerId: court?.owner_id,
          finalStatus: organizerStatus
        });
        
        setIsOrganizer(organizerStatus);

        // Load pending registrations if organizer
        if (organizerStatus) {
          const pending = await getPendingRegistrationsDetailed(tournamentId);
          console.log('⏳ Pending Registrations Loaded (Detailed):', pending.length, pending);
          setPendingRegistrations(pending);
        }
      }

      if (userId) {
        const reg = await getPlayerRegistration(tournamentId, userId);
        const hasActiveRegistration = reg && reg.status !== 'rejected' && reg.status !== 'withdrawn';
        setIsRegistered(!!hasActiveRegistration);
        setRegistrationStatus(reg?.status || null);
        // Load user's squads if squad registration is enabled
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
  }, [tournamentId, isOpen]);

  // Debug: Log when organizer status or pending registrations change
  useEffect(() => {
    console.log('📊 State Update:', {
      isOrganizer,
      pendingCount: pendingRegistrations.length,
      shouldShowPending: isOrganizer && pendingRegistrations.length > 0,
      activeTab
    });
  }, [isOrganizer, pendingRegistrations, activeTab]);

  const handleJoin = async () => {
    if (!currentUserId) return;
    
    // Check for conflicts first
    try {
      console.log('🔍 Checking for conflicts...');
      const detectedConflicts = await checkRegistrationConflicts(tournamentId, currentUserId);
      
      // Separate errors from warnings
      const errors = detectedConflicts.filter(c => c.severity === 'error');
      const warnings = detectedConflicts.filter(c => c.severity === 'warning');
      
      console.log('⚠️ Conflicts detected:', { errors: errors.length, warnings: warnings.length });
      
      // If there are errors, block registration
      if (errors.length > 0) {
        setConflicts(detectedConflicts);
        setShowConflictsDialog(true);
        return;
      }
      
      // If there are warnings, show dialog but allow override
      if (warnings.length > 0) {
        setConflicts(detectedConflicts);
        setShowConflictsDialog(true);
        return;
      }
      
      // No conflicts, proceed with registration
      await proceedWithRegistration();
      
    } catch (err: any) {
      console.error('❌ Conflict check failed:', err);
      showToast('Failed to check registration requirements', 'error');
    }
  };

  const proceedWithRegistration = async () => {
    if (!currentUserId) return;
    setIsJoining(true);
    try {
      console.log('📝 Registering player:', { tournamentId, playerId: currentUserId, applicationMessage });
      await registerPlayer(tournamentId, currentUserId, applicationMessage || undefined);
      setIsRegistered(true);
      setRegistrationStatus('pending');
      setShowConflictsDialog(false);
      setApplicationMessage(''); // Clear message after registration
      // Refresh data
      const [t, regs] = await Promise.all([
        fetchTournamentById(tournamentId),
        fetchRegistrations(tournamentId),
      ]);
      setTournament(t);
      setRegistrations(regs);
      const reg = await getPlayerRegistration(tournamentId, currentUserId);
      console.log('✅ Registration created:', reg);
      setRegistrationStatus(reg?.status || 'pending');
      showToast('Registration submitted! Awaiting organizer approval.', 'success');
    } catch (err: any) {
      console.error('❌ Registration failed:', err);
      showToast(err.message || 'Failed to register', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!currentUserId) return;
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
    if (!currentUserId) return;
    console.log('✅ Approving registration:', { tournamentId, playerId, organizerId: currentUserId });
    try {
      await approveRegistration(tournamentId, playerId, currentUserId);
      // Refresh data
      const [t, regs, pending] = await Promise.all([
        fetchTournamentById(tournamentId),
        fetchRegistrations(tournamentId),
        getPendingRegistrationsDetailed(tournamentId),
      ]);
      console.log('📊 After approval - Confirmed:', regs.length, 'Pending:', pending.length);
      setTournament(t);
      setRegistrations(regs);
      setPendingRegistrations(pending);
      showToast('Registration approved!', 'success');
    } catch (err: any) {
      console.error('❌ Approval failed:', err);
      showToast(err.message || 'Failed to approve registration', 'error');
    }
  };

  const handleReject = async (playerId: string, reason?: string) => {
    if (!currentUserId) return;
    console.log('❌ Rejecting registration:', { tournamentId, playerId, organizerId: currentUserId, reason });
    try {
      await rejectRegistration(tournamentId, playerId, currentUserId);
      // Refresh data
      const pending = await getPendingRegistrationsDetailed(tournamentId);
      console.log('📊 After rejection - Pending:', pending.length);
      setPendingRegistrations(pending);
      showToast('Registration rejected.', 'info');
    } catch (err: any) {
      console.error('❌ Rejection failed:', err);
      showToast(err.message || 'Failed to reject registration', 'error');
    }
  };

  if (!isOpen) return null;

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
  const squadCheck = isSquadMode && tournament ? evaluateSquadEligibility(tournament.squadRequirements, selectedSquad || { members_count: 0, avg_rating: 0, name: '' }) : { eligible: true, reasons: [] };
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

  return (
    <>
      {ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Hero / header */}
        {isLoading ? (
          <div className="h-64 bg-slate-100 animate-pulse rounded-t-[40px]" />
        ) : tournament ? (
          <>
            <div className="relative h-56 shrink-0 overflow-hidden rounded-t-[40px]">
              <img
                src={tournament.image || 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=1200'}
                alt={tournament.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors">
                <X size={20} />
              </button>

              {/* Badges on image */}
              <div className="absolute bottom-4 left-6 flex items-center gap-2">
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

              {/* Title on image */}
              <div className="absolute bottom-4 right-6 text-right">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight drop-shadow-lg">{tournament.name}</h2>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-slate-100 px-6 shrink-0">
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

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Announcement banner */}
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

                  {/* Pending approvals indicator for organizers */}
                  {isOrganizer && pendingRegistrations.length > 0 && (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between">
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
                    </div>
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
                <div className="animate-in fade-in duration-200">
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
                      Squad-based signups are enabled for this event. Squad roster display will expand as squad registrations roll out.
                    </div>
                  )}

                  {/* Pending Approvals - Only visible to organizers */}
                  {isOrganizer && pendingRegistrations.length > 0 && (
                    <div className="space-y-3 pb-4 border-b border-amber-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                            Pending Approvals
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black">
                            {pendingRegistrations.length}
                          </span>
                        </div>
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
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-600">
                        Squad rosters will appear here once squad registrations are supported in the backend.
                      </div>
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
                        <div key={reg.id} className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4">
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

            {/* Footer action */}
            {isOwnerView ? (
              <div className="p-6 border-t border-slate-100 shrink-0">
                <button
                  onClick={onManage}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                >
                  <Settings2 size={16} /> Manage Tournament
                </button>
              </div>
            ) : !isPast && (
              <div className="p-6 border-t border-slate-100 shrink-0">
                {registrationStatus === 'rejected' ? (
                  <div className="space-y-3">
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center">
                      <p className="text-sm font-bold text-rose-600 mb-1">Registration Not Approved</p>
                      <p className="text-xs text-rose-500">Your registration was not approved by the organizer. You can reapply if you'd like.</p>
                    </div>
                    <button
                      onClick={handleJoin}
                      disabled={isJoining || !canRegister}
                      className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        canRegister
                          ? 'bg-slate-900 text-white hover:bg-indigo-600 shadow-lg shadow-slate-200'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <UserPlus size={18} /> {isJoining ? 'Reapplying...' : 'Reapply'}
                    </button>
                  </div>
                ) : isRegistered ? (
                  <div className="flex gap-3">
                    <div className={`flex-[3] flex items-center justify-center gap-2 py-4 rounded-2xl border font-black text-xs uppercase tracking-widest ${registrationStatus === 'pending'
                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                      {registrationStatus === 'pending' ? 'Pending Approval' : "You're Registered"}
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
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                          <div className="flex-1">
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
                              <p className="text-[11px] text-rose-500 font-bold mt-1">Select a squad to register. Solo fallback not allowed.</p>
                            )}
                            {!selectedSquad && tournament?.allowSoloFallback && (
                              <p className="text-[11px] text-slate-500 font-bold mt-1">No squad? Solo allowed as fallback.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Application Message */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                        Message to Organizer (Optional)
                      </label>
                      <textarea
                        value={applicationMessage}
                        onChange={(e) => setApplicationMessage(e.target.value)}
                        placeholder="Tell the organizer why you'd like to join this tournament..."
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
                      {isFull
                        ? 'Tournament is full'
                        : !currentUserId
                          ? 'Log in to register'
                          : isSquadOnly
                              ? tournament?.allowSoloFallback
                                ? 'Solo fallback allowed if no squad selected'
                                : 'Squad signup required (select a squad)'
                              : 'Registration closed'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="p-16 text-center">
            <Trophy className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="font-black text-slate-400 uppercase">Tournament not found</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 bg-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">
              Close
            </button>
          </div>
        )}
      </div>
    </div>,
        document.body
      )}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
        variant={confirmDialog.variant}
      />
      
      {/* Conflicts Dialog */}
      {showConflictsDialog && conflicts.length > 0 && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-in zoom-in duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    conflicts.some(c => c.severity === 'error')
                      ? 'bg-rose-100'
                      : 'bg-amber-100'
                  }`}>
                    <AlertTriangle 
                      size={24} 
                      className={conflicts.some(c => c.severity === 'error') ? 'text-rose-600' : 'text-amber-600'} 
                    />
                  </div>
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-tight text-slate-900">
                      {conflicts.some(c => c.severity === 'error') ? 'Registration Blocked' : 'Registration Warnings'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {conflicts.filter(c => c.severity === 'error').length > 0
                        ? 'You must resolve these issues before registering'
                        : 'Review these warnings before continuing'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConflictsDialog(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Conflicts List */}
            <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto">
              {conflicts.map((conflict, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border ${
                    conflict.severity === 'error'
                      ? 'bg-rose-50 border-rose-100'
                      : 'bg-amber-50 border-amber-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${
                      conflict.severity === 'error' ? 'text-rose-600' : 'text-amber-600'
                    }`}>
                      {conflict.type === 'verification' && conflict.field === 'phone' && <Phone size={18} />}
                      {conflict.type === 'verification' && conflict.field === 'id' && <FileText size={18} />}
                      {conflict.type === 'verification' && conflict.field === 'skill' && <BadgeCheck size={18} />}
                      {conflict.type !== 'verification' && <AlertTriangle size={18} />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${
                        conflict.severity === 'error' ? 'text-rose-900' : 'text-amber-900'
                      }`}>
                        {conflict.message}
                      </p>
                      {conflict.type === 'verification' && (
                        <button
                          onClick={() => {
                            setShowConflictsDialog(false);
                            // Navigate to profile verification section
                            window.location.href = '/profile?tab=verification';
                          }}
                          className={`mt-2 text-xs font-black uppercase tracking-wide ${
                            conflict.severity === 'error' ? 'text-rose-600 hover:text-rose-700' : 'text-amber-600 hover:text-amber-700'
                          }`}
                        >
                          Complete Verification →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowConflictsDialog(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 font-black text-xs uppercase tracking-widest text-slate-700 transition-colors"
              >
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
        </div>,
        document.body
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </>
  );
};

const InfoCard: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="bg-slate-50 rounded-2xl p-4 text-center">
    <Icon size={18} className="text-blue-600 mx-auto mb-2" />
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-bold text-slate-900 mt-1 truncate">{value}</p>
  </div>
);

const DetailRow: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-4">
    <Icon size={16} className="text-blue-600 shrink-0" />
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-slate-900 capitalize">{value}</p>
    </div>
  </div>
);

export default TournamentDetail;
