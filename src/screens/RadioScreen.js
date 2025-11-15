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
import { View, TouchableOpacity, Text, StyleSheet, Animated, Easing, ImageBackground, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { startForegroundService } from './ForegroundService';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

const RADIO_STREAM_URL = 'https://radio.tashkeel.lk:8000/radio.mp3';
const NOW_PLAYING_API = 'https://radio.tashkeel.lk/api/station/2/nowplaying';
const BRAND_COLORS = {
  primary: '#0F8D6B',
  secondary: '#15A97A',
  accent: '#F5B400',
  background: '#ECF7F3',
  textDark: '#0B4733',
};

const RadioScreen = () => {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [nextTrack, setNextTrack] = useState(null);
  const [songHistory, setSongHistory] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      title: 'Radio',
      headerTitleAlign: 'center',
      headerTitleStyle: { fontSize: 24, fontWeight: 'bold' },
    });
  }, [navigation]);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const { data } = await axios.get(NOW_PLAYING_API);
      setNowPlaying(data?.now_playing);
      setNextTrack(data?.playing_next);
      setSongHistory(data?.song_history ?? []);
    } catch (error) {
      console.error('Error fetching now playing info:', error);
    }
  }, []);

  useEffect(() => {
    fetchNowPlaying();
    const intervalId = setInterval(fetchNowPlaying, 30000);
    return () => clearInterval(intervalId);
  }, [fetchNowPlaying]);
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

  const stopWaveform = () => {
    bars.forEach((bar) => {
      Animated.timing(bar, {
        toValue: 10,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
  };

  const playRadio = async () => {
    try {
      if (!sound) {
        await startForegroundService();
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: RADIO_STREAM_URL },
          { shouldPlay: true }
        );
        setSound(newSound);
        setIsPlaying(true);
        animateWaveform();
      } else {
        await sound.playAsync();
        setIsPlaying(true);
        animateWaveform();
      }
    } catch (error) {
      console.error('Error playing radio:', error);
    }
  };

  const pauseRadio = async () => {
    try {
      if (sound) {
        await sound.pauseAsync();
        setIsPlaying(false);
        stopWaveform();
      }
    } catch (error) {
      console.error('Error pausing radio:', error);
    }
  };

  const stopRadio = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        stopWaveform();
      }
    } catch (error) {
      console.error('Error stopping radio:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        stopRadio();
      };
    }, [sound])
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
        <Text style={styles.title}>Tashkeel Radio</Text>
        <Text style={styles.description}>Your ultimate resource for spiritual growth and guidance towards attaining Jannah (Paradise) 🎙️</Text>

        {nowPlaying && (
          <View style={styles.infoRow}>
            <View style={styles.nowPlayingCard}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE 24/7</Text>
              </View>
              <Text style={styles.cardLabel}>Now Playing</Text>
              <Text style={styles.cardTitle}>{nowPlaying?.song?.title}</Text>
              <Text style={styles.cardMeta}>Duration {formatDuration(nowPlaying?.duration)}</Text>
            </View>

            {nextTrack && (
              <View style={styles.nextCard}>
                <Text style={[styles.cardLabel, styles.cardLabelAlt]}>Coming Up Next</Text>
                <Text style={[styles.cardTitle, styles.cardTitleLight]} numberOfLines={2}>
                  {nextTrack?.song?.title}
                </Text>
                <Text style={[styles.cardMeta, styles.cardMetaLight]}>
                  {nextTrack?.song?.album || nextTrack?.playlist || '—'}
                </Text>
              </View>
            )}
          </View>
        )}

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

        {/* Status Indicator */}
        <Text style={[styles.status, { color: isPlaying ? BRAND_COLORS.accent : '#dc3545' }]}>
          {isPlaying ? "Playing 🎵" : "Paused"}
        </Text>

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

          {scheduleItems.length > 0 && (
            <View style={styles.scheduleSection}>
              <View style={styles.scheduleHeader}>
                <View>
                  <Text style={styles.scheduleLabel}>Schedule</Text>
                  <Text style={styles.scheduleTitle}>Coming Up</Text>
                </View>
                <TouchableOpacity onPress={fetchNowPlaying} style={styles.refreshButton}>
                  <Ionicons name="refresh" size={22} color={BRAND_COLORS.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.timezoneNote}>All times in London timezone (GMT/BST)</Text>
              {scheduleItems.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.scheduleCard,
                    item.status === 'upcoming' && styles.scheduleCardActive,
                  ]}
                >
                  <View style={styles.scheduleIcon}>
                    <Ionicons name="time" size={20} color="#fff" />
                  </View>
                  <View style={styles.scheduleInfo}>
                    <Text style={styles.scheduleItemTitle}>{item.title}</Text>
                    <Text style={styles.scheduleTime}>{item.timeRange}</Text>
                    <Text style={styles.scheduleDay}>{item.day}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
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
    fontSize: 28,
    fontWeight: 'bold',
    color: BRAND_COLORS.textDark,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  description: {
    fontSize: 16,
    color: '#4c6b5f',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoRow: {
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  nowPlayingCard: {
    backgroundColor: BRAND_COLORS.secondary,
    padding: 18,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: '#0d4130',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff4d4f',
    marginRight: 6,
  },
  liveText: {
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 1,
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
    fontSize: 18,
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
    padding: 16,
    borderRadius: 24,
    shadowColor: '#0d4130',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: BRAND_COLORS.accent,
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
  status: {
    fontSize: 20,
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
    marginTop: 24,
    paddingHorizontal: 16,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scheduleLabel: {
    color: BRAND_COLORS.textDark,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1,
  },
  scheduleTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: BRAND_COLORS.textDark,
  },
  refreshButton: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 16,
    shadowColor: '#0d4130',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  timezoneNote: {
    color: '#4c6b5f',
    fontSize: 12,
    marginBottom: 10,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    shadowColor: '#0d4130',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    borderWidth: 1,
    borderColor: '#e2f2ea',
  },
  scheduleCardActive: {
    borderColor: BRAND_COLORS.accent,
    backgroundColor: '#fff',
  },
  scheduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: BRAND_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND_COLORS.textDark,
  },
  scheduleTime: {
    marginTop: 4,
    color: '#4c6b5f',
  },
  scheduleDay: {
    marginTop: 2,
    color: '#15A97A',
    fontWeight: '600',
  },
});

export default RadioScreen;

