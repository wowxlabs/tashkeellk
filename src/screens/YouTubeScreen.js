import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, TextInput, StyleSheet, ScrollView, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useNavigation, useRoute } from '@react-navigation/native';

const BRAND_COLORS = {
  primary: '#0F8D6B',
  secondary: '#15A97A',
  accent: '#F5B400',
  background: '#ECF7F3',
  card: '#D1F0E4',
  textDark: '#0B4733',
  textLight: '#ffffff',
};

const YouTubeScreen = () => {
  const [videos, setVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const navigation = useNavigation();
  const route = useRoute();
  const VIDEO_API_URL = 'https://www.tashkeel.lk/api/videos.json';

  useEffect(() => {
    navigation.setOptions({
      title: 'Bayans',
      headerTitleAlign: 'center',
      headerTitleStyle: { fontSize: 18, fontWeight: '600' },
    });
    fetchLocalVideos();
  }, []);

  useEffect(() => {
    if (route.params?.featuredVideo) {
      setSelectedVideo(route.params.featuredVideo);
      navigation.setParams({ featuredVideo: undefined });
    }
  }, [route.params?.featuredVideo, navigation]);

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

  const filteredVideos = videos.filter((video) =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const extractVideoId = (url) => {
    if (!url) return '';
    const regex = /(?:v=|\/)([0-9A-Za-z_-]{11})(?:\?|&|$)/;
    const match = url.match(regex);
    return match ? match[1] : '';
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

  return (
    <View style={styles.container}>
      {selectedVideo ? (
        <ScrollView contentContainerStyle={styles.videoScrollContent}>
          <View style={styles.videoContainer}>
            <Text style={styles.videoPlayingTitle}>{selectedVideo.title}</Text>

            <YoutubePlayer
              height={250}
              width="100%"
              play
              videoId={extractVideoId(selectedVideo.videoUrl)}
              onChangeState={(state) => {
                if (state === 'ended') setSelectedVideo(null);
              }}
            />

            <TouchableOpacity
              style={styles.shareButton}
              onPress={() =>
                Share.share({
                  title: selectedVideo.title,
                  message: `${selectedVideo.title}\n\nWatch now: ${selectedVideo.videoUrl}`,
                  url: selectedVideo.videoUrl,
                })
              }
            >
              <Text style={styles.shareText}>Share This Video</Text>
              <Ionicons name="share-social" size={18} color={BRAND_COLORS.textDark} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => setSelectedVideo(null)}>
              <Text style={styles.backText}>Back to Bayans</Text>
              <Ionicons name="arrow-undo" size={18} color={BRAND_COLORS.textDark} />
            </TouchableOpacity>

            <View style={styles.videoMeta}>
              <Text style={styles.metaLabel}>Published</Text>
              <Text style={styles.metaValue}>{new Date(selectedVideo.date).toDateString()}</Text>
              <Text style={[styles.metaLabel, styles.metaLabelSpacing]}>Description</Text>
              <Text style={styles.metaValue}>{selectedVideo.description?.trim()}</Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredVideos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderVideoCard}
          ListEmptyComponent={
            <Text style={styles.emptyState}>No videos match “{searchQuery}”.</Text>
          }
          ListHeaderComponent={
            <View style={styles.searchSection}>
              <Text style={styles.sectionIntro}>
                Browse the latest Tashkeel TV uploads or search for specific lecturers, series names,
                or topics (e.g., “Dua”, “Jumuah”, “Uwaisul Qarni”). Use the bar below to jump straight
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
      )}
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
});

export default YouTubeScreen;