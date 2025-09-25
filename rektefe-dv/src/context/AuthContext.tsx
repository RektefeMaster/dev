import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/config';
import axios from 'axios';
import { API_URL } from '@/constants/config';
import { api } from '@/shared/services/api';
import { Driver, RegisterData } from '@/shared/types/common';

interface AuthContextType {
  token: string | null;
  userId: string | null;
  user: Driver | null;
  setToken: (token: string | null) => void;
  setUserId: (userId: string | null) => void;
  setUser: (user: Driver | null) => void;
  setTokenAndUserId: (token: string, userId: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  validateToken: (token: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<Driver | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Token geçerliliğini kontrol eden fonksiyon
  const validateToken = async (tokenToValidate: string): Promise<boolean> => {
    try {
      // Önce token'ın formatını kontrol et
      if (!tokenToValidate || tokenToValidate.trim().length === 0) {
        return false;
      }
      
      // Token validation endpoint'ini çağır
      const response = await api.get('/auth/validate', {
        headers: { Authorization: `Bearer ${tokenToValidate}` }
      });
      
      const isValid = response.data && response.data.success;
      // Eğer token geçerliyse, kullanıcı profilini de kontrol et
      if (isValid) {
        try {
          const profileResponse = await axios.get(`${API_URL}/users/profile`, {
            headers: { Authorization: `Bearer ${tokenToValidate}` }
          });
          
          if (profileResponse.data && profileResponse.data.success) {
            return true;
          } else {
            return false;
          }
        } catch (profileError) {
          // Profile error - handled silently in production
          return false;
        }
      }
      
      return isValid;
    } catch (error) {
      // Token validation error - handled silently in production
      return false;
    }
  };

  // AsyncStorage'dan token ve userId'yi yükle
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        setIsLoading(true);
        const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const storedUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
        
        // Token validation kontrolü
        if (storedToken && typeof storedToken === 'string' && storedToken.trim().length > 0 && storedUserId) {
          // Token'ın geçerli olup olmadığını kontrol et
          const isValidToken = await validateToken(storedToken);
          
          if (isValidToken) {
            setToken(storedToken);
            setUserId(storedUserId);
            setIsAuthenticated(true);
            } else {
            // Geçersiz token'ı temizle
            await AsyncStorage.multiRemove([
              STORAGE_KEYS.AUTH_TOKEN,
              STORAGE_KEYS.USER_ID
            ]);
            setToken(null);
            setUserId(null);
            setIsAuthenticated(false);
            }
        } else {
          // Geçersiz token'ı temizle
          if (storedToken) {
            await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          }
          setToken(null);
          setUserId(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        // Hata durumunda temizle
        setToken(null);
        setUserId(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
        }
    };

    loadAuthData();
  }, []);

  const setTokenAndUserId = async (newToken: string, newUserId: string) => {
    try {
      
      // AsyncStorage'a kaydet
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, newUserId);
      
      // State'i güncelle
      setToken(newToken);
      setUserId(newUserId);
      setIsAuthenticated(true);
      
    } catch (error) {
      }
  };

  const login = async (email: string, password: string) => {
    try {
      // Direkt axios ile hızlı istek - Hardcoded URL kullan
      // Use API_URL from config instead of hardcoded
      const FULL_URL = `${API_URL}/auth/login`;
      console.log('🔍 AuthContext Login Debug:');
      console.log('API_URL:', API_URL);
      console.log('FULL_URL:', FULL_URL);
      console.log('Environment EXPO_PUBLIC_API_BASE_URL:', process.env.EXPO_PUBLIC_API_BASE_URL);
      const response = await axios.post(FULL_URL, {
        email,
        password,
        userType: 'driver'
      }, {
        timeout: 15000, // 15 saniye timeout - network gecikmeleri için
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.data && response.data.success) {
        const userId = response.data.data?.userId || response.data.userId;
        const token = response.data.data?.token || response.data.token;
        const userType = response.data.data?.userType || response.data.userType;
        const userData = response.data.data?.user || response.data.user;
        
        // UserType kontrolü - sadece driver kabul edilir
        if (userType !== 'driver') {
          return { success: false, message: 'Bu uygulama sadece şöförler için. Lütfen usta uygulamasını kullanın.' };
        }
        
        if (userId && token) {
          await setTokenAndUserId(token, userId);
          if (userData) {
            setUser(userData);
          }
          return { success: true };
        } else {
          return { success: false, message: 'Token bilgileri alınamadı' };
        }
      } else {
        return { success: false, message: response.data?.message || 'Giriş başarısız' };
      }
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        return { success: false, message: 'Bağlantı zaman aşımı. Lütfen tekrar deneyin.' };
      }
      if (error.code === 'NETWORK_ERROR') {
        return { success: false, message: 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.' };
      }
      if (error.response?.data?.message) {
        return { success: false, message: error.response.data.message };
      }
      return { success: false, message: `Sunucuya bağlanılamadı: ${error.message}` };
    }
  };

  const register = async (userData: { email: string; password: string; name: string; surname: string; phone: string; userType: string; selectedServices?: string[] }) => {
    try {
      // Use API_URL from config instead of hardcoded
      const response = await axios.post(`${API_URL}/auth/register`, userData, {
        timeout: 10000 // 10 saniye timeout
      });
      
      if (response.data && response.data.success) {
        return { success: true, message: 'Hesap başarıyla oluşturuldu' };
      } else {
        return { success: false, message: response.data?.message || 'Kayıt başarısız' };
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        return { success: false, message: error.response.data.message };
      }
      return { success: false, message: 'Sunucuya bağlanılamadı' };
    }
  };

  const logout = async () => {
    try {
      // Önce state'i temizle
      setToken(null);
      setUserId(null);
      setUser(null);
      setIsAuthenticated(false);
      
      // Sonra AsyncStorage'ı temizle - onboarding'i de temizle ki tekrar onboarding'e dönsün
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.ONBOARDING_COMPLETED
      ]);
      
    } catch (error) {
      // Hata olsa bile state'i temizle
      setToken(null);
      setUserId(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Loading state'de children render et
  if (isLoading) {
    return (
      <AuthContext.Provider value={{ 
        token: null, 
        userId: null,
        user: null,
        setToken: () => {},
        setUserId: () => {},
        setUser: () => {},
        setTokenAndUserId: async () => {}, 
        logout: async () => {}, 
        isAuthenticated: false,
        isLoading: true,
        validateToken: async () => false,
        login: async () => ({ success: false }),
        register: async () => ({ success: false })
      }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
      <AuthContext.Provider value={{ 
        token, 
        userId, 
        user,
        setToken, 
        setUserId, 
        setUser,
        setTokenAndUserId, 
        logout, 
        isAuthenticated, 
        isLoading, 
        validateToken, 
        login, 
        register 
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 