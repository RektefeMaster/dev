import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StackScreenProps } from '@react-navigation/stack';
import { useAuth } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/config';

import SplashScreen from '@/features/home/screens/SplashScreen';
import OnboardingScreen from '@/features/auth/screens/OnboardingScreen';
import AuthScreen from '@/features/auth/screens/AuthScreen';
import TabNavigator from './TabNavigator';
import ProfileScreen from '@/features/profile/screens/ProfileScreen';
import ForgotPasswordScreen from '@/features/auth/screens/ForgotPasswordScreen';
import ResetPasswordScreen from '@/features/auth/screens/ResetPasswordScreen';
import ChangePasswordScreen from '@/features/auth/screens/ChangePasswordScreen';
import HomeScreen from '@/features/home/HomeScreen';
import MaintenancePlanScreen from '@/features/appointments/screens/MaintenancePlanScreen';
import FaultReportScreen from '@/features/fault-reports/screens/FaultReportScreen';
import FaultReportListScreen from '@/features/fault-reports/screens/FaultReportListScreen';
import FaultReportDetailScreen from '@/features/fault-reports/screens/FaultReportDetailScreen';
import AppointmentsScreen from '@/features/appointments/screens/AppointmentsScreen';
import WalletScreen from '@/features/wallet/screens/WalletScreen';
import GarageScreen from '@/features/services/screens/GarageScreen';
import SupportScreen from '@/features/support/screens/SupportScreen';
import TefeWalletScreen from '@/features/wallet/screens/TefeWalletScreen';
import NotificationsScreen from '@/features/notifications/screens/NotificationsScreen';
import NotificationSettingsScreen from '@/features/notifications/screens/NotificationSettingsScreen';
import MechanicSearchScreen from '@/features/mechanics/screens/MechanicSearchScreen';
import BookAppointmentScreen from '@/features/appointments/screens/BookAppointmentScreen';
import PaymentScreen from '@/features/wallet/screens/PaymentScreen';
import AddBalanceScreen from '@/features/wallet/screens/AddBalanceScreen';
import MechanicDetailScreen from '@/features/mechanics/screens/MechanicDetailScreen';
import MessagesScreen from '@/features/messages/screens/MessagesScreen';
import ChatScreen from '@/features/messages/screens/ChatScreen';
import NewMessageScreen from '@/features/messages/screens/NewMessageScreen';
import { MyRatingsScreen } from '@/features/profile/screens/MyRatingsScreen';
import RatingScreen from '@/features/profile/screens/RatingScreen';
import TowingRequestScreen from '@/features/towing/screens/TowingRequestScreen';
import QuickTowingScreen from '@/features/towing/screens/QuickTowingScreen';
import EmergencyTowingScreen from '@/features/towing/screens/EmergencyTowingScreen';
import EmergencyTrackingScreen from '@/features/towing/screens/EmergencyTrackingScreen';
import WashBookingScreen from '@/features/services/screens/WashBookingScreen';
import WashTrackingScreen from '@/features/services/screens/WashTrackingScreen';
import TirePartsScreen from '@/features/services/screens/TirePartsScreen';
import TireServiceTrackingScreen from '@/features/services/screens/TireServiceTrackingScreen';
import TireHealthScreen from '@/features/services/screens/TireHealthScreen';
import CampaignDetailScreen from '@/features/campaigns/screens/CampaignDetailScreen';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  OnboardingScreen: undefined;
  Auth: undefined;
  AuthScreen: undefined;
  Main: { screen?: string };
  MainScreen: { screen?: string };
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
  NotificationSettings: undefined;
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
  QuickTowing: undefined;
  EmergencyTowing: undefined;
  EmergencyTracking: { requestId: string; emergencyType?: 'accident' | 'breakdown' };
  WashBooking: undefined;
  WashTracking: { orderId: string };
  TireParts: undefined;
  TireServiceTracking: { jobId: string };
  TireHealth: { vehicleId?: string };
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  
  useEffect(() => {
    let mounted = true;
    const checkOnboardingStatus = async () => {
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
    };
    
    checkOnboardingStatus();
    
    // Onboarding durumunu periyodik olarak kontrol et (sadece onboarding tamamlanmadıysa)
    const interval = onboardingDone === false ? setInterval(checkOnboardingStatus, 500) : null;
    
    return () => { 
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Loading aşamasında Splash göster
  if (isLoading || onboardingDone === null) {
    return (
      <NavigationContainer>
        <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Auth/Onboarding/Main koşullu yönlendirme - Test için onboarding her zaman göster
  return (
    <NavigationContainer>
      <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
        {/* Ana ekranlar - koşullu */}
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={TabNavigator} />
        ) : (
          // Test için onboarding her zaman göster
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
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
        <Stack.Screen name="AddBalance" component={AddBalanceScreen} />
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
        {/* Messages screen moved to TabNavigator only - Navigation simplification */}
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
          name="QuickTowing" 
          component={QuickTowingScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="EmergencyTowing" 
          component={EmergencyTowingScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="EmergencyTracking" 
          component={EmergencyTrackingScreen}
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
          name="WashTracking" 
          component={WashTrackingScreen}
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
        <Stack.Screen 
          name="TireServiceTracking" 
          component={TireServiceTrackingScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="TireHealth" 
          component={TireHealthScreen}
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
