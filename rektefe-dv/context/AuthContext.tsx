import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  token: string | null;
  userId: string | null;
  setToken: (token: string | null) => void;
  setUserId: (userId: string | null) => void;
  setTokenAndUserId: (token: string, userId: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // AsyncStorage'dan token ve userId'yi yükle
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUserId = await AsyncStorage.getItem('userId');
        
        console.log('🔍 AuthContext: AsyncStorage\'dan yüklenen:', { storedToken: !!storedToken, storedUserId: !!storedUserId });
        
        if (storedToken && storedUserId) {
          setToken(storedToken);
          setUserId(storedUserId);
          setIsAuthenticated(true);
          console.log('✅ AuthContext: Token ve userId yüklendi');
        } else {
          console.log('⚠️ AuthContext: AsyncStorage\'da token veya userId yok');
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
      await AsyncStorage.setItem('token', newToken);
      await AsyncStorage.setItem('userId', newUserId);
      
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
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userId');
      
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
      isAuthenticated 
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