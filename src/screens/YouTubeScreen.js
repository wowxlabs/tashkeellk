import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, TextInput, StyleSheet, ScrollView, Share, Linking, Modal, Dimensions, Animated, Easing } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useNavigation, useRoute } from '@react-navigation/native';
import { logBayanPlay, logBayanShare } from '../services/analytics';

const BRAND_COLORS = {
  primary: '#0F8D6B',
  secondary: '#15A97A',
  accent: '#F5B400',
  background: '#ECF7F3',
  card: '#D1F0E4',
  textDark: '#0B4733',
  textLight: '#ffffff',
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VIDEO_PLAYER_HEIGHT = Math.min(SCREEN_HEIGHT * 0.4, 350); // 40% of screen height or max 350px

const YouTubeScreen = () => {
  const [videos, setVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [liveConfig, setLiveConfig] = useState(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const VIDEO_API_URL = 'https://www.tashkeel.lk/api/videos.json';
  const CONFIG_API_URL = 'https://www.tashkeel.lk/api/configs.json';
  
  // Animation for live indicator pulsing
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    navigation.setOptions({
      title: 'Bayans',
      headerTitleAlign: 'center',
      headerTitleStyle: { fontSize: 18, fontWeight: '600' },
    });
    fetchLocalVideos();
    fetchLiveConfig();
  }, []);

  useEffect(() => {
    if (route.params?.featuredVideo) {
      setSelectedVideo(route.params.featuredVideo);
      navigation.setParams({ featuredVideo: undefined });
    }
  }, [route.params?.featuredVideo, navigation]);

  // Start pulsing animation for live indicator when liveConfig is available
  useEffect(() => {
    if (liveConfig) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [liveConfig, pulseAnim]);

  const fetchLocalVideos = async () => {
    try {
      const response = await axios.get(VIDEO_API_URL);
      const sorted = (response.data || []).sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      setVideos(sorted);
    } catch (error) {
      console.error('Error fetching Tashkeel videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveConfig = async () => {
    try {
      const response = await axios.get(CONFIG_API_URL);
      if (response.data?.youtube?.live?.enabled) {
        setLiveConfig(response.data.youtube.live);
      }
    } catch (error) {
      console.error('Error fetching live config:', error);
    }
  };

  const filteredVideos = videos.filter((video) =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const extractVideoId = (url) => {
    if (!url) return '';
    // Try to extract video ID from various YouTube URL formats
    // Standard: https://www.youtube.com/watch?v=VIDEO_ID
    // Short: https://youtu.be/VIDEO_ID
    // Embed: https://www.youtube.com/embed/VIDEO_ID
    // Live channel: https://www.youtube.com/@channel/live (will return empty, need special handling)
    const regex = /(?:v=|\/)([0-9A-Za-z_-]{11})(?:\?|&|$)/;
    const match = url.match(regex);
    return match ? match[1] : '';
  };

  const extractChannelHandle = (url) => {
    if (!url) return '';
    // Extract channel handle from URLs like: https://www.youtube.com/@tashkeellk/live
    const match = url.match(/youtube\.com\/@([^\/]+)/);
    return match ? match[1] : '';
  };

  const cleanMarkdown = (text) => {
    if (!text) return '';
    // Remove bold markdown (**)
    let cleaned = text.replace(/\*\*(.*?)\*\*/g, '$1');
    // Remove single asterisks
    cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
    // Remove markdown headers (#)
    cleaned = cleaned.replace(/#+\s*/g, '');
    // Convert markdown links to plain text (e.g., [text](url) -> text)
    cleaned = cleaned.replace(/\[(.*?)\]\(.*?\)/g, '$1');
    return cleaned.trim();
  };

  const renderVideoCard = ({ item }) => (
    <TouchableOpacity style={styles.videoItem} onPress={() => setSelectedVideo(item)}>
      <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle}>{item.title}</Text>
        <Text style={styles.videoDate}>{new Date(item.date).toDateString()}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
      </View>
    );
  }

  // Handle live mode - check if we have a video ID or need to use channel
  const liveVideoId = liveConfig ? extractVideoId(liveConfig.url) : '';
  const liveChannelHandle = liveConfig && !liveVideoId ? extractChannelHandle(liveConfig.url) : '';

  return (
    <View style={styles.container}>
      {/* Video Player Modal */}
      <Modal
        visible={!!selectedVideo}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedVideo(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {selectedVideo?.title}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setSelectedVideo(null)}
              >
                <Ionicons name="close" size={24} color={BRAND_COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {selectedVideo && (() => {
              const videoId = extractVideoId(selectedVideo.videoUrl);
              console.log('📹 Video ID extracted:', videoId, 'from URL:', selectedVideo.videoUrl);
              return (
                <>
                  <View style={styles.playerContainer}>
                    {videoId ? (
                      <YoutubePlayer
                        height={VIDEO_PLAYER_HEIGHT}
                        width={SCREEN_WIDTH}
                        play
                        videoId={videoId}
                        initialPlayerParams={{
                          controls: true,
                          modestbranding: true,
                        }}
                        onChangeState={(state) => {
                          console.log('🎬 Player state:', state);
                          if (state === 'ended') {
                            setSelectedVideo(null);
                          }
                          if (state === 'playing') {
                            logBayanPlay(selectedVideo.id?.toString() || selectedVideo.videoUrl, selectedVideo.title);
                          }
                        }}
                      />
                    ) : (
                      <View style={styles.playerErrorContainer}>
                        <Text style={styles.playerErrorText}>Unable to load video</Text>
                        <Text style={styles.playerErrorSubtext}>{selectedVideo.videoUrl}</Text>
                      </View>
                    )}
                  </View>

                  <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.modalVideoMeta}>
                      <Text style={styles.metaLabel}>Published</Text>
                      <Text style={styles.metaValue}>{new Date(selectedVideo.date).toDateString()}</Text>
                      <Text style={[styles.metaLabel, styles.metaLabelSpacing]}>Description</Text>
                      <Text style={styles.metaValue}>{cleanMarkdown(selectedVideo.description)}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.modalShareButton}
                      onPress={async () => {
                        await logBayanShare(selectedVideo.id?.toString() || selectedVideo.videoUrl, selectedVideo.title);
                        Share.share({
                          title: selectedVideo.title,
                          message: `${selectedVideo.title}\n\nWatch now: ${selectedVideo.videoUrl}`,
                          url: selectedVideo.videoUrl,
                        });
                      }}
                    >
                      <Text style={styles.shareText}>Share This Video</Text>
                      <Ionicons name="share-social" size={18} color={BRAND_COLORS.textDark} />
                    </TouchableOpacity>
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Live Stream Modal */}
      <Modal
        visible={isLiveMode}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsLiveMode(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.liveBadgeInline}>
                <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
              <Text style={styles.modalTitle}>
                {liveConfig?.label || 'Live Stream'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsLiveMode(false)}
              >
                <Ionicons name="close" size={24} color={BRAND_COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {liveVideoId ? (
              <View style={styles.playerContainer}>
                <YoutubePlayer
                  height={VIDEO_PLAYER_HEIGHT}
                  width={SCREEN_WIDTH}
                  play
                  videoId={liveVideoId}
                  onChangeState={(state) => {
                    if (state === 'playing') {
                      logBayanPlay('live', liveConfig?.label || 'Live Stream');
                    }
                  }}
                />
              </View>
            ) : liveConfig?.url ? (
              <View style={[styles.webViewContainer, { height: VIDEO_PLAYER_HEIGHT }]}>
                <WebView
                  source={{ uri: liveConfig.url }}
                  style={styles.webView}
                  allowsFullscreenVideo={true}
                  mediaPlaybackRequiresUserAction={false}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={true}
                  scalesPageToFit={true}
                  onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.error('WebView error:', nativeEvent);
                  }}
                  onHttpError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.error('WebView HTTP error:', nativeEvent);
                  }}
                  onLoadEnd={() => {
                    logBayanPlay('live', liveConfig?.label || 'Live Stream');
                  }}
                />
              </View>
            ) : (
              <View style={styles.livePlaceholder}>
                <Ionicons name="tv-outline" size={64} color="#fff" style={{ opacity: 0.5 }} />
                <Text style={styles.livePlaceholderText}>
                  Live stream is not available
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Video List */}
      <FlatList
          data={filteredVideos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderVideoCard}
          ListEmptyComponent={
            <Text style={styles.emptyState}>No videos match “{searchQuery}”.</Text>
          }
          ListHeaderComponent={
            <View style={styles.searchSection}>
              {liveConfig && (
                <TouchableOpacity
                  style={styles.liveCard}
                  onPress={() => setIsLiveMode(true)}
                >
                  <View style={styles.liveCardLeft}>
                    <View style={styles.liveCardIcon}>
                      <Ionicons name="radio" size={24} color="#fff" />
                    </View>
                    <View style={styles.liveCardInfo}>
                      <Text style={styles.liveCardLabel}>LIVE NOW</Text>
                      <Text style={styles.liveCardTitle}>{liveConfig.label || 'Watch Live'}</Text>
                    </View>
                  </View>
                  <View style={styles.liveIndicator}>
                    <Animated.View style={[styles.livePulseDot, { opacity: pulseAnim }]} />
                    <Text style={styles.liveIndicatorText}>LIVE</Text>
                  </View>
                </TouchableOpacity>
              )}
              <Text style={styles.sectionIntro}>
                Browse the latest Tashkeel TV uploads or search for specific lecturers, series names,
                or topics (e.g., "Dua", "Jumuah", "Uwaisul Qarni"). Use the bar below to jump straight
                to the message you need.
              </Text>
              <View style={styles.counterCard}>
                <View style={styles.counterIcon}>
                  <Ionicons name="flash" size={22} color="#F5B400" />
                </View>
                <View style={styles.counterInfo}>
                  <Text style={styles.counterLabel}>Total Bayans</Text>
                  <Text style={styles.counterValue}>{videos.length}</Text>
                </View>
                <Text style={styles.counterBadge}>LIVE</Text>
              </View>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search videos..."
                  placeholderTextColor="#4c6b5f"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <TouchableOpacity style={styles.searchButton} onPress={() => {}}>
                  <Ionicons name="search" size={18} color={BRAND_COLORS.textDark} />
                </TouchableOpacity>
              </View>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 40 }}
        />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
    paddingBottom: 10,
  },
  searchSection: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#cfe7db',
    backgroundColor: '#f6fffa',
    padding: 14,
    shadowColor: '#0f4d3a',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionIntro: {
    color: '#0B4733',
    marginBottom: 12,
    lineHeight: 20,
    fontWeight: '600',
  },
  counterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F8D6B',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#b6e3d4',
    shadowColor: '#0f4d3a',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  counterIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#134d3b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterInfo: {
    flex: 1,
    marginLeft: 16,
  },
  counterValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  counterLabel: {
    color: '#dff4ec',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  counterBadge: {
    backgroundColor: '#F5B400',
    color: '#0B4733',
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
  },
  searchContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.card,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#B6E3D4',
  },
  searchInput: {
    flex: 1,
    color: BRAND_COLORS.textDark,
    paddingVertical: 10,
    paddingRight: 48,
    fontSize: 15,
  },
  searchButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLORS.accent,
  },
  videoItem: {
    flexDirection: 'row',
    marginBottom: 15,
    padding: 12,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    shadowColor: '#0f4d3a',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  thumbnail: {
    width: 150,
    height: 90,
  },
  videoInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: BRAND_COLORS.textDark,
  },
  videoDate: {
    fontSize: 12,
    color: '#4c6b5f',
    marginTop: 6,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#031a14',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoScrollContent: {
    paddingBottom: 30,
  },
  videoPlayingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  backButton: {
    marginTop: 6,
    marginBottom: 10,
    paddingVertical: 11,
    paddingHorizontal: 24,
    backgroundColor: BRAND_COLORS.accent,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    alignSelf: 'stretch',
  },
  backText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND_COLORS.textDark,
  },
  shareButton: {
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#d9ede2',
  },
  shareText: {
    color: BRAND_COLORS.textDark,
    fontWeight: '600',
    fontSize: 15,
  },
  videoMeta: {
    width: '100%',
    marginTop: 0,
    backgroundColor: '#0b281f',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  metaLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaLabelSpacing: {
    marginTop: 12,
  },
  metaValue: {
    color: '#fff',
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
  },
  emptyState: {
    marginTop: 32,
    textAlign: 'center',
    color: '#4c6b5f',
    fontSize: 16,
  },
  liveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#d32f2f',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#ff5252',
    shadowColor: '#d32f2f',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  liveCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  liveCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  liveCardInfo: {
    flex: 1,
  },
  liveCardLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  liveCardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  liveIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  liveHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d32f2f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  liveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  livePlaceholder: {
    height: 250,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  livePlaceholderText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
    lineHeight: 20,
  },
  openLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d32f2f',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    columnGap: 8,
  },
  openLiveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playerContainer: {
    width: '100%',
    backgroundColor: '#000',
  },
  webViewContainer: {
    width: '100%',
    backgroundColor: '#000',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND_COLORS.textDark,
    marginRight: 12,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND_COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    maxHeight: 400,
  },
  modalVideoMeta: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  modalShareButton: {
    marginTop: 8,
    marginHorizontal: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: BRAND_COLORS.accent,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
  },
  liveBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d32f2f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
});

export default YouTubeScreen;