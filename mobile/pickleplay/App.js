import React, {useState, useCallback, useMemo, createContext, useContext} from 'react';
import {NavigationContainer, useNavigationContainerRef} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {View, StyleSheet, Easing} from 'react-native';
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
import ReceiptHistoryScreen from './src/screens/ReceiptHistoryScreen';
import NewsScreen from './src/screens/NewsScreen';
import ArticleDetailScreen from './src/screens/ArticleDetailScreen';
import MapScreen from './src/screens/MapScreen';
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
import CoachesScreen from './src/screens/CoachesScreen';
import TournamentScreen from './src/screens/TournamentScreen';
import ProfessionalDashboardScreen from './src/screens/ProfessionalDashboardScreen';
import GlobalFooter from './src/components/GlobalFooter';
import FloatingActionButtons from './src/components/FloatingActionButtons';
import ScreenWrapper from './src/components/ScreenWrapper';
import { logScreenVisit } from './src/services/loggingService';

const Stack = createStackNavigator();

// Create a context for navigation helpers to avoid prop drilling
const NavigationHelpersContext = createContext({
  handleBackNavigation: () => {},
});

export const useNavigationHelpers = () => useContext(NavigationHelpersContext);

// Create stable wrapped components OUTSIDE of App component to prevent re-creation
const WrappedHomeScreen = (props) => (
  <ScreenWrapper><HomeScreen {...props} /></ScreenWrapper>
);
const WrappedFindCourtsScreen = (props) => (
  <ScreenWrapper><FindCourtsScreen {...props} /></ScreenWrapper>
);
const WrappedCourtDetailScreen = (props) => (
  <ScreenWrapper><CourtDetailScreen {...props} /></ScreenWrapper>
);
const WrappedBookingScreen = (props) => (
  <ScreenWrapper><BookingScreen {...props} /></ScreenWrapper>
);
const WrappedBookingReceiptScreen = (props) => (
  <ScreenWrapper><BookingReceiptScreen {...props} /></ScreenWrapper>
);
const WrappedReceiptHistoryScreen = (props) => (
  <ScreenWrapper><ReceiptHistoryScreen {...props} /></ScreenWrapper>
);
const WrappedNewsScreen = (props) => (
  <ScreenWrapper><NewsScreen {...props} /></ScreenWrapper>
);
const WrappedArticleDetailScreen = (props) => (
  <ScreenWrapper><ArticleDetailScreen {...props} /></ScreenWrapper>
);
const WrappedMapScreen = (props) => (
  <ScreenWrapper><MapScreen {...props} /></ScreenWrapper>
);
const WrappedProductDetailScreen = (props) => (
  <ScreenWrapper><ProductDetailScreen {...props} /></ScreenWrapper>
);
const WrappedCartScreen = (props) => (
  <ScreenWrapper><CartScreen {...props} /></ScreenWrapper>
);
const WrappedCheckoutScreen = (props) => (
  <ScreenWrapper><CheckoutScreen {...props} /></ScreenWrapper>
);
const WrappedShopReceiptScreen = (props) => (
  <ScreenWrapper><ShopReceiptScreen {...props} /></ScreenWrapper>
);
const WrappedProfileScreen = (props) => (
  <ScreenWrapper><ProfileScreen {...props} /></ScreenWrapper>
);
const WrappedProfessionalDashboardScreen = (props) => (
  <ScreenWrapper><ProfessionalDashboardScreen {...props} /></ScreenWrapper>
);
const WrappedCoachesScreen = (props) => (
  <ScreenWrapper><CoachesScreen {...props} /></ScreenWrapper>
);
const WrappedTournamentScreen = (props) => (
  <ScreenWrapper><TournamentScreen {...props} /></ScreenWrapper>
);
const WrappedCommunityScreen = (props) => (
  <ScreenWrapper><CommunityScreen {...props} /></ScreenWrapper>
);
const WrappedPostScreen = (props) => (
  <ScreenWrapper><PostScreen {...props} /></ScreenWrapper>
);
const WrappedPersonalInformationScreen = (props) => (
  <ScreenWrapper><PersonalInformationScreen {...props} /></ScreenWrapper>
);
const WrappedSettingsScreen = (props) => (
  <ScreenWrapper><SettingsScreen {...props} /></ScreenWrapper>
);
const WrappedNotificationsScreen = (props) => (
  <ScreenWrapper><NotificationsScreen {...props} /></ScreenWrapper>
);
const WrappedPrivacySecurityScreen = (props) => (
  <ScreenWrapper><PrivacySecurityScreen {...props} /></ScreenWrapper>
);
const WrappedHelpSupportScreen = (props) => (
  <ScreenWrapper><HelpSupportScreen {...props} /></ScreenWrapper>
);
const WrappedAboutScreen = (props) => (
  <ScreenWrapper><AboutScreen {...props} /></ScreenWrapper>
);
const WrappedFavoritesScreen = (props) => (
  <ScreenWrapper><FavoritesScreen {...props} /></ScreenWrapper>
);
const WrappedCourtOwnerScreen = (props) => (
  <ScreenWrapper><CourtOwnerScreen {...props} /></ScreenWrapper>
);
const WrappedCoachScreen = (props) => (
  <ScreenWrapper><CoachScreen {...props} /></ScreenWrapper>
);

