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
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../lib/supabase';

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

const ProfessionalApplicationModal = ({ visible, onClose, applicationType, userId, onSuccess }) => {
  const [selectedType, setSelectedType] = useState(applicationType || '');
  const [accessCode, setAccessCode] = useState('');
  const [experienceSummary, setExperienceSummary] = useState('');
  const [documents, setDocuments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [accessCodeFocused, setAccessCodeFocused] = useState(false);
  const [experienceFocused, setExperienceFocused] = useState(false);
  const [userRoles, setUserRoles] = useState([]);

  // Fetch user's current roles
  useEffect(() => {
    const fetchUserRoles = async () => {
      if (!userId || !visible) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('roles')
          .eq('id', userId)
          .single();

        if (error) throw error;
        
        if (data && data.roles) {
          setUserRoles(data.roles);
        }
      } catch (error) {
        console.error('Error fetching user roles:', error);
      }
    };

    if (visible) {
      fetchUserRoles();
    }
  }, [visible, userId]);

  // Reset form when modal opens/closes or applicationType changes
  useEffect(() => {
    if (visible) {
      setSelectedType(applicationType || '');
      setAccessCode('');
      setExperienceSummary('');
      setDocuments([]);
      setShowDropdown(false);
      setAccessCodeFocused(false);
      setExperienceFocused(false);
    }
  }, [visible, applicationType]);

  const applicationTypes = [
    { value: 'COACH', label: 'Certified Coach' },
    { value: 'COURT_OWNER', label: 'Court Owner' },
  ];

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.type === 'success' || !result.canceled) {
        const files = result.assets || [result];
        
        // Check file sizes (max 10MB each)
        const validFiles = files.filter(file => {
          if (file.size > 10 * 1024 * 1024) {
            Alert.alert('File Too Large', `${file.name} exceeds 10MB limit`);
            return false;
          }
          return true;
        });

        setDocuments([...documents, ...validFiles]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeDocument = (index) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const uploadDocuments = async () => {
    const uploadedUrls = [];
    
    for (const doc of documents) {
      try {
        const fileExt = doc.name.split('.').pop();
        const fileName = `${userId}_${Date.now()}.${fileExt}`;
        const filePath = `applications/${selectedType}/${fileName}`;

        // Read file as ArrayBuffer for React Native
        const response = await fetch(doc.uri);
        const arrayBuffer = await response.arrayBuffer();
        const fileData = new Uint8Array(arrayBuffer);

        console.log('Uploading file:', fileName, 'Size:', fileData.length);

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('application-documents')
          .upload(filePath, fileData, {
            contentType: doc.mimeType || 'application/octet-stream',
            upsert: false,
          });

        if (error) {
          console.error('Supabase storage error:', error);
          throw new Error(`Upload failed: ${error.message}`);
        }

        console.log('Upload successful:', data);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('application-documents')
          .getPublicUrl(filePath);

        uploadedUrls.push(urlData.publicUrl);
      } catch (error) {
        console.error('Error uploading document:', error);
        Alert.alert('Upload Error', `Failed to upload ${doc.name}: ${error.message}`);
        throw error;
      }
    }

    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Missing Information', 'Please select an application type');
      return;
    }

    if (!experienceSummary.trim()) {
      Alert.alert('Missing Information', 'Please provide an experience summary');
      return;
    }

    if (documents.length === 0) {
      Alert.alert(
        'Missing Documents',
        'Please upload supporting documents (certifications, licenses, or proof of court ownership)',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue Without', onPress: () => submitApplication([]) },
        ]
      );
      return;
    }

    await submitApplication();
  };

  const submitApplication = async (documentUrls = null) => {
    setIsSubmitting(true);

    try {
      // Upload documents if not already uploaded
      let uploadedUrls = documentUrls;
      
      if (uploadedUrls === null && documents.length > 0) {
        try {
          uploadedUrls = await uploadDocuments();
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          Alert.alert(
            'Upload Failed',
            'Could not upload documents. This might be because:\n\n' +
            '• The storage bucket is not set up in Supabase\n' +
            '• You don\'t have permission to upload\n' +
            '• Network connection issue\n\n' +
            'Would you like to submit without documents?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setIsSubmitting(false) },
              { text: 'Submit Without Documents', onPress: () => submitApplication([]) },
            ]
          );
          return;
        }
      }

      if (uploadedUrls === null) {
        uploadedUrls = [];
      }

      // Submit application to database
      const { error } = await supabase
        .from('professional_applications')
        .insert({
          profile_id: userId,
          requested_role: selectedType,
          status: 'PENDING',
          experience_summary: experienceSummary.trim(),
          document_url: uploadedUrls.join(','), // Store multiple URLs as comma-separated
          submitted_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      Alert.alert(
        'Application Submitted! ✅',
        `Your ${selectedType === 'COACH' ? 'coach' : 'court owner'} application has been submitted successfully. Our admin team will review your documents and get back to you soon.`,
        [{ text: 'OK', onPress: () => {
          onSuccess?.();
          onClose();
        }}]
      );
    } catch (error) {
      console.error('Error submitting application:', error);
      Alert.alert('Submission Failed', error.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedType(applicationType || '');
    setAccessCode('');
    setExperienceSummary('');
    setDocuments([]);
    setShowDropdown(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Gradient Header */}
          <LinearGradient
            colors={[thematicBlue, '#0D6EBD']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.headerGradient}
          >
            <View style={styles.headerIconWrapper}>
              <MaterialIcons name="workspace-premium" size={32} color="#fff" />
            </View>
            <Text style={styles.title}>PROFESSIONAL APPLICATION</Text>
            <Text style={styles.subtitle}>
              Apply to become a certified coach or register your court facility
            </Text>
          </LinearGradient>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Application Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>APPLICATION TYPE</Text>
              <View style={styles.dropdownWrapper}>
                <TouchableOpacity
                  style={[styles.dropdown, showDropdown && styles.dropdownActive]}
                  onPress={() => setShowDropdown(!showDropdown)}
                  disabled={!!applicationType}
                  activeOpacity={0.7}
                >
                  <View style={styles.dropdownContent}>
                    {selectedType && (
                      <MaterialIcons 
                        name={selectedType === 'COACH' ? 'school' : 'domain'} 
                        size={20} 
                        color={thematicBlue} 
                        style={styles.dropdownIcon}
                      />
                    )}
                    <Text style={[styles.dropdownText, !selectedType && styles.placeholderText]}>
                      {selectedType ? applicationTypes.find(t => t.value === selectedType)?.label : 'Select application type...'}
                    </Text>
                  </View>
                  <MaterialIcons 
                    name={showDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                    size={24} 
                    color={showDropdown ? thematicBlue : "#666"} 
                  />
                </TouchableOpacity>

                {showDropdown && !applicationType && (
                  <View style={styles.dropdownMenu}>
                    {applicationTypes.map((type, index) => {
                      const isDisabled = userRoles.includes(type.value);
                      
                      return (
                        <TouchableOpacity
                          key={type.value}
                          style={[
                            styles.dropdownItem,
                            index === applicationTypes.length - 1 && styles.dropdownItemLast,
                            isDisabled && styles.dropdownItemDisabled,
                          ]}
                          onPress={() => {
                            if (!isDisabled) {
                              setSelectedType(type.value);
                              setShowDropdown(false);
                            }
                          }}
                          activeOpacity={isDisabled ? 1 : 0.7}
                          disabled={isDisabled}
                        >
                          <View style={styles.dropdownItemContent}>
                            <MaterialIcons 
                              name={type.value === 'COACH' ? 'school' : 'domain'} 
                              size={22} 
                              color={isDisabled ? '#ccc' : thematicBlue} 
                              style={{ marginRight: 14 }}
                            />
                            <View style={styles.dropdownItemTextWrapper}>
                              <Text style={[styles.dropdownItemText, isDisabled && styles.dropdownItemTextDisabled]}>
                                {type.label}
                                {isDisabled && ' (Already Approved)'}
                              </Text>
                              <Text style={[styles.dropdownItemSubtext, isDisabled && styles.dropdownItemSubtextDisabled]}>
                                {type.value === 'COACH' ? 'Share your expertise and earn money' : 'List your facility and manage bookings'}
                              </Text>
                            </View>
                          </View>
                          <MaterialIcons 
                            name={isDisabled ? 'check-circle' : 'arrow-forward'} 
                            size={20} 
                            color={isDisabled ? '#10b981' : '#999'} 
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            {/* Access Code (Optional) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>ACCESS CODE (PROMOTIONAL)</Text>
                <Text style={styles.optionalText}>Optional</Text>
              </View>
              <TextInput
                style={[styles.input, accessCodeFocused && styles.inputFocused]}
                placeholder="E.G., PICKLE-PRO-2024"
                placeholderTextColor="#999"
                value={accessCode}
                onChangeText={setAccessCode}
                autoCapitalize="characters"
                onFocus={() => setAccessCodeFocused(true)}
                onBlur={() => setAccessCodeFocused(false)}
              />
            </View>

            {/* Experience Summary */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EXPERIENCE SUMMARY</Text>
              <TextInput
                style={[styles.input, styles.textArea, experienceFocused && styles.inputFocused]}
                placeholder={selectedType === 'COACH' 
                  ? "Describe your coaching experience, certifications, and qualifications..."
                  : "Describe your court facility, location, and amenities..."}
                placeholderTextColor="#999"
                value={experienceSummary}
                onChangeText={setExperienceSummary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() => setExperienceFocused(true)}
                onBlur={() => setExperienceFocused(false)}
              />
            </View>

            {/* Supporting Documents */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>SUPPORTING DOCUMENTS</Text>
                <MaterialIcons name="info-outline" size={16} color="#999" />
              </View>
              
              <TouchableOpacity
                style={styles.uploadArea}
                onPress={handlePickDocument}
              >
                <MaterialIcons name="file-upload" size={32} color={thematicBlue} />
                <Text style={styles.uploadText}>Click to upload files</Text>
                <Text style={styles.uploadSubtext}>PDF, DOC, or images (Max 10MB each)</Text>
              </TouchableOpacity>

              <Text style={styles.helperText}>
                {selectedType === 'COACH' 
                  ? 'Upload certifications, licenses, or facility documents'
                  : 'Upload proof of court ownership, licenses, or facility documents'}
              </Text>

              {/* Uploaded Documents List */}
              {documents.length > 0 && (
                <View style={styles.documentsContainer}>
                  {documents.map((doc, index) => (
                    <View key={index} style={styles.documentItem}>
                      <MaterialIcons name="insert-drive-file" size={20} color={thematicBlue} style={{ marginRight: 8 }} />
                      <Text style={styles.documentName} numberOfLines={1}>
                        {doc.name}
                      </Text>
                      <TouchableOpacity onPress={() => removeDocument(index)} style={{ marginLeft: 8 }}>
                        <MaterialIcons name="close" size={20} color="#999" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[thematicBlue, '#0D6EBD']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.submitButtonGradient}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>SUBMIT APPLICATION</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  headerGradient: {
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
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
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionalText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  dropdownWrapper: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#F9FAFB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownActive: {
    borderColor: thematicBlue,
    backgroundColor: '#fff',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownIcon: {
    marginRight: 8,
  },
  dropdownText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#999',
    fontWeight: '400',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: thematicBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemDisabled: {
    backgroundColor: '#F9FAFB',
    opacity: 0.7,
  },
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownItemTextWrapper: {
    flex: 1,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 3,
  },
  dropdownItemTextDisabled: {
    color: '#9CA3AF',
  },
  dropdownItemSubtext: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  dropdownItemSubtextDisabled: {
    color: '#D1D5DB',
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
  inputFocused: {
    borderColor: thematicBlue,
    borderWidth: 2,
    shadowColor: thematicBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  uploadText: {
    fontSize: 15,
    fontWeight: '700',
    color: thematicBlue,
    marginTop: 12,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  helperText: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  documentsContainer: {
    marginTop: 12,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentName: {
    flex: 1,
    fontSize: 13,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.5,
  },
});

export default ProfessionalApplicationModal;
