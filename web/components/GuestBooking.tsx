import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, PhilippinePeso, Clock, CheckCircle2, Loader2, Filter, Search, Navigation, Lock, X, LogIn, UserPlus, Ban, List, CircleCheck, Funnel, Star, ChevronLeft, Building2, CheckCircle, Activity, CreditCard, Info, SlidersHorizontal } from 'lucide-react';
import { Court } from '../types';
import { CourtSkeleton } from './ui/Skeleton';
import { supabase } from '../services/supabase';
import { fetchCourtPricingRules, getSlotPrices, PricingRule, toPhDateStr } from '../services/courtPricingService';
import { getEffectiveHours, type EffectiveHours } from '../services/courtOperationHours';
import WeeklyPricingSchedule from './ui/WeeklyPricingSchedule';

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

const ALL_HOUR_SLOTS = [
    '12:00 AM', '01:00 AM', '02:00 AM', '03:00 AM', '04:00 AM', '05:00 AM',
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
    '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM'
];

/** Generate time slots based on opening and closing hours */
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

    if ((closeH === 0 && close.m === 0) || closeH < openH || (closeH === openH && close.m <= open.m)) {
        closeH = 24;
    } else if (close.m > 0) {
        closeH = Math.min(24, closeH + 1);
    }

    return ALL_HOUR_SLOTS.filter((_, idx) => idx >= openH && idx < closeH);
};

const TIME_SLOTS = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
];

/** Convert a slot like '08:00 AM' to a 24-hour number (0–23) */
const slotTo24 = (slot: string): number => {
    const [time, period] = slot.split(' ');
    let [h] = time.split(':').map(Number);
    if (period === 'PM' && h !== 12) h += 12;
    else if (period === 'AM' && h === 12) h = 0;
    return h;
};

