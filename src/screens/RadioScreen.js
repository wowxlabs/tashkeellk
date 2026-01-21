//import React, { useState, useEffect, useCallback, useRef } from 'react';
//import { View, TouchableOpacity, Text, StyleSheet, Animated, Easing } from 'react-native';
//import { Audio } from 'expo-av';
//import { Ionicons } from '@expo/vector-icons';
//import { useFocusEffect } from '@react-navigation/native';
//import { startForegroundService } from './ForegroundService';
//import { useNavigation } from '@react-navigation/native';
//
//const RADIO_STREAM_URL = 'https://radio.tashkeel.lk:8000/radio.mp3';
//
//// Define Rainbow Colors 🌈
//const RAINBOW_COLORS = [
//  "rgba(255, 100, 100, 0.6)",  // Soft Red
//  "rgba(255, 180, 80, 0.6)",   // Soft Orange
//  "rgba(255, 255, 150, 0.6)",  // Soft Yellow
//  "rgba(180, 255, 180, 0.6)",  // Soft Green
//  "rgba(150, 200, 255, 0.6)",  // Soft Blue
//  "rgba(200, 150, 255, 0.6)",  // Soft Indigo
//  "rgba(255, 150, 200, 0.6)"   // Soft Violet
//];
//
//const RadioScreen = () => {
//  const [sound, setSound] = useState(null);
//  const [isPlaying, setIsPlaying] = useState(false);
//  const navigation = useNavigation();
//
//  useEffect(() => {
//    navigation.setOptions({
//      title: 'Radio',
//      headerTitleAlign: 'center',
//      headerTitleStyle: { fontSize: 24, fontWeight: 'bold' },
//    });
//  }, [navigation]);
//
//  // Animated values for equalizer bars
//  const equalizerBars = useRef([
//    new Animated.Value(10),
//    new Animated.Value(20),
//    new Animated.Value(15),
//    new Animated.Value(30),
//    new Animated.Value(25),
//  ]).current;
//
//  const equalizerAnimations = useRef([]).current;
//
//  const startEqualizerAnimation = () => {
//    equalizerAnimations.forEach(animation => animation.stop());
//    equalizerAnimations.length = 0;
//
//    equalizerBars.forEach((bar) => {
//      const animation = Animated.loop(
//        Animated.sequence([
//          Animated.timing(bar, {
//            toValue: Math.random() * 50 + 20,
//            duration: Math.random() * 400 + 300,
//            easing: Easing.linear,
//            useNativeDriver: false
//          }),
//          Animated.timing(bar, {
//            toValue: Math.random() * 30 + 10,
//            duration: Math.random() * 400 + 300,
//            easing: Easing.linear,
//            useNativeDriver: false
//          })
//        ])
//      );
//      equalizerAnimations.push(animation);
//      animation.start();
//    });
//  };
//
//  const stopEqualizerAnimation = () => {
//    equalizerAnimations.forEach(animation => animation.stop());
//    equalizerBars.forEach(bar => {
//      Animated.timing(bar, {
//        toValue: 10,
//        duration: 300,
//        useNativeDriver: false
//      }).start();
//    });
//    equalizerAnimations.length = 0;
//  };
//
//  const playRadio = async () => {
//    try {
//      if (!sound) {
//        await startForegroundService();
//        const { sound: newSound } = await Audio.Sound.createAsync(
//          { uri: RADIO_STREAM_URL },
//          { shouldPlay: true }
//        );
//        setSound(newSound);
//        setIsPlaying(true);
//        startEqualizerAnimation();
//      } else {
//        await sound.playAsync();
//        setIsPlaying(true);
//        startEqualizerAnimation();
//      }
//    } catch (error) {
//      console.error('Error playing radio:', error);
//    }
//  };
//
//  const pauseRadio = async () => {
//    try {
//      if (sound) {
//        await sound.pauseAsync();
//        setIsPlaying(false);
//        stopEqualizerAnimation();
//      }
//    } catch (error) {
//      console.error('Error pausing radio:', error);
//    }
//  };
//
//  const stopRadio = async () => {
//    try {
//      if (sound) {
//        await sound.stopAsync();
//        await sound.unloadAsync();
//        setSound(null);
//        setIsPlaying(false);
//        stopEqualizerAnimation();
//      }
//    } catch (error) {
//      console.error('Error stopping radio:', error);
//    }
//  };
//
//  useFocusEffect(
//    useCallback(() => {
//      return () => {
//        stopRadio();
//      };
//    }, [sound])
//  );
//
//  return (
//    <View style={styles.container}>
//      <Text style={styles.title}>Tashkeel Radio</Text>
//      <Text style={styles.description}>Your gateway to soulful music and enlightening talks 🎙️</Text>
//
//      {/* Animated Equalizer */}
//      <View style={styles.equalizerContainer}>
//        {equalizerBars.map((bar, index) => (
//          <Animated.View
//            key={index}
//            style={[
//              styles.equalizerBar,
//              { height: bar, backgroundColor: RAINBOW_COLORS[index % RAINBOW_COLORS.length] }
//            ]}
//          />
//        ))}
//      </View>
//
//      {/* Status Indicator */}
//      <Text style={[styles.status, { color: isPlaying ? "#28a745" : "#dc3545" }]}>
//        {isPlaying ? "Playing 🎵" : "Paused"}
//      </Text>
//
//      {/* Controls Box */}
//      <View style={styles.controlsBox}>
//        <TouchableOpacity onPress={playRadio} style={styles.button}>
//          <Ionicons name="play" size={40} color={isPlaying ? "#ccc" : "#28a745"} />
//        </TouchableOpacity>
//
//        <TouchableOpacity onPress={pauseRadio} style={styles.button}>
//          <Ionicons name="pause" size={40} color={isPlaying ? "#dc3545" : "#ccc"} />
//        </TouchableOpacity>
//
//        <TouchableOpacity onPress={stopRadio} style={styles.button}>
//          <Ionicons name="stop" size={40} color="#ff6b6b" />
//        </TouchableOpacity>
//      </View>
//    </View>
//  );
//};
//
//const styles = StyleSheet.create({
//  container: {
//    flex: 1,
//    backgroundColor: '#fff',
//    justifyContent: 'center',
//    alignItems: 'center',
//    paddingHorizontal: 20,
//  },
//  title: {
//    fontSize: 28,
//    fontWeight: 'bold',
//    color: '#333',
//    marginBottom: 5,
//    textTransform: 'uppercase',
//    letterSpacing: 1,
//  },
//  description: {
//    fontSize: 16,
//    color: '#666',
//    marginBottom: 20,
//    textAlign: 'center',
//  },
//  equalizerContainer: {
//    flexDirection: 'row',
//    justifyContent: 'center',
//    alignItems: 'flex-end',
//    height: 60,
//    marginBottom: 20,
//  },
//  equalizerBar: {
//    width: 10,
//    marginHorizontal: 4,
//    borderRadius: 5,
//  },
//  status: {
//    fontSize: 20,
//    fontWeight: '600',
//    marginBottom: 20,
//  },
//  controlsBox: {
//    flexDirection: 'row',
//    backgroundColor: '#f9f9f9',
//    paddingVertical: 15,
//    paddingHorizontal: 30,
//    borderRadius: 15,
//    elevation: 3,
//    shadowColor: '#000',
//    shadowOffset: { width: 0, height: 2 },
//    shadowOpacity: 0.2,
//    shadowRadius: 4,
//  },
//  button: {
//    marginHorizontal: 15,
//  },
//});
//
//export default RadioScreen;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Easing, ImageBackground, ScrollView, AppState, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { startForegroundService } from './ForegroundService';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { logRadioPlay, logRadioStop } from '../services/analytics';
import BannerAd from '../components/BannerAd';

