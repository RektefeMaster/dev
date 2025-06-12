// Bu dosya özel tabbar ve ortada yüzen REKAİ butonunu içerir.
// Eğer '@react-navigation/bottom-tabs' yüklü değilse: npm install @react-navigation/bottom-tabs

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import LottieView from 'lottie-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Mock ekranlar (gerçek ekranlar ile değiştirilebilir)
import HomeScreen from '../screens/HomeScreen';
import WalletScreen from '../screens/WalletScreen';
import GarageScreen from '../screens/GarageScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SupportScreen from '../screens/SupportScreen';
import RektagramScreen from '../screens/RektagramScreen';
import RekAiChat from '../screens/RekAiChat';
import TefeWalletScreen from '../screens/TefeWalletScreen';

const Tab = createBottomTabNavigator();

interface Route {
  key: string;
  name: string;
}

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  // Eğer aktif ekran Rektagram ise tabbarı hiç gösterme
  const currentRoute = state.routes[state.index]?.name;
  if (currentRoute === 'Rektagram' || currentRoute === 'Rekai') return null;
  return (
    <View style={styles.tabBarWrapper}>
      <View style={styles.tabBarBackground} />
      <View style={styles.tabBarContainer}>
        {state.routes.map((route: Route, idx: number) => {
          const isFocused = state.index === idx;
          let icon = null;
          let label = route.name;
          let iconSize = isFocused ? 34 : 28;
          let iconColor = isFocused ? '#007AFF' : '#666';
          let iconStyle = isFocused ? styles.activeIcon : {};

          if (route.name === 'Rekai') {
            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={() => navigation.navigate(route.name)}
                style={[styles.rekaiButton, isFocused && styles.rekaiButtonActive]}
                activeOpacity={0.85}
              >
                <LottieView
                  source={require('../assets/rekai_wave.json')}
                  autoPlay
                  loop
                  style={{ position: 'absolute', width: 100, height: 100, top: -25, left: -25 }}
                />
              </TouchableOpacity>
            );
          }
          if (route.name === 'Home') {
            icon = <MaterialCommunityIcons name="home" size={iconSize} color={iconColor} style={iconStyle} />;
          }
          if (route.name === 'Wallet') {
            icon = <MaterialCommunityIcons name="wallet" size={iconSize} color={iconColor} style={iconStyle} />;
          }
          if (route.name === 'Garage') {
            icon = <MaterialCommunityIcons name="car" size={iconSize} color={iconColor} style={iconStyle} />;
          }
          if (route.name === 'Rektagram') {
            icon = (
              <Text style={{
                fontSize: iconSize,
                fontWeight: '800',
                color: iconColor,
                fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
                transform: [{ rotate: '-10deg' }],
                textShadowColor: isFocused ? 'rgba(0, 122, 255, 0.3)' : 'rgba(102, 102, 102, 0.3)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2
              }}>
                R
              </Text>
            );
          }
          if (route.name === 'Profile') {
            icon = <MaterialCommunityIcons name="account" size={iconSize} color={iconColor} style={iconStyle} />;
          }
          if (route.name === 'Support') {
            icon = <MaterialCommunityIcons name="help-circle" size={iconSize} color={iconColor} style={iconStyle} />;
          }
          if (route.name === 'TefeWallet') {
            icon = <MaterialCommunityIcons name="star-circle" size={iconSize} color={iconColor} style={iconStyle} />;
          }
          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={() => navigation.navigate(route.name)}
              style={[styles.tabItem, isFocused && styles.activeTabItem]}
              activeOpacity={0.85}
            >
              {icon}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const TabNavigator = () => (
  <Tab.Navigator
    initialRouteName="Home"
    tabBar={(props: BottomTabBarProps) => <CustomTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Anasayfa' }} />
    <Tab.Screen name="Wallet" component={WalletScreen} options={{ tabBarLabel: '' }} />
    <Tab.Screen name="Garage" component={GarageScreen} options={{ tabBarLabel: 'Garajım' }} />
    <Tab.Screen name="Rekai" component={RekAiChat} options={{ tabBarLabel: 'REKAİ' }} />
    <Tab.Screen name="Rektagram" component={RektagramScreen} options={{ tabBarLabel: 'Rektagram' }} />
    <Tab.Screen name="TefeWallet" component={TefeWalletScreen} options={{ tabBarLabel: 'TEFE Cüzdan' }} />
    <Tab.Screen name="Support" component={SupportScreen} options={{ tabBarLabel: 'Destek' }} />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 68,
    backgroundColor: '#fff',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  rekaiButton: {
    flex: 1,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 1,
  },
  tabLabel: {
    fontSize: 8.5,
    fontWeight: '500',
    color: '#666',
    marginTop: 3,
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingBottom: 16,
  },
  tabBarBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'transparent',
  },
  lottieIcon: {
    width: 84,
    height: 84,
  },
  activeIcon: {
    textShadowColor: '#007AFF',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    elevation: 8,
  },
  activeTabItem: {
    backgroundColor: 'rgba(0,122,255,0.08)',
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  rekaiButtonActive: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
    backgroundColor: '#007AFF',
  },
});

export default TabNavigator;