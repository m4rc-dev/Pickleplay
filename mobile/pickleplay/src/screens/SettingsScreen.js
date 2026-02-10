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

const SettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    darkMode: false,
    soundEnabled: true,
    vibrationEnabled: true,
    locationServices: true,
    dataSync: true,
    autoPlayVideos: false,
  });

  const SettingItem = ({ icon, title, description, value, onToggle }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <View style={styles.settingHeader}>
          <MaterialIcons name={icon} size={24} color={thematicBlue} />
          <Text style={styles.settingTitle}>{title}</Text>
        </View>
        <Text style={styles.settingDescription}>{description}</Text>
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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* General Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <SettingItem
            icon="dark-mode"
            title="Dark Mode"
            description="Enable dark theme for the app"
            value={settings.darkMode}
            onToggle={(value) => setSettings({...settings, darkMode: value})}
          />
        </View>

        {/* Sound & Vibration Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sound & Vibration</Text>
          <SettingItem
            icon="volume-up"
            title="Sound Effects"
            description="Enable audio feedback"
            value={settings.soundEnabled}
            onToggle={(value) => setSettings({...settings, soundEnabled: value})}
          />
          <SettingItem
            icon="vibration"
            title="Vibration"
            description="Enable haptic feedback"
            value={settings.vibrationEnabled}
            onToggle={(value) => setSettings({...settings, vibrationEnabled: value})}
          />
        </View>

        {/* Permissions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <SettingItem
            icon="location-on"
            title="Location Services"
            description="Allow access to your location"
            value={settings.locationServices}
            onToggle={(value) => setSettings({...settings, locationServices: value})}
          />
        </View>

        {/* Data & Storage Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Storage</Text>
          <SettingItem
            icon="cloud-sync"
            title="Auto Sync"
            description="Automatically sync your data"
            value={settings.dataSync}
            onToggle={(value) => setSettings({...settings, dataSync: value})}
          />
          <SettingItem
            icon="smart-display"
            title="Auto-play Videos"
            description="Play videos automatically"
            value={settings.autoPlayVideos}
            onToggle={(value) => setSettings({...settings, autoPlayVideos: value})}
          />
        </View>

        {/* Advanced Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced</Text>
          <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('QRLogin')}>
            <View style={styles.actionInfo}>
              <MaterialIcons name="qr-code-scanner" size={24} color={thematicBlue} />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Web QR Login</Text>
                <Text style={styles.actionDescription}>Scan a desktop login QR code</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.border} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionInfo}>
              <MaterialIcons name="delete-sweep" size={24} color={thematicBlue} />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Clear Cache</Text>
                <Text style={styles.actionDescription}>Free up storage space</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.border} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionInfo}>
              <MaterialIcons name="reset-tv" size={24} color={thematicBlue} />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Reset Settings</Text>
                <Text style={styles.actionDescription}>Restore default settings</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.border} />
          </TouchableOpacity>
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
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  settingInfo: {
    flex: 1,
    marginRight: 10,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  settingDescription: {
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
  actionDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
});

export default SettingsScreen;