const RADIO_STREAM_URL = 'https://radio.tashkeel.lk:8000/radio.mp3';
const NOW_PLAYING_API = 'https://radio.tashkeel.lk/api/station/2/nowplaying';
const BRAND_COLORS = {
  primary: '#0F8D6B',
  secondary: '#15A97A',
  accent: '#F5B400',
  background: '#ECF7F3',
  textDark: '#0B4733',
};

// MarqueeText component for scrolling long text
const MarqueeText = ({ text, style }) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const textWidthRef = useRef(0);
  const containerWidthRef = useRef(0);
  const [needsScroll, setNeedsScroll] = useState(false);
  const animationRef = useRef(null);

  useEffect(() => {
    if (textWidthRef.current > containerWidthRef.current && containerWidthRef.current > 0) {
      setNeedsScroll(true);
      // Reset position
      scrollX.setValue(0);
      
      // Start marquee animation
      const scrollDistance = textWidthRef.current - containerWidthRef.current + 20; // 20px padding
      const duration = Math.max(3000, scrollDistance * 20); // Adjust speed based on distance
      
      animationRef.current = Animated.loop(
        Animated.sequence([
          Animated.delay(1000), // Wait 1 second before starting
          Animated.timing(scrollX, {
            toValue: -scrollDistance,
            duration: duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.delay(2000), // Pause at the end
          Animated.timing(scrollX, {
            toValue: 0,
            duration: duration, // Same duration for both directions
            easing: Easing.linear, // Use linear for consistent speed
            useNativeDriver: true,
          }),
        ])
      );
      animationRef.current.start();
    } else {
      setNeedsScroll(false);
      if (animationRef.current) {
        animationRef.current.stop();
      }
      scrollX.setValue(0);
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [text, scrollX]);

  const onTextLayout = (event) => {
    textWidthRef.current = event.nativeEvent.layout.width;
    if (containerWidthRef.current > 0) {
      if (textWidthRef.current > containerWidthRef.current) {
        setNeedsScroll(true);
      }
    }
  };

  const onContainerLayout = (event) => {
    containerWidthRef.current = event.nativeEvent.layout.width;
    if (textWidthRef.current > containerWidthRef.current) {
      setNeedsScroll(true);
    }
  };

  return (
    <View style={{ overflow: 'hidden', flex: 1 }} onLayout={onContainerLayout}>
      <Animated.View
        style={{
          transform: [{ translateX: scrollX }],
        }}
      >
        <Text
          style={style}
          onLayout={onTextLayout}
          numberOfLines={needsScroll ? undefined : 2}
        >
          {text}
        </Text>
      </Animated.View>
    </View>
  );
};

const RadioScreen = () => {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [nextTrack, setNextTrack] = useState(null);
  const [songHistory, setSongHistory] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigation = useNavigation();
  const userPausedRef = useRef(false); // Track if user intentionally paused
  const appStateRef = useRef(AppState.currentState);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    navigation.setOptions({
      title: 'Radio',
      headerTitleAlign: 'center',
      headerTitleStyle: { fontSize: 18, fontWeight: '600' },
    });
  }, [navigation]);

  const fetchNowPlaying = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsRefreshing(true);
      }
      const { data } = await axios.get(NOW_PLAYING_API);
      setNowPlaying(data?.now_playing);
      setNextTrack(data?.playing_next);
      setSongHistory(data?.song_history ?? []);
    } catch (error) {
      console.error('Error fetching now playing info:', error);
    } finally {
      if (showLoading) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchNowPlaying();
    const intervalId = setInterval(fetchNowPlaying, 30000);
    return () => clearInterval(intervalId);
  }, [fetchNowPlaying]);


  // Set audio mode on mount and handle app state changes
  useEffect(() => {
    // Set audio mode for background playback
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(console.error);

    // Handle app state changes to maintain audio playback
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      appStateRef.current = nextAppState; // Update app state ref
      
      // Ensure audio mode is set for both background and active states
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        // If playing and going to background, ensure keep-awake is active
        if (nextAppState === 'background' && isPlaying) {
          await startForegroundService();
          // Also ensure audio is still playing
          if (sound) {
            try {
              const status = await sound.getStatusAsync();
              if (status.isLoaded && !status.isPlaying && !userPausedRef.current) {
                await sound.playAsync();
              }
            } catch (error) {
              console.error('Error resuming audio in background:', error);
            }
          }
        }

        // If coming back to active and was playing, resume if needed
        if (nextAppState === 'active' && isPlaying && sound) {
          try {
            const status = await sound.getStatusAsync();
            if (!status.isPlaying) {
              await sound.playAsync();
            }
          } catch (error) {
            // If sound object is invalid, recreate it
            if (error.message && error.message.includes('Player does not exist')) {
              // Sound was lost, need to recreate
              const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: RADIO_STREAM_URL },
                { 
                  shouldPlay: true,
                  isLooping: false,
                  isMuted: false,
                  volume: 1.0,
                }
              );
              
              // Add status update listener
              newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded) {
                  if (status.didJustFinish) {
                    newSound.replayAsync().catch(console.error);
                  } else if (!status.isPlaying && !userPausedRef.current && !status.isBuffering) {
                    if (appStateRef.current === 'background' || appStateRef.current === 'inactive') {
                      newSound.playAsync().catch(console.error);
                    }
                  }
                }
              });
              
              setSound(newSound);
            }
          }
        }
      } catch (error) {
        console.error('Error handling app state change:', error);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [isPlaying, sound]);

  // Periodic check to ensure audio continues playing in background
  useEffect(() => {
    if (!isPlaying || userPausedRef.current) return;

    const checkInterval = setInterval(async () => {
      if (!sound || userPausedRef.current) return;

      // Ensure foreground service is active if in background
      if (appStateRef.current === 'background' || appStateRef.current === 'inactive') {
        try {
          await startForegroundService();
        } catch (error) {
          console.error('Error maintaining foreground service:', error);
        }
      }

      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && !status.isPlaying && !status.isBuffering && !userPausedRef.current) {
          // Audio stopped unexpectedly, restart it
          console.log('Audio stopped unexpectedly, restarting...');
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });
          await sound.playAsync();
        }
      } catch (error) {
        // Sound object might be invalid, try to recreate if we're supposed to be playing
        if (error.message && error.message.includes('Player does not exist')) {
          console.log('Sound object lost, recreating...');
          try {
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              staysActiveInBackground: true,
              playsInSilentModeIOS: true,
              shouldDuckAndroid: true,
              playThroughEarpieceAndroid: false,
            });
            await startForegroundService();
            
            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: RADIO_STREAM_URL },
              { 
                shouldPlay: true,
                isLooping: false,
                isMuted: false,
                volume: 1.0,
              }
            );
            
            newSound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded) {
                if (status.didJustFinish) {
                  newSound.replayAsync().catch(console.error);
                } else if (!status.isPlaying && !userPausedRef.current && !status.isBuffering) {
                  if (appStateRef.current === 'background' || appStateRef.current === 'inactive') {
                    newSound.playAsync().catch(console.error);
                  }
                }
              }
            });
            
            setSound(newSound);
          } catch (recreateError) {
            console.error('Error recreating sound:', recreateError);
          }
        }
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(checkInterval);
  }, [isPlaying, sound]);
  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--';
    return new Date(timestamp * 1000).toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDateLabel = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleDateString('en-GB', {
      weekday: 'long',
    }).toUpperCase();
  };

  const formatTimeRange = (startTs, duration) => {
    if (!startTs || !duration) return 'TBD';
    const end = startTs + duration;
    return `${formatTime(startTs)} - ${formatTime(end)}`;
  };

  const scheduleItems = [
    nextTrack
      ? {
          id: `next-${nextTrack?.song?.id ?? nextTrack?.cued_at}`,
          title: nextTrack?.song?.title ?? 'Upcoming Program',
          timeRange: formatTimeRange(nextTrack?.played_at, nextTrack?.duration),
          day: formatDateLabel(nextTrack?.played_at),
          playlist: nextTrack?.song?.album || nextTrack?.playlist || 'On Air Soon',
          status: 'upcoming',
        }
      : null,
    ...songHistory.slice(0, 2).map((item) => ({
      id: item.sh_id,
      title: item.song?.title ?? 'Recent Program',
      timeRange: formatTimeRange(item.played_at, item.duration),
      day: formatDateLabel(item.played_at),
      playlist: item.song?.album || item.playlist || 'Earlier',
      status: 'recent',
    })),
  ].filter(Boolean);

  const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  // Animated waveform bars
  const bars = useRef(
    Array(15).fill().map(() => new Animated.Value(10))
  ).current;

  const animateWaveform = () => {
    bars.forEach((bar) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: Math.random() * 50 + 20,
            duration: Math.random() * 500 + 200,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
          Animated.timing(bar, {
            toValue: Math.random() * 20 + 10,
            duration: Math.random() * 500 + 200,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
        ])
      ).start();
    });
  };

  const stopWaveform = useCallback(() => {
    bars.forEach((bar) => {
      Animated.timing(bar, {
        toValue: 10,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
  }, []);

  // Animate pulse icon when playing
  useEffect(() => {
    if (isPlaying) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            easing: Easing.easeInOut,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.easeInOut,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPlaying, pulseAnim]);

  const playRadio = async () => {
    try {
      userPausedRef.current = false; // Reset pause flag
      
      // Ensure audio mode is set for background playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      await startForegroundService();

      if (!sound) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: RADIO_STREAM_URL },
          { 
            shouldPlay: true,
            isLooping: false,
            isMuted: false,
            volume: 1.0,
          }
        );
        
        // Add status update listener to detect when playback stops unexpectedly
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              // Stream ended, restart it
              newSound.replayAsync().catch(console.error);
            } else if (!status.isPlaying && !userPausedRef.current && !status.isBuffering) {
              // Playback stopped unexpectedly (not user-initiated), try to resume
              // Only auto-resume if app is in background (screen locked)
              if (appStateRef.current === 'background' || appStateRef.current === 'inactive') {
                newSound.playAsync().catch(console.error);
              }
            }
          }
        });
        
        setSound(newSound);
        setIsPlaying(true);
        userPausedRef.current = false; // Reset pause flag when playing
        animateWaveform();
        logRadioPlay();
      } else {
        // Check if sound is still valid
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            await sound.playAsync();
          } else {
            // Sound was unloaded, recreate it
            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: RADIO_STREAM_URL },
              { 
                shouldPlay: true,
                isLooping: false,
                isMuted: false,
                volume: 1.0,
              }
            );
            
            // Add status update listener
            newSound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded) {
                if (status.didJustFinish) {
                  newSound.replayAsync().catch(console.error);
                } else if (!status.isPlaying && !userPausedRef.current && !status.isBuffering) {
                  if (appStateRef.current === 'background' || appStateRef.current === 'inactive') {
                    newSound.playAsync().catch(console.error);
                  }
                }
              }
            });
            
            setSound(newSound);
          }
          setIsPlaying(true);
          animateWaveform();
        } catch (error) {
          // Sound object is invalid, recreate it
          if (error.message && error.message.includes('Player does not exist')) {
            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: RADIO_STREAM_URL },
              { 
                shouldPlay: true,
                isLooping: false,
                isMuted: false,
                volume: 1.0,
              }
            );
            
            // Add status update listener
            newSound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded) {
                if (status.didJustFinish) {
                  newSound.replayAsync().catch(console.error);
                } else if (!status.isPlaying && !userPausedRef.current && !status.isBuffering) {
                  if (appStateRef.current === 'background' || appStateRef.current === 'inactive') {
                    newSound.playAsync().catch(console.error);
                  }
                }
              }
            });
            
            setSound(newSound);
            setIsPlaying(true);
            animateWaveform();
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Error playing radio:', error);
    }
  };

  const pauseRadio = async () => {
    try {
      if (sound) {
        userPausedRef.current = true; // Mark as user-initiated pause
        await sound.pauseAsync();
        setIsPlaying(false);
        stopWaveform();
      }
    } catch (error) {
      console.error('Error pausing radio:', error);
    }
  };

  const stopRadio = useCallback(async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        stopWaveform();
        logRadioStop();
      }
    } catch (error) {
      // Ignore errors when sound is not loaded or doesn't exist
      const errorMessage = error.message || '';
      if (
        errorMessage.includes('Player does not exist') ||
        errorMessage.includes('sound is not loaded') ||
        errorMessage.includes('not loaded')
      ) {
        // Sound is already unloaded or doesn't exist, just reset state
        setSound(null);
        setIsPlaying(false);
        stopWaveform();
        return;
      }
      console.error('Error stopping radio:', error);
    }
  }, [sound, stopWaveform]);

  // Stop radio when navigating away from the screen
  useFocusEffect(
    React.useCallback(() => {
      // Screen is focused - radio can play
      return () => {
        // Screen lost focus - stop the radio
        stopRadio();
      };
    }, [stopRadio])
  );

  return (
    <ImageBackground
      source={require('../../assets/images/arabic_calligraphy.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
        {/* Waveform Animation */}
        <View style={styles.waveformContainer}>
          {bars.map((bar, index) => (
            <Animated.View
              key={index}
              style={[
                styles.waveformBar,
                {
                  height: bar,
                },
              ]}
            />
          ))}
        </View>

        {/* Status Indicator with Animated Icon */}
        <View style={styles.statusContainer}>
          <View style={styles.statusContent}>
            <View style={styles.statusIconWrapper}>
              {isPlaying && (
                <Animated.View
                  style={[
                    styles.statusPulseRing,
                    {
                      transform: [{ scale: pulseAnim }],
                      opacity: pulseAnim.interpolate({
                        inputRange: [1, 1.3],
                        outputRange: [0.4, 0],
                      }),
                    },
                  ]}
                />
              )}
              <Animated.View
                style={[
                  styles.statusIconContainer,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <Ionicons 
                  name="radio" 
                  size={24} 
                  color={isPlaying ? BRAND_COLORS.accent : '#94a3a0'} 
                />
              </Animated.View>
            </View>
            <Text style={[styles.statusText, { color: isPlaying ? BRAND_COLORS.accent : '#94a3a0' }]}>
              {isPlaying ? 'Playing' : 'Paused'}
            </Text>
          </View>
        </View>

        {/* Controls Box */}
        <View style={styles.controlsBox}>
          <TouchableOpacity onPress={playRadio} style={styles.playButton}>
            <Ionicons name="play" size={40} color={isPlaying ? '#dfeee7' : BRAND_COLORS.primary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={pauseRadio} style={styles.button}>
            <Ionicons name="pause" size={40} color={isPlaying ? "#dc3545" : "#94a3a0"} />
          </TouchableOpacity>

          <TouchableOpacity onPress={stopRadio} style={styles.button}>
            <Ionicons name="stop" size={40} color="#ff6b6b" />
          </TouchableOpacity>
        </View>

        {nowPlaying && (
          <View style={styles.infoRow}>
            {/* Now Playing - Compact Design */}
            <View style={styles.nowPlayingCard}>
              <View style={styles.nowPlayingContent}>
                <View style={styles.nowPlayingLeft}>
                  <View style={styles.nowPlayingIcon}>
                    <Ionicons name="radio" size={20} color="#fff" />
                  </View>
                  <View style={styles.nowPlayingInfo}>
                    <View style={styles.nowPlayingHeaderRow}>
                      <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                      </View>
                      <Text style={styles.nowPlayingLabel}>Now Playing</Text>
                    </View>
                    <MarqueeText 
                      text={nowPlaying?.song?.title || '—'}
                      style={styles.nowPlayingTitle}
                    />
                    <View style={styles.nowPlayingMetaRow}>
                      <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.nowPlayingMeta}>
                        {formatDuration(nowPlaying?.duration)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

          {scheduleItems.length > 0 && (
            <View style={styles.scheduleSection}>
              <View style={styles.scheduleHeaderContainer}>
                <View style={styles.scheduleHeader}>
                  <View style={styles.scheduleHeaderLeft}>
                    <View style={styles.scheduleHeaderIcon}>
                      <Ionicons name="calendar" size={24} color={BRAND_COLORS.primary} />
                    </View>
                    <View>
                      <Text style={styles.scheduleLabel}>Schedule</Text>
                      <Text style={styles.scheduleTitle}>Coming Up</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    onPress={() => fetchNowPlaying(true)} 
                    style={styles.refreshButton}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <ActivityIndicator size="small" color={BRAND_COLORS.primary} />
                    ) : (
                      <Ionicons name="refresh" size={20} color={BRAND_COLORS.primary} />
                    )}
                  </TouchableOpacity>
                </View>
                <View style={styles.timezoneContainer}>
                  <Ionicons name="time-outline" size={14} color="#4c6b5f" />
                  <Text style={styles.timezoneNote}>All times in London timezone (GMT/BST)</Text>
                </View>
              </View>
              
              {/* Table Structure */}
              <View style={styles.tableContainer}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <View style={styles.tableHeaderCellProgram}>
                    <Text style={styles.tableHeaderText}>Program</Text>
                  </View>
                </View>
                
                {/* Table Rows */}
                {scheduleItems.map((item, index) => (
                  <View
                    key={item.id}
                    style={[
                      styles.tableRow,
                      item.status === 'upcoming' && styles.tableRowActive,
                      index === scheduleItems.length - 1 && styles.tableRowLast,
                    ]}
                  >
                    <View style={styles.tableCellProgram}>
                      <View style={styles.programMetaRow}>
                        <View style={styles.programMetaItem}>
                          <Ionicons name="time-outline" size={12} color="#4c6b5f" />
                          <Text style={styles.programMetaText}>
                            {item.timeRange.split(' - ')[0]}
                          </Text>
                        </View>
                        <View style={styles.programMetaItem}>
                          <Ionicons name="calendar-outline" size={12} color="#15A97A" />
                          <Text style={styles.programMetaText}>
                            {item.day}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.programHeaderRow}>
                        <MarqueeText 
                          text={item.title}
                          style={[
                            styles.tableCellProgramText,
                            item.status === 'upcoming' && styles.tableCellProgramTextActive,
                          ]}
                        />
                        {item.status === 'upcoming' && (
                          <View style={styles.tableBadge}>
                            <Text style={styles.tableBadgeText}>NEXT</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          <BannerAd />
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(236, 247, 243, 0.92)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.textDark,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  description: {
    fontSize: 13,
    color: '#4c6b5f',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoRow: {
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 4,
  },
  nowPlayingCard: {
    backgroundColor: BRAND_COLORS.secondary,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#0d4130',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  nowPlayingContent: {
    padding: 14,
  },
  nowPlayingLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nowPlayingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  nowPlayingInfo: {
    flex: 1,
  },
  nowPlayingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 77, 79, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 79, 0.5)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff4d4f',
    marginRight: 5,
  },
  liveText: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.8,
    fontSize: 9,
  },
  nowPlayingLabel: {
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  nowPlayingTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 6,
  },
  nowPlayingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nowPlayingMeta: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '500',
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardLabelAlt: {
    color: BRAND_COLORS.textDark,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  cardTitleLight: {
    color: BRAND_COLORS.textDark,
  },
  cardMeta: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
  },
  cardMetaLight: {
    color: '#4c6b5f',
  },
  nextCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: BRAND_COLORS.accent,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    borderWidth: 1.5,
    borderColor: BRAND_COLORS.accent,
    elevation: 4,
    overflow: 'hidden',
  },
  nextCardContent: {
    padding: 14,
  },
  nextCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nextCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BRAND_COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: BRAND_COLORS.accent,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  nextCardInfo: {
    flex: 1,
  },
  nextCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  nextCardLabel: {
    color: BRAND_COLORS.textDark,
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  nextCardBadge: {
    backgroundColor: BRAND_COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  nextCardBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  nextCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BRAND_COLORS.primary,
    marginBottom: 6,
    lineHeight: 20,
  },
  nextCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextCardMeta: {
    color: '#4c6b5f',
    fontSize: 11,
    fontWeight: '500',
  },
  waveformContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center', // Center waveform properly
    height: 80,
    width: '100%',
    marginBottom: 20,
  },
  waveformBar: {
    width: 6,
    backgroundColor: BRAND_COLORS.secondary,
    marginHorizontal: 3,
    borderRadius: 5,
  },
  statusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    minHeight: 70,
  },
  statusContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconWrapper: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    marginTop: 8,
    position: 'relative',
  },
  statusIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    position: 'relative',
  },
  statusPulseRing: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: BRAND_COLORS.accent,
    zIndex: 1,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  status: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  controlsBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 24,
    elevation: 6,
    shadowColor: '#0d4130',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#d6eee4',
  },
  button: {
    marginHorizontal: 15,
  },
  playButton: {
    marginHorizontal: 15,
    backgroundColor: '#fff',
    borderRadius: 40,
    padding: 4,
  },
  scheduleSection: {
    width: '100%',
    marginTop: 4,
    paddingHorizontal: 0,
  },
  scheduleHeaderContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 8,
    shadowColor: '#0d4130',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#d6eee4',
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: BRAND_COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scheduleLabel: {
    color: '#4c6b5f',
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.textDark,
  },
  refreshButton: {
    backgroundColor: BRAND_COLORS.background,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#0d4130',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  timezoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  timezoneNote: {
    color: '#4c6b5f',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  // Table Structure Styles
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 8,
    shadowColor: '#0d4130',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#d6eee4',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: BRAND_COLORS.primary,
    borderBottomWidth: 2,
    borderBottomColor: BRAND_COLORS.secondary,
  },
  tableHeaderCellProgram: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2f2ea',
    backgroundColor: '#fff',
  },
  tableRowActive: {
    backgroundColor: '#f0fdf9',
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.accent,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCellProgram: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  programHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
    gap: 8,
  },
  tableCellProgramText: {
    color: BRAND_COLORS.textDark,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    flex: 1,
  },
  tableCellProgramTextActive: {
    color: BRAND_COLORS.primary,
    fontWeight: '700',
  },
  tableBadge: {
    backgroundColor: BRAND_COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  tableBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  programMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  programMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  programMetaText: {
    color: '#4c6b5f',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default RadioScreen;

