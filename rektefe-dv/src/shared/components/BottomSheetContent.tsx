import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { DrawerParamList } from '@/navigation/DrawerNavigator';
import { RootStackParamList } from '@/navigation/AppNavigator';

interface BottomSheetContentProps {
  onClose: () => void;
  onScrollStart?: () => void;
  onScrollEnd?: () => void;
  onScroll?: (scrollY: number) => void;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface GridButtonItem {
  id: string;
  label: string;
  icon: string;
  color: string;
  screen: keyof DrawerParamList | keyof RootStackParamList;
}

interface ListItem {
  id: string;
  label: string;
  subtitle: string;
  icon: string;
  screen: keyof DrawerParamList | keyof RootStackParamList;
}

// Memoized Grid Button Component
const GridButton = React.memo<{
  item: GridButtonItem;
  onPress: (screen: keyof DrawerParamList | keyof RootStackParamList) => void;
  theme: any;
}>(({ item, onPress, theme }) => (
  <TouchableOpacity
    style={[
      styles.gridButton,
      {
        backgroundColor: item.color + '15',
      },
    ]}
    onPress={() => {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress(item.screen);
    }}
    activeOpacity={0.7}
  >
    <View style={[styles.gridIconContainer, { backgroundColor: item.color }]}>
      <Ionicons name={item.icon as any} size={24} color="#FFFFFF" />
    </View>
    <Text style={[styles.gridLabel, { color: theme.colors.text.primary }]}>
      {item.label}
    </Text>
  </TouchableOpacity>
));
GridButton.displayName = 'GridButton';

// Memoized List Item Component
const ListItemComponent = React.memo<{
  item: ListItem;
  onPress: (screen: keyof DrawerParamList | keyof RootStackParamList) => void;
  theme: any;
  isDark: boolean;
}>(({ item, onPress, theme, isDark }) => (
  <TouchableOpacity
    style={[
      styles.listItem,
      {
        backgroundColor: isDark ? '#2A2A2A' : '#F8F9FA',
      },
    ]}
    onPress={() => {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress(item.screen);
    }}
    activeOpacity={0.7}
  >
    <View style={[styles.listIconContainer, { backgroundColor: theme.colors.primary.main + '20' }]}>
      <Ionicons name={item.icon as any} size={22} color={theme.colors.primary.main} />
    </View>
    <View style={styles.listTextContainer}>
      <Text style={[styles.listLabel, { color: theme.colors.text.primary }]}>
        {item.label}
      </Text>
      <Text style={[styles.listSubtitle, { color: theme.colors.text.secondary }]}>
        {item.subtitle}
      </Text>
    </View>
    <Ionicons
      name="chevron-forward"
      size={20}
      color={theme.colors.text.tertiary}
    />
  </TouchableOpacity>
));
ListItemComponent.displayName = 'ListItemComponent';

const BottomSheetContent: React.FC<BottomSheetContentProps> = ({ 
  onClose, 
  onScrollStart, 
  onScrollEnd, 
  onScroll: onScrollUpdate
}) => {
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDark } = useTheme();
  const { logout } = useAuth();

  const gridButtons: GridButtonItem[] = useMemo(() => [
    {
      id: 'garage',
      label: 'Garajım',
      icon: 'car-outline',
      color: '#A78BFA',
      screen: 'Garage',
    },
    {
      id: 'wallet',
      label: 'Cüzdan',
      icon: 'wallet-outline',
      color: '#818CF8',
      screen: 'Wallet',
    },
    {
      id: 'tefe-wallet',
      label: 'TEFE Cüzdan',
      icon: 'cash-outline',
      color: '#34D399',
      screen: 'TefeWallet',
    },
    {
      id: 'orders',
      label: 'Siparişlerim',
      icon: 'receipt-outline',
      color: '#F472B6',
      screen: 'Orders',
    },
    {
      id: 'favorites',
      label: 'Favorilerim',
      icon: 'heart-outline',
      color: '#60A5FA',
      screen: 'Favorites',
    },
    {
      id: 'notifications',
      label: 'Bildirimler',
      icon: 'notifications-outline',
      color: '#FBBF24',
      screen: 'Notifications',
    },
  ], []);

