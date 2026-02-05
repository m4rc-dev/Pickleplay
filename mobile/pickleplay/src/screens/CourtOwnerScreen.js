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

const CourtOwnerScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('owner'); // 'owner' or 'player'
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

      // Check if user has COURT_OWNER role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', user.id)
        .single();

      if (profileData) {
        const hasCourtOwnerRole = profileData.roles?.includes('COURT_OWNER');
        setIsVerifiedCourtOwner(hasCourtOwnerRole);

        if (hasCourtOwnerRole) {
          await fetchCourtOwnerData();
        } else {
          // Check for pending application
          const { data: applications } = await supabase
            .from('professional_applications')
            .select('status')
            .eq('profile_id', user.id)
            .eq('requested_role', 'COURT_OWNER')
            .eq('status', 'PENDING')
            .single();

          setApplicationPending(!!applications);
        }
      }
    } catch (error) {
      console.error('Error checking court owner status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourtOwnerData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Fetch courts owned by this user
      const { data: courts, error: courtsError } = await supabase
        .from('courts')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (courtsError) throw courtsError;

      setOwnedCourts(courts || []);

      // Fetch booking statistics
      if (courts && courts.length > 0) {
        const courtIds = courts.map(c => c.id);
        
        // Get total bookings count
        const { count: bookingsCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .in('court_id', courtIds);

        // Get active bookings (today and future)
        const today = new Date().toISOString().split('T')[0];
        const { count: activeBookingsCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .in('court_id', courtIds)
          .gte('booking_date', today)
          .eq('status', 'confirmed');

        // Get monthly revenue (this month's bookings)
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const { data: monthlyBookings } = await supabase
          .from('bookings')
          .select('total_price')
          .in('court_id', courtIds)
          .gte('booking_date', firstDayOfMonth)
          .eq('status', 'confirmed');

        const revenue = monthlyBookings?.reduce((sum, booking) => sum + (booking.total_price || 0), 0) || 0;

        setStats({
          totalCourts: courts.length,
          totalBookings: bookingsCount || 0,
          monthlyRevenue: revenue,
          activeBookings: activeBookingsCount || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching court owner data:', error);
      Alert.alert('Error', 'Failed to load court owner data');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkCourtOwnerStatus();
    setRefreshing(false);
  };

  const handleRequestVerification = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please login to apply as a court owner');
      return;
    }

    setShowApplicationModal(true);
  };

  const handleApplicationSuccess = () => {
    checkCourtOwnerStatus(); // Refresh status
  };

  const handleAddCourt = () => {
    Alert.alert('Add New Court', 'Feature coming soon!');
    // navigation.navigate('AddCourt');
  };

  const handleViewCourtDetails = (court) => {
    navigation.navigate('CourtDetail', { courtId: court.id });
  };

  const handleManageBookings = (court) => {
    Alert.alert('Manage Bookings', `Managing bookings for ${court.name}`);
    // navigation.navigate('ManageBookings', { courtId: court.id });
  };

  const renderPendingVerification = () => (
    <View style={styles.pendingContainer}>
      <MaterialIcons name="pending" size={64} color="#FF9800" />
      <Text style={styles.pendingTitle}>Verification Pending</Text>
      <Text style={styles.pendingText}>
        Your court owner verification request is being reviewed by our admin team. 
        You will receive a notification once your application is approved.
      </Text>
      <View style={styles.infoBox}>
        <MaterialIcons name="info" size={20} color={thematicBlue} />
        <Text style={styles.infoText}>
          This usually takes 1-3 business days. We verify court ownership to ensure 
          quality and authenticity for our community.
        </Text>
      </View>
    </View>
  );

  const renderNotCourtOwner = () => (
    <View style={styles.notCourtOwnerContainer}>
      <MaterialIcons name="domain" size={64} color="#ccc" />
      <Text style={styles.notCourtOwnerTitle}>Become a Court Owner</Text>
      <Text style={styles.notCourtOwnerText}>
        List your pickleball court and start managing bookings. 
        Request court owner verification to get started.
      </Text>
      <View style={styles.benefitsContainer}>
        <View style={styles.benefitItem}>
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.benefitText}>Manage your court bookings</Text>
        </View>
        <View style={styles.benefitItem}>
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.benefitText}>Generate rental income</Text>
        </View>
        <View style={styles.benefitItem}>
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.benefitText}>Track statistics and revenue</Text>
        </View>
        <View style={styles.benefitItem}>
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.benefitText}>Reach more players</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.requestButton} onPress={handleRequestVerification}>
        <MaterialIcons name="how-to-reg" size={24} color="#fff" />
        <Text style={styles.requestButtonText}>Request Court Owner Verification</Text>
      </TouchableOpacity>
    </View>
  );

  const renderOwnerView = () => (
    <View>
      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#4CAF50' }]}>
            <MaterialIcons name="domain" size={32} color="#fff" />
            <Text style={styles.statNumber}>{stats.totalCourts}</Text>
            <Text style={styles.statLabel}>Total Courts</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#2196F3' }]}>
            <MaterialIcons name="event-available" size={32} color="#fff" />
            <Text style={styles.statNumber}>{stats.activeBookings}</Text>
            <Text style={styles.statLabel}>Active Bookings</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#FF9800' }]}>
            <MaterialIcons name="calendar-today" size={32} color="#fff" />
            <Text style={styles.statNumber}>{stats.totalBookings}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#9C27B0' }]}>
            <MaterialIcons name="attach-money" size={32} color="#fff" />
            <Text style={styles.statNumber}>₱{stats.monthlyRevenue.toLocaleString()}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>
      </View>

      {/* Add New Court Button */}
      <TouchableOpacity style={styles.addButton} onPress={handleAddCourt}>
        <MaterialIcons name="add-circle" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add New Court</Text>
      </TouchableOpacity>

      {/* Courts List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Courts ({ownedCourts.length})</Text>
        {ownedCourts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="domain" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No courts added yet</Text>
            <Text style={styles.emptyStateSubtext}>Add your first court to start managing bookings</Text>
          </View>
        ) : (
          ownedCourts.map((court) => (
            <View key={court.id} style={styles.courtCard}>
              <Image
                source={{ uri: court.image_url || 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=400&q=80' }}
                style={styles.courtImage}
              />
              <View style={styles.courtInfo}>
                <Text style={styles.courtName}>{court.name}</Text>
                <View style={styles.courtDetail}>
                  <MaterialIcons name="location-on" size={16} color="#666" />
                  <Text style={styles.courtLocation}>{court.location || court.address}</Text>
                </View>
                <View style={styles.courtDetail}>
                  <MaterialIcons name="attach-money" size={16} color="#666" />
                  <Text style={styles.courtPrice}>₱{court.price_per_hour}/hr</Text>
                </View>
                <View style={styles.courtActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleViewCourtDetails(court)}
                  >
                    <MaterialIcons name="visibility" size={18} color={thematicBlue} />
                    <Text style={styles.actionButtonText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleManageBookings(court)}
                  >
                    <MaterialIcons name="event" size={18} color={thematicBlue} />
                    <Text style={styles.actionButtonText}>Bookings</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );

  const renderPlayerView = () => (
    <View style={styles.playerViewContainer}>
      <Text style={styles.sectionTitle}>Player Features</Text>
      <Text style={styles.infoText}>
        Switch to Player view to access all player features including booking courts, 
        finding matches, and viewing your play history.
      </Text>
      <TouchableOpacity
        style={styles.navigateButton}
        onPress={() => navigation.navigate('Home', { screenIndex: 0 })}
      >
        <MaterialIcons name="sports-tennis" size={24} color="#fff" />
        <Text style={styles.navigateButtonText}>Go to Player Dashboard</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={thematicBlue} />
        <Text style={styles.loadingText}>Loading court owner data...</Text>
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
        <Text style={styles.headerTitle}>Court Owner Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* View Mode Selector */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'owner' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('owner')}
        >
          <MaterialIcons
            name="domain"
            size={20}
            color={viewMode === 'owner' ? thematicBlue : '#666'}
          />
          <Text
            style={[styles.viewModeText, viewMode === 'owner' && styles.viewModeTextActive]}
          >
            Court Owner
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'player' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('player')}
        >
          <MaterialIcons
            name="sports-tennis"
            size={20}
            color={viewMode === 'player' ? thematicBlue : '#666'}
          />
          <Text
            style={[styles.viewModeText, viewMode === 'player' && styles.viewModeTextActive]}
          >
            Player
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!isVerifiedCourtOwner && applicationPending && renderPendingVerification()}
        {!isVerifiedCourtOwner && !applicationPending && renderNotCourtOwner()}
        {isVerifiedCourtOwner && (viewMode === 'owner' ? renderOwnerView() : renderPlayerView())}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Professional Application Modal */}
      <ProfessionalApplicationModal
        visible={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        applicationType="COURT_OWNER"
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
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 10,
    padding: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  viewModeButtonActive: {
    backgroundColor: activeColor,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  viewModeTextActive: {
    color: thematicBlue,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: activeColor,
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    marginBottom: 20,
    gap: 10,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: thematicBlue,
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
  courtCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  courtImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  courtInfo: {
    padding: 15,
  },
  courtName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  courtDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 5,
  },
  courtLocation: {
    fontSize: 14,
    color: '#666',
  },
  courtPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  courtActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 5,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: thematicBlue,
  },
  playerViewContainer: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: thematicBlue,
    borderRadius: 12,
    padding: 15,
    gap: 10,
  },
  navigateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  notCourtOwnerContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 30,
    marginTop: 20,
    alignItems: 'center',
  },
  notCourtOwnerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  notCourtOwnerText: {
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
});

export default CourtOwnerScreen;
