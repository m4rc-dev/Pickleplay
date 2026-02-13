import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialIcons, MaterialCommunityIcons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

const ProfileScreen = ({ navigation, onBackNavigation }) => {
  const [currentScreenIndex, setCurrentScreenIndex] = useState(4);
  const screens = ['Home', 'Find', 'Map', 'Shop', 'Profile'];
  const { user, signOut } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [isVerifiedCoach, setIsVerifiedCoach] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    fetchUserRole();
    fetchProfileData();
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('active_role, roles')
        .eq('id', user.id)
        .single();

      if (data) {
        setUserRole(data.active_role);
        setIsVerifiedCoach(data.roles?.includes('COACH') || false);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchProfileData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfileData(data);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload a profile picture.');
        return;
      }

      // Show options: Camera or Gallery
      Alert.alert(
        'Upload Profile Picture',
        'Choose an option',
        [
          {
            text: 'Take Photo',
            onPress: takePhoto,
          },
          {
            text: 'Choose from Gallery',
            onPress: selectFromGallery,
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error in pickImage:', error);
      Alert.alert('Error', 'Failed to open image picker');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera permissions to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const selectFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting from gallery:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const uploadAvatar = async (imageUri) => {
    if (!user?.id) return;

    try {
      setUploadingAvatar(true);

      // Read the image as base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Convert blob to ArrayBuffer
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      // Generate unique filename (without subfolder)
      const fileExt = imageUri.split('.').pop() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      // Upload to Supabase storage (avatars bucket)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true, // Allow overwriting old avatars
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw updateError;
      }

      // Refresh profile data
      await fetchProfileData();

      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert(
        'Upload Error', 
        error.message || 'Failed to upload profile picture. Please check your internet connection and try again.'
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Get user display info from auth metadata
  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.user_metadata?.first_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim();
    }
    return user?.email?.split('@')[0] || 'Player';
  };

  const playerStats = {
    name: getUserDisplayName(),
    email: user?.email || 'No email',
    profileImage: user?.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    ranking: 'Gold',
    rankingTier: 2,
    experience: 650,
    experienceRequired: 1000,
    wins: 28,
    losses: 14,
    rating: 4.8,
    gamesPlayed: 42,
    friends: 12,
    winRate: 66.7,
    avgScore: 21,
  };

  const getRankColor = (ranking) => {
    const ranks = {
      'Bronze': ['#CD7F32', '#8B4513'],
      'Silver': ['#C0C0C0', '#808080'],
      'Gold': ['#FFD700', '#FFA500'],
      'Platinum': ['#E5E4E2', '#A0B2C6'],
      'Diamond': ['#B9F2FF', '#00CED1'],
      'Master': ['#9B30FF', '#4B0082'],
    };
    return ranks[ranking] || ['#667eea', '#764ba2'];
  };

  const getRankIcon = (ranking) => {
    const rankIcons = {
      'Bronze': 'shield',
      'Silver': 'shield',
      'Gold': 'shield',
      'Platinum': 'diamond',
      'Diamond': 'diamond',
      'Master': 'crown',
    };
    return rankIcons[ranking] || 'shield';
  };

  const getSkillPercentage = (level) => {
    const levels = {
      'beginner': 20,
      'intermediate': 45,
      'advanced': 70,
      'expert': 85,
      'pro': 100,
      'bronze': 20,
      'silver': 40,
      'gold': 60,
      'platinum': 80,
      'diamond': 90,
      'master': 100,
    };
    return levels[level?.toLowerCase()] || 50;
  };

  const calculatePower = (stats) => {
    return Math.round((stats.wins * 10 + (stats.mvp || 0) * 50 + (stats.tournaments || 0) * 100) / 10);
  };

  const navigateWithDirection = (targetIndex) => {
    if (targetIndex === currentScreenIndex) return;
    const isMovingForward = targetIndex > currentScreenIndex;
    setCurrentScreenIndex(targetIndex);
    const direction = isMovingForward ? 'right' : 'left';
    navigation.navigate(screens[targetIndex], { direction, screenIndex: targetIndex });
  };

  const handleBackPress = () => {
    if (onBackNavigation) {
      onBackNavigation();
    } else if (navigation && navigation.navigate) {
      navigation.navigate('Home', { direction: 'left', screenIndex: 0 });
    }
  };

  const profileOptions = [
    {
      icon: 'person',
      title: 'Personal Information',
      description: 'Update your profile details',
      screen: 'PersonalInformation',
    },
    {
      icon: 'settings',
      title: 'Settings',
      description: 'Manage app preferences',
      screen: 'Settings',
    },
    {
      icon: 'notifications',
      title: 'Notifications',
      description: 'Configure notification settings',
      screen: 'NotificationsPrefs',
    },
    {
      icon: 'security',
      title: 'Privacy & Security',
      description: 'Manage your privacy settings',
      screen: 'PrivacySecurity',
    },
    {
      icon: 'help',
      title: 'Help & Support',
      description: 'Get help with the app',
      screen: 'HelpSupport',
    },
    {
      icon: 'info',
      title: 'About',
      description: 'App version and information',
      screen: 'About',
    },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // Navigation will be handled by auth state change
              navigation.reset({
                index: 0,
                routes: [{ name: 'Landing' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const StatCard = ({ icon, label, value, backgroundColor }) => (
    <View style={[styles.statCard, { backgroundColor }]}>
      <MaterialIcons name={icon} size={28} color={Colors.white} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={thematicBlue} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Background Gradient Profile */}
        <LinearGradient
          colors={[thematicBlue, '#0D6EBD', '#15ce2e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileGradient}
        >
          {/* Decorative Elements */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
          
          {/* Header Section */}
          <View style={styles.headerSection}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: profileData?.avatar_url || user?.user_metadata?.avatar_url || playerStats.profileImage }} 
                style={styles.avatar} 
              />
              <View style={styles.onlineIndicator} />
              
              {/* Camera Button */}
              <TouchableOpacity 
                style={styles.cameraButton}
                onPress={pickImage}
                disabled={uploadingAvatar}
                activeOpacity={0.7}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name="camera-alt" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>

            {/* Player Info */}
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{getUserDisplayName()}</Text>
              <Text style={styles.usernameText}>@{user?.email?.split('@')[0] || 'player'}</Text>
              
              {/* Roles */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.rolesScrollView}
                contentContainerStyle={styles.rolesContainer}
              >
                {(profileData?.roles || ['Singles', 'Doubles']).map((role, index) => (
                  <View key={index} style={styles.roleTag}>
                    <Text style={styles.roleText}>{role}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Rank Badge */}
            <View style={styles.rankContainer}>
              <View style={styles.rankBadgeWrapper}>
                <LinearGradient
                  colors={getRankColor(profileData?.rank || playerStats.ranking)}
                  style={styles.rankBadgeGradient}
                >
                  <MaterialCommunityIcons 
                    name={getRankIcon(profileData?.rank || playerStats.ranking)} 
                    size={28} 
                    color="#fff" 
                  />
                </LinearGradient>
                <View style={styles.rankGlow} />
              </View>
              <Text style={styles.rankText}>{profileData?.rank || playerStats.ranking}</Text>
              <View style={styles.ratingRow}>
                <MaterialIcons name="star" size={14} color={activeColor} />
                <Text style={styles.ratingText}>{(profileData?.rating || playerStats.rating).toFixed(1)}</Text>
              </View>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profileData?.total_matches || playerStats.gamesPlayed}</Text>
                <Text style={styles.statLabel}>Matches</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profileData?.total_wins || playerStats.wins}</Text>
                <Text style={styles.statLabel}>Wins</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: activeColor }]}>{(profileData?.win_rate || playerStats.winRate).toFixed(1)}%</Text>
                <Text style={styles.statLabel}>Win Rate</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profileData?.total_aces || 0}</Text>
                <Text style={styles.statLabel}>Aces</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profileData?.tournaments_played || 0}</Text>
                <Text style={styles.statLabel}>Tournaments</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: activeColor }]}>{profileData?.mvp_awards || 0}</Text>
                <Text style={styles.statLabel}>MVP</Text>
              </View>
            </View>
          </View>

          {/* Skill Level Bar */}
          <View style={styles.skillSection}>
            <View style={styles.skillHeader}>
              <Text style={styles.skillLabel}>SKILL LEVEL</Text>
              <Text style={styles.skillValue}>{profileData?.skill_level || playerStats.ranking}</Text>
            </View>
            <View style={styles.skillBarContainer}>
              <LinearGradient
                colors={[activeColor, '#7CFC00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.skillBarFill, { width: `${getSkillPercentage(profileData?.skill_level || playerStats.ranking)}%` }]}
              />
            </View>
          </View>

          {/* Achievements/Badges Section */}
          <View style={styles.badgesSection}>
            <Text style={styles.sectionTitleAchievements}>🏆 ACHIEVEMENTS</Text>
            <View style={styles.badgesContainer}>
              <View style={styles.badgeItem}>
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.badgeIconLarge}
                >
                  <MaterialIcons name="emoji-events" size={22} color="#fff" />
                </LinearGradient>
                <Text style={styles.badgeNameVisible}>{playerStats.ranking} Ranked</Text>
              </View>
              <View style={styles.badgeItem}>
                <LinearGradient
                  colors={['#E91E63', '#9C27B0']}
                  style={styles.badgeIconLarge}
                >
                  <MaterialIcons name="local-fire-department" size={22} color="#fff" />
                </LinearGradient>
                <Text style={styles.badgeNameVisible}>5 Win Streak</Text>
              </View>
              <View style={styles.badgeItem}>
                <LinearGradient
                  colors={['#00BCD4', '#0097A7']}
                  style={styles.badgeIconLarge}
                >
                  <MaterialIcons name="sports-tennis" size={22} color="#fff" />
                </LinearGradient>
                <Text style={styles.badgeNameVisible}>Pro Player</Text>
              </View>
            </View>
          </View>

          {/* Footer Stats */}
          <View style={styles.footerStats}>
            <View style={styles.footerStatItem}>
              <MaterialIcons name="sports-tennis" size={16} color={activeColor} />
              <Text style={styles.footerStatText}>Power: {calculatePower(playerStats)}</Text>
            </View>
            <View style={styles.footerStatItem}>
              <MaterialIcons name="trending-up" size={16} color={activeColor} />
              <Text style={styles.footerStatText}>Streak: 5W</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Role-Based Access Buttons */}
        {(userRole === 'court_owner' || userRole === 'both') && (
          <View style={styles.roleAccessSection}>
            <TouchableOpacity
              style={styles.roleButton}
              onPress={() => navigation.navigate('CourtOwner')}
            >
              <View style={styles.roleButtonIcon}>
                <MaterialIcons name="domain" size={28} color={thematicBlue} />
              </View>
              <View style={styles.roleButtonContent}>
                <Text style={styles.roleButtonTitle}>Court Owner Dashboard</Text>
                <Text style={styles.roleButtonDescription}>Manage your courts and bookings</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#ccc" />
            </TouchableOpacity>
          </View>
        )}

        {(userRole === 'coach' || userRole === 'both') && isVerifiedCoach && (
          <View style={styles.roleAccessSection}>
            <TouchableOpacity
              style={styles.roleButton}
              onPress={() => navigation.navigate('Coach')}
            >
              <View style={styles.roleButtonIcon}>
                <MaterialIcons name="school" size={28} color={thematicBlue} />
              </View>
              <View style={styles.roleButtonContent}>
                <View style={styles.coachTitleRow}>
                  <Text style={styles.roleButtonTitle}>Coach Dashboard</Text>
                  <MaterialIcons name="verified" size={16} color="#4CAF50" />
                </View>
                <Text style={styles.roleButtonDescription}>Manage your students and sessions</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#ccc" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: thematicBlue,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  
  // Profile Gradient Styles
  profileGradient: {
    flex: 1,
    padding: 20,
    paddingBottom: 30,
    position: 'relative',
    overflow: 'hidden',
    minHeight: '100%',
  },
  decorCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  
  // Header Section
  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00FF00',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cameraButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: thematicBlue,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  playerInfo: {
    flex: 1,
    marginLeft: 14,
    marginTop: 4,
  },
  playerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  usernameText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  rolesScrollView: {
    maxWidth: '100%',
    maxHeight: 20,
  },
  rolesContainer: {
    flexDirection: 'row',
    gap: 3,
    paddingRight: 10,
    alignItems: 'center',
  },
  roleTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 12,
  },
  
  // Rank Badge
  rankContainer: {
    alignItems: 'center',
    marginLeft: 8,
    minWidth: 70,
  },
  rankBadgeWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  rankGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    zIndex: -1,
  },
  rankText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 6,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 2,
  },

  // Stats Section
  statsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginVertical: 6,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Skill Section
  skillSection: {
    marginBottom: 16,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skillLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
  },
  skillValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: activeColor,
    textAlign: 'right',
    minWidth: 80,
  },
  skillBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  skillBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Badges Section
  badgesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  sectionTitleAchievements: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 1,
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 25,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  badgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconLarge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    maxWidth: 100,
  },
  badgeNameVisible: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Footer Stats
  footerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 12,
    marginTop: 4,
  },
  footerStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  rankBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rankBadgeText: {
    color: '#333',
    fontSize: 10,
    fontWeight: 'bold',
  },
  editProfileButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    backgroundColor: thematicBlue,
    borderRadius: 15,
    padding: 5,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 5,
  },
  rankingNameText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 15,
  },
  experienceContainer: {
    width: '80%',
    alignItems: 'center',
  },
  experienceBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  experienceProgress: {
    height: '100%',
    borderRadius: 4,
  },
  experienceText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  statsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: thematicBlue,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  optionsSection: {
    paddingHorizontal: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${thematicBlue}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
    color: '#888',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE5E5',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 10,
  },
  roleAccessSection: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: activeColor,
    padding: 18,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  roleButtonIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  roleButtonContent: {
    flex: 1,
  },
  coachTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: thematicBlue,
    marginBottom: 2,
  },
  roleButtonDescription: {
    fontSize: 13,
    color: thematicBlue,
    opacity: 0.8,
  },
});

export default ProfileScreen;
