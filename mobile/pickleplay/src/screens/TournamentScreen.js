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
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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

      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('*')
        .order('date', { ascending: true });

      if (tournamentsError) throw tournamentsError;

      const { data: registrationCounts, error: countError } = await supabase
        .from('tournament_registrations')
        .select('tournament_id');

      if (countError) {
        console.error('Error fetching registration counts:', countError);
      }

      const countMap = {};
      if (registrationCounts) {
        registrationCounts.forEach(reg => {
          countMap[reg.tournament_id] = (countMap[reg.tournament_id] || 0) + 1;
        });
      }

      const tournamentsWithCounts = (tournamentsData || []).map(tournament => ({
        ...tournament,
        registered_count: countMap[tournament.id] || 0
      }));

      setTournaments(tournamentsWithCounts);

      if (user?.id) {
        const { data: registrationsData, error: registrationsError } = await supabase
          .from('tournament_registrations')
          .select('tournament_id')
          .eq('player_id', user.id);

        if (registrationsError) {
          console.error('Error fetching user registrations:', registrationsError);
        }

        const registrationSet = new Set(registrationsData ? registrationsData.map(r => r.tournament_id) : []);
        setUserRegistrations(registrationSet);
      } else {
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

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tournament) =>
          tournament.name?.toLowerCase().includes(query) ||
          tournament.location?.toLowerCase().includes(query)
      );
    }

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

      await fetchTournaments();
      Alert.alert('Success', 'You have successfully joined the tournament!');
    } catch (error) {
      console.error('Error joining tournament:', error);
      Alert.alert('Error', 'Failed to join tournament: ' + error.message);
    }
  };

  const handleLeaveTournament = (tournamentId) => {
    if (!user?.id) {
      return;
    }

    const processLeave = async () => {
      try {
        const { error: deleteError } = await supabase
          .from('tournament_registrations')
          .delete()
          .eq('tournament_id', tournamentId)
          .eq('player_id', user.id);

        if (deleteError) {
          throw deleteError;
        }

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'UPCOMING':
        return Colors.lime400;
      case 'LIVE':
        return '#f59e0b';
      case 'COMPLETED':
        return Colors.slate400;
      default:
        return Colors.slate500;
    }
  };

  const renderTournamentCard = (tournament) => {
    const isJoined = userRegistrations.has(tournament.id);
    const isFull = tournament.registered_count >= tournament.max_players;
    const isUpcoming = tournament.status === 'UPCOMING';

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
          colors={['transparent', 'rgba(2, 6, 23, 0.9)']}
          style={styles.tournamentImageOverlay}
        />

        <View style={styles.tournamentBadges}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tournament.status) }]}>
            <Text style={styles.badgeText}>{tournament.status}</Text>
          </View>
          {tournament.skill_level && (
            <View style={styles.levelBadge}>
              <Text style={styles.badgeText}>{tournament.skill_level}</Text>
            </View>
          )}
        </View>

        <View style={styles.tournamentContent}>
          <Text style={styles.tournamentName} numberOfLines={2}>{tournament.name}</Text>

          <View style={styles.tournamentDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={16} color={Colors.lime400} />
              <Text style={styles.detailText}>
                {new Date(tournament.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location" size={16} color={Colors.lime400} />
              <Text style={styles.detailText} numberOfLines={1}>
                {tournament.location}
              </Text>
            </View>

            {tournament.prize_pool && (
              <View style={styles.detailRow}>
                <Ionicons name="trophy" size={16} color={Colors.lime400} />
                <Text style={styles.prizeText}>{tournament.prize_pool}</Text>
              </View>
            )}
          </View>

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
                    backgroundColor: isFull ? '#ef4444' : Colors.lime400,
                  },
                ]}
              />
            </View>
          </View>

          {(tournament.registered_count || 0) > 0 && (
            <TouchableOpacity
              style={styles.viewParticipantsButton}
              onPress={() => handleViewParticipants(tournament)}
            >
              <Ionicons name="people" size={16} color={Colors.white} />
              <Text style={styles.viewParticipantsText}>
                View {tournament.registered_count} Participant{tournament.registered_count !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          )}

          {isJoined ? (
            <View style={styles.actionButtons}>
              <View style={styles.registeredButton}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.lime400} />
                <Text style={styles.registeredText}>Registered</Text>
              </View>
              <TouchableOpacity
                style={styles.leaveButton}
                onPress={() => handleLeaveTournament(tournament.id)}
                activeOpacity={0.8}
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
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
              <Text style={styles.joinButtonText}>
                {isFull ? 'Full' : !isUpcoming ? 'Closed' : 'Join'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
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
      <LinearGradient
        colors={[Colors.slate950, Colors.slate900]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tournaments</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.heroSubtitle}>PICKLEPLAY</Text>
          <View style={styles.heroTitleContainer}>
            <Ionicons name="trophy" size={40} color={Colors.lime400} />
            <Text style={styles.heroTitle}>Compete{'\n'}& Win</Text>
          </View>
          <Text style={styles.heroDescription}>
            Join the most prestigious pickleball tournaments
          </Text>
        </View>

        <View style={styles.filtersSection}>
          <View style={styles.filterChips}>
            {['All', 'Upcoming', 'Live', 'Completed'].map((filterOption) => (
              <TouchableOpacity
                key={filterOption}
                style={[
                  styles.filterChip,
                  filter === filterOption && styles.filterChipActive,
                ]}
                onPress={() => setFilter(filterOption)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filter === filterOption && styles.filterChipTextActive,
                  ]}
                >
                  {filterOption}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={18}
              color={Colors.slate400}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tournaments..."
              placeholderTextColor={Colors.slate400}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.lime400} />
            <Text style={styles.loadingText}>Loading tournaments...</Text>
          </View>
        ) : filteredTournaments.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="trophy" size={64} color={Colors.slate300} />
            </View>
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

      <Modal
        visible={showParticipantsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowParticipantsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={[Colors.slate950, Colors.slate900]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalHeaderGradient}
          >
            <Text style={styles.modalTitle}>
              {selectedTournament?.name}
            </Text>
            <TouchableOpacity
              onPress={() => setShowParticipantsModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={26} color={Colors.white} />
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.modalContent}>
            <Text style={styles.participantsLabel}>
              Participants ({tournamentParticipants.length})
            </Text>

            {loadingParticipants ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={Colors.lime400} />
                <Text style={styles.loadingText}>Loading participants...</Text>
              </View>
            ) : tournamentParticipants.length === 0 ? (
              <View style={styles.emptyParticipants}>
                <Ionicons name="people" size={48} color={Colors.slate300} />
                <Text style={styles.emptyParticipantsText}>No participants yet</Text>
              </View>
            ) : (
              <ScrollView style={styles.participantsList} showsVerticalScrollIndicator={false}>
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
                        <Ionicons name="star" size={14} color={Colors.lime400} />
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
  content: {
    flex: 1,
  },
  heroSection: {
    padding: 20,
    backgroundColor: Colors.white,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.lime400,
    letterSpacing: 2,
    marginBottom: 12,
  },
  heroTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -1,
    lineHeight: 36,
  },
  heroDescription: {
    fontSize: 14,
    color: Colors.slate600,
    fontWeight: '500',
  },
  filtersSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.slate100,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  filterChipActive: {
    backgroundColor: Colors.lime400,
    borderColor: Colors.lime400,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.slate600,
    letterSpacing: -0.2,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.slate200,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.slate950,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.slate600,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
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
  emptyStateText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.slate950,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.slate600,
    textAlign: 'center',
    fontWeight: '500',
  },
  tournamentsGrid: {
    padding: 16,
  },
  tournamentCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  tournamentImage: {
    width: '100%',
    height: 160,
    backgroundColor: Colors.slate200,
  },
  tournamentImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
  },
  tournamentBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.slate700,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  tournamentContent: {
    padding: 16,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.slate950,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  tournamentDetails: {
    marginBottom: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: Colors.slate600,
    fontWeight: '600',
    flex: 1,
  },
  prizeText: {
    fontSize: 13,
    color: Colors.lime400,
    fontWeight: '700',
  },
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.slate600,
  },
  progressCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.slate950,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: Colors.slate200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  viewParticipantsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.slate100,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 6,
  },
  viewParticipantsText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.slate600,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  registeredButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.slate100,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  registeredText: {
    color: Colors.lime400,
    fontSize: 13,
    fontWeight: '800',
  },
  leaveButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  joinButton: {
    backgroundColor: Colors.lime400,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  joinButtonDisabled: {
    backgroundColor: Colors.slate300,
  },
  joinButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeaderGradient: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
    flex: 1,
    letterSpacing: -0.3,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  participantsLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.slate950,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  modalLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyParticipants: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyParticipantsText: {
    fontSize: 14,
    color: Colors.slate600,
    marginTop: 12,
    fontWeight: '600',
  },
  participantsList: {
    flex: 1,
  },
  participantCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  participantNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.lime400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantNumberText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.slate200,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 2,
  },
  participantUsername: {
    fontSize: 12,
    color: Colors.slate600,
    fontWeight: '500',
  },
  participantRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.slate50,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  participantRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.slate950,
  },
});

export default TournamentScreen;
