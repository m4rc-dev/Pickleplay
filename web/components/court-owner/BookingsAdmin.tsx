import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, Filter, Download, MoreHorizontal, CheckCircle, XCircle, Clock, MapPin, User, Phone, X, QrCode, Play } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { isTimeSlotBlocked } from '../../services/courtEvents';
import { autoCancelLateBookings } from '../../services/bookings';
import BookingScanner from './BookingScanner';

interface BookingRecord {
    id: string;
    player_id: string;
    court_id: string;
    date: string;
    start_time: string;
    end_time: string;
    total_price: number;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    profiles?: {
        full_name: string;
        email: string;
    };
    courts?: {
        name: string;
    };
}

const BookingsAdmin: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<BookingRecord[]>([]);
    const [myCourts, setMyCourts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        court_id: '',
        player_email: '',
        date: new Date().toISOString().split('T')[0],
        start_time: '08:00',
        end_time: '09:00',
        total_price: 0
    });

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            // 1. Get user efficiently (getSession is faster than getUser)
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) return;

            // 1.5 Auto-cancel late bookings to keep owner dashboard updated
            await autoCancelLateBookings();

            // 2. Parallelize fetching courts (for dropdown) and bookings (for list)
            const [courtsResponse, bookingsResponse] = await Promise.all([
                supabase
                    .from('courts')
                    .select('*')
                    .eq('owner_id', user.id),
                supabase
                    .from('bookings')
                    .select(`
                        *,
                        profiles (full_name, email),
                        courts!inner (name, owner_id)
                    `)
                    .eq('courts.owner_id', user.id)
                    .order('created_at', { ascending: false })
            ]);

            if (courtsResponse.error) throw courtsResponse.error;
            if (bookingsResponse.error) throw bookingsResponse.error;

            setMyCourts(courtsResponse.data || []);
            setBookings(bookingsResponse.data || []);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const updateBookingStatus = async (id: string, status: string) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
            fetchBookings();
        } catch (err) {
            console.error('Error updating booking status:', err);
            alert('Failed to update booking.');
        }
    };

    const handleManualBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // 0. Check for blocking court events
            const startDateTime = new Date(`${formData.date}T${formData.start_time}:00`);
            const endDateTime = new Date(`${formData.date}T${formData.end_time}:00`);

            const isBlocked = await isTimeSlotBlocked(
                formData.court_id,
                startDateTime.toISOString(),
                endDateTime.toISOString()
            );

            if (isBlocked) {
                alert('🚫 Cannot create booking. You have a court event scheduled during this time. Please modify or remove the event first.');
                setIsSubmitting(false);
                return;
            }

            // 1. Find player profile by email (if provided)
            let player_id = null;
            if (formData.player_email) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', formData.player_email)
                    .maybeSingle();
                player_id = profile?.id || null;
            }

            // 2. Insert booking
            const { error } = await supabase
                .from('bookings')
                .insert({
                    court_id: formData.court_id,
                    player_id: player_id,
                    date: formData.date,
                    start_time: formData.start_time,
                    end_time: formData.end_time,
                    total_price: formData.total_price,
                    status: 'confirmed',
                    payment_status: 'unpaid'
                });

            if (error) throw error;

            setIsModalOpen(false);
            fetchBookings();
            setFormData({
                court_id: '',
                player_email: '',
                date: new Date().toISOString().split('T')[0],
                start_time: '08:00',
                end_time: '09:00',
                total_price: 0
            });
        } catch (err) {
            console.error('Error creating manual booking:', err);
            alert('Failed to create booking.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExportCSV = () => {
        if (bookings.length === 0) return;

        const headers = ["Reference", "Player", "Email", "Court", "Date", "Start Time", "End Time", "Price", "Status"];
        const rows = bookings.map(b => [
            b.id.slice(0, 8),
            b.profiles?.full_name || 'Guest',
            b.profiles?.email || 'N/A',
            b.courts?.name || 'Unknown',
            b.date,
            b.start_time,
            b.end_time,
            b.total_price,
            b.status
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `pickleplay_bookings_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Court Bookings</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Administrative control for court reservations.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/booking')}
                        className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                    >
                        <Play size={18} fill="currentColor" /> Book A Court
                    </button>
                    <button
                        onClick={() => setShowScanner(true)}
                        className="flex items-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
                    >
                        <QrCode size={18} /> Scan QR Code
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                    >
                        <Download size={18} /> Export Data
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-8 py-4 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-amber-200 active:scale-95"
                    >
                        New Booking
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, ID or court..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-transparent rounded-[20px] focus:bg-white focus:border-amber-200 outline-none transition-all font-medium"
                    />
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 px-6 py-4 bg-slate-50 border border-transparent rounded-[20px] text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-white hover:border-slate-200 transition-all">
                        <Calendar size={18} /> Date Range
                    </button>
                    <button className="flex items-center gap-2 px-6 py-4 bg-slate-50 border border-transparent rounded-[20px] text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-white hover:border-slate-200 transition-all">
                        <Filter size={18} /> All Courts
                    </button>
                </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Reference</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">User Details</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Court & Schedule</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Price</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-8 py-6"><div className="h-10 bg-slate-50 rounded-xl w-full"></div></td>
                                    </tr>
                                ))
                            ) : (
                                bookings.filter(b =>
                                    b.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    b.courts?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    b.id.toLowerCase().includes(searchQuery.toLowerCase())
                                ).map((booking) => (
                                    <tr key={booking.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-6 text-sm font-black text-slate-900 tracking-tighter uppercase">{booking.id.slice(0, 8)}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User size={20} /></div>
                                                <div>
                                                    <p className="font-black text-slate-900 tracking-tight uppercase">{booking.profiles?.full_name || 'Guest Player'}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Phone size={10} /> {booking.profiles?.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-1">
                                                <p className="font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase">
                                                    <MapPin size={12} className="text-amber-500" /> {booking.courts?.name}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {new Date(booking.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center font-black text-slate-900 tracking-tighter">₱{booking.total_price}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${booking.status === 'confirmed' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                                    booking.status === 'pending' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                                        'bg-rose-50 border-rose-100 text-rose-600'
                                                    }`}>
                                                    {booking.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {booking.status === 'pending' && (
                                                    <button
                                                        onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                                        className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Confirm"
                                                    >
                                                        <CheckCircle size={20} />
                                                    </button>
                                                )}
                                                {booking.status !== 'cancelled' && (
                                                    <button
                                                        onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors" title="Cancel"
                                                    >
                                                        <XCircle size={20} />
                                                    </button>
                                                )}
                                                <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><MoreHorizontal size={20} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* New Booking Modal - Refined Stacking logic with Portal to escape container constraints */}
                {isModalOpen && ReactDOM.createPortal(
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 z-[100]">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Manual Booking</h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleManualBooking} className="space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">Select Court</label>
                                        <select
                                            required
                                            value={formData.court_id}
                                            onChange={(e) => setFormData({ ...formData, court_id: e.target.value })}
                                            className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-amber-200 outline-none transition-all font-medium"
                                        >
                                            <option value="">Select a court</option>
                                            {myCourts.map(court => (
                                                <option key={court.id} value={court.id}>{court.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">Player Email (Optional)</label>
                                        <input
                                            type="email"
                                            placeholder="player@example.com"
                                            value={formData.player_email}
                                            onChange={(e) => setFormData({ ...formData, player_email: e.target.value })}
                                            className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-amber-200 outline-none transition-all font-medium"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">Date</label>
                                            <input
                                                type="date"
                                                required
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-amber-200 outline-none transition-all font-medium"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">Total Price (₱)</label>
                                            <input
                                                type="number"
                                                required
                                                value={formData.total_price}
                                                onChange={(e) => setFormData({ ...formData, total_price: Number(e.target.value) })}
                                                className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-amber-200 outline-none transition-all font-medium"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">Start Time</label>
                                            <input
                                                type="time"
                                                required
                                                value={formData.start_time}
                                                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                                className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-amber-200 outline-none transition-all font-medium"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">End Time</label>
                                            <input
                                                type="time"
                                                required
                                                value={formData.end_time}
                                                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                                className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-amber-200 outline-none transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-amber-500 transition-all shadow-xl shadow-slate-200 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Booking'}
                                </button>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}

                {/* QR Scanner Modal */}
                {showScanner && (
                    <BookingScanner
                        onClose={() => {
                            setShowScanner(false);
                            fetchBookings(); // Refresh bookings after scanning
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default BookingsAdmin;
