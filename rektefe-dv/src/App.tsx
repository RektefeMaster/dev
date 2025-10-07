import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from '@/navigation/AppNavigator';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/shared/context/ThemeContext';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import notificationService from '@/features/notifications/services/notificationService';
import { apiService } from '@/shared/services/api';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const { isDark, themeColors } = useTheme();
  
  useEffect(() => {
    // Uygulama başladığında bildirim servisini başlat
    const initializeNotifications = async () => {
      try {
        // Push notification izinlerini iste ve token al
        const token = await notificationService.registerForPushNotifications();
        // Bildirim dinleyicilerini başlat
        notificationService.startListening();
        
        // İzin durumunu kontrol et
        const { status } = await Notifications.getPermissionsAsync();
        } catch (error) {
        }
    };

    initializeNotifications();

    // Cleanup
    return () => {
      notificationService.stopListening();
    };
  }, []);

  // Bildirim tıklama işleyicisi
  useEffect(() => {
    const handleNotificationResponse = (response: any) => {
      const data = response.notification.request.content.data;
      
      if (data?.type === 'rating_reminder') {
        // Local storage'a rating verisi kaydet
        try {
          const ratingData = {
            appointmentId: data.appointmentId,
            mechanicId: data.mechanicId || 'real-mechanic-123',
            mechanicName: data.mechanicName,
            serviceType: data.serviceType,
            timestamp: new Date().toISOString()
          };
          
          AsyncStorage.setItem('pendingRating', JSON.stringify(ratingData));
        } catch (error) {
          }
      }
    };

    // Bildirim response listener'ı ekle
    const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      subscription.remove();
    };
  }, []);
  
  return (
    <>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={isDark ? themeColors.background.quaternary : themeColors.background.primary} 
      />
      <AppNavigator />
    </>
  );
}

export default App;
