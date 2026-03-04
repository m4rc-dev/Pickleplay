import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, Filter, Download, MoreHorizontal, CheckCircle, XCircle, Clock, MapPin, User, Phone, X, QrCode, Play, ChevronLeft, ChevronRight, Trash2, RefreshCw, AlertTriangle, DollarSign, Ban, Eye, ChevronDown, Banknote, LogIn, LogOut, UserX, Timer, Mail, Users, UserPlus, Building2, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { isTimeSlotBlocked } from '../../services/courtEvents';
import { autoCancelLateBookings } from '../../services/bookings';
import { sendGuestBookingEmail } from '../../services/guestBookingEmail';
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
    payment_status?: 'paid' | 'unpaid' | 'refunded';
    payment_method?: string;
    is_checked_in?: boolean;
    checked_in_at?: string;
    checked_out_at?: string;
    is_no_show?: boolean;
    guest_name?: string;
    guest_email?: string;
    booked_by?: string;
    created_at?: string;
    updated_at?: string;
    profiles?: {
        full_name: string;
        email: string;
        avatar_url?: string;
    };
    courts?: {
        name: string;
        location_id?: string;
    };
}

// Helper: resolve display name/email/avatar for a booking (guest vs player)
const getBookingUser = (b: BookingRecord) => {
    const isGuest = !!b.guest_name && !!b.booked_by;
    return {
        name: isGuest ? b.guest_name! : (b.profiles?.full_name || 'Guest Player'),
        email: isGuest ? (b.guest_email || 'Guest') : (b.profiles?.email || 'No email'),
        avatarUrl: isGuest ? null : (b.profiles?.avatar_url || null),
        isGuest,
    };
};

const ITEMS_PER_PAGE = 15;

