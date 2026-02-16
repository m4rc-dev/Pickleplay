import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

const AboutScreen = ({ navigation }) => {
  const appInfo = {
    version: '1.0.0',
    buildNumber: '42',
    releaseDate: 'January 2026',
    developer: 'PicklePlay Inc.',
  };

  const features = [
    { icon: 'location', title: 'Find Courts', description: 'Discover pickleball courts near you' },
    { icon: 'calendar', title: 'Book Courts', description: 'Reserve your favorite court time' },
    { icon: 'people', title: 'Join Games', description: 'Connect with other players' },
    { icon: 'map', title: 'Map View', description: 'Explore courts on the map' },
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
        <Ionicons name={icon} size={24} color={Colors.white} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Header Section */}
        <View style={styles.appHeaderSection}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../assets/PickleplayPH.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>PicklePlay</Text>
          <Text style={styles.tagline}>Master Your Game</Text>
        </View>

        {/* App Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information" size={20} color={Colors.lime400} />
            <Text style={styles.sectionTitle}>App Information</Text>
          </View>
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

        {/* Key Features Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={20} color={Colors.lime400} />
            <Text style={styles.sectionTitle}>Key Features</Text>
          </View>
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
          <View style={styles.sectionHeader}>
            <Ionicons name="heart" size={20} color={Colors.lime400} />
            <Text style={styles.sectionTitle}>Credits</Text>
          </View>

          <TouchableOpacity style={styles.creditItem}>
            <View style={styles.creditIconContainer}>
              <Ionicons name="code" size={20} color={Colors.white} />
            </View>
            <View style={styles.creditContent}>
              <Text style={styles.creditTitle}>Built with React Native</Text>
              <Text style={styles.creditDescription}>Powered by Expo</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.slate500} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.creditItem}>
            <View style={styles.creditIconContainer}>
              <Ionicons name="flame" size={20} color={Colors.white} />
            </View>
            <View style={styles.creditContent}>
              <Text style={styles.creditTitle}>Made with Love</Text>
              <Text style={styles.creditDescription}>For the pickleball community</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.slate500} />
          </TouchableOpacity>
        </View>

        {/* Links Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="link" size={20} color={Colors.lime400} />
            <Text style={styles.sectionTitle}>Links</Text>
          </View>

          <TouchableOpacity style={styles.linkItem}>
            <View style={styles.linkIconContainer}>
              <Ionicons name="globe" size={20} color={Colors.white} />
            </View>
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Visit Website</Text>
              <Text style={styles.linkUrl}>pickleplay.com</Text>
            </View>
            <Ionicons name="open" size={20} color={Colors.slate500} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkItem}>
            <View style={styles.linkIconContainer}>
              <Ionicons name="bug" size={20} color={Colors.white} />
            </View>
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Report a Bug</Text>
              <Text style={styles.linkUrl}>Send us feedback</Text>
            </View>
            <Ionicons name="open" size={20} color={Colors.slate500} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkItem}>
            <View style={styles.linkIconContainer}>
              <Ionicons name="star" size={20} color={Colors.white} />
            </View>
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Rate Us</Text>
              <Text style={styles.linkUrl}>Leave a review</Text>
            </View>
            <Ionicons name="open" size={20} color={Colors.slate500} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>© 2026 PicklePlay Inc. All rights reserved</Text>
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
  appHeaderSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  logoBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.lime400 + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -1,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: Colors.slate600,
    letterSpacing: 0.5,
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
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate600,
    letterSpacing: -0.2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate950,
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.slate100,
  },
  featureCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.slate950,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: -0.3,
  },
  featureDescription: {
    fontSize: 13,
    color: Colors.slate600,
    marginTop: 2,
  },
  creditItem: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  creditIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: Colors.lime400,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  creditContent: {
    flex: 1,
  },
  creditTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: -0.3,
  },
  creditDescription: {
    fontSize: 13,
    color: Colors.slate600,
    marginTop: 2,
  },
  linkItem: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  linkIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: Colors.slate950,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: -0.3,
  },
  linkUrl: {
    fontSize: 13,
    color: Colors.slate600,
    marginTop: 2,
  },
  footerSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 12,
    color: Colors.slate500,
    textAlign: 'center',
  },
});

export default AboutScreen;
