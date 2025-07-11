import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StackScreenProps } from '@react-navigation/stack';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DrawerNavigator from './DrawerNavigator';
import UserProfileScreen from '../screens/UserProfileScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RektagramProfileScreen from '../screens/RektagramProfileScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import MaintenancePlanScreen from '../screens/MaintenancePlanScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  Main: { screen?: string };
  UserProfile: { userId: string };
  Profile: undefined;
  RektagramProfile: { userId?: string };
  ForgotPassword: undefined;
  ResetPassword: undefined;
  ChangePassword: undefined;
  Home: undefined;
  MaintenancePlan: undefined;
  Appointments: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
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
        <Stack.Screen name="RektagramProfile" component={RektagramProfileScreen} options={{ headerShown: true, title: 'Rektagram Profili' }} />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 