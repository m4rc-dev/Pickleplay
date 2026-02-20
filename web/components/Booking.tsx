import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, DollarSign, Clock, CheckCircle2, Loader2, Filter, Search, Navigation, AlertCircle, Ban, CircleCheck, List, Funnel, X, ChevronLeft, Building2, ClipboardList, Receipt as ReceiptIcon, Shield } from 'lucide-react';
import { Court } from '../types';
import { CourtSkeleton } from './ui/Skeleton';
import { supabase } from '../services/supabase';
import { isTimeSlotBlocked, getCourtBlockingEvents } from '../services/courtEvents';
import { autoCancelLateBookings, checkDailyBookingLimit } from '../services/bookings';
import Receipt from './Receipt';
import { getLocationPolicies, LocationPolicy } from '../services/policies';

// Always use hourly slots for simplicity
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

/** Get current date/time in Philippine Time */
const getNowPH = (): Date => {
  const nowUtc = new Date();
  // Convert to PH time by formatting then parsing
  const phStr = nowUtc.toLocaleString('en-US', { timeZone: PH_TIMEZONE });
  return new Date(phStr);
};

/** Format a Date to 'YYYY-MM-DD' using Philippine Time */
const toPhDateStr = (date: Date): string => {
  // Use Intl to get the PH date parts
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: PH_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
  return formatter.format(date); // returns 'YYYY-MM-DD'
};

/** Check if a time slot is in the past based on Philippine Time */
const isSlotInPast = (slot: string, selectedDate: Date): boolean => {
  const nowPH = getNowPH();
  const todayPH = toPhDateStr(new Date());
  const selectedPH = toPhDateStr(selectedDate);

  // If selected date is in the future, no slots are in the past
  if (selectedPH > todayPH) return false;
  // If selected date is in the past, ALL slots are in the past
  if (selectedPH < todayPH) return true;

  // Same day — compare the slot time to current PH time
  const [time, period] = slot.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  else if (period === 'AM' && hours === 12) hours = 0;

  const currentPHHour = nowPH.getHours();
  const currentPHMinute = nowPH.getMinutes();

  // Slot is in the past if the slot start hour has already passed
  return hours < currentPHHour || (hours === currentPHHour && minutes <= currentPHMinute);
};

// Helper to convert time slot string to Date
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