const getScreenOptions = ({route}) => {
  const screenOptions = {
    headerShown: false,
    gestureEnabled: true,
    animationDuration: 300,
    animationTypeForReplace: 'push',
    // Add cardStyle to ensure proper background and prevent see-through stacking
    cardStyle: { backgroundColor: '#F2F2F7' },
    transitionSpec: {
      open: {
        animation: 'timing',
        config: {
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: 300,
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

  const handleFooterNavigation = useCallback((screenName, index) => {
    if (__DEV__) {
      console.log('App handleFooterNavigation called:', screenName, index);
    }
    
    // Skip if already on the target screen to prevent duplicate navigation
    if (currentRoute === screenName) {
      if (__DEV__) {
        console.log('Already on screen:', screenName);
      }
      return;
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
        // Use reset to clear the stack completely and prevent overlaying screens
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: screenName, params: { direction, screenIndex: index } }],
        });
      } catch (error) {
        if (__DEV__) {
          console.log('Navigation error:', error);
        }
      }
    }
  }, [currentScreenIndex, currentRoute, navigationRef]);

  const handleBackNavigation = useCallback(() => {
    if (__DEV__) {
      console.log('Back button pressed, navigating to Home');
    }
    
    setCurrentScreenIndex(0);
    setCurrentRoute('Home');
    
    if (navigationRef.current) {
      try {
        // Use reset to clear the stack and prevent overlaying screens
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Home', params: { direction: 'left', screenIndex: 0 } }],
        });
      } catch (error) {
        if (__DEV__) {
          console.log('Back navigation error:', error);
        }
      }
    }
  }, [navigationRef]);

  const navigationHelpers = useMemo(() => ({
    handleBackNavigation,
  }), [handleBackNavigation]);

  const footerScreens = useMemo(() => ['Home', 'FindCourts', 'Map', 'Community', 'Profile', 'CourtDetail'], []);
  const shouldShowFooter = useMemo(() => footerScreens.includes(currentRoute) && !isDirectionsMode, [currentRoute, footerScreens, isDirectionsMode]);

  const screenIndexMap = useMemo(() => ({
    'Home': 0,
    'FindCourts': 1,
    'Map': 2,
    'Community': 3,
    'Profile': 4,
  }), []);

  const onNavigationStateChange = useCallback((state) => {
    if (!state) return;
    
    const currentRouteName = state.routes[state.index]?.name;
    const routeParams = state.routes[state.index]?.params;
    
    if (__DEV__) {
      console.log('Navigation state changed:', currentRouteName, routeParams);
    }
    
    // Log visits to non-footer screens
    const footerScreensList = ['Home', 'FindCourts', 'Map', 'Shop', 'Community', 'Profile'];
    if (!footerScreensList.includes(currentRouteName)) {
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
    'Booking', 'BookingReceipt', 'ReceiptHistory', 'News', 'ArticleDetail', 'CourtDetail',
    'Cart', 'Checkout', 'ShopReceipt', 'ProductDetail',
    'Favorites', 'Post', 'ProfessionalDashboard', 'Coaches', 'Tournaments'
  ], []);
  const shouldShowHeader = useMemo(() => !noHeaderScreens.includes(currentRoute) && !isDirectionsMode, [currentRoute, noHeaderScreens, isDirectionsMode]);

  // Deep linking configuration for OAuth callbacks
  const linking = useMemo(() => ({
    prefixes: [
      Linking.createURL('/'),
      'pickleplay://',
    ],
    config: {
      screens: {
        Home: 'home',
      },
    },
  }), []);

  return (
    <AuthProvider>
      <NavigationHelpersContext.Provider value={navigationHelpers}>
        <SafeAreaProvider>
          <NavigationContainer 
            ref={navigationRef} 
            onStateChange={onNavigationStateChange}
            linking={linking}
          >
            <View style={styles.container}>
              {shouldShowHeader && <FloatingActionButtons />}
              <View style={styles.stackContainer}>
                <Stack.Navigator 
                  screenOptions={getScreenOptions}
                  initialRouteName="Loading"
                >
                  {/* Authentication Flow */}
                  <Stack.Screen name="Loading" component={LoadingScreen} />
                  <Stack.Screen name="Landing" component={LandingScreen} />
                  <Stack.Screen name="Login" component={LoginScreen} />
                  <Stack.Screen name="Register" component={RegisterScreen} />
                  
                  {/* Main App Flow - Using stable wrapped components */}
                  <Stack.Screen name="Home" component={WrappedHomeScreen} />
                  <Stack.Screen name="FindCourts" component={WrappedFindCourtsScreen} />
                  <Stack.Screen name="CourtDetail" component={WrappedCourtDetailScreen} />
                  <Stack.Screen name="Booking" component={WrappedBookingScreen} />
                  <Stack.Screen name="BookingReceipt" component={WrappedBookingReceiptScreen} />
                  <Stack.Screen name="ReceiptHistory" component={WrappedReceiptHistoryScreen} />
                  <Stack.Screen name="News" component={WrappedNewsScreen} />
                  <Stack.Screen name="ArticleDetail" component={WrappedArticleDetailScreen} />
                  <Stack.Screen name="Map" component={WrappedMapScreen} />
                  <Stack.Screen name="ProductDetail" component={WrappedProductDetailScreen} />
                  <Stack.Screen name="Cart" component={WrappedCartScreen} />
                  <Stack.Screen name="Checkout" component={WrappedCheckoutScreen} />
                  <Stack.Screen name="ShopReceipt" component={WrappedShopReceiptScreen} />
                  <Stack.Screen name="Profile" component={WrappedProfileScreen} />
                  <Stack.Screen name="ProfessionalDashboard" component={WrappedProfessionalDashboardScreen} />
                  <Stack.Screen name="Coaches" component={WrappedCoachesScreen} />
                  <Stack.Screen name="Tournaments" component={WrappedTournamentScreen} />
                  <Stack.Screen name="Community" component={WrappedCommunityScreen} />
                  <Stack.Screen name="Post" component={WrappedPostScreen} />

                  {/* Profile Settings Screens */}
                  <Stack.Screen name="PersonalInformation" component={WrappedPersonalInformationScreen} />
                  <Stack.Screen name="Settings" component={WrappedSettingsScreen} />
                  <Stack.Screen name="NotificationsPrefs" component={WrappedNotificationsScreen} />
                  <Stack.Screen name="PrivacySecurity" component={WrappedPrivacySecurityScreen} />
                  <Stack.Screen name="HelpSupport" component={WrappedHelpSupportScreen} />
                  <Stack.Screen name="About" component={WrappedAboutScreen} />
                  <Stack.Screen name="Favorites" component={WrappedFavoritesScreen} />

                  {/* Role-Based Screens */}
                  <Stack.Screen name="CourtOwner" component={WrappedCourtOwnerScreen} />
                  <Stack.Screen name="Coach" component={WrappedCoachScreen} />
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
      </NavigationHelpersContext.Provider>
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
  stackContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
});
