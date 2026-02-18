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
import { checkDailyBookingLimit } from '../services/bookings';
import { MessageSquare, X, CircleCheck } from 'lucide-react';
import Receipt from './Receipt';

const ALL_HOUR_SLOTS = [
    '12:00 AM', '01:00 AM', '02:00 AM', '03:00 AM', '04:00 AM', '05:00 AM',
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
    '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM'
];

/** Generate time slots based on opening and closing hours (24h format strings like '08:00', '18:00') */
const generateTimeSlots = (openTime: string, closeTime: string): string[] => {
    const openH = parseInt(openTime.split(':')[0], 10);
    const closeH = parseInt(closeTime.split(':')[0], 10);
    return ALL_HOUR_SLOTS.filter((_, idx) => idx >= openH && idx < closeH);
};

// Default fallback
const TIME_SLOTS = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
];

/** Convert a slot start time like '08:00 AM' to a range like '08:00 AM - 09:00 AM' */
const slotToRange = (slot: string): string => {
    const [time, period] = slot.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (period === 'PM' && h !== 12) h += 12;
    else if (period === 'AM' && h === 12) h = 0;
    const endH = (h + 1) % 24;
    const endPeriod = endH >= 12 ? 'PM' : 'AM';
    const endH12 = endH === 0 ? 12 : endH > 12 ? endH - 12 : endH;
    return `${slot} - ${endH12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${endPeriod}`;
};

// ─── Philippine Time Helpers (Asia/Manila, UTC+8) ───
const PH_TIMEZONE = 'Asia/Manila';

const getNowPH = (): Date => {
    const phStr = new Date().toLocaleString('en-US', { timeZone: PH_TIMEZONE });
    return new Date(phStr);
};

const toPhDateStr = (date: Date): string => {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: PH_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
    return formatter.format(date);
};

