import React from 'react';
import { useColorScheme, Image, View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import RadioScreen from '../screens/RadioScreen';
import YouTubeScreen from '../screens/YouTubeScreen';
import HomeScreen from '../screens/HomeScreen';
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
      <StatusBar style="light" backgroundColor={brandColors.primary} translucent={false} />
      <NavigationContainer theme={navigationTheme}>
        <Drawer.Navigator
          screenOptions={{
            headerTitleAlign: 'center',
            headerStyle: {
              backgroundColor: brandColors.primary,
            },
            headerTintColor: brandColors.textOnPrimary,
            headerTitleStyle: { fontWeight: '600', fontSize: 20 },
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
            <View style={{ flex: 1, backgroundColor: '#ffffff', paddingTop: insets.top, overflow: 'visible' }}>
              <View style={[styles.drawerHeader, { top: insets.top }]}>
                <Image
                  source={require('../../assets/images/tashkeel_banner.jpg')}
                  style={styles.drawerBanner}
                  resizeMode="cover"
                />
                <View style={styles.drawerBannerOverlay} />
                <View style={styles.drawerLogoWrapper}>
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
                  paddingBottom: 0,
                  paddingTop: 140,
                  paddingHorizontal: 0,
                }}
                style={{ flex: 1, paddingHorizontal: 0, paddingLeft: 0, paddingRight: 0 }}
              >
                <View style={styles.drawerList}>
                  {props.state.routes.map((route, index) => {
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
              <View style={[styles.drawerFooter, { paddingBottom: insets.bottom }]}>
                <Text style={styles.footerText}>Version 1.0.1</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text style={styles.footerSubText}>© 2025 </Text>
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
        </Drawer.Navigator>
      </NavigationContainer>
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
    width: '100%',
    zIndex: 1,
  },
  drawerBanner: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  drawerBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 141, 107, 0.65)',
  },
  drawerLogoWrapper: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#b6e3d4',
    backgroundColor: '#ffffff',
  },
  footerText: {
    color: '#0B4733',
    fontWeight: '600',
  },
  footerSubText: {
    color: '#4c6b5f',
    marginTop: 4,
    fontSize: 12,
  },
  footerLink: {
    textDecorationLine: 'underline',
  },
});
