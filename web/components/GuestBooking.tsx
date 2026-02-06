import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, DollarSign, Clock, CheckCircle2, Loader2, Filter, Search, Navigation, Lock, X, LogIn, UserPlus } from 'lucide-react';
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

    useEffect(() => {
        const fetchCourts = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('courts')
                    .select('*');

                if (error) throw error;

                const mappedCourts: Court[] = (data || []).map(c => ({
                    id: c.id,
                    name: c.name,
                    type: c.surface_type?.toLowerCase().includes('indoor') ? 'Indoor' : 'Outdoor',
                    location: `${c.address || ''}, ${c.city || ''}`.replace(/^, |, $/g, ''),
                    pricePerHour: parseFloat(c.base_price) || 0,
                    availability: [],
                    latitude: c.latitude,
                    longitude: c.longitude,
                    numCourts: c.num_courts || 1,
                    amenities: Array.isArray(c.amenities) ? c.amenities : [],
                    ownerId: c.owner_id
                }));

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
                        <div style="padding: 8px; font-family: Inter, sans-serif;">
                            <p style="margin: 0; font-weight: 800; font-size: 14px; color: #0f172a;">${court.name}</p>
                            <p style="margin: 4px 0 0; font-weight: 600; font-size: 12px; color: #3b82f6;">₱${court.pricePerHour}/hour</p>
                        </div>
                    `,
                    disableAutoPan: true
                });

                marker.addListener('click', () => {
                    setSelectedCourt(court);
                    map.panTo({ lat: court.latitude!, lng: court.longitude! });
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

    const filteredCourts = courts
        .filter(c => filterType === 'All' || c.type === filterType)
        .filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.location.toLowerCase().includes(searchQuery.toLowerCase())
        );

    return (
        <div className="pt-24 md:pt-32 pb-12 px-6 md:px-24 lg:px-32 max-w-[1800px] mx-auto min-h-screen">
            <div className="space-y-8">
                <div className="flex flex-col gap-6">
                    <div>
                        <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-4">COURTS / 2026</p>
                        <h1 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tighter uppercase">Book a Court.</h1>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex gap-2">
                            {(['All', 'Indoor', 'Outdoor'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 active:scale-95 ${filterType === type
                                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 ring-4 ring-blue-600/10'
                                        : 'bg-white text-slate-400 border border-slate-100 hover:border-blue-400 hover:text-blue-600'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                            {isLoading ? (
                                <div className="h-[600px] bg-slate-100 flex items-center justify-center">
                                    <Loader2 className="animate-spin text-blue-600" size={48} />
                                </div>
                            ) : (
                                <div ref={mapRef} className="h-[600px] w-full" />
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        {selectedCourt ? (
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                                <div>
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedCourt.name}</h3>
                                        <span className={`text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider ${selectedCourt.type === 'Indoor'
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'bg-lime-50 text-lime-600'
                                            }`}>
                                            {selectedCourt.type}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium mb-4">
                                        <MapPin size={14} />
                                        <span>{selectedCourt.location}</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-slate-900">₱{selectedCourt.pricePerHour}</span>
                                        <span className="text-sm text-slate-500 font-medium">/hour</span>
                                    </div>
                                </div>

                                {/* Date Selection */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                            <CalendarIcon size={16} className="text-blue-600" />
                                            {showAdvanceOptions ? 'Select Date' : 'Booking for Today'}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-tight">
                                                {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                            <button
                                                onClick={() => setShowAdvanceOptions(!showAdvanceOptions)}
                                                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all ${showAdvanceOptions
                                                    ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-100'
                                                    }`}
                                            >
                                                {showAdvanceOptions ? 'Hide' : 'Advance Booking'}
                                            </button>
                                        </div>
                                    </div>

                                    {showAdvanceOptions && (
                                        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1 animate-in slide-in-from-top-2 duration-300">
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
                                                        className={`flex flex-col items-center min-w-[60px] py-3 rounded-2xl border transition-all duration-300 ${isSelected
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100'
                                                            : 'bg-slate-50 border-transparent text-slate-400 hover:border-blue-200 hover:bg-white hover:shadow-md'
                                                            }`}
                                                    >
                                                        <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                                            {dayName}
                                                        </span>
                                                        <span className="text-base font-black">
                                                            {dayNum}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {TIME_SLOTS.map(slot => (
                                            <button
                                                key={slot}
                                                onClick={() => setSelectedSlot(slot)}
                                                className={`py-2.5 px-3 rounded-xl font-semibold text-sm transition-all border ${selectedSlot === slot
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                                                    }`}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleBooking}
                                    className="w-full py-4 rounded-2xl font-bold bg-lime-400 hover:bg-lime-500 text-slate-900 shadow-xl shadow-lime-100 transition-all flex items-center justify-center gap-2"
                                >
                                    Confirm Booking
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
                                <MapPin size={48} className="mx-auto text-slate-300 mb-4" />
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Select a Court</h3>
                                <p className="text-sm text-slate-500">Click on a marker on the map to view court details and book.</p>
                            </div>
                        )}

                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                            <h4 className="text-sm font-bold text-slate-900 mb-4">All Courts ({filteredCourts.length})</h4>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                                {isLoading ? (
                                    Array(3).fill(0).map((_, i) => <CourtSkeleton key={i} />)
                                ) : (
                                    filteredCourts.map(court => (
                                        <button
                                            key={court.id}
                                            onClick={() => {
                                                setSelectedCourt(court);
                                                if (court.latitude && court.longitude && googleMapRef.current) {
                                                    googleMapRef.current.panTo({ lat: court.latitude, lng: court.longitude });
                                                    googleMapRef.current.setZoom(14);
                                                }
                                            }}
                                            className={`w-full text-left p-4 rounded-2xl transition-all duration-300 border group ${selectedCourt?.id === court.id
                                                ? 'bg-blue-50 border-blue-200 shadow-sm scale-[1.02]'
                                                : 'bg-slate-50 border-transparent hover:bg-white hover:border-slate-200 hover:shadow-md hover:scale-[1.02]'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm text-slate-900">{court.name}</p>
                                                    <p className="text-xs text-slate-500">{court.location}</p>
                                                </div>
                                                <span className="text-sm font-bold text-slate-900">₱{court.pricePerHour}/hr</span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Login Prompt Modal */}
            {showLoginModal && (
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
            )}
        </div>
    );
};

export default GuestBooking;
