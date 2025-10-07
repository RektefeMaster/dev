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
import { ProfileScreen, EditProfileScreen, SettingsScreen, ServiceAreasScreen } from '@/features/profile/screens';
import WorkingHoursScreen from '@/features/profile/screens/WorkingHoursScreen';
import SecurityScreen from '@/features/profile/screens/SecurityScreen';
import HelpCenterScreen from '@/features/profile/screens/HelpCenterScreen';
import AboutScreen from '@/features/profile/screens/AboutScreen';
import { FaultReportsScreen, FaultReportDetailScreen } from '@/features/fault-reports/screens';
import { TowingServiceScreen, RepairServiceScreen, WashServiceScreen, TireServiceScreen } from '@/features/services/screens';
import { AppointmentsScreen } from '@/features/appointments/screens';
import { NotificationsScreen, NotificationSettingsScreen } from '@/features/notifications/screens';
import EmergencyNotificationScreen from '@/features/emergency/screens/EmergencyNotificationScreen';
import { ReportsScreen, EndOfDayScreen } from '@/features/reports/screens';
import { CustomerScreen } from '@/features/customers/screens';
import { QuickQuoteScreen } from '@/features/quotes/screens';
import { SuppliersScreen } from '@/features/suppliers/screens';
import { VehicleHistoryScreen } from '@/features/vehicle-history/screens';
import { ServiceCatalogScreen } from '@/features/service-catalog/screens';
import { ReviewsScreen } from '@/features/reviews/screens';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [isCheckingRoute, setIsCheckingRoute] = useState(true);
  const navigationRef = useRef<any>(null);

  const checkInitialRoute = async () => {
    try {
      const onboardingCompleted = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

      // Token varsa ana ekrana git
      if (token) {
        setInitialRoute('Main');
      } else {
        // Token yoksa her zaman Auth'a git (onboarding'i atla)
        setInitialRoute('Auth');
      }
    } catch (error) {
      setInitialRoute('Auth'); // Hata durumunda da Auth'a git
    } finally {
      setIsCheckingRoute(false);
    }
  };

  useEffect(() => {
    checkInitialRoute();
  }, []);

  // isAuthenticated değişikliğini dinle
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('🔄 User logged out, navigating to Auth screen');
      setInitialRoute('Auth');
      
      // Navigation stack'i reset et
      if (navigationRef.current) {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      }
    }
  }, [isAuthenticated, isLoading]);

  // Logout durumunda direkt Auth ekranını göster
  if (!isAuthenticated && !isLoading) {
    return (
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          id={undefined}
          initialRouteName="Auth"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Auth" component={AuthScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Debug için log

  if (isLoading || isCheckingRoute || !initialRoute) {
    return <SplashScreen />;
  }


  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        id={undefined}
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
        <Stack.Screen name="ChatScreen" component={ChatScreen} />
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
        {/* Yeni eklenen ekranlar */}
        <Stack.Screen 
          name="QuickQuote" 
          component={QuickQuoteScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="Customers" 
          component={CustomerScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="Reports" 
          component={ReportsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="EndOfDay" 
          component={EndOfDayScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="Suppliers" 
          component={SuppliersScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="VehicleHistory"
          component={VehicleHistoryScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ServiceCatalog"
          component={ServiceCatalogScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Reviews"
          component={ReviewsScreen}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
