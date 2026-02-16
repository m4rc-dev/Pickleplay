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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import CoachDetailModal from '../components/CoachDetailModal';
import ClinicDetailModal from '../components/ClinicDetailModal';

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

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
  const [filterLevel, setFilterLevel] = useState('all'); // 'all', 'beginner', 'intermediate', 'advanced'
  const [activeTab, setActiveTab] = useState('coaches'); // 'coaches' or 'clinics'

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

      // Fetch all profiles with COACH role
      const { data: coachProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .contains('roles', ['COACH']);

      if (profileError) throw profileError;

      // For each coach, fetch their stats (number of students, clinics, rating)
      const coachesWithStats = await Promise.all(
        coachProfiles.map(async (coach) => {
          // Get number of unique students from lessons
          const { data: lessonStudents, error: lessonError } = await supabase
            .from('lessons')
            .select('student_id')
            .eq('coach_id', coach.id);

          // Get clinics count
          const { data: clinics, error: clinicsError } = await supabase
            .from('clinics')
            .select('id')
            .eq('coach_id', coach.id)
            .eq('status', 'active');

          // Get average rating from coach_reviews table (not lessons table)
          const { data: reviews, error: reviewError } = await supabase
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
            clinicCount: clinics ? clinics.length : 0,
            rating: avgRating,
          };
        })
      );

      // Filter out current user's own coach profile
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
      console.log('Fetching clinics...');

      // Fetch all active clinics (simplified query without date filter initially)
      const { data: clinicsData, error: clinicsError } = await supabase
        .from('clinics')
        .select('*')
        .eq('status', 'active')
        .order('date', { ascending: true });

      if (clinicsError) {
        console.error('Clinics error:', clinicsError);
        throw clinicsError;
      }

      console.log('All clinics fetched:', clinicsData?.length, clinicsData);

      // Fetch coach details for each clinic
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

      // Fetch user's owned courts to filter out clinics at their locations
      const { data: ownedCourts } = await supabase
        .from('courts')
        .select('name, location_id')
        .eq('owner_id', user?.id)
        .eq('is_active', true);

      console.log('User owned courts:', ownedCourts);

      // Get list of owned court names for filtering
      const ownedCourtNames = (ownedCourts || []).map(court => court.name.toLowerCase());

      // Filter out current user's own clinics and clinics at their owned courts
      const filteredClinicsData = clinicsWithCoaches.filter(
        (clinic) => {
          // Exclude if user is the coach
          if (clinic.coach_id === user?.id) {
            console.log('Filtering out own clinic:', clinic.title);
            return false;
          }
          
          // Exclude if clinic is at one of user's owned courts
          if (ownedCourtNames.length > 0) {
            const clinicLocation = clinic.location?.toLowerCase() || '';
            const isAtOwnedCourt = ownedCourtNames.some(courtName => 
              clinicLocation.includes(courtName)
            );
            if (isAtOwnedCourt) {
              console.log('Filtering out clinic at owned court:', clinic.title);
              return false;
            }
          }
          
          return true;
        }
      );

      console.log('Filtered clinics:', filteredClinicsData?.length);

      setClinics(filteredClinicsData);
      setFilteredClinics(filteredClinicsData);
    } catch (error) {
      console.error('Error fetching clinics:', error);
      Alert.alert('Error', 'Failed to load clinics');
    }
  };

  const filterCoachList = () => {
    let filtered = [...coaches];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (coach) =>
          coach.full_name?.toLowerCase().includes(query) ||
          coach.username?.toLowerCase().includes(query) ||
          coach.bio?.toLowerCase().includes(query)
      );
    }

    // Apply level filter
    if (filterLevel !== 'all') {
      filtered = filtered.filter(
        (coach) => coach.specialization?.toLowerCase() === filterLevel.toLowerCase()
      );
    }

    setFilteredCoaches(filtered);
  };

  const filterClinicList = () => {
    let filtered = [...clinics];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (clinic) =>
          clinic.title?.toLowerCase().includes(query) ||
          clinic.location?.toLowerCase().includes(query) ||
          clinic.coach?.full_name?.toLowerCase().includes(query)
      );
    }

    // Apply level filter
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
        <ActivityIndicator size="large" color={thematicBlue} />
        <Text style={styles.loadingText}>Loading Coaches...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[thematicBlue, '#0842A0']}
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
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find Training</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'coaches' && styles.tabActive]}
            onPress={() => setActiveTab('coaches')}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name="person" 
              size={20} 
              color={activeTab === 'coaches' ? thematicBlue : '#fff'} 
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
            <MaterialIcons 
              name="event" 
              size={20} 
              color={activeTab === 'clinics' ? thematicBlue : '#fff'} 
            />
            <Text style={[styles.tabText, activeTab === 'clinics' && styles.tabTextActive]}>
              Clinics
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === 'coaches' ? 'Search coaches...' : 'Search clinics...'}
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color="#999" />
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
        contentContainerStyle={styles.coachesContainer}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'coaches' ? (
          // Coaches List
          filteredCoaches.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="person-search" size={64} color="#ccc" />
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
                    <MaterialIcons name="person" size={40} color="#999" />
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
                        <MaterialIcons name="star" size={16} color="#FFA500" />
                        <Text style={styles.statText}>{coach.rating}</Text>
                      </View>
                    )}
                    <View style={styles.statItem}>
                      <MaterialIcons name="people" size={16} color={thematicBlue} />
                      <Text style={styles.statText}>{coach.studentCount} students</Text>
                    </View>
                    {coach.clinicCount > 0 && (
                      <View style={styles.statItem}>
                        <MaterialIcons name="event" size={16} color="#DC2626" />
                        <Text style={styles.statText}>{coach.clinicCount} clinics</Text>
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

                <MaterialIcons name="chevron-right" size={28} color="#ccc" />
              </TouchableOpacity>
            ))
          )
        ) : (
          // Clinics List
          filteredClinics.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-busy" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>No clinics available</Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery ? 'Try a different search' : 'Check back later for upcoming clinics'}
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
                  <MaterialIcons name="event" size={32} color="#DC2626" />
                </View>
                <View style={styles.clinicCardInfo}>
                  <Text style={styles.clinicTitle}>{clinic.title || 'Clinic'}</Text>
                  <Text style={styles.clinicCoach}>
                    by {clinic.coach?.full_name || clinic.coach?.username || 'Unknown Coach'}
                  </Text>
                  <Text style={styles.clinicDetails}>
                    {clinic.level || 'All Levels'} • {clinic.participants || 0}/{clinic.capacity || 0} players
                  </Text>
                  <View style={styles.clinicMeta}>
                    <View style={styles.clinicMetaItem}>
                      <MaterialIcons name="calendar-today" size={14} color="#666" />
                      <Text style={styles.clinicMetaText}>
                        {new Date(clinic.date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.clinicMetaItem}>
                      <MaterialIcons name="access-time" size={14} color="#666" />
                      <Text style={styles.clinicMetaText}>{clinic.time || 'TBD'}</Text>
                    </View>
                  </View>
                  <View style={styles.clinicMetaItem}>
                    <MaterialIcons name="location-on" size={14} color="#666" />
                    <Text style={styles.clinicMetaText} numberOfLines={1}>
                      {clinic.location || 'Location TBD'}
                    </Text>
                  </View>
                </View>
                <View style={styles.clinicPriceSection}>
                  <Text style={styles.clinicPrice}>₱{clinic.price || 0}</Text>
                  <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                </View>
              </TouchableOpacity>
            ))
          )
        )}
      </ScrollView>

      {/* Coach Detail Modal */}
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

      {/* Clinic Detail Modal */}
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
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },
  tabTextActive: {
    color: thematicBlue,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: thematicBlue,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  coachesContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
  },
  emptyStateSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#ccc',
  },
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  coachAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  coachBio: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  coachStats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  statText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  specializationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#DBEAFE',
  },
  specializationText: {
    fontSize: 10,
    fontWeight: '600',
    color: thematicBlue,
  },
  clinicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  clinicIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clinicCardInfo: {
    flex: 1,
  },
  clinicTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  clinicCoach: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  clinicDetails: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  clinicMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  clinicMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  clinicMetaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  clinicPriceSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  clinicPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 4,
  },
});

export default CoachesScreen;
