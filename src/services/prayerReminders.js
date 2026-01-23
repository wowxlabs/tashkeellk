import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState } from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import { DateTime } from 'luxon';
import { getCalculationMethod, getTimezone } from './prayerSettings';

const PRAYER_NAMES = {
  Fajr: 'Fajr',
  Dhuhr: 'Dhuhr',
  Asr: 'Asr',
  Maghrib: 'Maghrib',
  Isha: 'Isha',
};

// Sound options for adhan notifications
const ADHAN_SOUND_OPTIONS = [
  { id: 'sound1', name: 'Adhan 1', filename: 'sound1.wav' },
  { id: 'sound2', name: 'Adhan 2', filename: 'sound2.wav' },
];

const STORAGE_KEYS = {
  PRAYER_REMINDERS_ENABLED: '@prayerReminders:enabled',
  LOCATION: '@prayerReminders:location', // kept for backwards compatibility (no longer used for API)
  MINUTES_BEFORE: '@prayerReminders:minutesBefore',
  ADHAN_SOUND: '@prayerReminders:adhanSound',
};

const LOCATION_COORDS_KEY = 'USER_LOCATION_COORDS';

// Get prayer reminder toggles
export async function getPrayerReminderToggles() {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PRAYER_REMINDERS_ENABLED);
    if (data) {
      return JSON.parse(data);
    }
    // Default: all prayers enabled
    return {
      Fajr: true,
      Dhuhr: true,
      Asr: true,
      Maghrib: true,
      Isha: true,
    };
  } catch (error) {
    console.error('Error getting prayer reminder toggles:', error);
    return {
      Fajr: true,
      Dhuhr: true,
      Asr: true,
      Maghrib: true,
      Isha: true,
    };
  }
}

// Set prayer reminder toggles
export async function setPrayerReminderToggles(toggles) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PRAYER_REMINDERS_ENABLED, JSON.stringify(toggles));
    return true;
  } catch (error) {
    console.error('Error setting prayer reminder toggles:', error);
    return false;
  }
}

// Get minutes before prayer to notify
export async function getPrayerReminderMinutesBefore() {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.MINUTES_BEFORE);
    return data ? parseInt(data, 10) : 0; // Default 0 minutes (on time)
  } catch (error) {
    console.error('Error getting minutes before:', error);
    return 0;
  }
}

// Set minutes before prayer to notify
export async function setPrayerReminderMinutesBefore(minutes) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.MINUTES_BEFORE, minutes.toString());
    return true;
  } catch (error) {
    console.error('Error setting minutes before:', error);
    return false;
  }
}

// Get selected location
export async function getSelectedLocation() {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION);
    return data || 'uk'; // Default to UK
  } catch (error) {
    console.error('Error getting location:', error);
    return 'uk';
  }
}

// Set selected location
export async function setSelectedLocation(location) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LOCATION, location);
    return true;
  } catch (error) {
    console.error('Error setting location:', error);
    return false;
  }
}

// Get adhan sound filename
export async function getAdhanSoundFilename() {
  const soundId = await getSelectedAdhanSoundId();
  const soundOption = ADHAN_SOUND_OPTIONS.find(opt => opt.id === soundId);
  return soundOption ? soundOption.filename : null;
}

// Get selected adhan sound ID
export async function getSelectedAdhanSoundId() {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ADHAN_SOUND);
    return data || 'sound1'; // Default to Adhan 1
  } catch (error) {
    console.error('Error getting adhan sound:', error);
    return 'sound1';
  }
}

// Set adhan sound
export async function setAdhanSound(soundId) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ADHAN_SOUND, soundId);
    return true;
  } catch (error) {
    console.error('Error setting adhan sound:', error);
    return false;
  }
}

// Get adhan sound options
export function getAdhanSoundOptions() {
  return ADHAN_SOUND_OPTIONS;
}

