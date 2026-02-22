import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Trophy, Medal, Plus, X, Trash2, Edit2, LayoutGrid, List, Target, Zap, Search, ToggleLeft, ToggleRight, Sparkles, AlertTriangle } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface Achievement {
    id: string;
    key: string;
    name: string;
    description: string;
    icon_url: string | null;
    category: string;
    target_count: number;
    reward_points: number;
    is_active: boolean;
    created_at?: string;
}

const AchievementsManager: React.FC = () => {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<Achievement | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form state
    const [formKey, setFormKey] = useState('');
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formCategory, setFormCategory] = useState('general');
    const [formTargetCount, setFormTargetCount] = useState(1);
    const [formRewardPoints, setFormRewardPoints] = useState(100);
    const [formIconUrl, setFormIconUrl] = useState('');
    const [formIsActive, setFormIsActive] = useState(true);

    useEffect(() => {
        fetchAchievements();
    }, []);

    const fetchAchievements = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('achievements')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setAchievements(data || []);
        } catch (err) {
            console.error('Error fetching achievements:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload = {
                key: formKey,
                name: formName,
                description: formDescription,
                category: formCategory,
                target_count: formTargetCount,
                reward_points: formRewardPoints,
                icon_url: formIconUrl || null,
                is_active: formIsActive,
            };

            if (editingId) {
                // Update existing
                const { error } = await supabase
                    .from('achievements')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                // Create new
                const { error } = await supabase
                    .from('achievements')
                    .insert(payload);
                if (error) throw error;
            }

            setIsModalOpen(false);
            resetForm();
            fetchAchievements();
        } catch (err: any) {
            console.error('Error saving achievement:', err);
            alert(`Failed to save achievement: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (achievement: Achievement) => {
        setEditingId(achievement.id);
        setFormKey(achievement.key);
        setFormName(achievement.name);
        setFormDescription(achievement.description);
        setFormCategory(achievement.category);
        setFormTargetCount(achievement.target_count);
        setFormRewardPoints(achievement.reward_points);
        setFormIconUrl(achievement.icon_url || '');
        setFormIsActive(achievement.is_active);
        setIsModalOpen(true);
    };

    const handleDelete = (achievement: Achievement) => {
        setDeleteTarget(achievement);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('achievements')
                .delete()
                .eq('id', deleteTarget.id);

            if (error) throw error;
            setDeleteTarget(null);
            fetchAchievements();
        } catch (err) {
            console.error('Error deleting achievement:', err);
            alert('Failed to delete achievement.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleToggleActive = async (id: string, currentState: boolean) => {
        try {
            const { error } = await supabase
                .from('achievements')
                .update({ is_active: !currentState })
                .eq('id', id);

            if (error) throw error;
            fetchAchievements();
        } catch (err) {
            console.error('Error toggling achievement:', err);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormKey('');
        setFormName('');
        setFormDescription('');
        setFormCategory('general');
        setFormTargetCount(1);
        setFormRewardPoints(100);
        setFormIconUrl('');
        setFormIsActive(true);
    };

    const openCreateModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const filteredAchievements = achievements.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeCount = achievements.filter(a => a.is_active).length;
    const totalPoints = achievements.reduce((sum, a) => sum + a.reward_points, 0);

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Manage Achievements</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Create and manage player achievements and rewards.</p>
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
                        onClick={openCreateModal}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 ml-2"
                    >
                        Create Achievement
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <Trophy size={18} className="text-white" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Total</span>
                    </div>
                    <p className="text-3xl font-black tracking-tight">{achievements.length}</p>
                    <p className="text-xs font-bold text-indigo-100 mt-1">Achievements created</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-lime-100 rounded-xl flex items-center justify-center">
                            <Target size={18} className="text-lime-600" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active</span>
                    </div>
                    <p className="text-3xl font-black tracking-tight text-slate-950">
                        {activeCount}<span className="text-lg text-slate-400">/{achievements.length}</span>
                    </p>
                    <p className="text-xs font-bold text-slate-400 mt-1">Currently active</p>
                </div>

                <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl p-6 text-slate-950 shadow-lg shadow-amber-200">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-white/30 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <Sparkles size={18} className="text-slate-950" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Reward Pool</span>
                    </div>
                    <p className="text-3xl font-black tracking-tight">{totalPoints.toLocaleString()}</p>
                    <p className="text-xs font-bold text-amber-900 mt-1">Total reward points</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Search achievements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-16 pr-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm"
                />
            </div>

            {/* Achievements Visual Board */}
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className={`bg-white rounded-[40px] border border-slate-100 animate-pulse ${viewMode === 'grid' ? 'h-80' : 'h-24'}`}></div>
                    ))
                ) : filteredAchievements.length > 0 ? (
                    filteredAchievements.map((achievement) => (
                        viewMode === 'grid' ? (
                            <AchievementAdminCard
                                key={achievement.id}
                                achievement={achievement}
                                onEdit={() => handleEdit(achievement)}
                                onDelete={() => handleDelete(achievement)}
                                onToggleActive={() => handleToggleActive(achievement.id, achievement.is_active)}
                            />
                        ) : (
                            <AchievementAdminListRow
                                key={achievement.id}
                                achievement={achievement}
                                onEdit={() => handleEdit(achievement)}
                                onDelete={() => handleDelete(achievement)}
                                onToggleActive={() => handleToggleActive(achievement.id, achievement.is_active)}
                            />
                        )
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center bg-white rounded-[48px] border border-dashed border-slate-200">
                        <Medal className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">
                            {searchQuery ? 'No achievements found' : 'No achievements yet'}
                        </h3>
                        <p className="text-slate-400 text-sm font-medium">
                            {searchQuery ? 'Try adjusting your search.' : 'Create your first achievement to get started.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            {deleteTarget && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[32px] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center">
                                <AlertTriangle size={32} className="text-rose-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase mb-2">Delete Achievement?</h2>
                                <p className="text-slate-500 font-medium text-sm leading-relaxed">
                                    You are about to delete{' '}
                                    <span className="font-black text-slate-900">{deleteTarget.name}</span>.
                                    This will also remove all player progress for this achievement.
                                    <br />
                                    <span className="font-black text-rose-500">This action cannot be undone.</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={isDeleting}
                                className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-700 font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex-1 py-4 rounded-2xl bg-rose-500 text-white font-black text-[11px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</>
                                ) : (
                                    <><Trash2 size={14} /> Delete</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Add/Edit Achievement Modal */}
            {isModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
                                {editingId ? 'Edit Achievement' : 'New Achievement'}
                            </h2>
                            <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Achievement Key</label>
                                    <input
                                        required
                                        type="text"
                                        value={formKey}
                                        onChange={e => setFormKey(e.target.value)}
                                        placeholder="e.g. court_conqueror"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Display Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={formName}
                                        onChange={e => setFormName(e.target.value)}
                                        placeholder="e.g. Court Conqueror"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Description</label>
                                <textarea
                                    required
                                    value={formDescription}
                                    onChange={e => setFormDescription(e.target.value)}
                                    placeholder="e.g. Book 10 courts to earn this achievement"
                                    rows={3}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Category</label>
                                    <select
                                        value={formCategory}
                                        onChange={e => setFormCategory(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm appearance-none"
                                    >
                                        <option value="general">General</option>
                                        <option value="booking">Booking</option>
                                        <option value="social">Social</option>
                                        <option value="competitive">Competitive</option>
                                        <option value="milestone">Milestone</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Icon URL (optional)</label>
                                    <input
                                        type="text"
                                        value={formIconUrl}
                                        onChange={e => setFormIconUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Target Count</label>
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        value={formTargetCount}
                                        onChange={e => setFormTargetCount(Number(e.target.value))}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Reward Points</label>
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        value={formRewardPoints}
                                        onChange={e => setFormRewardPoints(Number(e.target.value))}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm"
                                    />
                                </div>
                            </div>

                            {/* Active Toggle */}
                            <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                <div>
                                    <p className="font-black text-sm text-slate-900 uppercase tracking-tight">Active Status</p>
                                    <p className="text-xs text-slate-400 font-medium mt-1">
                                        {formIsActive ? 'This achievement is visible to players' : 'This achievement is hidden from players'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormIsActive(!formIsActive)}
                                    className="transition-all"
                                >
                                    {formIsActive ? (
                                        <ToggleRight size={40} className="text-lime-500" />
                                    ) : (
                                        <ToggleLeft size={40} className="text-slate-300" />
                                    )}
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 mt-8 disabled:bg-slate-200"
                            >
                                {isSubmitting ? 'Saving...' : editingId ? 'Update Achievement' : 'Create Achievement'}
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// ─── Achievement Admin Card (Grid View) ───

const AchievementAdminCard: React.FC<{
    achievement: Achievement;
    onEdit: () => void;
    onDelete: () => void;
    onToggleActive: () => void;
}> = ({ achievement, onEdit, onDelete, onToggleActive }) => {
    const categoryColors: Record<string, string> = {
        general: 'bg-slate-50 border-slate-100 text-slate-600',
        booking: 'bg-indigo-50 border-indigo-100 text-indigo-600',
        social: 'bg-sky-50 border-sky-100 text-sky-600',
        competitive: 'bg-rose-50 border-rose-100 text-rose-600',
        milestone: 'bg-amber-50 border-amber-100 text-amber-600',
    };

    return (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden">
            <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                        <Medal size={24} />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${categoryColors[achievement.category] || categoryColors.general}`}>
                            {achievement.category}
                        </div>
                        <button
                            onClick={onToggleActive}
                            title={achievement.is_active ? 'Deactivate' : 'Activate'}
                            className="transition-all hover:scale-110"
                        >
                            {achievement.is_active ? (
                                <ToggleRight size={28} className="text-lime-500" />
                            ) : (
                                <ToggleLeft size={28} className="text-slate-300" />
                            )}
                        </button>
                    </div>
                </div>

                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2 group-hover:text-indigo-600 transition-colors">{achievement.name}</h3>
                <p className="text-sm text-slate-400 font-medium mb-6 line-clamp-2">{achievement.description}</p>

                <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Zap size={16} className="text-slate-400" />
                        <span className="text-xs font-bold uppercase">Key: {achievement.key}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                        <Target size={16} />
                        <span className="text-xs font-bold uppercase">Target: {achievement.target_count} actions</span>
                    </div>
                    <div className="flex items-center gap-3 text-indigo-600">
                        <Sparkles size={16} />
                        <span className="text-xs font-black uppercase">Reward: {achievement.reward_points} pts</span>
                    </div>
                </div>

                <div className="flex gap-2 transition-all duration-500">
                    <button
                        onClick={onEdit}
                        className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                        <Edit2 size={14} /> Edit
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-3 border border-rose-100 text-rose-500 rounded-xl hover:bg-rose-50 transition-all"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Achievement Admin List Row ───

const AchievementAdminListRow: React.FC<{
    achievement: Achievement;
    onEdit: () => void;
    onDelete: () => void;
    onToggleActive: () => void;
}> = ({ achievement, onEdit, onDelete, onToggleActive }) => (
    <div className="bg-white rounded-3xl border border-slate-100 p-4 flex items-center justify-between group hover:shadow-lg transition-all">
        <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Medal size={20} />
            </div>
            <div>
                <h4 className="font-black text-slate-900 uppercase tracking-tight">{achievement.name}</h4>
                <div className="flex gap-4 mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{achievement.category}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Target: {achievement.target_count}</span>
                    <span className="text-[10px] font-bold text-indigo-500 uppercase">{achievement.reward_points} pts</span>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-6">
            <button
                onClick={onToggleActive}
                title={achievement.is_active ? 'Deactivate' : 'Activate'}
                className="transition-all hover:scale-110"
            >
                {achievement.is_active ? (
                    <ToggleRight size={28} className="text-lime-500" />
                ) : (
                    <ToggleLeft size={28} className="text-slate-300" />
                )}
            </button>
            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${achievement.is_active ? 'bg-lime-50 text-lime-600' : 'bg-slate-50 text-slate-400'}`}>
                {achievement.is_active ? 'Active' : 'Inactive'}
            </div>
            <div className="flex gap-2">
                <button onClick={onEdit} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                    <Edit2 size={18} />
                </button>
                <button onClick={onDelete} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    </div>
);

export default AchievementsManager;
