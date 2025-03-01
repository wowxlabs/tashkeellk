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

import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Easing, ImageBackground } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { startForegroundService } from './ForegroundService';
import { useNavigation } from '@react-navigation/native';

const RADIO_STREAM_URL = 'https://radio.tashkeel.lk:8000/radio.mp3';

const RadioScreen = () => {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      title: 'Radio',
      headerTitleAlign: 'center',
      headerTitleStyle: { fontSize: 24, fontWeight: 'bold' },
    });
  }, [navigation]);

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
      {/* Overlay to make the background lighter */}
      <View style={styles.overlay} />

      <View style={styles.container}>
        <Text style={styles.title}>Tashkeel Radio</Text>
        <Text style={styles.description}>Your ultimate resource for spiritual growth and guidance towards attaining Jannah (Paradise) 🎙️</Text>

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
        <Text style={[styles.status, { color: isPlaying ? "#28a745" : "#dc3545" }]}>
          {isPlaying ? "Playing 🎵" : "Paused"}
        </Text>

        {/* Controls Box */}
        <View style={styles.controlsBox}>
          <TouchableOpacity onPress={playRadio} style={styles.button}>
            <Ionicons name="play" size={40} color={isPlaying ? "#ccc" : "#28a745"} />
          </TouchableOpacity>

          <TouchableOpacity onPress={pauseRadio} style={styles.button}>
            <Ionicons name="pause" size={40} color={isPlaying ? "#dc3545" : "#ccc"} />
          </TouchableOpacity>

          <TouchableOpacity onPress={stopRadio} style={styles.button}>
            <Ionicons name="stop" size={40} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      </View>
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Semi-transparent white overlay
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
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
    backgroundColor: 'black',
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
    backgroundColor: '#f9f9f9',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  button: {
    marginHorizontal: 15,
  },
});

export default RadioScreen;

