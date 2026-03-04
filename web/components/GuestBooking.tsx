import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, DollarSign, Clock, CheckCircle2, Loader2, Filter, Search, Navigation, Lock, X, LogIn, UserPlus, Ban, List, CircleCheck, Funnel, Star, ChevronLeft, Building2, CheckCircle, Activity, CreditCard, Info, SlidersHorizontal } from 'lucide-react';
import { Court } from '../types';
import { CourtSkeleton } from './ui/Skeleton';
import { supabase } from '../services/supabase';

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
    const openH = parseInt(openTime.split(':')[0], 10);
    const closeH = parseInt(closeTime.split(':')[0], 10);
    return ALL_HOUR_SLOTS.filter((_, idx) => idx >= openH && idx < closeH);
};

const TIME_SLOTS = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
];

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

    const handleCloseFilters = () => {
        setIsFilterClosing(true);
        setTimeout(() => { setShowFilters(false); setIsFilterClosing(false); }, 400);
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
    const [searchParams] = useSearchParams();
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
    const urlLat = searchParams.get('lat');
    const urlLng = searchParams.get('lng');
    const urlZoom = searchParams.get('zoom');
    const urlCourt = searchParams.get('court');
    const urlLocationId = searchParams.get('locationId');

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
                    `);

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
        if (urlLocationId && urlLat && urlLng && googleMapRef.current && !isLoading) {
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
    }, [urlLocationId, urlLat, urlLng, urlZoom, isLoading]);

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
                    navigate(`/booking?locationId=${location.id}&lat=${location.latitude}&lng=${location.longitude}&zoom=19&loc=${encodeURIComponent(location.city)}`);
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

    return (
        <div className="min-h-screen bg-white md:bg-gradient-to-b md:from-slate-50 md:to-white">
            {/* ──────────── MOBILE HEADER BAR ──────────── */}
            <div className="md:hidden fixed top-14 left-0 right-0 z-40 bg-white border-b border-slate-200/60 shadow-sm">
                {/* Search row — hidden when viewing location detail */}
                <div className={`px-4 pt-3 pb-2 transition-all duration-300 ${urlLocationId && selectedLocation ? 'hidden' : ''}`}>
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
                                                    navigate(`/booking?locationId=${location.id}&lat=${location.latitude}&lng=${location.longitude}&zoom=19&loc=${encodeURIComponent(location.city)}`);
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
                                onClick={() => setShowFilters(true)}
                                className={`w-10 h-10 flex items-center justify-center rounded-2xl shadow-lg active:scale-95 transition-all relative ${
                                    (filterType !== 'All' || filterFreeOnly || filterAmenities.length > 0)
                                        ? 'bg-[#1E40AF] text-white' : 'bg-white border border-slate-200 text-slate-600'
                                }`}
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
                {urlLocationId && selectedLocation && (
                  <div className="px-4 pt-2 pb-2 flex items-center gap-3">
                    <button
                      onClick={() => navigate('/booking')}
                      className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 hover:text-[#1E40AF] uppercase tracking-widest transition-colors group"
                    >
                      <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                      Back to Locations
                    </button>
                    <span className="text-xs font-bold text-slate-600 truncate ml-auto">{selectedLocation.name}</span>
                  </div>
                )}


            </div>

            {/* ──────────── MAIN CONTAINER ──────────── */}
            <div className={`md:pt-28 pb-0 md:pb-10 px-0 md:px-6 lg:px-10 xl:px-16 max-w-[1600px] mx-auto ${urlLocationId && selectedLocation ? 'pt-[100px] sm:pt-[104px]' : 'pt-[136px] sm:pt-[140px]'}`}>

                {/* ──────────── DESKTOP HEADER ──────────── */}
                <div className="hidden md:block mb-6 lg:mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
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
                    </div>


                </div>

                {/* ──────────── MAIN CONTENT GRID ──────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-5 gap-0 lg:gap-6 xl:gap-8 items-start">

                    {/* ═══ LEFT COLUMN ═══ */}
                    <div className={`lg:col-span-2 xl:col-span-2 ${(urlLocationId || viewMode === 'list') ? 'block' : 'hidden md:block'}`}>
                        {/* Desktop Search Bar — hidden when viewing location detail */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSearch(searchQuery);
                                setShowDesktopSuggestions(false);
                            }}
                            className={`hidden md:flex gap-3 mb-5 relative transition-all duration-300 ${urlLocationId && selectedLocation ? 'opacity-0 max-h-0 overflow-hidden mb-0 pointer-events-none' : 'opacity-100 max-h-[100px]'}`}
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
                                                    <Navigation size={14} className="text-[#1E40AF]" fill="currentColor" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[#1E40AF]">Enable Location</p>
                                                    <p className="text-xs text-slate-400">Allow GPS to find courts near you</p>
                                                </div>
                                            </button>
                                        )}

                                        {userCity && (
                                            <>
                                                <p className="px-5 pt-3 pb-1 text-[10px] font-black text-[#1E40AF] uppercase tracking-[0.15em]">Places</p>
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
                                className={`flex items-center gap-2 px-5 lg:px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all shadow-lg shrink-0 active:scale-[0.98] relative ${
                                    (filterType !== 'All' || filterFreeOnly || filterAmenities.length > 0)
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

                        {/* ─── Navigation buttons (desktop, location detail view) ─── */}
                        {urlLocationId && selectedLocation && !heroActiveCourt && (
                            <button
                                onClick={() => navigate('/booking')}
                                className="hidden md:flex items-center gap-1.5 text-[11px] font-black text-slate-400 hover:text-[#1E40AF] uppercase tracking-widest mb-4 transition-colors group"
                            >
                                <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                                Back to Locations
                            </button>
                        )}
                        {heroActiveCourt && !selectedCourt && (
                            <button
                                onClick={() => setHeroCourtId(null)}
                                className="hidden md:flex items-center gap-1.5 text-[11px] font-black text-slate-400 hover:text-[#1E40AF] uppercase tracking-widest mb-4 transition-colors group"
                            >
                                <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                                Back to Courts at {selectedLocation?.name}
                            </button>
                        )}

                        {/* ─── List Container ─── */}
                        <div className={`bg-white md:rounded-2xl md:border md:border-slate-200/60 md:shadow-sm overflow-hidden flex flex-col md:h-auto md:max-h-[calc(100vh-280px)] lg:max-h-[calc(100vh-300px)] ${urlLocationId ? 'h-[calc(100vh-100px)]' : 'h-[calc(100vh-150px)]'}`}>

                            {/* Location Detail Header — mobile only (desktop shows hero in right column) */}
                            {urlLocationId && selectedLocation && (
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

                            {isLoadingLocationDetail && urlLocationId && (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="animate-spin text-[#1E40AF]" size={28} />
                                </div>
                            )}

                            {/* Section title */}
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                                <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    {urlLocationId && selectedLocation
                                        ? `Courts at ${selectedLocation.name} (${locationCourts.length})`
                                        : `${filteredLocations.length} Location${filteredLocations.length !== 1 ? 's' : ''} in ${(searchParams.get('loc') || userCity || 'the Philippines').split(',')[0]}`
                                    }
                                </h2>
                            </div>

                            {/* Scrollable list */}
                            <div className="flex-1 overflow-y-auto px-0 md:px-1.5 py-1 md:py-1.5 space-y-1 md:space-y-1.5">
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
                                            const courtStatusStyle = courtSt === 'Fully Booked' ? 'bg-blue-50 text-blue-500'
                                                : courtSt === 'Coming Soon' ? 'bg-blue-50 text-blue-500'
                                                    : courtSt === 'Maintenance' ? 'bg-blue-50 text-blue-500'
                                                        : locStatus === 'Closed' ? 'bg-rose-50 text-rose-500'
                                                            : locStatus === 'Maintenance' ? 'bg-blue-50 text-blue-500'
                                                                : 'bg-blue-50 text-blue-500';
                                            return (
                                                <div key={court.id}>
                                                    <button
                                                        onClick={() => {
                                                            if (isCourtAvailable) {
                                                                setHeroCourtId(court.id);
                                                                if (window.innerWidth < 768) {
                                                                    setShowCourtDetails(true);
                                                                }
                                                            }
                                                        }}
                                                        disabled={!isCourtAvailable}
                                                        className={`w-full group flex flex-row rounded-none md:rounded-2xl overflow-hidden bg-white border-b md:border border-slate-100 md:shadow-sm transition-all duration-300 ${isCourtAvailable ? 'hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-200 cursor-pointer active:bg-slate-50' : 'opacity-60 cursor-not-allowed'}`}
                                                    >
                                                        {/* Left — Image */}
                                                        <div className="w-32 sm:w-36 h-[140px] shrink-0 bg-slate-100 relative overflow-hidden">
                                                            <img
                                                                src={court.imageUrl || '/images/home-images/pb2.jpg'}
                                                                alt={court.name}
                                                                className={`w-full h-full object-cover transition-transform duration-700 ${isCourtAvailable ? 'group-hover:scale-110' : 'grayscale'}`}
                                                            />
                                                            {!isCourtAvailable && courtStatusLabel ? (
                                                                <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${courtStatusStyle}`}>{courtStatusLabel}</div>
                                                            ) : isCourtAvailable && (
                                                                <div className="absolute top-2 left-2">
                                                                    <span className="bg-[#a3e635] text-slate-900 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest shadow-md shadow-lime-500/30">Available</span>
                                                                </div>
                                                            )}
                                                            {!isCourtAvailable && (
                                                                <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
                                                            )}
                                                            {/* Price badge */}
                                                            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1">
                                                                {court.pricePerHour != null && court.pricePerHour > 0 ? (
                                                                    <div className="bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-md shadow-md">
                                                                        <span className="text-[11px] font-black text-slate-900">₱{court.pricePerHour}</span><span className="text-[8px] font-semibold text-slate-400">/hr</span>
                                                                    </div>
                                                                ) : court.pricePerHour === 0 ? (
                                                                    <div className="bg-emerald-500 px-1.5 py-0.5 rounded-md shadow-md">
                                                                        <span className="text-[9px] font-black text-white uppercase">Free</span>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </div>

                                                        {/* Right — Details */}
                                                        <div className="flex-1 p-3 text-left flex flex-col min-w-0">
                                                            <p className={`font-black text-base tracking-tight mb-0.5 truncate ${isCourtAvailable ? 'text-slate-900 group-hover:text-[#1E40AF] transition-colors' : 'text-slate-400'}`}>{court.name}</p>
                                                            <div className="flex items-center gap-1 mb-2">
                                                                <MapPin size={12} className="text-slate-300 shrink-0" />
                                                                <p className="text-xs text-slate-400 truncate">{selectedLocation?.address || selectedLocation?.city || ''}</p>
                                                            </div>

                                                            {/* 2×2 Info Grid */}
                                                            <div className="grid grid-cols-2 gap-1.5 mt-auto">
                                                                <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-2">
                                                                    <img src="/images/Ball.png" alt="" className="w-4 h-4 object-contain" />
                                                                    <span className="text-[11px] font-bold text-slate-600">{court.numCourts || 1} {(court.numCourts || 1) === 1 ? 'Court' : 'Courts'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-2">
                                                                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                                                    <span className="text-[11px] font-bold text-slate-600">{(court.numCourts || 1) * 4} Players</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-2">
                                                                    <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="1" /><line x1="12" y1="6" x2="12" y2="18" /><line x1="2" y1="12" x2="22" y2="12" /></svg>
                                                                    <span className="text-[11px] font-bold text-slate-600 truncate">{court.type || 'Indoor'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-2">
                                                                    <svg className="w-4 h-4 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                                                                    <span className="text-[11px] font-bold text-slate-600 truncate">
                                                                        {Array.isArray(court.amenities) && court.amenities.length > 0
                                                                            ? (court.amenities.length <= 2 ? court.amenities.join(', ') : `${court.amenities.length} Amenities`)
                                                                            : 'No Amenities'
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                    {isFullyBooked && isLocationAvailable && (
                                                        <div className="px-2 pb-1 -mt-1">
                                                            <button
                                                                onClick={() => { setHeroCourtId(court.id); setShowCourtDetails(true); }}
                                                                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200/50 flex items-center justify-center gap-2"
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
                                            <div key={location.id} className="w-full">
                                                <button
                                                    onClick={() => {
                                                        if (googleMapRef.current && location.latitude && location.longitude) {
                                                            googleMapRef.current.panTo({ lat: location.latitude, lng: location.longitude });
                                                            smoothZoom(19);
                                                            triggerPulse(location.latitude, location.longitude);
                                                        }
                                                        navigate(`/booking?locationId=${location.id}&lat=${location.latitude}&lng=${location.longitude}&zoom=19&loc=${encodeURIComponent(location.city)}`);
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
                                                            <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                                                                locStatus === 'Closed' ? 'bg-rose-500 text-white'
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
                                                            {location.has_free && (
                                                                <div className="bg-emerald-500 px-1.5 py-0.5 rounded-md shadow-md">
                                                                    <span className="text-[9px] font-black text-white uppercase">Free</span>
                                                                </div>
                                                            )}
                                                            {location.max_price > 0 && (
                                                                <div className="bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-md shadow-md">
                                                                    <span className="text-[11px] font-black text-slate-900">₱{location.min_price > 0 ? location.min_price : location.max_price}{location.min_price > 0 && location.min_price !== location.max_price ? `-${location.max_price}` : ''}</span><span className="text-[8px] font-semibold text-slate-400">/hr</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Right column — Details */}
                                                    <div className="flex-1 p-3 text-left flex flex-col min-w-0">
                                                        <p className="font-black text-slate-900 text-base tracking-tight mb-0.5 group-hover:text-[#1E40AF] transition-colors truncate">{location.name}</p>
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
                                                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
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
                                                                        ? (location.all_amenities.length <= 2 ? location.all_amenities.join(', ') : `${location.all_amenities.length} Amenities`)
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
                    <div className={`lg:col-span-3 xl:col-span-3 ${(urlLocationId || viewMode === 'list') ? 'hidden md:block' : 'block'}`}>
                        <div className="md:rounded-2xl md:border md:border-slate-200/60 md:shadow-sm overflow-hidden relative md:sticky md:top-28 h-[calc(100vh-200px)] sm:h-[calc(100vh-200px)] md:h-[calc(100vh-220px)] lg:h-[calc(100vh-240px)]">

                            {/* ── Map — shown when no location is selected ── */}
                            <div
                                className="absolute inset-0 transition-all duration-500 ease-out"
                                style={{ opacity: (!urlLocationId) ? 1 : 0, transform: (!urlLocationId) ? 'scale(1)' : 'scale(1.02)', pointerEvents: (!urlLocationId) ? 'auto' : 'none' }}
                            >
                                {isLoading ? (
                                    <div className="h-full bg-slate-100 flex items-center justify-center">
                                        <Loader2 className="animate-spin text-[#1E40AF]" size={40} />
                                    </div>
                                ) : (
                                    <div ref={mapRef} className="h-full w-full" />
                                )}
                            </div>

                            {/* ── Location Hero Panel — shown when location is selected but no court yet ── */}
                            <div
                                className="absolute inset-0 flex flex-col overflow-hidden transition-all duration-500 ease-out"
                                style={{
                                    opacity: (urlLocationId && selectedLocation && !heroActiveCourt) ? 1 : 0,
                                    transform: (urlLocationId && selectedLocation && !heroActiveCourt) ? 'translateY(0)' : 'translateY(24px)',
                                    pointerEvents: (urlLocationId && selectedLocation && !heroActiveCourt) ? 'auto' : 'none',
                                }}
                            >
                                {selectedLocation && (
                                    <>
                                        {/* Full Hero Image with gradient + venue info overlay */}
                                        <div className="relative flex-1 min-h-0 overflow-hidden">
                                            <img
                                                src={selectedLocation.image_url || '/images/home-images/pb2.jpg'}
                                                alt={selectedLocation.name}
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

                                            {/* Venue Details Overlay */}
                                            <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-6 xl:p-8 z-10">
                                                {/* Venue Name */}
                                                <h2 className="text-2xl lg:text-3xl xl:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-lg mb-2">{selectedLocation.name}</h2>

                                                {/* Address */}
                                                <div className="flex items-center gap-2 mb-4">
                                                    <MapPin size={14} className="text-[#a3e635] shrink-0" />
                                                    <p className="text-sm text-white/80 font-medium truncate">{selectedLocation.address}, {selectedLocation.city}</p>
                                                </div>

                                                {/* Info Grid */}
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                                                    {/* Courts */}
                                                    <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                                                        <img src="/images/Ball.png" alt="courts" className="w-5 h-5 object-contain" />
                                                        <div>
                                                            <p className="text-[8px] font-black text-white/50 uppercase tracking-widest">Courts</p>
                                                            <p className="text-sm font-black text-white">{locationCourts.length}</p>
                                                        </div>
                                                    </div>
                                                    {/* Court Types */}
                                                    <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                                                        <Building2 size={16} className="text-[#a3e635] shrink-0" />
                                                        <div>
                                                            <p className="text-[8px] font-black text-white/50 uppercase tracking-widest">Type</p>
                                                            <p className="text-sm font-black text-white">
                                                                {(() => {
                                                                    const types = [...new Set(locationCourts.map(c => c.type))];
                                                                    return types.join(' / ') || 'N/A';
                                                                })()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {/* Hours */}
                                                    {selectedLocation.opening_time && selectedLocation.closing_time && (
                                                        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                                                            <Clock size={16} className="text-[#a3e635] shrink-0" />
                                                            <div>
                                                                <p className="text-[8px] font-black text-white/50 uppercase tracking-widest">Hours</p>
                                                                <p className="text-sm font-black text-white">
                                                                    {(() => {
                                                                        const fmt = (t: string) => { const h = parseInt(t.split(':')[0], 10); return h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`; };
                                                                        return `${fmt(selectedLocation.opening_time)} - ${fmt(selectedLocation.closing_time)}`;
                                                                    })()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* Status */}
                                                    <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                                                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${(selectedLocation.status || 'Active') === 'Active' ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' : 'bg-rose-400'}`} />
                                                        <div>
                                                            <p className="text-[8px] font-black text-white/50 uppercase tracking-widest">Status</p>
                                                            <p className="text-sm font-black text-white">{selectedLocation.status || (selectedLocation.is_active ? 'Active' : 'Closed')}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Amenities */}
                                                {selectedLocation.amenities && selectedLocation.amenities.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                                        {selectedLocation.amenities.map((amenity: string, i: number) => (
                                                            <span key={i} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-sm text-white/90 border border-white/20">{amenity}</span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Description */}
                                                {selectedLocation.description && (
                                                    <p className="text-xs text-white/60 font-medium leading-relaxed line-clamp-2 mb-1">{selectedLocation.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    </>
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
                                                    <div className="flex-1 flex items-center gap-2 px-3 py-3 bg-[#1E40AF] rounded-xl text-white">
                                                        <Navigation size={14} className="text-[#a3e635] shrink-0" />
                                                        <div>
                                                            <p className="text-[8px] font-black text-blue-200 uppercase tracking-widest leading-none">Rate</p>
                                                            {heroActiveCourt.pricePerHour > 0 ? (
                                                                <p className="text-lg font-black leading-tight">₱{heroActiveCourt.pricePerHour}<span className="text-[9px] font-bold text-blue-300 ml-0.5">/hr</span></p>
                                                            ) : (
                                                                <p className="text-lg font-black leading-tight text-[#a3e635]">FREE</p>
                                                            )}
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
                                                    className="flex-1 py-4 rounded-2xl bg-[#1E40AF] hover:bg-blue-800 text-white font-black text-xs uppercase tracking-[0.15em] shadow-xl shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
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
            {isMobile && !urlLocationId && (
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
                                            <DollarSign className="text-[#1E40AF]" size={24} />
                                        </div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Rate</p>
                                        <p className="text-2xl font-black text-slate-900">{heroActiveCourt.pricePerHour > 0 ? `₱${heroActiveCourt.pricePerHour}` : 'Free'}<span className="text-[10px] text-slate-400">{heroActiveCourt.pricePerHour > 0 ? '/hr' : ''}</span></p>
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
                                    <h3 className="text-[11px] font-black text-[#1E40AF] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
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
                                        <h3 className="text-[11px] font-black text-[#1E40AF] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
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
                                        <h3 className="text-[11px] font-black text-[#1E40AF] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
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
                                className="w-full py-4 bg-[#1E40AF] hover:bg-blue-800 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5"
                            >
                                <Lock size={18} />
                                Sign In to Book Now
                            </button>
                        </div>
                    </div>
                </div>
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
                                            <DollarSign size={16} className={filterFreeOnly ? 'text-white' : 'text-slate-400'} />
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
                                <Lock className="text-[#1E40AF]" size={36} />
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
                                    className="w-full py-4.5 bg-[#1E40AF] hover:bg-blue-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-blue-200"
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
