import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/Colors';
import StarRating from '../components/StarRating';

const thematicBlue = '#0A56A7';
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
      <StatusBar barStyle="light-content" backgroundColor={thematicBlue} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Favorites</Text>
        <View style={styles.headerRight} />
      </View>

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
        {favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="favorite-border" size={64} color={thematicBlue} />
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptySubtitle}>
              Start adding courts to your favorites by tapping the heart icon on court details
            </Text>
            <TouchableOpacity
              style={styles.findCourtsButton}
              onPress={() => navigation.navigate('FindCourts')}
            >
              <Text style={styles.findCourtsButtonText}>Find Courts</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.favoritesSection}>
            <Text style={styles.sectionTitle}>
              {favorites.length} Favorite{favorites.length !== 1 ? 's' : ''}
            </Text>
            {favorites.map((court, index) => (
              <TouchableOpacity
                key={court.id || index}
                style={styles.courtCard}
                onPress={() => navigation.navigate('CourtDetail', { court })}
              >
                <Image
                  source={{ uri: court.imageUrl || court.cover_image }}
                  style={styles.courtImage}
                  resizeMode="cover"
                />
                <View style={styles.courtInfo}>
                  <Text style={styles.courtName}>{court.name}</Text>
                  <View style={styles.courtLocation}>
                    <MaterialIcons name="location-on" size={14} color={thematicBlue} />
                    <Text style={styles.courtLocationText} numberOfLines={1}>
                      {court.location || court.city}
                    </Text>
                  </View>
                  <StarRating rating={court.rating} reviewCount={court.reviewCount} size={12} />
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFavorite(court.id)}
                >
                  <MaterialIcons name="favorite" size={24} color="#FF4444" />
                </TouchableOpacity>
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
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: thematicBlue,
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: thematicBlue,
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  findCourtsButton: {
    marginTop: 30,
    backgroundColor: thematicBlue,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  findCourtsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  favoritesSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: thematicBlue,
    marginBottom: 15,
  },
  courtCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  courtImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#E0E0E0',
  },
  courtInfo: {
    flex: 1,
  },
  courtName: {
    fontSize: 16,
    fontWeight: '600',
    color: thematicBlue,
    marginBottom: 4,
  },
  courtLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  courtLocationText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  removeButton: {
    padding: 8,
  },
});

export default FavoritesScreen;
