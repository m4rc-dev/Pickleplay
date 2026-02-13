import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const thematicBlue = '#0A56A7';

const CourtDetailModal = ({
  visible,
  onClose,
  court,
  currentUserId,
}) => {
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [pastBookings, setPastBookings] = useState([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    upcomingCount: 0,
  });

  useEffect(() => {
    if (visible && court) {
      fetchBookings();
    }
  }, [visible, court]);

  const fetchBookings = async () => {
    if (!court?.id) return;

    try {
      setLoading(true);

      // Fetch all bookings for this court with player details
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select(`
          *,
          player:player_id (
            id,
            full_name,
            username,
            dupr_rating,
            avatar_url
          )
        `)
        .eq('court_id', court.id)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;

      setBookings(bookingsData || []);

      // Separate upcoming and past bookings
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const upcoming = bookingsData.filter((booking) => {
        return (
          booking.date > today ||
          (booking.date === today && booking.start_time > currentTime)
        );
      });

      const past = bookingsData.filter((booking) => {
        return (
          booking.date < today ||
          (booking.date === today && booking.start_time <= currentTime)
        );
      });

      setUpcomingBookings(upcoming);
      setPastBookings(past);

      // Calculate stats
      const totalRevenue = bookingsData
        .filter((b) => b.payment_status === 'paid')
        .reduce((sum, b) => sum + (parseFloat(b.total_price) || 0), 0);

      setStats({
        totalBookings: bookingsData.length,
        totalRevenue: totalRevenue,
        upcomingCount: upcoming.length,
      });
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'cancelled':
        return '#ef4444';
      case 'completed':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return '#10b981';
      case 'unpaid':
        return '#f59e0b';
      case 'refunded':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (!court) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={[thematicBlue, '#0842A0']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Court Bookings</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={thematicBlue} />
            <Text style={styles.loadingText}>Loading bookings...</Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Court Info Card */}
            <View style={styles.courtInfoCard}>
              <View style={styles.courtHeader}>
                <MaterialIcons name="sports-tennis" size={32} color={thematicBlue} />
                <View style={styles.courtHeaderText}>
                  <Text style={styles.courtName}>{court?.name || 'Court'}</Text>
                  <Text style={styles.courtAddress}>{court?.location?.address || 'Address not available'}</Text>
                  <Text style={styles.courtDetails}>
                    {`${court?.num_courts || 0} courts • ${court?.surface_type || 'N/A'}`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <MaterialIcons name="event" size={24} color={thematicBlue} />
                <Text style={styles.statValue}>{String(stats.upcomingCount || 0)}</Text>
                <Text style={styles.statLabel}>Upcoming</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="history" size={24} color="#6b7280" />
                <Text style={styles.statValue}>{String(stats.totalBookings || 0)}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="attach-money" size={24} color="#10b981" />
                <Text style={styles.statValue}>₱{String((stats.totalRevenue || 0).toFixed(0))}</Text>
                <Text style={styles.statLabel}>Revenue</Text>
              </View>
            </View>

            {/* Upcoming Bookings */}
            {upcomingBookings.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
                {upcomingBookings.map((booking) => (
                  <View key={booking.id} style={styles.bookingCard}>
                    <View style={styles.bookingHeader}>
                      {booking.player?.avatar_url ? (
                        <Image
                          source={{ uri: booking.player.avatar_url }}
                          style={styles.playerAvatar}
                        />
                      ) : (
                        <View style={styles.playerAvatarPlaceholder}>
                          <MaterialIcons name="person" size={24} color="#999" />
                        </View>
                      )}
                      <View style={styles.bookingPlayerInfo}>
                        <Text style={styles.playerName}>
                          {booking.player?.full_name || booking.player?.username || 'Unknown Player'}
                        </Text>
                        {booking.player?.dupr_rating && (
                          <Text style={styles.playerRating}>
                            DUPR: {String(booking.player.dupr_rating)}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.bookingDetails}>
                      <View style={styles.bookingDetailRow}>
                        <MaterialIcons name="calendar-today" size={16} color="#666" />
                        <Text style={styles.bookingDetailText}>
                          {new Date(booking.date).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.bookingDetailRow}>
                        <MaterialIcons name="access-time" size={16} color="#666" />
                        <Text style={styles.bookingDetailText}>
                          {`${booking.start_time || 'TBD'} - ${booking.end_time || 'TBD'}`}
                        </Text>
                      </View>
                      <View style={styles.bookingDetailRow}>
                        <MaterialIcons name="payments" size={16} color="#666" />
                        <Text style={styles.bookingDetailText}>₱{String(booking.total_price || 0)}</Text>
                      </View>
                    </View>

                    <View style={styles.bookingFooter}>
                      <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(booking.status || 'pending')}20` }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(booking.status || 'pending') }]}>
                          {(booking.status || 'pending').toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: `${getPaymentStatusColor(booking.payment_status || 'unpaid')}20` }]}>
                        <Text style={[styles.statusText, { color: getPaymentStatusColor(booking.payment_status || 'unpaid') }]}>
                          {(booking.payment_status || 'unpaid').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Past Bookings */}
            {pastBookings.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Past Bookings</Text>
                {pastBookings.slice(0, 10).map((booking) => (
                  <View key={booking.id} style={styles.bookingCard}>
                    <View style={styles.bookingHeader}>
                      {booking.player?.avatar_url ? (
                        <Image
                          source={{ uri: booking.player.avatar_url }}
                          style={styles.playerAvatar}
                        />
                      ) : (
                        <View style={styles.playerAvatarPlaceholder}>
                          <MaterialIcons name="person" size={24} color="#999" />
                        </View>
                      )}
                      <View style={styles.bookingPlayerInfo}>
                        <Text style={styles.playerName}>
                          {booking.player?.full_name || booking.player?.username || 'Unknown Player'}
                        </Text>
                        {booking.player?.dupr_rating && (
                          <Text style={styles.playerRating}>
                            DUPR: {String(booking.player.dupr_rating)}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.bookingDetails}>
                      <View style={styles.bookingDetailRow}>
                        <MaterialIcons name="calendar-today" size={16} color="#666" />
                        <Text style={styles.bookingDetailText}>
                          {new Date(booking.date).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.bookingDetailRow}>
                        <MaterialIcons name="access-time" size={16} color="#666" />
                        <Text style={styles.bookingDetailText}>
                          {`${booking.start_time || 'TBD'} - ${booking.end_time || 'TBD'}`}
                        </Text>
                      </View>
                      <View style={styles.bookingDetailRow}>
                        <MaterialIcons name="payments" size={16} color="#666" />
                        <Text style={styles.bookingDetailText}>₱{String(booking.total_price || 0)}</Text>
                      </View>
                    </View>

                    <View style={styles.bookingFooter}>
                      <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(booking.status || 'pending')}20` }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(booking.status || 'pending') }]}>
                          {(booking.status || 'pending').toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: `${getPaymentStatusColor(booking.payment_status || 'unpaid')}20` }]}>
                        <Text style={[styles.statusText, { color: getPaymentStatusColor(booking.payment_status || 'unpaid') }]}>
                          {(booking.payment_status || 'unpaid').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Empty State */}
            {bookings.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="event-busy" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>No bookings yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Bookings will appear here once players book this court
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  courtInfoCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  courtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courtHeaderText: {
    marginLeft: 16,
    flex: 1,
  },
  courtName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  courtAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  courtDetails: {
    fontSize: 13,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  bookingCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  playerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  playerAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingPlayerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  playerRating: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  bookingDetails: {
    marginBottom: 12,
  },
  bookingDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bookingDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  bookingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
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
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default CourtDetailModal;
