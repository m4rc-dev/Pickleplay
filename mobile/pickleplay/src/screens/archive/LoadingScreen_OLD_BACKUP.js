import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

const LoadingScreen = ({ navigation }) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    const timer = setTimeout(() => {
      if (user) {
        // User is logged in, go to Home
        navigation.replace('Home', { screenIndex: 0 });
      } else {
        // User is not logged in, go to Landing
        navigation.replace('Landing');
      }
    }, 2000); // 2 seconds loading animation

    return () => clearTimeout(timer);
  }, [navigation, user, loading]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={thematicBlue} />
      
      <LinearGradient
        colors={[thematicBlue, thematicBlue]}
        style={styles.gradient}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/PickleplayPH.png')} 
              style={styles.logoImage} 
            />
          </View>
          
          <View style={styles.loadingContainer}>
            <View style={styles.loadingBar}>
              <View style={styles.loadingProgress} />
            </View>
            <Text style={styles.loadingText}>Loading PicklePlay...</Text>
          </View>
        </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  logoImage: {
    width: 280,
    height: 130,
    resizeMode: 'contain',
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    letterSpacing: 3,
  },
  loadingContainer: {
    alignItems: 'center',
    width: '80%',
  },
  loadingBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    width: '100%',
    height: '100%',
    backgroundColor: activeColor,
    borderRadius: 2,
    // Simple animation effect
    shadowColor: activeColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  loadingText: {
    color: Colors.white,
    fontSize: 16,
    marginTop: 20,
    fontWeight: '500',
  },
});

export default LoadingScreen;
