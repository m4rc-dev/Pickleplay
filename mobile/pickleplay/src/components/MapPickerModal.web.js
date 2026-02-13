import React, { useState, useEffect } from 'react';
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
import { GOOGLE_MAPS_API_KEY } from '../constants/Config';

const { width, height } = Dimensions.get('window');
const thematicBlue = '#0A56A7';

const MapPickerModal = ({ visible, onClose, onLocationSelect, initialLocation }) => {
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
        setSelectedLocation({
          latitude: location.lat,
          longitude: location.lng,
          address: address,
        });
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

        {/* Web Fallback UI */}
        <View style={styles.webFallback}>
          <View style={styles.webFallbackHeader}>
            <MaterialIcons name="map" size={48} color="#ccc" />
            <Text style={styles.webFallbackTitle}>Map Not Available on Web</Text>
            <Text style={styles.webFallbackSubtitle}>Enter coordinates manually or use the search</Text>
          </View>
          
          <View style={styles.webInputGroup}>
            <Text style={styles.webInputLabel}>Address</Text>
            <TextInput
              style={styles.webInput}
              placeholder="Enter court address"
              placeholderTextColor="#999"
              value={selectedLocation.address}
              onChangeText={(text) => setSelectedLocation({ ...selectedLocation, address: text })}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.webInputRow}>
            <View style={[styles.webInputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.webInputLabel}>Latitude</Text>
              <TextInput
                style={styles.webInput}
                placeholder="14.5995"
                placeholderTextColor="#999"
                value={selectedLocation.latitude.toString()}
                onChangeText={(text) => {
                  const lat = parseFloat(text) || 14.5995;
                  setSelectedLocation({ ...selectedLocation, latitude: lat });
                }}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.webInputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.webInputLabel}>Longitude</Text>
              <TextInput
                style={styles.webInput}
                placeholder="120.9842"
                placeholderTextColor="#999"
                value={selectedLocation.longitude.toString()}
                onChangeText={(text) => {
                  const lng = parseFloat(text) || 120.9842;
                  setSelectedLocation({ ...selectedLocation, longitude: lng });
                }}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.webHint}>
            💡 Tip: Use Google Maps to find coordinates - right-click on location and copy coordinates
          </Text>
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
  // Web fallback styles
  webFallback: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  webFallbackHeader: {
    alignItems: 'center',
    paddingVertical: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 24,
  },
  webFallbackTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  webFallbackSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  webInputGroup: {
    marginBottom: 20,
  },
  webInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  webInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  webInputRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  webHint: {
    fontSize: 13,
    color: '#666',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    lineHeight: 20,
  },
});

export default MapPickerModal;
