import React, {useState, useEffect, useRef} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  BackHandler,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialIcons} from '@expo/vector-icons';
import {BlurView} from 'expo-blur';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { getCourts } from '../services/courtService';
import { supabase } from '../lib/supabase';
import StarRating from '../components/StarRating';
import ProfessionalApplicationModal from '../components/ProfessionalApplicationModal';

const {width} = Dimensions.get('window');

// Web-inspired hero images for carousel
const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=1920",
  "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=1920",
  "https://images.unsplash.com/photo-1511067007398-7e4b90cfa4bc?auto=format&fit=crop&q=80&w=1920"
];

const HomeScreen = ({navigation}) => {
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const [courts, setCourts] = useState([]);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const [isVerifiedCoach, setIsVerifiedCoach] = useState(false);
  const [isVerifiedCourtOwner, setIsVerifiedCourtOwner] = useState(false);
  const [coachApplicationPending, setCoachApplicationPending] = useState(false);
  const [courtOwnerApplicationPending, setCourtOwnerApplicationPending] = useState(false);
  const [hasAppliedAsCoach, setHasAppliedAsCoach] = useState(false);
  const [hasAppliedAsCourtOwner, setHasAppliedAsCourtOwner] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationType, setApplicationType] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const screens = ['Home', 'FindCourts', 'Map', 'Shop', 'Profile'];
  const { user } = useAuth();
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Hero carousel effect (matching web)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Fetch user role for professional features
  useEffect(() => {
    if (user) {
      fetchUserRole();
    }
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) return;

    try {
      // Fetch user's roles from profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setUserRoles(profileData.roles || ['PLAYER']);
        setIsVerifiedCoach(profileData.roles?.includes('COACH'));
        setIsVerifiedCourtOwner(profileData.roles?.includes('COURT_OWNER'));
      }

      // Check for all applications (pending, approved, rejected)
      const { data: applications, error: appError } = await supabase
        .from('professional_applications')
        .select('requested_role, status')
        .eq('profile_id', user.id);

      if (applications) {
        // Check if pending
        setCoachApplicationPending(applications.some(app => app.requested_role === 'COACH' && app.status === 'PENDING'));
        setCourtOwnerApplicationPending(applications.some(app => app.requested_role === 'COURT_OWNER' && app.status === 'PENDING'));
        
        // Check if applied at all (for any status)
        setHasAppliedAsCoach(applications.some(app => app.requested_role === 'COACH'));
        setHasAppliedAsCourtOwner(applications.some(app => app.requested_role === 'COURT_OWNER'));
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const handleApplyAsProfessional = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please login to apply as a professional');
      return;
    }

    setApplicationType(null); // Let user choose in the modal
    setShowApplicationModal(true);
  };

  const handleApplicationSuccess = () => {
    fetchUserRole(); // Refresh user role data
  };

  // Fetch courts from database
  useEffect(() => {
    const fetchCourts = async () => {
      try {
        setCourtsLoading(true);
        const { data, error } = await getCourts();
        if (error) {
          console.error('Error fetching courts:', error);
          return;
        }
        // Transform data and take first 5 for popular courts
        const transformedCourts = (data || []).slice(0, 5).map(court => ({
          id: court.id,
          name: court.name,
          location: court.location?.city || court.location?.address || 'Philippines',
          rating: court.rating || 0,
          imageUrl: court.cover_image || (court.images && court.images[0]) || 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=60',
          // Keep all data for navigation
          description: court.description,
          latitude: court.location?.latitude || court.latitude,
          longitude: court.location?.longitude || court.longitude,
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
          address: court.location?.address || '',
          city: court.location?.city || '',
          country: court.country,
        }));
        setCourts(transformedCourts);
      } catch (err) {
        console.error('Error fetching courts:', err);
      } finally {
        setCourtsLoading(false);
      }
    };
    fetchCourts();
  }, []);

  // Get user's first name for greet ing
  const getUserFirstName = () => {
    if (user?.user_metadata?.first_name) {
      return user.user_metadata.first_name;
    }
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Player';
  };

  const navigateWithDirection = (targetIndex) => {
    if (targetIndex === currentScreenIndex) return;
    
    // Determine transition direction
    const isMovingForward = targetIndex > currentScreenIndex;
    
    // Set the target screen index first
    setCurrentScreenIndex(targetIndex);
    
    // Navigate with appropriate direction parameter and screen index
    const direction = isMovingForward ? 'right' : 'left';
    navigation.navigate(screens[targetIndex], { direction, screenIndex: targetIndex });
  };

  const features = [
    {
      icon: 'location-on',
      title: 'Quick Matching',
      description: 'Find available courts and players instantly',
      color: Colors.lime400,
    },
    {
      icon: 'people',
      title: 'Community',
      description: 'Connect with local pickleball enthusiasts',
      color: Colors.blue600,
    },
    {
      icon: 'emoji-events',
      title: 'Tournaments',
      description: 'Participate in organized competitions',
      color: '#f59e0b',
    },
    {
      icon: 'update',
      title: 'Real-time Updates',
      description: 'Get live court availability and scores',
      color: '#8b5cf6',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.slate950} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cinematic Hero Section - Web Inspired */}
        <View style={styles.heroSection}>
          {/* Image Carousel */}
          {HERO_IMAGES.map((img, idx) => (
            <Animated.Image
              key={idx}
              source={{uri: img}}
              style={[
                styles.heroImage,
                {
                  opacity: idx === activeImageIndex ? 1 : 0,
                }
              ]}
              resizeMode="cover"
            />
          ))}
          
          {/* Dark Overlay */}
          <LinearGradient
            colors={['rgba(2,6,23,0.4)', 'rgba(2,6,23,0.1)', 'rgba(2,6,23,0.95)']}
            style={styles.heroGradient}
          />

          <View style={styles.heroContent}>
            {/* Badge */}
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>THE NATIONAL NETWORK FOR PHILIPPINES</Text>
            </View>

            {/* Title */}
            <Text style={styles.heroTitle}>PICKLEBALL</Text>
            <Text style={styles.heroTitleAccent}>PHILIPPINES.</Text>

            {/* Subtitle */}
            <Text style={styles.heroSubtitle}>
              The professional digital home for the fastest-growing sport in the Philippines. Join the elite ladder from Manila to Davao.
            </Text>

            {/* Search Button */}
            <TouchableOpacity
              style={styles.heroSearchButton}
              onPress={() => navigation.navigate('FindCourts')}
              activeOpacity={0.9}
            >
              <MaterialIcons name="search" size={20} color={Colors.slate950} />
              <Text style={styles.heroSearchText}>FIND PH DINK SPOTS</Text>
              <MaterialIcons name="arrow-forward" size={20} color={Colors.slate950} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionLabel}>WHY CHOOSE</Text>
          <Text style={styles.sectionTitle}>PICKLEPLAY?</Text>
          
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={[styles.featureIconWrapper, {backgroundColor: feature.color + '20'}]}>
                  <MaterialIcons
                    name={feature.icon}
                    size={28}
                    color={feature.color}
                  />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action Cards */}
        <View style={styles.actionsSection}>
          {/* Find Coaches Card */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Coaches')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#dc2626', '#b91c1c']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.actionGradient}
            >
              <View style={styles.actionIconBg}>
                <MaterialIcons name="sports" size={32} color="#dc2626" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Find a Coach</Text>
                <Text style={styles.actionDescription}>
                  🎯 Book private lessons with expert coaches
                </Text>
              </View>
              <MaterialIcons name="arrow-forward" size={24} color={Colors.white} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Tournaments Card */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Tournaments')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#6366f1', '#4f46e5']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.actionGradient}
            >
              <View style={styles.actionIconBg}>
                <MaterialIcons name="emoji-events" size={32} color="#6366f1" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Join Tournaments</Text>
                <Text style={styles.actionDescription}>
                  🏆 Compete with the best players in the Philippines
                </Text>
              </View>
              <MaterialIcons name="arrow-forward" size={24} color={Colors.white} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Professional Dashboard (if verified) */}
          {(isVerifiedCoach || isVerifiedCourtOwner) && (
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('ProfessionalDashboard')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[Colors.blue600, Colors.blue700]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.actionGradient}
              >
                <View style={styles.actionIconBg}>
                  <MaterialIcons name="dashboard" size={32} color={Colors.blue600} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Professional Dashboard</Text>
                  <Text style={styles.actionDescription}>
                    {isVerifiedCoach && isVerifiedCourtOwner 
                      ? '🎓 Coach & 🏟️ Court Owner'
                      : isVerifiedCoach 
                      ? '🎓 Manage your students'
                      : '🏟️ Manage your courts'}
                  </Text>
                </View>
                <MaterialIcons name="arrow-forward" size={24} color={Colors.white} />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Apply as Professional */}
          {(!hasAppliedAsCoach || !hasAppliedAsCourtOwner) && (
            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleApplyAsProfessional}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.actionGradient}
              >
                <View style={styles.actionIconBg}>
                  <MaterialIcons name="workspace-premium" size={32} color="#667eea" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>
                    {!hasAppliedAsCoach && !hasAppliedAsCourtOwner 
                      ? 'Apply as Professional'
                      : hasAppliedAsCoach 
                      ? 'Apply as Court Owner'
                      : 'Apply as Coach'}
                  </Text>
                  <Text style={styles.actionDescription}>
                    {!hasAppliedAsCoach && !hasAppliedAsCourtOwner 
                      ? '🎓 Become a coach or 🏟️ List your court'
                      : hasAppliedAsCoach 
                      ? '🏟️ List your court facility'
                      : '🎓 Teach and earn money'}
                  </Text>
                </View>
                <MaterialIcons name="arrow-forward" size={24} color={Colors.white} />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Pending Application Alert */}
        {(coachApplicationPending || courtOwnerApplicationPending) && (
          <View style={styles.pendingAlert}>
            <View style={styles.pendingIconContainer}>
              <MaterialIcons name="pending" size={24} color="#f59e0b" />
            </View>
            <View style={styles.pendingContent}>
              <Text style={styles.pendingTitle}>
                {coachApplicationPending && courtOwnerApplicationPending 
                  ? 'Applications Under Review'
                  : 'Professional Application Under Review'}
              </Text>
              <Text style={styles.pendingDescription}>
                Our team is reviewing your {
                  coachApplicationPending && courtOwnerApplicationPending 
                    ? 'coach and court owner applications'
                    : coachApplicationPending 
                    ? 'coach application'
                    : 'court owner application'
                }. You'll receive a notification once approved!
              </Text>
            </View>
          </View>
        )}

        {/* Popular Courts Section */}
        <View style={styles.courtsSection}>
          <Text style={styles.sectionLabel}>DISCOVER</Text>
          <Text style={styles.sectionTitle}>POPULAR COURTS</Text>
          
          {courtsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.lime400} />
              <Text style={styles.loadingText}>Loading courts...</Text>
            </View>
          ) : courts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <MaterialIcons name="location-off" size={40} color={Colors.slate400} />
              </View>
              <Text style={styles.emptyText}>No courts available</Text>
              <Text style={styles.emptySubtext}>Check back later for updates</Text>
            </View>
          ) : (
            courts.map((court, index) => (
              <TouchableOpacity
                key={court.id || index}
                style={styles.courtCard}
                onPress={() => navigation.navigate('CourtDetail', {court})}
                activeOpacity={0.9}
              >
                <Image
                  source={{uri: court.imageUrl}}
                  style={styles.courtImage}
                  resizeMode="cover"
                />
                <View style={styles.courtInfo}>
                  <Text style={styles.courtName} numberOfLines={1}>{court.name}</Text>
                  <View style={styles.courtLocation}>
                    <MaterialIcons name="location-on" size={14} color={Colors.slate500} />
                    <Text style={styles.courtLocationText}>{court.location}</Text>
                  </View>
                  <StarRating rating={court.rating} reviewCount={court.reviewCount} size={12} />
                </View>
                <MaterialIcons name="arrow-forward-ios" size={18} color={Colors.slate400} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={{height: 40}} />
      </ScrollView>

      {/* Professional Application Modal */}
      <ProfessionalApplicationModal
        visible={showApplicationModal}
        onClose={() => {
          setShowApplicationModal(false);
          setApplicationType(null);
        }}
        applicationType={applicationType}
        userId={user?.id}
        onSuccess={handleApplicationSuccess}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
  },
  
  // Cinematic Hero Section
  heroSection: {
    height: 500,
    position: 'relative',
    backgroundColor: Colors.slate950,
    overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  heroBadgeText: {
    color: Colors.lime400,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
  },
  heroTitle: {
    fontSize: 52,
    fontWeight: '900',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: -2,
    lineHeight: 52,
  },
  heroTitleAccent: {
    fontSize: 58,
    fontWeight: '900',
    color: Colors.lime400,
    textAlign: 'center',
    letterSpacing: -2,
    marginBottom: 16,
    lineHeight: 58,
  },
  heroSubtitle: {
    fontSize: 15,
    color: Colors.slate300,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  heroSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lime400,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 8,
    shadowColor: Colors.lime400,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  heroSearchText: {
    color: Colors.slate950,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // Features Section
  featuresSection: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: Colors.white,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.blue600,
    letterSpacing: 3,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -1,
    marginBottom: 24,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  featureCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 16,
  },
  featureIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  featureDescription: {
    fontSize: 13,
    color: Colors.slate600,
    lineHeight: 18,
  },

  // Action Cards Section
  actionsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionCard: {
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  actionIconBg: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  actionDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 18,
  },

  // Pending Alert
  pendingAlert: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#fef3c7',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  pendingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(245,158,11,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingContent: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 4,
  },
  pendingDescription: {
    fontSize: 13,
    color: Colors.slate700,
    lineHeight: 18,
  },

  // Courts Section
  courtsSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  courtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    marginBottom: 12,
    borderRadius: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  courtImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: Colors.slate100,
  },
  courtInfo: {
    flex: 1,
  },
  courtName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  courtLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 2,
  },
  courtLocationText: {
    fontSize: 13,
    color: Colors.slate600,
  },

  // Loading & Empty States
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.slate600,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.slate100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.slate700,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.slate500,
  },
});

export default HomeScreen;
