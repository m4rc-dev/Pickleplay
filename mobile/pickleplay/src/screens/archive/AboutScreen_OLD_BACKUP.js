import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {MaterialIcons} from '@expo/vector-icons';
import Colors from '../constants/Colors';

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

const AboutScreen = ({ navigation }) => {
  const appInfo = {
    version: '1.0.0',
    buildNumber: '42',
    releaseDate: 'January 2026',
    developer: 'PicklePlay Inc.',
    website: 'https://pickleplay.com',
  };

  const features = [
    { icon: 'location-on', title: 'Find Courts', description: 'Discover pickleball courts near you' },
    { icon: 'calendar-today', title: 'Book Courts', description: 'Reserve your favorite court time' },
    { icon: 'group', title: 'Join Games', description: 'Connect with other players' },
    { icon: 'map', title: 'Interactive Map', description: 'Explore courts on the map' },
  ];

  const InfoRow = ({ label, value }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  const FeatureCard = ({ icon, title, description }) => (
    <View style={styles.featureCard}>
      <View style={styles.featureIconContainer}>
        <MaterialIcons name={icon} size={28} color={Colors.white} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
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
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Logo & Title */}
        <View style={styles.appHeaderSection}>
          <Image
            source={require('../assets/PickleplayPH.png')}
            style={styles.logoImage}
          />
          <Text style={styles.tagline}>Find. Play. Enjoy.</Text>
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Version" value={appInfo.version} />
            <View style={styles.divider} />
            <InfoRow label="Build" value={appInfo.buildNumber} />
            <View style={styles.divider} />
            <InfoRow label="Release Date" value={appInfo.releaseDate} />
            <View style={styles.divider} />
            <InfoRow label="Developer" value={appInfo.developer} />
          </View>
        </View>

        {/* Key Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </View>

        {/* Credits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credits</Text>
          <View style={styles.creditItem}>
            <MaterialIcons name="code" size={24} color={thematicBlue} />
            <View style={styles.creditContent}>
              <Text style={styles.creditTitle}>Built with React Native</Text>
              <Text style={styles.creditDescription}>Powered by Expo</Text>
            </View>
          </View>
          <View style={styles.creditItem}>
            <MaterialIcons name="favorite" size={24} color={activeColor} />
            <View style={styles.creditContent}>
              <Text style={styles.creditTitle}>Made with Love</Text>
              <Text style={styles.creditDescription}>For the pickleball community</Text>
            </View>
          </View>
        </View>

        {/* Links Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Links</Text>
          <TouchableOpacity style={styles.linkItem}>
            <MaterialIcons name="language" size={24} color={thematicBlue} />
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Visit Website</Text>
              <Text style={styles.linkUrl}>pickleplay.com</Text>
            </View>
            <MaterialIcons name="open-in-new" size={20} color={Colors.border} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem}>
            <MaterialIcons name="bug-report" size={24} color={thematicBlue} />
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Report a Bug</Text>
              <Text style={styles.linkUrl}>Send us feedback</Text>
            </View>
            <MaterialIcons name="open-in-new" size={20} color={Colors.border} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem}>
            <MaterialIcons name="star" size={24} color={activeColor} />
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Rate Us</Text>
              <Text style={styles.linkUrl}>Leave a review</Text>
            </View>
            <MaterialIcons name="open-in-new" size={20} color={Colors.border} />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About PicklePlay</Text>
          <View style={styles.aboutBox}>
            <Text style={styles.aboutText}>
              PicklePlay is a community-driven platform dedicated to connecting pickleball enthusiasts. 
              Our mission is to make it easy for players of all levels to find courts, book time slots, 
              and connect with other players in their area.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>© 2026 PicklePlay Inc. All rights reserved.</Text>
          <Text style={styles.footerSubtext}>Made with ❤️ for pickleball lovers worldwide</Text>
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
  appHeaderSection: {
    alignItems: 'center',
    paddingVertical: 40,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logoImage: {
    width: 220,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 15,
  },
  appName: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontStyle: 'italic',
  },
  section: {
    paddingHorizontal: 15,
    marginVertical: 15,
  },
  sectionTitle: {
    color: thematicBlue,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: thematicBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  featureDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  creditItem: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  creditContent: {
    marginLeft: 12,
    flex: 1,
  },
  creditTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  creditDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  linkItem: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  linkContent: {
    flex: 1,
    marginLeft: 12,
  },
  linkTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  linkUrl: {
    color: thematicBlue,
    fontSize: 13,
    marginTop: 2,
  },
  aboutBox: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: activeColor,
  },
  aboutText: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 22,
  },
  footerSection: {
    alignItems: 'center',
    paddingVertical: 30,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 20,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  footerSubtext: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 5,
  },
});

export default AboutScreen;
