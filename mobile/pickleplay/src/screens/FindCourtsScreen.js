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
  TextInput,
  Dimensions,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialIcons} from '@expo/vector-icons';
import Colors from '../constants/Colors';
import commonStyles from '../styles/commonStyles';
import { getCourts } from '../services/courtService';
import StarRating from '../components/StarRating';

const {width} = Dimensions.get('window');

const DEFAULT_COURT_IMAGE = 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=60';

const FindCourtsScreen = ({ navigation, onBackNavigation }) => {
  const [currentScreenIndex, setCurrentScreenIndex] = useState(1);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
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
        location: court.location ? `${court.location.address || ''}, ${court.location.city || ''}`.replace(/^, |, $/g, '') : 'Location not set',
        rating: court.rating || 0,
        description: court.description,
        imageUrl: court.cover_image || (court.images && court.images[0]) || DEFAULT_COURT_IMAGE,
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
    
    const isMovingForward = targetIndex > currentScreenIndex;
    setCurrentScreenIndex(targetIndex);
    
    const direction = isMovingForward ? 'right' : 'left';
    navigation.navigate(screens[targetIndex], { direction, screenIndex: targetIndex });
  };

  const handleCourtPress = (court) => {
    navigation.navigate('CourtDetail', { court });
  };

  const filters = ['All', 'Indoor', 'Outdoor', 'Free', 'Premium'];

  const filteredCourts = courts.filter(court => {
    const matchesSearch = court.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         court.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedFilter === 'All') return matchesSearch;
    if (selectedFilter === 'Indoor') return matchesSearch && court.type === 'Indoor';
    if (selectedFilter === 'Outdoor') return matchesSearch && court.type === 'Outdoor';
    if (selectedFilter === 'Free') return matchesSearch && court.isFree;
    if (selectedFilter === 'Premium') return matchesSearch && !court.isFree;
    
    return matchesSearch;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.slate950} />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[Colors.lime400]}
            tintColor={Colors.lime400}
          />
        }
      >
        {/* Hero Header Section */}
        <LinearGradient
          colors={[Colors.slate950, Colors.slate900]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.heroContent}>
            <Text style={styles.headerLabel}>DISCOVER COURTS</Text>
            <View>
              <Text style={styles.headerTitle}>FIND</Text>
              <Text style={styles.headerTitleBold}>YOUR COURT.</Text>
            </View>
            <Text style={styles.headerSubtitle}>Browse premium pickleball courts across the Philippines</Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={16} color={Colors.slate400} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search courts or locations..."
              placeholderTextColor={Colors.slate500}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <MaterialIcons name="close" size={16} color={Colors.slate400} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={styles.filterContent}
          >
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  selectedFilter === filter && styles.filterButtonActive
                ]}
                onPress={() => setSelectedFilter(filter)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.filterText,
                  selectedFilter === filter && styles.filterTextActive
                ]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </LinearGradient>

        {/* Courts List */}
        {loading && !refreshing ? (
          <View style={commonStyles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.lime400} />
            <Text style={commonStyles.loadingText}>Loading courts...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorIconBg}>
              <MaterialIcons name="error-outline" size={40} color={Colors.error} />
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchCourts}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : filteredCourts.length === 0 ? (
          <View style={commonStyles.emptyContainer}>
            <View style={commonStyles.emptyIconBg}>
              <MaterialIcons name="location-off" size={40} color={Colors.slate400} />
            </View>
            <Text style={commonStyles.emptyText}>
              {searchQuery ? 'No courts found' : 'No courts available'}
            </Text>
            <Text style={commonStyles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Check back later for updates'}
            </Text>
          </View>
        ) : (
          <View style={styles.courtsSection}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {filteredCourts.length} {filteredCourts.length === 1 ? 'Court' : 'Courts'} Found
              </Text>
              <TouchableOpacity 
                style={styles.mapViewButton}
                onPress={() => navigation.navigate('Map')}
                activeOpacity={0.8}
              >
                <MaterialIcons name="map" size={18} color={Colors.blue600} />
                <Text style={styles.mapViewText}>Map View</Text>
              </TouchableOpacity>
            </View>

            {filteredCourts.map((court) => (
              <TouchableOpacity
                key={court.id}
                style={styles.courtCard}
                onPress={() => handleCourtPress(court)}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: court.imageUrl }}
                  style={styles.courtImage}
                  resizeMode="cover"
                />
                <View style={styles.courtContent}>
                  <View style={styles.courtHeader}>
                    <View style={styles.courtTitleSection}>
                      <Text style={styles.courtName} numberOfLines={1}>
                        {court.name}
                      </Text>
                      <View style={styles.courtLocation}>
                        <MaterialIcons name="location-on" size={14} color={Colors.slate500} />
                        <Text style={styles.courtLocationText} numberOfLines={1}>
                          {court.location}
                        </Text>
                      </View>
                    </View>
                    {court.type && (
                      <View style={[
                        styles.typeBadge,
                        {backgroundColor: court.type === 'Indoor' ? '#e0f2fe' : '#f0fdf4'}
                      ]}>
                        <Text style={[
                          styles.typeBadgeText,
                          {color: court.type === 'Indoor' ? '#0369a1' : '#15803d'}
                        ]}>
                          {court.type}
                        </Text>
                      </View>
                    )}
                  </View>

                  {court.description && (
                    <Text style={styles.courtDescription} numberOfLines={2}>
                      {court.description}
                    </Text>
                  )}

                  <View style={styles.courtFooter}>
                    <StarRating rating={court.rating} reviewCount={court.reviewCount} size={14} />
                    <View style={styles.courtPrice}>
                      {court.isFree ? (
                        <Text style={styles.courtPriceFree}>FREE</Text>
                      ) : (
                        <Text style={styles.courtPriceText}>₱{court.pricePerHour}/hr</Text>
                      )}
                    </View>
                  </View>

                  {court.amenities && court.amenities.length > 0 && (
                    <View style={styles.amenitiesContainer}>
                      {court.amenities.slice(0, 3).map((amenity, index) => (
                        <View key={index} style={styles.amenityTag}>
                          <Text style={styles.amenityText}>{amenity}</Text>
                        </View>
                      ))}
                      {court.amenities.length > 3 && (
                        <View style={styles.amenityTag}>
                          <Text style={styles.amenityText}>+{court.amenities.length - 3}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  
  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  heroContent: {
    marginBottom: 24,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.lime400,
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -1,
    marginBottom: -2,
  },
  headerTitleBold: {
    fontSize: 40,
    fontWeight: '900',
    color: Colors.lime400,
    letterSpacing: -1.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.slate300,
    marginTop: 12,
    lineHeight: 20,
  },
  
  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate800,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.slate700,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: Colors.white,
    marginLeft: 6,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  
  // Filter Tabs
  filterContainer: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  filterContent: {
    paddingRight: 20,
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterButtonActive: {
    backgroundColor: Colors.lime400,
    borderColor: Colors.lime400,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  filterTextActive: {
    color: Colors.slate950,
  },
  
  // Courts Section
  courtsSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.slate700,
    letterSpacing: 0.3,
  },
  mapViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.blue600 + '15',
    borderRadius: 12,
  },
  mapViewText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.blue600,
    letterSpacing: 0.3,
  },
  
  // Court Card - Redesigned
  courtCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: Colors.slate950,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  courtImage: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.slate100,
  },
  courtContent: {
    padding: 16,
  },
  courtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  courtTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  courtName: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  courtLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courtLocationText: {
    fontSize: 13,
    color: Colors.slate600,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  courtDescription: {
    fontSize: 13,
    color: Colors.slate700,
    lineHeight: 18,
    marginBottom: 12,
  },
  courtFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  courtPrice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courtPriceFree: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.lime400,
    letterSpacing: 1,
  },
  courtPriceText: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.slate950,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityTag: {
    backgroundColor: Colors.slate100,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amenityText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.slate600,
  },
  
  // Error State
  errorContainer: {
    paddingVertical: 80,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  errorIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.slate700,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.lime400,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: 0.5,
  },
});

export default FindCourtsScreen;
