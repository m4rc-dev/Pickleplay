import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

const TournamentScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState([]);
  const [filteredTournaments, setFilteredTournaments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [userRegistrations, setUserRegistrations] = useState(new Set());
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [tournamentParticipants, setTournamentParticipants] = useState([]);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  useEffect(() => {
    fetchTournaments();
  }, [user]);

  useEffect(() => {
    filterTournaments();
  }, [searchQuery, filter, tournaments]);

  const fetchTournaments = async () => {
    try {
      setLoading(true);

      // Fetch all tournaments
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('*')
        .order('date', { ascending: true });

      if (tournamentsError) throw tournamentsError;

      // Fetch actual registration counts from database
      const { data: registrationCounts, error: countError } = await supabase
        .from('tournament_registrations')
        .select('tournament_id');

      if (countError) {
        console.error('Error fetching registration counts:', countError);
      }

      // Count registrations per tournament
      const countMap = {};
      if (registrationCounts) {
        registrationCounts.forEach(reg => {
          countMap[reg.tournament_id] = (countMap[reg.tournament_id] || 0) + 1;
        });
      }

      // Update tournaments with actual counts from database
      const tournamentsWithCounts = (tournamentsData || []).map(tournament => ({
        ...tournament,
        registered_count: countMap[tournament.id] || 0
      }));

      setTournaments(tournamentsWithCounts);

      // If user is logged in, fetch their registrations
      if (user?.id) {
        const { data: registrationsData, error: registrationsError } = await supabase
          .from('tournament_registrations')
          .select('tournament_id')
          .eq('player_id', user.id);

        if (registrationsError) {
          console.error('Error fetching user registrations:', registrationsError);
        }

        const registrationSet = new Set(registrationsData ? registrationsData.map(r => r.tournament_id) : []);
        console.log('User registrations updated:', Array.from(registrationSet));
        setUserRegistrations(registrationSet);
      } else {
        // Clear registrations if no user
        setUserRegistrations(new Set());
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      Alert.alert('Error', 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const filterTournaments = () => {
    let filtered = [...tournaments];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tournament) =>
          tournament.name?.toLowerCase().includes(query) ||
          tournament.location?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filter !== 'All') {
      filtered = filtered.filter(
        (tournament) => tournament.status === filter.toUpperCase()
      );
    }

    setFilteredTournaments(filtered);
  };

  const handleJoinTournament = async (tournamentId) => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please login to join tournaments');
      return;
    }

    try {
      console.log('Joining tournament:', tournamentId);

      // Insert registration
      const { error } = await supabase
        .from('tournament_registrations')
        .insert({
          tournament_id: tournamentId,
          player_id: user.id,
          registration_date: new Date().toISOString(),
        });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Already Registered', 'You are already registered for this tournament');
        } else {
          throw error;
        }
        return;
      }

      console.log('Registration added successfully');

      // Refresh tournaments data - this will fetch the actual count from database
      await fetchTournaments();
      
      Alert.alert('Success', 'You have successfully joined the tournament!');
    } catch (error) {
      console.error('Error joining tournament:', error);
      Alert.alert('Error', 'Failed to join tournament: ' + error.message);
    }
  };

  const handleLeaveTournament = (tournamentId) => {
    if (!user?.id) {
      console.log('No user ID');
      return;
    }

    console.log('Leave tournament called for:', tournamentId, 'user:', user.id);

    const processLeave = async () => {
      console.log('Leave confirmed, processing...');
      try {
        // Delete registration
        const { error: deleteError } = await supabase
          .from('tournament_registrations')
          .delete()
          .eq('tournament_id', tournamentId)
          .eq('player_id', user.id);

        if (deleteError) {
          console.error('Delete error:', deleteError);
          throw deleteError;
        }

        console.log('Registration deleted successfully');

        // Refresh tournaments data - this will fetch the actual count from database
        await fetchTournaments();
        
        Alert.alert('Success', 'You have left the tournament');
      } catch (error) {
        console.error('Error leaving tournament:', error);
        Alert.alert('Error', 'Failed to leave tournament: ' + error.message);
      }
    };

    Alert.alert(
      'Leave Tournament',
      'Are you sure you want to leave this tournament?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('Leave cancelled')
        },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => processLeave(),
        },
      ],
      { cancelable: true }
    );
  };

  const fetchTournamentParticipants = async (tournamentId) => {
    try {
      setLoadingParticipants(true);
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select(`
          id,
          created_at,
          player:player_id (
            id,
            full_name,
            username,
            avatar_url,
            dupr_rating
          )
        `)
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      console.log('Participants fetched:', data);
      setTournamentParticipants(data || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
      Alert.alert('Error', 'Failed to load participants');
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleViewParticipants = (tournament) => {
    setSelectedTournament(tournament);
    setShowParticipantsModal(true);
    fetchTournamentParticipants(tournament.id);
  };

  const renderTournamentCard = (tournament) => {
    const isJoined = userRegistrations.has(tournament.id);
    const isFull = tournament.registered_count >= tournament.max_players;
    const isUpcoming = tournament.status === 'UPCOMING';

    console.log(`Rendering tournament ${tournament.name}: isJoined=${isJoined}, ID=${tournament.id}`);

    return (
      <View key={tournament.id} style={styles.tournamentCard}>
        <Image
          source={{
            uri: tournament.image_url || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=800',
          }}
          style={styles.tournamentImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.tournamentImageOverlay}
        />
        <View style={styles.tournamentBadges}>
          <View style={[styles.badge, styles.statusBadge]}>
            <Text style={styles.badgeText}>{tournament.status}</Text>
          </View>
          {tournament.skill_level && (
            <View style={[styles.badge, styles.levelBadge]}>
              <Text style={styles.badgeText}>{tournament.skill_level}</Text>
            </View>
          )}
        </View>

        <View style={styles.tournamentContent}>
          <Text style={styles.tournamentName}>{tournament.name}</Text>

          <View style={styles.tournamentDetails}>
            <View style={styles.detailRow}>
              <MaterialIcons name="calendar-today" size={18} color={thematicBlue} />
              <Text style={styles.detailText}>
                {new Date(tournament.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialIcons name="location-on" size={18} color={thematicBlue} />
              <Text style={styles.detailText} numberOfLines={1}>
                {tournament.location}
              </Text>
            </View>

            {tournament.prize_pool && (
              <View style={[styles.detailRow, styles.prizeRow]}>
                <MaterialIcons name="emoji-events" size={18} color="#FFD700" />
                <Text style={styles.prizeText}>Prize: {tournament.prize_pool}</Text>
              </View>
            )}
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Registration</Text>
              <Text style={styles.progressCount}>
                {tournament.registered_count || 0} / {tournament.max_players || 0}
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(100, ((tournament.registered_count || 0) / (tournament.max_players || 32)) * 100)}%`,
                    backgroundColor: isFull ? '#DC2626' : thematicBlue,
                  },
                ]}
              />
            </View>
          </View>

          {/* View Participants Button */}
          {(tournament.registered_count || 0) > 0 && (
            <TouchableOpacity
              style={styles.viewParticipantsButton}
              onPress={() => handleViewParticipants(tournament)}
            >
              <MaterialIcons name="people" size={18} color={thematicBlue} />
              <Text style={styles.viewParticipantsText}>
                View {tournament.registered_count} Participant{tournament.registered_count !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          )}

          {/* Action Button */}
          {isJoined ? (
            <View style={styles.actionButtons}>
              <View style={styles.registeredButton}>
                <MaterialIcons name="check-circle" size={20} color="#10B981" />
                <Text style={styles.registeredText}>Registered</Text>
              </View>
              <TouchableOpacity
                style={styles.leaveButton}
                onPress={() => handleLeaveTournament(tournament.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.leaveButtonText}>Leave</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.joinButton,
                (!isUpcoming || isFull) && styles.joinButtonDisabled,
              ]}
              onPress={() => handleJoinTournament(tournament.id)}
              disabled={!isUpcoming || isFull}
            >
              <Text style={styles.joinButtonText}>
                {isFull ? 'Full' : !isUpcoming ? 'Closed' : 'Join Tournament'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tournaments</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroSubtitle}>PICKLEPLAY</Text>
          <Text style={styles.heroTitle}>COMPETE. WIN.{'\n'}DOMINATE.</Text>
          <Text style={styles.heroDescription}>
            Join the most prestigious pickleball circuit in the Philippines
          </Text>
        </View>

        {/* Filters */}
        <View style={styles.filtersSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterButtons}
          >
            {['All', 'Upcoming', 'Live', 'Completed'].map((filterOption) => (
              <TouchableOpacity
                key={filterOption}
                style={[
                  styles.filterButton,
                  filter === filterOption && styles.filterButtonActive,
                ]}
                onPress={() => setFilter(filterOption)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filter === filterOption && styles.filterButtonTextActive,
                  ]}
                >
                  {filterOption}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.searchContainer}>
            <MaterialIcons
              name="search"
              size={20}
              color="#94a3b8"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tournaments or venues..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Tournaments List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={thematicBlue} />
            <Text style={styles.loadingText}>Loading tournaments...</Text>
          </View>
        ) : filteredTournaments.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="emoji-events" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No tournaments found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery
                ? 'Try a different search'
                : 'Check back later for upcoming tournaments'}
            </Text>
          </View>
        ) : (
          <View style={styles.tournamentsGrid}>
            {filteredTournaments.map((tournament) =>
              renderTournamentCard(tournament)
            )}
          </View>
        )}
      </ScrollView>

      {/* Participants Modal */}
      <Modal
        visible={showParticipantsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowParticipantsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedTournament?.name} - Participants
              </Text>
              <TouchableOpacity
                onPress={() => setShowParticipantsModal(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {loadingParticipants ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={thematicBlue} />
                <Text style={styles.loadingText}>Loading participants...</Text>
              </View>
            ) : tournamentParticipants.length === 0 ? (
              <View style={styles.emptyParticipants}>
                <MaterialIcons name="people-outline" size={64} color="#ccc" />
                <Text style={styles.emptyParticipantsText}>No participants yet</Text>
              </View>
            ) : (
              <ScrollView style={styles.participantsList}>
                {tournamentParticipants.map((registration, index) => (
                  <View key={registration.id} style={styles.participantCard}>
                    <View style={styles.participantNumber}>
                      <Text style={styles.participantNumberText}>{index + 1}</Text>
                    </View>
                    <Image
                      source={{
                        uri: registration.player?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${registration.player?.id}`,
                      }}
                      style={styles.participantAvatar}
                    />
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantName}>
                        {registration.player?.full_name || 'Anonymous Player'}
                      </Text>
                      <Text style={styles.participantUsername}>
                        @{registration.player?.username || 'unknown'}
                      </Text>
                    </View>
                    {registration.player?.dupr_rating && (
                      <View style={styles.participantRating}>
                        <MaterialIcons name="star" size={14} color="#FFD700" />
                        <Text style={styles.participantRatingText}>
                          {registration.player.dupr_rating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: thematicBlue,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  heroSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    color: thematicBlue,
    letterSpacing: 4,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  heroDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
  },
  filtersSection: {
    padding: 20,
    backgroundColor: '#fff',
  },
  filterButtons: {
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 12,
  },
  filterButtonActive: {
    backgroundColor: thematicBlue,
    borderColor: thematicBlue,
  },
  filterButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    fontWeight: '600',
  },
  tournamentsGrid: {
    padding: 20,
  },
  tournamentCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tournamentImage: {
    width: '100%',
    height: 200,
  },
  tournamentImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  tournamentBadges: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadge: {
    backgroundColor: '#6366f1',
  },
  levelBadge: {
    backgroundColor: '#fff',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  tournamentContent: {
    padding: 20,
  },
  tournamentName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  tournamentDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginLeft: 12,
    flex: 1,
  },
  prizeRow: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  prizeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#78350f',
    textTransform: 'uppercase',
    marginLeft: 12,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  progressCount: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  registeredButton: {
    flex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#6ee7b7',
    height: 56,
    borderRadius: 16,
    marginRight: 8,
  },
  registeredText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#10B981',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginLeft: 8,
  },
  leaveButton: {
    flex: 1,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
  },
  leaveButtonText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#DC2626',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  joinButton: {
    backgroundColor: '#0f172a',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  joinButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  viewParticipantsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  viewParticipantsText: {
    fontSize: 11,
    fontWeight: '700',
    color: thematicBlue,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    flex: 1,
    marginRight: 16,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  modalLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyParticipants: {
    padding: 40,
    alignItems: 'center',
  },
  emptyParticipantsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#cbd5e1',
    marginTop: 16,
    textTransform: 'uppercase',
  },
  participantsList: {
    padding: 20,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  participantNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: thematicBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  participantNumberText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e5e7eb',
    marginRight: 12,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  participantUsername: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  participantRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  participantRatingText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    marginLeft: 4,
  },
});

export default TournamentScreen;
