import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, MapPin, ChevronLeft, Plus, Clock, Settings2, Trash2, X, Target, Phone, Activity, AlertCircle, CheckCircle, Camera, Image, Check, Sparkles, Pencil, ChevronDown, Calendar } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { uploadCourtImage } from '../../../services/locations';
import { Location, CourtClosure, CourtClosureReason } from '../../../types';

declare global {
    interface Window {
        google: any;
    }
}

type CourtStatus = 'Available' | 'Fully Booked' | 'Coming Soon' | 'Maintenance';

interface CourtItem {
    id: string;
    location_id: string;
    owner_id: string;
    name: string;
    num_courts: number;
    surface_type: string;
    base_price: number;
    cleaning_time_minutes: number;
    is_active: boolean;
    amenities?: string[];
    latitude?: number;
    longitude?: number;
    image_url?: string;
    court_type?: 'Indoor' | 'Outdoor' | 'Both';
    status?: CourtStatus;
}

const LocationDetailPage: React.FC = () => {
    const { locationId } = useParams<{ locationId: string }>();
    const navigate = useNavigate();

    const [location, setLocation] = useState<Location | null>(null);
    const [courts, setCourts] = useState<CourtItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddCourtOpen, setIsAddCourtOpen] = useState(false);
    const [isEditCourtOpen, setIsEditCourtOpen] = useState(false);
    const [editingCourt, setEditingCourt] = useState<CourtItem | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Court form state
    const [courtName, setCourtName] = useState('');
    const [courtSurface, setCourtSurface] = useState('Pro-Cushion');
    const [courtPrice, setCourtPrice] = useState(0);
    const [isCourtFree, setIsCourtFree] = useState(false);
    const [courtCleaningTime, setCourtCleaningTime] = useState(0);
    const [courtAmenities, setCourtAmenities] = useState('');
    const [courtType, setCourtType] = useState<'Indoor' | 'Outdoor'>('Indoor');
    const [courtStatus, setCourtStatus] = useState<CourtStatus>('Available');
    const [isSurfaceDropdownOpen, setIsSurfaceDropdownOpen] = useState(false);
    const [surfaceSearch, setSurfaceSearch] = useState('');
    const surfaceDropdownRef = React.useRef<HTMLDivElement>(null);

    const INDOOR_SURFACES = ['Wood', 'Synthetic', 'Sport Tile', 'Rubberized Flooring'];
    const OUTDOOR_SURFACES = ['Concrete', 'Asphalt', 'Acrylic-Coated', 'Sport Tiles'];

    // Court amenities master modal state
    const [isCourtAmenitiesModalOpen, setIsCourtAmenitiesModalOpen] = useState(false);
    const [masterCourtAmenities, setMasterCourtAmenities] = useState<{ id: string; name: string }[]>([]);
    const [newMasterCourtAmenity, setNewMasterCourtAmenity] = useState('');
    const [editingMasterCourtIdx, setEditingMasterCourtIdx] = useState<string | null>(null);
    const [editingMasterCourtValue, setEditingMasterCourtValue] = useState('');
    const [isSavingMasterCourt, setIsSavingMasterCourt] = useState(false);

    // Court amenities dropdown state (for Add/Edit Court form)
    const [selectedCourtAmenities, setSelectedCourtAmenities] = useState<string[]>([]);
    const [courtAmenitySearch, setCourtAmenitySearch] = useState('');
    const [isCourtAmenityDropdownOpen, setIsCourtAmenityDropdownOpen] = useState(false);
    const courtAmenityDropdownRef = React.useRef<HTMLDivElement>(null);

    // Court closures calendar state
    const [courtClosures, setCourtClosures] = useState<CourtClosure[]>([]);
    const [courtClosureCalendarMonth, setCourtClosureCalendarMonth] = useState(new Date());
    const [selectedCourtClosureDate, setSelectedCourtClosureDate] = useState<string | null>(null);
    const [courtClosureReason, setCourtClosureReason] = useState<CourtClosureReason>('Tournament');
    const [courtClosureDescription, setCourtClosureDescription] = useState('');
    const [isSavingCourtClosure, setIsSavingCourtClosure] = useState(false);
    // For Add Court — store closures locally until court is created
    const [pendingCourtClosures, setPendingCourtClosures] = useState<{ date: string; reason: CourtClosureReason; description: string }[]>([]);

    useEffect(() => {
        if (locationId) fetchLocationData();
    }, [locationId]);

    const fetchLocationData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            // Fetch location
            const { data: locData, error: locError } = await supabase
                .from('locations')
                .select('*')
                .eq('id', locationId)
                .single();

            if (locError) throw locError;
            setLocation({
                ...locData,
                amenities: Array.isArray(locData.amenities) ? locData.amenities : []
            });

            // Set default cleaning time from location
            setCourtCleaningTime(locData.base_cleaning_time || 0);

            // Fetch courts at this location
            const { data: courtsData, error: courtsError } = await supabase
                .from('courts')
                .select('*')
                .eq('location_id', locationId)
                .order('created_at', { ascending: false });

            if (courtsError) throw courtsError;
            setCourts(courtsData || []);
        } catch (err) {
            console.error('Error fetching location:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch master court amenities
    const fetchMasterCourtAmenities = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;
            const { data, error } = await supabase
                .from('owner_court_amenities')
                .select('id, name')
                .eq('owner_id', session.user.id)
                .order('name');
            if (error) throw error;
            setMasterCourtAmenities(data || []);
        } catch (err) {
            console.error('Error fetching court amenities:', err);
        }
    };

    useEffect(() => { fetchMasterCourtAmenities(); }, []);

    // Close court amenity dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (courtAmenityDropdownRef.current && !courtAmenityDropdownRef.current.contains(e.target as Node)) {
                setIsCourtAmenityDropdownOpen(false);
            }
            if (surfaceDropdownRef.current && !surfaceDropdownRef.current.contains(e.target as Node)) {
                setIsSurfaceDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleAddMasterCourtAmenity = async () => {
        const trimmed = newMasterCourtAmenity.trim();
        if (!trimmed) return;
        if (masterCourtAmenities.some(a => a.name.toLowerCase() === trimmed.toLowerCase())) {
            alert('This court amenity already exists.');
            return;
        }
        setIsSavingMasterCourt(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            const { error } = await supabase
                .from('owner_court_amenities')
                .insert({ owner_id: user.id, name: trimmed });
            if (error) throw error;
            setNewMasterCourtAmenity('');
            await fetchMasterCourtAmenities();
        } catch (err: any) {
            console.error('Error adding court amenity:', err);
            alert(`Failed to add court amenity: ${err.message}`);
        } finally {
            setIsSavingMasterCourt(false);
        }
    };

    const handleDeleteMasterCourtAmenity = async (id: string) => {
        setIsSavingMasterCourt(true);
        try {
            const { error } = await supabase.from('owner_court_amenities').delete().eq('id', id);
            if (error) throw error;
            await fetchMasterCourtAmenities();
        } catch (err: any) {
            console.error('Error deleting court amenity:', err);
            alert(`Failed to delete court amenity: ${err.message}`);
        } finally {
            setIsSavingMasterCourt(false);
        }
    };

    const handleSaveEditMasterCourtAmenity = async () => {
        if (!editingMasterCourtIdx) return;
        const trimmed = editingMasterCourtValue.trim();
        if (!trimmed) return;
        if (masterCourtAmenities.some(a => a.id !== editingMasterCourtIdx && a.name.toLowerCase() === trimmed.toLowerCase())) {
            alert('This court amenity already exists.');
            return;
        }
        setIsSavingMasterCourt(true);
        try {
            const { error } = await supabase
                .from('owner_court_amenities')
                .update({ name: trimmed })
                .eq('id', editingMasterCourtIdx);
            if (error) throw error;
            setEditingMasterCourtIdx(null);
            setEditingMasterCourtValue('');
            await fetchMasterCourtAmenities();
        } catch (err: any) {
            console.error('Error updating court amenity:', err);
            alert(`Failed to update court amenity: ${err.message}`);
        } finally {
            setIsSavingMasterCourt(false);
        }
    };

    const resetCourtForm = () => {
        setCourtName('');
        setCourtSurface('');
        setSurfaceSearch('');
        setIsSurfaceDropdownOpen(false);
        setCourtPrice(0);
        setIsCourtFree(false);
        setCourtCleaningTime(location?.base_cleaning_time || 0);
        setCourtAmenities('');
        setSelectedCourtAmenities([]);
        setCourtAmenitySearch('');
        setIsCourtAmenityDropdownOpen(false);
        setCourtType('Indoor');
        setCourtStatus('Available');
        // Reset closures
        setCourtClosures([]);
        setCourtClosureCalendarMonth(new Date());
        setSelectedCourtClosureDate(null);
        setCourtClosureReason('Tournament');
        setCourtClosureDescription('');
        setPendingCourtClosures([]);
    };

    const handleAddCourt = async (e: React.FormEvent) => {
        e.preventDefault();

        // Price validation: must be free (0) or at least ₱1
        if (!isCourtFree && courtPrice < 1) {
            alert('Please set a price of at least ₱1, or toggle "Free" to make this court free.');
            return;
        }

        const finalPrice = isCourtFree ? 0 : courtPrice;
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: courtData, error } = await supabase
                .from('courts')
                .insert({
                    owner_id: user.id,
                    location_id: locationId,
                    name: courtName,
                    surface_type: courtSurface,
                    base_price: finalPrice,
                    cleaning_time_minutes: courtCleaningTime,
                    court_type: courtType,
                    amenities: selectedCourtAmenities,
                    latitude: location?.latitude,
                    longitude: location?.longitude,
                    is_active: courtStatus === 'Available',
                    status: courtStatus
                })
                .select()
                .single();

            if (error) throw error;

            // Save any pending closures for the newly created court
            if (courtData && pendingCourtClosures.length > 0) {
                const closureRows = pendingCourtClosures.map(c => ({
                    court_id: courtData.id,
                    date: c.date,
                    reason: c.reason,
                    description: c.description || null
                }));
                const { error: closureError } = await supabase
                    .from('court_closures')
                    .insert(closureRows);
                if (closureError) console.error('Error saving court closures:', closureError);
            }

            setIsAddCourtOpen(false);
            resetCourtForm();
            fetchLocationData();
        } catch (err: any) {
            console.error('Error adding court:', err);
            alert(`Failed to add court: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateCourt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCourt) return;

        // Price validation: must be free (0) or at least ₱1
        if (!isCourtFree && courtPrice < 1) {
            alert('Please set a price of at least ₱1, or toggle "Free" to make this court free.');
            return;
        }

        const finalPrice = isCourtFree ? 0 : courtPrice;
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('courts')
                .update({
                    name: courtName,
                    surface_type: courtSurface,
                    base_price: finalPrice,
                    cleaning_time_minutes: courtCleaningTime,
                    court_type: courtType,
                    amenities: selectedCourtAmenities,
                    status: courtStatus,
                    is_active: courtStatus === 'Available',
                })
                .eq('id', editingCourt.id);

            if (error) throw error;
            setIsEditCourtOpen(false);
            setEditingCourt(null);
            resetCourtForm();
            fetchLocationData();
        } catch (err: any) {
            console.error('Error updating court:', err);
            alert(`Failed to update court: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCourt = async (id: string) => {
        if (!confirm('Are you sure you want to remove this court? This cannot be undone.')) return;
        try {
            const { error } = await supabase.from('courts').delete().eq('id', id);
            if (error) throw error;
            setIsEditCourtOpen(false);
            setEditingCourt(null);
            fetchLocationData();
        } catch (err) {
            console.error('Error deleting court:', err);
            alert('Failed to delete court.');
        }
    };

    const openEditCourt = (court: CourtItem) => {
        setEditingCourt(court);
        setCourtName(court.name);
        setCourtSurface(court.surface_type);
        setCourtPrice(court.base_price || 0);
        setIsCourtFree((court.base_price || 0) === 0);
        setCourtCleaningTime(court.cleaning_time_minutes || 0);
        setCourtAmenities(Array.isArray(court.amenities) ? court.amenities.join(', ') : '');
        setSelectedCourtAmenities(Array.isArray(court.amenities) ? [...court.amenities] : []);
        setCourtAmenitySearch('');
        setIsCourtAmenityDropdownOpen(false);
        setCourtType((court.court_type as 'Indoor' | 'Outdoor') || 'Indoor');
        setCourtStatus((court.status as CourtStatus) || 'Available');
        setIsEditCourtOpen(true);
        // Fetch existing closures for this court
        fetchCourtClosures(court.id);
        setSelectedCourtClosureDate(null);
        setCourtClosureCalendarMonth(new Date());
        setCourtClosureReason('Tournament');
        setCourtClosureDescription('');
        setPendingCourtClosures([]);
    };

    // ── Court Closures DB Operations ──
    const fetchCourtClosures = async (courtId: string) => {
        try {
            const { data, error } = await supabase
                .from('court_closures')
                .select('*')
                .eq('court_id', courtId)
                .gte('date', new Date().toISOString().split('T')[0])
                .order('date', { ascending: true });
            if (!error && data) setCourtClosures(data as CourtClosure[]);
        } catch (err) { console.error('Error fetching court closures:', err); }
    };

    const handleAddCourtClosure = async () => {
        if (!editingCourt || !selectedCourtClosureDate) return;
        setIsSavingCourtClosure(true);
        try {
            const { error } = await supabase
                .from('court_closures')
                .upsert({
                    court_id: editingCourt.id,
                    date: selectedCourtClosureDate,
                    reason: courtClosureReason,
                    description: courtClosureDescription || null
                }, { onConflict: 'court_id,date' })
                .select()
                .single();
            if (error) throw error;
            await fetchCourtClosures(editingCourt.id);
            setSelectedCourtClosureDate(null);
            setCourtClosureDescription('');
            setCourtClosureReason('Tournament');
        } catch (err: any) {
            console.error('Error saving court closure:', err);
            alert(`Failed to save closure: ${err.message}`);
        } finally { setIsSavingCourtClosure(false); }
    };

    const handleRemoveCourtClosure = async (closureId: string) => {
        if (!editingCourt) return;
        try {
            await supabase.from('court_closures').delete().eq('id', closureId);
            await fetchCourtClosures(editingCourt.id);
        } catch (err) { console.error('Error removing court closure:', err); }
    };

    // For Add Court mode — manage pending closures locally
    const handleAddPendingClosure = () => {
        if (!selectedCourtClosureDate) return;
        setPendingCourtClosures(prev => {
            const filtered = prev.filter(c => c.date !== selectedCourtClosureDate);
            return [...filtered, { date: selectedCourtClosureDate, reason: courtClosureReason, description: courtClosureDescription }].sort((a, b) => a.date.localeCompare(b.date));
        });
        setSelectedCourtClosureDate(null);
        setCourtClosureDescription('');
        setCourtClosureReason('Tournament');
    };

    const handleRemovePendingClosure = (date: string) => {
        setPendingCourtClosures(prev => prev.filter(c => c.date !== date));
    };

    const totalCourtUnits = courts.reduce((sum, c) => sum + (c.num_courts || 1), 0);


    // Shared court form
    const renderCourtForm = (onSubmit: (e: React.FormEvent) => void, isEdit: boolean) => (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Court Name</label>
                <input required type="text" value={courtName} onChange={e => setCourtName(e.target.value)}
                    placeholder="e.g. Center Court, Court A"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm" />
            </div>

            {/* Court Type Selector */}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Court Type</label>
                <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100 gap-1 shadow-inner h-[54px]">
                    {['Indoor', 'Outdoor'].map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => {
                                setCourtType(type as 'Indoor' | 'Outdoor');
                                setCourtSurface('');
                                setSurfaceSearch('');
                                setIsSurfaceDropdownOpen(false);
                            }}
                            className={`flex-1 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all duration-300 ${courtType === type
                                ? 'bg-white text-blue-600 shadow-lg shadow-blue-100/50'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Court Status Selector */}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Court Status</label>
                <div className="grid grid-cols-2 gap-2">
                    {([
                        { value: 'Available' as CourtStatus, label: 'Available', color: 'emerald', icon: '✓' },
                        { value: 'Fully Booked' as CourtStatus, label: 'Fully Booked', color: 'blue', icon: '⏳' },
                        { value: 'Coming Soon' as CourtStatus, label: 'Coming Soon', color: 'blue', icon: '🔜' },
                        { value: 'Maintenance' as CourtStatus, label: 'Maintenance', color: 'blue', icon: '🔧' },
                    ]).map((opt) => {
                        const isSelected = courtStatus === opt.value;
                        const colorMap: Record<string, { bg: string; border: string; text: string; ring: string }> = {
                            emerald: { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700', ring: 'ring-emerald-500/20' },
                            blue: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700', ring: 'ring-blue-500/20' },
                        };
                        const c = colorMap[opt.color];
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setCourtStatus(opt.value)}
                                className={`py-3 px-3 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all border-2 flex items-center justify-center gap-1.5 ${isSelected
                                    ? `${c.bg} ${c.border} ${c.text} ring-4 ${c.ring} shadow-sm`
                                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                                    }`}
                            >
                                <span>{opt.icon}</span> {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2" ref={surfaceDropdownRef}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Surface Type</label>
                    <div className="relative">
                        <div
                            onClick={() => setIsSurfaceDropdownOpen(!isSurfaceDropdownOpen)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 cursor-pointer flex items-center justify-between hover:border-blue-200 transition-colors"
                        >
                            <input
                                type="text"
                                value={isSurfaceDropdownOpen ? surfaceSearch : courtSurface}
                                onChange={e => { setSurfaceSearch(e.target.value); setIsSurfaceDropdownOpen(true); }}
                                onFocus={() => { setIsSurfaceDropdownOpen(true); setSurfaceSearch(''); }}
                                placeholder="Select surface..."
                                className="bg-transparent outline-none font-bold text-sm flex-1 w-full min-w-0"
                            />
                            <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ml-2 ${isSurfaceDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isSurfaceDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-52 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                {(() => {
                                    const options = courtType === 'Indoor' ? INDOOR_SURFACES : OUTDOOR_SURFACES;
                                    const filtered = options.filter(s =>
                                        s.toLowerCase().includes(surfaceSearch.toLowerCase())
                                    );
                                    const trimmed = surfaceSearch.trim();
                                    const isCustom = trimmed &&
                                        !options.some(s => s.toLowerCase() === trimmed.toLowerCase());

                                    return (
                                        <>
                                            {filtered.map((s, idx) => (
                                                <button type="button" key={idx}
                                                    onClick={() => {
                                                        setCourtSurface(s);
                                                        setSurfaceSearch('');
                                                        setIsSurfaceDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors font-bold text-sm flex items-center gap-3 ${courtSurface === s ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'
                                                        }`}
                                                >
                                                    <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${courtSurface === s ? 'border-blue-400 bg-blue-50' : 'border-slate-200'
                                                        }`}>
                                                        {courtSurface === s && <Check size={12} className="text-blue-600" />}
                                                    </span>
                                                    {s}
                                                </button>
                                            ))}
                                            {isCustom && (
                                                <button type="button"
                                                    onClick={() => {
                                                        setCourtSurface(trimmed);
                                                        setSurfaceSearch('');
                                                        setIsSurfaceDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left px-5 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3 border-t border-slate-100"
                                                >
                                                    <Plus size={14} className="text-blue-600 shrink-0" />
                                                    <span className="font-bold text-sm text-blue-600">Use "{trimmed}"</span>
                                                </button>
                                            )}
                                            {filtered.length === 0 && !isCustom && (
                                                <div className="px-5 py-4 text-center">
                                                    <p className="text-[10px] text-slate-400 font-bold">Type to add a custom surface.</p>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Price (₱/hr)</label>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => { setIsCourtFree(!isCourtFree); if (!isCourtFree) setCourtPrice(0); }}
                            className={`shrink-0 px-4 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all ${isCourtFree
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                                : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-emerald-300 hover:text-emerald-500'
                                }`}
                        >
                            🎉 Free
                        </button>
                        {!isCourtFree && (
                            <input
                                required
                                type="number"
                                min="1"
                                step="1"
                                value={courtPrice}
                                onChange={e => setCourtPrice(Number(e.target.value))}
                                placeholder="Min ₱1"
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm"
                            />
                        )}
                        {isCourtFree && (
                            <span className="text-emerald-600 font-black text-sm">This court is free to book!</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Cleaning Time */}
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Cleaning Time Buffer</label>
                <div className="grid grid-cols-5 gap-2">
                    {[
                        { label: 'None', value: 0 },
                        { label: '15m', value: 15 },
                        { label: '30m', value: 30 },
                        { label: '1hr', value: 60 },
                        { label: '2hr', value: 120 },
                    ].map(option => (
                        <button key={option.value} type="button" onClick={() => setCourtCleaningTime(option.value)}
                            className={`py-2.5 rounded-xl font-bold text-xs transition-all border ${courtCleaningTime === option.value
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-400'
                                }`}>
                            {option.label}
                        </button>
                    ))}
                    {[
                        { label: '3hr', value: 180 },
                        { label: '4hr', value: 240 },
                        { label: '6hr', value: 360 },
                        { label: '8hr', value: 480 },
                        { label: '12hr', value: 720 },
                    ].map(option => (
                        <button key={option.value} type="button" onClick={() => setCourtCleaningTime(option.value)}
                            className={`py-2.5 rounded-xl font-bold text-xs transition-all border ${courtCleaningTime === option.value
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-400'
                                }`}>
                            {option.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <input type="number" min="0" max="720" step="5" value={courtCleaningTime}
                        onChange={e => setCourtCleaningTime(Number(e.target.value))} placeholder="Custom minutes"
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-xs" />
                    <span className="text-[9px] text-slate-400 font-bold whitespace-nowrap">Custom (0-720m)</span>
                </div>
                <p className="text-[9px] text-slate-400 ml-4">
                    Inherited from location: <span className="font-bold text-slate-600">{location?.base_cleaning_time || 0}m</span>. Override per court above.
                </p>
            </div>

            <div className="space-y-2" ref={courtAmenityDropdownRef}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Court-Specific Amenities</label>

                {/* Selected court amenities tags */}
                {selectedCourtAmenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2 px-1">
                        {selectedCourtAmenities.map((a, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                                {a}
                                <button type="button" onClick={() => setSelectedCourtAmenities(prev => prev.filter((_, i) => i !== idx))}
                                    className="text-emerald-400 hover:text-rose-500 transition-colors">
                                    <X size={12} />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Dropdown trigger / search */}
                <div className="relative">
                    <div
                        onClick={() => setIsCourtAmenityDropdownOpen(!isCourtAmenityDropdownOpen)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 cursor-pointer flex items-center justify-between hover:border-emerald-200 transition-colors"
                    >
                        <input
                            type="text"
                            value={courtAmenitySearch}
                            onChange={e => { setCourtAmenitySearch(e.target.value); setIsCourtAmenityDropdownOpen(true); }}
                            onFocus={() => setIsCourtAmenityDropdownOpen(true)}
                            placeholder={selectedCourtAmenities.length > 0 ? 'Add more...' : 'Select or type court amenities...'}
                            className="bg-transparent outline-none font-bold text-sm flex-1 w-full"
                        />
                        <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ${isCourtAmenityDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Dropdown list */}
                    {isCourtAmenityDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                            {(() => {
                                const knownNames = masterCourtAmenities.map(a => a.name);
                                const filtered = knownNames.filter(a =>
                                    !selectedCourtAmenities.some(s => s.toLowerCase() === a.toLowerCase()) &&
                                    a.toLowerCase().includes(courtAmenitySearch.toLowerCase())
                                );
                                const trimmedSearch = courtAmenitySearch.trim();
                                const isCustom = trimmedSearch &&
                                    !knownNames.some(a => a.toLowerCase() === trimmedSearch.toLowerCase()) &&
                                    !selectedCourtAmenities.some(a => a.toLowerCase() === trimmedSearch.toLowerCase());

                                return (
                                    <>
                                        {isCustom && (
                                            <button type="button"
                                                onClick={() => {
                                                    setSelectedCourtAmenities(prev => [...prev, trimmedSearch]);
                                                    setCourtAmenitySearch('');
                                                }}
                                                className="w-full text-left px-5 py-3 hover:bg-emerald-50 transition-colors flex items-center gap-3 border-b border-slate-100"
                                            >
                                                <Plus size={14} className="text-emerald-600 shrink-0" />
                                                <span className="font-bold text-sm text-emerald-600">Add "{trimmedSearch}"</span>
                                            </button>
                                        )}
                                        {filtered.length > 0 ? filtered.map((a, idx) => (
                                            <button type="button" key={idx}
                                                onClick={() => {
                                                    setSelectedCourtAmenities(prev => [...prev, a]);
                                                    setCourtAmenitySearch('');
                                                }}
                                                className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors font-bold text-sm text-slate-700 flex items-center gap-3"
                                            >
                                                <span className="w-5 h-5 rounded-md border border-slate-200 flex items-center justify-center shrink-0">
                                                    {selectedCourtAmenities.includes(a) && <Check size={12} className="text-emerald-600" />}
                                                </span>
                                                {a}
                                            </button>
                                        )) : !isCustom && (
                                            <div className="px-5 py-4 text-center">
                                                <p className="text-[10px] text-slate-400 font-bold">No court amenities found. Type to add a custom one.</p>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
                <p className="text-[9px] text-slate-400 ml-4">
                    Location amenities ({(location?.amenities || []).join(', ') || 'none'}) are shared across all courts.
                </p>
            </div>

            {/* ──── Court Closures Calendar ──── */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 ml-4">
                    <Calendar size={14} className="text-blue-600" />
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Future Dates of Closure</label>
                </div>
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-4">
                    {/* Calendar Month Navigation */}
                    <div className="flex items-center justify-between">
                        <button type="button" onClick={() => {
                            const prev = new Date(courtClosureCalendarMonth);
                            prev.setMonth(prev.getMonth() - 1);
                            setCourtClosureCalendarMonth(prev);
                        }} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-700">
                            <ChevronDown size={16} className="rotate-90" />
                        </button>
                        <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
                            {courtClosureCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button type="button" onClick={() => {
                            const next = new Date(courtClosureCalendarMonth);
                            next.setMonth(next.getMonth() + 1);
                            setCourtClosureCalendarMonth(next);
                        }} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-700">
                            <ChevronDown size={16} className="-rotate-90" />
                        </button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="text-center text-[8px] font-black text-slate-300 uppercase py-1">{d}</div>
                        ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                        {(() => {
                            const year = courtClosureCalendarMonth.getFullYear();
                            const month = courtClosureCalendarMonth.getMonth();
                            const firstDay = new Date(year, month, 1).getDay();
                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                            const today = new Date().toISOString().split('T')[0];
                            const cells: React.ReactNode[] = [];

                            // Use DB closures for edit mode, pending closures for add mode
                            const activeClosures = isEdit
                                ? courtClosures
                                : pendingCourtClosures.map((c, i) => ({ ...c, id: `pending-${i}` }));

                            for (let i = 0; i < firstDay; i++) {
                                cells.push(<div key={`empty-${i}`} />);
                            }

                            for (let day = 1; day <= daysInMonth; day++) {
                                const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                                const isPast = dateStr < today;
                                const closure = activeClosures.find(c => c.date === dateStr);
                                const isSelected = selectedCourtClosureDate === dateStr;

                                cells.push(
                                    <button
                                        type="button"
                                        key={dateStr}
                                        disabled={isPast}
                                        onClick={() => {
                                            if (closure) {
                                                setSelectedCourtClosureDate(dateStr);
                                                setCourtClosureReason(closure.reason as CourtClosureReason);
                                                setCourtClosureDescription(closure.description || '');
                                            } else {
                                                setSelectedCourtClosureDate(isSelected ? null : dateStr);
                                                setCourtClosureReason('Tournament');
                                                setCourtClosureDescription('');
                                            }
                                        }}
                                        className={`aspect-square rounded-lg text-[11px] font-bold transition-all relative ${isPast
                                            ? 'text-slate-200 cursor-not-allowed'
                                            : closure
                                                ? closure.reason === 'Tournament'
                                                    ? 'bg-blue-500 text-white shadow-md shadow-blue-200/50'
                                                    : closure.reason === 'Holiday'
                                                        ? 'bg-rose-500 text-white shadow-md shadow-rose-200/50'
                                                        : closure.reason === 'Maintenance'
                                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200/50'
                                                            : 'bg-purple-500 text-white shadow-md shadow-purple-200/50'
                                                : isSelected
                                                    ? 'bg-slate-900 text-white shadow-md'
                                                    : 'text-slate-600 hover:bg-white hover:shadow-sm'
                                            }`}
                                        title={closure ? `${closure.reason}${closure.description ? ': ' + closure.description : ''}` : ''}
                                    >
                                        {day}
                                        {closure && (
                                            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/60" />
                                        )}
                                    </button>
                                );
                            }
                            return cells;
                        })()}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/60">
                        {[
                            { color: 'bg-rose-500', label: 'Holiday' },
                            { color: 'bg-blue-500', label: 'Tournament' },
                            { color: 'bg-blue-600', label: 'Maintenance' },
                            { color: 'bg-purple-500', label: 'Other' },
                        ].map(l => (
                            <div key={l.label} className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${l.color}`} />
                                <span className="text-[8px] font-bold text-slate-400 uppercase">{l.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Add/Edit Closure Form */}
                    {selectedCourtClosureDate && (
                        <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                                    📅 {new Date(selectedCourtClosureDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                                <button type="button" onClick={() => setSelectedCourtClosureDate(null)} className="text-slate-300 hover:text-slate-500">
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reason</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {(['Holiday', 'Tournament', 'Maintenance', 'Private Event', 'Weather', 'Other'] as const).map(r => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setCourtClosureReason(r)}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${courtClosureReason === r
                                                ? r === 'Holiday' ? 'bg-rose-500 text-white shadow-md'
                                                    : r === 'Tournament' ? 'bg-blue-500 text-white shadow-md'
                                                        : r === 'Maintenance' ? 'bg-blue-600 text-white shadow-md'
                                                            : 'bg-purple-500 text-white shadow-md'
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Description (Optional)</label>
                                <input
                                    type="text"
                                    value={courtClosureDescription}
                                    onChange={e => setCourtClosureDescription(e.target.value)}
                                    placeholder="e.g. Barangay Tournament, Christmas Day..."
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-4 outline-none font-bold text-xs focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <div className="flex gap-2">
                                {isEdit && courtClosures.find(c => c.date === selectedCourtClosureDate) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const existing = courtClosures.find(c => c.date === selectedCourtClosureDate);
                                            if (existing) handleRemoveCourtClosure(existing.id);
                                        }}
                                        className="flex-1 py-2.5 border border-rose-200 text-rose-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all"
                                    >
                                        Remove
                                    </button>
                                )}
                                {!isEdit && pendingCourtClosures.find(c => c.date === selectedCourtClosureDate) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleRemovePendingClosure(selectedCourtClosureDate!);
                                            setSelectedCourtClosureDate(null);
                                        }}
                                        className="flex-1 py-2.5 border border-rose-200 text-rose-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all"
                                    >
                                        Remove
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={isEdit ? handleAddCourtClosure : handleAddPendingClosure}
                                    disabled={isEdit && isSavingCourtClosure}
                                    className="flex-[2] py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all disabled:bg-slate-200"
                                >
                                    {isSavingCourtClosure && isEdit
                                        ? 'Saving...'
                                        : isEdit
                                            ? courtClosures.find(c => c.date === selectedCourtClosureDate)
                                                ? 'Update Closure'
                                                : 'Set as Closed'
                                            : pendingCourtClosures.find(c => c.date === selectedCourtClosureDate)
                                                ? 'Update Closure'
                                                : 'Set as Closed'
                                    }
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Upcoming Closures List */}
                    {(() => {
                        const activeList = isEdit ? courtClosures : pendingCourtClosures.map((c, i) => ({ ...c, id: `pending-${i}` }));
                        if (activeList.length === 0) return null;
                        return (
                            <div className="space-y-2 pt-2 border-t border-slate-200/60">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    {isEdit ? 'Upcoming Closures' : 'Scheduled Closures (will be saved with court)'}
                                </p>
                                <div className="max-h-32 overflow-y-auto space-y-1.5">
                                    {activeList.map(c => (
                                        <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${c.reason === 'Holiday' ? 'bg-rose-500'
                                                    : c.reason === 'Tournament' ? 'bg-blue-500'
                                                        : c.reason === 'Maintenance' ? 'bg-blue-600'
                                                            : 'bg-purple-500'
                                                    }`} />
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold text-slate-700 truncate">
                                                        {new Date(c.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        <span className="text-slate-400 ml-1.5">{c.reason}</span>
                                                    </p>
                                                    {c.description && <p className="text-[9px] text-slate-400 truncate">{c.description}</p>}
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => {
                                                if (isEdit) handleRemoveCourtClosure(c.id);
                                                else handleRemovePendingClosure(c.date);
                                            }} className="text-slate-300 hover:text-rose-500 shrink-0 ml-2">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>
                <p className="text-[9px] text-slate-400 ml-4">
                    Mark dates when this court will be unavailable for tournaments, holidays, maintenance, etc.
                </p>
            </div>

            <div className={`pt-2 ${isEdit ? 'flex gap-4' : ''}`}>
                {isEdit && (
                    <button type="button" onClick={() => editingCourt && handleDeleteCourt(editingCourt.id)}
                        className="flex-1 h-14 border border-rose-100 text-rose-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-2">
                        <Trash2 size={18} /> Remove
                    </button>
                )}
                <button type="submit" disabled={isSubmitting}
                    className={`${isEdit ? 'flex-[2]' : 'w-full'} h-14 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 disabled:bg-slate-200 active:scale-95`}>
                    {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Court'}
                </button>
            </div>
        </form>
    );

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-10 bg-slate-100 rounded-2xl w-48"></div>
                <div className="h-64 bg-slate-100 rounded-[40px]"></div>
                <div className="grid grid-cols-3 gap-6">
                    {Array(3).fill(0).map((_, i) => <div key={i} className="h-40 bg-slate-100 rounded-[40px]"></div>)}
                </div>
            </div>
        );
    }

    if (!location) {
        return (
            <div className="py-20 text-center">
                <Building2 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">Location not found</h3>
                <button onClick={() => navigate('/locations')} className="mt-4 text-blue-600 font-bold text-sm hover:underline">Go back to locations</button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Back Button & Header */}
            <div>
                <button onClick={() => navigate('/locations')}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-sm mb-4 transition-colors">
                    <ChevronLeft size={18} /> Back to Locations
                </button>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-2">LOCATION DETAIL</p>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{location.name}</h1>
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium mt-1">
                            <MapPin size={14} />
                            <span>{location.address}, {location.city}</span>
                        </div>
                    </div>
                    <div className="flex gap-3 self-start md:self-auto">
                        <button onClick={() => { setIsCourtAmenitiesModalOpen(true); setNewMasterCourtAmenity(''); setEditingMasterCourtIdx(null); }}
                            className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 flex items-center gap-2">
                            <Sparkles size={16} /> Court Amenities
                        </button>
                        <button onClick={() => { resetCourtForm(); setIsAddCourtOpen(true); }}
                            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center gap-2">
                            <Plus size={16} /> Add Court
                        </button>
                    </div>
                </div>
            </div>

            {/* Location Info Banner */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Map */}
                    <div className="md:col-span-1 h-48 bg-slate-100 rounded-[28px] overflow-hidden">
                        <MiniMap lat={location.latitude} lng={location.longitude} />
                    </div>
                    {/* Stats */}
                    <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatBox label="Courts" value={courts.length.toString()} sub="Registered" />
                        <StatBox label="Court Units" value={totalCourtUnits.toString()} sub="Total capacity" color="text-blue-600" />
                        <StatBox label="Cleaning Buffer" value={location.base_cleaning_time > 0 ? `${location.base_cleaning_time}m` : 'None'} sub="Default" color="text-blue-500" />
                        <StatBox label="Status" value={location.is_active ? 'Active' : 'Inactive'} sub={location.is_active ? 'Accepting bookings' : 'Paused'} color={location.is_active ? 'text-emerald-500' : 'text-slate-400'} />
                    </div>
                </div>

                {/* Details Row */}
                <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-slate-100">
                    {location.phone && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg border border-slate-100">
                            <Phone size={12} /> {location.phone}
                        </span>
                    )}
                    {location.description && (
                        <span className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-md">{location.description}</span>
                    )}
                    {location.amenities && location.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {location.amenities.map((a, i) => (
                                <span key={i} className="text-[8px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100 uppercase tracking-wider">{a}</span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Courts Section */}
            <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase mb-6">Courts at this Location</h2>

                {courts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courts.map(court => (
                            <CourtCard key={court.id} court={court} onEdit={() => openEditCourt(court)} navigate={navigate} />
                        ))}

                        {/* Add Court Card */}
                        <button onClick={() => { resetCourtForm(); setIsAddCourtOpen(true); }}
                            className="bg-white rounded-[40px] border-2 border-dashed border-slate-200 hover:border-blue-400 transition-all duration-300  flex flex-col items-center justify-center gap-3 min-h-[240px] group">
                            <div className="w-14 h-14 bg-slate-50 group-hover:bg-blue-50 rounded-2xl flex items-center justify-center transition-colors">
                                <Plus size={24} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 group-hover:text-blue-500 uppercase tracking-widest transition-colors">Add Court</span>
                        </button>
                    </div>
                ) : (
                    <div className="py-16 text-center bg-white rounded-[48px] border border-dashed border-slate-200">
                        <Building2 className="w-14 h-14 text-slate-200 mx-auto mb-3" />
                        <h3 className="text-lg font-black text-slate-400 uppercase tracking-tighter">No courts yet</h3>
                        <p className="text-slate-400 text-sm font-medium mb-5">Add your first court to this location.</p>
                        <button onClick={() => { resetCourtForm(); setIsAddCourtOpen(true); }}
                            className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 inline-flex items-center gap-2">
                            <Plus size={16} /> Add First Court
                        </button>
                    </div>
                )}
            </div>

            {/* Add Court Modal */}
            {isAddCourtOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 z-[100] max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Add Court</h2>
                            <button onClick={() => setIsAddCourtOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">
                            at {location.name} • {location.city}
                        </p>
                        {renderCourtForm(handleAddCourt, false)}
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Court Modal */}
            {isEditCourtOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 z-[100] max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Edit Court</h2>
                            <button onClick={() => { setIsEditCourtOpen(false); setEditingCourt(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">
                            at {location.name} • {location.city}
                        </p>
                        {renderCourtForm(handleUpdateCourt, true)}
                    </div>
                </div>,
                document.body
            )}

            {/* Court Amenities Master Modal */}
            {isCourtAmenitiesModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 z-[100] max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Court Amenities</h2>
                            <button onClick={() => setIsCourtAmenitiesModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">
                            Manage your reusable court amenities list
                        </p>

                        {/* Add New Court Amenity */}
                        <div className="flex gap-3 mb-8">
                            <input
                                type="text"
                                value={newMasterCourtAmenity}
                                onChange={e => setNewMasterCourtAmenity(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMasterCourtAmenity(); } }}
                                placeholder="e.g. Lights, Scoreboard, Fan..."
                                className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-sm"
                            />
                            <button
                                type="button"
                                onClick={handleAddMasterCourtAmenity}
                                disabled={!newMasterCourtAmenity.trim() || isSavingMasterCourt}
                                className="px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:bg-slate-200 disabled:text-slate-400 flex items-center gap-2 shadow-lg shadow-emerald-200"
                            >
                                <Plus size={16} /> Add
                            </button>
                        </div>

                        {/* Court Amenities List */}
                        {masterCourtAmenities.length > 0 ? (
                            <div className="space-y-3">
                                {masterCourtAmenities.map((amenity) => (
                                    <div key={amenity.id} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 group hover:border-emerald-200 transition-colors">
                                        {editingMasterCourtIdx === amenity.id ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editingMasterCourtValue}
                                                    onChange={e => setEditingMasterCourtValue(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveEditMasterCourtAmenity(); } if (e.key === 'Escape') setEditingMasterCourtIdx(null); }}
                                                    className="flex-1 bg-white border border-emerald-200 rounded-xl py-2 px-4 outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-sm"
                                                    autoFocus
                                                />
                                                <button onClick={handleSaveEditMasterCourtAmenity} disabled={isSavingMasterCourt}
                                                    className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:bg-slate-200">
                                                    <Check size={16} />
                                                </button>
                                                <button onClick={() => setEditingMasterCourtIdx(null)}
                                                    className="p-2 bg-slate-200 text-slate-500 rounded-xl hover:bg-slate-300 transition-colors">
                                                    <X size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={14} className="text-emerald-400 shrink-0" />
                                                <span className="flex-1 font-bold text-sm text-slate-700">{amenity.name}</span>
                                                <button onClick={() => { setEditingMasterCourtIdx(amenity.id); setEditingMasterCourtValue(amenity.name); }}
                                                    className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                    <Pencil size={15} />
                                                </button>
                                                <button onClick={() => handleDeleteMasterCourtAmenity(amenity.id)} disabled={isSavingMasterCourt}
                                                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50">
                                                    <Trash2 size={15} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <Sparkles className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                <p className="text-sm font-black text-slate-400 uppercase tracking-tighter">No court amenities yet</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-1">Add amenities like Lights, Scoreboard, Fan, Paddle, Balls, etc.</p>
                            </div>
                        )}

                        {/* Total count footer */}
                        {masterCourtAmenities.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {masterCourtAmenities.length} {masterCourtAmenities.length === 1 ? 'amenity' : 'amenities'}
                                </span>
                                {isSavingMasterCourt && (
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                                        Saving...
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
};

// ---------- Sub-components ----------

const StatBox: React.FC<{ label: string; value: string; sub: string; color?: string }> = ({ label, value, sub, color = 'text-slate-900' }) => (
    <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</p>
        <p className={`text-2xl font-black tracking-tighter ${color}`}>{value}</p>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{sub}</p>
    </div>
);

const MiniMap: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
    const mapRef = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (mapRef.current && window.google) {
            const map = new window.google.maps.Map(mapRef.current, {
                center: { lat, lng }, zoom: 15, disableDefaultUI: true, gestureHandling: 'none',
                styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }, { featureType: 'transit', stylers: [{ visibility: 'off' }] }]
            });
            new window.google.maps.Marker({
                position: { lat, lng }, map,
                icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#3b82f6', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 }
            });
        }
    }, [lat, lng]);
    return <div ref={mapRef} className="w-full h-full" />;
};

const CourtCard: React.FC<{ court: any; onEdit: () => void; navigate: any }> = ({ court, onEdit, navigate }) => {
    const courtStatus = court.status || 'Available';
    const statusConfig: Record<string, { bg: string; border: string; text: string; label: string }> = {
        'Available': { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', label: 'Available' },
        'Fully Booked': { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600', label: 'Fully Booked' },
        'Coming Soon': { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600', label: 'Coming Soon' },
        'Maintenance': { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600', label: 'Maintenance' },
    };
    const sc = statusConfig[courtStatus] || statusConfig['Available'];

    return (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden">
            <div className="p-8 pb-4">
                <div className="flex items-center justify-between mb-5">
                    <div className={`p-3 rounded-2xl ${courtStatus === 'Available' ? 'bg-emerald-50 text-emerald-600' : courtStatus === 'Fully Booked' ? 'bg-blue-50 text-blue-600' : courtStatus === 'Coming Soon' ? 'bg-blue-50 text-blue-600' : 'bg-blue-50 text-blue-600'}`}>
                        <Activity size={22} />
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${sc.bg} ${sc.border} ${sc.text}`}>
                        {sc.label}
                    </span>
                </div>

                <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase group-hover:text-blue-500 transition-colors">{court.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                    {court.num_courts} {court.num_courts === 1 ? 'Court' : 'Courts'} • {court.surface_type || 'Acrylic'}
                </p>
            </div>

            <div className="px-8 pb-8 pt-3">
                {/* Price & Cleaning */}
                <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl text-white mb-5">
                    <div>
                        <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Rate</p>
                        <div className="flex items-baseline gap-1">
                            {court.base_price > 0 ? (
                                <>
                                    <span className="text-lg font-black">₱{court.base_price}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">/hr</span>
                                </>
                            ) : (
                                <span className="text-lg font-black text-emerald-400">FREE</span>
                            )}
                        </div>
                    </div>
                    {court.cleaning_time_minutes > 0 && (
                        <div className="text-right">
                            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Buffer</p>
                            <span className="text-sm font-black">
                                {court.cleaning_time_minutes >= 60
                                    ? `${Math.floor(court.cleaning_time_minutes / 60)}h${court.cleaning_time_minutes % 60 > 0 ? ` ${court.cleaning_time_minutes % 60}m` : ''}`
                                    : `${court.cleaning_time_minutes}m`}
                            </span>
                        </div>
                    )}
                </div>

                {/* Amenities */}
                {court.amenities && court.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-5">
                        {court.amenities.map((a: string, i: number) => (
                            <span key={i} className="text-[8px] font-bold px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md border border-slate-100 uppercase tracking-wider">{a}</span>
                        ))}
                    </div>
                )}

                <div className="flex gap-2">
                    <button onClick={() => navigate('/bookings-admin')}
                        className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-200">
                        Bookings
                    </button>
                    <button onClick={onEdit}
                        className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl border border-slate-100 transition-colors">
                        <Settings2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LocationDetailPage;
