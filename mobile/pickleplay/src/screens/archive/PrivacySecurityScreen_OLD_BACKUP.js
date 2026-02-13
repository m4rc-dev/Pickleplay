import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {MaterialIcons} from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

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

  const PrivacyItem = ({ icon, title, description, value, onToggle }) => (
    <View style={styles.privacyItem}>
      <View style={styles.privacyInfo}>
        <View style={styles.privacyHeader}>
          <MaterialIcons name={icon} size={24} color={thematicBlue} />
          <Text style={styles.privacyTitle}>{title}</Text>
        </View>
        <Text style={styles.privacyDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: activeColor }}
        thumbColor={value ? thematicBlue : '#f4f3f4'}
      />
    </View>
  );

  const ActionItem = ({ icon, title, description, onPress, isDanger }) => (
    <TouchableOpacity 
      style={[styles.actionItem, isDanger && styles.dangerItem]}
      onPress={onPress}
    >
      <View style={styles.actionInfo}>
        <MaterialIcons name={icon} size={24} color={isDanger ? '#FF6B6B' : thematicBlue} />
        <View style={styles.actionContent}>
          <Text style={[styles.actionTitle, isDanger && styles.dangerText]}>{title}</Text>
          <Text style={styles.actionDescription}>{description}</Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={isDanger ? '#FF6B6B' : Colors.border} />
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
            // Second confirmation
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
      <StatusBar barStyle="light-content" backgroundColor={thematicBlue} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>
          <PrivacyItem
            icon="public"
            title="Public Profile"
            description="Allow others to view your profile"
            value={privacy.profilePublic}
            onToggle={(value) => setPrivacy({...privacy, profilePublic: value})}
          />
          <PrivacyItem
            icon="check-circle"
            title="Online Status"
            description="Show when you're using the app"
            value={privacy.showOnlineStatus}
            onToggle={(value) => setPrivacy({...privacy, showOnlineStatus: value})}
          />
          <PrivacyItem
            icon="person-add"
            title="Friend Requests"
            description="Allow others to send friend requests"
            value={privacy.allowFriendRequests}
            onToggle={(value) => setPrivacy({...privacy, allowFriendRequests: value})}
          />
          <PrivacyItem
            icon="trending-up"
            title="Share Statistics"
            description="Share your game stats publicly"
            value={privacy.shareGameStats}
            onToggle={(value) => setPrivacy({...privacy, shareGameStats: value})}
          />
        </View>

        {/* Security Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <PrivacyItem
            icon="lock"
            title="Two-Factor Auth"
            description="Add an extra layer of security"
            value={privacy.twoFactorAuth}
            onToggle={(value) => setPrivacy({...privacy, twoFactorAuth: value})}
          />
          <PrivacyItem
            icon="notifications"
            title="Login Alerts"
            description="Get notified of new sign-ins"
            value={privacy.loginAlerts}
            onToggle={(value) => setPrivacy({...privacy, loginAlerts: value})}
          />
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <ActionItem
            icon="lock"
            title="Change Password"
            description="Update your account password"
            onPress={handleChangePassword}
          />
          <ActionItem
            icon="block"
            title="Blocked Users"
            description="Manage your blocked users list"
            onPress={handleBlockedUsers}
          />
          <ActionItem
            icon="download"
            title="Download Your Data"
            description="Get a copy of your personal data"
            onPress={handleDataDownload}
          />
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#FF6B6B' }]}>Danger Zone</Text>
          <ActionItem
            icon="pause-circle-filled"
            title="Deactivate Account"
            description="Temporarily disable your account"
            onPress={handleDeactivateAccount}
            isDanger={true}
          />
          <ActionItem
            icon="delete-forever"
            title="Delete Account"
            description="Permanently delete your account"
            onPress={handleDeleteAccount}
            isDanger={true}
          />
        </View>

        {/* Loading Overlay */}
        {isDeleting && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={thematicBlue} />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <MaterialIcons name="info" size={20} color={thematicBlue} />
          <Text style={styles.infoText}>
            Your privacy and security are important to us. Review these settings regularly.
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
  privacyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  privacyInfo: {
    flex: 1,
    marginRight: 10,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  privacyTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  privacyDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    marginLeft: 36,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  dangerItem: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  actionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionContent: {
    marginLeft: 12,
  },
  actionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  dangerText: {
    color: '#FF6B6B',
  },
  actionDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
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
    marginTop: 10,
    fontSize: 16,
    color: thematicBlue,
  },
});

export default PrivacySecurityScreen;
