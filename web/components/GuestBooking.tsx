import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, DollarSign, Clock, CheckCircle2, Loader2, Filter, Search, Navigation, Lock, X, LogIn, UserPlus, Ban, List, CircleCheck, Funnel } from 'lucide-react';
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
    }, []);

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
            panControl: false,
        });

        googleMapRef.current = map;

        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        const filteredCourts = filterType === 'All'
            ? courts
            : courts.filter(c => c.type === filterType);

        filteredCourts.forEach(court => {
            if (court.latitude && court.longitude) {
                const marker = new window.google.maps.Marker({
                    position: { lat: court.latitude, lng: court.longitude },
                    map,
                    title: court.name,
                    icon: {
                        url: '/images/PinMarker.png',
                        scaledSize: new window.google.maps.Size(28, 40),
                        anchor: new window.google.maps.Point(14, 40)
                    },
                });

                const infoWindow = new window.google.maps.InfoWindow({
                    content: `
                        <div style="width: 240px; font-family: 'Inter', sans-serif; overflow: hidden; border-radius: 16px;">
                            ${court.imageUrl ? `
                                <div style="height: 120px; width: 100%; border-radius: 12px 12px 0 0; overflow: hidden;">
                                    <img src="${court.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="${court.name}" />
                                </div>
                            ` : `
                                <div style="height: 120px; width: 100%; background: #f1f5f9; border-radius: 12px 12px 0 0; display: flex; align-items: center; justify-content: center; color: #94a3b8;">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                </div>
                            `}
                            <div style="padding: 12px;">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
                                    <h3 style="margin: 0; font-weight: 800; font-size: 15px; color: #0f172a; line-height: 1.2;">${court.name}</h3>
                                    ${court.courtType ? `
                                        <span style="background: ${court.courtType === 'Indoor' ? '#eff6ff' : '#f7fee7'}; color: ${court.courtType === 'Indoor' ? '#2563eb' : '#4d7c0f'}; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 6px; margin-left: 8px;">${court.courtType.toUpperCase()}</span>
                                    ` : ''}
                                </div>
                                <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                    <span style="font-size: 11px; color: #64748b; font-weight: 500;">${court.location.split(',')[0]}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: 800; font-size: 14px; color: #0f172a;">₱${court.pricePerHour}<span style="font-size: 10px; color: #64748b; font-weight: 500;"> /hr</span></span>
                                    <span style="font-size: 10px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 6px; border-radius: 4px;">${court.numCourts} ${court.numCourts === 1 ? 'COURT' : 'COURTS'}</span>
                                </div>
                            </div>
                        </div>
                    `,
                    disableAutoPan: true
                });

                marker.addListener('click', () => {
                    navigate(`/court/${court.id}`);
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

                // If this court matches the URL court param, select it and open info window
                if (urlCourt && court.name.toLowerCase() === decodeURIComponent(urlCourt).toLowerCase()) {
                    setSelectedCourt(court);
                    infoWindow.open(map, marker);
                }
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
        if (navigator.geolocation && googleMapRef.current) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
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

    return (
        <div className="pt-16 md:pt-24 pb-0 md:pb-12 px-0 md:px-20 max-w-[1920px] mx-auto min-h-screen relative overflow-hidden">
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
                                <div className="space-y-4 md:space-y-1 custom-scrollbar pb-32">
                                    {courts
                                        .filter(c => {
                                            if (!searchQuery.trim()) return true;
                                            const q = searchQuery.toLowerCase();
                                            return c.name.toLowerCase().includes(q) ||
                                                c.location.toLowerCase().includes(q);
                                        })
                                        .slice(0, 8)
                                        .map((court) => (
                                            <button
                                                key={court.id}
                                                onClick={() => {
                                                    setSearchQuery(court.name);
                                                    if (googleMapRef.current && court.latitude && court.longitude) {
                                                        googleMapRef.current.panTo({ lat: court.latitude, lng: court.longitude });
                                                        googleMapRef.current.setZoom(16);
                                                        triggerPulse(court.latitude, court.longitude);
                                                    }
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
                                                    <p className="text-slate-900 font-bold text-sm truncate">{court.name}</p>
                                                    <p className="text-xs text-slate-400 truncate">{court.location} · {court.numCourts} court{court.numCourts > 1 ? 's' : ''}</p>
                                                </div>
                                            </button>
                                        ))}
                                    {courts.length === 0 && (
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
                            <div className="flex-1 flex gap-2">
                                {(['Courts', 'Games', 'Lessons'] as const).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setFilterType(type === 'Courts' ? 'All' : 'All' as any)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider whitespace-nowrap border-2 transition-all ${type === 'Courts'
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
                {/* Header Section - Desktop Only */}
                <div className="hidden md:block space-y-6 mt-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-4">COURTS / LIVE</p>
                            <h1 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tighter uppercase">
                                Book a <span className="text-blue-600">Court in {(searchParams.get('loc') || userCity || 'the Philippines').split(',')[0]}.</span>
                            </h1>
                        </div>
                        <p className="hidden md:block text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {filteredCourts.length} {filteredCourts.length === 1 ? 'Court' : 'Courts'} — Page 1 of 1
                        </p>
                    </div>

                    {/* Filter Pills */}
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

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start md:mt-4 mt-0">
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


                        {/* Courts List Container */}
                        <div className="bg-white md:bg-transparent md:rounded-none border-0 md:border-0 shadow-none overflow-hidden flex flex-col h-[calc(100vh-140px)] md:min-h-[500px] pt-12 md:pt-0">
                            <div className="hidden md:block p-8 border-b border-slate-50">
                                <h2 className="text-xs font-black text-slate-950 uppercase tracking-[0.2em]">
                                    Courts in {(searchParams.get('loc') || userCity || 'the Philippines').split(',')[0]} ({filteredCourts.length})
                                </h2>
                            </div>

                            <div className="space-y-4 md:space-y-2 h-full md:max-h-[650px] overflow-y-auto custom-scrollbar flex-1 pb-14 md:pb-0">
                                {isLoading ? (
                                    Array(5).fill(0).map((_, i) => <CourtSkeleton key={i} />)
                                ) : (
                                    filteredCourts.map(court => (
                                        <button
                                            key={court.id}
                                            onClick={() => navigate(`/court/${court.id}`)}
                                            className="w-full group flex flex-row items-center gap-4 p-4 md:p-5 bg-white md:bg-transparent border border-slate-100 md:border-0 hover:bg-slate-50 transition-all duration-300 shadow-sm md:shadow-none"
                                        >
                                            <div className="w-20 h-20 md:w-16 md:h-16 bg-slate-100 overflow-hidden shrink-0">
                                                <img
                                                    src={court.imageUrl || `https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=200&h=200`}
                                                    alt={court.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="font-black text-slate-900 text-sm md:text-base tracking-tight mb-1 group-hover:text-blue-600 transition-colors uppercase italic line-clamp-1">{court.name}</p>
                                                <div className="flex flex-wrap gap-x-3 gap-y-1">
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                        <span className="text-blue-500">🎾</span> {court.numCourts} Units
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
                    </div>

                    {/* Interactive Map */}
                    <div className={`lg:col-span-8 md:sticky md:top-36 ${viewMode === 'list' && !isMobile ? 'hidden md:block' : 'block'}`}>
                        <div className={`-mx-4 md:mx-0 bg-white rounded-none md:rounded-[48px] border-0 md:border md:border-slate-200 shadow-none md:shadow-sm overflow-hidden relative ${viewMode === 'list' ? 'h-0 md:h-[850px] opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto' : 'h-[calc(100vh-120px)] md:h-[850px] opacity-100'}`}>

                            {isLoading ? (
                                <div className="h-full bg-slate-100 flex items-center justify-center">
                                    <Loader2 className="animate-spin text-blue-600" size={48} />
                                </div>
                            ) : (
                                <div ref={mapRef} className="h-full w-full" />
                            )}

                            {/* Map Floating Actions - Desktop Only */}
                            <div className="hidden md:flex absolute top-6 right-6 flex-col gap-3">
                                <button className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-slate-600 hover:text-blue-600 transition-all border border-slate-100">
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Navigation Bar - Always visible on mobile */}
            {isMobile && (
                <nav className="fixed bottom-14 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                    <div className="flex justify-center items-center gap-3 px-4 py-3">
                        <button
                            onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
                            className="flex items-center gap-2 px-6 py-3.5 bg-white border-2 border-slate-200/80 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:scale-95 transition-all text-slate-900 font-black hover:bg-slate-50"
                        >
                            {viewMode === 'map' ? <List size={20} /> : <MapPin size={20} />}
                            <span className="text-xs uppercase tracking-widest">{viewMode === 'map' ? 'List' : 'Map'}</span>
                        </button>
                        <button
                            onClick={() => setShowFilters(true)}
                            className="flex items-center gap-2 px-6 py-3.5 bg-white border-2 border-slate-200/80 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:scale-95 transition-all text-slate-900 font-black hover:bg-slate-50"
                        >
                            <Funnel size={20} />
                            <span className="text-xs uppercase tracking-widest">Filters</span>
                        </button>
                    </div>
                </nav>
            )}

            {/* Mobile Bottom Navigation Menu Removed */}

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
                                View {filteredCourts.length} Courts
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Login Prompt Modal */}
            {
                showLoginModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
                        <div
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300"
                            onClick={() => setShowLoginModal(false)}
                        />
                        <div className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                            <button
                                onClick={() => setShowLoginModal(false)}
                                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 transition-colors"
                            >
                                <X size={24} />
                            </button>

                            <div className="p-8 md:p-12 text-center">
                                <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
                                    <Lock className="text-blue-600" size={32} />
                                </div>

                                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-4">Hold On!</h2>
                                <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                                    You need to have an account to secure this spot. Join the community to start booking courts.
                                </p>

                                <div className="space-y-4">
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
                                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-slate-200"
                                    >
                                        <LogIn size={18} /> Sign In
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
                                        className="w-full py-4 bg-lime-400 hover:bg-lime-500 text-slate-950 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-lime-100"
                                    >
                                        <UserPlus size={18} /> Create Account
                                    </button>
                                    <button
                                        onClick={() => setShowLoginModal(false)}
                                        className="w-full py-4 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                                    >
                                        Maybe Later
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PicklePlay 2026</p>
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
};

export default GuestBooking;
