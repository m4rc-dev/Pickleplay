import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import CourtFormModal from '../components/CourtFormModal';
import ClinicFormModal from '../components/ClinicFormModal';
import ClinicDetailModal from '../components/ClinicDetailModal';
import CourtDetailModal from '../components/CourtDetailModal';

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

const ProfessionalDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const [isCourtOwner, setIsCourtOwner] = useState(false);
  const [activeTab, setActiveTab] = useState('coach'); // 'coach' or 'court'
  const [students, setStudents] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [courts, setCourts] = useState([]);
  const [showCourtForm, setShowCourtForm] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [showClinicForm, setShowClinicForm] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [showClinicDetail, setShowClinicDetail] = useState(false);
  const [showCourtDetail, setShowCourtDetail] = useState(false);

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

        // Set default active tab based on roles
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
      // Fetch students from lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          student_id,
          status,
          profiles:student_id (
            id,
            full_name,
            dupr_rating,
            avatar_url
          )
        `)
        .eq('coach_id', user.id)
        .not('student_id', 'is', null);

      if (lessonsError) throw lessonsError;

      // Fetch students from clinic participants
      const { data: clinicsData, error: clinicsError } = await supabase
        .from('clinics')
        .select(`
          id,
          clinic_participants (
            player_id,
            profiles:player_id (
              id,
              full_name,
              dupr_rating,
              avatar_url
            )
          )
        `)
        .eq('coach_id', user.id);

      if (clinicsError) throw clinicsError;

      // Aggregate students with session counts
      const studentMap = new Map();

      // Process lessons data
      if (lessonsData) {
        lessonsData.forEach((lesson) => {
          if (lesson.profiles) {
            const studentId = lesson.student_id;
            if (studentMap.has(studentId)) {
              studentMap.get(studentId).sessions += 1;
            } else {
              studentMap.set(studentId, {
                id: lesson.profiles.id,
                name: lesson.profiles.full_name || 'Unknown Student',
                level: getRatingLevel(lesson.profiles.dupr_rating),
                rating: lesson.profiles.dupr_rating || 0,
                avatar_url: lesson.profiles.avatar_url,
                sessions: 1,
              });
            }
          }
        });
      }

      // Process clinic participants data
      if (clinicsData) {
        clinicsData.forEach((clinic) => {
          if (clinic.clinic_participants) {
            clinic.clinic_participants.forEach((participant) => {
              if (participant.profiles) {
                const studentId = participant.player_id;
                if (studentMap.has(studentId)) {
                  studentMap.get(studentId).clinics = (studentMap.get(studentId).clinics || 0) + 1;
                } else {
                  studentMap.set(studentId, {
                    id: participant.profiles.id,
                    name: participant.profiles.full_name || 'Unknown Student',
                    level: getRatingLevel(participant.profiles.dupr_rating),
                    rating: participant.profiles.dupr_rating || 0,
                    avatar_url: participant.profiles.avatar_url,
                    sessions: 0,
                    clinics: 1,
                  });
                }
              }
            });
          }
        });
      }

      // Convert map to array and sort by total sessions
      const studentsArray = Array.from(studentMap.values()).sort((a, b) => {
        const aTotal = (a.sessions || 0) + (a.clinics || 0);
        const bTotal = (b.sessions || 0) + (b.clinics || 0);
        return bTotal - aTotal;
      });

      setStudents(studentsArray);
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', 'Failed to load students');
      setStudents([]);
    }
  };

  const getRatingLevel = (rating) => {
    if (!rating || rating < 3.0) return 'Beginner';
    if (rating < 4.0) return 'Intermediate';
    if (rating < 5.0) return 'Advanced';
    return 'Expert';
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

      if (data) {
        setClinics(data);
      }
    } catch (error) {
      console.error('Error fetching clinics:', error);
      Alert.alert('Error', 'Failed to load clinics');
      setClinics([]);
    }
  };

  const fetchCourts = async () => {
    try {
      // Fetch courts
      const { data, error } = await supabase
        .from('courts')
        .select(`
          *,
          location:location_id (
            id,
            name,
            address,
            city
          )
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Fetch booking counts for each court
        const courtsWithBookings = await Promise.all(
          data.map(async (court) => {
            const { data: bookingsData, error: bookingsError } = await supabase
              .from('bookings')
              .select('id, date, start_time')
              .eq('court_id', court.id);

            if (bookingsError) {
              console.error('Error fetching bookings for court:', bookingsError);
              return { ...court, bookingCount: 0, upcomingCount: 0 };
            }

            // Count upcoming bookings
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

            const upcomingCount = bookingsData.filter((booking) => {
              return (
                booking.date > today ||
                (booking.date === today && booking.start_time > currentTime)
              );
            }).length;

            return {
              ...court,
              bookingCount: bookingsData.length,
              upcomingCount: upcomingCount,
            };
          })
        );

        setCourts(courtsWithBookings);
      }
    } catch (error) {
      console.error('Error fetching courts:', error);
      Alert.alert('Error', 'Failed to load courts');
    }
  };

  const handleAddCourt = () => {
    setSelectedCourt(null);
    setShowCourtForm(true);
  };

  const handleEditCourt = (court) => {
    setSelectedCourt(court);
    setShowCourtForm(true);
  };

  const handleDeleteCourt = (court) => {
    Alert.alert(
      'Delete Court',
      `Are you sure you want to delete "${court.name}"? This action cannot be undone.`,
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

  const handleCourtFormSuccess = () => {
    fetchCourts();
  };

  const handleAddClinic = () => {
    setSelectedClinic(null);
    setShowClinicForm(true);
  };

  const handleClinicFormSuccess = () => {
    // Refresh clinics list when a clinic is created
    fetchClinics();
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={thematicBlue} />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[thematicBlue, '#0D6EBD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Professional Dashboard</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      {/* Role Tabs */}
      {isCoach && isCourtOwner && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'coach' && styles.activeTab]}
            onPress={() => handleTabChange('coach')}
          >
            <MaterialIcons
              name="school"
              size={20}
              color={activeTab === 'coach' ? '#fff' : thematicBlue}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.tabText, activeTab === 'coach' && styles.activeTabText]}>
              Coach
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'court' && styles.activeTab]}
            onPress={() => handleTabChange('court')}
          >
            <MaterialIcons
              name="domain"
              size={20}
              color={activeTab === 'court' ? '#fff' : thematicBlue}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.tabText, activeTab === 'court' && styles.activeTabText]}>
              Court Owner
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Coach Dashboard */}
        {activeTab === 'coach' && isCoach && (
          <View style={styles.dashboardSection}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="school" size={24} color={thematicBlue} />
              <Text style={styles.sectionTitle}>My Students</Text>
            </View>

            {students.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="people-outline" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>No students yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Students will appear here once they book sessions with you
                </Text>
              </View>
            ) : (
              students.map((student) => (
                <View key={student.id} style={styles.studentCard}>
                  <View style={styles.studentAvatar}>
                    <MaterialIcons name="person" size={32} color={thematicBlue} />
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name || 'Unknown'}</Text>
                    <Text style={styles.studentLevel}>
                      {student.level || 'Beginner'} • {(student.rating || 0).toFixed(1)} DUPR
                    </Text>
                    {((student.sessions || 0) > 0 || (student.clinics || 0) > 0) && (
                      <Text style={styles.studentDetails}>
                        {student.sessions || 0} lessons • {student.clinics || 0} clinics
                      </Text>
                    )}
                  </View>
                  <View style={styles.studentStats}>
                    <Text style={styles.studentSessions}>
                      {(student.sessions || 0) + (student.clinics || 0)}
                    </Text>
                    <Text style={styles.studentSessionsLabel}>Total</Text>
                  </View>
                </View>
              ))
            )}

            {/* Clinics Section */}
            <View style={styles.clinicsSection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="event" size={24} color={thematicBlue} />
                <Text style={styles.sectionTitle}>My Clinics</Text>
              </View>

              {clinics.length === 0 ? (
                <View style={styles.emptyClinicState}>
                  <MaterialIcons name="event-note" size={48} color="#ccc" />
                  <Text style={styles.emptyClinicText}>No clinics created yet</Text>
                </View>
              ) : (
                clinics.map((clinic) => (
                  <TouchableOpacity 
                    key={clinic.id} 
                    style={styles.clinicCard}
                    onPress={() => {
                      setSelectedClinic(clinic);
                      setShowClinicDetail(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.clinicIcon}>
                      <MaterialIcons name="event" size={28} color="#DC2626" />
                    </View>
                    <View style={styles.clinicInfo}>
                      <Text style={styles.clinicTitle}>{clinic.title || 'Clinic'}</Text>
                      <Text style={styles.clinicDetails}>
                        {clinic.level || 'All Levels'} • {clinic.participants || 0}/{clinic.capacity || 0} players
                      </Text>
                      <Text style={styles.clinicDateTime}>
                        {new Date(clinic.date).toLocaleDateString()} at {clinic.time || 'TBD'}
                      </Text>
                      <Text style={styles.clinicLocation}>
                        📍 {clinic.location || 'Location TBD'}
                      </Text>
                    </View>
                    <View style={styles.clinicPriceContainer}>
                      <Text style={styles.clinicPrice}>₱{clinic.price || 0}</Text>
                      <View style={[
                        styles.clinicStatus,
                        clinic.status === 'active' && styles.clinicStatusActive,
                        clinic.status === 'completed' && styles.clinicStatusCompleted,
                        clinic.status === 'cancelled' && styles.clinicStatusCancelled,
                      ]}>
                        <Text style={styles.clinicStatusText}>
                          {(clinic.status || 'active').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Create Clinic Button */}
            <TouchableOpacity
              style={styles.createClinicButton}
              onPress={handleAddClinic}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#DC2626', '#B91C1C']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.createClinicGradient}
              >
                <MaterialIcons name="add" size={24} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.createClinicText}>CREATE CLINIC</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Court Owner Dashboard */}
        {activeTab === 'court' && isCourtOwner && (
          <View style={styles.dashboardSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <MaterialIcons name="domain" size={24} color={thematicBlue} style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>My Courts</Text>
              </View>
              <TouchableOpacity
                style={styles.addCourtButton}
                onPress={handleAddCourt}
                activeOpacity={0.7}
              >
                <MaterialIcons name="add" size={20} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.addCourtButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {courts.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="location-city" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>No courts listed yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Add your first court to start accepting bookings
                </Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddCourt}
                >
                  <MaterialIcons name="add" size={24} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.addButtonText}>Add Court</Text>
                </TouchableOpacity>
              </View>
            ) : (
              courts.map((court) => (
                <TouchableOpacity
                  key={court.id}
                  style={styles.courtCard}
                  onPress={() => {
                    setSelectedCourt(court);
                    setShowCourtDetail(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.courtIcon}>
                    <MaterialIcons name="sports-tennis" size={32} color={thematicBlue} />
                  </View>
                  <View style={styles.courtInfo}>
                    <Text style={styles.courtName}>{court.name || 'Unnamed Court'}</Text>
                    <Text style={styles.courtLocation}>
                      {court.location?.city || court.location?.address || 'No location'}
                    </Text>
                    <Text style={styles.courtDetails}>
                      {court.num_courts || 0} courts • {court.surface_type || 'N/A'}
                    </Text>
                    {(court.upcomingCount || 0) > 0 && (
                      <View style={styles.bookingBadge}>
                        <MaterialIcons name="event" size={14} color="#10b981" />
                        <Text style={styles.bookingBadgeText}>
                          {court.upcomingCount || 0} upcoming booking{(court.upcomingCount || 0) !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                    {(court.base_price || 0) > 0 && (
                      <Text style={styles.courtPrice}>
                        ₱{court.base_price || 0}/hr
                      </Text>
                    )}
                  </View>
                  <View style={styles.courtActions}>
                    <TouchableOpacity
                      style={styles.courtActionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleEditCourt(court);
                      }}
                    >
                      <MaterialIcons name="edit" size={22} color={thematicBlue} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.courtActionButton, { marginLeft: 8 }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteCourt(court);
                      }}
                    >
                      <MaterialIcons name="delete" size={22} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Court Form Modal */}
      <CourtFormModal
        visible={showCourtForm}
        onClose={() => {
          setShowCourtForm(false);
          setSelectedCourt(null);
        }}
        court={selectedCourt}
        userId={user?.id}
        onSuccess={handleCourtFormSuccess}
      />

      {/* Clinic Form Modal */}
      <ClinicFormModal
        visible={showClinicForm}
        onClose={() => {
          setShowClinicForm(false);
          setSelectedClinic(null);
        }}
        clinic={selectedClinic}
        coachId={user?.id}
        onSuccess={handleClinicFormSuccess}
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
        isCoach={isCoach}
        onUpdate={() => {
          fetchClinics();
          setShowClinicDetail(false);
          setSelectedClinic(null);
        }}
      />

      {/* Court Detail Modal */}
      <CourtDetailModal
        visible={showCourtDetail}
        onClose={() => {
          setShowCourtDetail(false);
          setSelectedCourt(null);
        }}
        court={selectedCourt}
        currentUserId={user?.id}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: thematicBlue,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: thematicBlue,
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  contentContainer: {
    paddingBottom: 100, // Add padding to prevent buttons from going behind system UI
  },
  dashboardSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addCourtButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: thematicBlue,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addCourtButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: thematicBlue,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  studentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  studentLevel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  studentDetails: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  studentStats: {
    alignItems: 'center',
  },
  studentSessions: {
    fontSize: 20,
    fontWeight: 'bold',
    color: thematicBlue,
  },
  studentSessionsLabel: {
    fontSize: 12,
    color: '#666',
  },
  courtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  courtIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courtInfo: {
    flex: 1,
    marginLeft: 12,
  },
  courtName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  courtLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  courtDetails: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  courtPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 4,
  },
  courtActions: {
    flexDirection: 'row',
  },
  courtActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courtAction: {
    padding: 8,
  },
  createClinicButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
    marginBottom: 40,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createClinicGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  createClinicText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.8,
  },
  clinicsSection: {
    marginTop: 24,
  },
  emptyClinicState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyClinicText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  clinicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  clinicIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clinicInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clinicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  clinicDetails: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  clinicDateTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  clinicLocation: {
    fontSize: 12,
    color: '#666',
  },
  clinicPriceContainer: {
    alignItems: 'flex-end',
  },
  clinicPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 4,
  },
  clinicStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
  },
  clinicStatusActive: {
    backgroundColor: '#D1FAE5',
  },
  clinicStatusCompleted: {
    backgroundColor: '#DBEAFE',
  },
  clinicStatusCancelled: {
    backgroundColor: '#FEE2E2',
  },
  clinicStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  bookingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  bookingBadgeText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default ProfessionalDashboardScreen;
