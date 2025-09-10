import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import notificationService from './services/notificationService';
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
        // Push notification izinlerini iste ve token al
        await notificationService.registerForPushNotifications();
        
        // Bildirim dinleyicilerini başlat
        notificationService.startListening();
        
        console.log('Bildirim servisi başlatıldı');
      } catch (error) {
        console.error('Bildirim servisi başlatma hatası:', error);
      }
    };

    initializeNotifications();

    // Cleanup
    return () => {
      notificationService.stopListening();
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
