import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const API_BASE_URL = 'https://push.masjid-companion.co.uk';

// Set notification handler globally (before any notifications can arrive)
// This must be set at module level to handle all incoming notifications
console.log('🔧 Setting notification handler at module load time...');
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('📬📬📬 Notification handler called:', notification.request.content.title);
    console.log('📬 Full notification:', JSON.stringify(notification.request.content, null, 2));
    return {
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});
console.log('✅ Notification handler set at module level');

/**
 * Get the Expo push token for this device
 * 
 * Note: For Android, Firebase Cloud Messaging (FCM) credentials must be configured.
 * See: https://docs.expo.dev/push-notifications/fcm-credentials/
 */
export async function getExpoPushToken() {
  try {
    // Ensure we have notification permissions
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== Notifications.PermissionStatus.GRANTED) {
      const { status: newStatus } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      if (newStatus !== Notifications.PermissionStatus.GRANTED) {
        console.warn('⚠️ Notification permissions not granted, cannot get push token');
        return null;
      }
    }

    // Get the Expo push token
    // Note: For Android, Expo uses FCM under the hood, but this is handled via EAS credentials
    // For iOS, Expo uses APNs (no FCM needed)
    // Using the EAS project ID from app.json
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '1dfe0430-b53f-440c-8781-3c0fd9a14c7a',
    });
    
    console.log('📱 Expo push token obtained:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    const errorMessage = error?.message || '';
    const isFCMError = errorMessage.includes('FirebaseApp') || 
                      errorMessage.includes('FCM') || 
                      errorMessage.includes('Firebase') ||
                      errorMessage.includes('fcm-credentials');
    
    if (isFCMError && Platform.OS === 'android') {
      // Android requires FCM (Firebase Cloud Messaging) which Expo uses under the hood
      // This needs to be configured via EAS credentials for Android builds
      console.warn('⚠️ Android push notifications require FCM configuration');
      console.warn('📖 To enable Android push notifications:');
      console.warn('   Run: eas credentials');
      console.warn('   Select: Android → Push Notifications → Set up FCM');
      console.warn('   EAS will handle the FCM setup automatically');
      console.warn('   Docs: https://docs.expo.dev/push-notifications/fcm-credentials/');
      console.warn('ℹ️  Note: iOS push notifications work without FCM (uses APNs)');
    } else {
      console.error('❌ Failed to get Expo push token:', error);
    }
    return null;
  }
}

/**
 * Subscribe user to Novu notifications for Tashkeel
 * This will call the backend API to register the push token with the masjid ID and name "Tashkeel"
 */
export async function subscribeToTashkeelNotifications() {
  try {
    // Get the push token
    const pushToken = await getExpoPushToken();
    if (!pushToken) {
      console.warn('⚠️ Cannot subscribe to Novu: No push token available');
      return false;
    }

    // Use "Tashkeel" as the masjid name and ID
    const masjidId = 'tashkeel';
    const masjidName = 'Tashkeel';

    // Call the backend API to subscribe
    const url = `${API_BASE_URL}/api/novu/subscribe`;
    console.log('📡 Subscribing to Novu for Tashkeel');
    console.log('📡 Push token:', pushToken);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        masjidId,
        masjidName,
        pushToken,
        platform: Platform.OS,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = errorText;
      }
      console.error(`❌ Failed to subscribe to Novu: ${response.status}`, {
        status: response.status,
        error: errorData,
        url,
        masjidId,
        pushToken: pushToken.substring(0, 20) + '...',
      });
      return false;
    }

    const data = await response.json();
    console.log('✅ Successfully subscribed to Tashkeel notifications:', data);
    return data.success === true;
  } catch (error) {
    console.error('❌ Error subscribing to Tashkeel notifications:', error);
    return false;
  }
}

/**
 * Unsubscribe user from Novu notifications for Tashkeel
 */
