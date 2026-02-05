import React, {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import {NavigationContainer, useNavigationContainerRef} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {StatusBar, View, StyleSheet, Easing, Animated} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';

// Import Auth Context
import {AuthProvider} from './src/contexts/AuthContext';

// Import screens
import LoadingScreen from './src/screens/LoadingScreen';
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import FindCourtsScreen from './src/screens/FindCourtsScreen';
import CourtDetailScreen from './src/screens/CourtDetailScreen';
import BookingScreen from './src/screens/BookingScreen';
import BookingReceiptScreen from './src/screens/BookingReceiptScreen';
import MapScreen from './src/screens/MapScreen';
import ShopScreen from './src/screens/ShopScreen';
import CartScreen from './src/screens/CartScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import ShopReceiptScreen from './src/screens/ShopReceiptScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PersonalInformationScreen from './src/screens/PersonalInformationScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import PrivacySecurityScreen from './src/screens/PrivacySecurityScreen';
import HelpSupportScreen from './src/screens/HelpSupportScreen';
import AboutScreen from './src/screens/AboutScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import PostScreen from './src/screens/PostScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import CourtOwnerScreen from './src/screens/CourtOwnerScreen';
import CoachScreen from './src/screens/CoachScreen';
import GlobalFooter from './src/components/GlobalFooter';
import GlobalHeader from './src/components/GlobalHeader';
import ScreenWrapper from './src/components/ScreenWrapper';
import Colors from './src/constants/Colors';
import { logScreenVisit } from './src/services/loggingService';

const Stack = createStackNavigator();

const getScreenOptions = ({route}) => {
  const screenOptions = {
    headerShown: false,
    gestureEnabled: true,
    animationDuration: 600,
    animationTypeForReplace: 'push',
    transitionSpec: {
      open: {
        animation: 'timing',
        config: {
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        },
      },
    },
  };
  
  if (route.params?.direction === 'left') {
    screenOptions.animation = 'slide_from_left';
  } else if (route.params?.direction === 'right') {
    screenOptions.animation = 'slide_from_right';
  } else {
    screenOptions.animation = 'slide_from_right';
  }
  
  return screenOptions;
};

const App = () => {
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const [currentRoute, setCurrentRoute] = useState('Loading');
  const [isDirectionsMode, setIsDirectionsMode] = useState(false);
  const navigationRef = useNavigationContainerRef();
  
  // Animated value for header fade animation
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-50)).current;

  const handleFooterNavigation = useCallback((screenName, index) => {
    if (__DEV__) {
      console.log('App handleFooterNavigation called:', screenName, index);
    }
    
    const isMovingForward = index > currentScreenIndex;
    const direction = isMovingForward ? 'right' : 'left';
    
    if (__DEV__) {
      console.log(`Transition: ${currentScreenIndex} → ${index} (${direction})`);
    }
    
    setCurrentScreenIndex(index);
    setCurrentRoute(screenName);
    
    if (navigationRef.current) {
      if (__DEV__) {
        console.log('Navigation container ref available, navigating to:', screenName, 'with direction:', direction);
      }
      try {
        navigationRef.current.navigate(screenName, { direction, screenIndex: index });
      } catch (error) {
        if (__DEV__) {
          console.log('Navigation error:', error);
        }
      }
    }
  }, [currentScreenIndex]);

  const handleBackNavigation = useCallback(() => {
    if (__DEV__) {
      console.log('Back button pressed, navigating to Home');
    }
    
    setCurrentScreenIndex(0);
    setCurrentRoute('Home');
    
    if (navigationRef.current) {
      try {
        navigationRef.current.navigate('Home', { direction: 'left', screenIndex: 0 });
      } catch (error) {
        if (__DEV__) {
          console.log('Back navigation error:', error);
        }
      }
    }
  }, []);

  const footerScreens = useMemo(() => ['Home', 'FindCourts', 'Map', 'Shop', 'Community', 'Profile', 'CourtDetail'], []);
  const shouldShowFooter = useMemo(() => footerScreens.includes(currentRoute) && !isDirectionsMode, [currentRoute, footerScreens, isDirectionsMode]);

  const createScreenWithRouteTracking = useCallback((screenName, ScreenComponent, onBackNavigation) => {
    return ({ navigation, route }) => {
      useEffect(() => {
        setCurrentRoute(screenName);
        if (__DEV__) {
          console.log('Route updated to:', screenName);
        }
      }, [screenName]);
      
      return (
        <ScreenWrapper>
          <ScreenComponent navigation={navigation} route={route} onBackNavigation={onBackNavigation} />
        </ScreenWrapper>
      );
    };
  }, []);

  const screenIndexMap = useMemo(() => ({
    'Home': 0,
    'FindCourts': 1,
    'Map': 2,
    'Shop': 3,
    'Community': 4,
    'Profile': 5,
  }), []);

  const onNavigationStateChange = useCallback((state) => {
    if (!state) return;
    
    const currentRouteName = state.routes[state.index]?.name;
    const routeParams = state.routes[state.index]?.params;
    
    if (__DEV__) {
      console.log('Navigation state changed:', currentRouteName, routeParams);
    }
    
    // Log visits to non-footer screens
    const footerScreens = ['Home', 'FindCourts', 'Map', 'Shop', 'Community', 'Profile'];
    if (!footerScreens.includes(currentRouteName)) {
      logScreenVisit(currentRouteName, routeParams);
    }
    
    // Track if we're in directions mode on Map screen
    setIsDirectionsMode(currentRouteName === 'Map' && routeParams?.showDirections === true);
    
    if (routeParams?.screenIndex !== undefined) {
      setCurrentScreenIndex(routeParams.screenIndex);
    } else if (screenIndexMap[currentRouteName] !== undefined) {
      setCurrentScreenIndex(screenIndexMap[currentRouteName]);
    }
    
    setCurrentRoute(currentRouteName);
  }, [screenIndexMap]);

  const noHeaderScreens = useMemo(() => [
    'Loading', 'Landing', 'Login', 'Register',
    'PersonalInformation', 'Settings', 'NotificationsPrefs', 'PrivacySecurity', 'HelpSupport', 'About',
    'Booking', 'BookingReceipt', 'CourtDetail',
    'Cart', 'Checkout', 'ShopReceipt', 'ProductDetail',
    'Favorites', 'Post'
  ], []);
  const shouldShowHeader = useMemo(() => !noHeaderScreens.includes(currentRoute) && !isDirectionsMode, [currentRoute, noHeaderScreens, isDirectionsMode]);

  // Animate header when shouldShowHeader changes
  useEffect(() => {
    if (shouldShowHeader) {
      // Fade in and slide down
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]).start();
    } else {
      // Fade out and slide up
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
        Animated.timing(headerTranslateY, {
          toValue: -30,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
      ]).start();
    }
  }, [shouldShowHeader, headerOpacity, headerTranslateY]);

  // Deep linking configuration for OAuth callbacks
  const linking = useMemo(() => ({
    prefixes: [
      Linking.createURL('/'),
      'pickleplay://',
    ],
    config: {
      screens: {
        // Auth callback will be handled by AuthContext, not navigation
        // This just ensures the app can receive the deep link
        Home: 'home',
      },
    },
  }), []);

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <NavigationContainer 
          ref={navigationRef} 
          onStateChange={onNavigationStateChange}
          linking={linking}
        >
          <View style={styles.container}>
            <Animated.View 
              style={[
                styles.headerAnimatedContainer,
                {
                  opacity: headerOpacity,
                  transform: [{ translateY: headerTranslateY }],
                  display: shouldShowHeader ? 'flex' : 'none',
                }
              ]}
              pointerEvents={shouldShowHeader ? 'auto' : 'none'}
            >
              <GlobalHeader />
            </Animated.View>
          <View style={styles.stackContainer}>
            <Stack.Navigator 
              screenOptions={getScreenOptions}
              initialRouteName="Loading">
              {/* Authentication Flow */}
              <Stack.Screen name="Loading" component={LoadingScreen} />
              <Stack.Screen name="Landing" component={LandingScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              
              {/* Main App Flow */}
              <Stack.Screen name="Home">
                {createScreenWithRouteTracking('Home', HomeScreen)}
              </Stack.Screen>
              <Stack.Screen name="FindCourts">
                {createScreenWithRouteTracking('FindCourts', FindCourtsScreen, handleBackNavigation)}
              </Stack.Screen>
              <Stack.Screen name="CourtDetail">
                {createScreenWithRouteTracking('CourtDetail', CourtDetailScreen, handleBackNavigation)}
              </Stack.Screen>
              <Stack.Screen name="Booking">
                {createScreenWithRouteTracking('Booking', BookingScreen, handleBackNavigation)}
              </Stack.Screen>
              <Stack.Screen name="BookingReceipt">
                {createScreenWithRouteTracking('BookingReceipt', BookingReceiptScreen, handleBackNavigation)}
              </Stack.Screen>
              <Stack.Screen name="Map">
                {createScreenWithRouteTracking('Map', MapScreen, handleBackNavigation)}
              </Stack.Screen>
              <Stack.Screen name="Shop">
                {createScreenWithRouteTracking('Shop', ShopScreen, handleBackNavigation)}
              </Stack.Screen>
              <Stack.Screen name="ProductDetail">
                {createScreenWithRouteTracking('ProductDetail', ProductDetailScreen, handleBackNavigation)}
              </Stack.Screen>
              <Stack.Screen name="Cart">
                {createScreenWithRouteTracking('Cart', CartScreen, handleBackNavigation)}
              </Stack.Screen>
              <Stack.Screen name="Checkout">
                {createScreenWithRouteTracking('Checkout', CheckoutScreen, handleBackNavigation)}
              </Stack.Screen>
              <Stack.Screen name="ShopReceipt">
                {createScreenWithRouteTracking('ShopReceipt', ShopReceiptScreen, handleBackNavigation)}
              </Stack.Screen>
              <Stack.Screen name="Profile">
                {createScreenWithRouteTracking('Profile', ProfileScreen, handleBackNavigation)}
              </Stack.Screen>
              <Stack.Screen name="Community">
                {createScreenWithRouteTracking('Community', CommunityScreen, handleBackNavigation)}
              </Stack.Screen>
              <Stack.Screen name="Post">
                {createScreenWithRouteTracking('Post', PostScreen, handleBackNavigation)}
              </Stack.Screen>

              {/* Profile Settings Screens */}
              <Stack.Screen name="PersonalInformation">
                {createScreenWithRouteTracking('PersonalInformation', PersonalInformationScreen, handleBackNavigation)}
              </Stack.Screen>
              <Stack.Screen name="Settings">
                {createScreenWithRouteTracking('Settings', SettingsScreen, handleBackNavigation)}
              </Stack.Screen>
              <Stack.Screen name="NotificationsPrefs">
                {createScreenWithRouteTracking('NotificationsPrefs', NotificationsScreen, handleBackNavigation)}
              </Stack.Screen>
              <Stack.Screen name="PrivacySecurity">
                {createScreenWithRouteTracking('PrivacySecurity', PrivacySecurityScreen, handleBackNavigation)}
              </Stack.Screen>
              <Stack.Screen name="HelpSupport">
                {createScreenWithRouteTracking('HelpSupport', HelpSupportScreen, handleBackNavigation)}
              </Stack.Screen>
              <Stack.Screen name="About">
                {createScreenWithRouteTracking('About', AboutScreen, handleBackNavigation)}
              </Stack.Screen>
              <Stack.Screen name="Favorites">
                {createScreenWithRouteTracking('Favorites', FavoritesScreen, handleBackNavigation)}
              </Stack.Screen>

              {/* Role-Based Screens */}
              <Stack.Screen name="CourtOwner">
                {createScreenWithRouteTracking('CourtOwner', CourtOwnerScreen, handleBackNavigation)}
              </Stack.Screen>
              <Stack.Screen name="Coach">
                {createScreenWithRouteTracking('Coach', CoachScreen, handleBackNavigation)}
              </Stack.Screen>
            </Stack.Navigator>
          </View>
          {shouldShowFooter && (
            <GlobalFooter 
              currentScreenIndex={currentScreenIndex}
              onNavigate={handleFooterNavigation}
            />
          )}
          </View>
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthProvider>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#0A56A7',
  },
  headerAnimatedContainer: {
    zIndex: 100,
  },
  stackContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
});
