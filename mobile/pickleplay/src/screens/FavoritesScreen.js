import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/Colors';

const FAVORITES_KEY = '@pickleplay_favorites';

const FavoritesScreen = ({ navigation }) => {
  const [favorites, setFavorites] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = async () => {
    try {
      const storedFavorites = await AsyncStorage.getItem(FAVORITES_KEY);
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadFavorites();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const removeFavorite = async (courtId) => {
    try {
      const updatedFavorites = favorites.filter((court) => court.id !== courtId);
      setFavorites(updatedFavorites);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[Colors.slate950, Colors.slate900]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Favorites</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView
        style={styles.content}
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
        {favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="heart-outline" size={64} color={Colors.lime400} />
            </View>
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptySubtitle}>
              Start adding courts to your favorites by tapping the heart icon
            </Text>
            <TouchableOpacity
              style={[styles.button, { marginTop: 32 }]}
              onPress={() => navigation.navigate('FindCourts')}
            >
              <Ionicons name="search" size={20} color={Colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Find Courts</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.favoritesSection}>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {favorites.length} {favorites.length === 1 ? 'Favorite' : 'Favorites'}
              </Text>
            </View>

            {favorites.map((court, index) => (
              <TouchableOpacity
                key={court.id || index}
                style={styles.courtCard}
                onPress={() => navigation.navigate('CourtDetail', { court })}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: court.imageUrl || court.cover_image }}
                  style={styles.courtImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)']}
                  style={styles.imageOverlay}
                />

                <View style={styles.courtContent}>
                  <View style={styles.courtHeader}>
                    <Text style={styles.courtName} numberOfLines={1}>
                      {court.name}
                    </Text>
                    <TouchableOpacity
                      style={styles.favoriteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        removeFavorite(court.id);
                      }}
                    >
                      <Ionicons name="heart" size={24} color={Colors.lime400} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.courtMeta}>
                    <Ionicons name="location-sharp" size={14} color={Colors.slate500} style={{ marginRight: 6 }} />
                    <Text style={styles.courtLocation} numberOfLines={1}>
                      {court.location?.city || court.location?.address || 'Location not set'}
                    </Text>
                  </View>

                  {court.rating && (
                    <View style={styles.ratingContainer}>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Ionicons
                            key={i}
                            name={i <= Math.round(court.rating) ? 'star' : 'star-outline'}
                            size={14}
                            color={Colors.lime400}
                            style={{ marginRight: 2 }}
                          />
                        ))}
                      </View>
                      {court.reviewCount && (
                        <Text style={styles.reviewCount}>({court.reviewCount} reviews)</Text>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
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
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.lime400 + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.slate950,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.slate600,
    textAlign: 'center',
    lineHeight: 21,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: Colors.lime400,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  favoritesSection: {
    padding: 16,
  },
  countBadge: {
    marginBottom: 16,
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate600,
    letterSpacing: -0.2,
  },
  courtCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  courtImage: {
    width: '100%',
    height: 160,
    backgroundColor: Colors.slate200,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  courtContent: {
    padding: 16,
    backgroundColor: Colors.white,
  },
  courtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  courtName: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.slate950,
    flex: 1,
    letterSpacing: -0.5,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  courtMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  courtLocation: {
    fontSize: 14,
    color: Colors.slate600,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewCount: {
    fontSize: 12,
    color: Colors.slate600,
    marginLeft: 6,
  },
});

export default FavoritesScreen;
