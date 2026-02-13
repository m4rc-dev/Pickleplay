// Mock for react-native-maps on web platform
// This prevents import errors when running on web

import React from 'react';
import { View } from 'react-native';

// Mock MapView component
const MapView = ({ children, style, ...props }) => {
  return <View style={style}>{children}</View>;
};

// Mock Marker component
const Marker = ({ children }) => {
  return <View>{children}</View>;
};

// Default export
export default MapView;
export { Marker };
