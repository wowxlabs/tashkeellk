import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import BannerAd from '../components/BannerAd';

const NewsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(null);

  const fetchNews = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      let url = 'https://api.tashkeel.lk/v1/news';
      const params = {
        page: pageNum,
        limit: 20,
      };

      // Use search API if there's a search term or language filter
      if (searchQuery || selectedLanguage) {
        url = 'https://api.tashkeel.lk/v1/news/search';
        if (searchQuery) {
          params.title = searchQuery;
        }
        if (selectedLanguage) {
          params.language = selectedLanguage;
        }
      }

      const response = await axios.get(url, {
        params,
        headers: {
          Accept: 'application/json',
        },
      });

      const newNews = response.data?.data || response.data || [];
      
      // Debug: Log first news item to see available fields
      if (newNews.length > 0) {
        console.log('News item fields:', Object.keys(newNews[0]));
        console.log('First news item:', newNews[0]);
      }
      
      if (isRefresh || pageNum === 1) {
        setNews(newNews);
      } else {
        setNews((prev) => [...prev, ...newNews]);
      }

      // Check if there's more data
      setHasMore(newNews.length === 20); // Assuming 20 items per page
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [searchQuery, selectedLanguage]);

  useEffect(() => {
    fetchNews(1);
  }, [fetchNews]);

  const handleRefresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    fetchNews(1, true);
  }, [fetchNews]);

  const handleSearch = useCallback((text) => {
    setSearchQuery(text);
    setPage(1);
    setHasMore(true);
  }, []);

  const handleLanguageFilter = useCallback((language) => {
    setSelectedLanguage(language);
    setPage(1);
    setHasMore(true);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchNews(page + 1);
    }
  }, [loadingMore, hasMore, page, fetchNews]);

  const renderNewsItem = ({ item }) => {
    const imageUri = item.image
      ? item.image.startsWith('http')
        ? item.image
        : `https://api.tashkeel.lk${item.image.startsWith('/') ? '' : '/'}${item.image}`
      : null;

    const newsId = item.id || item._id || item.newsId || item.news_id;
    
    return (
      <TouchableOpacity
        style={styles.newsCard}
        onPress={() => {
          console.log('Navigating to news detail with ID:', newsId, 'Item:', item);
          navigation.navigate('News Detail', { newsId });
        }}
      >
        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.newsImage} resizeMode="cover" />
        )}
        <View style={styles.newsContent}>
          <Text style={styles.newsTitle} numberOfLines={2}>
            {item.title || item.headline || 'Untitled'}
          </Text>
          <View style={styles.newsDateContainer}>
            {item.label && (
              <View style={styles.newsLabelContainer}>
                <Text style={styles.newsLabelText}>{item.label}</Text>
              </View>
            )}
            <Text style={styles.newsDateLabel}>Published: </Text>
            <Text style={styles.newsDate}>
              {(item.date || item.createdAt || item.publishedAt) 
                ? new Date(item.date || item.publishedAt || item.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'N/A'}
            </Text>
          </View>
          <View style={styles.summaryContainer}>
            {(item.summary || item.description || item.excerpt || item.body) ? (
              <Text style={styles.newsSummary} numberOfLines={3}>
                {item.summary || item.description || item.excerpt || 
                 (item.body ? item.body.replace(/<[^>]*>/g, '').substring(0, 150) + '...' : '')}
              </Text>
            ) : (
              <Text style={styles.newsSummary} numberOfLines={1}>
                {item.content ? item.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...' : 'No description available'}
              </Text>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#0B4733" />
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#0F8D6B" />
      </View>
    );
  };

  if (loading && news.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0F8D6B" />
      </View>
    );
  }

  const languages = [
    { label: 'English', value: 'english' },
    { label: 'Tamil', value: 'tamil' },
    { label: 'Sinhala', value: 'sinhala' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.searchDescription}>
          Search for news articles by title or filter by language
        </Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#6a8d80" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search news..."
            placeholderTextColor="#9bcfbd"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearch('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#6a8d80" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.languageFilters}>
          <TouchableOpacity
            style={[
              styles.languageButton,
              selectedLanguage === null && styles.languageButtonActive,
            ]}
            onPress={() => handleLanguageFilter(null)}
          >
            <Text
              style={[
                styles.languageButtonText,
                selectedLanguage === null && styles.languageButtonTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.value}
              style={[
                styles.languageButton,
                selectedLanguage === lang.value && styles.languageButtonActive,
              ]}
              onPress={() => handleLanguageFilter(lang.value)}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  selectedLanguage === lang.value && styles.languageButtonTextActive,
                ]}
              >
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FlatList
        data={news}
        renderItem={renderNewsItem}
        keyExtractor={(item, index) => `news-${item.id || item._id || item.newsId || item.news_id || index}`}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: (styles.listContent?.paddingBottom || 0) + (Platform.OS === 'android' ? insets.bottom : 0) }
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={64} color="#9bcfbd" />
            <Text style={styles.emptyText}>No news available</Text>
          </View>
        }
      />
      <BannerAd />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECF7F3',
  },
  searchContainer: {
    backgroundColor: '#ECF7F3',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchDescription: {
    fontSize: 13,
    color: '#6a8d80',
    marginBottom: 10,
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0B4733',
  },
  clearButton: {
    marginLeft: 8,
  },
  languageFilters: {
    flexDirection: 'row',
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#9bcfbd',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageButtonActive: {
    backgroundColor: '#0B4733',
    borderColor: '#0B4733',
  },
  languageButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6a8d80',
    textAlign: 'center',
  },
  languageButtonTextActive: {
    color: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECF7F3',
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,
  },
  newsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#0f4d3a',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  newsImage: {
    width: 100,
    height: 100,
    backgroundColor: '#f0f0f0',
  },
  newsContent: {
    flex: 1,
    padding: 12,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B4733',
    marginBottom: 4,
  },
  summaryContainer: {
    marginTop: 4,
    marginBottom: 4,
    minHeight: 50,
  },
  newsSummary: {
    fontSize: 14,
    color: '#4c6b5f',
    lineHeight: 20,
  },
  newsDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 6,
    marginBottom: 8,
    paddingTop: 3,
    paddingBottom: 3,
    paddingHorizontal: 6,
    backgroundColor: '#f0f9f6',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  newsDateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0B4733',
    marginRight: 4,
  },
  newsDate: {
    fontSize: 11,
    color: '#4c6b5f',
    fontWeight: '500',
  },
  newsLabelContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#0B4733',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  newsLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6a8d80',
    marginTop: 16,
  },
});

export default NewsScreen;

