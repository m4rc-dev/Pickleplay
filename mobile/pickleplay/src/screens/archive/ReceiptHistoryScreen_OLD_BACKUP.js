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
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Colors from '../constants/Colors';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

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

            // On web, use Share API directly
            if (Platform.OS === 'web') {
                await Share.share({
                    message: receiptText,
                    title: `Receipt - ${booking.court?.name || 'Booking'}`,
                });
                Alert.alert('Success', 'Receipt shared successfully');
            } else {
                // On mobile, save file and share
                const filename = `receipt_${booking.id.substring(0, 8)}.txt`;
                const fileUri = `${FileSystem.documentDirectory}${filename}`;

                // Write the text file
                await FileSystem.writeAsStringAsync(fileUri, receiptText, {
                    encoding: 'utf8',
                });

                // Check if sharing is available
                const isAvailable = await Sharing.isAvailableAsync();
                if (isAvailable) {
                    await Sharing.shareAsync(fileUri, {
                        mimeType: 'text/plain',
                        dialogTitle: 'Save Receipt',
                    });
                } else {
                    // Fallback to Share API
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

        return (
            <View key={booking.id} style={styles.bookingCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        <MaterialIcons name="receipt" size={24} color={thematicBlue} />
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.courtName}>{booking.court?.name || 'Court'}</Text>
                            <Text style={styles.bookingId}>ID: {booking.id.substring(0, 8).toUpperCase()}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(booking.status)}20` }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                            {(booking.status || 'pending').toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Details */}
                <View style={styles.cardDetails}>
                    <View style={styles.detailRow}>
                        <MaterialIcons name="location-on" size={16} color="#666" />
                        <Text style={styles.detailText}>
                            {booking.court?.location?.city || 'Location not set'}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <MaterialIcons name="calendar-today" size={16} color="#666" />
                        <Text style={styles.detailText}>{formatDate(booking.date)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <MaterialIcons name="access-time" size={16} color="#666" />
                        <Text style={styles.detailText}>
                            {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <MaterialIcons name="payments" size={16} color="#666" />
                        <Text style={styles.priceText}>₱{parseFloat(booking.total_price).toFixed(2)}</Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleViewReceipt(booking.id)}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="visibility" size={20} color={thematicBlue} />
                        <Text style={styles.actionButtonText}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.downloadButton]}
                        onPress={() => handleDownloadReceipt(booking)}
                        activeOpacity={0.7}
                        disabled={isDownloading}
                    >
                        {isDownloading ? (
                            <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                            <>
                                <MaterialIcons name="download" size={20} color={Colors.white} />
                                <Text style={styles.downloadButtonText}>Download</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <LinearGradient
                colors={[thematicBlue, '#0842A0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}
            >
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="arrow-back" size={28} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Receipt History</Text>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={thematicBlue} />
                    <Text style={styles.loadingText}>Loading receipts...</Text>
                </View>
            ) : bookings.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="receipt-long" size={80} color="#ccc" />
                    <Text style={styles.emptyText}>No bookings yet</Text>
                    <Text style={styles.emptySubtext}>Your booking receipts will appear here</Text>
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
                            colors={[thematicBlue]}
                            tintColor={thematicBlue}
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
        backgroundColor: '#f9fafb',
    },
    header: {
        paddingVertical: 20,
        paddingHorizontal: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginTop: 20,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    bookingCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
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
    },
    headerTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    courtName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    bookingId: {
        fontSize: 12,
        color: '#666',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    cardDetails: {
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
    },
    priceText: {
        fontSize: 16,
        fontWeight: '700',
        color: thematicBlue,
        marginLeft: 8,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: '#f0f0f0',
        gap: 6,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: thematicBlue,
    },
    downloadButton: {
        backgroundColor: thematicBlue,
    },
    downloadButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.white,
    },
});

export default ReceiptHistoryScreen;