// Helper to get current coordinates and timezone (shared with Home)
async function getCoordsAndTimeZone() {
  try {
    let coords = null;
    const saved = await AsyncStorage.getItem(LOCATION_COORDS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.latitude && parsed?.longitude) {
        coords = parsed;
      }
    }

    if (!coords) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({});
        coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        await AsyncStorage.setItem(LOCATION_COORDS_KEY, JSON.stringify(coords));
      }
    }

    const timeZoneId = await getTimezone();

    return { coords, timeZoneId };
  } catch (error) {
    console.error('Error getting coords/timezone for prayer reminders:', error);
    const timeZoneId = await getTimezone().catch(() => 'UTC');
    return { coords: null, timeZoneId };
  }
}

// Fetch today's prayer times from API (using coords + method)
export async function getTodayPrayerTimes() {
  try {
    const { coords, timeZoneId } = await getCoordsAndTimeZone();
    if (!coords) {
      throw new Error('No coordinates available for today prayer times');
    }
    const method = await getCalculationMethod();
    const today = DateTime.now().setZone(timeZoneId);
    const apiDate = today.toFormat('yyyy-LL-dd');

    const response = await axios.get('https://api.tashkeel.lk/v1/prayertimes', {
      params: {
        lat: coords.latitude,
        lon: coords.longitude,
        date: apiDate,
        method: method || 'ISNA',
        timeZoneId: timeZoneId,
      },
      headers: { Accept: 'application/json' },
    });

    const times = response.data?.data?.times || {};

    const result = {};
    const labels = [
      { key: 'fajr', name: 'Fajr' },
      { key: 'dhuhr', name: 'Dhuhr' },
      { key: 'asr', name: 'Asr' },
      { key: 'maghrib', name: 'Maghrib' },
      { key: 'isha', name: 'Isha' },
    ];

    labels.forEach(({ key, name }) => {
      const t = times[key];
      if (!t) return;
      const [hourStr, minuteStr] = String(t).split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      if (Number.isNaN(hour) || Number.isNaN(minute)) return;

      const dt = DateTime.fromObject(
        {
          year: today.year,
          month: today.month,
          day: today.day,
          hour,
          minute,
        },
        { zone: timeZoneId }
      );

      result[name] = dt;
    });

    return result;
  } catch (error) {
    console.error('Error fetching prayer times:', error);
    return {};
  }
}

// Schedule a single prayer notification
async function scheduleSinglePrayerNotification(prayerName, prayerDateTime, minutesBefore, soundFilename) {
  try {
    // Calculate notification time (prayer time minus minutesBefore)
    const notificationTime = prayerDateTime.minus({ minutes: minutesBefore });
    const now = DateTime.now();

    // Only schedule if notification time is in the future
    if (notificationTime <= now) {
      console.log(`⏰ Skipping ${prayerName} - notification time has passed`);
      return false;
    }

    const identifier = `prayer_${prayerName}_${prayerDateTime.toFormat('yyyy-LL-dd')}`;

    console.log(`📅 Scheduling ${prayerName} reminder with sound: ${soundFilename || 'default'}`);

    // For iOS: use filename WITH extension (e.g., "sound1.wav")
    // Since sound files are in iOS bundle (ios/Tashkeel/sound1.wav), iOS can reference them by full filename
    // This matches Masjid Companion which also has sounds in iOS bundle and uses filename with extension
    // For Android: sound is handled by the notification channel
    const soundUri = soundFilename || undefined;

    const notificationContent = {
      title: `${prayerName} Prayer Reminder`,
      body: minutesBefore === 0 
        ? `It's time for ${prayerName} prayer`
        : `${prayerName} prayer is in ${minutesBefore} minute${minutesBefore !== 1 ? 's' : ''}`,
      data: {
        prayerName,
        prayerTime: prayerDateTime.toISO(),
        type: 'prayer_reminder',
      },
      ...(Platform.OS === 'android' && {
        color: '#ffffff', // White accent color for Android
      }),
    };

    // Set sound based on platform
    if (Platform.OS === 'ios') {
      // iOS: Try using full filename with extension (like Masjid Companion)
      // Since sound files are in iOS bundle (ios/Tashkeel/sound1.wav), try full filename
      notificationContent.sound = soundUri || true;
      console.log(`🔊 iOS: Setting sound to: ${soundUri || 'default'} (full filename with extension, matching Masjid Companion)`);
      console.log(`🔊 iOS: Sound file in iOS bundle: ios/Tashkeel/${soundFilename || 'none'}`);
      console.log(`🔊 iOS: Full notification content sound field: ${JSON.stringify(notificationContent.sound)}`);
    }
    // Android: Do NOT set sound in content – let the channel decide

    // Schedule notification
    // In expo-notifications, channelId goes in the trigger (like masjid app)
    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: {
        type: 'date',
        date: notificationTime.toJSDate(),
        ...(Platform.OS === 'android' && { channelId: currentChannelId }),
      },
      identifier,
    });

    console.log(`✅ Scheduled ${prayerName} reminder for ${notificationTime.toFormat('yyyy-LL-dd HH:mm')}`);
    return true;
  } catch (error) {
    console.error(`Error scheduling ${prayerName} notification:`, error);
    return false;
  }
}

