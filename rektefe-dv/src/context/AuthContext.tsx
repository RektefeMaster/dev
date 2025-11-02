import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/config';
import axios from 'axios';
import { API_URL } from '@/constants/config';
import { apiService } from '@/shared/services/api';
import { Driver, RegisterData } from '@/shared/types/common';
import { isTokenValid, isTokenExpired, getTokenUserInfo } from '@/shared/utils/tokenUtils';

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

  // Token geçerliliğini kontrol eden fonksiyon - Sadece format ve süre kontrolü
  const validateToken = async (tokenToValidate: string): Promise<boolean> => {
    try {
      // Önce token'ın formatını kontrol et
      if (!isTokenValid(tokenToValidate)) {
        console.log('❌ Token formatı geçersiz');
        return false;
      }

      // Token'ın süresi dolmuş mu kontrol et
      if (isTokenExpired(tokenToValidate)) {
        console.log('❌ Token süresi dolmuş');
        return false;
      }
      
      console.log('✅ Token format ve süre kontrolü başarılı');
      return true;
      
    } catch (error) {
      console.log('❌ Token validation hatası:', error);
      return false;
    }
  };

  // AsyncStorage'dan token ve userId'yi yükle
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        setIsLoading(true);
        
        // Debug için token'ları kontrol et
        const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const storedUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
        const storedRefreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        
        console.log('🔍 AuthContext - Storage Durumu:');
        console.log('  - Token:', storedToken ? `Mevcut (${storedToken.substring(0, 20)}...)` : 'YOK');
        console.log('  - UserId:', storedUserId ? storedUserId : 'YOK');
        console.log('  - RefreshToken:', storedRefreshToken ? `Mevcut (${storedRefreshToken.substring(0, 20)}...)` : 'YOK');
        
        // Token validation kontrolü
        if (storedToken && storedUserId) {
          // Token'ın geçerli olup olmadığını kontrol et
          const isValidToken = await validateToken(storedToken);
          
          if (isValidToken) {
            setToken(storedToken);
            setUserId(storedUserId);
            setIsAuthenticated(true);
            console.log('✅ AuthContext: Token geçerli, kullanıcı authenticated');
          } else {
            // Token geçersiz ama refresh token varsa, otomatik logout yapma
            // Token refresh mekanizması çalışacak
            if (storedRefreshToken) {
              console.log('⚠️ AuthContext: Token süresi dolmuş ama refresh token mevcut');
              console.log('⚠️ İlk API çağrısında token otomatik yenilenecek');
              // Token'ı geçici olarak set et, API çağrısında otomatik yenilenecek
              setToken(storedToken);
              setUserId(storedUserId);
              setIsAuthenticated(true);
            } else {
              // Refresh token da yoksa sadece state'i temizle
              // Storage'ı temizlememe sebebi: Kullanıcı manuel logout yapmadığı sürece
              // oturum açık kalmalı. Belki token'lar yeniden yüklenecek
              console.log('⚠️ AuthContext: Token geçersiz ve refresh token yok');
              console.log('⚠️ AuthContext: State temizleniyor ama storage korunuyor');
              setToken(null);
              setUserId(null);
              setIsAuthenticated(false);
            }
          }
        } else {
          // Token veya userId yoksa sadece state'i temizle, storage'ı temizleme
          // Storage'ı temizlememe sebebi: Kullanıcı manuel logout yapmadığı sürece
          // oturum açık kalmalı. Storage'daki veriler korunur, sadece state güncellenir
          console.log('⚠️ AuthContext: Token veya userId bulunamadı (ilk açılış veya manuel logout)');
          setToken(null);
          setUserId(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        // Hata durumunda otomatik logout yapma - storage'daki veriler korunur
        // Kullanıcı manuel logout yapmadığı sürece oturum açık kalır
        console.error('❌ AuthContext: Storage okuma hatası (oturum korunuyor):', error);
        // State'i temizle ama storage'ı temizleme - token refresh mekanizması çalışabilir
        // Eğer token varsa ama okunamadıysa, state'i null yap ama storage'dan tekrar okumayı dene
        const fallbackToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN).catch(() => null);
        const fallbackUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID).catch(() => null);
        
        if (fallbackToken && fallbackUserId) {
          // Fallback okuma başarılı, state'i set et
          setToken(fallbackToken);
          setUserId(fallbackUserId);
          setIsAuthenticated(true);
          console.log('✅ AuthContext: Fallback okuma başarılı, oturum korundu');
        } else {
          // Gerçekten token yok, state'i temizle
          setToken(null);
          setUserId(null);
          setIsAuthenticated(false);
        }
      } finally {
        setIsLoading(false);
        }
    };

    loadAuthData();

    // AsyncStorage değişikliklerini dinle (API service logout için)
    const checkAuthState = async () => {
      const currentToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const currentUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      
      // Eğer token silinmişse state'i güncelle
      if (!currentToken && token) {
        console.log('🔄 AuthContext: Token silinmiş (API interceptor logout), state güncelleniyor');
        setToken(null);
        setUserId(null);
        setUser(null);
        setIsAuthenticated(false);
      }
      
      // Eğer token eklenmişse (refresh sonrası) state'i güncelle
      if (currentToken && currentToken !== token) {
        console.log('🔄 AuthContext: Token güncellendi (API interceptor refresh), state güncelleniyor');
        setToken(currentToken);
        if (currentUserId) {
          setUserId(currentUserId);
        }
        setIsAuthenticated(true);
      }
    };

    // Her 1 saniyede bir kontrol et (daha responsive)
    const interval = setInterval(checkAuthState, 1000);
    
    return () => clearInterval(interval);
  }, [token]);

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
      // Direkt axios ile hızlı istek
      const FULL_URL = `${API_URL}/auth/login`;
      console.log('🔍 AuthContext Login Debug:');
      console.log('  - API_URL:', API_URL);
      console.log('  - Email:', email);
      
      const response = await axios.post(FULL_URL, {
        email,
        password,
        userType: 'driver'
      }, {
        timeout: 15000, // 15 saniye timeout
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('🔍 Login Response:', response.data);
      
      if (response.data && response.data.success) {
        const responseData = response.data.data || response.data;
        const userId = responseData.userId || responseData.user?._id || responseData.user?.id;
        const token = responseData.token;
        const refreshToken = responseData.refreshToken;
        const userType = responseData.userType || responseData.user?.userType;
        const userData = responseData.user;
        
        console.log('🔍 Parsed Data:');
        console.log('  - userId:', userId);
        console.log('  - token:', token ? `${token.substring(0, 20)}...` : 'YOK');
        console.log('  - refreshToken:', refreshToken ? `${refreshToken.substring(0, 20)}...` : 'YOK');
        console.log('  - userType:', userType);
        console.log('  - userData:', userData ? 'Mevcut' : 'YOK');
        
        // UserType kontrolü - sadece driver kabul edilir
        if (userType !== 'driver') {
          return { success: false, message: 'Bu uygulama sadece şöförler için. Lütfen usta uygulamasını kullanın.' };
        }
        
        if (userId && token) {
          // Refresh token'ı kaydet (KRİTİK - Bu olmadan token yenilemesi çalışmaz)
          if (refreshToken) {
            await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
            console.log('✅ Refresh token kaydedildi');
          } else {
            console.error('❌ KRİTİK: Refresh token backend\'den gelmedi!');
            console.error('❌ Token yenileme mekanizması çalışmayacak!');
            // Yine de devam et ama kullanıcıyı uyar
          }
          
          await setTokenAndUserId(token, userId);
          if (userData) {
            setUser(userData);
            await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
          }
          
          console.log('✅ Login başarılı, tüm veriler kaydedildi');
          return { success: true };
        } else {
          console.error('❌ Token veya userId eksik:', { userId, token: !!token });
          return { success: false, message: 'Token bilgileri alınamadı' };
        }
      } else {
        return { success: false, message: response.data?.message || 'Giriş başarısız' };
      }
    } catch (error: any) {
      console.error('❌ Login hatası:', error);
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
      console.log('🚪 AuthContext: Logout başlatılıyor...');
      
      // Önce state'i temizle
      setToken(null);
      setUserId(null);
      setUser(null);
      setIsAuthenticated(false);
      
      // Sonra AsyncStorage'ı temizle - onboarding'i de temizle ki tekrar onboarding'e dönsün
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.ONBOARDING_COMPLETED
      ]);
      
      console.log('✅ AuthContext: Logout tamamlandı');
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