import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, DollarSign, Clock, CheckCircle2, Loader2, Filter, Search, Navigation, Lock, X, LogIn, UserPlus, Ban } from 'lucide-react';
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
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 12,
                        fillColor: court.type === 'Indoor' ? '#2563eb' : '#a3e635',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 3,
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
        <div className="pt-24 md:pt-32 pb-12 px-6 md:px-24 lg:px-32 max-w-[1800px] mx-auto min-h-screen">
            <div className="space-y-12">
                {/* Header Section */}
                <div className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div>
                            <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-4">COURTS / 2026</p>
                            <h1 className="text-5xl md:text-8xl font-black text-slate-950 tracking-tighter uppercase leading-[0.8]">
                                Book a Court <span className="text-blue-600">in {(searchParams.get('loc') || searchQuery || 'Cebu City').split(',')[0]}.</span>
                            </h1>
                        </div>
                        <button
                            onClick={() => navigate('/')}
                            className="px-6 md:px-10 py-3 md:py-5 bg-lime-400 border-2 border-lime-400 text-slate-950 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] rounded-2xl hover:bg-lime-500 hover:border-lime-500 transition-all shadow-2xl shadow-lime-200/50 shrink-0"
                        >
                            Back to Home
                        </button>
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
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* Discovery Sidebar */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Search & Tools Row */}
                        <div className="flex gap-3">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search courts by name or location..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-[24px] py-4 pl-14 pr-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all shadow-sm"
                                />
                            </div>
                            <button
                                onClick={handleNearMe}
                                className="flex items-center gap-3 px-8 py-4 bg-[#a3e635] text-slate-900 rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-[#bef264] transition-all shadow-xl shadow-lime-200/50 shrink-0"
                            >
                                <Navigation size={18} fill="currentColor" />
                                <span>Near Me</span>
                            </button>
                        </div>

                        {/* Courts List Container */}
                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col min-h-[500px]">
                            <div className="p-8 border-b border-slate-50">
                                <h2 className="text-xs font-black text-slate-950 uppercase tracking-[0.2em]">
                                    Courts in {(searchParams.get('loc') || searchQuery || 'Cebu City').split(',')[0]} ({filteredCourts.length})
                                </h2>
                            </div>

                            <div className="p-4 space-y-2 max-h-[650px] overflow-y-auto custom-scrollbar flex-1">
                                {isLoading ? (
                                    Array(5).fill(0).map((_, i) => <CourtSkeleton key={i} />)
                                ) : (
                                    filteredCourts.map(court => (
                                        <button
                                            key={court.id}
                                            onClick={() => navigate(`/court/${court.id}`)}
                                            className="w-full group flex items-center justify-between p-5 rounded-[28px] hover:bg-slate-50 transition-all duration-300"
                                        >
                                            <div className="flex-1 text-left">
                                                <p className="font-black text-slate-900 text-base tracking-tight mb-1 group-hover:text-blue-600 transition-colors uppercase italic">{court.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{court.location.split(',')[0]}</p>
                                            </div>
                                            <div className="bg-blue-50 px-4 py-2 rounded-xl group-hover:bg-blue-600 transition-all">
                                                <p className="text-[11px] font-black text-blue-600 group-hover:text-white">
                                                    ₱{court.pricePerHour}
                                                </p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Interactive Map */}
                    <div className="lg:col-span-8 sticky top-32">
                        <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden h-[750px] relative">
                            {isLoading ? (
                                <div className="h-full bg-slate-100 flex items-center justify-center">
                                    <Loader2 className="animate-spin text-blue-600" size={48} />
                                </div>
                            ) : (
                                <div ref={mapRef} className="h-full w-full" />
                            )}

                            {/* Map Floating Actions */}
                            <div className="absolute top-6 right-6 flex flex-col gap-3">
                                <button className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-slate-600 hover:text-blue-600 transition-all border border-slate-100">
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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
