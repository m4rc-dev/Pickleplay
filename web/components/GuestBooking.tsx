import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, DollarSign, Clock, CheckCircle2, Loader2, Filter, Search, Navigation, Lock, X, LogIn, UserPlus, Ban, List, CircleCheck, Funnel, Star, ChevronLeft, Building2 } from 'lucide-react';
import { Court } from '../types';
import { CourtSkeleton } from './ui/Skeleton';
import { supabase } from '../services/supabase';

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
    const isMobile = window.innerWidth < 768;
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [showDesktopSuggestions, setShowDesktopSuggestions] = useState(false);

    // Location detail state (when coming from homepage card)
    const [selectedLocation, setSelectedLocation] = useState<any>(null);
    const [locationCourts, setLocationCourts] = useState<Court[]>([]);
    const [isLoadingLocationDetail, setIsLoadingLocationDetail] = useState(false);

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
                        ownerId: c.owner_id
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
            googleMapRef.current.setZoom(13);
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
            googleMapRef.current.setZoom(zoom);

            // Trigger pulse animation after a short delay
            setTimeout(() => {
                triggerPulse(lat, lng);
            }, 500);
        }
    }, [urlLocationId, urlLat, urlLng, urlZoom, isLoading]);

    const initializeMap = () => {
        if (!mapRef.current || !window.google) return;

        // Use URL params first, then user GPS location, then default to Philippines view
        let center: { lat: number; lng: number };
        let zoom: number;

        if (urlLat && urlLng) {
            center = { lat: parseFloat(urlLat), lng: parseFloat(urlLng) };
            zoom = urlZoom ? parseInt(urlZoom) : 12;
        } else if (userLocation) {
            center = userLocation;
            zoom = 13;
        } else {
            // Default to Philippines center view
            center = { lat: 12.8797, lng: 121.774 };
            zoom = 6;
        }

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
            panControl: false,
        });

        googleMapRef.current = map;

        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        // Create markers for locations instead of individual courts
        locations.forEach(location => {
            if (location.latitude && location.longitude) {
                // Count courts at this location that match the filter
                const locationCourts = courts.filter(c => {
                    const matchesLocation = c.location_id ? c.location_id === location.id : 
                        c.location.toLowerCase().includes(location.name.toLowerCase());
                    return matchesLocation && (filterType === 'All' || c.type === filterType);
                });

                // Only show marker if location has courts matching the filter
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
                });

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

                // Hide close button when InfoWindow opens
                infoWindow.addListener('domready', () => {
                    const closeBtn = document.querySelector('.gm-ui-hover-effect') as HTMLElement;
                    if (closeBtn) closeBtn.style.display = 'none';
                    // Also remove default padding from the info window wrapper
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
    };

    useEffect(() => {
        if (googleMapRef.current) {
            initializeMap();
        }
    }, [filterType]);

    const handleBooking = () => {
        // Store redirect URL in localStorage for after login
        let redirectUrl = '/booking';
        const params = new URLSearchParams();
        if (searchQuery) params.set('q', searchQuery);
        if (selectedCourt) params.set('court', selectedCourt.name);
        if (selectedSlot) params.set('slot', selectedSlot);
        if (params.toString()) redirectUrl += '?' + params.toString();
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
                // Match by location_id if available, otherwise try to match by location string
                const matchesLocation = c.location_id ? c.location_id === loc.id : 
                    c.location.toLowerCase().includes(loc.name.toLowerCase());
                
                if (!matchesLocation) return false;
                return filterType === 'All' || c.type === filterType;
            });
            return locationCourts.length > 0;
        })
        .map(loc => {
            // Add court count for each location
            const locationCourts = courts.filter(c => {
                const matchesLocation = c.location_id ? c.location_id === loc.id : 
                    c.location.toLowerCase().includes(loc.name.toLowerCase());
                return matchesLocation && (filterType === 'All' || c.type === filterType);
            });
            return {
                ...loc,
                court_count: locationCourts.length
            };
        });

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* ──────────── MOBILE HEADER BAR ──────────── */}
            <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-white border-b border-slate-200/60 shadow-sm">
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
                        <button
                            onClick={() => setIsSearchExpanded(true)}
                            className="w-full flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-left hover:border-slate-300 transition-colors"
                        >
                            <Search size={16} className="text-slate-400 shrink-0" />
                            <span className="text-sm text-slate-400 font-medium truncate">Search courts or places...</span>
                        </button>
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
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all"
                        >
                            <Navigation size={12} fill="currentColor" />
                            Near Me
                        </button>
                    </div>
                )}
            </div>

            {/* ──────────── MAIN CONTAINER ──────────── */}
            <div className="pt-[176px] sm:pt-[180px] md:pt-28 pb-0 md:pb-10 px-0 md:px-6 lg:px-10 xl:px-16 max-w-[1600px] mx-auto">

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
                <div className="grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-2 gap-0 lg:gap-6 xl:gap-8 items-start">

                    {/* ═══ LEFT COLUMN ═══ */}
                    <div className={`lg:col-span-2 xl:col-span-1 ${viewMode === 'map' ? 'hidden md:block' : 'block'}`}>
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
                                className="flex items-center gap-2 px-5 lg:px-6 py-3.5 bg-emerald-500 text-white rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200/50 shrink-0"
                            >
                                <Navigation size={16} fill="currentColor" />
                                <span>Near Me</span>
                            </button>
                        </form>

                        {/* ─── List Container ─── */}
                        <div className="bg-white md:bg-white md:rounded-2xl md:border md:border-slate-200/60 md:shadow-sm overflow-hidden flex flex-col h-[calc(100vh-190px)] sm:h-[calc(100vh-190px)] md:h-auto md:max-h-[calc(100vh-280px)] lg:max-h-[calc(100vh-300px)]">

                            {/* Location Detail Header */}
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
                                            <button
                                                onClick={() => navigate('/booking')}
                                                className="absolute top-2 left-2 md:top-3 md:left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-slate-700 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg text-[11px] md:text-xs font-bold hover:bg-white transition-all shadow-md"
                                            >
                                                <ChevronLeft size={14} />
                                                Back
                                            </button>
                                            <div className="absolute bottom-2 left-3 right-3 md:bottom-3 md:left-4 md:right-4">
                                                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight leading-tight drop-shadow-lg">{selectedLocation.name}</h2>
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-3 md:p-4">
                                        {!selectedLocation.image_url && (
                                            <>
                                                <button
                                                    onClick={() => navigate('/booking')}
                                                    className="flex items-center gap-1 text-slate-400 text-xs font-bold hover:text-blue-600 transition-colors mb-2"
                                                >
                                                    <ChevronLeft size={14} />
                                                    Back
                                                </button>
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
                                            {selectedLocation.amenities && selectedLocation.amenities.length > 0 && (
                                                selectedLocation.amenities.slice(0, 3).map((amenity: string, i: number) => (
                                                    <span key={i} className="inline-flex items-center bg-slate-100 text-slate-600 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md md:rounded-lg text-[10px] md:text-[11px] font-bold">
                                                        {amenity}
                                                    </span>
                                                ))
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
                                        : `${filteredLocations.length} Location${filteredLocations.length !== 1 ? 's' : ''} in ${(searchParams.get('loc') || userCity || 'the Philippines').split(',')[0]}`
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
                                    ) : locationCourts.map(court => (
                                        <button
                                            key={court.id}
                                            onClick={() => navigate(`/court/${court.id}`)}
                                            className="w-full group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-blue-50/40 transition-all duration-200"
                                        >
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                                                <img
                                                    src={court.imageUrl || `https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=200&h=200`}
                                                    alt={court.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <p className="font-bold text-slate-900 text-sm tracking-tight mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">{court.name}</p>
                                                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                                    <span className="text-[11px] font-medium text-slate-400">🎾 {court.numCourts} Units</span>
                                                    <span className="text-[11px] font-medium text-slate-400">₱ Fee</span>
                                                    <span className="text-[11px] font-medium text-slate-400">🥅 Perm. Nets</span>
                                                </div>
                                            </div>
                                            <ChevronLeft size={16} className="text-slate-300 rotate-180 shrink-0 group-hover:text-blue-400 transition-colors" />
                                        </button>
                                    ))
                                ) : (
                                    filteredLocations.length === 0 ? (
                                        <div className="px-4 py-12 text-center">
                                            <MapPin size={28} className="mx-auto text-slate-300 mb-2" />
                                            <p className="text-sm text-slate-400">No locations found</p>
                                        </div>
                                    ) : filteredLocations.map(location => (
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
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                                                <img
                                                    src={location.hero_image || location.image_url || `https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=200&h=200`}
                                                    alt={location.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
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
                                                </div>
                                            </div>
                                            <ChevronLeft size={16} className="text-slate-300 rotate-180 shrink-0 group-hover:text-blue-400 transition-colors" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ═══ RIGHT COLUMN — MAP ═══ */}
                    <div className={`lg:col-span-3 xl:col-span-1 ${viewMode === 'list' ? 'hidden md:block' : 'block'}`}>
                        <div className={`md:rounded-2xl md:border md:border-slate-200/60 md:shadow-sm overflow-hidden relative md:sticky md:top-28 transition-all duration-300 ${viewMode === 'list' ? 'h-0 md:h-[calc(100vh-220px)] lg:h-[calc(100vh-240px)] opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto' : 'h-[calc(100vh-200px)] sm:h-[calc(100vh-200px)] md:h-[calc(100vh-220px)] lg:h-[calc(100vh-240px)] opacity-100'}`}>
                            {isLoading ? (
                                <div className="h-full bg-slate-100 flex items-center justify-center">
                                    <Loader2 className="animate-spin text-blue-600" size={40} />
                                </div>
                            ) : (
                                <div ref={mapRef} className="h-full w-full" />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ──────────── MOBILE BOTTOM BAR ──────────── */}
            {isMobile && (
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

            {/* ──────────── LOGIN MODAL ──────────── */}
            {showLoginModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowLoginModal(false)}
                    />
                    <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
                        <button
                            onClick={() => setShowLoginModal(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-6 sm:p-10 text-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Lock className="text-blue-600" size={28} />
                            </div>

                            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">Hold On!</h2>
                            <p className="text-slate-500 font-medium mb-8 leading-relaxed text-sm sm:text-base">
                                You need an account to book this court. Join the community and start playing.
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        let redirectUrl = '/booking';
                                        const params = new URLSearchParams();
                                        if (searchQuery) params.set('q', searchQuery);
                                        if (selectedCourt) params.set('court', selectedCourt.name);
                                        if (selectedSlot) params.set('slot', selectedSlot);
                                        if (params.toString()) redirectUrl += '?' + params.toString();
                                        navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
                                    }}
                                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg"
                                >
                                    <LogIn size={16} /> Sign In
                                </button>
                                <button
                                    onClick={() => {
                                        let redirectUrl = '/booking';
                                        const params = new URLSearchParams();
                                        if (searchQuery) params.set('q', searchQuery);
                                        if (selectedCourt) params.set('court', selectedCourt.name);
                                        if (selectedSlot) params.set('slot', selectedSlot);
                                        if (params.toString()) redirectUrl += '?' + params.toString();
                                        navigate(`/signup?redirect=${encodeURIComponent(redirectUrl)}`);
                                    }}
                                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg shadow-blue-200/50"
                                >
                                    <UserPlus size={16} /> Create Account
                                </button>
                                <button
                                    onClick={() => setShowLoginModal(false)}
                                    className="w-full py-3 text-slate-400 font-medium text-sm hover:text-slate-600 transition-colors"
                                >
                                    Maybe Later
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
