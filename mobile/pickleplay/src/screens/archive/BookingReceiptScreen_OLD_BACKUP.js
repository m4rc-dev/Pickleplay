import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import Colors from '../constants/Colors';

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

const BookingReceiptScreen = ({ navigation, route }) => {
    const { bookingId } = route.params || {};
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (bookingId) {
            fetchBooking();
        } else {
            setLoading(false);
            Alert.alert('Error', 'No booking ID provided');
        }
    }, [bookingId]);

    const fetchBooking = async () => {
        try {
            setLoading(true);

            // Fetch booking with court and player details
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
                    ),
                    player:player_id (
                        id,
                        full_name,
                        email
                    )
                `)
                .eq('id', bookingId)
                .single();

            if (error) throw error;

            setBooking(data);
        } catch (error) {
            console.error('Error fetching booking:', error);
            Alert.alert('Error', 'Failed to load booking details');
        } finally {
            setLoading(false);
        }
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
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };

    if (!booking) {
        return (
            <SafeAreaView style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={64} color="#fff" />
                <Text style={styles.errorText}>No booking details found.</Text>
                <TouchableOpacity style={styles.homeButton} onPress={() => navigation.navigate('Home')}>
                    <Text style={styles.homeButtonText}>Go Home</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const courtFee = parseFloat(booking.total_price) * 0.909; // Reverse calculate (total / 1.1)
    const serviceFee = parseFloat(booking.total_price) - courtFee;

    const handleDone = () => {
        // Navigate to Home and ensure the state is fully reset
        navigation.reset({
            index: 0,
            routes: [{ name: 'Home', params: { screenIndex: 0 } }],
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={activeColor} />
                    <Text style={styles.loadingText}>Loading receipt...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={thematicBlue} />

            <ScrollView contentContainerStyle={styles.content}>

                {/* Success Icon */}
                <View style={styles.successHeader}>
                    <View style={styles.iconContainer}>
                        <MaterialIcons name="check" size={50} color={Colors.white} />
                    </View>
                    <Text style={styles.successTitle}>Booking Confirmed!</Text>
                    <Text style={styles.successSubtitle}>Your court is reserved.</Text>
                </View>

                {/* Receipt Card */}
                <View style={styles.receiptCard}>
                    {/* Court Info */}
                    <View style={styles.headerRow}>
                        <Text style={styles.label}>Booking ID</Text>
                        <Text style={styles.value}>{booking.id.substring(0, 8).toUpperCase()}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.courtSection}>
                        <Text style={styles.courtName}>{booking.court?.name || 'Court'}</Text>
                        <Text style={styles.courtLocation}>
                            {booking.court?.location?.address || ''}{booking.court?.location?.address && booking.court?.location?.city ? ', ' : ''}{booking.court?.location?.city || ''}
                        </Text>
                    </View>

                    <View style={styles.detailsRow}>
                        <View style={styles.detailItem}>
                            <MaterialIcons name="calendar-today" size={20} color={thematicBlue} />
                            <Text style={styles.detailText}>{formatDate(booking.date)}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <MaterialIcons name="access-time" size={20} color={thematicBlue} />
                            <Text style={styles.detailText}>
                                {`${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Payment Info */}
                    <View style={styles.row}>
                        <Text style={styles.label}>Court Fee</Text>
                        <Text style={styles.value}>₱{courtFee.toFixed(2)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Service Fee</Text>
                        <Text style={styles.value}>₱{serviceFee.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.row, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Total Paid</Text>
                        <Text style={styles.totalValue}>₱{parseFloat(booking.total_price).toFixed(2)}</Text>
                    </View>

                    <View style={styles.divider} />

                    {/* Payment Method */}
                    <View style={styles.row}>
                        <Text style={styles.label}>Payment Method</Text>
                        <Text style={styles.value}>Credit Card ****1234</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Payment Status</Text>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>
                                {(booking.payment_status || 'paid').toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Thank You Section */}
                <View style={styles.thankYouSection}>
                    <Image
                        source={require('../assets/PickleplayPH.png')}
                        style={styles.thankYouLogo}
                    />
                    <Text style={styles.thankYouTitle}>Thank you for booking!</Text>
                    <Text style={styles.thankYouSubtext}>We hope you have a great game</Text>
                </View>

                <Image
                    source={require('../assets/PickleplayPH.png')}
                    style={styles.watermark}
                    resizeMode="contain"
                />

            </ScrollView>

            {/* Done Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
                    <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: thematicBlue,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: thematicBlue,
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: Colors.white,
        marginTop: 20,
        marginBottom: 30,
    },
    homeButton: {
        backgroundColor: activeColor,
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
    },
    homeButtonText: {
        color: thematicBlue,
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: Colors.white,
    },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    successHeader: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 20,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: activeColor,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.white,
        marginBottom: 5,
    },
    successSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
    },
    receiptCard: {
        width: '100%',
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    label: {
        fontSize: 14,
        color: '#666',
    },
    value: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 15,
    },
    courtSection: {
        marginBottom: 15,
    },
    courtName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: thematicBlue,
        marginBottom: 5,
    },
    courtLocation: {
        fontSize: 14,
        color: '#666',
    },
    detailsRow: {
        flexDirection: 'row',
        marginBottom: 10,
        gap: 20,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    detailText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    totalRow: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: thematicBlue,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: activeColor,
    },
    statusBadge: {
        backgroundColor: activeColor,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: thematicBlue,
        fontSize: 12,
        fontWeight: 'bold',
    },
    watermark: {
        width: 50,
        height: 50,
        opacity: 0.5,
        marginTop: 20,
        alignSelf: 'center',
    },
    thankYouSection: {
        alignItems: 'center',
        marginTop: 30,
        paddingHorizontal: 20,
    },
    thankYouLogo: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 15,
    },
    thankYouTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.white,
        marginBottom: 5,
    },
    thankYouSubtext: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        fontStyle: 'italic',
    },
    footer: {
        padding: 20,
        paddingBottom: 30,
    },
    doneButton: {
        backgroundColor: activeColor,
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
    },
    doneButtonText: {
        color: thematicBlue,
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default BookingReceiptScreen;