// Get prayer times for a specific date using the Tashkeel API
async function getPrayerTimesForDate(targetDate) {
  try {
    const { coords, timeZoneId } = await getCoordsAndTimeZone();
    if (!coords) {
      throw new Error('No coordinates available for prayer reminder scheduling');
    }
    const method = await getCalculationMethod();
    const dateInZone = targetDate.setZone(timeZoneId);
    const dateStr = dateInZone.toFormat('yyyy-LL-dd');

    const response = await axios.get('https://api.tashkeel.lk/v1/prayertimes', {
      params: {
        lat: coords.latitude,
        lon: coords.longitude,
        date: dateStr,
        method: method || 'ISNA',
        timeZoneId: timeZoneId,
      },
      headers: { Accept: 'application/json' },
    });

    const times = response.data?.data?.times || {};

    const prayers = {};
    const labels = [
      { key: 'fajr', name: 'Fajr' },
      { key: 'dhuhr', name: 'Dhuhr' },
      { key: 'asr', name: 'Asr' },
      { key: 'maghrib', name: 'Maghrib' },
      { key: 'isha', name: 'Isha' },
    ];

    labels.forEach(({ key, name }) => {
      const t = times[key];
      if (!t) return;
      const [hourStr, minuteStr] = String(t).split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      if (Number.isNaN(hour) || Number.isNaN(minute)) return;

      const prayerDateTime = DateTime.fromObject(
        {
          year: dateInZone.year,
          month: dateInZone.month,
          day: dateInZone.day,
          hour,
          minute,
        },
        { zone: timeZoneId }
      );

      prayers[name] = prayerDateTime;
      console.log(
        `📿 API ${name} prayer at ${prayerDateTime.toFormat('HH:mm')} for ${dateStr}`
      );
    });

    return prayers;
  } catch (error) {
    console.error('Error fetching prayer times for date from API:', error);
    return {};
  }
}

// Current channel ID for Android notifications (dynamic based on selected sound)
let currentChannelId = 'prayer-reminders-default';

// Helper function to get channel ID for a given sound filename
function getChannelIdForSound(soundFilename) {
  const soundWithoutExt = soundFilename
    ? soundFilename.replace(/\.\w+$/, '')
    : 'default';
  return `prayer-reminders-${soundWithoutExt}`;
}

// Ensure notification channel is set up with the correct sound (Android only)
async function ensurePrayerReminderChannel(soundFilename) {
  if (Platform.OS !== 'android') return;
  
  try {
    const soundWithoutExt = soundFilename
      ? soundFilename.replace(/\.\w+$/, '')
      : 'default';

    const channelId = getChannelIdForSound(soundFilename);
    currentChannelId = channelId;
    
    // Delete existing channel to recreate with new sound (channels are immutable)
    try {
      await Notifications.deleteNotificationChannelAsync(channelId);
    } catch (_e) {
      // Channel might not exist, ignore
    }
    
    // Create channel with the custom sound (without extension, like masjid app)
    await Notifications.setNotificationChannelAsync(channelId, {
      name: 'Prayer Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      sound: soundWithoutExt === 'default' ? undefined : soundWithoutExt,
      showBadge: false,
    });
    
    console.log(`✅ Prayer reminder channel configured: ${channelId} with sound: ${soundWithoutExt}`);
  } catch (error) {
    console.error('Error setting up prayer reminder channel:', error);
  }
}

