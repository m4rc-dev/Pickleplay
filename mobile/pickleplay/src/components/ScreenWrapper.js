import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

const ScreenWrapper = ({ children }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    // Ensure this view is fully opaque and positioned correctly
    position: 'relative',
    ...Platform.select({
      ios: {
        // iOS specific - ensure no transparency
      },
      android: {
        // Android specific - ensure proper elevation
        elevation: 0,
      },
    }),
  },
  content: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
});

export default ScreenWrapper;
