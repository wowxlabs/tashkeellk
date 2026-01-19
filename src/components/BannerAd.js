import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd as GoogleBannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// Ad Unit IDs from Google AdMob
const AD_UNIT_ID = __DEV__
  ? TestIds.BANNER
  : Platform.select({
      ios: 'ca-app-pub-5486747028853080/8435169340',
      android: 'ca-app-pub-5486747028853080/6313785927',
    });

const BannerAd = () => {
  return (
    <View style={styles.container}>
      <GoogleBannerAd
        unitId={AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
          console.log('Banner ad loaded');
        }}
        onAdFailedToLoad={(error) => {
          console.error('Banner ad failed to load:', error);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 10,
    backgroundColor: '#f8f9fa',
  },
});

export default BannerAd;

