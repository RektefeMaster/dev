import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StackScreenProps } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/config';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreen';
import TabNavigator from './TabNavigator';
// import UserProfileScreen from '../screens/UserProfileScreen'; // Kaldırıldı
import ProfileScreen from '../screens/ProfileScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import HomeScreen from '../screens/HomeScreen/HomeScreen';
import MaintenancePlanScreen from '../screens/MaintenancePlanScreen';
import FaultReportScreen from '../screens/FaultReportScreen';
import FaultReportListScreen from '../screens/FaultReportListScreen';
import FaultReportDetailScreen from '../screens/FaultReportDetailScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import WalletScreen from '../screens/WalletScreen';
import GarageScreen from '../screens/GarageScreen';
import SupportScreen from '../screens/SupportScreen';
import TefeWalletScreen from '../screens/TefeWalletScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import MechanicSearchScreen from '../screens/MechanicSearchScreen';
import BookAppointmentScreen from '../screens/BookAppointmentScreen';
import PaymentScreen from '../screens/PaymentScreen';
import MechanicDetailScreen from '../screens/MechanicDetailScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatScreen from '../screens/ChatScreen';
import NewMessageScreen from '../screens/NewMessageScreen';
import { MyRatingsScreen } from '../screens/MyRatingsScreen';
import RatingScreen from '../screens/RatingScreen';
import TowingRequestScreen from '../screens/TowingRequestScreen';
import WashBookingScreen from '../screens/WashBookingScreen';
import TirePartsScreen from '../screens/TirePartsScreen';
import CampaignDetailScreen from '../screens/CampaignDetailScreen';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Main: { screen?: string };
  // UserProfile: { userId: string }; // Kaldırıldı
  Profile: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  ChangePassword: undefined;
  Home: undefined;
  MaintenancePlan: undefined;
  FaultReport: undefined;
  FaultReportList: undefined;
  FaultReportDetail: { faultReportId: string };
  Appointments: undefined;
  Wallet: undefined;
  Garage: undefined;
  Support: undefined;
  TefeWallet: undefined;
  Orders: undefined;
  Notifications: undefined;
  TefeCodes: undefined;
  Reminders: undefined;
  Settings: undefined;
  Favorites: undefined;
  DeleteAccount: undefined;
  MechanicSearch: undefined;
  MechanicDetail: {
    mechanic: {
      id: string;
      name: string;
      surname: string;
      rating: number;
      experience: number;
      totalJobs: number;
      specialties: string[];
      city: string;
      isAvailable: boolean;
      avatar?: string;
      bio?: string;
    };
  };
  CampaignDetail: { campaignId: number };
  BookAppointment: {
    mechanicId: string;
    mechanicName: string;
    mechanicSurname: string;
    vehicleId?: string;
    serviceType?: string;
    description?: string;
    faultReportId?: string;
  };
  Payment: {
    appointmentId?: string;
    mechanicId?: string;
    mechanicName?: string;
    serviceType?: string;
    price?: number;
    faultReportId?: string;
    amount?: number;
    serviceCategory?: string;
  };
  Messages: undefined;
  NewMessage: undefined;
  ChatScreen: {
    conversationId: string;
    otherParticipant: {
      _id: string;
      name: string;
      surname: string;
      avatar?: string;
      userType: string;
    };
  };
  MyRatings: undefined;
  Rating: {
    appointmentId: string;
    mechanicId: string;
    mechanicName: string;
  };
  // Yeni hizmet kategorileri ekranları
  TowingRequest: undefined;
  WashBooking: undefined;
  TireParts: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  
  console.log('🧭 AppNavigator - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'onboardingDone:', onboardingDone);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
        if (mounted) {
          setOnboardingDone(v === 'true');
        }
      } catch {
        if (mounted) {
          setOnboardingDone(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Loading aşamasında Splash göster
  if (isLoading || onboardingDone === null) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Auth/Onboarding/Main koşullu yönlendirme
  return (
    <NavigationContainer>
      <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
        {/* Ana ekranlar - koşullu */}
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={TabNavigator} />
        ) : (
          onboardingDone ? (
            <Stack.Screen name="Auth" component={AuthScreen} />
          ) : (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          )
        )}

        {/* Auth ekranını her zaman erişilebilir yap (duplicate olmaması için farklı isim) */}
        <Stack.Screen name="AuthScreen" component={AuthScreen} />
        <Stack.Screen name="OnboardingScreen" component={OnboardingScreen} />
        <Stack.Screen name="MainScreen" component={TabNavigator} />

        <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen 
          name="MaintenancePlan" 
          component={MaintenancePlanScreen}
          options={{
            title: 'Bakım Planla',
            headerStyle: {
              backgroundColor: '#007AFF',
            },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="FaultReport" 
          component={FaultReportScreen}
          options={{
            title: 'Arıza Bildir',
            headerStyle: {
              backgroundColor: '#FF4444',
            },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="FaultReportList" 
          component={FaultReportListScreen}
          options={{
            title: 'Arıza Bildirimlerim',
            headerStyle: {
              backgroundColor: '#FF4444',
            },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="FaultReportDetail" 
          component={FaultReportDetailScreen}
          options={{
            title: 'Arıza Detayı',
            headerStyle: {
              backgroundColor: '#FF4444',
            },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="Appointments" 
          component={AppointmentsScreen}
          options={{
            title: 'Randevularım',
            headerStyle: {
              backgroundColor: '#007AFF',
            },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="Garage" component={GarageScreen} />
        <Stack.Screen name="Support" component={SupportScreen} />
        <Stack.Screen name="TefeWallet" component={TefeWalletScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        <Stack.Screen name="MechanicSearch" component={MechanicSearchScreen} />
        <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="MechanicDetail" component={MechanicDetailScreen} />
        <Stack.Screen name="CampaignDetail" component={CampaignDetailScreen} />
        <Stack.Screen name="Messages" component={MessagesScreen} />
        <Stack.Screen name="NewMessage" component={NewMessageScreen} />
        <Stack.Screen name="ChatScreen" component={ChatScreen} />
        <Stack.Screen name="MyRatings" component={MyRatingsScreen} />
        <Stack.Screen 
          name="Rating" 
          component={RatingScreen}
          options={{
            title: 'Değerlendirme',
            headerStyle: {
              backgroundColor: '#F59E0B',
            },
            headerTintColor: '#fff',
          }}
        />
        
        {/* Yeni hizmet kategorileri ekranları */}
        <Stack.Screen 
          name="TowingRequest" 
          component={TowingRequestScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="WashBooking" 
          component={WashBookingScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="TireParts" 
          component={TirePartsScreen}
          options={{
            headerShown: false,
          }}
        />
        
        {/* Placeholder screens for missing functionality */}
        <Stack.Screen 
          name="Orders" 
          component={SupportScreen} // Geçici olarak SupportScreen kullanıyoruz
          options={{
            title: 'Siparişlerim',
            headerShown: true,
            headerStyle: { backgroundColor: '#007AFF' },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="TefeCodes" 
          component={SupportScreen} // Geçici olarak SupportScreen kullanıyoruz
          options={{
            title: 'TEFE Kodlarım',
            headerShown: true,
            headerStyle: { backgroundColor: '#007AFF' },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="Reminders" 
          component={SupportScreen} // Geçici olarak SupportScreen kullanıyoruz
          options={{
            title: 'Hatırlatıcılar',
            headerShown: true,
            headerStyle: { backgroundColor: '#007AFF' },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SupportScreen} // Geçici olarak SupportScreen kullanıyoruz
          options={{
            title: 'Ayarlar',
            headerShown: true,
            headerStyle: { backgroundColor: '#007AFF' },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="Favorites" 
          component={SupportScreen} // Geçici olarak SupportScreen kullanıyoruz
          options={{
            title: 'Favorilerim',
            headerShown: true,
            headerStyle: { backgroundColor: '#007AFF' },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="DeleteAccount" 
          component={SupportScreen} // Geçici olarak SupportScreen kullanıyoruz
          options={{
            title: 'Hesabı Sil',
            headerShown: true,
            headerStyle: { backgroundColor: '#007AFF' },
            headerTintColor: '#fff',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 
