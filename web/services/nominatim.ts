/**
 * OpenStreetMap/Nominatim Geocoding Service
 * Free JSON API for location search and reverse geocoding
 */

export interface GeocodedLocation {
  name: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  displayName: string;
}

// Major Philippine cities with coordinates (pre-cached)
export const PHILIPPINES_CITIES = [
  { name: 'Manila', latitude: 14.5995, longitude: 120.9842, city: 'Manila' },
  { name: 'Quezon City', latitude: 14.6349, longitude: 121.0388, city: 'Quezon City' },
  { name: 'Makati', latitude: 14.5546, longitude: 121.0175, city: 'Makati' },
  { name: 'BGC (Bonifacio Global City)', latitude: 14.5592, longitude: 121.0451, city: 'Taguig' },
  { name: 'Cebu City', latitude: 10.3157, longitude: 123.8854, city: 'Cebu' },
  { name: 'Davao City', latitude: 7.0731, longitude: 125.6121, city: 'Davao' },
  { name: 'Laguna', latitude: 14.3776, longitude: 121.2969, city: 'Laguna' },
  { name: 'Cavite', latitude: 14.4744, longitude: 120.8863, city: 'Cavite' },
  { name: 'Batangas', latitude: 13.7604, longitude: 121.0433, city: 'Batangas' },
  { name: 'Iloilo City', latitude: 10.6936, longitude: 122.5609, city: 'Iloilo' },
  { name: 'Cagayan de Oro', latitude: 8.4866, longitude: 124.6648, city: 'Cagayan de Oro' },
  { name: 'Antipolo', latitude: 14.5794, longitude: 121.1789, city: 'Antipolo' },
  { name: 'San Juan', latitude: 14.5581, longitude: 121.0238, city: 'San Juan' },
  { name: 'Pasig', latitude: 14.5773, longitude: 121.0889, city: 'Pasig' },
  { name: 'Mandaluyong', latitude: 14.5768, longitude: 121.0147, city: 'Mandaluyong' },
  { name: 'Paranaque', latitude: 14.3505, longitude: 121.0104, city: 'Paranaque' },
  { name: 'Las Piñas', latitude: 14.3533, longitude: 121.0133, city: 'Las Piñas' },
  { name: 'Caloocan', latitude: 14.6431, longitude: 120.9597, city: 'Caloocan' },
  { name: 'Valenzuela', latitude: 14.7086, longitude: 120.9847, city: 'Valenzuela' },
  { name: 'Marikina', latitude: 14.6406, longitude: 121.1034, city: 'Marikina' },
];

/**
 * Search for locations using Nominatim
 * Free API - no authentication required
 * Rate limit: 1 request per second max
 */
export async function searchLocation(query: string): Promise<GeocodedLocation[]> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&country=ph&format=json&limit=5`,
      {
        headers: {
          'User-Agent': 'PicklePlay-App' // Required by Nominatim
        }
      }
    );

    if (!response.ok) throw new Error('Geocoding failed');

    const data: any[] = await response.json();
    return data.map(item => ({
      name: item.address?.city || item.address?.town || item.name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      city: item.address?.city || item.address?.town || 'Unknown',
      country: item.address?.country || 'Philippines',
      displayName: item.display_name
    }));
  } catch (err) {
    console.error('Nominatim search error:', err);
    return [];
  }
}

/**
 * Reverse geocode: get location name from coordinates
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeocodedLocation | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      {
        headers: {
          'User-Agent': 'PicklePlay-App'
        }
      }
    );

    if (!response.ok) return null;

    const data: any = await response.json();
    return {
      name: data.address?.city || data.address?.town || 'Unknown',
      latitude,
      longitude,
      city: data.address?.city || data.address?.town || 'Unknown',
      country: data.address?.country || 'Philippines',
      displayName: data.display_name
    };
  } catch (err) {
    console.error('Reverse geocoding error:', err);
    return null;
  }
}

/**
 * Get closest predefined city to coordinates
 */
export function getClosestCity(latitude: number, longitude: number): typeof PHILIPPINES_CITIES[0] | null {
  let closest = null;
  let minDistance = Infinity;

  PHILIPPINES_CITIES.forEach(city => {
    const distance = Math.sqrt(
      Math.pow(city.latitude - latitude, 2) + Math.pow(city.longitude - longitude, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closest = city;
    }
  });

  return closest;
}
