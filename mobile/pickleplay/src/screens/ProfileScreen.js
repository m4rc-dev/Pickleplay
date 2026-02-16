import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ImageBackground,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Colors from '../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

const ProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    avatar_url: '',
    bio: '',
    skill_level: '',
    points: 0,
    referral_code: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const profileInfo = {
          full_name: data.full_name || '',
          username: data.username || '',
          email: data.email || user.email || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url || '',
          bio: data.bio || '',
          skill_level: data.skill_level || '',
          points: data.points || 0,
          referral_code: data.referral_code || '',
        };
        setProfileData(profileInfo);
        setEditData({ ...profileInfo });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        // Set the URI in edit data
        setEditData((prev) => ({
          ...prev,
          avatar_url: imageUri,
        }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSaveProfile = async () => {
    if (!editData.full_name || !editData.username) {
      Alert.alert('Validation Error', 'Name and username are required');
      return;
    }

    try {
      setIsSaving(true);

      const updateData = {
        full_name: editData.full_name,
        username: editData.username,
        phone: editData.phone,
        bio: editData.bio,
        skill_level: editData.skill_level,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      setProfileData(editData);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (err) {
      console.error('Error saving profile:', err);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({ ...profileData });
    setIsEditing(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.slate950} />

      <LinearGradient
        colors={[Colors.slate950, Colors.slate900]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.backButton} />
        <Text style={styles.headerTitle}>PROFILE</Text>
        <View style={styles.headerButton} />
      </LinearGradient>

      <ScrollView style={[styles.content, { backgroundColor: Colors.slate950 }]} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.lime400} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : (
          <>
            {/* Avatar Section with Background Banner */}
            <ImageBackground
              source={require('../assets/518273417_1299120308450648_686096007508941878_n.jpg')}
              style={styles.avatarSection}
              imageStyle={styles.bannerImage}
            >
              <LinearGradient
                colors={['rgba(51, 65, 85, 0.75)', 'rgba(30, 41, 59, 0.85)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.bannerOverlay}
              >
                <TouchableOpacity
                  onPress={handlePickImage}
                  style={styles.editProfileButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={18} color={Colors.white} />
                </TouchableOpacity>

                <View style={styles.profileHeader}>
                  <View style={styles.avatarContainer}>
                    <Image
                      source={{
                        uri: editData.avatar_url
                          ? editData.avatar_url
                          : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`,
                      }}
                      style={styles.avatar}
                    />
                  </View>
                  
                  <View style={styles.profileInfo}>
                    <Text style={styles.fullName}>{editData.full_name}</Text>
                    <Text style={styles.username}>@{editData.username}</Text>
                    <View style={styles.badgeRow}>
                      {editData.skill_level && (
                        <View style={styles.skillBadge}>
                          <Text style={styles.skillBadgeText}>{editData.skill_level}</Text>
                        </View>
                      )}
                      <View style={styles.pointsBadge}>
                        <Ionicons name="star" size={14} color={Colors.lime400} />
                        <Text style={styles.pointsText}>{profileData.points || 0} pts</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>

            {/* Form Section */}
            <View style={[styles.formSection, { backgroundColor: Colors.slate950 }]}>
              {/* Full Name */}
              <View style={styles.fieldContainer}>
                <View style={styles.fieldLabel}>
                  <Ionicons name="person" size={18} color={Colors.lime400} />
                  <Text style={styles.labelText}>Full Name</Text>
                </View>
                {isEditing ? (
                  <TextInput
                    style={styles.textInput}
                    value={editData.full_name}
                    onChangeText={(text) =>
                      setEditData((prev) => ({ ...prev, full_name: text }))
                    }
                    placeholder="Enter your full name"
                    placeholderTextColor={Colors.slate400}
                  />
                ) : (
                  <Text style={styles.fieldValue}>{profileData.full_name}</Text>
                )}
              </View>

              {/* Username */}
              <View style={styles.fieldContainer}>
                <View style={styles.fieldLabel}>
                  <Ionicons name="at" size={18} color={Colors.lime400} />
                  <Text style={styles.labelText}>Username</Text>
                </View>
                {isEditing ? (
                  <TextInput
                    style={styles.textInput}
                    value={editData.username}
                    onChangeText={(text) =>
                      setEditData((prev) => ({ ...prev, username: text }))
                    }
                    placeholder="Enter your username"
                    placeholderTextColor={Colors.slate400}
                  />
                ) : (
                  <Text style={styles.fieldValue}>@{profileData.username}</Text>
                )}
              </View>

              {/* Email */}
              <View style={styles.fieldContainer}>
                <View style={styles.fieldLabel}>
                  <Ionicons name="mail" size={18} color={Colors.lime400} />
                  <Text style={styles.labelText}>Email</Text>
                </View>
                <Text style={styles.fieldValueDisabled}>{profileData.email}</Text>
                <Text style={styles.fieldHelper}>Email cannot be changed</Text>
              </View>

              {/* Phone */}
              <View style={styles.fieldContainer}>
                <View style={styles.fieldLabel}>
                  <Ionicons name="call" size={18} color={Colors.lime400} />
                  <Text style={styles.labelText}>Phone</Text>
                </View>
                {isEditing ? (
                  <TextInput
                    style={styles.textInput}
                    value={editData.phone}
                    onChangeText={(text) =>
                      setEditData((prev) => ({ ...prev, phone: text }))
                    }
                    placeholder="Enter your phone number"
                    placeholderTextColor={Colors.slate400}
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={styles.fieldValue}>{profileData.phone || 'Not provided'}</Text>
                )}
              </View>

              {/* Bio */}
              <View style={styles.fieldContainer}>
                <View style={styles.fieldLabel}>
                  <Ionicons name="document-text" size={18} color={Colors.lime400} />
                  <Text style={styles.labelText}>Bio</Text>
                </View>
                {isEditing ? (
                  <TextInput
                    style={[styles.textInput, styles.bioInput]}
                    value={editData.bio}
                    onChangeText={(text) =>
                      setEditData((prev) => ({ ...prev, bio: text }))
                    }
                    placeholder="Tell us about yourself"
                    placeholderTextColor={Colors.slate400}
                    multiline
                    numberOfLines={4}
                  />
                ) : (
                  <Text style={styles.fieldValue}>
                    {profileData.bio || 'No bio added yet'}
                  </Text>
                )}
              </View>

              {/* Skill Level */}
              <View style={styles.fieldContainer}>
                <View style={styles.fieldLabel}>
                  <Ionicons name="trophy" size={18} color={Colors.lime400} />
                  <Text style={styles.labelText}>Skill Level</Text>
                </View>
                {isEditing ? (
                  <View style={styles.skillLevelOptions}>
                    {['Beginner', 'Intermediate', 'Advanced', 'Pro'].map((level) => (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.skillOption,
                          editData.skill_level === level && styles.skillOptionSelected,
                        ]}
                        onPress={() =>
                          setEditData((prev) => ({ ...prev, skill_level: level }))
                        }
                      >
                        <Text
                          style={[
                            styles.skillOptionText,
                            editData.skill_level === level && styles.skillOptionTextSelected,
                          ]}
                        >
                          {level}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.fieldValue}>{profileData.skill_level || 'Not set'}</Text>
                )}
              </View>
            </View>

            {/* Notifications Card */}
            <TouchableOpacity
              style={styles.notificationCard}
              onPress={() => navigation.navigate('NotificationsPrefs')}
              activeOpacity={0.7}
            >
              <View style={styles.notificationCardContent}>
                <View style={styles.notificationIconContainer}>
                  <Ionicons name="notifications" size={24} color={Colors.lime400} />
                </View>
                <View style={styles.notificationTextContainer}>
                  <Text style={styles.notificationCardTitle}>Notifications</Text>
                  <Text style={styles.notificationCardDescription}>
                    Manage your notification preferences
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.slate400} />
              </View>
            </TouchableOpacity>

            {/* Action Buttons */}
            {isEditing && (
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Referral & Points Section */}
            {profileData.referral_code && (
              <View style={styles.affiliationSection}>
                <Text style={styles.affiliationHeader}>AFFILIATION PROGRAM</Text>
                <Text style={styles.affiliationTitle}>SHARE & EARN.</Text>
                <Text style={styles.affiliationDescription}>
                  Invite your pickleball community to PicklePlay and earn rewards for every signup and activity.
                </Text>

                {/* Total Points Card */}
                <View style={styles.totalPointsCard}>
                  <Text style={styles.totalPointsLabel}>YOUR TOTAL POINTS</Text>
                  <View style={styles.totalPointsRow}>
                    <Ionicons name="star" size={24} color={Colors.lime400} />
                    <Text style={styles.totalPointsValue}>{profileData.points || 0}</Text>
                  </View>
                </View>

                <View style={styles.referralRow}>
                  {/* Referral Link Section */}
                  <View style={styles.referralLinkSection}>
                    <Text style={styles.sectionLabel}>YOUR REFERRAL LINK</Text>
                    <View style={styles.linkContainer}>
                      <TouchableOpacity
                        style={styles.copyLinkButton}
                        onPress={() => {
                          Clipboard.setString(`https://www.pickleplay.ph/#/signup?ref=${profileData.referral_code}`);
                          Alert.alert('Copied!', 'Referral link copied to clipboard');
                        }}
                      >
                        <Text style={styles.copyLinkText}>COPY LINK</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.referralHashContainer}>
                      <Text style={styles.referralHashCode}>{profileData.referral_code}</Text>
                      <Text style={styles.referralHashLabel}>UNIQUE REFERRAL HASH</Text>
                    </View>
                  </View>

                  {/* Points Package Section */}
                  <View style={styles.pointsPackageSection}>
                    <Text style={styles.sectionLabel}>POINTS PACKAGE</Text>
                    
                    <View style={styles.pointsItem}>
                      <View style={styles.pointsItemLeft}>
                        <Ionicons name="person-add" size={16} color={Colors.slate500} />
                        <Text style={styles.pointsItemText}>FRIEND SIGNUP</Text>
                      </View>
                      <Text style={styles.pointsValue}>+10 pts</Text>
                    </View>

                    <View style={styles.pointsItem}>
                      <View style={styles.pointsItemLeft}>
                        <Ionicons name="calendar" size={16} color={Colors.slate500} />
                        <Text style={styles.pointsItemText}>FRIEND BOOKING</Text>
                      </View>
                      <Text style={styles.pointsValue}>+8 pts</Text>
                    </View>

                    <View style={styles.pointsItem}>
                      <View style={styles.pointsItemLeft}>
                        <Ionicons name="cart" size={16} color={Colors.slate500} />
                        <Text style={styles.pointsItemText}>FRIEND PURCHASE</Text>
                      </View>
                      <Text style={styles.pointsValue}>+5 pts</Text>
                    </View>

                    <View style={styles.pointsItem}>
                      <View style={styles.pointsItemLeft}>
                        <Ionicons name="star-outline" size={16} color={Colors.slate500} />
                        <Text style={styles.pointsItemText}>FRIEND REVIEW</Text>
                      </View>
                      <Text style={styles.pointsValue}>+3 pts</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.spacer} />
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.slate950,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.slate400,
  },
  avatarSection: {
    width: '100%',
    overflow: 'hidden',
  },
  bannerImage: {
    resizeMode: 'cover',
  },
  bannerOverlay: {
    paddingHorizontal: 28,
    paddingVertical: 74,
    position: 'relative',
    flexDirection: 'column',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    marginTop: -44,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    backgroundColor: Colors.slate600,
    borderWidth: 3,
    borderColor: Colors.lime400,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  fullName: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.slate300,
    marginBottom: 8,
  },
  editProfileButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lime400,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.lime400,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.lime400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skillBadge: {
    backgroundColor: Colors.lime400 + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  skillBadgeText: {
    color: Colors.lime400,
    fontSize: 12,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  pointsBadge: {
    backgroundColor: Colors.slate800,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pointsText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  formSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldContainer: {
    marginBottom: 18,
  },
  fieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.slate100,
  },
  textInput: {
    backgroundColor: Colors.slate800,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600',
    borderWidth: 1.5,
    borderColor: Colors.slate700,
  },
  bioInput: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  fieldValue: {
    fontSize: 14,
    color: Colors.slate100,
    fontWeight: '600',
    paddingVertical: 8,
  },
  fieldValueDisabled: {
    fontSize: 14,
    color: Colors.slate500,
    fontWeight: '600',
    paddingVertical: 8,
  },
  fieldHelper: {
    fontSize: 11,
    color: Colors.slate400,
    marginTop: 4,
  },
  skillLevelOptions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  skillOption: {
    backgroundColor: Colors.slate800,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: Colors.slate700,
  },
  skillOptionSelected: {
    backgroundColor: Colors.lime400,
    borderColor: Colors.lime400,
  },
  skillOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.slate400,
  },
  skillOptionTextSelected: {
    color: Colors.slate950,
  },
  actionButtons: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.slate700,
    backgroundColor: Colors.slate800,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.slate100,
    fontSize: 14,
    fontWeight: '800',
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.lime400,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.slate950,
    fontSize: 14,
    fontWeight: '800',
  },

  affiliationSection: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
  },
  affiliationHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7FFF',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  affiliationTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.slate950,
    marginBottom: 8,
  },
  affiliationDescription: {
    fontSize: 13,
    color: Colors.slate600,
    lineHeight: 20,
    marginBottom: 20,
  },
  totalPointsCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  totalPointsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7FFF',
    letterSpacing: 1,
    marginBottom: 8,
  },
  totalPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  totalPointsValue: {
    fontSize: 40,
    fontWeight: '900',
    color: Colors.slate950,
  },
  referralRow: {
    flexDirection: 'column',
    gap: 20,
  },
  referralLinkSection: {
    width: '100%',
  },
  pointsPackageSection: {
    width: '100%',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: 1,
    marginBottom: 12,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.slate50,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  referralLink: {
    flex: 1,
    fontSize: 11,
    color: Colors.slate600,
    fontWeight: '600',
  },
  copyLinkButton: {
    backgroundColor: Colors.slate950,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  copyLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  referralHashContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  referralHashCode: {
    fontSize: 18,
    fontWeight: '900',
    color: '#6B7FFF',
    letterSpacing: 1.5,
  },
  referralHashLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.slate400,
    letterSpacing: 0.5,
  },
  pointsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  pointsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pointsItemText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.slate700,
    letterSpacing: 0.3,
  },
  pointsValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6B7FFF',
  },

  notificationCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: Colors.slate900,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.slate800,
    overflow: 'hidden',
  },
  notificationCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  notificationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.lime400 + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 4,
  },
  notificationCardDescription: {
    fontSize: 13,
    color: Colors.slate400,
    fontWeight: '500',
  },

  spacer: {
    height: 20,
  },
});

export default ProfileScreen;
