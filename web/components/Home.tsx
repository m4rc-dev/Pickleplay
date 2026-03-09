
import React, { useEffect, useState } from 'react';
import useSEO from '../hooks/useSEO';
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
  Mail,
  Calendar,
  X,
  Clock
} from 'lucide-react';
import { Product, Tournament } from '../types';
import { supabase } from '../services/supabase';
import { fetchTournaments as fetchTournamentsService } from '../services/tournaments';

const HERO_IMAGES = [
  "/images/home-images/pb1.jpg",
  "/images/home-images/pb2.jpg",
  "/images/home-images/pb3.jpg",
  "/images/home-images/pb4.jpg"
];

const PARTNERS = [
  "FILIPINO HOMES", "FILIPINO HOMES", "FILIPINO HOMES", "FILIPINO HOMES", "FILIPINO HOMES", "FILIPINO HOMES"
];

const COURT_IMAGES = [
  "/images/home-images/pb1.jpg",
  "/images/home-images/pb2.jpg",
  "/images/home-images/pb3.jpg",
  "/images/home-images/pb4.jpg",
  "/images/home-images/pb5.jpg",
  "/images/home-images/pb6.jpg",
  "/images/home-images/pb7.jpg",
  "/images/home-images/pb8.jpg",
  "/images/home-images/pb9.jpg",
  "/images/home-images/pb10.jpg"
];

const MOCK_COURTS = [
  { name: "Riverside Elite PH", location: "Riverside, Manila", rating: 4.9 },
  { name: "Central Cebu Pickleball Hub", location: "Cebu City", rating: 4.8 },
  { name: "Davao Smash Lab", location: "West Davao", rating: 4.7 },
  { name: "Metro Baguio Dinking Spot", location: "Baguio City", rating: 4.6 }
];

const POPULAR_PLACES = [
  "Metro Manila", "Cebu City", "Davao City", "Quezon City",
  "Makati", "Taguig (BGC)", "Baguio City", "Iloilo City",
  "Bacolod", "Dumaguete", "Pasig", "Angeles City"
];

const FAQ_ITEMS: { question: string; answer: React.ReactNode }[] = [
  {
    question: "What is Pickleplay?",
    answer: "Pickleplay is the premier digital platform for the Philippine pickleball community, connecting players, coaches, and court owners. We provide a seamless ecosystem for booking courts, finding coaches, joining tournaments, and staying updated with the latest news."
  },
  {
    question: "I'm a new pickleball player. How do I get started?",
    answer: <>Getting started is easy! We recommend checking out our 'How to Play' guides in the Academy section and finding a local coach or clinic through our platform. You can also use our <Link to="/booking" className="text-blue-600 font-bold hover:underline">Court Locator</Link> to find 'dink spots' near you where beginners are always welcome.</>
  },
  {
    question: "How do I book a court?",
    answer: <>Simply use our '<a href="#" onClick={(e: React.MouseEvent) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-blue-600 font-bold hover:underline cursor-pointer">LOCATE</a>' search on the homepage or head to the '<Link to="/booking" className="text-blue-600 font-bold hover:underline">BOOKING</Link>' page. You can filter by region (Luzon, Visayas, Mindanao) or city, view available time slots, and book your court in just a few clicks.</>
  },
  {
    question: "Can I host my own tournaments?",
    answer: "Yes! If you are a Court Owner or an Event Organizer, you can apply for a professional account. Once approved, you'll have access to our Tournament Manager where you can create events, manage registrations, and track prize pools."
  },
  {
    question: "What equipment do I need?",
    answer: <>To start playing, you'll need a pickleball paddle, some pickleballs (indoor or outdoor depending on the court), and standard court shoes. Many venues also offer equipment rentals. Check out our '<Link to="/shop" className="text-blue-600 font-bold hover:underline">PRO SHOP</Link>' for high-quality gear curated for PH players.</>
  }
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
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  location_id?: string;
}

