import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { GOOGLE_MAPS_API_KEY } from '../constants/Config';

const { width, height } = Dimensions.get('window');
const thematicBlue = '#0A56A7';

const MapPickerModal = ({ visible, onClose, onLocationSelect, initialLocation }) => {
  const mapRef = useRef(null);
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: initialLocation?.latitude || 14.5995, // Default to Manila
    longitude: initialLocation?.longitude || 120.9842,
    address: initialLocation?.address || '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (initialLocation) {
      setSelectedLocation({
        latitude: initialLocation.latitude || 14.5995,
        longitude: initialLocation.longitude || 120.9842,
        address: initialLocation.address || '',
      });
    }
  }, [initialLocation, visible]);

  const handleMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    // Reverse geocode to get address
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const address = data.results[0].formatted_address;
        setSelectedLocation({ latitude, longitude, address });
      } else {
        setSelectedLocation({ latitude, longitude, address: `${latitude}, ${longitude}` });
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      setSelectedLocation({ latitude, longitude, address: `${latitude}, ${longitude}` });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const address = data.results[0].formatted_address;
        const newLocation = {
          latitude: location.lat,
          longitude: location.lng,
          address: address,
        };
        setSelectedLocation(newLocation);
        
        // Animate map to new location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: location.lat,
            longitude: location.lng,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error searching location:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = () => {
    onLocationSelect(selectedLocation);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Court Location</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search address or place..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searching && (
            <ActivityIndicator size="small" color={thematicBlue} style={styles.searchLoader} />
          )}
        </View>

        {/* Instruction Text */}
        <View style={styles.instructionContainer}>
          <MaterialIcons name="touch-app" size={16} color={thematicBlue} />
          <Text style={styles.instructionText}>Tap anywhere on the map to select a location</Text>
        </View>

        {/* Native Map */}
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          onPress={handleMapPress}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
        >
          <Marker
            coordinate={{
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude,
            }}
            title="Court Location"
            description={selectedLocation.address}
          >
            <View style={styles.markerContainer}>
              <MaterialIcons name="sports-tennis" size={32} color={thematicBlue} />
            </View>
          </Marker>
        </MapView>

        {/* Selected Location Info */}
        <View style={styles.locationInfo}>
          <View style={styles.locationHeader}>
            <MaterialIcons name="location-on" size={24} color={thematicBlue} />
            <Text style={styles.locationTitle}>Selected Location</Text>
          </View>
          <Text style={styles.locationAddress} numberOfLines={2}>
            {selectedLocation.address || 'Tap on map to select location'}
          </Text>
          <View style={styles.coordinates}>
            <Text style={styles.coordinateText}>
              Lat: {selectedLocation.latitude.toFixed(6)}
            </Text>
            <Text style={styles.coordinateText}>
              Lng: {selectedLocation.longitude.toFixed(6)}
            </Text>
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
          activeOpacity={0.8}
        >
          <MaterialIcons name="check" size={24} color="#fff" />
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  searchLoader: {
    marginLeft: 8,
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#E3F2FD',
  },
  instructionText: {
    fontSize: 12,
    color: thematicBlue,
    marginLeft: 6,
    fontWeight: '500',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  locationInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  locationAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  coordinates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coordinateText: {
    fontSize: 12,
    color: '#999',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: thematicBlue,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingVertical: 16,
    borderRadius: 12,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});

export default MapPickerModal;
