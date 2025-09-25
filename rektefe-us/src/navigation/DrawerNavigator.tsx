import React, { useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text, StyleSheet, TouchableOpacity, Switch, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/shared/context';
import { DrawerParamList } from '@/shared/types';
import { colors, typography, spacing, borderRadius, shadows } from '@/shared/theme';
import TabNavigator from './TabNavigator';
import { MessagesScreen } from '@/features/messages/screens';
import { WalletScreen, FinancialTrackingScreen } from '@/features/wallet/screens';
import { SupportScreen } from '@/features/support/screens';
import { CalendarScreen } from '@/features/appointments/screens';
import { ProfileScreen, SettingsScreen } from '@/features/profile/screens';

const Drawer = createDrawerNavigator<DrawerParamList>();

interface DrawerItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  isActive?: boolean;
  badge?: number;
}

const DrawerItem = ({ icon, label, onPress, isActive = false, badge }: DrawerItemProps) => (
  <TouchableOpacity 
    style={[
      styles.drawerItem, 
      isActive && styles.drawerItemActive
    ]} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.drawerItemContent}>
      <View style={[
        styles.iconContainer,
        isActive && styles.iconContainerActive
      ]}>
        <Ionicons 
          name={icon as any} 
          size={20} 
          color={isActive ? colors.primary.main : colors.text.secondary} 
        />
      </View>
      <Text style={[
        styles.drawerItemText, 
        isActive && styles.drawerItemTextActive
      ]}>
        {label}
      </Text>
      {badge && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </View>
    {isActive && (
      <View style={styles.activeIndicator} />
    )}
  </TouchableOpacity>
);

const CustomDrawerContent = (props: any) => {
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeRoute, setActiveRoute] = useState<string>('Home');

  const handleNavigation = (screenName: keyof DrawerParamList) => {
    setActiveRoute(screenName as string);
    props.navigation.closeDrawer();
    navigation.navigate(screenName as any);
  };

  const handleLogout = async () => {
    try {
      props.navigation.closeDrawer();
      await logout();
    } catch (error) {
      }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <View style={styles.drawerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
      
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0) || 'U'}
          </Text>
          <View style={styles.onlineIndicator} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.helloText}>Merhaba,</Text>
          <Text style={styles.nameText}>
            {user?.name} {user?.surname}
          </Text>
          <View style={styles.roleContainer}>
            <Ionicons name="construct" size={14} color={colors.primary.main} />
            <Text style={styles.roleText}>Usta</Text>
          </View>
        </View>
      </View>

      {/* Navigation Menu */}
      <View style={styles.menuSection}>
        <Text style={styles.menuTitle}>İş Yönetimi</Text>

        <DrawerItem 
          icon="calendar-outline" 
          label="Takvim" 
          onPress={() => handleNavigation('Calendar')} 
          isActive={activeRoute === 'Calendar'}
        />
        <DrawerItem 
          icon="warning" 
          label="Arıza Bildirimleri" 
          onPress={() => handleNavigation('FaultReports')} 
          isActive={activeRoute === 'FaultReports'}
        />
        <DrawerItem 
          icon="chatbubbles" 
          label="Mesajlar" 
          onPress={() => handleNavigation('Messages')} 
          badge={3}
          isActive={activeRoute === 'Messages'}
        />

        <Text style={[styles.menuTitle, { marginTop: spacing.lg }]}>Finansal</Text>

        <DrawerItem 
          icon="wallet" 
          label="Cüzdan" 
          onPress={() => handleNavigation('Wallet')} 
          isActive={activeRoute === 'Wallet'}
        />
        <DrawerItem 
          icon="trending-up" 
          label="Kazanç Takibi" 
          onPress={() => handleNavigation('FinancialTracking')} 
          isActive={activeRoute === 'FinancialTracking'}
        />

        <Text style={[styles.menuTitle, { marginTop: spacing.lg }]}>Hesap</Text>

        <DrawerItem 
          icon="person" 
          label="Profil" 
          onPress={() => handleNavigation('Profile')} 
          isActive={activeRoute === 'Profile'}
        />
        <DrawerItem 
          icon="help-circle" 
          label="Destek" 
          onPress={() => handleNavigation('Support')} 
          isActive={activeRoute === 'Support'}
        />
        <DrawerItem 
          icon="settings" 
          label="Ayarlar" 
          onPress={() => handleNavigation('Settings')} 
          isActive={activeRoute === 'Settings'}
        />
      </View>

      {/* Theme Toggle */}
      <View style={styles.themeSection}>
        <View style={styles.themeItem}>
          <View style={styles.themeInfo}>
            <Ionicons name="moon" size={18} color={colors.text.secondary} />
            <Text style={styles.themeText}>Karanlık Mod</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border.secondary, true: colors.primary.light }}
            thumbColor={isDarkMode ? colors.primary.main : colors.background.secondary}
          />
        </View>
      </View>

      {/* Logout Section */}
      <View style={styles.logoutSection}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error.main} />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: colors.background.primary,
          width: 320,
        },
        drawerType: 'front',
        swipeEdgeWidth: 50,
        overlayColor: colors.background.overlay,
      }}
    >
      <Drawer.Screen name="MainTabs" component={TabNavigator} />
      <Drawer.Screen name="Messages" component={MessagesScreen} />
      <Drawer.Screen name="Calendar" component={CalendarScreen} />
      <Drawer.Screen name="FaultReports" component={require('../features/fault-reports/screens/FaultReportsScreen').default} />
      <Drawer.Screen name="Wallet" component={WalletScreen} />
      <Drawer.Screen name="FinancialTracking" component={FinancialTrackingScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="Support" component={SupportScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingTop: spacing.xl,
  },
  
  // Header Section
  headerSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    position: 'relative',
    ...shadows.medium,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success.main,
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  profileInfo: {
    alignItems: 'center',
  },
  helloText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  nameText: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.sm,
  },
  roleText: {
    ...typography.body3,
    color: colors.primary.main,
    fontWeight: '600',
  },

  // Menu Section
  menuSection: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  menuTitle: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    position: 'relative',
  },
  drawerItemActive: {
    backgroundColor: colors.primary.light,
  },
  drawerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconContainerActive: {
    backgroundColor: colors.primary.light,
  },
  drawerItemText: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  drawerItemTextActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: colors.error.main,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: 11,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    transform: [{ translateY: -6 }],
    width: 3,
    height: 12,
    backgroundColor: colors.primary.main,
    borderRadius: 1.5,
  },

  // Theme Section
  themeSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  themeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
  },
  themeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  themeText: {
    ...typography.body2,
    color: colors.text.primary,
  },

  // Logout Section
  logoutSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error.ultraLight,
    borderWidth: 1,
    borderColor: colors.error.light,
    gap: spacing.sm,
  },
  logoutText: {
    ...typography.body1,
    color: colors.error.main,
    fontWeight: '600',
  },
});

export default DrawerNavigator;
