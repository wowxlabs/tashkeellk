import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import {
  getPrayerReminderToggles,
  setPrayerReminderToggles,
  getPrayerReminderMinutesBefore,
  setPrayerReminderMinutesBefore,
  getSelectedLocation,
  setSelectedLocation,
  getSelectedAdhanSoundId,
  setAdhanSound,
  getAdhanSoundOptions,
  schedulePrayerReminders,
  getScheduledPrayerReminders,
  getAdhanSoundFilename,
} from '../services/prayerReminders';
import * as Notifications from 'expo-notifications';
import { logPrayerReminderToggle, logPrayerLocationChange, logAdhanSoundChange } from '../services/analytics';

const BRAND_COLORS = {
  primary: '#0F8D6B',
  secondary: '#15A97A',
  accent: '#F5B400',
  background: '#ECF7F3',
  card: '#D1F0E4',
  textDark: '#0B4733',
  textLight: '#ffffff',
};

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const LOCATIONS = [
  { id: 'uk', label: 'UK (Slough)' },
  { id: 'lk', label: 'Sri Lanka (Colombo)' },
];
const MINUTES_OPTIONS = [0, 5, 10, 15, 20, 30];

// Static mapping for sound files (required for Metro bundler)
const SOUND_FILE_MAP = {
  sound1: require('../../assets/sounds/sound1.wav'),
  sound2: require('../../assets/sounds/sound2.wav'),
};

