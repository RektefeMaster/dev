import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '@/constants/config';
import { Driver, RegisterData } from '@/shared/types/common';
import { isTokenValid, isTokenExpired } from '@/shared/utils/tokenUtils';
import { authStorage } from '@/shared/utils/authStorage';

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
  const validateToken = useCallback(async (tokenToValidate: string): Promise<boolean> => {
    try {
      if (!isTokenValid(tokenToValidate)) {
        console.log('❌ Token formatı geçersiz');
        return false;
      }

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
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncFromStorage = async (options: { initial?: boolean } = {}) => {
      if (options.initial) {
        setIsLoading(true);
      }

      try {
        const snapshot = await authStorage.getSnapshot();
        if (!isMounted) {
          return;
        }

        const storedToken = snapshot.token;
        const storedUserId = snapshot.userId;
        const storedRefreshToken = snapshot.refreshToken;
        const storedUserData = (snapshot.userData as Driver | null) ?? null;

        if (storedToken && storedUserId) {
          const isValidToken = await validateToken(storedToken);
          if (!isMounted) {
            return;
          }

          if (isValidToken || storedRefreshToken) {
            setToken(storedToken);
            setUserId(storedUserId);
            setUser(storedUserData);
            setIsAuthenticated(true);
          } else {
            setToken(null);
            setUserId(null);
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setToken(null);
          setUserId(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        if (__DEV__) {
          console.error('❌ AuthContext: Storage senkronizasyon hatası:', error);
        }
      } finally {
        if (options.initial && isMounted) {
          setIsLoading(false);
        }
      }
    };

    syncFromStorage({ initial: true });

    const unsubscribe = authStorage.subscribe(() => {
      if (isMounted) {
        syncFromStorage();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [validateToken]);

  const setTokenAndUserId = async (newToken: string, newUserId: string) => {
    try {
      await authStorage.setAuthData({
        token: newToken,
        userId: newUserId,
      });

      setToken(newToken);
      setUserId(newUserId);
      setIsAuthenticated(true);
    } catch (error) {
      if (__DEV__) {
        console.error('❌ AuthContext: setTokenAndUserId hatası:', error);
      }
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
          const authPayload: Record<string, any> = {
            token,
            userId,
          };

          if (refreshToken) {
            authPayload.refreshToken = refreshToken;
          } else {
            console.error('❌ KRİTİK: Refresh token backend\'den gelmedi!');
          }

          if (userData) {
            authPayload.userData = userData;
          }

          await authStorage.setAuthData(authPayload);
          setToken(token);
          setUserId(userId);
          if (userData) {
            setUser(userData);
          }
          setIsAuthenticated(true);

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
      
      // Sonra storage'ı temizle - onboarding'i de temizle ki tekrar onboarding'e dönsün
      await authStorage.clearAuthData({ clearOnboarding: true });
      
      console.log('✅ AuthContext: Logout tamamlandı');
    } catch (error) {
      console.error('❌ AuthContext: Logout hatası:', error);
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