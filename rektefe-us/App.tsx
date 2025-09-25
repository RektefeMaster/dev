import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, ThemeProvider } from './src/shared/context';
import AppNavigator from './src/navigation/AppNavigator';
import { notificationService } from './src/features/notifications/services';

export default function App() {
  useEffect(() => {
    // Uygulama başladığında bildirim servisini başlat
    const initializeNotifications = async () => {
      try {
        // Push notification izinlerini iste ve token al
        await notificationService.registerForPushNotifications();
        
        // Bildirim dinleyicilerini başlat
        notificationService.startListening();
        
        } catch (error) {
        }
    };

    initializeNotifications();

    // Cleanup
    return () => {
      notificationService.stopListening();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
