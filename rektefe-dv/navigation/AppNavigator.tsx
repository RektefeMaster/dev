import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StackScreenProps } from '@react-navigation/stack';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DrawerNavigator from './DrawerNavigator';
import UserProfileScreen from '../screens/UserProfileScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import MaintenancePlanScreen from '../screens/MaintenancePlanScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import WalletScreen from '../screens/WalletScreen';
import GarageScreen from '../screens/GarageScreen';
import SupportScreen from '../screens/SupportScreen';
import TefeWalletScreen from '../screens/TefeWalletScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  Main: { screen?: string };
  UserProfile: { userId: string };
  Profile: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  ChangePassword: undefined;
  Home: undefined;
  MaintenancePlan: undefined;
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
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        id={undefined}
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Main" component={DrawerNavigator} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ headerShown: true, title: 'Kullanıcı Profili' }} />
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