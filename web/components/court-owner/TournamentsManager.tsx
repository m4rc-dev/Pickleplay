import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Calendar, MapPin, Users, Award, Plus, X, Trash2, Edit2, LayoutGrid, List, Swords, GitBranch, Eye, CheckCircle2, Clock, AlertCircle, TestTube2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Tournament } from '../../types';
import { fetchTournaments as fetchTournamentsService, deleteTournament, generateBracket, postAnnouncement, updateTournamentStatus, mapTournament, fetchRounds } from '../../services/tournaments';
import CreateTournamentModal from '../tournaments/CreateTournamentModal';
import ConfirmDialog from '../ui/ConfirmDialog';

const MOCK_TOURNAMENTS: Tournament[] = [
    {
        id: 'mock-1',
        name: 'Summer Smash Open 2026',
        date: '2026-03-15T08:00:00',
        location: 'BGC Tennis & Pickleball Center, Taguig',
        prizePool: '₱50,000',
        status: 'UPCOMING',
        skillLevel: 'All Levels',
        maxPlayers: 32,
        registeredCount: 24,
        image: '/images/home-images/pb20.jpg',
        format: 'single_elim',
        eventType: 'singles',
        category: 'open',
        registrationDeadline: '2026-03-10T23:59:00',
        isApproved: true,
        isFeatured: true,
        description: 'The biggest open singles tournament of the summer. All skill levels welcome!',
    },
    {
        id: 'mock-2',
        name: 'Doubles Domination Cup',
        date: '2026-04-05T09:00:00',
        location: 'Makati Sports Complex, Makati',
        prizePool: '₱30,000',
        status: 'UPCOMING',
        skillLevel: 'Intermediate (3.5–4.5)',
        maxPlayers: 16,
        registeredCount: 10,
        image: '/images/home-images/pb20.jpg',
        format: 'double_elim',
        eventType: 'doubles',
        category: 'intermediate',
        registrationDeadline: '2026-03-30T23:59:00',
        isApproved: undefined,
        description: 'A double-elimination doubles tournament for intermediate players.',
    },
    {
        id: 'mock-3',
        name: 'Mixed Doubles Spring League',
        date: '2026-02-01T07:30:00',
        location: 'Quezon City Sports Hub, QC',
        prizePool: '₱20,000',
        status: 'LIVE',
        skillLevel: 'Advanced (5.0+)',
        maxPlayers: 24,
        registeredCount: 24,
        image: '/images/home-images/pb20.jpg',
        format: 'round_robin',
        eventType: 'mixed_doubles',
        category: 'advanced',
        registrationDeadline: '2026-01-28T23:59:00',
        isApproved: true,
        description: 'Advanced mixed doubles round-robin. Full bracket underway.',
    },
    {
        id: 'mock-4',
        name: 'Beginner Bash Tournament',
        date: '2025-12-20T10:00:00',
        location: 'Manila Pickleball Courts, Intramuros',
        prizePool: '₱10,000',
        status: 'COMPLETED',
        skillLevel: 'Beginner (2.0–3.0)',
        maxPlayers: 16,
        registeredCount: 16,
        image: '/images/home-images/pb20.jpg',
        format: 'single_elim',
        eventType: 'singles',
        category: 'beginner',
        registrationDeadline: '2025-12-18T23:59:00',
        isApproved: true,
        description: 'Entry-level tournament for players just getting started.',
    },
];

