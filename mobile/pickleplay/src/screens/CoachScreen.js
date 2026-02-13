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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Colors from '../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import ProfessionalApplicationModal from '../components/ProfessionalApplicationModal';

const CoachScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isVerifiedCoach, setIsVerifiedCoach] = useState(false);
  const [applicationPending, setApplicationPending] = useState(false);
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

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('professional_status, professional_type')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const isPendingCoach = profile?.professional_status === 'PENDING' &&
                             profile?.professional_type === 'COACH';
      const isVerified = profile?.professional_status === 'VERIFIED' &&
                         profile?.professional_type === 'COACH';

      setApplicationPending(isPendingCoach);
      setIsVerifiedCoach(isVerified);
      setCoachProfile(profile);

      if (isVerified) {
        await fetchCoachData();
      }
    } catch (error) {
      console.error('Error checking coach status:', error);
      Alert.alert('Error', 'Failed to load coach data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCoachData = async () => {
    try {
      const { count: totalStudents } = await supabase
        .from('coach_students')
        .select('*', { count: 'exact' })
        .eq('coach_id', user.id);

      const { count: activeSessions } = await supabase
        .from('coaching_sessions')
        .select('*', { count: 'exact' })
        .eq('coach_id', user.id)
        .eq('status', 'SCHEDULED');

      const { count: completedSessions } = await supabase
        .from('coaching_sessions')
        .select('*', { count: 'exact' })
        .eq('coach_id', user.id)
        .eq('status', 'COMPLETED');

      setStats({
        totalStudents: totalStudents || 0,
        activeSessions: activeSessions || 0,
        completedSessions: completedSessions || 0,
        averageRating: 4.8,
      });

      const { data: studentsData } = await supabase
        .from('coach_students')
        .select('*')
        .eq('coach_id', user.id)
        .limit(5);

      setStudents(studentsData || []);
    } catch (err) {
      console.error('Error fetching coach data:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (isVerifiedCoach) {
      await fetchCoachData();
    }
    setRefreshing(false);
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.slate950} />

      <LinearGradient
        colors={[Colors.slate950, Colors.slate900]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Coach</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.lime400} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : !isVerifiedCoach && !applicationPending ? (
          <View style={styles.notVerifiedContainer}>
            <View style={styles.statusSection}>
              <View style={styles.iconContainer}>
                <Ionicons name="school" size={64} color={Colors.slate300} />
              </View>
              <Text style={styles.statusTitle}>Not Verified</Text>
              <Text style={styles.statusDescription}>
                Apply to become a verified coach and start teaching
              </Text>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowApplicationModal(true)}
              >
                <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                <Text style={styles.applyButtonText}>Apply as Coach</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : applicationPending ? (
          <View style={styles.pendingContainer}>
            <View style={styles.statusSection}>
              <View style={styles.iconContainer}>
                <Ionicons name="time" size={64} color={Colors.slate300} />
              </View>
              <Text style={styles.statusTitle}>Application Pending</Text>
              <Text style={styles.statusDescription}>
                Your coach application is being reviewed. You'll be notified soon
              </Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="people" size={28} color={Colors.lime400} />
                </View>
                <Text style={styles.statValue}>{stats.totalStudents}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="play-circle" size={28} color={Colors.lime400} />
                </View>
                <Text style={styles.statValue}>{stats.activeSessions}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="checkmark-circle" size={28} color={Colors.lime400} />
                </View>
                <Text style={styles.statValue}>{stats.completedSessions}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="star" size={28} color={Colors.lime400} />
                </View>
                <Text style={styles.statValue}>{stats.averageRating}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people" size={20} color={Colors.lime400} />
                <Text style={styles.sectionTitle}>My Students</Text>
              </View>

              {students.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people" size={48} color={Colors.slate300} />
                  <Text style={styles.emptyTitle}>No Students Yet</Text>
                  <Text style={styles.emptyDescription}>
                    Your students will appear here when they join
                  </Text>
                </View>
              ) : (
                students.map((student) => (
                  <View key={student.id} style={styles.studentCard}>
                    <Image
                      source={{
                        uri: student.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.id}`,
                      }}
                      style={styles.studentAvatar}
                    />
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{student.name || 'Student'}</Text>
                      <View style={styles.studentMeta}>
                        <Ionicons name="calendar" size={12} color={Colors.slate500} />
                        <Text style={styles.studentMetaText}>
                          Sessions: {student.sessions_count || 0}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.studentActionButton}>
                      <Ionicons name="arrow-forward" size={20} color={Colors.white} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="add-circle" size={20} color={Colors.white} />
                <Text style={styles.actionButtonText}>Schedule Session</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <ProfessionalApplicationModal
        visible={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        applicationType="COACH"
        onSubmit={async () => {
          await checkCoachStatus();
          setShowApplicationModal(false);
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.slate600,
  },
  notVerifiedContainer: {
    padding: 20,
  },
  pendingContainer: {
    padding: 20,
  },
  statusSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.slate100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.slate950,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  statusDescription: {
    fontSize: 14,
    color: Colors.slate600,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  applyButton: {
    backgroundColor: Colors.lime400,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  applyButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  statsGrid: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.slate950,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.slate600,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.slate950,
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  emptyContainer: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.slate950,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 13,
    color: Colors.slate600,
    textAlign: 'center',
  },
  studentCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  studentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  studentMetaText: {
    fontSize: 11,
    color: Colors.slate600,
    fontWeight: '600',
  },
  studentActionButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.lime400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  actionButton: {
    backgroundColor: Colors.lime400,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.white,
  },
});

export default CoachScreen;
