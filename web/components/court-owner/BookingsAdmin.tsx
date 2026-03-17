import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, Filter, Download, MoreHorizontal, CheckCircle, XCircle, Clock, MapPin, User, Phone, X, QrCode, Play, ChevronLeft, ChevronRight, Trash2, RefreshCw, AlertTriangle, PhilippinePeso, Ban, Eye, ChevronDown, Banknote, LogIn, LogOut, UserX, Timer, Mail, Users, UserPlus, Building2, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { isTimeSlotBlocked } from '../../services/courtEvents';
import { autoCancelLateBookings } from '../../services/bookings';
import { sendGuestBookingEmail } from '../../services/guestBookingEmail';
import { sendPaymentReceiptEmail } from '../../services/paymentReceiptEmail';
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
    payment_proof_status?: 'awaiting_payment' | 'proof_submitted' | 'payment_verified' | 'payment_rejected' | null;
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
        username?: string; // Added for player search
    };
    courts?: {
        name: string;
        location_id?: string;
        locations?: { // Added for location name in payment receipt
            name: string;
        };
    };
    is_guest?: boolean; // Added for payment receipt logic
    booking_payments?: {
        id: string;
        status?: string | null;
        payment_type?: string | null;
        proof_image_url?: string | null;
        reference_number?: string | null;
        account_name?: string | null;
        created_at?: string | null;
    }[];
}

// Helper: resolve display name/email/avatar for a booking (guest vs player)
const getBookingUser = (b: BookingRecord) => {
    const isGuest = !!b.guest_name && !!b.booked_by;
    return {
        name: isGuest ? b.guest_name! : (b.profiles?.full_name || b.profiles?.username || 'Guest Player'),
        email: isGuest ? (b.guest_email || 'Guest') : (b.profiles?.email || 'No email'),
        avatarUrl: isGuest ? null : (b.profiles?.avatar_url || null),
        isGuest,
    };
};

