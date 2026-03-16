import React, { useState, useEffect, useRef, useCallback } from 'react';
import useSEO from '../hooks/useSEO';
import ReactDOM from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, PhilippinePeso, Clock, CheckCircle2, Loader2, Filter, Search, Navigation, AlertCircle, Ban, CircleCheck, List, Funnel, X, ChevronLeft, ChevronRight, Building2, ClipboardList, Receipt as ReceiptIcon, Shield, UserPlus, Send, SlidersHorizontal, CalendarCheck, Banknote, QrCode, Upload, Maximize2, Download } from 'lucide-react';
import { Court } from '../types';
import { CourtSkeleton } from './ui/Skeleton';
import { supabase } from '../services/supabase';
import { isTimeSlotBlocked, getCourtBlockingEvents } from '../services/courtEvents';
import { autoCancelLateBookings } from '../services/bookings';
import { sendInvitation, searchPlayerForInvite } from '../services/invitations';
import Receipt from './Receipt';
import { getLocationPolicies, LocationPolicy } from '../services/policies';
import Toast, { ToastType } from './ui/Toast';
import WeeklyPricingSchedule from './ui/WeeklyPricingSchedule';
import { getSlotPrices, PricingRule, fetchCourtPricingRules, getSlotPrice } from '../services/courtPricingService';
import { getEffectiveHours, type EffectiveHours } from '../services/courtOperationHours';

// Always use hourly slots for simplicity
const ALL_HOUR_SLOTS = [
  '12:00 AM', '01:00 AM', '02:00 AM', '03:00 AM', '04:00 AM', '05:00 AM',
  '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM'
];

/** Generate time slots based on opening and closing hours (24h format strings like '08:00', '18:00') */
const generateTimeSlots = (openTime: string, closeTime: string): string[] => {
  if (!openTime || !closeTime) return TIME_SLOTS;

  const parseTime = (t: string) => {
    const [hStr, mStr = '0'] = t.split(':');
    return { h: parseInt(hStr, 10), m: parseInt(mStr, 10) };
  };

  const open = parseTime(openTime);
  const close = parseTime(closeTime);
  const openH = open.h;
  let closeH = close.h;

  // Handle 00:00 (midnight) or reversed ranges as 24:00 for 24h operation
  if ((closeH === 0 && close.m === 0) || closeH < openH || (closeH === openH && close.m <= open.m)) {
    closeH = 24;
  } else if (close.m > 0) {
    // Round up to include the last hour slot when closing at hh:mm
    closeH = Math.min(24, closeH + 1);
  }

  return ALL_HOUR_SLOTS.filter((_, idx) => idx >= openH && idx < closeH);
};

// Default fallback time slots
const TIME_SLOTS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
];

/** Convert a slot start time like '08:00 AM' to a range like '08:00 AM - 09:00 AM' */
const formatHourLabel = (hours24: number, minutes: number = 0): string => {
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const h12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutePart = minutes === 0 ? '' : `:${minutes.toString().padStart(2, '0')}`;
  return `${h12}${minutePart} ${period}`;
};

/** Convert a slot start time like '08:00 AM' to a range like '8 AM - 9 AM' */
const slotToRange = (slot: string): string => {
  const [time, period] = slot.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  else if (period === 'AM' && h === 12) h = 0;
  const endH = (h + 1) % 24;
  return `${formatHourLabel(h, m)} - ${formatHourLabel(endH, m)}`;
};

/** Convert a slot like '08:00 AM' to a 24-hour number (0–23) */
const slotTo24 = (slot: string): number => {
  const [time, period] = slot.split(' ');
  let [h] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  else if (period === 'AM' && h === 12) h = 0;
  return h;
};

/** Build display range for multiple consecutive slots */
const slotsToRange = (slots: string[]): string => {
  if (slots.length === 0) return '';
  if (slots.length === 1) return slotToRange(slots[0]);
  const sorted = [...slots].sort((a, b) => slotTo24(a) - slotTo24(b));
  const startH = slotTo24(sorted[0]);
  const endH = (slotTo24(sorted[sorted.length - 1]) + 1) % 24;
  return `${formatHourLabel(startH)} - ${formatHourLabel(endH)} (${sorted.length} hr${sorted.length > 1 ? 's' : ''})`;
};

