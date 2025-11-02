import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal, ScrollView, Switch, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '@/shared/theme';
import { TabParamList } from '@/shared/types';
import { useAuth } from '@/shared/context';
import apiService from '@/shared/services';

// Screens
import { HomeScreen } from '@/features/home/screens';
import { MessagesScreen } from '@/features/messages/screens';
import { WalletScreen } from '@/features/wallet/screens';
import { ProfileScreen } from '@/features/profile/screens';
import { ReportsScreen, EndOfDayScreen } from '@/features/reports/screens';
import { CustomerScreen } from '@/features/customers/screens';
import { QuickQuoteScreen } from '@/features/quotes/screens';
import { SuppliersScreen } from '@/features/suppliers/screens';

const Tab = createBottomTabNavigator<TabParamList>();
const { width } = Dimensions.get('window');

// Hamburger Menu Component
interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

const HamburgerMenu = ({ visible, onClose, navigation }: HamburgerMenuProps) => {
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleNavigation = (screenName: string) => {
    onClose();
    navigation.navigate(screenName);
  };

  const handleLogout = async () => {
    try {
      onClose();
      await logout();
    } catch (error) {
      }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const menuItems = [
    { icon: 'calendar-outline', label: 'Takvim', screen: 'Calendar' },
    { icon: 'trending-up', label: 'Kazanç Takibi', screen: 'FinancialTracking' },
    { icon: 'document-text', label: 'Hızlı Teklif', screen: 'QuickQuote' },
    { icon: 'people', label: 'Müşteri Defterim', screen: 'Customers' },
    { icon: 'business', label: 'Parçacılar Rehberi', screen: 'Suppliers' },
    { icon: 'list', label: 'Hizmet Kataloğu', screen: 'ServiceCatalog' },
    { icon: 'today', label: 'Günlük Rapor', screen: 'EndOfDay' },
    { icon: 'help-circle', label: 'Destek', screen: 'Support' },
    { icon: 'settings', label: 'Ayarlar', screen: 'Settings' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.menuContainer}>
          {/* Header */}
          <View style={styles.menuHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0) || 'U'}
              </Text>
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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <ScrollView style={styles.menuContent}>
            <Text style={styles.menuTitle}>İş Yönetimi</Text>
            
            {menuItems.slice(0, 3).map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => handleNavigation(item.screen)}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemContent}>
                  <View style={styles.menuIconContainer}>
                    <Ionicons name={item.icon as any} size={20} color={colors.primary.main} />
                  </View>
                  <Text style={styles.menuItemText}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                </View>
              </TouchableOpacity>
            ))}

            <Text style={[styles.menuTitle, { marginTop: spacing.lg }]}>Raporlar</Text>
            
            {menuItems.slice(3, 5).map((item, index) => (
              <TouchableOpacity
                key={index + 3}
                style={styles.menuItem}
                onPress={() => handleNavigation(item.screen)}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemContent}>
                  <View style={styles.menuIconContainer}>
                    <Ionicons name={item.icon as any} size={20} color={colors.primary.main} />
                  </View>
                  <Text style={styles.menuItemText}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                </View>
              </TouchableOpacity>
            ))}

            <Text style={[styles.menuTitle, { marginTop: spacing.lg }]}>Hesap</Text>
            
            {menuItems.slice(5).map((item, index) => (
              <TouchableOpacity
                key={index + 4}
                style={styles.menuItem}
                onPress={() => handleNavigation(item.screen)}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemContent}>
                  <View style={styles.menuIconContainer}>
                    <Ionicons name={item.icon as any} size={20} color={colors.primary.main} />
                  </View>
                  <Text style={styles.menuItemText}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                </View>
              </TouchableOpacity>
            ))}

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
                  trackColor={{ false: colors.border.secondary, true: colors.primary.main }}
                  thumbColor={isDarkMode ? colors.primary.main : colors.background.secondary}
                />
              </View>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
                <Ionicons name="log-out-outline" size={18} color={colors.error.main} />
              <Text style={styles.logoutText}>Çıkış Yap</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const CustomTabBar = ({ state, descriptors, navigation }: TabBarProps) => {
  const currentRoute = state.routes[state.index]?.name;
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Tab sayısına göre dinamik stil ayarları
  const tabCount = state.routes.length;
  const isScrollable = tabCount > 6; // 6'dan fazla tab varsa scroll yap
  
  const dynamicStyles = useMemo(() => {
    // Tab sayısına göre boyutları ayarla
    let iconSize = 22;
    let fontSize = 10;
    let minWidth = 70; // Scroll için sabit genişlik
    let paddingHorizontal = spacing.sm;
    let tabHeight = 72;
    
    if (isScrollable) {
      // Scrollable mod: Sabit boyutlar
      iconSize = 22;
      fontSize = 10;
      minWidth = 70;
      paddingHorizontal = spacing.sm;
    } else {
      // Normal mod: Tab sayısına göre ayarla
      if (tabCount <= 4) {
        iconSize = 24;
        fontSize = 11;
        minWidth = 70;
        paddingHorizontal = spacing.sm;
      } else if (tabCount <= 5) {
        iconSize = 22;
        fontSize = 10;
        minWidth = 65;
        paddingHorizontal = spacing.sm;
      } else {
        iconSize = 20;
        fontSize = 9.5;
        minWidth = 58;
        paddingHorizontal = spacing.xs;
      }
    }
    
    return {
      iconSize,
      fontSize,
      minWidth,
      paddingHorizontal,
      tabHeight,
    };
  }, [tabCount, isScrollable]);
  
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
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();
    
    // Her 2 dakikada bir güncelle (daha az sıklıkta)
    const interval = setInterval(fetchUnreadCount, 120000); // 2 dakika
    
    return () => clearInterval(interval);
  }, []);
  
  const tabButtons = state.routes.map((route: any, index: number) => {
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
      case 'TowingService':
        icon = 'car';
        label = 'Çekici';
        break;
      case 'RepairService':
        icon = 'construct';
        label = 'Tamir';
        break;
      case 'TireService':
        icon = 'disc';
        label = 'Lastik';
        break;
      case 'TireHotel':
        icon = 'business';
        label = 'Oteli';
        break;
      case 'Bodywork':
        icon = 'brush';
        label = 'Kaporta';
        break;
      case 'CarWash':
        icon = 'water';
        label = 'Yıkama';
        break;
      case 'ElectricalService':
        icon = 'flask';
        label = 'Elektrik';
        break;
      case 'Messages':
        icon = 'chatbubble';
        label = 'Mesajlar';
        badge = unreadCount;
        break;
      case 'Reports':
        icon = 'analytics';
        label = 'Raporlar';
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
         dynamicStyles={dynamicStyles}
         isScrollable={isScrollable}
       />
    );
  });
  
  return (
    <View style={styles.tabBarWrapper}>
      <View style={[styles.tabBarContainer, { height: dynamicStyles.tabHeight }]}>
         {isScrollable ? (
           <ScrollView
             horizontal
             showsHorizontalScrollIndicator={false}
             contentContainerStyle={styles.scrollContent}
             bounces={false}
             style={styles.scrollView}
             nestedScrollEnabled={false}
           >
             {tabButtons}
           </ScrollView>
         ) : (
           tabButtons
         )}
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
  dynamicStyles: {
    iconSize: number;
    fontSize: number;
    minWidth: number;
    paddingHorizontal: number;
    tabHeight: number;
  };
  isScrollable: boolean;
}

