import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Linking,
} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/Colors';
import StarRating from '../components/StarRating';

// Define the new color constants for easy reuse
const thematicBlue = '#0A56A7';
const FAVORITES_KEY = '@pickleplay_favorites';

// Default values for court data
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1560743641-3914f2c45636?auto=format&fit=crop&w=1200&q=60';

const CourtDetailScreen = ({ navigation, route }) => {
  // Get court data from navigation params or use defaults
  const courtData = route?.params?.court || {};
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Mock reviews data - in production, this would come from an API
  const [reviews] = useState([
    {
      id: 1,
      userName: 'Juan Dela Cruz',
      userAvatar: 'https://randomuser.me/api/portraits/men/1.jpg',
      rating: 5,
      date: '2026-01-28',
      comment: 'Excellent court! Well-maintained surface and great lighting for evening games. The staff is very friendly.',
    },
    {
      id: 2,
      userName: 'Maria Santos',
      userAvatar: 'https://randomuser.me/api/portraits/women/2.jpg',
      rating: 4,
      date: '2026-01-25',
      comment: 'Good location and nice facilities. Parking can be a bit tricky during weekends but overall a great experience.',
    },
    {
      id: 3,
      userName: 'Carlos Reyes',
      userAvatar: 'https://randomuser.me/api/portraits/men/3.jpg',
      rating: 5,
      date: '2026-01-20',
      comment: 'Best pickleball court in the area! Love playing here with friends. Highly recommended!',
    },
  ]);
  
  const court = {
    id: courtData.id,
    name: courtData.name || 'Pickleball Court',
    location: courtData.location || courtData.city || 'Location not available',
    rating: courtData.rating || 0,
    reviewCount: courtData.reviewCount || courtData.review_count,
    imageUrl: courtData.imageUrl || courtData.cover_image || DEFAULT_IMAGE,
    description: courtData.description || 'A great pickleball court with excellent facilities.',
    amenities: courtData.amenities || [],
    type: courtData.type || 'outdoor',
    surface: courtData.surface || 'concrete',
    numberOfCourts: courtData.numberOfCourts || courtData.number_of_courts || 1,
    isFree: courtData.isFree ?? courtData.is_free ?? false,
    pricePerHour: courtData.pricePerHour || courtData.price_per_hour,
    phoneNumber: courtData.phoneNumber || courtData.phone_number,
    email: courtData.email,
    website: courtData.website,
    requiresBooking: courtData.requiresBooking ?? courtData.requires_booking ?? false,
    hoursOfOperation: courtData.hoursOfOperation || courtData.hours_of_operation,
    address: courtData.address,
    city: courtData.city,
    country: courtData.country,
    latitude: courtData.latitude,
    longitude: courtData.longitude,
  };

  // Check if court is in favorites on mount
  useEffect(() => {
    checkIfFavorite();
  }, []);

  const checkIfFavorite = async () => {
    try {
      const storedFavorites = await AsyncStorage.getItem(FAVORITES_KEY);
      if (storedFavorites) {
        const favorites = JSON.parse(storedFavorites);
        setIsFavorite(favorites.some((fav) => fav.id === court.id));
      }
    } catch (error) {
      console.error('Error checking favorites:', error);
    }
  };

  const toggleFavorite = async () => {
    try {
      const storedFavorites = await AsyncStorage.getItem(FAVORITES_KEY);
      let favorites = storedFavorites ? JSON.parse(storedFavorites) : [];
      
      if (isFavorite) {
        // Remove from favorites
        favorites = favorites.filter((fav) => fav.id !== court.id);
      } else {
        // Add to favorites
        favorites.push({
          ...court,
          addedAt: new Date().toISOString(),
        });
      }
      
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Format hours of operation
  const formatHours = () => {
    if (!court.hoursOfOperation) return 'Hours not available';
    if (typeof court.hoursOfOperation === 'string') return court.hoursOfOperation;
    
    try {
      const days = Object.keys(court.hoursOfOperation);
      if (days.length === 0) return 'Hours not available';
      
      const firstDay = court.hoursOfOperation[days[0]];
      if (firstDay && firstDay.open && firstDay.close) {
        return `${firstDay.open} - ${firstDay.close}`;
      }
      return 'Hours not available';
    } catch {
      return 'Hours not available';
    }
  };

  // Handle phone call
  const handleCall = () => {
    if (court.phoneNumber) {
      Linking.openURL(`tel:${court.phoneNumber}`);
    }
  };

  // Handle email
  const handleEmail = () => {
    if (court.email) {
      Linking.openURL(`mailto:${court.email}`);
    }
  };

  // Handle website
  const handleWebsite = () => {
    if (court.website) {
      Linking.openURL(court.website);
    }
  };

  // Handle directions - navigate to MapScreen with directions
  const handleDirections = () => {
    if (court.latitude && court.longitude) {
      navigation.navigate('Map', {
        showDirections: true,
        court: {
          id: court.id,
          name: court.name,
          latitude: court.latitude,
          longitude: court.longitude,
          location: court.location,
          address: court.address,
        },
      });
    } else if (court.address) {
      // Fallback to external maps if no coordinates
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(court.address)}`;
      Linking.openURL(url);
    }
  };

  // Handle booking
  const handleBook = () => {
    navigation.navigate('Booking', { court });
  };

  // Format price
  const formatPrice = () => {
    if (court.isFree) return 'Free';
    if (court.pricePerHour) return `₱${court.pricePerHour}/hour`;
    return 'Contact for pricing';
  };

  // Get amenity icon
  const getAmenityIcon = (amenity) => {
    const amenityLower = amenity?.toLowerCase() || '';
    if (amenityLower.includes('parking')) return 'local-parking';
    if (amenityLower.includes('restroom') || amenityLower.includes('toilet')) return 'wc';
    if (amenityLower.includes('light')) return 'wb-incandescent';
    if (amenityLower.includes('water') || amenityLower.includes('drink')) return 'local-drink';
    if (amenityLower.includes('wifi')) return 'wifi';
    if (amenityLower.includes('shower')) return 'shower';
    if (amenityLower.includes('locker')) return 'lock';
    if (amenityLower.includes('food') || amenityLower.includes('cafe')) return 'restaurant';
    return 'check-circle';
  };

  // Handle back navigation
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('FindCourts');
    }
  };

  return (
    <View style={styles.container}>
      {/* Updated StatusBar color */}
      <StatusBar barStyle="light-content" backgroundColor={thematicBlue} />

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <MaterialIcons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Favorite Button */}
      <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorite}>
        <MaterialIcons 
          name={isFavorite ? "favorite" : "favorite-border"} 
          size={24} 
          color={isFavorite ? "#FF4444" : "#fff"} 
        />
      </TouchableOpacity>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Court Image */}
        <Image
          source={{uri: court.imageUrl}}
          style={styles.courtHeroImage}
          resizeMode="cover"
        />
        
        {/* Court Details */}
        <View style={styles.courtDetails}>
          <Text style={styles.courtName}>{court.name}</Text>
          
          <TouchableOpacity style={styles.courtLocation} onPress={handleDirections}>
            <MaterialIcons name="location-on" size={20} color={thematicBlue} />
            <Text style={styles.courtLocationText}>{court.location}</Text>
            <MaterialIcons name="directions" size={18} color={thematicBlue} style={styles.directionsIcon} />
          </TouchableOpacity>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <StarRating rating={court.rating} reviewCount={court.reviewCount} size={16} />
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="sports-tennis" size={20} color={thematicBlue} />
              <Text style={styles.statText}>{court.numberOfCourts} {court.numberOfCourts === 1 ? 'Court' : 'Courts'}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="attach-money" size={20} color={thematicBlue} />
              <Text style={styles.statText}>{formatPrice()}</Text>
            </View>
          </View>
          
          {/* Court Type & Surface */}
          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{court.type?.charAt(0).toUpperCase() + court.type?.slice(1) || 'Outdoor'}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{court.surface?.replace('_', ' ').charAt(0).toUpperCase() + court.surface?.replace('_', ' ').slice(1) || 'Concrete'}</Text>
            </View>
            {court.requiresBooking && (
              <View style={[styles.tag, styles.bookingTag]}>
                <Text style={styles.tagText}>Booking Required</Text>
              </View>
            )}
          </View>
          
          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Court</Text>
            <Text style={styles.sectionText}>{court.description}</Text>
          </View>
          
          {/* Hours Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hours of Operation</Text>
            <View style={styles.infoRow}>
              <MaterialIcons name="access-time" size={18} color={thematicBlue} />
              <Text style={styles.infoText}>{formatHours()}</Text>
            </View>
          </View>
          
          {/* Amenities Section */}
          {court.amenities && court.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenitiesList}>
                {court.amenities.map((amenity, index) => (
                  <View key={index} style={styles.amenityItem}>
                    <MaterialIcons name={getAmenityIcon(amenity)} size={16} color={thematicBlue} />
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {/* Contact Section */}
          {(court.phoneNumber || court.email || court.website) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact</Text>
              {court.phoneNumber && (
                <TouchableOpacity style={styles.contactRow} onPress={handleCall}>
                  <MaterialIcons name="phone" size={18} color={thematicBlue} />
                  <Text style={styles.contactText}>{court.phoneNumber}</Text>
                </TouchableOpacity>
              )}
              {court.email && (
                <TouchableOpacity style={styles.contactRow} onPress={handleEmail}>
                  <MaterialIcons name="email" size={18} color={thematicBlue} />
                  <Text style={styles.contactText}>{court.email}</Text>
                </TouchableOpacity>
              )}
              {court.website && (
                <TouchableOpacity style={styles.contactRow} onPress={handleWebsite}>
                  <MaterialIcons name="language" size={18} color={thematicBlue} />
                  <Text style={styles.contactText}>Visit Website</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.bookButton} onPress={handleBook}>
              <Text style={styles.bookButtonText}>Book This Court</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.directionsButton} onPress={handleDirections}>
              <MaterialIcons name="directions" size={20} color={thematicBlue} />
              <Text style={styles.directionsButtonText}>Directions</Text>
            </TouchableOpacity>
          </View>
          
          {/* Ratings & Reviews Section */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
              <TouchableOpacity style={styles.writeReviewButton}>
                <MaterialIcons name="rate-review" size={16} color={thematicBlue} />
                <Text style={styles.writeReviewText}>Write Review</Text>
              </TouchableOpacity>
            </View>
            
            {/* Rating Summary */}
            <View style={styles.ratingSummary}>
              <View style={styles.ratingBig}>
                <Text style={styles.ratingBigNumber}>{court.rating?.toFixed(1) || '0.0'}</Text>
                <StarRating rating={court.rating} size={20} showRatingNumber={false} />
                <Text style={styles.ratingCount}>{court.reviewCount || reviews.length} reviews</Text>
              </View>
              <View style={styles.ratingBars}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.filter(r => r.rating === star).length;
                  const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <View key={star} style={styles.ratingBarRow}>
                      <Text style={styles.ratingBarLabel}>{star}</Text>
                      <MaterialIcons name="star" size={12} color="#FBBC04" />
                      <View style={styles.ratingBarTrack}>
                        <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
            
            {/* Reviews List */}
            <View style={styles.reviewsList}>
              {reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Image 
                      source={{ uri: review.userAvatar }} 
                      style={styles.reviewerAvatar} 
                    />
                    <View style={styles.reviewerInfo}>
                      <Text style={styles.reviewerName}>{review.userName}</Text>
                      <View style={styles.reviewMeta}>
                        <StarRating rating={review.rating} size={12} showRatingNumber={false} />
                        <Text style={styles.reviewDate}>
                          {new Date(review.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))}
            </View>
            
            <TouchableOpacity style={styles.seeAllReviewsButton}>
              <Text style={styles.seeAllReviewsText}>See All Reviews</Text>
              <MaterialIcons name="chevron-right" size={20} color={thematicBlue} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 15,
    zIndex: 10,
    backgroundColor: thematicBlue,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  favoriteButton: {
    position: 'absolute',
    top: 40,
    right: 15,
    zIndex: 10,
    backgroundColor: thematicBlue,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flex: 1,
    paddingBottom: 10,
  },
  courtHeroImage: {
    width: '100%',
    height: 200,
  },
  courtDetails: {
    padding: 20,
  },
  courtName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: thematicBlue,
    marginBottom: 10,
  },
  courtLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  courtLocationText: {
    fontSize: 16,
    color: thematicBlue,
    marginLeft: 5,
    flex: 1,
  },
  directionsIcon: {
    marginLeft: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: thematicBlue,
    marginLeft: 5,
    fontWeight: '500',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(10, 86, 167, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  bookingTag: {
    backgroundColor: 'rgba(163, 255, 1, 0.2)',
  },
  tagText: {
    fontSize: 12,
    color: thematicBlue,
    fontWeight: '500',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: thematicBlue,
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 14,
    color: thematicBlue,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: thematicBlue,
    marginLeft: 8,
  },
  amenitiesList: {
    gap: 10,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amenityText: {
    fontSize: 14,
    color: thematicBlue,
    marginLeft: 10,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactText: {
    fontSize: 14,
    color: thematicBlue,
    marginLeft: 10,
    textDecorationLine: 'underline',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 25,
  },
  directionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 86, 167, 0.1)',
    paddingVertical: 15,
    borderRadius: 25,
    gap: 8,
  },
  directionsButtonText: {
    color: thematicBlue,
    fontSize: 14,
    fontWeight: '600',
  },
  bookButton: {
    flex: 2,
    backgroundColor: thematicBlue,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  bookButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Reviews Section Styles
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 86, 167, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
  },
  writeReviewText: {
    fontSize: 12,
    color: thematicBlue,
    fontWeight: '500',
  },
  ratingSummary: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  ratingBig: {
    alignItems: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  ratingBigNumber: {
    fontSize: 42,
    fontWeight: 'bold',
    color: thematicBlue,
  },
  ratingCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  ratingBars: {
    flex: 1,
    paddingLeft: 15,
    justifyContent: 'center',
    gap: 4,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingBarLabel: {
    fontSize: 11,
    color: '#666',
    width: 10,
  },
  ratingBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#FBBC04',
    borderRadius: 3,
  },
  reviewsList: {
    gap: 15,
  },
  reviewCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#E0E0E0',
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewDate: {
    fontSize: 11,
    color: '#999',
  },
  reviewComment: {
    fontSize: 13,
    color: '#444',
    lineHeight: 20,
  },
  seeAllReviewsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    paddingVertical: 10,
  },
  seeAllReviewsText: {
    fontSize: 14,
    color: thematicBlue,
    fontWeight: '600',
  },
});

export default CourtDetailScreen;
