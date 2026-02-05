import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Image,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

const LandingScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={thematicBlue} />

      <LinearGradient
        colors={[thematicBlue, thematicBlue]}
        style={styles.gradient}>
        <View style={styles.mainContainer}>
          {/* Top Section - Logo and Title */}
          <View style={styles.topSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/PickleplayPH.png')}
                style={styles.logoImage}
              />
            </View>

            <View style={styles.titleContainer}>
              <Text style={styles.mainTitle}>Find your perfect</Text>
              <Text style={styles.mainTitle}>pickleball court</Text>
            </View>

            <View style={styles.subtitleContainer}>
              <Text style={styles.subtitle}>
                Connect with players, discover courts, and join the ultimate pickleball community
              </Text>
            </View>
          </View>

          {/* Bottom Section - Buttons */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={styles.getStartedButton}

              onPress={() => navigation.navigate('Register')}>
              <Text style={styles.getStartedText}>GET STARTED</Text>
              <MaterialIcons name="arrow-forward" size={20} color={thematicBlue} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginText}>LOG IN</Text>
            </TouchableOpacity>


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
  },
  mainContainer: {
    flex: 1,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 250,
    height: 115,
    resizeMode: 'contain',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    letterSpacing: 2,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 38,
  },
  subtitleContainer: {
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSection: {
    paddingHorizontal: 30,
    paddingBottom: 40,
    paddingTop: 20,
  },
  getStartedButton: {
    flexDirection: 'row',
    backgroundColor: activeColor,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  getStartedText: {
    color: thematicBlue,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
  loginButton: {
    borderWidth: 2,
    borderColor: Colors.white,
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: 'center',
  },
  loginText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },

});

export default LandingScreen;
