import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, TextInput, StyleSheet } from 'react-native';
import axios from 'axios';
import YoutubePlayer from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';
import defaultBanner from '../../assets/images/tashkeel_banner.jpg';
import { useNavigation } from '@react-navigation/native';
//import { YOUTUBE_API_KEY } from '@env';



//const YOUTUBE_API_KEY = YOUTUBE_API_KEY;
const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
const CHANNEL_ID = 'UCImOLohgybSanlcxsNhnPRQ'; // Your YouTube channel ID
const BASE_VIDEO_API_URL = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&order=date&maxResults=10`;
const CHANNEL_API_URL = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${CHANNEL_ID}&key=${YOUTUBE_API_KEY}`;

const YouTubeScreen = () => {
 const [videos, setVideos] = useState([]);
 const [searchQuery, setSearchQuery] = useState('');
 const [loading, setLoading] = useState(true);
 const [loadingMore, setLoadingMore] = useState(false);
 const [nextPageToken, setNextPageToken] = useState(null);
 const [selectedVideo, setSelectedVideo] = useState(null);
 const [channelInfo, setChannelInfo] = useState(null);
 const navigation = useNavigation();

 useEffect(() => {
 navigation.setOptions({
       title: 'Sermons',  // Set the correct title
       headerTitleAlign: 'center',  // Center the title
       headerTitleStyle: { fontSize: 30, fontWeight: 'bold',  } // Optional styling
     });
 fetchChannelInfo();
 fetchVideos();
 }, []);

 const fetchChannelInfo = async () => {
 try {
 const response = await axios.get(CHANNEL_API_URL);
 const channelData = response.data.items[0];

 setChannelInfo({
 ...channelData,
 bannerImage: channelData.brandingSettings?.image?.bannerExternalUrl || null, // Get the banner image
 });
 } catch (error) {
 console.error('Error fetching YouTube channel info:', error);
 }
 };


 const fetchVideos = async (pageToken = '', query = '') => {
 try {
 let apiUrl = `${BASE_VIDEO_API_URL}&pageToken=${pageToken}`;
 if (query) {
 apiUrl += `&q=${query}`;
 }
 const response = await axios.get(apiUrl);
 const videoList = response.data.items.filter(item => item.id.videoId);
 setVideos(pageToken ? [...videos, ...videoList] : videoList); // Reset list if new search, else append
 setNextPageToken(response.data.nextPageToken || null);
 setLoading(false);
 setLoadingMore(false);
 } catch (error) {
 console.error('Error fetching YouTube videos:', error);
 setLoading(false);
 setLoadingMore(false);
 }
 };

 const handleSearch = () => {
 setLoading(true);
 fetchVideos('', searchQuery); // Fetch new search results
 };

 const loadMoreVideos = () => {
 if (nextPageToken && !loadingMore) {
 setLoadingMore(true);
 fetchVideos(nextPageToken, searchQuery);
 }
 };

 return (
 <View style={styles.container}>
 {selectedVideo ? (
 <View style={styles.videoContainer}>
 {/* Video Title */}
 <Text style={styles.videoPlayingTitle}>{selectedVideo.title}</Text>

 <YoutubePlayer
 height={300}
 width="100%"
 play={true}
 videoId={selectedVideo}
 onChangeState={(state) => {
 if (state === 'ended') setSelectedVideo(null);
 }}
 />
 <TouchableOpacity style={styles.backButton} onPress={() => setSelectedVideo(null)}>
 <Text style={styles.backText}>⬅️ Back to Sermons</Text>
 </TouchableOpacity>
 </View>
 ) : (
 <FlatList
 data={videos}
 keyExtractor={(item) => item.id.videoId}
 renderItem={({ item }) => (
 <TouchableOpacity style={styles.videoItem} onPress={() => setSelectedVideo(item.id.videoId)}>
 <Image source={{ uri: item.snippet.thumbnails.high.url }} style={styles.thumbnail} />
 <View style={styles.videoInfo}>
 <Text style={styles.videoTitle}>{item.snippet.title}</Text>
 <Text style={styles.videoDate}>{new Date(item.snippet.publishedAt).toDateString()}</Text>
 </View>
 </TouchableOpacity>
 )}
 onEndReached={loadMoreVideos}
 onEndReachedThreshold={0.5}
 ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#28a745" /> : null}
 ListHeaderComponent={
 <View>
 {channelInfo && (
 <View style={styles.channelHeader}>
 <Image
 source={channelInfo.bannerImage ? { uri: channelInfo.bannerImage } : defaultBanner}
 style={styles.bannerImage}
 />
 <View style={styles.channelDetails}>
 <Image source={{ uri: channelInfo.snippet.thumbnails.default.url }} style={styles.profileImage} />
 <View>
 <Text style={styles.channelName}>{channelInfo.snippet.title}</Text>
 <Text style={styles.channelStats}>
 {channelInfo.statistics.subscriberCount} subscribers • {channelInfo.statistics.videoCount} videos
 </Text>
 </View>
 </View>
 </View>
 )}
 <View style={styles.searchContainer}>
 <TextInput
 style={styles.searchInput}
 placeholder="Search videos..."
 placeholderTextColor="#aaa"
 value={searchQuery}
 onChangeText={setSearchQuery}
 onSubmitEditing={handleSearch}
 />
 <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
 <Text style={styles.searchButtonText}>🔍</Text>
 </TouchableOpacity>
 </View>
 </View>
 }
 />
 )}
 </View>
 );
};

