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
      color: Colors.blue600,
      bg: Colors.blue600 + '15',
    },
    {
      icon: 'receipt-long',
      title: 'Receipts',
      screen: 'ReceiptHistory',
      color: Colors.lime400,
      bg: Colors.lime400 + '15',
    },
    {
      icon: 'newspaper',
      title: 'News',
      screen: 'News',
      color: '#f59e0b',
      bg: '#fef3c7',
    },
    {
      icon: 'notifications',
      title: 'Notifications',
      screen: 'NotificationsPrefs',
      color: '#ef4444',
      bg: '#fee2e2',
    },
    {
      icon: 'bookmark',
      title: 'Favorites',
      screen: 'Favorites',
      color: '#8b5cf6',
      bg: '#f3e8ff',
    },
    {
      icon: 'groups',
      title: 'Community',
      screen: 'Community',
      color: '#10b981',
      bg: '#d1fae5',
    },
    {
      icon: 'sports-tennis',
      title: 'Find Courts',
      screen: 'FindCourts',
      color: '#06b6d4',
      bg: '#cffafe',
    },
    {
      icon: 'shopping-bag',
      title: 'Shop',
      screen: 'Shop',
      color: '#ec4899',
      bg: '#fce7f3',
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
              console.log('🚪 Starting logout from GlobalHeader...');
              
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
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 12 : 20 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.favoriteButton} onPress={handleFavoritesPress}>
            <View style={styles.favoriteIconBg}>
              <MaterialIcons name="favorite" size={20} color={Colors.slate950} />
            </View>
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/PickleplayPH.png')}
              style={styles.logoImage}
            />
            <Text style={styles.titleText}>PICKLEPLAY.PH</Text>
          </View>
          
          <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(true)}>
            <View style={styles.menuIconBg}>
              <MaterialIcons name="menu" size={24} color={Colors.slate950} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

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

            <ScrollView showsVerticalScrollIndicator={false} style={styles.menuScrollView}>
              {/* Main Menu Items */}
              <View style={styles.iconMenuContainer}>
                {mainMenuItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.iconMenuItem}
                    onPress={() => handleMenuItemPress(item.screen)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.iconMenuIconContainer, { backgroundColor: item.bg }]}>
                      <MaterialIcons name={item.icon} size={28} color={item.color} />
                    </View>
                    <Text style={styles.iconMenuTitle} numberOfLines={2}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Settings and Privacy Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="tune" size={20} color={Colors.slate600} style={styles.sectionIcon} />
                  <Text style={styles.sectionTitle}>Settings & Privacy</Text>
                </View>
                {settingsItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.listItem}
                    onPress={() => handleMenuItemPress(item.screen)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.listIconBg}>
                      <MaterialIcons name={item.icon} size={18} color={Colors.slate700} />
                    </View>
                    <Text style={styles.listItemText}>{item.title}</Text>
                    <MaterialIcons name="arrow-forward-ios" size={14} color={Colors.slate400} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Help and Support Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="support-agent" size={20} color={Colors.slate600} style={styles.sectionIcon} />
                  <Text style={styles.sectionTitle}>Help & Support</Text>
                </View>
                {helpItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.listItem}
                    onPress={() => handleMenuItemPress(item.screen)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.listIconBg}>
                      <MaterialIcons name={item.icon} size={18} color={Colors.slate700} />
                    </View>
                    <Text style={styles.listItemText}>{item.title}</Text>
                    <MaterialIcons name="arrow-forward-ios" size={14} color={Colors.slate400} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Logout Button */}
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.logoutGradient}
                >
                  <MaterialIcons name="logout" size={20} color={Colors.white} />
                  <Text style={styles.logoutText}>Logout</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={{height: 40}} />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.white,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    shadowColor: Colors.slate950,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  favoriteButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.slate100,
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
    fontSize: 10,
    fontWeight: '800',
    color: Colors.slate950,
    marginTop: 2,
    letterSpacing: 1.5,
  },
  
  // Menu Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-start',
  },
  menuContainer: {
    width: '85%',
    maxWidth: 360,
    height: '100%',
    backgroundColor: Colors.white,
    alignSelf: 'flex-end',
    shadowColor: Colors.slate950,
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingTop: 48,
  },
  menuHeaderProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    padding: 3,
    borderRadius: 28,
    backgroundColor: Colors.lime400,
  },
  menuAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: Colors.slate950,
  },
  menuUserInfo: {
    flex: 1,
    marginLeft: 16,
  },
  menuUsername: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  menuEmail: {
    fontSize: 13,
    color: Colors.slate300,
    fontWeight: '500',
  },
  menuCloseButton: {
    padding: 4,
    marginLeft: 12,
  },
  menuScrollView: {
    flex: 1,
  },
  iconMenuContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  iconMenuItem: {
    width: '50%',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  iconMenuIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconMenuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate950,
    textAlign: 'left',
    lineHeight: 18,
    letterSpacing: -0.3,
  },
  sectionContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 4,
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.slate600,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  listIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    color: Colors.slate950,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#ef4444',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.5,
  },
});

export default GlobalHeader;
