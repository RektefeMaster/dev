import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from '../context/AuthContext';
import { PaperProvider } from 'react-native-paper';
import { SnackbarProvider } from '../context/SnackbarContext';
import TabLayout from './(tabs)/_layout';
import LoginScreen from './auth/login';
import RegisterScreen from './auth/register';

const Stack = createNativeStackNavigator();

export default function RootLayout() {
  return (
    <SnackbarProvider>
      <PaperProvider>
        <AuthProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Auth"
              screenOptions={{ headerShown: false }}
            >
              <Stack.Screen name="Auth" component={AuthNavigator} />
              <Stack.Screen name="Main" component={TabLayout} />
            </Stack.Navigator>
          </NavigationContainer>
        </AuthProvider>
      </PaperProvider>
    </SnackbarProvider>
  );
}

const AuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};
