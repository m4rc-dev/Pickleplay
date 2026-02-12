import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
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
                    scaledSize: new window.google.maps.Size(42, 60),
                    anchor: new window.google.maps.Point(21, 60)
                },
            });
        }
    }, [lat, lng]);
    return <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden border border-slate-200" />;
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
        navigate('/booking');
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
            <div className="space-y-10 animate-in fade-in duration-700 animate-pulse">
                <div className="h-8 bg-slate-200 rounded-xl w-40 mb-6"></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="h-12 bg-slate-200 rounded-xl w-3/4"></div>
                        <div className="aspect-[16/9] bg-slate-200 rounded-2xl"></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="h-24 bg-slate-200 rounded-xl"></div>
                            <div className="h-24 bg-slate-200 rounded-xl"></div>
                            <div className="h-24 bg-slate-200 rounded-xl"></div>
                            <div className="h-24 bg-slate-200 rounded-xl"></div>
                        </div>
                    </div>
                    <div className="h-96 bg-slate-200 rounded-2xl"></div>
                </div>
            </div>
        );
    }

    if (!court) return null;

    return (
        <div className="pb-10 space-y-10 animate-in fade-in duration-700 relative">
            <div className="space-y-5 md:space-y-6">
                {/* Header Navigation */}
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="group inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-all"
                    >
                        <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                        <span className="hidden sm:inline">Back</span>
                    </button>
                    <div className="flex items-center gap-2">
                        {!user && (
                            <button
                                onClick={() => navigate('/')}
                                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all active:scale-95"
                            >
                                Home
                            </button>
                        )}
                        {user && (
                            <button
                                onClick={fetchMyBookings}
                                className="px-4 py-2 bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-all active:scale-95"
                            >
                                My Bookings
                            </button>
                        )}
                        <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${court.type === 'Indoor' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                            {court.type}
                        </span>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">

                    {/* Left: Court Details & Map */}
                    <div className="lg:col-span-2">
                        <div className="bg-white p-5 sm:p-6 md:p-8 lg:p-10 rounded-2xl border border-slate-200/60 shadow-sm space-y-6 md:space-y-8">
                            <div>
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-2">Court Details</p>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-950 tracking-tight leading-tight mb-3">{court.name}</h1>
                                <div className="flex items-center gap-2 text-slate-500">
                                    <MapPin size={14} className="text-blue-500 shrink-0" />
                                    <span className="text-sm font-medium">{court.location}</span>
                                </div>
                            </div>

                            {/* Map Section */}
                            <div className="relative aspect-[16/9] md:aspect-[2/1] rounded-xl overflow-hidden">
                                <MiniMap lat={court.latitude || 0} lng={court.longitude || 0} />
                                <div className="absolute top-3 right-3 h-9 w-9 bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-slate-100 flex items-center justify-center text-slate-700 hover:scale-105 transition-transform cursor-pointer">
                                    <Navigation size={16} />
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
                                <div className="p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Price</p>
                                    <div className="flex items-baseline gap-0.5">
                                        <span className="text-lg sm:text-xl font-black text-slate-950">₱{court.pricePerHour}</span>
                                        <span className="text-[9px] font-medium text-slate-400">/hr</span>
                                    </div>
                                </div>
                                <div className="p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Capacity</p>
                                    <div className="flex items-baseline gap-0.5">
                                        <span className="text-lg sm:text-xl font-black text-slate-950">{court.numCourts}</span>
                                        <span className="text-[9px] font-medium text-slate-400">units</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowReviewsModal(true)}
                                    className="p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-100 hover:border-amber-300 hover:bg-amber-50/40 transition-all text-left group"
                                >
                                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 group-hover:text-amber-600">Rating</p>
                                    <div className="flex items-center gap-1">
                                        <span className="text-lg sm:text-xl font-black text-slate-950">{averageRating > 0 ? averageRating : 'New'}</span>
                                        <Star size={14} className={`${averageRating > 0 ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                                        {totalReviews > 0 && <span className="text-[9px] font-medium text-slate-400">({totalReviews})</span>}
                                    </div>
                                </button>
                                <div className="p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Category</p>
                                    <span className="text-sm font-bold text-slate-950 uppercase">{court.type}</span>
                                </div>
                            </div>

                            {/* Amenities */}
                            <div>
                                <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Available Amenities</p>
                                <div className="flex flex-wrap gap-2">
                                    {(court.amenities || []).map((amenity, idx) => (
                                        <span key={idx} className="px-3 py-1.5 bg-slate-50 text-slate-600 text-[11px] font-semibold rounded-lg border border-slate-200 uppercase tracking-wide">
                                            {amenity}
                                        </span>
                                    ))}
                                    {(!court.amenities || court.amenities.length === 0) && (
                                        <span className="text-sm text-slate-400">No amenities listed</span>
                                    )}
                                </div>
                            </div>

                            {/* About Section */}
                            <div className="p-4 sm:p-5 bg-blue-50/80 rounded-xl border border-blue-100 flex items-start gap-3">
                                <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0">
                                    <Info size={14} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-blue-900 mb-1">About this Court</h4>
                                    <p className="text-xs text-blue-800/70 font-medium leading-relaxed">
                                        This premium {court.type.toLowerCase()} facility is maintained daily to ensure professional playing standards.
                                        Located at {court.location}, it features state-of-the-art surfacing and amenities for all skill levels.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Booking Sidebar */}
                    <div className="lg:sticky lg:top-36 space-y-4">
                        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-5">
                            <div>
                                <h3 className="text-lg font-bold text-slate-950 tracking-tight mb-1">Select Schedule</h3>
                                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">When will you be playing?</p>
                            </div>

                            {/* Date Picker */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <span>Choose Date</span>
                                    <CalendarIcon size={14} className="text-blue-600" />
                                </div>
                                <div className="grid grid-cols-7 gap-1.5">
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
                                                className={`flex flex-col items-center py-2.5 rounded-xl transition-all duration-200 ${isSelected
                                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200/50'
                                                    : 'bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600'
                                                    }`}
                                            >
                                                <span className={`text-[8px] font-bold uppercase mb-0.5 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                                                    {date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3)}
                                                </span>
                                                <span className="text-sm font-bold">{date.getDate()}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Slots */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <span>Choose Slot</span>
                                    <Clock size={14} />
                                </div>
                                <div className="grid grid-cols-2 gap-2 max-h-[260px] overflow-y-auto">
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
                                                className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all ${isSelected
                                                    ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                                                    : isOccupied
                                                        ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600'
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
                                <div className="p-4 bg-slate-900 rounded-xl text-white">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Total Price</span>
                                        <span className="text-xl font-black">₱{court.pricePerHour}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                                        <CheckCircle2 size={11} className="text-emerald-400" />
                                        Includes gear storage & locker usage
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleBooking}
                                disabled={!selectedSlot || isProcessing || isBooked}
                                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] ${isBooked
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200/50 disabled:opacity-40 disabled:shadow-none'
                                    }`}
                            >
                                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : (
                                    isBooked ? (
                                        <>
                                            <CheckCircle2 size={18} />
                                            Booked!
                                        </>
                                    ) : (
                                        <>
                                            {user ? 'Proceed to Book' : 'Login to Book'}
                                            <ArrowRight size={16} />
                                        </>
                                    )
                                )}
                            </button>
                        </div>

                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100/80 flex gap-3">
                            <Shield size={16} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-0.5">PicklePlay Verified</p>
                                <p className="text-[10px] text-amber-800/60 font-medium">This venue undergoes monthly quality inspections.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
                        <div className="text-center space-y-1">
                            <h2 className="text-2xl font-bold text-slate-900">Booking Details</h2>
                            <p className="text-sm text-slate-500">Review your schedule before confirming.</p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium text-slate-400">Court</span>
                                <span className="font-bold text-slate-900">{court.name}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium text-slate-400">Date</span>
                                <span className="font-bold text-slate-900">{selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium text-slate-400">Time</span>
                                <span className="font-bold text-slate-900">{selectedSlot}</span>
                            </div>
                            <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total</span>
                                <span className="text-xl font-black text-slate-950">₱{court.pricePerHour}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDetails}
                                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-200/50 hover:bg-blue-700 transition-all"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>,
            document.body)}

            {/* Payment Modal */}
            {showPaymentModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)} />
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
                        <div className="text-center space-y-1">
                            <h2 className="text-2xl font-bold text-slate-900">Payment Method</h2>
                            <p className="text-sm text-slate-500">Select how you want to pay.</p>
                        </div>

                        <div className="space-y-3">
                            {/* Online Payment (Disabled) */}
                            <div className="opacity-40 cursor-not-allowed">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400">
                                        <CreditCard size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-900">Online Payment</p>
                                        <p className="text-[11px] font-medium text-red-500">Coming soon</p>
                                    </div>
                                </div>
                            </div>

                            {/* Cash Payment */}
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 text-left ${paymentMethod === 'cash'
                                    ? 'bg-blue-50 border-blue-500'
                                    : 'bg-white border-slate-200 hover:border-blue-300'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${paymentMethod === 'cash' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                    <Banknote size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-900">Cash Payment</p>
                                    <p className="text-[11px] font-medium text-slate-400">Walk-in payment</p>
                                </div>
                                {paymentMethod === 'cash' && (
                                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white">
                                        <CheckCircle2 size={14} />
                                    </div>
                                )}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-all"
                            >
                                Back
                            </button>
                            <button
                                onClick={confirmBooking}
                                disabled={!paymentMethod || isProcessing}
                                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-200/50 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                            >
                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Booking'}
                            </button>
                        </div>
                    </div>
                </div>,
            document.body)}

            {/* Success Modal */}
            {showSuccessModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 text-center space-y-6">
                        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
                            <CircleCheck size={36} className="text-emerald-500" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold text-slate-900">Booked Successfully!</h2>
                            <p className="text-sm text-slate-500">Your court time has been reserved. Check "My Bookings" for details.</p>
                        </div>
                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    setShowReceiptModal(true);
                                }}
                                className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200/50"
                            >
                                View Receipt
                            </button>
                            <button
                                onClick={bookAnother}
                                className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl text-sm hover:bg-slate-800 transition-all"
                            >
                                Book Another Slot
                            </button>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full py-3 text-slate-400 font-medium text-sm hover:text-slate-600 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>,
            document.body)}

            {showReceiptModal && selectedBookingForReceipt && (
                <Receipt
                    bookingData={selectedBookingForReceipt}
                    onClose={() => setShowReceiptModal(false)}
                />
            )}

            {/* My Bookings Modal */}
            {showMyBookings && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMyBookings(false)} />
                    <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">My Bookings</h2>
                            <button onClick={() => setShowMyBookings(false)} className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-all">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 sm:p-6 max-h-[60vh] overflow-y-auto">
                            {isLoadingMyBookings ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-3">
                                    <Loader2 className="animate-spin text-blue-600" size={28} />
                                    <p className="text-xs font-medium text-slate-400">Loading bookings...</p>
                                </div>
                            ) : myBookings.length > 0 ? (
                                <div className="space-y-3">
                                    {myBookings.map((b) => (
                                        <div key={b.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="text-[10px] font-medium text-blue-600 mb-0.5">#{b.id.slice(0, 8)}</p>
                                                    <h4 className="text-sm font-bold text-slate-900">{b.court?.name}</h4>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                                                    b.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-slate-200 text-slate-500'
                                                    }`}>
                                                    {b.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <CalendarIcon size={12} />
                                                    {b.date}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}
                                                </span>
                                                <span className="flex items-center gap-1 ml-auto font-bold text-slate-900">
                                                    ₱{b.total_price}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10">
                                    <p className="text-sm text-slate-400">No bookings yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
            document.body)}

            {/* Reviews Modal */}
            {showReviewsModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowReviewsModal(false)} />
                    <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Reviews</h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <div className="flex items-center">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                size={12}
                                                className={star <= Math.round(averageRating) ? "text-amber-400 fill-amber-400" : "text-slate-200"}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-xs text-slate-500">{averageRating} ({totalReviews})</span>
                                </div>
                            </div>
                            <button onClick={() => setShowReviewsModal(false)} className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 sm:p-6 max-h-[60vh] overflow-y-auto">
                            {isLoadingReviews ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-3">
                                    <Loader2 className="animate-spin text-amber-500" size={28} />
                                    <p className="text-xs text-slate-400">Loading reviews...</p>
                                </div>
                            ) : reviews.length > 0 ? (
                                <div className="space-y-4">
                                    {reviews.map((review) => (
                                        <div key={review.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white shadow-sm">
                                                        <img
                                                            src={review.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user?.full_name || 'User')}`}
                                                            alt={review.user?.full_name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{review.user?.full_name || 'Anonymous'}</p>
                                                        <p className="text-[10px] text-slate-400">
                                                            {new Date(review.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-0.5 px-2 py-0.5 bg-white rounded-md border border-slate-100">
                                                    <span className="text-xs font-bold text-slate-900">{review.rating}</span>
                                                    <Star size={10} className="text-amber-400 fill-amber-400" />
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed">
                                                "{review.comment}"
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 space-y-3">
                                    <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-slate-200">
                                        <MessageSquare size={24} className="text-slate-300" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">No Reviews Yet</h3>
                                    <p className="text-sm text-slate-500 max-w-xs mx-auto">Be the first to share your experience!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
            document.body)}
        </div>
    );
};

export default CourtDetail;
