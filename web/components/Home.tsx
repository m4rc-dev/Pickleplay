
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Navigation,
  Search,
  ArrowRight,
  Shield,
  Zap,
  Star,
  Trophy,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
  Plus,
  Newspaper,
  Globe,
  Activity,
  ChevronDown,
  GraduationCap,
  Play,
  Facebook,
  Instagram,
  Twitter,
  Mail,
  Phone,
  Calendar
} from 'lucide-react';
import { Product, NewsArticle, Tournament } from '../types';
import { supabase } from '../services/supabase';

const HERO_IMAGES = [
  "/images/home-images/pb1.jpg",
  "/images/home-images/pb2.jpg",
  "/images/home-images/pb3.jpg",
  "/images/home-images/pb4.jpg"
];

const PARTNERS = [
  "FILIPINO HOMES", "FILIPINO HOMES", "FILIPINO HOMES", "FILIPINO HOMES", "FILIPINO HOMES", "FILIPINO HOMES"
];

const MOCK_COURTS = [
  { name: "Riverside Elite PH", location: "Riverside, Manila", rating: 4.9 },
  { name: "Central Cebu Pickleball Hub", location: "Cebu City", rating: 4.8 },
  { name: "Davao Smash Lab", location: "West Davao", rating: 4.7 },
  { name: "Metro Baguio Dinking Spot", location: "Baguio City", rating: 4.6 }
];

const LATEST_NEWS: Partial<NewsArticle>[] = [
  {
    id: '1',
    title: 'THE 2025 PHILIPPINE NATIONALS: DATES CONFIRMED',
    category: 'Tournament',
    date: 'Oct 15',
    image: 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: '2',
    title: 'WHY PH PLAYERS ARE REDEFINING THE META',
    category: 'Gear',
    date: 'Oct 12',
    image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=600'
  }
];
const POPULAR_PLACES = [
  "Metro Manila", "Cebu City", "Davao City", "Quezon City",
  "Makati", "Taguig (BGC)", "Baguio City", "Iloilo City",
  "Bacolod", "Dumaguete", "Pasig", "Angeles City"
];

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

interface CourtWithDistance {
  id: string;
  name: string;
  location: string;
  city: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  region?: string;
  base_price?: number;
}

// Philippine regions mapping
const VISAYAS_CITIES = ['cebu', 'mandaue', 'lapu-lapu', 'talisay', 'danao', 'bogo', 'carcar', 'naga', 'toledo', 'tacloban', 'ormoc', 'bacolod', 'iloilo', 'roxas', 'dumaguete', 'tagbilaran', 'bohol', 'leyte', 'samar', 'negros', 'panay', 'siquijor', 'biliran'];
const MINDANAO_CITIES = ['davao', 'cagayan de oro', 'zamboanga', 'general santos', 'butuan', 'iligan', 'cotabato', 'koronadal', 'tagum', 'panabo', 'digos', 'mati', 'surigao', 'tandag', 'bislig', 'ozamiz', 'dipolog', 'pagadian', 'marawi', 'kidapawan', 'tacurong', 'malaybalay', 'valencia'];

// Default suggested cities when GPS is not enabled
const SUGGESTED_CITIES = [
  { name: 'Manila, Philippines', region: 'Luzon', lat: 14.5995, lng: 120.9842, zoom: 11 },
  { name: 'Cebu City, Philippines', region: 'Visayas', lat: 10.3157, lng: 123.8854, zoom: 10 },
  { name: 'Davao City, Philippines', region: 'Mindanao', lat: 7.1907, lng: 125.4553, zoom: 10 }
];

const getRegion = (city: string): string => {
  const cityLower = city.toLowerCase();
  if (VISAYAS_CITIES.some(c => cityLower.includes(c))) return 'Visayas';
  if (MINDANAO_CITIES.some(c => cityLower.includes(c))) return 'Mindanao';
  return 'Luzon'; // Default to Luzon
};

