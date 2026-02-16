import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';

const PrivacySecurityScreen = ({ navigation }) => {
  const { deleteAccount, deactivateAccount, resetPassword, user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    showOnlineStatus: true,
    allowFriendRequests: true,
    shareGameStats: true,
    twoFactorAuth: false,
    loginAlerts: true,
  });

  const PrivacyToggle = ({ icon, title, description, value, onToggle }) => (
    <View style={styles.toggleCard}>
      <View style={styles.toggleLeft}>
        <View style={[styles.iconContainer, { backgroundColor: value ? Colors.lime400 + '20' : Colors.slate200 }]}>
          <Ionicons
            name={icon}
            size={20}
            color={value ? Colors.lime400 : Colors.slate500}
          />
        </View>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleTitle}>{title}</Text>
          <Text style={styles.toggleDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.slate300, true: Colors.lime400 }}
        thumbColor={Colors.white}
      />
    </View>
  );

  const ActionCard = ({ icon, title, description, onPress, isDanger = false }) => (
    <TouchableOpacity
      style={[styles.actionCard, isDanger && styles.dangerCard]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.actionLeft}>
        <View style={[styles.actionIconContainer, { backgroundColor: isDanger ? '#FF6B6B' : Colors.slate950 }]}>
          <Ionicons
            name={icon}
            size={20}
            color={Colors.white}
          />
        </View>
        <View style={styles.actionInfo}>
          <Text style={[styles.actionTitle, isDanger && styles.dangerText]}>{title}</Text>
          <Text style={styles.actionDescription}>{description}</Text>
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={isDanger ? '#FF6B6B' : Colors.slate400}
      />
    </TouchableOpacity>
  );

  const handleChangePassword = () => {
    if (!user?.email) {
      Alert.alert('Error', 'No email found for your account');
      return;
    }

    Alert.alert(
      'Reset Password',
      `A password reset link will be sent to ${user.email}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            const { error } = await resetPassword(user.email);
            if (error) {
              Alert.alert('Error', 'Failed to send reset email. Please try again.');
            } else {
              Alert.alert('Success', 'Password reset email sent! Check your inbox.');
            }
          },
        },
      ]
    );
  };

  const handleBlockedUsers = () => {
    Alert.alert('Blocked Users', 'You have 0 blocked users', [{ text: 'OK' }]);
  };

  const handleDataDownload = () => {
    Alert.alert('Download Data', 'Your data download is being prepared', [{ text: 'OK' }]);
  };

  const handleDeactivateAccount = () => {
    Alert.alert(
      'Deactivate Account',
      'Your account will be deactivated and you will be signed out. You can reactivate by logging in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const { error } = await deactivateAccount();
            setIsDeleting(false);

            if (error) {
              Alert.alert('Error', 'Failed to deactivate account. Please try again.');
            } else {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Landing' }],
              });
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Type DELETE to confirm permanent account deletion.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    setIsDeleting(true);
                    const { error } = await deleteAccount();
                    setIsDeleting(false);

                    if (error) {
                      Alert.alert('Error', 'Failed to delete account. Please try again.');
                    } else {
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Landing' }],
                      });
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[Colors.slate950, Colors.slate900]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Privacy Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={24} color={Colors.lime400} />
            <Text style={styles.sectionTitle}>Privacy Settings</Text>
          </View>

          <PrivacyToggle
            icon="globe"
            title="Public Profile"
            description="Allow others to view your profile"
            value={privacy.profilePublic}
            onToggle={(value) => setPrivacy({ ...privacy, profilePublic: value })}
          />
          <PrivacyToggle
            icon="eye"
            title="Online Status"
            description="Show when you're using the app"
            value={privacy.showOnlineStatus}
            onToggle={(value) => setPrivacy({ ...privacy, showOnlineStatus: value })}
          />
          <PrivacyToggle
            icon="people"
            title="Friend Requests"
            description="Allow others to send friend requests"
            value={privacy.allowFriendRequests}
            onToggle={(value) => setPrivacy({ ...privacy, allowFriendRequests: value })}
          />
          <PrivacyToggle
            icon="bar-chart"
            title="Share Statistics"
            description="Share your game stats publicly"
            value={privacy.shareGameStats}
            onToggle={(value) => setPrivacy({ ...privacy, shareGameStats: value })}
          />
        </View>

        {/* Security Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="lock-closed" size={24} color={Colors.lime400} />
            <Text style={styles.sectionTitle}>Security</Text>
          </View>

          <PrivacyToggle
            icon="key"
            title="Two-Factor Auth"
            description="Add an extra layer of security"
            value={privacy.twoFactorAuth}
            onToggle={(value) => setPrivacy({ ...privacy, twoFactorAuth: value })}
          />
          <PrivacyToggle
            icon="notifications"
            title="Login Alerts"
            description="Get notified of new sign-ins"
            value={privacy.loginAlerts}
            onToggle={(value) => setPrivacy({ ...privacy, loginAlerts: value })}
          />
        </View>

        {/* Account Actions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle" size={24} color={Colors.lime400} />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>

          <ActionCard
            icon="lock"
            title="Change Password"
            description="Update your account password"
            onPress={handleChangePassword}
          />
          <ActionCard
            icon="ban"
            title="Blocked Users"
            description="Manage your blocked users list"
            onPress={handleBlockedUsers}
          />
          <ActionCard
            icon="download"
            title="Download Your Data"
            description="Get a copy of your personal data"
            onPress={handleDataDownload}
          />
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning" size={24} color="#FF6B6B" />
            <Text style={[styles.sectionTitle, { color: '#FF6B6B' }]}>Danger Zone</Text>
          </View>

          <ActionCard
            icon="pause-circle"
            title="Deactivate Account"
            description="Temporarily disable your account"
            onPress={handleDeactivateAccount}
            isDanger={true}
          />
          <ActionCard
            icon="trash"
            title="Delete Account"
            description="Permanently delete your account"
            onPress={handleDeleteAccount}
            isDanger={true}
          />
        </View>

        {/* Info Box */}
        <View style={styles.section}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={Colors.lime400} />
            <Text style={styles.infoText}>
              Your privacy and security are important to us. Review these settings regularly to keep your account safe.
            </Text>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Loading Overlay */}
      {isDeleting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.lime400} />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.slate950,
    marginLeft: 10,
    letterSpacing: -0.5,
  },
  toggleCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: -0.3,
  },
  toggleDescription: {
    fontSize: 13,
    color: Colors.slate600,
    marginTop: 2,
  },
  actionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  dangerCard: {
    backgroundColor: '#FF6B6B' + '10',
  },
  actionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: -0.3,
  },
  dangerText: {
    color: '#FF6B6B',
  },
  actionDescription: {
    fontSize: 13,
    color: Colors.slate600,
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: Colors.lime400 + '10',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: Colors.lime400,
  },
  infoText: {
    fontSize: 13,
    color: Colors.slate600,
    marginLeft: 12,
    flex: 1,
    lineHeight: 18,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.lime400,
    fontWeight: '600',
  },
});

export default PrivacySecurityScreen;