const styles = StyleSheet.create({
 container: {
 flex: 1,
 backgroundColor: '#181818',
 paddingBottom: 10,
 },
 channelHeader: {
 backgroundColor: '#202020',
 paddingBottom: 20,
 },
 bannerImage: {
 width: '100%',
 height: 150,
 resizeMode: 'cover',
 },
 channelDetails: {
 flexDirection: 'row',
 alignItems: 'center',
 paddingHorizontal: 15,
 marginTop: -30,
 },
 profileImage: {
 width: 70,
 height: 70,
 borderRadius: 35,
 borderWidth: 3,
 borderColor: '#fff',
 },
 channelName: {
 fontSize: 20,
 fontWeight: 'bold',
 color: '#fff',
 marginLeft: 15,
 },
 channelStats: {
 fontSize: 14,
 color: '#aaa',
 marginLeft: 15,
 },
 searchContainer: {
 flexDirection: 'row',
 alignItems: 'center',
 margin: 10,
 backgroundColor: '#333',
 borderRadius: 8,
 paddingHorizontal: 10,
 },
 searchInput: {
 flex: 1,
 color: '#fff',
 padding: 10,
 },
 searchButton: {
 padding: 10,
 },
 searchButtonText: {
 color: '#fff',
 fontSize: 18,
 },
 videoItem: {
 flexDirection: 'row',
 marginBottom: 15,
 paddingHorizontal: 15,
 },
 thumbnail: {
 width: 150,
 height: 90,
 borderRadius: 8,
 },
 videoInfo: {
 flex: 1,
 marginLeft: 10,
 justifyContent: 'center',
 },
 videoTitle: {
 fontSize: 14,
 fontWeight: 'bold',
 color: '#fff',
 },
 videoDate: {
 fontSize: 12,
 color: '#aaa',
 marginTop: 5,
 },
 videoContainer: {
 flex: 1,
 backgroundColor: '#000',
 padding: 15,
 justifyContent: 'center',
 alignItems: 'center',
 },
 backButton: {
 marginTop: 20,
 padding: 15,
 backgroundColor: '#007bff',
 borderRadius: 8,
 alignItems: 'center',
 width: '90%',
 },
 backText: {
 fontSize: 16,
 fontWeight: 'bold',
 color: '#fff',
 },
});

export default YouTubeScreen;