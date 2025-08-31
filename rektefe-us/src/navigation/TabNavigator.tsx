import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme/theme';
import { TabParamList } from '../types/common';
import apiService from '../services/api';

// Screens
import HomeScreen from '../screens/HomeScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import MessagesScreen from '../screens/MessagesScreen';
import WalletScreen from '../screens/WalletScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const { width } = Dimensions.get('window');

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const CustomTabBar = ({ state, descriptors, navigation }: TabBarProps) => {
  const currentRoute = state.routes[state.index]?.name;
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Gerçek okunmamış mesaj sayısını al
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await apiService.getUnreadMessageCount();
        if (response.success) {
          setUnreadCount(response.data?.count || 0);
        } else {
          setUnreadCount(0);
        }
      } catch (error) {
        console.error('Okunmamış mesaj sayısı alınamadı:', error);
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();
    
    // Her 30 saniyede bir güncelle
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <View style={styles.tabBarWrapper}>
      <View style={styles.tabBarContainer}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          
          let icon = '';
          let label = '';
          let badge = 0;
          
          switch (route.name) {
            case 'Home':
              icon = 'home';
              label = 'Ana Sayfa';
              break;
            case 'Appointments':
              icon = 'briefcase';
              label = 'İşler';
              break;
            case 'Calendar':
              icon = 'calendar';
              label = 'Takvim';
              break;
            case 'Messages':
              icon = 'chatbubbles';
              label = 'Mesajlar';
              badge = unreadCount;
              break;
            case 'Wallet':
              icon = 'wallet';
              label = 'Cüzdan';
              break;
            case 'Profile':
              icon = 'person';
              label = 'Profil';
              break;
          }

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabButton
              key={route.key}
              isFocused={isFocused}
              icon={icon}
              label={label}
              badge={badge}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
};

interface TabButtonProps {
  isFocused: boolean;
  icon: string;
  label: string;
  badge: number;
  onPress: () => void;
}

const TabButton = ({ isFocused, icon, label, badge, onPress }: TabButtonProps) => {
  return (
    <TouchableOpacity
      style={[
        styles.tabButton,
        isFocused && styles.activeTabButton
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name={icon as any} 
          size={22} 
          color={isFocused ? colors.primary.main : colors.text.tertiary} 
        />
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
      </View>
      <Text style={[
        styles.tabLabel,
        isFocused && styles.activeTabLabel
      ]}>
        {label}
      </Text>
      {isFocused && (
        <View style={styles.activeIndicator} />
      )}
    </TouchableOpacity>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="Home"
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Ana Sayfa',
        }}
      />
      <Tab.Screen 
        name="Appointments" 
        component={AppointmentsScreen}
        options={{
          title: 'İşler',
        }}
      />
      <Tab.Screen 
        name="Calendar" 
        component={CalendarScreen}
        options={{
          title: 'Takvim',
        }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen}
        options={{
          title: 'Mesajlar',
        }}
      />
      <Tab.Screen 
        name="Wallet" 
        component={WalletScreen}
        options={{
          title: 'Cüzdan',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profil',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingBottom: spacing.md,
  },
  tabBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 72,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background.primary,
    ...shadows.large,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    minHeight: 60,
    borderRadius: borderRadius.lg,
    position: 'relative',
  },
  activeTabButton: {
    backgroundColor: colors.primary.ultraLight,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error.main,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: 10,
    fontWeight: '700',
  },
  tabLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  activeTabLabel: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -spacing.xs,
    width: 16,
    height: 2,
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.xs,
  },
});

export default TabNavigator;