// Schedule all prayer reminders
export async function schedulePrayerReminders() {
  try {
    // Cancel existing prayer reminders first
    await cancelAllPrayerReminders();

    const toggles = await getPrayerReminderToggles();
    const minutesBefore = await getPrayerReminderMinutesBefore();
    const soundFilename = await getAdhanSoundFilename();
    
    console.log(`🔊 Prayer reminders: Using sound filename: ${soundFilename || 'default'} (platform: ${Platform.OS})`);
    
    // Ensure channel is set up with the correct sound (Android only)
    await ensurePrayerReminderChannel(soundFilename);
    
    const { timeZoneId } = await getCoordsAndTimeZone();
    const now = DateTime.now().setZone(timeZoneId);

    let scheduledCount = 0;
    const daysScheduled = new Set();
    
    // Schedule for today and tomorrow only
    for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
      const targetDate = now.plus({ days: dayOffset });
      const prayers = await getPrayerTimesForDate(targetDate);

      let dayHasPrayers = false;
      for (const [prayerName, prayerDateTime] of Object.entries(prayers)) {
        if (toggles[prayerName]) {
          const scheduled = await scheduleSinglePrayerNotification(
            prayerName,
            prayerDateTime,
            minutesBefore,
            soundFilename
          );
          if (scheduled) {
            scheduledCount++;
            dayHasPrayers = true;
            daysScheduled.add(targetDate.toFormat('yyyy-LL-dd'));
          }
        }
      }
    }

    const today = now.toFormat('yyyy-LL-dd');
    const isTodayScheduled = daysScheduled.has(today);
    const dayCount = daysScheduled.size;
    
    if (isTodayScheduled && dayCount === 2) {
      console.log(`✅ Scheduled ${scheduledCount} prayer reminder(s) for today and tomorrow`);
    } else if (isTodayScheduled) {
      console.log(`✅ Scheduled ${scheduledCount} prayer reminder(s) for today`);
    } else {
      console.log(`✅ Scheduled ${scheduledCount} prayer reminder(s) for tomorrow`);
    }
    return scheduledCount;
  } catch (error) {
    console.error('Error scheduling prayer reminders:', error);
    return 0;
  }
}

// Cancel all prayer reminders (but keep the daily refresh notification)
export async function cancelAllPrayerReminders() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    const prayerNotifications = notifications.filter(
      (notif) => notif.content?.data?.type === 'prayer_reminder' && notif.identifier !== 'prayer_reminders_daily_refresh'
    );

    for (const notif of prayerNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }

    console.log(`✅ Cancelled ${prayerNotifications.length} prayer reminder(s)`);
    return prayerNotifications.length;
  } catch (error) {
    console.error('Error cancelling prayer reminders:', error);
    return 0;
  }
}

// Get scheduled prayer reminders
export async function getScheduledPrayerReminders() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications.filter(
      (notif) => notif.content?.data?.type === 'prayer_reminder'
    );
  } catch (error) {
    console.error('Error getting scheduled reminders:', error);
    return [];
  }
}

