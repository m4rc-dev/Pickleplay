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
  Dimensions,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/Colors';
import commonStyles from '../styles/commonStyles';
import StarRating from '../components/StarRating';
import { getCourtById, addCourtReview, getUserCourtBookings } from '../services/courtService';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const FAVORITES_KEY = '@pickleplay_favorites';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1560743641-3914f2c45636?auto=format&fit=crop&w=1200&q=60';

const CourtDetailScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const courtData = route?.params?.court || {};
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [userBookings, setUserBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);


  const [court, setCourt] = useState({
    id: courtData.id,
    name: courtData.name || 'Pickleball Court',
    location: courtData.location || courtData.city || 'Location not available',
    rating: courtData.rating || 0,
    reviewCount: courtData.reviewCount || courtData.review_count || 0,
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
  });

  useEffect(() => {
    checkIfFavorite();
    fetchCourtDetails();
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

  const fetchCourtDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await getCourtById(courtData.id);

      if (error) {
        console.error('Error fetching court details:', error);
        setLoading(false);
        return;
      }

      if (data) {
        // Update court with fresh data including calculated rating
        setCourt(prev => ({
          ...prev,
          rating: data.rating || 0,
          reviewCount: data.reviewCount || 0,
        }));

        // Transform and set reviews
        const transformedReviews = (data.court_reviews || []).map(review => ({
          id: review.id,
          userName: review.user?.full_name || 'Anonymous',
          userAvatar: review.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.user_id}`,
          rating: review.rating,
          date: review.created_at,
          comment: review.comment,
        }));

        setReviews(transformedReviews);
      }
    } catch (err) {
      console.error('Error fetching court details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReviewModal = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to submit a review');
      return;
    }

    try {
      const { data: bookings, error } = await getUserCourtBookings(user.id, court.id);

      if (error) {
        console.error('Error fetching user bookings:', error);
        Alert.alert('Error', 'Failed to check booking history');
        return;
      }

      if (!bookings || bookings.length === 0) {
        Alert.alert(
          'Booking Required',
          'You can only review courts where you have completed a booking. Book this court first to leave a review!'
        );
        return;
      }

      setUserBookings(bookings);
      setSelectedBooking(bookings[0].id);
      setShowReviewModal(true);
    } catch (err) {
      console.error('Error checking bookings:', err);
      Alert.alert('Error', 'Failed to verify booking history');
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to submit a review');
      return;
    }

    if (!newReview.comment.trim()) {
      Alert.alert('Comment Required', 'Please write a comment for your review');
      return;
    }

    if (!selectedBooking) {
      Alert.alert('Booking Required', 'Please select a booking for this review');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await addCourtReview(
        court.id,
        user.id,
        newReview.rating,
        newReview.comment,
        selectedBooking
      );

      if (error) {
        Alert.alert('Error', 'Failed to submit review. Please try again.');
        return;
      }

      Alert.alert('Success', 'Your review has been submitted!');
      setShowReviewModal(false);
      setNewReview({ rating: 5, comment: '' });
      setSelectedBooking(null);

      // Refresh court details to show new review
      fetchCourtDetails();
    } catch (err) {
      console.error('Error submitting review:', err);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFavorite = async () => {
    try {
      const storedFavorites = await AsyncStorage.getItem(FAVORITES_KEY);
      let favorites = storedFavorites ? JSON.parse(storedFavorites) : [];

      if (isFavorite) {
        favorites = favorites.filter((fav) => fav.id !== court.id);
      } else {
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

  const handleCall = () => {
    if (court.phoneNumber) {
      Linking.openURL(`tel:${court.phoneNumber}`);
    }
  };

  const handleEmail = () => {
    if (court.email) {
      Linking.openURL(`mailto:${court.email}`);
    }
  };

  const handleWebsite = () => {
    if (court.website) {
      Linking.openURL(court.website);
    }
  };

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
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(court.address)}`;
      Linking.openURL(url);
    }
  };

  const handleBook = () => {
    navigation.navigate('Booking', { court });
  };

  const formatPrice = () => {
    if (court.isFree) return 'Free';
    if (court.pricePerHour) return `₱${court.pricePerHour}/hour`;
    return 'Contact for pricing';
  };

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

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('FindCourts');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.slate950} />

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
        <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
      </TouchableOpacity>

      {/* Favorite Button */}
      <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorite} activeOpacity={0.8}>
        <MaterialIcons
          name={isFavorite ? "favorite" : "favorite-border"}
          size={24}
          color={isFavorite ? Colors.error : Colors.white}
        />
      </TouchableOpacity>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Image with Gradient Overlay */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: court.imageUrl }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(2, 6, 23, 0)', 'rgba(2, 6, 23, 0.9)']}
            style={styles.heroGradient}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{court.name}</Text>
            <TouchableOpacity style={styles.heroLocation} onPress={handleDirections} activeOpacity={0.8}>
              <View style={styles.locationIconBg}>
                <MaterialIcons name="location-on" size={16} color={Colors.lime400} />
              </View>
              <Text style={styles.heroLocationText}>{court.location}</Text>
              <MaterialIcons name="arrow-forward" size={16} color={Colors.lime400} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Court Details */}
        <View style={styles.detailsContainer}>
          {/* Quick Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconBg}>
                <MaterialIcons name="star" size={20} color="#FBBC04" />
              </View>
              <Text style={styles.statValue}>{court.rating?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconBg}>
                <MaterialIcons name="sports-tennis" size={20} color={Colors.blue600} />
              </View>
              <Text style={styles.statValue}>{court.numberOfCourts}</Text>
              <Text style={styles.statLabel}>Courts</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconBg}>
                <MaterialIcons name="attach-money" size={20} color={Colors.lime400} />
              </View>
              <Text style={styles.statValue}>{court.isFree ? 'FREE' : `₱${court.pricePerHour}`}</Text>
              <Text style={styles.statLabel}>{court.isFree ? 'Access' : 'Per Hour'}</Text>
            </View>
          </View>

          {/* Tags Row */}
          <View style={styles.tagsRow}>
            <View style={[styles.tag, styles.tagPrimary]}>
              <Text style={styles.tagText}>{court.type?.toUpperCase() || 'OUTDOOR'}</Text>
            </View>
            <View style={[styles.tag, styles.tagSecondary]}>
              <Text style={styles.tagTextSecondary}>
                {court.surface?.replace('_', ' ').toUpperCase() || 'CONCRETE'}
              </Text>
            </View>
            {court.requiresBooking && (
              <View style={[styles.tag, styles.tagAccent]}>
                <Text style={styles.tagTextAccent}>BOOKING REQUIRED</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.bookButton}
              onPress={handleBook}
              activeOpacity={0.8}
            >
              <Text style={styles.bookButtonText}>BOOK THIS COURT</Text>
              <MaterialIcons name="arrow-forward" size={20} color={Colors.slate950} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.directionsButton}
              onPress={handleDirections}
              activeOpacity={0.8}
            >
              <MaterialIcons name="directions" size={20} color={Colors.lime400} />
            </TouchableOpacity>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ABOUT</Text>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionText}>{court.description}</Text>
            </View>
          </View>

          {/* Hours Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HOURS</Text>
            <View style={styles.sectionCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconBg}>
                  <MaterialIcons name="access-time" size={18} color={Colors.blue600} />
                </View>
                <Text style={styles.infoText}>{formatHours()}</Text>
              </View>
            </View>
          </View>

          {/* Amenities Section */}
          {court.amenities && court.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AMENITIES</Text>
              <View style={styles.sectionCard}>
                <View style={styles.amenitiesGrid}>
                  {court.amenities.map((amenity, index) => (
                    <View key={index} style={styles.amenityItem}>
                      <View style={styles.amenityIconBg}>
                        <MaterialIcons name={getAmenityIcon(amenity)} size={16} color={Colors.lime400} />
                      </View>
                      <Text style={styles.amenityText}>{amenity}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Contact Section */}
          {(court.phoneNumber || court.email || court.website) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>CONTACT</Text>
              <View style={styles.sectionCard}>
                {court.phoneNumber && (
                  <TouchableOpacity style={styles.contactRow} onPress={handleCall} activeOpacity={0.8}>
                    <View style={[styles.contactIconBg, { backgroundColor: '#dbeafe' }]}>
                      <MaterialIcons name="phone" size={18} color={Colors.blue600} />
                    </View>
                    <Text style={styles.contactText}>{court.phoneNumber}</Text>
                    <MaterialIcons name="arrow-forward" size={18} color={Colors.slate400} />
                  </TouchableOpacity>
                )}
                {court.email && (
                  <TouchableOpacity
                    style={[styles.contactRow, court.phoneNumber && { marginTop: 12 }]}
                    onPress={handleEmail}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.contactIconBg, { backgroundColor: '#fef3c7' }]}>
                      <MaterialIcons name="email" size={18} color="#ca8a04" />
                    </View>
                    <Text style={styles.contactText}>{court.email}</Text>
                    <MaterialIcons name="arrow-forward" size={18} color={Colors.slate400} />
                  </TouchableOpacity>
                )}
                {court.website && (
                  <TouchableOpacity
                    style={[styles.contactRow, (court.phoneNumber || court.email) && { marginTop: 12 }]}
                    onPress={handleWebsite}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.contactIconBg, { backgroundColor: '#dcfce7' }]}>
                      <MaterialIcons name="language" size={18} color={Colors.lime400} />
                    </View>
                    <Text style={styles.contactText}>Visit Website</Text>
                    <MaterialIcons name="arrow-forward" size={18} color={Colors.slate400} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Reviews Section */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>REVIEWS</Text>
              <TouchableOpacity
                style={styles.writeReviewButton}
                onPress={handleOpenReviewModal}
                activeOpacity={0.8}
              >
                <MaterialIcons name="rate-review" size={16} color={Colors.slate950} />
                <Text style={styles.writeReviewText}>WRITE</Text>
              </TouchableOpacity>
            </View>

            {/* Rating Summary */}
            <View style={styles.ratingSummary}>
              <View style={styles.ratingBig}>
                <Text style={styles.ratingBigNumber}>{court.rating?.toFixed(1) || '0.0'}</Text>
                <View style={styles.ratingStars}>
                  <StarRating rating={court.rating} size={18} showRatingNumber={false} />
                </View>
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
                      <Text style={styles.ratingBarCount}>{count}</Text>
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

            <TouchableOpacity style={styles.seeAllButton} activeOpacity={0.8}>
              <Text style={styles.seeAllText}>SEE ALL REVIEWS</Text>
              <MaterialIcons name="arrow-forward" size={20} color={Colors.lime400} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.slate700} />
              </TouchableOpacity>
            </View>

            {/* Rating Selector */}
            <View style={styles.ratingSelector}>
              <Text style={styles.ratingLabel}>Your Rating</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setNewReview(prev => ({ ...prev, rating: star }))}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={star <= newReview.rating ? 'star' : 'star-outline'}
                      size={40}
                      color={star <= newReview.rating ? '#FBBC04' : Colors.slate300}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Comment Input */}
            <View style={styles.commentSection}>
              <Text style={styles.commentLabel}>Your Review</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Share your experience at this court..."
                placeholderTextColor={Colors.slate400}
                multiline
                numberOfLines={6}
                value={newReview.comment}
                onChangeText={(text) => setNewReview(prev => ({ ...prev, comment: text }))}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmitReview}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.slate950} />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>SUBMIT REVIEW</Text>
                  <MaterialIcons name="send" size={20} color={Colors.slate950} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: Colors.slate950 + 'CC',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.slate950,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  favoriteButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: Colors.slate950 + 'CC',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.slate950,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    flex: 1,
  },

  // Hero Section
  heroContainer: {
    position: 'relative',
    height: 400,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -1.5,
    marginBottom: 12,
    textShadowColor: Colors.slate950,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.slate950 + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLocationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
    textShadowColor: Colors.slate950,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Details Container
  detailsContainer: {
    padding: 20,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.slate50,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.slate600,
    letterSpacing: 0.5,
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  tagPrimary: {
    backgroundColor: Colors.slate950,
  },
  tagSecondary: {
    backgroundColor: Colors.slate100,
  },
  tagAccent: {
    backgroundColor: Colors.lime400 + '20',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 1,
  },
  tagTextSecondary: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.slate700,
    letterSpacing: 1,
  },
  tagTextAccent: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.lime400,
    letterSpacing: 1,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  bookButton: {
    flex: 1,
    backgroundColor: Colors.lime400,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: Colors.lime400,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: 0.5,
  },
  directionsButton: {
    width: 60,
    height: 60,
    backgroundColor: Colors.slate950,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    shadowColor: Colors.slate950,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  // Sections
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.slate500,
    letterSpacing: 2,
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  sectionText: {
    fontSize: 15,
    color: Colors.slate700,
    lineHeight: 24,
    fontWeight: '500',
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.slate950,
  },

  // Amenities
  amenitiesGrid: {
    gap: 16,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amenityIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.slate950,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amenityText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate700,
  },

  // Contact
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate950,
  },

  // Reviews
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.lime400,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  writeReviewText: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: 1,
  },
  ratingSummary: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.slate100,
    gap: 20,
  },
  ratingBig: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: Colors.slate200,
  },
  ratingBigNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -2,
    marginBottom: 4,
  },
  ratingStars: {
    marginBottom: 4,
  },
  ratingCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.slate500,
  },
  ratingBars: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingBarLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.slate600,
    width: 12,
  },
  ratingBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.slate100,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#FBBC04',
    borderRadius: 4,
  },
  ratingBarCount: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.slate500,
    width: 16,
    textAlign: 'right',
  },

  // Review Cards
  reviewsList: {
    gap: 16,
    marginBottom: 16,
  },
  reviewCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  reviewerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: Colors.slate200,
  },
  reviewerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 4,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewDate: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.slate500,
  },
  reviewComment: {
    fontSize: 14,
    color: Colors.slate700,
    lineHeight: 22,
    fontWeight: '500',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.slate950,
    paddingVertical: 16,
    borderRadius: 16,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 0.5,
  },

  // Review Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -0.5,
  },
  ratingSelector: {
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate700,
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate700,
    marginBottom: 12,
  },
  commentInput: {
    backgroundColor: Colors.slate50,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: Colors.slate950,
    minHeight: 120,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  submitButton: {
    backgroundColor: Colors.lime400,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: Colors.lime400,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: 0.5,
  },
});

export default CourtDetailScreen;
