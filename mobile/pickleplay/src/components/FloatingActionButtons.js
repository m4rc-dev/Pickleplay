import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Image,
  Text,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Colors from '../constants/Colors';

const FloatingActionButtons = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const menuSlideAnim = useRef(new Animated.Value(300)).current;
  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('avatar_url, full_name')
            .eq('id', user.id)
            .single();
          
          if (error) {
            console.error('Error fetching profile:', error);
          } else {
            setProfileData(data);
          }
        } catch (err) {
          console.error('Error in fetchProfile:', err);
        }
      }
    };

    fetchProfile();
  }, [user?.id]);

  useEffect(() => {
    if (menuVisible) {
      Animated.timing(menuSlideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(menuSlideAnim, {
        toValue: 300,
        duration: 300,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [menuVisible, menuSlideAnim]);
  
  const getUserDisplayName = () => {
    if (profileData?.full_name) {
      return profileData.full_name;
    }
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.user_metadata?.first_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim();
    }
    return user?.email?.split('@')[0] || 'Player';
  };

  const getUserAvatar = () => {
    return profileData?.avatar_url || user?.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80';
  };
  
  const mainMenuItems = [
    {
      icon: 'person',
      title: 'Profile',
      screen: 'PersonalInformation',
    },
    {
      icon: 'receipt-long',
      title: 'Receipts',
      screen: 'ReceiptHistory',
    },
    {
      icon: 'newspaper',
      title: 'News',
      screen: 'News',
    },
    {
      icon: 'notifications',
      title: 'Notifications',
      screen: 'NotificationsPrefs',
    },
    {
      icon: 'bookmark',
      title: 'Favorites',
      screen: 'Favorites',
    },
    {
      icon: 'groups',
      title: 'Community',
      screen: 'Community',
    },
    {
      icon: 'sports-tennis',
      title: 'Find Courts',
      screen: 'FindCourts',
    },
  ];

  const settingsItems = [
    {
      icon: 'settings',
      title: 'Settings',
      screen: 'Settings',
    },
    {
      icon: 'security',
      title: 'Privacy & Security',
      screen: 'PrivacySecurity',
    },
  ];

  const helpItems = [
    {
      icon: 'help',
      title: 'Help & Support',
      screen: 'HelpSupport',
    },
    {
      icon: 'info',
      title: 'About',
      screen: 'About',
    },
  ];

  const handleMenuItemPress = (screen) => {
    setMenuVisible(false);
    setTimeout(() => {
      navigation.navigate(screen);
    }, 300);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setMenuVisible(false);
              console.log('🚪 Starting logout...');
              
              // Call signOut from context
              await signOut();
              
              console.log('🚪 Successfully signed out, navigating to Landing...');
              
              // Add a small delay to ensure auth state is updated
              setTimeout(() => {
                navigation.navigate('Landing');
              }, 500);
            } catch (error) {
              console.error('🚪 Logout error caught:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };
  
  return (
    <>
      {/* Floating Menu Button */}
      <TouchableOpacity 
        style={[styles.floatingContainer, { top: insets.top + 16 }]}
        onPress={() => setMenuVisible(true)}
      >
        <LinearGradient
          colors={[Colors.lime400, Colors.lime500]}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialIcons name="menu" size={24} color={Colors.slate950} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Side Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          />
          <Animated.View style={[styles.menuContainer, { transform: [{ translateX: menuSlideAnim }] }]}>
            {/* Menu Header with Avatar and Username */}
            <LinearGradient
              colors={[Colors.slate950, Colors.slate900]}
              style={styles.menuHeader}
            >
              <View style={styles.menuHeaderProfile}>
                <View style={styles.avatarContainer}>
                  <Image 
                    source={{ uri: getUserAvatar() }}
                    style={styles.menuAvatar}
                  />
                </View>
                <View style={styles.menuUserInfo}>
                  <Text style={styles.menuUsername}>{getUserDisplayName()}</Text>
                  <Text style={styles.menuEmail}>{user?.email || ''}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.menuCloseButton}>
                <MaterialIcons name="close" size={28} color={Colors.white} />
              </TouchableOpacity>
            </LinearGradient>

            {/* Menu Content */}
            <ScrollView style={styles.menuContent}>
              {/* Main Menu Section */}
              <View style={styles.menuSection}>
                {mainMenuItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.menuItem}
                    onPress={() => handleMenuItemPress(item.screen)}
                  >
                    <MaterialIcons name={item.icon} size={22} color={Colors.lime400} />
                    <Text style={styles.menuItemText}>{item.title}</Text>
                    <MaterialIcons name="chevron-right" size={20} color={Colors.slate400} />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.menuDivider} />

              {/* Settings Section */}
              <View style={styles.menuSection}>
                {settingsItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.menuItem}
                    onPress={() => handleMenuItemPress(item.screen)}
                  >
                    <MaterialIcons name={item.icon} size={22} color={Colors.slate400} />
                    <Text style={styles.menuItemText}>{item.title}</Text>
                    <MaterialIcons name="chevron-right" size={20} color={Colors.slate400} />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.menuDivider} />

              {/* Help Section */}
              <View style={styles.menuSection}>
                {helpItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.menuItem}
                    onPress={() => handleMenuItemPress(item.screen)}
                  >
                    <MaterialIcons name={item.icon} size={22} color={Colors.slate400} />
                    <Text style={styles.menuItemText}>{item.title}</Text>
                    <MaterialIcons name="chevron-right" size={20} color={Colors.slate400} />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.menuDivider} />

              {/* Logout Button */}
              <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
                <MaterialIcons name="logout" size={22} color="#ef4444" />
                <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    zIndex: 100,
    shadowColor: Colors.slate950,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  overlayTouchable: {
    flex: 1,
  },
  menuContainer: {
    width: '75%',
    height: '100%',
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    overflow: 'hidden',
  },
  menuHeader: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuHeaderProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.lime400,
  },
  menuAvatar: {
    width: '100%',
    height: '100%',
  },
  menuUserInfo: {
    flex: 1,
  },
  menuUsername: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
  menuEmail: {
    fontSize: 12,
    color: Colors.slate300,
    marginTop: 2,
  },
  menuCloseButton: {
    padding: 8,
    height: 44,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    paddingVertical: 12,
  },
  menuSection: {
    paddingHorizontal: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
    backgroundColor: Colors.white,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.slate950,
  },
  logoutItem: {
    marginTop: 8,
  },
  logoutText: {
    color: '#ef4444',
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.slate100,
    marginVertical: 8,
  },
});

export default FloatingActionButtons;
