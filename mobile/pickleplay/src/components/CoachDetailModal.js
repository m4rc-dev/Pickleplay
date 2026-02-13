import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';

const thematicBlue = '#0A56A7';

const CoachDetailModal = ({
  visible,
  onClose,
  coach,
  currentUserId,
  onBookingSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [pastLessons, setPastLessons] = useState([]);
  const [upcomingLessons, setUpcomingLessons] = useState([]);

  // Booking form fields
  const [lessonDate, setLessonDate] = useState(new Date());
  const [lessonTime, setLessonTime] = useState('');
  const [duration, setDuration] = useState('60 min'); // default 60 minutes
  const [sessionType, setSessionType] = useState('Private'); // Private, Semi-Private, Group
  const [location, setLocation] = useState('');

  // Date/Time Picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (visible && coach) {
      fetchLessons();
    }
  }, [visible, coach]);

  const fetchLessons = async () => {
    if (!coach?.id) return;

    try {
      // Fetch lessons for this coach
      const { data: lessons, error } = await supabase
        .from('lessons')
        .select(`
          *,
          student:student_id (
            id,
            full_name,
            username,
            dupr_rating
          )
        `)
        .eq('coach_id', coach.id)
        .order('date', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const past = lessons.filter((lesson) => new Date(lesson.date) < now);
      const upcoming = lessons.filter((lesson) => new Date(lesson.date) >= now);

      setPastLessons(past);
      setUpcomingLessons(upcoming);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setLessonDate(selectedDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setLessonTime(`${hours}:${minutes}`);
    }
  };

  const validateBooking = () => {
    if (!lessonDate) {
      Alert.alert('Error', 'Please select a date');
      return false;
    }
    if (!lessonTime) {
      Alert.alert('Error', 'Please select a time');
      return false;
    }
    if (!location.trim()) {
      Alert.alert('Error', 'Please enter a location');
      return false;
    }
    return true;
  };

  const handleBookLesson = async () => {
    if (!validateBooking()) return;

    try {
      setLoading(true);

      const lessonData = {
        coach_id: coach.id,
        student_id: currentUserId,
        date: lessonDate.toISOString().split('T')[0],
        time: lessonTime,
        duration: duration, // Stored as text like "60 min"
        type: sessionType, // Private, Semi-Private, or Group
        location: location.trim(),
        status: 'pending', // Pending until coach confirms
        price: 0.00, // Price will be settled upon confirmation
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('lessons')
        .insert([lessonData])
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Request Sent',
        `Your lesson request has been sent to ${coach.full_name || coach.username}. You will be notified once the coach confirms and settles the pricing.`,
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              setShowBookingForm(false);
              if (onBookingSuccess) {
                onBookingSuccess();
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error booking lesson:', error);
      Alert.alert('Error', 'Failed to send lesson request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLessonDate(new Date());
    setLessonTime('');
    setDuration('60 min');
    setSessionType('Private');
    setLocation('');
  };

  const handleClose = () => {
    resetForm();
    setShowBookingForm(false);
    onClose();
  };

  if (!coach) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
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
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Coach Profile</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Coach Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              {coach.avatar_url ? (
                <Image source={{ uri: coach.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <MaterialIcons name="person" size={60} color="#999" />
                </View>
              )}
            </View>

            <Text style={styles.coachName}>{coach.full_name || coach.username}</Text>

            {coach.bio && <Text style={styles.coachBio}>{coach.bio}</Text>}

            {/* Stats Row */}
            <View style={styles.statsRow}>
              {coach.rating && (
                <View style={styles.statBox}>
                  <View style={styles.statIconContainer}>
                    <MaterialIcons name="star" size={24} color="#FFA500" />
                  </View>
                  <Text style={styles.statValue}>{coach.rating}</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
              )}
              <View style={styles.statBox}>
                <View style={styles.statIconContainer}>
                  <MaterialIcons name="people" size={24} color={thematicBlue} />
                </View>
                <Text style={styles.statValue}>{coach.studentCount || 0}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
              {coach.clinicCount > 0 && (
                <View style={styles.statBox}>
                  <View style={styles.statIconContainer}>
                    <MaterialIcons name="event" size={24} color="#DC2626" />
                  </View>
                  <Text style={styles.statValue}>{coach.clinicCount}</Text>
                  <Text style={styles.statLabel}>Clinics</Text>
                </View>
              )}
            </View>

            {coach.specialization && (
              <View style={styles.specializationContainer}>
                <Text style={styles.specializationLabel}>Specialization:</Text>
                <View style={styles.specializationBadge}>
                  <Text style={styles.specializationText}>
                    {coach.specialization.toUpperCase()}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Booking Form Toggle */}
          {!showBookingForm ? (
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => setShowBookingForm(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#DC2626', '#B91C1C']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.bookButtonGradient}
              >
                <MaterialIcons name="calendar-today" size={24} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.bookButtonText}>BOOK A LESSON</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.bookingFormContainer}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Request Private Lesson</Text>
                <TouchableOpacity onPress={() => setShowBookingForm(false)}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <Text style={styles.coachingBy}>COACHING BY {(coach.full_name || coach.username).toUpperCase()}</Text>

              {/* Date Picker */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>PREFERRED DATE *</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="calendar-today" size={20} color={thematicBlue} />
                  <Text style={styles.dateButtonText}>
                    {lessonDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={lessonDate}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={handleDateChange}
                  />
                )}
              </View>

              {/* Time Picker */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>PREFERRED TIME *</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowTimePicker(true)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="access-time" size={20} color={thematicBlue} />
                  <Text style={styles.dateButtonText}>
                    {lessonTime || 'Select time'}
                  </Text>
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker
                    value={new Date()}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </View>

              {/* Duration */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>DURATION *</Text>
                <View style={styles.durationContainer}>
                  {['30 min', '60 min', '90 min', '120 min'].map((dur) => (
                    <TouchableOpacity
                      key={dur}
                      style={[
                        styles.durationChip,
                        duration === dur && styles.durationChipActive,
                      ]}
                      onPress={() => setDuration(dur)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.durationChipText,
                          duration === dur && styles.durationChipTextActive,
                        ]}
                      >
                        {dur}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Session Type */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>SESSION TYPE *</Text>
                <View style={styles.durationContainer}>
                  {[
                    { value: 'Private', label: 'Private (1-on-1)' },
                    { value: 'Semi-Private', label: 'Semi-Private' },
                    { value: 'Group', label: 'Group' },
                  ].map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.durationChip,
                        sessionType === type.value && styles.durationChipActive,
                      ]}
                      onPress={() => setSessionType(type.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.durationChipText,
                          sessionType === type.value && styles.durationChipTextActive,
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Location */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>PROPOSED LOCATION *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. BGC Court 1 or your preferred club"
                  placeholderTextColor="#999"
                  value={location}
                  onChangeText={setLocation}
                />
              </View>

              {/* Note Text */}
              <Text style={styles.noteText}>
                * Your request will be sent to the coach for confirmation. Pricing will be settled upon confirmation.
              </Text>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleBookLesson}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={24} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.submitButtonText}>SEND LESSON REQUEST</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Upcoming Lessons Section */}
          {upcomingLessons.length > 0 && (
            <View style={styles.lessonsSection}>
              <Text style={styles.sectionTitle}>Upcoming Lessons</Text>
              {upcomingLessons.map((lesson) => (
                <View key={lesson.id} style={styles.lessonCard}>
                  <View style={styles.lessonHeader}>
                    <MaterialIcons name="event" size={20} color={thematicBlue} />
                    <Text style={styles.lessonDate}>
                      {new Date(lesson.date).toLocaleDateString()} at {lesson.time}
                    </Text>
                  </View>
                  {lesson.student && (
                    <Text style={styles.lessonStudent}>
                      Student: {lesson.student.full_name || lesson.student.username}
                    </Text>
                  )}
                  <Text style={styles.lessonLocation}>📍 {lesson.location}</Text>
                  <View style={styles.lessonFooter}>
                    <Text style={styles.lessonDuration}>{lesson.duration} min</Text>
                    <Text style={styles.lessonPrice}>₱{lesson.price}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Past Lessons / Reviews Section */}
          {pastLessons.length > 0 && (
            <View style={styles.lessonsSection}>
              <Text style={styles.sectionTitle}>Past Lessons</Text>
              {pastLessons.slice(0, 5).map((lesson) => (
                <View key={lesson.id} style={styles.lessonCard}>
                  <View style={styles.lessonHeader}>
                    <MaterialIcons name="history" size={20} color="#999" />
                    <Text style={styles.lessonDate}>
                      {new Date(lesson.date).toLocaleDateString()}
                    </Text>
                  </View>
                  {lesson.student && (
                    <Text style={styles.lessonStudent}>
                      Student: {lesson.student.full_name || lesson.student.username}
                    </Text>
                  )}
                  {lesson.rating && (
                    <View style={styles.ratingContainer}>
                      <MaterialIcons name="star" size={16} color="#FFA500" />
                      <Text style={styles.ratingText}>{lesson.rating}/5</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  coachBio: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  specializationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  specializationLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  specializationBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
  },
  specializationText: {
    fontSize: 12,
    fontWeight: '600',
    color: thematicBlue,
  },
  bookButton: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  bookingFormContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  coachingBy: {
    fontSize: 12,
    fontWeight: '600',
    color: thematicBlue,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateButtonText: {
    fontSize: 15,
    color: '#1f2937',
    marginLeft: 12,
  },
  durationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  durationChip: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  durationChipActive: {
    backgroundColor: thematicBlue,
  },
  durationChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  durationChipTextActive: {
    color: '#fff',
  },
  noteText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 10,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  lessonsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  lessonCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lessonDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  lessonStudent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  lessonLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  lessonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lessonDuration: {
    fontSize: 13,
    color: '#999',
  },
  lessonPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFA500',
    marginLeft: 4,
  },
});

export default CoachDetailModal;