const Booking: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
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
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [filterType, setFilterType] = useState<'All' | 'Indoor' | 'Outdoor'>('All');
  const isMobile = window.innerWidth < 768;
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
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  // Accordion state for courts list (expand details inline without leaving page)
  const [expandedCourtId, setExpandedCourtId] = useState<string | null>(null);
  // Hero expansion: when a court is clicked, animate it to the top header area
  const [heroCourtId, setHeroCourtId] = useState<string | null>(null);
  // Derived: the court object currently shown in the full-panel hero
  const heroActiveCourt = heroCourtId ? (locationCourts.find(c => c.id === heroCourtId) ?? null) : null;
  // Map of slot time -> booking status for slots booked by the CURRENT user on this court+date
  const [userBookedSlots, setUserBookedSlots] = useState<Map<string, string>>(new Map());

  // Location entry confirmation & policies
  const [showLocationEntryModal, setShowLocationEntryModal] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [pendingLocationId, setPendingLocationId] = useState<string | null>(null);
  const [locationPolicies, setLocationPolicies] = useState<LocationPolicy[]>([]);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);


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
      console.log('User state in Booking component:', user);
      setUser(user);
      setIsUserLoading(false);
    });

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user);
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

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const userLocationMarkerRef = useRef<any>(null);
  const pulseCirclesRef = useRef<any[]>([]);

  const triggerPulse = (lat: number, lng: number) => {
    if (!googleMapRef.current || !window.google) return;

    // Clear existing pulse circles if any
    pulseCirclesRef.current.forEach(c => c.setMap(null));
    pulseCirclesRef.current = [];

    const pulseCircle = new window.google.maps.Circle({
      strokeColor: '#a3e635', // lime-400
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#a3e635',
      fillOpacity: 0.35,
      map: googleMapRef.current,
      center: { lat, lng },
      radius: 10,
      zIndex: 1000,
    });

    pulseCirclesRef.current.push(pulseCircle);

    let radius = 10;
    const maxRadius = 300;
    const step = 20;

    const interval = setInterval(() => {
      radius += step;
      if (pulseCircle.getMap()) {
        pulseCircle.setRadius(radius);
        pulseCircle.setOptions({
          fillOpacity: 0.35 * (1 - radius / maxRadius),
          strokeOpacity: 0.8 * (1 - radius / maxRadius)
        });
      }

      if (radius >= maxRadius) {
        clearInterval(interval);
        pulseCircle.setMap(null);
        pulseCirclesRef.current = pulseCirclesRef.current.filter(c => c !== pulseCircle);
      }
    }, 25);
  };

  // Sync search query state with URL search params
  useEffect(() => {
    const q = searchParams.get('q') || searchParams.get('court') || '';
    setSearchQuery(q); // Sync ONLY q, loc stays out of search bar
  }, [searchParams]);

  // Fetch location detail + its courts when locationId is in URL
  useEffect(() => {
    if (!urlLocationId) {
      setSelectedLocation(null);
      setLocationCourts([]);
      return;
    }

    const fetchLocationDetail = async () => {
      setIsLoadingLocationDetail(true);
      try {
        // Fetch location info
        const { data: locData, error: locError } = await supabase
          .from('locations')
          .select('*')
          .eq('id', urlLocationId)
          .single();

        if (locError) throw locError;
        setSelectedLocation(locData);

        // Fetch location policies
        setIsLoadingPolicies(true);
        const policyResult = await getLocationPolicies(urlLocationId);
        if (policyResult.data) {
          setLocationPolicies(policyResult.data);
        }
        setIsLoadingPolicies(false);

        // Show location entry modal
        if (!locationConfirmed || pendingLocationId !== urlLocationId) {
          setPendingLocationId(urlLocationId);
          setShowLocationEntryModal(true);
          setLocationConfirmed(false);
        }

        // Fetch courts belonging to this location
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
          .eq('location_id', urlLocationId);

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
            imageUrl: c.image_url,
            courtType: c.court_type || 'Outdoor',
            ownerId: c.owner_id,
            cleaningTimeMinutes: c.cleaning_time_minutes || 0,
            status: c.status || 'Available'
          };
        });
        setLocationCourts(mappedCourts);
      } catch (err) {
        console.error('Error fetching location detail:', err);
      } finally {
        setIsLoadingLocationDetail(false);
      }
    };

    fetchLocationDetail();
  }, [urlLocationId]);

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
          `);

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
            imageUrl: c.image_url,
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

  // Function to check court availability - extracted for reuse
  const checkCourtAvailability = async (court: Court | null, date: Date) => {
    if (!court) {
      setBlockedSlots(new Set());
      setBookedSlots(new Set());
      setUserBookedSlots(new Map());
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

      // 0.5 Check daily booking limit (1 booking per player per day per court location)
      const courtLocationId = court.location_id || court.locationId;
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { hasReachedLimit } = await checkDailyBookingLimit(currentUser.id, targetDateStr, courtLocationId);
        setDailyLimitReached(hasReachedLimit);
        if (hasReachedLimit) {
          setSelectedSlot(null);
        }
      } else {
        setDailyLimitReached(false);
      }

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
      const slotsToCheck = selectedLocation?.opening_time && selectedLocation?.closing_time
        ? generateTimeSlots(selectedLocation.opening_time, selectedLocation.closing_time)
        : TIME_SLOTS;
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

  // Check availability when a court or date is selected
  useEffect(() => {
    checkCourtAvailability(selectedCourt, selectedDate);
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
          console.log('Booking change detected:', payload);
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
        map.setZoom(14);
      }, 500);
    }
  }, [isLoading]);

  // Auto-center when user location arrives after map is already loaded
  useEffect(() => {
    if (googleMapRef.current && userLocation && gpsEnabled && !urlLat) {
      googleMapRef.current.panTo({ lat: userLocation.lat, lng: userLocation.lng });
      googleMapRef.current.setZoom(14);
    }
  }, [userLocation, gpsEnabled]);

  // Zoom to location and trigger pulse when arriving from homepage with locationId
  useEffect(() => {
    if (urlLocationId && urlLat && urlLng && googleMapRef.current && !isLoading) {
      const lat = parseFloat(urlLat);
      const lng = parseFloat(urlLng);
      const zoom = urlZoom ? parseInt(urlZoom) : 15;

      // Pan to the location with smooth animation
      googleMapRef.current.panTo({ lat, lng });
      googleMapRef.current.setZoom(zoom);

      // Trigger pulse animation after a short delay
      setTimeout(() => {
        triggerPulse(lat, lng);
      }, 500);
    }
  }, [urlLocationId, urlLat, urlLng, urlZoom, isLoading]);

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
        });

        const locationImage = location.hero_image || location.image_url || 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=400&h=260';

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
          navigate(`/booking?locationId=${location.id}&lat=${location.latitude}&lng=${location.longitude}&zoom=19&loc=${encodeURIComponent(location.city)}`);
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

    console.log(`📍 Displaying ${markersRef.current.length} location markers on map`);
  };

  // Re-render markers when data or filters change
  useEffect(() => {
    if (isMapLoaded && locations.length > 0) {
      updateMarkers();
    }
  }, [locations, courts, filterType, searchQuery, isMapLoaded]);

  const handleBooking = async () => {
    if (selectedCourt && selectedSlot) {
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

        // 1.5 DAILY BOOKING LIMIT - Max 1 hour per player per day per court location (Philippine Time)
        const courtLocId = selectedCourt.location_id || selectedCourt.locationId;
        const targetDateStr_check = toPhDateStr(selectedDate);
        const { hasReachedLimit } = await checkDailyBookingLimit(user.id, targetDateStr_check, courtLocId);
        if (hasReachedLimit) {
          alert('🚫 You already have a booking at this court location for today. Each player is limited to 1 booking per court location per day.');
          setDailyLimitReached(true);
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

        // Calculate end time (assuming 1 hour slot)
        const [time, period] = selectedSlot.split(' ');
        let [hours, minutes] = time.split(':').map(Number);

        if (period === 'PM' && hours !== 12) {
          hours += 12;
        } else if (period === 'AM' && hours === 12) {
          hours = 0; // Midnight
        }

        const startDateTime = new Date(selectedDate);
        startDateTime.setHours(hours, minutes, 0, 0);

        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Add 1 hour

        const formatTime = (date: Date) => {
          const h = date.getHours().toString().padStart(2, '0');
          const m = date.getMinutes().toString().padStart(2, '0');
          const s = date.getSeconds().toString().padStart(2, '0');
          return `${h}:${m}:${s}`;
        };

        const startTimeFormatted = formatTime(startDateTime);
        const endTimeFormatted = formatTime(endDateTime);
        const targetDateStr = toPhDateStr(selectedDate);

        // 3. DUPLICATE SLOT CHECK - Prevent double-booking
        const { data: existingBooking, error: checkError } = await supabase
          .from('bookings')
          .select('id')
          .eq('court_id', selectedCourt.id)
          .eq('date', targetDateStr)
          .neq('status', 'cancelled')
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingBooking) {
          alert('⚠️ This time slot is already booked. Please choose another time.');
          setIsProcessing(false);
          return;
        }

        // 3.5 FINAL DAILY LIMIT GUARD — scoped to this court location
        const guardLocationId = selectedCourt.location_id || selectedCourt.locationId;
        let guardQuery = supabase
          .from('bookings')
          .select('id, courts!inner(location_id)')
          .eq('player_id', user.id)
          .eq('date', targetDateStr)
          .neq('status', 'cancelled');

        if (guardLocationId) {
          guardQuery = guardQuery.eq('courts.location_id', guardLocationId);
        }

        const { data: playerDayBookings, error: playerDayError } = await guardQuery;

        if (playerDayError) {
          console.error('Daily limit guard query failed:', playerDayError);
          alert('🚫 Could not verify your booking limit for this location. Please try again.');
          setIsProcessing(false);
          return;
        }

        if (playerDayBookings && playerDayBookings.length > 0) {
          console.log('DAILY LIMIT GUARD: Player already has', playerDayBookings.length, 'booking(s) at this location on', targetDateStr);
          alert('🚫 You already have a booking at this court location for today. Each player is limited to 1 booking per court location per day.');
          setDailyLimitReached(true);
          setSelectedSlot(null);
          setIsProcessing(false);
          return;
        }

        // 3.6. COURT EVENT BLOCKING CHECK - Check if court owner has blocked this time
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
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            court_id: selectedCourt.id,
            player_id: user.id,
            date: targetDateStr,
            start_time: startTimeFormatted,
            end_time: endTimeFormatted,
            total_price: selectedCourt.pricePerHour,
            status: 'pending',
            payment_status: 'unpaid',
            payment_method: 'cash'
          })
          .select()
          .single();

        if (bookingError) throw bookingError;

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
            message: `You successfully booked ${courtAndLocation} on ${targetDateStr} for ${slotToRange(selectedSlot)}. Status: Pending approval.`,
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
              message: `has booked ${courtAndLocation} for ${slotToRange(selectedSlot)} on ${targetDateStr}. Tap to review and confirm.`,
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

        // Player just used their daily 1-hour limit
        setDailyLimitReached(true);

        // Update booked slots to reflect the new booking
        if (selectedSlot) {
          setBookedSlots(prev => new Set([...prev, selectedSlot]));
        }

        // Fetch player name for receipt
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, full_name')
          .eq('id', user.id)
          .single();

        // Prepare receipt data
        setReceiptData({
          id: bookingData.id,
          courtName: selectedCourt.name,
          courtLocation: selectedCourt.location,
          locationName: selectedLocation?.name || '',
          date: targetDateStr,
          startTime: startTimeFormatted,
          endTime: endTimeFormatted,
          pricePerHour: selectedCourt.pricePerHour,
          totalPrice: selectedCourt.pricePerHour,
          playerName: profileData?.full_name || profileData?.username || 'Guest',
          status: 'pending'
        });

        // Show success modal first
        setShowSuccessModal(true);
        setIsBooked(true);

        // Clear slot selection immediately
        setSelectedSlot(null);

        // Re-check availability and daily limit so the UI updates immediately
        checkCourtAvailability(selectedCourt, selectedDate);
      } catch (err: any) {
        console.error('Booking error:', err);

        // Handle duplicate booking constraint violation
        if (err.message?.includes('unique_court_booking') || err.code === '23505') {
          alert('⚠️ This time slot was just booked by someone else. Please choose another time.');
          // Refresh availability to show updated slots
          setSelectedSlot(null);
          checkCourtAvailability(selectedCourt, selectedDate);
        } else {
          alert(`Booking failed: ${err.message}`);
        }
      } finally {
        setIsProcessing(false);
      }
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
            animation: window.google.maps.Animation.DROP,
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
            zIndex: 998,
          });

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
          googleMapRef.current.setZoom(15);
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

  // Filtered courts (same as GuestBooking)
  const filteredCourts = courts
    .filter(c => filterType === 'All' || c.type === filterType)
    .filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
      return locCourts.length > 0;
    })
    .map(loc => {
      // Add court count for each location
      const locCourts = courts.filter(c => {
        const matchesLocation = c.location_id ? c.location_id === loc.id :
          c.location.toLowerCase().includes(loc.name.toLowerCase());
        return matchesLocation && (filterType === 'All' || c.type === filterType);
      });
      return {
        ...loc,
        court_count: locCourts.length
      };
    });

  return (
    <div className="md:space-y-10 animate-in fade-in duration-700">
      {/* ──────────── MOBILE HEADER BAR ──────────── */}
      <div className="md:hidden sticky top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        {/* Search row */}
        <div className="px-4 pt-3 pb-2">
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
                    <p className="px-4 pt-3 pb-1.5 text-[10px] font-black text-blue-600 uppercase tracking-[0.15em]">Places</p>
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
                <p className="px-4 pt-3 pb-1.5 text-[10px] font-black text-blue-600 uppercase tracking-[0.15em]">Courts</p>
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
                    .map((location) => (
                      <button
                        key={location.id}
                        onClick={() => {
                          setSearchQuery(location.name);
                          if (googleMapRef.current && location.latitude && location.longitude) {
                            googleMapRef.current.panTo({ lat: location.latitude, lng: location.longitude });
                            googleMapRef.current.setZoom(19);
                            triggerPulse(location.latitude, location.longitude);
                          }
                          navigate(`/booking?locationId=${location.id}&lat=${location.latitude}&lng=${location.longitude}&zoom=19&loc=${encodeURIComponent(location.city)}`);
                          setViewMode('map');
                          setIsSearchExpanded(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50/60 flex items-center gap-3 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                          <img src="/images/PinMarker.png" alt="Pin" className="w-6 h-6 object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-900 font-semibold text-sm truncate">{location.name}</p>
                          <p className="text-xs text-slate-400 truncate">{location.city} · {location.court_count || 0} court{location.court_count !== 1 ? 's' : ''}</p>
                        </div>
                      </button>
                    ))}
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
                onClick={() => navigate('/my-bookings')}
                className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl shrink-0 hover:bg-blue-700 transition-colors"
              >
                <ClipboardList size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Filter pills row */}
        {!isSearchExpanded && (
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
            {(['All', 'Indoor', 'Outdoor'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filterType === type
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200/50'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-300'
                  }`}
              >
                {type}
              </button>
            ))}
            <button
              onClick={handleNearMe}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-lime-400 text-slate-950 border border-lime-300 hover:bg-lime-500 transition-all"
            >
              <Navigation size={12} fill="currentColor" />
              Near Me
            </button>
          </div>
        )}
      </div>

      {/* ──────────── MAIN CONTAINER ──────────── */}
      <div className="pb-0 md:pb-10">

        {/* ──────────── DESKTOP HEADER ──────────── */}
        <div className="hidden md:block mb-6 lg:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-5">
            <div>
              <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2">
                {urlLocationId && selectedLocation ? 'Location / Detail' : 'Courts / Live'}
              </p>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-black text-slate-950 tracking-tighter">
                {urlLocationId && selectedLocation
                  ? <>Book a <span className="text-blue-600">Court at {selectedLocation.name}.</span></>
                  : <>Book a <span className="text-blue-600">Court in {(searchParams.get('loc') || userCity || 'the Philippines').split(',')[0]}.</span></>
                }
              </h1>
            </div>
            {/* My Bookings Button */}
            <button
              onClick={() => navigate('/my-bookings')}
              className="flex items-center gap-2.5 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-200/50 shrink-0"
            >
              <ClipboardList size={18} />
              My Bookings
            </button>
          </div>

          {/* Desktop Filter Pills */}
          <div className="flex gap-2">
            {(['All', 'Indoor', 'Outdoor'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-6 lg:px-8 py-2.5 lg:py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-200 ${filterType === type
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-400 hover:text-blue-600'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* ──────────── MAIN CONTENT GRID ──────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-5 gap-0 lg:gap-6 xl:gap-8 items-start">

          {/* ═══ LEFT COLUMN ═══ */}
          <div className={`lg:col-span-2 xl:col-span-2 ${viewMode === 'map' ? 'hidden md:block' : 'block'} transition-all duration-300`}>
            {/* Desktop Search Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(searchQuery);
                setShowDesktopSuggestions(false);
              }}
              className="hidden md:flex gap-3 mb-5 relative"
            >
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
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
                        googleMapRef.current.setZoom(14);
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
                        <p className="px-5 pt-3 pb-1 text-[10px] font-black text-blue-600 uppercase tracking-[0.15em]">Courts</p>
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
                                  googleMapRef.current.setZoom(19);
                                  triggerPulse(location.latitude, location.longitude);
                                }
                                navigate(`/booking?locationId=${location.id}&lat=${location.latitude}&lng=${location.longitude}&zoom=19&loc=${encodeURIComponent(location.city)}`);
                              }}
                              className="w-full text-left px-5 py-2.5 hover:bg-blue-50/60 flex items-center gap-3 transition-colors"
                            >
                              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                                <img src="/images/PinMarker.png" alt="Pin" className="w-7 h-7 object-contain" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-slate-800 font-semibold text-sm truncate">{location.name}</p>
                                <p className="text-xs text-slate-400 truncate">
                                  {location.court_count || 0} {location.court_count === 1 ? 'court' : 'courts'}
                                  {location.city && <span> · {location.city}</span>}
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
                onClick={handleNearMe}
                className="flex items-center gap-2 px-5 lg:px-6 py-3 bg-lime-400 text-slate-950 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-lime-500 transition-all shadow-lg shadow-lime-400/20 shrink-0"
              >
                <Navigation size={16} fill="currentColor" />
                <span>Near Me</span>
              </button>
            </form>

            {/* ─── Back button for court detail view ─── */}
            {heroActiveCourt && !selectedCourt && (
              <button
                onClick={() => { setHeroCourtId(null); navigate('/booking'); }}
                className="hidden md:flex items-center gap-1.5 text-slate-500 text-xs font-bold hover:text-blue-600 transition-colors mb-3"
              >
                <ChevronLeft size={14} />
                Back to Locations
              </button>
            )}

            {/* ─── List Container ─── */}
            <div className="bg-white md:bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm overflow-hidden flex flex-col h-[calc(100vh-190px)] sm:h-[calc(100vh-190px)] md:h-[calc(100vh-280px)] lg:h-[calc(100vh-300px)]">

              {selectedCourt ? (
                /* ─── Court Selected — Court Detail Info (left panel) ─── */
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4 md:p-4 space-y-4">
                    {/* Back button — returns to court detail, not all the way to list */}
                    <button
                      onClick={() => setSelectedCourt(null)}
                      className="flex items-center gap-1.5 text-slate-500 text-xs font-bold hover:text-blue-600 transition-colors"
                    >
                      <ChevronLeft size={14} />
                      Back to {selectedCourt.name}
                    </button>

                    {/* Court name + type badge */}
                    <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Court Details</p>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{selectedCourt.name}</h3>
                        <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase ${selectedCourt.type === 'Indoor' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {selectedCourt.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-4">
                        <MapPin size={12} className="text-blue-500 shrink-0" />
                        <span className="leading-snug">{selectedCourt.location}</span>
                      </div>
                    </div>

                    {/* Hero image with map-like appearance */}
                    <div className="rounded-2xl overflow-hidden h-48 sm:h-56 md:h-64 relative bg-slate-100">
                      <img
                        src={selectedCourt.imageUrl || selectedLocation?.image_url || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=800'}
                        alt={selectedCourt.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </div>

                    {/* Price / Capacity / Rating / Category tiles */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-slate-100 bg-white p-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Price</p>
                        {selectedCourt.pricePerHour > 0 ? (
                          <p className="text-lg font-black text-slate-900">₱{selectedCourt.pricePerHour}<span className="text-[10px] font-bold text-slate-400 ml-0.5">/hr</span></p>
                        ) : (
                          <p className="text-lg font-black text-emerald-500">FREE</p>
                        )}
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
                          <div key={policy.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Shield size={12} className="text-amber-600" />
                              <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest">{policy.title}</h4>
                            </div>
                            <div className="text-[10px] text-amber-900 font-medium leading-relaxed whitespace-pre-wrap">
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
                  </div>
                </div>
              ) : (
                /* ─── Location List (matching GuestBooking) ─── */
                <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">

                  {/* Location Detail Header — no back button, court detail panel has its own */}
                  {urlLocationId && selectedLocation && (
                    <div className="border-b border-slate-100 shrink-0">
                      {selectedLocation.image_url && (
                        <div className="relative h-28 sm:h-36 md:h-44 w-full">
                          <img
                            src={selectedLocation.image_url}
                            alt={selectedLocation.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute bottom-2 left-3 right-3 md:bottom-3 md:left-4 md:right-4">
                            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight leading-tight drop-shadow-lg">{selectedLocation.name}</h2>
                          </div>
                        </div>
                      )}

                      <div className="p-3 md:p-4">
                        {!selectedLocation.image_url && (
                          <>
                            <h2 className="text-lg font-black text-slate-900 tracking-tight mb-1">{selectedLocation.name}</h2>
                          </>
                        )}
                        <div className="flex items-center gap-1.5 text-xs md:text-sm text-slate-500 mb-2">
                          <MapPin size={12} className="text-blue-500 shrink-0" />
                          <span className="font-medium truncate">{selectedLocation.address}, {selectedLocation.city}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md md:rounded-lg text-[10px] md:text-[11px] font-bold">
                            <Building2 size={10} />
                            {locationCourts.length} {locationCourts.length === 1 ? 'Court' : 'Courts'}
                          </span>
                          {(() => {
                            const locStatus = selectedLocation.status || (selectedLocation.is_active ? 'Active' : 'Closed');
                            const statusStyle = locStatus === 'Active' ? 'bg-emerald-50 text-emerald-700'
                              : locStatus === 'Closed' ? 'bg-rose-50 text-rose-600'
                                : locStatus === 'Maintenance' ? 'bg-amber-50 text-amber-600'
                                  : 'bg-blue-50 text-blue-600';
                            return (
                              <span className={`inline-flex items-center px-2 py-0.5 md:px-2.5 md:py-1 rounded-md md:rounded-lg text-[10px] md:text-[11px] font-bold ${statusStyle}`}>
                                {locStatus}
                              </span>
                            );
                          })()}
                          {selectedLocation.amenities && selectedLocation.amenities.length > 0 && (
                            selectedLocation.amenities.slice(0, 3).map((amenity: string, i: number) => (
                              <span key={i} className="inline-flex items-center bg-slate-100 text-slate-600 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md md:rounded-lg text-[10px] md:text-[11px] font-bold">
                                {amenity}
                              </span>
                            ))
                          )}
                          {selectedLocation.opening_time && selectedLocation.closing_time && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md md:rounded-lg text-[10px] md:text-[11px] font-bold">
                              <Clock size={10} />
                              {(() => {
                                const fmt = (t: string) => { const h = parseInt(t.split(':')[0], 10); return h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`; };
                                return `${fmt(selectedLocation.opening_time)} - ${fmt(selectedLocation.closing_time)}`;
                              })()}
                            </span>
                          )}
                        </div>
                        {selectedLocation.description && (
                          <p className="text-xs md:text-sm text-slate-500 mt-1.5 leading-relaxed line-clamp-1 md:line-clamp-2">{selectedLocation.description}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {isLoadingLocationDetail && urlLocationId && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="animate-spin text-blue-600" size={28} />
                    </div>
                  )}

                  {/* Section title */}
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                    <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {urlLocationId && selectedLocation
                        ? `Courts at ${selectedLocation.name} (${locationCourts.length})`
                        : `${filteredLocations.length} Court${filteredLocations.length !== 1 ? 's' : ''} in ${(searchParams.get('loc') || userCity || 'the Philippines').split(',')[0]}`
                      }
                    </h2>
                  </div>

                  {/* Scrollable list */}
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {isLoading || isLoadingLocationDetail ? (
                      Array(5).fill(0).map((_, i) => <CourtSkeleton key={i} />)
                    ) : urlLocationId ? (
                      locationCourts.length === 0 ? (
                        <div className="px-4 py-12 text-center">
                          <p className="text-sm text-slate-400">No courts found at this location</p>
                        </div>
                      ) : (() => {
                        const locStatus = selectedLocation?.status || (selectedLocation?.is_active ? 'Active' : 'Closed');
                        const isLocationAvailable = locStatus === 'Active';
                        return locationCourts.map(court => {
                          const courtSt = court.status || 'Available';
                          const isCourtAvailable = isLocationAvailable && (courtSt === 'Available' || courtSt === 'Fully Booked');
                          const isFullyBooked = courtSt === 'Fully Booked';
                          const courtStatusLabel = !isLocationAvailable ? locStatus : courtSt !== 'Available' ? courtSt : '';
                          const courtStatusStyle = courtSt === 'Fully Booked' ? 'bg-orange-50 text-orange-500'
                            : courtSt === 'Coming Soon' ? 'bg-blue-50 text-blue-500'
                              : courtSt === 'Maintenance' ? 'bg-amber-50 text-amber-500'
                                : locStatus === 'Closed' ? 'bg-rose-50 text-rose-500'
                                  : locStatus === 'Maintenance' ? 'bg-amber-50 text-amber-500'
                                    : 'bg-blue-50 text-blue-500';
                          return (
                            <div key={court.id} className="w-full">
                              <button
                                onClick={() => { if (!isCourtAvailable) return; setHeroCourtId(court.id); }}
                                aria-expanded={expandedCourtId === court.id}
                                disabled={!isCourtAvailable}
                                className={`w-full group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 transition-all duration-200 ${isCourtAvailable ? 'hover:bg-blue-50/40 cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                              >
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0 relative">
                                  <img
                                    src={court.imageUrl || `https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=200&h=200`}
                                    alt={court.name}
                                    className={`w-full h-full object-cover transition-transform duration-300 ${isCourtAvailable ? 'group-hover:scale-105' : 'grayscale'}`}
                                  />
                                  {!isCourtAvailable && (
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                      <Ban size={20} className="text-white" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                  <p className={`font-bold text-sm tracking-tight mb-1 line-clamp-1 ${isCourtAvailable ? 'text-slate-900 group-hover:text-blue-600 transition-colors' : 'text-slate-400'}`}>{court.name}</p>
                                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                    <span className="text-[11px] font-medium text-slate-400">🎾 {court.numCourts} Units</span>
                                    {courtStatusLabel && (
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${courtStatusStyle}`}>{courtStatusLabel}</span>
                                    )}
                                  </div>
                                </div>
                                {isCourtAvailable && !isFullyBooked && (
                                  <ChevronLeft
                                    size={16}
                                    className={`text-slate-300 rotate-180 shrink-0 transition-all ${expandedCourtId === court.id ? 'translate-x-0 text-blue-500' : 'group-hover:text-blue-400'}`}
                                  />
                                )}
                              </button>
                              {expandedCourtId === court.id && (
                                <div className="px-4 pb-4 -mt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                                  <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 sm:p-5">
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Details</span>
                                      <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{court.type}</span>
                                      {typeof court.numCourts === 'number' && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">{court.numCourts} Units</span>
                                      )}
                                      {Array.isArray(court.amenities) && court.amenities.slice(0, 3).map((a, i) => (
                                        <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-600">{a}</span>
                                      ))}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        onClick={() => navigate(`/court/${court.id}`)}
                                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-widest shadow-md shadow-blue-200/50 active:scale-95 transition-all"
                                      >
                                        View Schedule
                                      </button>
                                      {isFullyBooked && (
                                        <button
                                          onClick={() => navigate(`/court/${court.id}?advance=true`)}
                                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-black uppercase tracking-widest shadow-md shadow-orange-200/50 hover:from-orange-600 hover:to-amber-600 active:scale-95 transition-all"
                                        >
                                          Book Future Dates
                                        </button>
                                      )}
                                      <button
                                        onClick={() => setExpandedCourtId(null)}
                                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all"
                                      >
                                        Close
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {isFullyBooked && isLocationAvailable && (
                                <div className="px-4 pb-3 -mt-1">
                                  <button
                                    onClick={() => navigate(`/court/${court.id}?advance=true`)}
                                    className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg shadow-orange-200/50 flex items-center justify-center gap-2"
                                  >
                                    📅 Book Future Dates
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()
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
                          <button
                            key={location.id}
                            onClick={() => {
                              if (googleMapRef.current && location.latitude && location.longitude) {
                                googleMapRef.current.panTo({ lat: location.latitude, lng: location.longitude });
                                googleMapRef.current.setZoom(19);
                                triggerPulse(location.latitude, location.longitude);
                              }
                              navigate(`/booking?locationId=${location.id}&lat=${location.latitude}&lng=${location.longitude}&zoom=19&loc=${encodeURIComponent(location.city)}`);
                            }}
                            className="w-full group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-blue-50/40 transition-all duration-200"
                          >
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0 relative">
                              <img
                                src={location.hero_image || location.image_url || `https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=200&h=200`}
                                alt={location.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              {!isAvailable && (
                                <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${locStatus === 'Closed' ? 'bg-rose-500 text-white'
                                  : locStatus === 'Maintenance' ? 'bg-amber-500 text-white'
                                    : 'bg-blue-500 text-white'
                                  }`}>{locStatus}</div>
                              )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="font-bold text-slate-900 text-sm tracking-tight mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">{location.name}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                                  <MapPin size={11} className="text-blue-400" /> {location.city}
                                </span>
                                <span className="text-[11px] font-medium text-slate-400">
                                  🎾 {location.court_count} Court{location.court_count !== 1 ? 's' : ''}
                                </span>
                                {isAvailable ? (
                                  <span className="text-[10px] font-bold text-emerald-500">● Available</span>
                                ) : (
                                  <span className={`text-[10px] font-bold ${locStatus === 'Closed' ? 'text-rose-500'
                                    : locStatus === 'Maintenance' ? 'text-amber-500'
                                      : 'text-blue-500'
                                    }`}>● {locStatus}</span>
                                )}
                              </div>
                            </div>
                            <ChevronLeft size={16} className="text-slate-300 rotate-180 shrink-0 group-hover:text-blue-400 transition-colors" />
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ═══ RIGHT COLUMN — MAP / COURT DETAIL / SCHEDULE ═══ */}
          <div className={`lg:col-span-3 xl:col-span-3 transition-all duration-300 hidden md:block`}>
            <div className="md:rounded-2xl md:border md:border-slate-200 md:shadow-sm overflow-hidden relative md:sticky md:top-8 h-[calc(100vh-200px)] sm:h-[calc(100vh-200px)] md:h-[calc(100vh-220px)] lg:h-[calc(100vh-240px)]">

              {/* ── Map — always in DOM so Google Maps never loses its container ── */}
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{ opacity: (!heroActiveCourt && !selectedCourt) ? 1 : 0, pointerEvents: (!heroActiveCourt && !selectedCourt) ? 'auto' : 'none' }}
              >
                {isLoading ? (
                  <div className="h-full bg-slate-100 flex items-center justify-center">
                    <Loader2 className="animate-spin text-blue-600" size={40} />
                  </div>
                ) : (
                  <div ref={mapRef} className="h-full w-full" />
                )}
              </div>

              {/* ── Court Detail Panel ── */}
              <div
                className="absolute inset-0 bg-white flex flex-col overflow-hidden transition-all duration-300"
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
                        src={heroActiveCourt.imageUrl || selectedLocation.image_url || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=800'}
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
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-orange-500/90 text-white">{heroActiveCourt.status}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Details + CTAs */}
                    <div className="shrink-0 flex flex-col gap-2.5 p-4 bg-white">
                      <div className="flex gap-2">
                        {heroActiveCourt.pricePerHour != null && (
                          <div className="flex-1 flex items-center gap-2 px-3 py-3 bg-slate-900 rounded-xl text-white">
                            <Navigation size={14} className="text-blue-400 shrink-0" />
                            <div>
                              <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest leading-none">Rate</p>
                              {heroActiveCourt.pricePerHour > 0 ? (
                                <p className="text-lg font-black leading-tight">₱{heroActiveCourt.pricePerHour}<span className="text-[9px] font-bold text-slate-400 ml-0.5">/hr</span></p>
                              ) : (
                                <p className="text-lg font-black leading-tight text-emerald-400">FREE</p>
                              )}
                            </div>
                          </div>
                        )}
                        {selectedLocation.opening_time && selectedLocation.closing_time && (
                          <div className="flex-1 flex items-center gap-2 px-3 py-3 bg-amber-50 rounded-xl border border-amber-100">
                            <Clock size={14} className="text-amber-600 shrink-0" />
                            <div>
                              <p className="text-[8px] font-black text-amber-700 uppercase tracking-widest leading-none">Hours</p>
                              <p className="text-xs font-bold text-amber-900 leading-tight mt-0.5">{selectedLocation.opening_time} - {selectedLocation.closing_time}</p>
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
                          onClick={() => { setSelectedCourt(heroActiveCourt); }}
                          className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest shadow-md shadow-blue-200/50 active:scale-[0.98] transition-all"
                        >
                          View Schedule &amp; Book
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ── Select Schedule Panel ── */}
              <div
                className="absolute inset-0 bg-white flex flex-col overflow-hidden transition-all duration-300"
                style={{
                  opacity: selectedCourt ? 1 : 0,
                  transform: selectedCourt ? 'translateX(0)' : 'translateX(32px)',
                  pointerEvents: selectedCourt ? 'auto' : 'none',
                }}
              >
                {selectedCourt && (
                  <>
                    <div className="flex-1 overflow-y-auto">
                      <div className="p-5 space-y-5">
                        <div>
                          <h3 className="text-xl font-black text-slate-900 tracking-tight">Select Schedule</h3>
                          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">When will you be playing?</p>
                        </div>

                        {/* Future booking notice */}
                        {(() => {
                          const nowPH = getNowPH();
                          const todayStr = toPhDateStr(nowPH);
                          const selectedStr = toPhDateStr(selectedDate);
                          if (selectedStr !== todayStr) {
                            return (
                              <div className="flex items-start gap-2.5 p-3 bg-orange-50 rounded-xl border border-orange-200">
                                <CalendarIcon size={14} className="text-orange-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Booking for Future Dates</p>
                                  <p className="text-[10px] text-orange-600 font-medium mt-0.5">
                                    You're booking for <span className="font-bold">{selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>. Make sure you pick the correct date.
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Date Selection */}
                        <div>
                          <div className="flex items-center justify-between mb-2.5">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                              <CalendarIcon size={14} className="text-blue-600" />
                              Choose Date
                            </h4>
                            <button className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
                              <CalendarIcon size={10} />
                              {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </button>
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: 7 }).map((_, i) => {
                              const nowPH = getNowPH();
                              const date = new Date(nowPH);
                              date.setDate(date.getDate() + i);
                              const dateStr = toPhDateStr(date);
                              const selectedStr = toPhDateStr(selectedDate);
                              const isSelected = selectedStr === dateStr;
                              const dayName = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: PH_TIMEZONE });
                              const dayNum = date.getDate();
                              return (
                                <button
                                  key={i}
                                  onClick={() => { setSelectedDate(date); setSelectedSlot(null); setDailyLimitReached(false); }}
                                  className={`flex flex-col items-center py-2.5 rounded-xl transition-all duration-200 ${isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-200/50' : 'bg-slate-50 text-slate-400 hover:bg-white hover:shadow-sm'}`}
                                >
                                  <span className={`text-[8px] font-bold uppercase mb-0.5 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>{dayName.slice(0, 3)}</span>
                                  <span className="text-sm font-black tracking-tighter">{dayNum}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Time Slots */}
                        {selectedCourt.status === 'Coming Soon' || selectedCourt.status === 'Maintenance' ? (
                          <div className={`text-center py-8 rounded-2xl border ${selectedCourt.status === 'Coming Soon' ? 'bg-blue-50/50 border-blue-100' : 'bg-amber-50/50 border-amber-100'}`}>
                            <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center text-xl ${selectedCourt.status === 'Coming Soon' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                              {selectedCourt.status === 'Coming Soon' ? '🔜' : '🔧'}
                            </div>
                            <h4 className={`text-sm font-black uppercase tracking-wide mb-1 ${selectedCourt.status === 'Coming Soon' ? 'text-blue-700' : 'text-amber-700'}`}>{selectedCourt.status}</h4>
                            <p className="text-[10px] text-slate-500 font-medium max-w-[200px] mx-auto leading-relaxed">
                              {selectedCourt.status === 'Coming Soon' ? 'This court is not yet available for booking.' : 'This court is currently under maintenance.'}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Clock size={14} className="text-blue-600" />
                                Choose Slot
                              </h4>
                              {isCheckingAvailability && (
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Loader2 size={10} className="animate-spin" /> Checking...
                                </span>
                              )}
                            </div>
                            {dailyLimitReached && (
                              <div className="mb-2.5 p-2.5 bg-orange-50 rounded-xl border border-orange-200 flex items-start gap-2">
                                <AlertCircle size={14} className="text-orange-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-orange-700 leading-relaxed font-medium">
                                  You've already booked <span className="font-bold">1 hour</span> today at this location. Limit is <span className="font-bold">1 booking per court location per day</span>.
                                </p>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-1.5">
                              {(selectedLocation?.opening_time && selectedLocation?.closing_time
                                ? generateTimeSlots(selectedLocation.opening_time, selectedLocation.closing_time)
                                : TIME_SLOTS
                              ).map(slot => {
                                const isBlocked = blockedSlots.has(slot);
                                const isBookedSlot = bookedSlots.has(slot);
                                const isUserSlot = userBookedSlots.has(slot);
                                const userSlotStatus = userBookedSlots.get(slot) || '';
                                const isPast = isSlotInPast(slot, selectedDate);
                                const isUnavailable = isBlocked || isBookedSlot || dailyLimitReached || isPast;
                                return (
                                  <button
                                    key={slot}
                                    onClick={() => !isUnavailable && setSelectedSlot(slot)}
                                    disabled={isUnavailable}
                                    className={`py-2.5 px-2.5 rounded-lg font-semibold text-xs transition-all border relative ${isUserSlot
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-300 cursor-default'
                                      : isPast ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                                        : isBlocked ? 'bg-red-50 text-red-400 border-red-200 cursor-not-allowed'
                                          : isBookedSlot ? 'bg-amber-50 text-amber-400 border-amber-200 cursor-not-allowed'
                                            : selectedSlot === slot ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200/50'
                                              : dailyLimitReached ? 'bg-orange-50/50 text-orange-300 border-orange-200 cursor-not-allowed'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'}`}
                                  >
                                    <span className={isPast && !isUserSlot ? 'line-through' : ''}>
                                      {isUserSlot ? `Your Slot - ${userSlotStatus}` : isPast ? slotToRange(slot) : isBlocked || isBookedSlot ? 'Court Locked In' : slotToRange(slot)}
                                    </span>
                                    {isUserSlot && <CheckCircle2 size={10} className="absolute top-1 right-1 text-emerald-500" />}
                                    {isBlocked && !isUserSlot && <Ban size={10} className="absolute top-1 right-1 text-red-400" />}
                                    {isBookedSlot && !isBlocked && !isUserSlot && <AlertCircle size={10} className="absolute top-1 right-1 text-amber-400" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Proceed to Book — sticky footer */}
                    <div className="shrink-0 p-4 border-t border-slate-100 bg-white">
                      {(() => {
                        const currentActiveRole = localStorage.getItem('active_role');
                        const isOwner = !!(user && selectedCourt?.ownerId && user.id === selectedCourt.ownerId && currentActiveRole !== 'PLAYER');
                        return (
                          <button
                            disabled={!selectedSlot || isBooked || isProcessing || dailyLimitReached || isOwner || (selectedSlot ? (blockedSlots.has(selectedSlot) || bookedSlots.has(selectedSlot)) : false)}
                            onClick={handleBooking}
                            className={`w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isBooked ? 'bg-emerald-500 text-white cursor-default' : isOwner ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : dailyLimitReached ? 'bg-orange-100 text-orange-500 border border-orange-200 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200/50'}`}
                          >
                            {isProcessing ? <Loader2 className="animate-spin" size={18} /> : isBooked ? <><CheckCircle2 size={18} /> Booking Confirmed!</> : isOwner ? <><Ban size={16} /> Court Owner Cannot Book</> : dailyLimitReached ? <><Ban size={16} /> Limit Reached</> : selectedSlot && blockedSlots.has(selectedSlot) ? <><Ban size={16} /> Court Blocked</> : selectedSlot && bookedSlots.has(selectedSlot) ? <><AlertCircle size={16} /> Court Locked In</> : <>Proceed to Book {'\u2192'}</>}
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
      </div>

      {/* ──────────── MOBILE BOTTOM BAR ──────────── */}
      {isMobile && (
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
      )}

      {/* ──────────── MOBILE FILTERS DRAWER ──────────── */}
      {showFilters && (
        <div className="fixed inset-0 z-[110] flex items-end md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
          <div className="relative w-full bg-white rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Drawer handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>

            <div className="px-5 pb-3 pt-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900">Filters</h2>
                <button onClick={() => setShowFilters(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6 pb-6">
                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Court Type</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['Indoor Courts', 'Outdoor Courts', 'Lighted Courts', 'Dedicated Courts'].map(type => (
                      <label key={type} className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl group cursor-pointer hover:bg-blue-50 transition-colors">
                        <div className="w-4 h-4 border-2 border-slate-300 rounded group-hover:border-blue-500 transition-colors shrink-0"></div>
                        <span className="text-sm font-medium text-slate-600">{type}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Access</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['Public Court', 'Private Court', 'Membership Required'].map(access => (
                      <label key={access} className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl group cursor-pointer hover:bg-blue-50 transition-colors">
                        <div className="w-4 h-4 border-2 border-slate-300 rounded group-hover:border-blue-500 transition-colors shrink-0"></div>
                        <span className="text-sm font-medium text-slate-600">{access}</span>
                      </label>
                    ))}
                  </div>
                </section>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setShowFilters(false)} className="text-sm font-bold text-slate-400 hover:text-slate-600 px-3 py-2.5">
                  Clear
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-200/50"
                >
                  View {urlLocationId ? locationCourts.length + ' Courts' : filteredLocations.length + ' Locations'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────── LOCATION ENTRY CONFIRMATION MODAL ──────────── */}
      {showLocationEntryModal && !locationConfirmed && selectedLocation && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 sm:p-8 text-center space-y-5">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
                <MapPin size={32} className="text-blue-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">You are about to book in</h2>
                <p className="text-lg font-black text-blue-600 uppercase tracking-wide">{selectedLocation.name}</p>
                <p className="text-sm text-slate-500 font-medium">{selectedLocation.address}, {selectedLocation.city}</p>
              </div>

              {/* Show policies in the entry modal */}
              {locationPolicies.length > 0 && (
                <div className="text-left max-h-48 overflow-y-auto space-y-2">
                  {locationPolicies.map((policy) => (
                    <div key={policy.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Shield size={12} className="text-amber-600" />
                        <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest">{policy.title}</h4>
                      </div>
                      <div className="text-[11px] text-amber-900 font-medium leading-relaxed whitespace-pre-wrap">
                        {policy.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    setShowLocationEntryModal(false);
                    setLocationConfirmed(true);
                  }}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200/50"
                >
                  Confirm & Continue
                </button>
                <button
                  onClick={() => {
                    setShowLocationEntryModal(false);
                    navigate('/booking');
                  }}
                  className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ──────────── SUCCESS MODAL ──────────── */}
      {showSuccessModal && ReactDOM.createPortal(
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSuccessModal(false);
              setIsBooked(false);
              setSelectedSlot(null);
              setSelectedCourt(null);
              setSelectedLocation(null);
              navigate('/booking');
            }
          }}
        >
          <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 sm:p-10 text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CircleCheck size={32} className="text-emerald-500" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">Successfully Booked!</h2>
              <p className="text-slate-500 font-medium mb-4 leading-relaxed text-sm sm:text-base">
                Your court time has been reserved. You can find your booking details in "My Bookings".
              </p>

              {/* Policy Reminder after booking */}
              {locationPolicies.length > 0 && (
                <div className="text-left max-h-40 overflow-y-auto space-y-2 mb-4">
                  {locationPolicies.map((policy) => (
                    <div key={policy.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Shield size={12} className="text-amber-600" />
                        <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest">{policy.title}</h4>
                      </div>
                      <div className="text-[11px] text-amber-900 font-medium leading-relaxed whitespace-pre-wrap">
                        {policy.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setShowReceipt(true);
                  }}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200/50"
                >
                  View My Receipt
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setIsBooked(false);
                    setSelectedSlot(null);
                    setSelectedCourt(null);
                    setSelectedLocation(null);
                    navigate('/booking');
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
      )}

      {/* ──────────── RECEIPT MODAL ──────────── */}
      {showReceipt && receiptData && (
        <Receipt
          bookingData={receiptData}
          onClose={() => {
            setShowReceipt(false);
            setIsBooked(false);
            setSelectedSlot(null);
            setSelectedCourt(null);
            setSelectedLocation(null);
            navigate('/booking');
          }}
        />
      )}


    </div>
  );
};

export default Booking;
