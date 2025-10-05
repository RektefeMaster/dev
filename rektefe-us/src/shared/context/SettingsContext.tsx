import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '@/shared/services';
import { useAuth } from './AuthContext';
import { STORAGE_KEYS } from '@/constants/config';
import { 
  UserSettings, 
  NotificationSettings, 
  PrivacySettings, 
  JobSettings, 
  AppSettings, 
  SecuritySettings,
  defaultUserSettings,
  defaultNotificationSettings,
  defaultPrivacySettings,
  defaultJobSettings,
  defaultAppSettings,
  defaultSecuritySettings
} from '@/shared/types/settings';

interface SettingsContextType {
  // Settings State
  settings: UserSettings;
  loading: boolean;
  error: string | null;
  
  // Notification Settings
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  
  // Privacy Settings
  privacySettings: PrivacySettings;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<void>;
  
  // Job Settings
  jobSettings: JobSettings;
  updateJobSettings: (settings: Partial<JobSettings>) => Promise<void>;
  
  // App Settings
  appSettings: AppSettings;
  updateAppSettings: (settings: Partial<AppSettings>) => Promise<void>;
  
  // Security Settings
  securitySettings: SecuritySettings;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  
  // General Methods
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  resetSettings: () => Promise<void>;
  
  // Service Categories
  serviceCategories: string[];
  updateServiceCategories: (categories: string[]) => Promise<void>;
  