const ITEMS_PER_PAGE = 15;
const DEFAULT_OPEN_TIME = '08:00';
const DEFAULT_CLOSE_TIME = '18:00';
const PH_TIMEZONE = 'Asia/Manila';
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const BookingsAdmin: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<BookingRecord[]>([]);
    const [myCourts, setMyCourts] = useState<any[]>([]);
    const [myLocations, setMyLocations] = useState<any[]>([]);
    const [courtOperationHoursByCourt, setCourtOperationHoursByCourt] = useState<Record<string, any[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Action modals
    const [confirmModal, setConfirmModal] = useState<{ type: 'verify' | 'cancel' | 'delete' | 'refund'; booking: BookingRecord } | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Three-dot menu
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Filters
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [locationFilter, setLocationFilter] = useState('');
    const [courtFilter, setCourtFilter] = useState('');
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [displayMode, setDisplayMode] = useState<'calendar' | 'list'>('calendar');
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [legendFilter, setLegendFilter] = useState<'none' | 'partial' | 'half' | 'almost' | 'full' | 'available' | 'booked' | 'expired' | 'pending' | ''>('');
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [calendarAnimKey, setCalendarAnimKey] = useState(0);
    const [filterAnimKey, setFilterAnimKey] = useState(0);
    const locationDropdownRef = useRef<HTMLDivElement>(null);
    const datePickerRef = useRef<HTMLDivElement>(null);
    const monthPickerRef = useRef<HTMLDivElement>(null);

    // Detail modal
    const [viewingBooking, setViewingBooking] = useState<BookingRecord | null>(null);
    const [scheduleDayModal, setScheduleDayModal] = useState<{ courtId: string; dateKey: string } | null>(null);

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
            if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
                setShowMonthPicker(false);
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
            const [courtsResponse, locationsResponse, bookingsResponse, courtOperationHoursResponse] = await Promise.all([
                supabase
                    .from('courts')
                    .select('*')
                    .eq('owner_id', user.id),
                supabase
                    .from('locations')
                    .select('id, name, city, address, opening_time, closing_time')
                    .eq('owner_id', user.id),
                supabase
                    .from('bookings')
                    .select(`
                        *,
                        profiles (full_name, email, avatar_url, username),
                        courts!inner (name, owner_id, location_id, locations(name)),
                        booking_payments (id, status, payment_type, proof_image_url, reference_number, account_name, created_at)
                    `)
                    .eq('courts.owner_id', user.id)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('court_operation_hours')
                    .select('court_id, day_of_week, specific_date, open_time, close_time, is_closed, is_active')
                    .eq('owner_id', user.id)
                    .eq('is_active', true)
            ]);

            if (courtsResponse.error) throw courtsResponse.error;
            if (locationsResponse.error) throw locationsResponse.error;
            if (bookingsResponse.error) throw bookingsResponse.error;
            if (courtOperationHoursResponse.error) throw courtOperationHoursResponse.error;

            setMyCourts(courtsResponse.data || []);
            setMyLocations(locationsResponse.data || []);
            setBookings(bookingsResponse.data || []);

            const groupedHours = (courtOperationHoursResponse.data || []).reduce((acc: Record<string, any[]>, row: any) => {
                if (!acc[row.court_id]) acc[row.court_id] = [];
                acc[row.court_id].push(row);
                return acc;
            }, {});
            setCourtOperationHoursByCourt(groupedHours);
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

    const verifyBookingPayment = async (booking: BookingRecord) => {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) throw new Error('Please log in again to verify payment.');

        const paymentCandidates = [...(booking.booking_payments || [])].sort((a, b) =>
            new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        );
        const paymentToVerify = paymentCandidates.find((p) => p.status === 'pending' || p.status === 'submitted' || !p.status) || paymentCandidates[0];

        if (!paymentToVerify?.id) {
            throw new Error('No payment record found for this booking.');
        }

        const verifiedAt = new Date().toISOString();

        const { error: paymentError } = await supabase
            .from('booking_payments')
            .update({
                status: 'verified',
                verified_by: user.id,
                verified_at: verifiedAt,
                updated_at: verifiedAt,
            })
            .eq('id', paymentToVerify.id);

        if (paymentError) throw paymentError;

        // Keep booking_payments and bookings in sync even when there are multiple
        // payment submissions for the same booking.
        const { error: syncPaymentsError } = await supabase
            .from('booking_payments')
            .update({
                status: 'verified',
                verified_by: user.id,
                verified_at: verifiedAt,
                updated_at: verifiedAt,
            })
            .eq('booking_id', booking.id)
            .in('status', ['pending', 'submitted']);

        if (syncPaymentsError) throw syncPaymentsError;

        const { error: bookingError } = await supabase
            .from('bookings')
            .update({ status: 'confirmed', payment_status: 'paid', payment_proof_status: 'payment_verified' })
            .eq('id', booking.id);

        if (bookingError) throw bookingError;
    };

    const handleConfirmAction = async () => {
        if (!confirmModal) return;
        setActionLoading(true);
        try {
            const { type, booking } = confirmModal;
            if (type === 'verify') {
                await verifyBookingPayment(booking);
                await fetchBookings();
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
            let isGuestBooking = false;

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
                isGuestBooking = true;
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
                player_id: player_id || currentUser.id, // Fallback to owner if guest has no profile
                date: mbDate,
                start_time: slotStart,
                end_time: slotEnd,
                total_price: mbPrice,
                status: 'confirmed',
                payment_status: 'unpaid',
                booked_by: currentUser.id,
                is_guest: isGuestBooking,
            };

            // Add guest info if guest booking
            if (isGuestBooking && !player_id) { // Only if it's a guest booking AND no existing profile was found
                bookingRecord.guest_name = guestName;
                bookingRecord.guest_email = guestEmail;
            }

            // 3. Insert booking
            const { data: bookingData, error } = await supabase
                .from('bookings')
                .insert(bookingRecord)
                .select(`
                    *,
                    profiles (full_name, email, avatar_url, username),
                    courts (name, locations(name))
                `)
                .single();

            if (error) throw error;

            // 4. For guest bookings: Send booking receipt email with "Setup Your Account" link
            if (isGuestBooking && guestEmail) {
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
            // For manual booking we want to pass player email, name, etc. to next step
            let playerEmail = '';
            if (!bookingData.is_guest && bookingData.profiles && bookingData.profiles.email) {
                playerEmail = bookingData.profiles.email;
            }

            setMbCreatedBooking({
                id: bookingData.id,
                isGuest: bookingData.is_guest,
                guestName: bookingData.is_guest ? bookingData.guest_name : (bookingData.profiles?.full_name || bookingData.profiles?.username || 'Player'),
                guestEmail: bookingData.is_guest ? bookingData.guest_email : playerEmail,
                playerEmail: playerEmail, // Store player email separately for receipt
                courtName: bookingData.courts?.name,
                locationName: bookingData.courts?.locations?.name || '',
                date: bookingData.date,
                startTime: bookingData.start_time.slice(0, 5),
                endTime: bookingData.end_time.slice(0, 5),
                totalPrice: bookingData.total_price,
                avatarUrl: bookingData.profiles?.avatar_url,
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
        const matchesSpecificCourt = !courtFilter || b.court_id === courtFilter;
        const matchesDateFrom = !dateFrom || b.date >= dateFrom;
        const matchesDateTo = !dateTo || b.date <= dateTo;
        return matchesSearch && matchesCourt && matchesSpecificCourt && matchesDateFrom && matchesDateTo;
    });

    // Pagination
    const totalPages = Math.max(Math.ceil(filteredBookings.length / ITEMS_PER_PAGE), 1);
    const paginatedBookings = filteredBookings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Reset to page 1 when filters change
    useEffect(() => { setCurrentPage(1); }, [searchQuery, locationFilter, courtFilter, dateFrom, dateTo]);

    // Reset selected court when location changes or becomes invalid
    useEffect(() => {
        if (!courtFilter) return;
        const stillValid = myCourts.some((court: any) => court.id === courtFilter && (!locationFilter || court.location_id === locationFilter));
        if (!stillValid) setCourtFilter('');
    }, [courtFilter, locationFilter, myCourts]);

    useEffect(() => {
        if (courtFilter) {
            if (legendFilter && legendFilter !== 'available' && legendFilter !== 'booked' && legendFilter !== 'expired') {
                setLegendFilter('');
            }
        } else {
            if (legendFilter === 'available' || legendFilter === 'booked') {
                setLegendFilter('');
            }
        }
    }, [courtFilter, legendFilter]);

    useEffect(() => {
        setFilterAnimKey(prev => prev + 1);
    }, [locationFilter, courtFilter, legendFilter, displayMode]);

    useEffect(() => {
        if (!courtFilter) setScheduleDayModal(null);
    }, [courtFilter]);

    const changeCalendarMonth = (nextDate: Date) => {
        setCalendarMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
        setCalendarAnimKey(prev => prev + 1);
    };

    const normalizeTime = (time?: string) => {
        if (!time) return '';
        return time.slice(0, 5);
    };

    const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return (h * 60) + m;
    };

    const minutesToHHMM = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const formatTime12 = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hh = h % 12 || 12;
        return `${hh}:${String(m).padStart(2, '0')}${ampm}`;
    };

    const formatTime12Compact = (time: string) => {
        return formatTime12(time).replace(':00', '');
    };

    const getDateKey = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const getNowPH = () => {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: PH_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).formatToParts(new Date());

        const lookup = (type: string) => parts.find((p) => p.type === type)?.value || '00';
        const year = lookup('year');
        const month = lookup('month');
        const day = lookup('day');
        const hour = Number(lookup('hour'));
        const minute = Number(lookup('minute'));

        return {
            dateKey: `${year}-${month}-${day}`,
            minutes: (hour * 60) + minute,
        };
    };

    const getLocationHours = (locationId: string) => {
        const location = myLocations.find((loc: any) => loc.id === locationId);
        const open = normalizeTime(location?.opening_time) || DEFAULT_OPEN_TIME;
        const close = normalizeTime(location?.closing_time) || DEFAULT_CLOSE_TIME;
        return { open, close };
    };

    const getCourtEffectiveHoursForDate = (courtId: string, dateKey: string) => {
        const entries = courtOperationHoursByCourt[courtId] || [];

        const dateSpecific = entries.find((row: any) => row.specific_date === dateKey);
        if (dateSpecific) {
            return {
                open: normalizeTime(dateSpecific.open_time) || DEFAULT_OPEN_TIME,
                close: normalizeTime(dateSpecific.close_time) || DEFAULT_CLOSE_TIME,
                isClosed: !!dateSpecific.is_closed,
            };
        }

        const [y, m, d] = dateKey.split('-').map(Number);
        const dayOfWeek = new Date(y, m - 1, d).getDay();
        const weekly = entries.find((row: any) => row.day_of_week === dayOfWeek && !row.specific_date);
        if (weekly) {
            return {
                open: normalizeTime(weekly.open_time) || DEFAULT_OPEN_TIME,
                close: normalizeTime(weekly.close_time) || DEFAULT_CLOSE_TIME,
                isClosed: !!weekly.is_closed,
            };
        }

        const court = myCourts.find((c: any) => c.id === courtId);
        const locationHours = getLocationHours(court?.location_id || '');
        return {
            open: locationHours.open,
            close: locationHours.close,
            isClosed: false,
        };
    };

    const bookingIsActive = (booking: BookingRecord) => booking.status !== 'cancelled';

    const countBookedAndExpiredHourSlots = (dayBookings: BookingRecord[], openTime: string, closeTime: string, dateKey: string) => {
        const open = toMinutes(openTime);
        const close = toMinutes(closeTime);
        if (close <= open) return { booked: 0, expired: 0, occupied: 0 };
        const { dateKey: nowKey, minutes: nowMinutes } = getNowPH();
        const isPastDate = dateKey < nowKey;
        const isToday = dateKey === nowKey;
        let booked = 0;
        let expired = 0;
        for (let slotStart = open; slotStart < close; slotStart += 60) {
            const slotEnd = Math.min(slotStart + 60, close);
            const hasBooking = dayBookings.some((b) => {
                const bStart = toMinutes(b.start_time.slice(0, 5));
                const bEnd = toMinutes(b.end_time.slice(0, 5));
                return bStart < slotEnd && bEnd > slotStart;
            });
            const isExpired = isPastDate || (isToday && slotStart < nowMinutes);
            if (hasBooking) {
                booked += 1;
            } else if (isExpired) {
                expired += 1;
            }
        }
        return {
            booked,
            expired,
            occupied: booked + expired,
        };
    };

    const getCapacityState = (bookedSlots: number, totalSlots: number): 'none' | 'partial' | 'half' | 'almost' | 'full' => {
        if (bookedSlots <= 0) return 'none';
        if (totalSlots <= 0) return 'none';
        if (bookedSlots >= totalSlots) return 'full';

        const ratio = bookedSlots / totalSlots;
        if (ratio < 0.5) return 'partial';
        if (ratio < 0.75) return 'half';
        return 'almost';
    };

    const getTagClass = (state: 'none' | 'partial' | 'half' | 'almost' | 'full') => {
        if (state === 'none') return 'bg-lime-400/32 text-lime-900 border border-lime-500/45 backdrop-blur-sm';
        if (state === 'partial') return 'bg-blue-600/22 text-blue-900 border border-blue-500/50 backdrop-blur-sm';
        if (state === 'half') return 'bg-orange-500/20 text-orange-800 border border-orange-300/55 backdrop-blur-sm';
        if (state === 'almost') return 'bg-rose-400/22 text-rose-800 border border-rose-300/55 backdrop-blur-sm';
        return 'bg-red-700/18 text-red-800 border border-red-400/55 backdrop-blur-sm';
    };

    const selectedLocationCourts = locationFilter
        ? myCourts.filter((court: any) => court.location_id === locationFilter)
        : [];

    const calendarSourceBookings = filteredBookings.filter(bookingIsActive);

    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const firstWeekday = monthStart.getDay();
    const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    const { dateKey: todayKey, minutes: nowMinutesToday } = getNowPH();

    const calendarDays = Array.from({ length: totalCells }, (_, idx) => {
        const dayNumber = idx - firstWeekday + 1;
        if (dayNumber < 1 || dayNumber > daysInMonth) {
            return {
                key: `empty-${calendarMonth.getFullYear()}-${calendarMonth.getMonth()}-${idx}`,
                isPlaceholder: true,
            };
        }

        const d = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), dayNumber);
        const key = getDateKey(d);
        return {
            date: d,
            key,
            inCurrentMonth: true,
            isToday: key === todayKey,
            isPast: key < todayKey,
            isPlaceholder: false,
        };
    });

    const buildCourtDaySegments = (courtId: string, dateKey: string) => {
        const effectiveHours = getCourtEffectiveHoursForDate(courtId, dateKey);
        const { open, close, isClosed } = effectiveHours;
        const openMin = toMinutes(open);
        const closeMin = toMinutes(close);
        const isPastDate = dateKey < todayKey;
        const isToday = dateKey === todayKey;

        if (isClosed || closeMin <= openMin) {
            return {
                open,
                close,
                isClosed: true,
                segments: [] as Array<{ type: 'booked' | 'pending' | 'free' | 'expired'; start: string; end: string }>,
            };
        }

        const dayBookings = calendarSourceBookings
            .filter((b) => b.court_id === courtId && b.date === dateKey)
            .map((b) => ({
                booking: b,
                start: Math.max(openMin, toMinutes(b.start_time.slice(0, 5))),
                end: Math.min(closeMin, toMinutes(b.end_time.slice(0, 5))),
            }))
            .filter((r) => r.end > r.start)
            .sort((a, b) => a.start - b.start);

        const segments: Array<{ type: 'booked' | 'pending' | 'free' | 'expired'; start: string; end: string }> = [];

        const pushFreeOrExpired = (startMin: number, endMin: number) => {
            if (endMin <= startMin) return;
            if (isPastDate) {
                segments.push({ type: 'expired', start: minutesToHHMM(startMin), end: minutesToHHMM(endMin) });
                return;
            }
            if (isToday) {
                if (endMin <= nowMinutesToday) {
                    segments.push({ type: 'expired', start: minutesToHHMM(startMin), end: minutesToHHMM(endMin) });
                    return;
                }
                if (startMin >= nowMinutesToday) {
                    segments.push({ type: 'free', start: minutesToHHMM(startMin), end: minutesToHHMM(endMin) });
                    return;
                }
                segments.push({ type: 'expired', start: minutesToHHMM(startMin), end: minutesToHHMM(nowMinutesToday) });
                segments.push({ type: 'free', start: minutesToHHMM(nowMinutesToday), end: minutesToHHMM(endMin) });
                return;
            }
            segments.push({ type: 'free', start: minutesToHHMM(startMin), end: minutesToHHMM(endMin) });
        };

        let cursor = openMin;
        for (const block of dayBookings) {
            if (block.start > cursor) {
                pushFreeOrExpired(cursor, block.start);
            }
            const pending = block.booking.payment_proof_status === 'proof_submitted' || block.booking.payment_status === 'unpaid';
            segments.push({ type: pending ? 'pending' : 'booked', start: minutesToHHMM(block.start), end: minutesToHHMM(block.end) });
            cursor = Math.max(cursor, block.end);
        }
        if (cursor < closeMin) {
            pushFreeOrExpired(cursor, closeMin);
        }

        return { open, close, isClosed: false, segments };
    };

    const buildCourtDayModalDetails = (courtId: string, dateKey: string) => {
        const effectiveHours = getCourtEffectiveHoursForDate(courtId, dateKey);
        const { open, close, isClosed } = effectiveHours;
        const openMin = toMinutes(open);
        const closeMin = toMinutes(close);
        const isPastDate = dateKey < todayKey;
        const isToday = dateKey === todayKey;

        if (isClosed || closeMin <= openMin) {
            return {
                open,
                close,
                isClosed: true,
                slotTags: [] as Array<{ type: 'booked' | 'pending' | 'free' | 'expired'; start: string; end: string; userName?: string; avatarUrl?: string | null }>,
                bookedDetails: [] as Array<{ id: string; userName: string; avatarUrl?: string | null; start: string; end: string; status: 'booked' | 'pending'; paymentStatus?: string; paymentProofStatus?: string | null }>,
            };
        }

        const dayBookings = calendarSourceBookings
            .filter((b) => b.court_id === courtId && b.date === dateKey)
            .map((b) => ({
                booking: b,
                start: Math.max(openMin, toMinutes(b.start_time.slice(0, 5))),
                end: Math.min(closeMin, toMinutes(b.end_time.slice(0, 5))),
            }))
            .filter((r) => r.end > r.start)
            .sort((a, b) => a.start - b.start);

        const hourlySlots: Array<{ type: 'booked' | 'free' | 'expired'; start: string; end: string }> = [];
        for (let slotStart = openMin; slotStart < closeMin; slotStart += 60) {
            const slotEnd = Math.min(slotStart + 60, closeMin);
            const isBookedHour = dayBookings.some((b) => b.start < slotEnd && b.end > slotStart);
            const isExpiredHour = isPastDate || (isToday && slotStart < nowMinutesToday);
            hourlySlots.push({
                type: isBookedHour ? 'booked' : (isExpiredHour ? 'expired' : 'free'),
                start: minutesToHHMM(slotStart),
                end: minutesToHHMM(slotEnd),
            });
        }

        const bookedDetails = dayBookings.map(({ booking, start, end }) => {
            const user = getBookingUser(booking);
            const isPending = booking.payment_proof_status === 'proof_submitted' || booking.payment_status === 'unpaid';
            return {
                id: booking.id,
                userName: user.name,
                avatarUrl: user.avatarUrl,
                start: minutesToHHMM(start),
                end: minutesToHHMM(end),
                status: isPending ? 'pending' : 'booked' as const,
                paymentStatus: booking.payment_status,
                paymentProofStatus: booking.payment_proof_status,
            };
        });

        const bookedTags = dayBookings.map(({ booking, start, end }) => {
            const user = getBookingUser(booking);
            const isPending = booking.payment_proof_status === 'proof_submitted' || booking.payment_status === 'unpaid';
            return {
                type: isPending ? 'pending' as const : 'booked' as const,
                start: minutesToHHMM(start),
                end: minutesToHHMM(end),
                userName: user.name,
                avatarUrl: user.avatarUrl,
            };
        });

        const slotTags: Array<{ type: 'booked' | 'pending' | 'free' | 'expired'; start: string; end: string; userName?: string; avatarUrl?: string | null }> = [
            ...bookedTags,
            ...hourlySlots
                .filter((slot) => slot.type !== 'booked')
                .map((slot) => ({
                    type: slot.type,
                    start: slot.start,
                    end: slot.end,
                })),
        ].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

        return { open, close, isClosed: false, slotTags, bookedDetails };
    };

    const getDateFromKey = (dateKey: string) => {
        const [y, m, d] = dateKey.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const selectedLocationName = locationFilter
        ? (myLocations.find((l: any) => l.id === locationFilter)?.name || 'Location')
        : 'Location';
    const selectedCourtName = courtFilter
        ? (myCourts.find((c: any) => c.id === courtFilter)?.name || 'Court')
        : 'Court';

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-12">
            {displayMode === 'calendar' ? (
                <div key={`calendar-shell-${filterAnimKey}`} className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-8 animate-in fade-in duration-300">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Court Bookings</h1>
                            <p className="text-slate-500 font-medium tracking-tight">Administrative control for court reservations.</p>
                            <div key={`crumbs-${filterAnimKey}`} className="mt-3 flex flex-wrap items-center gap-2 text-sm font-black uppercase tracking-widest animate-in fade-in duration-300">
                                <button
                                    type="button"
                                    onClick={() => { setLocationFilter(''); setCourtFilter(''); }}
                                    className={`px-3 py-1.5 rounded-xl border transition-all ${!locationFilter ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700'}`}
                                >
                                    All Location
                                </button>
                                <span className="text-slate-300">&gt;</span>
                                <button
                                    type="button"
                                    onClick={() => setCourtFilter('')}
                                    className={`px-3 py-1.5 rounded-xl border transition-all ${locationFilter && !courtFilter ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700'}`}
                                >
                                    {locationFilter ? selectedLocationName : 'Court'}
                                </button>
                                <span className="text-slate-300">&gt;</span>
                                <span className={`px-3 py-1.5 rounded-xl border ${courtFilter ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                    {courtFilter ? selectedCourtName : 'Schedules'}
                                </span>
                            </div>
                        </div>

                        <div className="md:text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Calendar View</p>
                            <div className="relative mt-1" ref={monthPickerRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowMonthPicker(v => !v)}
                                    className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight hover:text-blue-700 transition-colors"
                                >
                                    {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                </button>
                                {showMonthPicker && (
                                    <div className="absolute right-0 mt-2 w-[280px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-40 animate-in fade-in zoom-in-95 duration-150">
                                        <div className="mb-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Year</label>
                                            <input
                                                type="number"
                                                value={calendarMonth.getFullYear()}
                                                onChange={(e) => {
                                                    const y = Number(e.target.value);
                                                    if (!Number.isNaN(y) && y >= 2000 && y <= 2100) {
                                                        changeCalendarMonth(new Date(y, calendarMonth.getMonth(), 1));
                                                    }
                                                }}
                                                className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-300"
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {MONTH_NAMES.map((monthName, idx) => (
                                                <button
                                                    key={monthName}
                                                    type="button"
                                                    onClick={() => { changeCalendarMonth(new Date(calendarMonth.getFullYear(), idx, 1)); setShowMonthPicker(false); }}
                                                    className={`px-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${calendarMonth.getMonth() === idx ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                                                >
                                                    {monthName.slice(0, 3)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div key={`legend-${filterAnimKey}`} className="mt-3 flex flex-wrap md:justify-end items-center gap-1.5 text-[9px] font-black uppercase tracking-widest animate-in fade-in duration-300">
                                <span className="text-slate-400">Legend:</span>
                                {courtFilter ? (
                                    <>
                                        <span className="px-2 py-1 rounded-full border bg-blue-600/24 text-blue-900 border-blue-500/60">🔵 Operational Hours</span>
                                        <button type="button" onClick={() => setLegendFilter(legendFilter === 'available' ? '' : 'available')} className={`px-2 py-1 rounded-full border backdrop-blur-sm transition-all ${legendFilter === 'available' ? 'ring-2 ring-emerald-300 bg-emerald-500/28' : 'bg-emerald-500/20'} text-emerald-800 border-emerald-300/50`}>🟢 Available</button>
                                        <button type="button" onClick={() => setLegendFilter(legendFilter === 'booked' ? '' : 'booked')} className={`px-2 py-1 rounded-full border backdrop-blur-sm transition-all ${legendFilter === 'booked' ? 'ring-2 ring-red-300 bg-red-700/26' : 'bg-red-700/18'} text-red-800 border-red-400/55`}>🔴 Booked</button>
                                        <button type="button" onClick={() => setLegendFilter(legendFilter === 'pending' ? '' : 'pending')} className={`px-2 py-1 rounded-full border backdrop-blur-sm transition-all ${legendFilter === 'pending' ? 'ring-2 ring-amber-300 bg-amber-400/28' : 'bg-amber-400/20'} text-amber-800 border-amber-300/60`}>🟠 Pending</button>
                                        <button type="button" onClick={() => setLegendFilter(legendFilter === 'expired' ? '' : 'expired')} className={`px-2 py-1 rounded-full border backdrop-blur-sm transition-all ${legendFilter === 'expired' ? 'ring-2 ring-slate-300 bg-slate-500/28' : 'bg-slate-500/18'} text-slate-700 border-slate-300/60`}>⚫ Expired</button>
                                    </>
                                ) : (
                                    <>
                                        <span className="px-2 py-1 rounded-full border bg-blue-600/24 text-blue-900 border-blue-500/60">🔵 Operational Hours</span>
                                        <button type="button" onClick={() => setLegendFilter(legendFilter === 'none' ? '' : 'none')} className={`px-2 py-1 rounded-full border backdrop-blur-sm transition-all ${legendFilter === 'none' ? 'ring-2 ring-lime-400 bg-lime-400/38' : 'bg-lime-400/26'} text-lime-900 border-lime-500/45`}>🟢 No Bookings</button>
                                        <button type="button" onClick={() => setLegendFilter(legendFilter === 'expired' ? '' : 'expired')} className={`px-2 py-1 rounded-full border backdrop-blur-sm transition-all ${legendFilter === 'expired' ? 'ring-2 ring-slate-300 bg-slate-500/28' : 'bg-slate-500/18'} text-slate-700 border-slate-300/60`}>⚫ Expired</button>
                                        <button type="button" onClick={() => setLegendFilter(legendFilter === 'partial' ? '' : 'partial')} className={`px-2 py-1 rounded-full border backdrop-blur-sm transition-all ${legendFilter === 'partial' ? 'ring-2 ring-blue-400 bg-blue-600/32' : 'bg-blue-600/22'} text-blue-900 border-blue-500/50`}>🔵 Partially Booked</button>
                                        <button type="button" onClick={() => setLegendFilter(legendFilter === 'half' ? '' : 'half')} className={`px-2 py-1 rounded-full border backdrop-blur-sm transition-all ${legendFilter === 'half' ? 'ring-2 ring-orange-300 bg-orange-500/28' : 'bg-orange-500/20'} text-orange-800 border-orange-300/55`}>🟠 Half Day Booked</button>
                                        <button type="button" onClick={() => setLegendFilter(legendFilter === 'almost' ? '' : 'almost')} className={`px-2 py-1 rounded-full border backdrop-blur-sm transition-all ${legendFilter === 'almost' ? 'ring-2 ring-rose-300 bg-rose-400/30' : 'bg-rose-400/22'} text-rose-800 border-rose-300/55`}>🔴 Almost Full</button>
                                        <button type="button" onClick={() => setLegendFilter(legendFilter === 'full' ? '' : 'full')} className={`px-2 py-1 rounded-full border backdrop-blur-sm transition-all ${legendFilter === 'full' ? 'ring-2 ring-red-300 bg-red-700/26' : 'bg-red-700/18'} text-red-800 border-red-400/55`}>🔴 Fully Booked</button>
                                    </>
                                )}
                                {legendFilter && (
                                    <button type="button" onClick={() => setLegendFilter('')} className="px-2 py-1 rounded-full border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-colors">Clear All</button>
                                )}
                            </div>
                            <div className="mt-3 flex md:justify-end items-center gap-2">
                                <button
                                    onClick={() => changeCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-all"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => changeCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-all"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">{day}</div>
                        ))}
                    </div>

                    <div key={`${calendarAnimKey}-${filterAnimKey}`} className="grid grid-cols-1 md:grid-cols-7 gap-2 animate-in fade-in duration-300">
                        {calendarDays.map((day) => {
                            if ((day as any).isPlaceholder) {
                                return <div key={day.key} className="min-h-[180px] rounded-2xl border border-transparent bg-transparent" />;
                            }

                            const dayBookings = calendarSourceBookings.filter((b) => b.date === day.key);
                            const isPastDay = !!(day as any).isPast;
                            const isCourtScheduleView = !!(locationFilter && courtFilter);
                            const courtScheduleDetail = isCourtScheduleView ? buildCourtDaySegments(courtFilter, day.key) : null;

                            return (
                                <div
                                    key={day.key}
                                    onClick={() => {
                                        if (isCourtScheduleView && courtFilter) {
                                            setScheduleDayModal({ courtId: courtFilter, dateKey: day.key });
                                        }
                                    }}
                                    className={`group min-h-[180px] rounded-2xl border p-2.5 md:p-3 relative overflow-visible transition-all duration-300 ${isCourtScheduleView ? 'min-h-[210px]' : ''} ${
                                        isPastDay
                                            ? 'bg-slate-100 border-slate-200 opacity-65'
                                            : 'bg-white border-slate-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-100/70 hover:border-blue-300'
                                    } ${isCourtScheduleView ? 'cursor-pointer' : ''}`}
                                >
                                    {!isPastDay && (
                                        <div className="pointer-events-none absolute left-3 right-3 top-0.5 h-[2px] rounded-full bg-blue-500/70 scale-x-0 group-hover:scale-x-100 origin-center transition-transform duration-300" />
                                    )}
                                    {day.isToday && (
                                        <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 z-50 text-[8px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-black uppercase tracking-widest shadow-sm">Today</span>
                                    )}
                                    {isCourtScheduleView ? (
                                        <>
                                            <div className="flex items-center mb-2 gap-1.5">
                                                <span className={`text-base font-black transition-all duration-300 ${isPastDay ? 'text-slate-500' : 'text-slate-900 group-hover:text-blue-700 group-hover:scale-105'}`}>{day.date.getDate()}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/court-pricing?court=${courtFilter}`);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-blue-500/70 bg-blue-600/20 text-[10px] font-black text-blue-900 tracking-wide hover:bg-blue-600/30 transition-all max-w-[150px] sm:max-w-[180px] whitespace-nowrap"
                                                    title="Edit operation hours in Court Pricing"
                                                >
                                                    <Clock size={12} className="text-blue-700" />
                                                    <span className="truncate">{courtScheduleDetail ? `${formatTime12(courtScheduleDetail.open)} - ${formatTime12(courtScheduleDetail.close)}` : ''}</span>
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center mb-2">
                                            <span className={`text-sm font-black transition-all duration-300 ${isPastDay ? 'text-slate-500' : 'text-slate-900 group-hover:text-blue-700 group-hover:scale-105'}`}>{day.date.getDate()}</span>
                                        </div>
                                    )}

                                    {!locationFilter && (
                                        <div className="space-y-1.5 max-h-[130px] overflow-y-auto pr-1">
                                            {myLocations.length === 0 ? (
                                                <p className="text-[10px] text-slate-400 font-bold">No locations</p>
                                            ) : (
                                                myLocations.map((loc: any) => {
                                                    const courtsInLoc = myCourts.filter((c: any) => c.location_id === loc.id);
                                                    const totalSlots = courtsInLoc.reduce((sum: number, court: any) => {
                                                        const hours = getCourtEffectiveHoursForDate(court.id, day.key);
                                                        if (hours.isClosed) return sum;
                                                        const cap = Math.max(0, Math.ceil((toMinutes(hours.close) - toMinutes(hours.open)) / 60));
                                                        return sum + cap;
                                                    }, 0);

                                                    const bookedSlots = courtsInLoc.reduce((sum: number, court: any) => {
                                                        const hours = getCourtEffectiveHoursForDate(court.id, day.key);
                                                        if (hours.isClosed) return sum;
                                                        const courtBookings = dayBookings.filter((b) => b.court_id === court.id);
                                                        return sum + countBookedAndExpiredHourSlots(courtBookings, hours.open, hours.close, day.key).occupied;
                                                    }, 0);

                                                    const hasAnyBooking = courtsInLoc.some((court: any) => {
                                                        const courtBookings = dayBookings.filter((b) => b.court_id === court.id);
                                                        return courtBookings.length > 0;
                                                    });

                                                    const hasAnyExpired = courtsInLoc.some((court: any) => {
                                                        const hours = getCourtEffectiveHoursForDate(court.id, day.key);
                                                        if (hours.isClosed) return false;
                                                        const courtBookings = dayBookings.filter((b) => b.court_id === court.id);
                                                        return countBookedAndExpiredHourSlots(courtBookings, hours.open, hours.close, day.key).expired > 0;
                                                    });

                                                    const state = hasAnyBooking
                                                        ? getCapacityState(bookedSlots, Math.max(totalSlots, 1))
                                                        : 'none';

                                                    if (legendFilter) {
                                                        if (legendFilter === 'expired') {
                                                            if (!hasAnyExpired) return null;
                                                        } else if (legendFilter !== state) {
                                                            return null;
                                                        }
                                                    }

                                                    return (
                                                        <button
                                                            key={`${day.key}-${loc.id}`}
                                                            type="button"
                                                            onClick={() => {
                                                                setLocationFilter(loc.id);
                                                                setCourtFilter('');
                                                            }}
                                                            className={`w-full text-left text-[10px] sm:text-[11px] font-medium rounded-md px-2 py-1 truncate transition-all hover:scale-[1.01] hover:shadow-sm cursor-pointer animate-in fade-in zoom-in-95 duration-200 ${!hasAnyBooking && isPastDay ? 'bg-slate-500/18 text-slate-700 border border-slate-300/60 backdrop-blur-sm' : getTagClass(state)}`}
                                                            title={`${loc.name} — ${state} (Click to open location courts calendar)`}
                                                        >
                                                            {loc.name}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}

                                    {locationFilter && !courtFilter && (
                                        <div className="space-y-1.5 max-h-[130px] overflow-y-auto pr-1">
                                            {selectedLocationCourts.length === 0 ? (
                                                <p className="text-[10px] text-slate-400 font-bold">No courts in location</p>
                                            ) : (
                                                selectedLocationCourts.map((court: any) => {
                                                    const hours = getCourtEffectiveHoursForDate(court.id, day.key);
                                                    const totalSlots = hours.isClosed
                                                        ? 0
                                                        : Math.max(1, Math.ceil((toMinutes(hours.close) - toMinutes(hours.open)) / 60));
                                                    const courtBookings = dayBookings.filter((b) => b.court_id === court.id);
                                                    const slotStats = hours.isClosed
                                                        ? { booked: 0, expired: 0, occupied: 0 }
                                                        : countBookedAndExpiredHourSlots(courtBookings, hours.open, hours.close, day.key);
                                                    const hasBooking = courtBookings.length > 0;
                                                    const state = hasBooking
                                                        ? getCapacityState(slotStats.occupied, Math.max(totalSlots, 1))
                                                        : 'none';

                                                    if (legendFilter) {
                                                        if (legendFilter === 'expired') {
                                                            if (slotStats.expired <= 0) return null;
                                                        } else if (legendFilter !== state) {
                                                            return null;
                                                        }
                                                    }

                                                    return (
                                                        <button
                                                            key={`${day.key}-${court.id}`}
                                                            type="button"
                                                            onClick={() => setCourtFilter(court.id)}
                                                            className={`w-full text-left text-[10px] sm:text-[11px] font-medium rounded-md px-2 py-1 truncate transition-all hover:scale-[1.01] hover:shadow-sm cursor-pointer animate-in fade-in zoom-in-95 duration-200 ${!hasBooking && isPastDay ? 'bg-slate-500/18 text-slate-700 border border-slate-300/60 backdrop-blur-sm' : getTagClass(state)}`}
                                                            title={`${court.name} — ${state} (Click to open court schedule calendar)`}
                                                        >
                                                            {court.name}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}

                                    {locationFilter && courtFilter && (
                                        <div className="space-y-2 max-h-[130px] overflow-y-auto pr-1">
                                            {(() => {
                                                const detail = courtScheduleDetail!;
                                                return (
                                                    <>
                                                        {detail.isClosed && (
                                                            <div className="text-[10px] font-black rounded-md px-2 py-1 bg-slate-400 text-white">
                                                                Closed
                                                            </div>
                                                        )}
                                                        <div className="flex flex-wrap items-start content-start gap-1.5">
                                                            {detail.segments
                                                                .filter((segment) => {
                                                                    if (!legendFilter) return true;
                                                                    if (legendFilter === 'booked') return segment.type === 'booked';
                                                                    if (legendFilter === 'pending') return segment.type === 'pending';
                                                                    if (legendFilter === 'available') return segment.type === 'free';
                                                                    if (legendFilter === 'expired') return segment.type === 'expired';
                                                                    return true;
                                                                })
                                                                .map((segment, idx) => (
                                                                    <div
                                                                        key={`${day.key}-${segment.start}-${segment.end}-${idx}`}
                                                                        className={`inline-flex items-center text-[10px] sm:text-[11px] font-medium rounded-lg px-2.5 py-1 border backdrop-blur-sm whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 ${segment.type === 'booked'
                                                                                ? 'bg-red-700/18 text-red-800 border-red-400/55'
                                                                                : segment.type === 'pending'
                                                                                    ? 'bg-amber-400/20 text-amber-800 border-amber-300/60'
                                                                                    : segment.type === 'expired'
                                                                                        ? 'bg-slate-500/18 text-slate-700 border-slate-300/60'
                                                                                        : 'bg-emerald-500/20 text-emerald-800 border-emerald-300/50'}`}
                                                                    >
                                                                        {formatTime12Compact(segment.start)}-{formatTime12Compact(segment.end)}
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                </div>
            ) : (
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
                                                        // Future booking — cannot check in
                                                        return (
                                                            <div className="flex flex-col items-center gap-1.5">
                                                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-50 border border-indigo-200 text-indigo-600">
                                                                    <Calendar size={12} /> Scheduled
                                                                </span>
                                                                <span className="text-[9px] font-bold text-slate-400">
                                                                    {new Date(booking.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                </span>
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
            </div>
            )}
                {/* Court Schedule Day Modal */}
                {scheduleDayModal && ReactDOM.createPortal(
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[210] flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setScheduleDayModal(null)}>
                        {(() => {
                            const detail = buildCourtDayModalDetails(scheduleDayModal.courtId, scheduleDayModal.dateKey);
                            const selectedDate = getDateFromKey(scheduleDayModal.dateKey);
                            return (
                                <div className="bg-white w-full max-w-3xl rounded-[32px] p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Court Schedule</p>
                                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                                                {selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                            </h2>
                                        </div>
                                        <div className="flex items-start gap-3 md:ml-auto">
                                            <div className="p-3 rounded-xl border border-blue-300 bg-blue-50/80 min-w-[220px]">
                                                <div className="flex items-center gap-2 whitespace-nowrap">
                                                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Operational Hours</p>
                                                    <p className="text-sm md:text-base font-bold text-blue-900">
                                                        {detail.isClosed ? 'Closed' : `${formatTime12(detail.open)} - ${formatTime12(detail.close)}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setScheduleDayModal(null)}
                                                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-500"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {!detail.isClosed && (
                                        <>
                                            <div className="mb-5">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Slot Tags</p>
                                                <div className="flex flex-wrap gap-2 max-h-[240px] overflow-y-auto pr-1">
                                                    {detail.slotTags.map((slot, idx) => (
                                                        <span
                                                            key={`${slot.start}-${slot.end}-${idx}`}
                                                            className={`inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium rounded-lg px-2.5 py-1 border whitespace-nowrap ${slot.type === 'booked'
                                                                    ? 'bg-red-700/18 text-red-800 border-red-400/55'
                                                                    : slot.type === 'pending'
                                                                        ? 'bg-amber-400/20 text-amber-800 border-amber-300/60'
                                                                        : slot.type === 'expired'
                                                                            ? 'bg-slate-500/18 text-slate-700 border-slate-300/60'
                                                                            : 'bg-emerald-500/20 text-emerald-800 border-emerald-300/50'}`}
                                                        >
                                                            {slot.type !== 'free' && slot.userName && (
                                                                <img
                                                                    src={slot.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(slot.userName)}&background=random&size=28&font-size=0.4&bold=true`}
                                                                    alt={slot.userName}
                                                                    className="w-4 h-4 rounded-full object-cover border border-white/80"
                                                                />
                                                            )}
                                                            {formatTime12Compact(slot.start)}-{formatTime12Compact(slot.end)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between gap-3 mb-2">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Booked Details</p>
                                                    <div className="flex flex-wrap items-center justify-end gap-1.5 text-[9px] font-black uppercase tracking-widest">
                                                        <span className="px-2 py-1 rounded-full border bg-blue-600/24 text-blue-900 border-blue-500/60">🔵 Operational Hours</span>
                                                        <span className="px-2 py-1 rounded-full border bg-emerald-500/20 text-emerald-800 border-emerald-300/50">🟢 Available</span>
                                                        <span className="px-2 py-1 rounded-full border bg-amber-400/20 text-amber-800 border-amber-300/60">🟠 Pending</span>
                                                        <span className="px-2 py-1 rounded-full border bg-red-700/18 text-red-800 border-red-400/55">🔴 Booked</span>
                                                        <span className="px-2 py-1 rounded-full border bg-slate-500/18 text-slate-700 border-slate-300/60">⚫ Expired</span>
                                                    </div>
                                                </div>
                                                {detail.bookedDetails.length > 0 ? (
                                                    <div className="max-h-[220px] overflow-y-auto pr-1 border border-slate-200 rounded-2xl bg-slate-50/50">
                                                        <div className="grid grid-cols-[1.2fr_auto_auto] gap-3 px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 sticky top-0 z-10">
                                                            <span>Player</span>
                                                            <span>Schedule</span>
                                                            <span className="text-right">Status</span>
                                                        </div>
                                                        <div className="divide-y divide-slate-200">
                                                            {detail.bookedDetails.map((b) => (
                                                                <div key={b.id} className="grid grid-cols-[1.2fr_auto_auto] gap-3 px-4 py-3 items-center text-sm text-slate-700">
                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                        <img
                                                                            src={b.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.userName)}&background=random&size=40&font-size=0.42&bold=true`}
                                                                            alt={b.userName}
                                                                            className="w-7 h-7 rounded-full object-cover border border-white shadow-sm"
                                                                        />
                                                                        <span className="font-semibold truncate">{b.userName}</span>
                                                                    </div>
                                                                    <span className="font-semibold text-slate-600 whitespace-nowrap">{formatTime12Compact(b.start)}-{formatTime12Compact(b.end)}</span>
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border whitespace-nowrap ${
                                                                            b.status === 'pending'
                                                                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                                                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                                        }`}>
                                                                            {b.status === 'pending' ? 'Pending' : 'Booked'}
                                                                        </span>
                                                                        {b.status === 'pending' && (
                                                                            <button
                                                                                type="button"
                                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 shadow-sm"
                                                                                onClick={() => {
                                                                                    const full = bookings.find((bk) => bk.id === b.id);
                                                                                    if (full) setViewingBooking(full);
                                                                                }}
                                                                            >
                                                                                Verify
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm font-medium text-slate-500">No booked slots for this date.</p>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })()}
                    </div>,
                    document.body
                )}

                {/* Action Confirmation Modal */}
                {confirmModal && ReactDOM.createPortal(
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="text-center mb-8">
                                <div className={`w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center ${
                                    confirmModal.type === 'verify' ? 'bg-emerald-50' :
                                    confirmModal.type === 'refund' ? 'bg-amber-50' :
                                    confirmModal.type === 'delete' ? 'bg-rose-50' :
                                    'bg-rose-50'
                                }`}>
                                    {confirmModal.type === 'verify' && <CheckCircle size={32} className="text-emerald-600" />}
                                    {confirmModal.type === 'cancel' && <XCircle size={32} className="text-rose-500" />}
                                    {confirmModal.type === 'delete' && <Trash2 size={32} className="text-rose-600" />}
                                    {confirmModal.type === 'refund' && <RefreshCw size={32} className="text-amber-600" />}
                                </div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase mb-2">
                                    {confirmModal.type === 'verify' && 'Verify Payment'}
                                    {confirmModal.type === 'cancel' && 'Cancel Booking'}
                                    {confirmModal.type === 'delete' && 'Delete Booking'}
                                    {confirmModal.type === 'refund' && 'Cancel & Refund'}
                                </h2>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                    {confirmModal.type === 'verify' && (
                                        <>Verify payment for <strong className="text-slate-900">{getBookingUser(confirmModal.booking).name}</strong>? This will mark the transaction as verified and update booking status to paid/confirmed.</>
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
                                        confirmModal.type === 'verify' ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200' :
                                        confirmModal.type === 'refund' ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-200' :
                                        'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200'
                                    }`}
                                >
                                    {actionLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {confirmModal.type === 'verify' && 'Yes, Verify'}
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
                                                <PhilippinePeso className="text-lime-400" size={20} />
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

                                                    // Send payment receipt email
                                                    if (mbCreatedBooking.guestEmail || mbCreatedBooking.playerEmail) {
                                                        const pEmail = mbCreatedBooking.isGuest ? mbCreatedBooking.guestEmail : mbCreatedBooking.playerEmail;
                                                        console.log('DEBUG: Manual booking payment verified. Email:', pEmail);
                                                        if (pEmail) {
                                                            sendPaymentReceiptEmail({
                                                                email: pEmail,
                                                                playerName: mbCreatedBooking.guestName || 'Player',
                                                                courtName: mbCreatedBooking.courtName || 'Court',
                                                                locationName: mbCreatedBooking.locationName || '',
                                                                date: mbCreatedBooking.date,
                                                                startTime: mbCreatedBooking.startTime,
                                                                endTime: mbCreatedBooking.endTime,
                                                                totalPrice: mbCreatedBooking.totalPrice,
                                                                referenceId: mbCreatedBooking.id,
                                                                paymentMethod: 'cash'
                                                            }).then(res => {
                                                                if (res.success) console.log('DEBUG: Manual receipt email success');
                                                                else console.error('DEBUG: Manual receipt email failure:', res.error);
                                                            }).catch(err => console.error('DEBUG: Manual receipt email error:', err));
                                                        }
                                                    } else {
                                                        console.warn('DEBUG: No email found for manual booking receipt');
                                                    }
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
                                        <PhilippinePeso size={16} className="text-blue-600" />
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
                                                                    <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-slate-200" />
                                                                ) : (
                                                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || p.username || 'U')}&background=random&size=32&font-size=0.4&bold=true`} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-slate-200" />
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

                            {/* Payment Proof */}
                            <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-6 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Proof</p>
                                        <p className="text-sm font-black text-slate-900">Uploaded screenshot & reference</p>
                                    </div>
                                    {viewingBooking.payment_proof_status && (
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                            viewingBooking.payment_proof_status === 'payment_verified'
                                                ? 'bg-lime-50 border-lime-200 text-lime-700'
                                                : viewingBooking.payment_proof_status === 'payment_rejected'
                                                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                                                    : 'bg-amber-50 border-amber-200 text-amber-700'
                                        }`}>
                                            {viewingBooking.payment_proof_status.replace('_', ' ')}
                                        </span>
                                    )}
                                </div>
                                {(() => {
                                    const proof = (viewingBooking.booking_payments || [])
                                        .filter(p => p.proof_image_url)
                                        .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())[0];
                                    if (!proof) {
                                        return <p className="text-sm font-medium text-slate-500">No proof submitted.</p>;
                                    }
                                    return (
                                        <div className="flex flex-col md:flex-row gap-4 items-start">
                                            <div className="w-full md:w-1/2">
                                                <img src={proof.proof_image_url || ''} alt="Payment proof" className="w-full rounded-xl border border-slate-200 shadow-sm object-cover" />
                                            </div>
                                            <div className="flex-1 space-y-2 text-sm text-slate-700">
                                                {proof.reference_number && (
                                                    <p className="font-semibold">Reference: <span className="font-bold text-slate-900">{proof.reference_number}</span></p>
                                                )}
                                                {proof.payment_type && (
                                                    <p className="font-semibold capitalize">Method: <span className="font-bold text-slate-900">{proof.payment_type}</span></p>
                                                )}
                                                {proof.account_name && (
                                                    <p className="font-semibold">Account: <span className="font-bold text-slate-900">{proof.account_name}</span></p>
                                                )}
                                                <div className="flex flex-wrap gap-2">
                                                    <a
                                                        href={proof.proof_image_url || '#'}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-black uppercase tracking-widest hover:bg-blue-100"
                                                    >
                                                        Open Full Size
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
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
                                {/* PAY & CHECK-IN — for CONFIRMED + unpaid + TODAY + not checked in + not past end */}
                                {vIsToday && !viewingBooking.is_checked_in && viewingBooking.status === 'confirmed' && viewingBooking.payment_status !== 'paid' && !vIsPastEnd && !viewingBooking.is_no_show && (
                                    <button
                                        onClick={() => {
                                            const b = viewingBooking;
                                            setViewingBooking(null);
                                            setPayingBooking(b);
                                            setPayCashReceived('');
                                            setPayChange(0);
                                            setPayError('');
                                        }}
                                        className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 shadow-blue-200 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <Banknote size={18} /> {vIsLate ? 'Late Pay & Check-In' : 'Pay & Check-In'}
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
                                        onClick={() => { setViewingBooking(null); setConfirmModal({ type: 'verify', booking: viewingBooking }); }}
                                        className="h-14 px-6 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <CheckCircle size={16} /> Verify
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
                                            <PhilippinePeso className="text-lime-400" size={20} />
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
                                                const { data: { session } } = await supabase.auth.getSession();
                                                const user = session?.user;

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

                                                // Log event
                                                await supabase.from('system_logs').insert({
                                                    user_id: user?.id,
                                                    action: 'PAYMENT_RECEIVED',
                                                    details: { booking_id: payingBooking.id, amount: received, type: 'CASH', change: payChange, by: 'ADMIN' }
                                                });
                                                
                                                // Send payment receipt email
                                                const pEmail = payingBooking.is_guest ? payingBooking.guest_email : payingBooking.profiles?.email;
                                                console.log('DEBUG: Check-in payment verified. Email:', pEmail);
                                                if (pEmail) {
                                                    const pName = payingBooking.is_guest ? payingBooking.guest_name : (payingBooking.profiles?.full_name || payingBooking.profiles?.username || 'Player');
                                                    sendPaymentReceiptEmail({
                                                        email: pEmail,
                                                        playerName: pName,
                                                        courtName: payingBooking.courts?.name || 'Court',
                                                        locationName: payingBooking.courts?.locations?.name || '',
                                                        date: payingBooking.date,
                                                        startTime: payingBooking.start_time.slice(0, 5),
                                                        endTime: payingBooking.end_time.slice(0, 5),
                                                        totalPrice: payingBooking.total_price,
                                                        referenceId: payingBooking.id,
                                                        paymentMethod: 'cash'
                                                    }).then(res => {
                                                        if (res.success) console.log('DEBUG: Check-in receipt email success');
                                                        else console.error('DEBUG: Check-in receipt email failure:', res.error);
                                                    }).catch(err => console.error('DEBUG: Check-in receipt email error:', err));
                                                } else {
                                                    console.warn('DEBUG: No email found for check-in receipt');
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
    );
};

export default BookingsAdmin;
