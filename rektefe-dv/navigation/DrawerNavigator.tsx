import React from 'react';
import { createDrawerNavigator, DrawerNavigationProp } from '@react-navigation/drawer';
import TabNavigator from './TabNavigator';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  Rektagram: undefined;
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

  return (
    <BlurView intensity={60} tint="dark" style={styles.drawerContainer}>
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
        <DrawerItem icon="account" label="Profil" onPress={() => navigation.navigate('Profile')} />
        <DrawerItem icon="calendar-clock" label="Randevularım" onPress={() => navigation.navigate('Appointments')} />
        <DrawerItem icon="cart" label="Siparişlerim" onPress={() => navigation.navigate('Orders')} />
        <DrawerItem icon="ticket-percent" label="TefeKodlarım" onPress={() => navigation.navigate('TefeCodes')} />
        <DrawerItem icon="calendar" label="Hatırlatıcılar" onPress={() => navigation.navigate('Reminders')} />
        <DrawerItem icon="cog" label="Ayarlar" onPress={() => navigation.navigate('Settings')} />
        <DrawerItem icon="heart" label="Favorilerim" onPress={() => navigation.navigate('Favorites')} />
      </View>
      <View style={styles.bottomSection}>
        <DrawerItem icon="logout" label="Çıkış Yap" onPress={() => navigation.navigate('Login')} />
        <DrawerItem icon="delete" label="Hesabı Sil" onPress={() => navigation.navigate('DeleteAccount')} />
      </View>
    </BlurView>
  );
};

const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
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
  drawerContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
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