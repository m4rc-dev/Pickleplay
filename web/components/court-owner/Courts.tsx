import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Activity, CheckCircle, AlertCircle, Clock, Plus, LayoutGrid, List, X, Settings2, Trash2, Navigation, Target } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface Court {
    id: string;
    owner_id: string;
    name: string;
    address: string;
    city: string;
    num_courts: number;
    surface_type: string;
    is_active: boolean;
    latitude?: number;
    longitude?: number;
    amenities?: string[];
    status?: 'Available' | 'Occupied' | 'Maintenance'; // Virtual status for UI
}

const Courts: React.FC = () => {
    const [courts, setCourts] = useState<Court[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCourt, setEditingCourt] = useState<Court | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const navigate = useNavigate();

    // Form state
    const [newName, setNewName] = useState('');
    const [newAddress, setNewAddress] = useState('');
    const [newCity, setNewCity] = useState('');
    const [newNumCourts, setNewNumCourts] = useState(1);
    const [newSurface, setNewSurface] = useState('Pro-Cushion');
    const [newAmenities, setNewAmenities] = useState(''); // Comma separated for input
    const [newPrice, setNewPrice] = useState(0);
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

    // Debounced geocoding for preview
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (newAddress && newCity && (isAddModalOpen || isEditModalOpen)) {
                setIsGeocoding(true);
                const coords = await geocodeAddress(newAddress, newCity);
                setPreviewCoords(coords);
                setIsGeocoding(false);
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [newAddress, newCity, isAddModalOpen, isEditModalOpen]);

    useEffect(() => {
        fetchCourts();
    }, []);

    const fetchCourts = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) return;

            const { data, error } = await supabase
                .from('courts')
                .select('*')
                .eq('owner_id', user.id);

            if (error) throw error;

            // Map statuses for UI (In a real app, this would come from a live status API or bookings)
            const courtsWithStatus = (data || []).map((c, i) => ({
                ...c,
                status: i % 3 === 0 ? 'Occupied' : i % 4 === 0 ? 'Maintenance' : 'Available'
            })) as Court[];

            setCourts(courtsWithStatus);
        } catch (err) {
            console.error('Error fetching courts:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddCourt = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            console.log('Inserting court with data:', {
                owner_id: user.id,
                name: newName,
                address: newAddress,
                city: newCity,
                num_courts: newNumCourts,
                previewCoords
            });

            const { error } = await supabase
                .from('courts')
                .insert({
                    owner_id: user.id,
                    name: newName,
                    address: newAddress,
                    city: newCity,
                    num_courts: newNumCourts,
                    surface_type: newSurface,
                    base_price: newPrice,
                    amenities: newAmenities.split(',').map(a => a.trim()).filter(Boolean),
                    latitude: previewCoords?.lat,
                    longitude: previewCoords?.lng
                });

            if (error) throw error;

            setIsAddModalOpen(false);
            setNewName('');
            setNewAddress('');
            setNewCity('');
            fetchCourts();
        } catch (err: any) {
            console.error('Error adding court:', err);
            alert(`Failed to add court: ${err.message || 'Unknown error'}`);
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
                    name: newName,
                    address: newAddress,
                    city: newCity,
                    num_courts: newNumCourts,
                    surface_type: newSurface,
                    base_price: newPrice,
                    amenities: newAmenities.split(',').map(a => a.trim()).filter(Boolean),
                    latitude: previewCoords?.lat,
                    longitude: previewCoords?.lng
                })
                .eq('id', editingCourt.id);

            if (error) throw error;

            setIsEditModalOpen(false);
            setEditingCourt(null);
            fetchCourts();
        } catch (err: any) {
            console.error('Error updating court:', err);
            alert(`Failed to update court: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCourt = async (id: string) => {
        if (!confirm('Are you sure you want to remove this court? This cannot be undone.')) return;

        try {
            const { error } = await supabase
                .from('courts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchCourts();
            setIsEditModalOpen(false);
            setEditingCourt(null);
        } catch (err) {
            console.error('Error deleting court:', err);
            alert('Failed to delete court.');
        }
    };

    const openEditModal = (court: Court) => {
        setEditingCourt(court);
        setNewName(court.name);
        setNewAddress(court.address);
        setNewCity(court.city);
        setNewNumCourts(court.num_courts);
        setNewSurface(court.surface_type);
        setNewPrice((court as any).base_price || 0);
        setNewAmenities(Array.isArray(court.amenities) ? court.amenities.join(', ') : '');
        if (court.latitude && court.longitude) {
            setPreviewCoords({ lat: court.latitude, lng: court.longitude });
        } else {
            setPreviewCoords(null);
        }
        setIsEditModalOpen(true);
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Manage Courts</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Real-time utilization and status monitoring.</p>
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
                        className="px-8 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-amber-200 ml-2"
                    >
                        Add Court
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatusMetric label="Total Courts" count={courts.length.toString()} subtext="All locations" />
                <StatusMetric label="Available" count={courts.filter(c => c.status === 'Available').length.toString()} subtext="Ready to play" color="text-emerald-500" />
                <StatusMetric label="Occupied" count={courts.filter(c => c.status === 'Occupied').length.toString()} subtext="Live matches" color="text-amber-500" />
                <StatusMetric label="Maintenance" count={courts.filter(c => c.status === 'Maintenance').length.toString()} subtext="Scheduled repair" color="text-rose-500" />
            </div>

            {/* Courts Visual Board */}
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
                {isLoading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className={`bg-white rounded-[40px] border border-slate-100 animate-pulse ${viewMode === 'grid' ? 'h-64' : 'h-24'}`}></div>
                    ))
                ) : courts.length > 0 ? (
                    viewMode === 'grid' ? (
                        courts.map((court) => (
                            <CourtCard
                                key={court.id}
                                court={court}
                                onBook={() => navigate('/bookings-admin')}
                                onSettings={() => openEditModal(court)}
                            />
                        ))
                    ) : (
                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Court Details</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Resources</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {courts.map((court) => (
                                            <CourtListRow
                                                key={court.id}
                                                court={court}
                                                onBook={() => navigate('/bookings-admin')}
                                                onSettings={() => openEditModal(court)}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="col-span-full py-20 text-center bg-white rounded-[48px] border border-dashed border-slate-200">
                        <Building2 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">No courts found</h3>
                        <p className="text-slate-400 text-sm font-medium">Add your first court to start accepting bookings.</p>
                    </div>
                )}
            </div>

            {/* Add Court Modal - Refined Stacking logic with Portal to escape container constraints */}
            {isAddModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 z-[100] max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Add New Court</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddCourt} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* Left Column: Form Fields */}
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Court Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        placeholder="e.g. Center Court"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">City</label>
                                        <input
                                            required
                                            type="text"
                                            value={newCity}
                                            onChange={e => setNewCity(e.target.value)}
                                            placeholder="e.g. Manila"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4"># of Courts</label>
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            value={newNumCourts}
                                            onChange={e => setNewNumCourts(Number(e.target.value))}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Surface Type</label>
                                        <input
                                            required
                                            type="text"
                                            value={newSurface}
                                            onChange={e => setNewSurface(e.target.value)}
                                            placeholder="e.g. Pro-Cushion"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Hourly Price (₱)</label>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newPrice}
                                            onChange={e => setNewPrice(Number(e.target.value))}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Address</label>
                                    <input
                                        required
                                        type="text"
                                        value={newAddress}
                                        onChange={e => setNewAddress(e.target.value)}
                                        placeholder="Full street address"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Amenities</label>
                                    <input
                                        type="text"
                                        value={newAmenities}
                                        onChange={e => setNewAmenities(e.target.value)}
                                        placeholder="WiFi, Parking, Water Station..."
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm"
                                    />
                                </div>
                            </div>

                            {/* Right Column: Map & Submit */}
                            <div className="flex flex-col h-full">
                                <div className="flex-1 space-y-4">
                                    <div className="flex justify-between items-center ml-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location Verification</label>
                                        {isGeocoding && <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>}
                                    </div>
                                    <div className="h-64 lg:h-[400px] bg-slate-50 rounded-[32px] border border-slate-100 overflow-hidden relative shadow-inner">
                                        <MapPreview
                                            coords={previewCoords}
                                            onCoordsChange={setPreviewCoords}
                                            onAddressChange={(address, city) => {
                                                setNewAddress(address);
                                                setNewCity(city);
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

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-amber-500 transition-all shadow-xl shadow-slate-200 mt-8 disabled:bg-slate-200 active:scale-95"
                                >
                                    {isSubmitting ? 'Adding...' : 'Confirm Registration'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Court Modal */}
            {isEditModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 z-[100] max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Edit Court Details</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateCourt} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* Left Column: Form Fields */}
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Court Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">City</label>
                                        <input
                                            required
                                            type="text"
                                            value={newCity}
                                            onChange={e => setNewCity(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4"># of Courts</label>
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            value={newNumCourts}
                                            onChange={e => setNewNumCourts(Number(e.target.value))}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Surface Type</label>
                                        <input
                                            required
                                            type="text"
                                            value={newSurface}
                                            onChange={e => setNewSurface(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Hourly Price (₱)</label>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newPrice}
                                            onChange={e => setNewPrice(Number(e.target.value))}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Address</label>
                                    <input
                                        required
                                        type="text"
                                        value={newAddress}
                                        onChange={e => setNewAddress(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Amenities</label>
                                    <input
                                        type="text"
                                        value={newAmenities}
                                        onChange={e => setNewAmenities(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm"
                                    />
                                </div>
                            </div>

                            {/* Right Column: Map & Actions */}
                            <div className="flex flex-col h-full">
                                <div className="flex-1 space-y-4">
                                    <div className="flex justify-between items-center ml-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location Verification</label>
                                        {isGeocoding && <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>}
                                    </div>
                                    <div className="h-64 lg:h-[400px] bg-slate-50 rounded-[32px] border border-slate-100 overflow-hidden relative shadow-inner">
                                        <MapPreview
                                            coords={previewCoords}
                                            onCoordsChange={setPreviewCoords}
                                            onAddressChange={(address, city) => {
                                                setNewAddress(address);
                                                setNewCity(city);
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => editingCourt && handleDeleteCourt(editingCourt.id)}
                                        className="flex-1 h-16 border border-rose-100 text-rose-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={18} /> Remove
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-[2] h-16 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-amber-500 transition-all shadow-xl shadow-slate-200 disabled:bg-slate-200 active:scale-95"
                                    >
                                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Utilization Heatmap Placeholder */}
            <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm overflow-hidden relative">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Utilization Trends</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Last 24 Hours</p>
                    </div>
                    <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest outline-none">
                        <option>Today</option>
                        <option>This Week</option>
                    </select>
                </div>

                <div className="h-40 flex items-end gap-1.5 md:gap-3">
                    {[45, 60, 85, 95, 100, 90, 75, 40, 30, 55, 80, 70, 45, 30, 20, 40, 60, 80, 100, 95, 70, 50, 40, 30].map((height, i) => (
                        <div
                            key={i}
                            className={`flex-1 rounded-t-lg transition-all duration-1000 bg-amber-500/10 hover:bg-amber-500 hover:scale-x-110 cursor-pointer group`}
                            style={{ height: `${height}%` }}
                        >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {height}% Cap.
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-4 px-1">
                    <span className="text-[10px] font-black text-slate-400">12 AM</span>
                    <span className="text-[10px] font-black text-slate-400">12 PM</span>
                    <span className="text-[10px] font-black text-slate-400">11 PM</span>
                </div>
            </div>
        </div>
    );
};

const StatusMetric: React.FC<{ label: string, count: string, subtext: string, color?: string }> = ({ label, count, subtext, color = "text-slate-900" }) => (
    <div className="bg-white p-8 rounded-[40px] border border-slate-100/50 shadow-sm relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-slate-50 rounded-full group-hover:scale-125 transition-transform duration-700"></div>
        <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{label}</p>
            <p className={`text-4xl font-black tracking-tighter mb-1 ${color}`}>{count}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtext}</p>
        </div>
    </div>
);

const MapPreview: React.FC<{
    coords: { lat: number, lng: number },
    onCoordsChange?: (coords: { lat: number, lng: number }) => void,
    onAddressChange?: (address: string, city: string) => void
}> = ({ coords, onCoordsChange, onAddressChange }) => {
    const [isLocating, setIsLocating] = React.useState(false);
    const mapRef = React.useRef<HTMLDivElement>(null);
    const googleMapRef = React.useRef<any>(null);
    const markerRef = React.useRef<any>(null);

    const handlePinToGPS = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const newCoords = { lat: latitude, lng: longitude };
                if (onCoordsChange) onCoordsChange(newCoords);
                reverseGeocode(latitude, longitude);
                setIsLocating(false);
            },
            (error) => {
                console.error('GPS error:', error);
                alert('Could not get your location. Please ensure GPS is enabled.');
                setIsLocating(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const reverseGeocode = (lat: number, lng: number) => {
        if (!window.google) return;
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
            if (status === 'OK' && results[0]) {
                const result = results[0];
                let streetAddress = '';
                let city = '';

                // Extract street address and city from components
                const addressComponents = result.address_components;
                const streetNum = addressComponents.find((c: any) => c.types.includes('street_number'))?.long_name || '';
                const route = addressComponents.find((c: any) => c.types.includes('route'))?.long_name || '';
                const neighborhood = addressComponents.find((c: any) => c.types.includes('neighborhood'))?.long_name || '';
                const locality = addressComponents.find((c: any) => c.types.includes('locality'))?.long_name || '';
                const adminArea2 = addressComponents.find((c: any) => c.types.includes('administrative_area_level_2'))?.long_name || '';

                streetAddress = `${streetNum} ${route} ${neighborhood}`.trim();
                city = locality || adminArea2 || '';

                if (onAddressChange) {
                    onAddressChange(streetAddress || result.formatted_address.split(',')[0], city);
                }
            }
        });
    };

    useEffect(() => {
        if (mapRef.current && window.google) {
            if (!googleMapRef.current) {
                googleMapRef.current = new window.google.maps.Map(mapRef.current, {
                    center: coords || { lat: 14.5995, lng: 120.9842 }, // Default to Manila
                    zoom: 15,
                    disableDefaultUI: true,
                    zoomControl: true,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    gestureHandling: 'greedy',
                    styles: [
                        {
                            featureType: 'poi',
                            elementType: 'labels',
                            stylers: [{ visibility: 'off' }]
                        },
                        {
                            "featureType": "water",
                            "elementType": "geometry",
                            "stylers": [{ "color": "#e9e9e9" }, { "lightness": 17 }]
                        }
                    ]
                });

                // Add Click to Pin
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
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 14,
                        fillColor: '#f59e0b',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 3,
                    },
                });

                markerRef.current.addListener('dragend', () => {
                    const newPos = markerRef.current.getPosition();
                    const lat = newPos.lat();
                    const lng = newPos.lng();

                    if (onCoordsChange) {
                        onCoordsChange({ lat, lng });
                    }
                    reverseGeocode(lat, lng);
                });
            } else if (coords) {
                const markerPos = markerRef.current.getPosition();
                const dist = markerPos ? (Math.abs(markerPos.lat() - coords.lat) + Math.abs(markerPos.lng() - coords.lng)) : 1;

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
            <button
                type="button"
                onClick={handlePinToGPS}
                disabled={isLocating}
                className="absolute right-4 top-4 bg-white p-3 rounded-2xl shadow-xl border border-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white transition-all active:scale-95 group z-10"
                title="Use current GPS location"
            >
                {isLocating ? (
                    <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <Target size={20} className="group-hover:animate-pulse" />
                )}
            </button>
        </div>
    );
};

const CourtCard: React.FC<{ court: Court, onBook: () => void, onSettings: () => void }> = ({ court, onBook, onSettings }) => (
    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden">
        <div className="p-8 pb-4">
            <div className="flex items-center justify-between mb-6">
                <div className={`p-3 rounded-2xl ${court.status === 'Available' ? 'bg-emerald-50 text-emerald-600' : court.status === 'Occupied' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                    <MapPin size={24} />
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${court.status === 'Available' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : court.status === 'Occupied' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                    {court.status}
                </div>
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase group-hover:text-amber-500 transition-colors">{court.name}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{court.num_courts} Courts • {court.surface_type || 'Acrylic'}</p>
        </div>

        <div className="px-8 pb-8 pt-4">
            {court.status === 'Occupied' && (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Clock size={16} className="text-amber-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Available At</span>
                    </div>
                    <span className="text-sm font-black text-amber-900 tracking-tight uppercase">{court.nextAvailable}</span>
                </div>
            )}

            {court.status === 'Maintenance' && (
                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 mb-6">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={16} className="text-rose-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">Inspection Scheduled</span>
                    </div>
                </div>
            )}

            {court.status === 'Available' && (
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-6 flex items-center gap-3">
                    <Activity size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Ready for Play</span>
                </div>
            )}

            <div className="flex gap-2">
                <button
                    onClick={onBook}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-all active:scale-95 shadow-lg shadow-slate-200"
                >
                    Book Manually
                </button>
                <button
                    onClick={onSettings}
                    className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl border border-slate-100 transition-colors"
                >
                    <Settings2 size={18} />
                </button>
            </div>
        </div>
    </div>
);

const CourtListRow: React.FC<{ court: Court, onBook: () => void, onSettings: () => void }> = ({ court, onBook, onSettings }) => (
    <tr className="group hover:bg-slate-50/50 transition-colors">
        <td className="px-8 py-6">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${court.status === 'Available' ? 'bg-emerald-50 text-emerald-600' : court.status === 'Occupied' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                    <MapPin size={24} />
                </div>
                <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">{court.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{court.address}, {court.city}</p>
                </div>
            </div>
        </td>
        <td className="px-8 py-6 text-center">
            <p className="text-sm font-black text-slate-900 tracking-tight uppercase">{court.num_courts} Courts</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{court.surface_type || 'Acrylic'}</p>
        </td>
        <td className="px-8 py-6">
            <div className="flex justify-center">
                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${court.status === 'Available' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : court.status === 'Occupied' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                    {court.status}
                </span>
            </div>
        </td>
        <td className="px-8 py-6 text-right">
            <div className="flex items-center justify-end gap-3">
                <button
                    onClick={onBook}
                    className="px-6 py-2 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-amber-500 transition-all shadow-lg active:scale-95"
                >
                    Book Manually
                </button>
                <button
                    onClick={onSettings}
                    className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl border border-slate-100 transition-colors"
                >
                    <Settings2 size={18} />
                </button>
            </div>
        </td>
    </tr>
);

export default Courts;
