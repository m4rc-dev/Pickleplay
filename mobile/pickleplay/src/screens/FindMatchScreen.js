import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';

const SKILL_LEVELS = [
  { id: 'beginner', label: 'Beginner', range: '1.0 - 2.5' },
  { id: 'intermediate', label: 'Intermediate', range: '2.5 - 3.5' },
  { id: 'advanced', label: 'Advanced', range: '3.5 - 4.5' },
  { id: 'pro', label: 'Pro', range: '4.5+' },
];

const GAME_TYPES = [
  { id: 'singles', label: 'Singles', icon: 'person' },
  { id: 'doubles', label: 'Doubles', icon: 'people' },
  { id: 'mixed', label: 'Mixed', icon: 'people' },
];

const MOCK_PLAYERS = [
  {
    id: '1',
    name: 'Juan Dela Cruz',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    skillLevel: 'intermediate',
    rating: 3.2,
    location: 'BGC, Taguig',
    preferredGameType: 'doubles',
    isOnline: true,
  },
  {
    id: '2',
    name: 'Maria Santos',
    avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    skillLevel: 'advanced',
    rating: 4.0,
    location: 'Makati City',
    preferredGameType: 'singles',
    isOnline: true,
  },
  {
    id: '3',
    name: 'Carlos Reyes',
    avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
    skillLevel: 'beginner',
    rating: 2.0,
    location: 'Quezon City',
    preferredGameType: 'doubles',
    isOnline: false,
  },
  {
    id: '4',
    name: 'Ana Lopez',
    avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
    skillLevel: 'intermediate',
    rating: 3.5,
    location: 'Pasig City',
    preferredGameType: 'mixed',
    isOnline: true,
  },
  {
    id: '5',
    name: 'Miguel Garcia',
    avatar: 'https://randomuser.me/api/portraits/men/5.jpg',
    skillLevel: 'pro',
    rating: 4.8,
    location: 'Mandaluyong',
    preferredGameType: 'singles',
    isOnline: false,
  },
];

