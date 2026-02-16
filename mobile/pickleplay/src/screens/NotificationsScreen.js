import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const NotificationsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState({
    gameInvites: true,
    courtUpdates: true,
    matchResults: true,
    friendActivity: true,
    promotions: false,
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
  });

  useEffect(() => {
    loadNotificationPreferences();
  }, [user]);

  const loadNotificationPreferences = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_preferences')
        .select('notification_settings')
        .eq('user_id', user.id)
        .single();

      if (data?.notification_settings) {
        setNotifications({ ...notifications, ...data.notification_settings });
      }
    } catch (err) {
      console.error('Error loading notification preferences:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotificationPreferences = async (newSettings) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          notification_settings: newSettings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      Alert.alert('Error', 'Failed to save notification preferences');
    }
  };

  const handleToggle = (key, value) => {
    const newSettings = { ...notifications, [key]: value };
    setNotifications(newSettings);
    saveNotificationPreferences(newSettings);
  };

  const NotificationItem = ({ icon, title, description, value, settingKey }) => (
    <View style={styles.notificationItem}>
      <View style={styles.notificationInfo}>
        <View style={styles.notificationHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={20} color={Colors.lime400} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.notificationTitle}>{title}</Text>
            <Text style={styles.notificationDescription}>{description}</Text>
          </View>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={(newValue) => handleToggle(settingKey, newValue)}
        trackColor={{ false: Colors.slate700, true: Colors.lime400 + '40' }}
        thumbColor={value ? Colors.lime400 : Colors.slate500}
        ios_backgroundColor={Colors.slate700}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.slate950} />

      <LinearGradient
        colors={[Colors.slate950, Colors.slate900]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.lime400} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
        <View style={styles.headerButton} />
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Game & Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GAME & ACTIVITY</Text>
          <View style={styles.sectionCard}>
            <NotificationItem
              icon="game-controller"
              title="Game Invites"
              description="Get notified when invited to play"
              value={notifications.gameInvites}
              settingKey="gameInvites"
            />
            <NotificationItem
              icon="location"
              title="Court Updates"
              description="Updates about courts you follow"
              value={notifications.courtUpdates}
              settingKey="courtUpdates"
            />
            <NotificationItem
              icon="trophy"
              title="Match Results"
              description="Results from your matches"
              value={notifications.matchResults}
              settingKey="matchResults"
            />
          </View>
        </View>

        {/* Social Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SOCIAL</Text>
          <View style={styles.sectionCard}>
            <NotificationItem
              icon="people"
              title="Friend Activity"
              description="Updates from your friends"
              value={notifications.friendActivity}
              settingKey="friendActivity"
            />
          </View>
        </View>

        {/* Promotions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PROMOTIONS & OFFERS</Text>
          <View style={styles.sectionCard}>
            <NotificationItem
              icon="pricetag"
              title="Promotions"
              description="Special offers and promotions"
              value={notifications.promotions}
              settingKey="promotions"
            />
          </View>
        </View>

        {/* Notification Channels Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATION CHANNELS</Text>
          <View style={styles.sectionCard}>
            <NotificationItem
              icon="notifications-active"
              title="Push Notifications"
              description="Receive push notifications"
              value={notifications.pushNotifications}
              settingKey="pushNotifications"
            />
            <NotificationItem
              icon="mail"
              title="Email Notifications"
              description="Receive email updates"
              value={notifications.emailNotifications}
              settingKey="emailNotifications"
            />
            <NotificationItem
              icon="chatbox"
              title="SMS Notifications"
              description="Receive text message alerts"
              value={notifications.smsNotifications}
              settingKey="smsNotifications"
            />
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={Colors.lime400} />
          <Text style={styles.infoText}>
            Changes are saved automatically. You can always update these preferences later.
          </Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.slate950,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
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
  headerButton: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.slate950,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.lime400,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: Colors.slate900,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.slate800,
    overflow: 'hidden',
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate800,
  },
  notificationInfo: {
    flex: 1,
    marginRight: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.lime400 + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  notificationTitle: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  notificationDescription: {
    color: Colors.slate400,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.slate900,
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.slate800,
    alignItems: 'flex-start',
  },
  infoText: {
    color: Colors.slate300,
    fontSize: 13,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  spacer: {
    height: 20,
  },
});

export default NotificationsScreen;