export async function unsubscribeFromTashkeelNotifications() {
  try {
    const pushToken = await getExpoPushToken();
    if (!pushToken) {
      console.warn('⚠️ Cannot unsubscribe from Novu: No push token available');
      return false;
    }

    const masjidId = 'tashkeel';
    const url = `${API_BASE_URL}/api/novu/unsubscribe`;
    console.log('📡 Unsubscribing from Novu for Tashkeel');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        masjidId,
        pushToken,
        platform: Platform.OS,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = errorText;
      }
      console.error(`❌ Failed to unsubscribe from Novu: ${response.status}`, {
        status: response.status,
        error: errorData,
        url,
        masjidId,
      });
      return false;
    }

    const data = await response.json();
    console.log('✅ Successfully unsubscribed from Tashkeel notifications:', data);
    return data.success === true;
  } catch (error) {
    console.error('❌ Error unsubscribing from Tashkeel notifications:', error);
    return false;
  }
}

/**
 * Initialize notifications and subscribe to Tashkeel notifications
 */
// Store listeners to prevent duplicate registrations
let notificationReceivedListener = null;
let notificationResponseListener = null;

export async function initializeNotifications() {
  try {
    console.log('🔧 Initializing notifications...');
    
    // Note: Notification handler is already set at module level above
    console.log('✅ Notification handler already set at module level');

    // Request permissions FIRST (before setting up listeners)
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== Notifications.PermissionStatus.GRANTED) {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== Notifications.PermissionStatus.GRANTED) {
      console.warn('⚠️ Notification permissions not granted');
      return false;
    }
    
    console.log('✅ Notification permissions granted:', finalStatus);

    // Configure Android notification channel (required for Android 8.0+) BEFORE listeners
    // Use "default" channel name to match Expo's default when backend doesn't send channelId
    if (Platform.OS === 'android') {
      // Create default channel (used when backend doesn't specify channelId)
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Tashkeel Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        sound: true,
        showBadge: false,
      });
      console.log('✅ Android notification channel created: default');
      
      // Also create custom channel for future use
      await Notifications.setNotificationChannelAsync('tashkeel-notifications', {
        name: 'Tashkeel Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        sound: true,
        showBadge: false,
      });
      console.log('✅ Android notification channel created: tashkeel-notifications');
    }

    // Add listener for notifications received while app is running (after permissions and channel)
    if (!notificationReceivedListener) {
      notificationReceivedListener = Notifications.addNotificationReceivedListener((notification) => {
        console.log('🔔 Notification received:', notification.request.content.title);
        console.log('📱 Notification body:', notification.request.content.body);
        console.log('📱 Full notification:', JSON.stringify(notification.request.content, null, 2));
      });
      console.log('✅ Notification received listener registered');
    }

    // Add listener for notification taps/interactions
    if (!notificationResponseListener) {
      notificationResponseListener = Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('👆 Notification tapped:', response.notification.request.content.title);
        console.log('📱 Notification data:', response.notification.request.content.data);
      });
      console.log('✅ Notification response listener registered');
    }

    console.log('✅ Notifications initialized successfully');
    
    // Check if there's a notification that opened the app
    const lastNotificationResponse = await Notifications.getLastNotificationResponseAsync();
    if (lastNotificationResponse) {
      console.log('📱 App was opened from notification:', lastNotificationResponse.notification.request.content.title);
      console.log('📱 Notification data:', lastNotificationResponse.notification.request.content.data);
    }
    
    // Subscribe to Tashkeel notifications
    const subscriptionResult = await subscribeToTashkeelNotifications();
    console.log('📡 Subscription result:', subscriptionResult);
    
    // Log current push token for debugging
    const currentToken = await getExpoPushToken();
    if (currentToken) {
      console.log('🔍🔍🔍 CURRENT PUSH TOKEN:', currentToken);
      console.log('📝 COPY THIS EXACT TOKEN (no spaces):', currentToken);
      console.log('📝 Test at: https://expo.dev/notifications');
      console.log('⚠️ VERIFY BACKEND HAS THIS EXACT TOKEN');
    } else {
      console.error('❌ NO PUSH TOKEN AVAILABLE!');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize notifications:', error);
    return false;
  }
}

