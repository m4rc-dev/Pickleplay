import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Colors from '../constants/Colors';

const GlobalFooter = ({ currentScreenIndex = 0, onNavigate }) => {
  const insets = useSafeAreaInsets();
  const screens = ['Home', 'FindCourts', 'Map', 'Community', 'Profile'];

  const handleNavigation = (screenName, index) => {
    if (__DEV__) {
      console.log('Footer navigation pressed:', screenName, index);
    }
    if (onNavigate) {
      if (__DEV__) {
        console.log('Calling onNavigate with:', screenName, index);
      }
      onNavigate(screenName, index);
    } else {
      if (__DEV__) {
        console.log('onNavigate is not defined');
      }
    }
  };

  return (
    <View style={[
      styles.bottomNav, 
      { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }
    ]}>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => {
          if (__DEV__) console.log('Home icon pressed');
          handleNavigation('Home', 0);
        }}>
        <View style={[styles.navIconContainer, currentScreenIndex === 0 && styles.activeNavIcon]}>
          <MaterialIcons name="home" size={24} color={currentScreenIndex === 0 ? Colors.slate950 : Colors.slate500} />
        </View>
        <Text style={[styles.navText, currentScreenIndex === 0 && styles.activeNavText]}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => {
          if (__DEV__) console.log('FindCourts icon pressed');
          handleNavigation('FindCourts', 1);
        }}>
        <View style={[styles.navIconContainer, currentScreenIndex === 1 && styles.activeNavIcon]}>
          <MaterialIcons name="search" size={24} color={currentScreenIndex === 1 ? Colors.slate950 : Colors.slate500} />
        </View>
        <Text style={[styles.navText, currentScreenIndex === 1 && styles.activeNavText]}>Find</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => {
          if (__DEV__) console.log('Map icon pressed');
          handleNavigation('Map', 2);
        }}>
        <View style={[styles.navIconContainer, currentScreenIndex === 2 && styles.activeNavIcon]}>
          <MaterialIcons name="map" size={24} color={currentScreenIndex === 2 ? Colors.slate950 : Colors.slate500} />
        </View>
        <Text style={[styles.navText, currentScreenIndex === 2 && styles.activeNavText]}>Map</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => {
          if (__DEV__) console.log('Community icon pressed');
          handleNavigation('Community', 3);
        }}>
        <View style={[styles.navIconContainer, currentScreenIndex === 3 && styles.activeNavIcon]}>
          <MaterialIcons
            name="groups"
            size={24}
            color={currentScreenIndex === 3 ? Colors.slate950 : Colors.slate500}
          />
        </View>
        <Text style={[styles.navText, currentScreenIndex === 3 && styles.activeNavText]}>Community</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => {
          if (__DEV__) console.log('Profile icon pressed');
          handleNavigation('Profile', 4);
        }}>
        <View style={[styles.navIconContainer, currentScreenIndex === 4 && styles.activeNavIcon]}>
          <MaterialIcons
            name="person"
            size={24}
            color={currentScreenIndex === 4 ? Colors.slate950 : Colors.slate500}
          />
        </View>
        <Text style={[styles.navText, currentScreenIndex === 4 && styles.activeNavText]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    paddingTop: 4,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    shadowColor: Colors.slate950,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
  },
  navIconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    overflow: 'hidden',
  },
  activeNavItem: {
  },
  activeNavIcon: {
    backgroundColor: Colors.lime400,
  },
  navText: {
    fontSize: 7.5,
    color: Colors.slate600,
    marginTop: 2,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  activeNavText: {
    color: Colors.slate950,
    fontWeight: '800',
  },
});

export default GlobalFooter;
