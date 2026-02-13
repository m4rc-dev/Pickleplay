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

  // Fetch user role for coach application
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

  // Get user's first name for greeting
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
            <Image
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

        {/* Find Coaches Section */}
        <View style={styles.applyCoachSection}>
          <LinearGradient
            colors={['#DC2626', '#B91C1C']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.applyCoachGradient}
          >
            <TouchableOpacity
              style={styles.applyCoachButton}
              onPress={() => navigation.navigate('Coaches')}
              activeOpacity={0.8}
            >
              <View style={styles.applyCoachLeft}>
                <View style={styles.applyCoachIconWrapper}>
                  <MaterialIcons name="sports" size={28} color="#DC2626" />
                </View>
                <View style={styles.applyCoachTextWrapper}>
                  <Text style={styles.applyCoachTitle}>Find a Coach</Text>
                  <Text style={styles.applyCoachDescription}>
                    🎯 Book private lessons with expert coaches
                  </Text>
                </View>
              </View>
              <View style={styles.applyCoachArrow}>
                <MaterialIcons name="arrow-forward" size={24} color="#fff" />
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Tournaments Section */}
        <View style={styles.applyCoachSection}>
          <LinearGradient
            colors={['#6366f1', '#4f46e5']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.applyCoachGradient}
          >
            <TouchableOpacity
              style={styles.applyCoachButton}
              onPress={() => navigation.navigate('Tournaments')}
              activeOpacity={0.8}
            >
              <View style={styles.applyCoachLeft}>
                <View style={styles.applyCoachIconWrapper}>
                  <MaterialIcons name="emoji-events" size={28} color="#6366f1" />
                </View>
                <View style={styles.applyCoachTextWrapper}>
                  <Text style={styles.applyCoachTitle}>Join Tournaments</Text>
                  <Text style={styles.applyCoachDescription}>
                    🏆 Compete with the best players in the Philippines
                  </Text>
                </View>
              </View>
              <View style={styles.applyCoachArrow}>
                <MaterialIcons name="arrow-forward" size={24} color="#fff" />
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Professional Dashboard Button (if approved) */}
        {(isVerifiedCoach || isVerifiedCourtOwner) && (
          <View style={styles.applyCoachSection}>
            <LinearGradient
              colors={[thematicBlue, '#0D6EBD']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.applyCoachGradient}
            >
              <TouchableOpacity
                style={styles.applyCoachButton}
                onPress={() => navigation.navigate('ProfessionalDashboard')}
                activeOpacity={0.8}
              >
                <View style={styles.applyCoachLeft}>
                  <View style={styles.applyCoachIconWrapper}>
                    <MaterialIcons name="dashboard" size={28} color={thematicBlue} />
                  </View>
                  <View style={styles.applyCoachTextWrapper}>
                    <Text style={styles.applyCoachTitle}>Professional Dashboard</Text>
                    <Text style={styles.applyCoachDescription}>
                      {isVerifiedCoach && isVerifiedCourtOwner 
                        ? '🎓 Coach & 🏟️ Court Owner'
                        : isVerifiedCoach 
                        ? '🎓 Manage your students'
                        : '🏟️ Manage your courts'}
                    </Text>
                  </View>
                </View>
                <View style={styles.applyCoachArrow}>
                  <MaterialIcons name="arrow-forward" size={24} color="#fff" />
                </View>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* Apply as Professional Section (show if not applied for both roles) */}
        {(!hasAppliedAsCoach || !hasAppliedAsCourtOwner) && (
          <View style={styles.applyCoachSection}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.applyCoachGradient}
            >
              <TouchableOpacity
                style={styles.applyCoachButton}
                onPress={handleApplyAsProfessional}
                activeOpacity={0.8}
              >
                <View style={styles.applyCoachLeft}>
                  <View style={styles.applyCoachIconWrapper}>
                    <MaterialIcons name="workspace-premium" size={28} color="#667eea" />
                  </View>
                  <View style={styles.applyCoachTextWrapper}>
                    <Text style={styles.applyCoachTitle}>
                      {!hasAppliedAsCoach && !hasAppliedAsCourtOwner 
                        ? 'Apply as Professional'
                        : hasAppliedAsCoach 
                        ? 'Apply as Court Owner'
                        : 'Apply as Coach'}
                    </Text>
                    <Text style={styles.applyCoachDescription}>
                      {!hasAppliedAsCoach && !hasAppliedAsCourtOwner 
                        ? '🎓 Become a coach or 🏟️ List your court'
                        : hasAppliedAsCoach 
                        ? '🏟️ List your court facility'
                        : '🎓 Teach and earn money'}
                    </Text>
                  </View>
                </View>
                <View style={styles.applyCoachArrow}>
                  <MaterialIcons name="arrow-forward" size={24} color="#fff" />
                </View>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* Pending Professional Application */}
        {(coachApplicationPending || courtOwnerApplicationPending) && (
          <View style={styles.applyCoachSection}>
            <View style={styles.pendingCoachCard}>
              <View style={styles.pendingIconWrapper}>
                <MaterialIcons name="pending" size={28} color="#FF9800" />
              </View>
              <View style={styles.pendingCoachContent}>
                <Text style={styles.pendingCoachTitle}>
                  {coachApplicationPending && courtOwnerApplicationPending 
                    ? 'Applications Under Review ⏳'
                    : 'Professional Application Under Review ⏳'}
                </Text>
                <Text style={styles.pendingCoachDescription}>
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
          </View>
        )}

        {/* Popular Courts Section */}
        <View style={styles.courtsSection}>
          <Text style={styles.sectionTitle}>Popular Courts</Text>
          {courtsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={thematicBlue} />
              <Text style={styles.loadingText}>Loading courts...</Text>
            </View>
          ) : courts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="location-off" size={32} color={thematicBlue} />
              <Text style={styles.emptyText}>No courts available</Text>
            </View>
          ) : (
            courts.map((court, index) => (
            <TouchableOpacity
              key={court.id || index}
              style={styles.courtCard}
              onPress={() => navigation.navigate('CourtDetail', {court})}>
              <Image
                source={{uri: court.imageUrl}}
                style={styles.courtImage}
                resizeMode="cover"
              />
              <View style={styles.courtInfo}>
                <Text style={styles.courtName}>{court.name}</Text>
                <View style={styles.courtLocation}>
                  <MaterialIcons
                    name="location-on"
                    size={16}
                    color={thematicBlue}
                  />
                  <Text style={styles.courtLocationText}>{court.location}</Text>
                </View>
                <StarRating rating={court.rating} reviewCount={court.reviewCount} size={12} />
              </View>
            </TouchableOpacity>
          ))
          )}
        </View>

        {/* CTA Section */}
        
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
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingBottom: 10,
  },
  heroSection: {
    backgroundColor: '#063d7a',
    margin: 15,
    padding: 25,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  videoBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroOverlay: {
    position: 'relative',
    zIndex: 1,
    alignItems: 'center',
    width: '100%',
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 0,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  findCourtsButton: {
    flexDirection: 'row',
    backgroundColor: '#a3ff01',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  findCourtsText: {
    color: thematicBlue,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  featuresSection: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: thematicBlue,
    marginBottom: 15,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  featureIcon: {
    width: 50,
    height: 50,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: thematicBlue,
    marginBottom: 3,
  },
  featureDescription: {
    fontSize: 13,
    color: thematicBlue,
    lineHeight: 18,
  },
  courtsSection: {
    margin: 15,
  },
  courtCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  courtImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: Colors.surfaceAlt,
  },
  courtInfo: {
    flex: 1,
  },
  courtName: {
    fontSize: 16,
    fontWeight: '600',
    color: thematicBlue,
    marginBottom: 5,
  },
  courtLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courtLocationText: {
    fontSize: 13,
    color: thematicBlue,
    marginLeft: 3,
  },
  courtRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: thematicBlue,
    marginLeft: 3,
    fontWeight: '500',
  },
  ctaSection: {
    backgroundColor: thematicBlue,
    margin: 15,
    padding: 25,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '500',
  },
  ctaButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  ctaButtonText: {
    color: thematicBlue,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: thematicBlue,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: thematicBlue,
  },
  applyCoachSection: {
    paddingHorizontal: 15,
    marginVertical: 20,
  },
  applyCoachGradient: {
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#764ba2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  applyCoachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  applyCoachLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  applyCoachIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  applyCoachTextWrapper: {
    flex: 1,
  },
  applyCoachTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  applyCoachDescription: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.95,
    lineHeight: 18,
  },
  applyCoachArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  pendingCoachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#FF9800',
    elevation: 4,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  pendingIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  pendingCoachContent: {
    flex: 1,
  },
  pendingCoachTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  pendingCoachDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default HomeScreen;