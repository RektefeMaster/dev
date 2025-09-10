import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import LottieView from 'lottie-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';
import theme from '../theme/theme';
import HomeScreen from '../screens/HomeScreen/HomeScreen';
import WalletScreen from '../screens/WalletScreen';
import MessagesScreen from '../screens/MessagesScreen';
import GarageScreen from '../screens/GarageScreen';
import SupportScreen from '../screens/SupportScreen';
import TefeWalletScreen from '../screens/TefeWalletScreen';

const Tab = createBottomTabNavigator();

interface Route {
  key: string;
  name: string;
}

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { isDark } = useTheme();
  const currentRoute = state.routes[state.index]?.name;
  
  return (
    <View style={styles.tabBarWrapper}>
      <View style={styles.tabBarBackground} />
      <View style={[styles.tabBarContainer, { 
        backgroundColor: isDark ? theme.colors.background.tertiary : theme.colors.background.secondary,
        borderColor: isDark ? theme.colors.border.tertiary : theme.colors.border.primary,
      }]}>
        {state.routes.map((route: Route, idx: number) => {
          const isFocused = state.index === idx;
          let icon = null;
          let label = route.name;
          let iconSize = isFocused ? 34 : 28;
          let iconColor = isFocused ? theme.colors.primary.main : (isDark ? theme.colors.text.tertiary : theme.colors.text.secondary);
          let iconStyle = isFocused ? styles.activeIcon : {};

          if (route.name === 'Anasayfa') {
            icon = <MaterialCommunityIcons name="home" size={iconSize} color={iconColor} style={iconStyle} />;
          }
          if (route.name === 'Mesajlar') {
            icon = <MaterialCommunityIcons name="message-text" size={iconSize} color={iconColor} style={iconStyle} />;
          }
          if (route.name === 'Garajım') {
            icon = <MaterialCommunityIcons name="car" size={iconSize} color={iconColor} style={iconStyle} />;
          }
          if (route.name === 'Cüzdan') {
            icon = <MaterialCommunityIcons name="wallet" size={iconSize} color={iconColor} style={iconStyle} />;
          }
          if (route.name === 'TEFECüzdan') {
            icon = <MaterialCommunityIcons name="cash" size={iconSize} color={iconColor} style={iconStyle} />;
          }
          if (route.name === 'Destek') {
            icon = <MaterialCommunityIcons name="lifebuoy" size={iconSize} color={iconColor} style={iconStyle} />;
          }
          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={() => navigation.navigate(route.name)}
              style={[styles.tabButton, isFocused && styles.activeTabButton]}
              activeOpacity={0.85}
            >
              {icon}
              <Text style={[
                styles.tabLabel, 
                { color: isDark ? theme.colors.text.tertiary : theme.colors.text.secondary },
                isFocused && [styles.activeTabLabel, { color: theme.colors.primary.main }]
              ]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      id={undefined}
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Anasayfa" component={HomeScreen} options={{ tabBarLabel: 'Anasayfa' }} />
      <Tab.Screen name="Mesajlar" component={MessagesScreen} options={{ tabBarLabel: 'Mesajlar' }} />
      <Tab.Screen name="Garajım" component={GarageScreen} options={{ tabBarLabel: 'Garajım' }} />
      <Tab.Screen name="Cüzdan" component={WalletScreen} options={{ tabBarLabel: 'Cüzdan' }} />
      <Tab.Screen name="TEFECüzdan" component={TefeWalletScreen} options={{ tabBarLabel: 'TEFE Cüzdan' }} />
      <Tab.Screen name="Destek" component={SupportScreen} options={{ tabBarLabel: 'Destek' }} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 68,
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
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 1,
  },
  activeTabButton: {
    transform: [{ scale: 1.1 }],
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
    marginTop: 3,
    textAlign: 'center',
  },
  activeTabLabel: {
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
    textShadowColor: theme.colors.primary.main,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});

export default TabNavigator;
