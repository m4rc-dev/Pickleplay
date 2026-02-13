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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import Colors from '../constants/Colors';
import { getCourts } from '../services/courtService';
import { GOOGLE_MAPS_API_KEY } from '../constants/Config';

let WebView;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

const DEFAULT_COURT_IMAGE = 'https://picsum.photos/seed/court1/300/300';

const MapScreen = ({ navigation, route, onBackNavigation }) => {
  const insets = useSafeAreaInsets();
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [selectedCourt, setSelectedCourt] = useState(null);
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
  const [showCourtsPanel, setShowCourtsPanel] = useState(true);
  const webViewRef = useRef(null);

  useEffect(() => {
    if (route?.params?.showDirections && route?.params?.court) {
      setDirectionsMode(true);
      setDestinationCourt(route.params.court);
      setUserLocation(null);
      setLocationError(null);
      getUserLocation();
    }
  }, [route?.params]);

  const getUserLocation = async () => {
    try {
      setLocationLoading(true);
      setLocationError(null);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
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
      setLocationError('Could not get your location');
      setLocationLoading(false);
    }
  };

  const fetchCourts = async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await getCourts();
      
      if (fetchError) {
        console.error('Error fetching courts:', fetchError);
        setError('Failed to load courts');
        return;
      }
      
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
      setError('Failed to load courts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCourts();
  }, []);

  // Re-inject markers when map loads or data changes
  useEffect(() => {
    if (mapLoaded && webViewRef.current && (courts.length > 0 || directionsMode)) {
      setTimeout(() => {
        const markersJS = courts.length > 0 ? courts
          .map(
            (court, index) => {
              if (!court.latitude || !court.longitude) {
                return '';
              }
              
              const varName = `court${index}`;
              
              return `
          const marker_${varName} = new google.maps.Marker({
            position: { lat: ${court.latitude}, lng: ${court.longitude} },
            map: map,
            title: "${(court.name || '').replace(/"/g, '\\"')}",
            icon: {
              url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
              scaledSize: new google.maps.Size(40, 40)
            }
          });
          
          marker_${varName}.addListener('click', function() {
            try {
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'courtMarkerClick',
                  court: {
                    id: "${court.id}",
                    name: "${(court.name || '').replace(/"/g, '\\"')}",
                    location: "${(court.location || '').replace(/"/g, '\\"')}",
                    rating: ${court.rating || 0},
                    image: "${(court.image || '').replace(/"/g, '\\"')}",
                    latitude: ${court.latitude},
                    longitude: ${court.longitude},
                    phoneNumber: "${(court.phoneNumber || '').replace(/"/g, '\\"')}"
                  }
                }));
              }
            } catch (e) {
              console.error('Error sending court data:', e);
            }
          });
        `;
            }
          )
          .filter(Boolean)
          .join('\n') : '';
        
        if (markersJS) {
          webViewRef.current.injectJavaScript(markersJS + '; true;');
        }
      }, 100);
    }
  }, [mapLoaded, courts, directionsMode]);

  const onRefresh = () => {
    setRefreshing(true);
    setMapLoaded(false);
    fetchCourts();
  };

  const getMapCenter = () => {
    if (directionsMode && userLocation && destinationCourt) {
      return {
        lat: (userLocation.lat + destinationCourt.latitude) / 2,
        lng: (userLocation.lng + destinationCourt.longitude) / 2,
      };
    }
    if (courts.length === 0) {
      return { lat: 10.3173, lng: 123.8854 };
    }
    const avgLat = courts.reduce((sum, c) => sum + c.latitude, 0) / courts.length;
    const avgLng = courts.reduce((sum, c) => sum + c.longitude, 0) / courts.length;
    return { lat: avgLat, lng: avgLng };
  };

  const generateMapHTML = () => {
    const center = getMapCenter();
    
    const markersJS = courts.length > 0 ? courts
      .map(
        (court, index) => {
          if (!court.latitude || !court.longitude) {
            return '';
          }
          
          const varName = `court${index}`;
          
          return `
      const marker_${varName} = new google.maps.Marker({
        position: { lat: ${court.latitude}, lng: ${court.longitude} },
        map: map,
        title: "${(court.name || '').replace(/"/g, '\\"')}",
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
          scaledSize: new google.maps.Size(40, 40)
        }
      });
      
      marker_${varName}.addListener('click', function() {
        try {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'courtMarkerClick',
              court: {
                id: "${court.id}",
                name: "${(court.name || '').replace(/"/g, '\\"')}",
                location: "${(court.location || '').replace(/"/g, '\\"')}",
                rating: ${court.rating || 0},
                image: "${(court.image || '').replace(/"/g, '\\"')}",
                latitude: ${court.latitude},
                longitude: ${court.longitude},
                phoneNumber: "${(court.phoneNumber || '').replace(/"/g, '\\"')}"
              }
            }));
          }
        } catch (e) {
          console.error('Error sending court data:', e);
        }
      });
    `;
        }
      )
      .filter(Boolean)
      .join('\n') : '';

    const directionsCode = (directionsMode && userLocation && destinationCourt) ? `
      const userMarker = new google.maps.Marker({
        position: { lat: ${userLocation.lat}, lng: ${userLocation.lng} },
        map: map,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#a3e635',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3
        },
        zIndex: 1000
      });
      
      const userCircle = new google.maps.Circle({
        center: { lat: ${userLocation.lat}, lng: ${userLocation.lng} },
        radius: 50,
        fillColor: '#a3e635',
        fillOpacity: 0.2,
        strokeColor: '#a3e635',
        strokeOpacity: 0.5,
        strokeWeight: 1,
        map: map
      });
      
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
      
      const destInfoWindow = new google.maps.InfoWindow({
        content: '<div style="font-family: Arial, sans-serif; padding: 8px; text-align: center;"><strong style="color: #a3e635; font-size: 14px;">${destinationCourt.name?.replace(/'/g, "\\'") || 'Destination'}</strong></div>'
      });
      destMarker.addListener('click', () => {
        destInfoWindow.open(map, destMarker);
      });
      
      function showRouteInfo(distanceText, timeText, isApproximate) {
        const existingInfo = document.getElementById('route-info');
        if (existingInfo) existingInfo.remove();
        
        const infoDiv = document.createElement('div');
        infoDiv.id = 'route-info';
        infoDiv.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, white 80%, rgba(255,255,255,0.95)); padding: 20px; padding-bottom: 30px; box-shadow: 0 -4px 20px rgba(0,0,0,0.15); z-index: 1000;';
        infoDiv.innerHTML = \`
          <div style="font-family: Arial, sans-serif;">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
              <div style="width: 12px; height: 12px; background: #a3e635; border-radius: 50%; margin-right: 8px;"></div>
              <span style="font-size: 13px; color: #666;">Your Location</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
              <div style="width: 12px; height: 12px; background: #f44336; border-radius: 50%; margin-right: 8px;"></div>
              <span style="font-size: 14px; color: #333; font-weight: 500;">${destinationCourt.name?.replace(/'/g, "\\'") || 'Destination'}</span>
            </div>
            <div style="display: flex; justify-content: space-around; background: #f5f5f5; padding: 15px; border-radius: 10px;">
              <div style="text-align: center;">
                <div style="font-size: 22px; font-weight: bold; color: #a3e635;">\${distanceText}</div>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">Distance</div>
              </div>
              <div style="width: 1px; background: #ddd;"></div>
              <div style="text-align: center;">
                <div style="font-size: 22px; font-weight: bold; color: #a3e635;">\${timeText}</div>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">Est. Time</div>
              </div>
            </div>
            \${isApproximate ? '<div style="text-align: center; margin-top: 10px; font-size: 11px; color: #999;">Showing approximate route</div>' : ''}
          </div>
        \`;
        document.body.appendChild(infoDiv);
      }
      
      function drawStraightLine() {
        const routeLine = new google.maps.Polyline({
          path: [
            { lat: ${userLocation.lat}, lng: ${userLocation.lng} },
            { lat: ${destinationCourt.latitude}, lng: ${destinationCourt.longitude} }
          ],
          geodesic: true,
          strokeColor: '#a3e635',
          strokeOpacity: 0.8,
          strokeWeight: 5,
          map: map
        });
        
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
      
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: ${userLocation.lat}, lng: ${userLocation.lng} });
      bounds.extend({ lat: ${destinationCourt.latitude}, lng: ${destinationCourt.longitude} });
      map.fitBounds(bounds, { top: 50, bottom: 150, left: 30, right: 30 });
      
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
            
            const routePath = new google.maps.Polyline({
              path: coordinates,
              geodesic: true,
              strokeColor: '#a3e635',
              strokeOpacity: 0.9,
              strokeWeight: 6,
              map: map
            });
            
            const distanceKm = route.distance / 1000;
            const distanceText = distanceKm < 1 ? (route.distance).toFixed(0) + ' m' : distanceKm.toFixed(1) + ' km';
            const durationMin = Math.ceil(route.duration / 60);
            const timeText = durationMin < 60 ? durationMin + ' min' : Math.floor(durationMin/60) + ' hr ' + (durationMin%60) + ' min';
            
            showRouteInfo(distanceText, timeText, false);
          } else {
            drawStraightLine();
          }
        })
        .catch(error => {
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
            document.getElementById('error-msg').innerText = 'Maps authentication failed';
          }
          
          function panToLocation(lat, lng) {
            if (window.map) {
              window.map.panTo({ lat: parseFloat(lat), lng: parseFloat(lng) });
              window.map.setZoom(15);
            }
          }
        </script>
        <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap" async defer onerror="document.getElementById('error').style.display='block'; document.getElementById('error-msg').innerText='Failed to load Google Maps';"></script>
      </body>
      </html>
    `;
  };

  const clearDirections = () => {
    setDirectionsMode(false);
    setDestinationCourt(null);
    navigation.setParams({ showDirections: false, court: null });
  };

  const handleCardPress = (court) => {
    setSelectedMarker(court.id);
    setTimeout(() => {
      if (webViewRef.current && mapLoaded) {
        webViewRef.current.injectJavaScript(`panToLocation(${court.latitude}, ${court.longitude}); true;`);
      }
    }, 100);
  };

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
      },
    });
  };

  const handleCallCourt = (court) => {
    if (court.phoneNumber) {
      Linking.openURL(`tel:${court.phoneNumber}`);
    }
  };

  const handleDirections = (court) => {
    if (Platform.OS === 'ios') {
      Linking.openURL(`maps://maps.apple.com/?daddr=${court.latitude},${court.longitude}`);
    } else {
      Linking.openURL(`geo:${court.latitude},${court.longitude}`);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.slate950} />

      {directionsMode && (
        <View style={styles.directionsHeader}>
          <View style={styles.headerContent}>
            <Text style={styles.destinationText}>{destinationCourt?.name}</Text>
            {locationLoading && <ActivityIndicator color={Colors.lime600} size="small" />}
            {locationError && (
              <Text style={styles.errorText}>{locationError}</Text>
            )}
          </View>
          <TouchableOpacity onPress={clearDirections} style={styles.closeButton}>
            <Ionicons name="close-circle" size={28} color={Colors.lime600} />
          </TouchableOpacity>
        </View>
      )}

      {Platform.OS !== 'web' && WebView ? (
        <WebView
          ref={webViewRef}
          source={{ html: generateMapHTML() }}
          onLoad={() => setMapLoaded(true)}
          onMessage={(event) => {
            try {
              const message = JSON.parse(event.nativeEvent.data);
              if (message.type === 'courtMarkerClick') {
                setSelectedCourt(message.court);
              }
            } catch (error) {
              console.error('Error parsing WebView message:', error);
            }
          }}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.lime600} />
            </View>
          )}
          startInLoadingState={true}
          style={styles.webview}
        />
      ) : (
        <View style={styles.webviewFallback}>
          <Text style={styles.webviewFallbackText}>Web maps not supported</Text>
        </View>
      )}

      {/* Floating Court Details Card */}
      {selectedCourt && (
        <View style={styles.floatingCardContainer}>
          <TouchableOpacity 
            style={styles.floatingCard}
            activeOpacity={0.95}
            onPress={() => navigation.navigate('CourtDetail', { court: selectedCourt })}
          >
            <TouchableOpacity 
              style={styles.closeCardButton}
              onPress={() => setSelectedCourt(null)}
            >
              <Ionicons name="close" size={20} color={Colors.white} />
            </TouchableOpacity>

            <Image
              source={{ uri: selectedCourt.image || DEFAULT_COURT_IMAGE }}
              style={styles.floatingCardImage}
            />
            
            <LinearGradient
              colors={['transparent', 'rgba(2, 6, 23, 0.8)']}
              style={styles.floatingCardOverlay}
            />

            <View style={styles.floatingCardContent}>
              <Text style={styles.floatingCardName} numberOfLines={2}>
                {selectedCourt.name}
              </Text>
              
              <View style={styles.floatingCardMeta}>
                <Ionicons name="location" size={14} color={Colors.lime600} />
                <Text style={styles.floatingCardLocation} numberOfLines={1}>
                  {selectedCourt.location}
                </Text>
              </View>

              <View style={styles.floatingCardRating}>
                <Ionicons name="star" size={14} color={Colors.lime600} />
                <Text style={styles.floatingCardRatingText}>
                  {selectedCourt.rating?.toFixed(1) || '0.0'}
                </Text>
                <Text style={styles.floatingCardRatingLabel}>(Rating)</Text>
              </View>

              <View style={styles.floatingCardActions}>
                <TouchableOpacity 
                  style={styles.floatingCardButton}
                  onPress={() => navigation.navigate('CourtDetail', { court: selectedCourt })}
                >
                  <Ionicons name="information-circle" size={16} color={Colors.white} />
                  <Text style={styles.floatingCardButtonText}>Details</Text>
                </TouchableOpacity>

                {selectedCourt.phoneNumber && (
                  <TouchableOpacity 
                    style={styles.floatingCardButton}
                    onPress={() => Linking.openURL(`tel:${selectedCourt.phoneNumber}`)}
                  >
                    <Ionicons name="call" size={16} color={Colors.white} />
                    <Text style={styles.floatingCardButtonText}>Call</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={styles.floatingCardButton}
                  onPress={() => navigation.navigate('Map', { showDirections: true, court: selectedCourt })}
                >
                  <Ionicons name="navigate" size={16} color={Colors.white} />
                  <Text style={styles.floatingCardButtonText}>Route</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  directionsHeader: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
  },
  headerContent: {
    flex: 1,
  },
  destinationText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  webview: {
    flex: 1,
  },
  webviewFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webviewFallbackText: {
    fontSize: 16,
    color: Colors.slate600,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
  },
  courtsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  courtsScrollView: {
    flex: 1,
  },
  courtsList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  emptyCourtsContainer: {
    width: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.slate600,
    fontWeight: '600',
  },
  courtCard: {
    width: 160,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  courtImage: {
    width: '100%',
    height: 100,
    backgroundColor: Colors.slate200,
  },
  courtImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  courtCardContent: {
    padding: 10,
    backgroundColor: Colors.white,
    minHeight: 40,
  },
  courtName: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 4,
  },
  courtMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  courtLocation: {
    fontSize: 11,
    color: Colors.slate600,
    fontWeight: '600',
    flex: 1,
  },
  courtRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    color: Colors.lime600,
    fontWeight: '700',
  },
  courtActions: {
    flexDirection: 'row',
    backgroundColor: Colors.slate950,
    paddingVertical: 8,
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    gap: 2,
  },
  actionButtonText: {
    fontSize: 9,
    color: Colors.white,
    fontWeight: '700',
  },
  floatingCardContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 20,
  },
  floatingCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.slate950,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  closeCardButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingCardImage: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.slate200,
  },
  floatingCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  floatingCardContent: {
    padding: 12,
    gap: 8,
  },
  floatingCardName: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.3,
  },
  floatingCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  floatingCardLocation: {
    fontSize: 12,
    color: Colors.slate300,
    fontWeight: '500',
    flex: 1,
  },
  floatingCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  floatingCardRatingText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.lime600,
  },
  floatingCardRatingLabel: {
    fontSize: 11,
    color: Colors.slate400,
    fontWeight: '500',
  },
  floatingCardActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  floatingCardButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    backgroundColor: Colors.lime600,
    borderRadius: 8,
  },
  floatingCardButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: -0.2,
  },
});

export default MapScreen;