const PrayerRemindersScreen = () => {
  const [toggles, setToggles] = useState({
    Fajr: true,
    Dhuhr: true,
    Asr: true,
    Maghrib: true,
    Isha: true,
  });
  const [location, setLocation] = useState('uk');
  const [minutesBefore, setMinutesBefore] = useState(0);
  const [adhanSoundId, setAdhanSoundId] = useState('sound1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playingSoundId, setPlayingSoundId] = useState(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const soundRef = useRef(null);

  useEffect(() => {
    loadSettings();

    // Cleanup sound on unmount
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [loadedToggles, loadedLocation, loadedMinutes, loadedSound] = await Promise.all([
        getPrayerReminderToggles(),
        getSelectedLocation(),
        getPrayerReminderMinutesBefore(),
        getSelectedAdhanSoundId(),
      ]);

      setToggles(loadedToggles);
      setLocation(loadedLocation);
      setMinutesBefore(loadedMinutes);
      setAdhanSoundId(loadedSound);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChange = async (prayerName, value) => {
    const newToggles = { ...toggles, [prayerName]: value };
    setToggles(newToggles);
    await setPrayerReminderToggles(newToggles);
    await schedulePrayerReminders();
    logPrayerReminderToggle(prayerName, value);
  };

  const handleLocationChange = async (newLocation) => {
    setLocation(newLocation);
    await setSelectedLocation(newLocation);
    await schedulePrayerReminders();
    logPrayerLocationChange(newLocation);
  };

  const handleMinutesChange = async (minutes) => {
    setMinutesBefore(minutes);
    await setPrayerReminderMinutesBefore(minutes);
    await schedulePrayerReminders();
  };

  const handleSoundChange = async (soundId) => {
    setAdhanSoundId(soundId);
    await setAdhanSound(soundId);
    await schedulePrayerReminders();
    logAdhanSoundChange(soundId);
  };

  const handlePlaySound = async (soundId, soundFilename) => {
    try {
      // Stop currently playing sound
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (_e) {
          // Ignore errors when stopping
        }
        soundRef.current = null;
      }

      if (!soundFilename || soundId === 'default') {
        // No preview for default sound
        Alert.alert('Preview', 'Default sound has no preview available.');
        return;
      }

      // Get the sound file from static mapping
      const soundFileKey = soundFilename.replace('.wav', ''); // 'sound1.wav' -> 'sound1'
      const soundSource = SOUND_FILE_MAP[soundFileKey];
      
      if (!soundSource) {
        Alert.alert('Preview Unavailable', `Sound file not found: ${soundFilename}\n\nPlease add sound files to assets/sounds/ directory.`);
        return;
      }

      setPlayingSoundId(soundId);

      // Load and play the sound
      const { sound } = await Audio.Sound.createAsync(soundSource);

      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingSoundId(null);
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
      });

      await sound.playAsync();
    } catch (error) {
      console.error('Error playing sound:', error);
      setPlayingSoundId(null);
      Alert.alert('Error', `Could not play sound: ${soundFilename}`);
    }
  };

  const handleStopSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (_e) {
        // Ignore errors
      }
      soundRef.current = null;
      setPlayingSoundId(null);
    }
  };

  const handleTestNotification = async () => {
    try {
      setSaving(true);
      
      // Schedule a test notification for 5 seconds from now
      const testDate = new Date();
      testDate.setSeconds(testDate.getSeconds() + 5);
      
      // Get the selected sound
      const soundFilename = await getAdhanSoundFilename();
      const soundOptions = getAdhanSoundOptions();
      const selectedSound = soundOptions.find(s => s.id === adhanSoundId);
      
      // Prepare sound URI (same pattern as prayer reminders)
      const soundUri = soundFilename
        ? Platform.OS === 'ios'
          ? soundFilename.replace('.wav', '.caf')
          : soundFilename
        : 'default';
      
      console.log('🔊 Test notification sound config:', {
        soundFilename,
        soundUri,
        platform: Platform.OS,
      });
      
      // Ensure channel is set up with the correct sound (Android only) - like masjid app
      let testChannelId = 'prayer-reminders-default';
      if (Platform.OS === 'android') {
        const soundWithoutExt = soundFilename
          ? soundFilename.replace(/\.\w+$/, '')
          : 'default';
        testChannelId = `prayer-reminders-${soundWithoutExt}`;
        
        try {
          await Notifications.deleteNotificationChannelAsync(testChannelId);
          console.log(`🗑️ Deleted existing ${testChannelId} channel`);
        } catch (_e) {
          // Channel might not exist, ignore
        }
        await Notifications.setNotificationChannelAsync(testChannelId, {
          name: 'Prayer Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          enableVibrate: true,
          sound: soundWithoutExt === 'default' ? undefined : soundWithoutExt, // Without extension, like masjid app
          showBadge: false,
        });
        console.log(`✅ Test notification channel created: ${testChannelId} with sound: ${soundWithoutExt}`);
        
        // Small delay to ensure channel is fully created
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Prepare notification content (like masjid app)
      const notificationContent = {
        title: 'Test Prayer Reminder',
        body: `This is a test notification. Your selected sound is: ${selectedSound?.name || 'Adhan 1'}`,
        data: { type: 'test', prayerName: 'Test' },
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' && {
          color: '#ffffff', // White accent color for Android
        }),
      };

      // Set sound based on platform (like masjid app)
      if (Platform.OS === 'ios') {
        notificationContent.sound = soundUri; // iOS: Use filename with extension
      }
      // Android: Do NOT set sound in content – let the channel decide

      console.log('📦 Notification content before scheduling:', JSON.stringify(notificationContent, null, 2));

      // Schedule the test notification
      // In expo-notifications, channelId goes in the trigger (like masjid app)
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: {
          type: 'date',
          date: testDate,
          ...(Platform.OS === 'android' && { channelId: testChannelId }),
        },
      });

      setShowTestModal(true);
    } catch (error) {
      console.error('Error scheduling test notification:', error);
      Alert.alert('Error', 'Failed to schedule test notification. Please check notification permissions.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
      </View>
    );
  }

  const soundOptions = getAdhanSoundOptions();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Battery Info Section */}
      <View style={styles.batteryInfoSection}>
        <Ionicons name="battery-charging" size={20} color={BRAND_COLORS.textDark} />
        <View style={{ flex: 1 }}>
          <Text style={styles.batteryInfoTitle}>Battery optimisation</Text>
          <Text style={styles.batteryInfoText}>
            For on-time reminders, make sure background activity is allowed and battery optimisation is turned off
            for this app in your phone settings.
          </Text>
        </View>
      </View>

      {/* Prayer Toggles Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prayer Reminders</Text>
        <Text style={styles.sectionSubtitle}>Enable notifications for each prayer time</Text>

        {PRAYER_NAMES.map((prayerName) => (
          <View key={prayerName} style={styles.settingRow}>
            <Text style={styles.settingLabel}>{prayerName}</Text>
            <Switch
              value={toggles[prayerName] || false}
              onValueChange={(value) => handleToggleChange(prayerName, value)}
              trackColor={{ false: '#ccc', true: BRAND_COLORS.secondary }}
              thumbColor={toggles[prayerName] ? BRAND_COLORS.primary : '#f4f3f4'}
            />
          </View>
        ))}
      </View>

      {/* Location Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <Text style={styles.sectionSubtitle}>Select your location for accurate prayer times</Text>

        {LOCATIONS.map((loc) => (
          <TouchableOpacity
            key={loc.id}
            style={[
              styles.locationOption,
              location === loc.id && styles.locationOptionActive,
            ]}
            onPress={() => handleLocationChange(loc.id)}
          >
            <Text
              style={[
                styles.locationOptionText,
                location === loc.id && styles.locationOptionTextActive,
              ]}
            >
              {loc.label}
            </Text>
            {location === loc.id && (
              <Ionicons name="checkmark-circle" size={24} color={BRAND_COLORS.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Minutes Before Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Time</Text>
        <Text style={styles.sectionSubtitle}>
          {minutesBefore === 0 
            ? 'Notify on prayer time'
            : `Notify ${minutesBefore} minute${minutesBefore !== 1 ? 's' : ''} before prayer`}
        </Text>

        <View style={styles.minutesGrid}>
          {MINUTES_OPTIONS.map((minutes) => (
            <TouchableOpacity
              key={minutes}
              style={[
                styles.minuteOption,
                minutesBefore === minutes && styles.minuteOptionActive,
              ]}
              onPress={() => handleMinutesChange(minutes)}
            >
              <Text
                style={[
                  styles.minuteOptionText,
                  minutesBefore === minutes && styles.minuteOptionTextActive,
                ]}
              >
                {minutes === 0 ? 'On Time' : minutes}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Adhan Sound Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Sound</Text>
        <Text style={styles.sectionSubtitle}>Choose the adhan sound for notifications</Text>

        {soundOptions.map((sound) => (
          <View
            key={sound.id}
            style={[
              styles.soundOption,
              adhanSoundId === sound.id && styles.soundOptionActive,
            ]}
          >
            <TouchableOpacity
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              onPress={() => handleSoundChange(sound.id)}
            >
              <Text
                style={[
                  styles.soundOptionText,
                  adhanSoundId === sound.id && styles.soundOptionTextActive,
                ]}
              >
                {sound.name}
              </Text>
              {adhanSoundId === sound.id && (
                <Ionicons name="checkmark-circle" size={24} color={BRAND_COLORS.primary} />
              )}
            </TouchableOpacity>
            {sound.filename && (
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => {
                  if (playingSoundId === sound.id) {
                    handleStopSound();
                  } else {
                    handlePlaySound(sound.id, sound.filename);
                  }
                }}
              >
                {playingSoundId === sound.id ? (
                  <Ionicons name="stop-circle" size={24} color={BRAND_COLORS.accent} />
                ) : (
                  <Ionicons name="play-circle" size={24} color={BRAND_COLORS.secondary} />
                )}
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Ionicons name="information-circle" size={20} color={BRAND_COLORS.textDark} />
        <Text style={styles.infoText}>
          Prayer reminders are automatically updated daily. Make sure notification permissions are enabled.
        </Text>
      </View>

      {/* Test Button */}
      <TouchableOpacity
        style={styles.testButton}
        onPress={handleTestNotification}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color={BRAND_COLORS.textLight} />
        ) : (
          <>
            <Ionicons name="notifications-outline" size={20} color={BRAND_COLORS.textLight} />
            <Text style={styles.testButtonText}>Test Notification (5 seconds)</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Test Notification Success Modal */}
      <Modal
        visible={showTestModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="checkmark-circle" size={48} color={BRAND_COLORS.primary} style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Test Notification Scheduled</Text>
            <Text style={styles.modalMessage}>
              A test notification will appear in 5 seconds. Make sure your device is not on silent mode.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowTestModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.textDark,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: BRAND_COLORS.textDark,
    fontWeight: '500',
  },
  locationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    marginBottom: 8,
  },
  locationOptionActive: {
    backgroundColor: BRAND_COLORS.card,
    borderWidth: 2,
    borderColor: BRAND_COLORS.primary,
  },
  locationOptionText: {
    fontSize: 16,
    color: BRAND_COLORS.textDark,
  },
  locationOptionTextActive: {
    fontWeight: 'bold',
    color: BRAND_COLORS.primary,
  },
  minutesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  minuteOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    minWidth: 60,
    alignItems: 'center',
  },
  minuteOptionActive: {
    backgroundColor: BRAND_COLORS.primary,
  },
  minuteOptionText: {
    fontSize: 16,
    color: BRAND_COLORS.textDark,
    fontWeight: '500',
  },
  minuteOptionTextActive: {
    color: BRAND_COLORS.textLight,
  },
  soundOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    marginBottom: 8,
    gap: 8,
  },
  soundOptionActive: {
    backgroundColor: BRAND_COLORS.card,
    borderWidth: 2,
    borderColor: BRAND_COLORS.primary,
  },
  soundOptionText: {
    fontSize: 16,
    color: BRAND_COLORS.textDark,
  },
  soundOptionTextActive: {
    fontWeight: 'bold',
    color: BRAND_COLORS.primary,
  },
  playButton: {
    padding: 4,
    marginLeft: 8,
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: BRAND_COLORS.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: BRAND_COLORS.textDark,
    lineHeight: 18,
  },
  batteryInfoSection: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ffeeba',
  },
  batteryInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: BRAND_COLORS.textDark,
    marginBottom: 4,
  },
  batteryInfoText: {
    fontSize: 13,
    color: BRAND_COLORS.textDark,
    lineHeight: 18,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLORS.primary,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  testButtonText: {
    color: BRAND_COLORS.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND_COLORS.textDark,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: BRAND_COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  modalButtonText: {
    color: BRAND_COLORS.textLight,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default PrayerRemindersScreen;

