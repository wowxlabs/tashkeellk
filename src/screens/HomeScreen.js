import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, ScrollView, TouchableOpacity } from 'react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DateTime } from 'luxon';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import BannerAd from '../components/BannerAd';
import { getCalculationMethod } from '../services/prayerSettings';

const friendlyName = (playlist) =>
  playlist ? playlist.charAt(0).toUpperCase() + playlist.slice(1) : 'Next Prayer';

const formatCountdown = (diff) => {
  const totalSeconds = Math.max(Math.floor(diff.as('seconds')), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
};

const PrayerCard = ({ label, accent, data, loading, error }) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Prayer Times</Text>
        <Ionicons name="time" size={18} color="#d0f0e4" />
      </View>
      <View style={styles.locationRow}>
        <Text style={[styles.locationPill, styles.locationActive]}>{label}</Text>
      </View>
      {loading ? (
        <View style={styles.cardBody}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : error ? (
        <View style={styles.cardBody}>
          <Text style={styles.errorText}>Unable to load prayer times.</Text>
        </View>
      ) : (
        <>
          <View style={styles.cardBody}>
            <View style={[styles.iconContainer, { backgroundColor: '#fff' }]}>
              <Ionicons name="sunny" size={24} color={accent} />
            </View>
            <View style={styles.detailColumn}>
              <Text style={styles.nextLabel}>NEXT: {data?.name}</Text>
              <View style={styles.infoRow}>
                <Ionicons name="time" size={16} color="#d0f0e4" />
                <Text style={styles.infoText}>{data?.time}</Text>
              </View>
              <View style={[styles.infoRow, { marginTop: 4 }]}>
                <Ionicons name="calendar" size={16} color="#d0f0e4" />
                <Text style={styles.infoText}>{data?.dateLabel}</Text>
              </View>
            </View>
            <View style={[styles.countdownPill, { borderColor: accent }]}>
              <Text style={styles.countdownText}>{data?.countdownLabel}</Text>
            </View>
          </View>
          <View style={styles.scheduleList}>
            <Text style={styles.dayHeading}>{data?.dayLabel} Schedule</Text>
            {data?.daySchedule?.map((slot) => (
              <View key={`${slot.name}-${slot.time}`} style={styles.scheduleRow}>
                <Text style={styles.scheduleName}>{slot.name}</Text>
                <Text style={styles.scheduleTime}>{slot.time}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

const fetchPrayerData = async (url) => {
  const response = await axios.get(url);
  return response.data;
};

const extractLecturer = (description = '') => {
  const plain = description.replace(/\*\*/g, '');
  const match = plain.match(/Lecturer[^:–-]*[:–-]\s*(.+)/i);
  if (match && match[1]) {
    return match[1].split('\n')[0].trim();
  }
    const altMatch = plain.match(/By[:–-]\s*(.+)/i);
    if (altMatch && altMatch[1]) {
      return altMatch[1].split('\n')[0].trim();
    }
  return '';
};

const BayansStrip = ({ items, onSelect }) => (
  <View style={styles.bayansCard}>
    <View style={styles.bayansHeader}>
      <Text style={styles.bayansTitle}>Latest Bayans</Text>
      <Ionicons name="play-circle" size={20} color="#fff" />
    </View>
    {items.length === 0 ? (
      <Text style={styles.bayansEmpty}>No recent bayans available.</Text>
    ) : (
      items.map((bayan) => (
        <TouchableOpacity
          key={bayan.id}
          style={styles.bayanRow}
          onPress={() => onSelect(bayan)}
        >
          <Image source={{ uri: bayan.thumbnail }} style={styles.bayanThumb} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bayanTitle} numberOfLines={2}>
              {bayan.title}
            </Text>
            <Text style={styles.bayanDate}>
              By: {bayan.lecturer || extractLecturer(bayan.description) || 'Unknown'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#0F8D6B" />
        </TouchableOpacity>
      ))
    )}
  </View>
);

// Store a combined "City, Country (TimeZone)" label for the user's location
const LOCATION_NAME_STORAGE_KEY = 'USER_LOCATION_LABEL_V2';

const HomeScreen = () => {
  const [prayerState, setPrayerState] = useState({
    loading: true,
    data: null,
    error: null,
  });
  const [timeZoneId] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  const [latestBayans, setLatestBayans] = useState([]);
  const [calcMethod, setCalcMethod] = useState(null);
  const [locationName, setLocationName] = useState('Your Location');
  const navigation = useNavigation();

  useEffect(() => {
    const loadMethod = async () => {
      const method = await getCalculationMethod();
      setCalcMethod(method);
    };
    loadMethod();
  }, []);

  useEffect(() => {
    const loadCoordsAndCompute = async () => {
      try {
        let coords = null;
        const saved = await AsyncStorage.getItem('USER_LOCATION_COORDS');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.latitude && parsed?.longitude) {
            coords = parsed;
            console.log('Loaded saved USER_LOCATION_COORDS:', coords, 'TimeZone:', timeZoneId);
          }
        }

        // Fallback: if no saved coords (or invalid), try to get current location once here
        if (!coords) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setPrayerState({
              loading: false,
              data: null,
              error: true,
            });
            return;
          }
          const position = await Location.getCurrentPositionAsync({});
          coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          await AsyncStorage.setItem('USER_LOCATION_COORDS', JSON.stringify(coords));
          console.log('New USER_LOCATION_COORDS saved:', coords, 'TimeZone:', timeZoneId);
        }

        // Get location name from reverse geocoding
        try {
          const savedName = await AsyncStorage.getItem(LOCATION_NAME_STORAGE_KEY);
          if (savedName) {
            // Ensure timezone is included even for older saved values
            const nameWithZone = savedName.includes('(')
              ? savedName
              : `${savedName} (${timeZoneId})`;
            setLocationName(nameWithZone);
            if (nameWithZone !== savedName) {
              await AsyncStorage.setItem(LOCATION_NAME_STORAGE_KEY, nameWithZone);
            }
          } else {
            // Reverse geocode using Tashkeel's OpenStreetMap-based API
            try {
              const response = await axios.get(
                'https://api.tashkeel.lk/v1/geocoding/reverse',
                {
                  params: {
                    lat: coords.latitude,
                    lon: coords.longitude,
                  },
                  headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'TashkeelApp/1.0 (https://www.tashkeel.lk)',
                  },
                }
              );

              const geoData = response.data?.data;
              const addr = geoData?.address || {};

              // Prefer city-like fields from the API
              const cityPart =
                addr.city ||
                addr.town ||
                addr.village ||
                addr.suburb ||
                addr.neighbourhood ||
                addr.state ||
                '';
              const countryPart = addr.country || '';

              let baseName = 'Your Location';
              if (cityPart && countryPart) {
                baseName = `${cityPart}, ${countryPart}`;
              } else if (cityPart) {
                baseName = cityPart;
              } else if (countryPart) {
                baseName = countryPart;
              } else if (geoData?.displayName) {
                // As a very last resort, use the full display name
                baseName = geoData.displayName;
              }

              const nameWithZone = `${baseName} (${timeZoneId})`;

              console.log('Resolved location via API:', {
                coords,
                timeZoneId,
                address: addr,
                label: nameWithZone,
              });

              setLocationName(nameWithZone);
              await AsyncStorage.setItem(LOCATION_NAME_STORAGE_KEY, nameWithZone);
            } catch (apiError) {
              console.error('Error fetching location from Tashkeel geocoding API:', apiError?.message || apiError);
            }
          }
        } catch (geocodeError) {
          console.error('Error reverse geocoding:', geocodeError);
          // Keep default "Your Location" if geocoding fails
        }

        // Fetch prayer times from Tashkeel API using current coords and method
        const today = DateTime.now().setZone(timeZoneId);
        const apiDate = today.toFormat('yyyy-LL-dd');

        const prayerResp = await axios.get('https://api.tashkeel.lk/v1/prayertimes', {
          params: {
            lat: coords.latitude,
            lon: coords.longitude,
            date: apiDate,
            method: calcMethod || 'ISNA',
          },
          headers: {
            Accept: 'application/json',
          },
        });

        const times = prayerResp.data?.data?.times || {};

        // Build schedule using API times (local timezone)
        const labels = [
          { key: 'fajr', name: 'Fajr' },
          { key: 'dhuhr', name: 'Dhuhr' },
          { key: 'asr', name: 'Asr' },
          { key: 'maghrib', name: 'Maghrib' },
          { key: 'isha', name: 'Isha' },
        ];

        const schedule = labels
          .map(({ key, name }) => {
            const t = times[key];
            if (!t) return null;
            const [hourStr, minuteStr] = String(t).split(':');
            const hour = parseInt(hourStr, 10);
            const minute = parseInt(minuteStr, 10);
            if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

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

            return {
              name,
              time: dt.toFormat('h:mm a'),
              dateTime: dt,
            };
          })
          .filter(Boolean);

        const now = DateTime.now().setZone(timeZoneId);
        let next = schedule.find((slot) => slot.dateTime > now);

        if (!next && schedule.length > 0) {
          const tomorrow = now.plus({ days: 1 });
          const fajrToday = schedule.find((s) => s.name === 'Fajr') || schedule[0];
          const fajrTomorrow = fajrToday.dateTime.plus({ days: 1 }).set({
            year: tomorrow.year,
            month: tomorrow.month,
            day: tomorrow.day,
          });
          next = {
            ...fajrToday,
            dateTime: fajrTomorrow,
          };
        }

        if (!next) {
          setPrayerState({
            loading: false,
            data: null,
            error: true,
          });
          return;
        }

        const countdown = next.dateTime.diff(now, ['hours', 'minutes', 'seconds']);

        setPrayerState({
          loading: false,
          error: false,
          data: {
            name: next.name,
            time: next.dateTime.toFormat('h:mm a'),
            dateLabel: next.dateTime.toFormat('MMM dd'),
            countdownLabel: formatCountdown(countdown),
            countdown,
            nextDateTime: next.dateTime,
            daySchedule: schedule.map((slot) => ({
              name: slot.name,
              time: slot.dateTime.toFormat('h:mm a'),
            })),
            dayLabel: now.toFormat('EEEE'),
          },
        });
      } catch (e) {
        console.error('Error computing prayer times:', e);
        setPrayerState({
          loading: false,
          data: null,
          error: true,
        });
      }
    };

    if (!calcMethod) {
      return;
    }

    loadCoordsAndCompute();
  }, [calcMethod, timeZoneId]);

  useEffect(() => {
    axios
      .get('https://www.tashkeel.lk/api/videos.json')
      .then((response) => {
        const sorted = [...(response.data || [])].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        setLatestBayans(sorted.slice(0, 3));
      })
      .catch(() => setLatestBayans([]));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrayerState((prev) => {
        if (!prev?.data?.nextDateTime) {
          return prev;
        }
        const now = DateTime.now().setZone(timeZoneId);
        const countdown = prev.data.nextDateTime.diff(now, [
          'hours',
          'minutes',
          'seconds',
        ]);

        return {
          ...prev,
          data: {
            ...prev.data,
            countdownLabel: formatCountdown(countdown),
          },
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeZoneId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <PrayerCard
        label={locationName}
        accent="#0F8D6B"
        data={prayerState.data}
        loading={prayerState.loading}
        error={prayerState.error}
      />
      <BayansStrip
        items={latestBayans}
        onSelect={(item) => navigation.navigate('Bayans', { featuredVideo: item })}
      />
      <BannerAd />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECF7F3',
  },
  listContent: {
    padding: 16,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: '#d8f4ea',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#0F8D6B',
  },
  tabText: {
    color: '#0F8D6B',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#0F8D6B',
    borderRadius: 24,
    padding: 16,
    marginTop: 10,
    shadowColor: '#0f4d3a',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    borderWidth: 1,
    borderColor: '#1aa07d',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  locationRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  locationPill: {
    color: '#0F8D6B',
    backgroundColor: '#d8f4ea',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    fontWeight: '600',
  },
  locationActive: {
    backgroundColor: '#0B4733',
    color: '#fff',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#096c50',
    borderRadius: 18,
    padding: 14,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailColumn: {
    flex: 1,
    marginRight: 12,
  },
  nextLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  infoText: {
    color: '#d0f0e4',
    fontSize: 14,
  },
  dot: {
    color: '#d0f0e4',
  },
  countdownPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginLeft: 8,
    borderWidth: 2,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  scheduleList: {
    marginTop: 12,
    backgroundColor: '#07523d',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dayHeading: {
    color: '#dff4ec',
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  scheduleName: {
    color: '#fff',
    fontWeight: '600',
  },
  scheduleTime: {
    color: '#d0f0e4',
  },
  errorText: {
    color: '#fff',
  },
  bayansCard: {
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: '#0F8D6B',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#0f4d3a',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  bayansHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bayansTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bayansEmpty: {
    color: '#dff4ec',
    fontSize: 13,
  },
  bayanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    columnGap: 10,
  },
  bayanThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  bayanTitle: {
    color: '#0B4733',
    fontWeight: '600',
    fontSize: 14,
  },
  bayanDate: {
    color: '#4c6b5f',
    fontSize: 12,
    marginTop: 4,
  },
});

export default HomeScreen;

