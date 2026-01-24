import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import axios from 'axios';
import {
  getCalculationMethod,
  setCalculationMethod,
  DEFAULT_PRAYER_CALC_METHOD,
  getCalculationMethods,
  getTimezone,
  setTimezone,
  COMMON_TIMEZONES,
} from '../services/prayerSettings';

const PrayerSettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const [selectedMethod, setSelectedMethod] = useState(DEFAULT_PRAYER_CALC_METHOD);
  const [methods, setMethods] = useState([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [locationLabel, setLocationLabel] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationPostcode, setLocationPostcode] = useState('');
  const [refreshingLocation, setRefreshingLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState('UTC');
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [method, availableMethods, storedLocationLabel, storedCoords, timezone] = await Promise.all([
        getCalculationMethod(),
        getCalculationMethods(),
        AsyncStorage.getItem('USER_LOCATION_LABEL_V2'),
        AsyncStorage.getItem('USER_LOCATION_COORDS'),
        getTimezone(),
      ]);
      setSelectedMethod(method);
      setMethods(availableMethods);
      console.log('🕐 Loaded timezone in Prayer Settings:', timezone);
      setSelectedTimezone(timezone);
      if (storedLocationLabel) {
        setLocationLabel(storedLocationLabel);
      }

      // If we have coordinates, fetch full address details (road, postcode, etc.)
      try {
        if (storedCoords) {
          const parsed = JSON.parse(storedCoords);
          if (parsed?.latitude && parsed?.longitude) {
            const response = await axios.get('https://api.tashkeel.lk/v1/geocoding/reverse', {
              params: {
                lat: parsed.latitude,
                lon: parsed.longitude,
              },
              headers: {
                Accept: 'application/json',
                'User-Agent': 'TashkeelApp/1.0 (https://www.tashkeel.lk)',
              },
            });
            const geoData = response.data?.data;
            const addr = geoData?.address || {};
            const road = addr.road || '';
            const cityLike = addr.city || addr.town || addr.village || '';
            const state = addr.state || '';
            const postcode = addr.postcode || '';

            const addressLineParts = [road, cityLike, state].filter(Boolean);
            const addressLine = addressLineParts.join(', ');

            if (addressLine) {
              setLocationAddress(addressLine);
            }
            if (postcode) {
              setLocationPostcode(postcode);
            }
          }
        }
      } catch (e) {
        console.error('Error fetching location details for Prayer Settings:', e?.message || e);
      }

      setLoadingMethods(false);
    };
    load();
  }, []);

  const handleRefreshLocation = async () => {
    try {
      console.log('🧭 Re-detect location button pressed from Prayer Settings');
      setRefreshingLocation(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted for Prayer Settings refresh');
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      console.log('📍 New coordinates from device:', coords);

      await AsyncStorage.setItem('USER_LOCATION_COORDS', JSON.stringify(coords));

      // Fetch reverse geocoded details from Tashkeel API
      const response = await axios.get('https://api.tashkeel.lk/v1/geocoding/reverse', {
        params: {
          lat: coords.latitude,
          lon: coords.longitude,
        },
        headers: {
          Accept: 'application/json',
          'User-Agent': 'TashkeelApp/1.0 (https://www.tashkeel.lk)',
        },
      });

      const geoData = response.data?.data;
      const addr = geoData?.address || {};

      const cityLike = addr.city || addr.town || addr.village || '';
      const country = addr.country || '';
      const timeZoneId =
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      let labelBase = 'Your Location';
      if (cityLike && country) {
        labelBase = `${cityLike}, ${country}`;
      } else if (cityLike) {
        labelBase = cityLike;
      } else if (country) {
        labelBase = country;
      }
      const labelWithZone = `${labelBase} (${timeZoneId})`;

      setLocationLabel(labelWithZone);
      await AsyncStorage.setItem('USER_LOCATION_LABEL_V2', labelWithZone);

      const road = addr.road || '';
      const state = addr.state || '';
      const postcode = addr.postcode || '';
      const addressLineParts = [road, cityLike, state].filter(Boolean);
      const addressLine = addressLineParts.join(', ');

      setLocationAddress(addressLine);
      setLocationPostcode(postcode);
      console.log('📍 Updated location details:', {
        label: labelWithZone,
        addressLine,
        postcode,
      });
    } catch (e) {
      console.error('Error refreshing location in Prayer Settings:', e?.message || e);
    } finally {
      setRefreshingLocation(false);
    }
  };

  const handleSelect = async (id) => {
    if (id === selectedMethod || saving) return;
    setSaving(true);
    setSelectedMethod(id);
    await setCalculationMethod(id);
    setSaving(false);
  };

  const selectedLabel =
    methods.find((m) => m.id === selectedMethod)?.label || '';

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ padding: 16, paddingBottom: 16 + (Platform.OS === 'android' ? insets.bottom : 0) }}
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Prayer Time Calculation</Text>
        <Text style={styles.cardSubtitle}>
          Choose how prayer times are calculated for your location. These methods
          follow the rules from different organisations around the world.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Current method</Text>
          <Text style={styles.currentMethod}>{selectedLabel}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Timezone</Text>
          <TouchableOpacity
            style={styles.timezoneSelector}
            onPress={() => setShowTimezoneDropdown(!showTimezoneDropdown)}
          >
            <Text style={styles.timezoneDisplay}>
              {COMMON_TIMEZONES.find(tz => tz.id === selectedTimezone)?.label || selectedTimezone}
            </Text>
            <Ionicons
              name={showTimezoneDropdown ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#0B4733"
            />
          </TouchableOpacity>
          {showTimezoneDropdown && (
            <ScrollView 
              style={styles.timezoneDropdown}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {COMMON_TIMEZONES.map((tz) => {
                const isSelected = tz.id === selectedTimezone;
                return (
                  <TouchableOpacity
                    key={tz.id}
                    style={[styles.timezoneOption, isSelected && styles.timezoneOptionActive]}
                    onPress={async () => {
                      console.log('🕐 Timezone selected:', tz.id);
                      setSelectedTimezone(tz.id);
                      await setTimezone(tz.id);
                      console.log('🕐 Timezone saved to storage:', tz.id);
                      setShowTimezoneDropdown(false);
                    }}
                  >
                    <Text style={[styles.timezoneOptionText, isSelected && styles.timezoneOptionTextActive]}>
                      {tz.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#0F8D6B" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          <TouchableOpacity
            style={styles.deviceTimezoneButton}
            onPress={async () => {
              const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
              console.log('🕐 Device timezone selected:', deviceTz);
              setSelectedTimezone(deviceTz);
              await setTimezone(deviceTz);
              console.log('🕐 Device timezone saved to storage:', deviceTz);
              setShowTimezoneDropdown(false);
            }}
          >
            <Ionicons name="phone-portrait-outline" size={18} color="#0F8D6B" />
            <Text style={styles.deviceTimezoneButtonText}>Use Device Timezone</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.locationCard}>
          <View style={styles.locationIconWrapper}>
            <Ionicons name="location-outline" size={22} color="#0B4733" />
          </View>
          <View style={styles.locationTextWrapper}>
            <Text style={styles.locationTitle}>Current location</Text>
            <Text style={styles.locationDescription}>
              {locationLabel || 'We use your device location and time zone to calculate prayer times on the Home page.'}
            </Text>
            {!!locationAddress && (
              <Text style={styles.locationDescription}>
                {locationAddress}
              </Text>
            )}
            {!!locationPostcode && (
              <Text style={styles.locationDescription}>
                {locationPostcode}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.locationRefreshButton}
          onPress={handleRefreshLocation}
          disabled={refreshingLocation}
        >
          <Ionicons
            name="refresh"
            size={18}
            color="#0F8D6B"
          />
          <Text style={styles.locationRefreshText}>
            {refreshingLocation ? 'Updating location…' : 'Re-detect location'}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Select a method</Text>
        {loadingMethods && methods.length === 0 ? (
          <Text style={styles.loadingText}>Loading methods…</Text>
        ) : null}
        {methods.map((method) => {
          const active = method.id === selectedMethod;
          return (
            <TouchableOpacity
              key={method.id}
              style={[styles.methodRow, active && styles.methodRowActive]}
              onPress={() => handleSelect(method.id)}
            >
              <View style={styles.methodInfo}>
                <Text style={[styles.methodLabel, active && styles.methodLabelActive]}>
                  {method.label}
                </Text>
                <Text style={styles.methodId}>{method.id}</Text>
              </View>
              {active ? (
                <View style={styles.checkIconWrapper}>
                  <Ionicons name="checkmark-circle" size={22} color="#0F8D6B" />
                </View>
              ) : (
                <View style={styles.radioOuter}>
                  <View style={styles.radioInner} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {saving && (
          <Text style={styles.savingText}>Saving your selection…</Text>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color="#0F8D6B" />
          <Text style={styles.infoText}>
            Your selected method is used on the Home page when calculating prayer
            times with your current location and time zone.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECF7F3',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0f4d3a',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0B4733',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#4c6b5f',
    marginBottom: 16,
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4c6b5f',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  currentMethod: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0B4733',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#d6e9e1',
    marginVertical: 12,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  methodRowActive: {
    backgroundColor: '#e4f6f0',
  },
  methodInfo: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 15,
    color: '#0B4733',
    fontWeight: '500',
  },
  methodLabelActive: {
    fontWeight: '700',
  },
  methodId: {
    fontSize: 12,
    color: '#6a8d80',
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9bcfbd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  checkIconWrapper: {
    paddingLeft: 8,
  },
  savingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6a8d80',
  },
  loadingText: {
    marginTop: 4,
    fontSize: 13,
    color: '#6a8d80',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#e4f6f0',
    columnGap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#0B4733',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#e4f6f0',
  },
  locationIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#d0efe4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  locationTextWrapper: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0B4733',
    marginBottom: 2,
  },
  locationDescription: {
    fontSize: 13,
    color: '#4c6b5f',
  },
  locationRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#F5B400',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  locationRefreshText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#0B4733',
    fontWeight: '600',
  },
  timezoneSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#d6e9e1',
    marginTop: 8,
  },
  timezoneDisplay: {
    flex: 1,
    fontSize: 15,
    color: '#0B4733',
    fontWeight: '500',
  },
  timezoneDropdown: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d6e9e1',
    maxHeight: 300,
  },
  timezoneOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  timezoneOptionActive: {
    backgroundColor: '#e4f6f0',
  },
  timezoneOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#0B4733',
  },
  timezoneOptionTextActive: {
    fontWeight: '600',
  },
  deviceTimezoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#e4f6f0',
    borderWidth: 1,
    borderColor: '#0F8D6B',
  },
  deviceTimezoneButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#0B4733',
    fontWeight: '600',
  },
});

export default PrayerSettingsScreen;


