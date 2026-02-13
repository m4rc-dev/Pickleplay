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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';

const thematicBlue = '#0A56A7';

const ClinicFormModal = ({ visible, onClose, clinic, coachId, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'Intro',
    capacity: '8',
    date: new Date(),
    time: '',
    location: '',
    price: '',
  });
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const isEditing = !!clinic;

  useEffect(() => {
    if (clinic) {
      setFormData({
        title: clinic.title || '',
        description: clinic.description || '',
        level: clinic.level || 'Intro',
        capacity: clinic.capacity?.toString() || '8',
        date: clinic.date ? new Date(clinic.date) : new Date(),
        time: clinic.time || '',
        location: clinic.location || '',
        price: clinic.price?.toString() || '',
      });
    } else {
      // Reset form for new clinic
      setFormData({
        title: '',
        description: '',
        level: 'Intro',
        capacity: '8',
        date: new Date(),
        time: '',
        location: '',
        price: '',
      });
    }
  }, [clinic, visible]);

  const levelOptions = [
    { value: 'Intro', label: 'Intro' },
    { value: 'Intermediate', label: 'Intermediate' },
    { value: 'Advanced', label: 'Advanced' },
  ];

  const formatDate = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const formatTime = (hours, minutes) => {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = String(minutes).padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${period}`;
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({ ...formData, date: selectedDate });
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours();
      const minutes = selectedTime.getMinutes();
      setFormData({ ...formData, time: formatTime(hours, minutes) });
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim()) {
      Alert.alert('Validation Error', 'Clinic title is required');
      return;
    }
    if (!formData.location.trim()) {
      Alert.alert('Validation Error', 'Location is required');
      return;
    }
    if (!formData.time.trim()) {
      Alert.alert('Validation Error', 'Time is required');
      return;
    }

    setLoading(true);

    try {
      const clinicData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        level: formData.level,
        capacity: parseInt(formData.capacity) || 8,
        participants: 0,
        date: formData.date.toISOString().split('T')[0], // Format: YYYY-MM-DD
        time: formData.time.trim(),
        location: formData.location.trim(),
        price: parseFloat(formData.price) || 0,
        coach_id: coachId,
        status: 'active',
      };

      if (isEditing) {
        // Update existing clinic
        const { error } = await supabase
          .from('clinics')
          .update(clinicData)
          .eq('id', clinic.id)
          .eq('coach_id', coachId); // Ensure coach can only update their own clinics

        if (error) throw error;

        Alert.alert('Success', 'Clinic updated successfully', [
          { text: 'OK', onPress: () => {
            onSuccess?.();
            onClose();
          }}
        ]);
      } else {
        // Create new clinic
        const { error } = await supabase
          .from('clinics')
          .insert([clinicData]);

        if (error) throw error;

        Alert.alert('Success', 'Clinic created successfully', [
          { text: 'OK', onPress: () => {
            onSuccess?.();
            onClose();
          }}
        ]);
      }
    } catch (error) {
      console.error('Error saving clinic:', error);
      Alert.alert('Error', error.message || 'Failed to save clinic. Please try again.');
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
              <MaterialIcons name="school" size={32} color="#fff" />
            </View>
            <Text style={styles.title}>
              {isEditing ? 'Edit Clinic' : 'New Clinic'}
            </Text>
            <Text style={styles.subtitle}>
              {isEditing ? 'Update clinic information' : 'Create a new coaching clinic'}
            </Text>
          </LinearGradient>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Clinic Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CLINIC TITLE *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Pickleball Fundamentals"
                placeholderTextColor="#999"
                value={formData.title}
                onChangeText={(text) => setFormData({...formData, title: text})}
              />
            </View>

            {/* Level and Capacity Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth, { marginRight: 12 }]}>
                <Text style={styles.label}>LEVEL *</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowLevelDropdown(!showLevelDropdown)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownText}>{formData.level}</Text>
                  <MaterialIcons 
                    name={showLevelDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                    size={24} 
                    color={thematicBlue} 
                  />
                </TouchableOpacity>
                {showLevelDropdown && (
                  <View style={styles.dropdownMenu}>
                    {levelOptions.map((option, index) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.dropdownItem,
                          index === levelOptions.length - 1 && styles.dropdownItemLast,
                        ]}
                        onPress={() => {
                          setFormData({...formData, level: option.value});
                          setShowLevelDropdown(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.dropdownItemText}>{option.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>CAPACITY</Text>
                <TextInput
                  style={styles.input}
                  placeholder="8"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  value={formData.capacity}
                  onChangeText={(text) => setFormData({...formData, capacity: text})}
                />
              </View>
            </View>

            {/* Date and Time Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth, { marginRight: 12 }]}>
                <Text style={styles.label}>DATE *</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="event" size={20} color={thematicBlue} style={{ marginRight: 8 }} />
                  <Text style={styles.dateTimeText}>{formatDate(formData.date)}</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>TIME *</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="access-time" size={20} color={thematicBlue} style={{ marginRight: 8 }} />
                  <Text style={styles.dateTimeText}>
                    {formData.time || '10:00 AM'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Location */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>LOCATION *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Court A1"
                placeholderTextColor="#999"
                value={formData.location}
                onChangeText={(text) => setFormData({...formData, location: text})}
              />
            </View>

            {/* Price */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PRICE (₱)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 45"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                value={formData.price}
                onChangeText={(text) => setFormData({...formData, price: text})}
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>DESCRIPTION</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe what students will learn in this clinic..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={formData.description}
                onChangeText={(text) => setFormData({...formData, description: text})}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#DC2626', '#B91C1C']}
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
                      {isEditing ? 'UPDATE CLINIC' : 'CREATE CLINIC'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
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
  dropdown: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  dateTimeButton: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  dateTimeText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
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

export default ClinicFormModal;