const TournamentsManager: React.FC<{ userRole?: string }> = ({ userRole }) => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editTournament, setEditTournament] = useState<Tournament | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [roundCounts, setRoundCounts] = useState<Record<string, number>>({});
    const [showMockData, setShowMockData] = useState(false);
    const isAdmin = userRole === 'ADMIN';
    const navigate = useNavigate();

    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant: 'warning' | 'danger' | 'info';
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'warning' });

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) setCurrentUserId(session.user.id);
            loadTournaments(session?.user?.id);
        };
        init();
    }, []);

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

    const loadTournaments = async (userId?: string) => {
        setIsLoading(true);
        try {
            const uid = userId || currentUserId;
            if (!uid) {
                setIsLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('tournaments')
                .select('*')
                .eq('owner_id', uid)
                .order('date', { ascending: false });

            if (error) throw error;
            const mapped = (data || []).map(mapTournament);
            setTournaments(mapped);

            // After tournaments load, fetch round counts to know if a bracket exists
            const entries = await Promise.all(
                mapped.map(async (t) => {
                    try {
                        const r = await fetchRounds(t.id);
                        return [t.id, r?.length ?? 0] as const;
                    } catch {
                        return [t.id, 0] as const;
                    }
                })
            );
            const counts: Record<string, number> = {};
            for (const [id, cnt] of entries) counts[id] = cnt;
            setRoundCounts(counts);
        } catch (err: any) {
            console.error('Error fetching tournaments:', err?.message || err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        showConfirm(
            'Delete Tournament?',
            'This will permanently delete this tournament and all associated data including registrations and brackets. This action cannot be undone.',
            async () => {
                try {
                    await deleteTournament(id);
                    loadTournaments();
                } catch (err) {
                    alert('Failed to delete tournament.');
                }
            },
            'danger'
        );
    };

    const handleGenerateBracket = async (id: string) => {
        try {
            await generateBracket(id);
            alert('Bracket generated successfully!');
        } catch (err: any) {
            alert(err.message || 'Failed to generate bracket');
        }
    };

    const handleStatusChange = async (id: string, status: 'UPCOMING' | 'LIVE' | 'COMPLETED') => {
        try {
            await updateTournamentStatus(id, status);
            loadTournaments();
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const handleSaved = () => {
        loadTournaments();
    };

    const approvalBadge = (t: Tournament) => {
        if (t.isApproved === true) return { bg: 'bg-emerald-50 border-emerald-100 text-emerald-600', label: 'Approved', icon: CheckCircle2 };
        if (t.isApproved === false && t.status === 'CANCELLED') return { bg: 'bg-rose-50 border-rose-100 text-rose-500', label: 'Rejected', icon: AlertCircle };
        return { bg: 'bg-blue-50 border-blue-100 text-blue-600', label: 'Pending Review', icon: Clock };
    };

    return (
        <>
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* CreateTournamentModal */}
            <CreateTournamentModal
                isOpen={isCreateModalOpen || !!editTournament}
                onClose={() => { setIsCreateModalOpen(false); setEditTournament(null); }}
                onSaved={handleSaved}
                editTournament={editTournament}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Manage Tournaments</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Create and manage your competitive events.</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`px-5 py-3 border rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-900'}`}
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-5 py-3 border rounded-xl transition-all ${viewMode === 'list' ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-900'}`}
                    >
                        <List size={20} />
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setShowMockData(!showMockData)}
                            className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ml-2 flex items-center gap-2 ${
                                showMockData 
                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200' 
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                            }`}
                        >
                            <TestTube2 size={16} />
                            {showMockData ? 'Hide Demo' : 'Show Demo'}
                        </button>
                    )}
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 ml-2"
                    >
                        Create Tournament
                    </button>
                </div>
            </div>

            {/* Tournaments Visual Board */}
            {isLoading === false && tournaments.length === 0 && isAdmin && showMockData && (
                <div className="flex items-center gap-3 px-5 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-xs font-bold">
                    <TestTube2 size={14} className="shrink-0" />
                    Admin preview — showing demo tournaments. Only you can see these.
                </div>
            )}
            {isLoading === false && tournaments.length === 0 && !(isAdmin && showMockData) && (
                <div className="text-center py-32">
                    <Trophy className="w-24 h-24 text-slate-200 mx-auto mb-6" />
                    <h3 className="text-2xl font-black text-slate-300 uppercase tracking-tighter mb-2">No Tournaments Yet</h3>
                    <p className="text-slate-400 font-medium mb-6">Create your first tournament to get started.</p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 mx-auto"
                    >
                        Create Tournament
                    </button>
                </div>
            )}
            <div className={viewMode === 'grid' ? "grid grid-cols-1 lg:grid-cols-2 gap-8" : "space-y-4"}>
                {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className={`bg-white rounded-[40px] border border-slate-100 animate-pulse ${viewMode === 'grid' ? 'h-64' : 'h-24'}`}></div>
                    ))
                ) : (tournaments.length > 0 ? tournaments : (isAdmin && showMockData ? MOCK_TOURNAMENTS : [])).map((tournament) => (
                        viewMode === 'grid' ? (
                            <TournamentCard
                                key={tournament.id}
                                tournament={tournament}
                                onDelete={() => handleDelete(tournament.id)}
                                onEdit={() => setEditTournament(tournament)}
                                onView={() => navigate(`/tournaments/${tournament.id}`)}
                                onGenerateBracket={() => handleGenerateBracket(tournament.id)}
                                onStatusChange={handleStatusChange}
                                approvalBadge={approvalBadge(tournament)}
                                onManageHub={tournament.isApproved === true ? () => navigate(`/tournaments-admin/manage/${tournament.id}?tab=participants`) : undefined}
                                roundsCount={roundCounts[tournament.id]}
                            />
                        ) : (
                            <TournamentListRow
                                key={tournament.id}
                                tournament={tournament}
                                onDelete={() => handleDelete(tournament.id)}
                                onEdit={() => setEditTournament(tournament)}
                                onView={() => navigate(`/tournaments/${tournament.id}`)}
                                onManageHub={tournament.isApproved === true ? () => navigate(`/tournaments-admin/manage/${tournament.id}?tab=participants`) : undefined}
                                approvalBadge={approvalBadge(tournament)}
                            />
                        )
                    ))}
            </div>
        </div>

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

interface CardProps {
    tournament: Tournament;
    onDelete: () => void;
    onEdit: () => void;
    onView: () => void;
    onGenerateBracket: () => void;
    onStatusChange: (id: string, status: 'UPCOMING' | 'LIVE' | 'COMPLETED') => void;
    approvalBadge: { bg: string; label: string; icon: React.ElementType };
    onManageHub?: () => void;
    roundsCount?: number;
}

const TournamentCard: React.FC<CardProps> = ({ tournament, onDelete, onEdit, onView, onGenerateBracket, onStatusChange, approvalBadge, onManageHub, roundsCount }) => {
    const ApprovalIcon = approvalBadge.icon;
    const deadlinePassed = tournament.registrationDeadline ? (new Date() > new Date(tournament.registrationDeadline)) : false;
    const shouldPromptBracket = (
        tournament.isApproved === true &&
        tournament.status === 'UPCOMING' &&
        deadlinePassed &&
        (tournament.registeredCount ?? 0) >= 2 &&
        (roundsCount ?? 0) === 0
    );

    return (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden">
            <div className="p-8 cursor-pointer" onClick={onManageHub || onView}>
                <div className="flex items-center justify-between mb-5">
                    <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600">
                        <Trophy size={26} />
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                        {/* Approval badge */}
                        <div className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${approvalBadge.bg}`}>
                            <ApprovalIcon size={11} />
                            {approvalBadge.label}
                        </div>
                        <div className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${
                            tournament.status === 'UPCOMING' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
                            tournament.status === 'LIVE' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                            'bg-slate-50 border-slate-100 text-slate-600'
                        }`}>
                            {tournament.status}
                        </div>
                    </div>
                </div>

                {tournament.image && (
                    <div className="w-full h-48 rounded-3xl overflow-hidden mb-6 border border-slate-100 shadow-inner">
                        <img src={tournament.image} alt={tournament.name} className="w-full h-full object-cover" />
                    </div>
                )}

                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2 group-hover:text-indigo-600 transition-colors">
                    {tournament.name}
                </h3>

                {tournament.format && (
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-5">
                        {tournament.format.replace(/_/g, ' ')} {'\u00b7'} {tournament.eventType?.replace(/_/g, ' ') || 'singles'}
                    </p>
                )}

                <div className="space-y-3.5 mb-6">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Calendar size={17} />
                        <span className="text-sm font-bold uppercase">{new Date(tournament.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                        <MapPin size={17} />
                        <span className="text-sm font-bold uppercase">{tournament.location}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                        <Users size={17} />
                        <span className="text-sm font-bold uppercase">{tournament.registeredCount} / {tournament.maxPlayers} Players</span>
                    </div>
                    {tournament.prizePool && (
                        <div className="flex items-center gap-3 text-indigo-600">
                            <Award size={17} />
                            <span className="text-sm font-black uppercase">Prize: {tournament.prizePool}</span>
                        </div>
                    )}
                </div>

                {shouldPromptBracket && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 text-[12px]">
                        Registration deadline passed. You can generate the bracket now.
                        <div className="mt-2">
                            <button onClick={(e) => { e.stopPropagation(); onGenerateBracket(); }} className="px-3 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors">
                                Generate Bracket
                            </button>
                        </div>
                    </div>
                )}

                {/* Status change buttons */}
                <div className="flex gap-1 mb-4">
                    {(['UPCOMING', 'LIVE', 'COMPLETED'] as const).map(s => (
                        <button
                            key={s}
                            onClick={(e) => { e.stopPropagation(); onStatusChange(tournament.id, s); }}
                            className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                                tournament.status === s ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onView(); }} className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5">
                        <Eye size={14} /> View
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5">
                        <Edit2 size={14} /> Edit
                    </button>
                    {onManageHub && (
                        <button onClick={(e) => { e.stopPropagation(); onManageHub(); }} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5" title="Open Management Hub">
                            <Trophy size={14} /> Manage
                        </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onGenerateBracket(); }} className="p-3 border border-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all" title="Generate Bracket">
                        <GitBranch size={18} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-3 border border-rose-100 text-rose-500 rounded-xl hover:bg-rose-50 transition-all">
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

interface ListRowProps {
    tournament: Tournament;
    onDelete: () => void;
    onEdit: () => void;
    onView: () => void;
    onManageHub?: () => void;
    approvalBadge: { bg: string; label: string; icon: React.ElementType };
}

const TournamentListRow: React.FC<ListRowProps> = ({ tournament, onDelete, onEdit, onView, onManageHub, approvalBadge }) => {
    const ApprovalIcon = approvalBadge.icon;

    return (
        <div className="bg-white rounded-3xl border border-slate-100 p-4 flex items-center justify-between group hover:shadow-lg transition-all">
            <div className="flex items-center gap-6 cursor-pointer" onClick={onManageHub || onView}>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 overflow-hidden">
                    {tournament.image ? (
                        <img src={tournament.image} alt={tournament.name} className="w-full h-full object-cover" />
                    ) : (
                        <Trophy size={20} />
                    )}
                </div>
                <div>
                    <h4 className="font-black text-slate-900 uppercase tracking-tight">{tournament.name}</h4>
                    <div className="flex gap-4 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(tournament.date).toLocaleDateString()}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{tournament.location}</span>
                        {tournament.format && <span className="text-[10px] font-bold text-indigo-500 uppercase">{tournament.format.replace('_', ' ')}</span>}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="text-center">
                    <p className="text-[10px] font-black text-slate-900">{tournament.registeredCount} / {tournament.maxPlayers}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Players</p>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-1 ${approvalBadge.bg}`}>
                    <ApprovalIcon size={10} />
                    {approvalBadge.label}
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    tournament.status === 'UPCOMING' ? 'bg-indigo-50 text-indigo-600' :
                    tournament.status === 'LIVE' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-slate-50 text-slate-600'
                }`}>
                    {tournament.status}
                </div>
                <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onView(); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Eye size={18} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Edit2 size={18} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TournamentsManager;
