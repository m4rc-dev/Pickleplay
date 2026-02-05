import React, {useState, useEffect} from 'react';
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
  RefreshControl,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialIcons} from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { getCourts } from '../services/courtService';
import StarRating from '../components/StarRating';

// Define the new color constants for easy reuse
const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

// Default image for courts without images
const DEFAULT_COURT_IMAGE = 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=60';

const FindCourtsScreen = ({ navigation, onBackNavigation }) => {
  const [currentScreenIndex, setCurrentScreenIndex] = useState(1);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const screens = ['Home', 'FindCourts', 'Map', 'Shop', 'Profile'];

  // Fetch courts from Supabase
  const fetchCourts = async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await getCourts();
      
      if (fetchError) {
        console.error('Error fetching courts:', fetchError);
        setError('Failed to load courts. Please try again.');
        return;
      }
      
      // Transform the data to match the expected format
      const transformedCourts = (data || []).map(court => ({
        id: court.id,
        name: court.name,
        location: `${court.address || ''}, ${court.city || ''}`.replace(/^, |, $/g, ''),
        rating: court.rating || 0,
        description: court.description,
        imageUrl: court.cover_image || (court.images && court.images[0]) || DEFAULT_COURT_IMAGE,
        latitude: court.latitude,
        longitude: court.longitude,
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
        address: court.address,
        city: court.city,
        country: court.country,
      }));
      
      setCourts(transformedCourts);
    } catch (err) {
      console.error('Error fetching courts:', err);
      setError('Failed to load courts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCourts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCourts();
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

  const handleBackPress = () => {
    if (onBackNavigation) {
      onBackNavigation();
    } else if (navigation && navigation.navigate) {
      navigation.navigate('Home', { direction: 'left', screenIndex: 0 });
    }
  };

  return (
    <View style={styles.container}>
      {/* Updated StatusBar color */}
      <StatusBar barStyle="light-content" backgroundColor={thematicBlue} />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[thematicBlue]}
            tintColor={thematicBlue}
          />
        }
      >
        <View style={styles.courtsSection}>
          <Text style={styles.sectionTitle}>Available Courts</Text>
          
          {/* Loading State */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={thematicBlue} />
              <Text style={styles.loadingText}>Loading courts...</Text>
            </View>
          )}
          
          {/* Error State */}
          {error && !loading && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={48} color={thematicBlue} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchCourts}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Empty State */}
          {!loading && !error && courts.length === 0 && (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="sports-tennis" size={48} color={thematicBlue} />
              <Text style={styles.emptyText}>No courts available</Text>
              <Text style={styles.emptySubtext}>Pull down to refresh</Text>
            </View>
          )}
          
          {/* Courts List */}
          {!loading && !error && courts.map((court, index) => (
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
          ))}
        </View>
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: thematicBlue,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 10,
    fontSize: 14,
    color: thematicBlue,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: thematicBlue,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    color: thematicBlue,
  },
  emptySubtext: {
    marginTop: 5,
    fontSize: 12,
    color: thematicBlue,
    opacity: 0.7,
  },
  
  content: {
    flex: 1,
    paddingBottom: 10,
  },
  courtsSection: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: thematicBlue,
    marginBottom: 15,
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
});

export default FindCourtsScreen;
