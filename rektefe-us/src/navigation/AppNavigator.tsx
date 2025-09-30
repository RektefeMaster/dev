import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '@/shared/context';
import { RootStackParamList } from '@/shared/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/config';

// Screens
import { 
  SplashScreen, 
  OnboardingScreen, 
  AuthScreen,
  EmailVerificationScreen,
  ForgotPasswordScreen,
  ResetPasswordScreen
} from '@/features/auth/screens';
import TabNavigator from './TabNavigator';
import { ChatScreen, NewMessageScreen, MessagesScreen } from '@/features/messages/screens';
import { AppointmentDetailScreen, CalendarScreen } from '@/features/appointments/screens';
import { WalletScreen, FinancialTrackingScreen } from '@/features/wallet/screens';
import { SupportScreen } from '@/features/support/screens';
import { ProfileScreen, EditProfileScreen, SettingsScreen } from '@/features/profile/screens';
import WorkingHoursScreen from '@/features/profile/screens/WorkingHoursScreen';
import SecurityScreen from '@/features/profile/screens/SecurityScreen';
import ServiceAreasScreen from '@/features/profile/screens/ServiceAreasScreen';
import HelpCenterScreen from '@/features/profile/screens/HelpCenterScreen';
import AboutScreen from '@/features/profile/screens/AboutScreen';
import { FaultReportsScreen, FaultReportDetailScreen } from '@/features/fault-reports/screens';
import { TowingServiceScreen, RepairServiceScreen, WashServiceScreen, TireServiceScreen } from '@/features/services/screens';
import { AppointmentsScreen } from '@/features/appointments/screens';
import { NotificationsScreen, NotificationSettingsScreen } from '@/features/notifications/screens';
import EmergencyNotificationScreen from '@/features/emergency/screens/EmergencyNotificationScreen';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [isCheckingRoute, setIsCheckingRoute] = useState(true);
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    checkInitialRoute();
  }, []);

  // isAuthenticated değişikliğini dinle
  useEffect(() => {
    
    if (!isLoading && !isAuthenticated) {
      setInitialRoute('Auth');
    }
  }, [isAuthenticated, isLoading]);

  const checkInitialRoute = async () => {
    try {
      const onboardingCompleted = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

      if (onboardingCompleted === 'true') {
        if (token) {
          setInitialRoute('Main');
        } else {
          setInitialRoute('Auth');
        }
      } else {
        setInitialRoute('Onboarding');
      }
    } catch (error) {
      setInitialRoute('Onboarding');
    } finally {
      setIsCheckingRoute(false);
    }
  };

  // Debug için log

  if (isLoading || isCheckingRoute || !initialRoute) {
    return <SplashScreen />;
  }

  // Logout durumunda Auth ekranını göster
  if (!isAuthenticated && initialRoute === 'Main') {
    return (
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName="Auth"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Auth" component={AuthScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="NewMessage" component={NewMessageScreen} />
        <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
        <Stack.Screen name="Appointments" component={AppointmentsScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        <Stack.Screen name="Messages" component={MessagesScreen} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="Support" component={SupportScreen} />
        <Stack.Screen name="FinancialTracking" component={FinancialTrackingScreen} />
        <Stack.Screen name="Calendar" component={CalendarScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="WorkingHours" component={WorkingHoursScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Security" component={SecurityScreen} />
        <Stack.Screen name="ServiceAreas" component={ServiceAreasScreen} />
        <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
        <Stack.Screen 
          name="FaultReports" 
          component={FaultReportsScreen}
          options={{
            title: 'Arıza Bildirimleri',
            headerStyle: {
              backgroundColor: '#EF4444',
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
              backgroundColor: '#EF4444',
            },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="TowingService" 
          component={TowingServiceScreen}
          options={{
            title: 'Çekici Hizmetleri',
            headerStyle: {
              backgroundColor: '#EF4444',
            },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="RepairService" 
          component={RepairServiceScreen}
          options={{
            title: 'Tamir & Bakım',
            headerStyle: {
              backgroundColor: '#3B82F6',
            },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="WashService" 
          component={WashServiceScreen}
          options={{
            title: 'Yıkama Hizmetleri',
            headerStyle: {
              backgroundColor: '#10B981',
            },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="TireService" 
          component={TireServiceScreen}
          options={{
            title: 'Lastik & Parça',
            headerStyle: {
              backgroundColor: '#F59E0B',
            },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="EmergencyNotification" 
          component={EmergencyNotificationScreen}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
