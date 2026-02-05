import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

/**
 * Google-style Star Rating Component
 * @param {number} rating - The rating value (0-5)
 * @param {number} reviewCount - Number of reviews (optional)
 * @param {number} size - Size of the stars (default: 14)
 * @param {boolean} showRatingNumber - Whether to show the numeric rating (default: true)
 * @param {string} starColor - Color of filled stars (default: Google yellow)
 */
const StarRating = ({ 
  rating = 0, 
  reviewCount, 
  size = 14, 
  showRatingNumber = true,
  starColor = '#FBBC04' 
}) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <View style={styles.container}>
      {showRatingNumber && (
        <Text style={[styles.ratingNumber, { fontSize: size }]}>
          {rating?.toFixed(1) || '0.0'}
        </Text>
      )}
      <View style={styles.starsRow}>
        {[...Array(Math.max(0, fullStars))].map((_, i) => (
          <MaterialIcons key={`full-${i}`} name="star" size={size} color={starColor} />
        ))}
        {hasHalfStar && (
          <MaterialIcons name="star-half" size={size} color={starColor} />
        )}
        {[...Array(Math.max(0, emptyStars))].map((_, i) => (
          <MaterialIcons key={`empty-${i}`} name="star-border" size={size} color={starColor} />
        ))}
      </View>
      {reviewCount !== undefined && reviewCount !== null && (
        <Text style={[styles.reviewCount, { fontSize: size - 2 }]}>
          ({reviewCount})
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingNumber: {
    fontWeight: '600',
    color: '#333',
    marginRight: 4,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewCount: {
    color: '#666',
    marginLeft: 4,
  },
});

export default StarRating;