interface LocationWithDistance {
  id: string;
  name: string;
  city: string;
  state?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  region?: string;
  court_count?: number;
  imageUrl?: string;
  min_price?: number;
  max_price?: number;
  has_free?: boolean;
  avg_rating?: number;
  total_reviews?: number;
  court_type?: string;
  amenities?: any;
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
  useSEO({
    title: 'PicklePlay Philippines – Find Pickleball Courts Near You & Play',
    description: 'Find pickleball courts near you across the Philippines. Learn how to play pickleball, book courts in Manila, Cebu, Davao, join tournaments, and connect with players — all in one place.',
    canonical: 'https://www.pickleplay.ph/',
  });
  const [searchQuery, setSearchQuery] = useState('');
  // Real player faces and user count from Supabase
  const [playerFaces, setPlayerFaces] = useState<string[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  useEffect(() => {
    const fetchPlayerFacesAndCount = async () => {
      try {
        // Fetch up to 5 most recently registered user avatars from 'profiles' table
        const { data: facesData, error: facesError } = await supabase
          .from('profiles')
          .select('avatar_url')
          .not('avatar_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(5);
        if (facesError) throw facesError;
        setPlayerFaces((facesData || []).map((p: any) => p.avatar_url).filter((url: string) => url && url.trim() !== ''));

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

    const fetchTournaments = async () => {
      setIsTournamentsLoading(true);
      try {
        const data = await fetchTournamentsService({ featuredOnly: true, approvedOnly: true });
        setTournaments(data.length > 0 ? data.slice(0, 4) : []);

        // If no featured tournaments, fallback to latest approved
        if (data.length === 0) {
          const fallback = await fetchTournamentsService({ approvedOnly: true });
          setTournaments(fallback.slice(0, 3));
        }
      } catch (err) {
        console.error('Error fetching tournaments:', err);
      } finally {
        setIsTournamentsLoading(false);
      }
    };

    fetchPlayerFacesAndCount();
    fetchTournaments();
    // Auto-detect location on mount if permissions allow
    getUserLocation();
  }, []);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [courts, setCourts] = useState<CourtWithDistance[]>([]);
  const [locations, setLocations] = useState<LocationWithDistance[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [userRegion, setUserRegion] = useState<string | null>(null);
  const [nearbyCourts, setNearbyCourts] = useState<CourtWithDistance[]>([]);
  const [nearbyLocations, setNearbyLocations] = useState<LocationWithDistance[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState<boolean | null>(null); // null = not checked, true = enabled, false = denied
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isTournamentsLoading, setIsTournamentsLoading] = useState(false);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const navigate = useNavigate();

  // Fetch courts from Supabase for search suggestions
  useEffect(() => {
    const fetchCourts = async () => {
      try {
        const { data, error } = await supabase
          .from('courts')
          .select(`
            id, name, base_price, latitude, longitude, location_id, image_url,
            locations (
              id,
              name,
              address,
              city,
              latitude,
              longitude,
              court_type,
              amenities,
              image_url
            ),
            court_reviews (
              rating
            )
          `);

        if (error) throw error;

        const courtData = (data || []).map(c => {
          const loc = (c as any).locations;
          const reviews = (c as any).court_reviews || [];
          const city = loc?.city || '';

          let avgRating = 0;
          if (reviews.length > 0) {
            const sum = reviews.reduce((acc: number, rev: any) => acc + rev.rating, 0);
            avgRating = Math.round((sum / reviews.length) * 10) / 10;
          }

          return {
            id: (c as any).id,
            name: c.name,
            location: city,
            city: city,
            latitude: loc?.latitude || c.latitude,
            longitude: loc?.longitude || c.longitude,
            region: getRegion(city),
            base_price: c.base_price ?? 0,
            rating: avgRating,
            reviewCount: reviews.length,
            imageUrl: c.image_url,
            location_id: c.location_id,
            location_name: loc?.name || '',
            location_court_type: loc?.court_type || '',
            location_amenities: Array.isArray(loc?.amenities) ? loc.amenities : [],
            location_address: loc?.address || '',
            location_image: loc?.image_url || ''
          };
        });
        setCourts(courtData);
      } catch (err) {
        console.error('Error fetching courts for search:', err);
      }
    };

    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select(`
            *,
            courts (
              id, base_price, court_type, amenities,
              court_reviews (
                rating
              )
            )
          `);

        if (error) throw error;

        const locationData = (data || []).map(loc => {
          const courts = (loc as any).courts || [];
          const city = loc.city || '';

          // Calculate aggregated data from courts
          let totalRating = 0;
          let totalReviews = 0;
          let courtCount = 0;
          const courtPrices: number[] = [];
          const courtTypeSet = new Set<string>();
          const allAmenities = new Set<string>();

          // Add location-level amenities first
          const locAmenities = (loc as any).amenities;
          if (Array.isArray(locAmenities)) {
            locAmenities.forEach((a: string) => allAmenities.add(a));
          }

          courts.forEach((court: any) => {
            courtCount++;
            courtPrices.push(court.base_price || 0);

            // Aggregate court types
            const ct = (court.court_type || '').toLowerCase();
            if (ct.includes('indoor')) courtTypeSet.add('Indoor');
            if (ct.includes('outdoor')) courtTypeSet.add('Outdoor');
            if (ct === 'both') { courtTypeSet.add('Indoor'); courtTypeSet.add('Outdoor'); }

            // Aggregate amenities from each court
            if (Array.isArray(court.amenities)) {
              court.amenities.forEach((a: string) => allAmenities.add(a));
            }

            const reviews = court.court_reviews || [];
            reviews.forEach((review: any) => {
              totalRating += review.rating;
              totalReviews++;
            });
          });

          // Location-level court_type is the PRIMARY source (set in Edit Location form)
          const locCt = ((loc as any).court_type || '').trim().toLowerCase();
          if (locCt.includes('both')) { courtTypeSet.add('Indoor'); courtTypeSet.add('Outdoor'); }
          else if (locCt.includes('indoor')) courtTypeSet.add('Indoor');
          else if (locCt.includes('outdoor')) courtTypeSet.add('Outdoor');

          // Build the display court type string
          const derivedCourtType = courtTypeSet.size === 0
            ? 'Indoor'
            : courtTypeSet.has('Indoor') && courtTypeSet.has('Outdoor')
              ? 'Indoor / Outdoor'
              : courtTypeSet.has('Outdoor') ? 'Outdoor' : 'Indoor';

          return {
            id: loc.id,
            name: loc.name,
            city: city,
            state: loc.state,
            address: loc.address,
            latitude: loc.latitude,
            longitude: loc.longitude,
            region: getRegion(city),
            court_count: courtCount,
            min_price: courtPrices.length > 0 ? Math.min(...courtPrices) : 0,
            max_price: courtPrices.length > 0 ? Math.max(...courtPrices) : 0,
            has_free: courtPrices.some(p => p === 0),
            avg_rating: totalReviews > 0 ? Math.round((totalRating / totalReviews) * 10) / 10 : 0,
            total_reviews: totalReviews,
            imageUrl: (loc as any).hero_image || loc.image_url,
            status: (loc as any).status,
            is_active: (loc as any).is_active,
            court_type: derivedCourtType,
            amenities: Array.from(allAmenities)
          };
        });
        setLocations(locationData);
        // Debug logging removed: locations fetched
      } catch (err) {
        console.error('Error fetching locations:', err);
      }
    };

    fetchCourts();
    fetchLocations();
  }, []);

  // Get user's GPS location when they focus on search
  const getUserLocation = () => {
    if (gpsEnabled === true && userLocation) return; // Already have location

    setIsLoadingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setGpsEnabled(true); // Immediately set to true so the UI can react

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

          // Calculate distances for locations and sort by nearest
          const locationsWithDistance = locations.map(location => {
            if (location.latitude && location.longitude) {
              const distance = calculateDistance(latitude, longitude, location.latitude, location.longitude);
              return { ...location, distance };
            }
            return location;
          }).filter(l => l.distance !== undefined)
            .sort((a, b) => (a.distance || 999) - (b.distance || 999));

          setNearbyLocations(locationsWithDistance);

          // Try to get city from nearest court as fallback
          const nearestCourt = courtsWithDistance[0];
          let fallbackCity = nearestCourt?.city || 'Your Location';
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

                // Build display string - just the city/admin area name for the header
                let displayCity = city || adminArea || fallbackCity;
                setUserCity(displayCity);

                // Determine region based on city
                const region = getRegion(city || adminArea || fallbackCity);
                setUserRegion(region);
              } else {
                // No results from geocoding, use fallback
                setUserCity(fallbackCity);
                setUserRegion(fallbackRegion);
              }
            } else {
              // No API key, use fallback from nearest court
              setUserCity(fallbackCity);
              setUserRegion(fallbackRegion);
            }
          } catch (err) {
            console.error('Error getting city name:', err);
            // Use fallback from nearest court
            setUserCity(fallbackCity);
            setUserRegion(fallbackRegion);
          }

          setIsLoadingLocation(false);
        },
        (error) => {
          console.warn(`Geolocation error (${error.code}): ${error.message}. Trying low accuracy...`);
          if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
            // Define success handler as a variable to reuse
            const onSecondSuccess = async (pos: GeolocationPosition) => {
              const { latitude: lat, longitude: lng } = pos.coords;
              setUserLocation({ lat, lng });
              setGpsEnabled(true);
              // Recalculate distances
              const courtsWithDist = courts.map(c => {
                if (c.latitude && c.longitude) {
                  return { ...c, distance: calculateDistance(lat, lng, c.latitude, c.longitude) };
                }
                return c;
              }).filter(c => c.distance !== undefined).sort((a, b) => (a.distance || 0) - (b.distance || 0));
              setNearbyCourts(courtsWithDist);
              const nc = courtsWithDist[0];
              setUserCity(nc?.city || 'Your Location');
              setUserRegion(nc?.region || 'Luzon');
              setIsLoadingLocation(false);
            };

            navigator.geolocation.getCurrentPosition(onSecondSuccess, (secondError) => {
              console.error('Geolocation failed completely:', secondError);
              setGpsEnabled(false);
              setIsLoadingLocation(false);
            }, { enableHighAccuracy: false, timeout: 5000 });
          } else {
            setGpsEnabled(false);
            setIsLoadingLocation(false);
          }
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGpsEnabled(false);
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