const formatHourCompact = (hour24: number): string => {
  const ap = hour24 >= 12 ? 'PM' : 'AM';
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${h12}${ap}`;
};

const slotsToCompactRange = (slots: string[]): string => {
  if (slots.length === 0) return '';
  const sorted = [...slots].sort((a, b) => slotTo24(a) - slotTo24(b));
  const startH = slotTo24(sorted[0]);
  const endH = (slotTo24(sorted[sorted.length - 1]) + 1) % 24;
  const count = sorted.length;
  return `${formatHourCompact(startH)} - ${formatHourCompact(endH)} (${count} ${count > 1 ? 'HRS' : 'HR'})`;
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

const getSlotDateTime = (slot: string, baseDate: Date = new Date()): { start: Date; end: Date } => {
  const [time, period] = slot.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  const startDateTime = new Date(baseDate);
  startDateTime.setHours(hours, minutes, 0, 0);

  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour slot

  return { start: startDateTime, end: endDateTime };
};

// Distance calculation helper (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3958.8; // Radius of the earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Philippine regions mapping
const VISAYAS_CITIES = ['cebu', 'mandaue', 'lapu-lapu', 'talisay', 'danao', 'bogo', 'carcar', 'naga', 'toledo', 'tacloban', 'ormoc', 'bacolod', 'iloilo', 'roxas', 'dumaguete', 'tagbilaran', 'bohol', 'leyte', 'samar', 'negros', 'panay', 'siquijor', 'biliran'];
const MINDANAO_CITIES = ['davao', 'cagayan de oro', 'zamboanga', 'general santos', 'butuan', 'iligan', 'cotabato', 'koronadal', 'tagum', 'panabo', 'digos', 'mati', 'surigao', 'tandag', 'bislig', 'ozamiz', 'dipolog', 'pagadian', 'marawi', 'kidapawan', 'tacurong', 'malaybalay', 'valencia'];

const getRegion = (city: string): string => {
  const cityLower = city.toLowerCase();
  if (VISAYAS_CITIES.some(c => cityLower.includes(c))) return 'Visayas';
  if (MINDANAO_CITIES.some(c => cityLower.includes(c))) return 'Mindanao';
  return 'Luzon'; // Default to Luzon
};

declare global {
  interface Window {
    google: any;
  }
}

const MiniMapCard: React.FC<{ lat: number; lng: number; heightClassName?: string }> = ({ lat, lng, heightClassName = 'h-28' }) => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 15,
      mapTypeId: 'terrain',
      disableDefaultUI: true,
      gestureHandling: 'none',
      styles: [
        { featureType: 'landscape.natural', elementType: 'geometry.fill', stylers: [{ color: '#dde8cd' }] },
        { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#e4e0d8' }] },
        { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#a3c8e9' }] },
        { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#b5d48c' }] },
        { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#f5edd5' }] },
        { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#5c5544' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#f0ebe0' }, { weight: 2 }] }
      ]
    });

    new window.google.maps.Marker({
      position: { lat, lng },
      map,
      icon: {
        url: '/images/PinMarker.png',
        scaledSize: new window.google.maps.Size(46, 60),
        anchor: new window.google.maps.Point(23, 60)
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }
    };
  }, [lat, lng]);

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-50">
      <div ref={mapRef} className={`w-full ${heightClassName}`} />
    </div>
  );
};

interface LocationGroup {
  locationId: string;
  locationName: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  courts: Court[];
  imageUrl?: string;
  description?: string;
  amenities?: string[];
}

const isLikelyImageUrl = (value?: string | null): value is string => {
  if (!value || typeof value !== 'string') return false;
  const url = value.trim();
  if (!url) return false;
  if (url.startsWith('data:image/') || url.startsWith('blob:') || url.startsWith('/images/')) return true;
  if (url.includes('/rest/v1/') || url.includes('select=') || url.includes('is_blocking=') || url.includes('eq.true')) return false;

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    const hasImageExt = /\.(png|jpe?g|webp|gif|svg|avif|bmp)$/i.test(pathname);
    const isStorageObject = pathname.includes('/storage/v1/object/');
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && (hasImageExt || isStorageObject);
  } catch {
    return false;
  }
};

const sanitizeImageUrl = (value?: string | null, fallback = '') => (isLikelyImageUrl(value) ? value!.trim() : fallback);

const Booking: React.FC = () => {
  useSEO({
    title: 'Find Pickleball Courts Near Me – Book Online',
    description: 'Search for pickleball courts near you across the Philippines. Filter by city (Manila, Cebu, Davao), court type, and time — then book your slot instantly.',
    canonical: 'https://www.pickleplay.ph/booking',
  });
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isBooked, setIsBooked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [courts, setCourts] = useState<Court[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [locationCourts, setLocationCourts] = useState<Court[]>([]);
  const [isLoadingLocationDetail, setIsLoadingLocationDetail] = useState(false);
  const [locationGroups, setLocationGroups] = useState<LocationGroup[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [userRegion, setUserRegion] = useState<string | null>(null);
  const [gpsEnabled, setGpsEnabled] = useState<boolean | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isFilterClosing, setIsFilterClosing] = useState(false);
  const [filterPriceRange, setFilterPriceRange] = useState<[number, number]>([0, 2000]);
  const [filterFreeOnly, setFilterFreeOnly] = useState(false);
  const [filterAmenities, setFilterAmenities] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [filterType, setFilterType] = useState<'All' | 'Indoor' | 'Outdoor'>('All');
  const isMobile = window.innerWidth < 768;

  // For Location View
  const [locationSelectedSlots, setLocationSelectedSlots] = useState<string[]>([]);
  const [showLocationDetailHero, setShowLocationDetailHero] = useState(true);
  const [locationReviewSummary, setLocationReviewSummary] = useState<{ avg: number; count: number } | null>(null);
  const [locationAvailability, setLocationAvailability] = useState<Map<string, { blocked: Set<string>, booked: Set<string> }>>(new Map());
  const [locationUserBookedByCourt, setLocationUserBookedByCourt] = useState<Map<string, Set<string>>>(new Map());
  const [locationEffectiveHours, setLocationEffectiveHours] = useState<Map<string, EffectiveHours>>(new Map());
  const [locationTimeSlots, setLocationTimeSlots] = useState<string[]>([]);
  const [isCheckingLocationAvailability, setIsCheckingLocationAvailability] = useState(false);
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date(getNowPH()));
  const [showLeftCalendar, setShowLeftCalendar] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryModalImage, setGalleryModalImage] = useState<string | null>(null);
  const galleryScrollRef = useRef<HTMLDivElement | null>(null);

  const handleCloseFilters = () => {
    setIsFilterClosing(true);
    setTimeout(() => { setShowFilters(false); setIsFilterClosing(false); }, 400);
  };

  const goToMapView = () => {
    const today = getNowPH();
    setSelectedDate(today);
    setCurrentMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setLocationSelectedSlots([]);
    setSelectedSlots([]);
    setSelectedLocation(null);
    setActiveLocationId(null);
    setSelectedCourt(null);
    setShowBookingSummary(false);
    setShowLocationDetailHero(false);
    setShowLeftCalendar(false);
    setViewMode('map');
  };

  // Location entry confirmation modal handlers
  const openLocationConfirmModal = () => {
    if (!selectedLocation) return;
    setLocationConfirmed(false);
    setPendingLocationId(selectedLocation.id);
    setShowLocationEntryModal(true);
  };

  const confirmLocationEntry = () => {
    setShowLocationEntryModal(false);
    setLocationConfirmed(true);
    setShowLocationDetailHero(false);
    setShowLeftCalendar(true);
  };

  const cancelLocationEntry = () => {
    setShowLocationEntryModal(false);
    setShowLeftCalendar(false);
    setShowLocationDetailHero(true);
  };

  const openGalleryModal = (img?: string) => {
    if (!img) return;
    setGalleryModalImage(img);
    setIsGalleryModalOpen(true);
  };

  const closeGalleryModal = () => setIsGalleryModalOpen(false);

  const scrollToGalleryIndex = (index: number) => {
    const container = galleryScrollRef.current;
    if (!container) return;
    const target = container.children[index] as HTMLElement | undefined;
    if (target) {
      container.scrollTo({ left: Math.max(target.offsetLeft - 12, 0), behavior: 'smooth' });
    }
  };

  const handleGalleryScroll = () => {
    const container = galleryScrollRef.current;
    if (!container || container.children.length === 0) return;
    const firstCard = container.children[0] as HTMLElement;
    const step = Math.max(firstCard.offsetWidth + 12, 1);
    const nextIndex = Math.min(
      locationGalleryImages.length - 1,
      Math.max(0, Math.round(container.scrollLeft / step))
    );
    setGalleryIndex((prev) => (prev === nextIndex ? prev : nextIndex));
  };

  const goToPrevGalleryImage = () => {
    if (locationGalleryImages.length < 2) return;
    setGalleryIndex((idx) => {
      const nextIndex = (idx - 1 + locationGalleryImages.length) % locationGalleryImages.length;
      scrollToGalleryIndex(nextIndex);
      return nextIndex;
    });
  };

  const goToNextGalleryImage = () => {
    if (locationGalleryImages.length < 2) return;
    setGalleryIndex((idx) => {
      const nextIndex = (idx + 1) % locationGalleryImages.length;
      scrollToGalleryIndex(nextIndex);
      return nextIndex;
    });
  };
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || searchParams.get('court') || '');
  const [user, setUser] = useState<any>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [blockedSlots, setBlockedSlots] = useState<Set<string>>(new Set());
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  // Accordion state for courts list (expand details inline without leaving page)
  const [expandedCourtId, setExpandedCourtId] = useState<string | null>(null);
  // Hero expansion: when a court is clicked, animate it to the top header area
  const [heroCourtId, setHeroCourtId] = useState<string | null>(null);

  // Derived: the court object currently shown in the full-panel hero
  const heroActiveCourt = locationCourts.find(c => c.id === heroCourtId) || null;
  // Map of slot time -> booking status for slots booked by the CURRENT user on this court+date
  const [userBookedSlots, setUserBookedSlots] = useState<Map<string, string>>(new Map());
  // Mobile inline schedule view
  const [showMobileSchedule, setShowMobileSchedule] = useState(false);
  // Booking summary panel (avoids multi scheduling)
  const [showBookingSummary, setShowBookingSummary] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const isAdvanceBooking = toPhDateStr(selectedDate) > toPhDateStr(getNowPH());
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const hideDesktopDiscoveryControls = showLeftCalendar || showBookingSummary;

  const resetToMapAfterBooking = useCallback(() => {
    setShowSuccessModal(false);
    setShowReceipt(false);
    setIsBooked(false);
    setSelectedSlots([]);
    setSelectedCourt(null);
    setSelectedLocation(null);
    setActiveLocationId(null);
    setShowBookingSummary(false);
    setShowMobileSchedule(false);
    setShowLocationDetailHero(false);
    setShowLeftCalendar(false);
    setHeroCourtId(null);
    setShowInvitePanel(false);
    setViewMode('map');
    navigate('/booking');
  }, [navigate]);

  // Location entry confirmation & policies
  const [showLocationEntryModal, setShowLocationEntryModal] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [pendingLocationId, setPendingLocationId] = useState<string | null>(null);
  const [locationPolicies, setLocationPolicies] = useState<LocationPolicy[]>([]);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'info',
    isVisible: false,
  });

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'maya' | null>(null);
  const [ownerPaymentMethods, setOwnerPaymentMethods] = useState<any[]>([]);
  const [selectedQRMethod, setSelectedQRMethod] = useState<any | null>(null);
  const [showQRPaymentStep, setShowQRPaymentStep] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const proofInputRef = useRef<HTMLInputElement>(null);

  // Post-booking invitation state
  const [postBookLoadingPlayers, setPostBookLoadingPlayers] = useState(false);
  const [postBookAllPlayers, setPostBookAllPlayers] = useState<any[]>([]);
  const [postBookInviteQuery, setPostBookInviteQuery] = useState('');
  const [postBookInviteSent, setPostBookInviteSent] = useState<string[]>([]);
  const [postBookInviteSendingId, setPostBookInviteSendingId] = useState<string | null>(null);

  // Dynamic pricing state
  const [slotPrices, setSlotPrices] = useState<Map<string, number>>(new Map());
  const [pricingRulesCache, setPricingRulesCache] = useState<PricingRule[]>([]);
  const [courtPriceRanges, setCourtPriceRanges] = useState<Map<string, { min: number; max: number; hasRules: boolean }>>(new Map());
  const [locationSlotPriceRanges, setLocationSlotPriceRanges] = useState<Map<string, { min: number; max: number; hasRules: boolean }>>(new Map());

  // Court-level operation hours (resolved per court+date, overrides location hours)
  const [courtEffectiveHours, setCourtEffectiveHours] = useState<EffectiveHours | null>(null);


  const getUserLocation = () => {
    if (userLocation) return;
    setIsLoadingLocation(true);

    const successCallback = async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      setGpsEnabled(true);

      // Try reverse geocoding
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
        if (apiKey) {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
          );
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const addressComponents = data.results[0].address_components;
            let city = '';
            let adminArea = '';

            for (const component of addressComponents) {
              if (component.types.includes('locality')) {
                city = component.long_name;
              }
              if (component.types.includes('administrative_area_level_1')) {
                adminArea = component.long_name;
              }
            }

            const detectedCity = city || adminArea || 'Your Location';
            setUserCity(detectedCity);
            setUserRegion(getRegion(detectedCity));
          }
        }
      } catch (err) {
        console.error('Error getting city name:', err);
      } finally {
        setIsLoadingLocation(false);
      }
    };

    const errorCallback = (err: GeolocationPositionError) => {
      console.warn(`Geolocation error (${err.code}): ${err.message}`);
      setGpsEnabled(false);
      setIsLoadingLocation(false);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(successCallback, errorCallback, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    } else {
      setGpsEnabled(false);
      setIsLoadingLocation(false);
    }
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  const [mapCenter, setMapCenter] = useState({ lat: 14.5995, lng: 120.9842 });
  const [mapZoom, setMapZoom] = useState(11);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [lastBookingTime, setLastBookingTime] = useState<number | null>(null);

  useEffect(() => {
    setIsUserLoading(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsUserLoading(false);
    });

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setIsUserLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Receipt state
  // No-op

  // Get map position from URL params
  const urlLat = searchParams.get('lat');
  const urlLng = searchParams.get('lng');
  const urlZoom = searchParams.get('zoom');
  const urlCourt = searchParams.get('court');
  const urlSlot = searchParams.get('slot');
  const urlLocationId = searchParams.get('locationId');

  const [activeLocationId, setActiveLocationId] = useState<string | null>(urlLocationId);

  useEffect(() => {
    if (urlLocationId) {
      setActiveLocationId(urlLocationId);
    }
  }, [urlLocationId]);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const userLocationMarkerRef = useRef<any>(null);
  const pulseCirclesRef = useRef<any[]>([]);

  const smoothZoom = (targetZoom: number) => {
    if (!googleMapRef.current || !window.google) return;
    const map = googleMapRef.current;
    const currentZoom = map.getZoom();
    if (currentZoom === targetZoom) return;

    const duration = 600;
    const startTime = performance.now();

    const animateZoom = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth Ease-in-out Cubic
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const zoom = currentZoom + (targetZoom - currentZoom) * eased;
      map.setZoom(zoom);

      if (progress < 1) {
        requestAnimationFrame(animateZoom);
      }
    };
    requestAnimationFrame(animateZoom);
  };

  const triggerPulse = (lat: number, lng: number) => {
    if (!googleMapRef.current || !window.google) return;

    // Clear existing pulse circles
    pulseCirclesRef.current.forEach(c => c.setMap(null));
    pulseCirclesRef.current = [];

    const pulseCircle = new window.google.maps.Circle({
      strokeColor: '#a3e635',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#a3e635',
      fillOpacity: 0.4,
      map: googleMapRef.current,
      center: { lat, lng },
      radius: 1,
      zIndex: 1000,
    });

    pulseCirclesRef.current.push(pulseCircle);

    const maxRadius = 280;
    const duration = 1200;
    const startTime = performance.now();

    const animatePulse = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth Ease-out Cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentRadius = 1 + (maxRadius - 1) * eased;

      if (pulseCircle.getMap()) {
        pulseCircle.setRadius(currentRadius);
        pulseCircle.setOptions({
          fillOpacity: 0.4 * (1 - progress),
          strokeOpacity: 0.8 * (1 - progress)
        });
      }

      if (progress < 1) {
        requestAnimationFrame(animatePulse);
      } else {
        pulseCircle.setMap(null);
        pulseCirclesRef.current = pulseCirclesRef.current.filter(c => c !== pulseCircle);
      }
    };
    requestAnimationFrame(animatePulse);
  };

  // Sync search query state with URL search params
  useEffect(() => {
    const q = searchParams.get('q') || searchParams.get('court') || '';
    setSearchQuery(q); // Sync ONLY q, loc stays out of search bar
  }, [searchParams]);

  // Fetch location detail + its courts when locationId is in URL
  useEffect(() => {
    if (!activeLocationId) {
      setSelectedLocation(null);
      setLocationCourts([]);
      setShowLocationDetailHero(false);
      return;
    }

    setShowLocationDetailHero(true);
    setLocationReviewSummary(null);

    const fetchLocationDetail = async () => {
      setIsLoadingLocationDetail(true);
      try {
        // Fetch location info
        const { data: locData, error: locError } = await supabase
          .from('locations')
          .select('*')
          .eq('id', activeLocationId)
          .single();

        if (locError) throw locError;
        setSelectedLocation(locData);

        // Fetch location policies
        setIsLoadingPolicies(true);
        const policyResult = await getLocationPolicies(activeLocationId);
        if (policyResult.data) {
          setLocationPolicies(policyResult.data);
        }
        setIsLoadingPolicies(false);

        // Keep current selection without forcing confirmation when navigating via list/map
        setPendingLocationId(activeLocationId);
        setLocationConfirmed(true);
        setShowLocationEntryModal(false);

        // Fetch courts belonging to this location (only setup-complete courts)
        const { data: courtsData, error: courtsError } = await supabase
          .from('courts')
          .select(`
            *,
            locations (
              id,
              address,
              city,
              latitude,
              longitude
            ),
            court_reviews (
              rating
            )
          `)
          .eq('location_id', activeLocationId)
          .eq('setup_complete', true);

        if (courtsError) throw courtsError;

        const mappedCourts: Court[] = (courtsData || []).map((c: any) => {
          const loc = c.locations;
          return {
            id: c.id,
            name: c.name,
            type: c.surface_type?.toLowerCase().includes('indoor') ? 'Indoor' : 'Outdoor',
            location: loc ? `${loc.address}, ${loc.city}` : 'Unknown Location',
            pricePerHour: c.base_price,
            availability: [],
            latitude: loc?.latitude,
            longitude: loc?.longitude,
            numCourts: c.num_courts,
            amenities: Array.isArray(c.amenities) ? c.amenities : [],
            imageUrl: sanitizeImageUrl(c.image_url),
            courtType: c.court_type || 'Outdoor',
            ownerId: c.owner_id,
            cleaningTimeMinutes: c.cleaning_time_minutes || 0,
            status: c.status || 'Available'
          };
        });
        setLocationCourts(mappedCourts);

        const ratings = (courtsData || [])
          .flatMap((c: any) => (c.court_reviews || []).map((r: any) => r.rating))
          .filter((r: any) => typeof r === 'number');
        if (ratings.length > 0) {
          const avg = ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length;
          setLocationReviewSummary({ avg, count: ratings.length });
        } else {
          setLocationReviewSummary(null);
        }

        // Price ranges will be computed by the date-aware useEffect below
        setCourtPriceRanges(new Map());
      } catch (err) {
        console.error('Error fetching location detail:', err);
      } finally {
        setIsLoadingLocationDetail(false);
      }
    };

    fetchLocationDetail();
  }, [activeLocationId]);

  const handleSearch = async (query: string) => {
    if (!query || !window.google) return;

    // First check if it matches a court/location name exactly
    const matchingCourt = courts.find(c =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.location.toLowerCase().includes(query.toLowerCase())
    );

    if (matchingCourt && googleMapRef.current && matchingCourt.latitude && matchingCourt.longitude) {
      googleMapRef.current.panTo({ lat: matchingCourt.latitude, lng: matchingCourt.longitude });
      googleMapRef.current.setZoom(15);
      triggerPulse(matchingCourt.latitude, matchingCourt.longitude);
      return;
    }

    // Otherwise, use Geocoding API to find the place
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
      if (!apiKey) return;

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        if (googleMapRef.current) {
          googleMapRef.current.panTo({ lat, lng });
          googleMapRef.current.setZoom(14);
        }
      }
    } catch (err) {
      console.error('Search geocoding error:', err);
    }
  };



  useEffect(() => {
    const fetchCourts = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('courts')
          .select(`
            *,
            locations (
              id,
              address,
              city,
              latitude,
              longitude
            )
          `)
          .eq('setup_complete', true);

        if (error) throw error;

        const mappedCourts: Court[] = (data || []).map((c: any) => {
          const loc = c.locations;
          return {
            id: c.id,
            name: c.name,
            type: c.surface_type?.toLowerCase().includes('indoor') ? 'Indoor' : 'Outdoor',
            location: loc ? `${loc.address}, ${loc.city}` : 'Unknown Location',
            location_id: c.location_id,
            pricePerHour: c.base_price,
            availability: [],
            latitude: loc?.latitude,
            longitude: loc?.longitude,
            numCourts: c.num_courts,
            amenities: Array.isArray(c.amenities) ? c.amenities : [],
            imageUrl: sanitizeImageUrl(c.image_url),
            courtType: c.court_type || 'Outdoor',
            ownerId: c.owner_id,
            cleaningTimeMinutes: c.cleaning_time_minutes || 0
          };
        });
        setCourts(mappedCourts);

        // Also build locationGroups from fetched data for backward compatibility
        const locGroupMap = new Map<string, LocationGroup>();
        for (const c of data || []) {
          const loc = (c as any).locations;
          if (!loc || !c.location_id) continue;
          if (!locGroupMap.has(c.location_id)) {
            locGroupMap.set(c.location_id, {
              locationId: c.location_id,
              locationName: loc.name || '',
              address: `${loc.address}, ${loc.city}`,
              city: loc.city || '',
              latitude: loc.latitude || 14.5995,
              longitude: loc.longitude || 120.9842,
              courts: [],
              imageUrl: '',
              description: '',
              amenities: []
            });
          }
          const group = locGroupMap.get(c.location_id)!;
          group.courts.push(mappedCourts.find(mc => mc.id === c.id)!);
        }
        setLocationGroups(Array.from(locGroupMap.values()));
      } catch (err) {
        console.error('Error fetching courts:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourts();

    // Fetch locations with court counts
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('*');

        if (error) throw error;
        setLocations(data || []);
      } catch (err) {
        console.error('Error fetching locations:', err);
      }
    };
    fetchLocations();
  }, []);

  // Resolve court-level operation hours whenever selected court or date changes
  useEffect(() => {
    if (!selectedCourt) {
      setCourtEffectiveHours(null);
      return;
    }
    const resolveHours = async () => {
      const dateStr = toPhDateStr(selectedDate);
      const hours = await getEffectiveHours(
        selectedCourt.id,
        dateStr,
        selectedLocation?.opening_time,
        selectedLocation?.closing_time
      );
      setCourtEffectiveHours(hours);
    };
    resolveHours();
  }, [selectedCourt, selectedDate, selectedLocation]);

  /** Get the time slots to display, using court-level hours if available, else location hours, else default */
  const getCourtTimeSlots = useCallback((): string[] => {
    if (courtEffectiveHours && !courtEffectiveHours.is_closed) {
      return generateTimeSlots(courtEffectiveHours.open_time, courtEffectiveHours.close_time);
    }
    if (selectedLocation?.opening_time && selectedLocation?.closing_time) {
      return generateTimeSlots(selectedLocation.opening_time, selectedLocation.closing_time);
    }
    return TIME_SLOTS;
  }, [courtEffectiveHours, selectedLocation]);

  // Resolve effective hours for all courts at a location and build the location-wide slot list
  useEffect(() => {
    if (!activeLocationId || locationCourts.length === 0) {
      setLocationEffectiveHours(new Map());
      setLocationTimeSlots([]);
      return;
    }

    let cancelled = false;
    const resolveLocationHours = async () => {
      const dateStr = toPhDateStr(selectedDate);
      const hoursList = await Promise.all(
        locationCourts.map(c =>
          getEffectiveHours(
            c.id,
            dateStr,
            selectedLocation?.opening_time,
            selectedLocation?.closing_time
          )
        )
      );

      if (cancelled) return;

      const hoursMap = new Map<string, EffectiveHours>();
      const slotSet = new Set<string>();

      hoursList.forEach((hours, idx) => {
        const courtId = locationCourts[idx]?.id;
        if (!courtId) return;
        hoursMap.set(courtId, hours);
        if (!hours.is_closed) {
          generateTimeSlots(hours.open_time, hours.close_time).forEach(s => slotSet.add(s));
        }
      });

      const slots = ALL_HOUR_SLOTS.filter(s => slotSet.has(s));
      setLocationEffectiveHours(hoursMap);
      setLocationTimeSlots(slots.length > 0 ? slots : TIME_SLOTS);
    };

    resolveLocationHours();
    return () => {
      cancelled = true;
    };
  }, [locationCourts, selectedLocation, selectedDate, activeLocationId]);

  useEffect(() => {
    if (locationSelectedSlots.length === 0 || locationTimeSlots.length === 0) return;
    const filtered = locationSelectedSlots.filter(slot => locationTimeSlots.includes(slot));
    if (filtered.length !== locationSelectedSlots.length) {
      setLocationSelectedSlots(filtered);
    }
  }, [locationSelectedSlots, locationTimeSlots]);

  const toggleLocationSlotSelection = (slot: string, allSlots: string[]) => {
    setLocationSelectedSlots(prev => {
      const slotH = slotTo24(slot);

      if (prev.includes(slot)) {
        const remaining = prev.filter(s => s !== slot);
        if (remaining.length === 0) return [];
        const sorted = remaining.sort((a, b) => slotTo24(a) - slotTo24(b));
        const before = sorted.filter(s => slotTo24(s) < slotH);
        const after = sorted.filter(s => slotTo24(s) > slotH);
        return before.length >= after.length ? before : after;
      }

      if (prev.length === 0) return [slot];

      const prevHours = prev.map(slotTo24).sort((a, b) => a - b);
      const minH = prevHours[0];
      const maxH = prevHours[prevHours.length - 1];

      // Only allow adjacent selection to keep times consecutive
      if (slotH !== minH - 1 && slotH !== maxH + 1) {
        return prev;
      }

      return [...prev, slot];
    });
  };

  // Function to check court availability - extracted for reuse
  const checkCourtAvailability = async (court: Court | null, date: Date) => {
    if (!court) {
      setBlockedSlots(new Set());
      setBookedSlots(new Set());
      setUserBookedSlots(new Map());
      setShowBookingSummary(false);
      return;
    }

    setIsCheckingAvailability(true);
    const newBlockedSlots = new Set<string>();
    const newBookedSlots = new Set<string>();
    const newUserBookedSlots = new Map<string, string>();
    const targetDateStr = toPhDateStr(date);

    try {
      // 0. Auto-cancel late bookings first to free up slots immediately
      await autoCancelLateBookings();

      // Get current user for identifying their bookings
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // 1. Fetch court events (blocking events from owner)
      const { data: events } = await getCourtBlockingEvents(court.id);

      // 2. Fetch existing bookings for selected date — include player_id + status to identify user's own bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('start_time, end_time, status, player_id')
        .eq('court_id', court.id)
        .eq('date', targetDateStr)
        .not('status', 'eq', 'cancelled');

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
      }

      const bookings = bookingsData || [];

      const cleaningTimeMinutes = court.cleaningTimeMinutes || 0;

      // Check each time slot
      const slotsToCheck = getCourtTimeSlots();
      for (const slot of slotsToCheck) {
        const { start, end } = getSlotDateTime(slot, date);

        // Check against court events
        if (events) {
          for (const event of events) {
            const eventStart = new Date(event.start_datetime);
            const eventEnd = new Date(event.end_datetime);
            if (start < eventEnd && end > eventStart) {
              newBlockedSlots.add(slot);
              break;
            }
          }
        }

        // Check against existing bookings (including cleaning time buffer)
        if (bookings && bookings.length > 0) {
          for (const booking of bookings) {
            const [bHours, bMinutes] = booking.start_time.split(':').map(Number);
            const bookingStart = new Date(date);
            bookingStart.setHours(bHours, bMinutes, 0, 0);

            const [eHours, eMinutes] = booking.end_time.split(':').map(Number);
            const bookingEnd = new Date(date);
            bookingEnd.setHours(eHours, eMinutes, 0, 0);

            // Check if this slot exactly matches the booking (no cleaning buffer)
            const isExactOverlap = start < bookingEnd && end > bookingStart;

            // Check with cleaning buffer for blocking purposes
            const bookingEndWithCleaning = new Date(bookingEnd.getTime() + cleaningTimeMinutes * 60 * 1000);
            const isBlockedByCleaning = start < bookingEndWithCleaning && end > bookingStart;

            if (isExactOverlap) {
              newBookedSlots.add(slot);

              // Track if this specific slot belongs to the current user (exact match only)
              if (currentUser && booking.player_id === currentUser.id) {
                // Capitalize status: 'pending' -> 'Pending'
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

  // Recompute courtPriceRanges for all location courts based on selected date
  useEffect(() => {
    if (locationCourts.length === 0) return;
    const loadDateRanges = async () => {
      const dateStr = toPhDateStr(selectedDate);
      const slots = getCourtTimeSlots();
      const rangesMap = new Map<string, { min: number; max: number; hasRules: boolean }>();
      for (const court of locationCourts) {
        try {
          const prices = await getSlotPrices(court.id, dateStr, slots, court.pricePerHour);
          const vals = Array.from(prices.values());
          if (vals.length > 0) {
            const hasRules = vals.some(v => v !== court.pricePerHour);
            rangesMap.set(court.id, { min: Math.min(...vals), max: Math.max(...vals), hasRules: hasRules || vals.length > 0 });
          } else {
            rangesMap.set(court.id, { min: court.pricePerHour, max: court.pricePerHour, hasRules: false });
          }
        } catch {
          rangesMap.set(court.id, { min: court.pricePerHour, max: court.pricePerHour, hasRules: false });
        }
      }
      setCourtPriceRanges(rangesMap);
    };
    loadDateRanges();
  }, [locationCourts, selectedDate, selectedLocation]);

  // Check availability when a court or date is selected
  useEffect(() => {
    checkCourtAvailability(selectedCourt, selectedDate);
  }, [selectedCourt, selectedDate]);

  // Price ranges for location cards based on selected time slots
  useEffect(() => {
    if (locationCourts.length === 0 || locationSelectedSlots.length === 0) {
      setLocationSlotPriceRanges(new Map());
      return;
    }
    const loadRanges = async () => {
      const dateStr = toPhDateStr(selectedDate);
      const rangesMap = new Map<string, { min: number; max: number; hasRules: boolean }>();
      for (const court of locationCourts) {
        try {
          const prices = await getSlotPrices(court.id, dateStr, locationSelectedSlots, court.pricePerHour);
          const vals = Array.from(prices.values()) as number[];
          if (vals.length > 0) {
            const hasRules = vals.some(v => v !== court.pricePerHour);
            rangesMap.set(court.id, { min: Math.min(...vals), max: Math.max(...vals), hasRules });
          } else {
            rangesMap.set(court.id, { min: court.pricePerHour, max: court.pricePerHour, hasRules: false });
          }
        } catch {
          rangesMap.set(court.id, { min: court.pricePerHour, max: court.pricePerHour, hasRules: false });
        }
      }
      setLocationSlotPriceRanges(rangesMap);
    };
    loadRanges();
  }, [locationCourts, locationSelectedSlots, selectedDate]);

  // Fetch dynamic pricing for slots whenever court or date changes
  useEffect(() => {
    if (!selectedCourt) {
      setSlotPrices(new Map());
      setPricingRulesCache([]);
      return;
    }
    const loadPricing = async () => {
      const rules = await fetchCourtPricingRules(selectedCourt.id);
      setPricingRulesCache(rules);
      const dateStr = toPhDateStr(selectedDate);
      const slotsToPrice = getCourtTimeSlots();
      const prices = await getSlotPrices(selectedCourt.id, dateStr, slotsToPrice, selectedCourt.pricePerHour);
      setSlotPrices(prices);
    };
    loadPricing();
  }, [selectedCourt, selectedDate]);

  // Polling: Auto-refresh availability every 5 seconds for real-time updates across all players
  useEffect(() => {
    if (!selectedCourt) return;

    // Poll every 5 seconds to check for new bookings
    const pollInterval = setInterval(() => {
      checkCourtAvailability(selectedCourt, selectedDate);
    }, 5000); // 5 seconds

    // Cleanup interval when court/date changes or component unmounts
    return () => {
      clearInterval(pollInterval);
    };
  }, [selectedCourt, selectedDate]);

  // Real-time subscription to bookings - updates for ALL players when anyone books
  useEffect(() => {
    if (!selectedCourt) return;

    // Subscribe to booking changes for the selected court
    const subscription = supabase
      .channel(`bookings-${selectedCourt.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bookings',
          filter: `court_id=eq.${selectedCourt.id}`
        },
        (payload) => {
          // Refresh availability for all players viewing this court
          checkCourtAvailability(selectedCourt, selectedDate);
        }
      )
      .subscribe();

    // Cleanup subscription when court changes or component unmounts
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedCourt]);

  // Initialize the Google Map once the container is available
  useEffect(() => {
    if (isLoading || !mapRef.current || !window.google) return;

    // If map already exists and is attached to this DOM element, skip
    if (googleMapRef.current) return;

    // Use URL params for center/zoom, or default to Manila
    const center = urlLat && urlLng
      ? { lat: parseFloat(urlLat), lng: parseFloat(urlLng) }
      : userLocation
        ? { lat: userLocation.lat, lng: userLocation.lng }
        : { lat: 14.5995, lng: 121.0437 };

    const zoom = urlZoom ? parseInt(urlZoom) : (userLocation ? 13 : 12);

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      mapTypeId: 'terrain',
      styles: [
        // Base land — natural green tint
        { featureType: 'landscape.natural', elementType: 'geometry.fill', stylers: [{ color: '#dde8cd' }] },
        { featureType: 'landscape.natural.terrain', elementType: 'geometry.fill', stylers: [{ color: '#c5d6a8' }] },
        { featureType: 'landscape.natural.landcover', elementType: 'geometry.fill', stylers: [{ color: '#c8dba5' }] },
        // Man-made landscape — soft warm gray
        { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#e4e0d8' }] },
        // Water — natural blue-green
        { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#a3c8e9' }] },
        { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a7fa5' }] },
        { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#dceaf5' }, { weight: 2 }] },
        // Parks & green areas — lush green
        { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#b5d48c' }] },
        { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#4a7a2e' }] },
        // Sports complexes — vibrant green highlight
        { featureType: 'poi.sports_complex', elementType: 'geometry.fill', stylers: [{ color: '#a8cf6f' }] },
        { featureType: 'poi.sports_complex', elementType: 'labels.text.fill', stylers: [{ color: '#3d6b1f' }] },
        // Hide other POI labels for clean look
        { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
        { featureType: 'poi.business', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'poi.medical', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'poi.school', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'poi.government', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        // Roads — earthy tones
        { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#f0d9a8' }] },
        { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#c9a96e' }, { weight: 0.8 }] },
        { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#6b5a35' }] },
        { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#f5edd5' }] },
        { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#d4c49e' }, { weight: 0.5 }] },
        { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: '#f8f4ea' }] },
        { featureType: 'road.local', elementType: 'geometry.stroke', stylers: [{ color: '#e0d8c4' }, { weight: 0.3 }] },
        { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#5c5544' }] },
        { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#f5f0e6' }, { weight: 3 }] },
        // Transit — muted
        { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#dbd4c4' }] },
        { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
        // Administrative borders — earthy brown
        { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#b5a88a' }, { weight: 1.2 }] },
        { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#3a3528' }] },
        { featureType: 'administrative.province', elementType: 'labels.text.fill', stylers: [{ color: '#6b6352' }] },
        // General labels
        { elementType: 'labels.text.fill', stylers: [{ color: '#4a4639' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#f0ebe0' }, { weight: 2.5 }] },
      ],
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      tilt: 0,
    });

    googleMapRef.current = map;
    setIsMapLoaded(true);

    // Auto-center on user location if GPS is enabled
    if (userLocation && gpsEnabled) {
      setTimeout(() => {
        map.panTo({ lat: userLocation.lat, lng: userLocation.lng });
        smoothZoom(14);
      }, 500);
    }
  }, [isLoading]);

  // Auto-center when user location arrives after map is already loaded
  useEffect(() => {
    if (googleMapRef.current && userLocation && gpsEnabled && !urlLat) {
      googleMapRef.current.panTo({ lat: userLocation.lat, lng: userLocation.lng });
      smoothZoom(14);
    }
  }, [userLocation, gpsEnabled]);

  // Zoom to location and trigger pulse when arriving from homepage with locationId
  useEffect(() => {
    if (activeLocationId && urlLat && urlLng && googleMapRef.current && !isLoading) {
      const lat = parseFloat(urlLat);
      const lng = parseFloat(urlLng);
      const zoom = urlZoom ? parseInt(urlZoom) : 15;

      // Pan to the location with smooth animation
      googleMapRef.current.panTo({ lat, lng });
      smoothZoom(zoom);

      // Trigger pulse animation after a short delay
      setTimeout(() => {
        triggerPulse(lat, lng);
      }, 500);
    }
  }, [activeLocationId, urlLat, urlLng, urlZoom, isLoading]);

  // Trigger map resize when viewMode changes (fixes blank map after toggling list/map on mobile)
  // Also trigger when returning to map from court detail / schedule panels
  useEffect(() => {
    if (googleMapRef.current && window.google && viewMode === 'map') {
      setTimeout(() => {
        window.google.maps.event.trigger(googleMapRef.current, 'resize');
      }, 100);
    }
  }, [viewMode]);

  useEffect(() => {
    if (!heroActiveCourt && !selectedCourt && googleMapRef.current && window.google) {
      setTimeout(() => {
        window.google.maps.event.trigger(googleMapRef.current, 'resize');
      }, 350);
    }
  }, [heroActiveCourt, selectedCourt]);

  // Update markers whenever locations, courts, filters, or search change
  const updateMarkers = () => {
    const map = googleMapRef.current;
    if (!map || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Create markers for locations instead of individual courts (same as GuestBooking)
    locations.forEach(location => {
      if (location.latitude && location.longitude) {
        // Count courts at this location that match the filter
        const locCourts = courts.filter(c => {
          const matchesLocation = c.location_id ? c.location_id === location.id :
            c.location.toLowerCase().includes(location.name.toLowerCase());
          return matchesLocation && (filterType === 'All' || c.type === filterType);
        });

        // Only show marker if location has courts matching the filter
        if (locCourts.length === 0) return;

        const marker = new window.google.maps.Marker({
          position: { lat: location.latitude, lng: location.longitude },
          map,
          title: location.name,
          icon: {
            url: '/images/PinMarker.png',
            scaledSize: new window.google.maps.Size(42, 60),
            anchor: new window.google.maps.Point(21, 60)
          },
          opacity: 0,
        });

        // Smooth marker fade-in
        let markerOpacity = 0;
        const animateMarker = () => {
          markerOpacity += 0.04;
          marker.setOpacity(Math.min(markerOpacity, 1));
          if (markerOpacity < 1) requestAnimationFrame(animateMarker);
        };
        animateMarker();

        const locationImage = location.hero_image || location.image_url || '/images/home-images/pb2.jpg';

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="width:220px;font-family:'Inter',system-ui,sans-serif;overflow:hidden;">
              <div style="height:130px;width:100%;overflow:hidden;background:#e2e8f0;">
                <img 
                  src="${locationImage}" 
                  style="width:100%;height:100%;object-fit:cover;display:block;" 
                  alt="${location.name}" 
                />
              </div>
              <div style="padding:10px 12px 12px;">
                <h3 style="margin:0 0 4px;font-weight:900;font-size:13px;color:#0f172a;text-transform:uppercase;letter-spacing:-0.01em;line-height:1.3;">${location.name}</h3>
                <div style="display:flex;align-items:center;gap:4px;margin-bottom:8px;">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span style="font-size:11px;color:#94a3b8;font-weight:500;">${location.city}${location.address ? ', ' + location.address.split(',')[0] : ''}</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                  <span style="font-size:10px;font-weight:800;color:#2563eb;background:#eff6ff;padding:3px 8px;border-radius:6px;letter-spacing:0.3px;">${locCourts.length} ${locCourts.length === 1 ? 'COURT' : 'COURTS'}</span>
                  ${location.amenities && location.amenities.length > 0 ? `<span style="font-size:10px;color:#94a3b8;font-weight:500;">${location.amenities.slice(0, 2).join(' · ')}</span>` : ''}
                </div>
              </div>
            </div>
          `,
          disableAutoPan: true,
          maxWidth: 240
        });

        // Hide close button when InfoWindow opens
        infoWindow.addListener('domready', () => {
          const closeBtn = document.querySelector('.gm-ui-hover-effect') as HTMLElement;
          if (closeBtn) closeBtn.style.display = 'none';
          const iwOuter = document.querySelector('.gm-style-iw-c') as HTMLElement;
          if (iwOuter) {
            iwOuter.style.padding = '0';
            iwOuter.style.borderRadius = '12px';
            iwOuter.style.overflow = 'hidden';
            iwOuter.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
          }
          const iwInner = document.querySelector('.gm-style-iw-d') as HTMLElement;
          if (iwInner) {
            iwInner.style.overflow = 'hidden';
            iwInner.style.padding = '0';
          }
        });

        marker.addListener('click', () => {
                                                        setActiveLocationId(location.id);
                                                        setSelectedCourt(null);
                                                        setLocationSelectedSlots([]);
                                                        setShowLeftCalendar(false);
                                                        setShowLocationDetailHero(true);
          if (window.innerWidth < 768) {
            setViewMode('list');
          }
        });

        // Show info window on hover
        marker.addListener('mouseover', () => {
          infoWindow.open(map, marker);
        });

        // Hide info window when mouse leaves
        marker.addListener('mouseout', () => {
          infoWindow.close();
        });

        markersRef.current.push(marker);
      }
    });

    // Debug logging removed: marker count
  };

  // Re-render markers when data or filters change
  useEffect(() => {
    if (isMapLoaded && locations.length > 0) {
      updateMarkers();
    }
  }, [locations, courts, filterType, searchQuery, isMapLoaded]);

  /** Get the price for the currently selected slot (dynamic pricing aware) */
  const getSelectedSlotPrice = (): number => {
    if (!selectedCourt) return 0;
    const slot = selectedSlots[0] || null;
    if (slot && slotPrices.has(slot)) {
      const price = slotPrices.get(slot)!;
      if (price === 0) {
        const range = courtPriceRanges.get(selectedCourt.id);
        if (range?.hasRules && range.min > 0) return range.min;
      }
      return price;
    }
    const range = courtPriceRanges.get(selectedCourt.id);
    if (range?.hasRules && range.min > 0) return range.min;
    return selectedCourt.pricePerHour;
  };

  /** Get total price for ALL selected slots */
  const getSelectedSlotsTotal = (): number => {
    if (!selectedCourt || selectedSlots.length === 0) return 0;
    let total = 0;
    for (const slot of selectedSlots) {
      if (slotPrices.has(slot)) {
        const price = slotPrices.get(slot)!;
        if (price === 0) {
          const range = courtPriceRanges.get(selectedCourt.id);
          total += (range?.hasRules && range.min > 0) ? range.min : selectedCourt.pricePerHour;
        } else {
          total += price;
        }
      } else {
        const range = courtPriceRanges.get(selectedCourt.id);
        total += (range?.hasRules && range.min > 0) ? range.min : selectedCourt.pricePerHour;
      }
    }
    return total;
  };

  /** Toggle a slot in/out of the selection, ensuring all selected slots remain consecutive & available */
  const toggleSlotSelection = (slot: string, allSlots: string[], blockedSet: Set<string>, bookedSet: Set<string>) => {
    const slotH = slotTo24(slot);
    setSelectedSlots(prev => {
      // If already selected, deselect it (and any slots that would become non-consecutive)
      if (prev.includes(slot)) {
        // Remove this slot — keep only the largest consecutive group still connected
        const remaining = prev.filter(s => s !== slot);
        if (remaining.length === 0) return [];
        // Sort remaining by hour
        const sorted = remaining.sort((a, b) => slotTo24(a) - slotTo24(b));
        // Find two groups: those before the removed slot and those after
        const before = sorted.filter(s => slotTo24(s) < slotH);
        const after = sorted.filter(s => slotTo24(s) > slotH);
        // Keep the larger group (or the one that's still consecutive)
        return before.length >= after.length ? before : after;
      }
      // Adding a new slot — allow jumping to any hour and auto-fill the gap
      if (prev.length === 0) return [slot];
      const prevHours = prev.map(slotTo24).sort((a, b) => a - b);
      const minH = prevHours[0];
      const maxH = prevHours[prevHours.length - 1];

      // Check that all slots between new min and new max are available
      const newMin = Math.min(minH, slotH);
      const newMax = Math.max(maxH, slotH);
      const rangeSlots: string[] = [];
      for (let h = newMin; h <= newMax; h++) {
        const s = allSlots.find(sl => slotTo24(sl) === h);
        if (!s || blockedSet.has(s) || bookedSet.has(s)) {
          // Can't bridge — start fresh with just this slot
          return [slot];
        }
        rangeSlots.push(s);
      }
      return rangeSlots;
    });
  };

  const handleBooking = async () => {
    if (!selectedCourt || selectedSlots.length === 0) return;

    // Fetch owner payment methods before showing modal
    try {
      const { data: courtData } = await supabase
        .from('courts')
        .select('owner_id, location_id')
        .eq('id', selectedCourt.id)
        .single();
      if (courtData) {
        const { data: methods } = await supabase
          .from('court_owner_payment_methods')
          .select('*')
          .eq('owner_id', courtData.owner_id)
          .eq('is_active', true);
        const locationMethods = (methods || []).filter((m: any) => m.location_id === courtData.location_id);
        const globalMethods = (methods || []).filter((m: any) => !m.location_id);
        setOwnerPaymentMethods(locationMethods.length > 0 ? locationMethods : globalMethods);
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      setOwnerPaymentMethods([]);
    }

    setPaymentMethod(null);
    setSelectedQRMethod(null);
    setShowQRPaymentStep(false);
    setProofFile(null);
    setProofPreview(null);
    setReferenceNumber('');
    setShowPaymentModal(true);
  };

  const handleDownloadQRCode = async () => {
    if (!selectedQRMethod?.qr_code_url) return;

    const paymentLabel = selectedQRMethod.payment_type === 'gcash' ? 'gcash' : 'maya';
    const fileName = `pickleplay-${paymentLabel}-qr.png`;

    try {
      const response = await fetch(selectedQRMethod.qr_code_url);
      if (!response.ok) throw new Error('Failed to fetch QR image');

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      showToast('QR code downloaded.', 'success');
    } catch (error) {
      console.error('QR download error:', error);
      window.open(selectedQRMethod.qr_code_url, '_blank', 'noopener,noreferrer');
      showToast('Unable to auto-download. QR opened in a new tab.', 'info');
    }
  };

  const confirmBookingWithPayment = async () => {
    if (!selectedCourt || selectedSlots.length === 0 || !paymentMethod) return;

    // QR payment validation
    if ((paymentMethod === 'gcash' || paymentMethod === 'maya') && (!proofFile || !referenceNumber.trim())) {
      alert('📸 Please enter the reference number and upload your payment proof screenshot.');
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

        // 0.5 COURT OWNER CHECK - Owners cannot book their own courts (unless in Player Mode)
        const currentActiveRole = localStorage.getItem('active_role');
        if (selectedCourt.ownerId && user.id === selectedCourt.ownerId && currentActiveRole !== 'PLAYER') {
          alert('🚫 As a court owner, you cannot book your own court. Switch to Player Mode to book.');
          setIsProcessing(false);
          return;
        }

        // 1. RATE LIMITING - 30 second cooldown
        const BOOKING_COOLDOWN_MS = 30000;
        const now = Date.now();
        if (lastBookingTime && (now - lastBookingTime) < BOOKING_COOLDOWN_MS) {
          const remainingSeconds = Math.ceil((BOOKING_COOLDOWN_MS - (now - lastBookingTime)) / 1000);
          alert(`⏱️ Please wait ${remainingSeconds} seconds before making another booking.`);
          setIsProcessing(false);
          return;
        }

        // 2. USER BOOKING LIMIT - Max 5 pending bookings
        const { data: userBookings, error: userBookingsError } = await supabase
          .from('bookings')
          .select('id')
          .eq('player_id', user.id)
          .eq('status', 'pending');

        if (userBookingsError) throw userBookingsError;

        if (userBookings && userBookings.length >= 5) {
          alert('🚫 You have reached the maximum of 5 pending bookings. Please complete or cancel existing bookings first.');
          setIsProcessing(false);
          return;
        }

        // Calculate start/end time from selected slots (multi-hour support)
        const sortedSlots = [...selectedSlots].sort((a, b) => slotTo24(a) - slotTo24(b));
        const firstSlot = sortedSlots[0];
        const lastSlot = sortedSlots[sortedSlots.length - 1];
        const numHours = sortedSlots.length;

        const [time, period] = firstSlot.split(' ');
        let [hours, minutes] = time.split(':').map(Number);

        if (period === 'PM' && hours !== 12) {
          hours += 12;
        } else if (period === 'AM' && hours === 12) {
          hours = 0; // Midnight
        }

        const startDateTime = new Date(selectedDate);
        startDateTime.setHours(hours, minutes, 0, 0);

        const endDateTime = new Date(startDateTime.getTime() + numHours * 60 * 60 * 1000); // Add N hours

        const formatTime = (date: Date) => {
          const h = date.getHours().toString().padStart(2, '0');
          const m = date.getMinutes().toString().padStart(2, '0');
          const s = date.getSeconds().toString().padStart(2, '0');
          return `${h}:${m}:${s}`;
        };

        const startTimeFormatted = formatTime(startDateTime);
        const endTimeFormatted = formatTime(endDateTime);
        const targetDateStr = toPhDateStr(selectedDate);

        // 3. OVERLAP CHECK - Prevent double-booking only when times overlap
        const { data: overlappingBookings, error: checkError } = await supabase
          .from('bookings')
          .select('id')
          .eq('court_id', selectedCourt.id)
          .eq('date', targetDateStr)
          .neq('status', 'cancelled')
          .lt('start_time', endTimeFormatted)
          .gt('end_time', startTimeFormatted)
          .limit(1);

        if (checkError) throw checkError;

        if (overlappingBookings && overlappingBookings.length > 0) {
          showToast('This time slot is already booked. Please choose another time.', 'error');
          setIsProcessing(false);
          return;
        }

        // 3.5 COURT EVENT BLOCKING CHECK - Check if court owner has blocked this time
        const isBlocked = await isTimeSlotBlocked(
          selectedCourt.id,
          startDateTime.toISOString(),
          endDateTime.toISOString()
        );

        if (isBlocked) {
          alert('🚫 This time slot is unavailable. The court owner has scheduled an event during this time.');
          setIsProcessing(false);
          return;
        }

        // 4. Create Booking
        const isQRPayment = paymentMethod === 'gcash' || paymentMethod === 'maya';

        const totalPrice = getSelectedSlotsTotal();

        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            court_id: selectedCourt.id,
            player_id: user.id,
            date: targetDateStr,
            start_time: startTimeFormatted,
            end_time: endTimeFormatted,
            total_price: totalPrice,
            status: 'pending',
            payment_status: 'unpaid',
            payment_method: paymentMethod,
            payment_proof_status: isQRPayment ? 'proof_submitted' : null,
          })
          .select()
          .single();

        if (bookingError) throw bookingError;

        // Upload proof and create payment record for QR payments
        if (isQRPayment && proofFile && bookingData) {
          const proofPath = `${user.id}/${bookingData.id}_proof.png`;
          const { error: proofUploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(proofPath, proofFile, { upsert: true });

          let proofUrl = '';
          if (!proofUploadError) {
            const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(proofPath);
            proofUrl = urlData.publicUrl;
          }

          await supabase.from('booking_payments').insert({
            booking_id: bookingData.id,
            player_id: user.id,
            payment_type: paymentMethod,
            account_name: selectedQRMethod?.account_name || '',
            reference_number: referenceNumber.trim(),
            proof_image_url: proofUrl,
            amount: totalPrice,
            status: 'pending',
          });
        }

        // 2. Create Notifications
        const locationName = selectedLocation?.name || selectedCourt.location || '';
        const courtAndLocation = locationName ? `${selectedCourt.name} at ${locationName}` : selectedCourt.name;

        // 2a. Notification for the Player (booking confirmation)
        const { error: playerNotifErr } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            actor_id: user.id,
            type: 'BOOKING',
            title: 'Booking Confirmed',
            message: `You successfully booked ${courtAndLocation} on ${targetDateStr} for ${slotsToRange(sortedSlots)}. Status: Pending approval.`,
            booking_id: bookingData.id
          });

        if (playerNotifErr) {
          console.error('Player notification error:', playerNotifErr);
        } else {
          console.log('Player notification sent.');
        }

        // 2b. Notification for the Court Owner (new booking to confirm)
        if (selectedCourt.ownerId && bookingData) {
          const { error: ownerNotifErr } = await supabase
            .from('notifications')
            .insert({
              user_id: selectedCourt.ownerId,
              actor_id: user.id,
              type: 'BOOKING',
              title: 'New Booking Request',
              message: `has booked ${courtAndLocation} for ${slotsToRange(sortedSlots)} on ${targetDateStr}. Tap to review and confirm.`,
              booking_id: bookingData.id
            });

          if (ownerNotifErr) {
            console.error('Owner notification error:', ownerNotifErr);
          } else {
            console.log('Owner notification sent to:', selectedCourt.ownerId);
          }
        } else {
          console.warn('No ownerId found for this court - skipping owner notification.');
        }

        // Update cooldown timestamp
        setLastBookingTime(Date.now());

        // Update booked slots to reflect the new booking
        if (selectedSlots.length > 0) {
          setBookedSlots(prev => new Set([...prev, ...selectedSlots]));
        }

        // Fetch player name for receipt
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, full_name')
          .eq('id', user.id)
          .single();

        // Prepare receipt data
        const pricePerHour = numHours > 0 ? Math.round(totalPrice / numHours) : totalPrice;
        setReceiptData({
          id: bookingData.id,
          courtName: selectedCourt.name,
          courtLocation: selectedCourt.location,
          locationName: selectedLocation?.name || '',
          date: targetDateStr,
          startTime: startTimeFormatted,
          endTime: endTimeFormatted,
          pricePerHour: pricePerHour,
          totalPrice: totalPrice,
          playerName: profileData?.full_name || profileData?.username || 'Guest',
          status: 'pending',
          paymentMethod: paymentMethod === 'gcash' ? 'GCash' : 'Maya',
          paymentStatus: 'proof_submitted',
        });

        // Hide payment modal, show success modal
        setShowPaymentModal(false);
        setShowSuccessModal(true);
        setIsBooked(true);

        // After showing success, prepare to return to map view gracefully
        setShowBookingSummary(false);

        // Load followed players for the invite list
        setPostBookLoadingPlayers(true);
        setPostBookInviteSent([]);
        setPostBookInviteQuery('');
        const { data: followingRows } = await supabase
          .from('user_follows')
          .select('followed_id')
          .eq('follower_id', user.id);
        const followedIds = (followingRows || []).map((r: any) => r.followed_id);
        if (followedIds.length > 0) {
          const { data: followedProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .in('id', followedIds)
            .order('full_name', { ascending: true });
          setPostBookAllPlayers(followedProfiles ?? []);
        } else {
          setPostBookAllPlayers([]);
        }
        setPostBookLoadingPlayers(false);

        // Clear slot selection immediately
        setSelectedSlots([]);

        // Re-check availability so the UI updates immediately
        checkCourtAvailability(selectedCourt, selectedDate);
      } catch (err: any) {
        console.error('Booking error:', err);

        // Handle duplicate booking constraint violation
        if (err.message?.includes('unique_court_booking') || err.code === '23505') {
          alert('⚠️ This time slot was just booked by someone else. Please choose another time.');
          // Refresh availability to show updated slots
          setSelectedSlots([]);
          checkCourtAvailability(selectedCourt, selectedDate);
        } else {
          alert(`Booking failed: ${err.message}`);
        }
      } finally {
        setIsProcessing(false);
      }
  };

  const handleNearMe = () => {
    // Switch to map view first
    setViewMode('map');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!googleMapRef.current) return;

          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          // Remove existing user location marker if any
          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.setMap(null);
          }

          // Create a custom marker for user's location with a distinctive style
          const userMarker = new window.google.maps.Marker({
            position: userLoc,
            map: googleMapRef.current,
            title: 'Your Location',
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 4,
            },
            opacity: 0,
            zIndex: 999,
          });

          // Add a pulsing outer circle effect
          const pulseCircle = new window.google.maps.Marker({
            position: userLoc,
            map: googleMapRef.current,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 24,
              fillColor: '#3b82f6',
              fillOpacity: 0.3,
              strokeColor: '#3b82f6',
              strokeWeight: 2,
              strokeOpacity: 0.5,
            },
            opacity: 0,
            zIndex: 998,
          });

          // Animate user markers fade-in
          let uOpac = 0;
          const animUserMarker = () => {
            uOpac += 0.05;
            userMarker.setOpacity(Math.min(uOpac, 1));
            pulseCircle.setOpacity(Math.min(uOpac * 0.5, 0.5));
            if (uOpac < 1) requestAnimationFrame(animUserMarker);
          };
          animUserMarker();

          // Create info window for user location
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; font-family: Inter, sans-serif; text-align: center;">
                <p style="margin: 0; font-weight: 800; font-size: 14px; color: #3b82f6;">📍 You are here</p>
                <p style="margin: 4px 0 0; font-weight: 500; font-size: 11px; color: #64748b;">Your current location</p>
              </div>
            `,
            disableAutoPan: false
          });

          // Open info window immediately
          infoWindow.open(googleMapRef.current, userMarker);

          // Store reference to remove later (store both markers)
          userLocationMarkerRef.current = {
            setMap: (map: any) => {
              userMarker.setMap(map);
              pulseCircle.setMap(map);
            }
          };

          // Pan to user location and set appropriate zoom
          googleMapRef.current.panTo(userLoc);
          smoothZoom(15);
        },
        (error) => {
          console.error('Error getting location:', error);

          setTimeout(() => {
            if (googleMapRef.current) {
              const philippinesCenter = { lat: 12.8797, lng: 121.774 };
              googleMapRef.current.panTo(philippinesCenter);
              googleMapRef.current.setZoom(6);
            }
          }, 100);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setTimeout(() => {
        if (googleMapRef.current) {
          const philippinesCenter = { lat: 12.8797, lng: 121.774 };
          googleMapRef.current.panTo(philippinesCenter);
          googleMapRef.current.setZoom(6);
        }
      }, 100);
    }
  };

  const handleViewBookings = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/my-bookings');
  };

  // Add state for desktop suggestions dropdown
  const [showDesktopSuggestions, setShowDesktopSuggestions] = useState(false);
  // How-to-book guide
  const [showGuide, setShowGuide] = useState(() => localStorage.getItem('pp_guide_dismissed') !== '1');
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Filtered courts (same as GuestBooking)
  const filteredCourts = courts
    .filter(c => filterType === 'All' || c.type === filterType)
    .filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Collect all unique amenities across locations for the filter sidebar
  const allAvailableAmenities = React.useMemo(() => {
    const set = new Set<string>();
    locations.forEach(loc => {
      if (Array.isArray(loc.amenities)) loc.amenities.forEach((a: string) => set.add(a));
    });
    courts.forEach(c => {
      if (Array.isArray((c as any).amenities)) (c as any).amenities.forEach((a: string) => set.add(a));
    });
    return Array.from(set).sort();
  }, [locations, courts]);

  // Get filtered locations (grouped by location) - this is what we'll display in the list
  const filteredLocations = locations
    .filter(loc => {
      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return loc.name.toLowerCase().includes(q) ||
          loc.city.toLowerCase().includes(q) ||
          (loc.address && loc.address.toLowerCase().includes(q));
      }
      return true;
    })
    .filter(loc => {
      // Only show locations that have courts matching the filter type
      const locCourts = courts.filter(c => {
        const matchesLocation = c.location_id ? c.location_id === loc.id :
          c.location.toLowerCase().includes(loc.name.toLowerCase());
        if (!matchesLocation) return false;
        return filterType === 'All' || c.type === filterType;
      });
      if (locCourts.length === 0) return false;

      // Filter by free only
      if (filterFreeOnly) {
        const hasFree = locCourts.some((c: any) => !c.pricePerHour || c.pricePerHour === 0);
        if (!hasFree) return false;
      }

      // Filter by price range
      if (filterPriceRange[0] > 0 || filterPriceRange[1] < 2000) {
        const prices = locCourts.map((c: any) => c.pricePerHour || 0).filter((p: number) => p > 0);
        if (prices.length > 0) {
          const minP = Math.min(...prices);
          if (minP > filterPriceRange[1] || Math.max(...prices) < filterPriceRange[0]) return false;
        }
      }

      // Filter by amenities
      if (filterAmenities.length > 0) {
        const locAm = new Set<string>();
        if (Array.isArray(loc.amenities)) loc.amenities.forEach((a: string) => locAm.add(a.toLowerCase()));
        locCourts.forEach((c: any) => {
          if (Array.isArray(c.amenities)) c.amenities.forEach((a: string) => locAm.add(a.toLowerCase()));
        });
        const hasAll = filterAmenities.every(a => locAm.has(a.toLowerCase()));
        if (!hasAll) return false;
      }

      return true;
    })
    .map(loc => {
      // Add court count for each location
      const locCourts = courts.filter(c => {
        const matchesLocation = c.location_id ? c.location_id === loc.id :
          c.location.toLowerCase().includes(loc.name.toLowerCase());
        return matchesLocation && (filterType === 'All' || c.type === filterType);
      });

      // Calculate distance if user location is available
      let distance: number | undefined;
      if (userLocation && loc.latitude && loc.longitude) {
        distance = calculateDistance(userLocation.lat, userLocation.lng, loc.latitude, loc.longitude);
      }

      // Derive court type from location + courts
      const ctSet = new Set<string>();
      const rawLocCt = (loc.court_type || '').trim().toLowerCase();
      if (rawLocCt.includes('both')) { ctSet.add('Indoor'); ctSet.add('Outdoor'); }
      else if (rawLocCt.includes('outdoor')) ctSet.add('Outdoor');
      else if (rawLocCt.includes('indoor')) ctSet.add('Indoor');
      locCourts.forEach((c: any) => {
        const ct = (c.type || '').toLowerCase();
        if (ct.includes('indoor')) ctSet.add('Indoor');
        if (ct.includes('outdoor')) ctSet.add('Outdoor');
        if (ct.includes('both')) { ctSet.add('Indoor'); ctSet.add('Outdoor'); }
      });
      const derivedCourtType = ctSet.size === 0 ? 'Indoor'
        : ctSet.has('Indoor') && ctSet.has('Outdoor') ? 'Indoor / Outdoor'
          : ctSet.has('Outdoor') ? 'Outdoor' : 'Indoor';

      // Aggregate amenities
      const amenitiesSet = new Set<string>();
      if (Array.isArray(loc.amenities)) loc.amenities.forEach((a: string) => amenitiesSet.add(a));
      locCourts.forEach((c: any) => {
        if (Array.isArray(c.amenities)) c.amenities.forEach((a: string) => amenitiesSet.add(a));
      });

      // Price range computation
      const prices = locCourts.map((c: any) => c.pricePerHour || 0);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      const hasFree = prices.some((p: number) => p === 0);

      return {
        ...loc,
        court_count: locCourts.length,
        distance,
        derived_court_type: derivedCourtType,
        all_amenities: Array.from(amenitiesSet),
        min_price: minPrice,
        max_price: maxPrice,
        has_free: hasFree
      };
    });

  const locationAmenityList = React.useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(selectedLocation?.amenities)) {
      selectedLocation.amenities.forEach((a: string) => set.add(a));
    }
    locationCourts.forEach(c => {
      if (Array.isArray(c.amenities)) c.amenities.forEach(a => set.add(a));
    });
    return Array.from(set);
  }, [selectedLocation, locationCourts]);

  const locationGalleryImages = React.useMemo(() => {
    const images = new Set<string>();
    if (Array.isArray(selectedLocation?.gallery_images)) {
      selectedLocation.gallery_images.forEach((img: string) => {
        const safe = sanitizeImageUrl(img);
        if (safe) images.add(safe);
      });
    }
    if (Array.isArray(selectedLocation?.gallery)) {
      selectedLocation.gallery.forEach((img: string) => {
        const safe = sanitizeImageUrl(img);
        if (safe) images.add(safe);
      });
    }
    locationCourts.forEach(c => {
      const safe = sanitizeImageUrl(c.imageUrl);
      if (safe) images.add(safe);
    });
    // Keep hero/banner image as last-resort fallback only.
    if (images.size === 0) {
      const fallbackImage = sanitizeImageUrl(selectedLocation?.image_url) || sanitizeImageUrl(selectedLocation?.hero_image);
      if (fallbackImage) images.add(fallbackImage);
    }
    return Array.from(images);
  }, [selectedLocation, locationCourts]);

  useEffect(() => {
    if (locationGalleryImages.length === 0) {
      setGalleryIndex(0);
      return;
    }
    setGalleryIndex((idx) => Math.min(idx, locationGalleryImages.length - 1));
  }, [locationGalleryImages.length, selectedLocation]);

  // Fetch location availability whenever date or location changes
  useEffect(() => {
    if (!activeLocationId || locationCourts.length === 0 || locationTimeSlots.length === 0) return;
    const checkAllAvailability = async () => {
      setIsCheckingLocationAvailability(true);
      const result = new Map<string, { blocked: Set<string>, booked: Set<string> }>();
      const userBookedByCourt = new Map<string, Set<string>>();
      const targetDateStr = toPhDateStr(selectedDate);
  
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('court_id, start_time, end_time, status, player_id')
        .in('court_id', locationCourts.map(c => c.id))
        .eq('date', targetDateStr)
        .not('status', 'eq', 'cancelled');
      const bookings = bookingsData || [];
  
      const { data: events } = await supabase
        .from('court_events')
        .select('court_id, start_datetime, end_datetime')
        .in('court_id', locationCourts.map(c => c.id))
        .eq('blocks_bookings', true);
  
      const slotsToCheck = locationTimeSlots.length > 0
        ? locationTimeSlots
        : (selectedLocation?.opening_time && selectedLocation?.closing_time
          ? generateTimeSlots(selectedLocation.opening_time, selectedLocation.closing_time)
          : TIME_SLOTS);
  
      for (const court of locationCourts) {
        const newBlockedSlots = new Set<string>();
        const newBookedSlots = new Set<string>();
        const courtBookings = bookings.filter(b => b.court_id === court.id);
        const courtEvents = events?.filter(e => e.court_id === court.id) || [];
        const hours = locationEffectiveHours.get(court.id);
        const courtSlots = hours && !hours.is_closed
          ? generateTimeSlots(hours.open_time, hours.close_time)
          : [];
  
        for (const slot of slotsToCheck) {
           if (courtSlots.length > 0 && !courtSlots.includes(slot)) {
             newBlockedSlots.add(slot);
             continue;
           }
           const { start, end } = getSlotDateTime(slot, selectedDate);
           let isBlocked = false;
           let isBooked = false;
  
           for (const event of courtEvents) {
              const eventStart = new Date(event.start_datetime);
              const eventEnd = new Date(event.end_datetime);
              if (start < eventEnd && end > eventStart) {
                isBlocked = true; break;
              }
           }
           
           if (!isBlocked) {
             for (const b of courtBookings) {
               const [bH, bM] = b.start_time.split(':').map(Number);
               const bs = new Date(selectedDate); bs.setHours(bH, bM, 0, 0);
               const [eH, eM] = b.end_time.split(':').map(Number);
               const be = new Date(selectedDate); be.setHours(eH, eM, 0, 0);
               const isExactOverlap = start < be && end > bs;
               const beWithCleaning = new Date(be.getTime() + (court.cleaningTimeMinutes||0)*60000);
               if (start < beWithCleaning && end > bs) {
                 if (isExactOverlap && user && b.player_id === user.id) {
                   const existing = userBookedByCourt.get(court.id) || new Set<string>();
                   existing.add(slot);
                   userBookedByCourt.set(court.id, existing);
                 }
                 isBooked = true; break;
               }
             }
           }
  
           if (isBlocked) newBlockedSlots.add(slot);
           if (isBooked) newBookedSlots.add(slot);
        }
        result.set(court.id, { blocked: newBlockedSlots, booked: newBookedSlots });
      }
      setLocationAvailability(result);
      setLocationUserBookedByCourt(userBookedByCourt);
      setIsCheckingLocationAvailability(false);
    };
    checkAllAvailability();
  }, [locationCourts, selectedDate, activeLocationId, selectedLocation, locationEffectiveHours, locationTimeSlots, user]);

  return (
    <div className="md:space-y-6 animate-in fade-in duration-700 bg-white md:bg-transparent min-h-screen md:h-screen md:overflow-hidden">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
      {/* ──────────── MOBILE HEADER BAR ──────────── */}
      <div className="md:hidden sticky top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        {/* Search row */}
        <div className="px-4 pt-3 pb-2 transition-all duration-300">
          {isSearchExpanded ? (
            <div className="relative">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search courts or places..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(searchQuery);
                      setIsSearchExpanded(false);
                    }
                  }}
                  className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                />
                <button onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }} className="text-blue-600 font-bold text-xs shrink-0">
                  Cancel
                </button>
              </div>

              {/* Mobile Search Dropdown */}
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/60 z-50 max-h-[65vh] overflow-y-auto">
                {userCity && (
                  <>
                    <p className="px-4 pt-3 pb-1.5 text-[10px] font-black text-[#1E40AF] uppercase tracking-[0.15em]">Places</p>
                    <button
                      onClick={() => {
                        setSearchQuery(userCity.split(',')[0]);
                        handleSearch(userCity.split(',')[0]);
                        setIsSearchExpanded(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50/60 flex items-center gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                        <img src="/images/PinMarker.png" alt="Pin" className="w-6 h-6 object-contain" />
                      </div>
                      <span className="text-slate-800 font-semibold text-sm">{userCity}</span>
                    </button>
                  </>
                )}
                <p className="px-4 pt-3 pb-1.5 text-[10px] font-black text-[#1E40AF] uppercase tracking-[0.15em]">Courts</p>
                <div className="pb-4">
                  {locations
                    .filter(loc => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return loc.name.toLowerCase().includes(q) ||
                        loc.city.toLowerCase().includes(q) ||
                        (loc.address && loc.address.toLowerCase().includes(q));
                    })
                    .slice(0, 8)
                    .map((location) => {
                      const locCourts = courts.filter(c => c.location_id ? c.location_id === location.id : c.location.toLowerCase().includes(location.name.toLowerCase()));
                      const dist = userLocation && location.latitude && location.longitude
                        ? calculateDistance(userLocation.lat, userLocation.lng, location.latitude, location.longitude)
                        : undefined;
                      return (
                        <button
                          key={location.id}
                          onClick={() => {
                            setSearchQuery(location.name);
                            if (googleMapRef.current && location.latitude && location.longitude) {
                              googleMapRef.current.panTo({ lat: location.latitude, lng: location.longitude });
                              smoothZoom(19);
                              triggerPulse(location.latitude, location.longitude);
                            }
                                                    setActiveLocationId(location.id);
                                                    setSelectedCourt(null);
                                                    setLocationSelectedSlots([]);
                                                    setShowLeftCalendar(false);
                                                    setShowLocationDetailHero(true);
                            setViewMode('map');
                            setIsSearchExpanded(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50/60 flex items-center gap-3 transition-colors border-b border-slate-50 last:border-none"
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                            <img src="/images/PinMarker.png" alt="Pin" className="w-6 h-6 object-contain" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-800 font-semibold text-sm truncate">{location.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {locCourts.length} {locCourts.length === 1 ? 'court' : 'courts'}
                              {dist !== undefined && <span> · {dist.toFixed(1)} miles away</span>}
                              {location.city && <span> · {location.city}</span>}
                              {location.address && <span> · {location.address}</span>}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  {locations.length === 0 && (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-slate-400">No locations found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSearchExpanded(true)}
                className="flex-1 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-left hover:border-slate-300 transition-colors"
              >
                <Search size={16} className="text-slate-400 shrink-0" />
                <span className="text-sm text-slate-400 font-medium truncate">{searchQuery || 'Search courts or places...'}</span>
              </button>
              <button
                onClick={() => setShowFilters(true)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl shrink-0 transition-all relative ${(filterType !== 'All' || filterFreeOnly || filterAmenities.length > 0)
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/10' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
              >
                <SlidersHorizontal size={18} />
                {(filterType !== 'All' || filterFreeOnly || filterAmenities.length > 0) && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#a3e635] rounded-full flex items-center justify-center">
                    <span className="text-[8px] font-black text-slate-900">{(filterType !== 'All' ? 1 : 0) + (filterFreeOnly ? 1 : 0) + filterAmenities.length}</span>
                  </div>
                )}
              </button>
              <button
                onClick={() => navigate('/my-bookings')}
                className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl shrink-0 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/10"
              >
                <ClipboardList size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Back to Locations / Courts — mobile, shown when in a location detail */}
        {false && (
          <div className="px-4 pt-2 pb-2 flex items-center gap-3">
            {selectedCourt ? (
              <button
                onClick={() => { setSelectedCourt(null); setShowMobileSchedule(false); }}
                className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 hover:text-[#1E40AF] uppercase tracking-widest transition-colors group"
              >
                <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                Back to Courts
              </button>
            ) : (
              <button
                onClick={() => setActiveLocationId(null)}
                className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 hover:text-[#1E40AF] uppercase tracking-widest transition-colors group"
              >
                <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                Back to Locations
              </button>
            )}
            <span className="text-xs font-bold text-slate-600 truncate ml-auto">{selectedCourt ? selectedCourt.name : selectedLocation.name}</span>
          </div>
        )}

        {/* Mobile schedule header — shown when booking schedule is open */}
        {!isSearchExpanded && showMobileSchedule && selectedCourt && (
          <div className="px-4 pt-2 pb-2 flex items-center gap-3">
            <button
              onClick={() => setShowMobileSchedule(false)}
              className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 hover:text-[#1E40AF] uppercase tracking-widest transition-colors group"
            >
              <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              Back to Court Details
            </button>
            <span className="text-xs font-bold text-slate-600 truncate ml-auto">Select Schedule</span>
          </div>
        )}


      </div>

      {/* ──────────── MAIN CONTAINER ──────────── */}
      <div className="px-4 lg:px-6 xl:px-10 pb-10 max-w-[1400px] mx-auto">

        {/* ──────────── DESKTOP HEADER ──────────── */}
        <div className="hidden md:block mb-6 lg:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-5">
            <div>
              <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2">
                {'Courts / Live'}
              </p>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-black text-slate-950 tracking-tighter">
                <>Book a Court in <span className="text-blue-600">{(searchParams.get('loc') || userCity || 'the Philippines').split(',')[0]}</span></>
              </h1>
            </div>
            {/* My Bookings Button */}
            <button
              onClick={() => navigate('/my-bookings')}
              className="flex items-center gap-2.5 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-900/10 shrink-0"
            >
              <ClipboardList size={18} />
              My Bookings
            </button>
          </div>


        </div>

        {/* ──────────── MAIN CONTENT GRID ──────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-5 gap-6 lg:gap-7 xl:gap-8 items-start">

          {/* ═══ LEFT COLUMN ═══ */}
          <div className={`lg:col-span-2 xl:col-span-2 ${(activeLocationId || viewMode === 'list') ? 'block' : 'hidden md:block'} transition-all duration-300 md:sticky md:top-8 md:h-[calc(100vh-220px)] lg:h-[calc(100vh-240px)] md:flex md:flex-col self-start`}>
            {/* Desktop Search Bar */}
            {!hideDesktopDiscoveryControls && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(searchQuery);
                setShowDesktopSuggestions(false);
              }}
              className="hidden md:flex gap-3 mb-5 relative transition-all duration-300 opacity-100 max-h-[100px]"
            >
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1E40AF] transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Search courts by name or location..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDesktopSuggestions(true);
                    const val = e.target.value.trim();
                    if (val.length >= 3 && googleMapRef.current && window.google) {
                      const matchLoc = locations.find(l =>
                        l.name.toLowerCase().includes(val.toLowerCase()) ||
                        l.city.toLowerCase().includes(val.toLowerCase())
                      );
                      if (matchLoc && matchLoc.latitude && matchLoc.longitude) {
                        googleMapRef.current.panTo({ lat: matchLoc.latitude, lng: matchLoc.longitude });
                        smoothZoom(14);
                      }
                    }
                  }}
                  onFocus={() => setShowDesktopSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowDesktopSuggestions(false), 200)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(searchQuery);
                      setShowDesktopSuggestions(false);
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all shadow-sm"
                />

                {/* Desktop Suggestions Dropdown */}
                {showDesktopSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/50 z-50 overflow-hidden">
                    {isLoadingLocation && (
                      <div className="px-5 py-4 flex items-center gap-3 text-slate-500">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-medium">Getting your location...</span>
                      </div>
                    )}

                    {userCity && (
                      <>
                        <p className="px-5 pt-3 pb-1 text-[10px] font-black text-blue-600 uppercase tracking-[0.15em]">Places</p>
                        <button
                          type="button"
                          onClick={() => {
                            const cityName = userCity.split(',')[0];
                            setSearchQuery(cityName);
                            setShowDesktopSuggestions(false);
                            handleSearch(cityName);
                          }}
                          className="w-full text-left px-5 py-2.5 hover:bg-blue-50/60 flex items-center gap-3 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                            <img src="/images/PinMarker.png" alt="Pin" className="w-7 h-7 object-contain" />
                          </div>
                          <span className="text-slate-800 font-medium text-sm">{userCity}</span>
                        </button>
                      </>
                    )}

                    {filteredLocations.length > 0 && (
                      <>
                        <p className="px-5 pt-3 pb-1 text-[10px] font-black text-[#1E40AF] uppercase tracking-[0.15em]">Courts</p>
                        <div className="max-h-[320px] overflow-y-auto">
                          {filteredLocations.slice(0, 10).map((location) => (
                            <button
                              key={location.id}
                              type="button"
                              onClick={() => {
                                setSearchQuery(location.name);
                                setShowDesktopSuggestions(false);
                                if (googleMapRef.current && location.latitude && location.longitude) {
                                  googleMapRef.current.panTo({ lat: location.latitude, lng: location.longitude });
                                  smoothZoom(19);
                                  triggerPulse(location.latitude, location.longitude);
                                }
                                                                setActiveLocationId(location.id);
                                                                setSelectedCourt(null);
                                                                setLocationSelectedSlots([]);
                                                                setShowLeftCalendar(false);
                                                                setShowLocationDetailHero(true);
                              }}
                              className="w-full text-left px-5 py-2.5 hover:bg-blue-50/60 flex items-center gap-3 transition-colors"
                            >
                              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                                <img src="/images/PinMarker.png" alt="Pin" className="w-7 h-7 object-contain" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-slate-800 font-semibold text-sm truncate">{location.name}</p>
                                <p className="text-xs text-slate-400 truncate">
                                  {location.court_count || 0} {(location.court_count || 0) === 1 ? 'court' : 'courts'}
                                  {location.distance !== undefined && <span> · {location.distance.toFixed(1)} miles away</span>}
                                  {location.city && <span> · {location.city}</span>}
                                  {location.address && <span> · {location.address}</span>}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {!isLoadingLocation && !userCity && filteredLocations.length === 0 && (
                      <div className="px-5 py-8 text-center">
                        <MapPin size={28} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">Enable location to find nearby courts</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(true)}
                className={`flex items-center gap-2 px-5 lg:px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shrink-0 relative ${(filterType !== 'All' || filterFreeOnly || filterAmenities.length > 0)
                  ? 'bg-[#1E40AF] text-white shadow-blue-900/20 hover:bg-blue-800'
                  : 'bg-white text-slate-700 border border-slate-200 shadow-slate-200/50 hover:border-blue-300'
                  }`}
              >
                <SlidersHorizontal size={16} />
                <span>Filters</span>
                {(filterType !== 'All' || filterFreeOnly || filterAmenities.length > 0) && (
                  <div className="w-5 h-5 bg-[#a3e635] rounded-full flex items-center justify-center ml-1">
                    <span className="text-[9px] font-black text-slate-900">{(filterType !== 'All' ? 1 : 0) + (filterFreeOnly ? 1 : 0) + filterAmenities.length}</span>
                  </div>
                )}
              </button>
            </form>
            )}

            {/* ─── Navigation buttons (desktop, location detail view) ─── */}
            {false && (
              <button
                onClick={() => setActiveLocationId(null)}
                className="hidden md:flex items-center gap-1.5 text-[11px] font-black text-slate-400 hover:text-[#1E40AF] uppercase tracking-widest mb-4 transition-colors group"
              >
                <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                Back to Locations
              </button>
            )}
            {false && (
              <button
                onClick={() => setSelectedCourt(null)}
                className="hidden md:flex items-center gap-1.5 text-[11px] font-black text-slate-400 hover:text-[#1E40AF] uppercase tracking-widest mb-4 transition-colors group"
              >
                <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                Back to Courts at {selectedLocation.name}
              </button>
            )}

            {/* ─── List Container ─── */}
            <div className={`bg-white md:rounded-[32px] md:border md:border-slate-200/60 md:shadow-xl md:shadow-slate-200/40 flex flex-col flex-1 min-h-0 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500`}>

              {false ? (
                /* ─── Court Selected — Court Detail Info (left panel) ─── */
                <div className="flex-1 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="p-5 md:p-6 space-y-6">
                    {/* Court name + type badge */}
                    <div>
                      <p className="text-[10px] font-black text-[#1E40AF] uppercase tracking-[0.2em] mb-1.5">Court Details</p>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight">{selectedCourt.name}</h3>
                        <span className={`shrink-0 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${selectedCourt.type === 'Indoor' ? 'bg-blue-50 text-[#1E40AF]' : 'bg-emerald-50 text-emerald-600'}`}>
                          {selectedCourt.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mb-4">
                        <MapPin size={12} className="text-[#1E40AF] shrink-0" />
                        <span className="leading-snug">{selectedCourt.location}</span>
                      </div>
                    </div>

                    {/* Hero image with map-like appearance */}
                    <div className="rounded-[24px] overflow-hidden h-48 sm:h-56 md:h-64 relative bg-slate-100 shadow-inner group">
                      <img
                        src={selectedCourt.imageUrl || selectedLocation?.image_url || '/images/home-images/pb2.jpg'}
                        alt={selectedCourt.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </div>

                    {/* Price / Capacity / Rating / Category tiles */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-slate-100 bg-white p-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Price</p>
                        {(() => {
                          const range = courtPriceRanges.get(selectedCourt.id);
                          if (range?.hasRules) {
                            return <p className="text-lg font-black text-slate-900">{range.min === range.max ? `₱${range.min}` : `₱${range.min}–₱${range.max}`}<span className="text-[10px] font-bold text-slate-400 ml-0.5">/hr</span></p>;
                          }
                          if (selectedCourt.pricePerHour > 0) {
                            return <p className="text-lg font-black text-slate-900">₱{selectedCourt.pricePerHour}<span className="text-[10px] font-bold text-slate-400 ml-0.5">/hr</span></p>;
                          }
                          return <p className="text-sm font-bold text-slate-400 italic">Not Set</p>;
                        })()}
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Capacity</p>
                        <p className="text-lg font-black text-slate-900">{selectedCourt.numCourts ?? 1}<span className="text-[10px] font-bold text-slate-400 ml-0.5">units</span></p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Rating</p>
                        <p className="text-base font-black text-slate-900">New</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Category</p>
                        <p className="text-base font-black text-slate-900 uppercase">{selectedCourt.type}</p>
                      </div>
                    </div>

                    {/* Available Amenities */}
                    {selectedCourt.amenities && (selectedCourt.amenities as string[]).length > 0 && (
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Available Amenities</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedCourt.amenities as string[]).map((amenity, idx) => (
                            <span key={idx} className="inline-flex items-center bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold">
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cleaning Time Info */}
                    {selectedCourt.cleaningTimeMinutes > 0 && (
                      <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                        <Clock size={12} className="text-blue-600 shrink-0" />
                        <p className="text-[10px] text-blue-700 leading-relaxed">
                          <span className="font-bold">{selectedCourt.cleaningTimeMinutes >= 60 ? `${Math.floor(selectedCourt.cleaningTimeMinutes / 60)}h ${selectedCourt.cleaningTimeMinutes % 60 > 0 ? `${selectedCourt.cleaningTimeMinutes % 60}m` : ''}` : `${selectedCourt.cleaningTimeMinutes} min`} cleaning buffer</span> after each booking
                        </p>
                      </div>
                    )}

                    {/* Location Policies from Owner */}
                    {locationPolicies.length > 0 && (
                      <div className="space-y-2">
                        {locationPolicies.map((policy) => (
                          <div key={policy.id} className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Shield size={12} className="text-blue-600" />
                              <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest">{policy.title}</h4>
                            </div>
                            <div className="text-[10px] text-blue-900 font-medium leading-relaxed whitespace-pre-wrap">
                              {policy.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* PicklePlay Verified badge */}
                    <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <Shield size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">PicklePlay Verified</p>
                        <p className="text-[10px] text-emerald-600 font-medium mt-0.5">This venue undergoes monthly inspections.</p>
                      </div>
                    </div>

                    {/* Mobile Book Now button — jump straight to booking summary */}
                    <button
                      onClick={() => { setShowBookingSummary(true); setShowMobileSchedule(false); }}
                      className="w-full py-4 bg-[#1E40AF] hover:bg-blue-800 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 md:hidden"
                    >
                      <CalendarCheck size={18} />
                      Book This Court
                    </button>
                  </div>
                </div>
              ) : (
                /* ─── Location List (matching GuestBooking) ─── */
                <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">

                  {/* Location Detail Header — mobile only (desktop shows hero in right column) */}
                  {activeLocationId && selectedLocation && (
                    <div className="border-b border-slate-100 shrink-0 md:hidden">
                      {selectedLocation.image_url && (
                        <div className="relative h-28 sm:h-36 w-full">
                          <img
                            src={selectedLocation.image_url}
                            alt={selectedLocation.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute bottom-2 left-3 right-3">
                            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight drop-shadow-lg">{selectedLocation.name}</h2>
                          </div>
                        </div>
                      )}
                      <div className="p-3">
                        {!selectedLocation.image_url && (
                          <h2 className="text-lg font-black text-slate-900 tracking-tight mb-1">{selectedLocation.name}</h2>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                          <MapPin size={12} className="text-blue-500 shrink-0" />
                          <span className="font-medium truncate">{selectedLocation.address}, {selectedLocation.city}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            <img src="/images/Ball.png" alt="courts" className="w-3 h-3 object-contain" />
                            {locationCourts.length} {locationCourts.length === 1 ? 'Court' : 'Courts'}
                          </span>
                          {(courtEffectiveHours || (selectedLocation.opening_time && selectedLocation.closing_time)) && (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              <Clock size={10} />
                              {(() => {
                                const fmt = (t: string) => { const h = parseInt(t.split(':')[0], 10); return h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`; };
                                const openT = courtEffectiveHours?.open_time || selectedLocation.opening_time;
                                const closeT = courtEffectiveHours?.close_time || selectedLocation.closing_time;
                                if (courtEffectiveHours?.is_closed) return 'Closed Today';
                                return `${fmt(openT)} - ${fmt(closeT)}`;
                              })()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scrollable list */}
                  <div className="flex-1 min-h-0 px-0 md:px-1.5 py-1 md:py-1.5 space-y-1 md:space-y-1.5 overflow-y-auto overflow-x-hidden">
                    {isLoading ? (
                      Array(5).fill(0).map((_, i) => <CourtSkeleton key={i} />)
                    ) : showLeftCalendar ? (
                      <div className="flex flex-col h-full bg-white p-4 md:p-6 rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
                        {selectedLocation && (
                          <div className="mb-4 p-3 rounded-2xl border border-slate-200 bg-slate-50/80">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.18em] mb-1">Location Details</p>
                            <p className="text-lg font-black text-slate-900 leading-tight">{selectedLocation.name}</p>
                            <p className="text-xs font-semibold text-slate-500 mt-1">{selectedLocation.address}, {selectedLocation.city}</p>
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-black text-slate-700 uppercase tracking-widest">
                                <img src="/images/Ball.png" alt="courts" className="w-3 h-3 object-contain" />
                                {locationCourts.length} {locationCourts.length === 1 ? 'Court' : 'Courts'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowAmenitiesModal(true)}
                                className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-[10px] font-black text-blue-700 uppercase tracking-widest hover:bg-blue-50 transition-colors"
                              >
                                Amenities ({locationAmenityList.length})
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between mb-4">
                          <button
                            onClick={() => goToMapView()}
                            className="text-[11px] font-black text-slate-500 uppercase tracking-[0.18em] flex items-center gap-1.5 hover:text-blue-600"
                          >
                            <ChevronLeft size={14} />
                            Back to Locations
                          </button>
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.18em]">Calendar</span>
                        </div>
                        <div className="flex items-center justify-between mb-4">
                          <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1))} className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                            <ChevronLeft size={18} />
                          </button>
                          <h3 className="text-lg font-black text-slate-800 tracking-tight">
                            {currentMonthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                          </h3>
                          <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1))} className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors rotate-180">
                            <ChevronLeft size={18} />
                          </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1.5 text-center mb-3">
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <div key={day} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1.5">
                          {(() => {
                            const year = currentMonthDate.getFullYear();
                            const month = currentMonthDate.getMonth();
                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                            const firstDay = new Date(year, month, 1).getDay();
                            const cells: React.ReactNode[] = [];
                            const todayStr = toPhDateStr(getNowPH());
                            const selectedStr = toPhDateStr(selectedDate);
                            for (let i = 0; i < 42; i++) {
                              const dayNum = i - firstDay + 1;
                              if (dayNum > 0 && dayNum <= daysInMonth) {
                                const dateObj = new Date(year, month, dayNum);
                                const dateStr = toPhDateStr(dateObj);
                                const isPast = dateStr < todayStr;
                                const isSelected = dateStr === selectedStr;
                                cells.push(
                                  <button
                                    key={i}
                                    disabled={isPast}
                                                            onClick={() => { setSelectedDate(dateObj); setLocationSelectedSlots([]); }}
                                    className={`aspect-square w-full rounded-xl flex flex-col items-center justify-center transition-all ${isPast ? 'bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed' : isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 scale-105' : 'bg-white text-slate-700 border border-slate-200 hover:border-[#1E40AF] hover:text-[#1E40AF]'}`}
                                  >
                                    <span className={`text-sm font-black ${isSelected ? 'text-white' : ''}`}>{dayNum}</span>
                                  </button>
                                );
                              } else {
                                cells.push(<div key={i} className="aspect-square"></div>);
                              }
                            }

                            return cells;
                          })()}
                        </div>

                      </div>
                    ) : (
                      filteredLocations.length === 0 ? (
                        <div className="px-4 py-12 text-center">
                          <MapPin size={28} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-sm text-slate-400">No locations found</p>
                        </div>
                      ) : filteredLocations.map(location => {
                        const locStatus = location.status || (location.is_active ? 'Active' : 'Closed');
                        const isAvailable = locStatus === 'Active';
                        return (
                          <div key={location.id}>
                            <button
                              onClick={() => {
                                triggerPulse(location.latitude, location.longitude);
                                                        setActiveLocationId(location.id);
                                                        setSelectedCourt(null);
                                                        setLocationSelectedSlots([]);
                                                        setShowLeftCalendar(false);
                                                        setShowLocationDetailHero(true);
                              }}
                              className="w-full group flex flex-row rounded-none md:rounded-2xl overflow-hidden bg-white border-b md:border border-slate-100 md:shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-200 active:bg-slate-50"
                            >
                              {/* Left column — Image (fixed size) */}
                              <div className="w-28 sm:w-30 h-[118px] shrink-0 bg-slate-100 relative overflow-hidden">
                                <img
                                  src={location.hero_image || location.image_url || '/images/home-images/pb2.jpg'}
                                  alt={location.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                                {!isAvailable && (
                                  <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${locStatus === 'Closed' ? 'bg-rose-500 text-white'
                                    : locStatus === 'Maintenance' ? 'bg-blue-500 text-white'
                                      : 'bg-blue-500 text-white'
                                    }`}>{locStatus}</div>
                                )}
                                {isAvailable && (
                                  <div className="absolute top-2 left-2">
                                    <span className="bg-[#a3e635] text-slate-900 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest shadow-md shadow-lime-500/30">Available</span>
                                  </div>
                                )}
                                {/* Price range badge */}
                                <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1">
                                  {location.max_price > 0 ? (
                                    <div className="bg-white/95 backdrop-blur-sm px-1.5 py-0.5 rounded-md shadow-md">
                                      <span className="text-[10px] font-black text-slate-900">₱{location.min_price > 0 ? location.min_price : location.max_price}{location.min_price > 0 && location.min_price !== location.max_price ? `-${location.max_price}` : ''}</span><span className="text-[8px] font-semibold text-slate-400">/hr</span>
                                    </div>
                                  ) : (
                                    <div className="bg-[#a3e635] backdrop-blur-sm px-1.5 py-0.5 rounded-md shadow-md">
                                      <span className="text-[10px] font-black text-slate-900">FREE</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Right column — Details */}
                              <div className="flex-1 p-2.5 text-left flex flex-col min-w-0">
                                <p className="font-black text-slate-900 text-sm tracking-tight mb-0.5 group-hover:text-[#1E40AF] transition-colors truncate">{location.name}</p>
                                <div className="flex items-center gap-1 mb-1.5">
                                  <MapPin size={12} className="text-slate-300 shrink-0" />
                                  <p className="text-xs text-slate-400 truncate">{location.address || location.city}</p>
                                </div>

                                {/* 2x2 Details Grid */}
                                <div className="grid grid-cols-2 gap-1.5 mt-auto">
                                  <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1.5">
                                    <img src="/images/Ball.png" alt="" className="w-3.5 h-3.5 object-contain" />
                                    <span className="text-[10px] font-bold text-slate-600">{location.court_count || 0} {(location.court_count || 0) === 1 ? 'Court' : 'Courts'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1.5">
                                    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                    <span className="text-[10px] font-bold text-slate-600">{(location.court_count || 1) * 4} Players</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1.5">
                                    <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="1" /><line x1="12" y1="6" x2="12" y2="18" /><line x1="2" y1="12" x2="22" y2="12" /></svg>
                                    <span className="text-[10px] font-bold text-slate-600 truncate">{location.derived_court_type || 'Indoor'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1.5">
                                    <svg className="w-3.5 h-3.5 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                                    <span className="text-[10px] font-bold text-slate-600 truncate">
                                      {location.all_amenities && location.all_amenities.length > 0
                                        ? location.all_amenities.join(', ')
                                        : 'No Amenities'
                                      }
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ═══ RIGHT COLUMN — MAP / COURT DETAIL / SCHEDULE ═══ */}
          <div className={`lg:col-span-3 xl:col-span-3 transition-all duration-300 ${(activeLocationId || viewMode === 'list') ? 'hidden md:block' : viewMode === 'map' ? 'block' : 'hidden md:block'}`}>
            <div className="md:rounded-[32px] md:border md:border-slate-200/60 md:shadow-xl md:shadow-slate-200/40 relative md:sticky md:top-8 overflow-hidden h-[calc(100vh-200px)] sm:h-[calc(100vh-200px)] md:h-[calc(100vh-220px)] lg:h-[calc(100vh-240px)] p-2 md:p-3">

              {/* ── Map — shown when no location is selected ── */}
              <div
                className="absolute inset-0 transition-all duration-500 ease-out"
                style={{ opacity: (!activeLocationId && !selectedCourt) ? 1 : 0, transform: (!activeLocationId && !selectedCourt) ? 'scale(1)' : 'scale(1.02)', pointerEvents: (!activeLocationId && !selectedCourt) ? 'auto' : 'none' }}
              >
                {isLoading ? (
                  <div className="h-full bg-slate-50 flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#1E40AF]" size={40} />
                  </div>
                ) : (
                  <div ref={mapRef} className="h-full w-full" />
                )}
              </div>

              {/* ── Location Hero Panel — shown when location is selected but no court yet ── */}
              <div
                className="absolute inset-0 bg-white flex flex-col overflow-hidden transition-all duration-500 ease-out"
                style={{
                  opacity: (activeLocationId && selectedLocation && !selectedCourt) ? 1 : 0,
                  transform: (activeLocationId && selectedLocation && !selectedCourt) ? 'translateY(0)' : 'translateY(24px)',
                  pointerEvents: (activeLocationId && selectedLocation && !selectedCourt) ? 'auto' : 'none',
                }}
              >
                {selectedLocation && (
                  showLocationDetailHero ? (
                    <div className="relative h-full overflow-hidden">
                      <div className="absolute inset-0">
                        <img
                          src={selectedLocation.hero_image || selectedLocation.image_url || '/images/home-images/pb2.jpg'}
                          alt={selectedLocation.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/25" />
                        <div className="absolute inset-0">
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0ea5e9]/85 via-[#2563eb]/35 to-transparent mix-blend-multiply" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#a3e635]/70 via-transparent to-transparent" />
                        </div>
                      </div>
                      <div className="relative z-10 flex flex-col h-full p-6 sm:p-8 lg:p-10">
                        <div className="flex items-center justify-end mb-5">
                          <button
                            onClick={goToMapView}
                            className="px-4 py-2 rounded-xl bg-white/85 hover:bg-white text-slate-900 text-xs font-black uppercase tracking-[0.12em] shadow-md border border-white/70 transition-all"
                          >
                            Map View
                          </button>
                        </div>

                          <div className="mt-auto space-y-5">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/60">
                                <MapPin size={22} className="text-[#1E40AF]" />
                              </div>
                              <div className="text-left min-w-0">
                                <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">Venue Selected</p>
                                <p className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight truncate">{selectedLocation.name}</p>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-white/80 mt-1 truncate">
                                  <Navigation size={14} className="text-[#a3e635] shrink-0" />
                                  <span className="truncate">{selectedLocation.address}, {selectedLocation.city}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 items-start">
                            <div className="space-y-2">
                              <p className="text-[11px] font-black text-slate-200 uppercase tracking-[0.2em]">Court Galleries</p>
                              {locationGalleryImages.length > 0 ? (
                                <div className="relative group">
                                  <div
                                    ref={galleryScrollRef}
                                    onScroll={handleGalleryScroll}
                                    className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 pr-2 scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                  >
                                    {locationGalleryImages.map((img, idx) => (
                                      <div
                                        key={`${img}-${idx}`}
                                        className="relative min-w-[136px] sm:min-w-[152px] lg:min-w-[164px] h-20 sm:h-24 rounded-2xl overflow-hidden border border-white/70 shadow-lg bg-white/10 snap-start"
                                      >
                                        <img
                                          src={img}
                                          alt={`${selectedLocation.name} gallery ${idx + 1}`}
                                          className="w-full h-full object-cover cursor-zoom-in"
                                          onClick={() => {
                                            setGalleryIndex(idx);
                                            scrollToGalleryIndex(idx);
                                            openGalleryModal(img);
                                          }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                                        <button
                                          onClick={() => {
                                            setGalleryIndex(idx);
                                            scrollToGalleryIndex(idx);
                                            openGalleryModal(img);
                                          }}
                                          className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 text-slate-900 text-[11px] font-black uppercase tracking-[0.14em] shadow-sm border border-white/70 hover:bg-white"
                                        >
                                          <Maximize2 size={12} />
                                          View
                                        </button>
                                      </div>
                                    ))}
                                  </div>

                                  {locationGalleryImages.length > 1 && (
                                    <>
                                      <button
                                        onClick={goToPrevGalleryImage}
                                        className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white text-slate-800 p-2 rounded-full shadow-md border border-white/60 transition-all"
                                      >
                                        <ChevronLeft size={16} />
                                      </button>
                                      <button
                                        onClick={goToNextGalleryImage}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white text-slate-800 p-2 rounded-full shadow-md border border-white/60 transition-all"
                                      >
                                        <ChevronRight size={16} />
                                      </button>
                                    </>
                                  )}

                                  <div className="absolute bottom-1 right-3 px-2.5 py-1 rounded-full bg-black/50 text-white text-[11px] font-bold shadow-md">
                                    {galleryIndex + 1} / {locationGalleryImages.length}
                                  </div>
                                </div>
                              ) : (
                                <div className="h-24 sm:h-28 rounded-2xl border border-white/60 bg-white/10 text-white/80 flex items-center justify-center text-sm font-semibold">
                                  Court gallery coming soon
                                </div>
                              )}
                            </div>

                          </div>

                          <button
                            onClick={openLocationConfirmModal}
                            className="w-full py-4 rounded-2xl bg-[#1E40AF] hover:bg-blue-800 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 transition-all"
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                  <div className="flex flex-col h-full bg-slate-50/50">
                    {/* Top Row: Time Slots Grid */}
                    <div className="flex flex-col bg-white p-4 border-b border-slate-200 shadow-sm z-10 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="text-[#1E40AF]" size={18} />
                          <h3 className="text-lg font-black text-slate-800 tracking-tight">Total time slots of all courts</h3>
                        </div>
                        <button
                          onClick={goToMapView}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-black uppercase tracking-[0.16em] hover:bg-white border border-slate-200 shadow-sm"
                        >
                          Map View
                        </button>
                      </div>
                      <div className="flex flex-col gap-1 mb-4 shrink-0">
                        <p className="text-sm text-slate-600 font-semibold">Select a time slot to check court availability below.</p>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#a3e635]" />
                            Available
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                            Fully booked
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 overflow-y-auto pb-2 content-start pr-2 custom-scrollbar animate-in fade-in duration-300 ease-out">
                        {(() => {
                           const slots = locationTimeSlots.length > 0
                             ? locationTimeSlots
                             : (selectedLocation?.opening_time && selectedLocation?.closing_time
                               ? generateTimeSlots(selectedLocation.opening_time, selectedLocation.closing_time)
                               : TIME_SLOTS);
                           return slots.map((slot, idx) => {
                            const isSelected = locationSelectedSlots.includes(slot);
                             const isPast = isSlotInPast(slot, selectedDate);
                             
                             let availableCount = 0;
                             if (!isCheckingLocationAvailability) {
                               locationCourts.forEach(c => {
                                 const av = locationAvailability.get(c.id);
                                 if (!av?.blocked.has(slot) && !av?.booked.has(slot) && (c.status === 'Available' || c.status === 'Fully Booked')) {
                                    availableCount++;
                                 }
                               });
                             }

                             const hasAvailability = availableCount > 0;
                             const isDisabled = isPast || isCheckingLocationAvailability || !hasAvailability;
                             
                             return (
                               <button 
                                 key={`${toPhDateStr(selectedDate)}-${slot}`}
                                 disabled={isDisabled}
                                onClick={() => !isDisabled && toggleLocationSlotSelection(slot, slots)}
                                 className={`slot-lime-entrance flex flex-col items-center justify-center px-3 py-2 min-w-[108px] rounded-xl transition-all border-2 relative overflow-hidden flex-shrink-0 ${isPast ? 'bg-slate-50 border-slate-100 text-slate-300 opacity-50 cursor-not-allowed' : isCheckingLocationAvailability ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-wait' : !hasAvailability ? 'bg-rose-50 border-rose-300 text-rose-600 cursor-not-allowed' : isSelected ? 'bg-[#1E40AF] border-[#1E40AF] text-white shadow-lg shadow-blue-900/20 z-10' : 'bg-lime-50 border-lime-300 text-lime-700 hover:bg-lime-100 hover:border-lime-400'}`}
                                 style={{ animationDelay: `${idx * 45}ms` }}
                               >
                                 <span className="text-xs font-bold uppercase whitespace-nowrap">{slotToRange(slot)}</span>
                               </button>
                             );
                           });
                        })()}
                      </div>
                    </div>

                    {/* Bottom Row: Available Courts */}
                    <div className="h-[280px] shrink-0 overflow-y-hidden p-4 pt-3 relative bg-slate-50/50 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
                      {(() => {
                        const slots = locationTimeSlots.length > 0
                          ? locationTimeSlots
                          : (selectedLocation?.opening_time && selectedLocation?.closing_time
                            ? generateTimeSlots(selectedLocation.opening_time, selectedLocation.closing_time)
                            : TIME_SLOTS);
                        const todayStr = toPhDateStr(getNowPH());
                        const selectedStr = toPhDateStr(selectedDate);
                        const isSelectedDateToday = selectedStr === todayStr;
                        const allSlotsPast = slots.length > 0 && slots.every(slot => isSlotInPast(slot, selectedDate));
                        const isClosedForDay = !!courtEffectiveHours?.is_closed || (isSelectedDateToday && allSlotsPast);

                        let hasSelectableSlot = false;
                        if (!isCheckingLocationAvailability) {
                          for (const slot of slots) {
                            const isPast = isSlotInPast(slot, selectedDate);
                            if (isPast) continue;
                            let availableCount = 0;
                            locationCourts.forEach(c => {
                              const av = locationAvailability.get(c.id);
                              if (!av?.blocked.has(slot) && !av?.booked.has(slot) && (c.status === 'Available' || c.status === 'Fully Booked')) {
                                availableCount++;
                              }
                            });
                            if (availableCount > 0) {
                              hasSelectableSlot = true;
                              break;
                            }
                          }
                        }

                        const showNoSelectableState = !isCheckingLocationAvailability && locationSelectedSlots.length === 0 && !hasSelectableSlot;

                        return (
                          <>
                      <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                        <Building2 className="text-[#a3e635]" size={18} />
                        {locationSelectedSlots.length > 0
                          ? `Courts available at ${slotsToRange(locationSelectedSlots)}`
                          : isClosedForDay
                            ? 'Location closed today'
                            : 'Available courts'}
                      </h3>
                      
                      {showNoSelectableState ? (
                        <div className="flex flex-col items-center justify-center h-48 bg-white border border-slate-200 border-dashed rounded-[24px] text-center px-5">
                          <Building2 size={28} className="text-slate-300 mb-2.5" />
                          <p className="text-sm font-black text-slate-800">{selectedLocation?.name || 'Location Venue'}</p>
                          <p className="text-xs font-semibold text-slate-500 mt-0.5">
                            {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                          <p className={`text-sm font-black mt-2 ${isClosedForDay ? 'text-slate-700' : 'text-rose-500'}`}>
                            {isClosedForDay ? 'Closed' : 'Fully Booked'}
                          </p>
                          <p className="text-xs text-slate-500 font-medium mt-1 max-w-md">
                            {isClosedForDay
                              ? 'This location is already closed for today. You can advance booking for the upcoming days.'
                              : 'This location is fully booked for today. You can advance booking for the upcoming days.'}
                          </p>
                        </div>
                      ) : (
                      <div className="court-availability-grid grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300 ease-out">
                        {(() => {
                          const bookableCourts = locationCourts.filter(court =>
                            court.status === 'Available' || court.status === 'Fully Booked'
                          );

                          const availableCourts = bookableCourts.filter(court => {
                            if (locationSelectedSlots.length === 0) return true;
                            const userBookedSlotsForCourt = locationUserBookedByCourt.get(court.id);
                            if (userBookedSlotsForCourt && locationSelectedSlots.some(slot => userBookedSlotsForCourt.has(slot))) {
                              return false;
                            }
                            const av = locationAvailability.get(court.id);
                            if (!av) return false;
                            for (const slot of locationSelectedSlots) {
                              if (av.blocked.has(slot) || av.booked.has(slot)) return false;
                            }
                            return true;
                          });
                          const visibleCourtIds = new Set(availableCourts.map(c => c.id));
                          
                          if (availableCourts.length === 0 && !isCheckingLocationAvailability) {
                            return (
                              <div className="col-span-full flex flex-col items-center justify-center h-48 bg-white border border-slate-200 border-dashed rounded-[24px]">
                                 <Ban size={32} className="text-slate-300 mb-3" />
                                 <p className="text-slate-500 font-bold text-sm">
                                   {locationSelectedSlots.length > 0
                                     ? `No courts available at ${slotsToRange(locationSelectedSlots)}`
                                     : 'No available courts right now'}
                                 </p>
                              </div>
                            );
                          }
                          
                          return bookableCourts.map((court, idx) => {
                              const isVisibleForSelectedSlots = visibleCourtIds.has(court.id);
                              const shouldAnimateHide = locationSelectedSlots.length > 0 && !isVisibleForSelectedSlots;

                              return (
                              <button 
                                key={court.id}
                                onClick={() => {
                                  if (!isVisibleForSelectedSlots) return;
                                  setSelectedCourt(court);
                                  if (locationSelectedSlots.length > 0) {
                                    setSelectedSlots(locationSelectedSlots);
                                  }
                                  setHeroCourtId(null);
                                  setShowMobileSchedule(false);
                                  setShowBookingSummary(true);
                                }}
                                className={`court-sweep-entrance group flex flex-row bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-[#1E40AF] hover:shadow-xl hover:shadow-blue-900/10 transition-all duration-300 ease-out text-left h-[100px] appearance-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 active:outline-none active:ring-0 ${shouldAnimateHide ? 'opacity-0 scale-95 -translate-y-2 h-0 min-h-0 border-transparent pointer-events-none' : 'opacity-100 scale-100 translate-y-0'}`}
                                style={shouldAnimateHide ? undefined : { animationDelay: `${idx * 55}ms` }}
                              >
                                 <div className="w-[100px] h-full shrink-0 relative overflow-hidden bg-slate-100">
                                    <img src={court.imageUrl || '/images/home-images/pb2.jpg'} alt={court.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                    <span className="absolute bottom-1 right-1 bg-[#a3e635] text-slate-900 text-[8px] font-black px-1.5 py-0.5 rounded uppercase shadow-md">Available</span>
                                 </div>
                                 <div className="p-3 flex flex-col justify-center flex-1 min-w-0">
                                    <p className="font-black text-sm text-slate-900 truncate group-hover:text-[#1E40AF] transition-colors">{court.name}</p>
                                    <p className="text-[10px] font-bold text-slate-500 mb-1 truncate">{court.type}</p>
                                    <div className="mt-auto flex items-center justify-between">
                                      <p className="text-xs font-black text-[#1E40AF]">
                                        {(() => {
                                          const range = locationSlotPriceRanges.get(court.id);
                                          if (range?.hasRules && range.min !== range.max) {
                                            return `₱${range.min}–₱${range.max}/hr`;
                                          }
                                          return court.pricePerHour > 0 ? `₱${court.pricePerHour}/hr` : 'Price not set';
                                        })()}
                                      </p>
                                      <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <CheckCircle2 size={12} />
                                      </div>
                                    </div>
                                 </div>
                              </button>
                              );
                          });
                        })()}
                      </div>
                      )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  )
                )}
              </div>


              {/* ── Court Detail Panel — shown when a court card is clicked (hero preview) ── */}
              <div
                className="absolute inset-0 bg-white flex flex-col overflow-hidden transition-all duration-500 ease-out"
                style={{
                  opacity: (heroActiveCourt && selectedLocation && !selectedCourt) ? 1 : 0,
                  transform: (heroActiveCourt && selectedLocation && !selectedCourt) ? 'translateX(0)' : 'translateX(32px)',
                  pointerEvents: (heroActiveCourt && selectedLocation && !selectedCourt) ? 'auto' : 'none',
                }}
              >
                {heroActiveCourt && selectedLocation && (
                  <>
                    {/* Hero Image */}
                    <div className="relative flex-1 min-h-0">
                      <img
                        src={heroActiveCourt.imageUrl || selectedLocation.image_url || '/images/home-images/pb2.jpg'}
                        alt={heroActiveCourt.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      <div className="absolute bottom-4 left-4 right-4 z-10">
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-lg leading-tight">{heroActiveCourt.name}</h2>
                        <p className="text-xs text-white/70 font-medium mt-0.5 truncate">{selectedLocation.name}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-sm text-white border border-white/30">{heroActiveCourt.type || 'Court'}</span>
                          {typeof heroActiveCourt.numCourts === 'number' && (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-sm text-white border border-white/30">{heroActiveCourt.numCourts} {heroActiveCourt.numCourts === 1 ? 'Unit' : 'Units'}</span>
                          )}
                          {heroActiveCourt.status && heroActiveCourt.status !== 'Available' && (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-500/90 text-white">{heroActiveCourt.status}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Details + CTAs */}
                    <div className="shrink-0 flex flex-col gap-2.5 p-4 bg-white border-t border-slate-100">
                      <div className="flex gap-2">
                        <div className="flex-1 flex items-center gap-2 px-3 py-3 bg-[#1E40AF] rounded-xl text-white">
                            <Navigation size={14} className="text-[#a3e635] shrink-0" />
                            <div>
                              <p className="text-[8px] font-black text-blue-200 uppercase tracking-widest leading-none">Rate</p>
                              {(() => {
                                const range = courtPriceRanges.get(heroActiveCourt.id);
                                if (range?.hasRules) {
                                  return <p className="text-lg font-black leading-tight">{range.min === range.max ? `₱${range.min}` : `₱${range.min}–₱${range.max}`}<span className="text-[9px] font-bold text-blue-300 ml-0.5">/hr</span></p>;
                                }
                                if (heroActiveCourt.pricePerHour > 0) {
                                  return <p className="text-lg font-black leading-tight">₱{heroActiveCourt.pricePerHour}<span className="text-[9px] font-bold text-blue-300 ml-0.5">/hr</span></p>;
                                }
                                return <p className="text-sm font-bold leading-tight text-blue-300 italic">Not Set</p>;
                              })()}
                            </div>
                          </div>
                        {(courtEffectiveHours || (selectedLocation.opening_time && selectedLocation.closing_time)) && (
                          <div className="flex-1 flex items-center gap-2 px-3 py-3 bg-slate-50 rounded-xl border border-slate-100">
                            <Clock size={14} className="text-slate-400 shrink-0" />
                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Hours</p>
                              <p className="text-xs font-bold text-slate-900 leading-tight mt-0.5">
                                {courtEffectiveHours?.is_closed
                                  ? 'Closed Today'
                                  : `${courtEffectiveHours?.open_time || selectedLocation.opening_time} - ${courtEffectiveHours?.close_time || selectedLocation.closing_time}`
                                }
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      {Array.isArray(heroActiveCourt.amenities) && heroActiveCourt.amenities.length > 0 && (
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {(heroActiveCourt.amenities as string[]).slice(0, 6).map((a, i) => (
                            <span key={i} className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap shrink-0">{a}</span>
                          ))}
                          {heroActiveCourt.amenities.length > 6 && (
                            <span className="text-[10px] font-semibold text-slate-400 shrink-0">+{heroActiveCourt.amenities.length - 6}</span>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setHeroCourtId(null); }}
                          className="px-5 py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-[0.15em] active:scale-95 transition-all"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => { setSelectedCourt(heroActiveCourt); setShowBookingSummary(true); setShowMobileSchedule(false); if (locationSelectedSlots.length > 0) setSelectedSlots(locationSelectedSlots); }}
                          className="flex-1 py-4 rounded-2xl bg-[#1E40AF] hover:bg-blue-800 text-white font-black text-xs uppercase tracking-[0.15em] shadow-xl shadow-blue-900/20 active:scale-95 transition-all"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ── Booking Summary Panel ── */}
              <div
                className="absolute inset-0 h-full bg-white flex flex-col overflow-hidden z-20 border border-slate-200/80 rounded-[24px] p-3 md:p-4 gap-2.5"
                style={{
                  opacity: selectedCourt && showBookingSummary ? 1 : 0,
                  transform: selectedCourt && showBookingSummary ? 'translateY(0)' : 'translateY(24px)',
                  pointerEvents: selectedCourt && showBookingSummary ? 'auto' : 'none',
                  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {selectedCourt && showBookingSummary && (
                  <>
                    <div className="flex-1 overflow-y-auto min-h-0">
                      <div className="h-full flex flex-col gap-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">Booking Details</h3>
                            <p className="text-[11px] font-black text-[#1E40AF] uppercase tracking-[0.2em] mt-1">Review and confirm</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setShowBookingSummary(false); setSelectedCourt(null); setSelectedSlots([]); }}
                              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black text-[11px] uppercase tracking-[0.12em] transition-colors shadow-sm cursor-pointer"
                            >
                              Change Court/Time
                            </button>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-2">
                          <div className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70 shadow-sm min-h-[84px] flex flex-col justify-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Location</p>
                            <p className="text-sm font-black text-slate-900 leading-tight">{selectedLocation?.name}</p>
                            <p className="text-xs font-medium text-slate-500 truncate">{selectedLocation?.address}, {selectedLocation?.city}</p>
                          </div>
                          <div className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70 shadow-sm min-h-[84px] flex flex-col justify-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Court</p>
                            <p className="text-sm font-black text-slate-900 leading-tight">{selectedCourt.name}</p>
                            <p className="text-xs font-medium text-slate-500">{selectedCourt.type || 'Indoor/Outdoor'}</p>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-2">
                          <div className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70 shadow-sm min-h-[84px] flex flex-col justify-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Date</p>
                            <p className="text-sm font-black text-slate-900 leading-tight">{selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                          <div className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70 shadow-sm min-h-[84px] flex flex-col justify-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Hours Booked</p>
                            {selectedSlots.length > 0 ? (
                              <p className="text-sm font-black text-slate-900 leading-tight">{slotsToCompactRange(selectedSlots)}</p>
                            ) : (
                              <p className="text-sm font-semibold text-rose-500">No time selected. Pick a slot from the left panel.</p>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-h-[210px] flex flex-col gap-2">
                          {selectedLocation?.latitude && selectedLocation?.longitude && (
                            <div className="flex-1 min-h-[160px] flex flex-col gap-1.5">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Location Preview</p>
                              <div className="flex-1 min-h-[130px]">
                                <MiniMapCard lat={selectedLocation.latitude} lng={selectedLocation.longitude} heightClassName="h-full min-h-[130px]" />
                              </div>
                              {isAdvanceBooking && (
                                <div className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800">
                                  <p className="text-[10px] font-black uppercase tracking-widest">Advance Booking</p>
                                  <p className="text-xs font-semibold mt-0.5">You are about to make an advance booking for a future date.</p>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="p-2.5 rounded-2xl border border-slate-100 bg-blue-50/70 shadow-sm flex flex-wrap items-center gap-2.5">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 mb-1">Total</p>
                              <p className="text-2xl font-black text-[#1E40AF] leading-none">₱{getSelectedSlotsTotal() || 0}</p>
                              <p className="text-[10px] font-medium text-blue-600">Includes court rate and selected hours</p>
                            </div>
                            {selectedCourt.cleaningTimeMinutes ? (
                              <div className="px-3 py-2 rounded-xl bg-white text-slate-700 border border-blue-100 shadow-sm">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cleaning Buffer</p>
                                <p className="text-sm font-bold">{selectedCourt.cleaningTimeMinutes} min</p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Proceed to Book — sticky footer */}
                    <div className="shrink-0 pt-2 bg-white mt-auto">
                      {(() => {
                        const currentActiveRole = localStorage.getItem('active_role');
                        const isOwner = !!(user && selectedCourt?.ownerId && user.id === selectedCourt.ownerId && currentActiveRole !== 'PLAYER');
                        return (
                          <button
                            disabled={selectedSlots.length === 0 || isBooked || isProcessing || isOwner}
                            onClick={handleBooking}
                            className={`w-full py-5 rounded-[22px] font-black text-[13px] uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-3 ${isBooked ? 'bg-emerald-500 text-white cursor-default' : isOwner ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-[#1E40AF] hover:bg-blue-800 text-white shadow-xl shadow-blue-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                          >
                            {isProcessing ? <Loader2 className="animate-spin" size={20} /> : isBooked ? <><CheckCircle2 size={20} /> Confirmed</> : isOwner ? <><Ban size={18} /> Owner Restricted</> : selectedSlots.length > 0 ? <>{`Continue Payment — ₱${getSelectedSlotsTotal()}`} {String.fromCharCode(8594)}</> : <>Select Time Slots</>}
                          </button>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* ──────────── MOBILE BOTTOM BAR — hidden in location/court detail ──────────── */}
        {
          isMobile && !activeLocationId && (
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] safe-area-bottom">
              <div className="flex justify-center items-center gap-2 px-4 py-2.5">
                <button
                  onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-full shadow-lg active:scale-95 transition-all font-bold"
                >
                  {viewMode === 'map' ? <List size={16} /> : <MapPin size={16} />}
                  <span className="text-xs uppercase tracking-wider">{viewMode === 'map' ? 'List' : 'Map'}</span>
                </button>
                <button
                  onClick={() => setShowFilters(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-full shadow-sm active:scale-95 transition-all font-bold"
                >
                  <Funnel size={16} />
                  <span className="text-xs uppercase tracking-wider">Filters</span>
                </button>
              </div>
            </nav>
          )
        }


        {/* ──────────── GALLERY FULL-VIEW MODAL ──────────── */}
        {
          isGalleryModalOpen && galleryModalImage && ReactDOM.createPortal(
            <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6">
              <div
                className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
                onClick={closeGalleryModal}
              />
              <div className="relative w-full max-w-5xl">
                <button
                  onClick={closeGalleryModal}
                  className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-white text-slate-700 hover:text-slate-900 rounded-full p-2 shadow-lg border border-slate-200"
                >
                  <X size={18} />
                </button>
                <div className="overflow-hidden rounded-2xl shadow-2xl border border-white/20 bg-black">
                  <img src={galleryModalImage} alt="Court gallery" className="w-full h-full max-h-[80vh] object-contain bg-black" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs sm:text-sm font-semibold drop-shadow-lg pointer-events-none">
                    <span className="truncate">{selectedLocation?.name}</span>
                    <span className="text-[11px] font-bold bg-white/15 px-2 py-1 rounded-full border border-white/20">{galleryIndex + 1} / {Math.max(locationGalleryImages.length, 1)}</span>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        }


        {/* ──────────── LOCATION ENTRY CONFIRMATION MODAL — hidden when mobile schedule is open ──────────── */}
        {
          showLocationEntryModal && !locationConfirmed && !showMobileSchedule && selectedLocation && ReactDOM.createPortal(
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 sm:p-8 text-center space-y-5">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
                    <MapPin size={32} className="text-[#1E40AF]" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">You are about to book in</h2>
                    <p className="text-lg font-black text-[#1E40AF] uppercase tracking-wide">{selectedLocation.name}</p>
                    <p className="text-sm text-slate-500 font-medium">{selectedLocation.address}, {selectedLocation.city}</p>
                  </div>

                  {/* Show policies in the entry modal */}
                  {locationPolicies.length > 0 && (
                    <div className="text-left max-h-48 overflow-y-auto space-y-2">
                      {locationPolicies.map((policy) => (
                        <div key={policy.id} className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Shield size={12} className="text-blue-600" />
                            <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest">{policy.title}</h4>
                          </div>
                          <div className="text-[11px] text-blue-900 font-medium leading-relaxed whitespace-pre-wrap">
                            {policy.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <button
                      onClick={confirmLocationEntry}
                      className="w-full py-3.5 bg-[#1E40AF] hover:bg-blue-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
                    >
                      Confirm & Continue
                    </button>
                    <button
                      onClick={cancelLocationEntry}
                      className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      Go Back
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        }

        {/* ──────────── PAYMENT METHOD MODAL ──────────── */}
        {showPaymentModal && ReactDOM.createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!isProcessing) setShowPaymentModal(false); }} />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">

              {!showQRPaymentStep ? (
                <>
                  <div className="text-center space-y-1">
                    <h2 className="text-2xl font-bold text-slate-900">Payment Method</h2>
                    <p className="text-sm text-slate-500">Select how you want to pay.</p>
                  </div>

                  <div className="space-y-3">
                    {ownerPaymentMethods.map((method: any) => (
                      <button
                        key={method.id}
                        onClick={() => { setPaymentMethod(method.payment_type); setSelectedQRMethod(method); }}
                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 text-left ${
                          paymentMethod === method.payment_type && selectedQRMethod?.id === method.id
                            ? 'bg-blue-50 border-blue-500'
                            : 'bg-white border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-sm ${
                          method.payment_type === 'gcash' ? 'bg-blue-600' : 'bg-green-600'
                        }`}>
                          {method.payment_type === 'gcash' ? 'G' : 'M'}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900">{method.payment_type === 'gcash' ? 'GCash' : 'Maya'}</p>
                        </div>
                        {paymentMethod === method.payment_type && selectedQRMethod?.id === method.id && (
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white">
                            <CheckCircle2 size={14} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-all"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => {
                        setShowQRPaymentStep(true);
                      }}
                      disabled={!paymentMethod || isProcessing}
                      className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-200/50 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                      {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Next'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center space-y-1">
                    <h2 className="text-xl font-bold text-slate-900">
                      Pay via {paymentMethod === 'gcash' ? 'GCash' : 'Maya'}
                    </h2>
                    <p className="text-sm text-slate-500">Scan the QR code, then upload your proof of payment.</p>
                  </div>

                  {selectedQRMethod && (
                    <div className="bg-slate-50 rounded-xl p-4 flex flex-col items-center gap-3">
                      <div className="bg-white rounded-xl border border-slate-200 p-3 w-56 h-56">
                        <img src={selectedQRMethod.qr_code_url} alt="QR Code" className="w-full h-full object-contain" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-700">{selectedQRMethod.account_name || 'Account Name'}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                          {selectedQRMethod.payment_type === 'gcash' ? 'GCash' : 'Maya'}
                        </p>
                      </div>
                      <div className="bg-blue-50 rounded-lg px-3 py-1.5">
                        <p className="text-sm font-black text-blue-700">₱{getSelectedSlotsTotal()}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadQRCode}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-white text-blue-700 text-xs font-black uppercase tracking-[0.12em] hover:bg-blue-50 transition-colors"
                      >
                        <Download size={14} />
                        Download QR
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Reference Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. 1234567890"
                      value={referenceNumber}
                      onChange={e => setReferenceNumber(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Payment Proof Screenshot *</label>
                    <div
                      onClick={() => proofInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                    >
                      {proofPreview ? (
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <Upload size={16} className="text-blue-500" />
                          <span className="truncate max-w-[220px]">{proofPreview}</span>
                        </div>
                      ) : (
                        <>
                          <Upload size={20} className="text-slate-300" />
                          <p className="text-xs font-bold text-slate-400">Tap to upload screenshot</p>
                        </>
                      )}
                    </div>
                    <input
                      ref={proofInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setProofFile(file);
                          setProofPreview(file.name);
                        }
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowQRPaymentStep(false)}
                      className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-all"
                    >
                      Back
                    </button>
                    <button
                      onClick={confirmBookingWithPayment}
                      disabled={!proofFile || !referenceNumber.trim() || isProcessing}
                      className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-200/50 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                      {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Submit & Book'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}


        {/* ──────────── AMENITIES MODAL ──────────── */}
        {showAmenitiesModal && ReactDOM.createPortal(
          <div className="fixed inset-0 z-[141] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowAmenitiesModal(false)} />
            <div className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.16em]">Location Amenities</p>
                  <p className="text-sm font-black text-slate-900">{selectedLocation?.name || 'Venue'}</p>
                </div>
                <button
                  onClick={() => setShowAmenitiesModal(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 max-h-[55vh] overflow-y-auto">
                {locationAmenityList.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {locationAmenityList.map((amenity, idx) => (
                      <span
                        key={`${amenity}-${idx}`}
                        className="px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-slate-500">No amenities listed for this location.</p>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
        {/* ──────────── SUCCESS MODAL ──────────── */}
        {
          showSuccessModal && ReactDOM.createPortal(
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  resetToMapAfterBooking();
                }
              }}
            >
              <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 sm:p-10 text-center">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <CircleCheck size={32} className="text-emerald-500" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">Successfully Reserved!</h2>
                  <p className="text-slate-500 font-medium mb-3 leading-relaxed text-sm sm:text-base">
                    Your court time has been reserved. You can find your booking details in{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/my-bookings')}
                      className="font-black text-[#1E40AF] underline underline-offset-2 hover:text-blue-800"
                    >
                      My Bookings
                    </button>
                    .
                  </p>
                  <p className="text-[12px] font-bold text-slate-600 mb-4 leading-relaxed">
                    Court owner will verify your payment; your reservation is marked as{' '}
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-100 text-[#B8860B] uppercase tracking-wide font-black">
                      PENDING
                    </span>
                    . Your slot stays reserved while the court owner reviews your payment. Thank you!
                  </p>

                  {/* Policy Reminder after booking */}
                  {locationPolicies.length > 0 && (
                    <div className="text-left max-h-40 overflow-y-auto space-y-2 mb-4">
                      {locationPolicies.map((policy) => (
                        <div key={policy.id} className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Shield size={12} className="text-blue-600" />
                            <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest">{policy.title}</h4>
                          </div>
                          <div className="text-[11px] text-blue-900 font-medium leading-relaxed whitespace-pre-wrap">
                            {policy.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Invite Players Section (collapsed) ── */}
                  <div className="bg-violet-50/60 border border-violet-100 rounded-2xl p-4 mb-4 text-left">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <UserPlus size={16} className="text-violet-600" />
                        <span className="text-[11px] font-black text-violet-800 uppercase tracking-widest">Invite Players</span>
                      </div>
                      <button
                        onClick={() => setShowInvitePanel(prev => !prev)}
                        className="px-3 py-1.5 bg-white border border-violet-200 rounded-lg text-[11px] font-black uppercase tracking-widest text-violet-700 hover:border-violet-300 transition-colors"
                      >
                        {showInvitePanel ? 'Hide' : 'Invite'}
                      </button>
                    </div>

                    {showInvitePanel && (
                      <>
                        {postBookInviteSent.length > 0 && (
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1 mb-2">
                            <CheckCircle2 size={12} /> {postBookInviteSent.length} sent
                          </span>
                        )}

                        <div className="flex items-center gap-2 bg-white border border-violet-200 rounded-xl px-3 py-2 mb-3 focus-within:border-violet-400 transition-all">
                          <Search size={14} className="text-violet-400 shrink-0" />
                          <input
                            type="text"
                            value={postBookInviteQuery}
                            onChange={e => setPostBookInviteQuery(e.target.value)}
                            placeholder="Search followed players..."
                            className="flex-1 bg-transparent outline-none text-sm font-bold text-slate-700 placeholder:text-slate-300"
                          />
                          {postBookInviteQuery && (
                            <button onClick={() => setPostBookInviteQuery('')} className="text-slate-300 hover:text-slate-500 transition-colors">
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        <div className="max-h-[200px] overflow-y-auto space-y-1">
                          {postBookLoadingPlayers ? (
                            <div className="flex items-center justify-center py-6 gap-2">
                              <Loader2 size={16} className="animate-spin text-violet-400" />
                              <span className="text-xs font-bold text-slate-400">Loading players...</span>
                            </div>
                          ) : (() => {
                            const q = postBookInviteQuery.toLowerCase().trim();
                            const filtered = postBookAllPlayers.filter(p => {
                              if (!q) return true;
                              return (p.full_name || '').toLowerCase().includes(q) ||
                                (p.username || '').toLowerCase().includes(q);
                            });
                            if (filtered.length === 0) {
                              return (
                                <div className="text-center py-4">
                                  <p className="text-xs font-bold text-slate-400">
                                    {postBookInviteQuery
                                      ? 'No players match your search'
                                      : postBookAllPlayers.length === 0
                                        ? 'Follow players in Find Partners to invite them here'
                                        : 'No players found'}
                                  </p>
                                </div>
                              );
                            }
                            return filtered.map(player => (
                              <div key={player.id} className="flex items-center justify-between bg-white border border-violet-50 rounded-xl px-3 py-2.5 hover:border-violet-200 transition-all">
                                <div className="flex items-center gap-3 min-w-0">
                                  {player.avatar_url ? (
                                    <img src={player.avatar_url} className="w-8 h-8 rounded-lg object-cover border border-violet-100 shrink-0" alt="" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                                      <UserPlus size={14} className="text-violet-500" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-900 truncate">{player.full_name || player.username || 'Unknown'}</p>
                                    {player.username && <p className="text-[10px] text-slate-400 font-bold truncate">@{player.username}</p>}
                                  </div>
                                </div>
                                {postBookInviteSent.includes(player.id) ? (
                                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1 shrink-0 ml-2">
                                    <CheckCircle2 size={12} /> Sent
                                  </span>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      if (!receiptData?.id) return;
                                      setPostBookInviteSendingId(player.id);
                                      const result = await sendInvitation({
                                        bookingId: receiptData.id,
                                        inviteeId: player.id,
                                      });
                                      setPostBookInviteSendingId(null);
                                      if (result.success) {
                                        setPostBookInviteSent(prev => [...prev, player.id]);
                                      }
                                    }}
                                    disabled={postBookInviteSendingId === player.id}
                                    className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 disabled:opacity-50 transition-all flex items-center gap-1 shrink-0 ml-2"
                                  >
                                    {postBookInviteSendingId === player.id ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} Invite
                                  </button>
                                )}
                              </div>
                            ));
                          })()}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setShowSuccessModal(false);
                        setShowReceipt(true);
                        setPostBookInviteQuery(''); setPostBookAllPlayers([]); setPostBookInviteSent([]);
                      }}
                      className="w-full py-3.5 bg-[#1E40AF] hover:bg-blue-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
                    >
                      View My Receipt
                    </button>
                    <button
                      onClick={() => {
                        setPostBookInviteQuery(''); setPostBookAllPlayers([]); setPostBookInviteSent([]);
                        resetToMapAfterBooking();
                      }}
                      className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg"
                    >
                      Back to Booking
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        }

        {/* ──────────── FILTER SIDEBAR ──────────── */}
        {showFilters && ReactDOM.createPortal(
          <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: isFilterClosing ? 'none' : 'auto' }}>
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              style={{ transition: 'opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)', opacity: isFilterClosing ? 0 : 1 }}
              onClick={handleCloseFilters}
            />
            <div
              className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col"
              style={{ transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)', transform: isFilterClosing ? 'translateX(100%)' : 'translateX(0)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Filters</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Refine your court search</p>
                </div>
                <button onClick={handleCloseFilters} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                  <X size={18} className="text-slate-600" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                {/* Court Type */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Court Type</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['All', 'Indoor', 'Outdoor'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${filterType === type
                          ? 'bg-[#1E40AF] text-white shadow-lg shadow-blue-900/20'
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
                          }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Near Me */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Location</p>
                  <button
                    onClick={() => { handleNearMe(); handleCloseFilters(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#1E40AF] flex items-center justify-center shrink-0">
                      <Navigation size={14} className="text-white" fill="currentColor" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900">Near Me</p>
                      <p className="text-[10px] text-slate-400">Find courts closest to you</p>
                    </div>
                  </button>
                </div>

                {/* Price Range */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Price Range</p>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">₱</span>
                      <input
                        type="number"
                        min={0}
                        max={filterPriceRange[1]}
                        value={filterPriceRange[0]}
                        onChange={(e) => setFilterPriceRange([Math.max(0, Number(e.target.value)), filterPriceRange[1]])}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-8 pr-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        placeholder="Min"
                      />
                    </div>
                    <span className="text-xs text-slate-300 font-bold">—</span>
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">₱</span>
                      <input
                        type="number"
                        min={filterPriceRange[0]}
                        max={10000}
                        value={filterPriceRange[1]}
                        onChange={(e) => setFilterPriceRange([filterPriceRange[0], Math.max(filterPriceRange[0], Number(e.target.value))])}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-8 pr-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        placeholder="Max"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">₱{filterPriceRange[0]} — ₱{filterPriceRange[1]} per hour</p>
                </div>

                {/* Free Courts Toggle */}
                <div>
                  <button
                    onClick={() => setFilterFreeOnly(!filterFreeOnly)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${filterFreeOnly
                      ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                      : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${filterFreeOnly ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                        <PhilippinePeso size={16} className={filterFreeOnly ? 'text-white' : 'text-slate-400'} />
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-bold ${filterFreeOnly ? 'text-emerald-700' : 'text-slate-700'}`}>Free Courts Only</p>
                        <p className="text-[10px] text-slate-400">Show locations with free courts</p>
                      </div>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-all relative ${filterFreeOnly ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all ${filterFreeOnly ? 'left-[22px]' : 'left-0.5'}`} />
                    </div>
                  </button>
                </div>

                {/* Amenities */}
                {allAvailableAmenities.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Amenities</p>
                    <div className="grid grid-cols-2 gap-2">
                      {allAvailableAmenities.map(amenity => {
                        const isSelected = filterAmenities.includes(amenity);
                        return (
                          <button
                            key={amenity}
                            onClick={() => {
                              setFilterAmenities(prev =>
                                isSelected ? prev.filter(a => a !== amenity) : [...prev, amenity]
                              );
                            }}
                            className={`text-left px-3 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center gap-2 ${isSelected
                              ? 'bg-[#1E40AF] text-white shadow-md shadow-blue-900/20'
                              : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'
                              }`}
                          >
                            <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-white/20 border-white/40' : 'border-slate-300'}`}>
                              {isSelected && <CheckCircle2 size={10} className="text-white" />}
                            </div>
                            <span className="truncate">{amenity}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 px-5 py-3 flex items-center gap-3">
                <button
                  onClick={() => {
                    setFilterType('All');
                    setFilterPriceRange([0, 2000]);
                    setFilterFreeOnly(false);
                    setFilterAmenities([]);
                  }}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={handleCloseFilters}
                  className="flex-1 py-3 rounded-xl bg-[#1E40AF] text-white text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition-colors"
                >
                  Show Results ({filteredLocations.length})
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ──────────── RECEIPT MODAL ──────────── */}
        {
          showReceipt && receiptData && (
            <Receipt
              bookingData={receiptData}
              onClose={() => {
                setShowReceipt(false);
                setIsBooked(false);
                setSelectedSlots([]);
                setSelectedCourt(null);
                setSelectedLocation(null);
                navigate('/booking');
              }}
            />
          )
        }

      </div>
    </div>
  );
};

export default Booking;
