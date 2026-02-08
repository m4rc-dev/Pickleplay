import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, DollarSign, Clock, CheckCircle2, Loader2, Filter, Search, Navigation, AlertCircle, Ban, CircleCheck, List } from 'lucide-react';
import { Court } from '../types';
import { CourtSkeleton } from './ui/Skeleton';
import { supabase } from '../services/supabase';
import { isTimeSlotBlocked, getCourtBlockingEvents } from '../services/courtEvents';
import { autoCancelLateBookings } from '../services/bookings';
import Receipt from './Receipt';

// Always use hourly slots for simplicity
const TIME_SLOTS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
];

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
}

const Booking: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<LocationGroup | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isBooked, setIsBooked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [courts, setCourts] = useState<Court[]>([]);
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [blockedSlots, setBlockedSlots] = useState<Set<string>>(new Set());
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
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
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  // Receipt state
  // No-op

  // Get map position from URL params
  const urlLat = searchParams.get('lat');
  const urlLng = searchParams.get('lng');
  const urlZoom = searchParams.get('zoom');
  const urlCourt = searchParams.get('court');
  const urlSlot = searchParams.get('slot');

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
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

  const handleSearch = async (query: string) => {
    if (!query || !window.google) return;

    // First check if it matches a court/location name exactly
    const matchingLoc = locationGroups.find(l =>
      l.locationName.toLowerCase().includes(query.toLowerCase()) ||
      l.city.toLowerCase().includes(query.toLowerCase())
    );

    if (matchingLoc && googleMapRef.current) {
      googleMapRef.current.panTo({ lat: matchingLoc.latitude, lng: matchingLoc.longitude });
      googleMapRef.current.setZoom(15);
      triggerPulse(matchingLoc.latitude, matchingLoc.longitude);
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
        // Join with locations and get court count per location
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
              latitude,
              longitude
            )
          `)
          .eq('is_active', true);

        if (error) throw error;


        // Get court counts per location
        const locationCourtCounts = new Map<string, number>();
        if (data) {
          const locationIds = [...new Set(data.map(c => c.location_id).filter(Boolean))];
          for (const locationId of locationIds) {
            const { count } = await supabase
              .from('courts')
              .select('*', { count: 'exact', head: true })
              .eq('location_id', locationId)
              .eq('is_active', true);
            if (count !== null) locationCourtCounts.set(locationId, count);
          }
        }

        const mappedCourts: Court[] = (data || []).map(c => {
          const loc = c.locations;
          return {
            id: c.id,
            name: c.name,
            type: c.surface_type?.toLowerCase().includes('indoor') ? 'Indoor' : 'Outdoor',
            location: loc ? `${loc.address}, ${loc.city}` : 'Location not available',
            pricePerHour: parseFloat(c.base_price) || 0,
            availability: [],
            latitude: loc?.latitude || c.latitude,
            longitude: loc?.longitude || c.longitude,
            numCourts: c.num_courts || 1,
            amenities: Array.isArray(c.amenities) ? c.amenities : [],
            ownerId: c.owner_id,
            cleaningTimeMinutes: c.cleaning_time_minutes || 0,
            locationId: c.location_id,
            locationCourtCount: c.location_id ? locationCourtCounts.get(c.location_id) : undefined,
            imageUrl: c.image_url,
            courtType: c.court_type || 'Outdoor'
          };
        });


        setCourts(mappedCourts);

        // Group courts by location
        const groupedByLocation = new Map<string, LocationGroup>();
        mappedCourts.forEach(court => {
          if (!court.locationId) return;

          if (!groupedByLocation.has(court.locationId)) {
            const loc = (data || []).find((c: any) => c.id === court.id)?.locations;
            groupedByLocation.set(court.locationId, {
              locationId: court.locationId,
              locationName: loc ? loc.address.split(',')[0] : 'Court Location',
              address: court.location,
              city: loc?.city || '',
              latitude: court.latitude || 14.5995,
              longitude: court.longitude || 120.9842,
              courts: []
            });
          }
          groupedByLocation.get(court.locationId)!.courts.push(court);
        });

        setLocationGroups(Array.from(groupedByLocation.values()));
      } catch (err) {
        console.error('Error fetching courts:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourts();
  }, []);

  // Function to check court availability - extracted for reuse
  const checkCourtAvailability = async (court: Court | null, date: Date) => {
    if (!court) {
      setBlockedSlots(new Set());
      setBookedSlots(new Set());
      return;
    }

    setIsCheckingAvailability(true);
    const newBlockedSlots = new Set<string>();
    const newBookedSlots = new Set<string>();
    const targetDateStr = date.toISOString().split('T')[0];

    try {
      // 0. Auto-cancel late bookings first to free up slots immediately
      await autoCancelLateBookings();

      // 1. Fetch court events (blocking events from owner)
      const { data: events } = await getCourtBlockingEvents(court.id);

      // 2. Fetch existing bookings for selected date
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('start_time, end_time, status')
        .eq('court_id', court.id)
        .eq('date', targetDateStr)
        .not('status', 'eq', 'cancelled');

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
      }

      const bookings = bookingsData || [];

      const cleaningTimeMinutes = court.cleaningTimeMinutes || 0;
      console.log('Court cleaning time:', cleaningTimeMinutes, 'minutes');

      // Check each time slot
      for (const slot of TIME_SLOTS) {
        const { start, end } = getSlotDateTime(slot, date);

        // Check against court events
        if (events) {
          for (const event of events) {
            const eventStart = new Date(event.start_datetime);
            const eventEnd = new Date(event.end_datetime);

            // Check if slot overlaps with event
            if (start < eventEnd && end > eventStart) {
              newBlockedSlots.add(slot);
              break;
            }
          }
        }

        // Check against existing bookings (including cleaning time buffer)
        if (bookings && bookings.length > 0) {
          const startTimeStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}:00`;

          for (const booking of bookings) {
            // Parse booking start time
            const [bHours, bMinutes] = booking.start_time.split(':').map(Number);
            const bookingStart = new Date(date);
            bookingStart.setHours(bHours, bMinutes, 0, 0);

            // Parse booking end time (use actual end_time from booking)
            const [eHours, eMinutes] = booking.end_time.split(':').map(Number);
            const bookingEnd = new Date(date);
            bookingEnd.setHours(eHours, eMinutes, 0, 0);

            // Add cleaning buffer AFTER the booking ends
            const bookingEndWithCleaning = new Date(bookingEnd.getTime() + cleaningTimeMinutes * 60 * 1000);

            // Check if this slot overlaps with the booking OR the cleaning period
            if (start < bookingEndWithCleaning && end > bookingStart) {
              console.log('MATCH FOUND - slot overlaps with booking + cleaning:', slot, 'booking:', booking.start_time, '-', booking.end_time, 'cleaning buffer:', cleaningTimeMinutes, 'min');
              newBookedSlots.add(slot);
              break;
            }
          }
        }
      }

      setBlockedSlots(newBlockedSlots);
      setBookedSlots(newBookedSlots);
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

    // Cleanup interval when court changes or component unmounts
    return () => {
      clearInterval(pollInterval);
    };
  }, [selectedCourt]);

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

  useEffect(() => {
    if (!isLoading && courts.length > 0 && mapRef.current && window.google) {
      initializeMap();
    }
  }, [isLoading, courts]);

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return;

    // Use URL params for center/zoom, or default to Manila
    const center = urlLat && urlLng
      ? { lat: parseFloat(urlLat), lng: parseFloat(urlLng) }
      : { lat: 14.5995, lng: 121.0437 };

    const zoom = urlZoom ? parseInt(urlZoom) : 12;

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ],
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    });

    googleMapRef.current = map;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add markers for each location (not individual courts)
    locationGroups.forEach(location => {
      const marker = new window.google.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map,
        title: location.locationName,
        icon: {
          url: '/images/PinMarker.png',
          scaledSize: new window.google.maps.Size(28, 40),
          anchor: new window.google.maps.Point(14, 40)
        },
        label: {
          text: location.courts.length.toString(),
          color: '#ffffff',
          fontSize: '10px',
          fontWeight: 'bold',
          className: 'marker-label' // For fine-tuning if needed
        }
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="width: 240px; font-family: 'Inter', sans-serif; overflow: hidden; border-radius: 16px;">
            ${location.courts[0]?.imageUrl ? `
              <div style="height: 120px; width: 100%; border-radius: 12px 12px 0 0; overflow: hidden;">
                <img src="${location.courts[0].imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="${location.locationName}" />
              </div>
            ` : `
              <div style="height: 120px; width: 100%; background: #f1f5f9; border-radius: 12px 12px 0 0; display: flex; align-items: center; justify-content: center; color: #94a3b8;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
            `}
            <div style="padding: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
                <h3 style="margin: 0; font-weight: 800; font-size: 15px; color: #0f172a; line-height: 1.2;">${location.locationName}</h3>
                ${location.courts[0]?.courtType ? `
                  <span style="background: ${location.courts[0].courtType === 'Indoor' ? '#eff6ff' : '#f7fee7'}; color: ${location.courts[0].courtType === 'Indoor' ? '#2563eb' : '#4d7c0f'}; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 6px; margin-left: 8px;">${location.courts[0].courtType.toUpperCase()}</span>
                ` : ''}
              </div>
              <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span style="font-size: 11px; color: #64748b; font-weight: 500;">${location.city || location.address.split(',')[1] || ''}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 800; font-size: 14px; color: #3b82f6;">${location.courts.length} ${location.courts.length === 1 ? 'Court' : 'Courts'}</span>
                <span style="font-size: 10px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 6px; border-radius: 4px;">AVAILABLE</span>
              </div>
            </div>
          </div>
        `,
        disableAutoPan: true
      });

      marker.addListener('click', () => {
        setSelectedLocation(location);
        setSelectedCourt(null); // Reset court selection
        setSelectedSlot(null); // Reset slot
        map.panTo({ lat: location.latitude, lng: location.longitude });
        map.setZoom(16);
        triggerPulse(location.latitude, location.longitude);
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
    });
  };

  useEffect(() => {
    if (googleMapRef.current) {
      initializeMap();
    }
  }, [locationGroups]);

  const handleBooking = async () => {
    if (selectedCourt && selectedSlot) {
      setIsProcessing(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

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
        const targetDateStr = selectedDate.toISOString().split('T')[0];

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

        // 3.5. COURT EVENT BLOCKING CHECK - Check if court owner has blocked this time
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
            is_checked_in: false
          })
          .select()
          .single();

        if (bookingError) throw bookingError;

        // 2. Create Notification for Owner
        if (selectedCourt.ownerId && bookingData) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: selectedCourt.ownerId,
              actor_id: user.id,
              type: 'BOOKING',
              message: `has booked ${selectedCourt.name} for ${selectedSlot}.`,
              booking_id: bookingData.id
            });

          if (notifError) {
            console.error('Notification error:', notifError);
            alert(`Notification failed: ${notifError.message}`);
          } else {
            console.log('Notification sent to owner:', selectedCourt.ownerId);
          }
        } else {
          console.warn('No ownerId found for this court - skipping notification.');
          alert('Warning: This court has no owner assigned. No notification sent.');
        }

        // Update cooldown timestamp
        setLastBookingTime(Date.now());

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

        // Clear selection after a delay
        setTimeout(() => {
          setSelectedSlot(null);
        }, 1000);
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
    if (navigator.geolocation && googleMapRef.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          // Remove existing user marker if it exists
          if (userMarkerRef.current) {
            userMarkerRef.current.setMap(null);
          }

          // Add user location marker with custom icon
          const userMarker = new window.google.maps.Marker({
            position: userLocation,
            map: googleMapRef.current,
            title: 'Your Location',
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            },
            zIndex: 1000 // Show on top of other markers
          });

          // Add pulsing animation info window
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; font-family: Inter, sans-serif; text-align: center;">
                <p style="margin: 0; font-weight: 800; font-size: 12px; color: #3b82f6;">📍 You are here</p>
              </div>
            `,
          });

          infoWindow.open(googleMapRef.current, userMarker);

          // Store reference to user marker
          userMarkerRef.current = userMarker;

          googleMapRef.current.panTo(userLocation);
          googleMapRef.current.setZoom(14);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please enable location services.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleViewBookings = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/my-bookings');
  };

  return (
    <div className="pt-16 md:pt-44 pb-24 md:pb-12 px-4 md:px-12 lg:px-24 max-w-[1920px] mx-auto min-h-screen relative">
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-3">
          {isSearchExpanded ? (
            <div className="flex-1 relative">
              <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-1">
                <Search size={18} className="text-slate-400" />
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
                  className="flex-1 bg-transparent border-none outline-none py-2 text-sm font-bold text-slate-900"
                />
                <button onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }} className="p-1 text-slate-400 font-bold text-xs uppercase tracking-tighter hover:text-slate-600">
                  Cancel
                </button>
              </div>

              {/* Search Dropdown */}
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-[60vh] overflow-y-auto">
                {/* Places Section */}
                {userCity && (
                  <>
                    <p className="px-4 py-2 text-[10px] font-black text-teal-600 uppercase tracking-widest border-b border-slate-50">Places</p>
                    <button
                      onClick={() => {
                        setSearchQuery(userCity.split(',')[0]);
                        handleSearch(userCity.split(',')[0]);
                        setIsSearchExpanded(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full border-2 border-teal-400 flex items-center justify-center text-teal-500">
                        <MapPin size={16} />
                      </div>
                      <span className="text-slate-800 font-semibold text-sm">{userCity}</span>
                    </button>
                  </>
                )}

                {/* Courts Section */}
                <p className="px-4 py-2 text-[10px] font-black text-teal-600 uppercase tracking-widest border-b border-slate-50">Courts</p>
                <div className="max-h-[300px] overflow-y-auto">
                  {locationGroups
                    .filter(l => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return l.locationName.toLowerCase().includes(q) ||
                        l.city.toLowerCase().includes(q) ||
                        l.address.toLowerCase().includes(q);
                    })
                    .slice(0, 8)
                    .map((location) => (
                      <button
                        key={location.locationId}
                        onClick={() => {
                          setSearchQuery(location.locationName);
                          if (googleMapRef.current) {
                            googleMapRef.current.panTo({ lat: location.latitude, lng: location.longitude });
                            googleMapRef.current.setZoom(16);
                            triggerPulse(location.latitude, location.longitude);
                          }
                          setSelectedLocation(location);
                          setViewMode('map');
                          setIsSearchExpanded(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-teal-500">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
                            <line x1="12" y1="17" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <circle cx="10" cy="8" r="1" fill="currentColor" />
                            <circle cx="14" cy="8" r="1" fill="currentColor" />
                            <circle cx="12" cy="11" r="1" fill="currentColor" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-900 font-bold text-sm truncate">{location.locationName}</p>
                          <p className="text-xs text-slate-400 truncate">{location.city} · {location.courts.length} court{location.courts.length > 1 ? 's' : ''}</p>
                        </div>
                      </button>
                    ))}
                  {locationGroups.length === 0 && (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-slate-400">No courts found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <button
                className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-400 hover:text-blue-600 transition-colors"
                onClick={() => setIsSearchExpanded(true)}
              >
                <Search size={18} />
              </button>
              <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar">
                {(['Courts', 'Games', 'Lessons'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type === 'Courts' ? 'All' : 'All' as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider whitespace-nowrap border-2 transition-all ${type === 'Courts'
                      ? 'border-blue-600 bg-white text-slate-900 shadow-sm'
                      : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${type === 'Courts' ? 'bg-blue-500' :
                      type === 'Games' ? 'bg-cyan-400' : 'bg-yellow-400'
                      }`}></span>
                    {type}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="">
        {/* Desktop Header */}
        <div className="hidden md:block space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-4">COURTS / 2026</p>
              <h1 className="text-4xl md:text-6xl font-black text-slate-950 tracking-tighter uppercase leading-[0.8]">
                Book a Court {searchParams.get('loc') || userCity ? (
                  <span className="text-blue-600">in {(searchParams.get('loc') || userCity || '').split(',')[0]}.</span>
                ) : <span className="text-blue-600">Now.</span>}
              </h1>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <button
                onClick={() => navigate('/')}
                className="px-6 md:px-8 py-3 md:py-4 bg-lime-400 border-2 border-lime-400 text-slate-950 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] rounded-2xl hover:bg-lime-500 hover:border-lime-500 transition-all shadow-2xl shadow-lime-200/50"
              >
                Back to Home
              </button>
              <button
                onClick={handleViewBookings}
                className="px-6 md:px-8 py-3 md:py-4 bg-white border-2 border-slate-950 text-slate-950 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] rounded-2xl hover:bg-slate-950 hover:text-white transition-all shadow-2xl shadow-slate-200/50"
              >
                Booked Courts
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            {(['All', 'Indoor', 'Outdoor'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-10 py-3.5 rounded-full font-black text-[11px] uppercase tracking-widest transition-all duration-300 active:scale-95 ${filterType === type
                  ? 'bg-blue-600 text-white shadow-2xl shadow-blue-400/40 ring-4 ring-blue-600/10'
                  : 'bg-white text-slate-400 border border-slate-100 hover:border-blue-400 hover:text-blue-600 shadow-sm'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start md:mt-8">
          {/* Sidebar - List View */}
          <div className={`lg:col-span-4 space-y-6 ${viewMode === 'map' ? 'hidden md:block' : 'block'}`}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(searchQuery);
              }}
              className="hidden md:flex gap-3"
            >
              <div className="relative flex-1 group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Search courts by name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(searchQuery);
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-[24px] py-4 pl-14 pr-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all shadow-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleNearMe}
                className="flex items-center gap-3 px-8 py-4 bg-[#a3e635] text-slate-900 rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-[#bef264] transition-all shadow-xl shadow-lime-200/50 shrink-0"
              >
                <Navigation size={18} fill="currentColor" />
                <span>Near Me</span>
              </button>
            </form>

            <div className="md:hidden mb-4">
              <p className="text-sm font-bold text-slate-600">
                {locationGroups.length} pickleball courts near you
              </p>
            </div>

            {selectedCourt ? (
              /* Court Selected - Show availability and booking interface */
              <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                <div>
                  {/* Back to location button */}
                  <button
                    onClick={() => setSelectedCourt(null)}
                    className="group inline-flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-6 px-4 py-2 bg-blue-50 rounded-full hover:bg-blue-100 transition-all"
                  >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Courts
                  </button>

                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">{selectedCourt.name}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${selectedCourt.type === 'Indoor'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-lime-50 text-lime-600'
                        }`}>
                        {selectedCourt.type}
                      </span>
                      <span className="text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider bg-amber-50 text-amber-700">
                        {selectedCourt.numCourts} {selectedCourt.numCourts === 1 ? 'Unit' : 'Units'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-4">
                    <MapPin size={12} className="shrink-0" />
                    <span className="leading-snug">{selectedCourt.location}</span>
                  </div>

                  {selectedCourt.amenities && (selectedCourt.amenities as string[]).length > 0 && (
                    <div className="mb-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Amenities</p>
                      <div className="flex flex-wrap gap-1">
                        {(selectedCourt.amenities as string[]).map((amenity, idx) => (
                          <span key={idx} className="text-[8px] font-bold px-1.5 py-0.5 bg-slate-50 text-slate-600 rounded-sm border border-slate-100 uppercase tracking-wider italic">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl text-white shadow-lg">
                    <div>
                      <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Rate</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black">₱{selectedCourt.pricePerHour}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">/hr</span>
                      </div>
                    </div>
                    <Navigation size={18} className="text-lime-400" />
                  </div>

                  {/* Cleaning Time Info */}
                  {selectedCourt.cleaningTimeMinutes > 0 && (
                    <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                      <Clock size={12} className="text-blue-600 shrink-0" />
                      <p className="text-[9px] text-blue-700 leading-relaxed">
                        <span className="font-bold">{selectedCourt.cleaningTimeMinutes >= 60 ? `${Math.floor(selectedCourt.cleaningTimeMinutes / 60)}h ${selectedCourt.cleaningTimeMinutes % 60 > 0 ? `${selectedCourt.cleaningTimeMinutes % 60}m` : ''}` : `${selectedCourt.cleaningTimeMinutes} min`} cleaning buffer</span> after each booking
                      </p>
                    </div>
                  )}
                </div>

                {/* Date Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <CalendarIcon size={14} className="text-blue-600" />
                      Choose Date
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg uppercase tracking-wider">
                        {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 -mx-2 px-2">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() + i);
                      const isSelected = selectedDate.toDateString() === date.toDateString();
                      const dayName = date.toLocaleDateString(undefined, { weekday: 'short' });
                      const dayNum = date.getDate();

                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setSelectedDate(date);
                            setSelectedSlot(null); // Reset slot when date changes
                          }}
                          className={`flex flex-col items-center py-3 rounded-xl border transition-all duration-300 ${isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100'
                            : 'bg-slate-50 border-transparent text-slate-400 hover:border-blue-200 hover:bg-white'
                            }`}
                        >
                          <span className={`text-[8px] font-black uppercase mb-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                            {dayName.slice(0, 3)}
                          </span>
                          <span className="text-sm font-black tracking-tighter">
                            {dayNum}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <Clock size={14} className="text-blue-600" />
                      Available Times
                    </h4>
                    {isCheckingAvailability && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Loader2 size={10} className="animate-spin" /> Checking...
                      </span>
                    )}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-2 mb-3 text-[9px]">
                    <span className="flex items-center gap-1 text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-white border border-slate-200"></span> Available
                    </span>
                    <span className="flex items-center gap-1 text-amber-600">
                      <span className="w-2 h-2 rounded-full bg-amber-100 border border-amber-300"></span> Booked
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <span className="w-2 h-2 rounded-full bg-red-100 border border-red-300"></span> Blocked
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {TIME_SLOTS.map(slot => {
                      const isBlocked = blockedSlots.has(slot);
                      const isBooked = bookedSlots.has(slot);
                      const isUnavailable = isBlocked || isBooked;

                      return (
                        <button
                          key={slot}
                          onClick={() => !isUnavailable && setSelectedSlot(slot)}
                          disabled={isUnavailable}
                          title={isBlocked ? 'Court event scheduled' : isBooked ? 'Already booked' : 'Available'}
                          className={`py-2 px-2.5 rounded-lg font-semibold text-xs transition-all border relative ${isBlocked
                            ? 'bg-red-50 text-red-400 border-red-200 cursor-not-allowed'
                            : isBooked
                              ? 'bg-amber-50 text-amber-400 border-amber-200 cursor-not-allowed'
                              : selectedSlot === slot
                                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                            }`}
                        >
                          <span className={isUnavailable ? 'line-through' : ''}>{slot}</span>
                          {isBlocked && (
                            <Ban size={10} className="absolute top-1 right-1 text-red-400" />
                          )}
                          {isBooked && !isBlocked && (
                            <AlertCircle size={10} className="absolute top-1 right-1 text-amber-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Availability Summary */}
                  {(blockedSlots.size > 0 || bookedSlots.size > 0) && (
                    <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] text-slate-500">
                        <span className="font-bold text-slate-700">{TIME_SLOTS.length - blockedSlots.size - bookedSlots.size}</span> of {TIME_SLOTS.length} slots available on this date
                        {blockedSlots.size > 0 && (
                          <span className="text-red-500"> • {blockedSlots.size} blocked by owner</span>
                        )}
                        {bookedSlots.size > 0 && (
                          <span className="text-amber-500"> • {bookedSlots.size} already booked</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Policy Reminder */}
                <div className="flex items-start gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                  <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-700 leading-relaxed font-medium italic">
                    Please arrive on time. Your booking is subject to cancellation if you are more than <span className="font-bold underline">10 minutes late</span>.
                  </p>
                </div>

                {/* Booking Button */}
                <button
                  disabled={!selectedSlot || isBooked || isProcessing || (selectedSlot && (blockedSlots.has(selectedSlot) || bookedSlots.has(selectedSlot)))}
                  onClick={handleBooking}
                  className={`w-full py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${isBooked
                    ? 'bg-lime-400 text-slate-900 cursor-default'
                    : 'bg-lime-400 hover:bg-lime-500 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-lime-100'
                    }`}
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : (
                    isBooked ? (
                      <>
                        <CheckCircle2 size={20} />
                        Booking Confirmed!
                      </>
                    ) : selectedSlot && blockedSlots.has(selectedSlot) ? (
                      <>
                        <Ban size={18} />
                        Court Blocked
                      </>
                    ) : selectedSlot && bookedSlots.has(selectedSlot) ? (
                      <>
                        <AlertCircle size={18} />
                        Already Booked
                      </>
                    ) : (
                      'Confirm Booking'
                    )
                  )}
                </button>
              </div>
            ) : selectedLocation ? (
              /* Location Selected - Show courts at this location */
              <div className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">{selectedLocation.locationName}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1">
                        <MapPin size={12} className="shrink-0" />
                        <span className="leading-snug">{selectedLocation.address}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider bg-amber-50 text-amber-700">
                      {selectedLocation.courts.length} {selectedLocation.courts.length === 1 ? 'Court' : 'Courts'}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-3">Select a Court</h4>
                  <div className="space-y-2 max-h-[450px] overflow-y-auto">
                    {selectedLocation.courts.map(court => (
                      <button
                        key={court.id}
                        onClick={() => navigate(`/court/${court.id}`)}
                        className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-bold text-sm text-slate-900">{court.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${court.type === 'Indoor'
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-lime-50 text-lime-600'
                                }`}>
                                {court.type}
                              </span>
                              <span className="text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-600">
                                {court.numCourts} {court.numCourts === 1 ? 'Unit' : 'Units'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-slate-900">₱{court.pricePerHour}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">/hour</p>
                          </div>
                        </div>
                        {court.amenities && (court.amenities as string[]).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(court.amenities as string[]).slice(0, 3).map((amenity, idx) => (
                              <span key={idx} className="text-[7px] font-bold px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded border border-slate-100 uppercase italic">
                                {amenity}
                              </span>
                            ))}
                            {(court.amenities as string[]).length > 3 && (
                              <span className="text-[7px] font-bold px-1.5 py-0.5 text-slate-400">
                                +{(court.amenities as string[]).length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white md:bg-transparent rounded-[32px] md:rounded-none border-0 md:border-0 shadow-none overflow-hidden flex flex-col min-h-[500px]">
                <div className="hidden md:block p-8 border-b border-slate-50">
                  <h2 className="text-xs font-black text-slate-950 uppercase tracking-[0.2em]">
                    {searchParams.get('loc') || userCity ? `Courts in ${(searchParams.get('loc') || userCity || '').split(',')[0]}` : 'All Locations'} ({locationGroups.length})
                  </h2>
                </div>
                <div className="space-y-4 md:space-y-2 max-h-none md:max-h-[650px] overflow-y-auto custom-scrollbar flex-1">
                  {isLoading ? (
                    Array(3).fill(0).map((_, i) => <CourtSkeleton key={i} />)
                  ) : (
                    locationGroups
                      .filter(l => {
                        const q = searchQuery.toLowerCase();
                        const locParam = searchParams.get('loc')?.toLowerCase() || '';
                        const matchesSearch = !searchQuery || l.city.toLowerCase().includes(q) || l.locationName.toLowerCase().includes(q) || l.address.toLowerCase().includes(q);
                        const matchesLoc = !locParam || searchQuery || l.city.toLowerCase().includes(locParam) || l.address.toLowerCase().includes(locParam);
                        const matchesFilter = filterType === 'All' || l.courts.some(c => c.type === filterType);
                        return matchesSearch && matchesLoc && matchesFilter;
                      })
                      .map(location => (
                        <button
                          key={location.locationId}
                          onClick={() => {
                            if (window.innerWidth < 768) {
                              setSelectedLocation(location);
                              setSelectedCourt(location.courts[0]); // Select first court for simplicity on mobile
                            } else {
                              setSelectedLocation(location);
                              if (googleMapRef.current) {
                                googleMapRef.current.panTo({ lat: location.latitude, lng: location.longitude });
                                googleMapRef.current.setZoom(16);
                                triggerPulse(location.latitude, location.longitude);
                              }
                            }
                          }}
                          className="w-full group flex flex-row items-center gap-4 p-4 md:p-5 bg-white md:bg-transparent rounded-2xl md:rounded-[28px] border border-slate-100 md:border-0 hover:bg-slate-50 transition-all duration-300 shadow-sm md:shadow-none"
                        >
                          <div className="w-20 h-20 md:w-16 md:h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                            <img
                              src={`https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=200&h=200`}
                              alt={location.locationName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-black text-slate-900 text-sm md:text-base tracking-tight mb-1 group-hover:text-blue-600 transition-colors uppercase italic line-clamp-1">{location.locationName}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <span className="text-blue-500">🎾</span> {location.courts.length} Courts
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <span className="text-blue-500">⊞</span> Perm. Lines
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <span className="text-blue-500">₱</span> Fee
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <span className="text-blue-500">🥅</span> Perm. Nets
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Map View */}
          <div className={`lg:col-span-8 md:sticky md:top-36 ${viewMode === 'list' && !isMobile ? 'hidden md:block' : 'block'}`}>
            <div className={`-mx-4 md:mx-0 bg-white rounded-none md:rounded-[48px] border-0 md:border md:border-slate-200 shadow-none md:shadow-sm overflow-hidden relative ${viewMode === 'list' ? 'h-0 md:h-[750px] opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto' : 'h-[80vh] md:h-[750px] opacity-100'}`}>
              {isLoading ? (
                <div className="h-full bg-slate-100 flex items-center justify-center">
                  <Loader2 className="animate-spin text-blue-600" size={40} />
                </div>
              ) : (
                <div ref={mapRef} className="h-full w-full" />
              )}
              {/* Mobile Court Slider - Visible only on map view mobile */}
              {!isLoading && isMobile && viewMode === 'map' && (
                <div className="absolute bottom-4 left-0 right-0 z-10">
                  <div className="flex gap-3 overflow-x-auto px-4 pb-4 no-scrollbar snap-x">
                    {locationGroups.map(location => (
                      <button
                        key={location.locationId}
                        onClick={() => {
                          setSelectedLocation(location);
                          if (googleMapRef.current) {
                            googleMapRef.current.panTo({ lat: location.latitude, lng: location.longitude });
                            googleMapRef.current.setZoom(16);
                          }
                        }}
                        className="flex-shrink-0 w-[240px] bg-white rounded-2xl shadow-xl border border-slate-100 p-3 flex gap-3 snap-center text-left"
                      >
                        <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                          <img
                            src={location.courts[0]?.imageUrl || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=200&h=200'}
                            alt={location.locationName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-slate-900 text-[10px] uppercase truncate italic">{location.locationName}</h4>
                          <p className="text-[9px] text-slate-500 line-clamp-1 mb-1">{location.address}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-blue-600">₱{location.courts[0]?.pricePerHour}/hr</span>
                            <span className="text-[8px] bg-lime-400/20 text-lime-700 px-1.5 py-0.5 rounded font-bold">BOOK NOW</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Desktop Zoom Control */}
              <div className="hidden md:flex absolute top-6 right-6 flex-col gap-3">
                <button
                  onClick={() => googleMapRef.current?.setZoom((googleMapRef.current?.getZoom() || 12) + 1)}
                  className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-slate-600 hover:text-blue-600 transition-all border border-slate-100"
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>
                </button>
              </div>

              {/* Mobile Floating Action Buttons - Removed from here to be global */}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Menu */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-6 py-3 flex justify-between items-center z-[100] shadow-[0_-8px_30px_rgb(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]">
        <button
          onClick={() => setViewMode('list')}
          className={`flex flex-col items-center gap-1 transition-all ${viewMode === 'list' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-blue-50' : ''}`}>
            <List size={20} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter text-center">List View</span>
        </button>

        <button
          onClick={() => setViewMode('map')}
          className={`flex flex-col items-center gap-1 transition-all ${viewMode === 'map' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${viewMode === 'map' ? 'bg-blue-50' : ''}`}>
            <MapPin size={20} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter text-center">Map View</span>
        </button>

        <button
          onClick={() => setShowFilters(true)}
          className="flex flex-col items-center gap-1 transition-all text-slate-400"
        >
          <div className="p-2 rounded-xl transition-all">
            <Filter size={20} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter text-center">Filters</span>
        </button>
      </nav>

      {/* Mobile Filters Drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-[110] flex items-end md:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
          <div className="relative w-full bg-white rounded-t-[32px] shadow-2xl p-6 h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-slate-900">More Filters</h2>
              <button onClick={() => setShowFilters(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <CircleCheck className="rotate-45" size={24} />
              </button>
            </div>

            <div className="space-y-8 pb-32">
              <section>
                <h3 className="text-sm font-bold text-slate-900 mb-4">Type</h3>
                <div className="space-y-3">
                  {['Indoor Courts', 'Outdoor Courts', 'Lighted Courts', 'Dedicated Courts'].map(type => (
                    <label key={type} className="flex items-center gap-3 group cursor-pointer">
                      <div className="w-5 h-5 border-2 border-slate-200 rounded-md group-hover:border-blue-500 transition-colors"></div>
                      <span className="text-sm font-medium text-slate-600">{type}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-900 mb-4">Access</h3>
                <div className="space-y-3">
                  {['Public Court', 'Private Court', 'Membership Required'].map(access => (
                    <label key={access} className="flex items-center gap-3 group cursor-pointer">
                      <div className="w-5 h-5 border-2 border-slate-200 rounded-md group-hover:border-blue-500 transition-colors"></div>
                      <span className="text-sm font-medium text-slate-600">{access}</span>
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 flex items-center justify-between gap-4">
              <button onClick={() => setShowFilters(false)} className="text-sm font-bold text-orange-500 hover:text-orange-600">
                Clear filters
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 py-3.5 bg-cyan-600 text-white font-bold rounded-2xl text-sm hover:bg-cyan-700 transition-all"
              >
                View {locationGroups.length} Courts
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
                  setShowReceipt(true);
                }}
                className="w-full py-5 bg-blue-600 text-white font-black rounded-[24px] text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
              >
                View My Receipt
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setIsBooked(false);
                  setSelectedSlot(null);
                }}
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

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <Receipt
          bookingData={receiptData}
          onClose={() => {
            setShowReceipt(false);
            setIsBooked(false);
          }}
        />
      )}
    </div>
  );
};

export default Booking;
