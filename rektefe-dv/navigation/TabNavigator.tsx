import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import LottieView from 'lottie-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';
import theme from '../theme/theme';
import HomeScreen from '../screens/HomeScreen';
import WalletScreen from '../screens/WalletScreen';
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
        backgroundColor: isDark ? theme.colors.background.paper.dark : theme.colors.background.paper.light,
        borderColor: isDark ? theme.colors.border.dark : theme.colors.border.light,
      }]}>
        {state.routes.map((route: Route, idx: number) => {
          const isFocused = state.index === idx;
          let icon = null;
          let label = route.name;
          let iconSize = isFocused ? 34 : 28;
          let iconColor = isFocused ? theme.colors.primary.main : (isDark ? theme.colors.text.secondary.dark : theme.colors.text.secondary.light);
          let iconStyle = isFocused ? styles.activeIcon : {};

          if (route.name === 'Home') {
            icon = <MaterialCommunityIcons name="home" size={iconSize} color={iconColor} style={iconStyle} />;
          }
          if (route.name === 'Wallet') {
            icon = <MaterialCommunityIcons name="wallet" size={iconSize} color={iconColor} style={iconStyle} />;
          }
          if (route.name === 'Garage') {
            icon = <MaterialCommunityIcons name="car" size={iconSize} color={iconColor} style={iconStyle} />;
          }
          if (route.name === 'TefeWallet') {
            icon = <MaterialCommunityIcons name="cash" size={iconSize} color={iconColor} style={iconStyle} />;
          }
          if (route.name === 'Support') {
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
                { color: isDark ? theme.colors.text.secondary.dark : theme.colors.text.secondary.light },
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Anasayfa' }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ tabBarLabel: '' }} />
      <Tab.Screen name="Garage" component={GarageScreen} options={{ tabBarLabel: 'Garajım' }} />
      <Tab.Screen name="TefeWallet" component={TefeWalletScreen} options={{ tabBarLabel: 'TEFE Cüzdan' }} />
      <Tab.Screen name="Support" component={SupportScreen} options={{ tabBarLabel: 'Destek' }} />
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
    elevation: 8,
  },
  activeTabItem: {
    backgroundColor: `${theme.colors.primary.main}14`,
    borderRadius: 18,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  activeTabButton: {
    backgroundColor: `${theme.colors.primary.main}14`,
    borderRadius: 18,
  },
});

export default TabNavigator;