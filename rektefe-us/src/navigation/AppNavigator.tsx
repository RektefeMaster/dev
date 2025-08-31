import React, { useState, useEffect } from 'react';
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
import DrawerNavigator from './DrawerNavigator';
import ChatScreen from '../screens/ChatScreen';
import NewMessageScreen from '../screens/NewMessageScreen';
import AppointmentDetailScreen from '../screens/AppointmentDetailScreen';
import ServiceManagementScreen from '../screens/ServiceManagementScreen';
import CustomerManagementScreen from '../screens/CustomerManagementScreen';
import MessagesScreen from '../screens/MessagesScreen';
import WalletScreen from '../screens/WalletScreen';
import SupportScreen from '../screens/SupportScreen';
import FinancialTrackingScreen from '../screens/FinancialTrackingScreen';
import CalendarScreen from '../screens/CalendarScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [isCheckingRoute, setIsCheckingRoute] = useState(true);

  useEffect(() => {
    checkInitialRoute();
  }, []);

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

  if (isLoading || isCheckingRoute || !initialRoute) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Main" component={DrawerNavigator} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="NewMessage" component={NewMessageScreen} />
        <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
        <Stack.Screen name="ServiceManagement" component={ServiceManagementScreen} />
        <Stack.Screen name="CustomerManagement" component={CustomerManagementScreen} />
        <Stack.Screen name="Messages" component={MessagesScreen} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="Support" component={SupportScreen} />
        <Stack.Screen name="FinancialTracking" component={FinancialTrackingScreen} />
        <Stack.Screen name="Calendar" component={CalendarScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