  // Password Change
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);

  // Load settings from API and local storage
  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Authentication kontrolü - token varsa API'den yükle
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      console.log('🔍 SettingsContext Debug:');
      console.log('isAuthenticated:', isAuthenticated);
      console.log('token exists:', !!token);
      console.log('token preview:', token ? `${token.substring(0, 20)}...` : 'null');
      
      if (!isAuthenticated || !token) {
        console.log('⚠️ Kullanıcı giriş yapmamış veya token yok - settings API çağrısı atlanıyor');
        
        // Sadece local storage'dan yükle
        try {
          const localSettings = await AsyncStorage.getItem('user_settings');
          if (localSettings) {
            setSettings(JSON.parse(localSettings));
          }
        } catch (localError) {
          console.error('Local settings load error:', localError);
        }
        return;
      }

      // Load from API
      const [notificationRes, privacyRes, jobRes, appRes, securityRes] = await Promise.allSettled([
        apiService.getNotificationSettings(),
        apiService.getPrivacySettings(),
        apiService.getJobSettings(),
        apiService.getAppSettings(),
        apiService.getSecuritySettings()
      ]);

      const newSettings = { ...defaultUserSettings };

      // Update notification settings
      if (notificationRes.status === 'fulfilled' && notificationRes.value.success) {
        newSettings.notificationSettings = {
          ...defaultNotificationSettings,
          ...notificationRes.value.data
        };
      }

      // Update privacy settings
      if (privacyRes.status === 'fulfilled' && privacyRes.value.success) {
        newSettings.privacySettings = {
          ...defaultPrivacySettings,
          ...privacyRes.value.data
        };
      }

      // Update job settings
      if (jobRes.status === 'fulfilled' && jobRes.value.success) {
        newSettings.jobSettings = {
          ...defaultJobSettings,
          ...jobRes.value.data
        };
      }

      // Update app settings
      if (appRes.status === 'fulfilled' && appRes.value.success) {
        newSettings.appSettings = {
          ...defaultAppSettings,
          ...appRes.value.data
        };
      }

      // Update security settings
      if (securityRes.status === 'fulfilled' && securityRes.value.success) {
        newSettings.securitySettings = {
          ...defaultSecuritySettings,
          ...securityRes.value.data
        };
      }

      setSettings(newSettings);

      // Save to local storage
      await AsyncStorage.setItem('user_settings', JSON.stringify(newSettings));

    } catch (error: any) {
      setError(error.message || 'Ayarlar yüklenirken hata oluştu');
      
      // Fallback to local storage
      try {
        const localSettings = await AsyncStorage.getItem('user_settings');
        if (localSettings) {
          setSettings(JSON.parse(localSettings));
        }
      } catch (localError) {
        console.error('Local settings load error:', localError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Save settings to API and local storage
  const saveSettings = async () => {
    try {
      setError(null);
      
      // Save to API
      await Promise.allSettled([
        apiService.updateNotificationSettings(settings.notificationSettings),
        apiService.updatePrivacySettings(settings.privacySettings),
        apiService.updateJobSettings(settings.jobSettings),
        apiService.updateAppSettings(settings.appSettings),
        apiService.updateSecuritySettings(settings.securitySettings)
      ]);

      // Save to local storage
      await AsyncStorage.setItem('user_settings', JSON.stringify(settings));

    } catch (error: any) {
      setError(error.message || 'Ayarlar kaydedilirken hata oluştu');
    }
  };

  // Reset settings to defaults
  const resetSettings = async () => {
    try {
      setSettings(defaultUserSettings);
      await AsyncStorage.setItem('user_settings', JSON.stringify(defaultUserSettings));
      await saveSettings();
    } catch (error: any) {
      setError(error.message || 'Ayarlar sıfırlanırken hata oluştu');
    }
  };

  // Update notification settings
  const updateNotificationSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updatedSettings = { ...settings.notificationSettings, ...newSettings };
      setSettings(prev => ({
        ...prev,
        notificationSettings: updatedSettings
      }));

      // Save to API
      const response = await apiService.updateNotificationSettings(updatedSettings);
      if (!response.success) {
        throw new Error(response.message || 'Bildirim ayarları güncellenemedi');
      }

      // Save to local storage
      await AsyncStorage.setItem('user_settings', JSON.stringify({
        ...settings,
        notificationSettings: updatedSettings
      }));

    } catch (error: any) {
      setError(error.message || 'Bildirim ayarları güncellenirken hata oluştu');
    }
  };

  // Update privacy settings
  const updatePrivacySettings = async (newSettings: Partial<PrivacySettings>) => {
    try {
      const updatedSettings = { ...settings.privacySettings, ...newSettings };
      setSettings(prev => ({
        ...prev,
        privacySettings: updatedSettings
      }));

      // Save to API
      const response = await apiService.updatePrivacySettings(updatedSettings);
      if (!response.success) {
        throw new Error(response.message || 'Gizlilik ayarları güncellenemedi');
      }

      // Save to local storage
      await AsyncStorage.setItem('user_settings', JSON.stringify({
        ...settings,
        privacySettings: updatedSettings
      }));

    } catch (error: any) {
      setError(error.message || 'Gizlilik ayarları güncellenirken hata oluştu');
    }
  };

  // Update job settings
  const updateJobSettings = async (newSettings: Partial<JobSettings>) => {
    try {
      const updatedSettings = { ...settings.jobSettings, ...newSettings };
      setSettings(prev => ({
        ...prev,
        jobSettings: updatedSettings
      }));

      // Save to API
      const response = await apiService.updateJobSettings(updatedSettings);
      if (!response.success) {
        throw new Error(response.message || 'İş ayarları güncellenemedi');
      }

      // Save to local storage
      await AsyncStorage.setItem('user_settings', JSON.stringify({
        ...settings,
        jobSettings: updatedSettings
      }));

    } catch (error: any) {
      setError(error.message || 'İş ayarları güncellenirken hata oluştu');
    }
  };

  // Update app settings
  const updateAppSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updatedSettings = { ...settings.appSettings, ...newSettings };
      setSettings(prev => ({
        ...prev,
        appSettings: updatedSettings
      }));

      // Save to API
      const response = await apiService.updateAppSettings(updatedSettings);
      if (!response.success) {
        throw new Error(response.message || 'Uygulama ayarları güncellenemedi');
      }

      // Save to local storage
      await AsyncStorage.setItem('user_settings', JSON.stringify({
        ...settings,
        appSettings: updatedSettings
      }));

    } catch (error: any) {
      setError(error.message || 'Uygulama ayarları güncellenirken hata oluştu');
    }
  };

  // Update security settings
  const updateSecuritySettings = async (newSettings: Partial<SecuritySettings>) => {
    try {
      const updatedSettings = { ...settings.securitySettings, ...newSettings };
      setSettings(prev => ({
        ...prev,
        securitySettings: updatedSettings
      }));

      // Save to API
      const response = await apiService.updateSecuritySettings(updatedSettings);
      if (!response.success) {
        throw new Error(response.message || 'Güvenlik ayarları güncellenemedi');
      }

      // Save to local storage
      await AsyncStorage.setItem('user_settings', JSON.stringify({
        ...settings,
        securitySettings: updatedSettings
      }));

    } catch (error: any) {
      setError(error.message || 'Güvenlik ayarları güncellenirken hata oluştu');
    }
  };

  // Update service categories
  const updateServiceCategories = async (categories: string[]) => {
    try {
      setServiceCategories(categories);
      
      const response = await apiService.updateServiceCategories(categories);
      if (!response.success) {
        throw new Error(response.message || 'Hizmet kategorileri güncellenemedi');
      }

    } catch (error: any) {
      setError(error.message || 'Hizmet kategorileri güncellenirken hata oluştu');
    }
  };

  // Change password
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await apiService.changePassword(currentPassword, newPassword);
      if (!response.success) {
        throw new Error(response.message || 'Şifre değiştirilemedi');
      }
    } catch (error: any) {
      setError(error.message || 'Şifre değiştirilirken hata oluştu');
      throw error;
    }
  };

  // Load settings on mount and when authentication changes
  useEffect(() => {
    loadSettings();
  }, [isAuthenticated]);

  const value: SettingsContextType = {
    settings,
    loading,
    error,
    notificationSettings: settings.notificationSettings,
    privacySettings: settings.privacySettings,
    jobSettings: settings.jobSettings,
    appSettings: settings.appSettings,
    securitySettings: settings.securitySettings,
    updateNotificationSettings,
    updatePrivacySettings,
    updateJobSettings,
    updateAppSettings,
    updateSecuritySettings,
    loadSettings,
    saveSettings,
    resetSettings,
    serviceCategories,
    updateServiceCategories,
    changePassword
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
