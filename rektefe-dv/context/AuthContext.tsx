import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/config';
import axios from 'axios';
import { API_URL } from '../constants/config';

interface AuthContextType {
  token: string | null;
  userId: string | null;
  user: any | null;
  setToken: (token: string | null) => void;
  setUserId: (userId: string | null) => void;
  setUser: (user: any | null) => void;
  setTokenAndUserId: (token: string, userId: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  validateToken: (token: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (userData: { email: string; password: string; name: string; surname: string; phone: string; userType: string; selectedServices?: string[] }) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Token geçerliliğini kontrol eden fonksiyon
  const validateToken = async (tokenToValidate: string): Promise<boolean> => {
    try {
      console.log('🔍 Token validation başlatılıyor...');
      
      // Önce token'ın formatını kontrol et
      if (!tokenToValidate || tokenToValidate.trim().length === 0) {
        console.log('❌ Token boş veya geçersiz format');
        return false;
      }
      
      // Token validation endpoint'ini çağır
      const response = await axios.get(`${API_URL}/auth/validate`, {
        headers: { Authorization: `Bearer ${tokenToValidate}` }
      });
      
      const isValid = response.data && response.data.success;
      console.log('✅ Token validation sonucu:', isValid);
      
      // Eğer token geçerliyse, kullanıcı profilini de kontrol et
      if (isValid) {
        try {
          const profileResponse = await axios.get(`${API_URL}/users/profile`, {
            headers: { Authorization: `Bearer ${tokenToValidate}` }
          });
          
          if (profileResponse.data && profileResponse.data.success) {
            console.log('✅ Kullanıcı profili de geçerli');
            return true;
          } else {
            console.log('❌ Kullanıcı profili geçersiz');
            return false;
          }
        } catch (profileError) {
          console.log('❌ Kullanıcı profili alınamadı:', profileError.response?.status);
          return false;
        }
      }
      
      return isValid;
    } catch (error) {
      console.log('❌ Token geçersiz:', error.response?.status);
      return false;
    }
  };

  // AsyncStorage'dan token ve userId'yi yükle
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        console.log('🔄 AuthContext: AsyncStorage yükleniyor...');
        setIsLoading(true);
        const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const storedUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
        
        console.log('📱 Stored token:', storedToken ? 'Mevcut' : 'Yok');
        console.log('📱 Stored userId:', storedUserId ? 'Mevcut' : 'Yok');
        
        // Token validation kontrolü
        if (storedToken && typeof storedToken === 'string' && storedToken.trim().length > 0 && storedUserId) {
          console.log('🔍 Token validation başlatılıyor...');
          // Token'ın geçerli olup olmadığını kontrol et
          const isValidToken = await validateToken(storedToken);
          
          if (isValidToken) {
            console.log('✅ Geçerli token bulundu, kullanıcı authenticated');
            setToken(storedToken);
            setUserId(storedUserId);
            setIsAuthenticated(true);
            console.log('🔐 isAuthenticated true olarak ayarlandı');
          } else {
            console.log('❌ Geçersiz token, temizleniyor...');
            // Geçersiz token'ı temizle
            await AsyncStorage.multiRemove([
              STORAGE_KEYS.AUTH_TOKEN,
              STORAGE_KEYS.USER_ID
            ]);
            setToken(null);
            setUserId(null);
            setIsAuthenticated(false);
            console.log('🔐 isAuthenticated false olarak ayarlandı');
          }
        } else {
          console.log('ℹ️ Token veya userId bulunamadı, kullanıcı authenticated değil');
          // Geçersiz token'ı temizle
          if (storedToken) {
            await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          }
          setToken(null);
          setUserId(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('❌ AuthContext: AsyncStorage yükleme hatası:', error);
        // Hata durumunda temizle
        setToken(null);
        setUserId(null);
        setIsAuthenticated(false);
      } finally {
        console.log('🏁 AuthContext: Loading tamamlandı, isAuthenticated:', isAuthenticated);
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
      console.error('❌ AuthContext: Token kaydetme hatası:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 AuthContext: Login çağrıldı:', email);
      
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
        userType: 'driver' // Şöför uygulaması sadece driver kabul eder
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
      console.error('❌ AuthContext: Login hatası:', error);
      if (error.response?.data?.message) {
        return { success: false, message: error.response.data.message };
      }
      return { success: false, message: 'Sunucuya bağlanılamadı' };
    }
  };

  const register = async (userData: { email: string; password: string; name: string; surname: string; phone: string; userType: string; selectedServices?: string[] }) => {
    try {
      console.log('📝 AuthContext: Register çağrıldı:', userData.email);
      
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      
      if (response.data && response.data.success) {
        return { success: true, message: 'Hesap başarıyla oluşturuldu' };
      } else {
        return { success: false, message: response.data?.message || 'Kayıt başarısız' };
      }
    } catch (error: any) {
      console.error('❌ AuthContext: Register hatası:', error);
      if (error.response?.data?.message) {
        return { success: false, message: error.response.data.message };
      }
      return { success: false, message: 'Sunucuya bağlanılamadı' };
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 AuthContext: Logout çağrıldı');
      
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
      console.error('❌ AuthContext: Logout hatası:', error);
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
        setToken: () => {},
        setUserId: () => {},
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