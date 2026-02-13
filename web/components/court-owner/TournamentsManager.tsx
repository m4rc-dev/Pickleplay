import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Trophy, Calendar, MapPin, Users, Award, Plus, X, Trash2, Edit2, LayoutGrid, List } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Tournament } from '../../types';

const TournamentsManager: React.FC = () => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Form state
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [location, setLocation] = useState('');
    const [prizePool, setPrizePool] = useState('');
    const [skillLevel, setSkillLevel] = useState('All Levels');
    const [maxPlayers, setMaxPlayers] = useState(32);

    // Image upload state
    const [posterFile, setPosterFile] = useState<File | null>(null);
    const [posterPreview, setPosterPreview] = useState<string | null>(null);

    useEffect(() => {
        fetchTournaments();
    }, []);

    const fetchTournaments = async () => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            console.log('DEBUG: Session User ID:', session?.user?.id);
            if (!session?.user) {
                console.warn('DEBUG: No session user found');
                return;
            }

            const { data, error } = await supabase
                .from('tournaments')
                .select('*')
                .eq('owner_id', session.user.id)
                .order('date', { ascending: true });

            if (error) {
                console.error('DEBUG: Supabase fetch error:', error);
                throw error;
            }

            console.log('DEBUG: Raw tournaments data from DB:', data);

            const mappedData: Tournament[] = (data || []).map((t: any) => ({
                id: t.id,
                name: t.name,
                date: t.date,
                location: t.location,
                prizePool: t.prize_pool,
                status: t.status,
                skillLevel: t.skill_level,
                maxPlayers: t.max_players,
                registeredCount: t.registered_count,
                image: t.image_url
            }));

            console.log('DEBUG: Mapped tournaments data:', mappedData);
            setTournaments(mappedData);
        } catch (err) {
            console.error('Error fetching tournaments:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPosterFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPosterPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadPoster = async (file: File): Promise<string> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const filePath = `posters/${fileName}`;

        // Ensure we handle potential bucket issues
        try {
            const { error: uploadError } = await supabase.storage
                .from('tournaments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('tournaments')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error: any) {
            console.error('Storage upload error:', error);
            throw new Error(`Failed to upload poster: ${error.message}`);
        }
    };

    const handleAddTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            let finalImageUrl = '';
            if (posterFile) {
                finalImageUrl = await uploadPoster(posterFile);
            }

            const { error } = await supabase
                .from('tournaments')
                .insert({
                    owner_id: user.id,
                    name,
                    date: new Date(date).toISOString(),
                    location,
                    prize_pool: prizePool,
                    skill_level: skillLevel,
                    max_players: maxPlayers,
                    image_url: finalImageUrl,
                    status: 'UPCOMING'
                });

            if (error) throw error;

            setIsAddModalOpen(false);
            resetForm();
            fetchTournaments();
        } catch (err: any) {
            console.error('Error adding tournament:', err);
            alert(`Failed to create tournament: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleDeleteTournament = async (id: string) => {
        if (!confirm('Are you sure you want to delete this tournament?')) return;

        try {
            const { error } = await supabase
                .from('tournaments')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchTournaments();
        } catch (err) {
            console.error('Error deleting tournament:', err);
            alert('Failed to delete tournament.');
        }
    };

    const resetForm = () => {
        setName('');
        setDate('');
        setLocation('');
        setPrizePool('');
        setSkillLevel('All Levels');
        setMaxPlayers(32);
        setPosterFile(null);
        setPosterPreview(null);
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
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
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 ml-2"
                    >
                        Create Tournament
                    </button>
                </div>
            </div>

            {/* Tournaments Visual Board */}
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className={`bg-white rounded-[40px] border border-slate-100 animate-pulse ${viewMode === 'grid' ? 'h-64' : 'h-24'}`}></div>
                    ))
                ) : tournaments.length > 0 ? (
                    tournaments.map((tournament) => (
                        viewMode === 'grid' ? (
                            <TournamentCard key={tournament.id} tournament={tournament} onDelete={() => handleDeleteTournament(tournament.id)} />
                        ) : (
                            <TournamentListRow key={tournament.id} tournament={tournament} onDelete={() => handleDeleteTournament(tournament.id)} />
                        )
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center bg-white rounded-[48px] border border-dashed border-slate-200">
                        <Trophy className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">No tournaments yet</h3>
                        <p className="text-slate-400 text-sm font-medium">Start hosting events to grow your community.</p>
                    </div>
                )}
            </div>

            {/* Add Tournament Modal */}
            {isAddModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">New Tournament</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddTournament} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tournament Name</label>
                                <input
                                    required
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Summer Open 2024"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Date & Time</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Location</label>
                                    <input
                                        required
                                        type="text"
                                        value={location}
                                        onChange={e => setLocation(e.target.value)}
                                        placeholder="e.g. BGC Center"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Prize Pool</label>
                                    <input
                                        type="text"
                                        value={prizePool}
                                        onChange={e => setPrizePool(e.target.value)}
                                        placeholder="e.g. ₱50,000"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Max Players</label>
                                    <input
                                        required
                                        type="number"
                                        value={maxPlayers}
                                        onChange={e => setMaxPlayers(Number(e.target.value))}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Skill Level</label>
                                <select
                                    value={skillLevel}
                                    onChange={e => setSkillLevel(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm appearance-none"
                                >
                                    <option>All Levels</option>
                                    <option>Beginner (2.0-3.0)</option>
                                    <option>Intermediate (3.5-4.5)</option>
                                    <option>Advanced (5.0+)</option>
                                </select>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tournament Poster</label>
                                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-8 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer group relative overflow-hidden h-64">
                                    {posterPreview ? (
                                        <>
                                            <img src={posterPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <p className="text-white font-black text-[10px] uppercase tracking-widest">Change Image</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 mx-auto mb-4 group-hover:scale-110 transition-transform">
                                                <Plus size={32} />
                                            </div>
                                            <p className="text-slate-500 font-bold text-sm">Drop your poster here or click to browse</p>
                                            <p className="text-slate-400 text-[10px] uppercase tracking-widest font-black mt-2">Recommended: 1200x630 (PNG, JPG)</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePosterChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 mt-8 disabled:bg-slate-200"
                            >
                                {isSubmitting ? 'Creating...' : 'Launch Tournament'}
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

const TournamentCard: React.FC<{ tournament: Tournament, onDelete: () => void }> = ({ tournament, onDelete }) => (
    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden">
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                    <Trophy size={24} />
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${tournament.status === 'UPCOMING' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
                    tournament.status === 'LIVE' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                        'bg-slate-50 border-slate-100 text-slate-600'
                    }`}>
                    {tournament.status}
                </div>
            </div>

            {tournament.image && (
                <div className="w-full h-48 rounded-3xl overflow-hidden mb-6 border border-slate-100 shadow-inner">
                    <img src={tournament.image} alt={tournament.name} className="w-full h-full object-cover" />
                </div>
            )}

            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-4 group-hover:text-indigo-600 transition-colors">{tournament.name}</h3>

            <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-slate-400">
                    <Calendar size={16} />
                    <span className="text-xs font-bold uppercase">{new Date(tournament.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                    <MapPin size={16} />
                    <span className="text-xs font-bold uppercase">{tournament.location}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                    <Users size={16} />
                    <span className="text-xs font-bold uppercase">{tournament.registeredCount} / {tournament.maxPlayers} Players</span>
                </div>
                {tournament.prizePool && (
                    <div className="flex items-center gap-3 text-indigo-600">
                        <Award size={16} />
                        <span className="text-xs font-black uppercase">Prize: {tournament.prizePool}</span>
                    </div>
                )}
            </div>

            <div className="flex gap-2 transition-all duration-500">
                <button className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                    <Edit2 size={14} /> Edit
                </button>
                <button onClick={onDelete} className="p-3 border border-rose-100 text-rose-500 rounded-xl hover:bg-rose-50 transition-all">
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    </div>
);

const TournamentListRow: React.FC<{ tournament: Tournament, onDelete: () => void }> = ({ tournament, onDelete }) => (
    <div className="bg-white rounded-3xl border border-slate-100 p-4 flex items-center justify-between group hover:shadow-lg transition-all">
        <div className="flex items-center gap-6">
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
                </div>
            </div>
        </div>
        <div className="flex items-center gap-8">
            <div className="text-center">
                <p className="text-[10px] font-black text-slate-900">{tournament.registeredCount} / {tournament.maxPlayers}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Players</p>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${tournament.status === 'UPCOMING' ? 'bg-indigo-50 text-indigo-600' :
                tournament.status === 'LIVE' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-slate-50 text-slate-600'
                }`}>
                {tournament.status}
            </div>
            <div className="flex gap-2">
                <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                    <Edit2 size={18} />
                </button>
                <button onClick={onDelete} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    </div>
);

export default TournamentsManager;
