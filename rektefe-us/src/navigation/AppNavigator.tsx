import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types/common';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/config';

// Screens
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreen';
import TabNavigator from './TabNavigator';
import ChatScreen from '../screens/ChatScreen';
import NewMessageScreen from '../screens/NewMessageScreen';
import AppointmentDetailScreen from '../screens/AppointmentDetailScreen';
import MessagesScreen from '../screens/MessagesScreen';
import WalletScreen from '../screens/WalletScreen';
import SupportScreen from '../screens/SupportScreen';
import FinancialTrackingScreen from '../screens/FinancialTrackingScreen';
import CalendarScreen from '../screens/CalendarScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import FaultReportsScreen from '../screens/FaultReportsScreen';
import FaultReportDetailScreen from '../screens/FaultReportDetailScreen';
import TowingServiceScreen from '../screens/TowingServiceScreen';
import RepairServiceScreen from '../screens/RepairServiceScreen';
import WashServiceScreen from '../screens/WashServiceScreen';
import TireServiceScreen from '../screens/TireServiceScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';

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
      console.error('Initial route check error:', error);
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
        <Stack.Screen name="Settings" component={SettingsScreen} />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
