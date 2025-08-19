import React, { useState, useEffect } from 'react';
import { createDrawerNavigator, DrawerNavigationProp } from '@react-navigation/drawer';
import TabNavigator from './TabNavigator';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import { MyRatingsScreen } from '../screens/MyRatingsScreen';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';
import theme from '../theme/theme';

// Navigation tiplerini güncelliyoruz
// Drawer'da açılacak ekranlar
// (REKAİ hariç!)
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

const DrawerItem = ({ icon, label, onPress, rightIcon, isDark }: { 
  icon: string; 
  label: string; 
  onPress: () => void; 
  rightIcon?: React.ReactNode;
  isDark: boolean;
}) => (
  <TouchableOpacity style={[styles.drawerItem, { 
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' 
  }]} onPress={onPress}>
    <MaterialCommunityIcons 
      name={icon as any} 
      size={24} 
      color={isDark ? theme.colors.text.primary.dark : theme.colors.text.primary.light} 
    />
    <Text style={[styles.drawerItemText, { 
      color: isDark ? theme.colors.text.primary.dark : theme.colors.text.primary.light 
    }]}>{label}</Text>
    {rightIcon && <View style={{ marginLeft: 'auto' }}>{rightIcon}</View>}
  </TouchableOpacity>
);

const CustomDrawerContent = (props: any) => {
  const navigation = useNavigation<any>();
  const { token, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [userName, setUserName] = useState<string>('Kullanıcı');
  const [userSurname, setUserSurname] = useState<string>('');

  // Kullanıcı bilgilerini al
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        console.log('🔍 DrawerNavigator: fetchUserInfo çağrıldı');
        console.log('🔍 DrawerNavigator: Token:', token ? 'Mevcut' : 'Yok');
        console.log('🔍 DrawerNavigator: isAuthenticated:', isAuthenticated);
        
        if (token && isAuthenticated) {
          const response = await fetch(`${API_URL}/users/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          
          console.log('🔍 DrawerNavigator: API Response:', data);
          
          if (data.success && data.data) {
            setUserName(data.data.name || 'Kullanıcı');
            setUserSurname(data.data.surname || '');
            console.log('✅ DrawerNavigator: Kullanıcı bilgileri güncellendi:', data.data.name, data.data.surname);
          }
        } else {
          console.log('⚠️ DrawerNavigator: Token veya isAuthenticated yok');
        }
      } catch (error) {
        console.error('❌ DrawerNavigator: Kullanıcı bilgileri alınamadı:', error);
      }
    };

    // Sadece token değiştiğinde çalışsın, isAuthenticated değişiminde tekrar çalışmasın
    if (token && isAuthenticated) {
      fetchUserInfo();
    }
  }, [token]); // isAuthenticated dependency'sini kaldırdım

  const handleNavigation = (screenName: string) => {
    // Drawer'ı kapat
    props.navigation.closeDrawer();
    
    // Screen'e navigate et
    navigation.navigate(screenName);
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 DrawerNavigator: Logout başlatılıyor');
      
      // Drawer'ı kapat
      props.navigation.closeDrawer();
      
      // AuthContext'te logout çağır (AsyncStorage temizler ve state'i sıfırlar)
      await logout();
      
      console.log('✅ DrawerNavigator: Logout başarılı, Login ekranına yönlendiriliyor');
      
      // Login screen'e navigate et
      navigation.navigate('Login');
    } catch (error) {
      console.error('❌ DrawerNavigator: Logout hatası:', error);
      // Hata olsa bile Login'e git
      navigation.navigate('Login');
    }
  };

  return (
    <View style={[styles.drawerWrapper, { 
      backgroundColor: isDark ? theme.colors.background.default.dark : theme.colors.background.default.light 
    }]}>
      <BlurView
        intensity={60}
        tint={isDark ? "dark" : "light"}
        style={[styles.blurView, { 
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)' 
        }]}
      >
        <View style={styles.drawerContainer}>
          <View style={styles.profileSection}>
            <Image
              source={require('../assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.helloText, { 
              color: isDark ? theme.colors.text.primary.dark : theme.colors.text.primary.light 
            }]}>Merhaba,</Text>
            <Text style={[styles.nameText, { 
              color: isDark ? theme.colors.text.primary.dark : theme.colors.text.primary.light 
            }]}>
              {userName} {userSurname}
            </Text>
          </View>
          <View style={styles.menuSection}>
            <DrawerItem icon="home" label="Ana Sayfa" onPress={() => handleNavigation('MainTabs')} isDark={isDark} />
            <DrawerItem icon="account" label="Profil" onPress={() => handleNavigation('Profile')} isDark={isDark} />
            <DrawerItem icon="calendar-clock" label="Randevularım" onPress={() => handleNavigation('Appointments')} isDark={isDark} />
            <DrawerItem icon="message" label="Mesajlar" onPress={() => handleNavigation('Messages')} isDark={isDark} />
            <DrawerItem icon="star" label="Verdiğim Puanlar" onPress={() => handleNavigation('MyRatings')} isDark={isDark} />
            <DrawerItem icon="cart" label="Siparişlerim" onPress={() => handleNavigation('Orders')} isDark={isDark} />
            <DrawerItem icon="ticket-percent" label="TefeKodlarım" onPress={() => handleNavigation('TefeCodes')} isDark={isDark} />
            <DrawerItem icon="calendar" label="Hatırlatıcılar" onPress={() => handleNavigation('Reminders')} isDark={isDark} />
            <DrawerItem icon="cog" label="Ayarlar" onPress={() => handleNavigation('Settings')} isDark={isDark} />
            <DrawerItem icon="heart" label="Favorilerim" onPress={() => handleNavigation('Favorites')} isDark={isDark} />
          </View>
          <View style={styles.themeSection}>
            <View style={[styles.themeItem, { 
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' 
            }]}>
              <MaterialCommunityIcons 
                name="theme-light-dark" 
                size={24} 
                color={isDark ? theme.colors.text.primary.dark : theme.colors.text.primary.light} 
              />
              <Text style={[styles.themeText, { 
                color: isDark ? theme.colors.text.primary.dark : theme.colors.text.primary.light 
              }]}>Karanlık Mod</Text>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ 
                  false: isDark ? theme.colors.neutral[600] : theme.colors.neutral[300], 
                  true: theme.colors.primary.main 
                }}
                thumbColor={isDark ? theme.colors.primary.main : theme.colors.neutral[100]}
                ios_backgroundColor={isDark ? theme.colors.neutral[700] : theme.colors.neutral[400]}
              />
            </View>
          </View>
          <View style={styles.bottomSection}>
            <DrawerItem icon="logout" label="Çıkış Yap" onPress={handleLogout} isDark={isDark} />
            <DrawerItem icon="delete" label="Hesabı Sil" onPress={() => handleNavigation('DeleteAccount')} isDark={isDark} />
          </View>
        </View>
      </BlurView>
    </View>
  );
};

const DrawerNavigator = () => {
  const { isDark } = useTheme();
  
  return (
    <Drawer.Navigator
      id={undefined}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: 'transparent',
          width: '80%',
        },
        drawerType: 'front',
        swipeEdgeWidth: 40,
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
            backgroundColor: isDark ? theme.colors.background.paper.dark : theme.colors.background.paper.light,
          },
          headerTintColor: isDark ? theme.colors.text.primary.dark : theme.colors.text.primary.light,
        }}
      />
      <Drawer.Screen 
        name="MyRatings" 
        component={MyRatingsScreen}
        options={{
          headerShown: true,
          title: 'Verdiğim Puanlar',
          headerStyle: {
            backgroundColor: isDark ? theme.colors.background.paper.dark : theme.colors.background.paper.light,
          },
          headerTintColor: isDark ? theme.colors.text.primary.dark : theme.colors.text.primary.light,
        }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerWrapper: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  blurView: {
    flex: 1,
  },
  drawerContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
    justifyContent: 'space-between',
  },
  profileSection: {
    marginBottom: 32,
    alignItems: 'flex-start',
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 16,
    borderRadius: 16,
  },
  helloText: {
    fontSize: 18,
    fontWeight: '400',
  },
  nameText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 4,
  },
  menuSection: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 2,
  },
  themeSection: {
    marginTop: 32,
    marginBottom: 32,
  },
  themeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 2,
    borderRadius: 12,
  },
  themeText: {
    fontSize: 17,
    fontWeight: '500',
    marginLeft: 18,
    flex: 1,
  },
  bottomSection: {
    marginTop: 32,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 2,
    borderRadius: 12,
  },
  drawerItemText: {
    marginLeft: 18,
    fontSize: 17,
    fontWeight: '500',
  },
});

export default DrawerNavigator; 