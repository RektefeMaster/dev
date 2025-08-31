import React, { useState, useEffect, useRef } from 'react';
import { createDrawerNavigator, DrawerNavigationProp } from '@react-navigation/drawer';
import TabNavigator from './TabNavigator';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Platform, 
  Animated, 
  Dimensions,
  StatusBar,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import { MyRatingsScreen } from '../screens/MyRatingsScreen';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';
import { apiService } from '../services/api';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/theme';

const { width: screenWidth } = Dimensions.get('window');

// Navigation tiplerini güncelliyoruz
type RootStackParamList = {
  MainTabs: undefined;
  Home: undefined;
  Wallet: undefined;
  Garage: undefined;
  Profile: undefined;
  Support: undefined;
  TefeWallet: undefined;
  Login: undefined;
  Orders: undefined;
  Notifications: undefined;
  TefeCodes: undefined;
  Reminders: undefined;
  Settings: undefined;
  Favorites: undefined;
  DeleteAccount: undefined;
  Appointments: undefined;
  MyRatings: undefined;
};

const Drawer = createDrawerNavigator();

// Şoför veri tipleri
interface DriverVehicle {
  brand: string;
  model: string;
  plateNumber: string;
}

// Gelişmiş Drawer Item bileşeni
const DrawerItem = ({ 
  icon, 
  label, 
  subtitle,
  badge,
  onPress, 
  isDark, 
  colors, 
  isActive = false,
  isLast = false 
}: { 
  icon: string; 
  label: string; 
  subtitle?: string;
  badge?: string | number;
  onPress: () => void; 
  isDark: boolean;
  colors: any;
  isActive?: boolean;
  isLast?: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 300,
      delay: 100,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ opacity: opacityAnim }}>
      <TouchableOpacity 
        style={[
          styles.drawerItem, 
          isActive && styles.drawerItemActive,
          isLast && styles.drawerItemLast,
          { 
            backgroundColor: isActive 
              ? (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(37, 99, 235, 0.08)')
              : 'transparent',
            borderColor: isActive 
              ? (isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(37, 99, 235, 0.15)')
              : 'transparent'
          }
        ]} 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <Animated.View style={[
          styles.iconContainer,
          isActive && styles.iconContainerActive,
          { transform: [{ scale: scaleAnim }] }
        ]}>
          <MaterialCommunityIcons 
            name={icon as any} 
            size={22} 
            color={isActive 
              ? colors.primary.main 
              : (isDark ? colors.text.tertiary : colors.text.quaternary)
            } 
          />
        </Animated.View>
        
        <View style={styles.itemContent}>
          <Text style={[
            styles.drawerItemText, 
            { 
              color: isActive 
                ? colors.primary.main 
                : (isDark ? colors.text.primary.dark : colors.text.primary.main)
            }
          ]}>
            {label}
          </Text>
          {subtitle && (
            <Text style={[
              styles.drawerItemSubtitle,
              { color: isDark ? colors.text.quaternary : colors.text.tertiary }
            ]}>
              {subtitle}
            </Text>
          )}
        </View>

        {badge !== undefined && badge !== null && (
          <View style={[
            styles.badge,
            { backgroundColor: colors.primary.main }
          ]}>
            <Text style={styles.badgeText}>{String(badge)}</Text>
          </View>
        )}

        <MaterialCommunityIcons 
          name="chevron-right" 
          size={18} 
          color={isDark ? colors.text.quaternary : colors.text.tertiary} 
          style={styles.chevron}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Gelişmiş Custom Drawer Content
const CustomDrawerContent = (props: any) => {
  const navigation = useNavigation<any>();
  const { token, isAuthenticated, logout } = useAuth();
  const { isDark, colors } = useTheme();
  const [userName, setUserName] = useState<string>('Kullanıcı');
  const [userSurname, setUserSurname] = useState<string>('');
  const [activeRoute, setActiveRoute] = useState<string>('MainTabs');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('Şoför');
  
  // Şoför verileri
  const [driverVehicle, setDriverVehicle] = useState<DriverVehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Animasyon değerleri
  const profileScale = useRef(new Animated.Value(0.8)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuTranslateY = useRef(new Animated.Value(20)).current;

  // Şoför bilgilerini al
  useEffect(() => {
    const fetchDriverInfo = async () => {
      try {
        setIsLoading(true);
        
        if (token && isAuthenticated) {
          // Kullanıcı profil bilgileri
          const profileResponse = await apiService.getUserProfile();
          
          if (profileResponse.success && profileResponse.data) {
            setUserName(profileResponse.data.name || 'Kullanıcı');
            setUserSurname(profileResponse.data.surname || '');
            setUserAvatar(profileResponse.data.avatar || null);
          }

          // Araç bilgileri - geçici olarak mock data kullan
          try {
            const vehiclesResponse = await apiService.getDriverVehicles();
            if (vehiclesResponse.success && vehiclesResponse.data && vehiclesResponse.data.length > 0) {
              setDriverVehicle(vehiclesResponse.data[0]); // İlk aracı al
            }
          } catch (error) {
            console.log('Araç bilgileri alınamadı, mock data kullanılıyor:', error);
            // Geçici mock data
            setDriverVehicle({
              brand: 'Toyota',
              model: 'Corolla',
              plateNumber: '34 ABC 123'
            });
          }
        }
      } catch (error: any) {
        console.error('❌ DrawerNavigator: Şoför bilgileri alınamadı:', error);
        
        if (error.response?.status === 401) {
          await logout();
          navigation.navigate('Login');
          return;
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (token && isAuthenticated) {
      fetchDriverInfo();
    }
  }, [token]);

  // Animasyonları başlat
  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.spring(profileScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(menuOpacity, {
          toValue: 1,
          duration: 400,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.timing(menuTranslateY, {
          toValue: 0,
          duration: 400,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading]);

  const handleNavigation = (screenName: string) => {
    setActiveRoute(screenName);
    props.navigation.closeDrawer();
    navigation.navigate(screenName);
  };

  const handleLogout = async () => {
    try {
      props.navigation.closeDrawer();
      await logout();
      navigation.navigate('Login');
    } catch (error) {
      console.error('❌ DrawerNavigator: Logout hatası:', error);
      navigation.navigate('Login');
    }
  };



  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent" 
        translucent 
      />
      
      <View style={[styles.drawerWrapper, { 
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)' 
      }]}>
        <BlurView
          intensity={90}
          tint={isDark ? "dark" : "light"}
          style={[styles.blurView, { 
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)' 
          }]}
        >
          <ScrollView 
            style={styles.drawerContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Safe Area için üst boşluk */}
            <View style={styles.safeAreaTop} />
            
            {/* Gelişmiş Şoför Profile Section */}
            <Animated.View 
              style={[
                styles.profileSection,
                { transform: [{ scale: profileScale }] }
              ]}
            >
              <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                  {userAvatar ? (
                    <Image
                      source={{ uri: userAvatar }}
                      style={styles.avatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.defaultAvatar}>
                      <MaterialCommunityIcons 
                        name="account" 
                        size={32} 
                        color={isDark ? colors.text.primary.dark : colors.text.primary.main} 
                      />
                    </View>
                  )}
                  <View style={styles.onlineIndicator} />
                </View>
                
                <View style={styles.profileTextContainer}>
                  <Text style={[styles.helloText, { 
                    color: isDark ? colors.text.tertiary : colors.text.quaternary 
                  }]}>
                    Merhaba 👋
                  </Text>
                  <Text style={[styles.nameText, { 
                    color: isDark ? colors.text.primary.dark : colors.text.primary.main 
                  }]}>
                    {userName} {userSurname}
                  </Text>
                  <View style={styles.roleContainer}>
                    <MaterialCommunityIcons 
                      name="steering" 
                      size={14} 
                      color={colors.primary.main} 
                    />
                    <Text style={[styles.userTypeText, { 
                      color: colors.primary.main 
                    }]}>
                      Şoför
                    </Text>
                  </View>
                </View>
              </View>

              {/* Şoför Araç Bilgileri */}
              {driverVehicle && (
                <View style={styles.vehicleContainer}>
                  <View style={styles.vehicleHeader}>
                    <MaterialCommunityIcons 
                      name="car" 
                      size={20} 
                      color={colors.primary.main} 
                    />
                    <Text style={[styles.vehicleTitle, { 
                      color: isDark ? colors.text.primary.dark : colors.text.primary.main 
                    }]}>
                      Araç
                    </Text>
                  </View>
                  <View style={styles.vehicleInfo}>
                    <Text style={[styles.vehicleText, { 
                      color: isDark ? colors.text.quaternary : colors.text.tertiary 
                    }]}>
                      {driverVehicle.brand} {driverVehicle.model}
                    </Text>
                    <Text style={[styles.plateText, { 
                      color: colors.primary.main 
                    }]}>
                      {driverVehicle.plateNumber}
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>

            {/* Gelişmiş Menu Section */}
            <Animated.View 
              style={[
                styles.menuSection,
                { 
                  opacity: menuOpacity,
                  transform: [{ translateY: menuTranslateY }]
                }
              ]}
            >
              <Text style={[styles.sectionTitle, { 
                color: isDark ? colors.text.quaternary : colors.text.tertiary 
              }]}>
                Ana Menü
              </Text>
              
              <DrawerItem 
                icon="home-variant" 
                label="Ana Sayfa" 
                subtitle="Ana ekran ve özet"
                onPress={() => handleNavigation('MainTabs')} 
                isDark={isDark} 
                colors={colors}
                isActive={activeRoute === 'MainTabs'}
              />
              <DrawerItem 
                icon="account-circle" 
                label="Profil" 
                subtitle="Hesap bilgileri"
                onPress={() => handleNavigation('Profile')} 
                isDark={isDark} 
                colors={colors}
                isActive={activeRoute === 'Profile'}
              />
              <DrawerItem 
                icon="calendar-clock" 
                label="Randevularım" 
                subtitle="Gelecek randevular"
                badge={0} // Randevu sayısını buraya ekleyebilirsiniz
                onPress={() => handleNavigation('Appointments')} 
                isDark={isDark} 
                colors={colors}
                isActive={activeRoute === 'Appointments'}
              />
              <DrawerItem 
                icon="message-text" 
                label="Mesajlar" 
                subtitle="Usta ile iletişim"
                onPress={() => handleNavigation('Messages')} 
                isDark={isDark} 
                colors={colors}
                isActive={activeRoute === 'Messages'}
              />
              
              <View style={styles.menuDivider} />
              
              <Text style={[styles.sectionTitle, { 
                color: isDark ? colors.text.quaternary : colors.text.tertiary 
              }]}>
                Hizmetler
              </Text>
              
              <DrawerItem 
                icon="star" 
                label="Verdiğim Puanlar" 
                subtitle="Değerlendirmelerim"
                onPress={() => handleNavigation('MyRatings')} 
                isDark={isDark} 
                colors={colors}
                isActive={activeRoute === 'MyRatings'}
              />
              <DrawerItem 
                icon="shopping" 
                label="Siparişlerim" 
                subtitle="Geçmiş siparişler"
                onPress={() => handleNavigation('Orders')} 
                isDark={isDark} 
                colors={colors}
                isActive={activeRoute === 'Orders'}
              />
              <DrawerItem 
                icon="ticket-percent" 
                label="TefeKodlarım" 
                subtitle="İndirim kodları"
                onPress={() => handleNavigation('TefeCodes')} 
                isDark={isDark} 
                colors={colors}
                isActive={activeRoute === 'TefeCodes'}
              />
              <DrawerItem 
                icon="bell-ring" 
                label="Hatırlatıcılar" 
                subtitle="Bakım hatırlatıcıları"
                onPress={() => handleNavigation('Reminders')} 
                isDark={isDark} 
                colors={colors}
                isActive={activeRoute === 'Reminders'}
              />
              
              <View style={styles.menuDivider} />
              
              <Text style={[styles.sectionTitle, { 
                color: isDark ? colors.text.quaternary : colors.text.tertiary 
              }]}>
                Ayarlar
              </Text>
              
              <DrawerItem 
                icon="cog" 
                label="Ayarlar" 
                subtitle="Uygulama ayarları"
                onPress={() => handleNavigation('Settings')} 
                isDark={isDark} 
                colors={colors}
                isActive={activeRoute === 'Settings'}
              />
              <DrawerItem 
                icon="heart" 
                label="Favorilerim" 
                subtitle="Kayıtlı ustalar"
                onPress={() => handleNavigation('Favorites')} 
                isDark={isDark} 
                colors={colors}
                isActive={activeRoute === 'Favorites'}
              />
            </Animated.View>

            {/* Gelişmiş Bottom Section */}
            <View style={styles.bottomSection}>
              <View style={styles.menuDivider} />
              
              <DrawerItem 
                icon="logout" 
                label="Çıkış Yap" 
                subtitle="Hesaptan çıkış"
                onPress={handleLogout} 
                isDark={isDark} 
                colors={colors}
                isActive={false}
                isLast={true}
              />
              <DrawerItem 
                icon="delete-alert" 
                label="Hesabı Sil" 
                subtitle="Kalıcı olarak sil"
                onPress={() => handleNavigation('DeleteAccount')} 
                isDark={isDark} 
                colors={colors}
                isActive={false}
                isLast={true}
              />
            </View>

            {/* Versiyon bilgisi */}
            <View style={styles.versionContainer}>
              <Text style={[styles.versionText, { 
                color: isDark ? colors.text.quaternary : colors.text.tertiary 
              }]}>
                v1.0.0 • RekTeFe
              </Text>
            </View>
          </ScrollView>
        </BlurView>
      </View>
    </SafeAreaView>
  );
};

const DrawerNavigator = () => {
  const { isDark, colors } = useTheme();
  
  return (
    <Drawer.Navigator
      id={undefined}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: 'transparent',
          width: screenWidth * 0.85,
        },
        drawerType: 'front',
        swipeEdgeWidth: 60,
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        swipeEnabled: true,
      }}
    >
      <Drawer.Screen name="MainTabs" component={TabNavigator} />
      <Drawer.Screen 
        name="Appointments" 
        component={AppointmentsScreen}
        options={{
          headerShown: true,
          title: 'Randevularım',
          headerStyle: {
            backgroundColor: isDark ? colors.background.tertiary : colors.background.primary,
          },
          headerTintColor: isDark ? colors.text.primary.dark : colors.text.primary.main,
        }}
      />
      <Drawer.Screen 
        name="MyRatings" 
        component={MyRatingsScreen}
        options={{
          headerShown: true,
          title: 'Verdiğim Puanlar',
          headerStyle: {
            backgroundColor: isDark ? colors.background.tertiary : colors.background.primary,
          },
          headerTintColor: isDark ? colors.text.primary.dark : colors.text.primary.main,
        }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  drawerWrapper: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  blurView: {
    flex: 1,
  },
  drawerContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  profileSection: {
    marginBottom: spacing.xl,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: borderRadius.avatar,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.avatar - 2,
  },
  defaultAvatar: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.avatar - 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success.main,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  profileTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  helloText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '500',
    marginBottom: spacing.xs,
    opacity: 0.8,
  },
  nameText: {
    fontSize: typography.fontSizes.xl,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  userTypeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: '500',
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  menuSection: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  sectionTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: '600',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.7,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: spacing.md,
    marginHorizontal: spacing.sm,
  },
  bottomSection: {
    marginTop: spacing.md,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.lg,
    minHeight: 56,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  drawerItemActive: {
    borderWidth: 1,
  },
  drawerItemLast: {
    marginBottom: 0,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  itemContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  drawerItemText: {
    fontSize: typography.fontSizes.md,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  drawerItemSubtitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: '400',
    opacity: 0.7,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: typography.fontSizes.xs,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: spacing.sm,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  versionText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: '400',
    opacity: 0.6,
  },
  // Safe Area ve yeni eklenen stiller
  safeAreaTop: {
    height: Platform.OS === 'ios' ? 60 : 40,
  },
  vehicleContainer: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  vehicleTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  vehicleInfo: {
    marginTop: spacing.xs,
  },
  vehicleText: {
    fontSize: typography.fontSizes.xs,
    marginBottom: spacing.xs,
  },
  plateText: {
    fontSize: typography.fontSizes.md,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },

});

export default DrawerNavigator; 