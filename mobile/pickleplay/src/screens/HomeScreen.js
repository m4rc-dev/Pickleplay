import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { getCourts } from '../services/courtService';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=1920',
  'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=1920',
  'https://images.unsplash.com/photo-1511067007398-7e4b90cfa4bc?auto=format&fit=crop&q=80&w=1920',
];

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [courts, setCourts] = useState([]);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [isVerifiedCoach, setIsVerifiedCoach] = useState(false);
  const [isVerifiedCourtOwner, setIsVerifiedCourtOwner] = useState(false);

  useEffect(() => {
    fetchCourtsData();
    const imageInterval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(imageInterval);
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserRoles();
    }
  }, [user]);

  const fetchCourtsData = async () => {
    try {
      setCourtsLoading(true);
      const { data, error } = await getCourts();
      if (!error && data) {
        setCourts(data.slice(0, 6));
      }
    } catch (err) {
      console.error('Error fetching courts:', err);
    } finally {
      setCourtsLoading(false);
    }
  };

  const fetchUserRoles = async () => {
    if (!user) return;
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', user.id)
        .single();

      if (profileData && profileData.roles) {
        setIsVerifiedCoach(profileData.roles.includes('COACH'));
        setIsVerifiedCourtOwner(profileData.roles.includes('COURT_OWNER'));
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const navigateToScreen = (screenName) => {
    navigation.navigate(screenName);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.slate950} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[Colors.slate950, Colors.slate900]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.greetingSubtext}>
              {user?.email?.split('@')[0] || 'Player'}
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>4.8</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>24</Text>
              <Text style={styles.statLabel}>Games</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
          </View>
        </LinearGradient>

        {courtsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.lime600} />
          </View>
        ) : (
          <>
            <View style={styles.heroCarousel}>
              <Image
                source={{ uri: HERO_IMAGES[activeImageIndex] }}
                style={styles.heroImage}
              />
              <LinearGradient
                colors={['transparent', 'rgba(2, 6, 23, 0.8)']}
                style={styles.heroOverlay}
              />
              <View style={styles.carouselDots}>
                {HERO_IMAGES.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      index === activeImageIndex && styles.activeDot,
                    ]}
                  />
                ))}
              </View>
              <TouchableOpacity
                style={styles.heroButton}
                onPress={() => navigateToScreen('FindCourts')}
              >
                <Text style={styles.heroButtonText}>Explore Courts</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.publicStatsContainer}>
              <View style={styles.publicStatItem}>
                <Text style={styles.publicStatNumber}>5,000+</Text>
                <Text style={styles.publicStatLabel}>Courts Available</Text>
              </View>
              <View style={styles.publicStatItem}>
                <Text style={styles.publicStatNumber}>50K+</Text>
                <Text style={styles.publicStatLabel}>Active Players</Text>
              </View>
              <View style={styles.publicStatItem}>
                <Text style={styles.publicStatNumber}>100K+</Text>
                <Text style={styles.publicStatLabel}>Games Played</Text>
              </View>
            </View>

            <View style={styles.quickLinksContainer}>
              <TouchableOpacity
                style={styles.quickLink}
                onPress={() => navigateToScreen('FindCourts')}
              >
                <View style={styles.quickLinkIcon}>
                  <Ionicons name="map" size={24} color={Colors.lime600} />
                </View>
                <Text style={styles.quickLinkText}>Find Courts</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickLink}
                onPress={() => navigateToScreen('ReceiptHistory')}
              >
                <View style={styles.quickLinkIcon}>
                  <Ionicons name="calendar" size={24} color={Colors.lime600} />
                </View>
                <Text style={styles.quickLinkText}>My Bookings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickLink}
                onPress={() => navigateToScreen('Coaches')}
              >
                <View style={styles.quickLinkIcon}>
                  <Ionicons name="school" size={24} color={Colors.lime600} />
                </View>
                <Text style={styles.quickLinkText}>Find Coach</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickLink}
                onPress={() => navigateToScreen('Tournaments')}
              >
                <View style={styles.quickLinkIcon}>
                  <Ionicons name="trophy" size={24} color={Colors.lime600} />
                </View>
                <Text style={styles.quickLinkText}>Tournaments</Text>
              </TouchableOpacity>

              {isVerifiedCoach && (
                <TouchableOpacity
                  style={styles.quickLink}
                  onPress={() => navigateToScreen('ProfessionalDashboard')}
                >
                  <View style={styles.quickLinkIcon}>
                    <Ionicons name="school" size={24} color={Colors.lime600} />
                  </View>
                  <Text style={styles.quickLinkText}>Coach</Text>
                </TouchableOpacity>
              )}

              {isVerifiedCourtOwner && (
                <TouchableOpacity
                  style={styles.quickLink}
                  onPress={() => navigateToScreen('ProfessionalDashboard')}
                >
                  <View style={styles.quickLinkIcon}>
                    <Ionicons name="storefront" size={24} color={Colors.lime600} />
                  </View>
                  <Text style={styles.quickLinkText}>Courts</Text>
                </TouchableOpacity>
              )}
            </View>

            {courts.length > 0 && (
              <View style={styles.courtsSectionContainer}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="star" size={20} color={Colors.lime600} />
                  <Text style={styles.sectionTitle}>Popular Courts</Text>
                </View>

                <ScrollView
                  horizontal
                  scrollEnabled={true}
                  nestedScrollEnabled={true}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.courtsScroll}
                >
                  {courts.map((court) => (
                    <TouchableOpacity
                      key={court.id}
                      style={styles.courtCardSmall}
                      onPress={() =>
                        navigation.navigate('CourtDetail', { court })
                      }
                    >
                      <Image
                        source={{
                          uri: court.cover_image || 'https://picsum.photos/seed/court1/300/300',
                        }}
                        style={styles.courtImageSmall}
                      />
                      <View style={styles.courtCardContent}>
                        <Text style={styles.courtNameSmall} numberOfLines={2}>
                          {court.name}
                        </Text>
                        <View style={styles.ratingContainer}>
                          <Ionicons name="star" size={12} color={Colors.lime600} />
                          <Text style={styles.ratingText}>
                            {court.rating?.toFixed(1) || '4.5'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.promoSection}>
              <LinearGradient
                colors={[Colors.lime600, Colors.lime700]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.promoBanner}
              >
                <View style={styles.promoContent}>
                  <Ionicons name="flash" size={32} color={Colors.white} />
                  <View style={styles.promoText}>
                    <Text style={styles.promoTitle}>Special Offer</Text>
                    <Text style={styles.promoDescription}>
                      Get 20% off on your next booking!
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.promoButton}>
                  <Text style={styles.promoButtonText}>Claim</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* Removed larger professional banners — moved into top quick links */}
          </>
        )}
      </ScrollView>
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
  },
  heroSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingTop: 50,
  },
  greetingContainer: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  greetingSubtext: {
    fontSize: 14,
    color: Colors.slate300,
    marginTop: 4,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white + '15',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.lime600,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.slate300,
    marginTop: 2,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.white + '30',
  },
  loadingContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCarousel: {
    height: 180,
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  carouselDots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.white + '60',
  },
  activeDot: {
    width: 18,
    backgroundColor: Colors.lime600,
  },
  heroButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: Colors.lime600,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  quickLinksContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  quickLink: {
    alignItems: 'center',
    width: '30%',
  },
  quickLinkIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  quickLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.slate950,
    textAlign: 'center',
  },
  courtsSectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.slate950,
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  courtsScroll: {
    gap: 10,
  },
  courtCardSmall: {
    width: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  courtImageSmall: {
    width: '100%',
    height: 100,
    backgroundColor: Colors.slate200,
  },
  courtCardContent: {
    padding: 8,
  },
  courtNameSmall: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.lime600,
  },
  promoSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  promoBanner: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promoText: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: 2,
  },
  promoDescription: {
    fontSize: 12,
    color: Colors.white + '90',
    fontWeight: '500',
  },
  promoButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  promoButtonText: {
    color: Colors.lime600,
    fontSize: 12,
    fontWeight: '800',
  },
  professionalSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  professionalBanner: {
    borderRadius: 16,
    padding: 16,
  },
  professionalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  professionalButtonLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  professionalIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  professionalButtonText: {
    flex: 1,
  },
  professionalTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: 2,
  },
  professionalDescription: {
    fontSize: 12,
    color: Colors.white + '90',
    fontWeight: '500',
  },
  publicStatsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.white + '08',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.slate700,
  },
  publicStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  publicStatNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.lime600,
    letterSpacing: -0.5,
  },
  publicStatLabel: {
    fontSize: 10,
    color: Colors.slate400,
    marginTop: 4,
    fontWeight: '600',
  },
});

export default HomeScreen;