// Check if today's prayer reminders are scheduled
export async function checkTodayPrayerReminders() {
  try {
    const { timeZoneId } = await getCoordsAndTimeZone();
    const now = DateTime.now().setZone(timeZoneId);
    const today = now.toFormat('yyyy-LL-dd');
    
    const scheduled = await getScheduledPrayerReminders();
    const todayReminders = scheduled.filter((notif) => {
      const prayerTime = DateTime.fromISO(notif.content?.data?.prayerTime);
      return prayerTime.isValid && prayerTime.toFormat('yyyy-LL-dd') === today;
    });

    const todayPrayers = await getPrayerTimesForDate(now);
    const toggles = await getPrayerReminderToggles();
    
    // Count how many prayers should be scheduled today
    const expectedCount = Object.keys(todayPrayers).filter(
      (prayerName) => toggles[prayerName]
    ).length;

    console.log(`📅 Today's reminders: ${todayReminders.length}/${expectedCount} scheduled`);
    return todayReminders.length >= expectedCount;
  } catch (error) {
    console.error('Error checking today prayer reminders:', error);
    return false;
  }
}

// Schedule daily refresh notification at 11 PM
async function scheduleDailyRefreshNotification() {
  try {
    const { timeZoneId } = await getCoordsAndTimeZone();
    const now = DateTime.now().setZone(timeZoneId);
    
    // Calculate next 11 PM
    let next11PM = now.set({ hour: 23, minute: 0, second: 0, millisecond: 0 });
    if (next11PM <= now) {
      next11PM = next11PM.plus({ days: 1 });
    }

    const identifier = 'prayer_reminders_daily_refresh';

    // Cancel existing refresh notification
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

    // Schedule new refresh notification
    // Note: We'll reschedule this when it fires since Expo doesn't support true daily repeats
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Prayer Reminders',
        body: 'Updating prayer reminders for tomorrow',
        data: { type: 'prayer_reminders_refresh' },
        sound: false,
      },
      trigger: {
        type: 'date',
        date: next11PM.toJSDate(),
      },
      identifier,
    });

    console.log(`✅ Scheduled daily refresh at 11 PM: ${next11PM.toFormat('yyyy-LL-dd HH:mm')}`);
  } catch (error) {
    console.error('Error scheduling daily refresh:', error);
  }
}

// Reschedule the daily refresh notification (called when it fires)
export async function rescheduleDailyRefreshNotification() {
  await scheduleDailyRefreshNotification();
}

// Initialize prayer reminders (call this on app startup)
export async function initializePrayerNotifications() {
  try {
    console.log('🕌 Initializing prayer reminders...');
    
    // Check if today's reminders are scheduled
    const todayScheduled = await checkTodayPrayerReminders();
    
    if (!todayScheduled) {
      console.log('📅 Today\'s reminders missing, scheduling now...');
      await schedulePrayerReminders();
    } else {
      console.log('✅ Today\'s reminders already scheduled');
      // Still schedule for future days
      await schedulePrayerReminders();
    }
    
    // Schedule daily refresh at 11 PM
    await scheduleDailyRefreshNotification();
    
    const scheduled = await getScheduledPrayerReminders();
    console.log(`✅ Prayer reminders initialized: ${scheduled.length} reminder(s) total`);
    return scheduled.length;
  } catch (error) {
    console.error('Error initializing prayer reminders:', error);
    return 0;
  }
}

// Handle app state changes to check and reschedule if needed
let appStateSubscription = null;

export function setupAppStateListener() {
  if (appStateSubscription) {
    return; // Already set up
  }

  appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
    if (nextAppState === 'active') {
      console.log('📱 App became active, checking prayer reminders...');
      try {
        const { timeZoneId } = await getCoordsAndTimeZone();
        const now = DateTime.now().setZone(timeZoneId);
        const hour = now.hour;

        // Check if today's reminders are scheduled
        const todayScheduled = await checkTodayPrayerReminders();
        
        if (!todayScheduled) {
          console.log('📅 Today\'s reminders missing, scheduling now...');
          await schedulePrayerReminders();
        } else if (hour >= 23 || hour < 1) {
          // If it's after 11 PM or before 1 AM, reschedule for next day
          console.log('🔄 Late night/early morning, rescheduling reminders...');
          await schedulePrayerReminders();
        }
      } catch (error) {
        console.error('Error checking prayer reminders on app state change:', error);
      }
    }
  });
}

export function removeAppStateListener() {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}

