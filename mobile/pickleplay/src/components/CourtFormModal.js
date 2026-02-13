import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import MapPickerModal from './MapPickerModal';

const thematicBlue = '#0A56A7';

const CourtFormModal = ({ visible, onClose, court, userId, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    num_courts: '',
    surface_type: '',
    base_price: '',
    latitude: '',
    longitude: '',
  });
  const [loading, setLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const isEditing = !!court;

  useEffect(() => {
    if (court) {
      setFormData({
        name: court.name || '',
        address: court.location?.address || '',
        city: court.location?.city || '',
        num_courts: court.num_courts?.toString() || '',
        surface_type: court.surface_type || '',
        base_price: court.base_price?.toString() || '',
        latitude: (court.location?.latitude || court.latitude)?.toString() || '',
        longitude: (court.location?.longitude || court.longitude)?.toString() || '',
      });
    } else {
      // Reset form for new court
      setFormData({
        name: '',
        address: '',
        city: '',
        num_courts: '',
        surface_type: '',
        base_price: '',
        latitude: '',
        longitude: '',
      });
    }
  }, [court, visible]);

  const handleLocationSelect = (location) => {
    setFormData({
      ...formData,
      address: location.address,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Court name is required');
      return;
    }
    if (!formData.address.trim()) {
      Alert.alert('Validation Error', 'Address is required');
      return;
    }
    if (!formData.city.trim()) {
      Alert.alert('Validation Error', 'City is required');
      return;
    }

    setLoading(true);

    try {
      let locationId = court?.location_id;

      // Create or update location
      const locationData = {
        owner_id: userId,
        name: formData.name.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        latitude: parseFloat(formData.latitude) || null,
        longitude: parseFloat(formData.longitude) || null,
        is_active: true,
      };

      if (isEditing && court?.location_id) {
        // Update existing location
        const { error: locationError } = await supabase
          .from('locations')
          .update(locationData)
          .eq('id', court.location_id)
          .eq('owner_id', userId);

        if (locationError) throw locationError;
      } else {
        // Create new location
        const { data: newLocation, error: locationError } = await supabase
          .from('locations')
          .insert([locationData])
          .select()
          .single();

        if (locationError) throw locationError;
        locationId = newLocation.id;
      }

      // Now create or update the court
      const courtData = {
        name: formData.name.trim(),
        num_courts: parseInt(formData.num_courts) || 1,
        surface_type: formData.surface_type.trim() || null,
        base_price: parseFloat(formData.base_price) || 0,
        latitude: parseFloat(formData.latitude) || null,
        longitude: parseFloat(formData.longitude) || null,
        location_id: locationId,
        owner_id: userId,
        is_active: true,
      };

      if (isEditing) {
        // Update existing court
        const { error } = await supabase
          .from('courts')
          .update(courtData)
          .eq('id', court.id)
          .eq('owner_id', userId);

        if (error) throw error;

        Alert.alert('Success', 'Court updated successfully', [
          { text: 'OK', onPress: () => {
            onSuccess?.();
            onClose();
          }}
        ]);
      } else {
        // Create new court
        const { error } = await supabase
          .from('courts')
          .insert([courtData]);

        if (error) throw error;

        Alert.alert('Success', 'Court added successfully', [
          { text: 'OK', onPress: () => {
            onSuccess?.();
            onClose();
          }}
        ]);
      }
    } catch (error) {
      console.error('Error saving court:', error);
      Alert.alert('Error', error.message || 'Failed to save court. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <LinearGradient
            colors={[thematicBlue, '#0D6EBD']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerIconWrapper}>
              <MaterialIcons name="sports-tennis" size={32} color="#fff" />
            </View>
            <Text style={styles.title}>
              {isEditing ? 'Edit Court' : 'Add New Court'}
            </Text>
            <Text style={styles.subtitle}>
              {isEditing ? 'Update court information' : 'List your court facility'}
            </Text>
          </LinearGradient>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Court Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>COURT NAME *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Pickleball Arena Manila"
                placeholderTextColor="#999"
                value={formData.name}
                onChangeText={(text) => setFormData({...formData, name: text})}
              />
            </View>

            {/* Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>ADDRESS *</Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={[styles.input, styles.inputWithButton]}
                  placeholder="e.g., 123 Main Street, BGC"
                  placeholderTextColor="#999"
                  value={formData.address}
                  onChangeText={(text) => setFormData({...formData, address: text})}
                  multiline
                />
                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={() => setShowMapPicker(true)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="map" size={24} color={thematicBlue} />
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>Tap the map icon to select location on map</Text>
            </View>

            {/* City */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CITY *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Taguig City"
                placeholderTextColor="#999"
                value={formData.city}
                onChangeText={(text) => setFormData({...formData, city: text})}
              />
            </View>

            {/* Number of Courts */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>NUMBER OF COURTS</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 4"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                value={formData.num_courts}
                onChangeText={(text) => setFormData({...formData, num_courts: text})}
              />
            </View>

            {/* Surface Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>SURFACE TYPE</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Acrylic, Concrete, Wood"
                placeholderTextColor="#999"
                value={formData.surface_type}
                onChangeText={(text) => setFormData({...formData, surface_type: text})}
              />
            </View>

            {/* Price Per Hour */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PRICE PER HOUR (PHP)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 500"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                value={formData.base_price}
                onChangeText={(text) => setFormData({...formData, base_price: text})}
              />
            </View>

            {/* Coordinates (Optional) */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth, { marginRight: 12 }]}>
                <Text style={styles.label}>LATITUDE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="14.5547"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                  value={formData.latitude}
                  onChangeText={(text) => setFormData({...formData, latitude: text})}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>LONGITUDE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="121.0244"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                  value={formData.longitude}
                  onChangeText={(text) => setFormData({...formData, longitude: text})}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[thematicBlue, '#0D6EBD']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.submitButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons 
                      name={isEditing ? 'save' : 'add'} 
                      size={24} 
                      color="#fff" 
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.submitButtonText}>
                      {isEditing ? 'UPDATE COURT' : 'ADD COURT'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Map Picker Modal */}
      <MapPickerModal
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onLocationSelect={handleLocationSelect}
        initialLocation={{
          latitude: parseFloat(formData.latitude) || 14.5995,
          longitude: parseFloat(formData.longitude) || 120.9842,
          address: formData.address,
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  headerGradient: {
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  headerIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  inputWithIcon: {
    position: 'relative',
  },
  inputWithButton: {
    paddingRight: 50,
  },
  mapButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: thematicBlue + '20',
  },
  helperText: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
    fontStyle: 'italic',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  row: {
    flexDirection: 'row',
  },
  halfWidth: {
    flex: 1,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.5,
  },
});

export default CourtFormModal;
