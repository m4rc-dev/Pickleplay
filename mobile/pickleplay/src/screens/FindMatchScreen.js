import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

// Skill level options
const SKILL_LEVELS = [
  { id: 'beginner', label: 'Beginner', range: '1.0 - 2.5' },
  { id: 'intermediate', label: 'Intermediate', range: '2.5 - 3.5' },
  { id: 'advanced', label: 'Advanced', range: '3.5 - 4.5' },
  { id: 'pro', label: 'Pro', range: '4.5+' },
];

// Game type options
const GAME_TYPES = [
  { id: 'singles', label: 'Singles', icon: 'person' },
  { id: 'doubles', label: 'Doubles', icon: 'people' },
  { id: 'mixed', label: 'Mixed Doubles', icon: 'group' },
];

// Mock available players data
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
    
    // Simulate API call
    setTimeout(() => {
      let filteredPlayers = [...MOCK_PLAYERS];
      
      if (selectedSkillLevel) {
        filteredPlayers = filteredPlayers.filter(p => p.skillLevel === selectedSkillLevel);
      }
      
      if (selectedGameType) {
        filteredPlayers = filteredPlayers.filter(p => p.preferredGameType === selectedGameType);
      }
      
      if (searchQuery) {
        filteredPlayers = filteredPlayers.filter(p => 
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
    // TODO: Implement match request functionality
    alert(`Match request sent to ${player.name}!`);
  };

  const getSkillLevelColor = (level) => {
    switch (level) {
      case 'beginner': return '#4CAF50';
      case 'intermediate': return '#FF9800';
      case 'advanced': return '#2196F3';
      case 'pro': return '#9C27B0';
      default: return thematicBlue;
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
        <Text style={styles.headerTitle}>Find a Match</Text>
        {!showFilters && (
          <TouchableOpacity style={styles.filterButton} onPress={resetFilters}>
            <MaterialIcons name="tune" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        {showFilters && <View style={styles.headerRight} />}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {showFilters ? (
          <View style={styles.filtersContainer}>
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={24} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or location..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Skill Level Selection */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Skill Level</Text>
              <View style={styles.optionsGrid}>
                {SKILL_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level.id}
                    style={[
                      styles.optionCard,
                      selectedSkillLevel === level.id && styles.optionCardSelected,
                    ]}
                    onPress={() => setSelectedSkillLevel(
                      selectedSkillLevel === level.id ? null : level.id
                    )}
                  >
                    <Text style={[
                      styles.optionLabel,
                      selectedSkillLevel === level.id && styles.optionLabelSelected,
                    ]}>
                      {level.label}
                    </Text>
                    <Text style={[
                      styles.optionRange,
                      selectedSkillLevel === level.id && styles.optionRangeSelected,
                    ]}>
                      {level.range}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Game Type Selection */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Game Type</Text>
              <View style={styles.gameTypeRow}>
                {GAME_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.gameTypeCard,
                      selectedGameType === type.id && styles.gameTypeCardSelected,
                    ]}
                    onPress={() => setSelectedGameType(
                      selectedGameType === type.id ? null : type.id
                    )}
                  >
                    <MaterialIcons
                      name={type.icon}
                      size={28}
                      color={selectedGameType === type.id ? '#fff' : thematicBlue}
                    />
                    <Text style={[
                      styles.gameTypeLabel,
                      selectedGameType === type.id && styles.gameTypeLabelSelected,
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Find Match Button */}
            <TouchableOpacity style={styles.findMatchButton} onPress={handleSearch}>
              <MaterialIcons name="search" size={24} color="#fff" />
              <Text style={styles.findMatchButtonText}>Find Players</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            {isSearching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={thematicBlue} />
                <Text style={styles.loadingText}>Finding players near you...</Text>
              </View>
            ) : players.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="person-search" size={64} color={thematicBlue} />
                <Text style={styles.emptyTitle}>No Players Found</Text>
                <Text style={styles.emptySubtitle}>
                  Try adjusting your filters to find more players
                </Text>
                <TouchableOpacity style={styles.adjustFiltersButton} onPress={resetFilters}>
                  <Text style={styles.adjustFiltersText}>Adjust Filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.resultsTitle}>
                  {players.length} Player{players.length !== 1 ? 's' : ''} Found
                </Text>
                {players.map((player) => (
                  <View key={player.id} style={styles.playerCard}>
                    <View style={styles.playerHeader}>
                      <Image
                        source={{ uri: player.avatar }}
                        style={styles.playerAvatar}
                      />
                      <View style={styles.onlineIndicator}>
                        <View style={[
                          styles.onlineDot,
                          { backgroundColor: player.isOnline ? '#4CAF50' : '#999' }
                        ]} />
                      </View>
                    </View>
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>{player.name}</Text>
                      <View style={styles.playerDetails}>
                        <View style={styles.detailRow}>
                          <MaterialIcons name="location-on" size={14} color="#666" />
                          <Text style={styles.detailText}>{player.location}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <MaterialIcons name="star" size={14} color="#FBBC04" />
                          <Text style={styles.detailText}>{player.rating.toFixed(1)} DUPR</Text>
                        </View>
                      </View>
                      <View style={styles.playerTags}>
                        <View style={[
                          styles.skillTag,
                          { backgroundColor: getSkillLevelColor(player.skillLevel) + '20' }
                        ]}>
                          <Text style={[
                            styles.skillTagText,
                            { color: getSkillLevelColor(player.skillLevel) }
                          ]}>
                            {player.skillLevel.charAt(0).toUpperCase() + player.skillLevel.slice(1)}
                          </Text>
                        </View>
                        <View style={styles.gameTypeTag}>
                          <Text style={styles.gameTypeTagText}>
                            {player.preferredGameType.charAt(0).toUpperCase() + player.preferredGameType.slice(1)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.requestButton}
                      onPress={() => handleSendRequest(player)}
                    >
                      <MaterialIcons name="sports-tennis" size={20} color="#fff" />
                      <Text style={styles.requestButtonText}>Request</Text>
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
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  filterSection: {
    marginBottom: 25,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: thematicBlue,
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: thematicBlue,
    backgroundColor: thematicBlue + '10',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: thematicBlue,
  },
  optionRange: {
    fontSize: 12,
    color: '#666',
  },
  optionRangeSelected: {
    color: thematicBlue,
  },
  gameTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gameTypeCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  gameTypeCardSelected: {
    borderColor: thematicBlue,
    backgroundColor: thematicBlue,
  },
  gameTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: thematicBlue,
    marginTop: 8,
    textAlign: 'center',
  },
  gameTypeLabelSelected: {
    color: '#fff',
  },
  findMatchButton: {
    backgroundColor: thematicBlue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 10,
    shadowColor: thematicBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  findMatchButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  resultsContainer: {
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: thematicBlue,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: thematicBlue,
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  adjustFiltersButton: {
    marginTop: 20,
    paddingHorizontal: 25,
    paddingVertical: 12,
    backgroundColor: thematicBlue,
    borderRadius: 25,
  },
  adjustFiltersText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: thematicBlue,
    marginBottom: 15,
  },
  playerCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  playerHeader: {
    position: 'relative',
  },
  playerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0E0E0',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  onlineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  playerDetails: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  playerTags: {
    flexDirection: 'row',
  },
  skillTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
  },
  skillTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  gameTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: thematicBlue + '20',
  },
  gameTypeTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: thematicBlue,
  },
  requestButton: {
    backgroundColor: thematicBlue,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default FindMatchScreen;
