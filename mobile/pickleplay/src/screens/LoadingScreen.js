import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';

const LoadingScreen = ({ navigation }) => {
  const { session, loading } = useAuth();

  useEffect(() => {
    // If auth is still loading, wait
    if (loading) return;

    // If user is already logged in, go to Home
    if (session?.user) {
      navigation?.replace('Home');
    } else {
      // Otherwise go to Landing
      navigation?.replace('Landing');
    }
  }, [session, loading, navigation]);

  return (
    <LinearGradient
      colors={[Colors.slate950, Colors.slate900]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/PickleplayPH.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.appName}>PicklePlay</Text>

        <View style={styles.loadingIndicator}>
          <ActivityIndicator size="large" color={Colors.lime400} />
        </View>

        <Text style={styles.loadingText}>Master Your Game</Text>
        <Text style={styles.loadingSubtext}>Loading your experience...</Text>
      </View>

      <View style={styles.dotContainer}>
        <View style={[styles.dot, styles.activeDot]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  appName: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -1,
    marginBottom: 40,
  },
  loadingIndicator: {
    marginBottom: 30,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.lime400,
    letterSpacing: -0.3,
  },
  loadingSubtext: {
    fontSize: 13,
    color: Colors.slate300,
    marginTop: 6,
    fontWeight: '500',
  },
  dotContainer: {
    position: 'absolute',
    bottom: 30,
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.slate600,
  },
  activeDot: {
    backgroundColor: Colors.lime400,
    width: 24,
  },
});

export default LoadingScreen;
