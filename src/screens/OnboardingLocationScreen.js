import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const LOCATION_STORAGE_KEY = 'USER_LOCATION_COORDS';

const OnboardingLocationScreen = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUseLocation = async () => {
    try {
      setLoading(true);
      setError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission was denied. You can enable it later in your device settings.');
        setLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(coords));
      setLoading(false);
      if (onComplete) {
        onComplete();
      }
    } catch (e) {
      console.error('Error during location onboarding:', e);
      setError('Something went wrong while getting your location. Please try again.');
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <Ionicons name="location" size={32} color="#0F8D6B" />
        </View>
        <Text style={styles.title}>Set Your Location</Text>
        <Text style={styles.subtitle}>
          We use your location and time zone to calculate accurate prayer times for where you are.
        </Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryButton, loading && { opacity: 0.7 }]}
          onPress={handleUseLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Use My Current Location</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip} disabled={loading}>
          <Text style={styles.secondaryButtonText}>Skip for now</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          You can change calculation method anytime from Prayer Settings in the side menu.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECF7F3',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#0f4d3a',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e4f6f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0B4733',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#4c6b5f',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#b00020',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#0F8D6B',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0B4733',
    fontSize: 14,
  },
  footerNote: {
    marginTop: 8,
    fontSize: 12,
    color: '#6a8d80',
  },
});

export default OnboardingLocationScreen;



