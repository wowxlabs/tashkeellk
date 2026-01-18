import 'react-native-gesture-handler';
// CRITICAL: Import notifications module FIRST to trigger module-level handler setup
// This ensures the handler is set as early as possible, even before expo-router loads
import '../src/services/notifications';

import React, { useEffect } from 'react';
import { NavigationIndependentTree } from '@react-navigation/native';
import AppNavigator from '../src/navigation/AppNavigator';
import { initializeNotifications } from '../src/services/notifications';
import { initializePrayerNotifications, setupAppStateListener, removeAppStateListener, schedulePrayerReminders, rescheduleDailyRefreshNotification } from '../src/services/prayerReminders';
import * as Notifications from 'expo-notifications';

export default function App() {
  useEffect(() => {
    // Initialize notifications and subscribe to Tashkeel notifications on app startup
    initializeNotifications()
      .then(() => {
        // Initialize prayer reminders after a short delay to ensure notifications are ready
        setTimeout(() => {
          initializePrayerNotifications().catch((error) => {
            console.warn('⚠️ Failed to initialize prayer reminders on app load:', error);
          });
        }, 1000);
      })
      .catch((error) => {
        console.warn('⚠️ Failed to initialize notifications on app load:', error);
        // Don't block app loading if notification initialization fails
      });

    // Set up app state listener for prayer reminders
    setupAppStateListener();

    // Handle notification received (when app is active)
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (data?.type === 'prayer_reminders_refresh') {
        console.log('🔄 Daily refresh notification received, rescheduling reminders...');
        schedulePrayerReminders()
          .then(() => rescheduleDailyRefreshNotification())
          .catch((error) => {
            console.error('Error rescheduling reminders:', error);
          });
      }
    });

    // Handle notification responses (when user taps on notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'prayer_reminders_refresh') {
        console.log('🔄 Daily refresh notification tapped, rescheduling reminders...');
        schedulePrayerReminders()
          .then(() => rescheduleDailyRefreshNotification())
          .catch((error) => {
            console.error('Error rescheduling reminders:', error);
          });
      }
    });

    return () => {
      removeAppStateListener();
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return (
    <NavigationIndependentTree>
      <AppNavigator />
    </NavigationIndependentTree>
  );
}