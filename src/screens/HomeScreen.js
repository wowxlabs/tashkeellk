import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, ScrollView, TouchableOpacity, Animated, FlatList, Dimensions, Modal, Platform, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import axios from 'axios';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DateTime } from 'luxon';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import BannerAd from '../components/BannerAd';
import { getCalculationMethod, getTimezone } from '../services/prayerSettings';

const friendlyName = (playlist) =>
  playlist ? playlist.charAt(0).toUpperCase() + playlist.slice(1) : 'Next Prayer';

// Helper function to strip HTML tags but preserve line breaks for card preview
const stripHTMLForPreview = (html) => {
  if (!html) return '';
  // Replace <br> and <br/> with newlines
  let text = html.replace(/<br\s*\/?>/gi, '\n');
  // Replace </p> and </div> with newlines
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  // Remove all other HTML tags
  text = text.replace(/<[^>]*>/g, '');
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&apos;/g, "'");
  // Remove multiple consecutive spaces (keep single space)
  text = text.replace(/[ \t]+/g, ' ');
  // Clean up multiple consecutive newlines (max 2)
  text = text.replace(/\n{3,}/g, '\n\n');
  // Split into lines, trim each line, and remove empty lines
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  // Join with single newline
  text = lines.join('\n');
  // Final trim
  return text.trim();
};

// Helper function to convert relative URL to absolute
const makeAbsoluteUrl = (url) => {
  if (!url) return url;
  
  // Already absolute
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  
  // Relative path starting with /
  if (url.startsWith('/')) {
    return `https://api.tashkeel.lk${url}`;
  }
  
  // Relative path without /
  return `https://api.tashkeel.lk/${url}`;
};

