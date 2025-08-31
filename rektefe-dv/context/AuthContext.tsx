import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/config';
import axios from 'axios';
import { API_URL } from '../constants/config';

interface AuthContextType {
  token: string | null;
  userId: string | null;
  setToken: (token: string | null) => void;
  setUserId: (userId: string | null) => void;
  setTokenAndUserId: (token: string, userId: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  validateToken: (token: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Token geçerliliğini kontrol eden fonksiyon
  const validateToken = async (tokenToValidate: string): Promise<boolean> => {
    try {
      console.log('🔍 AuthContext: Token validasyonu başlatıldı');
      
      const response = await axios.get(`${API_URL}/auth/validate`, {
        headers: { Authorization: `Bearer ${tokenToValidate}` }
      });
      
      const isValid = response.data && response.data.success;
      console.log('✅ AuthContext: Token validasyonu sonucu:', isValid);
      return isValid;
    } catch (error) {
      console.log('❌ AuthContext: Token validasyonu hatası:', error);
      return false;
    }
  };

  // AsyncStorage'dan token ve userId'yi yükle
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const storedUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
        
        console.log('🔍 AuthContext: AsyncStorage\'dan yüklenen:', { storedToken: !!storedToken, storedUserId: !!storedUserId });
        
        // Token validation kontrolü
        if (storedToken && typeof storedToken === 'string' && storedToken.trim().length > 0 && storedUserId) {
          setToken(storedToken);
          setUserId(storedUserId);
          setIsAuthenticated(true);
          console.log('✅ AuthContext: Token ve userId yüklendi');
        } else {
          console.log('⚠️ AuthContext: AsyncStorage\'da geçersiz token veya userId');
          // Geçersiz token'ı temizle
          if (storedToken) {
            await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            console.log('🧹 AuthContext: Geçersiz token temizlendi');
          }
        }
      } catch (error) {
        console.error('❌ AuthContext: AsyncStorage yükleme hatası:', error);
      }
    };

    loadAuthData();
  }, []);

  const setTokenAndUserId = async (newToken: string, newUserId: string) => {
    try {
      console.log('🔧 AuthContext: setTokenAndUserId çağrıldı:', { newToken: !!newToken, newUserId: !!newUserId });
      
      // AsyncStorage'a kaydet
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, newUserId);
      
      // State'i güncelle
      setToken(newToken);
      setUserId(newUserId);
      setIsAuthenticated(true);
      
      console.log('✅ AuthContext: Token ve userId başarıyla kaydedildi');
    } catch (error) {
      console.error('❌ AuthContext: Token kaydetme hatası:', error);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 AuthContext: Logout çağrıldı');
      
      // AsyncStorage'ı temizle
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_ID);
      
      // State'i temizle
      setToken(null);
      setUserId(null);
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
      setToken,
      setUserId,
      setTokenAndUserId, 
      logout, 
      isAuthenticated,
      validateToken
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