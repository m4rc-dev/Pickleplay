import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, MapPin, ChevronLeft, Plus, Clock, Settings2, Trash2, X, Target, Phone, Activity, AlertCircle, CheckCircle, Camera, Image, Check } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { uploadCourtImage } from '../../../services/locations';
import { Location } from '../../../types';

declare global {
    interface Window {
        google: any;
    }
}

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
    const [courtCleaningTime, setCourtCleaningTime] = useState(0);
    const [courtAmenities, setCourtAmenities] = useState('');
    const [courtType, setCourtType] = useState<'Indoor' | 'Outdoor'>('Indoor');

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

    const resetCourtForm = () => {
        setCourtName('');
        setCourtSurface('Pro-Cushion');
        setCourtPrice(0);
        setCourtCleaningTime(location?.base_cleaning_time || 0);
        setCourtAmenities('');
        setCourtType('Indoor');
    };

    const handleAddCourt = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('courts')
                .insert({
                    owner_id: user.id,
                    location_id: locationId,
                    name: courtName,
                    surface_type: courtSurface,
                    base_price: courtPrice,
                    cleaning_time_minutes: courtCleaningTime,
                    court_type: courtType,
                    amenities: courtAmenities.split(',').map(a => a.trim()).filter(Boolean),
                    latitude: location?.latitude,
                    longitude: location?.longitude,
                    is_active: true
                });

            if (error) throw error;
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
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('courts')
                .update({
                    name: courtName,
                    surface_type: courtSurface,
                    base_price: courtPrice,
                    cleaning_time_minutes: courtCleaningTime,
                    court_type: courtType,
                    amenities: courtAmenities.split(',').map(a => a.trim()).filter(Boolean),
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
        setCourtCleaningTime(court.cleaning_time_minutes || 0);
        setCourtAmenities(Array.isArray(court.amenities) ? court.amenities.join(', ') : '');
        setCourtType((court.court_type as 'Indoor' | 'Outdoor') || 'Indoor');
        setIsEditCourtOpen(true);
    };

    const totalCourtUnits = courts.reduce((sum, c) => sum + (c.num_courts || 1), 0);

    // Shared court form
    const renderCourtForm = (onSubmit: (e: React.FormEvent) => void, isEdit: boolean) => (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Court Name</label>
                <input required type="text" value={courtName} onChange={e => setCourtName(e.target.value)}
                    placeholder="e.g. Center Court, Court A"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm" />
            </div>

            {/* Court Type Selector */}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Court Type</label>
                <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100 gap-1 shadow-inner h-[54px]">
                    {['Indoor', 'Outdoor'].map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setCourtType(type as 'Indoor' | 'Outdoor')}
                            className={`flex-1 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all duration-300 ${courtType === type
                                ? 'bg-white text-amber-500 shadow-lg shadow-amber-100/50'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Surface Type</label>
                    <input required type="text" value={courtSurface} onChange={e => setCourtSurface(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Price (₱/hr)</label>
                    <input required type="number" min="0" step="0.01" value={courtPrice} onChange={e => setCourtPrice(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm" />
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

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Court-Specific Amenities</label>
                <input type="text" value={courtAmenities} onChange={e => setCourtAmenities(e.target.value)}
                    placeholder="Lights, Scoreboard, Fan..."
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm" />
                <p className="text-[9px] text-slate-400 ml-4">
                    Location amenities ({(location?.amenities || []).join(', ') || 'none'}) are shared across all courts.
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
                    className={`${isEdit ? 'flex-[2]' : 'w-full'} h-14 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-amber-500 transition-all shadow-xl shadow-slate-200 disabled:bg-slate-200 active:scale-95`}>
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
                    <button onClick={() => { resetCourtForm(); setIsAddCourtOpen(true); }}
                        className="px-8 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-amber-200 flex items-center gap-2 self-start md:self-auto">
                        <Plus size={16} /> Add Court
                    </button>
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
                        <StatBox label="Cleaning Buffer" value={location.base_cleaning_time > 0 ? `${location.base_cleaning_time}m` : 'None'} sub="Default" color="text-amber-500" />
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
                            className="bg-white rounded-[40px] border-2 border-dashed border-slate-200 hover:border-amber-400 transition-all duration-300  flex flex-col items-center justify-center gap-3 min-h-[240px] group">
                            <div className="w-14 h-14 bg-slate-50 group-hover:bg-amber-50 rounded-2xl flex items-center justify-center transition-colors">
                                <Plus size={24} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 group-hover:text-amber-500 uppercase tracking-widest transition-colors">Add Court</span>
                        </button>
                    </div>
                ) : (
                    <div className="py-16 text-center bg-white rounded-[48px] border border-dashed border-slate-200">
                        <Building2 className="w-14 h-14 text-slate-200 mx-auto mb-3" />
                        <h3 className="text-lg font-black text-slate-400 uppercase tracking-tighter">No courts yet</h3>
                        <p className="text-slate-400 text-sm font-medium mb-5">Add your first court to this location.</p>
                        <button onClick={() => { resetCourtForm(); setIsAddCourtOpen(true); }}
                            className="px-8 py-3 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-amber-200 inline-flex items-center gap-2">
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
                icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#f59e0b', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 }
            });
        }
    }, [lat, lng]);
    return <div ref={mapRef} className="w-full h-full" />;
};

const CourtCard: React.FC<{ court: any; onEdit: () => void; navigate: any }> = ({ court, onEdit, navigate }) => {
    return (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden">
            <div className="p-8 pb-4">
                <div className="flex items-center justify-between mb-5">
                    <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                        <Activity size={22} />
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${court.is_active
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}>
                        {court.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>

                <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase group-hover:text-amber-500 transition-colors">{court.name}</h3>
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
                            <span className="text-lg font-black">₱{court.base_price || 0}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase">/hr</span>
                        </div>
                    </div>
                    {court.cleaning_time_minutes > 0 && (
                        <div className="text-right">
                            <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest leading-none mb-1">Buffer</p>
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
                        className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-all active:scale-95 shadow-lg shadow-slate-200">
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
