import React, {useState, useEffect, useCallback} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {MaterialIcons} from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

// Move InputField outside component to prevent re-creation on each render
const InputField = ({ label, value, onChangeText, icon, editable = true, keyboardType = 'default', isEditing }) => (
  <View style={styles.inputContainer}>
    <View style={styles.inputLabelRow}>
      <MaterialIcons name={icon} size={20} color={thematicBlue} />
      <Text style={styles.inputLabel}>{label}</Text>
    </View>
    {isEditing && editable ? (
      <TextInput
        style={styles.textInput}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#999"
        keyboardType={keyboardType}
        autoCorrect={false}
      />
    ) : (
      <Text style={[styles.staticValue, !editable && styles.disabledValue]}>{value || 'Not set'}</Text>
    )}
  </View>
);

// Move SelectField outside component to prevent re-creation on each render
const SelectField = ({ label, value, options, onSelect, icon, isEditing }) => (
  <View style={styles.inputContainer}>
    <View style={styles.inputLabelRow}>
      <MaterialIcons name={icon} size={20} color={thematicBlue} />
      <Text style={styles.inputLabel}>{label}</Text>
    </View>
    {isEditing ? (
      <View style={styles.selectContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.selectOption,
              value === option && styles.selectOptionActive,
            ]}
            onPress={() => onSelect(option)}
          >
            <Text
              style={[
                styles.selectOptionText,
                value === option && styles.selectOptionTextActive,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    ) : (
      <Text style={styles.staticValue}>{value || 'Not set'}</Text>
    )}
  </View>
);

const PersonalInformationScreen = ({ navigation }) => {
  const { user, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    location: '',
    bio: '',
    skillLevel: '',
    playFrequency: '',
    avatarUrl: '',
  });

  const [isEditing, setIsEditing] = useState(false);

  // Skill level options
  const skillLevels = ['Beginner', 'Intermediate', 'Advanced', 'Pro'];
  const playFrequencies = ['Rarely', 'Weekly', '2-3 times/week', 'Daily'];

  // Fetch user data on mount
  useEffect(() => {
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Get data from auth metadata first
      const metadata = user.user_metadata || {};
      
      // Try to fetch additional data from profiles table if it exists
      let profileData = {};
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!error && data) {
          profileData = data;
        }
      } catch (err) {
        console.log('No users table data found, using auth metadata');
      }

      // Merge auth metadata with profile data (profile data takes priority)
      setUserData({
        firstName: profileData.first_name || metadata.first_name || '',
        lastName: profileData.last_name || metadata.last_name || '',
        email: user.email || '',
        phoneNumber: profileData.phone_number || metadata.phone_number || '',
        dateOfBirth: profileData.date_of_birth || metadata.date_of_birth || '',
        location: profileData.location || metadata.location || '',
        bio: profileData.bio || metadata.bio || '',
        skillLevel: profileData.skill_level || metadata.skill_level || '',
        playFrequency: profileData.play_frequency || metadata.play_frequency || '',
        avatarUrl: profileData.avatar_url || metadata.avatar_url || '',
      });
    } catch (err) {
      console.error('Error fetching user data:', err);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          full_name: `${userData.firstName} ${userData.lastName}`.trim(),
          phone_number: userData.phoneNumber,
          date_of_birth: userData.dateOfBirth,
          location: userData.location,
          bio: userData.bio,
          skill_level: userData.skillLevel,
          play_frequency: userData.playFrequency,
        },
      });

      if (authError) throw authError;

      // Try to update profiles table if it exists
      try {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            full_name: `${userData.firstName} ${userData.lastName}`.trim(),
            location: userData.location,
            bio: userData.bio,
            updated_at: new Date().toISOString(),
          });
      } catch (err) {
        console.log('Users table update skipped:', err.message);
      }

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => setIsEditing(false) },
      ]);
    } catch (err) {
      console.error('Error saving profile:', err);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler functions for updating userData
  const handleFieldChange = useCallback((field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={thematicBlue} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Information</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
          <MaterialIcons name={isEditing ? 'close' : 'edit'} size={28} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={thematicBlue} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : (
          <>
            {/* Profile Avatar */}
            <View style={styles.avatarSection}>
              <Image
                source={{
                  uri: userData.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
                }}
                style={styles.avatar}
              />
              {isEditing && (
                <TouchableOpacity style={styles.changePhotoButton}>
                  <MaterialIcons name="camera-alt" size={20} color={Colors.white} />
                  <Text style={styles.changePhotoText}>Change Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Form Fields */}
            <View style={styles.formSection}>
              <Text style={styles.sectionHeader}>Basic Information</Text>
              
              <InputField
                icon="person"
                label="First Name"
                value={userData.firstName}
                onChangeText={(text) => handleFieldChange('firstName', text)}
                isEditing={isEditing}
              />
              <InputField
                icon="person-outline"
                label="Last Name"
                value={userData.lastName}
                onChangeText={(text) => handleFieldChange('lastName', text)}
                isEditing={isEditing}
              />
              <InputField
                icon="email"
                label="Email"
                value={userData.email}
                editable={false}
                isEditing={isEditing}
              />
              <InputField
                icon="phone"
                label="Phone Number"
                value={userData.phoneNumber}
                onChangeText={(text) => handleFieldChange('phoneNumber', text)}
                keyboardType="phone-pad"
                isEditing={isEditing}
              />
              <InputField
                icon="cake"
                label="Date of Birth"
                value={userData.dateOfBirth}
                onChangeText={(text) => handleFieldChange('dateOfBirth', text)}
                isEditing={isEditing}
              />
              <InputField
                icon="location-on"
                label="Location"
                value={userData.location}
                onChangeText={(text) => handleFieldChange('location', text)}
                isEditing={isEditing}
              />

              <Text style={styles.sectionHeader}>Player Information</Text>
              
              <SelectField
                icon="sports-tennis"
                label="Skill Level"
                value={userData.skillLevel}
                options={skillLevels}
                onSelect={(value) => handleFieldChange('skillLevel', value)}
                isEditing={isEditing}
              />
              <SelectField
                icon="schedule"
                label="Play Frequency"
                value={userData.playFrequency}
                options={playFrequencies}
                onSelect={(value) => handleFieldChange('playFrequency', value)}
                isEditing={isEditing}
              />
              
              <View style={styles.inputContainer}>
                <View style={styles.inputLabelRow}>
                  <MaterialIcons name="description" size={20} color={thematicBlue} />
                  <Text style={styles.inputLabel}>Bio</Text>
                </View>
                {isEditing ? (
                  <TextInput
                    style={[styles.textInput, styles.bioInput]}
                    value={userData.bio}
                    onChangeText={(text) => handleFieldChange('bio', text)}
                    multiline
                    numberOfLines={3}
                    placeholder="Tell us about yourself..."
                    placeholderTextColor="#999"
                  />
                ) : (
                  <Text style={styles.staticValue}>{userData.bio || 'No bio yet'}</Text>
                )}
              </View>
            </View>

        {/* Save Button */}
        {isEditing && (
          <TouchableOpacity 
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <ActivityIndicator size="small" color={thematicBlue} />
                <Text style={styles.saveButtonText}>Saving...</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="check-circle" size={20} color={thematicBlue} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: thematicBlue,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingBottom: 10,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: activeColor,
  },
  changePhotoButton: {
    marginTop: 15,
    flexDirection: 'row',
    backgroundColor: thematicBlue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  changePhotoText: {
    color: Colors.white,
    marginLeft: 8,
    fontWeight: '600',
  },
  formSection: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: thematicBlue,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 16,
    backgroundColor: Colors.surface,
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  staticValue: {
    color: Colors.text,
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  disabledValue: {
    color: '#888',
    backgroundColor: '#f0f0f0',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: thematicBlue,
    marginBottom: 15,
    marginTop: 10,
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectOptionActive: {
    backgroundColor: thematicBlue,
    borderColor: thematicBlue,
  },
  selectOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  selectOptionTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  saveButton: {
    marginHorizontal: 20,
    marginBottom: 30,
    backgroundColor: activeColor,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: thematicBlue,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: thematicBlue,
  },
});

export default PersonalInformationScreen;
