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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Colors from '../constants/Colors';

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

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

    // Generate next 7 days
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

    // Fetch existing bookings and generate time slots
    const fetchAvailability = async () => {
        if (!court?.id || !dates[selectedDate]) return;

        try {
            setLoading(true);
            const selectedDateISO = dates[selectedDate].isoDate;

            // Fetch existing bookings for this court and date
            const { data: existingBookings, error } = await supabase
                .from('bookings')
                .select('start_time, end_time')
                .eq('court_id', court.id)
                .eq('date', selectedDateISO)
                .in('status', ['confirmed', 'pending']);

            if (error) throw error;

            // Generate time slots (6 AM to 10 PM)
            const slots = [];
            for (let hour = 6; hour <= 22; hour++) {
                const timeString = `${hour.toString().padStart(2, '0')}:00:00`;
                const displayTime = hour < 12 
                    ? `${hour}:00 AM` 
                    : hour === 12 
                        ? '12:00 PM'
                        : `${hour - 12}:00 PM`;

                // Check if this time slot is booked
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
    const serviceFee = courtFee * 0.1; // 10% service fee
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

            // Create booking in Supabase
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

            // Navigate to receipt with booking ID
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
            <StatusBar barStyle="light-content" backgroundColor={thematicBlue} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Book Court</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Court Summary */}
                <View style={styles.courtSummary}>
                    <Image source={{ uri: court?.imageUrl }} style={styles.courtImage} />
                    <View style={styles.courtInfo}>
                        <Text style={styles.courtName}>{court?.name || 'Court Name'}</Text>
                        <Text style={styles.courtLocation}>{court?.location || 'Location'}</Text>
                        <View style={styles.ratingContainer}>
                            <MaterialIcons name="star" size={16} color="#FFD700" />
                            <Text style={styles.ratingText}>{court?.rating || '0.0'}</Text>
                        </View>
                    </View>
                </View>

                {/* Date Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select Date</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                        {dates.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.dateCard,
                                    selectedDate === index && styles.selectedDateCard,
                                ]}
                                onPress={() => setSelectedDate(index)}
                            >
                                <Text style={[styles.dayText, selectedDate === index && styles.selectedText]}>{item.day}</Text>
                                <Text style={[styles.dateText, selectedDate === index && styles.selectedText]}>{item.date}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Time Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select Time</Text>
                    {loading ? (
                        <ActivityIndicator size="large" color={thematicBlue} style={{ marginVertical: 20 }} />
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
                                >
                                    <Text style={[
                                        styles.timeText, 
                                        selectedTime === index && styles.selectedText,
                                        !slot.available && styles.unavailableText,
                                    ]}>{slot.time}</Text>
                                    {!slot.available && <Text style={styles.bookedLabel}>Booked</Text>}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Guests */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Number of Players</Text>
                    <View style={styles.guestControl}>
                        <TouchableOpacity
                            style={styles.guestButton}
                            onPress={() => setGuests(Math.max(1, guests - 1))}
                        >
                            <MaterialIcons name="remove" size={24} color={thematicBlue} />
                        </TouchableOpacity>
                        <Text style={styles.guestCount}>{guests}</Text>
                        <TouchableOpacity
                            style={styles.guestButton}
                            onPress={() => setGuests(Math.min(8, guests + 1))}
                        >
                            <MaterialIcons name="add" size={24} color={thematicBlue} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Price Summary */}
                <View style={styles.priceSection}>
                    <Text style={styles.priceSectionTitle}>Price Summary</Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Court Fee (1 hr)</Text>
                        <Text style={styles.priceValue}>₱{courtFee.toFixed(2)}</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Service Fee</Text>
                        <Text style={styles.priceValue}>₱{serviceFee.toFixed(2)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={[styles.priceRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>₱{totalPrice.toFixed(2)}</Text>
                    </View>
                </View>

                {/* Static Payment Method */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Payment Method</Text>
                    <View style={styles.paymentCard}>
                        <MaterialIcons name="credit-card" size={24} color={thematicBlue} />
                        <View style={styles.paymentInfo}>
                            <Text style={styles.paymentType}>Credit Card</Text>
                            <Text style={styles.paymentNumber}>**** **** **** 1234</Text>
                        </View>
                        <MaterialIcons name="check-circle" size={24} color={activeColor} />
                    </View>
                </View>

            </ScrollView>

            {/* Booking Button */}
            <View style={styles.footer}>
                <TouchableOpacity 
                    style={[styles.bookButton, bookingLoading && styles.bookButtonDisabled]} 
                    onPress={handleBook}
                    disabled={bookingLoading}
                >
                    {bookingLoading ? (
                        <ActivityIndicator color={thematicBlue} />
                    ) : (
                        <Text style={styles.bookButtonText}>Confirm Booking</Text>
                    )}
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: thematicBlue,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.white,
    },
    backButton: {
        padding: 5,
    },
    content: {
        flex: 1,
    },
    courtSummary: {
        flexDirection: 'row',
        padding: 20,
        backgroundColor: Colors.surface,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    courtImage: {
        width: 80,
        height: 80,
        borderRadius: 10,
        marginRight: 15,
    },
    courtInfo: {
        justifyContent: 'center',
        flex: 1,
    },
    courtName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: thematicBlue,
        marginBottom: 5,
    },
    courtLocation: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        marginLeft: 5,
        fontWeight: 'bold',
        color: thematicBlue,
    },
    section: {
        padding: 20,
        paddingBottom: 0,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: thematicBlue,
        marginBottom: 15,
    },
    dateScroll: {
        paddingBottom: 10,
    },
    dateCard: {
        width: 70,
        height: 90,
        backgroundColor: Colors.surface,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        borderWidth: 1,
        borderColor: '#eee',
        elevation: 2,
    },
    selectedDateCard: {
        backgroundColor: thematicBlue,
        borderColor: thematicBlue,
    },
    dayText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    dateText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: thematicBlue,
    },
    selectedText: {
        color: Colors.white,
    },
    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    timeSlot: {
        width: '30%',
        paddingVertical: 12,
        backgroundColor: Colors.surface,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
        marginBottom: 10,
    },
    selectedTimeSlot: {
        backgroundColor: thematicBlue,
        borderColor: thematicBlue,
    },
    unavailableTimeSlot: {
        backgroundColor: '#f0f0f0',
        borderColor: '#ddd',
        opacity: 0.7,
    },
    timeText: {
        color: thematicBlue,
        fontWeight: '600',
    },
    unavailableText: {
        color: '#999',
    },
    bookedLabel: {
        fontSize: 10,
        color: '#999',
        marginTop: 2,
    },
    guestControl: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 15,
        padding: 10,
        width: 150,
        alignSelf: 'center',
        elevation: 2,
    },
    guestButton: {
        padding: 10,
    },
    guestCount: {
        fontSize: 24,
        fontWeight: 'bold',
        marginHorizontal: 20,
        color: thematicBlue,
    },
    priceSection: {
        padding: 20,
        backgroundColor: '#f9f9f9',
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    priceSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: thematicBlue,
        marginBottom: 15,
    },
    divider: {
        height: 1,
        backgroundColor: '#ddd',
        marginVertical: 10,
    },
    paymentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#eee',
    },
    paymentInfo: {
        flex: 1,
        marginLeft: 15,
    },
    paymentType: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    paymentNumber: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    priceLabel: {
        fontSize: 16,
        color: '#666',
    },
    priceValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    totalRow: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: thematicBlue,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: thematicBlue,
    },
    footer: {
        padding: 20,
        backgroundColor: Colors.background,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    bookButton: {
        backgroundColor: activeColor,
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    bookButtonDisabled: {
        opacity: 0.6,
    },
    bookButtonText: {
        color: thematicBlue,
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default BookingScreen;
