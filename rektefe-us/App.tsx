import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SharedAuthProvider } from './src/shared/context/SharedAuthContext';
import { ThemeProvider } from './src/shared/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { notificationService } from './src/features/notifications/services';
import { BaseApiService } from '../shared/api/BaseApiService';
import { API_CONFIG, STORAGE_KEYS } from './src/constants/config';

// Concrete API Service implementation
class MechanicApiService extends BaseApiService {
  protected async getToken(): Promise<string | null> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      return await AsyncStorage.getItem(this.config.storageKeys.AUTH_TOKEN);
    } catch (error) {
      return null;
    }
  }

  protected async setToken(token: string): Promise<void> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(this.config.storageKeys.AUTH_TOKEN, token);
    } catch (error) {
      console.error('Error setting token:', error);
    }
  }

  protected async getUserId(): Promise<string | null> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      return await AsyncStorage.getItem(this.config.storageKeys.USER_ID);
    } catch (error) {
      return null;
    }
  }

  protected async setUserId(userId: string): Promise<void> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(this.config.storageKeys.USER_ID, userId);
    } catch (error) {
      console.error('Error setting user ID:', error);
    }
  }

  protected async setRefreshToken(refreshToken: string): Promise<void> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(this.config.storageKeys.REFRESH_TOKEN, refreshToken);
    } catch (error) {
      console.error('Error setting refresh token:', error);
    }
  }

  protected async setUserData(userData: any): Promise<void> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(this.config.storageKeys.USER_DATA, JSON.stringify(userData));
    } catch (error) {
      console.error('Error setting user data:', error);
    }
  }

  protected async clearTokens(): Promise<void> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.multiRemove([
        this.config.storageKeys.AUTH_TOKEN,
        this.config.storageKeys.REFRESH_TOKEN,
        this.config.storageKeys.USER_ID,
        this.config.storageKeys.USER_DATA,
      ]);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  protected async refreshToken(): Promise<string | null> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const refreshToken = await AsyncStorage.getItem(this.config.storageKeys.REFRESH_TOKEN);
      
      if (!refreshToken) {
        return null;
      }

      const response = await this.post('/auth/refresh', {
        refreshToken,
        userType: this.config.userType
      });

      if (response.success && response.data?.token) {
        const newToken = response.data.token;
        await this.setToken(newToken);
        
        if (response.data.refreshToken) {
          await this.setRefreshToken(response.data.refreshToken);
        }
        
        return newToken;
      }
      
      return null;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }
}

// API Service konfigürasyonu
const apiConfig = {
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  userType: 'mechanic' as const,
  appName: 'Rektefe US',
  storageKeys: {
    AUTH_TOKEN: STORAGE_KEYS.AUTH_TOKEN,
    REFRESH_TOKEN: STORAGE_KEYS.REFRESH_TOKEN,
    USER_ID: STORAGE_KEYS.USER_ID,
    USER_DATA: STORAGE_KEYS.USER_DATA,
    ERROR_LOGS: STORAGE_KEYS.ERROR_LOGS,
    ONBOARDING_COMPLETED: STORAGE_KEYS.ONBOARDING_COMPLETED,
  },
};

// API Service instance
const apiService = new MechanicApiService(apiConfig);

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
        console.log('Notification service initialization failed:', error);
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
        <SharedAuthProvider config={{
          userType: 'mechanic',
          appName: 'Rektefe US',
          storageKeys: {
            AUTH_TOKEN: STORAGE_KEYS.AUTH_TOKEN,
            REFRESH_TOKEN: STORAGE_KEYS.REFRESH_TOKEN,
            USER_ID: STORAGE_KEYS.USER_ID,
            USER_DATA: STORAGE_KEYS.USER_DATA,
            ERROR_LOGS: STORAGE_KEYS.ERROR_LOGS,
            ONBOARDING_COMPLETED: STORAGE_KEYS.ONBOARDING_COMPLETED,
          },
          apiService: apiService,
        }}>
          <AppNavigator />
          <StatusBar style="auto" />
        </SharedAuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
