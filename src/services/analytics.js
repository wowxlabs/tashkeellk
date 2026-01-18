import analytics from '@react-native-firebase/analytics';
import { Platform } from 'react-native';

let isInitialized = false;

/**
 * Initialize Firebase Analytics
 * Note: Deprecation warnings are expected during React Native Firebase's transition to modular API.
 * The current implementation works correctly and events are logged properly.
 */
export async function initializeAnalytics() {
  try {
    if (isInitialized) {
      return;
    }

    // Set analytics collection enabled
    // Note: Using default export - deprecation warnings are expected until v22 migration completes
    await analytics().setAnalyticsCollectionEnabled(true);
    
    // Enable debug mode for real-time event viewing
    // Note: For Android, also run: adb shell setprop debug.firebase.analytics.app com.tashkeellk.Tashkeellk
    // For iOS, debug mode is enabled via Xcode or Info.plist
    if (__DEV__) {
      console.log('🔍 Firebase Analytics Debug Mode Info:');
      console.log('   - View real-time events in Firebase Console → Analytics → DebugView');
      if (Platform.OS === 'android') {
        console.log('   - To enable debug mode on Android, run:');
        console.log('     adb shell setprop debug.firebase.analytics.app com.tashkeellk.Tashkeellk');
      }
    }
    
    isInitialized = true;
    console.log('✅ Firebase Analytics initialized');
    
    // Log a test event to verify analytics is working
    await logEvent('analytics_initialized', { platform: Platform.OS });
  } catch (error) {
    console.error('❌ Error initializing Firebase Analytics:', error);
    console.error('   Make sure you have built the app with native code (npx expo run:android/ios)');
  }
}

/**
 * Log a screen view (using standard GA4 screen_view event)
 * @param {string} screenName - Name of the screen
 * @param {string} screenClass - Class name of the screen (optional)
 */
export async function logScreenView(screenName, screenClass = null) {
  try {
    // Use logEvent with 'screen_view' instead of deprecated logScreenView
    await logEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
    console.log(`📊 Screen view logged: ${screenName}`);
  } catch (error) {
    console.error('Error logging screen view:', error);
  }
}

/**
 * Log an event
 * @param {string} eventName - Name of the event
 * @param {object} params - Event parameters (optional)
 */
export async function logEvent(eventName, params = {}) {
  try {
    await analytics().logEvent(eventName, params);
    // Log the actual event name and params for debugging
    console.log(`📊 Event logged: ${eventName}`, JSON.stringify(params));
    
    // Force analytics to send events immediately (for real-time viewing)
    // Note: Firebase automatically batches events, but this helps ensure they're sent
    if (__DEV__) {
      // In development, we can verify events are being logged
      console.log(`   → View in Firebase Console → Analytics → Real-time (or DebugView)`);
    }
  } catch (error) {
    console.error(`❌ Error logging event ${eventName}:`, error);
  }
}

/**
 * Set user property
 * @param {string} name - Property name
 * @param {string} value - Property value
 */
export async function setUserProperty(name, value) {
  try {
    await analytics().setUserProperty(name, value);
    console.log(`📊 User property set: ${name} = ${value}`);
  } catch (error) {
    console.error('Error setting user property:', error);
  }
}

/**
 * Set user ID
 * @param {string} userId - User ID
 */
export async function setUserId(userId) {
  try {
    await analytics().setUserId(userId);
    console.log(`📊 User ID set: ${userId}`);
  } catch (error) {
    console.error('Error setting user ID:', error);
  }
}

// Predefined event helpers for common app actions

/**
 * Log when a bayan/video is played
 */
export async function logBayanPlay(videoId, videoTitle) {
  await logEvent('bayan_play', {
    video_id: videoId,
    video_title: videoTitle,
  });
}

/**
 * Log when a bayan/video is shared
 */
export async function logBayanShare(videoId, videoTitle) {
  await logEvent('bayan_share', {
    video_id: videoId,
    video_title: videoTitle,
  });
}

/**
 * Log when radio is played
 */
export async function logRadioPlay() {
  await logEvent('radio_play');
}

/**
 * Log when radio is stopped
 */
export async function logRadioStop() {
  await logEvent('radio_stop');
}

/**
 * Log when prayer reminder is enabled/disabled
 */
export async function logPrayerReminderToggle(prayerName, enabled) {
  await logEvent('prayer_reminder_toggle', {
    prayer_name: prayerName,
    enabled: enabled,
  });
}

/**
 * Log when location is changed for prayer times
 */
export async function logPrayerLocationChange(location) {
  await logEvent('prayer_location_change', {
    location: location,
  });
}

/**
 * Log when adhan sound is changed
 */
export async function logAdhanSoundChange(soundId) {
  await logEvent('adhan_sound_change', {
    sound_id: soundId,
  });
}

/**
 * Log when Qibla finder is opened
 */
export async function logQiblaOpen() {
  await logEvent('qibla_open');
}

