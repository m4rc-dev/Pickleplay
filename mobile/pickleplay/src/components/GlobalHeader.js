import React, { useState } from 'react';
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
import Colors from '../constants/Colors';

const thematicBlue = '#0A56A7';

const GlobalHeader = ({ title = 'PICKLEPLAY' }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  
  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.user_metadata?.first_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim();
    }
    return user?.email?.split('@')[0] || 'Player';
  };

  const getUserAvatar = () => {
    return user?.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80';
  };
  
  const handleFavoritesPress = () => {
    navigation.navigate('Favorites');
  };

  const menuItems = [
    {
      icon: 'person',
      title: 'Personal Information',
      description: 'Update your profile details',
      screen: 'PersonalInformation',
      color: thematicBlue,
    },
    {
      icon: 'settings',
      title: 'Settings',
      description: 'Manage app preferences',
      screen: 'Settings',
      color: thematicBlue,
    },
    {
      icon: 'notifications',
      title: 'Notifications',
      description: 'Configure notification settings',
      screen: 'NotificationsPrefs',
      color: thematicBlue,
    },
    {
      icon: 'security',
      title: 'Privacy & Security',
      description: 'Manage your privacy settings',
      screen: 'PrivacySecurity',
      color: thematicBlue,
    },
    {
      icon: 'help',
      title: 'Help & Support',
      description: 'Get help with the app',
      screen: 'HelpSupport',
      color: thematicBlue,
    },
    {
      icon: 'info',
      title: 'About',
      description: 'App version and information',
      screen: 'About',
      color: thematicBlue,
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
              {/* Icon-only Menu Items */}
              <View style={styles.iconMenuContainer}>
                {menuItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.iconMenuItem}
                    onPress={() => handleMenuItemPress(item.screen)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconMenuIconContainer, { backgroundColor: `${item.color}15` }]}>
                      <MaterialIcons name={item.icon} size={28} color={item.color} />
                    </View>
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
    borderBottomColor: '#f0f0f0',
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
    borderWidth: 2,
    borderColor: thematicBlue,
    marginRight: 12,
  },
  menuUserInfo: {
    flex: 1,
  },
  menuUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  menuEmail: {
    fontSize: 12,
    color: '#999',
  },
  menuCloseButton: {
    padding: 4,
  },
  iconMenuContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 16,
  },
  iconMenuItem: {
    width: '30%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMenuIconContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFF1F0',
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
  },
});

export default GlobalHeader;