const FindMatchScreen = ({ navigation }) => {
  const [selectedSkillLevel, setSelectedSkillLevel] = useState(null);
  const [selectedGameType, setSelectedGameType] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [players, setPlayers] = useState([]);
  const [showFilters, setShowFilters] = useState(true);
  const { user } = useAuth();

  const handleSearch = () => {
    setIsSearching(true);
    setShowFilters(false);

    setTimeout(() => {
      let filteredPlayers = [...MOCK_PLAYERS];

      if (selectedSkillLevel) {
        filteredPlayers = filteredPlayers.filter((p) => p.skillLevel === selectedSkillLevel);
      }

      if (selectedGameType) {
        filteredPlayers = filteredPlayers.filter((p) => p.preferredGameType === selectedGameType);
      }

      if (searchQuery) {
        filteredPlayers = filteredPlayers.filter(
          (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.location.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setPlayers(filteredPlayers);
      setIsSearching(false);
    }, 1500);
  };

  const resetFilters = () => {
    setSelectedSkillLevel(null);
    setSelectedGameType(null);
    setSearchQuery('');
    setPlayers([]);
    setShowFilters(true);
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const handleSendRequest = (player) => {
    alert(`Match request sent to ${player.name}!`);
  };

  const getSkillLevelColor = (level) => {
    switch (level) {
      case 'beginner':
        return '#10b981';
      case 'intermediate':
        return '#f59e0b';
      case 'advanced':
        return '#3b82f6';
      case 'pro':
        return '#a855f7';
      default:
        return Colors.slate500;
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
        <Text style={styles.headerTitle}>Find a Match</Text>
        {!showFilters && (
          <TouchableOpacity style={styles.filterButton} onPress={resetFilters}>
            <Ionicons name="funnel" size={24} color={Colors.white} />
          </TouchableOpacity>
        )}
        {showFilters && <View style={styles.headerRight} />}
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {showFilters ? (
          <View style={styles.filtersContainer}>
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={Colors.slate400} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name..."
                placeholderTextColor={Colors.slate400}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Skill Level Selection */}
            <View style={styles.filterSection}>
              <View style={styles.filterHeader}>
                <Ionicons name="bar-chart" size={20} color={Colors.lime400} />
                <Text style={styles.filterTitle}>Skill Level</Text>
              </View>
              <View style={styles.optionsGrid}>
                {SKILL_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level.id}
                    style={[
                      styles.optionCard,
                      selectedSkillLevel === level.id && styles.optionCardSelected,
                    ]}
                    onPress={() =>
                      setSelectedSkillLevel(selectedSkillLevel === level.id ? null : level.id)
                    }
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        selectedSkillLevel === level.id && styles.optionLabelSelected,
                      ]}
                    >
                      {level.label}
                    </Text>
                    <Text
                      style={[
                        styles.optionRange,
                        selectedSkillLevel === level.id && styles.optionRangeSelected,
                      ]}
                    >
                      {level.range}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Game Type Selection */}
            <View style={styles.filterSection}>
              <View style={styles.filterHeader}>
                <Ionicons name="people" size={20} color={Colors.lime400} />
                <Text style={styles.filterTitle}>Game Type</Text>
              </View>
              <View style={styles.gameTypeRow}>
                {GAME_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.gameTypeCard,
                      selectedGameType === type.id && styles.gameTypeCardSelected,
                    ]}
                    onPress={() =>
                      setSelectedGameType(selectedGameType === type.id ? null : type.id)
                    }
                  >
                    <Ionicons
                      name={type.icon}
                      size={28}
                      color={selectedGameType === type.id ? Colors.white : Colors.slate500}
                    />
                    <Text
                      style={[
                        styles.gameTypeLabel,
                        selectedGameType === type.id && styles.gameTypeLabelSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Find Match Button */}
            <TouchableOpacity style={styles.findMatchButton} onPress={handleSearch}>
              <Ionicons name="search" size={20} color={Colors.white} />
              <Text style={styles.findMatchButtonText}>Find Players</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            {isSearching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.lime400} />
                <Text style={styles.loadingText}>Finding players near you...</Text>
              </View>
            ) : players.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="people" size={64} color={Colors.slate300} />
                </View>
                <Text style={styles.emptyTitle}>No Players Found</Text>
                <Text style={styles.emptySubtitle}>
                  Try adjusting your filters to find more players
                </Text>
                <TouchableOpacity style={styles.adjustFiltersButton} onPress={resetFilters}>
                  <Ionicons name="funnel" size={18} color={Colors.white} />
                  <Text style={styles.adjustFiltersText}>Adjust Filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsTitle}>
                    {players.length} Player{players.length !== 1 ? 's' : ''} Found
                  </Text>
                </View>
                {players.map((player) => (
                  <View key={player.id} style={styles.playerCard}>
                    <View style={styles.playerAvatarContainer}>
                      <Image source={{ uri: player.avatar }} style={styles.playerAvatar} />
                      <View
                        style={[
                          styles.onlineDot,
                          { backgroundColor: player.isOnline ? Colors.lime400 : Colors.slate400 },
                        ]}
                      />
                    </View>

                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>{player.name}</Text>

                      <View style={styles.playerMeta}>
                        <View style={styles.metaItem}>
                          <Ionicons name="location-sharp" size={14} color={Colors.slate500} />
                          <Text style={styles.metaText} numberOfLines={1}>
                            {player.location}
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Ionicons name="star" size={14} color={Colors.lime400} />
                          <Text style={styles.metaText}>{player.rating.toFixed(1)}</Text>
                        </View>
                      </View>

                      <View style={styles.playerBadges}>
                        <View
                          style={[
                            styles.skillBadge,
                            { backgroundColor: getSkillLevelColor(player.skillLevel) + '20' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.skillBadgeText,
                              { color: getSkillLevelColor(player.skillLevel) },
                            ]}
                          >
                            {player.skillLevel.charAt(0).toUpperCase() + player.skillLevel.slice(1)}
                          </Text>
                        </View>
                        <View style={[styles.typeBadge, { backgroundColor: Colors.lime400 + '20' }]}>
                          <Text style={[styles.typeBadgeText, { color: Colors.lime400 }]}>
                            {player.preferredGameType.charAt(0).toUpperCase() +
                              player.preferredGameType.slice(1)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.requestButton}
                      onPress={() => handleSendRequest(player)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="arrow-forward" size={20} color={Colors.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
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
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
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
  filterButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  filtersContainer: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: Colors.slate950,
    fontWeight: '600',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.slate950,
    marginLeft: 8,
    letterSpacing: -0.5,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 2,
    borderColor: Colors.slate200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: Colors.lime400,
    backgroundColor: Colors.lime400 + '10',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  optionLabelSelected: {
    color: Colors.lime400,
  },
  optionRange: {
    fontSize: 11,
    color: Colors.slate600,
    fontWeight: '600',
  },
  optionRangeSelected: {
    color: Colors.lime400,
  },
  gameTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gameTypeCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.slate200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  gameTypeCardSelected: {
    borderColor: Colors.lime400,
    backgroundColor: Colors.lime400,
  },
  gameTypeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.slate600,
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  gameTypeLabelSelected: {
    color: Colors.white,
  },
  findMatchButton: {
    backgroundColor: Colors.lime400,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
    gap: 10,
    shadowColor: Colors.lime400,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  findMatchButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  resultsContainer: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.slate600,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.slate100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.slate950,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.slate600,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  adjustFiltersButton: {
    backgroundColor: Colors.lime400,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustFiltersText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  resultsHeader: {
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -0.5,
  },
  playerCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  playerAvatarContainer: {
    position: 'relative',
  },
  playerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.slate200,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  playerMeta: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  metaText: {
    fontSize: 12,
    color: Colors.slate600,
    marginLeft: 4,
    fontWeight: '600',
  },
  playerBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  skillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  skillBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  requestButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.lime400,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FindMatchScreen;
