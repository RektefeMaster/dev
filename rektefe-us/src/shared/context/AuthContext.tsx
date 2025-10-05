import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, API_URL } from '@/constants/config';
import { User, MechanicProfile, ApiResponse } from '@/shared/types';
import apiService from '@/shared/services';

interface AuthContextType {
  token: string | null;
  userId: string | null;
  user: MechanicProfile | null;
  setToken: (token: string | null) => void;
  setUserId: (userId: string | null) => void;
  setUser: (user: MechanicProfile | null) => void;
  updateUser: (updates: Partial<MechanicProfile>) => void;
  setTokenAndUserId: (token: string, userId: string) => Promise<void>;
  login: (email: string, password: string) => Promise<ApiResponse<MechanicProfile>>;
  register: (userData: {
    name: string;
    surname: string;
    email: string;
    phone: string;
    password: string;
    userType: 'mechanic' | 'driver';
    experience?: number;
    city?: string;
    specialties?: string[];
    serviceCategories?: string[];
  }) => Promise<ApiResponse<MechanicProfile>>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<MechanicProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Storage migration - eski key formatından yeni key formatına geçiş
  const migrateStorageKeys = async () => {
    try {
      console.log('🔄 Storage migration başlatılıyor...');
      
      // Eski key formatları
      const oldKeys = {
        AUTH_TOKEN: 'auth_token',
        REFRESH_TOKEN: 'refresh_token', 
        USER_ID: 'user_id',
        USER_DATA: 'user_data'
      };

      // Yeni key formatları
      const newKeys = {
        AUTH_TOKEN: 'authToken',
        REFRESH_TOKEN: 'refreshToken',
        USER_ID: 'userId', 
        USER_DATA: 'userData'
      };

      let migrationCount = 0;

      // Migration işlemi
      for (const [key, oldKey] of Object.entries(oldKeys)) {
        const oldValue = await AsyncStorage.getItem(oldKey);
        if (oldValue) {
          console.log(`📦 Eski key bulundu: ${oldKey} = ${oldValue.substring(0, 20)}...`);
          // Eski değeri yeni key ile kaydet
          await AsyncStorage.setItem(newKeys[key as keyof typeof newKeys], oldValue);
          // Eski key'i sil
          await AsyncStorage.removeItem(oldKey);
          migrationCount++;
          console.log(`✅ Storage key migrated: ${oldKey} -> ${newKeys[key as keyof typeof newKeys]}`);
        }
      }

      if (migrationCount > 0) {
        console.log(`🎉 Migration tamamlandı! ${migrationCount} key migrate edildi.`);
      } else {
        console.log('ℹ️ Migration gerekli değil - eski key bulunamadı.');
      }
    } catch (error) {
      console.error('❌ Storage migration hatası:', error);
    }
  };

  // AsyncStorage'dan token ve userId'yi yükle
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        setIsLoading(true);
        
        // Önce storage migration yap
        await migrateStorageKeys();
        
        const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const storedUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
        const storedUserData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
        
        console.log('🔍 AuthContext Debug:');
        console.log('STORAGE_KEYS.AUTH_TOKEN:', STORAGE_KEYS.AUTH_TOKEN);
        console.log('storedToken:', storedToken ? `${storedToken.substring(0, 20)}...` : 'null');
        console.log('storedUserId:', storedUserId);
        console.log('storedUserData:', storedUserData ? 'exists' : 'null');

