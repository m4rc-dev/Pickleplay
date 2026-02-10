import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    MapPin,
    ChevronLeft,
    Calendar as CalendarIcon,
    Clock,
    DollarSign,
    Activity,
    CheckCircle2,
    Loader2,
    Navigation,
    Shield,
    Star,
    ArrowRight,
    Search,
    Info,
    AlertCircle,
    Ban,
    CreditCard,
    Banknote
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Court, CourtReview } from '../types';
import { CourtSkeleton } from './ui/Skeleton';
import { getCourtReviews } from '../services/reviews';
import { MessageSquare, X, CircleCheck } from 'lucide-react';
import Receipt from './Receipt';

const TIME_SLOTS = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
];

const MiniMap: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (mapRef.current && window.google) {
            const map = new window.google.maps.Map(mapRef.current, {
                center: { lat, lng },
                zoom: 16,
                disableDefaultUI: true,
                gestureHandling: 'cooperative',
                styles: [
                    {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }]
                    }
                ]
            });
            new window.google.maps.Marker({
                position: { lat, lng },
                map,
                icon: {
                    url: '/images/PinMarker.png',
                    scaledSize: new window.google.maps.Size(28, 40),
                    anchor: new window.google.maps.Point(14, 40)
                },
            });
        }
    }, [lat, lng]);
    return <div ref={mapRef} className="w-full h-full rounded-[32px] overflow-hidden border border-slate-200 shadow-sm" />;
};

