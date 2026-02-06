import React, { useState, useEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';

const NavigationTracker = ({ children }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const [currentRoute, setCurrentRoute] = useState(route.name);

  useEffect(() => {
    setCurrentRoute(route.name);
  }, [route.name]);

  // Expose navigation and current route to children
  return children({ navigation, currentRoute, setCurrentRoute });
};

export default NavigationTracker;
