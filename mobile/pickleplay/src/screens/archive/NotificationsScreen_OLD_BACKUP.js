import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {MaterialIcons} from '@expo/vector-icons';
import Colors from '../constants/Colors';

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

const NotificationsScreen = ({ navigation }) => {
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

  const NotificationItem = ({ icon, title, description, value, onToggle }) => (
    <View style={styles.notificationItem}>
      <View style={styles.notificationInfo}>
        <View style={styles.notificationHeader}>
          <MaterialIcons name={icon} size={24} color={thematicBlue} />
          <Text style={styles.notificationTitle}>{title}</Text>
        </View>
        <Text style={styles.notificationDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: activeColor }}
        thumbColor={value ? thematicBlue : '#f4f3f4'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={thematicBlue} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Important Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game & Activity</Text>
          <NotificationItem
            icon="sports-tennis"
            title="Game Invites"
            description="Get notified when invited to play"
            value={notifications.gameInvites}
            onToggle={(value) => setNotifications({...notifications, gameInvites: value})}
          />
          <NotificationItem
            icon="info"
            title="Court Updates"
            description="Updates about courts you follow"
            value={notifications.courtUpdates}
            onToggle={(value) => setNotifications({...notifications, courtUpdates: value})}
          />
          <NotificationItem
            icon="emoji-events"
            title="Match Results"
            description="Results from your matches"
            value={notifications.matchResults}
            onToggle={(value) => setNotifications({...notifications, matchResults: value})}
          />
        </View>

        {/* Social Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social</Text>
          <NotificationItem
            icon="group"
            title="Friend Activity"
            description="Updates from your friends"
            value={notifications.friendActivity}
            onToggle={(value) => setNotifications({...notifications, friendActivity: value})}
          />
        </View>

        {/* Promotional Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promotions & Offers</Text>
          <NotificationItem
            icon="local-offer"
            title="Promotions"
            description="Special offers and promotions"
            value={notifications.promotions}
            onToggle={(value) => setNotifications({...notifications, promotions: value})}
          />
        </View>

        {/* Notification Channels */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Channels</Text>
          <NotificationItem
            icon="notifications-active"
            title="Push Notifications"
            description="Receive push notifications"
            value={notifications.pushNotifications}
            onToggle={(value) => setNotifications({...notifications, pushNotifications: value})}
          />
          <NotificationItem
            icon="email"
            title="Email Notifications"
            description="Receive email updates"
            value={notifications.emailNotifications}
            onToggle={(value) => setNotifications({...notifications, emailNotifications: value})}
          />
          <NotificationItem
            icon="sms"
            title="SMS Notifications"
            description="Receive text message alerts"
            value={notifications.smsNotifications}
            onToggle={(value) => setNotifications({...notifications, smsNotifications: value})}
          />
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <MaterialIcons name="info" size={20} color={thematicBlue} />
          <Text style={styles.infoText}>
            Changes are saved automatically. You can always update these preferences later.
          </Text>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: thematicBlue,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingBottom: 10,
  },
  section: {
    paddingHorizontal: 15,
    marginVertical: 10,
  },
  sectionTitle: {
    color: thematicBlue,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  notificationInfo: {
    flex: 1,
    marginRight: 10,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  notificationDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    marginLeft: 36,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    margin: 15,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: thematicBlue,
  },
  infoText: {
    color: Colors.text,
    fontSize: 13,
    marginLeft: 12,
    flex: 1,
  },
});

export default NotificationsScreen;
