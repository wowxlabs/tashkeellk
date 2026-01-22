import React, { useEffect, useRef, useState } from 'react';
import { useColorScheme, Image, View, Text, StyleSheet, Linking, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { logScreenView } from '../services/analytics';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import RadioScreen from '../screens/RadioScreen';
import YouTubeScreen from '../screens/YouTubeScreen';
import HomeScreen from '../screens/HomeScreen';
import QiblaScreen from '../screens/QiblaScreen';
import PrayerRemindersScreen from '../screens/PrayerRemindersScreen';
import PrayerSettingsScreen from '../screens/PrayerSettingsScreen';
import OnboardingLocationScreen from '../screens/OnboardingLocationScreen';
import NewsScreen from '../screens/NewsScreen';
import NewsDetailScreen from '../screens/NewsDetailScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
const Drawer = createDrawerNavigator();

const brandColors = {
  primary: '#0F8D6B',
  secondary: '#15A97A',
  background: '#ECF7F3',
  card: '#C6EDDF',
  accent: '#F5B400',
  textOnPrimary: '#ffffff',
  textMuted: '#0B4733',
};

export default function AppNavigator() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const routeNameRef = useRef();
  const navigationRef = useRef();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newsEnabled, setNewsEnabled] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const coords = await AsyncStorage.getItem('USER_LOCATION_COORDS');
        setShowOnboarding(!coords);
      } catch (e) {
        console.error('Error checking onboarding state:', e);
        setShowOnboarding(false);
      } finally {
        setCheckingOnboarding(false);
      }
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    const checkNewsEnabled = async () => {
      try {
        const response = await axios.get('https://api.tashkeel.lk/v1/news', {
          headers: { Accept: 'application/json' },
        });
        // Check for mobileEnabled at root level or in settings object
        const mobileEnabled = 
          response.data?.mobileEnabled === true || 
          response.data?.settings?.mobileEnabled === true ||
          false;
        setNewsEnabled(mobileEnabled);
      } catch (error) {
        console.error('Error checking news settings:', error);
        setNewsEnabled(false);
      }
    };
    checkNewsEnabled();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync(brandColors.primary);
    } else if (Platform.OS === 'ios') {
      // Set status bar background color for iOS
      SystemUI.setBackgroundColorAsync(brandColors.primary);
    }
  }, []);

  const navigationTheme =
    colorScheme === 'dark'
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            primary: brandColors.secondary,
            background: '#0B1F1A',
            card: '#09211A',
            text: '#F0FFF9',
            border: '#1E3A34',
            notification: brandColors.accent,
          },
        }
      : {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            primary: brandColors.primary,
            background: brandColors.background,
            card: brandColors.card,
            text: '#0B4733',
            border: '#B6E3D4',
            notification: brandColors.accent,
          },
        };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor={brandColors.primary} translucent={Platform.OS === 'ios' ? false : true} />
      {checkingOnboarding ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: brandColors.background }}>
          <ActivityIndicator size="large" color={brandColors.primary} />
        </View>
      ) : showOnboarding ? (
        <OnboardingLocationScreen onComplete={() => setShowOnboarding(false)} />
      ) : (
        <NavigationContainer
        ref={navigationRef}
        theme={navigationTheme}
        onReady={() => {
          routeNameRef.current = navigationRef.current.getCurrentRoute()?.name;
        }}
        onStateChange={async () => {
          const previousRouteName = routeNameRef.current;
          const currentRoute = navigationRef.current.getCurrentRoute();
          const currentRouteName = currentRoute?.name;

          if (previousRouteName !== currentRouteName) {
            // Log screen view
            await logScreenView(currentRouteName);
          }

          routeNameRef.current = currentRouteName;
        }}
      >
        <Drawer.Navigator
          screenOptions={{
            headerTitleAlign: 'center',
            headerStyle: {
              backgroundColor: brandColors.primary,
              height: Platform.OS === 'android' ? 56 + insets.top : 44,
              borderTopWidth: 2,
              borderTopColor: brandColors.secondary,
            },
            headerStatusBarHeight: Platform.OS === 'android' ? insets.top : 0,
            headerTitleContainerStyle: {
              paddingTop: Platform.OS === 'android' ? 12 : 0,
              paddingBottom: Platform.OS === 'android' ? 15 : 0,
            },
            headerLeftContainerStyle: {
              paddingTop: Platform.OS === 'android' ? 12 : 0,
              paddingBottom: Platform.OS === 'android' ? 15 : 0,
            },
            headerTintColor: brandColors.textOnPrimary,
            headerTitleStyle: { fontWeight: '600', fontSize: 18 },
            drawerActiveTintColor: brandColors.primary,
            drawerInactiveTintColor: brandColors.textMuted,
            drawerLabelStyle: { fontSize: 15, fontWeight: '600', marginLeft: 0, marginRight: 0 },
            drawerItemStyle: {
              borderRadius: 0,
              marginHorizontal: 0,
              marginVertical: 0,
              marginLeft: 0,
              marginRight: 0,
              paddingHorizontal: 0,
              paddingLeft: 0,
              paddingRight: 0,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: brandColors.accent,
              paddingVertical: 8,
            },
            drawerContentContainerStyle: {
              paddingHorizontal: 0,
              paddingLeft: 0,
              paddingRight: 0,
            },
            drawerIconContainerStyle: {
              marginLeft: 16,
              marginRight: 12,
              padding: 0,
            },
            drawerActiveBackgroundColor: brandColors.card,
            sceneContainerStyle: { backgroundColor: brandColors.background },
          }}
          drawerContent={(props) => (
            <View style={{ flex: 1, backgroundColor: '#ffffff', paddingTop: 0, paddingHorizontal: 0, marginHorizontal: 0, overflow: 'visible' }}>
              <View style={[styles.drawerHeader, { top: 0, left: 0, right: 0, paddingTop: 0, minHeight: Platform.OS === 'ios' ? insets.top + 120 : insets.top + 140, backgroundColor: Platform.OS === 'ios' ? brandColors.primary : 'transparent' }]}>
                <Image
                  source={require('../../assets/images/tashkeel_banner.jpg')}
                  style={[styles.drawerBanner, { marginTop: 0, height: Platform.OS === 'ios' ? insets.top + 120 : insets.top + 140 }]}
                  resizeMode="cover"
                />
                <View style={styles.drawerBannerOverlay} />
                <View style={[styles.drawerLogoWrapper, { top: Platform.OS === 'ios' ? Math.max(insets.top - 8, 0) : Math.max(insets.top + 8, 16) }]}>
                  <Image
                    source={require('../../assets/images/icon.png')}
                    style={styles.drawerLogo}
                  />
                  <View>
                    <Text style={styles.drawerTitle}>Tashkeel</Text>
                    <Text style={styles.drawerSubtitle}>Streaming spiritual guidance for every heart.</Text>
                  </View>
                </View>
              </View>
              <DrawerContentScrollView
                {...props}
                contentContainerStyle={{
                  paddingLeft: 0,
                  paddingRight: 0,
                  paddingBottom: 100,
                  paddingTop: Platform.OS === 'ios' ? insets.top + 110 : insets.top + 140,
                  paddingHorizontal: 0,
                }}
                style={{ flex: 1, paddingHorizontal: 0, paddingLeft: 0, paddingRight: 0 }}
              >
                <View style={styles.drawerList}>
                  {props.state.routes.map((route, index) => {
                    // Skip hidden screens from drawer menu
                    if (route.name === 'Prayer Settings' || route.name === 'News Detail') {
                      return null;
                    }
                    // Hide News if mobileEnabled is false
                    if (route.name === 'News' && !newsEnabled) {
                      return null;
                    }
                    
                    const focused = index === props.state.index;
                    const { title, drawerLabel, drawerIcon } = props.descriptors[route.key].options;
                    const label = drawerLabel !== undefined ? drawerLabel : title !== undefined ? title : route.name;
                    const icon = drawerIcon ? drawerIcon({ color: focused ? brandColors.primary : brandColors.textMuted, size: 24, focused }) : null;
                    
                    return (
                      <DrawerItem
                        key={route.key}
                        label={label}
                        icon={() => icon}
                        focused={focused}
                        activeTintColor={brandColors.primary}
                        inactiveTintColor={brandColors.textMuted}
                        activeBackgroundColor={brandColors.card}
                        labelStyle={{ fontSize: 15, fontWeight: '600', marginLeft: 0, marginRight: 0 }}
                        style={{
                          borderRadius: 0,
                          marginHorizontal: -16,
                          marginVertical: 0,
                          marginLeft: -16,
                          marginRight: -16,
                          paddingHorizontal: 0,
                          paddingLeft: 0,
                          paddingRight: 0,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: brandColors.accent,
                          paddingVertical: 8,
                        }}
                        iconContainerStyle={{
                          marginLeft: 16,
                          marginRight: 12,
                          padding: 0,
                        }}
                        onPress={() => {
                          const event = props.navigation.emit({
                            type: 'drawerItemPress',
                            target: route.key,
                            canPreventDefault: true,
                          });

                          if (!event.defaultPrevented) {
                            props.navigation.navigate(route.name, route.params);
                          }
                        }}
                      />
                    );
                  })}
                </View>
              </DrawerContentScrollView>
              <View style={[styles.drawerFooter, { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: Math.min(insets.bottom || 4, 8) }]}>
                <Text style={styles.footerText}>Version 1.0.3</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                  <Text style={styles.footerSubText}>© {new Date().getFullYear()} </Text>
                  <TouchableOpacity onPress={() => Linking.openURL('https://www.tashkeel.lk')}>
                    <Text style={[styles.footerSubText, styles.footerLink]}>Tashkeel Media</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        >
          <Drawer.Screen
            name="Home"
            component={HomeScreen}
            options={{
              drawerIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
            }}
          />
          <Drawer.Screen
            name="Bayans"
            component={YouTubeScreen}
            options={{
              drawerIcon: ({ color, size }) => <Ionicons name="logo-youtube" size={size} color={color} />,
            }}
          />
          <Drawer.Screen
            name="Radio"
            component={RadioScreen}
            options={{
              drawerIcon: ({ color, size }) => <Ionicons name="radio" size={size} color={color} />,
            }}
          />
          <Drawer.Screen
            name="News"
            component={NewsScreen}
            options={{
              drawerIcon: ({ color, size }) => <Ionicons name="newspaper-outline" size={size} color={color} />,
            }}
          />
          <Drawer.Screen
            name="Qibla Finder"
            component={QiblaScreen}
            options={{
              drawerIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
            }}
          />
          <Drawer.Screen
            name="Prayer Reminders"
            component={PrayerRemindersScreen}
            options={{
              drawerIcon: ({ color, size }) => <Ionicons name="alarm-outline" size={size} color={color} />,
            }}
          />
          <Drawer.Screen
            name="News Detail"
            component={NewsDetailScreen}
            options={({ navigation }) => ({
              title: 'News Detail',
              headerLeftContainerStyle: {
                paddingLeft: Platform.OS === 'ios' ? 8 : 16,
              },
              headerLeft: () => (
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('News');
                  }}
                  style={{
                    padding: 10,
                    minWidth: 44,
                    minHeight: 44,
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="arrow-back" size={24} color={brandColors.textOnPrimary} />
                </TouchableOpacity>
              ),
              // Keep the screen in the navigator but hide it from the drawer list
              drawerItemStyle: { height: 0 },
              drawerLabel: () => null,
              drawerIcon: () => null,
            })}
          />
          <Drawer.Screen
            name="Prayer Settings"
            component={PrayerSettingsScreen}
            options={{
              // Keep the screen in the navigator but hide it from the drawer list
              drawerItemStyle: { height: 0 },
              drawerLabel: () => null,
              drawerIcon: () => null,
            }}
          />
        </Drawer.Navigator>
      </NavigationContainer>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    marginBottom: 0,
    marginHorizontal: 0,
    marginLeft: 0,
    marginRight: 0,
    backgroundColor: brandColors.primary,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    zIndex: 1,
  },
  drawerBanner: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  drawerBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 141, 107, 0.65)',
  },
  drawerLogoWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  drawerLogo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: brandColors.accent,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: brandColors.textOnPrimary,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  drawerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    flexShrink: 1,
    textAlign: 'center',
  },
  drawerList: {
    paddingHorizontal: 0,
    marginHorizontal: 0,
    width: '100%',
  },
  drawerFooter: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#b6e3d4',
    backgroundColor: '#ffffff',
  },
  footerText: {
    color: '#0B4733',
    fontWeight: '600',
    textAlign: 'center',
  },
  footerSubText: {
    color: '#4c6b5f',
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
  },
  footerLink: {
    textDecorationLine: 'underline',
  },
});
