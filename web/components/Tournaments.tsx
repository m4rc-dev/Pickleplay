import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Calendar, MapPin, Users, Award, Search, Filter, CheckCircle2, Swords, Shield, Star, Users2, Clock, X, Settings, TestTube2, Flame, Timer, ArrowRight, ArrowUpDown, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Tournament, TournamentCategory, TournamentFormat, TournamentEventType, UserRole } from '../types';
import { fetchTournaments as fetchTournamentsService, registerPlayer, withdrawRegistration } from '../services/tournaments';

const DEMO_TOURNAMENTS: (Tournament & { isJoined?: boolean; registrationStatus?: string })[] = [
    {
        id: 'demo-1',
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
        description: 'The biggest open singles tournament of the summer.',
    },
    {
        id: 'demo-2',
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
        isApproved: true,
        description: 'A double-elimination doubles tournament for intermediate players.',
    },
    {
        id: 'demo-3',
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
];

const Tournaments: React.FC<{ userRole?: UserRole }> = ({ userRole }) => {
    const navigate = useNavigate();
    const [tournaments, setTournaments] = useState<(Tournament & { isJoined?: boolean; registrationStatus?: string })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState<TournamentCategory | 'all'>('all');
    const [formatFilter, setFormatFilter] = useState<TournamentFormat | 'all'>('all');
    const [eventTypeFilter, setEventTypeFilter] = useState<TournamentEventType | 'all'>('all');
    const [sortBy, setSortBy] = useState<'date_asc' | 'date_desc' | 'spots' | 'prize'>('date_asc');
    const [showMyOnly, setShowMyOnly] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [showDemoData, setShowDemoData] = useState(false);
    const isAdmin = userRole === 'ADMIN';

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setCurrentUserId(session.user.id);
            }
            loadTournaments(session?.user?.id);
        };
        init();
    }, []);

    const loadTournaments = async (userId?: string) => {
        setIsLoading(true);
        try {
            const data = await fetchTournamentsService({ approvedOnly: true });

            // If user is logged in, fetch their registrations with status
            const registrationsMap = new Map<string, string>(); // tournament_id -> status
            if (userId) {
                const { data: regData } = await supabase
                    .from('tournament_registrations')
                    .select('tournament_id, status')
                    .eq('player_id', userId);

                if (regData) {
                    regData.forEach(r => registrationsMap.set(r.tournament_id, r.status));
                }
            }

            const mapped = data.map(t => {
                const status = registrationsMap.get(t.id);
                return {
                    ...t,
                    isJoined: status === 'confirmed',
                    registrationStatus: status || undefined
                };
            });

            setTournaments(mapped);
        } catch (err) {
            console.error('Error fetching tournaments:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinTournament = async (tournamentId: string) => {
        if (!currentUserId) {
            alert('Please login to join tournaments.');
            return;
        }
        try {
            await registerPlayer(tournamentId, currentUserId);
            loadTournaments(currentUserId);
        } catch (err: any) {
            alert(err.message || 'Failed to join tournament');
        }
    };

    const handleLeaveTournament = async (tournamentId: string) => {
        if (!currentUserId || !confirm('Are you sure you want to leave this tournament?')) return;
        try {
            await withdrawRegistration(tournamentId, currentUserId);
            loadTournaments(currentUserId);
        } catch (err) {
            alert('Failed to leave tournament');
        }
    };

    // Combine real tournaments with demo data when admin toggle is on
    const displayTournaments = isAdmin && showDemoData
        ? [...tournaments, ...DEMO_TOURNAMENTS.filter(d => !tournaments.some(t => t.id === d.id))]
        : tournaments;

    const filteredTournaments = useMemo(() => {
        let result = displayTournaments.filter(t => {
            const matchesSearch = !searchQuery.trim() || t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = filter === 'All' || t.status === filter.toUpperCase();
            const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
            const matchesFormat = formatFilter === 'all' || t.format === formatFilter;
            const matchesEventType = eventTypeFilter === 'all' || t.eventType === eventTypeFilter;
            const matchesMy = !showMyOnly || t.isJoined || t.registrationStatus === 'pending';
            return matchesSearch && matchesFilter && matchesCategory && matchesFormat && matchesEventType && matchesMy;
        });

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'date_desc':
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                case 'spots':
                    return ((b.maxPlayers || 0) - (b.registeredCount || 0)) - ((a.maxPlayers || 0) - (a.registeredCount || 0));
                case 'prize': {
                    const pa = parseInt((a.prizePool || '0').replace(/[^0-9]/g, '')) || 0;
                    const pb = parseInt((b.prizePool || '0').replace(/[^0-9]/g, '')) || 0;
                    return pb - pa;
                }
                case 'date_asc':
                default:
                    return new Date(a.date).getTime() - new Date(b.date).getTime();
            }
        });

        return result;
    }, [displayTournaments, searchQuery, filter, categoryFilter, formatFilter, eventTypeFilter, showMyOnly, sortBy]);

    const activeFilterCount = [filter !== 'All', categoryFilter !== 'all', formatFilter !== 'all', eventTypeFilter !== 'all', showMyOnly, searchQuery.trim().length > 0].filter(Boolean).length;
    const hasActiveFilters = activeFilterCount > 0;

    const clearAllFilters = () => {
        setFilter('All'); setCategoryFilter('all'); setFormatFilter('all');
        setEventTypeFilter('all'); setSortBy('date_asc'); setShowMyOnly(false); setSearchQuery('');
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* Typographic Header */}
            <div className="mb-12">
                <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.4em] mb-4">
                    PICKLEPLAY / TOURNAMENTS
                </p>
                <h1 className="text-4xl md:text-6xl font-black text-slate-950 tracking-tighter leading-[1] uppercase mb-6">
                    FIND YOUR <br />
                    <span className="text-blue-600">TOURNAMENT.</span>
                </h1>
                <p className="text-slate-500 text-base md:text-lg font-small max-w-xl leading-relaxed">
                    Browse upcoming tournaments near you. Check your eligibility, see who's playing, and register in seconds.
                </p>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search tournaments..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-14 pr-10 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-400">
                                <X size={12} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`relative px-4 rounded-2xl border transition-all shrink-0 ${
                            showFilters || formatFilter !== 'all' || eventTypeFilter !== 'all' || sortBy !== 'date_asc'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100'
                                : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                        <Filter size={18} />
                        {(formatFilter !== 'all' || eventTypeFilter !== 'all' || sortBy !== 'date_asc') && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                                {[formatFilter !== 'all', eventTypeFilter !== 'all', sortBy !== 'date_asc'].filter(Boolean).length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Sort */}
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sort by</p>
                            <div className="flex flex-wrap gap-2">
                                {([['date_asc', 'Date ↑'], ['date_desc', 'Date ↓'], ['spots', 'Spots Left'], ['prize', 'Prize']] as const).map(([val, label]) => (
                                    <button key={val} onClick={() => setSortBy(val)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                            sortBy === val
                                                ? 'bg-slate-900 text-white'
                                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                        }`}>{label}</button>
                                ))}
                            </div>
                        </div>
                        {/* Format */}
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Format</p>
                            <div className="flex flex-wrap gap-2">
                                {([['all', 'All'], ['single_elim', 'Single Elim'], ['double_elim', 'Double Elim'], ['round_robin', 'Round Robin']] as const).map(([val, label]) => (
                                    <button key={val} onClick={() => setFormatFilter(val as TournamentFormat | 'all')}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                            formatFilter === val
                                                ? 'bg-slate-900 text-white'
                                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                        }`}>{label}</button>
                                ))}
                            </div>
                        </div>
                        {/* Event Type */}
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Event Type</p>
                            <div className="flex flex-wrap gap-2">
                                {([['all', 'All'], ['singles', 'Singles'], ['doubles', 'Doubles'], ['mixed', 'Mixed']] as const).map(([val, label]) => (
                                    <button key={val} onClick={() => setEventTypeFilter(val as TournamentEventType | 'all')}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                            eventTypeFilter === val
                                                ? 'bg-slate-900 text-white'
                                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                        }`}>{label}</button>
                                ))}
                            </div>
                        </div>
                        {/* Clear */}
                        {(formatFilter !== 'all' || eventTypeFilter !== 'all' || sortBy !== 'date_asc') && (
                            <button onClick={() => { setFormatFilter('all'); setEventTypeFilter('all'); setSortBy('date_asc'); }}
                                className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 transition-colors">
                                Reset Filters
                            </button>
                        )}
                    </div>
                )}

                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {(['All', 'Upcoming', 'Live', 'Completed'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f as string)}
                            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${
                                filter === f
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                                    : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
                            }`}>{f}</button>
                    ))}
                    {currentUserId && (
                        <button onClick={() => setShowMyOnly(!showMyOnly)}
                            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${
                                showMyOnly
                                    ? 'bg-slate-900 text-white shadow-lg'
                                    : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
                            }`}>Joined</button>
                    )}
                </div>
            </div>

            {/* Admin Demo Toggle */}
            {isAdmin && (
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowDemoData(!showDemoData)}
                        className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${
                            showDemoData
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                        }`}
                    >
                        <TestTube2 size={16} />
                        {showDemoData ? 'Hide Demo Data' : 'Show Demo Data'}
                    </button>
                    {showDemoData && (
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                            Admin preview — demo tournaments are only visible to you
                        </span>
                    )}
                </div>
            )}

            {/* Tournaments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="bg-white rounded-3xl border border-slate-100 h-[420px] animate-pulse"></div>
                    ))
                ) : filteredTournaments.length > 0 ? (
                    filteredTournaments.map((tournament) => (
                        <TournamentJoinCard
                            key={tournament.id}
                            tournament={tournament}
                            onJoin={() => handleJoinTournament(tournament.id)}
                            onLeave={() => handleLeaveTournament(tournament.id)}
                            onClick={() => navigate(`/tournaments/${tournament.id}`)}
                            userRole={userRole}
                            onManage={() => navigate(`/tournaments-admin/manage/${tournament.id}`)}
                        />
                    ))
                ) : (
                    <div className="col-span-full py-32 text-center">
                        <Trophy className="w-24 h-24 text-slate-200 mx-auto mb-8" />
                        <h3 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">No tournaments found</h3>
                        <p className="text-slate-400 font-medium">Try adjusting your filters or search query.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const TournamentJoinCard: React.FC<{
    tournament: Tournament & { isJoined?: boolean; registrationStatus?: string },
    onJoin: () => void,
    onLeave: () => void,
    onClick: () => void,
    userRole?: UserRole,
    onManage?: () => void
}> = ({ tournament, onJoin, onLeave, onClick, userRole, onManage }) => {
    const isFull = (tournament.registeredCount || 0) >= (tournament.maxPlayers || 0);
    const regMode = tournament.registrationMode || 'player';
    const isSquadOnly = regMode === 'squad';
    const deadlinePassed = tournament.registrationDeadline ? (new Date() > new Date(tournament.registrationDeadline)) : false;
    const isSquadBlocked = (regMode === 'squad') && !(tournament.allowSoloFallback);

    // Spots remaining
    const spotsLeft = (tournament.maxPlayers || 0) - (tournament.registeredCount || 0);
    const capacityPct = Math.min(100, ((tournament.registeredCount || 0) / (tournament.maxPlayers || 32)) * 100);
    const isFillingFast = spotsLeft > 0 && spotsLeft <= Math.max(5, (tournament.maxPlayers || 32) * 0.2);

    // Registration deadline helpers
    const deadline = tournament.registrationDeadline ? new Date(tournament.registrationDeadline) : null;
    const now = new Date();
    const daysUntilDeadline = deadline ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const deadlineSoon = daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 3;

    // Format helpers
    const formatLabel: Record<string, string> = {
      single_elim: 'Single Elim',
      double_elim: 'Double Elim',
      round_robin: 'Round Robin',
      pool_play: 'Pool Play',
    };

    // Status badge color map
    const statusColors: Record<string, string> = {
      UPCOMING: 'bg-blue-600 text-white',
      LIVE: 'bg-lime-500 text-slate-950',
      COMPLETED: 'bg-slate-400 text-white',
      CANCELLED: 'bg-rose-500 text-white',
    };

    return (
        <div onClick={onClick} className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col cursor-pointer">
            {/* Image Section */}
            <div className="h-44 relative overflow-hidden bg-slate-100">
                <img
                    src={tournament.image || "https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=800"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt={tournament.name}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="absolute bottom-3 left-3 flex gap-1.5 flex-wrap">
                    <span className={`px-2 py-1 rounded-full text-[7px] font-black uppercase tracking-wider ${statusColors[tournament.status] || 'bg-blue-600 text-white'}`}>{tournament.status}</span>
                    <span className="bg-white text-slate-900 px-2 py-1 rounded-full text-[7px] font-black uppercase tracking-wider">{tournament.skillLevel}</span>
                    {tournament.isFeatured && (
                        <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-[7px] font-black uppercase tracking-wider flex items-center gap-0.5">
                            <Star size={8} /> Featured
                        </span>
                    )}
                </div>
                <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                    {tournament.format && (
                        <span className="bg-white/90 backdrop-blur-sm text-slate-700 px-2 py-1 rounded-full text-[7px] font-black uppercase tracking-wider">
                            {tournament.format.replace('_', ' ')}
                        </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-[7px] font-black uppercase tracking-wider ${isSquadOnly ? 'bg-slate-900 text-white' : 'bg-white/90 text-slate-700 border border-slate-200'}`}>
                        {regMode === 'both' ? 'Players + Squads' : regMode === 'squad' ? 'Squads Only' : 'Players'}
                    </span>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-3 group-hover:text-blue-600 transition-colors line-clamp-1">{tournament.name}</h3>

                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-slate-500 bg-slate-50 p-2 rounded-xl">
                        <Calendar size={14} className="text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold uppercase truncate block">{new Date(tournament.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          {tournament.startTime && (
                            <span className="text-[9px] text-slate-400 font-bold block">Starts {new Date(tournament.startTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                          )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 bg-slate-50 p-2 rounded-xl">
                        <MapPin size={14} className="text-blue-600 flex-shrink-0" />
                        <span className="text-[10px] font-bold uppercase truncate">{tournament.location}</span>
                    </div>
                    {tournament.prizePool && (
                        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                            <Award size={16} className="flex-shrink-0" />
                            <span className="text-xs font-black uppercase tracking-tight truncate">Prize: {tournament.prizePool}</span>
                        </div>
                    )}
                </div>

                {/* Quick Info Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {tournament.format && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[8px] font-black uppercase tracking-wider">
                      🏆 {formatLabel[tournament.format] || tournament.format.replace('_', ' ')}
                    </span>
                  )}
                  {tournament.checkInTime && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[8px] font-black uppercase tracking-wider">
                      📋 Check-in {new Date(tournament.checkInTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                {/* Capacity + Urgency */}
                <div className="mb-4">
                    <div className="flex justify-between items-end mb-1.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Capacity</p>
                        <p className="text-[10px] font-black text-slate-900">{tournament.registeredCount} / {tournament.maxPlayers}</p>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              isFull ? 'bg-rose-500' : capacityPct >= 80 ? 'bg-amber-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${capacityPct}%` }}
                        ></div>
                    </div>
                    {/* Urgency indicators */}
                    <div className="flex items-center justify-between mt-2 min-h-[18px]">
                      {isFillingFast && !isFull && tournament.status === 'UPCOMING' && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-rose-600">
                          <Flame size={11} /> Only {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left!
                        </span>
                      )}
                      {isFull && (
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider">Full</span>
                      )}
                      {!isFillingFast && !isFull && spotsLeft > 0 && tournament.status === 'UPCOMING' && (
                        <span className="text-[9px] font-bold text-slate-400">{spotsLeft} spots available</span>
                      )}
                      {deadline && !deadlinePassed && tournament.status === 'UPCOMING' && (
                        <span className={`flex items-center gap-1 text-[9px] font-black ${
                          deadlineSoon ? 'text-amber-600' : 'text-slate-400'
                        }`}>
                          <Timer size={10} />
                          {deadlineSoon
                            ? `Closes in ${daysUntilDeadline}d`
                            : `Reg. by ${deadline.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                          }
                        </span>
                      )}
                      {deadlinePassed && tournament.status === 'UPCOMING' && (
                        <span className="text-[9px] font-black text-slate-400">Registration closed</span>
                      )}
                    </div>
                </div>

                {/* Action Button */}
                {(userRole === 'ADMIN' || userRole === 'COURT_OWNER') && onManage ? (
                    <button
                        onClick={e => { e.stopPropagation(); onManage(); }}
                        className="w-full h-11 rounded-xl font-black text-xs uppercase tracking-wide transition-all mt-auto bg-blue-600 text-white hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2"
                    >
                        <Settings size={16} /> Manage Tournament
                    </button>
                ) : tournament.registrationStatus === 'pending' ? (
                    <div className="flex gap-2 mt-auto">
                        <div className="flex-[3] flex items-center justify-center gap-2 bg-amber-50 text-amber-700 h-11 rounded-xl border border-amber-100 font-black text-xs uppercase tracking-wide">
                            <Clock size={16} /> Pending Approval
                        </div>
                        <button
                            onClick={e => { e.stopPropagation(); onLeave(); }}
                            className="flex-1 bg-rose-50 text-rose-500 hover:bg-rose-100 h-11 rounded-xl transition-all flex items-center justify-center font-black text-[9px] uppercase tracking-wide"
                        >
                            Withdraw
                        </button>
                    </div>
                ) : tournament.registrationStatus === 'rejected' ? (
                    <div className="flex gap-2 mt-auto">
                        <div className="flex-[3] flex items-center justify-center gap-2 bg-rose-50 text-rose-600 h-11 rounded-xl border border-rose-100 font-black text-xs uppercase tracking-wide">
                            <X size={16} /> Not Approved
                        </div>
                        <button
                            onClick={e => { e.stopPropagation(); onJoin(); }}
                            disabled={isFull || tournament.status !== 'UPCOMING' || deadlinePassed || isSquadBlocked}
                            className={`flex-1 h-11 rounded-xl transition-all flex items-center justify-center font-black text-[9px] uppercase tracking-wide ${isFull || tournament.status !== 'UPCOMING' || deadlinePassed || isSquadBlocked
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-slate-900 text-white hover:bg-indigo-600'
                            }`}
                        >
                            {isFull
                                ? 'Sold Out'
                                : (tournament.status !== 'UPCOMING' || deadlinePassed)
                                    ? 'Closed'
                                    : isSquadBlocked
                                        ? 'Need a Squad'
                                        : 'Reapply'}
                        </button>
                    </div>
                ) : tournament.isJoined ? (
                    <div className="flex gap-2 mt-auto">
                        <div className="flex-[3] flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 h-11 rounded-xl border border-emerald-100 font-black text-xs uppercase tracking-wide">
                            <CheckCircle2 size={16} /> Registered
                        </div>
                        <button
                            onClick={e => { e.stopPropagation(); onLeave(); }}
                            className="flex-1 bg-rose-50 text-rose-500 hover:bg-rose-100 h-11 rounded-xl transition-all flex items-center justify-center font-black text-[9px] uppercase tracking-wide"
                        >
                            Leave
                        </button>
                    </div>
                ) : tournament.status === 'COMPLETED' ? (
                    <button
                        onClick={e => { e.stopPropagation(); onClick(); }}
                        className="w-full h-11 rounded-xl font-black text-xs uppercase tracking-wide transition-all mt-auto bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center gap-2"
                    >
                        <Trophy size={14} /> View Results <ArrowRight size={14} />
                    </button>
                ) : (
                    <button
                        onClick={e => { e.stopPropagation(); onJoin(); }}
                        disabled={isFull || tournament.status !== 'UPCOMING' || deadlinePassed || isSquadBlocked}
                        className={`w-full h-11 rounded-xl font-black text-xs uppercase tracking-wide transition-all mt-auto flex items-center justify-center gap-2 ${isFull || tournament.status !== 'UPCOMING' || deadlinePassed || isSquadBlocked
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-lime-400 hover:bg-lime-300 text-slate-950 shadow-lg shadow-lime-100 hover:-translate-y-0.5'
                            }`}
                    >
                        {isFull
                            ? 'Sold Out'
                            : (tournament.status !== 'UPCOMING' || deadlinePassed)
                                ? 'Closed'
                                : isSquadBlocked
                                    ? 'Need a Squad'
                                    : <><Swords size={14} /> Join Tournament <ArrowRight size={14} /></>}
                    </button>
                )}
            </div>
        </div>
    );
};

export default Tournaments;
