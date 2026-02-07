import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Plus, LayoutGrid, List, X, Search, ChevronRight, Clock, Trash2, Target, Phone, FileText, Camera, Image, Check } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { uploadCourtImage } from '../../../services/locations';
import { Location } from '../../../types';

declare global {
    interface Window {
        google: any;
    }
}

const LocationsList: React.FC = () => {
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    // Form state
    const [formName, setFormName] = useState('');
    const [formAddress, setFormAddress] = useState('');
    const [formCity, setFormCity] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formAmenities, setFormAmenities] = useState('');
    const [formCleaningTime, setFormCleaningTime] = useState(0);
    const [previewCoords, setPreviewCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [isGeocoding, setIsGeocoding] = useState(false);

    const geocodeAddress = async (address: string, city: string): Promise<{ lat: number; lng: number } | null> => {
        if (!window.google || !address || !city) return null;
        const geocoder = new window.google.maps.Geocoder();
        const fullAddress = `${address}, ${city}, Philippines`;
        return new Promise((resolve) => {
            geocoder.geocode({ address: fullAddress }, (results: any, status: any) => {
                if (status === 'OK' && results[0]) {
                    const { lat, lng } = results[0].geometry.location;
                    resolve({ lat: lat(), lng: lng() });
                } else {
                    resolve(null);
                }
            });
        });
    };

    // Debounced geocoding
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (formAddress && formCity && (isAddModalOpen || isEditModalOpen)) {
                setIsGeocoding(true);
                const coords = await geocodeAddress(formAddress, formCity);
                setPreviewCoords(coords);
                setIsGeocoding(false);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [formAddress, formCity, isAddModalOpen, isEditModalOpen]);

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) return;

            // Fetch locations with court count
            const { data, error } = await supabase
                .from('locations')
                .select('*, courts(id)')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mapped = (data || []).map(loc => ({
                ...loc,
                amenities: Array.isArray(loc.amenities) ? loc.amenities : [],
                court_count: Array.isArray(loc.courts) ? loc.courts.length : 0
            }));

            setLocations(mapped);
        } catch (err) {
            console.error('Error fetching locations:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormName('');
        setFormAddress('');
        setFormCity('');
        setFormPhone('');
        setFormDescription('');
        setFormAmenities('');
        setFormCleaningTime(0);
        setPreviewCoords(null);
    };

    const handleAddLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('locations')
                .insert({
                    owner_id: user.id,
                    name: formName,
                    address: formAddress,
                    city: formCity,
                    phone: formPhone || null,
                    description: formDescription || null,
                    amenities: formAmenities.split(',').map(a => a.trim()).filter(Boolean),
                    base_cleaning_time: formCleaningTime,
                    latitude: previewCoords?.lat || 14.5995,
                    longitude: previewCoords?.lng || 120.9842,
                    is_active: true
                });

            if (error) throw error;
            setIsAddModalOpen(false);
            resetForm();
            fetchLocations();
        } catch (err: any) {
            console.error('Error adding location:', err);
            alert(`Failed to add location: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLocation) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('locations')
                .update({
                    name: formName,
                    address: formAddress,
                    city: formCity,
                    phone: formPhone || null,
                    description: formDescription || null,
                    amenities: formAmenities.split(',').map(a => a.trim()).filter(Boolean),
                    base_cleaning_time: formCleaningTime,
                    latitude: previewCoords?.lat,
                    longitude: previewCoords?.lng
                })
                .eq('id', editingLocation.id);

            if (error) throw error;
            setIsEditModalOpen(false);
            setEditingLocation(null);
            resetForm();
            fetchLocations();
        } catch (err: any) {
            console.error('Error updating location:', err);
            alert(`Failed to update location: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteLocation = async (id: string) => {
        if (!confirm('Are you sure? This will delete this location and ALL courts within it. This cannot be undone.')) return;
        try {
            const { error } = await supabase.from('locations').delete().eq('id', id);
            if (error) throw error;
            fetchLocations();
            setIsEditModalOpen(false);
            setEditingLocation(null);
        } catch (err) {
            console.error('Error deleting location:', err);
            alert('Failed to delete location.');
        }
    };

    const openEditModal = (loc: Location) => {
        setEditingLocation(loc);
        setFormName(loc.name);
        setFormAddress(loc.address);
        setFormCity(loc.city);
        setFormPhone(loc.phone || '');
        setFormDescription(loc.description || '');
        setFormAmenities(Array.isArray(loc.amenities) ? loc.amenities.join(', ') : '');
        setFormCleaningTime(loc.base_cleaning_time || 0);
        if (loc.latitude && loc.longitude) {
            setPreviewCoords({ lat: loc.latitude, lng: loc.longitude });
        } else {
            setPreviewCoords(null);
        }
        setIsEditModalOpen(true);
    };

    const filteredLocations = locations.filter(loc =>
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.city.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalCourts = locations.reduce((sum, loc) => sum + (loc.court_count || 0), 0);

    // Shared form JSX
    const renderForm = (onSubmit: (e: React.FormEvent) => void, isEdit: boolean) => (
        <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left Column: Image & Form Fields */}
            <div className="space-y-6">

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Venue Name</label>
                    <input required type="text" value={formName} onChange={e => setFormName(e.target.value)}
                        placeholder="e.g. Manila Sports Complex"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">City</label>
                        <input required type="text" value={formCity} onChange={e => setFormCity(e.target.value)}
                            placeholder="e.g. Cebu City"
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Phone</label>
                        <input type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)}
                            placeholder="09XX XXX XXXX"
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Address</label>
                    <input required type="text" value={formAddress} onChange={e => setFormAddress(e.target.value)}
                        placeholder="Full street address"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm" />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Description</label>
                    <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)}
                        placeholder="Brief description of your venue..."
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm resize-none" />
                </div>


                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Amenities</label>
                    <input type="text" value={formAmenities} onChange={e => setFormAmenities(e.target.value)}
                        placeholder="WiFi, Parking, Water Station, Locker..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm" />
                </div>

                {/* Default Cleaning Time */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                        Default Cleaning Buffer
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                        {[
                            { label: 'None', value: 0 },
                            { label: '15m', value: 15 },
                            { label: '30m', value: 30 },
                            { label: '1hr', value: 60 },
                            { label: '2hr', value: 120 },
                        ].map(option => (
                            <button key={option.value} type="button" onClick={() => setFormCleaningTime(option.value)}
                                className={`py-2.5 rounded-xl font-bold text-xs transition-all border ${formCleaningTime === option.value
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-400'
                                    }`}>
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-[9px] text-slate-400 ml-4">
                        Courts at this location will inherit this cleaning buffer by default.
                    </p>
                </div>
            </div>

            {/* Right Column: Map & Submit */}
            <div className="flex flex-col h-full">
                <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-center ml-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location Verification</label>
                        {isGeocoding && <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>}
                    </div>
                    <div className="h-64 lg:h-[380px] bg-slate-50 rounded-[32px] border border-slate-100 overflow-hidden relative shadow-inner">
                        <MapPreview
                            coords={previewCoords}
                            onCoordsChange={setPreviewCoords}
                            onAddressChange={(address, city) => {
                                setFormAddress(address);
                                setFormCity(city);
                            }}
                        />
                        {!previewCoords && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm text-slate-300 gap-2">
                                <MapPin size={32} />
                                <p className="text-[10px] font-black uppercase tracking-widest">Enter address or use GPS</p>
                            </div>
                        )}
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-widest">
                        TIP: Drag the marker or click map to refine location
                    </p>
                </div>

                <div className={`mt-8 ${isEdit ? 'flex gap-4' : ''}`}>
                    {isEdit && (
                        <button type="button" onClick={() => editingLocation && handleDeleteLocation(editingLocation.id)}
                            className="flex-1 h-16 border border-rose-100 text-rose-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-2">
                            <Trash2 size={18} /> Remove
                        </button>
                    )}
                    <button type="submit" disabled={isSubmitting}
                        className={`${isEdit ? 'flex-[2]' : 'w-full'} h-16 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-amber-500 transition-all shadow-xl shadow-slate-200 disabled:bg-slate-200 active:scale-95`}>
                        {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Location'}
                    </button>
                </div>
            </div>
        </form>
    );

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-2">COURT OWNER / 2025</p>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">My Locations</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Manage your venues and courts in one place.</p>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setViewMode('grid')}
                        className={`px-5 py-3 border rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-900'}`}>
                        <LayoutGrid size={20} />
                    </button>
                    <button onClick={() => setViewMode('list')}
                        className={`px-5 py-3 border rounded-xl transition-all ${viewMode === 'list' ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-900'}`}>
                        <List size={20} />
                    </button>
                    <button onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                        className="px-8 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-amber-200 ml-2 flex items-center gap-2">
                        <Plus size={16} /> Add Location
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard label="Total Locations" count={locations.length.toString()} subtext="Active venues" />
                <MetricCard label="Total Courts" count={totalCourts.toString()} subtext="Across all locations" color="text-blue-600" />
                <MetricCard label="Active" count={locations.filter(l => l.is_active).length.toString()} subtext="Ready for bookings" color="text-emerald-500" />
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search locations..."
                    className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-14 pr-6 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
            </div>

            {/* Location Cards */}
            {isLoading ? (
                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                    {Array(3).fill(0).map((_, i) => (
                        <div key={i} className="bg-white rounded-[40px] border border-slate-100 animate-pulse h-72"></div>
                    ))}
                </div>
            ) : filteredLocations.length > 0 ? (
                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                    {filteredLocations.map(loc => (
                        <LocationCard
                            key={loc.id}
                            location={loc}
                            viewMode={viewMode}
                            onView={() => navigate(`/locations/${loc.id}`)}
                            onEdit={() => openEditModal(loc)}
                        />
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center bg-white rounded-[48px] border border-dashed border-slate-200">
                    <Building2 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">No locations found</h3>
                    <p className="text-slate-400 text-sm font-medium mb-6">Add your first location to start managing courts.</p>
                    <button onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                        className="px-8 py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-amber-200 inline-flex items-center gap-2">
                        <Plus size={16} /> Add Your First Location
                    </button>
                </div>
            )}

            {/* Add Location Modal */}
            {isAddModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 z-[100] max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Add New Location</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
                        </div>
                        {renderForm(handleAddLocation, false)}
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Location Modal */}
            {isEditModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 z-[100] max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Edit Location</h2>
                            <button onClick={() => { setIsEditModalOpen(false); setEditingLocation(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
                        </div>
                        {renderForm(handleUpdateLocation, true)}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// ---------- Sub-components ----------

const MetricCard: React.FC<{ label: string; count: string; subtext: string; color?: string }> = ({ label, count, subtext, color = 'text-slate-900' }) => (
    <div className="bg-white p-8 rounded-[40px] border border-slate-100/50 shadow-sm relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-slate-50 rounded-full group-hover:scale-125 transition-transform duration-700"></div>
        <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{label}</p>
            <p className={`text-4xl font-black tracking-tighter mb-1 ${color}`}>{count}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtext}</p>
        </div>
    </div>
);

const LocationCard: React.FC<{
    location: Location;
    viewMode: 'grid' | 'list';
    onView: () => void;
    onEdit: () => void;
}> = ({ location, viewMode, onView, onEdit }) => {
    const courtCount = location.court_count || 0;

    if (viewMode === 'list') {
        return (
            <div onClick={onView}
                className="bg-white rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 p-6 flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-5 flex-1 min-w-0">
                    <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
                        <MapPin size={24} className="text-amber-500" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base font-black text-slate-900 tracking-tight uppercase truncate group-hover:text-amber-500 transition-colors">{location.name}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{location.address}, {location.city}</p>
                    </div>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                    <div className="text-center">
                        <p className="text-2xl font-black text-slate-900">{courtCount}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{courtCount === 1 ? 'Court' : 'Courts'}</p>
                    </div>
                    {location.base_cleaning_time > 0 && (
                        <div className="flex items-center gap-1 text-blue-500">
                            <Clock size={14} />
                            <span className="text-[10px] font-bold">{location.base_cleaning_time}m</span>
                        </div>
                    )}
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${location.is_active
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}>
                        {location.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-amber-500 border border-slate-200 hover:border-amber-200 rounded-xl transition-all">
                        Edit
                    </button>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                </div>
            </div>
        );
    }

    return (
        <div onClick={onView}
            className="bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden cursor-pointer">
            {/* Image/Map Preview Header */}
            <div className="h-44 bg-slate-100 relative overflow-hidden">
                <div className="absolute top-4 right-4 flex gap-2">
                    <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border backdrop-blur-sm ${location.is_active
                        ? 'bg-emerald-50/90 border-emerald-100 text-emerald-600'
                        : 'bg-slate-50/90 border-slate-200 text-slate-400'
                        }`}>
                        {location.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div className="absolute bottom-4 left-4 flex items-end gap-3">
                    <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-white/50">
                        <p className="text-lg font-black text-slate-900 tracking-tighter">{courtCount}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{courtCount === 1 ? 'Court' : 'Courts'}</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-7">
                <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase mb-1 group-hover:text-amber-500 transition-colors truncate">{location.name}</h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mb-4">
                    <MapPin size={12} className="shrink-0" />
                    <span className="truncate">{location.address}, {location.city}</span>
                </div>

                {/* Info Tags */}
                <div className="flex flex-wrap gap-2 mb-5">
                    {location.base_cleaning_time > 0 && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                            <Clock size={10} />
                            {location.base_cleaning_time >= 60 ? `${Math.floor(location.base_cleaning_time / 60)}h` : `${location.base_cleaning_time}m`} buffer
                        </span>
                    )}
                    {location.phone && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg border border-slate-100">
                            <Phone size={10} />
                            {location.phone}
                        </span>
                    )}
                </div>

                {/* Amenities */}
                {location.amenities && location.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-5">
                        {location.amenities.slice(0, 4).map((amenity, idx) => (
                            <span key={idx} className="text-[8px] font-bold px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md border border-slate-100 uppercase tracking-wider">
                                {amenity}
                            </span>
                        ))}
                        {location.amenities.length > 4 && (
                            <span className="text-[8px] font-bold px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md border border-slate-100">
                                +{location.amenities.length - 4} more
                            </span>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onView(); }}
                        className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-all active:scale-95 shadow-lg shadow-slate-200 flex items-center justify-center gap-2">
                        Manage <ChevronRight size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl border border-slate-100 transition-colors">
                        <FileText size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const MiniMapPreview: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
    const mapRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (mapRef.current && window.google) {
            const map = new window.google.maps.Map(mapRef.current, {
                center: { lat, lng },
                zoom: 15,
                disableDefaultUI: true,
                gestureHandling: 'none',
                zoomControl: false,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                clickableIcons: false,
                styles: [
                    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
                    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
                ]
            });

            new window.google.maps.Marker({
                position: { lat, lng },
                map,
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#f59e0b',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                }
            });
        }
    }, [lat, lng]);

    return <div ref={mapRef} className="w-full h-full" />;
};

const MapPreview: React.FC<{
    coords: { lat: number; lng: number } | null;
    onCoordsChange?: (coords: { lat: number; lng: number }) => void;
    onAddressChange?: (address: string, city: string) => void;
}> = ({ coords, onCoordsChange, onAddressChange }) => {
    const [isLocating, setIsLocating] = React.useState(false);
    const mapRef = React.useRef<HTMLDivElement>(null);
    const googleMapRef = React.useRef<any>(null);
    const markerRef = React.useRef<any>(null);

    const reverseGeocode = (lat: number, lng: number) => {
        if (!window.google) return;
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
            if (status === 'OK' && results[0]) {
                const result = results[0];
                const addressComponents = result.address_components;
                const streetNum = addressComponents.find((c: any) => c.types.includes('street_number'))?.long_name || '';
                const route = addressComponents.find((c: any) => c.types.includes('route'))?.long_name || '';
                const neighborhood = addressComponents.find((c: any) => c.types.includes('neighborhood'))?.long_name || '';
                const locality = addressComponents.find((c: any) => c.types.includes('locality'))?.long_name || '';
                const adminArea2 = addressComponents.find((c: any) => c.types.includes('administrative_area_level_2'))?.long_name || '';
                const streetAddress = `${streetNum} ${route} ${neighborhood}`.trim();
                const city = locality || adminArea2 || '';
                if (onAddressChange) onAddressChange(streetAddress || result.formatted_address.split(',')[0], city);
            }
        });
    };

    const handlePinToGPS = () => {
        if (!navigator.geolocation) { alert('Geolocation is not supported'); return; }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const newCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
                if (onCoordsChange) onCoordsChange(newCoords);
                reverseGeocode(newCoords.lat, newCoords.lng);
                setIsLocating(false);
            },
            () => { alert('Could not get your location.'); setIsLocating(false); },
            { enableHighAccuracy: true }
        );
    };

    useEffect(() => {
        if (mapRef.current && window.google) {
            if (!googleMapRef.current) {
                googleMapRef.current = new window.google.maps.Map(mapRef.current, {
                    center: coords || { lat: 14.5995, lng: 120.9842 },
                    zoom: 15,
                    disableDefaultUI: true,
                    zoomControl: true,
                    gestureHandling: 'greedy',
                    styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }]
                });
                googleMapRef.current.addListener('click', (e: any) => {
                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();
                    if (onCoordsChange) onCoordsChange({ lat, lng });
                    reverseGeocode(lat, lng);
                });
                markerRef.current = new window.google.maps.Marker({
                    position: coords,
                    map: googleMapRef.current,
                    draggable: true,
                    icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: '#f59e0b', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 }
                });
                markerRef.current.addListener('dragend', () => {
                    const p = markerRef.current.getPosition();
                    if (onCoordsChange) onCoordsChange({ lat: p.lat(), lng: p.lng() });
                    reverseGeocode(p.lat(), p.lng());
                });
            } else if (coords) {
                const mp = markerRef.current.getPosition();
                const dist = mp ? (Math.abs(mp.lat() - coords.lat) + Math.abs(mp.lng() - coords.lng)) : 1;
                if (dist > 0.0001) {
                    googleMapRef.current.panTo(coords);
                    markerRef.current.setPosition(coords);
                    markerRef.current.setVisible(true);
                }
            }
        }
    }, [coords]);

    return (
        <div className="w-full h-full relative">
            <div ref={mapRef} className="w-full h-full" />
            <button type="button" onClick={handlePinToGPS} disabled={isLocating}
                className="absolute right-4 top-4 bg-white p-3 rounded-2xl shadow-xl border border-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white transition-all active:scale-95 group z-10"
                title="Use current GPS location">
                {isLocating ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> : <Target size={20} />}
            </button>
        </div>
    );
};

export default LocationsList;
