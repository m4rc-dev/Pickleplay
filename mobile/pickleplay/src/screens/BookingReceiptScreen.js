import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

const BookingReceiptScreen = ({ navigation, route }) => {
    const { bookingDetails } = route.params || {};

    // Static fallback data if no booking details passed
    const staticBookingDetails = {
        bookingId: 'BK-DEMO12345',
        court: {
            name: 'Banawa Community Court',
            location: 'Banawa, Cebu City',
            rating: 4.8,
        },
        date: 'February 3, 2026',
        time: '08:00 AM',
        guests: 2,
        courtFee: '$20.00',
        serviceFee: '$2.00',
        totalPrice: '$22.00',
        paymentMethod: 'Credit Card ****1234',
        paymentStatus: 'Paid',
        bookingStatus: 'Confirmed',
    };

    const booking = bookingDetails || staticBookingDetails;

    if (!booking) {
        return (
            <View style={styles.errorContainer}>
                <Text>Error: No booking details found.</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                    <Text style={{ color: thematicBlue, marginTop: 10 }}>Go Home</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const { court, date, time, guests, courtFee, serviceFee, totalPrice, bookingId, paymentMethod, paymentStatus } = booking;

    const handleDone = () => {
        // Navigate to Home and ensure the state is fully reset
        navigation.reset({
            index: 0,
            routes: [{ name: 'Home', params: { screenIndex: 0 } }],
        });
    };

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
                        <Text style={styles.value}>{bookingId}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.courtSection}>
                        <Text style={styles.courtName}>{court?.name}</Text>
                        <Text style={styles.courtLocation}>{court?.location}</Text>
                    </View>

                    <View style={styles.detailsRow}>
                        <View style={styles.detailItem}>
                            <MaterialIcons name="calendar-today" size={20} color={thematicBlue} />
                            <Text style={styles.detailText}>{date}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <MaterialIcons name="access-time" size={20} color={thematicBlue} />
                            <Text style={styles.detailText}>{time}</Text>
                        </View>
                    </View>

                    <View style={styles.detailItem}>
                        <MaterialIcons name="people" size={20} color={thematicBlue} />
                        <Text style={styles.detailText}>{guests} Players</Text>
                    </View>

                    <View style={styles.divider} />

                    {/* Payment Info */}
                    <View style={styles.row}>
                        <Text style={styles.label}>Court Fee</Text>
                        <Text style={styles.value}>{courtFee}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Service Fee</Text>
                        <Text style={styles.value}>{serviceFee}</Text>
                    </View>
                    <View style={[styles.row, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Total Paid</Text>
                        <Text style={styles.totalValue}>{totalPrice}</Text>
                    </View>

                    <View style={styles.divider} />

                    {/* Payment Method */}
                    <View style={styles.row}>
                        <Text style={styles.label}>Payment Method</Text>
                        <Text style={styles.value}>{paymentMethod}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Payment Status</Text>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>{paymentStatus}</Text>
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
