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
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import CoachDetailModal from '../components/CoachDetailModal';
import ClinicDetailModal from '../components/ClinicDetailModal';

const CoachesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [coaches, setCoaches] = useState([]);
  const [filteredCoaches, setFilteredCoaches] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [filteredClinics, setFilteredClinics] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [showCoachDetail, setShowCoachDetail] = useState(false);
  const [showClinicDetail, setShowClinicDetail] = useState(false);
  const [filterLevel, setFilterLevel] = useState('all');
  const [activeTab, setActiveTab] = useState('coaches');

  useEffect(() => {
    fetchCoaches();
    fetchClinics();
  }, []);

  useEffect(() => {
    if (activeTab === 'coaches') {
      filterCoachList();
    } else {
      filterClinicList();
    }
  }, [searchQuery, filterLevel, coaches, clinics, activeTab]);

  const fetchCoaches = async () => {
    try {
      setLoading(true);
      const { data: coachProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .contains('roles', ['COACH']);

      if (profileError) throw profileError;

      const coachesWithStats = await Promise.all(
        coachProfiles.map(async (coach) => {
          const { data: lessonStudents } = await supabase
            .from('lessons')
            .select('student_id')
            .eq('coach_id', coach.id);

          const { data: clinicsData } = await supabase
            .from('clinics')
            .select('id')
            .eq('coach_id', coach.id)
            .eq('status', 'active');

          const { data: reviews } = await supabase
            .from('coach_reviews')
            .select('rating')
            .eq('coach_id', coach.id);

          const uniqueStudents = lessonStudents
            ? [...new Set(lessonStudents.map((l) => l.student_id))].length
            : 0;

          const avgRating = reviews && reviews.length > 0
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
            : null;

          return {
            ...coach,
            studentCount: uniqueStudents,
            clinicCount: clinicsData ? clinicsData.length : 0,
            rating: avgRating,
          };
        })
      );

      const filteredCoachesWithStats = coachesWithStats.filter(
        (coach) => coach.id !== user?.id
      );

      setCoaches(filteredCoachesWithStats);
      setFilteredCoaches(filteredCoachesWithStats);
    } catch (error) {
      console.error('Error fetching coaches:', error);
      Alert.alert('Error', 'Failed to load coaches');
    } finally {
      setLoading(false);
    }
  };

  const fetchClinics = async () => {
    try {
      const { data: clinicsData, error: clinicsError } = await supabase
        .from('clinics')
        .select('*')
        .eq('status', 'active')
        .order('date', { ascending: true });

      if (clinicsError) throw clinicsError;

      const clinicsWithCoaches = await Promise.all(
        (clinicsData || []).map(async (clinic) => {
          const { data: coachData } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .eq('id', clinic.coach_id)
            .single();
          
          return {
            ...clinic,
            coach: coachData
          };
        })
      );

      const { data: ownedCourts } = await supabase
        .from('courts')
        .select('name, location_id')
        .eq('owner_id', user?.id)
        .eq('is_active', true);

      const ownedCourtNames = (ownedCourts || []).map(court => court.name.toLowerCase());

      const filteredClinicsData = clinicsWithCoaches.filter(
        (clinic) => {
          if (clinic.coach_id === user?.id) return false;
          
          if (ownedCourtNames.length > 0) {
            const clinicLocation = clinic.location?.toLowerCase() || '';
            const isAtOwnedCourt = ownedCourtNames.some(courtName => 
              clinicLocation.includes(courtName)
            );
            if (isAtOwnedCourt) return false;
          }
          
          return true;
        }
      );

      setClinics(filteredClinicsData);
      setFilteredClinics(filteredClinicsData);
    } catch (error) {
      console.error('Error fetching clinics:', error);
      Alert.alert('Error', 'Failed to load clinics');
    }
  };

  const filterCoachList = () => {
    let filtered = [...coaches];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (coach) =>
          coach.full_name?.toLowerCase().includes(query) ||
          coach.username?.toLowerCase().includes(query) ||
          coach.bio?.toLowerCase().includes(query)
      );
    }

    if (filterLevel !== 'all') {
      filtered = filtered.filter(
        (coach) => coach.specialization?.toLowerCase() === filterLevel.toLowerCase()
      );
    }

    setFilteredCoaches(filtered);
  };

  const filterClinicList = () => {
    let filtered = [...clinics];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (clinic) =>
          clinic.title?.toLowerCase().includes(query) ||
          clinic.location?.toLowerCase().includes(query) ||
          clinic.coach?.full_name?.toLowerCase().includes(query)
      );
    }

    if (filterLevel !== 'all') {
      filtered = filtered.filter(
        (clinic) => clinic.level?.toLowerCase() === filterLevel.toLowerCase()
      );
    }

    setFilteredClinics(filtered);
  };

  const handleCoachPress = (coach) => {
    setSelectedCoach(coach);
    setShowCoachDetail(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.lime400} />
        <Text style={styles.loadingText}>Loading Coaches...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={[Colors.slate950, Colors.slate900]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <View style={styles.backIconContainer}>
              <Ionicons name="arrow-back" size={24} color={Colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>FIND TRAINING</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'coaches' && styles.tabActive]}
            onPress={() => setActiveTab('coaches')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="person" 
              size={20} 
              color={activeTab === 'coaches' ? Colors.slate950 : Colors.slate300} 
            />
            <Text style={[styles.tabText, activeTab === 'coaches' && styles.tabTextActive]}>
              Coaches
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'clinics' && styles.tabActive]}
            onPress={() => setActiveTab('clinics')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="calendar" 
              size={20} 
              color={activeTab === 'clinics' ? Colors.slate950 : Colors.slate300} 
            />
            <Text style={[styles.tabText, activeTab === 'clinics' && styles.tabTextActive]}>
              Clinics
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.slate400} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === 'coaches' ? 'Search coaches...' : 'Search clinics...'}
          placeholderTextColor={Colors.slate400}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close" size={20} color={Colors.slate400} />
          </TouchableOpacity>
        )}
      </View>

      {/* Level Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'beginner', 'intermediate', 'advanced'].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.filterChip,
                filterLevel === level && styles.filterChipActive,
              ]}
              onPress={() => setFilterLevel(level)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterLevel === level && styles.filterChipTextActive,
                ]}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Coaches/Clinics List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'coaches' ? (
          filteredCoaches.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="person-circle-outline" size={72} color={Colors.slate300} />
              <Text style={styles.emptyStateText}>No coaches found</Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery ? 'Try a different search' : 'Check back later'}
              </Text>
            </View>
          ) : (
            filteredCoaches.map((coach) => (
              <TouchableOpacity
                key={coach.id}
                style={styles.coachCard}
                onPress={() => handleCoachPress(coach)}
                activeOpacity={0.7}
              >
                <View style={styles.coachAvatar}>
                  {coach.avatar_url ? (
                    <Image source={{ uri: coach.avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="person" size={36} color={Colors.slate400} />
                  )}
                </View>

                <View style={styles.coachInfo}>
                  <Text style={styles.coachName}>{coach.full_name || coach.username}</Text>
                  {coach.bio && (
                    <Text style={styles.coachBio} numberOfLines={2}>
                      {coach.bio}
                    </Text>
                  )}
                  <View style={styles.coachStats}>
                    {coach.rating && (
                      <View style={styles.statItem}>
                        <Ionicons name="star" size={16} color={Colors.lime400} />
                        <Text style={styles.statText}>{coach.rating}</Text>
                      </View>
                    )}
                    <View style={styles.statItem}>
                      <Ionicons name="people" size={16} color={Colors.slate600} />
                      <Text style={styles.statText}>{coach.studentCount}</Text>
                    </View>
                    {coach.clinicCount > 0 && (
                      <View style={styles.statItem}>
                        <Ionicons name="calendar" size={16} color={Colors.slate600} />
                        <Text style={styles.statText}>{coach.clinicCount}</Text>
                      </View>
                    )}
                  </View>
                  {coach.specialization && (
                    <View style={styles.specializationBadge}>
                      <Text style={styles.specializationText}>
                        {coach.specialization.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                <Ionicons name="chevron-forward" size={24} color={Colors.slate400} />
              </TouchableOpacity>
            ))
          )
        ) : (
          filteredClinics.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={72} color={Colors.slate300} />
              <Text style={styles.emptyStateText}>No clinics available</Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery ? 'Try a different search' : 'Check back later'}
              </Text>
            </View>
          ) : (
            filteredClinics.map((clinic) => (
              <TouchableOpacity
                key={clinic.id}
                style={styles.clinicCard}
                onPress={() => {
                  setSelectedClinic(clinic);
                  setShowClinicDetail(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.clinicIconContainer}>
                  <Ionicons name="calendar" size={28} color={Colors.lime400} />
                </View>
                <View style={styles.clinicCardInfo}>
                  <Text style={styles.clinicTitle}>{clinic.title || 'Clinic'}</Text>
                  <Text style={styles.clinicCoach}>
                    {clinic.coach?.full_name || clinic.coach?.username || 'Unknown Coach'}
                  </Text>
                  <Text style={styles.clinicDetails}>
                    {clinic.level || 'All Levels'} • {clinic.participants || 0}/{clinic.capacity || 0} players
                  </Text>
                  <View style={styles.clinicMeta}>
                    <View style={styles.clinicMetaItem}>
                      <Ionicons name="calendar-today" size={13} color={Colors.slate600} />
                      <Text style={styles.clinicMetaText}>
                        {new Date(clinic.date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.clinicMetaItem}>
                      <Ionicons name="time" size={13} color={Colors.slate600} />
                      <Text style={styles.clinicMetaText}>{clinic.time || 'TBD'}</Text>
                    </View>
                  </View>
                  <View style={styles.clinicMetaItem}>
                    <Ionicons name="location" size={13} color={Colors.slate600} />
                    <Text style={styles.clinicMetaText} numberOfLines={1}>
                      {clinic.location || 'Location TBD'}
                    </Text>
                  </View>
                </View>
                <View style={styles.clinicPriceSection}>
                  <Text style={styles.clinicPrice}>₱{clinic.price || 0}</Text>
                </View>
              </TouchableOpacity>
            ))
          )
        )}
      </ScrollView>

      {/* Modals */}
      <CoachDetailModal
        visible={showCoachDetail}
        onClose={() => {
          setShowCoachDetail(false);
          setSelectedCoach(null);
        }}
        coach={selectedCoach}
        currentUserId={user?.id}
        onBookingSuccess={() => {
          setShowCoachDetail(false);
          setSelectedCoach(null);
        }}
      />

      <ClinicDetailModal
        visible={showClinicDetail}
        onClose={() => {
          setShowClinicDetail(false);
          setSelectedClinic(null);
        }}
        clinic={selectedClinic}
        currentUserId={user?.id}
        isCoach={false}
        onUpdate={() => {
          fetchClinics();
          setShowClinicDetail(false);
          setSelectedClinic(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.slate50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.slate600,
    letterSpacing: -0.3,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 4,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.lime400,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.slate300,
    letterSpacing: -0.3,
  },
  tabTextActive: {
    color: Colors.slate950,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.slate950,
    letterSpacing: -0.3,
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.slate200,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.lime400,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.slate600,
    letterSpacing: -0.3,
  },
  filterChipTextActive: {
    color: Colors.slate950,
  },
  scrollView: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.slate500,
    letterSpacing: -0.5,
  },
  emptyStateSubtext: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.slate400,
    letterSpacing: -0.3,
  },
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  coachAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.slate100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  coachBio: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.slate600,
    marginBottom: 8,
    lineHeight: 18,
    letterSpacing: -0.3,
  },
  coachStats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.slate600,
    letterSpacing: -0.3,
  },
  specializationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.slate100,
  },
  specializationText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.lime400,
    letterSpacing: 0.5,
  },
  clinicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 5,
    borderLeftColor: Colors.lime400,
  },
  clinicIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.slate100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  clinicCardInfo: {
    flex: 1,
  },
  clinicTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  clinicCoach: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.slate600,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  clinicDetails: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.slate500,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  clinicMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 12,
  },
  clinicMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clinicMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.slate600,
    letterSpacing: -0.3,
  },
  clinicPriceSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clinicPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.lime400,
    letterSpacing: -0.5,
  },
});

export default CoachesScreen;