const TabButton = ({ isFocused, icon, label, badge, onPress, dynamicStyles, isScrollable }: TabButtonProps) => {
  return (
    <TouchableOpacity
      style={[
        styles.tabButton,
        isFocused && styles.activeTabButton,
         {
           paddingHorizontal: dynamicStyles.paddingHorizontal,
           minWidth: dynamicStyles.minWidth,
           flex: isScrollable ? 0 : 1, // Scrollable ise flex kullanma
         }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name={icon as any} 
          size={dynamicStyles.iconSize} 
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
      <Text 
        style={[
          styles.tabLabel,
          isFocused && styles.activeTabLabel,
          { 
            fontSize: dynamicStyles.fontSize,
            maxWidth: dynamicStyles.minWidth - 8, // Padding için yer bırak
          }
        ]}
        numberOfLines={2}
        adjustsFontSizeToFit={true}
        minimumFontScale={0.7}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
      {isFocused && (
        <View style={styles.activeIndicator} />
      )}
    </TouchableOpacity>
  );
};

const TabNavigator = () => {
  const { user, isAuthenticated } = useAuth();
  const userCapabilities = user?.serviceCategories || [];
  const [hamburgerVisible, setHamburgerVisible] = useState(false);

  // Ana hizmeti belirle (herkes için ana sayfa)
  const getPrimaryService = (): keyof TabParamList => {
    return 'Home';
  };

  const primaryService = getPrimaryService();

  return (
    <>
      <Tab.Navigator
        id={undefined}
        key={userCapabilities.join(',')} // Force re-render when capabilities change
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName={primaryService}
      >
      {/* Ana Sayfa - Herkes için */}
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      {/* Tamir & Bakım Hizmeti */}
      {(userCapabilities.includes('repair') || userCapabilities.includes('tamir-bakim') || userCapabilities.includes('Genel Bakım')) && (
        <Tab.Screen 
          name="RepairService" 
          component={require('../features/services/screens/RepairServiceScreen').default}
          options={{
            title: 'Tamir',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="construct" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* Çekici Hizmeti */}
      {(userCapabilities.includes('towing') || userCapabilities.includes('cekici') || userCapabilities.includes('Çekici')) && (
        <Tab.Screen 
          name="TowingService" 
          component={require('../features/services/screens/TowingServiceScreen').default}
          options={{
            title: 'Çekici',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="car" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* Lastik Hizmeti */}
      {(userCapabilities.includes('tire') || userCapabilities.includes('lastik') || userCapabilities.includes('Lastik & Parça')) && (
        <Tab.Screen 
          name="TireService" 
          component={require('../features/services/screens/TireServiceScreen').default}
          options={{
            title: 'Lastik',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="disc" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* Araç Yıkama Hizmeti */}
      {(userCapabilities.includes('wash') || userCapabilities.includes('arac-yikama') || userCapabilities.includes('Yıkama Hizmeti')) && (
        <Tab.Screen
          name="CarWash"
          component={require('../features/wash/screens/WashJobsScreen').default}
          options={{
            title: 'Yıkama',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="water" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* Kaporta & Boya Hizmeti */}
      {(userCapabilities.includes('bodywork') || userCapabilities.includes('kaporta') || userCapabilities.includes('Kaporta & Boya')) && (
        <Tab.Screen 
          name="Bodywork" 
          component={require('../features/bodywork/screens/BodyworkScreen').default}
          options={{
            title: 'Kaporta',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="brush" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* Elektrik & Elektronik Hizmeti */}
      {(userCapabilities.includes('electrical') || userCapabilities.includes('elektrik')) && (
          <Tab.Screen 
          name="ElectricalService" 
          component={require('../features/services/screens/RepairServiceScreen').default}
          options={{
            title: 'Elektrik',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="flask" size={size} color={color} />
            ),
          }}
        />
      )}


      {/* Mesajlar - herkes için */}
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen}
        options={{
          title: 'Mesajlar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble" size={size} color={color} />
          ),
        }}
      />


      {/* Raporlar - herkes için */}
      <Tab.Screen 
        name="Reports" 
        component={ReportsScreen}
        options={{
          title: 'Raporlar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={size} color={color} />
          ),
        }}
      />

      {/* Cüzdan - herkes için */}
      <Tab.Screen 
        name="Wallet" 
        component={WalletScreen}
        options={{
          title: 'Cüzdan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size} color={color} />
          ),
        }}
      />

      {/* Profil - herkes için */}
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      </Tab.Navigator>
      
      {/* Hamburger Menu */}
      <HamburgerMenu
        visible={hamburgerVisible}
        onClose={() => setHamburgerVisible(false)}
        navigation={{ navigate: (screen: string) => {
          // Navigation logic will be handled by the parent navigator
          }}}
      />
    </>
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
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background.primary,
    ...shadows.large,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    elevation: 8,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    minHeight: 60,
    maxHeight: 68, // Maksimum yükseklik sınırı
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
    color: colors.text.tertiary,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: spacing.xs,
    flexWrap: 'wrap',
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
  scrollView: {
    flex: 1,
    maxHeight: '100%', // TabBar yüksekliğini aşmasın
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    flexGrow: 0, // Dikey genişleme yapmasın
  },

  // Hamburger Menu Styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  menuContainer: {
    width: width * 0.85,
    height: '100%',
    backgroundColor: colors.background.primary,
    borderTopRightRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    ...shadows.large,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    ...shadows.medium,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  profileInfo: {
    flex: 1,
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
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary.ultraLight,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  roleText: {
    ...typography.body3,
    color: colors.primary.main,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.sm,
  },
  menuContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  menuTitle: {
    fontSize: typography.label.fontSize,
    fontWeight: '600' as const,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    marginBottom: spacing.xs,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuItemText: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  themeSection: {
    marginTop: spacing.lg,
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error.ultraLight,
    borderWidth: 1,
    borderColor: colors.error.main,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  logoutText: {
    ...typography.body1,
    color: colors.error.main,
    fontWeight: '600',
  },
});

export default TabNavigator;
