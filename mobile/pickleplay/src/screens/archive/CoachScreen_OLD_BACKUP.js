import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Colors from '../constants/Colors';
import ProfessionalApplicationModal from '../components/ProfessionalApplicationModal';

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

const CoachScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isVerifiedCoach, setIsVerifiedCoach] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeSessions: 0,
    completedSessions: 0,
    averageRating: 0,
  });
  const [coachProfile, setCoachProfile] = useState(null);

  useEffect(() => {
    checkCoachStatus();
  }, [user]);

  const checkCoachStatus = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Check if user has coach role and is verified
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, is_verified_coach, coach_specialization, coach_bio, coach_rating, coach_experience_years')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (profile) {
        const isCoach = profile.role === 'coach' || profile.role === 'both';
        const verified = profile.is_verified_coach === true;
        
        setIsVerifiedCoach(isCoach && verified);
        setCoachProfile(profile);

        if (isCoach && verified) {
          await fetchCoachData();
        }
      } else {
        setIsVerifiedCoach(false);
      }
    } catch (error) {
      console.error('Error checking coach status:', error);
      Alert.alert('Error', 'Failed to load coach data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCoachData = async () => {
    if (!user) return;

    try {
      // Fetch students (users who have sessions with this coach)
      const { data: sessions, error: sessionsError } = await supabase
        .from('coaching_sessions')
        .select(`
          *,
          student:profiles!coaching_sessions_student_id_fkey(
            id,
            first_name,
            last_name,
            email,
            profile_picture_url,
            skill_level
          )
        `)
        .eq('coach_id', user.id)
        .order('session_date', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Get unique students
      const uniqueStudents = [];
      const studentIds = new Set();

      sessions?.forEach(session => {
        if (session.student && !studentIds.has(session.student.id)) {
          studentIds.add(session.student.id);
          uniqueStudents.push({
            ...session.student,
            totalSessions: sessions.filter(s => s.student_id === session.student.id).length,
            lastSession: sessions.find(s => s.student_id === session.student.id)?.session_date,
          });
        }
      });

      setStudents(uniqueStudents);

      // Calculate statistics
      const activeSessions = sessions?.filter(s => s.status === 'scheduled').length || 0;
      const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;
      
      setStats({
        totalStudents: uniqueStudents.length,
        activeSessions,
        completedSessions,
        averageRating: coachProfile?.coach_rating || 0,
      });
    } catch (error) {
      console.error('Error fetching coach data:', error);
      Alert.alert('Error', 'Failed to load students data');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkCoachStatus();
    setRefreshing(false);
  };

  const handleViewStudentProfile = (student) => {
    Alert.alert('Student Profile', `Viewing profile for ${student.first_name} ${student.last_name}`);
    // navigation.navigate('StudentProfile', { studentId: student.id });
  };

  const handleScheduleSession = (student) => {
    Alert.alert('Schedule Session', `Schedule a coaching session with ${student.first_name}`);
    // navigation.navigate('ScheduleSession', { studentId: student.id });
  };

  const handleRequestVerification = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please login to apply as a coach');
      return;
    }

    setShowApplicationModal(true);
  };

  const handleApplicationSuccess = () => {
    checkCoachStatus(); // Refresh status
  };

  const renderPendingVerification = () => (
    <View style={styles.pendingContainer}>
      <MaterialIcons name="pending" size={64} color="#FF9800" />
      <Text style={styles.pendingTitle}>Verification Pending</Text>
      <Text style={styles.pendingText}>
        Your coach verification request is being reviewed by our admin team. 
        You will receive a notification once your application is approved.
      </Text>
      <View style={styles.infoBox}>
        <MaterialIcons name="info" size={20} color={thematicBlue} />
        <Text style={styles.infoText}>
          This usually takes 1-3 business days. We verify coach credentials to ensure 
          quality coaching for our community.
        </Text>
      </View>
    </View>
  );

  const renderNotCoach = () => (
    <View style={styles.notCoachContainer}>
      <MaterialIcons name="school" size={64} color="#ccc" />
      <Text style={styles.notCoachTitle}>Become a Coach</Text>
      <Text style={styles.notCoachText}>
        Share your pickleball expertise and help others improve their game. 
        Request coach verification to start teaching students.
      </Text>
      <View style={styles.benefitsContainer}>
        <View style={styles.benefitItem}>
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.benefitText}>Earn money coaching</Text>
        </View>
        <View style={styles.benefitItem}>
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.benefitText}>Flexible schedule</Text>
        </View>
        <View style={styles.benefitItem}>
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.benefitText}>Build your reputation</Text>
        </View>
        <View style={styles.benefitItem}>
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.benefitText}>Connect with players</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.requestButton} onPress={handleRequestVerification}>
        <MaterialIcons name="how-to-reg" size={24} color="#fff" />
        <Text style={styles.requestButtonText}>Request Coach Verification</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCoachDashboard = () => (
    <View>
      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#4CAF50' }]}>
            <MaterialIcons name="people" size={32} color="#fff" />
            <Text style={styles.statNumber}>{stats.totalStudents}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#2196F3' }]}>
            <MaterialIcons name="event" size={32} color="#fff" />
            <Text style={styles.statNumber}>{stats.activeSessions}</Text>
            <Text style={styles.statLabel}>Upcoming Sessions</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#FF9800' }]}>
            <MaterialIcons name="check-circle" size={32} color="#fff" />
            <Text style={styles.statNumber}>{stats.completedSessions}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#9C27B0' }]}>
            <MaterialIcons name="star" size={32} color="#fff" />
            <Text style={styles.statNumber}>{stats.averageRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>
      </View>

      {/* Coach Info */}
      {coachProfile && (
        <View style={styles.coachInfoCard}>
          <Text style={styles.sectionTitle}>Coach Profile</Text>
          {coachProfile.coach_specialization && (
            <View style={styles.infoRow}>
              <MaterialIcons name="star" size={20} color={thematicBlue} />
              <Text style={styles.infoLabel}>Specialization:</Text>
              <Text style={styles.infoValue}>{coachProfile.coach_specialization}</Text>
            </View>
          )}
          {coachProfile.coach_experience_years && (
            <View style={styles.infoRow}>
              <MaterialIcons name="trending-up" size={20} color={thematicBlue} />
              <Text style={styles.infoLabel}>Experience:</Text>
              <Text style={styles.infoValue}>{coachProfile.coach_experience_years} years</Text>
            </View>
          )}
        </View>
      )}

      {/* Students List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Students ({students.length})</Text>
        {students.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No students yet</Text>
            <Text style={styles.emptyStateSubtext}>Students will appear here once they book sessions with you</Text>
          </View>
        ) : (
          students.map((student) => (
            <View key={student.id} style={styles.studentCard}>
              <Image
                source={{
                  uri: student.profile_picture_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80'
                }}
                style={styles.studentImage}
              />
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>
                  {student.first_name} {student.last_name}
                </Text>
                <View style={styles.studentDetail}>
                  <MaterialIcons name="sports-tennis" size={16} color="#666" />
                  <Text style={styles.studentSkill}>{student.skill_level || 'Beginner'}</Text>
                </View>
                <View style={styles.studentDetail}>
                  <MaterialIcons name="event" size={16} color="#666" />
                  <Text style={styles.sessionCount}>{student.totalSessions} sessions</Text>
                </View>
                <View style={styles.studentActions}>
                  <TouchableOpacity
                    style={styles.studentActionButton}
                    onPress={() => handleViewStudentProfile(student)}
                  >
                    <MaterialIcons name="person" size={18} color={thematicBlue} />
                    <Text style={styles.studentActionText}>Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.studentActionButton}
                    onPress={() => handleScheduleSession(student)}
                  >
                    <MaterialIcons name="calendar-today" size={18} color={thematicBlue} />
                    <Text style={styles.studentActionText}>Schedule</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={thematicBlue} />
        <Text style={styles.loadingText}>Loading coach data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={thematicBlue} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Coach Dashboard</Text>
        {isVerifiedCoach && (
          <View style={styles.verifiedBadge}>
            <MaterialIcons name="verified" size={20} color={activeColor} />
          </View>
        )}
        {!isVerifiedCoach && <View style={{ width: 40 }} />}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!isVerifiedCoach && coachProfile?.coach_verification_requested
          ? renderPendingVerification()
          : !isVerifiedCoach
          ? renderNotCoach()
          : renderCoachDashboard()}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Professional Application Modal */}
      <ProfessionalApplicationModal
        visible={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        applicationType="COACH"
        userId={user?.id}
        onSuccess={handleApplicationSuccess}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: thematicBlue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  verifiedBadge: {
    backgroundColor: 'rgba(163, 255, 1, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
  },
  statsContainer: {
    marginTop: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: thematicBlue,
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 5,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  coachInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginTop: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff',
    borderRadius: 15,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 15,
    padding: 15,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  studentImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  studentInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  studentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    gap: 5,
  },
  studentSkill: {
    fontSize: 13,
    color: '#666',
  },
  sessionCount: {
    fontSize: 13,
    color: '#666',
  },
  studentActions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  studentActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 5,
  },
  studentActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: thematicBlue,
  },
  notCoachContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 30,
    marginTop: 20,
    alignItems: 'center',
  },
  notCoachTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  notCoachText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 25,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    color: '#333',
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: thematicBlue,
    borderRadius: 12,
    padding: 15,
    width: '100%',
    gap: 10,
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  pendingContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 30,
    marginTop: 20,
    alignItems: 'center',
  },
  pendingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  pendingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 15,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: thematicBlue,
    lineHeight: 20,
  },
});

export default CoachScreen;
