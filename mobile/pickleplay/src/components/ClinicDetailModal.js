import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const thematicBlue = '#0A56A7';

const ClinicDetailModal = ({ visible, onClose, clinic, userId, isCoach = false, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    if (visible && clinic) {
      checkEnrollment();
      fetchParticipants();
    }
  }, [visible, clinic]);

  const checkEnrollment = async () => {
    if (!userId || !clinic) return;

    try {
      const { data, error } = await supabase
        .from('clinic_participants')
        .select('*')
        .eq('clinic_id', clinic.id)
        .eq('player_id', userId)
        .single();

      setIsEnrolled(!!data);
    } catch (error) {
      console.error('Error checking enrollment:', error);
    }
  };

  const fetchParticipants = async () => {
    if (!clinic) return;

    try {
      const { data, error } = await supabase
        .from('clinic_participants')
        .select(`
          enrolled_at,
          profiles:player_id (
            id,
            full_name,
            avatar_url,
            dupr_rating
          )
        `)
        .eq('clinic_id', clinic.id);

      if (error) throw error;

      if (data) {
        setParticipants(data.map(p => p.profiles));
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const handleJoinClinic = async () => {
    if (!userId || !clinic) return;

    // Check if clinic is full
    if (clinic.participants >= clinic.capacity) {
      Alert.alert('Clinic Full', 'This clinic has reached maximum capacity.');
      return;
    }

    // Check if clinic is active
    if (clinic.status !== 'active') {
      Alert.alert('Unavailable', 'This clinic is not currently accepting enrollments.');
      return;
    }

    setLoading(true);

    try {
      // Add participant
      const { error: enrollError } = await supabase
        .from('clinic_participants')
        .insert([{
          clinic_id: clinic.id,
          player_id: userId,
        }]);

      if (enrollError) throw enrollError;

      // Update participant count
      const { error: updateError } = await supabase
        .from('clinics')
        .update({ participants: clinic.participants + 1 })
        .eq('id', clinic.id);

      if (updateError) throw updateError;

      Alert.alert('Success', 'You have successfully joined this clinic!', [
        { text: 'OK', onPress: () => {
          setIsEnrolled(true);
          onUpdate?.();
          fetchParticipants();
        }}
      ]);
    } catch (error) {
      console.error('Error joining clinic:', error);
      Alert.alert('Error', error.message || 'Failed to join clinic. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveClinic = async () => {
    Alert.alert(
      'Leave Clinic',
      'Are you sure you want to leave this clinic?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);

            try {
              // Remove participant
              const { error: deleteError } = await supabase
                .from('clinic_participants')
                .delete()
                .eq('clinic_id', clinic.id)
                .eq('player_id', userId);

              if (deleteError) throw deleteError;

              // Update participant count
              const { error: updateError } = await supabase
                .from('clinics')
                .update({ participants: clinic.participants - 1 })
                .eq('id', clinic.id);

              if (updateError) throw updateError;

              Alert.alert('Success', 'You have left the clinic.', [
                { text: 'OK', onPress: () => {
                  setIsEnrolled(false);
                  onUpdate?.();
                  fetchParticipants();
                }}
              ]);
            } catch (error) {
              console.error('Error leaving clinic:', error);
              Alert.alert('Error', 'Failed to leave clinic. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (!clinic) return null;

  const spotsLeft = clinic.capacity - clinic.participants;
  const isFull = spotsLeft <= 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <LinearGradient
            colors={['#DC2626', '#B91C1C']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerIconWrapper}>
              <MaterialIcons name="event" size={32} color="#fff" />
            </View>
            <Text style={styles.title}>{clinic.title}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{clinic.level}</Text>
            </View>
          </LinearGradient>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Clinic Details */}
            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <MaterialIcons name="event" size={20} color={thematicBlue} />
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailValue}>
                  {new Date(clinic.date).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <MaterialIcons name="access-time" size={20} color={thematicBlue} />
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{clinic.time}</Text>
              </View>

              <View style={styles.detailRow}>
                <MaterialIcons name="location-on" size={20} color={thematicBlue} />
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{clinic.location}</Text>
              </View>

              <View style={styles.detailRow}>
                <MaterialIcons name="people" size={20} color={thematicBlue} />
                <Text style={styles.detailLabel}>Capacity</Text>
                <Text style={styles.detailValue}>
                  {clinic.participants}/{clinic.capacity} enrolled
                </Text>
              </View>

              <View style={styles.detailRow}>
                <MaterialIcons name="payments" size={20} color={thematicBlue} />
                <Text style={styles.detailLabel}>Price</Text>
                <Text style={styles.detailValuePrice}>₱{clinic.price}</Text>
              </View>
            </View>

            {/* Description */}
            {clinic.description && (
              <View style={styles.descriptionSection}>
                <Text style={styles.sectionTitle}>About This Clinic</Text>
                <Text style={styles.descriptionText}>{clinic.description}</Text>
              </View>
            )}

            {/* Participants List (for coaches) */}
            {isCoach && participants.length > 0 && (
              <View style={styles.participantsSection}>
                <Text style={styles.sectionTitle}>
                  Enrolled Players ({participants.length})
                </Text>
                {participants.map((participant, index) => (
                  <View key={index} style={styles.participantCard}>
                    <View style={styles.participantAvatar}>
                      <MaterialIcons name="person" size={24} color={thematicBlue} />
                    </View>
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantName}>{participant.full_name}</Text>
                      <Text style={styles.participantRating}>
                        {participant.dupr_rating ? `${participant.dupr_rating.toFixed(1)} DUPR` : 'No rating'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Enrollment Status */}
            {!isCoach && (
              <View style={styles.enrollmentSection}>
                <View style={[styles.spotsIndicator, isFull && styles.spotsIndicatorFull]}>
                  <MaterialIcons 
                    name={isFull ? 'error' : 'check-circle'} 
                    size={20} 
                    color={isFull ? '#EF4444' : '#10B981'} 
                  />
                  <Text style={[styles.spotsText, isFull && styles.spotsTextFull]}>
                    {isFull ? 'Clinic is full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
                  </Text>
                </View>

                {isEnrolled && (
                  <View style={styles.enrolledBanner}>
                    <MaterialIcons name="check-circle" size={20} color="#10B981" />
                    <Text style={styles.enrolledText}>You're enrolled in this clinic</Text>
                  </View>
                )}
              </View>
            )}

            {/* Action Button */}
            {!isCoach && clinic.status === 'active' && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  (loading || (isFull && !isEnrolled)) && styles.actionButtonDisabled
                ]}
                onPress={isEnrolled ? handleLeaveClinic : handleJoinClinic}
                disabled={loading || (isFull && !isEnrolled)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isEnrolled ? ['#EF4444', '#DC2626'] : ['#DC2626', '#B91C1C']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.actionButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons 
                        name={isEnrolled ? 'cancel' : 'add'} 
                        size={24} 
                        color="#fff" 
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.actionButtonText}>
                        {isEnrolled ? 'LEAVE CLINIC' : isFull ? 'CLINIC FULL' : 'JOIN SESSION'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  headerGradient: {
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  headerIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  levelBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  scrollContent: {
    padding: 24,
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  detailValuePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
  descriptionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  participantsSection: {
    marginBottom: 20,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantInfo: {
    marginLeft: 12,
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  participantRating: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  enrollmentSection: {
    marginBottom: 20,
  },
  spotsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    marginBottom: 12,
  },
  spotsIndicatorFull: {
    backgroundColor: '#FEE2E2',
  },
  spotsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 8,
  },
  spotsTextFull: {
    color: '#EF4444',
  },
  enrolledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
  },
  enrolledText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 8,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
});

export default ClinicDetailModal;
