import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { getOwnerPolicies, createPolicy, updatePolicy, deletePolicy, LocationPolicy } from '../../services/policies';
import { Shield, Plus, Pencil, Trash2, Save, X, Loader2, ChevronDown, MapPin, FileText, AlertCircle, CheckCircle2, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react';

const LocationPolicies: React.FC = () => {
    const [policies, setPolicies] = useState<LocationPolicy[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [selectedLocationId, setSelectedLocationId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string>('');

    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<LocationPolicy | null>(null);
    const [formTitle, setFormTitle] = useState('');
    const [formContent, setFormContent] = useState('');
    const [formLocationId, setFormLocationId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Delete confirmation
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            // Fetch owner's locations
            const { data: locs } = await supabase
                .from('locations')
                .select('id, name, city, image_url')
                .eq('owner_id', user.id)
                .order('name');

            if (locs && locs.length > 0) {
                setLocations(locs);
                setSelectedLocationId(locs[0].id);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (userId && selectedLocationId) {
            fetchPolicies();
        }
    }, [userId, selectedLocationId]);

    const fetchPolicies = async () => {
        setIsLoading(true);
        const result = await getOwnerPolicies(userId, selectedLocationId);
        if (result.data) {
            setPolicies(result.data);
        }
        setIsLoading(false);
    };

    const openAddForm = () => {
        setEditingPolicy(null);
        setFormTitle('');
        setFormContent('');
        setFormLocationId(selectedLocationId);
        setIsFormOpen(true);
    };

    const openEditForm = (policy: LocationPolicy) => {
        setEditingPolicy(policy);
        setFormTitle(policy.title);
        setFormContent(policy.content);
        setFormLocationId(policy.location_id);
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        if (!formTitle.trim() || !formContent.trim() || !formLocationId) return;
        setIsSaving(true);

        if (editingPolicy) {
            const result = await updatePolicy(editingPolicy.id, {
                title: formTitle.trim(),
                content: formContent.trim(),
            });
            if (result.error) {
                alert('Failed to update policy: ' + result.error);
            }
        } else {
            const result = await createPolicy({
                location_id: formLocationId,
                owner_id: userId,
                title: formTitle.trim(),
                content: formContent.trim(),
                display_order: policies.length,
            });
            if (result.error) {
                alert('Failed to create policy: ' + result.error);
            }
        }

        setIsSaving(false);
        setIsFormOpen(false);
        setEditingPolicy(null);
        fetchPolicies();
    };

    const handleDelete = async (id: string) => {
        setIsDeleting(true);
        const result = await deletePolicy(id);
        if (result.error) {
            alert('Failed to delete: ' + result.error);
        }
        setDeletingId(null);
        setIsDeleting(false);
        fetchPolicies();
    };

    const handleToggleActive = async (policy: LocationPolicy) => {
        await updatePolicy(policy.id, { is_active: !policy.is_active });
        fetchPolicies();
    };

    const selectedLocation = locations.find(l => l.id === selectedLocationId);

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div>
                <p className="text-xs font-black text-amber-600 uppercase tracking-[0.4em] mb-4">COURT OWNER / 2026</p>
                <h1 className="text-4xl md:text-6xl font-black text-slate-950 tracking-tighter uppercase leading-[0.85]">
                    Court <span className="text-amber-600">Policies.</span>
                </h1>
                <p className="text-slate-500 font-medium mt-3 text-sm">Create and manage terms & conditions for your locations. Players will see these before booking.</p>
            </div>

            {/* Location Selector */}
            {locations.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                        <MapPin size={16} className="text-blue-600" />
                        <span>Location:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {locations.map(loc => (
                            <button
                                key={loc.id}
                                onClick={() => setSelectedLocationId(loc.id)}
                                className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 ${
                                    selectedLocationId === loc.id
                                        ? 'bg-slate-950 text-white border-slate-950 shadow-xl shadow-slate-200/50'
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                                }`}
                            >
                                {loc.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Policy Button */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    {selectedLocation?.name ? `Policies for ${selectedLocation.name}` : 'Select a Location'}
                </h2>
                <button
                    onClick={openAddForm}
                    disabled={!selectedLocationId}
                    className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-amber-200/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Plus size={16} />
                    Add Policy
                </button>
            </div>

            {/* Policies List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="animate-spin text-amber-600" size={40} />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Loading policies...</p>
                    </div>
                ) : policies.length > 0 ? (
                    policies.map((policy, idx) => (
                        <div
                            key={policy.id}
                            className={`bg-white rounded-[32px] border-2 ${policy.is_active ? 'border-slate-100' : 'border-dashed border-slate-200 opacity-60'} shadow-lg shadow-slate-100/50 overflow-hidden transition-all hover:shadow-xl hover:border-blue-200 group`}
                        >
                            <div className="p-6 sm:p-8">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${policy.is_active ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                            <Shield size={20} className={policy.is_active ? 'text-amber-600' : 'text-slate-400'} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight">{policy.title}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                {policy.is_active ? '● Active' : '○ Inactive'} · Policy #{idx + 1}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            onClick={() => handleToggleActive(policy)}
                                            className={`p-2 rounded-xl transition-all ${policy.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                                            title={policy.is_active ? 'Deactivate' : 'Activate'}
                                        >
                                            {policy.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                        </button>
                                        <button
                                            onClick={() => openEditForm(policy)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => setDeletingId(policy.id)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Policy Content */}
                                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                    <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed text-sm">
                                        {policy.content}
                                    </div>
                                </div>

                                <p className="text-[10px] text-slate-400 font-medium mt-3">
                                    Last updated: {new Date(policy.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-24 space-y-5">
                        <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center mx-auto border-2 border-dashed border-slate-200">
                            <FileText size={36} className="text-slate-300" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No Policies Yet</h3>
                            <p className="text-slate-500 font-medium mt-2 text-sm max-w-sm mx-auto">
                                Add your court rules, terms & conditions, and late arrival policy. Players will see these before booking.
                            </p>
                        </div>
                        <button
                            onClick={openAddForm}
                            className="px-8 py-4 bg-amber-500 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-amber-600 transition-all shadow-xl shadow-amber-100"
                        >
                            Create Your First Policy
                        </button>
                    </div>
                )}
            </div>

            {/* ─── Add/Edit Policy Modal ─── */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={() => { setIsFormOpen(false); setEditingPolicy(null); }} />
                    <div className="relative w-full max-w-xl bg-white rounded-[40px] shadow-3xl p-8 sm:p-10 space-y-6 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tight leading-none mb-1">
                                    {editingPolicy ? 'Edit Policy' : 'New Policy'}
                                </h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                                    {selectedLocation?.name || 'Select location'}
                                </p>
                            </div>
                            <button onClick={() => { setIsFormOpen(false); setEditingPolicy(null); }} className="p-2 text-slate-400 hover:text-slate-950 transition-colors rounded-xl hover:bg-slate-100">
                                <X size={22} />
                            </button>
                        </div>

                        {/* Location (for new policies only) */}
                        {!editingPolicy && locations.length > 1 && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Location</label>
                                <select
                                    value={formLocationId}
                                    onChange={(e) => setFormLocationId(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-amber-400 focus:bg-white transition-all text-sm"
                                >
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Title */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Policy Title</label>
                            <input
                                type="text"
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                placeholder="e.g. Late Arrival Policy, Cancellation Policy, House Rules..."
                                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-amber-400 focus:bg-white transition-all text-sm placeholder:text-slate-300"
                            />
                        </div>

                        {/* Content */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Policy Content</label>
                            <textarea
                                value={formContent}
                                onChange={(e) => setFormContent(e.target.value)}
                                placeholder={"Write your policy rules here...\n\nExample:\n• Reservation time starts at the booked schedule regardless of arrival time.\n• A 10-minute grace period is allowed for check-in.\n• Failure to arrive within 10 minutes may result in cancellation and forfeiture of payment.\n• Extensions are subject to court availability and additional charges."}
                                className="w-full h-48 px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-[24px] font-medium text-slate-700 outline-none focus:border-amber-400 focus:bg-white transition-all resize-none text-sm leading-relaxed placeholder:text-slate-300"
                            />
                        </div>

                        {/* Preview */}
                        {formContent.trim() && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Preview</label>
                                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Shield size={14} className="text-amber-600" />
                                        <h4 className="text-xs font-black text-amber-800 uppercase tracking-widest">{formTitle || 'Policy Title'}</h4>
                                    </div>
                                    <div className="text-xs text-amber-900 font-medium leading-relaxed whitespace-pre-wrap">
                                        {formContent}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => { setIsFormOpen(false); setEditingPolicy(null); }}
                                className="flex-1 py-4 bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !formTitle.trim() || !formContent.trim()}
                                className="flex-1 py-4 bg-slate-950 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-amber-600 disabled:opacity-40 disabled:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={16} /> : (
                                    <>
                                        <Save size={16} />
                                        {editingPolicy ? 'Save Changes' : 'Create Policy'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Delete Confirmation Modal ─── */}
            {deletingId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={() => setDeletingId(null)} />
                    <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-3xl p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
                        <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto">
                            <Trash2 size={28} className="text-rose-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Delete Policy?</h3>
                            <p className="text-sm text-slate-500">This action cannot be undone. Players will no longer see this policy before booking.</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeletingId(null)}
                                className="flex-1 py-3.5 bg-slate-50 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deletingId)}
                                disabled={isDeleting}
                                className="flex-1 py-3.5 bg-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                            >
                                {isDeleting ? <Loader2 className="animate-spin" size={16} /> : (
                                    <>
                                        <Trash2 size={14} />
                                        Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationPolicies;
