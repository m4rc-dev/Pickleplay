import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../services/supabase';
import { CalendarIcon, Clock, Loader2, Calendar, MapPin, Star, X, Send, FileText, Search, ChevronLeft, ChevronRight, Info, Globe, Layers, ChevronDown, Sparkles, Share2, Users, UserPlus, Trash2, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { submitCourtReview, hasUserReviewedBooking } from '../services/reviews';
import Receipt from './Receipt';
import MarketingPosterModal, { PosterData } from './MarketingPosterModal';

const ITEMS_PER_PAGE = 8;
const STATUS_FILTERS = ['All', 'Confirmed', 'Pending', 'Paid', 'Cancelled'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

// Helper: format 24h time "HH:MM" to 12h "h:MM AM/PM"
const formatTimeTo12h = (time?: string): string => {
    if (!time) return '';
    const [hStr, mStr] = time.slice(0, 5).split(':');
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${mStr} ${ampm}`;
};

// Helper: check if booking timeslot has been consumed (end time has passed)
const isTimeslotConsumed = (date: string, endTime: string): boolean => {
    if (!date || !endTime) return false;
    const now = new Date();
    const [hStr, mStr] = endTime.slice(0, 5).split(':');
    const bookingEnd = new Date(date + 'T00:00:00');
    bookingEnd.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
    return now > bookingEnd;
};

const MyBookings: React.FC = () => {
    const [myBookings, setMyBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userFullName, setUserFullName] = useState<string>('');
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const navigate = useNavigate();

    // Tab: My Bookings vs Shared Courts
    const [activeTab, setActiveTab] = useState<'bookings' | 'shared'>('bookings');

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<StatusFilter>('All');
    const [selectedLocation, setSelectedLocation] = useState<string>('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);

    // Review State
    const [reviewedBookings, setReviewedBookings] = useState<Set<string>>(new Set());
    const [selectedBookingForReview, setSelectedBookingForReview] = useState<any | null>(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);

    // Receipt State
    const [selectedBookingForReceipt, setSelectedBookingForReceipt] = useState<any | null>(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);

    // Court Detail Modal State
    const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<any | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Share Court Modal State
    const [showShareModal, setShowShareModal] = useState(false);
    const [selectedBookingForShare, setSelectedBookingForShare] = useState<any | null>(null);
    const [shareEmail, setShareEmail] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [shareError, setShareError] = useState('');

    // Marketing Poster State
    const [isPosterOpen, setIsPosterOpen] = useState(false);
    const [posterData, setPosterData] = useState<PosterData | null>(null);

    const handleOpenPoster = (booking: any) => {
        setPosterData({
            courtName: booking.court?.name || 'Pickleball Court',
            locationName: booking.court?.location?.name || '',
            address: booking.court?.location?.address || '',
            city: booking.court?.location?.city || '',
            date: booking.date,
            startTime: booking.start_time,
            endTime: booking.end_time,
            courtType: booking.court?.court_type || undefined,
            imageUrl: booking.court?.image_url || undefined,
            amenities: Array.isArray(booking.court?.amenities) ? booking.court.amenities : [],
            joinLink: `${window.location.origin}/booking`,
        });
        setIsPosterOpen(true);
    };

    // Shared Courts State
    const [sharedCourts, setSharedCourts] = useState<any[]>([]);
    const [sharedByMe, setSharedByMe] = useState<any[]>([]);
    const [isLoadingShared, setIsLoadingShared] = useState(false);

    useEffect(() => {
        fetchMyBookings();
    }, []);

    useEffect(() => {
        if (activeTab === 'shared') {
            fetchSharedCourts();
        }
    }, [activeTab]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClick = () => { setShowStatusDropdown(false); setShowLocationDropdown(false); };
        if (showStatusDropdown || showLocationDropdown) {
            document.addEventListener('click', handleClick);
            return () => document.removeEventListener('click', handleClick);
        }
    }, [showStatusDropdown, showLocationDropdown]);

    const fetchMyBookings = async () => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                navigate('/login');
                return;
            }
            setCurrentUserId(session.user.id);

            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, username')
                    .eq('id', session.user.id)
                    .maybeSingle();

                if (profile) {
                    setUserFullName(profile.full_name || profile.username || 'User');
                }
            } catch (pErr) {
                console.warn('Error fetching profile:', pErr);
            }

            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    court:courts(
                        id,
                        name,
                        base_price,
                        court_type,
                        surface_type,
                        num_courts,
                        amenities,
                        image_url,
                        status,
                        cleaning_time_minutes,
                        location:locations(name, city, address, latitude, longitude)
                    ),
                    review:court_reviews(rating)
                `)
                .eq('player_id', session.user.id)
                .order('date', { ascending: false });

            if (error) throw error;

            const processedData = (data || []).map(b => {
                const myReview = (b.review as any)?.[0];
                return { ...b, myRating: myReview?.rating || 0 };
            });

            setMyBookings(processedData);

            if (data && data.length > 0) {
                const reviewedSet = new Set<string>();
                for (const booking of data) {
                    const hasReviewed = await hasUserReviewedBooking(booking.id, session.user.id);
                    if (hasReviewed) reviewedSet.add(booking.id);
                }
                setReviewedBookings(reviewedSet);
            }
        } catch (err) {
            console.error('Error fetching bookings:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSharedCourts = async () => {
        setIsLoadingShared(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { data: sharedWithMe } = await supabase
                .from('shared_bookings')
                .select(`
                    *,
                    booking:bookings(
                        *,
                        court:courts(
                            id, name, base_price, court_type, surface_type, image_url,
                            location:locations(name, city, address)
                        )
                    ),
                    sharer:profiles!shared_bookings_shared_by_fkey(full_name, username, avatar_url)
                `)
                .eq('shared_with', session.user.id)
                .order('created_at', { ascending: false });

            setSharedCourts(sharedWithMe || []);

            const { data: byMe } = await supabase
                .from('shared_bookings')
                .select(`
                    *,
                    booking:bookings(
                        *,
                        court:courts(
                            id, name, base_price, court_type, surface_type, image_url,
                            location:locations(name, city, address)
                        )
                    ),
                    shared_user:profiles!shared_bookings_shared_with_fkey(full_name, username, avatar_url)
                `)
                .eq('shared_by', session.user.id)
                .order('created_at', { ascending: false });

            setSharedByMe(byMe || []);
        } catch (err) {
            console.error('Error fetching shared courts:', err);
        } finally {
            setIsLoadingShared(false);
        }
    };

    // ── Location list from bookings ──
    const locationOptions = useMemo(() => {
        const locMap = new Map<string, string>();
        myBookings.forEach(b => {
            const locName = b.court?.location?.name;
            if (locName) locMap.set(locName, locName);
        });
        return ['All', ...Array.from(locMap.keys())];
    }, [myBookings]);

    // ── Filtering & Search ──
    const filteredBookings = useMemo(() => {
        let results = myBookings;
        if (activeFilter !== 'All') {
            results = results.filter(b => {
                if (activeFilter === 'Paid') return b.payment_status === 'paid';
                return b.status === activeFilter.toLowerCase();
            });
        }
        if (selectedLocation !== 'All') {
            results = results.filter(b => b.court?.location?.name === selectedLocation);
        }
        if (selectedCalendarDate) {
            results = results.filter(b => b.date === selectedCalendarDate);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            results = results.filter(b =>
                (b.court?.name || '').toLowerCase().includes(q) ||
                (b.court?.location?.city || '').toLowerCase().includes(q) ||
                (b.court?.location?.name || '').toLowerCase().includes(q) ||
                b.id.toLowerCase().includes(q) ||
                b.date.includes(q)
            );
        }
        return results;
    }, [myBookings, activeFilter, selectedLocation, searchQuery, selectedCalendarDate]);

    // ── Pagination ──
    const totalPages = Math.max(1, Math.ceil(filteredBookings.length / ITEMS_PER_PAGE));
    const paginatedBookings = filteredBookings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    useEffect(() => { setCurrentPage(1); }, [activeFilter, selectedLocation, searchQuery, selectedCalendarDate]);

    // ── Calendar helpers ──
    const bookingDatesMap = useMemo(() => {
        const map: Record<string, { count: number; statuses: string[] }> = {};
        myBookings.forEach(b => {
            if (!map[b.date]) map[b.date] = { count: 0, statuses: [] };
            map[b.date].count++;
            map[b.date].statuses.push(b.payment_status === 'paid' ? 'paid' : b.status);
        });
        return map;
    }, [myBookings]);

    const calendarDays = useMemo(() => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days: (number | null)[] = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let d = 1; d <= daysInMonth; d++) days.push(d);
        return days;
    }, [calendarMonth]);

    const getDateStr = (day: number) => {
        const y = calendarMonth.getFullYear();
        const m = String(calendarMonth.getMonth() + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const handleOpenReview = (booking: any) => {
        setSelectedBookingForReview(booking);
        setReviewRating(5);
        setReviewComment('');
        setShowReviewModal(true);
    };

    const handleSubmitReview = async () => {
        if (!selectedBookingForReview || !reviewComment.trim()) return;
        setIsSubmittingReview(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;
            const result = await submitCourtReview(
                selectedBookingForReview.court_id,
                session.user.id,
                reviewRating,
                reviewComment,
                undefined,
                selectedBookingForReview.id
            );
            if (result.success) {
                setReviewedBookings(prev => new Set(prev).add(selectedBookingForReview.id));
                setShowReviewModal(false);
                fetchMyBookings();
                alert('Thank you! Your review has been submitted.');
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (err) {
            console.error('Error submit review:', err);
            alert('Failed to submit review. Please try again.');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleOpenReceipt = (booking: any) => {
        setSelectedBookingForReceipt({
            id: booking.id,
            courtName: booking.court?.name || 'Pickleball Court',
            courtLocation: booking.court?.location
                ? `${booking.court.location.address || ''}, ${booking.court.location.city || ''}`
                : 'PicklePlay Facility',
            locationName: booking.court?.location?.name || '',
            date: booking.date,
            startTime: booking.start_time,
            endTime: booking.end_time,
            pricePerHour: booking.total_price,
            totalPrice: booking.total_price,
            playerName: userFullName,
            status: booking.status,
            confirmedAt: booking.status === 'confirmed' ? booking.updated_at : undefined,
            paymentMethod: booking.payment_method,
            paymentStatus: booking.payment_status,
            amountTendered: booking.amount_tendered,
            changeAmount: booking.change_amount
        });
        setShowReceiptModal(true);
    };

    const handleShareCourt = async () => {
        if (!selectedBookingForShare || !shareEmail.trim()) return;
        setIsSharing(true);
        setShareError('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { data: targetUser } = await supabase
                .from('profiles')
                .select('id, full_name, username')
                .eq('email', shareEmail.trim().toLowerCase())
                .maybeSingle();

            if (!targetUser) { setShareError('No user found with that email address.'); setIsSharing(false); return; }
            if (targetUser.id === session.user.id) { setShareError('You cannot share a booking with yourself.'); setIsSharing(false); return; }

            const { data: existing } = await supabase
                .from('shared_bookings')
                .select('id')
                .eq('booking_id', selectedBookingForShare.id)
                .eq('shared_with', targetUser.id)
                .maybeSingle();

            if (existing) { setShareError('This booking is already shared with that user.'); setIsSharing(false); return; }

            const { error } = await supabase.from('shared_bookings').insert({
                booking_id: selectedBookingForShare.id,
                shared_by: session.user.id,
                shared_with: targetUser.id
            });

            if (error) throw error;
            alert(`Court shared with ${targetUser.full_name || targetUser.username}!`);
            setShowShareModal(false);
            setShareEmail('');
            if (activeTab === 'shared') fetchSharedCourts();
        } catch (err: any) {
            console.error('Share error:', err);
            setShareError(err.message || 'Failed to share court.');
        } finally {
            setIsSharing(false);
        }
    };

    const handleRemoveShare = async (shareId: string) => {
        if (!confirm('Remove this shared court access?')) return;
        try {
            await supabase.from('shared_bookings').delete().eq('id', shareId);
            fetchSharedCourts();
        } catch (err) {
            console.error('Remove share error:', err);
        }
    };

    const getStatusBadge = (b: any) => {
        const isPaid = b.payment_status === 'paid';
        const label = isPaid ? 'Paid' : b.status;
        const colors = isPaid ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
            b.status === 'confirmed' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                b.status === 'pending' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                    b.status === 'cancelled' ? 'bg-red-50 border-red-200 text-red-500' :
                        'bg-slate-100 border-slate-200 text-slate-500';
        return <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${colors}`}>{label}</span>;
    };

    // Review available only if confirmed AND timeslot consumed AND not already reviewed
    const canReview = (b: any): boolean => {
        return b.status === 'confirmed' && !reviewedBookings.has(b.id) && isTimeslotConsumed(b.date, b.end_time);
    };

    const todayStr = new Date().toISOString().split('T')[0];

    return (
        <>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-4">RESERVATIONS / 2026</p>
                        <h1 className="text-5xl md:text-7xl font-black text-slate-950 tracking-tighter uppercase leading-[0.8]">
                            My Booked <span className="text-blue-600">Courts.</span>
                        </h1>
                    </div>
                    <button
                        onClick={() => navigate('/booking')}
                        className="px-10 py-5 bg-blue-600 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-slate-900 transition-all shadow-2xl shadow-slate-200/50 flex items-center gap-3"
                    >
                        <Calendar size={20} /> Book A Court
                    </button>
                </div>

                {/* Tabs: My Bookings | Shared Courts */}
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('bookings')}
                        className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 flex items-center gap-2 ${activeTab === 'bookings' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border-2 border-slate-100 hover:border-slate-300 hover:text-slate-700'}`}>
                        <CalendarIcon size={16} /> My Bookings
                    </button>
                    <button onClick={() => setActiveTab('shared')}
                        className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 flex items-center gap-2 ${activeTab === 'shared' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border-2 border-slate-100 hover:border-slate-300 hover:text-slate-700'}`}>
                        <Users size={16} /> Shared Courts
                        {sharedCourts.length > 0 && <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded-lg">{sharedCourts.length}</span>}
                    </button>
                </div>

                {activeTab === 'bookings' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* ── Calendar Sidebar ── */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-[32px] border-2 border-slate-100 shadow-lg shadow-slate-100/50 p-6 sticky top-6">
                                <div className="flex items-center justify-between mb-5">
                                    <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                                        className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"><ChevronLeft size={16} /></button>
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                                        {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                                        className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"><ChevronRight size={16} /></button>
                                </div>

                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                        <div key={i} className="text-center text-[9px] font-black text-slate-300 uppercase">{d}</div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                    {calendarDays.map((day, idx) => {
                                        if (day === null) return <div key={`e-${idx}`} />;
                                        const dateStr = getDateStr(day);
                                        const info = bookingDatesMap[dateStr];
                                        const isSelected = selectedCalendarDate === dateStr;
                                        const isToday = dateStr === todayStr;
                                        const hasBooking = !!info;
                                        return (
                                            <button key={dateStr} onClick={() => setSelectedCalendarDate(isSelected ? null : dateStr)}
                                                className={`relative w-full aspect-square rounded-xl text-[11px] font-black transition-all duration-200 ${isSelected ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-200' :
                                                        isToday ? 'bg-slate-900 text-white' :
                                                            hasBooking ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' :
                                                                'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                                                    }`}>
                                                {day}
                                                {hasBooking && !isSelected && (
                                                    <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${info.statuses.includes('paid') ? 'bg-emerald-500' :
                                                            info.statuses.includes('confirmed') ? 'bg-blue-500' :
                                                                info.statuses.includes('pending') ? 'bg-blue-500' : 'bg-slate-400'
                                                        }`} />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {selectedCalendarDate && (
                                    <button onClick={() => setSelectedCalendarDate(null)}
                                        className="w-full mt-4 py-2.5 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 rounded-xl transition-colors">
                                        Clear Date Filter
                                    </button>
                                )}

                                <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                                        <span className="text-sm font-black text-slate-900">{myBookings.length}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Confirmed</span>
                                        <span className="text-sm font-black text-slate-900">{myBookings.filter(b => b.status === 'confirmed').length}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Pending</span>
                                        <span className="text-sm font-black text-slate-900">{myBookings.filter(b => b.status === 'pending').length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Main Content ── */}
                        <div className="lg:col-span-3 space-y-5">
                            {/* Search + Filter Dropdowns */}
                            <div className="bg-white rounded-[32px] border-2 border-slate-100 shadow-lg shadow-slate-100/50 p-5">
                                <div className="flex flex-col md:flex-row gap-3">
                                    <div className="flex-1 flex items-center gap-3 bg-slate-50 rounded-2xl px-5 py-3 border border-slate-100 focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                                        <Search size={18} className="text-slate-400 shrink-0" />
                                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Search by court, location, or reference..."
                                            className="w-full bg-transparent outline-none text-sm font-bold text-slate-700 placeholder:text-slate-300" />
                                        {searchQuery && <button onClick={() => setSearchQuery('')} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={14} /></button>}
                                    </div>

                                    {/* Status Dropdown */}
                                    <div className="relative">
                                        <button onClick={(e) => { e.stopPropagation(); setShowStatusDropdown(!showStatusDropdown); setShowLocationDropdown(false); }}
                                            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all duration-200 min-w-[140px] justify-between ${activeFilter !== 'All' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                                                }`}>
                                            <span>{activeFilter}</span>
                                            <ChevronDown size={14} className={`transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                                        </button>
                                        {showStatusDropdown && (
                                            <div className="absolute top-full mt-2 right-0 bg-white rounded-2xl border-2 border-slate-100 shadow-xl shadow-slate-200/50 z-50 overflow-hidden min-w-[160px]" onClick={e => e.stopPropagation()}>
                                                {STATUS_FILTERS.map(f => (
                                                    <button key={f} onClick={() => { setActiveFilter(f); setShowStatusDropdown(false); }}
                                                        className={`w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === f ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                                            }`}>{f}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Location Dropdown */}
                                    <div className="relative">
                                        <button onClick={(e) => { e.stopPropagation(); setShowLocationDropdown(!showLocationDropdown); setShowStatusDropdown(false); }}
                                            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all duration-200 min-w-[140px] justify-between ${selectedLocation !== 'All' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                                                }`}>
                                            <MapPin size={14} className="shrink-0" />
                                            <span className="truncate max-w-[100px]">{selectedLocation === 'All' ? 'Location' : selectedLocation}</span>
                                            <ChevronDown size={14} className={`transition-transform shrink-0 ${showLocationDropdown ? 'rotate-180' : ''}`} />
                                        </button>
                                        {showLocationDropdown && (
                                            <div className="absolute top-full mt-2 right-0 bg-white rounded-2xl border-2 border-slate-100 shadow-xl shadow-slate-200/50 z-50 overflow-hidden min-w-[200px] max-h-[240px] overflow-y-auto" onClick={e => e.stopPropagation()}>
                                                {locationOptions.map(loc => (
                                                    <button key={loc} onClick={() => { setSelectedLocation(loc); setShowLocationDropdown(false); }}
                                                        className={`w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest transition-all ${selectedLocation === loc ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                                            }`}>{loc}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {(searchQuery || activeFilter !== 'All' || selectedLocation !== 'All' || selectedCalendarDate) && (
                                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredBookings.length} result{filteredBookings.length !== 1 ? 's' : ''}</span>
                                        {selectedCalendarDate && (
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg">
                                                {new Date(selectedCalendarDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        )}
                                        {selectedLocation !== 'All' && (
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1">
                                                <MapPin size={10} /> {selectedLocation}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Bookings List */}
                            <div className="bg-white rounded-[32px] border-2 border-slate-100 shadow-lg shadow-slate-100/50 overflow-hidden">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <Loader2 className="animate-spin text-blue-600" size={48} />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Retrieving your court history...</p>
                                    </div>
                                ) : paginatedBookings.length > 0 ? (
                                    <>
                                        <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-4 border-b border-slate-100 bg-slate-50/50">
                                            <div className="col-span-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ref</div>
                                            <div className="col-span-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Court & Location</div>
                                            <div className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</div>
                                            <div className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Time</div>
                                            <div className="col-span-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount</div>
                                            <div className="col-span-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</div>
                                            <div className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</div>
                                        </div>

                                        {paginatedBookings.map((b, idx) => (
                                            <div key={b.id} className={`grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-6 md:px-8 py-5 items-center border-b border-slate-50 hover:bg-blue-50/30 transition-all duration-200 group ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                                                <div className="col-span-1">
                                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-wide">#{b.id.slice(0, 7)}</p>
                                                </div>
                                                <div className="col-span-3 flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                                                        <MapPin size={14} className="text-blue-600" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{b.court?.name || 'Court'}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 truncate">{b.court?.location?.name || b.court?.location?.city || 'PicklePlay'}</p>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 flex items-center gap-2">
                                                    <CalendarIcon size={14} className="text-slate-300 shrink-0" />
                                                    <p className="text-xs font-black text-slate-700">{new Date(b.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                </div>
                                                <div className="col-span-2 flex items-center gap-2">
                                                    <Clock size={14} className="text-slate-300 shrink-0" />
                                                    <p className="text-xs font-black text-slate-700">{formatTimeTo12h(b.start_time)} - {formatTimeTo12h(b.end_time)}</p>
                                                </div>
                                                <div className="col-span-1">
                                                    {b.total_price > 0 ? <p className="text-sm font-black text-slate-900">₱{b.total_price}</p> : <p className="text-sm font-black text-emerald-500">FREE</p>}
                                                </div>
                                                <div className="col-span-1">{getStatusBadge(b)}</div>
                                                <div className="col-span-2 flex items-center justify-end gap-2">
                                                    {canReview(b) && (
                                                        <button onClick={() => handleOpenReview(b)}
                                                            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Review Court">
                                                            <Star size={14} />
                                                        </button>
                                                    )}
                                                    {b.status === 'confirmed' && (
                                                        <button onClick={() => handleOpenPoster(b)}
                                                            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50 transition-all" title="Share Game Poster">
                                                            <Megaphone size={14} />
                                                        </button>
                                                    )}
                                                    {b.status === 'confirmed' && (
                                                        <button onClick={() => { setSelectedBookingForShare(b); setShareEmail(''); setShareError(''); setShowShareModal(true); }}
                                                            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 transition-all" title="Share Court">
                                                            <Share2 size={14} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleOpenReceipt(b)}
                                                        className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all" title="View Receipt">
                                                        <FileText size={14} />
                                                    </button>
                                                    <button onClick={() => { setSelectedBookingForDetail(b); setShowDetailModal(true); }}
                                                        className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all" title="View Details">
                                                        <Info size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {totalPages > 1 && (
                                            <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100 bg-slate-50/30">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    Page {currentPage} of {totalPages} • {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                                        className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-white hover:border-slate-400 disabled:opacity-30 disabled:pointer-events-none transition-all">
                                                        <ChevronLeft size={14} />
                                                    </button>
                                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                                        .map((page, idx, arr) => (
                                                            <React.Fragment key={page}>
                                                                {idx > 0 && arr[idx - 1] !== page - 1 && <span className="text-slate-300 text-xs px-1">...</span>}
                                                                <button onClick={() => setCurrentPage(page)}
                                                                    className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${currentPage === page ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-white border border-slate-200 hover:border-slate-400'}`}>
                                                                    {page}
                                                                </button>
                                                            </React.Fragment>
                                                        ))}
                                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                                        className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-white hover:border-slate-400 disabled:opacity-30 disabled:pointer-events-none transition-all">
                                                        <ChevronRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-24 space-y-6">
                                        <div className="w-20 h-20 bg-slate-50 rounded-[24px] flex items-center justify-center mx-auto border-2 border-dashed border-slate-200">
                                            <Calendar size={32} className="text-slate-300" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                                {searchQuery || activeFilter !== 'All' || selectedLocation !== 'All' || selectedCalendarDate ? 'No Matching Bookings' : 'No Bookings Found'}
                                            </h3>
                                            <p className="text-slate-500 font-medium mt-2">
                                                {searchQuery || activeFilter !== 'All' || selectedLocation !== 'All' || selectedCalendarDate
                                                    ? 'Try adjusting your search or filters.' : 'Ready to hit the court? Start your first reservation today.'}
                                            </p>
                                        </div>
                                        {!searchQuery && activeFilter === 'All' && selectedLocation === 'All' && !selectedCalendarDate && (
                                            <button onClick={() => navigate('/booking')}
                                                className="px-10 py-5 bg-blue-600 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-slate-900 transition-all shadow-2xl shadow-blue-100">
                                                Book Your First Court
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── Shared Courts Tab ── */
                    <div className="space-y-6">
                        {isLoadingShared ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="animate-spin text-blue-600" size={48} />
                                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Loading shared courts...</p>
                            </div>
                        ) : (
                            <>
                                {/* Shared WITH me */}
                                <div className="bg-white rounded-[32px] border-2 border-slate-100 shadow-lg shadow-slate-100/50 overflow-hidden">
                                    <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50">
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                            <Users size={16} className="text-blue-600" /> Shared With Me
                                        </h3>
                                    </div>
                                    {sharedCourts.length > 0 ? sharedCourts.map((sc) => {
                                        const b = sc.booking; const sharer = sc.sharer;
                                        return (
                                            <div key={sc.id} className="px-8 py-5 border-b border-slate-50 hover:bg-blue-50/30 transition-all">
                                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
                                                            <MapPin size={18} className="text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{b?.court?.name || 'Court'}</p>
                                                            <p className="text-[10px] font-bold text-slate-400">{b?.court?.location?.name || 'PicklePlay'} • {b?.court?.location?.city || ''}</p>
                                                            <p className="text-[10px] font-bold text-blue-500 mt-1">
                                                                {new Date(b?.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • {formatTimeTo12h(b?.start_time)} – {formatTimeTo12h(b?.end_time)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Shared by</p>
                                                            <p className="text-xs font-black text-slate-700">{sharer?.full_name || sharer?.username || 'User'}</p>
                                                        </div>
                                                        {sharer?.avatar_url && <img src={sharer.avatar_url} className="w-8 h-8 rounded-xl object-cover border border-slate-200" alt="" />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="text-center py-16">
                                            <Users size={40} className="text-slate-200 mx-auto mb-4" />
                                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No courts shared with you yet</p>
                                            <p className="text-xs text-slate-400 mt-1">When someone shares their booking, it will appear here.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Shared BY me */}
                                <div className="bg-white rounded-[32px] border-2 border-slate-100 shadow-lg shadow-slate-100/50 overflow-hidden">
                                    <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50">
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                            <Share2 size={16} className="text-emerald-600" /> Shared By Me
                                        </h3>
                                    </div>
                                    {sharedByMe.length > 0 ? sharedByMe.map((sc) => {
                                        const b = sc.booking; const sharedUser = sc.shared_user;
                                        return (
                                            <div key={sc.id} className="px-8 py-5 border-b border-slate-50 hover:bg-blue-50/30 transition-all">
                                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shrink-0">
                                                            <Share2 size={18} className="text-emerald-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{b?.court?.name || 'Court'}</p>
                                                            <p className="text-[10px] font-bold text-slate-400">{b?.court?.location?.name || 'PicklePlay'}</p>
                                                            <p className="text-[10px] font-bold text-blue-500 mt-1">
                                                                {new Date(b?.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • {formatTimeTo12h(b?.start_time)} – {formatTimeTo12h(b?.end_time)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Shared with</p>
                                                            <p className="text-xs font-black text-slate-700">{sharedUser?.full_name || sharedUser?.username || 'User'}</p>
                                                        </div>
                                                        <button onClick={() => handleRemoveShare(sc.id)}
                                                            className="p-2 rounded-xl bg-white border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition-all" title="Remove">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="text-center py-16">
                                            <Share2 size={40} className="text-slate-200 mx-auto mb-4" />
                                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">You haven't shared any courts yet</p>
                                            <p className="text-xs text-slate-400 mt-1">Share your confirmed bookings with other players.</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ═══ REVIEW MODAL ═══ */}
            {showReviewModal && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowReviewModal(false); }}>
                    <div className="relative w-full max-w-lg bg-white rounded-[48px] shadow-3xl p-10 space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-3xl font-black text-slate-950 uppercase tracking-tight leading-none mb-2">Leave a Review</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">How was your game at {selectedBookingForReview?.court?.name}?</p>
                            </div>
                            <button onClick={() => setShowReviewModal(false)} className="p-2 text-slate-400 hover:text-slate-950 transition-colors"><X size={24} /></button>
                        </div>
                        <div className="space-y-6">
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate your experience</p>
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} onClick={() => setReviewRating(star)} className="transition-all hover:scale-125 active:scale-95">
                                            <Star size={36} className={`${star <= reviewRating ? 'text-[#a3e635] fill-[#a3e635]' : 'text-slate-200'} transition-colors`} />
                                        </button>
                                    ))}
                                </div>
                                <span className="text-xs font-black text-blue-600 uppercase tracking-widest">
                                    {reviewRating === 5 ? 'Excellent!' : reviewRating === 4 ? 'Great' : reviewRating === 3 ? 'Good' : reviewRating === 2 ? 'Fair' : 'Poor'}
                                </span>
                            </div>
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Share your thoughts</p>
                                <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}
                                    placeholder="Write something about the court surface, amenities, or staff..."
                                    className="w-full h-32 p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] font-bold text-slate-700 outline-none focus:border-blue-400 focus:bg-white transition-all resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowReviewModal(false)}
                                className="flex-1 py-5 bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all">Not Now</button>
                            <button onClick={handleSubmitReview} disabled={isSubmittingReview || !reviewComment.trim()}
                                className="flex-1 py-5 bg-slate-950 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-600 disabled:opacity-50 disabled:bg-slate-200 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200">
                                {isSubmittingReview ? <Loader2 className="animate-spin" size={18} /> : <><Send size={18} /> Submit Review</>}
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* ═══ RECEIPT MODAL ═══ */}
            {showReceiptModal && selectedBookingForReceipt && (
                <Receipt bookingData={selectedBookingForReceipt} onClose={() => setShowReceiptModal(false)} />
            )}

            {/* ═══ SHARE COURT MODAL ═══ */}
            {showShareModal && selectedBookingForShare && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowShareModal(false); }}>
                    <div className="relative w-full max-w-md bg-white rounded-[48px] shadow-3xl p-10 space-y-6 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tight leading-none mb-2">Share Court</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                                    {selectedBookingForShare.court?.name} • {new Date(selectedBookingForShare.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </p>
                            </div>
                            <button onClick={() => setShowShareModal(false)} className="p-2 text-slate-400 hover:text-slate-950 transition-colors"><X size={24} /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[0.6rem] font-extrabold uppercase tracking-widest text-slate-400 ml-1">Player Email Address</label>
                                <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                                    <UserPlus size={16} className="text-slate-400 shrink-0" />
                                    <input type="email" value={shareEmail} onChange={e => setShareEmail(e.target.value)}
                                        placeholder="Enter player's email..."
                                        className="flex-1 bg-transparent outline-none text-sm font-bold text-slate-700 placeholder:text-slate-300" />
                                </div>
                            </div>
                            {shareError && <p className="text-xs font-bold text-red-500 bg-red-50 px-4 py-2 rounded-xl">{shareError}</p>}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowShareModal(false)}
                                className="flex-1 py-4 bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all">Cancel</button>
                            <button onClick={handleShareCourt} disabled={isSharing || !shareEmail.trim()}
                                className="flex-1 py-4 bg-slate-950 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-blue-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xl">
                                {isSharing ? <Loader2 className="animate-spin" size={16} /> : <><Share2 size={16} /> Share</>}
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* ═══ COURT DETAIL MODAL (2-col Login style) ═══ */}
            {showDetailModal && selectedBookingForDetail && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowDetailModal(false); }}>
                    <div className="relative w-full max-w-[56.25rem] bg-white rounded-3xl shadow-2xl shadow-black/30 border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col lg:flex-row min-h-[34rem]">
                            {/* LEFT COLUMN — Court Photo */}
                            <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden rounded-l-3xl">
                                <img src={selectedBookingForDetail.court?.image_url || '/images/home-images/pb3.jpg'}
                                    alt={selectedBookingForDetail.court?.name || 'Court'} className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/75 via-slate-900/55 to-slate-900/75" />
                                <div className="relative z-10 flex flex-col justify-between p-9 w-full">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="absolute -inset-1.5 bg-white/20 rounded-xl blur-md" />
                                            <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="relative w-11 h-11 rounded-xl object-contain shadow-lg ring-2 ring-white/20" />
                                        </div>
                                        <div>
                                            <span className="text-white font-black text-base tracking-tight">PicklePlay</span>
                                            <p className="text-white/40 text-[0.5625rem] font-bold uppercase tracking-widest">Philippines</p>
                                        </div>
                                    </div>
                                    <div className="space-y-5">
                                        <div>
                                            {(() => {
                                                const b = selectedBookingForDetail; const isPaid = b.payment_status === 'paid';
                                                const label = isPaid ? 'Paid' : b.status;
                                                const colors = isPaid ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300' :
                                                    b.status === 'confirmed' ? 'bg-blue-500/20 border-blue-400/30 text-blue-300' :
                                                        b.status === 'pending' ? 'bg-blue-500/20 border-blue-400/30 text-blue-300' :
                                                            b.status === 'cancelled' ? 'bg-red-500/20 border-red-400/30 text-red-300' :
                                                                'bg-white/10 border-white/20 text-white/60';
                                                return <span className={`inline-block px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border mb-4 ${colors}`}>{label}</span>;
                                            })()}
                                            <h2 className="text-3xl xl:text-4xl font-black text-white leading-[1.1] tracking-tight uppercase">
                                                {selectedBookingForDetail.court?.name || 'Court'}<br />
                                                <span className="text-lime-400">{selectedBookingForDetail.court?.location?.name || 'PicklePlay Facility'}</span>
                                            </h2>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="w-1 rounded-full bg-blue-500 shrink-0" />
                                            <p className="text-white/50 text-sm leading-relaxed">
                                                {selectedBookingForDetail.court?.location?.address
                                                    ? `${selectedBookingForDetail.court.location.address}, ${selectedBookingForDetail.court.location.city}`
                                                    : 'View your booking details and court information.'}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-white/20 text-[0.625rem] font-bold uppercase tracking-widest">REF: #{selectedBookingForDetail.id.slice(0, 8)}</p>
                                </div>
                            </div>

                            {/* RIGHT COLUMN — Details */}
                            <div className="flex-1 flex flex-col px-7 py-8 sm:px-10 lg:px-10 lg:border-l border-slate-200 overflow-y-auto max-h-[85vh]">
                                <div className="lg:hidden mb-5">
                                    <div className="relative h-40 -mx-7 -mt-8 sm:-mx-10 mb-6 overflow-hidden">
                                        <img src={selectedBookingForDetail.court?.image_url || '/images/home-images/pb3.jpg'} alt="Court" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
                                    </div>
                                </div>
                                <button onClick={() => setShowDetailModal(false)} className="absolute top-5 right-5 z-20 p-2 text-slate-400 hover:text-slate-950 bg-white/80 backdrop-blur-sm rounded-xl hover:bg-white transition-all shadow-sm">
                                    <X size={18} />
                                </button>
                                <h1 className="text-2xl font-black text-slate-950 tracking-tight mb-1 uppercase">Booking Details</h1>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Reference: #{selectedBookingForDetail.id.slice(0, 8)}</p>

                                <div className="space-y-4 flex-1">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[0.6rem] font-extrabold uppercase tracking-widest text-slate-400 ml-1">Date</label>
                                            <div className="flex items-center gap-2.5 bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4">
                                                <CalendarIcon size={15} className="text-blue-600 shrink-0" />
                                                <span className="text-sm font-bold text-slate-900">{new Date(selectedBookingForDetail.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[0.6rem] font-extrabold uppercase tracking-widest text-slate-400 ml-1">Time Slot</label>
                                            <div className="flex items-center gap-2.5 bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4">
                                                <Clock size={15} className="text-blue-600 shrink-0" />
                                                <span className="text-sm font-bold text-slate-900">{formatTimeTo12h(selectedBookingForDetail.start_time)} – {formatTimeTo12h(selectedBookingForDetail.end_time)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[0.6rem] font-extrabold uppercase tracking-widest text-slate-400 ml-1">Amount</label>
                                            <div className="flex items-center gap-2.5 bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4">
                                                <span className="text-blue-600 font-black text-sm shrink-0">₱</span>
                                                {selectedBookingForDetail.total_price > 0 ? (
                                                    <span className="text-sm font-black text-slate-900">₱{selectedBookingForDetail.total_price}</span>
                                                ) : (
                                                    <span className="text-sm font-black text-emerald-500">FREE</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[0.6rem] font-extrabold uppercase tracking-widest text-slate-400 ml-1">Status</label>
                                            <div className="flex items-center gap-2.5 bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4">
                                                <Sparkles size={15} className="text-blue-600 shrink-0" />
                                                {(() => {
                                                    const b = selectedBookingForDetail; const isPaid = b.payment_status === 'paid';
                                                    const label = isPaid ? 'Paid' : b.status;
                                                    const color = isPaid ? 'text-emerald-600' : b.status === 'confirmed' ? 'text-blue-600' : b.status === 'pending' ? 'text-blue-600' : b.status === 'cancelled' ? 'text-red-500' : 'text-slate-500';
                                                    return <span className={`text-sm font-black capitalize ${color}`}>{label}</span>;
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative my-2">
                                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                                        <div className="relative flex justify-center text-[0.6rem] font-bold uppercase tracking-widest">
                                            <span className="bg-white px-4 text-slate-400">Court Information</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {selectedBookingForDetail.court?.court_type && (
                                            <div className="space-y-1">
                                                <label className="text-[0.6rem] font-extrabold uppercase tracking-widest text-slate-400 ml-1">Type</label>
                                                <div className="flex items-center gap-2.5 bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4">
                                                    <Globe size={15} className="text-blue-600 shrink-0" />
                                                    <span className="text-sm font-bold text-slate-900">{selectedBookingForDetail.court.court_type}</span>
                                                </div>
                                            </div>
                                        )}
                                        {selectedBookingForDetail.court?.surface_type && (
                                            <div className="space-y-1">
                                                <label className="text-[0.6rem] font-extrabold uppercase tracking-widest text-slate-400 ml-1">Surface</label>
                                                <div className="flex items-center gap-2.5 bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4">
                                                    <Layers size={15} className="text-blue-600 shrink-0" />
                                                    <span className="text-sm font-bold text-slate-900">{selectedBookingForDetail.court.surface_type}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {selectedBookingForDetail.court?.base_price !== undefined && (
                                            <div className="space-y-1">
                                                <label className="text-[0.6rem] font-extrabold uppercase tracking-widest text-slate-400 ml-1">Rate / Hour</label>
                                                <div className="flex items-center gap-2.5 bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4">
                                                    <span className="text-blue-600 font-black text-sm shrink-0">₱</span>
                                                    <span className="text-sm font-bold text-slate-900">{selectedBookingForDetail.court.base_price > 0 ? `₱${selectedBookingForDetail.court.base_price}` : 'FREE'}</span>
                                                </div>
                                            </div>
                                        )}
                                        {selectedBookingForDetail.court?.status && (
                                            <div className="space-y-1">
                                                <label className="text-[0.6rem] font-extrabold uppercase tracking-widest text-slate-400 ml-1">Court Status</label>
                                                <div className="flex items-center gap-2.5 bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4">
                                                    <Sparkles size={15} className="text-blue-600 shrink-0" />
                                                    <span className="text-sm font-bold text-slate-900 capitalize">{selectedBookingForDetail.court.status}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {selectedBookingForDetail.court?.location?.address && (
                                        <div className="space-y-1">
                                            <label className="text-[0.6rem] font-extrabold uppercase tracking-widest text-slate-400 ml-1">Full Address</label>
                                            <div className="flex items-center gap-2.5 bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4">
                                                <MapPin size={15} className="text-blue-600 shrink-0" />
                                                <span className="text-sm font-bold text-slate-700">{selectedBookingForDetail.court.location.address}, {selectedBookingForDetail.court.location.city}</span>
                                            </div>
                                        </div>
                                    )}
                                    {selectedBookingForDetail.court?.amenities && Array.isArray(selectedBookingForDetail.court.amenities) && selectedBookingForDetail.court.amenities.length > 0 && (
                                        <div className="space-y-2">
                                            <label className="text-[0.6rem] font-extrabold uppercase tracking-widest text-slate-400 ml-1">Amenities</label>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedBookingForDetail.court.amenities.map((a: string, i: number) => (
                                                    <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-xl border border-blue-100">{a}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 mt-6 pt-5 border-t border-slate-100">
                                    <button onClick={() => setShowDetailModal(false)}
                                        className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-300 hover:border-slate-400 text-slate-500 font-extrabold h-12 rounded-xl uppercase tracking-wider text-[10px] transition-all active:scale-[0.98]">Close</button>
                                    <button onClick={() => { setShowDetailModal(false); handleOpenReceipt(selectedBookingForDetail); }}
                                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold h-12 rounded-xl uppercase tracking-wider text-[10px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/25">
                                        <FileText size={16} /> View Receipt
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>, document.body
            )}
            {/* Marketing Poster Modal */}
            {isPosterOpen && posterData && (
                <MarketingPosterModal
                    isOpen={isPosterOpen}
                    onClose={() => setIsPosterOpen(false)}
                    data={posterData}
                />
            )}
        </>
    );
};


export default MyBookings;