        if (storedToken && storedUserId) {
          // Token'ı test et - Otomatik logout devre dışı
          try {
            
            const testResponse = await apiService.getMechanicProfile();
            if (testResponse.success) {
              setToken(storedToken);
              setUserId(storedUserId);
              setIsAuthenticated(true);
              
              if (storedUserData) {
                try {
                  const userData = JSON.parse(storedUserData);
                  setUser(userData);
                } catch (error) {
                  // Parse hatası varsa API'den çek
                  await loadUserDataFromAPI();
                }
              } else {
                // User data yoksa API'den çek
                await loadUserDataFromAPI();
              }
              
              // Onboarding tamamlandı olarak işaretle
              await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
              
            } else {
              // Token geçersiz, logout yap ve login ekranına yönlendir
              console.log('❌ Token geçersiz, logout yapılıyor...');
              await clearStoredData();
              
              // Login ekranına yönlendir
              await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'false');
            }
          } catch (error) {
            // Token hatası, logout yap ve login ekranına yönlendir
            console.log('❌ Token validation hatası, logout yapılıyor...', error);
            await clearStoredData();
            
            // Login ekranına yönlendir
            await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'false');
          }
        } else {
        }
      } catch (error) {
        } finally {
        setIsLoading(false);
      }
    };

    loadAuthData();
  }, []);

  // User data'yı API'den yükle
  const loadUserDataFromAPI = async () => {
    try {
      const userResponse = await apiService.getMechanicProfile();
      if (userResponse.success && userResponse.data) {
        setUser(userResponse.data);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userResponse.data));
        await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      } else {
      }
    } catch (error) {
      }
  };

  // Stored data'yı temizle
  const clearStoredData = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.ONBOARDING_COMPLETED,
        // Eski key formatlarını da temizle
        'auth_token',
        'refresh_token',
        'user_id',
        'user_data'
      ]);
      setToken(null);
      setUserId(null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('❌ Clear stored data hatası:', error);
    }
  };

  const setTokenAndUserId = async (newToken: string, newUserId: string) => {
    try {
      
      // AsyncStorage'a kaydet
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, newUserId);
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      
      // State'i güncelle
      setToken(newToken);
      setUserId(newUserId);
      setIsAuthenticated(true);
      
    } catch (error) {
      }
  };

  const login = async (email: string, password: string): Promise<ApiResponse<MechanicProfile>> => {
    try {
      // Gerçek API çağrısı yap
      console.log('🔍 Rektefe-US AuthContext Login Debug:');
      console.log('API_URL:', API_URL);
      const response = await apiService.login(email, password, 'mechanic');
      
      if (response.success && response.data) {
        
        const { token, refreshToken, user } = response.data as any;
        const userId = user?._id;
        
        if (!userId) {
          console.log('❌ User ID bulunamadı');
          return { success: false, message: 'Kullanıcı bilgileri alınamadı', data: undefined };
        }
        
        // Token ve userId'yi kaydet
        await setTokenAndUserId(token, userId);
        
        // Refresh token'ı kaydet
        if (refreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }
        
        // User data'yı kaydet
        if (user) {
          setUser(user);
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
          await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
          
          // UserType kontrolü - rektefe-us uygulaması için 'mechanic' olmalı
          if (user.userType !== 'mechanic') {
            console.log('⚠️ UserType mechanic değil, güncelleniyor...', user.userType);
            try {
              const updateResponse = await apiService.updateUserProfile({ userType: 'mechanic' });
              if (updateResponse.success) {
                console.log('✅ UserType mechanic olarak güncellendi');
                // Güncellenmiş user data'yı al
                const updatedUser = { ...user, userType: 'mechanic' };
                setUser(updatedUser);
                await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
              } else {
                console.log('❌ UserType güncellenemedi:', updateResponse.message);
              }
            } catch (updateError) {
              console.log('❌ UserType güncelleme hatası:', updateError);
            }
          }
          
          // Login sonrası profil kontrolü
          try {
            console.log('🔍 Login sonrası profil kontrolü yapılıyor...');
            const profileResponse = await apiService.getMechanicProfile();
            if (profileResponse.success && profileResponse.data) {
              console.log('✅ Usta profili bulundu');
              setUser(profileResponse.data);
              await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(profileResponse.data));
            } else {
              console.log('⚠️ Usta profili bulunamadı - profil oluşturma gerekebilir');
            }
          } catch (profileError) {
            console.log('⚠️ Profil kontrolü hatası:', profileError);
          }
        }
        return response as ApiResponse<MechanicProfile>;
      } else {
        return { success: false, message: response.message || 'Giriş başarısız', data: undefined };
      }
    } catch (error) {
      return { success: false, message: 'Bir hata oluştu', data: undefined };
    }
  };

  const register = async (userData: any) => {
    try {
      // Gerçek API çağrısı yap
      const response = await apiService.register(userData);
      
      if (response.success) {
        await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      }
      
      return response;
    } catch (error) {
      return { success: false, message: 'Bir hata oluştu' };
    }
  };

  const logout = async () => {
    try {
      
      // AsyncStorage'ı temizle - hem eski hem yeni key formatlarını temizle
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.ONBOARDING_COMPLETED,
        // Eski key formatlarını da temizle
        'auth_token',
        'refresh_token',
        'user_id',
        'user_data'
      ]);
      
      // State'i temizle
      setToken(null);
      setUserId(null);
      setUser(null);
      setIsAuthenticated(false);
      
    } catch (error) {
      console.error('❌ Logout hatası:', error);
    }
  };

  const updateUser = (updates: Partial<MechanicProfile>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ 
      token, 
      userId, 
      user,
      setToken,
      setUserId,
      setUser,
      updateUser,
      setTokenAndUserId, 
      login,
      register,
      logout, 
      isAuthenticated,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
