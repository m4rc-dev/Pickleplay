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

const CourtOwnerScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('owner');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isVerifiedCourtOwner, setIsVerifiedCourtOwner] = useState(false);
  const [applicationPending, setApplicationPending] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [ownedCourts, setOwnedCourts] = useState([]);
  const [stats, setStats] = useState({
    totalCourts: 0,
    totalBookings: 0,
    monthlyRevenue: 0,
    activeBookings: 0,
  });

  useEffect(() => {
    checkCourtOwnerStatus();
  }, [user]);

  const checkCourtOwnerStatus = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('professional_status, professional_type')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      const isPendingCourtOwner = profileData?.professional_status === 'PENDING' &&
                                  profileData?.professional_type === 'COURT_OWNER';
      const isVerified = profileData?.professional_status === 'VERIFIED' &&
                         profileData?.professional_type === 'COURT_OWNER';

      setApplicationPending(isPendingCourtOwner);
      setIsVerifiedCourtOwner(isVerified);

      if (isVerified) {
        await fetchCourts();
        await fetchStats();
      }
    } catch (err) {
      console.error('Error checking court owner status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourts = async () => {
    try {
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOwnedCourts(data || []);
    } catch (err) {
      console.error('Error fetching courts:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: courtsData } = await supabase
        .from('courts')
        .select('id')
        .eq('owner_id', user.id);

      if (!courtsData || courtsData.length === 0) {
        setStats({
          totalCourts: 0,
          totalBookings: 0,
          monthlyRevenue: 0,
          activeBookings: 0,
        });
        return;
      }

      const courtIds = courtsData.map(c => c.id);

      const { count: totalBookings } = await supabase
        .from('bookings')
        .select('id', { count: 'exact' })
        .in('court_id', courtIds);

      const { count: activeBookings } = await supabase
        .from('bookings')
        .select('id', { count: 'exact' })
        .in('court_id', courtIds)
        .eq('status', 'CONFIRMED');

      setStats({
        totalCourts: courtsData.length,
        totalBookings: totalBookings || 0,
        monthlyRevenue: (courtsData.length * 5000) + (totalBookings || 0) * 250,
        activeBookings: activeBookings || 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (isVerifiedCourtOwner) {
      await fetchCourts();
      await fetchStats();
    }
    setRefreshing(false);
  };

  const handleAddCourt = () => {
    navigation.navigate('AddCourt');
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
        <Text style={styles.headerTitle}>Court Owner</Text>
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
        ) : !isVerifiedCourtOwner && !applicationPending ? (
          <View style={styles.notVerifiedContainer}>
            <View style={styles.statusSection}>
              <View style={styles.iconContainer}>
                <Ionicons name="alert-circle" size={64} color={Colors.slate300} />
              </View>
              <Text style={styles.statusTitle}>Not Verified</Text>
              <Text style={styles.statusDescription}>
                Apply to become a verified court owner and start managing your courts
              </Text>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowApplicationModal(true)}
              >
                <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                <Text style={styles.applyButtonText}>Apply as Court Owner</Text>
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
                Your court owner application is being reviewed. You'll be notified once approved
              </Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="checkmark-circle" size={28} color={Colors.lime400} />
                </View>
                <Text style={styles.statValue}>{stats.totalCourts}</Text>
                <Text style={styles.statLabel}>Courts</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="calendar" size={28} color={Colors.lime400} />
                </View>
                <Text style={styles.statValue}>{stats.activeBookings}</Text>
                <Text style={styles.statLabel}>Active Bookings</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="document-text" size={28} color={Colors.lime400} />
                </View>
                <Text style={styles.statValue}>{stats.totalBookings}</Text>
                <Text style={styles.statLabel}>Total Bookings</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="cash" size={28} color={Colors.lime400} />
                </View>
                <Text style={styles.statValue}>₱{(stats.monthlyRevenue / 1000).toFixed(0)}k</Text>
                <Text style={styles.statLabel}>Month Revenue</Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="map" size={20} color={Colors.lime400} />
                <Text style={styles.sectionTitle}>Your Courts</Text>
              </View>

              {ownedCourts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="map" size={48} color={Colors.slate300} />
                  <Text style={styles.emptyTitle}>No Courts Yet</Text>
                  <Text style={styles.emptyDescription}>
                    Add your first court to start accepting bookings
                  </Text>
                  <TouchableOpacity style={styles.addCourtButton} onPress={handleAddCourt}>
                    <Ionicons name="add-circle" size={20} color={Colors.white} />
                    <Text style={styles.addCourtButtonText}>Add Court</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {ownedCourts.map((court) => (
                    <View key={court.id} style={styles.courtCard}>
                      {court.cover_image && (
                        <Image
                          source={{ uri: court.cover_image }}
                          style={styles.courtImage}
                        />
                      )}
                      <View style={styles.courtInfo}>
                        <Text style={styles.courtName}>{court.name}</Text>
                        <View style={styles.courtMeta}>
                          <Ionicons name="location" size={14} color={Colors.slate500} />
                          <Text style={styles.courtLocation}>{court.city}</Text>
                        </View>
                        <View style={styles.courtStats}>
                          <View style={styles.courtStat}>
                            <Text style={styles.courtStatLabel}>Type:</Text>
                            <Text style={styles.courtStatValue}>{court.type}</Text>
                          </View>
                          <View style={styles.courtStat}>
                            <Text style={styles.courtStatLabel}>Surface:</Text>
                            <Text style={styles.courtStatValue}>{court.surface}</Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.courtActionButton}
                        onPress={() => navigation.navigate('CourtDetail', { court })}
                      >
                        <Ionicons name="arrow-forward" size={20} color={Colors.white} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity style={styles.addCourtCard} onPress={handleAddCourt}>
                    <Ionicons name="add-circle" size={44} color={Colors.lime400} />
                    <Text style={styles.addCourtCardText}>Add New Court</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <ProfessionalApplicationModal
        visible={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        applicationType="COURT_OWNER"
        onSubmit={async () => {
          await checkCourtOwnerStatus();
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
    marginBottom: 16,
  },
  addCourtButton: {
    backgroundColor: Colors.lime400,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addCourtButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  courtCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  courtImage: {
    width: 100,
    height: 100,
    backgroundColor: Colors.slate200,
  },
  courtInfo: {
    flex: 1,
    padding: 12,
  },
  courtName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.slate950,
    marginBottom: 6,
  },
  courtMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  courtLocation: {
    fontSize: 12,
    color: Colors.slate600,
    fontWeight: '500',
  },
  courtStats: {
    flexDirection: 'row',
    gap: 12,
  },
  courtStat: {
    flexDirection: 'row',
    gap: 4,
  },
  courtStatLabel: {
    fontSize: 10,
    color: Colors.slate600,
    fontWeight: '600',
  },
  courtStatValue: {
    fontSize: 10,
    color: Colors.slate950,
    fontWeight: '700',
  },
  courtActionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: Colors.lime400,
  },
  addCourtCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.lime400,
    borderStyle: 'dashed',
  },
  addCourtCardText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.lime400,
    marginTop: 10,
  },
});

export default CourtOwnerScreen;
