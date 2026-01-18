import 'react-native-gesture-handler';
// CRITICAL: Import notifications module FIRST to trigger module-level handler setup
// This ensures the handler is set as early as possible, even before expo-router loads
import '../src/services/notifications';

import React, { useEffect } from 'react';
import { NavigationIndependentTree } from '@react-navigation/native';
import AppNavigator from '../src/navigation/AppNavigator';
import { initializeNotifications } from '../src/services/notifications';

export default function App() {
  useEffect(() => {
    // Initialize notifications and subscribe to Tashkeel notifications on app startup
    initializeNotifications().catch((error) => {
      console.warn('⚠️ Failed to initialize notifications on app load:', error);
      // Don't block app loading if notification initialization fails
    });
  }, []);

  return (
    <NavigationIndependentTree>
      <AppNavigator />
    </NavigationIndependentTree>
  );
}