// Helper function to process HTML and fix image URLs
const processHTMLContent = (htmlContent) => {
  if (!htmlContent) return '';
  
  let processedHTML = htmlContent;
  
  // Convert relative image URLs in img src attributes
  processedHTML = processedHTML.replace(
    /<img([^>]*?)src\s*=\s*(["'])([^"']+)\2([^>]*?)>/gi,
    (match, before, quote, src, after) => {
      const absoluteSrc = makeAbsoluteUrl(src.trim());
      return `<img${before}src=${quote}${absoluteSrc}${quote}${after}>`;
    }
  );
  
  return processedHTML;
};

// Helper function to create HTML content with styling
const createHTMLContent = (htmlContent) => {
  const processedContent = processHTMLContent(htmlContent);
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 16px;
            line-height: 26px;
            color: #0B4733;
            background-color: transparent;
          }
          p {
            margin: 0 0 16px 0;
          }
          img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 16px 0;
            display: block;
          }
          h1, h2, h3, h4, h5, h6 {
            color: #0B4733;
            margin-top: 24px;
            margin-bottom: 12px;
            font-weight: 700;
          }
          h1 { font-size: 24px; }
          h2 { font-size: 20px; }
          h3 { font-size: 18px; }
          a {
            color: #0F8D6B;
            text-decoration: none;
          }
          ul, ol {
            margin: 16px 0;
            padding-left: 24px;
          }
          li {
            margin: 8px 0;
          }
          blockquote {
            margin: 16px 0;
            padding: 12px 16px;
            border-left: 4px solid #0F8D6B;
            background-color: #f0f9f6;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        ${processedContent}
      </body>
    </html>
  `;
};

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

const AnnouncementsCard = ({ announcements, loading }) => {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth - 32; // Account for card margin (16*2)
  const cardPadding = 32; // Card padding (16*2)
  // Item width: full width of card content
  const itemWidth = cardWidth - cardPadding;
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [messageHeight, setMessageHeight] = useState(100);
  const [bodyHeight, setBodyHeight] = useState(200);
  const autoScrollTimer = useRef(null);

  useEffect(() => {
    if (!announcements || announcements.length <= 1) return;

    // Auto-rotate every 5 seconds
    autoScrollTimer.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % announcements.length;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 5000);

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [announcements]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  if (loading) {
    return (
      <View style={styles.announcementsCard}>
        <ActivityIndicator color="#0F8D6B" />
      </View>
    );
  }

  if (!announcements || announcements.length === 0) {
    return null;
  }

  const handleShareReminder = async (announcement) => {
    try {
      if (!announcement) return;

      const imageUrl = announcement.image
        ? (announcement.image.startsWith('http')
            ? announcement.image
            : `https://api.tashkeel.lk${announcement.image.startsWith('/') ? '' : '/'}${announcement.image}`)
        : null;

      const title = announcement.title || 'Tashkeel Reminders';
      
      // Build message with proper spacing (strip HTML tags for clean text)
      let message = '';
      if (announcement.title) {
        const titleText = stripHTMLForPreview(announcement.title).trim();
        const separator = '='.repeat(titleText.length);
        message += titleText + '\n' + separator + '\n';
      }
      if (announcement.message) {
        message += stripHTMLForPreview(announcement.message).trim() + '\n\n';
      }
      if (announcement.body) {
        message += stripHTMLForPreview(announcement.body).trim() + '\n\n';
      }
      message += 'From: Tashkeel App';

      await Share.share({
        title,
        message,
      });
    } catch (e) {
      console.log('Share failed:', e);
    }
  };

  return (
    <View style={styles.announcementsCard}>
      <View style={styles.announcementsHeader}>
        <Text style={styles.announcementsTitle}>Reminders</Text>
        <Ionicons name="megaphone" size={18} color="#d0f0e4" />
      </View>
      <View style={styles.announcementsSliderContainer}>
        <FlatList
          ref={flatListRef}
          data={announcements}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `announcement-${index}`}
          style={{ width: '100%' }}
          getItemLayout={(data, index) => ({
            length: itemWidth,
            offset: itemWidth * index,
            index,
          })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScrollToIndexFailed={(info) => {
            // Handle scroll to index failure
            const wait = new Promise(resolve => setTimeout(resolve, 500));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
            });
          }}
          renderItem={({ item }) => {
            const imageUrl = item.image 
              ? (item.image.startsWith('http') 
                  ? item.image 
                  : `https://api.tashkeel.lk${item.image.startsWith('/') ? '' : '/'}${item.image}`)
              : null;
            
            return (
              <View style={[styles.announcementItem, { width: itemWidth }]}>
                <TouchableOpacity
                  style={styles.announcementCard}
                  onPress={() => setSelectedAnnouncement(item)}
                  activeOpacity={0.7}
                >
                  {imageUrl && (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.announcementThumb}
                      resizeMode="cover"
                      onError={(error) => {
                        console.log('Image load error:', error.nativeEvent.error, 'URL:', imageUrl);
                      }}
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    {item.title && (
                      <Text style={styles.announcementTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                    )}
                    {item.message && (
                      <Text style={styles.announcementMessage} numberOfLines={2}>
                        {stripHTMLForPreview(item.message)}
                      </Text>
                    )}
                    {item.body && (
                      <Text style={styles.announcementBody} numberOfLines={3}>
                        {stripHTMLForPreview(item.body)}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      </View>
      {announcements.length > 1 && (
        <View style={styles.announcementIndicators}>
          {announcements.map((_, index) => (
            <View
              key={index}
              style={[
                styles.announcementDot,
                index === currentIndex && styles.announcementDotActive,
              ]}
            />
          ))}
        </View>
      )}
      
      {/* Announcement Detail Modal */}
      <Modal
        visible={selectedAnnouncement !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedAnnouncement(null)}
      >
        {selectedAnnouncement && (
          <View style={styles.announcementModalContainer}>
            <View style={[styles.announcementModalHeader, { paddingTop: Platform.OS === 'ios' ? insets.top + 12 : 12 }]}>
              <TouchableOpacity
                style={styles.announcementModalCloseButton}
                onPress={() => setSelectedAnnouncement(null)}
              >
                <Ionicons name="close" size={24} color="#0B4733" />
              </TouchableOpacity>
              <Text style={styles.announcementModalHeaderTitle}>Reminders</Text>
              <View style={styles.announcementModalHeaderSpacer} />
            </View>
            <ScrollView 
              style={styles.announcementModalContent}
              contentContainerStyle={{ paddingBottom: 30 }}
            >
              {selectedAnnouncement.image && (
                <ScrollView
                  style={[styles.announcementModalImageContainer, {
                    width: Dimensions.get('window').width - 32,
                    height: Dimensions.get('window').height * 0.4,
                  }]}
                  contentContainerStyle={{
                    width: Dimensions.get('window').width - 32,
                    height: Dimensions.get('window').height * 0.4,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  maximumZoomScale={5}
                  minimumZoomScale={1}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  bouncesZoom={true}
                  scrollEventThrottle={16}
                >
                  <Image
                    source={{
                      uri: selectedAnnouncement.image.startsWith('http')
                        ? selectedAnnouncement.image
                        : `https://api.tashkeel.lk${selectedAnnouncement.image.startsWith('/') ? '' : '/'}${selectedAnnouncement.image}`
                    }}
                    style={{
                      width: Dimensions.get('window').width - 32,
                      height: Dimensions.get('window').height * 0.4,
                      borderRadius: 12,
                    }}
                    resizeMode="contain"
                  />
                </ScrollView>
              )}
              <TouchableOpacity
                style={styles.announcementModalShareButton}
                onPress={() => handleShareReminder(selectedAnnouncement)}
                activeOpacity={0.8}
              >
                <Ionicons name="share-social-outline" size={18} color="#0B4733" />
                <Text style={styles.announcementModalShareText}>Share This Reminder</Text>
              </TouchableOpacity>
              {selectedAnnouncement.title && (
                <Text style={styles.announcementModalTitle}>{selectedAnnouncement.title}</Text>
              )}
              {selectedAnnouncement.message && (
                <View style={styles.announcementModalHTMLContainer}>
                  <WebView
                    source={{ 
                      html: createHTMLContent(selectedAnnouncement.message),
                      baseUrl: 'https://api.tashkeel.lk'
                    }}
                    style={[styles.announcementModalWebView, { height: messageHeight }]}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    originWhitelist={['*']}
                    onMessage={(event) => {
                      try {
                        const height = parseInt(event.nativeEvent.data, 10);
                        if (height && height > 0 && height < 50000) {
                          setMessageHeight(Math.max(height + 20, 100));
                        }
                      } catch (e) {
                        console.error('Error parsing height:', e);
                      }
                    }}
                    injectedJavaScript={`
                      (function() {
                        var height = document.body.scrollHeight || document.body.offsetHeight || 100;
                        if (window.ReactNativeWebView) {
                          window.ReactNativeWebView.postMessage(height.toString());
                        }
                      })();
                    `}
                  />
                </View>
              )}
              {selectedAnnouncement.body && (
                <View style={[styles.announcementModalHTMLContainer, { marginBottom: 30 }]}>
                  <WebView
                    source={{ 
                      html: createHTMLContent(selectedAnnouncement.body),
                      baseUrl: 'https://api.tashkeel.lk'
                    }}
                    style={[styles.announcementModalWebView, { height: bodyHeight }]}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    originWhitelist={['*']}
                    onMessage={(event) => {
                      try {
                        const height = parseInt(event.nativeEvent.data, 10);
                        if (height && height > 0 && height < 50000) {
                          setBodyHeight(Math.max(height + 20, 200));
                        }
                      } catch (e) {
                        console.error('Error parsing height:', e);
                      }
                    }}
                    injectedJavaScript={`
                      (function() {
                        var height = document.body.scrollHeight || document.body.offsetHeight || 200;
                        if (window.ReactNativeWebView) {
                          window.ReactNativeWebView.postMessage(height.toString());
                        }
                      })();
                    `}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
};

const PrayerCard = ({ label, accent, data, loading, error, currentDateTime }) => {
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
          {/* Curved sun arc inside the card */}
          <SunArc schedule={data?.daySchedule} currentDateTime={currentDateTime} />

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

// Curved "sun arc" timeline for the day's prayers with smooth sine curve
const SunArc = ({ schedule, currentDateTime }) => {
  const [width, setWidth] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;

  if (!schedule || schedule.length === 0) {
    return null;
  }

  const validSlots = schedule.filter(
    (slot) => slot.dateTime && slot.dateTime.isValid
  );

  if (validSlots.length === 0) {
    return null;
  }

  // Compute earliest and latest times to normalize positions
  const times = validSlots.map((s) => s.dateTime);
  const earliest = times.reduce((min, dt) => (dt < min ? dt : min), times[0]);
  const latest = times.reduce((max, dt) => (dt > max ? dt : max), times[0]);
  const spanSeconds = Math.max(
    latest.diff(earliest, 'seconds').seconds,
    1
  );

  const handleLayout = (event) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const paddingH = 16;
  const containerHeight = 100;
  const curveHeight = 35;
  const baseY = containerHeight - 15;

  // Calculate marker positions
  const markers = width
    ? validSlots.map((slot) => {
        const offset = slot.dateTime.diff(earliest, 'seconds').seconds;
        const t = Math.max(0, Math.min(1, offset / spanSeconds));
        const x = paddingH + t * Math.max(width - paddingH * 2, 1);
        // Use a smooth sine arch: y goes up in the middle
        const y = baseY - curveHeight * Math.sin(Math.PI * t);
        return { ...slot, x, y };
      })
    : [];

  // Current time marker (only if same day as schedule)
  let currentDot = null;
  let currentX = null;
  if (currentDateTime && currentDateTime.hasSame(earliest, 'day') && width > 0) {
    const nowOffset = currentDateTime.diff(earliest, 'seconds').seconds;
    const tNow = Math.max(0, Math.min(1, nowOffset / spanSeconds));
    const xNow = paddingH + tNow * Math.max(width - paddingH * 2, 1);
    const yNow = baseY - curveHeight * Math.sin(Math.PI * tNow);
    currentDot = { x: xNow, y: yNow };
    currentX = xNow;
  }

  useEffect(() => {
    if (!currentDot) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.5,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, currentDot]);

  // Generate curve points for smooth sine curve
  const curvePoints = width
    ? Array.from({ length: Math.floor(width - paddingH * 2) }, (_, i) => {
        const t = i / Math.max(width - paddingH * 2, 1);
        const x = paddingH + i;
        const y = baseY - curveHeight * Math.sin(Math.PI * t);
        return { x, y };
      })
    : [];

  return (
    <View
      style={styles.sunArcContainer}
      onLayout={handleLayout}
    >
      {width > 0 && (
        <>
          {/* Smooth sine curve using multiple small segments */}
          {curvePoints.length > 1 && curvePoints.map((point, idx) => {
            if (idx === 0) return null;
            const prev = curvePoints[idx - 1];
            const dx = point.x - prev.x;
            const dy = point.y - prev.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            // Segments before (or at) the current time are drawn darker,
            // segments after the current time stay lighter.
            const isBeforeOrAtNow = currentX !== null && prev.x <= currentX;

            return (
              <View
                key={`curve-${idx}`}
                style={[
                  styles.sunArcCurveSegment,
                  isBeforeOrAtNow ? styles.sunArcCurveSegmentActive : null,
                  {
                    left: prev.x,
                    top: prev.y,
                    width: length,
                    transform: [{ rotate: `${angle}deg` }],
                  },
                ]}
              />
            );
          })}

          {/* Markers for each prayer (including sunrise) */}
          {markers.map((slot, index) => {
            const isLabelAbove = index % 2 === 1; // Odd indices (1, 3, 5) above, even (0, 2, 4) below
            return (
              <View
                key={slot.name}
                style={[
                  styles.sunArcMarker,
                  {
                    left: slot.x - 18,
                    top: slot.y - 6, // Dot center position (dot is 12px tall, so -6 centers it)
                  },
                ]}
              >
                {isLabelAbove && (
                  <Text style={[styles.sunArcMarkerLabel, styles.sunArcMarkerLabelAbove]}>
                    {slot.name}
                  </Text>
                )}
                <View style={styles.sunArcMarkerDot} />
                {!isLabelAbove && (
                  <Text style={styles.sunArcMarkerLabel}>
                    {slot.name}
                  </Text>
                )}
              </View>
            );
          })}

          {/* Animated dot for current time along the curve */}
          {currentDot && (
            <Animated.View
              style={[
                styles.sunArcCurrentDotContainer,
                {
                  left: currentDot.x - 7,
                  top: currentDot.y - 4,
                  transform: [{ scale: pulse }],
                },
              ]}
            >
              <View style={styles.sunArcCurrentDot} />
            </Animated.View>
          )}
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
  const insets = useSafeAreaInsets();
  const initialZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const [prayerState, setPrayerState] = useState({
    loading: true,
    data: null,
    error: null,
  });
  const [timeZoneId, setTimeZoneId] = useState(initialZone);
  const [selectedDate, setSelectedDate] = useState(() =>
    DateTime.now().setZone(initialZone)
  );
  const [latestBayans, setLatestBayans] = useState([]);
  const [calcMethod, setCalcMethod] = useState(null);
  const [locationName, setLocationName] = useState('Your Location');
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsEnabled, setAnnouncementsEnabled] = useState(false);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const loadMethod = async () => {
      const method = await getCalculationMethod();
      setCalcMethod(method);
    };
    loadMethod();
  }, []);

  useEffect(() => {
    const loadTimezone = async () => {
      const tz = await getTimezone();
      console.log('🕐 Initial timezone loaded:', tz);
      setTimeZoneId(tz);
      setSelectedDate(DateTime.now().setZone(tz));
    };
    loadTimezone();
  }, []);

  // Log when timezone changes
  useEffect(() => {
    console.log('🕐 Timezone state changed to:', timeZoneId);
  }, [timeZoneId]);

  // Reload timezone when screen is focused (e.g., returning from Prayer Settings)
  useFocusEffect(
    React.useCallback(() => {
      const loadTimezone = async () => {
        const tz = await getTimezone();
        console.log('🕐 Reloading timezone on focus:', tz);
        setTimeZoneId((currentTz) => {
          if (currentTz !== tz) {
            console.log('🕐 Timezone changed from', currentTz, 'to', tz, '- will reload prayer times');
            // Show loading state when timezone changes
            setPrayerState(prev => ({ ...prev, loading: true }));
          }
          return tz;
        });
        setSelectedDate(DateTime.now().setZone(tz));
      };
      loadTimezone();
    }, [])
  );

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
            // Extract base name (remove timezone if present) and add current timezone
            const baseName = savedName.includes('(')
              ? savedName.substring(0, savedName.lastIndexOf('(')).trim()
              : savedName;
            const nameWithZone = `${baseName} (${timeZoneId})`;
            setLocationName(nameWithZone);
            // Always update to ensure timezone is current
            await AsyncStorage.setItem(LOCATION_NAME_STORAGE_KEY, nameWithZone);
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

        // Fetch prayer times from Tashkeel API using current coords, method, and selected date
        const apiDate = selectedDate.toFormat('yyyy-LL-dd');

        console.log('🕌 Fetching prayer times with timezone:', timeZoneId, 'for date:', apiDate);

        const prayerResp = await axios.get('https://api.tashkeel.lk/v1/prayertimes', {
          params: {
            lat: coords.latitude,
            lon: coords.longitude,
            date: apiDate,
            method: calcMethod || 'MWL',
            timezone: timeZoneId,
            format: '12h',
          },
          headers: {
            Accept: 'application/json',
          },
        });

        const times = prayerResp.data?.data?.times || {};
        console.log('🕌 API returned prayer times:', times);
        console.log('🕌 Requested timezone:', timeZoneId);

        // Build schedule using API times exactly as given, interpreted in the requested timezone.
        // The backend already applies the correct method and timezone conversion, so we should
        // NOT re-interpret or convert these times again on the client – just render them.
        const labels = [
          { key: 'fajr', name: 'Fajr' },
          { key: 'sunrise', name: 'Sunrise' },
          { key: 'dhuhr', name: 'Dhuhr' },
          { key: 'asr', name: 'Asr' },
          { key: 'maghrib', name: 'Maghrib' },
          { key: 'isha', name: 'Isha' },
        ];

        const schedule = labels
          .map(({ key, name }) => {
            const t = times[key];
            if (!t) return null;

            // API now returns local prayer times in 12h format for the requested timezone.
            // Parse using Luxon so AM/PM is respected.
            const dt = DateTime.fromFormat(String(t), 'h:mm a', {
              zone: timeZoneId,
            });
            if (!dt.isValid) {
              console.warn('⚠️ Invalid prayer time from API:', name, t);
              return null;
            }
            console.log(`🕌 ${name}: ${t} -> ${dt.toFormat('h:mm a')} (${timeZoneId})`);

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
              dateTime: slot.dateTime,
            })),
            dayLabel: selectedDate.toFormat('EEEE'),
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
  }, [calcMethod, timeZoneId, selectedDate]);

  useEffect(() => {
    axios
      .get('https://api.tashkeel.lk/videos.json')
      .then((response) => {
        const sorted = [...(response.data || [])].sort(
          (a, b) => parseInt(b.id, 10) - parseInt(a.id, 10)
        );
        setLatestBayans(sorted.slice(0, 3));
      })
      .catch(() => setLatestBayans([]));
  }, []);

  // Fetch announcements function
  const fetchAnnouncements = useCallback(() => {
    setAnnouncementsLoading(true);
    axios
      .get('https://api.tashkeel.lk/announcements.json')
      .then((response) => {
        const data = response.data || {};
        if (data.settings?.mobileEnabled === true && Array.isArray(data.announcements)) {
          setAnnouncementsEnabled(true);
          setAnnouncements(data.announcements);
        } else {
          setAnnouncementsEnabled(false);
          setAnnouncements([]);
        }
      })
      .catch(() => {
        setAnnouncementsEnabled(false);
        setAnnouncements([]);
      })
      .finally(() => {
        setAnnouncementsLoading(false);
      });
  }, []);

  // Fetch announcements on mount
  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Refresh announcements when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchAnnouncements();
    }, [fetchAnnouncements])
  );

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
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ paddingBottom: 24 + (Platform.OS === 'android' ? insets.bottom : 0) }}
    >
      <View style={styles.dateNavRow}>
        <TouchableOpacity
          style={styles.dateNavButton}
          onPress={() =>
            setSelectedDate((prev) => prev.minus({ days: 1 }))
          }
        >
          <Ionicons name="chevron-back" size={20} color="#0B4733" />
        </TouchableOpacity>
        <View style={styles.dateLabelWrapper}>
          <Text style={styles.dateLabelMain}>
            {selectedDate.hasSame(DateTime.now().setZone(timeZoneId), 'day')
              ? 'Today'
              : selectedDate.toFormat('cccc')}
          </Text>
          <Text style={styles.dateLabelSub}>
            {selectedDate.toFormat('dd LLL yyyy')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.dateNavButton}
          onPress={() =>
            setSelectedDate((prev) => prev.plus({ days: 1 }))
          }
        >
          <Ionicons name="chevron-forward" size={20} color="#0B4733" />
        </TouchableOpacity>
      </View>

      <PrayerCard
        label={locationName}
        accent="#0F8D6B"
        data={prayerState.data}
        loading={prayerState.loading}
        error={prayerState.error}
        currentDateTime={DateTime.now().setZone(timeZoneId)}
      />
      {announcementsEnabled && (
        <AnnouncementsCard
          announcements={announcements}
          loading={announcementsLoading}
        />
      )}
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
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  dateNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#d8f4ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabelWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  dateLabelMain: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B4733',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dateLabelSub: {
    fontSize: 13,
    color: '#4c6b5f',
    marginTop: 2,
  },
  sunArcContainer: {
    marginTop: 0,
    marginBottom: 30,
    marginHorizontal: 0,
    height: 100,
    position: 'relative',
  },
  sunArcCurveSegment: {
    position: 'absolute',
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  sunArcCurveSegmentActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  sunArcMarker: {
    position: 'absolute',
    alignItems: 'center',
    width: 36,
  },
  sunArcMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F5B400',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  sunArcMarkerLabel: {
    marginTop: 4,
    fontSize: 9,
    color: '#d0f0e4',
    fontWeight: '600',
    textAlign: 'center',
  },
  sunArcMarkerLabelAbove: {
    position: 'absolute',
    top: -18,
    marginTop: 0,
    marginBottom: 0,
  },
  sunArcCurrentDotContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunArcCurrentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B3D',
    borderWidth: 2,
    borderColor: '#ffffff',
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
    marginBottom: 4,
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
  announcementsCard: {
    backgroundColor: '#0F8D6B',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 0,
    shadowColor: '#0f4d3a',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  announcementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  announcementsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  announcementsSliderContainer: {
    position: 'relative',
    width: '100%',
  },
  announcementItem: {
    paddingHorizontal: 0,
    paddingVertical: 5,
  },
  announcementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    columnGap: 10,
  },
  announcementThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  announcementTitle: {
    color: '#0B4733',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  announcementMessage: {
    color: '#4c6b5f',
    fontSize: 12,
    marginBottom: 4,
  },
  announcementBody: {
    color: '#4c6b5f',
    fontSize: 12,
  },
  announcementModalContainer: {
    flex: 1,
    backgroundColor: '#ECF7F3',
  },
  announcementModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#C6EDDF',
    backgroundColor: '#ECF7F3',
  },
  announcementModalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  announcementModalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0B4733',
    flex: 1,
    textAlign: 'center',
  },
  announcementModalHeaderSpacer: {
    width: 40,
  },
  announcementModalContent: {
    flex: 1,
    padding: 16,
    paddingBottom: 36, // 20px extra space + 16px padding = 36px total
  },
  announcementModalImageContainer: {
    width: Dimensions.get('window').width - 32,
    height: Dimensions.get('window').height * 0.4,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  announcementModalImageContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: Dimensions.get('window').width - 32,
    height: Dimensions.get('window').height * 0.4,
  },
  announcementModalImage: {
    width: Dimensions.get('window').width - 32,
    height: Dimensions.get('window').height * 0.4,
    borderRadius: 12,
  },
  announcementModalShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F5B400',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14,
  },
  announcementModalShareText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#0B4733',
  },
  announcementModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0B4733',
    marginBottom: 12,
  },
  announcementModalMessage: {
    fontSize: 16,
    color: '#4c6b5f',
    lineHeight: 24,
    marginBottom: 16,
  },
  announcementModalBody: {
    fontSize: 15,
    color: '#0B4733',
    lineHeight: 24,
  },
  announcementModalHTMLContainer: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  announcementModalWebView: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  announcementIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  announcementDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  announcementDotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
});

export default HomeScreen;

