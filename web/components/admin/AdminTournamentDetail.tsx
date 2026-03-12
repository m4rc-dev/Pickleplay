import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  X, Trophy, Calendar, MapPin, Users, PhilippinePeso, Clock, CheckCircle2,
  XCircle, Star, Building2, FileText, Megaphone, Award, Shield, Eye,
  AlertCircle, TrendingUp, User, Grid3x3, Timer, Flag, Loader2
} from 'lucide-react';
import { fetchTournamentById, fetchRegistrations, approveTournament, rejectTournament, featureTournament } from '../../services/tournaments';
import type { Tournament, TournamentRegistration } from '../../types';
import ConfirmDialog from '../ui/ConfirmDialog';

interface Props {
  tournamentId: string;
  isOpen: boolean;
  onClose: () => void;
  onActionComplete?: () => void;
}

const AdminTournamentDetail: React.FC<Props> = ({ tournamentId, isOpen, onClose, onActionComplete }) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'warning' | 'danger' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'warning' });

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !tournamentId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const [t, regs] = await Promise.all([
          fetchTournamentById(tournamentId),
          fetchRegistrations(tournamentId),
        ]);
        setTournament(t);
        setRegistrations(regs);
      } catch (err) {
        console.error('Failed to load tournament details', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [tournamentId, isOpen]);

  // Click outside to close
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  }, [onClose]);

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

  const handleApprove = async () => {
    if (!tournament || isProcessing) return;
    setIsProcessing(true);
    try {
      await approveTournament(tournament.id);
      setTournament(await fetchTournamentById(tournament.id));
      onActionComplete?.();
    } catch (err: any) {
      alert(err.message || 'Failed to approve tournament');
    } finally { setIsProcessing(false); }
  };

  const handleReject = async () => {
    if (!tournament || isProcessing) return;
    showConfirm(
      'Reject Tournament?',
      'This will permanently reject this tournament submission. The tournament organizer will need to resubmit if they want to proceed. This action cannot be undone.',
      async () => {
        setIsProcessing(true);
        try {
          await rejectTournament(tournament.id);
          setTournament(await fetchTournamentById(tournament.id));
          onActionComplete?.();
        } catch (err: any) {
          alert(err.message || 'Failed to reject tournament');
        } finally {
          setIsProcessing(false);
        }
      },
      'danger'
    );
  };

  const handleFeature = async () => {
    if (!tournament || isProcessing) return;
    setIsProcessing(true);
    try {
      await featureTournament(tournament.id, !tournament.isFeatured);
      setTournament(await fetchTournamentById(tournament.id));
      onActionComplete?.();
    } catch (err: any) {
      alert(err.message || 'Failed to update feature status');
    } finally { setIsProcessing(false); }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      {/* ── Backdrop — click outside to close ── */}
      <div
        ref={backdropRef}
        onClick={handleBackdropClick}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', animation: 'atdFadeIn 150ms ease both' }}
    >
      {/* ── Panel ── */}
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'atdSlideUp 220ms cubic-bezier(0.22,1,0.36,1) both' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Sticky Header ── */}
        <div className="flex-none flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-2xl">
              <Trophy className="text-amber-600" size={22} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Admin Review</p>
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                {isLoading ? 'Loading…' : (tournament?.name ?? 'Tournament Details')}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 size={40} className="text-indigo-500 animate-spin" />
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Loading details…</p>
            </div>
          )}

          {/* Not found */}
          {!isLoading && !tournament && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <AlertCircle size={48} className="text-slate-300" />
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Tournament not found</p>
            </div>
          )}

          {/* Content */}
          {!isLoading && tournament && (
            <>
              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                <StatusBadge show={tournament.isApproved === true}  color="emerald" icon={<CheckCircle2 size={12}/>} label="Approved" />
                <StatusBadge show={tournament.isApproved === false} color="rose"    icon={<XCircle size={12}/>}      label="Rejected" />
                <StatusBadge
                  show={tournament.isApproved === null || tournament.isApproved === undefined}
                  color="amber" icon={<Clock size={12}/>} label="Pending Approval" pulse
                />
                <StatusBadge show={!!tournament.isFeatured} color="yellow" icon={<Star size={12}/>} label="Featured" />
                <StatusBadge
                  show
                  color={tournament.status === 'LIVE' ? 'red' : tournament.status === 'UPCOMING' ? 'blue' : 'slate'}
                  icon={<Flag size={12}/>}
                  label={tournament.status}
                  pulse={tournament.status === 'LIVE'}
                />
              </div>

              {/* Hero image */}
              {tournament.image && (
                <div className="w-full h-48 rounded-3xl overflow-hidden border border-slate-100">
                  <img src={tournament.image} alt={tournament.name} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Info card grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <InfoCard title="Basic Information" icon={<FileText size={15}/>} color="indigo">
                  <InfoRow label="Tournament Name" value={tournament.name} />
                  <InfoRow label="Skill Level" value={tournament.skillLevel} />
                  <InfoRow label="Location" value={tournament.location} icon={<MapPin size={12}/>} />
                  <InfoRow label="Max Players" value={String(tournament.maxPlayers)} icon={<Users size={12}/>} />
                  {tournament.description && <InfoRow label="Description" value={tournament.description} />}
                </InfoCard>

                <InfoCard title="Event Details" icon={<Trophy size={15}/>} color="violet">
                  {tournament.format    && <InfoRow label="Format"   value={tournament.format.replace(/_/g,' ').toUpperCase()} icon={<Grid3x3 size={12}/>} />}
                  {tournament.eventType && <InfoRow label="Type"     value={tournament.eventType.replace(/_/g,' ').toUpperCase()} icon={<Users size={12}/>} />}
                  {tournament.category  && <InfoRow label="Category" value={tournament.category.toUpperCase()} icon={<Award size={12}/>} />}
                  {tournament.numCourts && <InfoRow label="Courts"   value={String(tournament.numCourts)} icon={<Building2 size={12}/>} />}
                </InfoCard>

                <InfoCard title="Schedule" icon={<Calendar size={15}/>} color="blue">
                  <InfoRow
                    label="Date"
                    value={new Date(tournament.date).toLocaleDateString('en-US',{weekday:'short',year:'numeric',month:'short',day:'numeric'})}
                    icon={<Calendar size={12}/>}
                  />
                  {tournament.startTime            && <InfoRow label="Start Time"    value={tournament.startTime} icon={<Clock size={12}/>} />}
                  {tournament.checkInTime          && <InfoRow label="Check-In"      value={tournament.checkInTime} icon={<Timer size={12}/>} />}
                  {tournament.registrationDeadline && <InfoRow label="Reg. Deadline" value={new Date(tournament.registrationDeadline).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} icon={<Flag size={12}/>} />}
                </InfoCard>

                <InfoCard title="Financial" icon={<PhilippinePeso size={15}/>} color="green">
                  {tournament.prizePool
                    ? <>
                        <InfoRow label="Prize Pool" value={tournament.prizePool} icon={<PhilippinePeso size={12}/>} />
                        {tournament.prizes && <InfoRow label="Distribution" value={tournament.prizes} />}
                      </>
                    : <p className="text-xs text-slate-400 italic">No prize pool set.</p>
                  }
                </InfoCard>

                <InfoCard title="Participants" icon={<Users size={15}/>} color="purple">
                  <InfoRow label="Registered" value={`${tournament.registeredCount} / ${tournament.maxPlayers}`} icon={<Users size={12}/>} />
                  <InfoRow label="Capacity" value={`${Math.round((tournament.registeredCount / tournament.maxPlayers) * 100)}%`} icon={<TrendingUp size={12}/>} />
                  {registrations.length > 0 && (
                    <div className="mt-2 max-h-36 overflow-y-auto rounded-xl bg-white border border-purple-100 p-3 space-y-1.5">
                      {registrations.map((reg, idx) => (
                        <div key={reg.id} className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400 w-5 font-black shrink-0">{idx + 1}.</span>
                          <User size={12} className="text-purple-500 shrink-0" />
                          <span className="font-bold text-slate-700 flex-1 truncate">{reg.playerName || `Player ${idx + 1}`}</span>
                          {reg.status && (
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                              reg.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' :
                              reg.status === 'waitlisted' ? 'bg-amber-50 text-amber-600' :
                              'bg-slate-100 text-slate-400'
                            }`}>{reg.status}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </InfoCard>

                {(tournament.rules || tournament.announcement) && (
                  <InfoCard title="Rules & Announcements" icon={<Shield size={15}/>} color="amber">
                    {tournament.rules        && <InfoRow label="Rules"        value={tournament.rules} />}
                    {tournament.announcement && <InfoRow label="Announcement" value={tournament.announcement} icon={<Megaphone size={12}/>} />}
                  </InfoCard>
                )}

                {tournament.sponsorBannerUrl && (
                  <InfoCard title="Sponsor" icon={<Star size={15}/>} color="slate">
                    <div className="w-full h-24 rounded-xl overflow-hidden border border-slate-200 bg-white">
                      <img src={tournament.sponsorBannerUrl} alt="Sponsor" className="w-full h-full object-contain" />
                    </div>
                  </InfoCard>
                )}

                <InfoCard title="Metadata" icon={<Eye size={15}/>} color="slate">
                  {tournament.organizerId && <InfoRow label="Organizer ID" value={tournament.organizerId} />}
                  {tournament.courtId     && <InfoRow label="Court ID"     value={tournament.courtId} />}
                  {tournament.createdAt   && <InfoRow label="Created"      value={new Date(tournament.createdAt).toLocaleString()} />}
                  {tournament.updatedAt   && <InfoRow label="Updated"      value={new Date(tournament.updatedAt).toLocaleString()} />}
                </InfoCard>

              </div>
            </>
          )}
        </div>

        {/* ── Sticky Footer Actions ── */}
        {!isLoading && tournament && (
          <div className="flex-none px-8 py-5 border-t border-slate-100 bg-slate-50">
            <div className="flex flex-col sm:flex-row gap-3">

              <button
                onClick={handleApprove}
                disabled={tournament.isApproved === true || isProcessing}
                className={`flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${
                  tournament.isApproved === true
                    ? 'bg-emerald-50 text-emerald-400 cursor-default border border-emerald-100'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg active:scale-[0.98]'
                }`}
              >
                {isProcessing ? <Loader2 size={15} className="animate-spin"/> : <CheckCircle2 size={15}/>}
                {tournament.isApproved === true ? 'Already Approved' : 'Approve'}
              </button>

              <button
                onClick={handleReject}
                disabled={tournament.isApproved === false || isProcessing}
                className={`flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${
                  tournament.isApproved === false
                    ? 'bg-rose-50 text-rose-400 cursor-default border border-rose-100'
                    : 'bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 active:scale-[0.98]'
                }`}
              >
                {isProcessing ? <Loader2 size={15} className="animate-spin"/> : <XCircle size={15}/>}
                {tournament.isApproved === false ? 'Already Rejected' : 'Reject'}
              </button>

              <button
                onClick={handleFeature}
                disabled={isProcessing}
                className={`flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border disabled:opacity-60 active:scale-[0.98] ${
                  tournament.isFeatured
                    ? 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200'
                }`}
              >
                {isProcessing ? <Loader2 size={15} className="animate-spin"/> : <Star size={15}/>}
                {tournament.isFeatured ? 'Unfeature' : 'Feature'}
              </button>

            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes atdFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes atdSlideUp { from { opacity:0; transform:translateY(20px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
      `}</style>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
        variant={confirmDialog.variant}
      />
    </>,
    document.body
  );
};

/* ── Sub-components ─────────────────────────────── */

const colorBg: Record<string, string> = {
  indigo:'bg-indigo-50 border-indigo-100', violet:'bg-violet-50 border-violet-100',
  blue:  'bg-blue-50 border-blue-100',    green: 'bg-green-50 border-green-100',
  purple:'bg-purple-50 border-purple-100',amber: 'bg-amber-50 border-amber-100',
  yellow:'bg-yellow-50 border-yellow-100',red:   'bg-red-50 border-red-100',
  slate: 'bg-slate-50 border-slate-200',  rose:  'bg-rose-50 border-rose-100',
  emerald:'bg-emerald-50 border-emerald-100',
};
const colorText: Record<string, string> = {
  indigo:'text-indigo-500', violet:'text-violet-500', blue:'text-blue-500',
  green: 'text-green-500',  purple:'text-purple-500', amber:'text-amber-500',
  yellow:'text-yellow-500', red:   'text-red-500',    slate:'text-slate-500',
  rose:  'text-rose-500',   emerald:'text-emerald-500',
};

const InfoCard: React.FC<{ title: string; icon: React.ReactNode; color: string; children: React.ReactNode }> = ({ title, icon, color, children }) => (
  <div className={`p-5 rounded-3xl border ${colorBg[color] ?? colorBg.slate} space-y-3`}>
    <h4 className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${colorText[color] ?? 'text-slate-500'}`}>
      {icon} {title}
    </h4>
    <div className="space-y-2.5">{children}</div>
  </div>
);

const InfoRow: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
    <div className="flex items-start gap-1.5">
      {icon && <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>}
      <p className="text-sm font-semibold text-slate-800 leading-snug break-words">{value}</p>
    </div>
  </div>
);

const badgeColors: Record<string, string> = {
  emerald:'bg-emerald-50 text-emerald-600 border-emerald-200',
  rose:   'bg-rose-50 text-rose-500 border-rose-200',
  amber:  'bg-amber-50 text-amber-600 border-amber-200',
  yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  red:    'bg-red-50 text-red-600 border-red-200',
  blue:   'bg-blue-50 text-blue-600 border-blue-200',
  slate:  'bg-slate-100 text-slate-500 border-slate-200',
};

const StatusBadge: React.FC<{ show: boolean; color: string; icon: React.ReactNode; label: string; pulse?: boolean }> = ({ show, color, icon, label, pulse }) => {
  if (!show) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${badgeColors[color] ?? badgeColors.slate} ${pulse ? 'animate-pulse' : ''}`}>
      {icon} {label}
    </span>
  );
};

export default AdminTournamentDetail;
