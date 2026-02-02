import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, MapPin, DollarSign, Clock, CheckCircle2, Loader2, Filter, Search, Navigation } from 'lucide-react';
import { Court } from '../types';
import { CourtSkeleton } from './ui/Skeleton';
import { INITIAL_COURTS } from '../data/mockData';

const TIME_SLOTS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
];

declare global {
  interface Window {
    google: any;
  }
}

const Booking: React.FC = () => {
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isBooked, setIsBooked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'All' | 'Indoor' | 'Outdoor'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    const fetchCourts = async () => {
      setIsLoading(true);
      const data = await new Promise<Court[]>(resolve =>
        setTimeout(() => resolve(INITIAL_COURTS), 800)
      );
      setCourts(data);
      setIsLoading(false);
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

    // Center on Manila
    const center = { lat: 14.5995, lng: 121.0437 };

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 12,
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

    // Add markers for each court
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

        marker.addListener('click', () => {
          setSelectedCourt(court);
          map.panTo({ lat: court.latitude!, lng: court.longitude! });
          map.setZoom(14);
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

  const handleBooking = async () => {
    if (selectedCourt && selectedSlot) {
      setIsProcessing(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsBooked(true);
      setIsProcessing(false);
      setTimeout(() => setIsBooked(false), 3000);
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
          googleMapRef.current.panTo(userLocation);
          googleMapRef.current.setZoom(13);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please enable location services.');
        }
      );
    }
  };

  const filteredCourts = courts
    .filter(c => filterType === 'All' || c.type === filterType)
    .filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-4">COURTS / 2025</p>
          <h1 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tighter uppercase">Book a Court.</h1>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map View */}
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

        {/* Court Details Sidebar */}
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

              {/* Time Slots */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-blue-600" />
                  Available Times
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_SLOTS.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2.5 px-3 rounded-xl font-semibold text-sm transition-all border ${selectedSlot === slot
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                        }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Booking Button */}
              <button
                disabled={!selectedSlot || isBooked || isProcessing}
                onClick={handleBooking}
                className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${isBooked
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
                  ) : (
                    'Confirm Booking'
                  )
                )}
              </button>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
              <MapPin size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Select a Court</h3>
              <p className="text-sm text-slate-500">Click on a marker on the map to view court details and book.</p>
            </div>
          )}

          {/* Court List */}
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
                    className={`w-full text-left p-3 rounded-xl transition-all border ${selectedCourt?.id === court.id
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
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
    </div >
  );
};

export default Booking;