const isSlotInPast = (slot: string, selectedDate: Date): boolean => {
    const nowPH = getNowPH();
    const todayPH = toPhDateStr(new Date());
    const selectedPH = toPhDateStr(selectedDate);
    if (selectedPH > todayPH) return false;
    if (selectedPH < todayPH) return true;
    const [time, period] = slot.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    else if (period === 'AM' && hours === 12) hours = 0;
    return hours < nowPH.getHours() || (hours === nowPH.getHours() && minutes <= nowPH.getMinutes());
};

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
    const [locationName, setLocationName] = useState<string>('');
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
    const [dailyLimitReached, setDailyLimitReached] = useState(false);
    const [userBookedSlots, setUserBookedSlots] = useState<Map<string, string>>(new Map());
    const [reviews, setReviews] = useState<CourtReview[]>([]);
    const [averageRating, setAverageRating] = useState<number>(0);
    const [totalReviews, setTotalReviews] = useState<number>(0);
    const [showReviewsModal, setShowReviewsModal] = useState(false);
    const [isLoadingReviews, setIsLoadingReviews] = useState(false);

    // Per-date fully booked tracking
    const [fullyBookedDates, setFullyBookedDates] = useState<Set<string>>(new Set());
    const isAdvanceBooking = searchParams.get('advance') === 'true';

    // Location operation hours & closures
    const [locationOpenTime, setLocationOpenTime] = useState('08:00');
    const [locationCloseTime, setLocationCloseTime] = useState('18:00');
    const [locationClosures, setLocationClosures] = useState<Set<string>>(new Set());
    const [locationClosureDetails, setLocationClosureDetails] = useState<Map<string, { reason: string; description?: string }>>(new Map());

    // Dynamic time slots based on location hours
    const activeTimeSlots = generateTimeSlots(locationOpenTime, locationCloseTime);

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
                            name,
                            address,
                            city,
                            latitude,
                            longitude,
                            amenities,
                            opening_time,
                            closing_time
                        )
                    `)
                    .eq('id', courtId)
                    .single();

                if (error) throw error;

                const loc = data.locations;
                setLocationOpenTime(loc?.opening_time || '08:00');
                setLocationCloseTime(loc?.closing_time || '18:00');

                // Fetch location closures
                if (loc?.id) {
                    const { data: closureData } = await supabase
                        .from('location_closures')
                        .select('date, reason, description')
                        .eq('location_id', loc.id)
                        .gte('date', new Date().toISOString().split('T')[0]);

                    // Also fetch court-specific closures
                    const { data: courtClosureData } = await supabase
                        .from('court_closures')
                        .select('date, reason, description')
                        .eq('court_id', courtId)
                        .gte('date', new Date().toISOString().split('T')[0]);

                    const closureSet = new Set<string>();
                    const closureMap = new Map<string, { reason: string; description?: string }>();

                    // Add location closures
                    if (closureData) {
                        for (const c of closureData) {
                            closureSet.add(c.date);
                            closureMap.set(c.date, { reason: c.reason, description: c.description });
                        }
                    }
                    // Add court closures (court-level overrides if same date)
                    if (courtClosureData) {
                        for (const c of courtClosureData) {
                            closureSet.add(c.date);
                            closureMap.set(c.date, { reason: `Court: ${c.reason}`, description: c.description });
                        }
                    }

                    setLocationClosures(closureSet);
                    setLocationClosureDetails(closureMap);
                }
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
                    locationId: data.location_id,
                    status: data.status || 'Available'
                };

                setCourt(mappedCourt);
                setLocationName(loc?.name || '');
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
        const newUserBookedSlots = new Map<string, string>();
        const targetDateStr = toPhDateStr(selectedDate);

        // If this date is a location closure, mark ALL slots as blocked
        if (locationClosures.has(targetDateStr)) {
            for (const slot of activeTimeSlots) {
                newBlockedSlots.add(slot);
            }
            setBlockedSlots(newBlockedSlots);
            setBookedSlots(newBookedSlots);
            setUserBookedSlots(newUserBookedSlots);
            setIsCheckingAvailability(false);
            return;
        }

        try {
            // Check daily booking limit (1 booking per user per day per court location)
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) {
                const { hasReachedLimit } = await checkDailyBookingLimit(currentUser.id, targetDateStr, court.locationId);
                setDailyLimitReached(hasReachedLimit);
                if (hasReachedLimit) {
                    setSelectedSlot(null);
                }
            } else {
                setDailyLimitReached(false);
            }

            // Fetch bookings — include player_id and status to identify user's own slots
            const { data: bookingsData } = await supabase
                .from('bookings')
                .select('start_time, end_time, status, player_id')
                .eq('court_id', court.id)
                .eq('date', targetDateStr)
                .not('status', 'eq', 'cancelled');

            // Fetch court_events (owner lock-ins / blocks) for this date
            const dayStart = new Date(selectedDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(selectedDate);
            dayEnd.setHours(23, 59, 59, 999);
            const { data: courtEventsData } = await supabase
                .from('court_events')
                .select('start_datetime, end_datetime, blocks_bookings')
                .eq('court_id', court.id)
                .eq('blocks_bookings', true)
                .lte('start_datetime', dayEnd.toISOString())
                .gte('end_datetime', dayStart.toISOString());

            const blockingEvents = courtEventsData || [];
            const bookings = bookingsData || [];
            const cleaningTimeMinutes = court.cleaningTimeMinutes || 0;

            for (const slot of activeTimeSlots) {
                const [time, period] = slot.split(' ');
                let [hours, minutes] = time.split(':').map(Number);
                if (period === 'PM' && hours !== 12) hours += 12;
                else if (period === 'AM' && hours === 12) hours = 0;

                const start = new Date(selectedDate);
                start.setHours(hours, minutes, 0, 0);
                const end = new Date(start.getTime() + 60 * 60 * 1000);

                // Check court_events (owner lock-ins) first
                let isBlockedByEvent = false;
                for (const evt of blockingEvents) {
                    const evtStart = new Date(evt.start_datetime);
                    const evtEnd = new Date(evt.end_datetime);
                    if (start < evtEnd && end > evtStart) {
                        isBlockedByEvent = true;
                        break;
                    }
                }
                if (isBlockedByEvent) {
                    newBlockedSlots.add(slot);
                    continue;
                }

                if (bookings) {
                    for (const booking of bookings) {
                        const [bHours, bMinutes] = booking.start_time.split(':').map(Number);
                        const bookingStart = new Date(selectedDate);
                        bookingStart.setHours(bHours, bMinutes, 0, 0);

                        const [eHours, eMinutes] = booking.end_time.split(':').map(Number);
                        const bookingEnd = new Date(selectedDate);
                        bookingEnd.setHours(eHours, eMinutes, 0, 0);

                        // Check if this slot exactly matches the booking (no cleaning buffer)
                        const isExactOverlap = start < bookingEnd && end > bookingStart;

                        // Check with cleaning buffer for blocking purposes
                        const bookingEndWithCleaning = new Date(bookingEnd.getTime() + cleaningTimeMinutes * 60 * 1000);
                        const isBlockedByCleaning = start < bookingEndWithCleaning && end > bookingStart;

                        if (isExactOverlap) {
                            newBookedSlots.add(slot);
                            // Track if this slot belongs to the current user (exact match only)
                            if (currentUser && booking.player_id === currentUser.id) {
                                const statusLabel = booking.status.charAt(0).toUpperCase() + booking.status.slice(1);
                                newUserBookedSlots.set(slot, statusLabel);
                            }
                            break;
                        } else if (isBlockedByCleaning) {
                            // Slot is blocked by cleaning buffer — mark as booked but NOT as user's slot
                            newBookedSlots.add(slot);
                            break;
                        }
                    }
                }
            }
            setBlockedSlots(newBlockedSlots);
            setBookedSlots(newBookedSlots);
            setUserBookedSlots(newUserBookedSlots);
        } catch (err) {
            console.error('Error checking availability:', err);
        } finally {
            setIsCheckingAvailability(false);
        }
    };

    // Check all 7 dates for fully booked status
    const checkAllDatesAvailability = async () => {
        if (!court) return;
        const newFullyBooked = new Set<string>();
        const nowPH = getNowPH();
        const dates: { dateStr: string; dateObj: Date }[] = [];
        const cleaningMins = court.cleaningTimeMinutes || 0;

        for (let i = 0; i < 7; i++) {
            const d = new Date(nowPH);
            d.setDate(d.getDate() + i);
            dates.push({ dateStr: toPhDateStr(d), dateObj: d });
        }

        try {
            // Batch fetch bookings for all 7 dates
            const dateStrs = dates.map(d => d.dateStr);
            const { data: allBookings } = await supabase
                .from('bookings')
                .select('date, start_time, end_time')
                .eq('court_id', court.id)
                .in('date', dateStrs)
                .not('status', 'eq', 'cancelled');

            // Fetch court_events (owner lock-ins / blocks) that overlap the 7-day range
            const rangeStart = dates[0].dateObj.toISOString();
            const rangeEndDate = new Date(dates[dates.length - 1].dateObj);
            rangeEndDate.setHours(23, 59, 59, 999);
            const { data: courtEvents } = await supabase
                .from('court_events')
                .select('start_datetime, end_datetime, blocks_bookings')
                .eq('court_id', court.id)
                .eq('blocks_bookings', true)
                .lte('start_datetime', rangeEndDate.toISOString())
                .gte('end_datetime', rangeStart);

            const blockingEvents = courtEvents || [];

            const bookingsByDate = new Map<string, any[]>();
            for (const b of (allBookings || [])) {
                const arr = bookingsByDate.get(b.date) || [];
                arr.push(b);
                bookingsByDate.set(b.date, arr);
            }

            for (const { dateStr, dateObj } of dates) {
                // If this date is a location closure, it's fully booked
                if (locationClosures.has(dateStr)) {
                    newFullyBooked.add(dateStr);
                    continue;
                }

                const dayBookings = bookingsByDate.get(dateStr) || [];
                let availableCount = 0;

                for (const slot of activeTimeSlots) {
                    if (isSlotInPast(slot, dateObj)) continue;

                    const [time, period] = slot.split(' ');
                    let [hours, minutes] = time.split(':').map(Number);
                    if (period === 'PM' && hours !== 12) hours += 12;
                    else if (period === 'AM' && hours === 12) hours = 0;
                    const start = new Date(dateObj);
                    start.setHours(hours, minutes, 0, 0);
                    const end = new Date(start.getTime() + 60 * 60 * 1000);

                    let isOccupied = false;

                    // Check bookings (with cleaning buffer)
                    for (const booking of dayBookings) {
                        const [bH, bM] = booking.start_time.split(':').map(Number);
                        const bStart = new Date(dateObj);
                        bStart.setHours(bH, bM, 0, 0);
                        const [eH, eM] = booking.end_time.split(':').map(Number);
                        const bEnd = new Date(dateObj);
                        bEnd.setHours(eH, eM, 0, 0);
                        const bEndWithCleaning = new Date(bEnd.getTime() + cleaningMins * 60 * 1000);
                        if (start < bEndWithCleaning && end > bStart) {
                            isOccupied = true;
                            break;
                        }
                    }

                    // Check court_events (owner lock-ins / blocks)
                    if (!isOccupied) {
                        for (const evt of blockingEvents) {
                            const evtStart = new Date(evt.start_datetime);
                            const evtEnd = new Date(evt.end_datetime);
                            if (start < evtEnd && end > evtStart) {
                                isOccupied = true;
                                break;
                            }
                        }
                    }

                    if (!isOccupied) availableCount++;
                }

                if (availableCount === 0) {
                    newFullyBooked.add(dateStr);
                }
            }

            setFullyBookedDates(newFullyBooked);

            // For advance booking, auto-select first available future date
            if (isAdvanceBooking) {
                const todayStr = toPhDateStr(nowPH);
                const firstAvailable = dates.find(d => d.dateStr > todayStr && !newFullyBooked.has(d.dateStr));
                if (firstAvailable) {
                    setSelectedDate(firstAvailable.dateObj);
                }
            }
        } catch (err) {
            console.error('Error checking dates availability:', err);
        }
    };

    useEffect(() => {
        if (court) checkAllDatesAvailability();
    }, [court, locationClosures, locationOpenTime, locationCloseTime]);

    // Determine if the current user is the court owner (not in Player Mode)
    const currentActiveRole = localStorage.getItem('active_role');
    const isCourtOwner = !!(user && court && court.ownerId && user.id === court.ownerId && currentActiveRole !== 'PLAYER');

    const handleBooking = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (!selectedSlot) return;

        // Court owners cannot book their own courts (unless in Player Mode)
        if (isCourtOwner) {
            alert('🚫 As a court owner, you cannot book your own court. Switch to Player Mode to book.');
            return;
        }

        // Check daily limit before even showing the confirmation modal
        const targetDateStr = toPhDateStr(selectedDate);
        const { hasReachedLimit } = await checkDailyBookingLimit(user.id, targetDateStr, court?.locationId);
        if (hasReachedLimit) {
            setDailyLimitReached(true);
            setSelectedSlot(null);
            alert('🚫 You already have a booking at this court location for today. Each player is limited to 1 booking per court location per day.');
            return;
        }

        // Check if slot is in the past
        if (isSlotInPast(selectedSlot, selectedDate)) {
            alert('⏰ This time slot has already passed. Please select a future time.');
            setSelectedSlot(null);
            return;
        }

        setShowConfirmModal(true);
    };

    const handleConfirmDetails = () => {
        setShowConfirmModal(false);
        setShowPaymentModal(true);
    };

    const confirmBooking = async () => {
        if (court && selectedSlot && user && paymentMethod === 'cash') {
            setIsProcessing(true);
            try {
                // ── GUARD 0: Court owner cannot book (unless in Player Mode) ──
                const activeRole = localStorage.getItem('active_role');
                if (user.id === court.ownerId && activeRole !== 'PLAYER') {
                    alert('🚫 As a court owner, you cannot book your own court. Switch to Player Mode to book.');
                    setIsProcessing(false);
                    setShowPaymentModal(false);
                    return;
                }

                // ── GUARD 1: Past slot check ──
                if (isSlotInPast(selectedSlot, selectedDate)) {
                    alert('⏰ This time slot has already passed. Please select a future time.');
                    setIsProcessing(false);
                    return;
                }

                // ── GUARD 2: Daily limit check (1 booking per user per day per court location) ──
                const targetDateStr = toPhDateStr(selectedDate);
                const { hasReachedLimit } = await checkDailyBookingLimit(user.id, targetDateStr, court.locationId);
                if (hasReachedLimit) {
                    alert('🚫 You already have a booking at this court location for today. Each player is limited to 1 booking per court location per day.');
                    setDailyLimitReached(true);
                    setSelectedSlot(null);
                    setShowPaymentModal(false);
                    setIsProcessing(false);
                    return;
                }

                // ── GUARD 3: Final DB check right before insert — scoped to this location ──
                let guardQuery = supabase
                    .from('bookings')
                    .select('id, courts!inner(location_id)')
                    .eq('player_id', user.id)
                    .eq('date', targetDateStr)
                    .neq('status', 'cancelled');

                if (court.locationId) {
                    guardQuery = guardQuery.eq('courts.location_id', court.locationId);
                }

                const { data: playerDayBookings, error: playerDayError } = await guardQuery;

                if (playerDayError) {
                    alert('🚫 Could not verify your booking limit for this location. Please try again.');
                    setIsProcessing(false);
                    return;
                }

                if (playerDayBookings && playerDayBookings.length > 0) {
                    alert('🚫 You already have a booking at this court location for today. Each player is limited to 1 booking per court location per day.');
                    setDailyLimitReached(true);
                    setSelectedSlot(null);
                    setShowPaymentModal(false);
                    setIsProcessing(false);
                    return;
                }

                const [time, period] = selectedSlot.split(' ');
                let [hours, minutes] = time.split(':').map(Number);
                if (period === 'PM' && hours !== 12) hours += 12;
                else if (period === 'AM' && hours === 12) hours = 0;

                const startDateTime = new Date(selectedDate);
                startDateTime.setHours(hours, minutes, 0, 0);
                const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

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
                    locationName: locationName,
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
                setDailyLimitReached(true);
                setShowPaymentModal(false);
                setShowSuccessModal(true);
                setSelectedSlot(null);
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
                                {court.status && court.status !== 'Available' && (
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 ${court.status === 'Fully Booked' ? 'bg-orange-50 text-orange-600 border border-orange-200'
                                        : court.status === 'Coming Soon' ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                            : court.status === 'Maintenance' ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                                : ''
                                        }`}>
                                        {court.status === 'Fully Booked' ? '⏳' : court.status === 'Coming Soon' ? '🔜' : '🔧'} {court.status}
                                    </div>
                                )}
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

                            {/* Operation Hours */}
                            <div className="flex items-center gap-3 p-4 bg-amber-50/80 rounded-xl border border-amber-100">
                                <div className="p-2 bg-amber-500 text-white rounded-lg shrink-0">
                                    <Clock size={14} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-amber-900 mb-0.5">Operation Hours</h4>
                                    <p className="text-xs text-amber-700 font-bold">
                                        {(() => {
                                            const fmt = (t: string) => { const h = parseInt(t.split(':')[0], 10); return h === 0 ? '12:00 AM' : h < 12 ? `${h.toString().padStart(2, '0')}:00 AM` : h === 12 ? '12:00 PM' : `${(h - 12).toString().padStart(2, '0')}:00 PM`; };
                                            return `${fmt(locationOpenTime)} — ${fmt(locationCloseTime)}`;
                                        })()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Booking Sidebar */}
                    <div className="lg:sticky lg:top-8 space-y-4">
                        {court.status === 'Coming Soon' || court.status === 'Maintenance' ? (
                            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-5">
                                <div className={`text-center py-8 ${court.status === 'Coming Soon' ? 'text-blue-600' : 'text-amber-600'}`}>
                                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl ${court.status === 'Coming Soon' ? 'bg-blue-50' : 'bg-amber-50'
                                        }`}>
                                        {court.status === 'Coming Soon' ? '🔜' : '🔧'}
                                    </div>
                                    <h3 className="text-lg font-black tracking-tight uppercase mb-2">{court.status}</h3>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[240px] mx-auto">
                                        {court.status === 'Coming Soon'
                                            ? 'This court is not yet available for booking. Stay tuned for updates!'
                                            : 'This court is currently under maintenance. Please check back later.'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-5">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-950 tracking-tight mb-1">Select Schedule</h3>
                                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">When will you be playing?</p>
                                </div>

                                {/* Future Dates Banner — shown whenever selected date is NOT today */}
                                {(() => {
                                    const todayStr = toPhDateStr(getNowPH());
                                    const selStr = toPhDateStr(selectedDate);
                                    const isFutureDate = selStr > todayStr;
                                    if (!isFutureDate) return null;
                                    return (
                                        <div className="flex items-center gap-2.5 p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                                                <span className="text-sm">📅</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-orange-700 uppercase tracking-wider leading-none mb-0.5">Booking For Future Dates</p>
                                                <p className="text-[10px] text-orange-600/80 font-medium leading-snug">
                                                    You're booking for <span className="font-bold">{selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: PH_TIMEZONE })}</span>. Make sure you pick the correct date.
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Date Picker */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        <span>Choose Date</span>
                                        <CalendarIcon size={14} className="text-blue-600" />
                                    </div>
                                    <div className="grid grid-cols-7 gap-1.5">
                                        {Array.from({ length: 7 }).map((_, i) => {
                                            const nowPH = getNowPH();
                                            const date = new Date(nowPH);
                                            date.setDate(date.getDate() + i);
                                            const dateStr = toPhDateStr(date);
                                            const selectedStr = toPhDateStr(selectedDate);
                                            const isSelected = selectedStr === dateStr;
                                            const isDateFullyBooked = fullyBookedDates.has(dateStr);
                                            const isDateClosed = locationClosures.has(dateStr);
                                            const isUnavailable = isDateFullyBooked || isDateClosed;
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        if (isUnavailable && !isDateClosed) return;
                                                        // Allow clicking closed dates to see the closure notice
                                                        setSelectedDate(date);
                                                        setSelectedSlot(null);
                                                        setDailyLimitReached(false);
                                                        setIsBooked(false);
                                                    }}
                                                    disabled={isDateFullyBooked && !isDateClosed}
                                                    className={`flex flex-col items-center py-2.5 rounded-xl transition-all duration-200 relative ${isSelected && !isUnavailable
                                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200/50'
                                                        : isSelected && isDateClosed
                                                            ? 'bg-rose-500 text-white shadow-md shadow-rose-200/50'
                                                            : isDateClosed
                                                                ? 'bg-rose-50 text-rose-300 cursor-pointer opacity-70'
                                                                : isDateFullyBooked
                                                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-60'
                                                                    : 'bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600'
                                                        }`}
                                                >
                                                    <span className={`text-[8px] font-bold uppercase mb-0.5 ${isSelected && !isUnavailable ? 'text-blue-200' : isDateClosed ? 'text-rose-300' : isDateFullyBooked ? 'text-slate-300' : 'text-slate-400'}`}>
                                                        {date.toLocaleDateString('en-US', { weekday: 'short', timeZone: PH_TIMEZONE }).slice(0, 3)}
                                                    </span>
                                                    <span className={`text-sm font-bold ${isUnavailable ? 'line-through' : ''}`}>{date.getDate()}</span>
                                                    {isDateClosed && (
                                                        <span className="text-[6px] font-black text-rose-400 uppercase leading-none mt-0.5">Closed</span>
                                                    )}
                                                    {isDateFullyBooked && !isDateClosed && (
                                                        <span className="text-[6px] font-black text-orange-400 uppercase leading-none mt-0.5">Full</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Location Closure Notice */}
                                {locationClosures.has(toPhDateStr(selectedDate)) && (() => {
                                    const detail = locationClosureDetails.get(toPhDateStr(selectedDate));
                                    return (
                                        <div className="flex items-center gap-2.5 p-3 bg-gradient-to-r from-rose-50 to-red-50 rounded-xl border border-rose-200">
                                            <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center shrink-0">
                                                <span className="text-sm">🚫</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-rose-700 uppercase tracking-wider leading-none mb-0.5">
                                                    {detail?.reason?.startsWith('Court:') ? 'Court Closed' : 'Location Closed'}
                                                </p>
                                                <p className="text-[10px] text-rose-600/80 font-medium leading-snug">
                                                    {detail?.reason?.startsWith('Court:') ? detail.reason.replace('Court: ', '') : (detail?.reason || 'Closed')}{detail?.description ? ` — ${detail.description}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Slots */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        <span>Choose Slot</span>
                                        <Clock size={14} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 max-h-[260px] overflow-y-auto">
                                        {activeTimeSlots.map(slot => {
                                            const isBlocked = blockedSlots.has(slot);
                                            const isBookedSlot = bookedSlots.has(slot);
                                            const isUserSlot = userBookedSlots.has(slot);
                                            const userSlotStatus = userBookedSlots.get(slot) || '';
                                            const isPast = isSlotInPast(slot, selectedDate);
                                            const isOccupied = isBlocked || isBookedSlot || dailyLimitReached || isPast;
                                            const isSelected = selectedSlot === slot;

                                            return (
                                                <button
                                                    key={slot}
                                                    disabled={isOccupied}
                                                    onClick={() => setSelectedSlot(slot)}
                                                    title={
                                                        isUserSlot ? `Your Slot – ${userSlotStatus}`
                                                            : isBlocked ? 'Court Locked In by Owner'
                                                                : isPast ? 'This time has passed'
                                                                    : dailyLimitReached ? 'Limit reached at this location (1/day)'
                                                                        : isBookedSlot ? 'Booked by another player'
                                                                            : 'Available'
                                                    }
                                                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all ${isUserSlot
                                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-600 cursor-default'
                                                        : isSelected
                                                            ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                                                            : isPast
                                                                ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed line-through'
                                                                : isBlocked
                                                                    ? 'bg-red-50 border-red-200 text-red-300 cursor-not-allowed'
                                                                    : isOccupied
                                                                        ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600'
                                                        }`}
                                                >
                                                    {isUserSlot
                                                        ? `Your Slot – ${userSlotStatus}`
                                                        : isBlocked
                                                            ? '🔒 Court Locked In'
                                                            : isBookedSlot
                                                                ? 'Court Locked In'
                                                                : slotToRange(slot)
                                                    }
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Daily Limit Banner */}
                                    {dailyLimitReached && (
                                        <div className="mt-3 p-3 bg-orange-50 rounded-xl border border-orange-200 flex items-start gap-2">
                                            <AlertCircle size={14} className="text-orange-500 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-orange-700 leading-relaxed font-medium">
                                                You've already booked <span className="font-bold">1 hour</span> at this court location today. Each player is limited to <span className="font-bold">1 booking per court location per day</span>. Choose a different location/date or cancel your existing booking.
                                            </p>
                                        </div>
                                    )}
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
                                    disabled={!selectedSlot || isProcessing || isBooked || dailyLimitReached || isCourtOwner}
                                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] ${isBooked
                                        ? 'bg-emerald-500 text-white'
                                        : isCourtOwner
                                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                            : dailyLimitReached
                                                ? 'bg-orange-100 text-orange-500 border border-orange-200 cursor-not-allowed'
                                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200/50 disabled:opacity-40 disabled:shadow-none'
                                        }`}
                                >
                                    {isProcessing ? <Loader2 size={18} className="animate-spin" /> : (
                                        isBooked ? (
                                            <>
                                                <CheckCircle2 size={18} />
                                                Booked!
                                            </>
                                        ) : isCourtOwner ? (
                                            <>
                                                <Ban size={16} />
                                                Court Owner Cannot Book
                                            </>
                                        ) : dailyLimitReached ? (
                                            <>
                                                <Ban size={16} />
                                                Limit Reached (1/location/day)
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
                        )}

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
                            {locationName && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-slate-400">Location</span>
                                    <span className="font-bold text-slate-900">{locationName}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium text-slate-400">Court</span>
                                <span className="font-bold text-slate-900">{court.name}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium text-slate-400">Address</span>
                                <span className="font-bold text-slate-900 text-right max-w-[60%]">{court.location}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium text-slate-400">Date</span>
                                <span className="font-bold text-slate-900">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: PH_TIMEZONE })}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium text-slate-400">Time Slot</span>
                                <span className="font-bold text-slate-900">
                                    {selectedSlot ? slotToRange(selectedSlot) : ''}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium text-slate-400">Duration</span>
                                <span className="font-bold text-slate-900">1 Hour</span>
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
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    setIsBooked(false);
                                    setSelectedSlot(null);
                                    navigate('/booking');
                                }}
                                className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl text-sm hover:bg-slate-800 transition-all"
                            >
                                Back to Booking
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
