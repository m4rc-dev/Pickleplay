import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Colors from '../constants/Colors';
import { getCourts } from '../services/courtService';
import { GOOGLE_MAPS_API_KEY } from '../constants/Config';

// Conditionally import WebView only on supported platforms
let WebView;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

// Default image for courts without images
const DEFAULT_COURT_IMAGE = 'https://picsum.photos/seed/court1/300/300';

const MapScreen = ({ navigation, route, onBackNavigation }) => {
  const insets = useSafeAreaInsets();
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [directionsMode, setDirectionsMode] = useState(false);
  const [destinationCourt, setDestinationCourt] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const webViewRef = useRef(null);

  // Check if we're in directions mode from route params
  useEffect(() => {
    if (route?.params?.showDirections && route?.params?.court) {
      setDirectionsMode(true);
      setDestinationCourt(route.params.court);
      setUserLocation(null); // Reset user location
      setLocationError(null);
      getUserLocation();
    }
  }, [route?.params]);

  // Get user's current location
  const getUserLocation = async () => {
    try {
      setLocationLoading(true);
      setLocationError(null);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Please enable location access.');
        setLocationLoading(false);
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setUserLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      setLocationLoading(false);
    } catch (err) {
      console.error('Error getting location:', err);
      setLocationError('Could not get your location. Please try again.');
      setLocationLoading(false);
    }
  };

  // Fetch courts from Supabase
  const fetchCourts = async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await getCourts();
      
      if (fetchError) {
        console.error('Error fetching courts:', fetchError);
        setError('Failed to load courts. Please try again.');
        return;
      }
      
      // Transform the data for map display - only courts with coordinates
      const transformedCourts = (data || [])
        .filter(court => court.latitude && court.longitude)
        .map(court => ({
          id: court.id,
          name: court.name,
          location: court.city || court.address || '',
          description: court.description || `${court.type || ''} ${court.surface || ''} court`.trim(),
          latitude: parseFloat(court.latitude),
          longitude: parseFloat(court.longitude),
          image: court.cover_image || (court.images && court.images[0]) || DEFAULT_COURT_IMAGE,
          rating: court.rating || 0,
          type: court.type,
          surface: court.surface,
          numberOfCourts: court.number_of_courts,
          amenities: court.amenities,
          hoursOfOperation: court.hours_of_operation,
          isFree: court.is_free,
          pricePerHour: court.price_per_hour,
          phoneNumber: court.phone_number,
          email: court.email,
          website: court.website,
          requiresBooking: court.requires_booking,
          address: court.address,
          city: court.city,
          country: court.country,
        }));
      
      setCourts(transformedCourts);
    } catch (err) {
      console.error('Error fetching courts:', err);
      setError('Failed to load courts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCourts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setMapLoaded(false);
    fetchCourts();
  };

  // Calculate map center based on courts or default to Cebu City
  const getMapCenter = () => {
    // If in directions mode with user location, center between user and destination
    if (directionsMode && userLocation && destinationCourt) {
      return {
        lat: (userLocation.lat + destinationCourt.latitude) / 2,
        lng: (userLocation.lng + destinationCourt.longitude) / 2,
      };
    }
    if (courts.length === 0) {
      return { lat: 10.3173, lng: 123.8854 }; // Default to Cebu City
    }
    const avgLat = courts.reduce((sum, c) => sum + c.latitude, 0) / courts.length;
    const avgLng = courts.reduce((sum, c) => sum + c.longitude, 0) / courts.length;
    return { lat: avgLat, lng: avgLng };
  };

  // Generate HTML for Google Maps with Directions support
  const generateMapHTML = () => {
    const center = getMapCenter();
    
    console.log('Generating map HTML with API key:', GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing');
    console.log('Number of courts:', courts.length);
    console.log('Directions mode:', directionsMode);
    console.log('Map center:', center);
    
    const markersJS = courts.length > 0 ? courts
      .map(
        (court, index) => {
          // Ensure coordinates are valid
          if (!court.latitude || !court.longitude) {
            console.log('Skipping court without coordinates:', court.name);
            return '';
          }
          
          // Use index for valid JS variable names (UUIDs have hyphens which are invalid)
          const varName = `court${index}`;
          
          return `
      const marker_${varName} = new google.maps.Marker({
        position: { lat: ${court.latitude}, lng: ${court.longitude} },
        map: map,
        title: "${(court.name || '').replace(/"/g, '\\"')}",
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new google.maps.Size(40, 40)
        }
      });
      
      const infoWindow_${varName} = new google.maps.InfoWindow({
        content: '<div style="font-family: Arial; text-align: center; padding: 8px;"><strong style="color: #0A56A7;">${(court.name || '').replace(/'/g, "\\'")}</strong><br/><span style="color: #666;">${(court.location || '').replace(/'/g, "\\'")}</span><br/>⭐ ${court.rating?.toFixed(1) || '0.0'}</div>'
      });
      
      marker_${varName}.addListener('click', function() {
        infoWindow_${varName}.open(map, marker_${varName});
      });
    `;
        }
      )
      .filter(Boolean)
      .join('\n') : '';
    
    console.log('Generated markers code length:', markersJS.length);
    if (markersJS) {
      console.log('Markers code preview:', markersJS.substring(0, 200));
    }

    // Directions code if in directions mode - Uses OSRM (free routing service)
    const directionsCode = (directionsMode && userLocation && destinationCourt) ? `
      // Add user location marker (green - starting point)
      const userMarker = new google.maps.Marker({
        position: { lat: ${userLocation.lat}, lng: ${userLocation.lng} },
        map: map,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#4CAF50',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3
        },
        zIndex: 1000
      });
      
      // Add a pulsing effect circle around user location
      const userCircle = new google.maps.Circle({
        center: { lat: ${userLocation.lat}, lng: ${userLocation.lng} },
        radius: 50,
        fillColor: '#4CAF50',
        fillOpacity: 0.2,
        strokeColor: '#4CAF50',
        strokeOpacity: 0.5,
        strokeWeight: 1,
        map: map
      });
      
      // Add destination marker (red - end point)
      const destMarker = new google.maps.Marker({
        position: { lat: ${destinationCourt.latitude}, lng: ${destinationCourt.longitude} },
        map: map,
        title: '${destinationCourt.name?.replace(/'/g, "\\'") || 'Destination'}',
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new google.maps.Size(50, 50)
        },
        zIndex: 1001
      });
      
      // Add info window for destination
      const destInfoWindow = new google.maps.InfoWindow({
        content: '<div style="font-family: Arial, sans-serif; padding: 8px; text-align: center;"><strong style="color: #0A56A7; font-size: 14px;">${destinationCourt.name?.replace(/'/g, "\\'") || 'Destination'}</strong></div>'
      });
      destMarker.addListener('click', () => {
        destInfoWindow.open(map, destMarker);
      });
      
      // Function to show route info panel
      function showRouteInfo(distanceText, timeText, isApproximate) {
        const existingInfo = document.getElementById('route-info');
        if (existingInfo) existingInfo.remove();
        
        const infoDiv = document.createElement('div');
        infoDiv.id = 'route-info';
        infoDiv.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, white 80%, rgba(255,255,255,0.95)); padding: 20px; padding-bottom: 30px; box-shadow: 0 -4px 20px rgba(0,0,0,0.15); z-index: 1000;';
        infoDiv.innerHTML = \`
          <div style="font-family: Arial, sans-serif;">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
              <div style="width: 12px; height: 12px; background: #4CAF50; border-radius: 50%; margin-right: 8px;"></div>
              <span style="font-size: 13px; color: #666;">Your Location</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
              <div style="width: 12px; height: 12px; background: #f44336; border-radius: 50%; margin-right: 8px;"></div>
              <span style="font-size: 14px; color: #333; font-weight: 500;">${destinationCourt.name?.replace(/'/g, "\\'") || 'Destination'}</span>
            </div>
            <div style="display: flex; justify-content: space-around; background: #f5f5f5; padding: 15px; border-radius: 10px;">
              <div style="text-align: center;">
                <div style="font-size: 22px; font-weight: bold; color: #0A56A7;">\${distanceText}</div>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">Distance</div>
              </div>
              <div style="width: 1px; background: #ddd;"></div>
              <div style="text-align: center;">
                <div style="font-size: 22px; font-weight: bold; color: #0A56A7;">\${timeText}</div>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">Est. Time</div>
              </div>
            </div>
            \${isApproximate ? '<div style="text-align: center; margin-top: 10px; font-size: 11px; color: #999;">Showing approximate route</div>' : ''}
          </div>
        \`;
        document.body.appendChild(infoDiv);
      }
      
      // Function to draw straight line fallback
      function drawStraightLine() {
        const routeLine = new google.maps.Polyline({
          path: [
            { lat: ${userLocation.lat}, lng: ${userLocation.lng} },
            { lat: ${destinationCourt.latitude}, lng: ${destinationCourt.longitude} }
          ],
          geodesic: true,
          strokeColor: '#0A56A7',
          strokeOpacity: 0.8,
          strokeWeight: 5,
          map: map
        });
        
        // Calculate straight-line distance using Haversine formula
        const R = 6371;
        const dLat = (${destinationCourt.latitude} - ${userLocation.lat}) * Math.PI / 180;
        const dLon = (${destinationCourt.longitude} - ${userLocation.lng}) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(${userLocation.lat} * Math.PI / 180) * Math.cos(${destinationCourt.latitude} * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        const distanceText = distance < 1 ? (distance * 1000).toFixed(0) + ' m' : distance.toFixed(1) + ' km';
        const estTime = Math.ceil(distance / 30 * 60);
        const timeText = estTime < 60 ? estTime + ' min' : Math.floor(estTime/60) + ' hr ' + (estTime%60) + ' min';
        
        showRouteInfo(distanceText, timeText, true);
      }
      
      // Fit bounds to show both points
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: ${userLocation.lat}, lng: ${userLocation.lng} });
      bounds.extend({ lat: ${destinationCourt.latitude}, lng: ${destinationCourt.longitude} });
      map.fitBounds(bounds, { top: 50, bottom: 150, left: 30, right: 30 });
      
      // Use OSRM (Open Source Routing Machine) - Free routing service
      const osrmUrl = 'https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${destinationCourt.longitude},${destinationCourt.latitude}?overview=full&geometries=geojson';
      
      fetch(osrmUrl)
        .then(response => response.json())
        .then(data => {
          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const coordinates = route.geometry.coordinates.map(coord => ({
              lat: coord[1],
              lng: coord[0]
            }));
            
            // Draw the route polyline
            const routePath = new google.maps.Polyline({
              path: coordinates,
              geodesic: true,
              strokeColor: '#0A56A7',
              strokeOpacity: 0.9,
              strokeWeight: 6,
              map: map
            });
            
            // Calculate distance and duration
            const distanceKm = route.distance / 1000;
            const distanceText = distanceKm < 1 ? (route.distance).toFixed(0) + ' m' : distanceKm.toFixed(1) + ' km';
            const durationMin = Math.ceil(route.duration / 60);
            const timeText = durationMin < 60 ? durationMin + ' min' : Math.floor(durationMin/60) + ' hr ' + (durationMin%60) + ' min';
            
            showRouteInfo(distanceText, timeText, false);
          } else {
            console.error('OSRM routing failed, using straight line');
            drawStraightLine();
          }
        })
        .catch(error => {
          console.error('Error fetching route:', error);
          drawStraightLine();
        });
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="initial-scale=1.0, user-scalable=no">
        <style>
          html, body, #map {
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          #error {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            font-family: Arial, sans-serif;
            color: #666;
            display: none;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div id="error">
          <p>Map failed to load</p>
          <p id="error-msg"></p>
        </div>
        <script>
          window.onerror = function(msg, url, line) {
            document.getElementById('error').style.display = 'block';
            document.getElementById('error-msg').innerText = msg;
            return true;
          };
          
          function initMap() {
            try {
              const map = new google.maps.Map(document.getElementById('map'), {
                center: { lat: ${center.lat}, lng: ${center.lng} },
                zoom: ${directionsMode ? 12 : 13},
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                zoomControl: true
              });
              
              ${directionsMode ? directionsCode : markersJS || ''}
              
              window.map = map;
            } catch(e) {
              document.getElementById('error').style.display = 'block';
              document.getElementById('error-msg').innerText = e.message;
            }
          }
          
          function gm_authFailure() {
            document.getElementById('error').style.display = 'block';
            document.getElementById('error-msg').innerText = 'Google Maps API authentication failed. Check API key restrictions.';
          }
          
          function panToLocation(lat, lng) {
            if (window.map) {
              window.map.panTo({ lat: parseFloat(lat), lng: parseFloat(lng) });
              window.map.setZoom(15);
            }
          }
        </script>
        <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap" async defer onerror="document.getElementById('error').style.display='block';document.getElementById('error-msg').innerText='Failed to load Google Maps script';"></script>
      </body>
      </html>
    `;
  };

  // Clear directions mode
  const clearDirections = () => {
    setDirectionsMode(false);
    setDestinationCourt(null);
    navigation.setParams({ showDirections: false, court: null });
  };

  const handleCardPress = (court) => {
    setSelectedMarker(court.id);
    // Zoom map to selected location without navigating away
    setTimeout(() => {
      if (webViewRef.current && mapLoaded) {
        const jsCode = `
          panToLocation(${court.latitude}, ${court.longitude});
          true;
        `;
        webViewRef.current.injectJavaScript(jsCode);
      }
    }, 100);
  };

  // Navigate to court detail - separate function for explicit navigation
  const handleViewDetails = (court) => {
    navigation.navigate('CourtDetail', {
      court: {
        id: court.id,
        name: court.name,
        location: court.location,
        description: court.description,
        imageUrl: court.image,
        rating: court.rating,
        type: court.type,
        surface: court.surface,
        numberOfCourts: court.numberOfCourts,
        amenities: court.amenities,
        hoursOfOperation: court.hoursOfOperation,
        isFree: court.isFree,
        pricePerHour: court.pricePerHour,
        phoneNumber: court.phoneNumber,
        email: court.email,
        website: court.website,
        requiresBooking: court.requiresBooking,
        address: court.address,
        city: court.city,
        country: court.country,
        latitude: court.latitude,
        longitude: court.longitude,
      }
    });
  };

  // Handle back from directions mode
  const handleBackFromDirections = () => {
    clearDirections();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, directionsMode && { paddingTop: 0 }]}>
      <StatusBar barStyle="light-content" backgroundColor={thematicBlue} />

      {/* Directions Mode Header */}
      {directionsMode && (
        <View style={[styles.directionsHeader, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backFromDirectionsButton} onPress={handleBackFromDirections}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.directionsHeaderText}>
            <Text style={styles.directionsTitle}>Directions</Text>
            <Text style={styles.directionsSubtitle} numberOfLines={1}>
              To: {destinationCourt?.name || 'Court'}
            </Text>
          </View>
          <TouchableOpacity style={styles.clearDirectionsButton} onPress={clearDirections}>
            <MaterialIcons name="close" size={20} color={thematicBlue} />
          </TouchableOpacity>
        </View>
      )}

      {/* Interactive Map - Full screen in directions mode */}
      <View style={[styles.mapWrapper, directionsMode && styles.mapWrapperFullScreen]}>
        {/* Loading state for initial court fetch only */}
        {loading && courts.length === 0 ? (
          <View style={styles.mapLoadingContainer}>
            <ActivityIndicator size="large" color={thematicBlue} />
            <Text style={styles.mapLoadingText}>Loading courts...</Text>
          </View>
        ) : directionsMode && locationLoading ? (
          <View style={styles.mapLoadingContainer}>
            <ActivityIndicator size="large" color={thematicBlue} />
            <Text style={styles.mapLoadingText}>Getting your location...</Text>
            <Text style={styles.mapLoadingSubtext}>
              Please make sure location services are enabled
            </Text>
          </View>
        ) : directionsMode && locationError ? (
          /* Location error state */
          <View style={styles.mapLoadingContainer}>
            <MaterialIcons name="location-off" size={48} color={thematicBlue} />
            <Text style={styles.locationErrorText}>{locationError}</Text>
            <TouchableOpacity style={styles.retryLocationButton} onPress={getUserLocation}>
              <MaterialIcons name="refresh" size={18} color="#fff" />
              <Text style={styles.retryLocationButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : directionsMode && !userLocation ? (
          /* Waiting for location */
          <View style={styles.mapLoadingContainer}>
            <ActivityIndicator size="large" color={thematicBlue} />
            <Text style={styles.mapLoadingText}>Waiting for location...</Text>
          </View>
        ) : Platform.OS === 'web' ? (
          /* Web platform fallback */
          <View style={styles.webMapFallback}>
            <MaterialIcons name="map" size={64} color={thematicBlue} />
            <Text style={styles.webMapText}>Interactive map is available on mobile</Text>
            <Text style={styles.webMapSubtext}>
              {directionsMode && destinationCourt 
                ? `Getting directions to ${destinationCourt.name}`
                : 'View court locations below'}
            </Text>
            {directionsMode && destinationCourt && (
              <TouchableOpacity 
                style={styles.openInGoogleMapsButton}
                onPress={() => {
                  const url = userLocation 
                    ? `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${destinationCourt.latitude},${destinationCourt.longitude}`
                    : `https://www.google.com/maps/search/?api=1&query=${destinationCourt.latitude},${destinationCourt.longitude}`;
                  Linking.openURL(url);
                }}>
                <MaterialIcons name="open-in-new" size={18} color="#fff" />
                <Text style={styles.openInGoogleMapsText}>Open in Google Maps</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : WebView ? (
          <WebView
            ref={webViewRef}
            source={{ html: generateMapHTML() }}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scalesPageToFit={true}
            originWhitelist={['*']}
            mixedContentMode="always"
            allowsInlineMediaPlayback={true}
            geolocationEnabled={true}
            cacheEnabled={true}
            cacheMode="LOAD_DEFAULT"
            onLoadStart={() => {
              console.log('Map WebView started loading');
            }}
            onLoadEnd={() => {
              console.log('Map WebView loaded successfully');
              setMapLoaded(true);
            }}
            onError={(error) => {
              console.error('WebView error:', error.nativeEvent);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView HTTP error:', nativeEvent.statusCode, nativeEvent.description);
            }}
            onMessage={(event) => {
              console.log('WebView message:', event.nativeEvent.data);
            }}
          />
        ) : (
          /* Fallback if WebView is not available */
          <View style={styles.webMapFallback}>
            <MaterialIcons name="error-outline" size={64} color={thematicBlue} />
            <Text style={styles.webMapText}>Map not available</Text>
            <Text style={styles.webMapSubtext}>Please use the mobile app to view the interactive map</Text>
          </View>
        )}
      </View>

      {/* Courts List Section - Hidden in directions mode */}
      {!directionsMode && (
        <ScrollView 
          style={styles.listSection} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[thematicBlue]}
              tintColor={thematicBlue}
            />
          }
        >
          <Text style={styles.sectionTitle}>Nearby Courts</Text>
          
          {/* Error State */}
          {error && !loading && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={32} color={thematicBlue} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchCourts}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Empty State */}
          {!loading && !error && courts.length === 0 && (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="location-off" size={32} color={thematicBlue} />
              <Text style={styles.emptyText}>No courts with locations found</Text>
              <Text style={styles.emptySubtext}>Pull down to refresh</Text>
            </View>
          )}
          
          {/* Courts List */}
          {!loading && !error && courts.map((court) => (
            <View
              key={court.id}
              style={[
              styles.courtCard,
              selectedMarker === court.id && styles.courtCardSelected,
            ]}>
            <TouchableOpacity 
              style={styles.courtCardMain}
              onPress={() => handleCardPress(court)}>
              <Image source={{ uri: court.image }} style={styles.courtImage} />
              <View style={styles.cardContent}>
                <Text style={styles.courtName}>{court.name}</Text>
                <Text style={styles.courtLocation}>{court.location}</Text>
                <Text style={styles.courtDescription} numberOfLines={1}>{court.description}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.cardActions}>
              <View style={styles.ratingBadge}>
                <MaterialIcons name="star" size={12} color={thematicBlue} />
                <Text style={styles.ratingText}>{court.rating?.toFixed(1) || '0.0'}</Text>
              </View>
              <TouchableOpacity 
                style={styles.viewDetailsButton}
                onPress={() => handleViewDetails(court)}>
                <MaterialIcons name="info-outline" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Map Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Map Features</Text>
          <View style={styles.featureCard}>
            <MaterialIcons name="touch-app" size={24} color={thematicBlue} />
            <Text style={styles.featureText}>Tap a court card to locate it on the map</Text>
          </View>
          <View style={styles.featureCard}>
            <MaterialIcons name="info-outline" size={24} color={thematicBlue} />
            <Text style={styles.featureText}>Tap the info button to view court details</Text>
          </View>
          <View style={styles.featureCard}>
            <MaterialIcons name="location-on" size={24} color={thematicBlue} />
            <Text style={styles.featureText}>Click map markers for quick info</Text>
          </View>
        </View>
      </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  directionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: thematicBlue,
    paddingBottom: 12,
    paddingHorizontal: 15,
  },
  backFromDirectionsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionsHeaderText: {
    flex: 1,
    marginLeft: 10,
  },
  directionsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  directionsSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    marginTop: 2,
  },
  clearDirectionsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapWrapperFullScreen: {
    flex: 1,
    height: 'auto',
  },
  mapLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  mapLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: thematicBlue,
  },
  mapLoadingSubtext: {
    marginTop: 5,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  locationErrorText: {
    marginTop: 15,
    fontSize: 14,
    color: thematicBlue,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  retryLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: thematicBlue,
    borderRadius: 20,
    gap: 6,
  },
  retryLocationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: thematicBlue,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: thematicBlue,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: thematicBlue,
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 12,
    color: thematicBlue,
    opacity: 0.7,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: thematicBlue,
    marginLeft: 2,
  },
  listSection: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  
  mapWrapper: {
    height: 300,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
    borderRadius: 10,
    margin: 15,
    marginBottom: 0,
  },
  webView: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: thematicBlue,
    marginBottom: 15,
  },
  courtCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 12,
    marginBottom: 10,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  courtCardMain: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  courtCardSelected: {
    backgroundColor: 'rgba(163, 255, 1, 0.1)',
    borderWidth: 2,
    borderColor: activeColor,
  },
  courtImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: Colors.surfaceAlt,
  },
  cardContent: {
    flex: 1,
  },
  cardActions: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewDetailsButton: {
    backgroundColor: thematicBlue,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courtName: {
    fontSize: 16,
    fontWeight: '600',
    color: thematicBlue,
    marginBottom: 3,
  },
  courtLocation: {
    fontSize: 13,
    color: thematicBlue,
    marginBottom: 2,
  },
  courtDescription: {
    fontSize: 11,
    color: thematicBlue,
    opacity: 0.7,
  },
  distance: {
    fontSize: 14,
    fontWeight: '600',
    color: thematicBlue,
    marginLeft: 10,
  },
  featuresSection: {
    margin: 15,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  featureText: {
    fontSize: 14,
    color: thematicBlue,
    marginLeft: 15,
    flex: 1,
  },
  webMapFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 30,
  },
  webMapText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
    color: thematicBlue,
    textAlign: 'center',
  },
  webMapSubtext: {
    marginTop: 8,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  openInGoogleMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: thematicBlue,
    borderRadius: 25,
    gap: 8,
  },
  openInGoogleMapsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  mapInitializing: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 8,
    borderRadius: 20,
    gap: 6,
  },
  mapInitializingText: {
    fontSize: 12,
    color: thematicBlue,
    fontWeight: '500',
  },
});

export default MapScreen;
