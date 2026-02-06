import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, DollarSign, Clock, CheckCircle2, Loader2, Filter, Search, Navigation, AlertCircle, Ban } from 'lucide-react';
import { Court } from '../types';
import { CourtSkeleton } from './ui/Skeleton';
import { supabase } from '../services/supabase';
import { isTimeSlotBlocked, getCourtBlockingEvents } from '../services/courtEvents';
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
  const [mapCenter, setMapCenter] = useState({ lat: 14.5995, lng: 120.9842 });
  const [mapZoom, setMapZoom] = useState(11);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [lastBookingTime, setLastBookingTime] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<'All' | 'Indoor' | 'Outdoor'>('All');
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || searchParams.get('court') || '');

  // Receipt state
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

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

  // New states for availability checking
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAdvanceOptions, setShowAdvanceOptions] = useState(false);
  const [blockedSlots, setBlockedSlots] = useState<Set<string>>(new Set());
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

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
              longitude
            )
          `)
          .eq('is_active', true);

        if (error) throw error;

        const mappedCourts: Court[] = (data || []).map(c => ({
          id: c.id,
          name: c.name,
          type: c.surface_type?.toLowerCase().includes('indoor') ? 'Indoor' : 'Outdoor',
          location: `${c.address}, ${c.city}`,
          pricePerHour: parseFloat(c.base_price) || 0,
          availability: [],
          latitude: c.latitude,
          longitude: c.longitude,
          numCourts: c.num_courts || 1,
          amenities: Array.isArray(c.amenities) ? c.amenities : [],
          ownerId: c.owner_id,
          cleaningTimeMinutes: c.cleaning_time_minutes || 0
        }));
          .select(`
            *,
            locations!inner (
              id,
              address,
              city,
              latitude,
              longitude
            )
          `);

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
            locationCourtCount: c.location_id ? locationCourtCounts.get(c.location_id) : undefined
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
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: '#f59e0b',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        label: {
          text: location.courts.length.toString(),
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 'bold'
        }
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: Inter, sans-serif;">
            <p style="margin: 0; font-weight: 800; font-size: 14px; color: #0f172a;">${location.locationName}</p>
            <p style="margin: 4px 0 0; font-weight: 600; font-size: 12px; color: #3b82f6;">${location.courts.length} ${location.courts.length === 1 ? 'Court' : 'Courts'} Available</p>
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
            payment_status: 'unpaid'
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
          playerName: profileData?.full_name || profileData?.username || 'Guest'
        });

        // Show receipt instead of just success message
        setShowReceipt(true);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-2">COURTS / 2025</p>
          <h1 className="text-3xl md:text-4xl font-black text-slate-950 tracking-tighter uppercase">Book a Court.</h1>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Filter Chips */}
          <div className="flex gap-2">
            {(['All', 'Indoor', 'Outdoor'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${filterType === type
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-400'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Search Bar and Near Me Button */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search courts by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <button
              onClick={handleNearMe}
              className="flex items-center gap-2 px-6 py-3 bg-lime-400 text-slate-900 rounded-2xl font-bold text-sm hover:bg-lime-500 transition-all shadow-lg shadow-lime-100"
            >
              <Navigation size={18} />
              Near Me
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="h-[400px] bg-slate-100 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={40} />
              </div>
            ) : (
              <div ref={mapRef} className="h-[400px] w-full" />
            )}
          </div>
        </div>

        {/* Location & Court Selection Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {selectedCourt ? (
            /* Court Selected - Show availability and booking interface */
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div>
                {/* Back to location button */}
                <button
                  onClick={() => setSelectedCourt(null)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-1"
                >
                  ← Back to Courts
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
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <CalendarIcon size={14} className="text-blue-600" />
                    {showAdvanceOptions ? 'Select Date' : 'Booking for Today'}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-tight">
                      {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <button
                      onClick={() => setShowAdvanceOptions(!showAdvanceOptions)}
                      className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-all ${showAdvanceOptions
                        ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100'
                        }`}
                    >
                      {showAdvanceOptions ? 'Hide Calendar' : 'Advance Booking'}
                    </button>
                  </div>
                </div>

                {showAdvanceOptions && (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1 animate-in slide-in-from-top-2 duration-300">
                    {Array.from({ length: 14 }).map((_, i) => {
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
                          className={`flex flex-col items-center min-w-[54px] py-2.5 rounded-xl border transition-all ${isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100'
                            : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-blue-200 hover:bg-white'
                            }`}
                        >
                          <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                            {dayName}
                          </span>
                          <span className="text-sm font-black">
                            {dayNum}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
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
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
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
                      onClick={() => setSelectedCourt(court)}
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
            /* No Selection - Show prompt to select location */
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-center">
              <MapPin size={40} className="mx-auto text-slate-300 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 mb-1.5">Select a Location</h3>
              <p className="text-xs text-slate-500">Click on a location marker on the map to view available courts.</p>
            </div>
          )}

          {/* All Locations List */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <h4 className="text-xs font-bold text-slate-900 mb-3">All Locations ({locationGroups.length})</h4>
            <div className="space-y-1.5 max-h-[250px] overflow-y-auto scrollbar-hide">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => <CourtSkeleton key={i} />)
              ) : (
                locationGroups.map(location => (
                  <button
                    key={location.locationId}
                    onClick={() => {
                      setSelectedLocation(location);
                      setSelectedCourt(null);
                      setSelectedSlot(null);
                      if (googleMapRef.current) {
                        googleMapRef.current.panTo({ lat: location.latitude, lng: location.longitude });
                        googleMapRef.current.setZoom(16);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${selectedLocation?.locationId === location.locationId
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-sm text-slate-900">{location.locationName}</p>
                        <p className="text-xs text-slate-500">{location.city}</p>
                      </div>
                      <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-md">
                        {location.courts.length} {location.courts.length === 1 ? 'Court' : 'Courts'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

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
    </div >
  );
};

export default Booking;
