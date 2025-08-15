import React from 'react';
import { createDrawerNavigator, DrawerNavigationProp } from '@react-navigation/drawer';
import TabNavigator from './TabNavigator';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
import AppointmentsScreen from '../screens/AppointmentsScreen';

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
};

const Drawer = createDrawerNavigator();

const DrawerItem = ({ icon, label, onPress, rightIcon }: { icon: string; label: string; onPress: () => void; rightIcon?: React.ReactNode }) => (
  <TouchableOpacity style={styles.drawerItem} onPress={onPress}>
    <MaterialCommunityIcons name={icon as any} size={24} color="#fff" />
    <Text style={styles.drawerItemText}>{label}</Text>
    {rightIcon && <View style={{ marginLeft: 'auto' }}>{rightIcon}</View>}
  </TouchableOpacity>
);

const CustomDrawerContent = (props: any) => {
  const navigation = useNavigation<any>();

  const handleNavigation = (screenName: string) => {
    // Drawer'ı kapat
    props.navigation.closeDrawer();
    
    // Screen'e navigate et
    navigation.navigate(screenName);
  };

  const handleLogout = () => {
    // Drawer'ı kapat
    props.navigation.closeDrawer();
    
    // Login screen'e navigate et
    navigation.navigate('Login');
  };

  return (
    <View style={styles.drawerWrapper}>
      <BlurView
        intensity={60}
        tint="dark"
        style={styles.blurView}
      >
        <View style={styles.drawerContainer}>
          <View style={styles.profileSection}>
            <Image
              source={require('../assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.helloText}>Merhaba,</Text>
            <Text style={styles.nameText}>Nurullah Aydın</Text>
          </View>
          <View style={styles.menuSection}>
            <DrawerItem icon="account" label="Profil" onPress={() => handleNavigation('Profile')} />
            <DrawerItem icon="calendar-clock" label="Randevularım" onPress={() => handleNavigation('Appointments')} />
            <DrawerItem icon="cart" label="Siparişlerim" onPress={() => handleNavigation('Orders')} />
            <DrawerItem icon="ticket-percent" label="TefeKodlarım" onPress={() => handleNavigation('TefeCodes')} />
            <DrawerItem icon="calendar" label="Hatırlatıcılar" onPress={() => handleNavigation('Reminders')} />
            <DrawerItem icon="cog" label="Ayarlar" onPress={() => handleNavigation('Settings')} />
            <DrawerItem icon="heart" label="Favorilerim" onPress={() => handleNavigation('Favorites')} />
          </View>
          <View style={styles.bottomSection}>
            <DrawerItem icon="logout" label="Çıkış Yap" onPress={handleLogout} />
            <DrawerItem icon="delete" label="Hesabı Sil" onPress={() => handleNavigation('DeleteAccount')} />
          </View>
        </View>
      </BlurView>
    </View>
  );
};

const DrawerNavigator = () => {
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
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // BlurView için hafif şeffaf arka plan
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
    color: '#fff',
    fontSize: 18,
    fontWeight: '400',
  },
  nameText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 4,
  },
  menuSection: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 2,
  },
  bottomSection: {
    marginTop: 32,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
    marginBottom: 2,
  },
  drawerItemText: {
    marginLeft: 18,
    fontSize: 17,
    color: '#fff',
    fontWeight: '500',
  },
});

export default DrawerNavigator; 