const formatHour12 = (hours24: number): string => {
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const h12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${h12} ${period}`;
};

/** Convert a slot start time like '08:00 AM' to a range like '8 AM - 9 AM' */
const slotToRange = (slot: string): string => {
    const [time, period] = slot.split(' ');
    let [h] = time.split(':').map(Number);
    if (period === 'PM' && h !== 12) h += 12;
    else if (period === 'AM' && h === 12) h = 0;
    const endH = (h + 1) % 24;
    return `${formatHour12(h)} - ${formatHour12(endH)}`;
};

/** Build the display range for multiple consecutive slots, e.g. '8 AM - 11 AM (3 hrs)' */
const slotsToRange = (slots: string[]): string => {
    if (slots.length === 0) return '';
    if (slots.length === 1) return slotToRange(slots[0]);
    const sorted = [...slots].sort((a, b) => slotTo24(a) - slotTo24(b));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const endH = (slotTo24(last) + 1) % 24;
    return `${formatHour12(slotTo24(first))} - ${formatHour12(endH)} (${sorted.length} hr${sorted.length > 1 ? 's' : ''})`;
};

const MiniMapCard: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
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
            <div ref={mapRef} className="w-full h-32" />
        </div>
    );
};

const PH_TIMEZONE = 'Asia/Manila';

const getNowPH = (): Date => {
  const nowUtc = new Date();
  const phStr = nowUtc.toLocaleString('en-US', { timeZone: PH_TIMEZONE });
  return new Date(phStr);
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
  const currentPHHour = nowPH.getHours();
  const currentPHMinute = nowPH.getMinutes();
  return hours < currentPHHour || (hours === currentPHHour && minutes <= currentPHMinute);
};

const getSlotDateTime = (slot: string, baseDate: Date = new Date()): { start: Date; end: Date } => {
  const [time, period] = slot.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  else if (period === 'AM' && hours === 12) hours = 0;
  const startDateTime = new Date(baseDate);
  startDateTime.setHours(hours, minutes, 0, 0);
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
  return { start: startDateTime, end: endDateTime };
};

declare global {
    interface Window {
        google: any;
    }
}
const GuestBooking: React.FC = () => {
    const [courts, setCourts] = useState<Court[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [showAdvanceOptions, setShowAdvanceOptions] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [isBooked, setIsBooked] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [userCity, setUserCity] = useState<string | null>(null);
    const [gpsEnabled, setGpsEnabled] = useState<boolean | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    const [showFilters, setShowFilters] = useState(false);
    const [isFilterClosing, setIsFilterClosing] = useState(false);
    const [filterPriceRange, setFilterPriceRange] = useState<[number, number]>([0, 2000]);
    const [filterFreeOnly, setFilterFreeOnly] = useState(false);
    const [filterAmenities, setFilterAmenities] = useState<string[]>([]);
    const isMobile = window.innerWidth < 768;

    // For Location View
    const [locationSelectedSlots, setLocationSelectedSlots] = useState<string[]>([]);
    const [showLocationDetailHero, setShowLocationDetailHero] = useState(true);
    const [locationReviewSummary, setLocationReviewSummary] = useState<{ avg: number; count: number } | null>(null);
    const [locationAvailability, setLocationAvailability] = useState<Map<string, { blocked: Set<string>, booked: Set<string> }>>(new Map());
    const [locationEffectiveHours, setLocationEffectiveHours] = useState<Map<string, EffectiveHours>>(new Map());
    const [locationTimeSlots, setLocationTimeSlots] = useState<string[]>([]);
    const [isCheckingLocationAvailability, setIsCheckingLocationAvailability] = useState(false);
    const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date(getNowPH()));
    const [showLeftCalendar, setShowLeftCalendar] = useState(false);
    const [showLocationEntryModal, setShowLocationEntryModal] = useState(false);
    const [locationConfirmed, setLocationConfirmed] = useState(false);

    const handleCloseFilters = () => {
        setIsFilterClosing(true);
        setTimeout(() => { setShowFilters(false); setIsFilterClosing(false); }, 400);
    };

    const goToMapView = () => {
        setSelectedLocation(null);
        setActiveLocationId(null);
        setSelectedCourt(null);
        setShowLocationDetailHero(true);
        setShowLeftCalendar(false);
        setViewMode('map');
    };

    // Location entry confirmation modal handlers
    const openLocationConfirmModal = () => {
        if (!selectedLocation) return;
        setLocationConfirmed(false);
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
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [showDesktopSuggestions, setShowDesktopSuggestions] = useState(false);

    // Location detail state (when coming from homepage card)
    const [selectedLocation, setSelectedLocation] = useState<any>(null);
    const [locationCourts, setLocationCourts] = useState<Court[]>([]);
    const [isLoadingLocationDetail, setIsLoadingLocationDetail] = useState(false);
    // Hero expansion: clicking a court in the list shows the court detail + schedule in the right panel
    const [heroCourtId, setHeroCourtId] = useState<string | null>(null);
    const heroActiveCourt = heroCourtId ? (locationCourts.find(c => c.id === heroCourtId) ?? null) : null;
    const [showCourtDetails, setShowCourtDetails] = useState(false);

    // Dynamic pricing state
    const [courtPriceRanges, setCourtPriceRanges] = useState<Map<string, { min: number; max: number; hasRules: boolean }>>(new Map());
    const [locationSlotPriceRanges, setLocationSlotPriceRanges] = useState<Map<string, { min: number; max: number; hasRules: boolean }>>(new Map());

    const [searchParams] = useSearchParams();
    const urlLocationId = searchParams.get('locationId');
    const urlLat = searchParams.get('lat');
    const urlLng = searchParams.get('lng');
    const urlZoom = searchParams.get('zoom');
    const urlCourt = searchParams.get('court');
    const [activeLocationId, setActiveLocationId] = useState<string | null>(urlLocationId);

    useEffect(() => {
        if (urlLocationId) {
            setActiveLocationId(urlLocationId);
        }
    }, [urlLocationId]);

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

    // Fetch dynamic pricing ranges for all courts based on selected date
    useEffect(() => {
        if (locationCourts.length === 0) return;
        const loadPriceRanges = async () => {
            const dateStr = toPhDateStr(selectedDate);
            const newRanges = new Map<string, { min: number; max: number; hasRules: boolean }>();
            for (const court of locationCourts) {
                try {
                    const hours = locationEffectiveHours.get(court.id);
                    const slots = hours && !hours.is_closed
                        ? generateTimeSlots(hours.open_time, hours.close_time)
                        : (selectedLocation?.opening_time && selectedLocation?.closing_time
                            ? generateTimeSlots(selectedLocation.opening_time, selectedLocation.closing_time)
                            : TIME_SLOTS);
                    const prices = await getSlotPrices(court.id, dateStr, slots, court.pricePerHour);
                    const vals = Array.from(prices.values()) as number[];
                    if (vals.length > 0) {
                        const hasRules = vals.some(v => v !== court.pricePerHour);
                        newRanges.set(court.id, { min: Math.min(...vals), max: Math.max(...vals), hasRules: hasRules || vals.length > 0 });
                    } else {
                        newRanges.set(court.id, { min: court.pricePerHour, max: court.pricePerHour, hasRules: false });
                    }
                } catch {
                    newRanges.set(court.id, { min: court.pricePerHour, max: court.pricePerHour, hasRules: false });
                }
            }
            setCourtPriceRanges(newRanges);
        };
        loadPriceRanges();
    }, [locationCourts, selectedLocation, selectedDate, locationEffectiveHours]);

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

    const getUserLocation = () => {
        if (gpsEnabled === true && userLocation) return;
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
                timeout: 10000
            });
        } else {
            setGpsEnabled(false);
            setIsLoadingLocation(false);
        }
    };

    useEffect(() => {
        getUserLocation();
    }, []);

    const [filterType, setFilterType] = useState<'All' | 'Indoor' | 'Outdoor'>('All');
    const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || searchParams.get('court') || '');
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
        });
    }, []);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const navigate = useNavigate();

    // Get map position from URL params

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
                        imageUrl: c.image_url,
                        courtType: c.court_type || 'Outdoor',
                        ownerId: c.owner_id,
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
            } catch (err) {
                console.error('Error fetching location detail:', err);
            } finally {
                setIsLoadingLocationDetail(false);
            }
        };

        fetchLocationDetail();
    }, [activeLocationId]);

    const mapRef = useRef<HTMLDivElement>(null);
    const googleMapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
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

    const handleSearch = async (query: string) => {
        if (!query || !window.google) return;

        // First check if it matches a court/location name exactly
        const matchingCourt = courts.find(c =>
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.location.toLowerCase().includes(query.toLowerCase())
        );

        if (matchingCourt && googleMapRef.current && matchingCourt.latitude && matchingCourt.longitude) {
            googleMapRef.current.panTo({ lat: matchingCourt.latitude, lng: matchingCourt.longitude });
            smoothZoom(15);
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
                    smoothZoom(14);
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

                const mappedCourts: Court[] = (data || []).map(c => {
                    const loc = (c as any).locations;
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
                        ownerId: c.owner_id
                    };
                });
                setCourts(mappedCourts);
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

    useEffect(() => {
        if (!isLoading && courts.length > 0 && mapRef.current && window.google) {
            initializeMap();
        }
    }, [isLoading, courts]);

    // Re-center map when GPS location becomes available
    useEffect(() => {
        if (userLocation && googleMapRef.current && !urlLat && !urlLng) {
            googleMapRef.current.panTo(userLocation);
            smoothZoom(13);
        }
    }, [userLocation]);

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

    // Re-center map and trigger resize when returning to map view or hero is cleared
    useEffect(() => {
        if (!heroActiveCourt && googleMapRef.current && window.google) {
            setTimeout(() => {
                window.google.maps.event.trigger(googleMapRef.current, 'resize');
            }, 350);
        }
    }, [heroActiveCourt]);

    const updateMarkers = () => {
        const map = googleMapRef.current;
        if (!map || !window.google) return;

        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        locations.forEach(location => {
            if (location.latitude && location.longitude) {
                const locationCourts = courts.filter(c => {
                    const matchesLocation = c.location_id ? c.location_id === location.id :
                        c.location.toLowerCase().includes(location.name.toLowerCase());
                    return matchesLocation && (filterType === 'All' || c.type === filterType);
                });

                if (locationCourts.length === 0) return;

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

                const infoWindow = new window.google.maps.InfoWindow({
                    content: `
                        <div style="width:220px;font-family:'Inter',system-ui,sans-serif;overflow:hidden;">
                            <div style="height:130px;width:100%;overflow:hidden;background:#e2e8f0;">
                                <img 
                                    src="${location.hero_image || location.image_url || 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=400&h=260'}" 
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
                                    <span style="font-size:10px;font-weight:800;color:#2563eb;background:#eff6ff;padding:3px 8px;border-radius:6px;letter-spacing:0.3px;">${locationCourts.length} ${locationCourts.length === 1 ? 'COURT' : 'COURTS'}</span>
                                    ${location.amenities && location.amenities.length > 0 ? `<span style="font-size:10px;color:#94a3b8;font-weight:500;">${location.amenities.slice(0, 2).join(' · ')}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `,
                    disableAutoPan: true,
                    maxWidth: 240
                });

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
                    setHeroCourtId(null);
                    if (window.innerWidth < 768) {
                        setViewMode('list');
                    }
                });

                marker.addListener('mouseover', () => {
                    infoWindow.open(map, marker);
                });

                marker.addListener('mouseout', () => {
                    infoWindow.close();
                });

                markersRef.current.push(marker);
            }
        });
    };

    const initializeMap = () => {
        if (!mapRef.current || !window.google) return;

        let center: { lat: number; lng: number };
        let zoomVal: number;

        if (urlLat && urlLng) {
            center = { lat: parseFloat(urlLat), lng: parseFloat(urlLng) };
            zoomVal = urlZoom ? parseInt(urlZoom) : 12;
        } else if (userLocation) {
            center = userLocation;
            zoomVal = 13;
        } else {
            center = { lat: 12.8797, lng: 121.774 };
            zoomVal = 6;
        }

        const map = new window.google.maps.Map(mapRef.current, {
            center,
            zoom: zoomVal,
            mapTypeId: 'terrain',
            styles: [
                { featureType: 'landscape.natural', elementType: 'geometry.fill', stylers: [{ color: '#dde8cd' }] },
                { featureType: 'landscape.natural.terrain', elementType: 'geometry.fill', stylers: [{ color: '#c5d6a8' }] },
                { featureType: 'landscape.natural.landcover', elementType: 'geometry.fill', stylers: [{ color: '#c8dba5' }] },
                { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#e4e0d8' }] },
                { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#a3c8e9' }] },
                { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a7fa5' }] },
                { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#dceaf5' }, { weight: 2 }] },
                { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#b5d48c' }] },
                { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#4a7a2e' }] },
                { featureType: 'poi.sports_complex', elementType: 'geometry.fill', stylers: [{ color: '#a8cf6f' }] },
                { featureType: 'poi.sports_complex', elementType: 'labels.text.fill', stylers: [{ color: '#3d6b1f' }] },
                { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
                { featureType: 'poi.business', elementType: 'labels', stylers: [{ visibility: 'off' }] },
                { featureType: 'poi.medical', elementType: 'labels', stylers: [{ visibility: 'off' }] },
                { featureType: 'poi.school', elementType: 'labels', stylers: [{ visibility: 'off' }] },
                { featureType: 'poi.government', elementType: 'labels', stylers: [{ visibility: 'off' }] },
                { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#f0d9a8' }] },
                { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#c9a96e' }, { weight: 0.8 }] },
                { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#6b5a35' }] },
                { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#f5edd5' }] },
                { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#d4c49e' }, { weight: 0.5 }] },
                { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: '#f8f4ea' }] },
                { featureType: 'road.local', elementType: 'geometry.stroke', stylers: [{ color: '#e0d8c4' }, { weight: 0.3 }] },
                { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#5c5544' }] },
                { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#f5f0e6' }, { weight: 3 }] },
                { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#dbd4c4' }] },
                { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
                { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#b5a88a' }, { weight: 1.2 }] },
                { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#3a3528' }] },
                { featureType: 'administrative.province', elementType: 'labels.text.fill', stylers: [{ color: '#6b6352' }] },
                { elementType: 'labels.text.fill', stylers: [{ color: '#4a4639' }] },
                { elementType: 'labels.text.stroke', stylers: [{ color: '#f0ebe0' }, { weight: 2.5 }] },
            ],
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false,
            panControl: false,
            tilt: 0,
        });

        googleMapRef.current = map;
        updateMarkers();
    };

    useEffect(() => {
        if (googleMapRef.current) {
            updateMarkers();
        }
    }, [filterType, locations, courts]);

    const handleBooking = () => {
        // Store redirect URL in localStorage for after login
        // Use court ID for unique identification (avoids name collisions between owners)
        let redirectUrl = selectedCourt ? `/court/${selectedCourt.id}` : '/booking';
        if (!selectedCourt) {
            const params = new URLSearchParams();
            if (searchQuery) params.set('q', searchQuery);
            if (params.toString()) redirectUrl += '?' + params.toString();
        }
        localStorage.setItem('auth_redirect', redirectUrl);

        setShowLoginModal(true);
    };

    const handleNearMe = () => {
        // Ensure map is initialized first
        if (!googleMapRef.current && mapRef.current && window.google) {
            initializeMap();
        }

        // Switch to map view first
        setViewMode('map');

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (!googleMapRef.current) return;

                    const userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };

                    // Remove existing user location marker if any
                    if (userLocationMarkerRef.current) {
                        userLocationMarkerRef.current.setMap(null);
                    }

                    // Create a custom marker for user's location with a distinctive style
                    const userMarker = new window.google.maps.Marker({
                        position: userLocation,
                        map: googleMapRef.current,
                        title: 'Your Location',
                        icon: {
                            path: window.google.maps.SymbolPath.CIRCLE,
                            scale: 14,
                            fillColor: '#3b82f6', // Blue color
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 4,
                        },
                        animation: window.google.maps.Animation.DROP,
                        zIndex: 999, // Ensure it appears on top
                    });

                    // Add a pulsing outer circle effect
                    const pulseCircle = new window.google.maps.Marker({
                        position: userLocation,
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
                    googleMapRef.current.panTo(userLocation);
                    googleMapRef.current.setZoom(15);
                },
                (error) => {
                    console.error('Error getting location:', error);

                    // Wait a bit for map to be ready if it's still initializing
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
            // If geolocation not supported, show Philippines view
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
            setShowLoginModal(true);
            return;
        }
        navigate('/my-bookings');
    };

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
            const locationCourts = courts.filter(c => {
                const matchesLocation = c.location_id ? c.location_id === loc.id :
                    c.location.toLowerCase().includes(loc.name.toLowerCase());
                if (!matchesLocation) return false;
                return filterType === 'All' || c.type === filterType;
            });
            if (locationCourts.length === 0) return false;

            // Filter by free only
            if (filterFreeOnly) {
                const hasFree = locationCourts.some((c: any) => !c.pricePerHour || c.pricePerHour === 0);
                if (!hasFree) return false;
            }

            // Filter by price range
            if (filterPriceRange[0] > 0 || filterPriceRange[1] < 2000) {
                const prices = locationCourts.map((c: any) => c.pricePerHour || 0).filter((p: number) => p > 0);
                if (prices.length > 0) {
                    const minP = Math.min(...prices);
                    if (minP > filterPriceRange[1] || Math.max(...prices) < filterPriceRange[0]) return false;
                }
            }

            // Filter by amenities
            if (filterAmenities.length > 0) {
                const locAm = new Set<string>();
                if (Array.isArray(loc.amenities)) loc.amenities.forEach((a: string) => locAm.add(a.toLowerCase()));
                locationCourts.forEach((c: any) => {
                    if (Array.isArray(c.amenities)) c.amenities.forEach((a: string) => locAm.add(a.toLowerCase()));
                });
                const hasAll = filterAmenities.every(a => locAm.has(a.toLowerCase()));
                if (!hasAll) return false;
            }

            return true;
        })
        .map(loc => {
            // Add court count for each location
            const locationCourts = courts.filter(c => {
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
            locationCourts.forEach((c: any) => {
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
            locationCourts.forEach((c: any) => {
                if (Array.isArray(c.amenities)) c.amenities.forEach((a: string) => amenitiesSet.add(a));
            });

            // Price range computation
            const prices = locationCourts.map((c: any) => c.pricePerHour || 0);
            const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
            const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
            const hasFree = prices.some((p: number) => p === 0);

            return {
                ...loc,
                court_count: locationCourts.length,
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
        if (selectedLocation?.hero_image) images.add(selectedLocation.hero_image);
        if (selectedLocation?.image_url) images.add(selectedLocation.image_url);
        locationCourts.forEach(c => {
            if (c.imageUrl) images.add(c.imageUrl);
        });
        return Array.from(images);
    }, [selectedLocation, locationCourts]);

    // Fetch location availability whenever date or location changes
    useEffect(() => {
        if (!activeLocationId || locationCourts.length === 0 || locationTimeSlots.length === 0) return;
        const checkAllAvailability = async () => {
            setIsCheckingLocationAvailability(true);
            const result = new Map<string, { blocked: Set<string>, booked: Set<string> }>();
            const targetDateStr = toPhDateStr(selectedDate);

            const { data: bookingsData } = await supabase
                .from('bookings')
                .select('court_id, start_time, end_time, status')
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
                            const beWithCleaning = new Date(be.getTime() + (court.cleaningTimeMinutes || 0) * 60000);
                            if (start < beWithCleaning && end > bs) {
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
            setIsCheckingLocationAvailability(false);
        };
        checkAllAvailability();
    }, [locationCourts, selectedDate, activeLocationId, selectedLocation, locationEffectiveHours, locationTimeSlots]);

    return (
        <div className="min-h-screen md:h-screen md:overflow-hidden bg-white md:bg-gradient-to-b md:from-slate-50 md:to-white">
            {/* ──────────── MOBILE HEADER BAR ──────────── */}
            <div className="md:hidden fixed top-14 left-0 right-0 z-40 bg-white border-b border-slate-200/60 shadow-sm">
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
                                    onFocus={() => { if (gpsEnabled !== true) getUserLocation(); }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSearch(searchQuery);
                                            setIsSearchExpanded(false);
                                        }
                                    }}
                                    className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                                />
                                <button onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }} className="text-[#1E40AF] font-bold text-xs shrink-0">
                                    Cancel
                                </button>
                            </div>

                            {/* Mobile Search Dropdown */}
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/60 z-50 max-h-[65vh] overflow-y-auto">
                                {/* GPS Enable Prompt */}
                                {gpsEnabled !== true && !userCity && (
                                    <button
                                        type="button"
                                        onClick={getUserLocation}
                                        className="w-full text-left px-4 py-3.5 flex items-center gap-3 bg-blue-50/60 hover:bg-blue-50 border-b border-blue-100 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                            <Navigation size={14} className="text-blue-600" fill="currentColor" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[#1E40AF]">
                                                {gpsEnabled === false ? 'Location Blocked — Tap to Retry' : 'Enable Location'}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {gpsEnabled === false ? 'Check browser settings if it keeps failing' : 'Allow GPS to find courts near you'}
                                            </p>
                                        </div>
                                    </button>
                                )}
                                {isLoadingLocation && (
                                    <div className="px-4 py-3.5 flex items-center gap-3 text-slate-500 border-b border-slate-100">
                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-sm font-medium">Getting your location...</span>
                                    </div>
                                )}
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
                                                        setIsSearchExpanded(false);
                                                        setViewMode('map');
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
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsSearchExpanded(true)}
                                className="flex-1 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-400"
                            >
                                <Search size={16} />
                                <span className="text-sm font-semibold truncate">Search courts or places...</span>
                            </button>
                            <button
                                onClick={() => navigate('/my-bookings')}
                                className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl shrink-0 hover:bg-slate-900 transition-colors shadow-lg shadow-blue-900/10"
                            >
                                <SlidersHorizontal size={18} />
                                {(filterType !== 'All' || filterFreeOnly || filterAmenities.length > 0) && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#a3e635] rounded-full flex items-center justify-center">
                                        <span className="text-[8px] font-black text-slate-900">{(filterType !== 'All' ? 1 : 0) + (filterFreeOnly ? 1 : 0) + filterAmenities.length}</span>
                                    </div>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Back to Locations / Courts — mobile, shown when in a location detail */}
                {false && (
                    <div className="px-4 pt-2 pb-2 flex items-center gap-3">
                        <button
                            onClick={() => setActiveLocationId(null)}
                            className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors group"
                        >
                            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                            Back to Locations
                        </button>
                        <span className="text-xs font-bold text-slate-600 truncate ml-auto">{selectedLocation.name}</span>
                    </div>
                )}


            </div>

            {/* ──────────── MAIN CONTAINER ──────────── */}
            <div className={`md:pt-28 pb-0 md:pb-6 px-0 md:px-6 lg:px-10 xl:px-16 max-w-[1600px] mx-auto md:h-[calc(100vh-140px)] md:overflow-hidden ${activeLocationId && selectedLocation ? 'pt-[100px] sm:pt-[104px]' : 'pt-[136px] sm:pt-[140px]'}`}>

                {/* ──────────── DESKTOP HEADER ──────────── */}
                <div className="hidden md:block mb-6 lg:mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
                        <div>
                            <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2">
                                {'Courts / Live'}
                            </p>
                                <h1 className="text-4xl lg:text-5xl xl:text-6xl font-black text-slate-950 tracking-tighter">
                                    <>Book a Court in <span className="text-blue-600">{(searchParams.get('loc') || userCity || 'the Philippines').split(',')[0]}</span></>
                                </h1>
                        </div>
                    </div>


                </div>

                {/* ──────────── MAIN CONTENT GRID ──────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-5 gap-0 lg:gap-6 xl:gap-8 items-start md:h-full md:overflow-hidden">

                    {/* ═══ LEFT COLUMN ═══ */}
                    <div className={`lg:col-span-2 xl:col-span-2 ${(activeLocationId || viewMode === 'list') ? 'block' : 'hidden md:block'} md:sticky md:top-28 self-start`}>
                        {/* Desktop Search Bar */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSearch(searchQuery);
                                setShowDesktopSuggestions(false);
                            }}
                            className="hidden md:flex gap-3 mb-5 relative transition-all duration-300 opacity-100 max-h-[100px]"
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
                                                smoothZoom(14);
                                            }
                                        }
                                    }}
                                    onFocus={() => { setShowDesktopSuggestions(true); if (gpsEnabled !== true) getUserLocation(); }}
                                    onBlur={() => setTimeout(() => setShowDesktopSuggestions(false), 200)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSearch(searchQuery);
                                            setShowDesktopSuggestions(false);
                                        }
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm"
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

                                        {/* GPS Enable Prompt */}
                                        {gpsEnabled !== true && !isLoadingLocation && !userCity && (
                                            <button
                                                type="button"
                                                onClick={getUserLocation}
                                                className="w-full text-left px-5 py-3.5 flex items-center gap-3 bg-blue-50/60 hover:bg-blue-50 border-b border-blue-100 transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                                    <Navigation size={14} className="text-blue-600" fill="currentColor" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-blue-600">Enable Location</p>
                                                    <p className="text-xs text-slate-400">Allow GPS to find courts near you</p>
                                                </div>
                                            </button>
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
                                className={`flex items-center gap-2 px-5 lg:px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all shadow-lg shrink-0 active:scale-[0.98] relative ${(filterType !== 'All' || filterFreeOnly || filterAmenities.length > 0)
                                    ? 'bg-blue-600 text-white shadow-blue-900/20 hover:bg-blue-800'
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

                        {/* ─── Navigation buttons (desktop, location detail view) ─── */}
                        {false && (
                            <button
                                onClick={() => setActiveLocationId(null)}
                                className="hidden md:flex items-center gap-1.5 text-[11px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest mb-4 transition-colors group"
                            >
                                <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                                Back to Locations
                            </button>
                        )}
                        {false && (
                            <button
                                onClick={() => setHeroCourtId(null)}
                                className="hidden md:flex items-center gap-1.5 text-[11px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest mb-4 transition-colors group"
                            >
                                <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                                Back to Courts at {selectedLocation?.name}
                            </button>
                        )}

                        {/* ─── List Container ─── */}
                        <div className={`bg-white md:rounded-2xl md:border md:border-slate-200/60 md:shadow-sm overflow-hidden flex flex-col md:h-full ${activeLocationId ? 'h-[calc(100vh-100px)]' : 'h-[calc(100vh-150px)]'}`}>

                            {/* Location Detail Header — mobile only (desktop shows hero in right column) */}
                            {false && (
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
                                            {selectedLocation.opening_time && selectedLocation.closing_time && (
                                                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                                    <Clock size={10} />
                                                    {(() => {
                                                        const fmt = (t: string) => { const h = parseInt(t.split(':')[0], 10); return h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`; };
                                                        return `${fmt(selectedLocation.opening_time)} - ${fmt(selectedLocation.closing_time)}`;
                                                    })()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isLoadingLocationDetail && activeLocationId && (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="animate-spin text-blue-600" size={28} />
                                </div>
                            )}

                            {/* Section title */}
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                                <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    {`${filteredLocations.length} Location${filteredLocations.length !== 1 ? 's' : ''} in ${(searchParams.get('loc') || userCity || 'the Philippines').split(',')[0]}`}
                                </h2>
                            </div>
                            {/* Scrollable list */}
                            <div className="flex-1 overflow-y-auto px-0 md:px-1.5 py-1 md:py-1.5 space-y-1 md:space-y-1.5">
                                {isLoading ? (
                                    Array(5).fill(0).map((_, i) => <CourtSkeleton key={i} />)
                                ) : showLeftCalendar ? (
                                        <div className="flex flex-col h-full bg-white p-4 md:p-6 rounded-[24px] shadow-sm border border-slate-100 m-2">
                                            <div className="flex items-center justify-between mb-4">
                                                <button
                                                    onClick={() => setShowLeftCalendar(false)}
                                                    className="text-[11px] font-black text-slate-500 uppercase tracking-[0.18em] flex items-center gap-1.5 hover:text-blue-600"
                                                >
                                                    <ChevronLeft size={14} />
                                                    Back to Locations
                                                </button>
                                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.18em]">Calendar</span>
                                            </div>
                                            <div className="flex items-center justify-between mb-6">
                                                <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                                    <ChevronLeft size={20} />
                                                </button>
                                                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                                                    {currentMonthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                                </h3>
                                                <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors rotate-180">
                                                    <ChevronLeft size={20} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-7 gap-2 text-center mb-4">
                                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                                    <div key={day} className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{day}</div>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-7 gap-2">
                                                {(() => {
                                                    const year = currentMonthDate.getFullYear();
                                                    const month = currentMonthDate.getMonth();
                                                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                                                    const firstDay = new Date(year, month, 1).getDay();
                                                    const cells = [];
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
                                                                    className={`aspect-square w-full rounded-2xl flex flex-col items-center justify-center transition-all ${isPast ? 'bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed' : isSelected ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/20 scale-105' : 'bg-white text-slate-700 border border-slate-200 hover:border-[#1E40AF] hover:text-[#1E40AF]'}`}
                                                                >
                                                                    <span className={`text-sm md:text-base font-black ${isSelected ? 'text-white' : ''}`}>{dayNum}</span>
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
                                    ) : filteredLocations.map((location: any) => {
                                        const locStatus = location.status || (location.is_active ? 'Active' : 'Closed');
                                        const isAvailable = locStatus === 'Active';
                                        return (
                                            <div key={location.id} className="w-full">
                                                <button
                                                    onClick={() => {
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
                                                    className="w-full group flex flex-row rounded-none md:rounded-2xl overflow-hidden bg-white border-b md:border border-slate-100 md:shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-200 active:bg-slate-50"
                                                >
                                                    {/* Left column — Image (fixed size) */}
                                                    <div className="w-32 sm:w-36 h-[140px] shrink-0 bg-slate-100 relative overflow-hidden">
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
                                                        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1">
                                                            {location.max_price > 0 ? (
                                                                <div className="bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-md shadow-md">
                                                                    <span className="text-[11px] font-black text-slate-900">₱{location.min_price > 0 ? location.min_price : location.max_price}{location.min_price > 0 && location.min_price !== location.max_price ? `-${location.max_price}` : ''}</span><span className="text-[8px] font-semibold text-slate-400">/hr</span>
                                                                </div>
                                                            ) : (
                                                                <div className="bg-[#a3e635] backdrop-blur-sm px-2 py-0.5 rounded-md shadow-md">
                                                                    <span className="text-[11px] font-black text-slate-900">FREE</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Right column — Details */}
                                                    <div className="flex-1 p-3 text-left flex flex-col min-w-0">
                                                        <p className="font-black text-slate-900 text-base tracking-tight mb-0.5 group-hover:text-blue-600 transition-colors truncate">{location.name}</p>
                                                        <div className="flex items-center gap-1 mb-2">
                                                            <MapPin size={12} className="text-slate-300 shrink-0" />
                                                            <p className="text-xs text-slate-400 truncate">{location.address || location.city}</p>
                                                        </div>

                                                        {/* 2x2 Details Grid */}
                                                        <div className="grid grid-cols-2 gap-1.5 mt-auto">
                                                            <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-2">
                                                                <img src="/images/Ball.png" alt="" className="w-4 h-4 object-contain" />
                                                                <span className="text-[11px] font-bold text-slate-600">{location.court_count || 0} {(location.court_count || 0) === 1 ? 'Court' : 'Courts'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-2">
                                                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                                                <span className="text-[11px] font-bold text-slate-600">{(location.court_count || 1) * 4} Players</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-2">
                                                                <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="1" /><line x1="12" y1="6" x2="12" y2="18" /><line x1="2" y1="12" x2="22" y2="12" /></svg>
                                                                <span className="text-[11px] font-bold text-slate-600 truncate">{location.derived_court_type || 'Indoor'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-2">
                                                                <svg className="w-4 h-4 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                                                                <span className="text-[11px] font-bold text-slate-600 truncate">
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
                    </div>

                    {/* ═══ RIGHT COLUMN — MAP / COURT DETAIL ═══ */}
                    <div className={`lg:col-span-3 xl:col-span-3 ${(activeLocationId || viewMode === 'list') ? 'hidden md:block' : 'block'}`}>
                        <div className="md:rounded-2xl md:border md:border-slate-200/60 md:shadow-sm overflow-hidden relative md:sticky md:top-28 h-[calc(100vh-200px)] sm:h-[calc(100vh-200px)] md:h-[calc(100vh-220px)] lg:h-[calc(100vh-240px)]">

                            {/* ── Map — shown when no location is selected ── */}
                            <div
                                className="absolute inset-0 transition-all duration-500 ease-out"
                                style={{ opacity: (!activeLocationId) ? 1 : 0, transform: (!activeLocationId) ? 'scale(1)' : 'scale(1.02)', pointerEvents: (!activeLocationId) ? 'auto' : 'none' }}
                            >
                                {isLoading ? (
                                    <div className="h-full bg-slate-100 flex items-center justify-center">
                                        <Loader2 className="animate-spin text-blue-600" size={40} />
                                    </div>
                                ) : (
                                    <div ref={mapRef} className="h-full w-full" />
                                )}
                            </div>

                            {/* ── Location Hero Panel — shown when location is selected but no court yet ── */}
                            <div
                                className="absolute inset-0 bg-white flex flex-col overflow-hidden transition-all duration-500 ease-out"
                                style={{
                                    opacity: (activeLocationId && selectedLocation && !heroActiveCourt) ? 1 : 0,
                                    transform: (activeLocationId && selectedLocation && !heroActiveCourt) ? 'translateY(0)' : 'translateY(24px)',
                                    pointerEvents: (activeLocationId && selectedLocation && !heroActiveCourt) ? 'auto' : 'none',
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
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#a3e635]/75 via-[#a3e635]/20 to-transparent" />
                                            </div>
                                            <div className="relative z-10 flex flex-col h-full p-6 sm:p-8 lg:p-10">
                                                <div className="flex items-center gap-3 justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/60">
                                                            <MapPin size={22} className="text-[#1E40AF]" />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">Venue Selected</p>
                                                            <p className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">{selectedLocation.name}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={goToMapView}
                                                        className="px-4 py-2 rounded-xl bg-white/85 hover:bg-white text-slate-900 text-xs font-black uppercase tracking-[0.12em] shadow-md border border-white/70 transition-all"
                                                    >
                                                        Map View
                                                    </button>
                                                </div>

                                                <div className="mt-4 flex flex-col md:flex-row md:items-start md:gap-4">
                                                    <div className="flex-1 space-y-4">
                                                        <div>
                                                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Amenities</p>
                                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                                {locationAmenityList.length > 0 ? (
                                                                    locationAmenityList.slice(0, 8).map((a, i) => (
                                                                        <span key={`${a}-${i}`} className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60 shadow-sm">
                                                                            {a}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-[11px] font-semibold text-slate-400">No amenities listed</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Court Galleries</p>
                                                            <div className="mt-3 flex gap-3 overflow-x-auto">
                                                                {locationGalleryImages.slice(0, 6).map((img, idx) => (
                                                                    <img
                                                                        key={`${img}-${idx}`}
                                                                        src={img}
                                                                        alt={`${selectedLocation.name} gallery ${idx + 1}`}
                                                                        className="h-16 w-24 rounded-2xl object-cover border border-white/80 shadow-md"
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {selectedLocation.latitude && selectedLocation.longitude && (
                                                        <div className="w-full md:max-w-[260px] mt-3 md:mt-0">
                                                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Map View</p>
                                                            <MiniMapCard lat={selectedLocation.latitude} lng={selectedLocation.longitude} />
                                                        </div>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={openLocationConfirmModal}
                                                    className="mt-6 w-full py-4 rounded-2xl bg-[#1E40AF] hover:bg-blue-800 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 transition-all"
                                                >
                                                    Book Now
                                                </button>
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
                                                                if (!av?.blocked.has(slot) && !av?.booked.has(slot) && c.status === 'Available') {
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
                                            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                                <Building2 className="text-[#a3e635]" size={18} />
                                                {locationSelectedSlots.length > 0
                                                    ? `Courts available at ${slotsToRange(locationSelectedSlots)}`
                                                    : 'Available courts'}
                                            </h3>

                                            <div className="court-availability-grid grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300 ease-out">
                                                    {(() => {
                                                        const bookableCourts = locationCourts.filter(court =>
                                                            court.status === 'Available'
                                                        );

                                                        const availableCourts = bookableCourts.filter(court => {
                                                            if (locationSelectedSlots.length === 0) return true;
                                                            const av = locationAvailability.get(court.id);
                                                            if (!av) return false;
                                                            for (const slot of locationSelectedSlots) {
                                                                if (av.blocked.has(slot) || av.booked.has(slot)) return false;
                                                            }
                                                            return true;
                                                        });
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

                                                        return availableCourts.map((court, idx) => {
                                                            const isSlotSelected = locationSelectedSlots.length > 0;
                                                            return (
                                                            <button
                                                                key={court.id}
                                                                disabled={!isSlotSelected}
                                                                onClick={() => {
                                                                    if (!isSlotSelected) return;
                                                                    if (window.innerWidth < 768) {
                                                                        setShowCourtDetails(true);
                                                                    }
                                                                    setHeroCourtId(court.id);
                                                                    handleBooking(); 
                                                                }}
                                                                className={`court-sweep-entrance group flex flex-row bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all duration-300 ease-out text-left h-[100px] appearance-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 active:outline-none active:ring-0 opacity-100 scale-100 translate-y-0 ${isSlotSelected ? 'hover:border-[#1E40AF] hover:shadow-xl hover:shadow-blue-900/10 cursor-pointer' : 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed grayscale'}`}
                                                                style={{ animationDelay: `${idx * 55}ms` }}
                                                            >
                                                                <div className="w-[100px] h-full shrink-0 relative overflow-hidden bg-slate-100">
                                                                    <img src={court.imageUrl || '/images/home-images/pb2.jpg'} alt={court.name} className={`w-full h-full object-cover transition-transform duration-500 ${isSlotSelected ? 'group-hover:scale-110' : ''}`} />
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                                                    <span className={`absolute bottom-1 right-1 text-[8px] font-black px-1.5 py-0.5 rounded uppercase shadow-md ${isSlotSelected ? 'bg-[#a3e635] text-slate-900' : 'bg-slate-300 text-slate-600'}`}>Available</span>
                                                                </div>
                                                                <div className="p-3 flex flex-col justify-center flex-1 min-w-0">
                                                                    <p className={`font-black text-sm truncate transition-colors ${isSlotSelected ? 'text-slate-900 group-hover:text-[#1E40AF]' : 'text-slate-500'}`}>{court.name}</p>
                                                                    <p className="text-[10px] font-bold text-slate-500 mb-1 truncate">{court.type}</p>
                                                                    <div className="mt-auto flex items-center justify-between">
                                                                        <p className={`text-xs font-black ${isSlotSelected ? 'text-[#1E40AF]' : 'text-slate-400'}`}>
                                                                            {(() => {
                                                                                const range = locationSlotPriceRanges.get(court.id);
                                                                                if (range?.hasRules && range.min !== range.max) {
                                                                                    return `₱${range.min}–₱${range.max}/hr`;
                                                                                }
                                                                                return court.pricePerHour > 0 ? `₱${court.pricePerHour}/hr` : 'Price not set';
                                                                            })()}
                                                                        </p>
                                                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${isSlotSelected ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                                            <CheckCircle2 size={12} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                        </div>
                                    </div>
                                    )
                                )}
                            </div>

                            {/* ── Court Detail Panel — shown when a court card is clicked ── */}
                            <div
                                className="absolute inset-0 bg-white flex flex-col overflow-hidden transition-all duration-500 ease-out"
                                style={{
                                    opacity: (heroActiveCourt && selectedLocation) ? 1 : 0,
                                    transform: (heroActiveCourt && selectedLocation) ? 'translateX(0)' : 'translateX(32px)',
                                    pointerEvents: (heroActiveCourt && selectedLocation) ? 'auto' : 'none',
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
                                        {/* Details + CTA */}
                                        <div className="shrink-0 flex flex-col gap-2.5 p-4 bg-white border-t border-slate-100">
                                            <div className="flex gap-2">
                                                {heroActiveCourt.pricePerHour != null && (
                                                    <div className="flex-1 flex items-center gap-2 px-3 py-3 bg-blue-600 rounded-xl text-white">
                                                        <Navigation size={14} className="text-[#a3e635] shrink-0" />
                                                        <div>
                                                            <p className="text-[8px] font-black text-blue-200 uppercase tracking-widest leading-none">Rate</p>
                                                            {(() => {
                                                                const range = courtPriceRanges.get(heroActiveCourt.id);
                                                                if (range && range.hasRules && range.max > 0) {
                                                                    return range.min === range.max
                                                                        ? <p className="text-lg font-black leading-tight">₱{range.min}<span className="text-[9px] font-bold text-blue-300 ml-0.5">/hr</span></p>
                                                                        : <p className="text-lg font-black leading-tight">₱{range.min}–₱{range.max}<span className="text-[9px] font-bold text-blue-300 ml-0.5">/hr</span></p>;
                                                                } else if (heroActiveCourt.pricePerHour > 0) {
                                                                    return <p className="text-lg font-black leading-tight">₱{heroActiveCourt.pricePerHour}<span className="text-[9px] font-bold text-blue-300 ml-0.5">/hr</span></p>;
                                                                } else {
                                                                    return <p className="text-sm font-bold leading-tight text-blue-300 italic">Not Set</p>;
                                                                }
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedLocation.opening_time && selectedLocation.closing_time && (
                                                    <div className="flex-1 flex items-center gap-2 px-3 py-3 bg-slate-50 rounded-xl border border-slate-100">
                                                        <Clock size={14} className="text-slate-400 shrink-0" />
                                                        <div>
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Hours</p>
                                                            <p className="text-xs font-bold text-slate-900 leading-tight mt-0.5">{selectedLocation.opening_time} - {selectedLocation.closing_time}</p>
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
                                            {/* This Week's Pricing Schedule */}
                                            <WeeklyPricingSchedule
                                                courtId={heroActiveCourt.id}
                                                basePricePerHour={heroActiveCourt.pricePerHour || 0}
                                                courtName={heroActiveCourt.name}
                                                compact
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { setHeroCourtId(null); }}
                                                    className="px-5 py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-[0.15em] active:scale-95 transition-all"
                                                >
                                                    Back
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        let redirectUrl = `/court/${heroActiveCourt.id}`;
                                                        localStorage.setItem('auth_redirect', redirectUrl);
                                                        setShowLoginModal(true);
                                                    }}
                                                    className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-[0.15em] shadow-xl shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Lock size={14} />
                                                    Sign In to Book
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* ──────────── MOBILE BOTTOM BAR — hidden in location/court detail ──────────── */}
            {isMobile && !activeLocationId && (
                <nav className="fixed bottom-14 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
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



            {/* ──────────── COURT DETAIL MODAL ──────────── */}
            {showCourtDetails && heroActiveCourt && (
                <div className="fixed inset-0 z-[200] flex flex-col">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
                        onClick={() => setShowCourtDetails(false)}
                    />
                    <div className="relative w-full h-full bg-white flex flex-col animate-in slide-in-from-bottom-4 duration-500 overflow-hidden">
                        {/* Header Image Section */}
                        <div className="relative h-[40vh] min-h-[220px] shrink-0">
                            <img
                                src={heroActiveCourt.imageUrl || selectedLocation?.image_url || '/images/home-images/pb2.jpg'}
                                alt={heroActiveCourt.name}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                            {/* Top bar: Back + Close */}
                            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-4 z-20">
                                <button
                                    onClick={() => { setShowCourtDetails(false); setHeroCourtId(null); }}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-white/20 backdrop-blur-md text-white rounded-xl text-xs font-bold hover:bg-white/30 transition-all"
                                >
                                    <ChevronLeft size={16} />
                                    Back to Courts
                                </button>
                                <button
                                    onClick={() => setShowCourtDetails(false)}
                                    className="p-2.5 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-xl transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="absolute bottom-5 left-5 right-5">
                                <span className="inline-block px-3 py-1 rounded-full bg-[#a3e635] text-slate-900 text-[10px] font-black uppercase tracking-widest mb-3">
                                    Court Detail
                                </span>
                                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">{heroActiveCourt.name}</h2>
                                <div className="flex items-center gap-2 mt-1.5 text-white/80">
                                    <MapPin size={14} className="text-[#a3e635]" />
                                    <span className="text-sm font-bold">{selectedLocation?.name}, {selectedLocation?.city}</span>
                                </div>
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-5 space-y-6">
                                {/* Top Stats — 2x2 grid maximized */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
                                            <PhilippinePeso className="text-blue-600" size={24} />
                                        </div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Rate</p>
                                        {(() => {
                                            const range = courtPriceRanges.get(heroActiveCourt.id);
                                            if (range && range.hasRules && range.max > 0) {
                                                return range.min === range.max
                                                    ? <p className="text-2xl font-black text-slate-900">₱{range.min}<span className="text-[10px] text-slate-400">/hr</span></p>
                                                    : <p className="text-2xl font-black text-slate-900">₱{range.min}–₱{range.max}<span className="text-[10px] text-slate-400">/hr</span></p>;
                                            } else if (heroActiveCourt.pricePerHour > 0) {
                                                return <p className="text-2xl font-black text-slate-900">₱{heroActiveCourt.pricePerHour}<span className="text-[10px] text-slate-400">/hr</span></p>;
                                            } else {
                                                return <p className="text-lg font-bold text-slate-400 italic">Not Set</p>;
                                            }
                                        })()}
                                    </div>

                                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3">
                                            <Activity className="text-emerald-600" size={24} />
                                        </div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Units</p>
                                        <p className="text-2xl font-black text-slate-900">{heroActiveCourt.numCourts} Units</p>
                                    </div>

                                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
                                            <Star className="text-blue-500 fill-blue-500" size={24} />
                                        </div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Rating</p>
                                        <p className="text-2xl font-black text-slate-900">New</p>
                                    </div>

                                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-3">
                                            <CreditCard className="text-indigo-600" size={24} />
                                        </div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Type</p>
                                        <p className="text-2xl font-black text-slate-900">{heroActiveCourt.type}</p>
                                    </div>
                                </div>

                                {/* About */}
                                <section>
                                    <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        <Info size={14} />
                                        About this Court
                                    </h3>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                        This premium {heroActiveCourt.type.toLowerCase()} facility is maintained daily to ensure professional playing standards. Located at {selectedLocation?.address}, it features state-of-the-art surfacing and amenities for all skill levels.
                                    </p>
                                </section>

                                {/* Amenities */}
                                {Array.isArray(heroActiveCourt.amenities) && heroActiveCourt.amenities.length > 0 && (
                                    <section>
                                        <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                            <CheckCircle size={14} />
                                            Amenities
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {heroActiveCourt.amenities.map((a: string, i: number) => (
                                                <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200/50">
                                                    {a}
                                                </span>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Hours */}
                                {selectedLocation?.opening_time && selectedLocation?.closing_time && (
                                    <section>
                                        <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                            <Clock size={14} />
                                            Operation Hours
                                        </h3>
                                        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                <Clock className="text-blue-600" size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900">{selectedLocation.opening_time} — {selectedLocation.closing_time}</p>
                                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">Open Today</p>
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {/* This Week's Pricing Schedule */}
                                <section>
                                    <WeeklyPricingSchedule
                                        courtId={heroActiveCourt.id}
                                        basePricePerHour={heroActiveCourt.pricePerHour || 0}
                                        courtName={heroActiveCourt.name}
                                    />
                                </section>
                            </div>
                        </div>

                        {/* Footer Action — sticky bottom */}
                        <div className="px-5 py-4 bg-white border-t border-slate-100 shrink-0 safe-area-bottom">
                            <button
                                onClick={() => {
                                    setShowCourtDetails(false);
                                    let redirectUrl = `/court/${heroActiveCourt.id}`;
                                    localStorage.setItem('auth_redirect', redirectUrl);
                                    setShowLoginModal(true);
                                }}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5"
                            >
                                <Lock size={18} />
                                Sign In to Book Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ──────────── LOCATION ENTRY CONFIRMATION MODAL ──────────── */}
            {showLocationEntryModal && selectedLocation && ReactDOM.createPortal(
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
            )}
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
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
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
                                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
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
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${filterFreeOnly ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                        <PhilippinePeso size={16} className={filterFreeOnly ? 'text-white' : 'text-slate-400'} />
                                    </div>
                                    <div className="text-left">
                                        <p className={`text-sm font-bold ${filterFreeOnly ? 'text-emerald-700' : 'text-slate-700'}`}>Free Courts Only</p>
                                        <p className="text-[10px] text-slate-400">Show locations with free courts</p>
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
                                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
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
                                className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-colors"
                            >
                                Show Results ({filteredLocations.length})
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ──────────── LOGIN MODAL ──────────── */}
            {showLoginModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setShowLoginModal(false)}
                    />
                    <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setShowLoginModal(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-xl hover:bg-slate-100"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-8 sm:p-10 text-center">
                            <div className="w-20 h-20 bg-blue-50 rounded-[24px] flex items-center justify-center mx-auto mb-8">
                                <Lock className="text-blue-600" size={36} />
                            </div>

                            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-4 leading-tight">Join the Pickleplay Community</h2>
                            <p className="text-slate-500 font-medium mb-10 leading-relaxed text-sm sm:text-base">
                                Create an account or sign in to reserve this court and start your match.
                            </p>

                            <div className="space-y-4">
                                <button
                                    onClick={() => {
                                        let redirectUrl = heroActiveCourt ? `/court/${heroActiveCourt.id}` : '/booking';
                                        navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
                                    }}
                                    className="w-full py-4.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-slate-200"
                                >
                                    <LogIn size={18} /> Sign In
                                </button>
                                <button
                                    onClick={() => {
                                        let redirectUrl = heroActiveCourt ? `/court/${heroActiveCourt.id}` : '/booking';
                                        navigate(`/signup?redirect=${encodeURIComponent(redirectUrl)}`);
                                    }}
                                    className="w-full py-4.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-blue-200"
                                >
                                    <UserPlus size={18} /> Create Account
                                </button>
                                <button
                                    onClick={() => setShowLoginModal(false)}
                                    className="w-full py-3 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
                                >
                                    Maybe later
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuestBooking;
