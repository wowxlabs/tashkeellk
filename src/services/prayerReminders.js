import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState } from 'react-native';
import axios from 'axios';
import { DateTime } from 'luxon';

const PRAYER_NAMES = {
  'Fajr': 'Fajr',
  'Dhuhr': 'Dhuhr',
  'Asr': 'Asr',
  'Maghrib': 'Maghrib',
  'Isha': 'Isha',
};

const PRAYER_API_URLS = {
  'uk': {
    url: 'https://www.tashkeel.lk/api/uk-prayer-times.json',
    timeZone: 'Europe/London',
  },
  'lk': {
    url: 'https://www.tashkeel.lk/api/srilanka-prayer-times.json',
    timeZone: 'Asia/Colombo',
  },
};

// Sound options for adhan notifications
const ADHAN_SOUND_OPTIONS = [
  { id: 'sound1', name: 'Adhan 1', filename: 'sound1.wav' },
  { id: 'sound2', name: 'Adhan 2', filename: 'sound2.wav' },
];

const STORAGE_KEYS = {
  PRAYER_REMINDERS_ENABLED: '@prayerReminders:enabled',
  LOCATION: '@prayerReminders:location',
  MINUTES_BEFORE: '@prayerReminders:minutesBefore',
  ADHAN_SOUND: '@prayerReminders:adhanSound',
};

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

// Fetch today's prayer times from API
export async function getTodayPrayerTimes() {
  try {
    const location = await getSelectedLocation();
    const config = PRAYER_API_URLS[location];
    if (!config) {
      throw new Error(`Unknown location: ${location}`);
    }

    const response = await axios.get(config.url);
    const entries = response.data || [];
    const now = DateTime.now().setZone(config.timeZone);
    const today = now.toFormat('yyyy-LL-dd');

    // Find today's prayer times
    // Use the same parsing method as HomeScreen for consistency
    const todayPrayers = {};
    entries.forEach((item) => {
      const prayerName = item.playlist ? item.playlist.charAt(0).toUpperCase() + item.playlist.slice(1) : null;
      if (prayerName && PRAYER_NAMES[prayerName]) {
        // Parse using DateTime.fromFormat same as HomeScreen
        const prayerDateTime = DateTime.fromFormat(
          `${item.start_date} ${item.start_time}`,
          'yyyy-LL-dd HHmm',
          { zone: config.timeZone }
        );

        if (prayerDateTime.isValid && item.start_date === today) {
          todayPrayers[prayerName] = prayerDateTime;
        }
      }
    });

    return todayPrayers;
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

    const soundUri = soundFilename
      ? Platform.OS === 'ios'
        ? soundFilename.replace('.wav', '.caf')
        : soundFilename
      : 'default';

    const notificationContent = {
      title: `${prayerName} Prayer Reminder`,
      body: `${prayerName} prayer is in ${minutesBefore} minute${minutesBefore !== 1 ? 's' : ''}`,
      sound: soundUri,
      data: {
        prayerName,
        prayerTime: prayerDateTime.toISO(),
        type: 'prayer_reminder',
      },
    };

    // Schedule notification
    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: {
        type: 'date',
        date: notificationTime.toJSDate(),
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

// Get prayer times for a specific date
async function getPrayerTimesForDate(targetDate, location) {
  try {
    const config = PRAYER_API_URLS[location];
    if (!config) {
      throw new Error(`Unknown location: ${location}`);
    }

    const response = await axios.get(config.url);
    const entries = response.data || [];
    const dateStr = targetDate.toFormat('yyyy-LL-dd');

    const prayers = {};
    entries.forEach((item) => {
      if (!item.playlist || item.start_date !== dateStr) return;
      
      // Normalize prayer name: capitalize first letter, handle variations
      const rawName = item.playlist.toLowerCase();
      let prayerName = null;
      
      // Map common variations to standard names
      if (rawName === 'fajr') prayerName = 'Fajr';
      else if (rawName === 'dhuhr' || rawName === 'zuhr' || rawName === 'dhur') prayerName = 'Dhuhr';
      else if (rawName === 'asr') prayerName = 'Asr';
      else if (rawName === 'maghrib') prayerName = 'Maghrib';
      else if (rawName === 'isha' || rawName === 'isha\'a') prayerName = 'Isha';
      else {
        // Fallback: capitalize first letter
        prayerName = item.playlist.charAt(0).toUpperCase() + item.playlist.slice(1).toLowerCase();
      }
      
      if (prayerName && PRAYER_NAMES[prayerName]) {
        const prayerDateTime = DateTime.fromFormat(
          `${item.start_date} ${item.start_time}`,
          'yyyy-LL-dd HHmm',
          { zone: config.timeZone }
        );

        if (prayerDateTime.isValid) {
          prayers[prayerName] = prayerDateTime;
          console.log(`📿 Found ${prayerName} prayer at ${prayerDateTime.toFormat('HH:mm')} for ${dateStr}`);
        } else {
          console.warn(`⚠️ Invalid date/time for ${prayerName}: ${item.start_date} ${item.start_time}`);
        }
      } else {
        console.log(`ℹ️ Skipping unknown prayer: ${item.playlist} (normalized: ${prayerName})`);
      }
    });

    return prayers;
  } catch (error) {
    console.error('Error fetching prayer times for date:', error);
    return {};
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
    const location = await getSelectedLocation();
    const config = PRAYER_API_URLS[location];
    const now = DateTime.now().setZone(config.timeZone);

    let scheduledCount = 0;
    const daysScheduled = new Set();
    
    // Schedule for today and tomorrow only
    for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
      const targetDate = now.plus({ days: dayOffset });
      const prayers = await getPrayerTimesForDate(targetDate, location);

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
    const location = await getSelectedLocation();
    const config = PRAYER_API_URLS[location];
    const now = DateTime.now().setZone(config.timeZone);
    const today = now.toFormat('yyyy-LL-dd');
    
    const scheduled = await getScheduledPrayerReminders();
    const todayReminders = scheduled.filter((notif) => {
      const prayerTime = DateTime.fromISO(notif.content?.data?.prayerTime);
      return prayerTime.isValid && prayerTime.toFormat('yyyy-LL-dd') === today;
    });

    const todayPrayers = await getPrayerTimesForDate(now, location);
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
    const location = await getSelectedLocation();
    const config = PRAYER_API_URLS[location];
    const now = DateTime.now().setZone(config.timeZone);
    
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
        const location = await getSelectedLocation();
        const config = PRAYER_API_URLS[location];
        const now = DateTime.now().setZone(config.timeZone);
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

