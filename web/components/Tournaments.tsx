import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, MapPin, Users, Award, Search, Filter, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Tournament } from '../types';

const Tournaments: React.FC = () => {
    const [tournaments, setTournaments] = useState<(Tournament & { isJoined?: boolean })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('All');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setCurrentUserId(session.user.id);
            }
            fetchTournaments(session?.user?.id);
        };
        init();
    }, []);

    const fetchTournaments = async (userId?: string) => {
        setIsLoading(true);
        try {
            // Fetch tournaments
            const { data: tourneyData, error: tourneyError } = await supabase
                .from('tournaments')
                .select('*')
                .order('date', { ascending: true });

            if (tourneyError) throw tourneyError;

            // If user is logged in, fetch their registrations
            let registrations: Set<string> = new Set();
            if (userId) {
                const { data: regData } = await supabase
                    .from('tournament_registrations')
                    .select('tournament_id')
                    .eq('player_id', userId);

                if (regData) {
                    registrations = new Set(regData.map(r => r.tournament_id));
                }
            }

            const mappedData = (tourneyData || []).map((t: any) => ({
                id: t.id,
                name: t.name,
                date: t.date,
                location: t.location,
                prizePool: t.prize_pool,
                status: t.status,
                skillLevel: t.skill_level,
                maxPlayers: t.max_players,
                registeredCount: t.registered_count,
                image: t.image_url,
                isJoined: registrations.has(t.id)
            }));

            setTournaments(mappedData);
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
            const { error } = await supabase
                .from('tournament_registrations')
                .insert({
                    tournament_id: tournamentId,
                    player_id: currentUserId
                });

            if (error) throw error;

            // Re-fetch to update counts and state
            fetchTournaments(currentUserId);
        } catch (err: any) {
            console.error('Error joining tournament:', err);
            alert(err.message || 'Failed to join tournament');
        }
    };

    const handleLeaveTournament = async (tournamentId: string) => {
        if (!currentUserId || !confirm('Are you sure you want to leave this tournament?')) return;

        try {
            const { error } = await supabase
                .from('tournament_registrations')
                .delete()
                .eq('tournament_id', tournamentId)
                .eq('player_id', currentUserId);

            if (error) throw error;

            fetchTournaments(currentUserId);
        } catch (err) {
            console.error('Error leaving tournament:', err);
            alert('Failed to leave tournament');
        }
    };

    const filteredTournaments = tournaments.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.location.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === 'All' || t.status === filter.toUpperCase();
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* Typographic Header */}
            <div className="mb-12">
                <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.4em] mb-4">
                    PICKLEPLAY / TOURNAMENT NETWORK
                </p>
                <h1 className="text-4xl md:text-6xl font-black text-slate-950 tracking-tighter leading-[1] uppercase mb-6">
                    COMPETE. WIN. <br />
                    <span className="text-blue-600">DOMINATE.</span>
                </h1>
                <p className="text-slate-500 text-base md:text-lg font-small max-w-xl leading-relaxed">
                    Join the most prestigious pickleball circuit in the Philippines. From local opens to national championships, find your path to the podium.
                </p>
            </div>

            {/* Filters Bar updated to match screenshot style */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between z-40">
                <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    {['All', 'Upcoming', 'Live', 'Completed'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all whitespace-nowrap ${filter === f
                                ? 'bg-blue-600 text-white shadow-xl shadow-blue-200'
                                : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="relative flex-1 w-full max-w-md">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search tournaments or venues..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-16 pr-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm"
                    />
                </div>
            </div>

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
    tournament: Tournament & { isJoined?: boolean },
    onJoin: () => void,
    onLeave: () => void
}> = ({ tournament, onJoin, onLeave }) => {
    const isFull = (tournament.registeredCount || 0) >= (tournament.maxPlayers || 0);

    return (
        <div className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col">
            {/* Image Section */}
            <div className="h-44 relative overflow-hidden bg-slate-100">
                <img
                    src={tournament.image || "https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=800"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt={tournament.name}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="absolute bottom-3 left-3 flex gap-1.5">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-[7px] font-black uppercase tracking-wider">{tournament.status}</span>
                    <span className="bg-white text-slate-900 px-2 py-1 rounded-full text-[7px] font-black uppercase tracking-wider">{tournament.skillLevel}</span>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-3 group-hover:text-blue-600 transition-colors line-clamp-1">{tournament.name}</h3>

                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-slate-500 bg-slate-50 p-2 rounded-xl">
                        <Calendar size={14} className="text-blue-600 flex-shrink-0" />
                        <span className="text-[10px] font-bold uppercase truncate">{new Date(tournament.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 bg-slate-50 p-2 rounded-xl">
                        <MapPin size={14} className="text-blue-600 flex-shrink-0" />
                        <span className="text-[10px] font-bold uppercase truncate">{tournament.location}</span>
                    </div>
                    {tournament.prizePool && (
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-2 rounded-xl border border-emerald-100/50">
                            <Award size={14} className="flex-shrink-0" />
                            <span className="text-[10px] font-black uppercase tracking-tight truncate">Prize: {tournament.prizePool}</span>
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between items-end mb-1.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Capacity</p>
                        <p className="text-[10px] font-black text-slate-900">{tournament.registeredCount} / {tournament.maxPlayers}</p>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${isFull ? 'bg-rose-500' : 'bg-blue-600'}`}
                            style={{ width: `${Math.min(100, ((tournament.registeredCount || 0) / (tournament.maxPlayers || 32)) * 100)}%` }}
                        ></div>
                    </div>
                </div>

                {/* Action Button */}
                {tournament.isJoined ? (
                    <div className="flex gap-2 mt-auto">
                        <div className="flex-[3] flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 h-11 rounded-xl border border-emerald-100 font-black text-xs uppercase tracking-wide">
                            <CheckCircle2 size={16} /> Registered
                        </div>
                        <button
                            onClick={onLeave}
                            className="flex-1 bg-rose-50 text-rose-500 hover:bg-rose-100 h-11 rounded-xl transition-all flex items-center justify-center font-black text-[9px] uppercase tracking-wide"
                        >
                            Leave
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={onJoin}
                        disabled={isFull || tournament.status !== 'UPCOMING'}
                        className={`w-full h-11 rounded-xl font-black text-xs uppercase tracking-wide transition-all mt-auto ${isFull || tournament.status !== 'UPCOMING'
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-900 text-white hover:bg-blue-600 shadow-lg'
                            }`}
                    >
                        {isFull ? 'Sold Out' : tournament.status !== 'UPCOMING' ? 'Closed' : 'Join Tournament'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default Tournaments;
