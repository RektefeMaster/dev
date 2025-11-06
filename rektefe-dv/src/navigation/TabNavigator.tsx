import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';
import HomeScreen from '@/features/home/HomeScreen';
import MechanicSearchScreen from '@/features/mechanics/screens/MechanicSearchScreen';
import AppointmentsScreen from '@/features/appointments/screens/AppointmentsScreen';
import ProfileScreen from '@/features/profile/screens/ProfileScreen';
import BottomSheet from '@/shared/components/BottomSheet';

const Tab = createBottomTabNavigator();

interface Route {
  key: string;
  name: string;
}

interface CustomTabBarProps extends BottomTabBarProps {
  onCenterButtonPress?: () => void;
}

const CustomTabBar = ({ state, descriptors, navigation, onCenterButtonPress }: CustomTabBarProps) => {
  const { isDark, theme } = useTheme();
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  
  const handleCenterButtonPress = () => {
    if (onCenterButtonPress) {
      onCenterButtonPress();
    } else {
      setBottomSheetVisible(true);
    }
  };

  const handleCloseBottomSheet = () => {
    setBottomSheetVisible(false);
  };

  return (
    <>
      <View style={styles.tabBarWrapper}>
        <View style={styles.tabBarBackground} />
        <View style={[styles.tabBarContainer, { 
          backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
          borderColor: isDark ? '#2C2C2C' : '#E0E0E0',
        }]}>
          {state.routes.map((route: Route, idx: number) => {
            // Merkezi buton için özel işlem
            if (route.name === 'MerkeziButon') {
              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={handleCenterButtonPress}
                  style={styles.centerButton}
                  activeOpacity={0.85}
                >
                  <View style={[
                    styles.centerButtonCircle, 
                    { 
                      backgroundColor: '#FFFFFF',
                      borderWidth: 2,
                      borderColor: theme.colors.primary.main + '30',
                    }
                  ]}>
                    <View style={styles.hamburgerIcon}>
                      <View style={[styles.hamburgerLine, { backgroundColor: theme.colors.primary.main }]} />
                      <View style={[styles.hamburgerLine, { backgroundColor: theme.colors.primary.main }]} />
                      <View style={[styles.hamburgerLine, { backgroundColor: theme.colors.primary.main }]} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }

            const isFocused = state.index === idx;
            const { options } = descriptors[route.key];
            let icon = null;
            let label = route.name;
            let iconSize = isFocused ? 26 : 24;
            let iconColor = isFocused ? theme.colors.primary.main : (isDark ? '#9CA3AF' : '#6B7280');

            // İkonlar
            if (route.name === 'Anasayfa') {
              icon = <MaterialCommunityIcons name="home" size={iconSize} color={iconColor} />;
              label = 'Anasayfa';
            } else if (route.name === 'Arama') {
              icon = <MaterialCommunityIcons name="magnify" size={iconSize} color={iconColor} />;
              label = 'Arama';
            } else if (route.name === 'Randevular') {
              icon = <MaterialCommunityIcons name="calendar-clock" size={iconSize} color={iconColor} />;
              label = 'Randevular';
            } else if (route.name === 'Hesap') {
              icon = <MaterialCommunityIcons name="account" size={iconSize} color={iconColor} />;
              label = 'Hesap';
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
                <View style={isFocused ? styles.iconWrapper : null}>
                  {icon}
                </View>
                <Text 
                  style={[
                    styles.tabLabel, 
                    { color: isDark ? '#9CA3AF' : '#6B7280' },
                    isFocused && [styles.activeTabLabel, { color: theme.colors.primary.main }]
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      
      <BottomSheet
        visible={bottomSheetVisible}
        onClose={handleCloseBottomSheet}
      />
    </>
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
      <Tab.Screen name="Arama" component={MechanicSearchScreen} options={{ tabBarLabel: 'Arama' }} />
      <Tab.Screen 
        name="MerkeziButon" 
        component={View} 
        options={{ 
          tabBarLabel: '',
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen name="Randevular" component={AppointmentsScreen} options={{ tabBarLabel: 'Randevular' }} />
      <Tab.Screen name="Hesap" component={ProfileScreen} options={{ tabBarLabel: 'Hesap' }} />
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
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    pointerEvents: 'box-none',
  },
  tabBarBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'transparent',
  },
  tabBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 70,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginBottom: Platform.OS === 'ios' ? 0 : 8,
    borderWidth: 0.5,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    position: 'relative',
    minWidth: 0,
    maxWidth: 80,
  },
  activeTabButton: {
    transform: [{ scale: 1.05 }],
  },
  iconWrapper: {
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  activeTabLabel: {
    fontWeight: '600',
  },
  centerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    marginTop: -8,
  },
  centerButtonCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  hamburgerIcon: {
    width: 28,
    height: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hamburgerLine: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
  },
});

export default TabNavigator;