const Home: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  // Real player faces and user count from Supabase
  const [playerFaces, setPlayerFaces] = useState<string[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  useEffect(() => {
    const fetchPlayerFacesAndCount = async () => {
      try {
        // Fetch up to 5 random user avatars and total user count from 'profiles' table
        const { data: facesData, error: facesError } = await supabase
          .from('profiles')
          .select('avatar_url')
          .not('avatar_url', 'is', null)
          .limit(5);
        if (facesError) throw facesError;
        setPlayerFaces((facesData || []).map((p: any) => p.avatar_url));

        // Fetch total user count
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });
        if (countError) throw countError;
        setTotalUsers(count || 0);
      } catch (err) {
        console.error('Error fetching player faces or user count:', err);
      }
    };
    fetchPlayerFacesAndCount();
  }, []);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [courts, setCourts] = useState<CourtWithDistance[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [userRegion, setUserRegion] = useState<string | null>(null);
  const [nearbyCourts, setNearbyCourts] = useState<CourtWithDistance[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState<boolean | null>(null); // null = not checked, true = enabled, false = denied
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isTournamentsLoading, setIsTournamentsLoading] = useState(true);
  const [latestNews, setLatestNews] = useState<any[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournaments();
    fetchLatestNews();
  }, []);

  const fetchLatestNews = async () => {
    try {
      const response = await fetch('/api/v1/news/articles?page=1');
      if (!response.ok) throw new Error('Failed to fetch news');
      const result = await response.json();

      // Extract articles from nested structure
      const rawArticles = result?.data?.data || result?.data || [];

      // Map to compatible format and limit to 2
      const normalized = rawArticles.slice(0, 2).map((a: any) => ({
        id: String(a.id),
        title: a.title,
        category: a.category || a.category_name || 'Pickleball',
        date: new Date(a.published_at || a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        image: a.image || a.image_url || a.featured_image || 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=800'
      }));

      setLatestNews(normalized);
    } catch (err) {
      console.error('Error fetching dynamic news:', err);
    } finally {
      setIsNewsLoading(false);
    }
  };

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('date', { ascending: true })
        .limit(3);

      if (error) throw error;

      const mappedData = (data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        date: t.date,
        location: t.location,
        prizePool: t.prize_pool,
        status: t.status,
        skillLevel: t.skill_level,
        maxPlayers: t.max_players,
        registeredCount: t.registered_count,
        image: t.image_url
      }));

      setTournaments(mappedData);
    } catch (err) {
      console.error('Error fetching tournaments:', err);
    } finally {
      setIsTournamentsLoading(false);
    }
  };

  // Fetch courts from Supabase for search suggestions
  useEffect(() => {
    const fetchCourts = async () => {
      try {
        const { data, error } = await supabase
          .from('courts')
          .select(`
            id, name, base_price, latitude, longitude, location_id,
            locations (
              address,
              city,
              latitude,
              longitude
            )
          `);

        if (error) throw error;

        const courtData = (data || []).map(c => {
          const loc = (c as any).locations;
          const city = loc?.city || '';
          return {
            id: c.id,
            name: c.name,
            location: city,
            city: city,
            latitude: loc?.latitude || c.latitude,
            longitude: loc?.longitude || c.longitude,
            region: getRegion(city),
            base_price: c.base_price ?? 0
          };
        });
        setCourts(courtData);
      } catch (err) {
        console.error('Error fetching courts for search:', err);
      }
    };
    fetchCourts();
  }, []);

  // Get user's GPS location when they focus on search
  const getUserLocation = () => {
    if (userLocation) return; // Already have location

    setIsLoadingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });

          // Calculate distances for courts and sort by nearest FIRST
          const courtsWithDistance = courts.map(court => {
            if (court.latitude && court.longitude) {
              const distance = calculateDistance(latitude, longitude, court.latitude, court.longitude);
              return { ...court, distance };
            }
            return court;
          }).filter(c => c.distance !== undefined)
            .sort((a, b) => (a.distance || 999) - (b.distance || 999));

          setNearbyCourts(courtsWithDistance);

          // Try to get city from nearest court as fallback
          const nearestCourt = courtsWithDistance[0];
          let fallbackCity = nearestCourt?.city || '';
          let fallbackRegion = nearestCourt?.region || 'Luzon';

          // Reverse geocode to get city name using Google Maps API
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
                let country = '';
                let postalCode = '';
                let adminArea = '';

                for (const component of addressComponents) {
                  if (component.types.includes('locality')) {
                    city = component.long_name;
                  }
                  if (component.types.includes('country')) {
                    country = component.long_name;
                  }
                  if (component.types.includes('postal_code')) {
                    postalCode = component.long_name;
                  }
                  if (component.types.includes('administrative_area_level_1') || component.types.includes('administrative_area_level_2')) {
                    if (!adminArea) adminArea = component.long_name;
                  }
                }

                // Build display string: "Cebu City, Philippines 6000"
                let displayCity = city || adminArea || fallbackCity || 'Your Location';
                if (country) displayCity += `, ${country}`;
                if (postalCode) displayCity += ` ${postalCode}`;

                setUserCity(displayCity);
                setGpsEnabled(true);

                // Determine region based on city
                const region = getRegion(city || adminArea || fallbackCity);
                setUserRegion(region);
              } else {
                // No results from geocoding, use fallback
                setUserCity(fallbackCity ? `${fallbackCity}, Philippines` : 'Your Location');
                setUserRegion(fallbackRegion);
                setGpsEnabled(true);
              }
            } else {
              // No API key, use fallback from nearest court
              setUserCity(fallbackCity ? `${fallbackCity}, Philippines` : 'Your Location');
              setUserRegion(fallbackRegion);
              setGpsEnabled(true);
            }
          } catch (err) {
            console.error('Error getting city name:', err);
            // Use fallback from nearest court
            setUserCity(fallbackCity ? `${fallbackCity}, Philippines` : 'Your Location');
            setUserRegion(fallbackRegion);
            setGpsEnabled(true);
          }

          setIsLoadingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setGpsEnabled(false); // GPS denied or failed
          setIsLoadingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGpsEnabled(false); // Geolocation not supported
      setIsLoadingLocation(false);
    }
  };

  // Recalculate distances when courts or userLocation changes
  useEffect(() => {
    if (userLocation && courts.length > 0) {
      const courtsWithDistance = courts.map(court => {
        if (court.latitude && court.longitude) {
          const distance = calculateDistance(userLocation.lat, userLocation.lng, court.latitude, court.longitude);
          return { ...court, distance };
        }
        return court;
      }).filter(c => c.distance !== undefined)
        .sort((a, b) => (a.distance || 999) - (b.distance || 999));

      setNearbyCourts(courtsWithDistance);
    }
  }, [userLocation, courts]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/booking?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  // Get filtered courts based on search query and user's region
  const getFilteredCourts = () => {
    let courtsToFilter = nearbyCourts.length > 0 ? nearbyCourts : courts;

    // Filter by user's region (Luzon, Visayas, Mindanao)
    if (userRegion && !searchQuery.trim()) {
      courtsToFilter = courtsToFilter.filter(court => court.region === userRegion);
    }

    // If searching, filter by query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      courtsToFilter = courtsToFilter.filter(court =>
        court.name.toLowerCase().includes(query) ||
        court.location.toLowerCase().includes(query) ||
        court.city.toLowerCase().includes(query)
      );
    }

    return courtsToFilter;
  };

  // Region center coordinates for map zooming
  const REGION_CENTERS: Record<string, { lat: number, lng: number, zoom: number }> = {
    'Visayas': { lat: 10.3157, lng: 123.8854, zoom: 10 },  // Cebu center
    'Luzon': { lat: 14.5995, lng: 120.9842, zoom: 11 },    // Manila center
    'Mindanao': { lat: 7.1907, lng: 125.4553, zoom: 10 }   // Davao center
  };

  const handleSuggestionClick = (suggestion: CourtWithDistance) => {
    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
    // Pass court coordinates for direct pin navigation
    if (suggestion.latitude && suggestion.longitude) {
      navigate(`/booking?court=${encodeURIComponent(suggestion.name)}&lat=${suggestion.latitude}&lng=${suggestion.longitude}&zoom=16`);
    } else {
      navigate(`/booking?q=${encodeURIComponent(suggestion.name)}`);
    }
  };

  const handlePlaceClick = () => {
    const cityName = userCity?.split(',')[0] || '';
    setShowSuggestions(false);
    // Navigate with region coordinates for area zoom
    const regionCenter = REGION_CENTERS[userRegion || 'Luzon'];
    navigate(`/booking?loc=${encodeURIComponent(cityName)}&lat=${regionCenter.lat}&lng=${regionCenter.lng}&zoom=${regionCenter.zoom}`);
  };

  const handleSuggestedCityClick = (city: typeof SUGGESTED_CITIES[0]) => {
    setShowSuggestions(false);
    setUserRegion(city.region); // Set region for court filtering
    navigate(`/booking?loc=${encodeURIComponent(city.name)}&lat=${city.lat}&lng=${city.lng}&zoom=${city.zoom}`);
  };

  return (
    <div className="bg-white selection:bg-lime-400 selection:text-black min-h-screen">
      {/* Cinematic Hero */}
      <section className="relative min-h-[80vh] md:min-h-[95vh] flex flex-col items-center justify-center pt-20 pb-6 bg-slate-950 z-40">
        {/* Player profiles - shown at bottom left on desktop only */}
        <div className="hidden md:flex absolute left-4 lg:left-8 bottom-4 lg:bottom-6 z-40 items-center gap-2 select-none">
          <div className="flex -space-x-2">
            {playerFaces.map((face, idx) => (
              <img
                key={idx}
                src={face}
                alt={`Player ${idx + 1}`}
                className="w-8 h-8 lg:w-10 lg:h-10 rounded-full border-2 border-white shadow-lg object-cover"
                style={{ zIndex: playerFaces.length - idx }}
              />
            ))}
          </div>
          <span className="bg-white/90 text-slate-900 font-bold text-[10px] lg:text-xs px-2.5 lg:px-3 py-1.5 rounded-full shadow-md border border-slate-200">
            {totalUsers.toLocaleString()}+ players
          </span>
        </div>

        <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
          <div
            className="absolute inset-0 flex transition-transform duration-1000 cubic-bezier(0.4, 0, 0.2, 1)"
            style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}
          >
            {HERO_IMAGES.map((img, idx) => (
              <div key={idx} className="min-w-full h-full flex-shrink-0 relative">
                <img src={img} className="w-full h-full object-cover grayscale-[20%] brightness-[0.7] contrast-125" alt={`Slide ${idx}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="absolute inset-0 bg-slate-950/30"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent"></div>
          <div className="absolute inset-0 hero-pattern opacity-10"></div>
        </div>

        <div className="relative z-30 w-full max-w-[1800px] mx-auto px-4 md:px-24 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-sm text-lime-400 px-4 py-1.5 rounded-full font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] mb-4 md:mb-8">
            The National Network for Philippines
          </div>
          <h1 className="font-black text-white leading-[0.9] md:leading-[0.8] tracking-tighter mb-4 md:mb-8 uppercase">
            <span className="text-5xl sm:text-6xl md:text-8xl lg:text-[13rem]">PICKLEBALL</span> <br />
            <span className="text-lime-400 text-4xl sm:text-7xl md:text-9xl lg:text-[11rem]">PHILIPPINES.</span>
          </h1>
          <p className="text-sm md:text-2xl text-slate-300 max-w-4xl mx-auto font-medium leading-relaxed mb-6 md:mb-12 px-2">
            The professional digital home for the fastest-growing sport in the Philippines. Join the elite ladder from Manila to Davao.
          </p>
          <div className="flex flex-col items-center gap-4 animate-slide-up w-full">
            {/* Player profiles - shown above search on mobile */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-3 md:hidden">
              <div className="flex -space-x-3">
                {playerFaces.map((face, idx) => (
                  <img
                    key={idx}
                    src={face}
                    alt={`Player ${idx + 1}`}
                    className="w-8 h-8 rounded-full border-2 border-white shadow-lg object-cover"
                    style={{ zIndex: playerFaces.length - idx }}
                  />
                ))}
              </div>
              <span className="bg-white/80 text-slate-900 font-bold text-[10px] px-3 py-1.5 rounded-full shadow-md border border-slate-200">
                Over {totalUsers.toLocaleString()} players
              </span>
            </div>

            <form onSubmit={handleSearch} className="relative group w-full max-w-2xl px-2">
              <div className="relative flex items-center bg-slate-900/90 border border-white/20 backdrop-blur-xl rounded-full p-1.5 md:p-2 h-14 md:h-20 shadow-3xl">
                <Search className="ml-3 md:ml-6 text-slate-500 flex-shrink-0" size={18} />
                <input
                  type="text"
                  placeholder="Find courts..."
                  value={searchQuery}
                  onChange={handleInputChange}
                  onFocus={() => {
                    setShowSuggestions(true);
                    getUserLocation();
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="flex-1 bg-transparent border-none text-white px-2 md:px-6 text-sm md:text-xl font-medium outline-none placeholder:text-slate-600 min-w-0"
                />
                <button
                  type="submit"
                  disabled={!searchQuery.trim()}
                  className="bg-lime-400 hover:bg-lime-300 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 h-11 md:h-16 px-3 sm:px-5 md:px-10 rounded-full font-black flex items-center gap-1 md:gap-3 transition-all active:scale-95 whitespace-nowrap text-[11px] sm:text-xs md:text-lg flex-shrink-0"
                >
                  LOCATE <ArrowRight className="w-3 h-3 md:w-5 md:h-5" />
                </button>
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-4 bg-white border border-slate-200 rounded-[16px] py-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* Loading State */}
                  {isLoadingLocation && (
                    <div className="px-6 py-4 flex items-center gap-3 text-slate-500">
                      <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-medium">Getting your location...</span>
                    </div>
                  )}

                  {/* PLACES Section - Show user's city if GPS enabled, or suggested cities if not */}
                  {(userCity || gpsEnabled === false) && (
                    <>
                      <p className="px-6 py-2 text-xs font-bold text-teal-500 uppercase tracking-wider">Places</p>

                      {/* User's detected location */}
                      {userCity && (
                        <button
                          type="button"
                          onClick={handlePlaceClick}
                          className="w-full text-left px-6 py-3 hover:bg-slate-50 flex items-center gap-4 group transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full border-2 border-teal-400 flex items-center justify-center text-teal-500">
                            <MapPin size={20} />
                          </div>
                          <span className="text-slate-800 font-medium text-[15px]">{userCity}</span>
                        </button>
                      )}

                      {/* Suggested cities when GPS is denied/not available */}
                      {gpsEnabled === false && !userCity && SUGGESTED_CITIES.map((city, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSuggestedCityClick(city)}
                          className="w-full text-left px-6 py-3 hover:bg-slate-50 flex items-center gap-4 group transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full border-2 border-teal-400 flex items-center justify-center text-teal-500">
                            <MapPin size={20} />
                          </div>
                          <span className="text-slate-800 font-medium text-[15px]">{city.name}</span>
                        </button>
                      ))}
                    </>
                  )}

                  {/* COURTS Section */}
                  {getFilteredCourts().length > 0 && (
                    <>
                      <p className="px-6 py-2 text-xs font-bold text-teal-500 uppercase tracking-wider mt-1">Courts</p>
                      <div className="max-h-[350px] overflow-y-auto no-scrollbar">
                        {getFilteredCourts().slice(0, 10).map((court, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSuggestionClick(court)}
                            className="w-full text-left px-6 py-3 hover:bg-slate-50 flex items-center gap-4 group transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-500">
                              {/* Pickleball paddle icon */}
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                <line x1="12" y1="17" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <circle cx="10" cy="8" r="1" fill="currentColor" />
                                <circle cx="14" cy="8" r="1" fill="currentColor" />
                                <circle cx="12" cy="11" r="1" fill="currentColor" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-slate-800 font-semibold text-[15px]">{court.name}</p>
                              <p className="text-[13px] text-slate-400">
                                {court.distance !== undefined && (
                                  <span>{court.distance.toFixed(1)} miles away</span>
                                )}
                                {court.distance !== undefined && court.city && ' · '}
                                <span>{court.city}{court.region ? `, ${court.region}` : ''}</span>
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* No courts in region message */}
                  {!isLoadingLocation && userCity && getFilteredCourts().length === 0 && (
                    <div className="px-6 py-6 text-center">
                      <p className="text-sm text-slate-500">No courts found in {userRegion || 'your area'}</p>
                    </div>
                  )}

                  {/* No location message */}
                  {!isLoadingLocation && !userCity && getFilteredCourts().length === 0 && (
                    <div className="px-6 py-8 text-center">
                      <MapPin size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500">Enable location to find nearby courts</p>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* Featured Courts Section */}
      <section className="py-16 md:py-24 bg-slate-50 px-6 md:px-24 lg:px-32 relative overflow-hidden">
        <div className="max-w-[1800px] mx-auto">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-4">DISCOVER / NEARBY</p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-950 tracking-tighter uppercase">
                Featured Courts <span className="text-lime-500">{userCity ? `In ${userCity.split(',')[0]}.` : "In The Philippines."}</span>
              </h2>
              {userCity && (
                <p className="text-slate-500 font-medium mt-4 flex items-center gap-2">
                  <MapPin size={16} className="text-blue-600" />
                  Showing courts near <span className="font-bold text-slate-700">{userCity}</span>
                </p>
              )}
            </div>
            <Link
              to="/booking"
              className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors"
            >
              VIEW ALL COURTS <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {isLoadingLocation ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-lime-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium">Finding courts near you...</p>
              </div>
            </div>
          ) : (nearbyCourts.length > 0 || courts.length > 0) ? (
            <div className="relative">
              {/* Left Scroll Button */}
              <button
                onClick={() => {
                  const container = document.getElementById('courts-carousel');
                  if (container) container.scrollBy({ left: -320, behavior: 'smooth' });
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white shadow-xl rounded-full flex items-center justify-center hover:bg-slate-50 transition-all border border-slate-200 -ml-6 hidden md:flex"
              >
                <ChevronLeft size={24} className="text-slate-700" />
              </button>

              {/* Right Scroll Button */}
              <button
                onClick={() => {
                  const container = document.getElementById('courts-carousel');
                  if (container) container.scrollBy({ left: 320, behavior: 'smooth' });
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white shadow-xl rounded-full flex items-center justify-center hover:bg-slate-50 transition-all border border-slate-200 -mr-6 hidden md:flex"
              >
                <ChevronRight size={24} className="text-slate-700" />
              </button>

              {/* Scrollable Container */}
              <div
                id="courts-carousel"
                className="flex gap-6 overflow-x-auto pb-4 px-2 scrollbar-hide snap-x snap-mandatory scroll-smooth"
              >
                {(nearbyCourts.length > 0 ? nearbyCourts : courts).slice(0, 10).map((court, idx) => (
                  <div
                    key={idx}
                    className="flex-shrink-0 w-[340px] md:w-[400px] bg-white p-8 border border-slate-200 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 snap-start"
                  >
                    {/* Court Image */}
                    <Link to={`/booking?court=${encodeURIComponent(court.name)}&lat=${court.latitude}&lng=${court.longitude}&zoom=16`}>
                      <img
                        src={`https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=600&h=400`}
                        alt={court.name}
                        className="w-full h-64 object-cover rounded-2xl mb-7"
                      />
                    </Link>

                    {/* Rating Section */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg key={star} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M13.849 4.22c-.684-1.626-3.014-1.626-3.698 0L8.397 8.387l-4.552.361c-1.775.14-2.495 2.331-1.142 3.477l3.468 2.937-1.06 4.392c-.413 1.713 1.472 3.067 2.992 2.149L12 19.35l3.897 2.354c1.52.918 3.405-.436 2.992-2.15l-1.06-4.39 3.468-2.938c1.353-1.146.633-3.336-1.142-3.477l-4.552-.36-1.754-4.17Z" />
                          </svg>
                        ))}
                      </div>
                      <span className="bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded">
                        4.8 out of 5
                      </span>
                    </div>

                    {/* Court Name & Location */}
                    <Link to={`/booking?court=${encodeURIComponent(court.name)}&lat=${court.latitude}&lng=${court.longitude}&zoom=16`}>
                      <h5 className="text-2xl text-slate-900 font-black tracking-tight leading-snug hover:text-blue-600 transition-colors">
                        {court.name}
                      </h5>
                    </Link>
                    <p className="text-base text-slate-500 mt-2 flex items-center gap-2">
                      <MapPin size={18} className="text-slate-400" />
                      {court.city}, {court.region || 'Philippines'}
                      {court.distance !== undefined && (
                        <span className="text-blue-600 font-semibold ml-2">• {court.distance.toFixed(1)} mi</span>
                      )}
                    </p>

                    {/* Price & Book Button */}
                    <div className="flex items-center justify-between mt-8">
                      <span className="text-3xl font-extrabold text-slate-900">
                        ₱{court.base_price ?? 0}
                        <span className="text-lg font-medium text-slate-400">/hr</span>
                      </span>
                      <Link
                        to={`/court/${court.id}`}
                        className="inline-flex items-center text-white bg-blue-600 hover:bg-blue-700 border border-transparent focus:ring-4 focus:ring-blue-200 shadow-md font-black rounded-2xl text-base px-6 py-3 transition-all active:scale-95"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Book Now
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Find Near Me button if GPS not enabled */}
              {!gpsEnabled && (
                <div className="mt-12 flex justify-center">
                  <button
                    onClick={getUserLocation}
                    className="group relative px-10 py-5 bg-white border-2 border-slate-900 overflow-hidden rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:text-white"
                  >
                    <div className="absolute inset-0 bg-slate-900 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <span className="relative z-10 flex items-center gap-3">
                      <Navigation size={18} className="animate-pulse" />
                      Find Courts Near Me
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-[40px] border border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin size={32} className="text-slate-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Finding Courts for You</h3>
              <p className="text-slate-500 font-medium mb-6 max-w-md mx-auto">
                We're searching for the best pickleball spots in your area.
              </p>
              <button
                onClick={getUserLocation}
                className="px-8 py-4 bg-lime-400 hover:bg-lime-500 text-slate-900 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 shadow-xl shadow-lime-100"
              >
                <Navigation size={18} className="inline mr-2" />
                Find Courts Near Me
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Beginner Welcome Section - Interactive Guide */}
      <section className="py-16 md:py-24 bg-white px-6 md:px-24 lg:px-32 relative overflow-hidden">
        <div className="max-w-[1800px] mx-auto">
          {/* Section Header */}
          <div className="mb-12 md:mb-16">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-tight">
              Learn to play pickleball with our <span className="text-lime-500 underline decoration-lime-400 decoration-4 underline-offset-8">how to play guides  →</span>
            </h2>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            {/* Left Column - Guide Cards */}
            <div className="space-y-6">
              {/* Guide Card 1 */}
              <Link to="/guides/rules" className="group flex gap-4 md:gap-6 items-start hover:bg-slate-50 p-4 rounded-3xl transition-all">
                <div className="w-32 h-24 md:w-48 md:h-32 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=400"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt="Players on court"
                  />
                </div>
                <div className="flex-1 pt-2">
                  <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-3">
                    Guides
                  </span>
                  <h3 className="text-lg md:text-xl font-black text-slate-950 leading-tight group-hover:text-blue-600 transition-colors">
                    How to play pickleball - 9 simple rules for beginners
                  </h3>
                </div>
              </Link>

              {/* Guide Card 2 */}
              <Link to="/guides/skill-rating" className="group flex gap-4 md:gap-6 items-start hover:bg-slate-50 p-4 rounded-3xl transition-all">
                <div className="w-32 h-24 md:w-48 md:h-32 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=400"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt="Player serving"
                  />
                </div>
                <div className="flex-1 pt-2">
                  <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-3">
                    Guides
                  </span>
                  <h3 className="text-lg md:text-xl font-black text-slate-950 leading-tight group-hover:text-blue-600 transition-colors">
                    What is my pickleball skill rating? Take this quiz to get rated
                  </h3>
                </div>
              </Link>

              {/* Guide Card 3 */}
              <Link to="/guides/equipment" className="group flex gap-4 md:gap-6 items-start hover:bg-slate-50 p-4 rounded-3xl transition-all">
                <div className="w-32 h-24 md:w-48 md:h-32 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=400"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt="Pickleball equipment"
                  />
                </div>
                <div className="flex-1 pt-2">
                  <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-3">
                    Guides
                  </span>
                  <h3 className="text-lg md:text-xl font-black text-slate-950 leading-tight group-hover:text-blue-600 transition-colors">
                    Essential gear guide - What you need to start playing
                  </h3>
                </div>
              </Link>
            </div>

            {/* Right Column - Video Player */}
            <div className="relative">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl relative group cursor-pointer">
                <img
                  src="https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&q=80&w=1200"
                  className="w-full h-full object-cover"
                  alt="Players on court"
                />
                {/* Video Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/20 to-transparent"></div>

                {/* Play Button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 md:w-28 md:h-28 bg-lime-500 rounded-full flex items-center justify-center shadow-2xl shadow-lime-500/30 group-hover:scale-110 group-hover:bg-lime-400 transition-all duration-300">
                    <Play className="text-white fill-white" size={40} />
                  </div>
                </div>
              </div>

              {/* Video Description */}
              <div className="mt-8 space-y-6">
                {/* Tags */}
                <div className="flex gap-3">
                  <span className="bg-blue-100 text-black px-5 py-2.5 rounded-full text-sm font-black uppercase tracking-wide">
                    Guides
                  </span>
                  <span className="bg-blue-100 text-black px-5 py-2.5 rounded-full text-sm font-black uppercase tracking-wide">
                    Learn
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-950 leading-tight">
                  How To Play Pickleball: Free Virtual Clinic for Beginners
                </h3>

                {/* CTA Buttons */}
                <div className="flex flex-wrap items-center gap-4">
                  <button className="bg-lime-500 hover:bg-lime-600 text-white px-8 py-4 rounded-full font-black text-base transition-all shadow-lg shadow-lime-500/30 hover:shadow-xl hover:shadow-lime-500/40 active:scale-95">
                    Watch Now
                  </button>
                  <Link to="/guides" className="flex items-center gap-2 text-slate-950 font-black text-base hover:text-lime-600 transition-colors group">
                    Or read our guides
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section >

      {/* Tournaments Section - Real data from Supabase */}
      < section className="py-20 md:py-32 bg-slate-950 relative overflow-hidden" >
        {/* Abstract Background Accents */}
        < div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] -z-10" ></div >
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-lime-400/5 blur-[150px] -z-10"></div>

        <div className="max-w-[1800px] mx-auto px-6 md:px-24 lg:px-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
            <div className="max-w-2xl">
              <p className="text-[10px] font-black text-lime-400 uppercase tracking-[0.4em] mb-4">COMPETITIVE CIRCUIT / 2026</p>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-[0.9] uppercase">
                Elite PH <br />
                <span className="text-lime-400 italic">Tournaments.</span>
              </h2>
            </div>
            <Link
              to="/tournaments"
              className="group flex items-center gap-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-8 py-4 rounded-2xl transition-all"
            >
              <span className="text-xs font-black uppercase tracking-widest">View All Events</span>
              <div className="w-8 h-8 rounded-full bg-lime-400 flex items-center justify-center text-slate-950 group-hover:scale-110 transition-transform">
                <ArrowRight size={16} />
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isTournamentsLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="aspect-[4/5] rounded-[40px] bg-white/5 animate-pulse border border-white/10"></div>
              ))
            ) : tournaments.length > 0 ? (
              tournaments.map((tournament) => (
                <Link
                  to="/tournaments"
                  key={tournament.id}
                  className="group relative aspect-[4/5] rounded-[40px] overflow-hidden border border-white/10 bg-slate-900 transition-all hover:scale-[1.02] shadow-2xl"
                >
                  <img
                    src={tournament.image || "https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=800"}
                    className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-1000"
                    alt={tournament.name}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

                  {/* Status Badge */}
                  <div className="absolute top-8 left-8">
                    <span className="bg-lime-400 text-slate-950 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                      {tournament.status}
                    </span>
                  </div>

                  <div className="absolute bottom-10 left-10 right-10">
                    <div className="flex items-center gap-2 text-lime-400 text-[10px] font-black uppercase tracking-widest mb-4">
                      <Trophy size={14} />
                      {tournament.prizePool || "Ranked Event"}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight uppercase mb-6 group-hover:text-lime-400 transition-colors">
                      {tournament.name}
                    </h3>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-slate-400">
                        <Calendar size={16} className="text-white" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {new Date(tournament.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-400">
                        <MapPin size={16} className="text-white" />
                        <span className="text-[10px] font-bold uppercase tracking-widest truncate">{tournament.location}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-white/5 rounded-[40px] border border-dashed border-white/10">
                <Trophy className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No live tournaments found</p>
              </div>
            )}
          </div>
        </div>
      </section >

      {/* Marquee */}
      < div className="bg-slate-50 py-3 md:py-4 border-y border-slate-100 overflow-hidden relative" >
        <div className="animate-marquee whitespace-nowrap flex items-center gap-12 md:gap-24">
          {[...PARTNERS, ...PARTNERS].map((partner, i) => (
            <span key={i} className="text-slate-900/5 font-black text-4xl md:text-6xl tracking-tighter italic select-none uppercase">{partner}</span>
          ))}
        </div>
      </div >

      {/* News Highlight Section - Real data from HomesPh API */}
      < section className="py-16 md:py-24 bg-white" >
        <div className="max-w-[1800px] mx-auto px-6 md:px-24 lg:px-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-12 gap-6">
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-4">NATIONAL NEWS / INTEL</p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-950 tracking-tighter uppercase">WHAT'S NEW IN PH.</h2>
            </div>
            <Link to="/news" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors">
              VIEW FULL PH FEED <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
            {isNewsLoading ? (
              Array(2).fill(0).map((_, i) => (
                <div key={i} className="aspect-video md:aspect-[21/9] rounded-[32px] md:rounded-[48px] bg-slate-100 animate-pulse border border-slate-200"></div>
              ))
            ) : latestNews.length > 0 ? (
              latestNews.map((article) => (
                <Link to="/news" key={article.id} className="group relative aspect-video md:aspect-[21/9] rounded-[32px] md:rounded-[48px] overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
                  <img src={article.image} className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" alt={article.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
                  <div className="absolute bottom-6 left-6 right-6 md:bottom-10 md:left-10 md:right-10">
                    <span className="bg-lime-400 text-slate-950 px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest mb-3 md:mb-4 inline-block">{article.category}</span>
                    <h3 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight group-hover:text-lime-400 transition-colors uppercase">{article.title}</h3>
                  </div>
                  <div className="absolute top-6 right-6 md:top-10 md:right-10 bg-white/10 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-widest">
                    {article.date}
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-12 text-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No recent news found</p>
              </div>
            )}
          </div>
        </div>
      </section >


      {/* Mobile App Download Section */}
      < section className="bg-lime-400 py-16 px-6 md:px-24 lg:px-32" >
        <div className="max-w-[1800px] mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-12 md:mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 tracking-tighter mb-4 md:mb-6 uppercase">DOWNLOAD OUR APP</h2>
            <p className="text-slate-500 font-medium text-base md:text-xl">Please download our upcoming Mobile App. Compatible both in iOS and Android.</p>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            <div className="relative">
              <img
                src="/images/mobile-app-preview.png"
                alt="PicklePlay Mobile App"
                className="w-[280px] md:w-[320px] h-auto rounded-[32px] shadow-2xl"
              />
            </div>
            <div className="flex flex-col items-center md:items-start gap-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="#" className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-6 py-4 rounded-2xl transition-all shadow-lg">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium opacity-80">Download on the</span>
                    <span className="text-lg font-bold -mt-1">App Store</span>
                  </div>
                </a>
                <a href="#" className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-6 py-4 rounded-2xl transition-all shadow-lg">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z" />
                  </svg>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium opacity-80">GET IT ON</span>
                    <span className="text-lg font-bold -mt-1">Google Play</span>
                  </div>
                </a>
              </div>
              <p className="text-slate-400 text-sm font-medium text-center md:text-left">Coming Soon • Be the first to know when we launch!</p>
            </div>
          </div>
        </div>
      </section >

      {/* Final CTA */}
      < section className="py-12 px-6 md:px-24 lg:px-32" >
        <div className="max-w-[1800px] mx-auto bg-slate-950 rounded-[40px] md:rounded-[80px] p-12 md:p-32 text-center relative overflow-hidden shadow-3xl">
          <div className="absolute top-0 right-0 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-blue-600/20 blur-[120px]"></div>
          <div className="absolute bottom-0 left-0 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-lime-400/10 blur-[120px]"></div>
          <div className="relative z-10 space-y-8 md:space-y-12">
            <h2 className="text-4xl md:text-9xl font-black text-white tracking-tighter leading-none uppercase">READY TO <br /><span className="text-lime-400 italic">DOMINATE PH?</span></h2>
            <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center">
              <button className="bg-lime-400 hover:bg-lime-300 text-slate-950 h-16 md:h-24 px-8 md:px-16 rounded-2xl md:rounded-[32px] font-black text-base md:text-xl uppercase tracking-widest transition-all active:scale-95 shadow-2xl shadow-lime-400/20">JOIN PH NETWORK</button>
            </div>
          </div>
        </div>
      </section >

      <footer className="py-20 md:py-24 px-6 md:px-24 lg:px-32 border-t border-slate-100 bg-white">
        <div className="max-w-[1800px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-16 mb-20">
            {/* Brand Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-slate-950 font-black text-2xl tracking-tighter uppercase">
                <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="w-10 h-10 object-contain rounded-xl" />
                <div className="flex flex-col leading-none">
                  <span className="text-2xl">PICKLEPLAY</span>
                  <span className="text-sm tracking-wider text-blue-600">PHILIPPINES</span>
                </div>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs font-medium">
                The premier destination for the Philippine pickleball community. Join the movement, find your squad, and dominate the court.
              </p>
              <div className="flex gap-4 pt-2">
                <a href="#" className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                  <Facebook size={18} />
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                  <Instagram size={18} />
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                  <Twitter size={18} />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-8">Platform</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Booking System</a></li>
                <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Academy Classes</a></li>
                <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Community Hub</a></li>
                <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Pro Shop</a></li>
              </ul>
            </div>

            {/* Legal Section */}
            <div>
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-8">Legal & Policy</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">PH Partners Agreement</a></li>
                <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Cookie Settings</a></li>
              </ul>
            </div>

            {/* Contact Section */}
            <div>
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-8">Contact Us</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="text-blue-600 shrink-0 mt-0.5" />
                  <span className="text-sm font-bold text-slate-500">Metro Manila, Philippines</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={18} className="text-blue-600 shrink-0" />
                  <span className="text-sm font-bold text-slate-500">hello@pickleballph.com</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} className="text-blue-600 shrink-0" />
                  <span className="text-sm font-bold text-slate-500">+63 (2) 123 4567</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
              © 2026 PICKLEBALL PHILIPPINES LTD. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </footer>
    </div >
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string, tag: string }> = ({ icon, title, description, tag }) => (
  <div className="p-10 md:p-16 rounded-[40px] md:rounded-[60px] bg-white border border-slate-200 shadow-sm hover:shadow-3xl transition-all group relative overflow-hidden text-center md:text-left">
    <div className="flex flex-col md:flex-row justify-between items-center md:items-start mb-8 md:mb-12 relative z-10 gap-6">
      <div className="w-16 h-16 md:w-24 md:h-24 flex items-center justify-center group-hover:scale-110 transition-all duration-500">
        {icon}
      </div>
      <span className="text-[8px] md:text-[10px] font-black bg-slate-100 text-slate-400 px-3 py-1.5 md:px-4 md:py-2 rounded-full group-hover:bg-lime-400 group-hover:text-slate-950 transition-colors uppercase tracking-widest">{tag}</span>
    </div>
    <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 md:mb-6 tracking-tighter uppercase relative z-10">{title}</h3>
    <p className="text-slate-500 text-base md:text-lg leading-relaxed font-medium mb-8 md:mb-10 relative z-10">{description}</p>
    <div className="h-1 md:h-1.5 w-12 md:w-16 bg-slate-100 group-hover:w-full group-hover:bg-blue-600 transition-all duration-700 relative z-10 mx-auto md:mx-0"></div>
  </div>
);

export default Home;
