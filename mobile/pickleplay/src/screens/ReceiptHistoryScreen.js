import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Share,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Colors from '../constants/Colors';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const ReceiptHistoryScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          court:court_id (
            id,
            name,
            location:location_id (
              address,
              city
            )
          )
        `)
        .eq('player_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      Alert.alert('Error', 'Failed to load booking history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return Colors.lime400;
      case 'pending':
        return '#f59e0b';
      case 'cancelled':
        return '#ef4444';
      case 'completed':
        return Colors.lime400;
      default:
        return Colors.slate500;
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'checkmark-circle';
      case 'pending':
        return 'hourglass';
      case 'cancelled':
        return 'close-circle';
      case 'completed':
        return 'checkmark-done-circle';
      default:
        return 'help-circle';
    }
  };

  const handleViewReceipt = (bookingId) => {
    navigation.navigate('BookingReceipt', { bookingId });
  };

  const generateReceiptText = (booking) => {
    const courtFee = parseFloat(booking.total_price) * 0.909;
    const serviceFee = parseFloat(booking.total_price) - courtFee;

    return `
====================================
       PICKLEPLAY RECEIPT
====================================

Booking ID: ${booking.id.substring(0, 8).toUpperCase()}
Date: ${formatDate(booking.created_at)}

------------------------------------
COURT DETAILS
------------------------------------
Name: ${booking.court?.name || 'N/A'}
Location: ${booking.court?.location?.address || ''}, ${booking.court?.location?.city || ''}

------------------------------------
BOOKING DETAILS
------------------------------------
Date: ${formatDate(booking.date)}
Time: ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}

------------------------------------
PAYMENT BREAKDOWN
------------------------------------
Court Fee:     ₱${courtFee.toFixed(2)}
Service Fee:   ₱${serviceFee.toFixed(2)}
------------------------------------
Total Paid:    ₱${parseFloat(booking.total_price).toFixed(2)}

Payment Status: ${(booking.payment_status || 'unpaid').toUpperCase()}
Booking Status: ${(booking.status || 'pending').toUpperCase()}

====================================
     Thank you for booking!
     www.pickleplay.ph
====================================
        `.trim();
  };

  const handleDownloadReceipt = async (booking) => {
    try {
      setDownloadingId(booking.id);

      const receiptText = generateReceiptText(booking);

      if (Platform.OS === 'web') {
        await Share.share({
          message: receiptText,
          title: `Receipt - ${booking.court?.name || 'Booking'}`,
        });
        Alert.alert('Success', 'Receipt shared successfully');
      } else {
        const filename = `receipt_${booking.id.substring(0, 8)}.txt`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;

        await FileSystem.writeAsStringAsync(fileUri, receiptText, {
          encoding: 'utf8',
        });

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/plain',
            dialogTitle: 'Save Receipt',
          });
        } else {
          await Share.share({
            message: receiptText,
            title: `Receipt - ${booking.court?.name || 'Booking'}`,
          });
        }

        Alert.alert('Success', 'Receipt downloaded successfully');
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
      Alert.alert('Error', 'Failed to download receipt');
    } finally {
      setDownloadingId(null);
    }
  };

  const renderBookingCard = (booking) => {
    const isDownloading = downloadingId === booking.id;
    const statusColor = getStatusColor(booking.status);
    const statusIcon = getStatusIcon(booking.status);

    return (
      <TouchableOpacity
        key={booking.id}
        style={styles.bookingCard}
        activeOpacity={0.8}
      >
        {/* Card Header with Status */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: statusColor + '20' }]}>
              <Ionicons name="receipt" size={20} color={statusColor} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.courtName} numberOfLines={1}>
                {booking.court?.name || 'Court'}
              </Text>
              <Text style={styles.bookingId}>
                {booking.id.substring(0, 8).toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Ionicons name={statusIcon} size={16} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {(booking.status || 'pending').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Card Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Ionicons name="location-sharp" size={16} color={Colors.slate500} />
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {booking.court?.location?.city || 'Location not set'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="calendar" size={16} color={Colors.slate500} />
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{formatDate(booking.date)}</Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="time" size={16} color={Colors.slate500} />
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>
              {formatTime(booking.start_time)}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="cash" size={16} color={Colors.lime400} />
            <Text style={styles.detailLabel}>Total</Text>
            <Text style={[styles.detailValue, { color: Colors.lime400, fontWeight: '900' }]}>
              ₱{parseFloat(booking.total_price).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => handleViewReceipt(booking.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="eye" size={18} color={Colors.slate950} />
            <Text style={styles.viewButtonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.downloadButton, isDownloading && { opacity: 0.6 }]}
            onPress={() => handleDownloadReceipt(booking)}
            activeOpacity={0.7}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="download" size={18} color={Colors.white} />
                <Text style={styles.downloadButtonText}>Download</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[Colors.slate950, Colors.slate900]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receipt History</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.lime400} />
          <Text style={styles.loadingText}>Loading receipts...</Text>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="receipt" size={64} color={Colors.slate300} />
          </View>
          <Text style={styles.emptyText}>No Bookings Yet</Text>
          <Text style={styles.emptySubtext}>Your booking history will appear here</Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => navigation.navigate('FindCourts')}
          >
            <Ionicons name="search" size={18} color={Colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.exploreButtonText}>Find Courts</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.lime400]}
              tintColor={Colors.lime400}
            />
          }
        >
          {bookings.map(renderBookingCard)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.slate600,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.slate950,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptySubtext: {
    fontSize: 15,
    color: Colors.slate600,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 21,
  },
  exploreButton: {
    flexDirection: 'row',
    backgroundColor: Colors.lime400,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  bookingCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  courtName: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.slate950,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  bookingId: {
    fontSize: 12,
    color: Colors.slate600,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    marginHorizontal: -4,
  },
  detailItem: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.slate600,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate950,
    letterSpacing: -0.3,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.slate100,
    gap: 6,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: -0.2,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.lime400,
    gap: 6,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.2,
  },
});

export default ReceiptHistoryScreen;
