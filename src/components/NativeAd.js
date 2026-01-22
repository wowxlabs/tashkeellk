import React, { useState } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { NativeAdView, TestIds, TriggerableView } from 'react-native-google-mobile-ads';

// Ad Unit IDs for Native Ads (Inline)
const AD_UNIT_ID = __DEV__
  ? TestIds.NATIVE
  : Platform.select({
      ios: 'ca-app-pub-5486747028853080/6000771213', // iOS inline native ad unit ID
      android: 'ca-app-pub-5486747028853080/8939949266', // Android inline native ad unit ID
    });

const NativeAd = ({ style }) => {
  const [adError, setAdError] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  // Temporarily disable native ad if there's an error to prevent crashes
  // Note: The ad unit IDs might need to be native ad unit IDs, not banner ad unit IDs
  if (!shouldRender || adError) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <NativeAdView
        unitId={AD_UNIT_ID}
        style={styles.adContainer}
        onAdLoaded={() => {
          console.log('Native ad loaded');
          setAdError(false);
        }}
        onAdFailedToLoad={(error) => {
          console.error('Native ad failed to load:', error);
          setAdError(true);
          setShouldRender(false);
        }}
      >
        <View style={styles.adContent}>
          <View style={styles.adHeader}>
            <Text style={styles.adLabel}>Ad</Text>
          </View>
          
          <View style={styles.adBody}>
            <View style={styles.adMedia}>
              <NativeAdView.MediaView style={styles.mediaView} />
            </View>
            
            <View style={styles.adTextContent}>
              <View style={styles.adHeadline}>
                <NativeAdView.HeadlineView style={styles.headline} />
              </View>
              
              <View style={styles.adAdvertiser}>
                <NativeAdView.AdvertiserView style={styles.advertiser} />
              </View>
              
              <View style={styles.adBodyText}>
                <NativeAdView.BodyView style={styles.body} />
              </View>
              
              <View style={styles.adActions}>
                <TriggerableView style={styles.adButton}>
                  <NativeAdView.CallToActionView style={styles.callToAction} />
                </TriggerableView>
              </View>
            </View>
          </View>
        </View>
      </NativeAdView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  adContainer: {
    width: '100%',
  },
  adContent: {
    width: '100%',
  },
  adHeader: {
    marginBottom: 8,
  },
  adLabel: {
    fontSize: 12,
    color: '#6a8d80',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  adBody: {
    flexDirection: 'row',
  },
  adMedia: {
    width: 100,
    height: 100,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  mediaView: {
    width: '100%',
    height: '100%',
  },
  adTextContent: {
    flex: 1,
  },
  adHeadline: {
    marginBottom: 4,
  },
  headline: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B4733',
  },
  adAdvertiser: {
    marginBottom: 4,
  },
  advertiser: {
    fontSize: 12,
    color: '#6a8d80',
  },
  adBodyText: {
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: '#4c6b5f',
    lineHeight: 20,
  },
  adActions: {
    marginTop: 8,
  },
  adButton: {
    alignSelf: 'flex-start',
  },
  callToAction: {
    backgroundColor: '#0F8D6B',
    color: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    fontSize: 14,
    fontWeight: '600',
    overflow: 'hidden',
  },
});

export default NativeAd;

