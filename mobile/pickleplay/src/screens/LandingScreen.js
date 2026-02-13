import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

const LandingScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.slate950, Colors.slate900]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          <View style={styles.mainContainer}>
            {/* Hero Section */}
            <View style={styles.topSection}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../assets/PickleplayPH.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.mainTitle}>PicklePlay</Text>
              <Text style={styles.tagline}>Master Your Game</Text>

              <Text style={styles.subtitle}>
                Find courts, connect with players, and dominate the pickleball scene
              </Text>
            </View>

            {/* Features Preview */}
            <View style={styles.featuresContainer}>
              <View style={styles.featureRow}>
                <View style={styles.featureBox}>
                  <Ionicons name="location" size={28} color={Colors.lime400} />
                  <Text style={styles.featureText}>Find Courts</Text>
                </View>
                <View style={styles.featureBox}>
                  <Ionicons name="calendar" size={28} color={Colors.lime400} />
                  <Text style={styles.featureText}>Book Games</Text>
                </View>
              </View>

              <View style={styles.featureRow}>
                <View style={styles.featureBox}>
                  <Ionicons name="people" size={28} color={Colors.lime400} />
                  <Text style={styles.featureText}>Meet Players</Text>
                </View>
                <View style={styles.featureBox}>
                  <Ionicons name="trophy" size={28} color={Colors.lime400} />
                  <Text style={styles.featureText}>Track Stats</Text>
                </View>
              </View>
            </View>

            {/* CTA Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.getStartedButton}
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.9}
              >
                <Ionicons name="play-circle" size={20} color={Colors.white} />
                <Text style={styles.getStartedText}>Get Started</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.white} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.9}
              >
                <Ionicons name="log-in" size={20} color={Colors.lime400} />
                <Text style={styles.loginButtonText}>Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* Social Proof */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>5,000+</Text>
                <Text style={styles.statLabel}>Courts Available</Text>
              </View>
              <View style={[styles.statItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.slate700 }]}>
                <Text style={styles.statNumber}>50K+</Text>
                <Text style={styles.statLabel}>Active Players</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>100K+</Text>
                <Text style={styles.statLabel}>Games Played</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.lime400 + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  mainTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -1.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: Colors.lime400,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.slate300,
    textAlign: 'center',
    lineHeight: 24,
    marginHorizontal: 16,
  },
  featuresContainer: {
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  featureBox: {
    flex: 1,
    backgroundColor: Colors.slate800 + '60',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.slate700,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate100,
    marginTop: 8,
    letterSpacing: -0.2,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 32,
  },
  getStartedButton: {
    backgroundColor: Colors.lime400,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: Colors.lime400,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  getStartedText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  loginButton: {
    backgroundColor: Colors.slate800 + '80',
    borderWidth: 2,
    borderColor: Colors.lime400,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loginButtonText: {
    color: Colors.lime400,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.slate800 + '40',
    borderRadius: 16,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: Colors.slate700,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.lime400,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.slate400,
    marginTop: 4,
    fontWeight: '600',
  },
});

export default LandingScreen;
