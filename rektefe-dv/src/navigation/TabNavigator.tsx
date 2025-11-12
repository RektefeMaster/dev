import React, { useState, useMemo } from 'react';
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

const appendAlpha = (hexColor: string, alpha: string) => {
  if (!hexColor || !hexColor.startsWith('#')) {
    return hexColor;
  }
  return `${hexColor}${alpha}`;
};

interface Route {
  key: string;
  name: string;
}

interface CustomTabBarProps extends BottomTabBarProps {
  onCenterButtonPress?: () => void;
}

const CustomTabBar = ({ state, descriptors, navigation, onCenterButtonPress }: CustomTabBarProps) => {
  const { isDark, theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const colors = theme.colors;
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
        <View style={styles.tabBarContainer}>
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
                  <View style={styles.centerButtonCircle}>
                    <View style={styles.hamburgerIcon}>
                      <View style={styles.hamburgerLine} />
                      <View style={styles.hamburgerLine} />
                      <View style={styles.hamburgerLine} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }

            const isFocused = state.index === idx;
            let icon = null;
            let label = route.name;
            let iconSize = isFocused ? 26 : 24;
            const iconColor = isFocused ? colors.primary.main : colors.icon;

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
                    isFocused && styles.activeTabLabel
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

const createStyles = (theme: any, isDark: boolean) => {
  const colors = theme.colors;
  const spacing = theme.spacing;
  const centerButtonBorderColor = appendAlpha(colors.primary.main, isDark ? '66' : '33');
  const iconGlowColor = appendAlpha(colors.primary.main, isDark ? 'AA' : '66');

  return StyleSheet.create({
    tabBarWrapper: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'transparent',
      paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
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
      backgroundColor: isDark ? colors.background.secondary : colors.background.card,
      borderWidth: 1,
      borderColor: colors.border.primary,
      shadowColor: colors.shadow.dark,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: isDark ? 0.35 : 0.15,
      shadowRadius: 16,
      elevation: isDark ? 14 : 10,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      marginHorizontal: spacing.md,
      marginBottom: Platform.OS === 'ios' ? 0 : spacing.xs,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.xs / 2,
      position: 'relative',
      minWidth: 0,
      maxWidth: 80,
      borderRadius: 18,
    },
    activeTabButton: {
      transform: [{ scale: 1.05 }],
      backgroundColor: isDark ? colors.background.tertiary : colors.primary.ultraLight,
    },
    iconWrapper: {
      shadowColor: iconGlowColor,
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
      color: colors.text.secondary,
    },
    activeTabLabel: {
      fontWeight: '600',
      color: colors.primary.main,
    },
    centerButton: {
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: spacing.sm,
      marginTop: -spacing.sm,
    },
    centerButtonCircle: {
      width: 70,
      height: 70,
      borderRadius: 35,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.primary,
      borderWidth: 2,
      borderColor: centerButtonBorderColor,
      shadowColor: colors.shadow.dark,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.4 : 0.3,
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
      backgroundColor: colors.primary.main,
    },
  });
};

export default TabNavigator;