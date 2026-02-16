import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Colors from '../constants/Colors';

const thematicBlue = '#0A56A7';

const GlobalHeader = ({ title = 'PICKLEPLAY' }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [profileData, setProfileData] = useState(null);
  
  // Fetch profile data from Supabase profiles table
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
  
  const handleFavoritesPress = () => {
    navigation.navigate('Favorites');
  };

  const mainMenuItems = [
    {
      icon: 'person',
      title: 'Profile',
      screen: 'PersonalInformation',
      color: thematicBlue,
    },
    {
      icon: 'receipt-long',
      title: 'Receipts',
      screen: 'ReceiptHistory',
      color: thematicBlue,
    },
    {
      icon: 'newspaper',
      title: 'News',
      screen: 'News',
      color: thematicBlue,
    },
    {
      icon: 'notifications',
      title: 'Notifications',
      screen: 'NotificationsPrefs',
      color: thematicBlue,
    },
    {
      icon: 'bookmark',
      title: 'Saved',
      screen: 'Favorites',
      color: thematicBlue,
    },
    {
      icon: 'groups',
      title: 'Community',
      screen: 'Community',
      color: thematicBlue,
    },
    {
      icon: 'sports-tennis',
      title: 'Find Courts',
      screen: 'FindCourts',
      color: thematicBlue,
    },
    {
      icon: 'shopping-bag',
      title: 'Shop',
      screen: 'Shop',
      color: thematicBlue,
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
            setMenuVisible(false);
            try {
              await signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Landing' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };
  
  return (
    <>
      <LinearGradient
        colors={[thematicBlue, thematicBlue]}
        style={[styles.header, { paddingTop: insets.top > 0 ? insets.top : 20 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.favoriteButton} onPress={handleFavoritesPress}>
            <MaterialIcons name="favorite" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/PickleplayPH.png')}
              style={styles.logoImage}
            />
            <Text style={styles.titleText}>PICKLEPLAY.PH</Text>
          </View>
          <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(true)}>
            <MaterialIcons name="menu" size={28} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Side Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            {/* Menu Header with Avatar and Username */}
            <View style={styles.menuHeader}>
              <View style={styles.menuHeaderProfile}>
                <Image 
                  source={{ uri: getUserAvatar() }}
                  style={styles.menuAvatar}
                />
                <View style={styles.menuUserInfo}>
                  <Text style={styles.menuUsername}>{getUserDisplayName()}</Text>
                  <Text style={styles.menuEmail}>{user?.email || ''}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.menuCloseButton}>
                <MaterialIcons name="menu" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Main Menu Items */}
              <View style={styles.iconMenuContainer}>
                {mainMenuItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.iconMenuItem}
                    onPress={() => handleMenuItemPress(item.screen)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.iconMenuIconContainer, { backgroundColor: '#f0f2f5' }]}>
                      <MaterialIcons name={item.icon} size={24} color={item.color} />
                    </View>
                    <Text style={styles.iconMenuTitle} numberOfLines={2}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Settings and Privacy Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="settings" size={20} color="#65676b" style={styles.sectionIcon} />
                  <Text style={styles.sectionTitle}>Settings and privacy</Text>
                </View>
                {settingsItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.listItem}
                    onPress={() => handleMenuItemPress(item.screen)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name={item.icon} size={20} color="#65676b" />
                    <Text style={styles.listItemText}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Help and Support Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="help-outline" size={20} color="#65676b" style={styles.sectionIcon} />
                  <Text style={styles.sectionTitle}>Help and support</Text>
                </View>
                {helpItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.listItem}
                    onPress={() => handleMenuItemPress(item.screen)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name={item.icon} size={20} color="#65676b" />
                    <Text style={styles.listItemText}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Logout Button */}
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <MaterialIcons name="logout" size={20} color="#FF3B30" />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  favoriteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoImage: {
    width: 140,
    height: 40,
    resizeMode: 'contain',
  },
  titleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
    marginTop: 2,
    letterSpacing: 1,
  },
  
  // Menu Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  menuContainer: {
    width: '75%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6eb',
    backgroundColor: '#fff',
  },
  menuHeaderProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  menuUserInfo: {
    flex: 1,
  },
  menuUsername: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  menuEmail: {
    fontSize: 13,
    color: '#65676b',
  },
  menuCloseButton: {
    padding: 4,
  },
  iconMenuContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  iconMenuItem: {
    width: '50%',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  iconMenuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconMenuTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    textAlign: 'left',
    lineHeight: 18,
  },
  sectionContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e4e6eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  listItemText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '400',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 12,
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#e4e6eb',
    gap: 12,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FF3B30',
  },
});

export default GlobalHeader;
