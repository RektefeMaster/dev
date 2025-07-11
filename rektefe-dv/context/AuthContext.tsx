import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  token: string | null;
  userId: string | null;
  setToken: (token: string | null) => void;
  setUserId: (userId: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadAuth = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUserId = await AsyncStorage.getItem('userId');
      setToken(storedToken);
      setUserId(storedUserId);
    };
    loadAuth();
  }, []);

  const setTokenAndUserId = async (token: string | null, userId: string | null) => {
    if (token && userId) {
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('userId', userId);
      setToken(token);
      setUserId(userId);
      console.log('AuthContext: Token ve userId kaydedildi:', token, userId);
    } else {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userId');
      setToken(null);
      setUserId(null);
      console.log('AuthContext: Token ve userId temizlendi!');
    }
  };

  const logout = async () => {
    await setTokenAndUserId(null, null);
  };

  return (
    <AuthContext.Provider value={{ token, userId, setToken, setUserId, logout }}>
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