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
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Colors from '../constants/Colors';
import commonStyles from '../styles/commonStyles';

const {width} = Dimensions.get('window');

const BookingScreen = ({ navigation, route }) => {
    const { user } = useAuth();
    const court = route.params?.court;

    const [selectedDate, setSelectedDate] = useState(0);
    const [selectedTime, setSelectedTime] = useState(null);
    const [guests, setGuests] = useState(2);
    const [loading, setLoading] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [timeSlots, setTimeSlots] = useState([]);
    const [dates, setDates] = useState([]);

    useEffect(() => {
        generateDates();
    }, []);

    useEffect(() => {
        if (dates.length > 0) {
            fetchAvailability();
        }
    }, [selectedDate, dates]);

    const generateDates = () => {
        const dateArray = [];
        const today = new Date();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dateArray.push({
                day: days[date.getDay()],
                date: date.getDate().toString().padStart(2, '0'),
                full: `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`,
                isoDate: date.toISOString().split('T')[0]
            });
        }
        setDates(dateArray);
    };

    const fetchAvailability = async () => {
        if (!court?.id || !dates[selectedDate]) return;

        try {
            setLoading(true);
            const selectedDateISO = dates[selectedDate].isoDate;

            const { data: existingBookings, error } = await supabase
                .from('bookings')
                .select('start_time, end_time')
                .eq('court_id', court.id)
                .eq('date', selectedDateISO)
                .in('status', ['confirmed', 'pending']);

            if (error) throw error;

            const slots = [];
            for (let hour = 6; hour <= 22; hour++) {
                const timeString = `${hour.toString().padStart(2, '0')}:00:00`;
                const displayTime = hour < 12 
                    ? `${hour}:00 AM` 
                    : hour === 12 
                        ? '12:00 PM'
                        : `${hour - 12}:00 PM`;

                const isBooked = existingBookings?.some(booking => {
                    return booking.start_time === timeString;
                });

                slots.push({
                    time: displayTime,
                    timeValue: timeString,
                    available: !isBooked
                });
            }

            setTimeSlots(slots);
        } catch (error) {
            console.error('Error fetching availability:', error);
            Alert.alert('Error', 'Failed to load availability');
        } finally {
            setLoading(false);
        }
    };

    const calculateEndTime = (startTime) => {
        const [hours] = startTime.split(':');
        const endHour = parseInt(hours) + 1;
        return `${endHour.toString().padStart(2, '0')}:00:00`;
    };

    const courtFee = parseFloat(court?.base_price) || 0;
    const serviceFee = courtFee * 0.1;
    const totalPrice = courtFee + serviceFee;

    const handleBook = async () => {
        if (selectedTime === null) {
            Alert.alert('Incomplete Selection', 'Please select a time slot.');
            return;
        }

        if (!user?.id) {
            Alert.alert('Authentication Required', 'Please log in to book a court.');
            return;
        }

        try {
            setBookingLoading(true);

            const selectedSlot = timeSlots[selectedTime];
            const selectedDateISO = dates[selectedDate].isoDate;
            const endTime = calculateEndTime(selectedSlot.timeValue);

            const { data: booking, error } = await supabase
                .from('bookings')
                .insert([
                    {
                        court_id: court.id,
                        player_id: user.id,
                        date: selectedDateISO,
                        start_time: selectedSlot.timeValue,
                        end_time: endTime,
                        total_price: totalPrice,
                        status: 'confirmed',
                        payment_status: 'paid'
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            navigation.navigate('BookingReceipt', { 
                bookingId: booking.id
            });

        } catch (error) {
            console.error('Error creating booking:', error);
            Alert.alert('Booking Failed', error.message || 'Failed to create booking. Please try again.');
        } finally {
            setBookingLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.slate950} />

            {/* Header */}
            <LinearGradient
                colors={[Colors.slate950, Colors.slate900]}
                style={styles.header}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.8}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>BOOK COURT</Text>
                <View style={{ width: 24 }} />
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Court Summary Card */}
                <View style={styles.courtCard}>
                    <Image source={{ uri: court?.imageUrl }} style={styles.courtImage} />
                    <View style={styles.courtOverlay}>
                        <Text style={styles.courtName}>{court?.name || 'Court Name'}</Text>
                        <View style={styles.courtLocation}>
                            <MaterialIcons name="location-on" size={14} color={Colors.lime400} />
                            <Text style={styles.courtLocationText}>{court?.location || 'Location'}</Text>
                        </View>
                        <View style={styles.courtRating}>
                            <MaterialIcons name="star" size={14} color="#FBBC04" />
                            <Text style={styles.ratingText}>{court?.rating || '0.0'}</Text>
                        </View>
                    </View>
                </View>

                {/* Date Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SELECT DATE</Text>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.dateScroll}
                    >
                        {dates.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.dateCard,
                                    selectedDate === index && styles.selectedDateCard,
                                ]}
                                onPress={() => setSelectedDate(index)}
                                activeOpacity={0.8}
                            >
                                <Text style={[
                                    styles.dayText, 
                                    selectedDate === index && styles.selectedDayText
                                ]}>
                                    {item.day}
                                </Text>
                                <Text style={[
                                    styles.dateText, 
                                    selectedDate === index && styles.selectedDateText
                                ]}>
                                    {item.date}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Time Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SELECT TIME</Text>
                    {loading ? (
                        <View style={commonStyles.loadingContainer}>
                            <ActivityIndicator size="large" color={Colors.lime400} />
                            <Text style={commonStyles.loadingText}>Loading times...</Text>
                        </View>
                    ) : (
                        <View style={styles.timeGrid}>
                            {timeSlots.map((slot, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.timeSlot,
                                        selectedTime === index && styles.selectedTimeSlot,
                                        !slot.available && styles.unavailableTimeSlot,
                                    ]}
                                    onPress={() => slot.available && setSelectedTime(index)}
                                    disabled={!slot.available}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[
                                        styles.timeText, 
                                        selectedTime === index && styles.selectedTimeText,
                                        !slot.available && styles.unavailableTimeText,
                                    ]}>
                                        {slot.time}
                                    </Text>
                                    {!slot.available && (
                                        <View style={styles.bookedBadge}>
                                            <MaterialIcons name="block" size={10} color={Colors.error} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Players */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>NUMBER OF PLAYERS</Text>
                    <View style={styles.guestCard}>
                        <TouchableOpacity
                            style={styles.guestButton}
                            onPress={() => setGuests(Math.max(1, guests - 1))}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[Colors.slate900, Colors.slate800]}
                                style={styles.guestButtonGradient}
                            >
                                <MaterialIcons name="remove" size={24} color={Colors.white} />
                            </LinearGradient>
                        </TouchableOpacity>
                        
                        <View style={styles.guestDisplay}>
                            <Text style={styles.guestCount}>{guests}</Text>
                            <Text style={styles.guestLabel}>PLAYERS</Text>
                        </View>
                        
                        <TouchableOpacity
                            style={styles.guestButton}
                            onPress={() => setGuests(Math.min(8, guests + 1))}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[Colors.slate900, Colors.slate800]}
                                style={styles.guestButtonGradient}
                            >
                                <MaterialIcons name="add" size={24} color={Colors.white} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Price Summary */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PRICE SUMMARY</Text>
                    <View style={styles.priceCard}>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Court Fee (1 hr)</Text>
                            <Text style={styles.priceValue}>₱{courtFee.toFixed(2)}</Text>
                        </View>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Service Fee</Text>
                            <Text style={styles.priceValue}>₱{serviceFee.toFixed(2)}</Text>
                        </View>
                        <View style={styles.priceDivider} />
                        <View style={styles.priceRow}>
                            <Text style={styles.totalLabel}>TOTAL</Text>
                            <Text style={styles.totalValue}>₱{totalPrice.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* Payment Method */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PAYMENT METHOD</Text>
                    <View style={styles.paymentCard}>
                        <View style={styles.paymentIconBg}>
                            <MaterialIcons name="credit-card" size={24} color={Colors.blue600} />
                        </View>
                        <View style={styles.paymentInfo}>
                            <Text style={styles.paymentType}>Credit Card</Text>
                            <Text style={styles.paymentNumber}>•••• •••• •••• 1234</Text>
                        </View>
                        <View style={styles.checkIconBg}>
                            <MaterialIcons name="check" size={16} color={Colors.lime400} />
                        </View>
                    </View>
                </View>

                <View style={{height: 20}} />
            </ScrollView>

            {/* Booking Button */}
            <View style={styles.footer}>
                <TouchableOpacity 
                    style={[styles.bookButton, bookingLoading && styles.bookButtonDisabled]} 
                    onPress={handleBook}
                    disabled={bookingLoading}
                    activeOpacity={0.8}
                >
                    {bookingLoading ? (
                        <ActivityIndicator color={Colors.slate950} size="small" />
                    ) : (
                        <>
                            <Text style={styles.bookButtonText}>CONFIRM BOOKING</Text>
                            <MaterialIcons name="arrow-forward" size={20} color={Colors.slate950} />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: Colors.white,
        letterSpacing: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    
    // Court Card
    courtCard: {
        margin: 20,
        height: 180,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: Colors.slate950,
        shadowColor: Colors.slate950,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    courtImage: {
        width: '100%',
        height: '100%',
        opacity: 0.6,
    },
    courtOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: 'rgba(2, 6, 23, 0.6)',
    },
    courtName: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.white,
        letterSpacing: -1,
        marginBottom: 8,
    },
    courtLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    courtLocationText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.white,
    },
    courtRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 13,
        fontWeight: '800',
        color: Colors.white,
    },
    
    // Section
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: Colors.slate500,
        letterSpacing: 2,
        marginBottom: 16,
    },
    
    // Date Selection
    dateScroll: {
        gap: 12,
    },
    dateCard: {
        width: 70,
        paddingVertical: 16,
        backgroundColor: Colors.white,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.slate200,
    },
    selectedDateCard: {
        backgroundColor: Colors.slate950,
        borderColor: Colors.slate950,
    },
    dayText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.slate600,
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    selectedDayText: {
        color: Colors.lime400,
    },
    dateText: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.slate950,
        letterSpacing: -1,
    },
    selectedDateText: {
        color: Colors.white,
    },
    
    // Time Grid
    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    timeSlot: {
        width: '31%',
        paddingVertical: 14,
        backgroundColor: Colors.white,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.slate200,
        position: 'relative',
    },
    selectedTimeSlot: {
        backgroundColor: Colors.lime400,
        borderColor: Colors.lime400,
    },
    unavailableTimeSlot: {
        backgroundColor: Colors.slate50,
        borderColor: Colors.slate100,
        opacity: 0.5,
    },
    timeText: {
        fontSize: 13,
        fontWeight: '800',
        color: Colors.slate950,
        letterSpacing: -0.3,
    },
    selectedTimeText: {
        color: Colors.slate950,
    },
    unavailableTimeText: {
        color: Colors.slate400,
    },
    bookedBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
    },
    
    // Guest Control
    guestCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.slate100,
    },
    guestButton: {
        shadowColor: Colors.slate950,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    guestButtonGradient: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    guestDisplay: {
        alignItems: 'center',
    },
    guestCount: {
        fontSize: 36,
        fontWeight: '900',
        color: Colors.slate950,
        letterSpacing: -2,
    },
    guestLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: Colors.slate500,
        letterSpacing: 1,
        marginTop: 2,
    },
    
    // Price Card
    priceCard: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: Colors.slate100,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    priceLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.slate600,
    },
    priceValue: {
        fontSize: 15,
        fontWeight: '800',
        color: Colors.slate950,
    },
    priceDivider: {
        height: 1,
        backgroundColor: Colors.slate200,
        marginVertical: 12,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '900',
        color: Colors.slate950,
        letterSpacing: 1,
    },
    totalValue: {
        fontSize: 20,
        fontWeight: '900',
        color: Colors.lime400,
        letterSpacing: -0.5,
    },
    
    // Payment Card
    paymentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.slate100,
        gap: 12,
    },
    paymentIconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#dbeafe',
        alignItems: 'center',
        justifyContent: 'center',
    },
    paymentInfo: {
        flex: 1,
    },
    paymentType: {
        fontSize: 15,
        fontWeight: '800',
        color: Colors.slate950,
        marginBottom: 2,
    },
    paymentNumber: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.slate500,
    },
    checkIconBg: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.slate950,
        alignItems: 'center',
        justifyContent: 'center',
    },
    
    // Footer
    footer: {
        padding: 20,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.slate100,
    },
    bookButton: {
        flexDirection: 'row',
        backgroundColor: Colors.lime400,
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: Colors.lime400,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    bookButtonDisabled: {
        opacity: 0.6,
    },
    bookButtonText: {
        fontSize: 15,
        fontWeight: '900',
        color: Colors.slate950,
        letterSpacing: 0.5,
    },
});

export default BookingScreen;