  // Recalculate distances when locations or userLocation changes
  useEffect(() => {
    if (userLocation && locations.length > 0) {
      const locationsWithDistance = locations.map(location => {
        if (location.latitude && location.longitude) {
          const distance = calculateDistance(userLocation.lat, userLocation.lng, location.latitude, location.longitude);
          return { ...location, distance };
        }
        return location;
      }).filter(l => l.distance !== undefined)
        .sort((a, b) => (a.distance || 999) - (b.distance || 999));

      setNearbyLocations(locationsWithDistance);
    }
  }, [userLocation, locations]);

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
    } else {
      // If empty search, go to booking page (map view)
      navigate('/booking');
    }
    setShowSuggestions(false);
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

  // Get filtered locations (grouping courts by their location) for search suggestions
  const getFilteredLocations = () => {
    let locationsToFilter = nearbyLocations.length > 0 ? nearbyLocations : locations;

    // Filter by user's region (Luzon, Visayas, Mindanao)
    if (userRegion && !searchQuery.trim()) {
      locationsToFilter = locationsToFilter.filter(loc => loc.region === userRegion);
    }

    // If searching, filter by query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      locationsToFilter = locationsToFilter.filter(loc =>
        loc.name.toLowerCase().includes(query) ||
        loc.city.toLowerCase().includes(query) ||
        loc.address.toLowerCase().includes(query)
      );
    }

    return locationsToFilter;
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
    // Navigate using court ID for unique identification (avoids name collisions between owners)
    if (suggestion.location_id && suggestion.latitude && suggestion.longitude) {
      navigate(`/booking?locationId=${suggestion.location_id}&lat=${suggestion.latitude}&lng=${suggestion.longitude}&zoom=16`);
    } else if (suggestion.id) {
      navigate(`/court/${suggestion.id}`);
    } else {
      navigate(`/booking?q=${encodeURIComponent(suggestion.name)}`);
    }
  };

  const handleLocationClick = (location: LocationWithDistance) => {
    setSearchQuery(location.name);
    setShowSuggestions(false);
    // Navigate to booking page with locationId to show location detail
    if (location.latitude && location.longitude) {
      navigate(`/booking?locationId=${location.id}&lat=${location.latitude}&lng=${location.longitude}&zoom=14&loc=${encodeURIComponent(location.city)}`);
    } else {
      navigate(`/booking?q=${encodeURIComponent(location.name)}`);
    }
  };

  const handlePlaceClick = () => {
    const cityName = userCity?.split(',')[0] || '';
    setSearchQuery(cityName);
    setShowSuggestions(false);
    // Navigate with region coordinates for area zoom
    const regionCenter = REGION_CENTERS[userRegion || 'Luzon'];
    navigate(`/booking?q=${encodeURIComponent(cityName)}&lat=${regionCenter.lat}&lng=${regionCenter.lng}&zoom=${regionCenter.zoom}`);
  };

  const handleSuggestedCityClick = (city: typeof SUGGESTED_CITIES[0]) => {
    setSearchQuery(city.name);
    setShowSuggestions(false);
    setUserRegion(city.region); // Set region for court filtering
    navigate(`/booking?q=${encodeURIComponent(city.name)}&lat=${city.lat}&lng=${city.lng}&zoom=${city.zoom}`);
  };

  // Handle carousel scroll to update active dot
  const handleCarouselScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollLeft = container.scrollLeft;
    const cardWidth = 280 + 16; // card width (280px) + gap (16px)
    const index = Math.round(scrollLeft / cardWidth);
    setActiveCarouselIndex(index);
  };

  // Derive Featured Locations and Title based on GPS status and user location
  const getFeaturedData = () => {
    let title = <span>Featured Courts in the <span className="text-lime-400">Philippines.</span></span>;
    let featuredList = [];

    // Prioritize locations over courts
    if (locations.length > 0) {
      // Only show Active locations in featured section
      const activeLocations = locations.filter(loc =>
        (loc as any).status === 'Active' || (loc as any).is_active === true
      );
      const locationsPool = activeLocations.length > 0 ? activeLocations : locations;
      // All locations sorted by rating (5 to 1) for neutral/fallback use
      const allLocationsSorted = [...locationsPool].sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));

      if (gpsEnabled) {
        if (userCity) {
          const locationParts = userCity.split(",");
          const cityName = locationParts[0].trim();
          // If we have a region but it's not in the city string, we can show "City, Region"
          const displayLocation = (userRegion && !cityName.includes(userRegion) && cityName !== 'Your Location')
            ? `${cityName}, ${userRegion}`
            : (cityName === 'Your Location' && userRegion ? userRegion : cityName);

          title = <span>Featured Courts in <span className="text-lime-400">{displayLocation}.</span></span>;
        } else {
          // GPS enabled but city info still loading or unavailable
          title = <span>Featured Locations <span className="text-lime-400">Near You.</span></span>;
        }

        // Logic for selecting locations based on GPS — show nearby/province-wide
        if (nearbyLocations.length > 0) {
          // Use distance-sorted nearby locations (within ~80km radius for province coverage)
          const MAX_DISTANCE_KM = 80;
          const withinProvince = nearbyLocations.filter(loc => (loc.distance || 999) <= MAX_DISTANCE_KM);
          featuredList = withinProvince.length > 0
            ? [...withinProvince].sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
            : [...nearbyLocations].sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
        } else if (userCity && userCity !== 'Your Location') {
          // Fallback: filter by city/province name match
          const cityName = userCity.split(",")[0].trim().toLowerCase();
          featuredList = locationsPool
            .filter(location => {
              const locCity = location.city.toLowerCase();
              const locRegion = (location.region || '').toLowerCase();
              return locCity.includes(cityName) || cityName.includes(locCity) || locRegion.includes(cityName);
            })
            .sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
        }

        // If still empty after GPS-based filtering, show all sorted by rating
        if (featuredList.length === 0) {
          featuredList = allLocationsSorted;
        }
      } else {
        // Location OFF: Show ALL locations across PH sorted by rating (5 to 1 stars)
        title = <span>Featured Courts in the <span className="text-lime-400">Philippines.</span></span>;
        featuredList = allLocationsSorted;
      }
    } else if (courts.length > 0) {
      // Fallback: group courts by location_id to build location-like entries
      const locationMap = new Map<string, any>();
      courts.forEach((court: any) => {
        const locId = court.location_id || court.id;
        if (!locationMap.has(locId)) {
          // Derive court_type from location-level data
          const rawCt = (court.location_court_type || '').trim().toLowerCase();
          let ctDisplay = 'Indoor';
          if (rawCt.includes('both')) ctDisplay = 'Indoor / Outdoor';
          else if (rawCt.includes('outdoor')) ctDisplay = 'Outdoor';
          else if (rawCt.includes('indoor')) ctDisplay = 'Indoor';

          locationMap.set(locId, {
            id: locId,
            name: court.location_name || court.city || 'Unknown Venue',
            city: court.city || '',
            state: '',
            address: court.location_address || (court.city ? `${court.city}${court.region ? `, ${court.region}` : ''}` : ''),
            latitude: court.latitude,
            longitude: court.longitude,
            region: court.region || getRegion(court.city || ''),
            court_count: 0,
            min_price: Infinity,
            max_price: 0,
            has_free: false,
            avg_rating: 0,
            total_reviews: 0,
            imageUrl: court.location_image || court.imageUrl,
            court_type: ctDisplay,
            amenities: court.location_amenities || [],
            _totalRating: 0,
            _totalReviews: 0
          });
        }
        const loc = locationMap.get(locId);
        loc.court_count += 1;
        const courtPrice = court.base_price || 0;
        if (courtPrice < loc.min_price) loc.min_price = courtPrice;
        if (courtPrice > loc.max_price) loc.max_price = courtPrice;
        if (courtPrice === 0) loc.has_free = true;
        loc._totalRating += (court.rating || 0) * (court.reviewCount || 0);
        loc._totalReviews += (court.reviewCount || 0);
        if (court.imageUrl && !loc.imageUrl) loc.imageUrl = court.imageUrl;
      });
      // Finalize averages
      locationMap.forEach((loc) => {
        if (loc.min_price === Infinity) loc.min_price = 0;
        loc.avg_rating = loc._totalReviews > 0 ? Math.round((loc._totalRating / loc._totalReviews) * 10) / 10 : 0;
        loc.total_reviews = loc._totalReviews;
      });
      const grouped = Array.from(locationMap.values()).sort((a: any, b: any) => (b.avg_rating || 0) - (a.avg_rating || 0));
      title = <span>Featured Courts in the <span className="text-lime-400">Philippines.</span></span>;
      featuredList = grouped;
    }

    return { title, featuredList };
  };

  const { title: featuredSectionTitle, featuredList } = getFeaturedData();

  // Debug logging removed: featured list data

  return (
    <div className="bg-white selection:bg-lime-400 selection:text-black min-h-screen">
      {/* Cinematic Hero */}
      <section className="relative min-h-screen md:min-h-[95vh] flex flex-col items-center justify-center pt-16 md:pt-24 pb-28 md:pb-40 bg-slate-950 z-40">
        {/* Overlapping player faces and user count - Desktop: Corner positioning, Mobile: Hidden (moved below title) */}
        <div className="hidden md:flex absolute left-6 md:left-12 lg:left-24 bottom-8 md:bottom-14 z-40 items-center gap-3 select-none">
          <div className="flex -space-x-4">
            {playerFaces.slice(0, 3).map((face, idx) => (
              <img
                key={idx}
                src={face}
                alt={`Player ${idx + 1}`}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-md object-cover"
                style={{ zIndex: 3 - idx }}
              />
            ))}
          </div>
          <span className="bg-white/95 text-slate-900 font-black text-xs md:text-sm uppercase tracking-wider px-5 py-2.5 rounded-full shadow-lg border border-slate-100 flex items-center gap-2 backdrop-blur-md">
            <span className="w-2 h-2 bg-lime-500 rounded-full animate-pulse" />
            {totalUsers.toLocaleString()}+ Players Active
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

        <div className="relative z-50 w-full max-w-[1800px] mx-auto px-6 md:px-24 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-sm text-lime-400 px-10 md:px-14 py-2 rounded-full font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] mb-4 md:mb-8 animate-fade-in-up opacity-0">
            The National Network for Philippines
          </div>
          <h1 className="font-black text-white leading-[0.9] md:leading-[0.8] tracking-tighter mb-4 md:mb-8 uppercase animate-fade-in-up opacity-0 delay-100">
            <span className="text-5xl sm:text-6xl md:text-7xl lg:text-[10rem]">PICKLEPLAY</span> <br />
            <span className="text-lime-400 text-4xl sm:text-7xl md:text-8xl lg:text-[9rem]">PHILIPPINES</span>
          </h1>

          {/* Mobile-only Player Badge */}
          <div className="flex md:hidden items-center gap-3 mb-6 animate-slide-up">
            <div className="flex -space-x-3">
              {playerFaces.slice(0, 3).map((face, idx) => (
                <img
                  key={idx}
                  src={face}
                  alt={`Player ${idx + 1}`}
                  className="w-8 h-8 rounded-full border border-white shadow-sm object-cover"
                  style={{ zIndex: 3 - idx }}
                />
              ))}
            </div>
            <span className="bg-white/95 text-slate-900 font-black text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full shadow-md border border-slate-100 flex items-center gap-1.5 backdrop-blur-md">
              <span className="w-1 h-1 bg-lime-500 rounded-full animate-pulse" />
              {totalUsers.toLocaleString()}+ Active
            </span>
          </div>
          <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed mb-8 md:mb-12 animate-fade-in-up opacity-0 delay-200">
            The professional digital home for the fastest-growing sport in the Philippines. Join the elite ladder from Manila to Davao.
          </p>
          <div className="flex flex-wrap justify-center gap-6 animate-fade-in-up opacity-0 delay-300 w-full px-4">
            <form onSubmit={handleSearch} className="relative group w-full max-w-4xl">
              <div className="relative flex items-center bg-white border border-slate-200 rounded-full p-1.5 md:p-2.5 h-14 md:h-16 shadow-3xl">
                <Search className="ml-3 md:ml-6 text-slate-400" size={18} />
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
                  className="flex-1 min-w-0 bg-transparent border-none text-slate-900 px-2 md:px-6 text-base md:text-xl font-medium outline-none placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white h-11 md:h-12 px-4 md:px-10 rounded-full font-black flex items-center justify-center transition-all active:scale-95 whitespace-nowrap text-xs md:text-lg flex-shrink-0"
                >
                  LOCATE
                </button>
              </div>

              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-[16px] py-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* Loading State */}
                  {isLoadingLocation && (
                    <div className="px-6 py-4 flex items-center gap-3 text-slate-500">
                      <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-medium">Getting your location...</span>
                    </div>
                  )}

                  {/* GPS Enable Prompt - shown when GPS not yet granted */}
                  {gpsEnabled !== true && !userCity && (
                    <button
                      type="button"
                      onClick={getUserLocation}
                      className="w-full text-left px-6 py-4 flex items-center gap-4 bg-teal-50/60 hover:bg-teal-50 border-b border-teal-100 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                        <Navigation size={16} className="text-teal-600" fill="currentColor" />
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-teal-700">
                          {gpsEnabled === false ? 'Location Blocked — Tap to Retry' : 'Enable Location'}
                        </p>
                        <p className="text-[13px] text-slate-400">
                          {gpsEnabled === false ? 'Check browser settings if it keeps failing' : 'Allow GPS to find courts near you'}
                        </p>
                      </div>
                    </button>
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
                          <div className="w-10 h-10 rounded-full flex items-center justify-center">
                            <img src="/images/PinMarker.png" alt="Pin" className="w-8 h-8 object-contain" />
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
                          <div className="w-10 h-10 rounded-full flex items-center justify-center">
                            <img src="/images/PinMarker.png" alt="Pin" className="w-8 h-8 object-contain" />
                          </div>
                          <span className="text-slate-800 font-medium text-[15px]">{city.name}</span>
                        </button>
                      ))}
                    </>
                  )}

                  {/* COURTS Section - Now showing Locations */}
                  {getFilteredLocations().length > 0 && (
                    <>
                      <p className="px-6 py-2 text-xs font-bold text-teal-500 uppercase tracking-wider mt-1">Courts</p>
                      <div className="max-h-[350px] overflow-y-auto no-scrollbar">
                        {getFilteredLocations().slice(0, 10).map((location, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleLocationClick(location)}
                            className="w-full text-left px-6 py-3 hover:bg-slate-50 flex items-center gap-4 group transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full flex items-center justify-center">
                              <img src="/images/PinMarker.png" alt="Pin" className="w-8 h-8 object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-800 font-semibold text-[15px] truncate">{location.name}</p>
                              <p className="text-[13px] text-slate-400 truncate">
                                {location.court_count || 0} {(location.court_count || 0) === 1 ? 'court' : 'courts'}
                                {location.distance !== undefined && (
                                  <span> · {location.distance.toFixed(1)} miles away</span>
                                )}
                                {location.city && (
                                  <span> · {location.city}</span>
                                )}
                                {location.address && (
                                  <span> · {location.address}</span>
                                )}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* No locations in region message */}
                  {!isLoadingLocation && userCity && getFilteredLocations().length === 0 && (
                    <div className="px-6 py-6 text-center">
                      <p className="text-sm text-slate-500">No court locations found in {userRegion || 'your area'}</p>
                    </div>
                  )}

                  {/* No location message */}
                  {!isLoadingLocation && !userCity && getFilteredLocations().length === 0 && (
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

      {/* Featured Courts Near You Section */}
      <section className="py-16 md:py-24 bg-slate-50 px-6 md:px-24 lg:px-32 relative overflow-hidden animate-fade-in opacity-0">
        <div className="max-w-[1800px] mx-auto">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6 animate-fade-in-up opacity-0">
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-4">DISCOVER / NEARBY</p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-950 tracking-tighter uppercase">
                {featuredSectionTitle}
              </h2>
            </div>
            <Link
              to={userLocation
                ? `/booking?lat=${userLocation.lat}&lng=${userLocation.lng}&zoom=12${userCity ? `&loc=${encodeURIComponent(userCity)}` : ''}`
                : "/booking"}
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
          ) : featuredList.length > 0 ? (
            <div className="relative">
              {/* Left Scroll Button */}
              <button
                onClick={() => {
                  const container = document.getElementById('courts-carousel');
                  if (container) container.scrollBy({ left: -320, behavior: 'smooth' });
                }}
                className="absolute -left-16 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white shadow-xl rounded-full flex items-center justify-center hover:bg-slate-50 transition-all border border-slate-200 hidden md:flex"
              >
                <ChevronLeft size={24} className="text-slate-700" />
              </button>

              {/* Right Scroll Button */}
              <button
                onClick={() => {
                  const container = document.getElementById('courts-carousel');
                  if (container) container.scrollBy({ left: 320, behavior: 'smooth' });
                }}
                className="absolute -right-16 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white shadow-xl rounded-full flex items-center justify-center hover:bg-slate-50 transition-all border border-slate-200 hidden md:flex"
              >
                <ChevronRight size={24} className="text-slate-700" />
              </button>


              {/* Scrollable Container */}
              <div
                id="courts-carousel"
                className="flex gap-4 overflow-x-auto pb-4 px-2 scrollbar-hide snap-x snap-mandatory scroll-smooth"
                onScroll={handleCarouselScroll}
              >
                {featuredList.map((item, idx) => {
                  return (
                    <div
                      key={idx}
                      className={`group relative flex-shrink-0 w-[280px] md:w-[320px] bg-white border border-slate-200/60 rounded-2xl shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 snap-start overflow-hidden animate-fade-in-up opacity-0`}
                      style={{ animationDelay: `${Math.min((idx + 1) * 150, 1500)}ms` }}
                    >
                      {/* Location Card Template */}
                      <>
                        <Link to={`/booking?locationId=${item.id}&lat=${item.latitude}&lng=${item.longitude}&zoom=14&loc=${encodeURIComponent(item.city)}`} className="relative block overflow-hidden">
                          <img
                            src={item.imageUrl || COURT_IMAGES[idx % COURT_IMAGES.length]}
                            alt={item.name}
                            className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {/* Price Badge on Image */}
                          <div className="absolute top-3 right-3 flex items-center gap-1.5">
                            {(item.max_price || 0) > 0 ? (
                              <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
                                <span className="text-lg font-black text-slate-900">₱{(item.min_price || 0) > 0 ? item.min_price : item.max_price}{(item.min_price || 0) > 0 && item.min_price !== item.max_price ? `-${item.max_price}` : ''}</span>
                                <span className="text-xs font-semibold text-slate-500">/hr</span>
                              </div>
                            ) : (
                              <div className="bg-[#a3e635] backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
                                <span className="text-lg font-black text-slate-900">FREE</span>
                              </div>
                            )}
                          </div>
                        </Link>

                        <div className="p-4 flex flex-col flex-1">
                          {/* Rating */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={`w-3 h-3 ${star <= Math.round(item.avg_rating || 0) ? 'text-lime-400' : 'text-slate-200'}`}
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M13.849 4.22c-.684-1.626-3.014-1.626-3.698 0L8.397 8.387l-4.552.361c-1.775.14-2.495 2.331-1.142 3.477l3.468 2.937-1.06 4.392c-.413 1.713 1.472 3.067 2.992 2.149L12 19.35l3.897 2.354c1.52.918 3.405-.436 2.992-2.15l-1.06-4.39 3.468-2.938c1.353-1.146.633-3.336-1.142-3.477l-4.552-.36-1.754-4.17Z" fill="currentColor" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-xs font-bold text-slate-500">
                              {item.avg_rating && item.avg_rating > 0 ? `${item.avg_rating}` : 'New'}
                              {item.total_reviews && item.total_reviews > 0 ? ` (${item.total_reviews})` : ''}
                            </span>
                          </div>

                          {/* Location/Venue Name */}
                          <Link to={`/booking?locationId=${item.id}&lat=${item.latitude}&lng=${item.longitude}&zoom=14&loc=${encodeURIComponent(item.city)}`}>
                            <h5 className="text-lg font-black text-slate-900 tracking-tight leading-snug hover:text-blue-600 transition-colors mb-1 line-clamp-1">
                              {item.name}
                            </h5>
                          </Link>

                          {/* Address */}
                          <div className="flex items-center gap-1.5 mb-3">
                            <MapPin size={12} className="text-slate-300 shrink-0" />
                            <p className="text-xs text-slate-400 truncate">
                              {item.address || `${item.city}${item.state ? `, ${item.state}` : ''}`}
                            </p>
                          </div>

                          {/* 2x2 Details Grid */}
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            {/* Court Count */}
                            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-2">
                              <img src="/images/Ball.png" alt="" className="w-4 h-4 object-contain" />
                              <span className="text-[11px] font-bold text-slate-600">{item.court_count || 0} {(item.court_count || 0) === 1 ? 'Court' : 'Courts'}</span>
                            </div>
                            {/* Players */}
                            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-2">
                              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                              <span className="text-[11px] font-bold text-slate-600">{(item.court_count || 1) * 4} Players</span>
                            </div>
                            {/* Court Type — court/net icon */}
                            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-2">
                              <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="6" width="20" height="12" rx="1" />
                                <line x1="12" y1="6" x2="12" y2="18" />
                                <line x1="2" y1="12" x2="22" y2="12" />
                              </svg>
                              <span className="text-[11px] font-bold text-slate-600 truncate">{item.court_type || 'Indoor'}</span>
                            </div>
                            {/* Amenities — checklist/sparkle icon */}
                            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-2">
                              <svg className="w-4 h-4 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 11l3 3L22 4" />
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                              </svg>
                              <span className="text-[11px] font-bold text-slate-600 truncate">
                                {Array.isArray(item.amenities) && item.amenities.length > 0
                                  ? item.amenities.join(', ')
                                  : 'No Amenities'
                                }
                              </span>
                            </div>
                          </div>

                          {/* Book Button */}
                          <Link
                            to={`/booking?locationId=${item.id}&lat=${item.latitude}&lng=${item.longitude}&zoom=14&loc=${encodeURIComponent(item.city)}`}
                            className="flex items-center justify-center w-full text-white bg-blue-600 hover:bg-blue-700 font-bold rounded-xl text-sm px-4 py-2.5 transition-all active:scale-95 mt-auto"
                          >
                            Book Now
                          </Link>
                        </div>
                      </>
                    </div>
                  );
                })}
              </div>

              {/* Scroll Indicator Dots */}
              <div className="flex justify-center gap-2 mt-4 md:hidden">
                {featuredList.slice(0, Math.min(15, featuredList.length)).map((_, idx) => (
                  idx === activeCarouselIndex ? (
                    <img
                      key={idx}
                      src="/images/Ball.png"
                      alt="Active"
                      className="w-3 h-3 object-contain"
                    />
                  ) : (
                    <div key={idx} className="w-2 h-2 rounded-full bg-slate-300"></div>
                  )
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin size={32} className="text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">No Featured Locations Found</h3>
              <p className="text-slate-500 font-medium mb-8 max-w-md mx-auto">
                We couldn't find any locations matching the criteria in your area yet.
              </p>
              <button
                onClick={getUserLocation}
                className="px-8 py-4 bg-lime-400 hover:bg-lime-500 text-slate-900 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 shadow-xl shadow-lime-100"
              >
                <Navigation size={18} className="inline mr-2" />
                Try Refreshing Location
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Beginner Welcome Section - Interactive Guide */}
      <section className="py-12 md:py-24 bg-slate-950 px-4 md:px-24 lg:px-32 relative overflow-hidden animate-fade-in opacity-0 delay-200">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-lime-500/5 rounded-full blur-[150px] -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] translate-y-1/2"></div>

        <div className="max-w-[1800px] mx-auto relative">
          {/* Section Header */}
          <div className="mb-8 md:mb-16 animate-fade-in-up opacity-0">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="text-lime-400" size={24} />
              <span className="text-lime-400 font-black text-sm uppercase tracking-widest">Learning Hub</span>
            </div>
            <h2 className="text-2xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              Learn to play pickleball with our{' '}
              <Link to="/guides" className="text-lime-500 underline decoration-lime-400 decoration-2 md:decoration-4 underline-offset-4 md:underline-offset-8 hover:text-lime-400 transition-colors">
                how to play guides →
              </Link>
            </h2>
            <p className="text-white/60 mt-4 max-w-2xl text-lg">
              New to pickleball? No problem! Our beginner-friendly guides will have you playing like a pro in no time.
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
            {/* Left Column - Guide Cards */}
            <div className="space-y-4 md:space-y-6">
              {/* Guide Card 1 - Rules */}
              <Link to="/guides/rules" className="group flex gap-3 md:gap-8 items-start hover:bg-white/5 p-3 md:p-6 rounded-2xl md:rounded-3xl transition-all border border-transparent hover:border-white/10 animate-fade-in-up opacity-0 delay-100">
                <div className="w-24 h-20 md:w-64 md:h-44 rounded-xl md:rounded-2xl overflow-hidden flex-shrink-0 shadow-lg relative">
                  <img
                    src="/images/home-images/pb13.jpg"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt="Players on court"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-bold">
                    <Clock size={12} />
                    <span>10 min</span>
                  </div>
                </div>
                <div className="flex-1 pt-1 md:pt-2">
                  <div className="flex items-center gap-2 mb-2 md:mb-4">
                    <span className="inline-block bg-blue-600 text-white px-2.5 md:px-4 py-1 md:py-1.5 rounded-full text-[9px] md:text-xs font-black uppercase tracking-wider">
                      📖 Guide
                    </span>
                    <span className="inline-block bg-green-500/20 text-green-400 px-2.5 md:px-4 py-1 md:py-1.5 rounded-full text-[9px] md:text-xs font-black uppercase tracking-wider">
                      Beginner
                    </span>
                  </div>
                  <h3 className="text-sm md:text-2xl font-black text-white leading-tight group-hover:text-lime-400 transition-colors">
                    How to play pickleball - 9 simple rules for beginners
                  </h3>
                  <p className="text-white/50 text-xs md:text-sm mt-2 hidden md:block">
                    Learn the essential rules of pickleball in under 10 minutes. Perfect for first-time players!
                  </p>
                </div>
                <ArrowRight className="text-white/30 group-hover:text-lime-400 group-hover:translate-x-1 transition-all hidden md:block" size={24} />
              </Link>

              {/* Guide Card 2 - Quiz */}
              <Link to="/guides/skill-rating" className="group flex gap-3 md:gap-8 items-start hover:bg-white/5 p-3 md:p-6 rounded-2xl md:rounded-3xl transition-all border border-transparent hover:border-white/10 animate-fade-in-up opacity-0 delay-200">
                <div className="w-24 h-20 md:w-64 md:h-44 rounded-xl md:rounded-2xl overflow-hidden flex-shrink-0 shadow-lg relative">
                  <img
                    src="/images/home-images/pb14.jpg"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt="Player serving"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-bold">
                    <Trophy size={12} />
                    <span>Quiz</span>
                  </div>
                </div>
                <div className="flex-1 pt-1 md:pt-2">
                  <div className="flex items-center gap-2 mb-2 md:mb-4">
                    <span className="inline-block bg-blue-600 text-white px-2.5 md:px-4 py-1 md:py-1.5 rounded-full text-[9px] md:text-xs font-black uppercase tracking-wider">
                      🏆 Quiz
                    </span>
                    <span className="inline-block bg-purple-500/20 text-purple-400 px-2.5 md:px-4 py-1 md:py-1.5 rounded-full text-[9px] md:text-xs font-black uppercase tracking-wider">
                      5 min
                    </span>
                  </div>
                  <h3 className="text-sm md:text-2xl font-black text-white leading-tight group-hover:text-lime-400 transition-colors">
                    What is my pickleball skill rating? Take this quiz to get rated
                  </h3>
                  <p className="text-white/50 text-xs md:text-sm mt-2 hidden md:block">
                    Answer 10 quick questions to discover your DUPR-equivalent skill level!
                  </p>
                </div>
                <ArrowRight className="text-white/30 group-hover:text-lime-400 group-hover:translate-x-1 transition-all hidden md:block" size={24} />
              </Link>

              {/* Guide Card 3 - Equipment */}
              <Link to="/guides/equipment" className="group flex gap-3 md:gap-8 items-start hover:bg-white/5 p-3 md:p-6 rounded-2xl md:rounded-3xl transition-all border border-transparent hover:border-white/10 animate-fade-in-up opacity-0 delay-300">
                <div className="w-24 h-20 md:w-64 md:h-44 rounded-xl md:rounded-2xl overflow-hidden flex-shrink-0 shadow-lg relative">
                  <img
                    src="/images/home-images/pb16.jpg"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt="Pickleball equipment"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-bold">
                    <ShoppingBag size={12} />
                    <span>8 min</span>
                  </div>
                </div>
                <div className="flex-1 pt-1 md:pt-2">
                  <div className="flex items-center gap-2 mb-2 md:mb-4">
                    <span className="inline-block bg-blue-600 text-white px-2.5 md:px-4 py-1 md:py-1.5 rounded-full text-[9px] md:text-xs font-black uppercase tracking-wider">
                      🛒 Guide
                    </span>
                    <span className="inline-block bg-green-500/20 text-green-400 px-2.5 md:px-4 py-1 md:py-1.5 rounded-full text-[9px] md:text-xs font-black uppercase tracking-wider">
                      Beginner
                    </span>
                  </div>
                  <h3 className="text-sm md:text-2xl font-black text-white leading-tight group-hover:text-lime-400 transition-colors">
                    Essential gear guide - What you need to start playing
                  </h3>
                  <p className="text-white/50 text-xs md:text-sm mt-2 hidden md:block">
                    Everything about paddles, balls, shoes, and accessories without overspending!
                  </p>
                </div>
                <ArrowRight className="text-white/30 group-hover:text-lime-400 group-hover:translate-x-1 transition-all hidden md:block" size={24} />
              </Link>
            </div>

            {/* Right Column - Video Player / Feature Card */}
            <div className="relative animate-fade-in-up opacity-0 delay-400">
              <Link to="/guides/rules" className="block aspect-[4/3] rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl relative group cursor-pointer">
                <img
                  src="/images/home-images/pb18.jpg"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  alt="Players on court"
                />
                {/* Video Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent"></div>

                {/* Play Button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 md:w-28 md:h-28 bg-lime-500 rounded-full flex items-center justify-center shadow-2xl shadow-lime-500/30 group-hover:scale-110 group-hover:bg-lime-400 transition-all duration-300">
                    <Play className="text-white fill-white" size={32} />
                  </div>
                </div>

                {/* Free Badge */}
                <div className="absolute top-4 right-4 bg-lime-500 text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide flex items-center gap-1">
                  <Star size={14} />
                  Free Preview
                </div>
              </Link>

              {/* Video Description */}
              <div className="mt-4 md:mt-8 space-y-3 md:space-y-6">
                {/* Tags */}
                <div className="flex gap-2 md:gap-3">
                  <span className="bg-blue-100 text-blue-700 px-3 md:px-5 py-1.5 md:py-2.5 rounded-full text-xs md:text-sm font-black uppercase tracking-wide">
                    Guides
                  </span>
                  <span className="bg-lime-100 text-lime-700 px-3 md:px-5 py-1.5 md:py-2.5 rounded-full text-xs md:text-sm font-black uppercase tracking-wide">
                    Free
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl md:text-4xl lg:text-5xl font-black text-white leading-tight">
                  Start Your Pickleball Journey Today!
                </h3>

                <p className="text-white/60 text-sm md:text-base">
                  Our guides are designed for absolute beginners. Read the first few sections free, then sign up to unlock everything and track your progress!
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                  <Link
                    to="/guides/rules"
                    className="bg-lime-500 hover:bg-lime-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-black text-sm md:text-base transition-all shadow-lg shadow-lime-500/30 hover:shadow-xl hover:shadow-lime-500/40 active:scale-95 flex items-center gap-2"
                  >
                    Start Learning
                    <ArrowRight size={18} />
                  </Link>
                  <Link to="/guides/skill-rating" className="flex items-center gap-2 text-white font-black text-sm md:text-base hover:text-lime-400 transition-colors group">
                    Or take the skill quiz
                    <Trophy size={18} className="text-blue-400" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section >

      {/* Tournaments Section - Real data from Supabase */}
      <section className="py-12 md:py-32 bg-slate-50 relative overflow-hidden animate-fade-in opacity-0 delay-300">
        {/* Abstract Background Accents */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[150px] -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-lime-400/5 blur-[150px] -z-10"></div>

        <div className="max-w-[1800px] mx-auto px-4 md:px-24 lg:px-32">
          <div className="mb-8 md:mb-16 animate-fade-in-up opacity-0">
            <div className="max-w-2xl">
              <p className="text-[9px] md:text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] md:tracking-[0.4em] mb-2 md:mb-4">COMPETITIVE CIRCUIT / 2026</p>
              <h2 className="text-3xl md:text-6xl lg:text-7xl font-black text-slate-950 tracking-tighter leading-[0.9] uppercase">
                Elite PH <br />
                <span className="text-lime-500 italic">Tournaments.</span>
              </h2>
            </div>
          </div>

          {/* Mobile: Horizontal Scroll Carousel */}
          <div className="md:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-4 pb-4">
              {isTournamentsLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[280px] aspect-[4/5] rounded-3xl bg-white/5 animate-pulse border border-white/10"></div>
                ))
              ) : tournaments.length > 0 ? (
                tournaments.map((tournament) => (
                  <button
                    key={tournament.id}
                    onClick={() => navigate(`/tournaments/${tournament.id}`)}
                    className="group relative flex-shrink-0 w-[280px] aspect-[4/5] rounded-3xl overflow-hidden border border-slate-200 bg-white transition-all hover:scale-[1.02] shadow-xl text-left"
                  >
                    <img
                      src={tournament.image || "/images/home-images/pb20.jpg"}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                      alt={tournament.name}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent"></div>

                    {/* Lime Gradient Accent at bottom */}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-lime-500/30 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>

                    {/* Status Badge */}
                    <div className="absolute top-4 left-4">
                      <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">
                        {tournament.status}
                      </span>
                    </div>

                    <div className="absolute bottom-6 left-6 right-6">
                      <div className="flex items-center gap-2 text-lime-400 text-[10px] font-black uppercase tracking-widest mb-3">
                        <Trophy size={14} />
                        {tournament.prizePool ? `₱${tournament.prizePool}` : "Ranked Event"}
                      </div>
                      <h3 className="text-xl font-black text-white tracking-tight leading-tight uppercase mb-4 group-hover:text-lime-400 transition-colors line-clamp-2">
                        {tournament.name}
                      </h3>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-slate-200">
                          <Calendar size={16} className="text-white" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">
                            {new Date(tournament.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-200">
                          <MapPin size={16} className="text-white flex-shrink-0" />
                          <span className="text-[10px] font-bold uppercase tracking-widest truncate">{tournament.location}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="w-full py-16 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <Trophy className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Coming Soon</p>
                </div>
              )}
            </div>
          </div>

          {/* Desktop: Grid Layout */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {isTournamentsLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="aspect-[4/5] rounded-3xl md:rounded-[40px] bg-white/5 animate-pulse border border-white/10"></div>
              ))
            ) : tournaments.length > 0 ? (
              tournaments.map((tournament, idx) => (
                <button
                  key={tournament.id}
                  onClick={() => navigate(`/tournaments/${tournament.id}`)}
                  className="group relative aspect-[4/5] rounded-3xl md:rounded-[40px] overflow-hidden border border-slate-200 bg-white transition-all hover:scale-[1.02] shadow-xl text-left w-full"
                >
                  <img
                    src={tournament.image || "/images/home-images/pb20.jpg"}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    alt={tournament.name}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent"></div>

                  {/* Lime Gradient Accent at bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-24 md:h-32 bg-gradient-to-t from-lime-500/30 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>

                  {/* Status Badge */}
                  <div className="absolute top-4 md:top-8 left-4 md:left-8">
                    <span className="bg-blue-600 text-white px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-lg">
                      {tournament.status}
                    </span>
                  </div>

                  <div className="absolute bottom-6 md:bottom-10 left-6 md:left-10 right-6 md:right-10">
                    <div className="flex items-center gap-2 md:gap-3 text-lime-400 text-[10px] md:text-xs font-black uppercase tracking-widest mb-3 md:mb-4">
                      <Trophy size={14} className="md:w-[18px] md:h-[18px]" />
                      {tournament.prizePool ? `₱${tournament.prizePool}` : "Ranked Event"}
                    </div>
                    <h3 className="text-xl md:text-4xl font-black text-white tracking-tight leading-tight uppercase mb-4 md:mb-8 group-hover:text-lime-400 transition-colors line-clamp-2">
                      {tournament.name}
                    </h3>

                    <div className="space-y-3 md:space-y-6">
                      <div className="flex items-center gap-2 md:gap-4 text-slate-200">
                        <Calendar size={16} className="text-white md:w-5 md:h-5" />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">
                          {new Date(tournament.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 md:gap-4 text-slate-200">
                        <MapPin size={16} className="text-white md:w-5 md:h-5 flex-shrink-0" />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest truncate">{tournament.location}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-full py-16 md:py-20 text-center bg-white/5 rounded-3xl md:rounded-[40px] border border-dashed border-white/10">
                <Trophy className="w-10 h-10 md:w-12 md:h-12 text-slate-700 mx-auto mb-3 md:mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs md:text-sm">Coming Soon</p>
              </div>
            )}
          </div>
        </div>
      </section >

      {/* Final CTA / Download Section */}
      <section className="py-20 md:py-32 relative overflow-hidden animate-fade-in opacity-0 delay-500" style={{ backgroundColor: '#03091F', boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25), 0px 4px 4px rgba(0, 0, 0, 0.25), 0px 4px 4px rgba(0, 0, 0, 0.25)' }}>
        {/* Lime green gradient – full section, behind image */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background: 'linear-gradient(359.7deg, #93DC25 -266.77%, rgba(124, 207, 0, 0) 99.75%)',
          }}
        />
        {/* Desktop-only: Phone mockup image on the right – flush to bottom, in front of gradient */}
        <img
          src="/images/DOWNLOAD APP.png"
          alt="PicklePlay App Preview"
          className="hidden lg:block absolute z-[2] pointer-events-none object-contain object-bottom"
          style={{
            width: '44%',
            height: '100%',
            right: '2%',
            bottom: '0',
          }}
        />
        <div className="max-w-[1800px] mx-auto px-6 md:px-24 lg:px-32 text-center lg:text-left relative z-10">
          <div className="relative z-10 space-y-6 md:space-y-8 animate-fade-in-up opacity-0 lg:max-w-[50%]">
            <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter leading-none uppercase">READY TO <br /><span className="text-lime-400 italic">DOMINATE PH?</span></h2>
            <div className="flex flex-col items-center lg:items-start gap-6 md:gap-8">
              <button className="bg-lime-400 hover:bg-lime-300 text-slate-950 h-14 md:h-20 px-8 md:px-14 rounded-2xl md:rounded-[28px] font-black text-base md:text-lg uppercase tracking-widest transition-all active:scale-95 shadow-2xl shadow-lime-400/20 group flex items-center gap-4">
                JOIN PH NETWORK
                <ArrowRight className="group-hover:translate-x-2 transition-transform" />
              </button>

              <div className="space-y-5">
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 text-white/50 px-8 py-5 rounded-[24px] opacity-60 cursor-not-allowed text-left relative">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Available Soon</span>
                      <span className="text-lg font-black tracking-tight -mt-0.5">App Store</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 text-white/50 px-8 py-5 rounded-[24px] opacity-60 cursor-not-allowed text-left relative">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z" />
                    </svg>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Available Soon</span>
                      <span className="text-lg font-black tracking-tight -mt-0.5">Google Play</span>
                    </div>
                  </div>
                </div>
                <div className="pt-5 border-t border-white/5">
                  <p className="text-white text-sm font-black uppercase tracking-[0.2em]">Join {totalUsers.toLocaleString()}+ PH Players</p>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Early access registration open</p>
                  <p className="text-slate-400 text-xs font-medium mt-3 max-w-md mx-auto md:mx-0 leading-relaxed">Our mobile app is currently in development. In the meantime, enjoy the full PicklePlay experience right here on our website!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section >

      {/* FAQ Section */}
      <section id="faq" className="bg-[#F8FAFC] relative overflow-hidden animate-fade-in opacity-0 delay-400">
        {/* ── MOBILE / TABLET LAYOUT ── */}
        <div className="lg:hidden py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 animate-fade-in-up opacity-0">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-3">
                Frequently Asked Questions
              </h2>
              <p className="text-slate-600 text-sm font-medium max-w-2xl mx-auto leading-relaxed">
                Pickleplay makes it easy to play more pickleball, whether you're finding your first game or running your own events. Here are answers to the questions we hear most from players and organizers.
              </p>
            </div>
            <div className="space-y-3">
              {FAQ_ITEMS.map((item, idx) => (
                <div key={idx} className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
                  <button
                    onClick={() => setActiveFaqIndex(activeFaqIndex === idx ? null : idx)}
                    className="w-full text-left px-4 py-4 flex items-center justify-between gap-3 group"
                  >
                    <span className="text-base font-black text-slate-900 tracking-tight transition-colors group-hover:text-blue-600">
                      {item.question}
                    </span>
                    <div className={`w-8 h-8 flex-shrink-0 rounded-full border-2 border-slate-100 flex items-center justify-center transition-all duration-300 ${activeFaqIndex === idx ? 'bg-blue-600 border-blue-600 text-white rotate-45' : 'bg-white text-blue-500 group-hover:border-blue-200'}`}>
                      <Plus size={activeFaqIndex === idx ? 18 : 14} className="transition-transform" />
                    </div>
                  </button>
                  <div className={`transition-all duration-500 ease-in-out border-t border-slate-50 ${activeFaqIndex === idx ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                    <div className="px-4 py-4 text-slate-500 text-sm font-medium leading-relaxed bg-slate-50/50">
                      {item.answer}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── DESKTOP LAYOUT – exact Figma positioning ── */}
        <div className="hidden lg:block relative max-w-[1920px] mx-auto" style={{ height: '1163px' }}>
          {/* Left: Image group — absolutely positioned, never moves */}
          <div
            className="absolute z-10 pointer-events-none"
            style={{
              left: '0',
              top: '0',
              width: '59.3%',   /* 1139/1920 */
              height: '100%',
            }}
          >
            {/* Lime green rectangle – top card */}
            <div
              className="absolute"
              style={{
                left: '23.56%',   /* 268.32/1139 */
                top: '11.95%',    /* (4765-4626)/1163 ≈ 139/1163 but relative to group: 139/1139 */
                width: '50.97%',  /* 580.51/1139 */
                height: '43.71%', /* 497.89/1139 */
                background: 'rgba(199, 255, 20, 0.5)',
                borderRadius: '25px 25px 0px 0px',
              }}
            />
            {/* Blue rectangle – bottom card */}
            <div
              className="absolute"
              style={{
                left: '23.56%',
                top: '55.92%',    /* 636.89/1139 */
                width: '50.97%',
                height: '41.39%', /* 471.4/1139 */
                background: 'rgba(0, 79, 255, 0.63)',
                boxShadow: 'inset 0px 4px 4px rgba(0, 0, 0, 0.25)',
                borderRadius: '25px',
              }}
            />
            {/* FAQ Image – fills the entire 1139×1139 group */}
            <img
              src="/images/FAQ.png"
              alt="Pickleball Players"
              className="absolute inset-0 w-full h-full"
              style={{
                objectFit: 'contain',
                objectPosition: 'bottom center',
                filter: 'drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25))',
              }}
            />
          </div>

          {/* Right: Title + Description + Accordion — positioned per Figma coords */}
          <div
            className="absolute"
            style={{
              left: '49.2%',    /* 945/1920 */
              right: '3%',
              top: '0',
              height: '100%',
            }}
          >
            {/* FREQUENTLY — top: (4834-4665)/1163 ≈ 14.5% */}
            <h2
              className="absolute font-black uppercase tracking-tighter text-center w-full"
              style={{ top: '14.5%', left: '0', right: '0' }}
            >
              <span className="block text-[#9AE600]" style={{ fontSize: 'clamp(60px, 6.67vw, 128px)', lineHeight: '1.2' }}>
                FREQUENTLY
              </span>
            </h2>

            {/* ASKED QUESTIONS — top: (4958-4665)/1163 ≈ 25.2% */}
            <h2
              className="absolute font-black uppercase tracking-tighter text-center w-full"
              style={{ top: '25.2%', left: '0', right: '0' }}
            >
              <span className="block text-[#0A57A7]" style={{ fontSize: 'clamp(40px, 4.17vw, 80px)', lineHeight: '1.2' }}>
                ASKED QUESTIONS
              </span>
            </h2>

            {/* Description — top: (5072-4665)/1163 ≈ 35% */}
            <p
              className="absolute text-[#0A57A7] font-bold text-center"
              style={{
                top: '35%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '90%',
                maxWidth: '693px',
                fontSize: 'clamp(14px, 1.04vw, 20px)',
                lineHeight: '1.2',
              }}
            >
              Pickleplay makes it easy to play more pickleball, whether you're finding your first game or running your own events. Here are answers to the questions we hear most from players and organizers.
            </p>

            {/* Accordion — starts at top: (5219-4665)/1163 ≈ 47.6% */}
            <div
              className="absolute"
              style={{
                top: '47.6%',
                left: '0',
                right: '0',
                maxWidth: '760px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              <div className="space-y-[22px]">
                {FAQ_ITEMS.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-[20px] overflow-hidden"
                    style={{ background: '#D9D9D9', backdropFilter: 'blur(2px)' }}
                  >
                    <button
                      onClick={() => setActiveFaqIndex(activeFaqIndex === idx ? null : idx)}
                      className="w-full text-left px-6 flex items-center justify-between gap-4 group"
                      style={{ height: '70px' }}
                    >
                      <span className="text-base lg:text-lg font-black text-slate-900 tracking-tight transition-colors group-hover:text-[#155DFC]">
                        {item.question}
                      </span>
                      <div className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ${activeFaqIndex === idx ? 'bg-[#155DFC] text-white rotate-45' : 'bg-white/60 text-[#155DFC] group-hover:bg-white'}`}>
                        <Plus size={18} className="transition-transform" />
                      </div>
                    </button>
                    <div className={`transition-all duration-500 ease-in-out overflow-hidden ${activeFaqIndex === idx ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="px-6 pb-4 pt-1 text-slate-700 text-sm lg:text-base font-medium leading-relaxed">
                        {item.answer}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 md:py-14 px-6 md:px-24 lg:px-32 border-t border-blue-800 animate-fade-in opacity-0 delay-700" style={{ backgroundColor: '#0A57A7' }}>
        <div className="max-w-[1800px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-8 md:mb-12 animate-fade-in-up opacity-0">
            {/* Brand Section */}
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center gap-2 md:gap-3 text-white font-black text-xl md:text-2xl tracking-tighter uppercase">
                <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="w-10 h-10 md:w-14 md:h-14 object-contain rounded-xl shadow-lg shadow-white/20 ring-2 ring-white/30" />
                <div className="flex flex-col leading-none">
                  <span className="text-xl md:text-2xl text-white">PICKLEPLAY</span>
                  <span className="text-xs md:text-sm tracking-wider text-lime-400 font-black">PHILIPPINES</span>
                </div>
              </div>
              <p className="text-blue-100/70 text-xs md:text-sm leading-relaxed max-w-xs font-medium">
                The premier destination for the Philippine pickleball community. Join the movement, find your squad, and dominate the court.
              </p>
              <div className="flex gap-3 md:gap-4 pt-1 md:pt-2">
                <a href="https://www.facebook.com/pickleplayofficial" target="_blank" rel="noopener noreferrer" className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white/10 flex items-center justify-center text-white/70 hover:bg-white hover:text-[#0A57A7] transition-all">
                  <Facebook size={16} className="md:w-[18px] md:h-[18px]" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-[10px] md:text-[11px] font-black text-white uppercase tracking-widest mb-4 md:mb-6">Platform</h4>
              <ul className="space-y-2 md:space-y-3">
                <li><Link to="/booking" className="text-xs md:text-sm font-bold text-blue-100/70 hover:text-lime-400 transition-colors">Booking System</Link></li>
                <li><Link to="/community" className="text-xs md:text-sm font-bold text-blue-100/70 hover:text-lime-400 transition-colors">Community Hub</Link></li>
                <li><Link to="/shop" className="text-xs md:text-sm font-bold text-blue-100/70 hover:text-lime-400 transition-colors">Pro Shop</Link></li>
              </ul>
            </div>

            {/* Legal Section */}
            <div>
              <h4 className="text-[10px] md:text-[11px] font-black text-white uppercase tracking-widest mb-4 md:mb-6">Legal & Policy</h4>
              <ul className="space-y-2 md:space-y-3">
                <li><a href="/policy" className="text-xs md:text-sm font-bold text-blue-100/70 hover:text-lime-400 transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="text-xs md:text-sm font-bold text-blue-100/70 hover:text-lime-400 transition-colors">Terms of Service</a></li>
              </ul>
            </div>

            {/* Contact Section */}
            <div>
              <h4 className="text-[10px] md:text-[11px] font-black text-white uppercase tracking-widest mb-4 md:mb-6">Contact Us</h4>
              <ul className="space-y-2 md:space-y-3">
                <li className="flex items-start gap-2 md:gap-3">
                  <MapPin size={14} className="md:w-[18px] md:h-[18px] text-lime-400 shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm font-bold text-blue-100/70">Cebu City, Philippines</span>
                </li>
                <li className="flex items-center gap-2 md:gap-3">
                  <Mail size={14} className="md:w-[18px] md:h-[18px] text-lime-400 shrink-0" />
                  <span className="text-xs md:text-sm font-bold text-blue-100/70">phpickleplay@gmail.com</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-4 md:pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4">
            <p className="text-[9px] md:text-[10px] text-blue-200/50 font-black uppercase tracking-[0.2em] md:tracking-[0.3em]">
              © 2026 PICKLEBALL PHILIPPINES LTD. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </footer>

      {/* Tournament Details Modal */}
      {selectedTournament && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-300 flex items-center justify-center p-4"
          onClick={() => setSelectedTournament(null)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-2xl md:rounded-3xl shadow-2xl relative animate-in slide-in-from-bottom-4 duration-500 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedTournament(null)}
              className="absolute top-4 right-4 md:top-6 md:right-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 hover:text-slate-900 transition-all z-10"
            >
              <X size={20} className="md:w-6 md:h-6" />
            </button>

            {/* Tournament Image */}
            <div className="aspect-[16/9] md:aspect-[21/9] w-full rounded-t-2xl md:rounded-t-3xl overflow-hidden relative">
              <img
                src={selectedTournament.image || "/images/home-images/pb20.jpg"}
                alt={selectedTournament.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent"></div>

              {/* Status Badge on Image */}
              <div className="absolute top-4 left-4 md:top-6 md:left-6">
                <span className="bg-blue-600 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest shadow-lg">
                  {selectedTournament.status}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 md:p-10 space-y-6 md:space-y-8">
              {/* Title and Prize */}
              <div>
                <div className="flex items-center gap-2 md:gap-3 text-lime-500 text-xs md:text-sm font-black uppercase tracking-widest mb-3 md:mb-4">
                  <Trophy size={16} className="md:w-5 md:h-5" />
                  {selectedTournament.prizePool ? `₱${selectedTournament.prizePool.toLocaleString()} Prize Pool` : "Ranked Event"}
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-950 tracking-tighter leading-tight mb-4 md:mb-6">
                  {selectedTournament.name}
                </h2>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Date */}
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Calendar size={20} className="text-blue-600 md:w-6 md:h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                    <p className="text-sm md:text-lg font-bold text-slate-900 break-words">
                      {new Date(selectedTournament.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-lime-50 flex items-center justify-center flex-shrink-0">
                    <MapPin size={20} className="text-lime-600 md:w-6 md:h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
                    <p className="text-sm md:text-lg font-bold text-slate-900 break-words">{selectedTournament.location}</p>
                  </div>
                </div>

                {/* Skill Level */}
                {selectedTournament.skillLevel && (
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Star size={20} className="text-blue-600 md:w-6 md:h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Skill Level</p>
                      <p className="text-sm md:text-lg font-bold text-slate-900">{selectedTournament.skillLevel}</p>
                    </div>
                  </div>
                )}

                {/* Players */}
                {selectedTournament.maxPlayers && (
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <Activity size={20} className="text-purple-600 md:w-6 md:h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Players</p>
                      <p className="text-sm md:text-lg font-bold text-slate-900">
                        {selectedTournament.registeredCount || 0} / {selectedTournament.maxPlayers}
                      </p>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 md:h-2 mt-2">
                        <div
                          className="bg-purple-600 h-1.5 md:h-2 rounded-full transition-all"
                          style={{ width: `${((selectedTournament.registeredCount || 0) / selectedTournament.maxPlayers) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-2 md:pt-4">
                <Link
                  to="/tournaments"
                  className="flex-1 px-6 md:px-8 py-3 md:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl md:rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-200 hover:shadow-xl flex items-center justify-center gap-2"
                  onClick={() => setSelectedTournament(null)}
                >
                  <Trophy size={16} className="md:w-[18px] md:h-[18px]" />
                  Register Now
                </Link>
                <button
                  onClick={() => setSelectedTournament(null)}
                  className="px-6 md:px-8 py-3 md:py-4 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl md:rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
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
