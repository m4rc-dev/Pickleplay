import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Image,
} from 'react-native';
import { supabase } from '../lib/supabase';
import Colors from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const BookingReceiptScreen = ({ route, navigation }) => {
    const { bookingId } = route.params;
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchBookingDetails();
    }, [bookingId]);

    const fetchBookingDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    courts (*)
                `)
                .eq('id', bookingId)
                .single();

            if (error) throw error;
            setBooking(data);
        } catch (err) {
            console.error('Error fetching booking:', err);
            setError('Failed to load booking details');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (timeString) => {
        try {
            // Handle time strings like "14:00:00" or "2:00 PM"
            if (typeof timeString === 'string' && timeString.includes(':')) {
                const [hours, minutes] = timeString.split(':').slice(0, 2);
                const hour = parseInt(hours);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour % 12 || 12;
                return `${displayHour}:${minutes} ${ampm}`;
            }
            // Fallback for datetime strings
            const date = new Date(timeString);
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            console.error('Error formatting time:', error);
            return timeString;
        }
    };

    const handleDone = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.lime400} />
                    <Text style={styles.loadingText}>Loading receipt...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error || !booking) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color={Colors.lime400} />
                    <Text style={styles.errorText}>{error || 'Booking not found'}</Text>
                    <TouchableOpacity style={styles.homeButton} onPress={handleDone}>
                        <Text style={styles.homeButtonText}>GO HOME</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const serviceFee = booking.total_price * 0.1;
    const totalAmount = booking.total_price + serviceFee;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Close Button Header */}
            <View style={styles.headerClose}>
                <TouchableOpacity onPress={handleDone} style={styles.closeButtonContainer}>
                    <Ionicons name="close" size={28} color={Colors.white} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Success Header */}
                <View style={styles.successHeader}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="checkmark" size={48} color={Colors.slate950} />
                    </View>
                    <Text style={styles.successTitle}>BOOKING CONFIRMED!</Text>
                    <Text style={styles.successSubtitle}>Your court is reserved</Text>
                </View>

                {/* Receipt Card */}
                <View style={styles.receiptCard}>
                    {/* Booking ID & Status */}
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={styles.label}>BOOKING ID</Text>
                            <Text style={styles.bookingId}>#{booking.id}</Text>
                        </View>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>CONFIRMED</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Court Information */}
                    <View style={styles.courtSection}>
                        <Text style={styles.sectionLabel}>COURT DETAILS</Text>
                        <Text style={styles.courtName}>{booking.courts?.name || 'Court'}</Text>
                        <View style={styles.locationRow}>
                            <Ionicons name="location" size={16} color={Colors.slate500} />
                            <Text style={styles.courtLocation}>
                                {booking.courts?.location || 'Location'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Date & Time Details */}
                    <View style={styles.detailsSection}>
                        <Text style={styles.sectionLabel}>RESERVATION TIME</Text>
                        
                        <View style={styles.detailItem}>
                            <View style={styles.detailIconContainer}>
                                <Ionicons name="calendar" size={20} color={Colors.lime400} />
                            </View>
                            <View style={styles.detailTextContainer}>
                                <Text style={styles.detailLabel}>Date</Text>
                                <Text style={styles.detailValue}>{formatDate(booking.date)}</Text>
                            </View>
                        </View>

                        <View style={styles.detailItem}>
                            <View style={styles.detailIconContainer}>
                                <Ionicons name="time" size={20} color={Colors.lime400} />
                            </View>
                            <View style={styles.detailTextContainer}>
                                <Text style={styles.detailLabel}>Time</Text>
                                <Text style={styles.detailValue}>
                                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Payment Summary */}
                    <View style={styles.paymentSection}>
                        <Text style={styles.sectionLabel}>PAYMENT SUMMARY</Text>
                        
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Court Rental</Text>
                            <Text style={styles.rowValue}>₱{booking.total_price.toFixed(2)}</Text>
                        </View>
                        
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Service Fee</Text>
                            <Text style={styles.rowValue}>₱{serviceFee.toFixed(2)}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>TOTAL PAID</Text>
                            <Text style={styles.totalValue}>₱{totalAmount.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* Thank You Section */}
                <View style={styles.thankYouSection}>
                    <Image
                        source={require('../assets/PickleplayPH.png')}
                        style={styles.thankYouLogo}
                    />
                    <Text style={styles.thankYouTitle}>THANK YOU FOR BOOKING!</Text>
                    <Text style={styles.thankYouSubtext}>
                        We hope you have an amazing game
                    </Text>
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
                    <Text style={styles.doneButtonText}>DONE</Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.slate950,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 20,
        fontSize: 16,
        fontWeight: '600',
        color: Colors.slate300,
        letterSpacing: -0.5,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.slate200,
        marginTop: 20,
        marginBottom: 30,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    homeButton: {
        backgroundColor: Colors.lime400,
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 24,
        shadowColor: Colors.lime400,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    homeButtonText: {
        color: Colors.slate950,
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    successHeader: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 20,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: Colors.lime400,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: Colors.lime400,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: Colors.white,
        marginBottom: 8,
        letterSpacing: -1,
    },
    successSubtitle: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.slate400,
        letterSpacing: -0.5,
    },
    receiptCard: {
        width: '100%',
        backgroundColor: Colors.white,
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.slate500,
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    bookingId: {
        fontSize: 20,
        fontWeight: '900',
        color: Colors.slate950,
        letterSpacing: -0.5,
    },
    statusBadge: {
        backgroundColor: Colors.lime400,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    statusText: {
        color: Colors.slate950,
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.slate200,
        marginVertical: 20,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.slate500,
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    courtSection: {
        marginBottom: 0,
    },
    courtName: {
        fontSize: 22,
        fontWeight: '900',
        color: Colors.slate950,
        marginBottom: 8,
        letterSpacing: -1,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    courtLocation: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.slate600,
        letterSpacing: -0.3,
    },
    detailsSection: {
        gap: 16,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    detailIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.slate100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailTextContainer: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.slate500,
        marginBottom: 2,
        letterSpacing: -0.3,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.slate950,
        letterSpacing: -0.5,
    },
    paymentSection: {
        marginBottom: 0,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    rowLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.slate600,
        letterSpacing: -0.3,
    },
    rowValue: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.slate950,
        letterSpacing: -0.5,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 4,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '900',
        color: Colors.slate950,
        letterSpacing: -0.5,
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.lime400,
        letterSpacing: -1,
    },
    thankYouSection: {
        alignItems: 'center',
        marginTop: 40,
        paddingHorizontal: 20,
    },
    thankYouLogo: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 20,
        borderWidth: 3,
        borderColor: Colors.slate800,
    },
    thankYouTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: Colors.white,
        marginBottom: 8,
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    thankYouSubtext: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.slate400,
        letterSpacing: -0.3,
        textAlign: 'center',
    },
    watermark: {
        width: 60,
        height: 60,
        opacity: 0.15,
        marginTop: 30,
        alignSelf: 'center',
    },
    headerClose: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: Colors.slate950,
    },
    closeButtonContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(132, 204, 22, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        padding: 20,
        paddingBottom: 30,
        backgroundColor: Colors.slate950,
    },
    doneButton: {
        backgroundColor: Colors.lime400,
        paddingVertical: 18,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: Colors.lime400,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    doneButtonText: {
        color: Colors.slate950,
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
});

export default BookingReceiptScreen;
