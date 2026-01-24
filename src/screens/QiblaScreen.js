import React, { useEffect, useState, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

// Mecca coordinates (Kaaba)
const MECCA_LAT = 21.4225;
const MECCA_LON = 39.8262;

// Calculate bearing from current location to Mecca
function calculateQiblaBearing(lat, lon) {
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const lat2 = (MECCA_LAT * Math.PI) / 180;
  const lon2 = (MECCA_LON * Math.PI) / 180;

  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360;

  return bearing;
}

// Calculate distance to Mecca in kilometers
function calculateDistance(lat, lon) {
  const R = 6371; // Earth's radius in km
  const dLat = ((MECCA_LAT - lat) * Math.PI) / 180;
  const dLon = ((MECCA_LON - lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat * Math.PI) / 180) *
      Math.cos((MECCA_LAT * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Normalize angle into 0–360
function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

// Format coordinates with hemisphere
function formatCoord(value, positiveSuffix, negativeSuffix) {
  const suffix = value >= 0 ? positiveSuffix : negativeSuffix;
  return `${Math.abs(value).toFixed(4)}°${suffix}`;
}

const BRAND_COLORS = {
  primary: '#0F8D6B',
  secondary: '#15A97A',
  accent: '#F5B400',
  background: '#ECF7F3',
  textDark: '#0B4733',
};

import { logQiblaOpen } from '../services/analytics';
import BannerAd from '../components/BannerAd';

export default function QiblaScreen() {
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState(null);
  const [heading, setHeading] = useState(0);
  const [qiblaBearing, setQiblaBearing] = useState(null);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const navigation = useNavigation();

  // Animated values for smooth rotation
  const needleRotationAnim = useRef(new Animated.Value(0)).current;
  const northRotationAnim = useRef(new Animated.Value(0)).current;

  // Keep track of continuous rotation values (to avoid snapping)
  const needleRotationRef = useRef(0);
  const northRotationRef = useRef(0);
  
  // Track previous heading for vibration feedback
  const previousHeadingRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({
      title: 'Qibla Finder',
      headerTitleAlign: 'center',
      headerTitleStyle: { fontSize: 18, fontWeight: '600' },
    });
  }, [navigation]);

  // Log when Qibla screen is opened and track focus state
  useFocusEffect(
    React.useCallback(() => {
      logQiblaOpen();
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
      };
    }, [])
  );

  // Refresh location every time the screen opens (focused)
  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;

      const refreshLocation = async () => {
        try {
          setLoading(true);
          setError(null);

          const existingPerm = await Location.getForegroundPermissionsAsync();
          let status = existingPerm?.status;
          if (status !== 'granted') {
            const requested = await Location.requestForegroundPermissionsAsync();
            status = requested?.status;
          }

          if (status !== 'granted') {
            if (!cancelled) {
              setPermissionGranted(false);
              setError('Location permission is required to find Qibla direction.');
              setLoading(false);
            }
            return;
          }

          if (!cancelled) {
            setPermissionGranted(true);
          }

          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
          });

          if (cancelled) return;

          setLocation(currentLocation);

          const bearing = calculateQiblaBearing(
            currentLocation.coords.latitude,
            currentLocation.coords.longitude
          );
          setQiblaBearing(bearing);

          const dist = calculateDistance(
            currentLocation.coords.latitude,
            currentLocation.coords.longitude
          );
          setDistance(dist);

          setLoading(false);
        } catch (err) {
          console.error('Error getting location:', err);
          if (!cancelled) {
            setError('Failed to get your location. Please ensure location services are enabled.');
            setLoading(false);
          }
        }
      };

      refreshLocation();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  // Subscribe to compass heading
  useEffect(() => {
    if (!permissionGranted) return;

    let headingSubscription = null;
    let magnetometerSubscription = null;

    const startCompass = async () => {
      try {
        // Try Location API heading
        headingSubscription = await Location.watchHeadingAsync((data) => {
          if (data.trueHeading >= 0) {
            setHeading(normalizeAngle(data.trueHeading));
          } else if (data.magHeading >= 0) {
            setHeading(normalizeAngle(data.magHeading));
          }
        });
      } catch (error) {
        console.log('Location heading not available, using magnetometer');

        // Fallback to magnetometer
        try {
          const isAvailable = await Magnetometer.isAvailableAsync();
          if (!isAvailable) {
            console.warn('Magnetometer not available');
            return;
          }

          Magnetometer.setUpdateInterval(16);
          magnetometerSubscription = Magnetometer.addListener((data) => {
            let newHeading = (Math.atan2(data.y, data.x) * 180) / Math.PI;
            newHeading = normalizeAngle(newHeading);
            setHeading(newHeading);
          });
        } catch (magError) {
          console.error('Magnetometer error:', magError);
        }
      }
    };

    startCompass();

    return () => {
      if (headingSubscription) {
        headingSubscription.remove();
      }
      if (magnetometerSubscription) {
        magnetometerSubscription.remove();
      }
    };
  }, [permissionGranted]);

  // Generic rotation animator (shortest path)
  const animateRotation = (anim, ref, targetAngle) => {
    const current = ref.current;
    const currentMod = normalizeAngle(current);

    let delta = targetAngle - currentMod;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    const next = current + delta;
    ref.current = next;

    Animated.timing(anim, {
      toValue: next,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  // Animate Qibla needle when heading or bearing changes
  useEffect(() => {
    if (qiblaBearing === null) return;

    const relative = normalizeAngle(qiblaBearing - heading);
    animateRotation(needleRotationAnim, needleRotationRef, relative);
  }, [qiblaBearing, heading]);

  // Animate north indicator (optional, subtle)
  useEffect(() => {
    const target = normalizeAngle(-heading); // rotate opposite so top is North
    animateRotation(northRotationAnim, northRotationRef, target);
  }, [heading]);

  // Vibration feedback when device moves (only when screen is focused)
  useEffect(() => {
    // Only trigger vibrations when screen is focused
    if (!isScreenFocused) {
      return;
    }

    if (previousHeadingRef.current === null || qiblaBearing === null) {
      previousHeadingRef.current = heading;
      return;
    }

    // Calculate the minimum angle difference (accounting for 360° wrap)
    let angleDiff = Math.abs(heading - previousHeadingRef.current);
    if (angleDiff > 180) {
      angleDiff = 360 - angleDiff;
    }

    // Calculate alignment
    let relativeAngle = normalizeAngle(qiblaBearing - heading);
    if (relativeAngle > 180) {
      relativeAngle = relativeAngle - 360;
    }
    const absRelativeAngle = Math.abs(relativeAngle);
    const isAligned = absRelativeAngle < 1;

    // Check if we just became aligned
    const prevRelativeAngle = normalizeAngle(qiblaBearing - previousHeadingRef.current);
    let prevAbsRelativeAngle = Math.abs(prevRelativeAngle);
    if (prevRelativeAngle > 180) {
      prevAbsRelativeAngle = Math.abs(prevRelativeAngle - 360);
    }
    const wasAligned = prevAbsRelativeAngle < 1;
    const justAligned = !wasAligned && isAligned;

    // Trigger vibration when heading changes by 1 degree or more
    if (angleDiff >= 1) {
      if (justAligned) {
        // Distinctive vibration pattern when aligned
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, 100);
      } else {
        // Light vibration for movement
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      previousHeadingRef.current = heading;
    }
  }, [heading, qiblaBearing, isScreenFocused]);

  const needleRotationInterpolated = needleRotationAnim.interpolate({
    inputRange: [-720, 720],
    outputRange: ['-720deg', '720deg'],
  });

  const northRotationInterpolated = northRotationAnim.interpolate({
    inputRange: [-720, 720],
    outputRange: ['-720deg', '720deg'],
  });

  // Format distance
  const formatDistance = (dist) => {
    if (dist < 1) {
      return `${Math.round(dist * 1000)} m`;
    } else if (dist < 1000) {
      return `${dist.toFixed(1)} km`;
    } else {
      return `${(dist / 1000).toFixed(0)}k km`;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
          <Text style={styles.loadingText}>Finding your location...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="location-outline" size={64} color="#cbd5e1" />
          <Text style={styles.errorTitle}>Location Access Required</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  const lat = location?.coords.latitude ?? 0;
  const lon = location?.coords.longitude ?? 0;

  // Calculate relative angle between device heading and Qibla direction
  const getAlignmentInfo = () => {
    if (qiblaBearing === null) return null;
    
    let relativeAngle = normalizeAngle(qiblaBearing - heading);
    
    // Convert to -180 to 180 range for easier interpretation
    if (relativeAngle > 180) {
      relativeAngle = relativeAngle - 360;
    }
    
    const absAngle = Math.abs(relativeAngle);
    const isAligned = absAngle < 1; // Consider aligned if within 1 degree
    
    let direction = '';
    if (isAligned) {
      direction = 'Aligned!';
    } else if (relativeAngle > 0) {
      direction = 'Turn Right';
    } else {
      direction = 'Turn Left';
    }
    
    return {
      relativeAngle: absAngle,
      direction,
      isAligned,
      rawAngle: relativeAngle,
    };
  };

  const alignmentInfo = getAlignmentInfo();

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ paddingBottom: 32 + (Platform.OS === 'android' ? insets.bottom : 0) }}
    >
      {/* Verification Info Card */}
      <View style={styles.verificationInfoSection}>
        <Ionicons name="checkmark-circle" size={20} color={BRAND_COLORS.textDark} />
        <View style={{ flex: 1 }}>
          <Text style={styles.verificationInfoTitle}>Verify Qibla Direction</Text>
          <Text style={styles.verificationInfoText}>
            Please verify the Qibla direction shown here with another reliable app to ensure accuracy.
          </Text>
        </View>
      </View>

      {/* Info card */}
      <View style={styles.infoTopCard}>
        <View style={[styles.infoTopRow, styles.deviceHeadingRow]}>
          <Text style={[styles.infoTopLabel, styles.deviceHeadingLabel]}>Your Location</Text>
          <Text style={[styles.infoTopValue, styles.deviceHeadingHighlight]}>
            {formatCoord(lat, 'N', 'S')}, {formatCoord(lon, 'E', 'W')}
          </Text>
        </View>
        <View style={[styles.infoTopRow, styles.deviceHeadingRow]}>
          <Text style={[styles.infoTopLabel, styles.deviceHeadingLabel]}>Qibla Direction</Text>
          <Text style={[styles.infoTopValue, styles.deviceHeadingHighlight]}>
            {qiblaBearing?.toFixed(1)}°
          </Text>
        </View>
        <View style={[styles.infoTopRow, styles.deviceHeadingRow]}>
          <Text style={[styles.infoTopLabel, styles.deviceHeadingLabel]}>Device Heading</Text>
          <Text style={[styles.infoTopValue, styles.deviceHeadingHighlight]}>{heading.toFixed(1)}°</Text>
        </View>
        {distance !== null && (
          <View style={[styles.infoTopRow, styles.deviceHeadingRow]}>
            <Text style={[styles.infoTopLabel, styles.deviceHeadingLabel]}>Distance to Mecca</Text>
            <Text style={[styles.infoTopValue, styles.deviceHeadingHighlight]}>
              {formatDistance(distance)}
            </Text>
          </View>
        )}
      </View>

      {/* Alignment Guidance Card */}
      {alignmentInfo && (
        <View style={[
          styles.alignmentCard,
          alignmentInfo.isAligned && styles.alignmentCardSuccess
        ]}>
          <View style={styles.alignmentContent}>
            <View style={styles.alignmentHeader}>
              <Ionicons 
                name={alignmentInfo.isAligned ? "checkmark-circle" : "arrow-forward-circle"} 
                size={24} 
                color={alignmentInfo.isAligned ? BRAND_COLORS.primary : BRAND_COLORS.accent} 
              />
              <Text style={[
                styles.alignmentTitle,
                alignmentInfo.isAligned && styles.alignmentTitleSuccess
              ]}>
                {alignmentInfo.isAligned ? 'Aligned with Qibla!' : 'Align Your Device'}
              </Text>
            </View>
            {!alignmentInfo.isAligned && (
              <View style={styles.alignmentInstructions}>
                <Text style={styles.alignmentDirection}>
                  {alignmentInfo.direction}
                </Text>
                <Text style={styles.alignmentAngle}>
                  {alignmentInfo.relativeAngle.toFixed(1)}° to align
                </Text>
                <Text style={styles.alignmentHint}>
                  Rotate your device until the orange needle points straight up
                </Text>
              </View>
            )}
            {alignmentInfo.isAligned && (
              <Text style={styles.alignmentSuccessText}>
                You are now facing the Qibla direction. The orange needle should be pointing straight up.
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Compass Container */}
      <View style={styles.compassCard}>
        <View style={styles.compassOuter}>
          {/* Background circle (gradient) */}
          <LinearGradient
            colors={['#e0f2f1', '#ccfbf1']}
            style={styles.compassBgCircle}
          >
            {/* Degree markers every 30° */}
            {Array.from({ length: 12 }).map((_, idx) => {
              const degree = idx * 30;
              const isMajor = degree % 90 === 0;
              const isZero = degree === 0; // 0° marker aligns with "Point Here"
              return (
                <View
                  key={degree}
                  style={[
                    styles.markerContainer,
                    {
                      transform: [
                        { translateX: -0.5 },
                        { translateY: -0.5 },
                        { rotate: `${degree}deg` },
                        { translateY: isMajor ? -140 : -135 }, // radius
                      ],
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.marker,
                      isMajor ? styles.markerMajor : styles.markerMinor,
                      isZero && styles.markerZero, // Highlight 0° marker
                    ]}
                  />
                </View>
              );
            })}
          </LinearGradient>

          {/* Point Here label at 12 o'clock */}
          <View style={styles.pointHereLabel}>
            <Text style={styles.pointHereText}>Point Here</Text>
          </View>

          {/* Center circle */}
          <View style={styles.centerLayer}>
            <View style={styles.centerCircle} />
          </View>

          {/* Optional north indicator ring (subtle rotation) */}
          <Animated.View
            style={[
              styles.northRingLayer,
              {
                transform: [{ rotate: northRotationInterpolated }],
              },
            ]}
          />

          {/* Animated Qibla needle */}
          {qiblaBearing !== null && (
            <Animated.View
              style={[
                styles.needleLayer,
                {
                  transform: [{ rotate: needleRotationInterpolated }],
                },
              ]}
              pointerEvents="none"
            >
              <View style={styles.needleWrapper}>
                {/* Front pointer (towards Qibla) */}
                <View style={styles.needleFront}>
                  <View style={styles.qiblaIconAtTip}>
                    <Text style={styles.kaabaEmoji}>🕋</Text>
                  </View>
                </View>
                {/* Back pointer (opposite direction) */}
                <View style={styles.needleBack} />
                {/* Center pivot */}
                <View style={styles.needlePivot} />
              </View>
            </Animated.View>
          )}
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsCard}>
        <LinearGradient
          colors={['#f0fdf9', '#e0f2f1']}
          style={styles.instructionsGradient}
        >
          <View style={styles.instructionsHeader}>
            <Text style={styles.instructionsTitle}>How to Find Qibla</Text>
          </View>
          <View style={styles.instructionsList}>
            <View style={styles.instructionsItem}>
              <View style={styles.instructionsNumber}>
                <Text style={styles.instructionsNumberText}>1</Text>
              </View>
              <View style={styles.instructionsContent}>
                <Text style={styles.instructionsText}>
                  Hold your device flat and parallel to the ground.
                </Text>
              </View>
            </View>
            <View style={styles.instructionsItem}>
              <View style={styles.instructionsNumber}>
                <Text style={styles.instructionsNumberText}>2</Text>
              </View>
              <View style={styles.instructionsContent}>
                <Text style={styles.instructionsText}>
                  Look at the orange needle - it points toward the Qibla direction.
                </Text>
              </View>
            </View>
            <View style={styles.instructionsItem}>
              <View style={styles.instructionsNumber}>
                <Text style={styles.instructionsNumberText}>3</Text>
              </View>
              <View style={styles.instructionsContent}>
                <Text style={styles.instructionsText}>
                  Rotate your body until the orange needle points straight ahead (toward the top of your device).
                </Text>
              </View>
            </View>
            <View style={styles.instructionsItem}>
              <View style={styles.instructionsNumber}>
                <Text style={styles.instructionsNumberText}>4</Text>
              </View>
              <View style={styles.instructionsContent}>
                <Text style={styles.instructionsText}>
                  You are now facing the Qibla direction.
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
      
      <BannerAd />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    color: '#64748b',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoTopCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  infoTopLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  infoTopValue: {
    fontSize: 12,
    color: '#0f172a',
  },
  deviceHeadingRow: {
    backgroundColor: '#f0fdf9',
    padding: 10,
    borderRadius: 12,
    marginVertical: 4,
    borderWidth: 2,
    borderColor: '#0f766e',
  },
  deviceHeadingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f766e',
  },
  deviceHeadingHighlight: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f766e',
  },
  compassCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    marginBottom: 16,
  },
  compassOuter: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  compassBgCircle: {
    position: 'absolute',
    inset: 0,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  markerContainer: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    borderRadius: 9999,
  },
  markerMajor: {
    width: 4,
    height: 24,
    backgroundColor: '#0f766e',
  },
  markerMinor: {
    width: 2,
    height: 16,
    backgroundColor: '#14b8a6',
  },
  markerZero: {
    width: 4,
    height: 30,
    backgroundColor: BRAND_COLORS.primary,
    shadowColor: BRAND_COLORS.primary,
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  centerLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  centerCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#a5f3fc',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  northRingLayer: {
    position: 'absolute',
    inset: 0,
    borderRadius: 9999,
  },
  needleLayer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 24,
    height: 200,
    marginTop: -100,
    marginLeft: -12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  needleWrapper: {
    width: 24,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  needleFront: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 100,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  qiblaIconAtTip: {
    position: 'absolute',
    top: -28,
    left: -20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  kaabaEmoji: {
    fontSize: 24,
  },
  needleBack: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 100,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fed7aa',
  },
  needlePivot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 16,
    height: 16,
    marginTop: -8,
    marginLeft: -8,
    borderRadius: 8,
    backgroundColor: '#b45309',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    zIndex: 10,
  },
  instructionsCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  instructionsGradient: {
    padding: 20,
  },
  instructionsHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f766e',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  instructionsList: {
    gap: 16,
  },
  instructionsItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexShrink: 1,
  },
  instructionsNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#0f766e',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  instructionsNumberText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },
  instructionsContent: {
    flex: 1,
    paddingTop: 2,
    flexShrink: 1,
  },
  instructionsText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
    fontWeight: '500',
    flexWrap: 'wrap',
  },
  verificationInfoSection: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ffeeba',
  },
  verificationInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: BRAND_COLORS.textDark,
    marginBottom: 4,
  },
  verificationInfoText: {
    fontSize: 13,
    color: BRAND_COLORS.textDark,
    lineHeight: 18,
  },
  alignmentCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: BRAND_COLORS.accent,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  alignmentCardSuccess: {
    backgroundColor: '#f0fdf9',
    borderColor: BRAND_COLORS.primary,
  },
  alignmentContent: {
    gap: 12,
  },
  alignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alignmentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND_COLORS.accent,
  },
  alignmentTitleSuccess: {
    color: BRAND_COLORS.primary,
  },
  alignmentInstructions: {
    gap: 8,
  },
  alignmentDirection: {
    fontSize: 24,
    fontWeight: '800',
    color: BRAND_COLORS.accent,
    textAlign: 'center',
  },
  alignmentAngle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  alignmentHint: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  alignmentSuccessText: {
    fontSize: 14,
    color: BRAND_COLORS.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  pointHereLabel: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -40 },
      { translateY: -180 }, // Position above the 0° marker (marker at -140px, label above it)
    ],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 21,
  },
  pointHereText: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND_COLORS.primary,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});

