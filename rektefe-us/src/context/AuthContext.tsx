import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/config';
import { User, MechanicProfile } from '../types/common';
import apiService from '../services/api';

interface AuthContextType {
  token: string | null;
  userId: string | null;
  user: MechanicProfile | null;
  setToken: (token: string | null) => void;
  setUserId: (userId: string | null) => void;
  setUser: (user: MechanicProfile | null) => void;
  setTokenAndUserId: (token: string, userId: string) => Promise<void>;
  login: (email: string, password: string) => Promise<any>;
  register: (userData: any) => Promise<any>;
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

  // AsyncStorage'dan token ve userId'yi yükle
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        setIsLoading(true);
        const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const storedUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
        const storedUserData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
        
        console.log('🔍 AuthContext: AsyncStorage\'dan yüklenen:', { 
          storedToken: !!storedToken, 
          storedUserId: !!storedToken,
          storedUserData: !!storedUserData 
        });
        
        if (storedToken && storedUserId) {
          // Token'ı test et
          try {
            console.log('🔍 AuthContext: Token test ediliyor...');
            console.log('🔍 AuthContext: Stored token:', storedToken.substring(0, 20) + '...');
            console.log('🔍 AuthContext: Stored userId:', storedUserId);
            
            const testResponse = await apiService.getMechanicProfile();
            if (testResponse.success) {
              console.log('✅ AuthContext: Token test başarılı, authentication set ediliyor');
              setToken(storedToken);
              setUserId(storedUserId);
              setIsAuthenticated(true);
              
              if (storedUserData) {
                try {
                  const userData = JSON.parse(storedUserData);
                  setUser(userData);
                  console.log('✅ AuthContext: User data AsyncStorage\'dan yüklendi');
                } catch (error) {
                  console.error('❌ AuthContext: User data parse hatası:', error);
                  // Parse hatası varsa API'den çek
                  await loadUserDataFromAPI();
                }
              } else {
                // User data yoksa API'den çek
                await loadUserDataFromAPI();
              }
              
              // Onboarding tamamlandı olarak işaretle
              await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
              
              console.log('✅ AuthContext: Token ve userId yüklendi');
            } else {
              // Token geçersiz, temizle
              console.log('❌ AuthContext: Token geçersiz, temizleniyor...');
              await clearStoredData();
            }
          } catch (error) {
            // Token hatası, temizle
            console.log('❌ AuthContext: Token hatası, temizleniyor...', error);
            await clearStoredData();
          }
        } else {
          console.log('⚠️ AuthContext: AsyncStorage\'da token veya userId yok');
        }
      } catch (error) {
        console.error('❌ AuthContext: AsyncStorage yükleme hatası:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthData();
  }, []);

  // User data'yı API'den yükle
  const loadUserDataFromAPI = async () => {
    try {
      console.log('🔄 AuthContext: User data API\'den çekiliyor...');
      const userResponse = await apiService.getMechanicProfile();
      if (userResponse.success && userResponse.data) {
        setUser(userResponse.data);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userResponse.data));
        await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
        console.log('✅ AuthContext: User data API\'den çekildi ve kaydedildi');
      } else {
        console.log('❌ AuthContext: API\'den user data alınamadı');
      }
    } catch (error) {
      console.error('❌ AuthContext: User data API hatası:', error);
    }
  };

  // Stored data'yı temizle
  const clearStoredData = async () => {
    try {
      console.log('🧹 AuthContext: Stored data temizleniyor...');
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.ONBOARDING_COMPLETED
      ]);
      setToken(null);
      setUserId(null);
      setUser(null);
      setIsAuthenticated(false);
      console.log('✅ AuthContext: Stored data temizlendi, authentication false yapıldı');
    } catch (error) {
      console.error('❌ AuthContext: Data temizleme hatası:', error);
    }
  };

  const setTokenAndUserId = async (newToken: string, newUserId: string) => {
    try {
      console.log('🔧 AuthContext: setTokenAndUserId çağrıldı:', { 
        newToken: !!newToken, 
        newUserId: !!newUserId 
      });
      
      // AsyncStorage'a kaydet
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, newUserId);
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      
      // State'i güncelle
      setToken(newToken);
      setUserId(newUserId);
      setIsAuthenticated(true);
      
      console.log('✅ AuthContext: Token ve userId başarıyla kaydedildi');
    } catch (error) {
      console.error('❌ AuthContext: Token kaydetme hatası:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 AuthContext: Login çağrıldı:', { email });
      
      // Gerçek API çağrısı yap
      const response = await apiService.login(email, password, 'mechanic');
      
      if (response.success && response.data) {
        const { token, userId, user } = response.data;
        
        // Token ve userId'yi kaydet
        await setTokenAndUserId(token, userId);
        
        // User data'yı kaydet ve log'la
        if (user) {
          console.log('👤 AuthContext: User data alındı:', { 
            name: user.name, 
            surname: user.surname, 
            email: user.email 
          });
          setUser(user);
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
          await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
        } else {
          console.log('⚠️ AuthContext: User data bulunamadı');
        }
        
        console.log('✅ AuthContext: Login başarılı');
        return response;
      } else {
        console.log('❌ AuthContext: Login başarısız:', response.message);
        return { success: false, message: response.message || 'Giriş başarısız' };
      }
    } catch (error) {
      console.error('❌ AuthContext: Login hatası:', error);
      return { success: false, message: 'Bir hata oluştu' };
    }
  };

  const register = async (userData: any) => {
    try {
      console.log('📝 AuthContext: Register çağrıldı:', { email: userData.email });
      
      // Gerçek API çağrısı yap
      const response = await apiService.register(userData);
      
      if (response.success) {
        await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      }
      
      console.log('✅ AuthContext: Register başarılı');
      return response;
    } catch (error) {
      console.error('❌ AuthContext: Register hatası:', error);
      return { success: false, message: 'Bir hata oluştu' };
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 AuthContext: Logout çağrıldı');
      
      // AsyncStorage'ı temizle
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_ID);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      
      // State'i temizle
      setToken(null);
      setUserId(null);
      setUser(null);
      setIsAuthenticated(false);
      
      console.log('✅ AuthContext: Logout başarılı');
    } catch (error) {
      console.error('❌ AuthContext: Logout hatası:', error);
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
