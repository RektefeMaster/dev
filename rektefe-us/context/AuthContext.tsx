import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getToken, getUserId, logout as logoutService } from '../services/auth';
import { MechanicProfile, getMechanicProfile } from '../services/auth';
import { registerForPushNotificationsAsync, savePushToken } from '../services/notifications';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: MechanicProfile | null;
  token: string | null;
  userId: string | null;
  login: (token: string, userId: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: MechanicProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<MechanicProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Uygulama başladığında token kontrolü
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const storedToken = await getToken();
      const storedUserId = await getUserId();

      if (storedToken && storedUserId) {
        setToken(storedToken);
        setUserId(storedUserId);
        setIsAuthenticated(true);

        // Kullanıcı bilgilerini getir ve bildirimleri kaydet
        try {
          const userData = await getMechanicProfile();
          setUser(userData);
          
          // Bildirimler için kaydol
          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken) {
            await savePushToken(pushToken);
          }

        } catch (error) {
          console.error('Kullanıcı bilgileri alınamadı:', error);
          // Token geçersiz olabilir, logout yap
          await logout();
        }
      }
    } catch (error) {
      console.error('Auth status kontrol hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setUserAndAuth = (userData: MechanicProfile, token: string, userId: string) => {
    setUser(userData);
    setToken(token);
    setUserId(userId);
    setIsAuthenticated(true);
  };

  const login = async (newToken: string, newUserId: string, userData?: MechanicProfile) => {
    setToken(newToken);
    setUserId(newUserId);
    setIsAuthenticated(true);

    if (userData) {
      setUser(userData);
    } else {
      // Kullanıcı bilgilerini getir ve bildirimleri kaydet
      try {
        const userDataFetched = await getMechanicProfile();
        setUser(userDataFetched);
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          await savePushToken(pushToken);
        }
      } catch (error) {
        console.error('Kullanıcı bilgileri alınamadı:', error);
      }
    }
  };

  const logout = async () => {
    await logoutService();
    setToken(null);
    setUserId(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (userData: MechanicProfile) => {
    setUser(userData);
  };

  const value: AuthContextType & { setUserAndAuth: typeof setUserAndAuth } = {
    isAuthenticated,
    isLoading,
    user,
    token,
    userId,
    login,
    logout,
    updateUser,
    setUserAndAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 