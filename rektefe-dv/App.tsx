import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import notificationService from './services/notificationService';
import { apiService } from './services/api';
import 'text-encoding';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { isDark, colors } = useTheme();
  
  useEffect(() => {
    // Uygulama başladığında bildirim servisini başlat
    const initializeNotifications = async () => {
      try {
        console.log('🔧 Bildirim servisi başlatılıyor...');
        
        // Push notification izinlerini iste ve token al
        const token = await notificationService.registerForPushNotifications();
        console.log('🔑 Push token:', token ? 'Alındı' : 'Alınamadı');
        
        // Bildirim dinleyicilerini başlat
        notificationService.startListening();
        
        // İzin durumunu kontrol et
        const { status } = await Notifications.getPermissionsAsync();
        console.log('✅ Bildirim servisi başlatıldı');
      } catch (error) {
        console.error('❌ Bildirim servisi başlatma hatası:', error);
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
          console.error('❌ Rating verisi kaydetme hatası:', error);
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
        backgroundColor={isDark ? colors.background.quaternary : colors.background.primary} 
      />
      <AppNavigator />
    </>
  );
}

export default App;