const CourtDetail: React.FC = () => {
    const { courtId } = useParams<{ courtId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [court, setCourt] = useState<Court | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [isBooked, setIsBooked] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showMyBookings, setShowMyBookings] = useState(false);
    const [myBookings, setMyBookings] = useState<any[]>([]);
    const [isLoadingMyBookings, setIsLoadingMyBookings] = useState(false);
    const [blockedSlots, setBlockedSlots] = useState<Set<string>>(new Set());
    const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
    const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [reviews, setReviews] = useState<CourtReview[]>([]);
    const [averageRating, setAverageRating] = useState<number>(0);
    const [totalReviews, setTotalReviews] = useState<number>(0);
    const [showReviewsModal, setShowReviewsModal] = useState(false);
    const [isLoadingReviews, setIsLoadingReviews] = useState(false);

    // Payment and Receipt State
    const [selectedBookingForReceipt, setSelectedBookingForReceipt] = useState<any | null>(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (!courtId) return;

        const fetchCourtDetails = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('courts')
                    .select(`
                        *,
                        locations!inner (
                            id,
                            address,
                            city,
                            latitude,
                            longitude,
                            amenities
                        )
                    `)
                    .eq('id', courtId)
                    .single();

                if (error) throw error;

                const loc = data.locations;
                const mappedCourt: Court = {
                    id: data.id,
                    name: data.name,
                    type: data.surface_type?.toLowerCase().includes('indoor') ? 'Indoor' : 'Outdoor',
                    location: loc ? `${loc.address}, ${loc.city}` : 'Location not available',
                    pricePerHour: parseFloat(data.base_price) || 0,
                    availability: [],
                    latitude: loc?.latitude || data.latitude,
                    longitude: loc?.longitude || data.longitude,
                    numCourts: data.num_courts || 1,
                    amenities: [...(Array.isArray(data.amenities) ? data.amenities : []), ...(Array.isArray(loc?.amenities) ? loc.amenities : [])],
                    ownerId: data.owner_id,
                    cleaningTimeMinutes: data.cleaning_time_minutes || 0,
                    locationId: data.location_id
                };

                setCourt(mappedCourt);
            } catch (err) {
                console.error('Error fetching court details:', err);
                navigate('/booking');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCourtDetails();
        fetchReviews();
    }, [courtId, navigate]);

    const fetchReviews = async () => {
        if (!courtId) return;
        setIsLoadingReviews(true);
        const result = await getCourtReviews(courtId);
        if (!result.error && result.data) {
            setReviews(result.data as CourtReview[]);
            if (result.data.length > 0) {
                const sum = result.data.reduce((acc: number, rev: any) => acc + rev.rating, 0);
                setAverageRating(Math.round((sum / result.data.length) * 10) / 10);
                setTotalReviews(result.data.length);
            } else {
                setAverageRating(0);
                setTotalReviews(0);
            }
        }
        setIsLoadingReviews(false);
    };

    useEffect(() => {
        if (court) {
            checkAvailability();
        }
    }, [court, selectedDate]);

    const checkAvailability = async () => {
        if (!court) return;
        setIsCheckingAvailability(true);
        const newBlockedSlots = new Set<string>();
        const newBookedSlots = new Set<string>();
        const targetDateStr = selectedDate.toISOString().split('T')[0];

        try {
            // Fetch bookings
            const { data: bookingsData } = await supabase
                .from('bookings')
                .select('start_time, end_time, status')
                .eq('court_id', court.id)
                .eq('date', targetDateStr)
                .not('status', 'eq', 'cancelled');

            const bookings = bookingsData || [];
            const cleaningTimeMinutes = court.cleaningTimeMinutes || 0;

            for (const slot of TIME_SLOTS) {
                const [time, period] = slot.split(' ');
                let [hours, minutes] = time.split(':').map(Number);
                if (period === 'PM' && hours !== 12) hours += 12;
                else if (period === 'AM' && hours === 12) hours = 0;

                const start = new Date(selectedDate);
                start.setHours(hours, minutes, 0, 0);
                const end = new Date(start.getTime() + 60 * 60 * 1000);

                if (bookings) {
                    for (const booking of bookings) {
                        const [bHours, bMinutes] = booking.start_time.split(':').map(Number);
                        const bookingStart = new Date(selectedDate);
                        bookingStart.setHours(bHours, bMinutes, 0, 0);

                        const [eHours, eMinutes] = booking.end_time.split(':').map(Number);
                        const bookingEnd = new Date(selectedDate);
                        bookingEnd.setHours(eHours, eMinutes, 0, 0);

                        const bookingEndWithCleaning = new Date(bookingEnd.getTime() + cleaningTimeMinutes * 60 * 1000);

                        if (start < bookingEndWithCleaning && end > bookingStart) {
                            newBookedSlots.add(slot);
                            break;
                        }
                    }
                }
            }
            setBookedSlots(newBookedSlots);
        } catch (err) {
            console.error('Error checking availability:', err);
        } finally {
            setIsCheckingAvailability(false);
        }
    };

    const handleBooking = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (selectedSlot) {
            setShowConfirmModal(true);
        }
    };

    const handleConfirmDetails = () => {
        setShowConfirmModal(false);
        setShowPaymentModal(true);
    };

    const confirmBooking = async () => {
        if (court && selectedSlot && user && paymentMethod === 'cash') {
            setIsProcessing(true);
            try {
                const [time, period] = selectedSlot.split(' ');
                let [hours, minutes] = time.split(':').map(Number);
                if (period === 'PM' && hours !== 12) hours += 12;
                else if (period === 'AM' && hours === 12) hours = 0;

                const startDateTime = new Date(selectedDate);
                startDateTime.setHours(hours, minutes, 0, 0);
                const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
                const targetDateStr = selectedDate.toISOString().split('T')[0];

                const { data: bookingData, error: bookingError } = await supabase
                    .from('bookings')
                    .insert({
                        court_id: court.id,
                        player_id: user.id,
                        date: targetDateStr,
                        start_time: startDateTime.toTimeString().split(' ')[0],
                        end_time: endDateTime.toTimeString().split(' ')[0],
                        total_price: court.pricePerHour,
                        status: 'pending',
                        payment_status: 'unpaid',
                        payment_method: 'cash',
                        is_checked_in: false
                    })
                    .select()
                    .single();

                if (bookingError) throw bookingError;

                // Fetch player name for receipt
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, username')
                    .eq('id', user.id)
                    .maybeSingle();

                setSelectedBookingForReceipt({
                    id: bookingData.id,
                    courtName: court.name,
                    courtLocation: court.location,
                    date: targetDateStr,
                    startTime: startDateTime.toTimeString().split(' ')[0],
                    endTime: endDateTime.toTimeString().split(' ')[0],
                    pricePerHour: court.pricePerHour,
                    totalPrice: court.pricePerHour,
                    playerName: profile?.full_name || profile?.username || 'Guest',
                    status: 'pending',
                    confirmedAt: null,
                    paymentMethod: 'Cash',
                    paymentStatus: 'unpaid'
                });

                setIsBooked(true);
                setShowPaymentModal(false);
                setShowSuccessModal(true);
                checkAvailability(); // Refresh the dots
            } catch (err: any) {
                console.error('Booking error:', err);
                alert(`Booking failed: ${err.message}`);
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const bookAnother = () => {
        setSelectedSlot(null);
        setIsBooked(false);
        setShowSuccessModal(false);
    };

    const fetchMyBookings = async () => {
        if (!user) return;
        setIsLoadingMyBookings(true);
        setShowMyBookings(true);
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    court:courts(name, base_price)
                `)
                .eq('player_id', user.id)
                .order('date', { ascending: false });

            if (error) throw error;
            setMyBookings(data || []);
        } catch (err) {
            console.error('Error fetching my bookings:', err);
        } finally {
            setIsLoadingMyBookings(false);
        }
    };

    if (isLoading) {
        return (
            <div className="pt-0 md:pt-28 pb-24 md:pb-12 px-4 md:px-12 lg:px-24 max-w-[1920px] mx-auto animate-pulse">
                <div className="h-10 bg-slate-200 rounded-2xl w-48"></div>
                <div className="aspect-[21/9] bg-slate-200 rounded-[48px]"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="h-64 bg-slate-200 rounded-[40px]"></div>
                    <div className="h-64 bg-slate-200 rounded-[40px]"></div>
                </div>
            </div>
        );
    }

    if (!court) return null;

    return (
        <div className="pt-8 md:pt-12 pb-24 md:pb-12 px-4 md:px-12 lg:px-24 max-w-[1920px] mx-auto min-h-screen relative">
            <div className="space-y-4 md:space-y-8">
                {/* Header Navigation */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="group inline-flex items-center justify-center md:justify-start gap-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all"
                    >
                        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Back to discovery
                    </button>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4">
                        {!user && (
                            <button
                                onClick={() => navigate('/')}
                                className="flex-1 md:flex-none px-4 md:px-6 py-2 bg-lime-400 border border-lime-400 text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-lime-500 hover:border-lime-500 transition-all shadow-sm active:scale-95"
                            >
                                Back to Home
                            </button>
                        )}
                        {user && (
                            <button
                                onClick={fetchMyBookings}
                                className="flex-1 md:flex-none px-4 md:px-6 py-2 bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest rounded-xl hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm active:scale-95"
                            >
                                View Booked Courts
                            </button>
                        )}
                        <span className={`w-full md:w-auto text-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${court.type === 'Indoor' ? 'bg-blue-50 text-blue-600' : 'bg-lime-50 text-lime-600'
                            }`}>
                            {court.type}
                        </span>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">

                    {/* Left: Court Details & Map */}
                    <div className="lg:col-span-2 space-y-8 md:space-y-12">
                        <div className="bg-white p-6 md:p-16 rounded-3xl md:rounded-[48px] border border-slate-200 shadow-sm space-y-8 md:space-y-12">
                            <div>
                                <p className="text-[10px] md:text-xs font-black text-blue-600 uppercase tracking-[0.3em] md:tracking-[0.4em] mb-4 md:mb-6">COURT DETAILS</p>
                                <h1 className="text-2xl md:text-5xl font-black text-slate-950 tracking-tighter leading-tight mb-4 md:mb-6">{court.name}</h1>
                                <div className="flex items-center gap-3 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                                    <MapPin size={16} className="text-blue-500" />
                                    <span>{court.location}</span>
                                </div>
                            </div>

                            {/* Map Section */}
                            <div className="relative aspect-[16/9] md:aspect-[21/9] group">
                                <MiniMap lat={court.latitude || 0} lng={court.longitude || 0} />
                                <div className="absolute top-4 right-4 h-10 w-10 bg-white rounded-xl shadow-lg border border-slate-100 flex items-center justify-center text-slate-900 hover:scale-110 transition-transform cursor-pointer">
                                    <Navigation size={18} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                                <div className="p-6 md:p-8 bg-slate-50 rounded-2xl md:rounded-[32px] border border-slate-100">
                                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider md:tracking-widest mb-2 md:mb-3">Price</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-lg md:text-2xl font-black text-slate-950">₱{court.pricePerHour}</span>
                                        <span className="text-[9px] md:text-[10px] font-bold text-slate-400 lowercase">/hr</span>
                                    </div>
                                </div>
                                <div className="p-6 md:p-8 bg-slate-50 rounded-2xl md:rounded-[32px] border border-slate-100">
                                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider md:tracking-widest mb-2 md:mb-3">Capacity</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-lg md:text-2xl font-black text-slate-950">{court.numCourts}</span>
                                        <span className="text-[9px] md:text-[10px] font-bold text-slate-400 lowercase">units</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowReviewsModal(true)}
                                    className="p-6 md:p-8 bg-slate-50 rounded-2xl md:rounded-[32px] border border-slate-100 hover:border-amber-400 hover:bg-white transition-all text-left group"
                                >
                                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider md:tracking-widest mb-2 md:mb-3 group-hover:text-amber-600">Rating</p>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-lg md:text-2xl font-black text-slate-950">{averageRating > 0 ? averageRating : 'New'}</span>
                                        <Star size={16} className={`${averageRating > 0 ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                                        {totalReviews > 0 && <span className="text-[9px] md:text-[10px] font-bold text-slate-400">({totalReviews})</span>}
                                    </div>
                                </button>
                                <div className="p-6 md:p-8 bg-slate-50 rounded-2xl md:rounded-[32px] border border-slate-100">
                                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider md:tracking-widest mb-2 md:mb-3">Category</p>
                                    <span className="text-xs md:text-sm font-black text-slate-950 uppercase">{court.type}</span>
                                </div>
                            </div>

                            {/* Amenities */}
                            <div className="space-y-4 md:space-y-6">
                                <p className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-widest mb-2 md:mb-3">Available Amenities</p>
                                <div className="flex flex-wrap gap-2">
                                    {(court.amenities || []).map((amenity, idx) => (
                                        <span key={idx} className="px-5 py-2.5 bg-slate-50 text-slate-700 text-[11px] font-black rounded-2xl border border-slate-200 uppercase tracking-wide hover:bg-white hover:border-blue-400 transition-all cursor-default">
                                            {amenity}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Location Info */}
                            <div className="p-6 md:p-10 bg-blue-50 rounded-2xl md:rounded-[32px] border border-blue-100 flex items-start gap-3 md:gap-4">
                                <div className="p-2 md:p-3 bg-blue-600 text-white rounded-xl md:rounded-2xl">
                                    <Info size={16} className="md:w-5 md:h-5" />
                                </div>
                                <div>
                                    <h4 className="text-xs md:text-sm font-black text-blue-900 uppercase tracking-wide mb-1">About this Court</h4>
                                    <p className="text-[10px] md:text-xs text-blue-800/70 font-medium leading-relaxed">
                                        This premium {court.type.toLowerCase()} facility is maintained daily to ensure professional playing standards.
                                        Located at {court.location}, it features state-of-the-art surfacing and amenities for all skill levels.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Booking Sidebar */}
                    <div className="lg:sticky lg:top-32 space-y-6 md:space-y-8">
                        <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[40px] border border-slate-200 shadow-xl space-y-6 md:space-y-10">
                            <div>
                                <h3 className="text-lg md:text-xl font-black text-slate-950 tracking-tight mb-2 md:mb-3">Select Schedule</h3>
                                <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider md:tracking-widest">When will you be playing?</p>
                            </div>

                            {/* Date Picker */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                                    <span>Choose Date</span>
                                    <CalendarIcon size={14} className="text-blue-600" />
                                </div>
                                <div className="grid grid-cols-7 gap-2 -mx-2 px-2">
                                    {Array.from({ length: 7 }).map((_, i) => {
                                        const date = new Date();
                                        date.setDate(date.getDate() + i);
                                        const isSelected = selectedDate.toDateString() === date.toDateString();
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setSelectedDate(date);
                                                    setSelectedSlot(null);
                                                }}
                                                className={`flex flex-col items-center py-3 rounded-xl border transition-all duration-300 ${isSelected
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100'
                                                    : 'bg-slate-50 border-transparent text-slate-400 hover:border-blue-200 hover:bg-white'
                                                    }`}
                                            >
                                                <span className={`text-[8px] font-black uppercase mb-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                                    {date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3)}
                                                </span>
                                                <span className="text-sm font-black tracking-tighter">{date.getDate()}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Slots */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-500">
                                    <span>Choose Slot</span>
                                    <Clock size={14} />
                                </div>
                                <div className="grid grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                                    {TIME_SLOTS.map(slot => {
                                        const isBlocked = blockedSlots.has(slot);
                                        const isBookedSlot = bookedSlots.has(slot);
                                        const isOccupied = isBlocked || isBookedSlot;
                                        const isSelected = selectedSlot === slot;

                                        return (
                                            <button
                                                key={slot}
                                                disabled={isOccupied}
                                                onClick={() => setSelectedSlot(slot)}
                                                className={`py-3 px-2 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${isSelected
                                                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                                                    : isOccupied
                                                        ? 'bg-slate-50 border-slate-100 text-slate-200 cursor-not-allowed opacity-50'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400'
                                                    }`}
                                            >
                                                {isBookedSlot ? 'N/A' : slot}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Price Summary */}
                            {selectedSlot && (
                                <div className="p-6 bg-slate-950 rounded-[32px] text-white animate-in zoom-in-95 duration-300">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Total Price</span>
                                        <span className="text-2xl font-black">₱{court.pricePerHour}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 italic">
                                        <CheckCircle2 size={12} className="text-lime-400" />
                                        Includes gear storage & locker usage
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleBooking}
                                disabled={!selectedSlot || isProcessing || isBooked}
                                className={`w-full py-5 rounded-[24px] font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${isBooked
                                    ? 'bg-lime-400 text-slate-900 shadow-none'
                                    : 'bg-lime-400 hover:bg-lime-500 text-slate-900 shadow-2xl shadow-lime-200 disabled:opacity-50 disabled:shadow-none'
                                    }`}
                            >
                                {isProcessing ? <Loader2 className="animate-spin" /> : (
                                    isBooked ? (
                                        <>
                                            <CheckCircle2 size={20} />
                                            Success!
                                        </>
                                    ) : (
                                        <>
                                            {user ? 'Proceed to Book' : 'Login to Book'}
                                            <ArrowRight size={18} />
                                        </>
                                    )
                                )}
                            </button>
                        </div>

                        <div className="bg-amber-50 rounded-[32px] p-6 border border-amber-100 flex gap-3">
                            <Shield size={20} className="text-amber-600 shrink-0" />
                            <div>
                                <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1">PicklePlay verified</p>
                                <p className="text-[10px] text-amber-800/70 font-medium">This venue undergoes monthly quality inspections.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />
                    <div className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter">Booking Details</h2>
                            <p className="text-slate-500 font-medium">Review your schedule before confirming.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="p-6 bg-slate-50 rounded-[32px] space-y-4">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-black text-slate-400 uppercase tracking-widest">Court</span>
                                    <span className="font-black text-slate-900 uppercase italic">{court.name}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-black text-slate-400 uppercase tracking-widest">Date</span>
                                    <span className="font-black text-slate-900 uppercase">{selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-black text-slate-400 uppercase tracking-widest">Time Slot</span>
                                    <span className="font-black text-slate-900 uppercase">{selectedSlot}</span>
                                </div>
                                <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                                    <span className="font-black text-blue-600 uppercase tracking-widest text-[10px]">Grand Total</span>
                                    <span className="text-2xl font-black text-slate-950">₱{court.pricePerHour}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="w-full py-4 bg-slate-100 text-slate-500 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDetails}
                                className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
                            >
                                Confirm Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)} />
                    <div className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter">Mode of Payment</h2>
                            <p className="text-slate-500 font-medium">Select how you want to pay for your booking.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {/* Online Payment (Disabled) */}
                            <div className="relative opacity-50 cursor-not-allowed group">
                                <div className="p-6 bg-slate-50 rounded-[32px] border-2 border-transparent flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-200 rounded-2xl flex items-center justify-center text-slate-400">
                                        <CreditCard size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-black text-slate-950 uppercase tracking-widest text-[10px]">Online Payment</p>
                                        <p className="text-[10px] font-bold text-red-500 uppercase mt-0.5">This Feature is not yet available</p>
                                    </div>
                                </div>
                            </div>

                            {/* Cash Payment */}
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`w-full p-6 rounded-[32px] border-2 transition-all flex items-center gap-4 text-left ${paymentMethod === 'cash'
                                    ? 'bg-blue-50 border-blue-600'
                                    : 'bg-white border-slate-100 hover:border-blue-200'
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${paymentMethod === 'cash' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                    <Banknote size={24} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-slate-950 uppercase tracking-widest text-[10px]">Cash Payment</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">Walk In Payment</p>
                                </div>
                                {paymentMethod === 'cash' && (
                                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white">
                                        <CheckCircle2 size={14} />
                                    </div>
                                )}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="w-full py-4 bg-slate-100 text-slate-500 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                                Back
                            </button>
                            <button
                                onClick={confirmBooking}
                                disabled={!paymentMethod || isProcessing}
                                className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Booking'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
                    <div className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl p-12 text-center space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="w-24 h-24 bg-lime-50 rounded-[32px] flex items-center justify-center mx-auto">
                            <CircleCheck size={48} className="text-lime-500" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter">Successfully Booked!</h2>
                            <p className="text-slate-500 font-medium">Your court time has been reserved. You can find your booking details in "My Bookings".</p>
                        </div>
                        <div className="space-y-4">
                            <button
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    setShowReceiptModal(true);
                                }}
                                className="w-full py-5 bg-blue-600 text-white font-black rounded-[24px] text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
                            >
                                View My Receipt
                            </button>
                            <button
                                onClick={bookAnother}
                                className="w-full py-5 bg-slate-900 text-white font-black rounded-[24px] text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                            >
                                Book Another Slot
                            </button>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full py-5 text-slate-400 font-bold text-sm hover:text-slate-600 transition-all"
                            >
                                Close Window
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showReceiptModal && selectedBookingForReceipt && (
                <Receipt
                    bookingData={selectedBookingForReceipt}
                    onClose={() => setShowReceiptModal(false)}
                />
            )}

            {/* My Bookings Modal */}
            {showMyBookings && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowMyBookings(false)} />
                    <div className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">My Booked Courts</h2>
                            <button onClick={() => setShowMyBookings(false)} className="p-2 text-slate-400 hover:text-slate-950 transition-colors">
                                <Ban size={24} />
                            </button>
                        </div>
                        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {isLoadingMyBookings ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <Loader2 className="animate-spin text-blue-600" size={32} />
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Syncing your bookings...</p>
                                </div>
                            ) : myBookings.length > 0 ? (
                                <div className="space-y-4">
                                    {myBookings.map((b) => (
                                        <div key={b.id} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 group hover:border-blue-200 transition-all">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">REFERENCE: #{b.id.slice(0, 8)}</p>
                                                    <h4 className="text-lg font-black text-slate-900 uppercase italic leading-none">{b.court?.name}</h4>
                                                </div>
                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${b.status === 'confirmed' ? 'bg-lime-100 text-lime-700' :
                                                    b.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-slate-200 text-slate-500'
                                                    }`}>
                                                    {b.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
                                                    <CalendarIcon size={14} />
                                                    {b.date}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
                                                    <Clock size={14} />
                                                    {b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase ml-auto">
                                                    <DollarSign size={14} />
                                                    ₱{b.total_price}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm italic">You haven't booked any courts yet.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">PicklePlay 2026 • Premium Network</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Reviews Modal */}
            {showReviewsModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowReviewsModal(false)} />
                    <div className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Court Reviews</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                size={14}
                                                className={star <= Math.round(averageRating) ? "text-amber-400 fill-amber-400" : "text-slate-200"}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-xs font-bold text-slate-500">{averageRating} out of 5 ({totalReviews} reviews)</span>
                                </div>
                            </div>
                            <button onClick={() => setShowReviewsModal(false)} className="p-2 bg-white rounded-full border border-slate-200 text-slate-400 hover:text-slate-950 hover:border-slate-400 transition-all shadow-sm">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {isLoadingReviews ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <Loader2 className="animate-spin text-amber-500" size={32} />
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading feedback...</p>
                                </div>
                            ) : reviews.length > 0 ? (
                                <div className="space-y-6">
                                    {reviews.map((review) => (
                                        <div key={review.id} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                                                        <img
                                                            src={review.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user?.full_name || 'User')}`}
                                                            alt={review.user?.full_name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">{review.user?.full_name || 'Anonymous Player'}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {new Date(review.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center px-3 py-1 bg-white rounded-full border border-slate-100 shadow-sm">
                                                    <span className="text-xs font-black text-slate-900 mr-1">{review.rating}</span>
                                                    <Star size={12} className="text-amber-400 fill-amber-400" />
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                                                "{review.comment}"
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 space-y-4">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-slate-200">
                                        <MessageSquare size={32} className="text-slate-300" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No Reviews Yet</h3>
                                    <p className="text-slate-500 font-medium max-w-xs mx-auto text-sm">Be the first to share your experience after playing at this venue!</p>
                                </div>
                            )}
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Verified Player Feedback • PicklePlay</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourtDetail;