  const listItems: ListItem[] = useMemo(() => [
    {
      id: 'profile',
      label: 'Profil',
      subtitle: 'Kişisel bilgileriniz',
      icon: 'person-outline',
      screen: 'Profile',
    },
    {
      id: 'settings',
      label: 'Ayarlar',
      subtitle: 'Tema, renk, vb.',
      icon: 'settings-outline',
      screen: 'Settings',
    },
    {
      id: 'reminders',
      label: 'Hatırlatıcılar',
      subtitle: 'Bakım hatırlatıcıları',
      icon: 'time-outline',
      screen: 'Reminders',
    },
    {
      id: 'support',
      label: 'Destek',
      subtitle: 'Bizimle iletişime geçin',
      icon: 'help-circle-outline',
      screen: 'Support',
    },
  ], []);

  const handleNavigation = useCallback((screen: keyof DrawerParamList | keyof RootStackParamList) => {
    onClose();
    setTimeout(() => {
      try {
        navigation.navigate(screen as any);
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }, 250);
  }, [onClose, navigation]);

  const handleClose = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onClose();
  }, [onClose]);

  const handleLogout = useCallback(async () => {
    onClose();
    setTimeout(() => {
      Alert.alert(
        'Çıkış Yap',
        'Hesabınızdan çıkmak istediğinizden emin misiniz?',
        [
          { 
            text: 'İptal', 
            style: 'cancel' 
          },
          { 
            text: 'Çıkış Yap', 
            style: 'destructive',
            onPress: async () => {
              try {
                await logout();
              } catch (error) {
                console.error('Logout error:', error);
              }
            }
          }
        ]
      );
    }, 250);
  }, [onClose, logout]);

  const handleScroll = useCallback((event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    onScrollUpdate?.(scrollY);
  }, [onScrollUpdate]);

  const WaveBackground = React.memo(() => {
    const waveColor = isDark ? '#4B3A8A' : theme.colors.primary.main;
    return (
      <Svg
        width="100%"
        height="120"
        viewBox="0 0 375 120"
        style={styles.waveSvg}
        preserveAspectRatio="none"
      >
        <Path
          d="M0,100 Q93.75,50 187.5,70 T375,50 L375,120 L0,120 Z"
          fill={waveColor}
        />
      </Svg>
    );
  });

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={(e) => {
          onScrollStart?.();
        }}
        onScrollEndDrag={(e) => {
          onScrollEnd?.();
        }}
        onMomentumScrollBegin={() => {
          onScrollStart?.();
        }}
        onMomentumScrollEnd={(e) => {
          onScrollEnd?.();
        }}
        nestedScrollEnabled={true}
        bounces={true}
        scrollEventThrottle={8}
        removeClippedSubviews={true}
        keyboardShouldPersistTaps="handled"
        decelerationRate="normal"
        directionalLockEnabled={true}
      >
        {/* Grid Butonlar */}
        <View style={styles.gridContainer}>
          {gridButtons.map((item) => (
            <GridButton
              key={item.id}
              item={item}
              onPress={handleNavigation}
              theme={theme}
            />
          ))}
        </View>

        {/* DAHA FAZLA SEÇENEK Başlığı */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary.main }]}>
            DAHA FAZLA SEÇENEK
          </Text>
        </View>

        {/* Liste Öğeleri */}
        <View style={styles.listContainer}>
          {listItems.map((item) => (
            <ListItemComponent
              key={item.id}
              item={item}
              onPress={handleNavigation}
              theme={theme}
              isDark={isDark}
            />
          ))}
        </View>

        {/* Çıkış Yap Butonu */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={[
              styles.logoutButton, 
              { 
                backgroundColor: isDark ? '#2A2A2A' : '#F8F9FA',
                borderColor: isDark ? theme.colors.error.main + '40' : theme.colors.error.main + '20',
              }
            ]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.colors.error.main} />
            <Text style={[styles.logoutText, { color: theme.colors.error.main }]}>
              Çıkış Yap
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dalgalı Alt Tasarım ve Kapatma Butonu */}
        <View style={styles.footerContainer}>
          <WaveBackground />
          <View style={styles.closeButtonContainer}>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.colors.primary.main }]}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 24,
  },
  gridButton: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginBottom: 12,
    borderWidth: 0,
  },
  gridIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  listContainer: {
    marginBottom: 24,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    marginBottom: 10,
    borderBottomWidth: 0,
  },
  listIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listTextContainer: {
    flex: 1,
  },
  listLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  listSubtitle: {
    fontSize: 13,
  },
  logoutSection: {
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footerContainer: {
    height: 120,
    position: 'relative',
    marginTop: 8,
    marginBottom: 20,
  },
  waveSvg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  closeButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
});

export default React.memo(BottomSheetContent);