const BookingsAdmin: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<BookingRecord[]>([]);
    const [myCourts, setMyCourts] = useState<any[]>([]);
    const [myLocations, setMyLocations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Action modals
    const [confirmModal, setConfirmModal] = useState<{ type: 'confirm' | 'cancel' | 'delete' | 'refund'; booking: BookingRecord } | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Three-dot menu
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Filters
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [locationFilter, setLocationFilter] = useState('');
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const locationDropdownRef = useRef<HTMLDivElement>(null);
    const datePickerRef = useRef<HTMLDivElement>(null);

    // Detail modal
    const [viewingBooking, setViewingBooking] = useState<BookingRecord | null>(null);

    // Pay / Check-in flow (from booking details modal)
    const [payingBooking, setPayingBooking] = useState<BookingRecord | null>(null);
    const [payCashReceived, setPayCashReceived] = useState('');
    const [payChange, setPayChange] = useState(0);
    const [payError, setPayError] = useState('');
    const [payProcessing, setPayProcessing] = useState(false);

    // Today's date string for date comparisons (re-computed each render)
    const todayDateStr = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })();

    // Close menu and dropdowns on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenuId(null);
            }
            if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) {
                setShowLocationDropdown(false);
            }
            if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
                setShowDatePicker(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Manual Booking Form State
    const [mbLocationId, setMbLocationId] = useState('');
    const [mbCourtId, setMbCourtId] = useState('');
    const [mbDate, setMbDate] = useState(new Date().toISOString().split('T')[0]);
    const [mbSelectedSlot, setMbSelectedSlot] = useState('');
    const [mbExistingBookings, setMbExistingBookings] = useState<any[]>([]);
    const [mbPrice, setMbPrice] = useState(0);
    const [mbUserType, setMbUserType] = useState<'player' | 'guest'>('player');
    // Player search
    const [mbPlayerSearch, setMbPlayerSearch] = useState('');
    const [mbPlayerResults, setMbPlayerResults] = useState<any[]>([]);
    const [mbSelectedPlayer, setMbSelectedPlayer] = useState<any>(null);
    const [mbSearching, setMbSearching] = useState(false);
    // Guest info
    const [mbGuestFirstName, setMbGuestFirstName] = useState('');
    const [mbGuestLastName, setMbGuestLastName] = useState('');
    const [mbGuestEmail, setMbGuestEmail] = useState('');
    const [mbSendingEmail, setMbSendingEmail] = useState(false);
    // Manual Booking Payment Step
    const [mbPaymentStep, setMbPaymentStep] = useState(false);
    const [mbCashReceived, setMbCashReceived] = useState('');
    const [mbPayChange, setMbPayChange] = useState(0);
    const [mbPayError, setMbPayError] = useState('');
    const [mbPayProcessing, setMbPayProcessing] = useState(false);
    const [mbCreatedBooking, setMbCreatedBooking] = useState<any>(null);
    const [mbShowConfetti, setMbShowConfetti] = useState(false);

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

            // 2. Parallelize fetching courts, locations, and bookings
            const [courtsResponse, locationsResponse, bookingsResponse] = await Promise.all([
                supabase
                    .from('courts')
                    .select('*')
                    .eq('owner_id', user.id),
                supabase
                    .from('locations')
                    .select('id, name, city, address')
                    .eq('owner_id', user.id),
                supabase
                    .from('bookings')
                    .select(`
                        *,
                        profiles (full_name, email, avatar_url),
                        courts!inner (name, owner_id, location_id)
                    `)
                    .eq('courts.owner_id', user.id)
                    .order('created_at', { ascending: false })
            ]);

            if (courtsResponse.error) throw courtsResponse.error;
            if (locationsResponse.error) throw locationsResponse.error;
            if (bookingsResponse.error) throw bookingsResponse.error;

            setMyCourts(courtsResponse.data || []);
            setMyLocations(locationsResponse.data || []);
            setBookings(bookingsResponse.data || []);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const updateBookingStatus = async (id: string, status: string) => {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .update({ status })
                .eq('id', id)
                .select();

            if (error) {
                console.error('Supabase error details:', JSON.stringify(error));
                alert(`Failed to update booking: ${error.message}\nCode: ${error.code}\nDetails: ${error.details || 'none'}\nHint: ${error.hint || 'none'}`);
                return;
            }

            if (!data || data.length === 0) {
                alert('Failed to update booking: No rows were updated. This is likely an RLS (Row Level Security) policy issue. Make sure you are the court owner.');
                return;
            }

            fetchBookings();
        } catch (err: any) {
            console.error('Error updating booking status:', err);
            alert(`Failed to update booking: ${err?.message || err}`);
        }
    };

    const handleConfirmAction = async () => {
        if (!confirmModal) return;
        setActionLoading(true);
        try {
            const { type, booking } = confirmModal;
            if (type === 'confirm') {
                await updateBookingStatus(booking.id, 'confirmed');
            } else if (type === 'cancel') {
                await updateBookingStatus(booking.id, 'cancelled');
            } else if (type === 'delete') {
                // Try direct delete first
                const { error: deleteError } = await supabase.from('bookings').delete().eq('id', booking.id);
                if (deleteError) {
                    // If RLS blocks direct delete, try via status update as soft-delete
                    console.warn('Direct delete blocked by RLS, trying soft delete:', deleteError.message);
                    const { error: softError } = await supabase
                        .from('bookings')
                        .update({ status: 'cancelled', cancelled_reason: 'Deleted by court owner' })
                        .eq('id', booking.id);
                    if (softError) throw softError;
                }
                // Remove from local state immediately so it disappears
                setBookings(prev => prev.filter(b => b.id !== booking.id));
            } else if (type === 'refund') {
                const { error } = await supabase
                    .from('bookings')
                    .update({ payment_status: 'refunded', status: 'cancelled' })
                    .eq('id', booking.id);
                if (error) throw error;
                fetchBookings();
            }
        } catch (err: any) {
            console.error('Error performing action:', err);
            alert(`Action failed: ${err?.message || err}`);
        } finally {
            setActionLoading(false);
            setConfirmModal(null);
        }
    };

    // Player search debounce
    useEffect(() => {
        if (mbUserType !== 'player' || mbPlayerSearch.length < 2) {
            setMbPlayerResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setMbSearching(true);
            try {
                const q = mbPlayerSearch.toLowerCase();
                const { data } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, avatar_url, username')
                    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,username.ilike.%${q}%`)
                    .limit(8);
                setMbPlayerResults(data || []);
            } catch { setMbPlayerResults([]); }
            finally { setMbSearching(false); }
        }, 400);
        return () => clearTimeout(timer);
    }, [mbPlayerSearch, mbUserType]);

    // Auto-fill price when court changes
    useEffect(() => {
        if (mbCourtId) {
            const court = myCourts.find((c: any) => c.id === mbCourtId);
            if (court) setMbPrice(court.base_price || 0);
        } else {
            setMbPrice(0);
        }
    }, [mbCourtId, myCourts]);

    // Fetch existing bookings for slot availability
    useEffect(() => {
        if (!mbCourtId || !mbDate) {
            setMbExistingBookings([]);
            return;
        }
        (async () => {
            const { data } = await supabase
                .from('bookings')
                .select('start_time, end_time')
                .eq('court_id', mbCourtId)
                .eq('date', mbDate)
                .in('status', ['confirmed', 'pending']);
            setMbExistingBookings(data || []);
        })();
    }, [mbCourtId, mbDate]);

    // Time slot helpers
    const MB_TIME_SLOTS = (() => {
        const slots: { value: string; label: string; start: string; end: string }[] = [];
        for (let h = 6; h < 23; h++) {
            const start = `${String(h).padStart(2, '0')}:00`;
            const end = `${String(h + 1).padStart(2, '0')}:00`;
            const fmt = (hr: number) => { const ap = hr >= 12 ? 'PM' : 'AM'; return `${hr % 12 || 12}:00 ${ap}`; };
            slots.push({ value: `${start}-${end}`, label: `${fmt(h)} - ${fmt(h + 1)}`, start, end });
        }
        return slots;
    })();

    const isSlotBooked = (slotStart: string, slotEnd: string) => {
        return mbExistingBookings.some((b: any) => {
            const bs = b.start_time.slice(0, 5);
            const be = b.end_time.slice(0, 5);
            return slotStart < be && slotEnd > bs;
        });
    };

    const resetManualBookingForm = () => {
        setMbLocationId('');
        setMbCourtId('');
        setMbDate(new Date().toISOString().split('T')[0]);
        setMbSelectedSlot('');
        setMbExistingBookings([]);
        setMbPrice(0);
        setMbUserType('player');
        setMbPlayerSearch('');
        setMbPlayerResults([]);
        setMbSelectedPlayer(null);
        setMbGuestFirstName('');
        setMbGuestLastName('');
        setMbGuestEmail('');
        setMbPaymentStep(false);
        setMbCashReceived('');
        setMbPayChange(0);
        setMbPayError('');
        setMbPayProcessing(false);
        setMbCreatedBooking(null);
        setMbShowConfetti(false);
    };

    const handleManualBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Get current authenticated user (court owner)
            const { data: { session } } = await supabase.auth.getSession();
            const currentUser = session?.user;
            if (!currentUser) {
                alert('You must be logged in to create a booking.');
                setIsSubmitting(false);
                return;
            }

            // 0. Parse selected slot
            const [slotStart, slotEnd] = mbSelectedSlot.split('-');
            const startDateTime = new Date(`${mbDate}T${slotStart}:00`);
            const endDateTime = new Date(`${mbDate}T${slotEnd}:00`);

            const isBlocked = await isTimeSlotBlocked(
                mbCourtId,
                startDateTime.toISOString(),
                endDateTime.toISOString()
            );

            if (isBlocked) {
                alert('🚫 Cannot create booking. You have a court event scheduled during this time.');
                setIsSubmitting(false);
                return;
            }

            // 1. Determine player
            let player_id: string | null = null;
            let guestName = '';
            let guestEmail = '';
            let guestAccountCreated = false;

            if (mbUserType === 'player') {
                if (!mbSelectedPlayer) {
                    alert('Please select a player.');
                    setIsSubmitting(false);
                    return;
                }
                player_id = mbSelectedPlayer.id;
            } else {
                // Guest — first check if email already has an account in profiles
                guestName = `${mbGuestFirstName.trim()} ${mbGuestLastName.trim()}`;
                guestEmail = mbGuestEmail.trim();
                if (!guestName.trim() || !guestEmail) {
                    alert('Please fill in all guest fields.');
                    setIsSubmitting(false);
                    return;
                }
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', guestEmail)
                    .maybeSingle();
                if (existingProfile) {
                    player_id = existingProfile.id;
                }
            }

            // 2. Build booking record
            const bookingRecord: any = {
                court_id: mbCourtId,
                player_id: player_id || currentUser.id,
                date: mbDate,
                start_time: slotStart,
                end_time: slotEnd,
                total_price: mbPrice,
                status: 'confirmed',
                payment_status: 'unpaid',
                booked_by: currentUser.id,
            };

            // Add guest info if guest booking
            if (mbUserType === 'guest' && !player_id) {
                bookingRecord.guest_name = guestName;
                bookingRecord.guest_email = guestEmail;
            }

            // 3. Insert booking
            const { data: bookingData, error } = await supabase
                .from('bookings')
                .insert(bookingRecord)
                .select()
                .single();

            if (error) throw error;

            // 4. For guest bookings: Send booking receipt email with "Setup Your Account" link
            if (mbUserType === 'guest' && guestEmail) {
                setMbSendingEmail(true);
                const selectedCourt = myCourts.find((c: any) => c.id === mbCourtId);
                const selectedLoc = myLocations.find((l: any) => l.id === mbLocationId);
                try {
                    await sendGuestBookingEmail({
                        guestEmail,
                        guestName,
                        referenceId: bookingData?.id || '',
                        locationName: selectedLoc?.name || 'PicklePlay Court',
                        locationAddress: selectedLoc?.address || selectedLoc?.city || '',
                        courtName: selectedCourt?.name || 'Court',
                        date: mbDate,
                        startTime: slotStart,
                        endTime: slotEnd,
                        totalPrice: mbPrice
                    });
                    console.log(`✅ Guest booking email sent to ${guestEmail}`);
                } catch (emailErr) {
                    console.error('Failed to send guest email:', emailErr);
                }
                setMbSendingEmail(false);
            }

            // Transition to payment step instead of closing
            const selectedCourt2 = myCourts.find((c: any) => c.id === mbCourtId);
            setMbCreatedBooking({
                id: bookingData?.id || '',
                courtName: selectedCourt2?.name || 'Court',
                date: mbDate,
                startTime: slotStart,
                endTime: slotEnd,
                totalPrice: mbPrice,
                guestName: mbUserType === 'guest' ? `${mbGuestFirstName.trim()} ${mbGuestLastName.trim()}` : (mbSelectedPlayer?.full_name || mbSelectedPlayer?.username || 'Player'),
                guestEmail: mbUserType === 'guest' ? mbGuestEmail.trim() : (mbSelectedPlayer?.email || ''),
                avatarUrl: mbUserType === 'player' ? mbSelectedPlayer?.avatar_url : null,
                isGuest: mbUserType === 'guest',
            });
            setMbPaymentStep(true);
            setMbCashReceived('');
            setMbPayChange(0);
            setMbPayError('');
            fetchBookings();
        } catch (err) {
            console.error('Error creating manual booking:', err);
            alert('Failed to create booking.');
        } finally {
            setIsSubmitting(false);
            setMbSendingEmail(false);
        }
    };

    const handleExportCSV = () => {
        if (bookings.length === 0) return;

        const headers = ["Reference", "Player", "Email", "Court", "Date", "Start Time", "End Time", "Price", "Status"];
        const rows = bookings.map(b => {
            const u = getBookingUser(b);
            return [
            b.id.slice(0, 8),
            u.name,
            u.email,
            b.courts?.name || 'Unknown',
            b.date,
            b.start_time,
            b.end_time,
            b.total_price,
            b.status
        ];});

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

    // Filtered bookings
    const filteredBookings = bookings.filter(b => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            b.profiles?.full_name?.toLowerCase().includes(q) ||
            b.guest_name?.toLowerCase().includes(q) ||
            b.guest_email?.toLowerCase().includes(q) ||
            b.courts?.name?.toLowerCase().includes(q) ||
            b.id.toLowerCase().includes(q);
        const matchesCourt = !locationFilter || (b.courts as any)?.location_id === locationFilter;
        const matchesDateFrom = !dateFrom || b.date >= dateFrom;
        const matchesDateTo = !dateTo || b.date <= dateTo;
        return matchesSearch && matchesCourt && matchesDateFrom && matchesDateTo;
    });

    // Pagination
    const totalPages = Math.max(Math.ceil(filteredBookings.length / ITEMS_PER_PAGE), 1);
    const paginatedBookings = filteredBookings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Reset to page 1 when filters change
    useEffect(() => { setCurrentPage(1); }, [searchQuery, locationFilter, dateFrom, dateTo]);

    const activeFilterCount = (locationFilter ? 1 : 0) + (dateFrom || dateTo ? 1 : 0);

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
                        className="px-8 py-4 bg-lime-400 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-lime-500 transition-all shadow-xl shadow-lime-900/20 active:scale-95"
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
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-transparent rounded-[20px] focus:bg-white focus:border-blue-200 outline-none transition-all font-medium"
                    />
                </div>
                <div className="flex gap-3">
                    {/* Date Range Filter */}
                    <div className="relative" ref={datePickerRef}>
                        <button
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className={`flex items-center gap-2 px-6 py-4 border rounded-[20px] font-black text-[10px] uppercase tracking-widest transition-all ${
                                dateFrom || dateTo
                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                                    : 'bg-slate-50 border-transparent text-slate-600 hover:bg-white hover:border-slate-200'
                            }`}
                        >
                            <Calendar size={16} />
                            {dateFrom || dateTo ? (
                                <span className="max-w-[140px] truncate">
                                    {dateFrom ? new Date(dateFrom + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Start'}
                                    {' → '}
                                    {dateTo ? new Date(dateTo + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'End'}
                                </span>
                            ) : 'Date Range'}
                            <ChevronDown size={14} className={`transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
                        </button>
                        {showDatePicker && (
                            <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-5 min-w-[280px] animate-in fade-in zoom-in-95 duration-200">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Filter by date</p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 mb-1 block">From</label>
                                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:border-blue-300 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 mb-1 block">To</label>
                                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:border-blue-300 transition-all" />
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-xl transition-all border border-slate-200">Clear</button>
                                    <button onClick={() => setShowDatePicker(false)} className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-blue-600 rounded-xl transition-all">Apply</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Location Filter */}
                    <div className="relative" ref={locationDropdownRef}>
                        <button
                            onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                            className={`flex items-center gap-2 px-6 py-4 border rounded-[20px] font-black text-[10px] uppercase tracking-widest transition-all ${
                                locationFilter
                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                                    : 'bg-slate-50 border-transparent text-slate-600 hover:bg-white hover:border-slate-200'
                            }`}
                        >
                            <Filter size={16} />
                            <span className="max-w-[140px] truncate">{locationFilter ? (myLocations.find(l => l.id === locationFilter)?.name || 'Location') : 'All Locations'}</span>
                            <ChevronDown size={14} className={`transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showLocationDropdown && (
                            <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 min-w-[240px] max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                <button
                                    onClick={() => { setLocationFilter(''); setShowLocationDropdown(false); }}
                                    className={`w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors font-bold text-sm flex items-center gap-3 ${
                                        !locationFilter ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'
                                    }`}
                                >
                                    <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${!locationFilter ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}>
                                        {!locationFilter && <CheckCircle size={10} className="text-blue-600" />}
                                    </span>
                                    All Locations
                                </button>
                                {myLocations.map(loc => (
                                    <button
                                        key={loc.id}
                                        onClick={() => { setLocationFilter(loc.id); setShowLocationDropdown(false); }}
                                        className={`w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors font-bold text-sm flex items-center gap-3 ${
                                            locationFilter === loc.id ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'
                                        }`}
                                    >
                                        <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${locationFilter === loc.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}>
                                            {locationFilter === loc.id && <CheckCircle size={10} className="text-blue-600" />}
                                        </span>
                                        <div>
                                            <p>{loc.name}</p>
                                            {loc.city && <p className="text-[10px] text-slate-400 font-medium">{loc.city}</p>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Clear all filters */}
                    {activeFilterCount > 0 && (
                        <button
                            onClick={() => { setLocationFilter(''); setDateFrom(''); setDateTo(''); setSearchQuery(''); }}
                            className="flex items-center gap-2 px-5 py-4 bg-rose-50 border border-rose-100 rounded-[20px] text-rose-600 font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all"
                        >
                            <X size={14} /> Clear ({activeFilterCount})
                        </button>
                    )}
                </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Reference</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">User Details</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Court & Schedule</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Price</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Check-in</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-8 py-6"><div className="h-10 bg-slate-50 rounded-xl w-full"></div></td>
                                    </tr>
                                ))
                            ) : paginatedBookings.length > 0 ? (
                                paginatedBookings.map((booking) => {
                                    const isPaid = booking.payment_status === 'paid';
                                    const isRefunded = booking.payment_status === 'refunded';
                                    return (
                                    <tr key={booking.id} className="group hover:bg-blue-50/30 transition-colors cursor-pointer"
                                        onClick={() => setViewingBooking(booking)}>
                                        <td className="px-8 py-6 text-sm font-black text-slate-900 tracking-tighter uppercase">{booking.id.slice(0, 8)}</td>
                                        <td className="px-8 py-6">
                                            {(() => { const u = getBookingUser(booking); return (
                                            <div className="flex items-center gap-4">
                                                {u.avatarUrl ? (
                                                    <img src={u.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                                ) : (
                                                    <img
                                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&size=40&font-size=0.4&bold=true`}
                                                        alt=""
                                                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                                                    />
                                                )}
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-black text-slate-900 tracking-tight uppercase group-hover:text-blue-600 transition-colors">{u.name}</p>
                                                        {u.isGuest && <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Guest</span>}
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Phone size={10} /> {u.email}</p>
                                                </div>
                                            </div>
                                            ); })()}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-1">
                                                <p className="font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase">
                                                    <MapPin size={12} className="text-blue-600" /> {booking.courts?.name}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {new Date(booking.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center font-black text-slate-900 tracking-tighter">₱{booking.total_price}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                    booking.status === 'confirmed' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                                    booking.status === 'pending' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                                                    booking.status === 'completed' ? 'bg-violet-50 border-violet-100 text-violet-600' :
                                                    'bg-rose-50 border-rose-100 text-rose-600'
                                                }`}>
                                                    {booking.status}
                                                </span>
                                                {isPaid && (
                                                    <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-lime-50 border border-lime-200 text-lime-700">
                                                        ✓ Paid
                                                    </span>
                                                )}
                                                {isRefunded && (
                                                    <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-amber-50 border border-amber-200 text-amber-700">
                                                        ↩ Refunded
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center" onClick={e => e.stopPropagation()}>
                                            {(() => {
                                                const now = new Date();
                                                const isToday = booking.date === todayDateStr;
                                                const bookingStart = new Date(`${booking.date}T${booking.start_time}`);
                                                const bookingEnd = new Date(`${booking.date}T${booking.end_time}`);
                                                const fiveMinBefore = new Date(bookingEnd.getTime() - 5 * 60000);
                                                const canCheckout = now >= fiveMinBefore;
                                                const isLate = now > bookingStart && !booking.is_checked_in && (booking.status === 'confirmed' || booking.status === 'pending');
                                                const isPastEnd = now > bookingEnd;

                                                // Completed / Checked Out
                                                if (booking.status === 'completed' || booking.checked_out_at) {
                                                    return (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-violet-50 border border-violet-200 text-violet-700">
                                                                <LogOut size={12} /> Checked Out
                                                            </span>
                                                            {booking.checked_out_at && (
                                                                <span className="text-[9px] font-bold text-slate-400">
                                                                    {new Date(booking.checked_out_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                // No-show
                                                if (booking.is_no_show) {
                                                    return (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-50 border border-rose-200 text-rose-600">
                                                            <UserX size={12} /> No Show
                                                        </span>
                                                    );
                                                }

                                                // Checked in → show checkout button
                                                if (booking.is_checked_in) {
                                                    return (
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 border border-emerald-200 text-emerald-700">
                                                                <LogIn size={12} /> Checked In
                                                            </span>
                                                            {booking.checked_in_at && (
                                                                <span className="text-[9px] font-bold text-slate-400">
                                                                    {new Date(booking.checked_in_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                                </span>
                                                            )}
                                                            {canCheckout && (
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    const outNow = new Date().toISOString();
                                                                    try {
                                                                        const { error } = await supabase.from('bookings').update({ status: 'completed', checked_out_at: outNow }).eq('id', booking.id);
                                                                        if (error) {
                                                                            await supabase.from('bookings').update({ status: 'completed' }).eq('id', booking.id);
                                                                        }
                                                                        fetchBookings();
                                                                    } catch (err) { console.error(err); }
                                                                }}
                                                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-violet-600 text-white hover:bg-violet-700 transition-all active:scale-95 shadow-sm"
                                                            >
                                                                <LogOut size={10} /> Check Out
                                                            </button>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                // Late — past start time, not checked in, booking still active
                                                if (isLate && !isPastEnd) {
                                                    return (
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 border border-amber-200 text-amber-700">
                                                                <Timer size={12} /> Late
                                                            </span>
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    const b = booking;
                                                                    setViewingBooking(null);
                                                                    setPayingBooking(null);
                                                                    if (b.payment_status !== 'paid') {
                                                                        setPayingBooking(b);
                                                                        setPayCashReceived('');
                                                                        setPayChange(0);
                                                                        setPayError('');
                                                                    } else {
                                                                        const now2 = new Date().toISOString();
                                                                        try {
                                                                            const { error } = await supabase.from('bookings').update({ is_checked_in: true, checked_in_at: now2, status: 'confirmed' }).eq('id', b.id);
                                                                            if (error) await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', b.id);
                                                                            fetchBookings();
                                                                        } catch (err) { console.error(err); }
                                                                    }
                                                                }}
                                                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-amber-600 text-white hover:bg-amber-700 transition-all active:scale-95 shadow-sm"
                                                            >
                                                                <LogIn size={10} /> Late Check-In
                                                            </button>
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    try {
                                                                        const { error } = await supabase.from('bookings').update({ is_no_show: true, status: 'cancelled' }).eq('id', booking.id);
                                                                        if (error) await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);
                                                                        fetchBookings();
                                                                    } catch (err) { console.error(err); }
                                                                }}
                                                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-rose-100 text-rose-600 hover:bg-rose-200 transition-all active:scale-95"
                                                            >
                                                                <UserX size={10} /> No Show
                                                            </button>
                                                        </div>
                                                    );
                                                }

                                                // Past end time + never checked in → No show
                                                if (isPastEnd && (booking.status === 'confirmed' || booking.status === 'pending')) {
                                                    return (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-50 border border-rose-200 text-rose-600">
                                                                <UserX size={12} /> No Show
                                                            </span>
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    try {
                                                                        await supabase.from('bookings').update({ is_no_show: true, status: 'cancelled' }).eq('id', booking.id);
                                                                        fetchBookings();
                                                                    } catch (err) { console.error(err); }
                                                                }}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 transition-all"
                                                            >
                                                                Mark No Show
                                                            </button>
                                                        </div>
                                                    );
                                                }

                                                // Waiting (before start time, confirmed/pending)
                                                if (booking.status === 'confirmed' || booking.status === 'pending') {
                                                    if (!isToday) {
                                                        // Future booking — cannot check in, but can advance pay
                                                        return (
                                                            <div className="flex flex-col items-center gap-1.5">
                                                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-50 border border-indigo-200 text-indigo-600">
                                                                    <Calendar size={12} /> Scheduled
                                                                </span>
                                                                <span className="text-[9px] font-bold text-slate-400">
                                                                    {new Date(booking.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                </span>
                                                                {booking.payment_status !== 'paid' && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const b = booking;
                                                                            setViewingBooking(null);
                                                                            setPayingBooking(b);
                                                                            setPayCashReceived('');
                                                                            setPayChange(0);
                                                                            setPayError('');
                                                                        }}
                                                                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 transition-all active:scale-95 shadow-sm"
                                                                    >
                                                                        <Banknote size={10} /> Advance Pay
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-50 border border-slate-200 text-slate-400">
                                                            <Clock size={12} /> Waiting
                                                        </span>
                                                    );
                                                }

                                                return <span className="text-[10px] font-bold text-slate-300">—</span>;
                                            })()}
                                        </td>
                                        <td className="px-8 py-6 text-right" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1.5">
                                                {/* Three-dot menu */}
                                                <div className="relative" ref={openMenuId === booking.id ? menuRef : undefined}>
                                                    <button
                                                        data-menu-id={booking.id}
                                                        onClick={() => setOpenMenuId(openMenuId === booking.id ? null : booking.id)}
                                                        className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-transparent hover:border-slate-200"
                                                    >
                                                        <MoreHorizontal size={18} />
                                                    </button>
                                                    {openMenuId === booking.id && ReactDOM.createPortal(
                                                        <>
                                                            <div className="fixed inset-0 z-[150]" onClick={() => setOpenMenuId(null)} />
                                                            <div
                                                                className="fixed bg-white border border-slate-200 rounded-2xl shadow-2xl z-[151] min-w-[220px] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                                                                ref={openMenuId === booking.id ? menuRef : undefined}
                                                                style={(() => {
                                                                    const btn = document.querySelector(`[data-menu-id="${booking.id}"]`);
                                                                    if (btn) {
                                                                        const rect = btn.getBoundingClientRect();
                                                                        return { top: rect.bottom + 8, left: rect.right - 220 };
                                                                    }
                                                                    return {};
                                                                })()}
                                                            >
                                                                <button
                                                                    onClick={() => { setOpenMenuId(null); setViewingBooking(booking); }}
                                                                    className="w-full text-left px-5 py-3.5 hover:bg-blue-50 transition-colors text-sm font-bold text-blue-600 flex items-center gap-3"
                                                                >
                                                                    <Eye size={16} /> View Details
                                                                </button>
                                                                {isPaid && booking.status !== 'cancelled' && (
                                                                    <button
                                                                        onClick={() => { setOpenMenuId(null); setConfirmModal({ type: 'refund', booking }); }}
                                                                        className="w-full text-left px-5 py-3.5 hover:bg-amber-50 transition-colors text-sm font-bold text-amber-600 flex items-center gap-3"
                                                                    >
                                                                        <RefreshCw size={16} /> Refund Payment
                                                                    </button>
                                                                )}
                                                                {booking.status === 'pending' && (
                                                                    <button
                                                                        onClick={() => { setOpenMenuId(null); setConfirmModal({ type: 'confirm', booking }); }}
                                                                        className="w-full text-left px-5 py-3.5 hover:bg-emerald-50 transition-colors text-sm font-bold text-emerald-600 flex items-center gap-3"
                                                                    >
                                                                        <CheckCircle size={16} /> Confirm Booking
                                                                    </button>
                                                                )}
                                                                {booking.status !== 'cancelled' && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setOpenMenuId(null);
                                                                            if (isPaid) {
                                                                                setConfirmModal({ type: 'refund', booking });
                                                                            } else {
                                                                                setConfirmModal({ type: 'cancel', booking });
                                                                            }
                                                                        }}
                                                                        className="w-full text-left px-5 py-3.5 hover:bg-rose-50 transition-colors text-sm font-bold text-rose-500 flex items-center gap-3"
                                                                    >
                                                                        <Ban size={16} /> {isPaid ? 'Cancel & Refund' : 'Cancel Booking'}
                                                                    </button>
                                                                )}
                                                                <div className="border-t border-slate-100"></div>
                                                                <button
                                                                    onClick={() => { setOpenMenuId(null); setConfirmModal({ type: 'delete', booking }); }}
                                                                    className="w-full text-left px-5 py-3.5 hover:bg-rose-50 transition-colors text-sm font-bold text-rose-600 flex items-center gap-3"
                                                                >
                                                                    <Trash2 size={16} /> Delete Booking
                                                                </button>
                                                            </div>
                                                        </>,
                                                        document.body
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-8 py-16 text-center">
                                        <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No bookings found</p>
                                        <p className="text-xs text-slate-400 font-medium mt-1">
                                            {searchQuery ? 'Try a different search query.' : 'Bookings will appear here once players reserve courts.'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredBookings.length > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100 bg-slate-50/30">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredBookings.length)} of {filteredBookings.length}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                .reduce((acc: (number | string)[], p, idx, arr) => {
                                    if (idx > 0 && typeof arr[idx - 1] === 'number' && p - (arr[idx - 1] as number) > 1) {
                                        acc.push('...');
                                    }
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, idx) =>
                                    typeof p === 'string' ? (
                                        <span key={`ellipsis-${idx}`} className="px-2 text-slate-300 text-sm font-bold">…</span>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() => setCurrentPage(p)}
                                            className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                                                p === currentPage
                                                    ? 'bg-slate-900 text-white shadow-lg'
                                                    : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    )
                                )
                            }
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
                {/* Action Confirmation Modal */}
                {confirmModal && ReactDOM.createPortal(
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="text-center mb-8">
                                <div className={`w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center ${
                                    confirmModal.type === 'confirm' ? 'bg-emerald-50' :
                                    confirmModal.type === 'refund' ? 'bg-amber-50' :
                                    confirmModal.type === 'delete' ? 'bg-rose-50' :
                                    'bg-rose-50'
                                }`}>
                                    {confirmModal.type === 'confirm' && <CheckCircle size={32} className="text-emerald-600" />}
                                    {confirmModal.type === 'cancel' && <XCircle size={32} className="text-rose-500" />}
                                    {confirmModal.type === 'delete' && <Trash2 size={32} className="text-rose-600" />}
                                    {confirmModal.type === 'refund' && <RefreshCw size={32} className="text-amber-600" />}
                                </div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase mb-2">
                                    {confirmModal.type === 'confirm' && 'Confirm Booking'}
                                    {confirmModal.type === 'cancel' && 'Cancel Booking'}
                                    {confirmModal.type === 'delete' && 'Delete Booking'}
                                    {confirmModal.type === 'refund' && 'Cancel & Refund'}
                                </h2>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                    {confirmModal.type === 'confirm' && (
                                        <>Are you sure you want to confirm the booking for <strong className="text-slate-900">{getBookingUser(confirmModal.booking).name}</strong> at <strong className="text-slate-900">{confirmModal.booking.courts?.name}</strong>?</>
                                    )}
                                    {confirmModal.type === 'cancel' && (
                                        <>Are you sure you want to cancel the booking for <strong className="text-slate-900">{getBookingUser(confirmModal.booking).name}</strong>? This action cannot be undone.</>
                                    )}
                                    {confirmModal.type === 'delete' && (
                                        <>Are you sure you want to permanently delete this booking record? <strong className="text-rose-600">This cannot be undone.</strong></>
                                    )}
                                    {confirmModal.type === 'refund' && (
                                        <>This booking has been <strong className="text-lime-700">paid (₱{confirmModal.booking.total_price})</strong>. Cancelling will issue a refund and mark the payment as refunded. Continue?</>
                                    )}
                                </p>
                            </div>

                            {/* Booking Summary */}
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                        <MapPin size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{confirmModal.booking.courts?.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400">
                                            {new Date(confirmModal.booking.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • {confirmModal.booking.start_time.slice(0, 5)} - {confirmModal.booking.end_time.slice(0, 5)} • ₱{confirmModal.booking.total_price}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {confirmModal.type === 'refund' && (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
                                    <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-800 font-bold leading-relaxed">
                                        A refund of <strong>₱{confirmModal.booking.total_price}</strong> will be processed. Please handle the actual refund through your payment provider.
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    disabled={actionLoading}
                                    className="flex-1 h-14 border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                                >
                                    Go Back
                                </button>
                                <button
                                    onClick={handleConfirmAction}
                                    disabled={actionLoading}
                                    className={`flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                        confirmModal.type === 'confirm' ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200' :
                                        confirmModal.type === 'refund' ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-200' :
                                        'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200'
                                    }`}
                                >
                                    {actionLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {confirmModal.type === 'confirm' && 'Yes, Confirm'}
                                            {confirmModal.type === 'cancel' && 'Yes, Cancel'}
                                            {confirmModal.type === 'delete' && 'Delete Forever'}
                                            {confirmModal.type === 'refund' && 'Cancel & Refund'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* New Booking Modal */}
                {isModalOpen && ReactDOM.createPortal(
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto relative overflow-x-hidden">
                            {/* Confetti Animation */}
                            {mbShowConfetti && (
                                <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
                                    {[...Array(60)].map((_, i) => {
                                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
                                        const color = colors[i % colors.length];
                                        const left = Math.random() * 100;
                                        const delay = Math.random() * 0.5;
                                        const duration = 1.5 + Math.random() * 2;
                                        const size = 6 + Math.random() * 8;
                                        const rotation = Math.random() * 360;
                                        const drift = -30 + Math.random() * 60;
                                        return (
                                            <div
                                                key={i}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${left}%`,
                                                    top: '-10px',
                                                    width: `${size}px`,
                                                    height: `${size * (Math.random() > 0.5 ? 1 : 0.6)}px`,
                                                    backgroundColor: color,
                                                    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                                                    transform: `rotate(${rotation}deg)`,
                                                    animation: `confettiFall ${duration}s ease-in ${delay}s forwards`,
                                                    opacity: 0,
                                                }}
                                            />
                                        );
                                    })}
                                    <style>{`
                                        @keyframes confettiFall {
                                            0% { opacity: 1; transform: translateY(0) rotate(0deg) translateX(0); }
                                            100% { opacity: 0; transform: translateY(600px) rotate(720deg) translateX(${Math.random() > 0.5 ? '' : '-'}80px); }
                                        }
                                    `}</style>
                                </div>
                            )}

                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${mbShowConfetti ? 'bg-emerald-50' : mbPaymentStep ? 'bg-blue-50' : 'bg-blue-50'}`}>
                                        {mbShowConfetti ? (
                                            <CheckCircle className="text-emerald-600" size={24} />
                                        ) : mbPaymentStep ? (
                                            <Banknote className="text-blue-600" size={24} />
                                        ) : (
                                            <Calendar className="text-blue-600" size={24} />
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                            {mbShowConfetti ? 'Booking Complete!' : mbPaymentStep ? 'Payment' : 'Manual Booking'}
                                        </h2>
                                        <p className="text-xs text-slate-500 font-medium">
                                            {mbShowConfetti ? 'Guest booking successfully completed' : mbPaymentStep ? 'Complete payment for this booking' : 'Create a new court reservation'}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => { setIsModalOpen(false); resetManualBookingForm(); }} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                                    <X size={20} className="text-slate-600" />
                                </button>
                            </div>

                            {/* Confetti Success Screen */}
                            {mbShowConfetti && mbCreatedBooking && (
                                <div className="p-8 space-y-6 text-center animate-in zoom-in-95 duration-500">
                                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-100">
                                        <CheckCircle className="text-emerald-600" size={48} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Payment Received!</h3>
                                        <p className="text-sm text-slate-500 mt-1">{mbCreatedBooking.isGuest ? 'Guest' : 'Player'} booking has been confirmed and paid</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-left space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Player</span>
                                            <span className="text-sm font-black text-slate-900">{mbCreatedBooking.guestName}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Court</span>
                                            <span className="text-sm font-black text-slate-900">{mbCreatedBooking.courtName}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</span>
                                            <span className="text-sm font-black text-slate-900">{new Date(mbCreatedBooking.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</span>
                                            <span className="text-sm font-black text-slate-900">{mbCreatedBooking.startTime} – {mbCreatedBooking.endTime}</span>
                                        </div>
                                        <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Amount Paid</span>
                                            <span className="text-lg font-black text-emerald-600">₱{mbCreatedBooking.totalPrice.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setIsModalOpen(false); resetManualBookingForm(); }}
                                        className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle size={18} /> Done
                                    </button>
                                </div>
                            )}

                            {/* Payment Step */}
                            {mbPaymentStep && !mbShowConfetti && mbCreatedBooking && (
                                <div className="p-6 space-y-4 animate-in slide-in-from-right duration-300">
                                    {/* Player/Guest Info */}
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">{mbCreatedBooking.isGuest ? 'Guest' : 'Player'}</p>
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={mbCreatedBooking.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(mbCreatedBooking.guestName)}&background=random&size=40&font-size=0.4&bold=true`}
                                                alt=""
                                                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                                            />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-black text-slate-900 tracking-tight uppercase">{mbCreatedBooking.guestName}</p>
                                                    {mbCreatedBooking.isGuest && <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Guest</span>}
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400">{mbCreatedBooking.guestEmail}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Booking Summary */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Court</p>
                                            <p className="text-xs font-black text-slate-900 mt-1">{mbCreatedBooking.courtName}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Date</p>
                                            <p className="text-xs font-black text-slate-900 mt-1">{new Date(mbCreatedBooking.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Time</p>
                                            <p className="text-xs font-black text-slate-900 mt-1">{mbCreatedBooking.startTime} – {mbCreatedBooking.endTime}</p>
                                        </div>
                                    </div>

                                    {/* Total Bill */}
                                    <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 text-center space-y-3">
                                        <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-200">
                                            <Banknote size={28} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Total Bill</p>
                                            <h3 className="text-4xl font-black text-blue-900 tracking-tighter">₱{mbCreatedBooking.totalPrice.toFixed(2)}</h3>
                                        </div>
                                    </div>

                                    {/* Cash Received */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cash Received</label>
                                        <div className="relative">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">₱</span>
                                            <input
                                                type="number"
                                                value={mbCashReceived}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setMbCashReceived(val);
                                                    const received = parseFloat(val) || 0;
                                                    setMbPayChange(Math.max(0, received - mbCreatedBooking.totalPrice));
                                                    setMbPayError('');
                                                }}
                                                placeholder="0"
                                                autoFocus
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] py-6 pl-12 pr-6 text-2xl font-black text-slate-950 focus:border-blue-500 transition-all outline-none"
                                            />
                                        </div>
                                        {mbPayError && (
                                            <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                                                <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                                                <p className="text-xs font-bold text-rose-600">{mbPayError}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Change */}
                                    <div className="p-6 bg-slate-900 rounded-[32px] flex justify-between items-center text-white">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                                                <DollarSign className="text-lime-400" size={20} />
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest">Change</span>
                                        </div>
                                        <span className="text-2xl font-black text-lime-400">₱{mbPayChange.toFixed(2)}</span>
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => { setMbPaymentStep(false); }}
                                            className="px-6 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const received = parseFloat(mbCashReceived) || 0;
                                                if (received < mbCreatedBooking.totalPrice) {
                                                    setMbPayError(`Cash received (₱${received.toFixed(2)}) must not be less than the total bill (₱${mbCreatedBooking.totalPrice.toFixed(2)}).`);
                                                    return;
                                                }
                                                setMbPayProcessing(true);
                                                try {
                                                    const now = new Date().toISOString();
                                                    const isAdvancePay = mbCreatedBooking.date !== todayDateStr;
                                                    const fullUpdates: any = {
                                                        status: 'confirmed',
                                                        payment_status: 'paid',
                                                        amount_tendered: received,
                                                        change_amount: mbPayChange,
                                                    };
                                                    if (!isAdvancePay) {
                                                        fullUpdates.is_checked_in = true;
                                                        fullUpdates.checked_in_at = now;
                                                    }
                                                    let { error } = await supabase.from('bookings').update(fullUpdates).eq('id', mbCreatedBooking.id);
                                                    if (error) {
                                                        const { error: fallbackErr } = await supabase.from('bookings').update({ status: 'confirmed', payment_status: 'paid' }).eq('id', mbCreatedBooking.id);
                                                        if (fallbackErr) throw fallbackErr;
                                                    }
                                                    // Show confetti
                                                    setMbShowConfetti(true);
                                                    fetchBookings();
                                                } catch (err: any) {
                                                    setMbPayError(err.message || 'Failed to process payment');
                                                } finally {
                                                    setMbPayProcessing(false);
                                                }
                                            }}
                                            disabled={mbPayProcessing}
                                            className="flex-1 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {mbPayProcessing ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>{mbCreatedBooking.date !== todayDateStr ? 'Complete Advance Payment' : `Complete ${mbCreatedBooking.isGuest ? 'Guest' : ''} Booking`}</>  
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Booking Form (initial step) */}
                            {!mbPaymentStep && !mbShowConfetti && (
                            <form onSubmit={handleManualBooking} className="p-6 space-y-5">
                                {/* Location & Court */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Location</label>
                                        <select
                                            required
                                            value={mbLocationId}
                                            onChange={(e) => { setMbLocationId(e.target.value); setMbCourtId(''); }}
                                            className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-200 outline-none transition-all font-medium text-sm"
                                        >
                                            <option value="">Select location</option>
                                            {myLocations.map((loc: any) => (
                                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Court</label>
                                        <select
                                            required
                                            value={mbCourtId}
                                            onChange={(e) => setMbCourtId(e.target.value)}
                                            disabled={!mbLocationId}
                                            className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-200 outline-none transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <option value="">{mbLocationId ? 'Select court' : 'Select location first'}</option>
                                            {myCourts.filter((c: any) => c.location_id === mbLocationId).map((court: any) => (
                                                <option key={court.id} value={court.id}>{court.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Price display */}
                                {mbCourtId && (
                                    <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
                                        <DollarSign size={16} className="text-blue-600" />
                                        <div className="flex-1">
                                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Court Rate</p>
                                            <p className="text-lg font-black text-blue-900">{mbPrice > 0 ? `₱${mbPrice}/hr` : 'FREE'}</p>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Custom Price</label>
                                            <input
                                                type="number"
                                                value={mbPrice}
                                                onChange={(e) => setMbPrice(Number(e.target.value))}
                                                className="w-24 px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-sm font-black text-slate-900 outline-none focus:border-blue-400"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Date */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={mbDate}
                                        onChange={(e) => { setMbDate(e.target.value); setMbSelectedSlot(''); }}
                                        className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-200 outline-none transition-all font-medium text-sm"
                                    />
                                </div>

                                {/* Time Slots */}
                                {mbCourtId && mbDate && (
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Select Time Slot</label>
                                        <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                                            {MB_TIME_SLOTS.map((slot) => {
                                                const booked = isSlotBooked(slot.start, slot.end);
                                                const selected = mbSelectedSlot === slot.value;
                                                return (
                                                    <button
                                                        key={slot.value}
                                                        type="button"
                                                        disabled={booked}
                                                        onClick={() => setMbSelectedSlot(selected ? '' : slot.value)}
                                                        className={`flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-xs font-bold transition-all border-2 ${
                                                            booked
                                                                ? 'bg-red-50 border-red-200 text-red-300 cursor-not-allowed line-through'
                                                                : selected
                                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200'
                                                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                                                        }`}
                                                    >
                                                        <Clock size={13} className={booked ? 'text-red-300' : selected ? 'text-white' : 'text-slate-400'} />
                                                        {slot.label}
                                                        {booked && <span className="text-[9px] font-black uppercase">Booked</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {!mbSelectedSlot && <p className="text-[10px] font-bold text-slate-400 mt-2 ml-1">Tap a slot to select it</p>}
                                    </div>
                                )}

                                {/* User Type Toggle */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Booking For</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setMbUserType('player'); setMbGuestFirstName(''); setMbGuestLastName(''); setMbGuestEmail(''); }}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2 ${
                                                mbUserType === 'player'
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
                                                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <Users size={16} /> Pickleplay User
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setMbUserType('guest'); setMbSelectedPlayer(null); setMbPlayerSearch(''); setMbPlayerResults([]); }}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2 ${
                                                mbUserType === 'guest'
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200'
                                                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <UserPlus size={16} /> Guest
                                        </button>
                                    </div>
                                </div>

                                {/* Player Search */}
                                {mbUserType === 'player' && (
                                    <div className="space-y-2">
                                        {mbSelectedPlayer ? (
                                            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4">
                                                {mbSelectedPlayer.avatar_url ? (
                                                    <img src={mbSelectedPlayer.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                                ) : (
                                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(mbSelectedPlayer.full_name || mbSelectedPlayer.username || 'U')}&background=random&size=40&font-size=0.4&bold=true`} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-slate-900 text-sm tracking-tight uppercase truncate">{mbSelectedPlayer.full_name || mbSelectedPlayer.username}</p>
                                                    <p className="text-[10px] font-bold text-blue-600 truncate">{mbSelectedPlayer.email}</p>
                                                </div>
                                                <button type="button" onClick={() => { setMbSelectedPlayer(null); setMbPlayerSearch(''); }} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Search Player</label>
                                                <div className="relative">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                    <input
                                                        type="text"
                                                        placeholder="Search by name or email..."
                                                        value={mbPlayerSearch}
                                                        onChange={(e) => setMbPlayerSearch(e.target.value)}
                                                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-200 outline-none transition-all font-medium text-sm"
                                                    />
                                                    {mbSearching && (
                                                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 animate-spin" size={16} />
                                                    )}
                                                </div>
                                                {mbPlayerResults.length > 0 && (
                                                    <div className="bg-white border border-slate-200 rounded-2xl shadow-lg max-h-48 overflow-y-auto">
                                                        {mbPlayerResults.map((p: any) => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                onClick={() => { setMbSelectedPlayer(p); setMbPlayerSearch(''); setMbPlayerResults([]); }}
                                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-slate-50 last:border-0"
                                                            >
                                                                {p.avatar_url ? (
                                                                    <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                                                                ) : (
                                                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || p.username || 'U')}&background=random&size=32&font-size=0.4&bold=true`} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-bold text-slate-900 truncate">{p.full_name || p.username || 'Unknown'}</p>
                                                                    <p className="text-[10px] font-medium text-slate-400 truncate">{p.email}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {mbPlayerSearch.length >= 2 && !mbSearching && mbPlayerResults.length === 0 && (
                                                    <p className="text-xs font-bold text-slate-400 text-center py-3">No players found for "{mbPlayerSearch}"</p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Guest Info */}
                                {mbUserType === 'guest' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                                            <Mail size={14} className="text-emerald-600" />
                                            <p className="text-[10px] font-bold text-emerald-700">Guest will receive a welcome email with booking details and a link to create an account.</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1.5 block">First Name</label>
                                                <input
                                                    type="text"
                                                    required={mbUserType === 'guest'}
                                                    placeholder="Juan"
                                                    value={mbGuestFirstName}
                                                    onChange={(e) => setMbGuestFirstName(e.target.value)}
                                                    className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-200 outline-none transition-all font-medium text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1.5 block">Last Name</label>
                                                <input
                                                    type="text"
                                                    required={mbUserType === 'guest'}
                                                    placeholder="Dela Cruz"
                                                    value={mbGuestLastName}
                                                    onChange={(e) => setMbGuestLastName(e.target.value)}
                                                    className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-200 outline-none transition-all font-medium text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1.5 block">Email Address</label>
                                            <input
                                                type="email"
                                                required={mbUserType === 'guest'}
                                                placeholder="guest@email.com"
                                                value={mbGuestEmail}
                                                onChange={(e) => setMbGuestEmail(e.target.value)}
                                                className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-200 outline-none transition-all font-medium text-sm"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting || mbSendingEmail || !mbCourtId || !mbSelectedSlot || (mbUserType === 'player' && !mbSelectedPlayer) || (mbUserType === 'guest' && (!mbGuestFirstName.trim() || !mbGuestLastName.trim() || !mbGuestEmail.trim()))}
                                    className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting || mbSendingEmail ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            {mbSendingEmail ? 'Sending Email...' : 'Creating Booking...'}
                                        </>
                                    ) : 'Create Booking'}
                                </button>
                            </form>
                            )}
                        </div>
                    </div>,
                    document.body
                )}

                {/* Booking Detail View Modal */}
                {viewingBooking && ReactDOM.createPortal(
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-2xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Booking Details</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Reference: {viewingBooking.id.slice(0, 8).toUpperCase()}</p>
                                </div>
                                <button onClick={() => setViewingBooking(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
                            </div>

                            {/* Player Info */}
                            {(() => { const u = getBookingUser(viewingBooking); return (
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">{u.isGuest ? 'Guest Information' : 'Player Information'}</p>
                                <div className="flex items-center gap-4">
                                    {u.avatarUrl ? (
                                        <img src={u.avatarUrl} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md" />
                                    ) : (
                                        <img
                                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&size=56&font-size=0.4&bold=true`}
                                            alt=""
                                            className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md"
                                        />
                                    )}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-lg font-black text-slate-900 tracking-tight uppercase">{u.name}</p>
                                            {u.isGuest && <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full uppercase tracking-widest">Guest</span>}
                                        </div>
                                        <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><Phone size={12} /> {u.email}</p>
                                    </div>
                                </div>
                            </div>
                            ); })()}

                            {/* Booking Info Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Court</p>
                                    <p className="text-sm font-black text-slate-900 flex items-center gap-2"><MapPin size={14} className="text-blue-600" /> {viewingBooking.courts?.name || 'Unknown'}</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                                    <p className="text-sm font-black text-slate-900">
                                        {new Date(viewingBooking.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Time Slot</p>
                                    <p className="text-sm font-black text-slate-900 flex items-center gap-2"><Clock size={14} className="text-blue-600" /> {viewingBooking.start_time.slice(0, 5)} – {viewingBooking.end_time.slice(0, 5)}</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Price</p>
                                    <p className="text-xl font-black text-slate-900">₱{viewingBooking.total_price}</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment</p>
                                    <div className="flex flex-col gap-1">
                                        <span className={`inline-block w-fit px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                            viewingBooking.payment_status === 'paid' ? 'bg-lime-50 border-lime-200 text-lime-700' :
                                            viewingBooking.payment_status === 'refunded' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                            'bg-slate-100 border-slate-200 text-slate-500'
                                        }`}>
                                            {viewingBooking.payment_status === 'paid' ? '✓ Paid' : viewingBooking.payment_status === 'refunded' ? '↩ Refunded' : 'Unpaid'}
                                        </span>
                                        {viewingBooking.payment_method && (
                                            <span className="text-[10px] font-bold text-slate-400 capitalize">{viewingBooking.payment_method}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                    <span className={`inline-block px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                        viewingBooking.status === 'confirmed' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                        viewingBooking.status === 'pending' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                                        viewingBooking.status === 'completed' ? 'bg-violet-50 border-violet-100 text-violet-600' :
                                        'bg-rose-50 border-rose-100 text-rose-600'
                                    }`}>
                                        {viewingBooking.status}
                                    </span>
                                </div>
                            </div>

                            {/* Timestamp Section */}
                            <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl p-5 border border-slate-100 mb-8">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Clock size={12} className="text-blue-600" /> Booking Timestamps</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                            <Calendar size={16} className="text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Booked On</p>
                                            <p className="text-sm font-black text-slate-900">
                                                {viewingBooking.created_at
                                                    ? new Date(viewingBooking.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
                                                    : 'N/A'
                                                }
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400">
                                                {viewingBooking.created_at
                                                    ? new Date(viewingBooking.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
                                                    : ''
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    {viewingBooking.checked_in_at && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                                <LogIn size={16} className="text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Checked In</p>
                                                <p className="text-sm font-black text-slate-900">
                                                    {new Date(viewingBooking.checked_in_at).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                                                </p>
                                                <p className="text-[10px] font-bold text-emerald-600">
                                                    {new Date(viewingBooking.checked_in_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {viewingBooking.checked_out_at && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                                                <LogOut size={16} className="text-violet-600" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Checked Out</p>
                                                <p className="text-sm font-black text-slate-900">
                                                    {new Date(viewingBooking.checked_out_at).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                                                </p>
                                                <p className="text-[10px] font-bold text-violet-600">
                                                    {new Date(viewingBooking.checked_out_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {viewingBooking.updated_at && viewingBooking.updated_at !== viewingBooking.created_at && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                                <RefreshCw size={16} className="text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Updated</p>
                                                <p className="text-sm font-black text-slate-900">
                                                    {new Date(viewingBooking.updated_at).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400">
                                                    {new Date(viewingBooking.updated_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Full Booking ID */}
                            <div className="bg-slate-50 rounded-2xl px-5 py-3 border border-slate-100 mb-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Full Booking ID</p>
                                    <p className="text-[11px] font-mono font-bold text-slate-600 tracking-tight">{viewingBooking.id}</p>
                                </div>
                            </div>

                            {/* Actions */}
                            {(() => {
                                const vNow = new Date();
                                const vIsToday = viewingBooking.date === todayDateStr;
                                const vStart = new Date(`${viewingBooking.date}T${viewingBooking.start_time}`);
                                const vEnd = new Date(`${viewingBooking.date}T${viewingBooking.end_time}`);
                                const vFiveMinBefore = new Date(vEnd.getTime() - 5 * 60000);
                                const vCanCheckout = vNow >= vFiveMinBefore;
                                const vIsLate = vNow > vStart && !viewingBooking.is_checked_in && viewingBooking.status !== 'cancelled';
                                const vIsPastEnd = vNow > vEnd;
                                return (
                            <div className="flex gap-3 flex-wrap">
                                {/* PAY & CHECK-IN / ADVANCE PAY — for CONFIRMED + unpaid + not checked in + not past end */}
                                {!viewingBooking.is_checked_in && viewingBooking.status === 'confirmed' && viewingBooking.payment_status !== 'paid' && !vIsPastEnd && !viewingBooking.is_no_show && (
                                    <button
                                        onClick={() => {
                                            const b = viewingBooking;
                                            setViewingBooking(null);
                                            setPayingBooking(b);
                                            setPayCashReceived('');
                                            setPayChange(0);
                                            setPayError('');
                                        }}
                                        className={`flex-1 h-14 ${!vIsToday ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'} text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95`}
                                    >
                                        <Banknote size={18} /> {!vIsToday ? 'Advance Pay' : vIsLate ? 'Late Pay & Check-In' : 'Pay & Check-In'}
                                    </button>
                                )}
                                {/* Check-in only for already-paid confirmed + not checked-in + TODAY only */}
                                {vIsToday && !viewingBooking.is_checked_in && viewingBooking.status === 'confirmed' && viewingBooking.payment_status === 'paid' && !vIsPastEnd && !viewingBooking.is_no_show && (
                                    <button
                                        onClick={async () => {
                                            const b = viewingBooking;
                                            try {
                                                const now = new Date().toISOString();
                                                const { error } = await supabase.from('bookings').update({ is_checked_in: true, checked_in_at: now }).eq('id', b.id);
                                                if (error) await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', b.id);
                                                setViewingBooking(null);
                                                fetchBookings();
                                            } catch (err) { console.error(err); }
                                        }}
                                        className="flex-1 h-14 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <LogIn size={18} /> {vIsLate ? 'Late Check-In' : 'Check-In'}
                                    </button>
                                )}
                                {/* Check-Out button — for checked-in, not yet completed, 5 min before end */}
                                {vCanCheckout && viewingBooking.is_checked_in && viewingBooking.status !== 'completed' && !viewingBooking.checked_out_at && (
                                    <button
                                        onClick={async () => {
                                            const b = viewingBooking;
                                            const outNow = new Date().toISOString();
                                            try {
                                                const { error } = await supabase.from('bookings').update({ status: 'completed', checked_out_at: outNow }).eq('id', b.id);
                                                if (error) await supabase.from('bookings').update({ status: 'completed' }).eq('id', b.id);
                                                setViewingBooking(null);
                                                fetchBookings();
                                            } catch (err) { console.error(err); }
                                        }}
                                        className="flex-1 h-14 bg-violet-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <LogOut size={18} /> Check-Out
                                    </button>
                                )}
                                {/* No-Show button — for late/past-end bookings not checked in */}
                                {!viewingBooking.is_checked_in && !viewingBooking.is_no_show && viewingBooking.status !== 'cancelled' && viewingBooking.status !== 'completed' && (vIsLate || vIsPastEnd) && (
                                    <button
                                        onClick={async () => {
                                            try {
                                                await supabase.from('bookings').update({ is_no_show: true, status: 'cancelled' }).eq('id', viewingBooking.id);
                                                setViewingBooking(null);
                                                fetchBookings();
                                            } catch (err) { console.error(err); }
                                        }}
                                        className="h-14 px-6 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <UserX size={16} /> Mark No Show
                                    </button>
                                )}
                                {viewingBooking.status === 'pending' && (
                                    <button
                                        onClick={() => { setViewingBooking(null); setConfirmModal({ type: 'confirm', booking: viewingBooking }); }}
                                        className="h-14 px-6 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <CheckCircle size={16} /> Confirm
                                    </button>
                                )}
                                {viewingBooking.status !== 'cancelled' && viewingBooking.status !== 'completed' && (
                                    <button
                                        onClick={() => {
                                            const b = viewingBooking;
                                            setViewingBooking(null);
                                            if (b.payment_status === 'paid') {
                                                setConfirmModal({ type: 'refund', booking: b });
                                            } else {
                                                setConfirmModal({ type: 'cancel', booking: b });
                                            }
                                        }}
                                        className="h-14 px-6 border border-rose-200 text-rose-600 bg-rose-50 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <XCircle size={16} /> {viewingBooking.payment_status === 'paid' ? 'Cancel & Refund' : 'Cancel'}
                                    </button>
                                )}
                                <button
                                    onClick={() => { const b = viewingBooking; setViewingBooking(null); setConfirmModal({ type: 'delete', booking: b }); }}
                                    className="h-14 px-6 border border-slate-200 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                                );
                            })()}
                        </div>
                    </div>,
                    document.body
                )}

                {/* Pay & Check-In Modal (from booking details) */}
                {payingBooking && ReactDOM.createPortal(
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                                        <Banknote className="text-blue-600" size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{payingBooking.date !== todayDateStr ? 'Advance Pay' : 'Pay & Check-In'}</h2>
                                        <p className="text-xs text-slate-500 font-medium">{payingBooking.date !== todayDateStr ? 'Receive advance payment for future booking' : 'Receive payment and check in player'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setPayingBooking(null)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                                    <X size={20} className="text-slate-600" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Player Info */}
                                {(() => { const u = getBookingUser(payingBooking); return (
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">{u.isGuest ? 'Guest' : 'Player'}</p>
                                    <div className="flex items-center gap-3">
                                        {u.avatarUrl ? (
                                            <img src={u.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                        ) : (
                                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&size=40&font-size=0.4&bold=true`} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                        )}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-black text-slate-900 tracking-tight uppercase">{u.name}</p>
                                                {u.isGuest && <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Guest</span>}
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400">{u.email}</p>
                                        </div>
                                    </div>
                                </div>
                                ); })()}

                                {/* Booking Summary */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Court</p>
                                        <p className="text-xs font-black text-slate-900 mt-1">{payingBooking.courts?.name}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Date</p>
                                        <p className="text-xs font-black text-slate-900 mt-1">{new Date(payingBooking.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Time</p>
                                        <p className="text-xs font-black text-slate-900 mt-1">{payingBooking.start_time.slice(0, 5)} – {payingBooking.end_time.slice(0, 5)}</p>
                                    </div>
                                </div>

                                {/* Total Bill */}
                                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 text-center space-y-3">
                                    <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-200">
                                        <Banknote size={28} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Total Bill</p>
                                        <h3 className="text-4xl font-black text-blue-900 tracking-tighter">₱{payingBooking.total_price.toFixed(2)}</h3>
                                    </div>
                                </div>

                                {/* Cash Received */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cash Received</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">₱</span>
                                        <input
                                            type="number"
                                            value={payCashReceived}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setPayCashReceived(val);
                                                const received = parseFloat(val) || 0;
                                                setPayChange(Math.max(0, received - payingBooking.total_price));
                                                setPayError('');
                                            }}
                                            placeholder="0.00"
                                            autoFocus
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] py-6 pl-12 pr-6 text-2xl font-black text-slate-950 focus:border-blue-500 transition-all outline-none"
                                        />
                                    </div>
                                    {payError && (
                                        <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                                            <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                                            <p className="text-xs font-bold text-rose-600">{payError}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Change */}
                                <div className="p-6 bg-slate-900 rounded-[32px] flex justify-between items-center text-white">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                                            <DollarSign className="text-lime-400" size={20} />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest">Change</span>
                                    </div>
                                    <span className="text-2xl font-black text-lime-400">₱{payChange.toFixed(2)}</span>
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setPayingBooking(null)} className="px-6 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Back</button>
                                    <button
                                        onClick={async () => {
                                            const received = parseFloat(payCashReceived) || 0;
                                            if (received < payingBooking.total_price) {
                                                setPayError(`Cash received (₱${received.toFixed(2)}) must not be less than the total bill (₱${payingBooking.total_price.toFixed(2)}).`);
                                                return;
                                            }
                                            setPayProcessing(true);
                                            try {
                                                const now = new Date().toISOString();
                                                const isAdvancePay = payingBooking.date !== todayDateStr;
                                                const fullUpdates: any = {
                                                    status: 'confirmed',
                                                    payment_status: 'paid',
                                                    amount_tendered: received,
                                                    change_amount: payChange
                                                };
                                                if (!isAdvancePay) {
                                                    fullUpdates.is_checked_in = true;
                                                    fullUpdates.checked_in_at = now;
                                                }
                                                let { error } = await supabase.from('bookings').update(fullUpdates).eq('id', payingBooking.id);
                                                if (error) {
                                                    // Fallback without custom columns
                                                    const { error: fallbackErr } = await supabase.from('bookings').update({ status: 'confirmed', payment_status: 'paid' }).eq('id', payingBooking.id);
                                                    if (fallbackErr) throw fallbackErr;
                                                }
                                                setPayingBooking(null);
                                                fetchBookings();
                                            } catch (err: any) {
                                                setPayError(err.message || 'Failed to process payment');
                                            } finally {
                                                setPayProcessing(false);
                                            }
                                        }}
                                        disabled={payProcessing}
                                        className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {payProcessing ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>{payingBooking.date !== todayDateStr ? 'Complete Advance Payment' : 'Complete Payment & Check-In'}</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* QR Scanner Modal */}
                {showScanner && ReactDOM.createPortal(
                    <BookingScanner
                        onClose={() => {
                            setShowScanner(false);
                            fetchBookings(); // Refresh bookings after scanning
                        }}
                    />,
                    document.body
                )}
            </div>
        </div>
    );
};

export default BookingsAdmin;
