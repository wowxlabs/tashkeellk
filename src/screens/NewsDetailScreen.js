import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import axios from 'axios';
import BannerAd from '../components/BannerAd';
import NativeAd from '../components/NativeAd';

const { width } = Dimensions.get('window');

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
  
  // Convert relative image URLs in img src attributes - handle both single and double quotes
  processedHTML = processedHTML.replace(
    /<img([^>]*?)src\s*=\s*(["'])([^"']+)\2([^>]*?)>/gi,
    (match, before, quote, src, after) => {
      const absoluteSrc = makeAbsoluteUrl(src.trim());
      console.log('Converting image URL:', src.trim(), '->', absoluteSrc);
      return `<img${before}src=${quote}${absoluteSrc}${quote}${after}>`;
    }
  );
  
  // Also handle src without quotes
  processedHTML = processedHTML.replace(
    /<img([^>]*?)src\s*=\s*([^\s>]+)([^>]*?)>/gi,
    (match, before, src, after) => {
      // Only process if it doesn't already have quotes (handled above)
      if (!src.includes('"') && !src.includes("'")) {
        const absoluteSrc = makeAbsoluteUrl(src.trim());
        console.log('Converting unquoted image URL:', src.trim(), '->', absoluteSrc);
        return `<img${before}src="${absoluteSrc}"${after}>`;
      }
      return match;
    }
  );
  
  // Also handle images in style attributes (background-image)
  processedHTML = processedHTML.replace(
    /style\s*=\s*(["'])([^"']*background-image[^"']*url\(['"]?)([^"')]+)(['"]?\)[^"']*)\1/gi,
    (match, quote, before, url, after) => {
      const absoluteUrl = makeAbsoluteUrl(url.trim());
      console.log('Converting background image URL:', url.trim(), '->', absoluteUrl);
      return `style=${quote}${before}${absoluteUrl}${after}${quote}`;
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
        <script>
          // Fix any remaining relative image URLs and handle image loading
          (function() {
            document.addEventListener('DOMContentLoaded', function() {
              var images = document.getElementsByTagName('img');
              for (var i = 0; i < images.length; i++) {
                var img = images[i];
                var src = img.getAttribute('src');
                
                // Fix relative URLs
                if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
                  if (src.startsWith('/')) {
                    src = 'https://api.tashkeel.lk' + src;
                  } else {
                    src = 'https://api.tashkeel.lk/' + src;
                  }
                  img.setAttribute('src', src);
                  console.log('Fixed image URL to:', src);
                }
                
                // Log image loading errors
                img.onerror = function() {
                  console.error('Image failed to load:', this.src);
                };
                
                img.onload = function() {
                  console.log('Image loaded successfully:', this.src);
                };
              }
            });
          })();
        </script>
      </head>
      <body>
        ${processedContent}
      </body>
    </html>
  `;
};

const NewsDetailScreen = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const { newsId } = route.params || {};
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contentHeight, setContentHeight] = useState(500);
  const [bodyHeight, setBodyHeight] = useState(500);
  const [moreNews, setMoreNews] = useState([]);
  const [loadingMoreNews, setLoadingMoreNews] = useState(false);

  useEffect(() => {
    const fetchNewsDetail = async () => {
      if (!newsId) {
        console.error('No newsId provided');
        setError('No news ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Fetching news detail for ID:', newsId);
        
        const response = await axios.get(`https://api.tashkeel.lk/v1/news/${newsId}`, {
          headers: {
            Accept: 'application/json',
          },
        });

        console.log('News detail response:', response.data);
        const newsData = response.data?.data || response.data;
        
        if (!newsData) {
          throw new Error('No news data received');
        }
        
        console.log('News data fields:', Object.keys(newsData));
        console.log('Date fields:', {
          date: newsData.date,
          createdAt: newsData.createdAt,
          publishedAt: newsData.publishedAt,
          updatedAt: newsData.updatedAt,
        });
        
        setNews(newsData);
      } catch (error) {
        console.error('Error fetching news detail:', error);
        console.error('Error response:', error.response?.data);
        setError(error.response?.data?.message || error.message || 'Failed to load news');
      } finally {
        setLoading(false);
      }
    };

    fetchNewsDetail();
  }, [newsId]);

  useEffect(() => {
    const fetchMoreNews = async () => {
      if (!news) return;
      
      try {
        setLoadingMoreNews(true);
        const response = await axios.get('https://api.tashkeel.lk/v1/news', {
          params: {
            page: 1,
            limit: 5,
          },
          headers: {
            Accept: 'application/json',
          },
        });

        const allNews = response.data?.data || response.data || [];
        // Filter out the current news item
        const currentNewsId = news.id || news._id || news.newsId || news.news_id;
        const filteredNews = allNews.filter((item) => {
          const itemId = item.id || item._id || item.newsId || item.news_id;
          return itemId !== currentNewsId;
        });
        
        // Take first 4 items
        setMoreNews(filteredNews.slice(0, 4));
      } catch (error) {
        console.error('Error fetching more news:', error);
      } finally {
        setLoadingMoreNews(false);
      }
    };

    fetchMoreNews();
  }, [news]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0F8D6B" />
      </View>
    );
  }

  if (error || (!loading && !news)) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#9bcfbd" />
        <Text style={styles.errorText}>
          {error || 'News not found'}
        </Text>
        {newsId && (
          <Text style={styles.errorSubText}>News ID: {newsId}</Text>
        )}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUri = news.image
    ? news.image.startsWith('http')
      ? news.image
      : `https://api.tashkeel.lk${news.image.startsWith('/') ? '' : '/'}${news.image}`
    : null;

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 16 + (Platform.OS === 'android' ? insets.bottom : 0) }
        ]}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.content}>
          {news.headline && (
            <Text style={styles.headline}>{news.headline}</Text>
          )}
          
          {news.title && !news.headline && (
            <Text style={styles.headline}>{news.title}</Text>
          )}
          
          <View style={styles.metaRow}>
            <View style={styles.dateContainer}>
              <Text style={styles.dateLabel}>Published on: </Text>
              <Text style={styles.date}>
                {(news.date || news.createdAt || news.publishedAt)
                  ? new Date(news.date || news.publishedAt || news.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'N/A'}
              </Text>
            </View>
          </View>
          
          {news.label && (
            <View style={styles.labelContainer}>
              <Text style={styles.labelText}>{news.label}</Text>
            </View>
          )}
          
          {news.summary && (
            <Text style={styles.summary}>{news.summary}</Text>
          )}
          
          {/* Native Ad - Inline */}
          {/* Temporarily disabled due to ad unit ID configuration issue */}
          {/* <NativeAd /> */}
          
          {news.content && (
            <View style={styles.htmlContainer}>
              <WebView
                source={{ 
                  html: createHTMLContent(news.content),
                  baseUrl: 'https://api.tashkeel.lk'
                }}
                style={[styles.webView, { height: contentHeight }]}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                originWhitelist={['*']}
                mixedContentMode="always"
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('WebView error loading content:', nativeEvent);
                }}
                onHttpError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('WebView HTTP error:', nativeEvent);
                }}
                onLoadEnd={() => {
                  // Trigger height calculation after WebView loads
                  setTimeout(() => {
                    // Height will be calculated by injected JavaScript
                  }, 100);
                }}
                onMessage={(event) => {
                  try {
                    const height = parseInt(event.nativeEvent.data, 10);
                    if (height && height > 0 && !isNaN(height) && height < 50000) { // Max 50000px to prevent infinite
                      const newHeight = Math.min(height + 50, 10000); // Max 10000px, add 50px padding
                      console.log('Content height calculated:', height, '->', newHeight);
                      setContentHeight((prevHeight) => {
                        // Only update if height changed significantly (more than 50px difference)
                        if (Math.abs(prevHeight - newHeight) > 50 || prevHeight < 600) {
                          return Math.max(newHeight, 500); // Minimum 500px
                        }
                        return prevHeight;
                      });
                    }
                  } catch (e) {
                    console.error('Error parsing height:', e);
                  }
                }}
                injectedJavaScript={`
                  (function() {
                    var lastHeight = 0;
                    var updateCount = 0;
                    var maxUpdates = 5; // Limit number of updates
                    
                    function updateHeight() {
                      if (updateCount >= maxUpdates) return;
                      
                      try {
                        var body = document.body;
                        // Use body.scrollHeight which is the actual content height
                        var height = body.scrollHeight || body.offsetHeight || 500;
                        
                        // Sanity check - height should be reasonable
                        if (height > 0 && height < 50000) {
                          // Only send if height changed significantly
                          if (Math.abs(height - lastHeight) > 10 || lastHeight === 0) {
                            lastHeight = height;
                            console.log('Content height calculated:', height);
                            if (window.ReactNativeWebView) {
                              window.ReactNativeWebView.postMessage(height.toString());
                              updateCount++;
                            }
                          }
                        }
                      } catch(e) {
                        console.error('Error calculating height:', e);
                      }
                    }
                    
                    // Initial height calculation
                    updateHeight();
                    
                    // Wait for images to load
                    var images = document.getElementsByTagName('img');
                    var imagesLoaded = 0;
                    var totalImages = images.length;
                    
                    if (totalImages === 0) {
                      updateHeight();
                    } else {
                      for (var i = 0; i < images.length; i++) {
                        if (images[i].complete) {
                          imagesLoaded++;
                        } else {
                          images[i].onload = function() {
                            imagesLoaded++;
                            if (imagesLoaded === totalImages) {
                              updateHeight();
                            }
                          };
                          images[i].onerror = function() {
                            imagesLoaded++;
                            if (imagesLoaded === totalImages) {
                              updateHeight();
                            }
                          };
                        }
                      }
                      if (imagesLoaded === totalImages) {
                        updateHeight();
                      }
                    }
                    
                    // Update height a few times, but limit it
                    setTimeout(updateHeight, 300);
                    setTimeout(updateHeight, 800);
                    setTimeout(updateHeight, 1500);
                  })();
                `}
              />
            </View>
          )}
          
          {news.body && (
            <View style={styles.htmlContainer}>
              <WebView
                source={{ 
                  html: createHTMLContent(news.body),
                  baseUrl: 'https://api.tashkeel.lk'
                }}
                style={[styles.webView, { height: bodyHeight }]}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                originWhitelist={['*']}
                mixedContentMode="always"
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('WebView error loading body:', nativeEvent);
                }}
                onHttpError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('WebView HTTP error in body:', nativeEvent);
                }}
                onLoadEnd={() => {
                  // Trigger height calculation after WebView loads
                  setTimeout(() => {
                    // Height will be calculated by injected JavaScript
                  }, 100);
                }}
                onMessage={(event) => {
                  try {
                    const height = parseInt(event.nativeEvent.data, 10);
                    if (height && height > 0 && !isNaN(height) && height < 50000) { // Max 50000px to prevent infinite
                      const newHeight = Math.min(height + 50, 10000); // Max 10000px, add 50px padding
                      console.log('Body height calculated:', height, '->', newHeight);
                      setBodyHeight((prevHeight) => {
                        // Only update if height changed significantly (more than 50px difference)
                        if (Math.abs(prevHeight - newHeight) > 50 || prevHeight < 600) {
                          return Math.max(newHeight, 500); // Minimum 500px
                        }
                        return prevHeight;
                      });
                    }
                  } catch (e) {
                    console.error('Error parsing body height:', e);
                  }
                }}
                injectedJavaScript={`
                  (function() {
                    var lastHeight = 0;
                    var updateCount = 0;
                    var maxUpdates = 5; // Limit number of updates
                    
                    function updateHeight() {
                      if (updateCount >= maxUpdates) return;
                      
                      try {
                        var body = document.body;
                        // Use body.scrollHeight which is the actual content height
                        var height = body.scrollHeight || body.offsetHeight || 500;
                        
                        // Sanity check - height should be reasonable
                        if (height > 0 && height < 50000) {
                          // Only send if height changed significantly
                          if (Math.abs(height - lastHeight) > 10 || lastHeight === 0) {
                            lastHeight = height;
                            console.log('Body height calculated:', height);
                            if (window.ReactNativeWebView) {
                              window.ReactNativeWebView.postMessage(height.toString());
                              updateCount++;
                            }
                          }
                        }
                      } catch(e) {
                        console.error('Error calculating body height:', e);
                      }
                    }
                    
                    // Initial height calculation
                    updateHeight();
                    
                    // Wait for images to load
                    var images = document.getElementsByTagName('img');
                    var imagesLoaded = 0;
                    var totalImages = images.length;
                    
                    if (totalImages === 0) {
                      updateHeight();
                    } else {
                      for (var i = 0; i < images.length; i++) {
                        if (images[i].complete) {
                          imagesLoaded++;
                        } else {
                          images[i].onload = function() {
                            imagesLoaded++;
                            if (imagesLoaded === totalImages) {
                              updateHeight();
                            }
                          };
                          images[i].onerror = function() {
                            imagesLoaded++;
                            if (imagesLoaded === totalImages) {
                              updateHeight();
                            }
                          };
                        }
                      }
                      if (imagesLoaded === totalImages) {
                        updateHeight();
                      }
                    }
                    
                    // Update height a few times, but limit it
                    setTimeout(updateHeight, 300);
                    setTimeout(updateHeight, 800);
                    setTimeout(updateHeight, 1500);
                  })();
                `}
              />
            </View>
          )}
          
          {/* More News Section */}
          {moreNews.length > 0 && (
            <View style={styles.moreNewsSection}>
              <Text style={styles.moreNewsTitle}>More News</Text>
              {moreNews.map((item) => {
                const itemId = item.id || item._id || item.newsId || item.news_id;
                const itemImageUri = item.image
                  ? item.image.startsWith('http')
                    ? item.image
                    : `https://api.tashkeel.lk${item.image.startsWith('/') ? '' : '/'}${item.image}`
                  : null;
                
                return (
                  <TouchableOpacity
                    key={itemId}
                    style={styles.moreNewsCard}
                    onPress={() => {
                      navigation.navigate('News Detail', { newsId: itemId });
                    }}
                  >
                    {itemImageUri && (
                      <Image source={{ uri: itemImageUri }} style={styles.moreNewsImage} resizeMode="cover" />
                    )}
                    <View style={styles.moreNewsContent}>
                      <Text style={styles.moreNewsCardTitle} numberOfLines={2}>
                        {item.title || item.headline || 'Untitled'}
                      </Text>
                      <View style={styles.moreNewsMeta}>
                        {item.label && (
                          <View style={styles.moreNewsLabel}>
                            <Text style={styles.moreNewsLabelText}>{item.label}</Text>
                          </View>
                        )}
                        <Text style={styles.moreNewsDate}>
                          {(item.date || item.createdAt || item.publishedAt)
                            ? new Date(item.date || item.publishedAt || item.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
      <BannerAd />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECF7F3',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECF7F3',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  newsImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#f0f0f0',
  },
  content: {
    padding: 16,
  },
  metaRow: {
    marginTop: 0,
    marginBottom: 4,
  },
  labelContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#0B4733',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 16,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    backgroundColor: '#e8f5f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: -5,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B4733',
    marginRight: 4,
  },
  date: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0B4733',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0B4733',
    marginBottom: 12,
    lineHeight: 32,
  },
  headline: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0B4733',
    marginBottom: 0,
    lineHeight: 26,
  },
  summary: {
    fontSize: 16,
    color: '#4c6b5f',
    lineHeight: 24,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  contentText: {
    fontSize: 16,
    color: '#0B4733',
    lineHeight: 26,
    marginBottom: 16,
  },
  htmlContainer: {
    marginBottom: 16,
    minHeight: 100,
  },
  webView: {
    width: width - 32, // Account for padding
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: 16,
    color: '#6a8d80',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorSubText: {
    fontSize: 12,
    color: '#9bcfbd',
    marginTop: 8,
  },
  backButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#0F8D6B',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  moreNewsSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#C6EDDF',
  },
  moreNewsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0B4733',
    marginBottom: 16,
  },
  moreNewsCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  moreNewsImage: {
    width: 100,
    height: 100,
    backgroundColor: '#f0f0f0',
  },
  moreNewsContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  moreNewsCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0B4733',
    marginBottom: 8,
    lineHeight: 20,
  },
  moreNewsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  moreNewsLabel: {
    backgroundColor: '#0B4733',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
  },
  moreNewsLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  moreNewsDate: {
    fontSize: 12,
    color: '#6a8d80',
  },
});

export default NewsDetailScreen;

