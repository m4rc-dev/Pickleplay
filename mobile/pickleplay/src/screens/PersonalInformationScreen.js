import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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
  const skillLevels = ['Beginner', 'Intermediate', 'Advanced', 'Pro'];
  const playFrequencies = ['Rarely', 'Weekly', '2-3 times/week', 'Daily'];

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const metadata = user.user_metadata || {};

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

  const handleFieldChange = useCallback((field, value) => {
    setUserData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);

    try {
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

      try {
        await supabase.from('profiles').upsert({
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

  const EditInput = ({ label, value, onChangeText, icon, keyboardType = 'default', editable = true, isSelect = false, options = [] }) => (
    <View style={styles.inputCard}>
      <View style={styles.inputHeader}>
        <Ionicons name={icon} size={18} color={Colors.lime400} />
        <Text style={styles.inputLabel}>{label}</Text>
      </View>
      {isEditing && editable && isSelect ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectScroll}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.selectChip,
                value === option && styles.selectChipActive,
              ]}
              onPress={() => handleFieldChange(label.toLowerCase().replace(' ', ''), option)}
            >
              <Text
                style={[
                  styles.selectChipText,
                  value === option && styles.selectChipTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : isEditing && editable && label === 'Bio' ? (
        <TextInput
          style={styles.bioInput}
          value={value}
          onChangeText={onChangeText}
          placeholder="Tell us about yourself..."
          placeholderTextColor={Colors.slate400}
          multiline
          numberOfLines={3}
        />
      ) : isEditing && editable ? (
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor={Colors.slate400}
        />
      ) : (
        <Text style={[styles.staticValue, !editable && styles.disabledValue]}>
          {value || 'Not set'}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[Colors.slate950, Colors.slate900]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Info</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
          <Ionicons
            name={isEditing ? 'close' : 'pencil'}
            size={24}
            color={Colors.white}
          />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.lime400} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : (
          <>
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{
                    uri:
                      userData.avatarUrl ||
                      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
                  }}
                  style={styles.avatar}
                />
                <View style={styles.avatarBadge}>
                  <Ionicons name="camera" size={16} color={Colors.white} />
                </View>
              </View>
              <Text style={styles.avatarName}>
                {userData.firstName || 'User'} {userData.lastName || ''}
              </Text>
              {isEditing && (
                <TouchableOpacity style={styles.changePhotoButton}>
                  <Ionicons name="cloud-upload" size={16} color={Colors.white} />
                  <Text style={styles.changePhotoText}>Choose Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Basic Information Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person" size={20} color={Colors.lime400} />
                <Text style={styles.sectionTitle}>Basic Information</Text>
              </View>

              <EditInput
                label="First Name"
                value={userData.firstName}
                onChangeText={(text) => handleFieldChange('firstName', text)}
                icon="person"
              />
              <EditInput
                label="Last Name"
                value={userData.lastName}
                onChangeText={(text) => handleFieldChange('lastName', text)}
                icon="person-add"
              />
              <EditInput
                label="Email"
                value={userData.email}
                editable={false}
                icon="mail"
              />
              <EditInput
                label="Phone"
                value={userData.phoneNumber}
                onChangeText={(text) => handleFieldChange('phoneNumber', text)}
                keyboardType="phone-pad"
                icon="call"
              />
              <EditInput
                label="Date of Birth"
                value={userData.dateOfBirth}
                onChangeText={(text) => handleFieldChange('dateOfBirth', text)}
                icon="calendar"
              />
              <EditInput
                label="Location"
                value={userData.location}
                onChangeText={(text) => handleFieldChange('location', text)}
                icon="location"
              />
            </View>

            {/* Player Information Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trophy" size={20} color={Colors.lime400} />
                <Text style={styles.sectionTitle}>Player Information</Text>
              </View>

              <EditInput
                label="Skill Level"
                value={userData.skillLevel}
                icon="bar-chart"
                isSelect={true}
                options={skillLevels}
              />
              <EditInput
                label="Play Frequency"
                value={userData.playFrequency}
                icon="time"
                isSelect={true}
                options={playFrequencies}
              />
              <EditInput
                label="Bio"
                value={userData.bio}
                onChangeText={(text) => handleFieldChange('bio', text)}
                icon="information"
              />
            </View>

            {/* Save Button */}
            {isEditing && (
              <View style={styles.actionSection}>
                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <ActivityIndicator size="small" color={Colors.white} />
                      <Text style={styles.saveButtonText}>Saving...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.slate600,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.slate200,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.lime400,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  avatarName: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  changePhotoButton: {
    marginTop: 12,
    flexDirection: 'row',
    backgroundColor: Colors.lime400,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    gap: 6,
  },
  changePhotoText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.slate950,
    marginLeft: 10,
    letterSpacing: -0.5,
  },
  inputCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate600,
    marginLeft: 8,
    letterSpacing: -0.2,
  },
  textInput: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.slate950,
    paddingVertical: 6,
  },
  bioInput: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.slate950,
    paddingVertical: 6,
    minHeight: 80,
  },
  staticValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.slate950,
    paddingVertical: 6,
  },
  disabledValue: {
    color: Colors.slate500,
  },
  selectScroll: {
    marginLeft: -16,
    marginRight: -16,
    paddingHorizontal: 16,
  },
  selectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.slate100,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
  },
  selectChipActive: {
    backgroundColor: Colors.lime400,
    borderColor: Colors.lime400,
  },
  selectChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.slate600,
    letterSpacing: -0.2,
  },
  selectChipTextActive: {
    color: Colors.white,
  },
  actionSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  saveButton: {
    backgroundColor: Colors.lime400,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: Colors.lime400,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
});

export default PersonalInformationScreen;
