import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const ProfessionalDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const [isCourtOwner, setIsCourtOwner] = useState(false);
  const [activeTab, setActiveTab] = useState('coach');
  const [courts, setCourts] = useState([]);
  const [students, setStudents] = useState([]);
  const [clinics, setClinics] = useState([]);

  useEffect(() => {
    fetchUserRoles();
  }, [user]);

  const fetchUserRoles = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', user.id)
        .single();

      if (data && data.roles) {
        const hasCoach = data.roles.includes('COACH');
        const hasCourtOwner = data.roles.includes('COURT_OWNER');

        setIsCoach(hasCoach);
        setIsCourtOwner(hasCourtOwner);

        if (hasCoach) {
          setActiveTab('coach');
          await fetchStudents();
          await fetchClinics();
        } else if (hasCourtOwner) {
          setActiveTab('court');
          await fetchCourts();
        }
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!user) return;

    try {
      const { data: lessonsData, error } = await supabase
        .from('lessons')
        .select(`
          student_id,
          profiles:student_id (
            id,
            full_name,
            dupr_rating,
            avatar_url
          )
        `)
        .eq('coach_id', user.id)
        .not('student_id', 'is', null);

      if (error) throw error;

      if (lessonsData) {
        const studentMap = new Map();
        lessonsData.forEach((lesson) => {
          if (lesson.profiles) {
            const studentId = lesson.student_id;
            if (studentMap.has(studentId)) {
              studentMap.get(studentId).sessions += 1;
            } else {
              studentMap.set(studentId, {
                id: lesson.profiles.id,
                name: lesson.profiles.full_name || 'Unknown Student',
                rating: lesson.profiles.dupr_rating || 0,
                sessions: 1,
              });
            }
          }
        });
        setStudents(Array.from(studentMap.values()).sort((a, b) => b.sessions - a.sessions));
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchClinics = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('coach_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;

      setClinics(data || []);
    } catch (error) {
      console.error('Error fetching clinics:', error);
    }
  };

  const fetchCourts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Fetch booking counts for each court
        const courtsWithBookings = await Promise.all(
          data.map(async (court) => {
            const { data: bookingsData } = await supabase
              .from('bookings')
              .select('id, date, start_time')
              .eq('court_id', court.id);

            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

            const upcomingCount = (bookingsData || []).filter((booking) => {
              return (
                booking.date > today ||
                (booking.date === today && booking.start_time > currentTime)
              );
            }).length;

            return {
              ...court,
              bookingCount: bookingsData?.length || 0,
              upcomingCount: upcomingCount,
            };
          })
        );

        setCourts(courtsWithBookings);
      }
    } catch (error) {
      console.error('Error fetching courts:', error);
    }
  };

  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    if (tab === 'coach') {
      await fetchStudents();
      await fetchClinics();
    } else {
      await fetchCourts();
    }
  };

  const handleDeleteCourt = (court) => {
    Alert.alert(
      'Delete Court',
      `Are you sure you want to delete "${court.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('courts')
                .delete()
                .eq('id', court.id)
                .eq('owner_id', user.id);

              if (error) throw error;

              Alert.alert('Success', 'Court deleted successfully');
              fetchCourts();
            } catch (error) {
              console.error('Error deleting court:', error);
              Alert.alert('Error', 'Failed to delete court');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.slate950} />
        <LinearGradient
          colors={[Colors.slate950, Colors.slate900]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Professional Dashboard</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.lime400} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.slate950} />

      <LinearGradient
        colors={[Colors.slate950, Colors.slate900]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Professional Dashboard</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Tab Navigation */}
      {isCoach && isCourtOwner && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'coach' && styles.activeTab]}
            onPress={() => handleTabChange('coach')}
          >
            <Ionicons
              name="school"
              size={18}
              color={activeTab === 'coach' ? Colors.white : Colors.slate400}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.tabText, activeTab === 'coach' && styles.activeTabText]}
            >
              Coach
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'court' && styles.activeTab]}
            onPress={() => handleTabChange('court')}
          >
            <Ionicons
              name="storefront"
              size={18}
              color={activeTab === 'court' ? Colors.white : Colors.slate400}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.tabText, activeTab === 'court' && styles.activeTabText]}
            >
              Court Owner
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Coach Dashboard */}
        {activeTab === 'coach' && isCoach && (
          <View style={styles.dashboardSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="school" size={22} color={Colors.lime400} />
              <Text style={styles.sectionTitle}>My Students</Text>
            </View>

            {students.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={56} color={Colors.slate400} />
                <Text style={styles.emptyStateText}>No students yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Students will appear here once they book sessions with you
                </Text>
              </View>
            ) : (
              students.map((student) => (
                <View key={student.id} style={styles.studentCard}>
                  <View style={styles.studentAvatar}>
                    <Ionicons name="person" size={24} color={Colors.lime400} />
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentLevel}>
                      {student.rating ? `${student.rating.toFixed(1)} DUPR` : 'No rating'}
                    </Text>
                  </View>
                  <View style={styles.studentStats}>
                    <Text style={styles.studentSessions}>{student.sessions}</Text>
                    <Text style={styles.studentSessionsLabel}>lessons</Text>
                  </View>
                </View>
              ))
            )}

            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <Ionicons name="calendar" size={22} color={Colors.lime400} />
              <Text style={styles.sectionTitle}>My Clinics</Text>
            </View>

            {clinics.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={56} color={Colors.slate400} />
                <Text style={styles.emptyStateText}>No clinics created</Text>
                <Text style={styles.emptyStateSubtext}>
                  Create your first clinic to start teaching groups
                </Text>
              </View>
            ) : (
              clinics.map((clinic) => (
                <View key={clinic.id} style={styles.clinicCard}>
                  <View style={styles.clinicIcon}>
                    <Ionicons name="calendar" size={24} color={Colors.lime400} />
                  </View>
                  <View style={styles.clinicInfo}>
                    <Text style={styles.clinicTitle}>{clinic.title || 'Clinic'}</Text>
                    <View style={styles.clinicDetails}>
                      <Text style={styles.clinicDetail}>
                        {clinic.level || 'All Levels'}
                      </Text>
                      {clinic.capacity && (
                        <Text style={styles.clinicDetail}>
                          • {clinic.participants || 0}/{clinic.capacity} players
                        </Text>
                      )}
                    </View>
                    {clinic.date && (
                      <Text style={styles.clinicDateTime}>
                        📅 {new Date(clinic.date).toLocaleDateString()} at {clinic.time || 'TBD'}
                      </Text>
                    )}
                    {clinic.price > 0 && (
                      <Text style={styles.clinicPrice}>₱{clinic.price}</Text>
                    )}
                  </View>
                  <View style={styles.clinicStatusBadge}>
                    <Text
                      style={[
                        styles.clinicStatusText,
                        clinic.status === 'active' && styles.statusActive,
                        clinic.status === 'completed' && styles.statusCompleted,
                      ]}
                    >
                      {(clinic.status || 'active').toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))
            )}

            <TouchableOpacity
              style={styles.createClinicButton}
              onPress={() => Alert.alert('Create Clinic', 'Clinic creation form coming soon')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#DC2626', '#B91C1C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createClinicGradient}
              >
                <Ionicons name="add" size={20} color={Colors.white} style={{ marginRight: 6 }} />
                <Text style={styles.createClinicText}>CREATE CLINIC</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Court Owner Dashboard */}
        {activeTab === 'court' && isCourtOwner && (
          <View style={styles.dashboardSection}>
            <View style={styles.sectionHeaderWithButton}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="storefront" size={22} color={Colors.lime400} />
                <Text style={styles.sectionTitle}>My Courts</Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => Alert.alert('Add Court', 'Court creation form coming soon')}
              >
                <Ionicons name="add" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>

            {courts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="location-outline" size={56} color={Colors.slate400} />
                <Text style={styles.emptyStateText}>No courts listed</Text>
                <Text style={styles.emptyStateSubtext}>
                  Add your first court to start accepting bookings
                </Text>
              </View>
            ) : (
              courts.map((court) => (
                <View key={court.id} style={styles.courtCard}>
                  <View style={styles.courtIcon}>
                    <Ionicons name="golf" size={28} color={Colors.lime400} />
                  </View>
                  <View style={styles.courtInfo}>
                    <Text style={styles.courtName}>{court.name || 'Unnamed Court'}</Text>
                    <Text style={styles.courtLocation}>
                      {court.location?.city || 'Location'}
                    </Text>
                    <View style={styles.courtDetails}>
                      <Text style={styles.detailText}>
                        {court.number_of_courts || 1} court
                      </Text>
                      {court.base_price > 0 && (
                        <Text style={styles.detailText}>
                          • ₱{court.base_price}/hr
                        </Text>
                      )}
                    </View>
                    {court.upcomingCount > 0 && (
                      <View style={styles.bookingBadge}>
                        <Ionicons name="calendar" size={12} color={Colors.lime400} />
                        <Text style={styles.bookingBadgeText}>
                          {court.upcomingCount} upcoming booking
                          {court.upcomingCount !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.courtActions}>
                    <TouchableOpacity
                      style={styles.courtActionButton}
                      onPress={() => Alert.alert('Edit Court', 'Edit form coming soon')}
                    >
                      <Ionicons name="create" size={20} color={Colors.lime400} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.courtActionButton}
                      onPress={() => handleDeleteCourt(court)}
                    >
                      <Ionicons name="trash" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate800,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.slate800 + '40',
  },
  activeTab: {
    backgroundColor: Colors.lime400,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.slate400,
  },
  activeTabText: {
    color: Colors.slate950,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionHeaderWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
    marginLeft: 10,
    letterSpacing: -0.5,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.lime400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    backgroundColor: Colors.slate800 + '40',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.white,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: Colors.slate400,
    textAlign: 'center',
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 4,
  },
  studentLevel: {
    fontSize: 12,
    color: Colors.slate600,
    fontWeight: '500',
  },
  studentStats: {
    alignItems: 'center',
  },
  studentSessions: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.lime400,
  },
  studentSessionsLabel: {
    fontSize: 10,
    color: Colors.slate600,
    fontWeight: '600',
  },
  courtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  courtIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  courtInfo: {
    flex: 1,
  },
  courtName: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.slate950,
    marginBottom: 4,
  },
  courtLocation: {
    fontSize: 12,
    color: Colors.slate600,
    fontWeight: '500',
    marginBottom: 4,
  },
  courtDetails: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 11,
    color: Colors.slate600,
    fontWeight: '500',
  },
  bookingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.lime400 + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  bookingBadgeText: {
    fontSize: 10,
    color: Colors.lime400,
    fontWeight: '700',
  },
  courtActions: {
    flexDirection: 'row',
    gap: 8,
  },
  courtActionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clinicsSection: {
    marginTop: 20,
  },
  clinicCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  clinicIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  clinicInfo: {
    flex: 1,
  },
  clinicTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.slate950,
    marginBottom: 4,
  },
  clinicDetails: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  clinicDetail: {
    fontSize: 11,
    color: Colors.slate600,
    fontWeight: '500',
  },
  clinicDateTime: {
    fontSize: 11,
    color: Colors.slate600,
    fontWeight: '500',
    marginBottom: 2,
  },
  clinicPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.lime400,
  },
  clinicStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.slate100,
  },
  clinicStatusText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.slate600,
  },
  statusActive: {
    color: Colors.lime400,
  },
  statusCompleted: {
    color: Colors.slate500,
  },
  createClinicButton: {
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createClinicGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createClinicText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.white,
  },
});

export default ProfessionalDashboardScreen;
