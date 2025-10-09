import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// BaseApiService interface tanımı
interface BaseApiService {
  validateToken(): Promise<boolean>;
  login(data: any): Promise<any>;
  register(data: any): Promise<any>;
  logout(): Promise<void>;
  get(url: string): Promise<any>;
}

// ===== SHARED TYPES =====

export interface SharedUser {
  _id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  userType: 'driver' | 'mechanic';
  isAdmin?: boolean;
  // Driver-specific fields
  profilePhotoUrl?: string;
  coverPhotoUrl?: string;
  // Mechanic-specific fields
  experience?: number;
  specialties?: string[];
  serviceCategories?: string[];
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  rating?: number;
  totalRatings?: number;
  availability?: boolean;
  workingHours?: {
    start: string;
    end: string;
    days: string[];
  };
  priceRange?: {
    min: number;
    max: number;
  };
}

export interface AuthConfig {
  userType: 'driver' | 'mechanic';
  appName: string;
  storageKeys: {
    AUTH_TOKEN: string;
    REFRESH_TOKEN: string;
    USER_ID: string;
    USER_DATA: string;
    ERROR_LOGS: string;
    ONBOARDING_COMPLETED?: string;
  };
  apiService: BaseApiService;
  onAuthFailure?: () => void;
}

export interface SharedAuthContextType {
  token: string | null;
  userId: string | null;
  user: SharedUser | null;
  userType: 'driver' | 'mechanic';
  setToken: (token: string | null) => void;
  setUserId: (userId: string | null) => void;
  setUser: (user: SharedUser | null) => void;
  updateUser: (updates: Partial<SharedUser>) => void;
  setTokenAndUserId: (token: string, userId: string) => Promise<void>;
  validateToken: (token: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; data?: any }>;
  register: (userData: any) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshToken: () => Promise<boolean>;
  clearAuthData: () => Promise<void>;
}

const SharedAuthContext = createContext<SharedAuthContextType | undefined>(undefined);

// ===== SHARED AUTH PROVIDER =====

export const SharedAuthProvider = ({ 
  children, 
  config 
}: { 
  children: ReactNode;
  config: AuthConfig;
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<SharedUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Token geçerliliğini kontrol eden fonksiyon
  const validateToken = async (tokenToValidate: string): Promise<boolean> => {
    try {
      // Önce token'ın formatını kontrol et
      if (!tokenToValidate || tokenToValidate.trim().length === 0) {
        return false;
      }
      
      // Base API service'den token validation kullan
      const isValid = await config.apiService.validateToken();
      return isValid;
    } catch (error: any) {
      return false;
    }
  };

  // Token yenileme fonksiyonu
  const refreshToken = async (): Promise<boolean> => {
    try {
      // BaseApiService otomatik token refresh yapar
      return true;
    } catch (error) {
      return false;
    }
  };

  // Storage migration - eski key formatından yeni key formatına geçiş
  const migrateStorageKeys = async () => {
    try {
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

      // Migration işlemi
      for (const [key, oldKey] of Object.entries(oldKeys)) {
        const oldValue = await AsyncStorage.getItem(oldKey);
        if (oldValue) {
          // Eski değeri yeni key ile kaydet
          await AsyncStorage.setItem(newKeys[key as keyof typeof newKeys], oldValue);
          // Eski key'i sil
          await AsyncStorage.removeItem(oldKey);
          console.log(`✅ SharedAuth Storage key migrated: ${oldKey} -> ${newKeys[key as keyof typeof newKeys]}`);
        }
      }
    } catch (error) {
      console.error('❌ SharedAuth Storage migration hatası:', error);
    }
  };

  // Auth data'yı temizle
  const clearAuthData = async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([
        config.storageKeys.AUTH_TOKEN,
        config.storageKeys.REFRESH_TOKEN,
        config.storageKeys.USER_ID,
        config.storageKeys.USER_DATA,
        ...(config.storageKeys.ONBOARDING_COMPLETED ? [config.storageKeys.ONBOARDING_COMPLETED] : []),
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
      
      // Call auth failure callback if provided
      if (config.onAuthFailure) {
        config.onAuthFailure();
      }
    } catch (error) {
      console.error('❌ Clear auth data hatası:', error);
    }
  };

  // User data'yı API'den yükle
  const loadUserDataFromAPI = async (): Promise<void> => {
    try {
      const userResponse = await config.apiService.get('/users/profile');
      
      if (userResponse.success && userResponse.data) {
        const userData: SharedUser = {
          ...userResponse.data,
          userType: config.userType
        };
        
        setUser(userData);
        await AsyncStorage.setItem(config.storageKeys.USER_DATA, JSON.stringify(userData));
        
        if (config.storageKeys.ONBOARDING_COMPLETED) {
          await AsyncStorage.setItem(config.storageKeys.ONBOARDING_COMPLETED, 'true');
        }
        
        } else {
        }
    } catch (error) {
      }
  };

  // AsyncStorage'dan auth data'yı yükle
  useEffect(() => {
    let isMounted = true;
    let abortController = new AbortController();
    
    const loadAuthData = async () => {
      try {
        if (!isMounted) return;
        
        setIsLoading(true);
        
        // Önce storage migration yap
        await migrateStorageKeys();
        
        const storedToken = await AsyncStorage.getItem(config.storageKeys.AUTH_TOKEN);
        const storedUserId = await AsyncStorage.getItem(config.storageKeys.USER_ID);
        const storedUserData = await AsyncStorage.getItem(config.storageKeys.USER_DATA);
        
        if (!isMounted) return;
        
        let authState = {
          token: null as string | null,
          userId: null as string | null,
          isAuthenticated: false
        };
        
        // Token validation kontrolü - Hızlı başlatma için devre dışı
        if (storedToken && typeof storedToken === 'string' && storedToken.trim().length > 0 && storedUserId) {
          // Hızlı başlatma için token validation'ı atla
          authState = {
            token: storedToken,
            userId: storedUserId,
            isAuthenticated: true
          };
          
          // Cached user data'yı yükle
          if (storedUserData) {
            try {
              const parsedUserData = JSON.parse(storedUserData);
              if (isMounted) {
                setUser({
                  ...parsedUserData,
                  userType: config.userType
                });
              }
              } catch (parseError) {
              }
          }
        } else {
          // Token yok veya geçersiz, logout yap
          console.log('❌ Token bulunamadı veya geçersiz, logout yapılıyor...');
          authState = {
            token: null,
            userId: null,
            isAuthenticated: false
          };
        }
        
        // State'leri toplu olarak güncelle
        if (isMounted && !abortController.signal.aborted) {
          setToken(authState.token);
          setUserId(authState.userId);
          setIsAuthenticated(authState.isAuthenticated);
        }
        
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        
        if (isMounted) {
          setToken(null);
          setUserId(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAuthData();
    
    // Cleanup function
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  const setTokenAndUserId = async (newToken: string, newUserId: string): Promise<void> => {
    try {
      // AsyncStorage'a kaydet
      await AsyncStorage.setItem(config.storageKeys.AUTH_TOKEN, newToken);
      await AsyncStorage.setItem(config.storageKeys.USER_ID, newUserId);
      
      if (config.storageKeys.ONBOARDING_COMPLETED) {
        await AsyncStorage.setItem(config.storageKeys.ONBOARDING_COMPLETED, 'true');
      }
      
      // State'i güncelle
      setToken(newToken);
      setUserId(newUserId);
      setIsAuthenticated(true);
      
    } catch (error) {
      }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string; data?: any }> => {
    try {
      const response = await config.apiService.login({
        email,
        password,
        userType: config.userType
      });
      
      if (response.success && response.data) {
        const { token, refreshToken, user } = response.data;
        
        // UserType kontrolü
        if (user?.userType && user.userType !== config.userType) {
          const appName = config.userType === 'driver' ? 'şöför' : 'usta';
          const otherAppName = config.userType === 'driver' ? 'usta' : 'şöför';
          return { 
            success: false, 
            message: `Bu uygulama sadece ${appName}lar için. Lütfen ${otherAppName} uygulamasını kullanın.` 
          };
        }
        
        if (user?._id && token) {
          await setTokenAndUserId(token, user._id);
          
          // Refresh token'ı kaydet
          if (refreshToken) {
            await AsyncStorage.setItem(config.storageKeys.REFRESH_TOKEN, refreshToken);
          }
          
          // User data'yı kaydet
          if (user) {
            const userData: SharedUser = {
              ...user,
              userType: config.userType
            };
            setUser(userData);
            await AsyncStorage.setItem(config.storageKeys.USER_DATA, JSON.stringify(userData));
          }
          
          return { success: true, data: response.data };
        } else {
          return { success: false, message: 'Token bilgileri alınamadı' };
        }
      } else {
        return { success: false, message: response.message || 'Giriş başarısız' };
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        return { success: false, message: error.response.data.message };
      }
      return { success: false, message: 'Sunucuya bağlanılamadı' };
    }
  };

  const register = async (userData: any): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await config.apiService.register({
        ...userData,
        userType: config.userType
      });
      
      if (response.success) {
        if (config.storageKeys.ONBOARDING_COMPLETED) {
          await AsyncStorage.setItem(config.storageKeys.ONBOARDING_COMPLETED, 'true');
        }
        return { success: true, message: 'Hesap başarıyla oluşturuldu' };
      } else {
        return { success: false, message: response.message || 'Kayıt başarısız' };
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        return { success: false, message: error.response.data.message };
      }
      return { success: false, message: 'Sunucuya bağlanılamadı' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // API logout call
      try {
        await config.apiService.logout();
      } catch (error) {
        // Continue with local cleanup even if API call fails
      }
      
      // Local cleanup
      await clearAuthData();
      
    } catch (error) {
      // Force local cleanup
      await clearAuthData();
    }
  };

  const updateUser = (updates: Partial<SharedUser>): void => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      AsyncStorage.setItem(config.storageKeys.USER_DATA, JSON.stringify(updatedUser));
    }
  };

  // Loading state'de children render et
  if (isLoading) {
    return (
      <SharedAuthContext.Provider value={{ 
        token: null, 
        userId: null, 
        user: null,
        userType: config.userType,
        setToken: () => {},
        setUserId: () => {},
        setUser: () => {},
        updateUser: () => {},
        setTokenAndUserId: async () => {}, 
        validateToken: async () => false,
        login: async () => ({ success: false }),
        register: async () => ({ success: false }),
        logout: async () => {}, 
        isAuthenticated: false,
        isLoading: true,
        refreshToken: async () => false,
        clearAuthData: async () => {}
      }}>
        {children}
      </SharedAuthContext.Provider>
    );
  }

  return (
    <SharedAuthContext.Provider value={{ 
      token, 
      userId, 
      user,
      userType: config.userType,
      setToken, 
      setUserId, 
      setUser,
      updateUser,
      setTokenAndUserId, 
      validateToken,
      login, 
      register,
      logout, 
      isAuthenticated, 
      isLoading,
      refreshToken,
      clearAuthData
    }}>
      {children}
    </SharedAuthContext.Provider>
  );
};

// ===== HOOK =====

export const useSharedAuth = () => {
  const context = useContext(SharedAuthContext);
  if (context === undefined) {
    throw new Error('useSharedAuth must be used within a SharedAuthProvider');
  }
  return context;
};

// ===== UTILITY FUNCTIONS =====

// Driver app için wrapper
export const createDriverAuthProvider = (apiService: BaseApiService, storageKeys: AuthConfig['storageKeys'], onAuthFailure?: () => void) => {
  return ({ children }: { children: ReactNode }) => {
    const config: AuthConfig = {
      userType: 'driver',
      appName: 'Rektefe Driver App',
      storageKeys,
      apiService,
      onAuthFailure
    };
    
    return (
      <SharedAuthProvider config={config}>
        {children}
      </SharedAuthProvider>
    );
  };
};

// Mechanic app için wrapper
export const createMechanicAuthProvider = (apiService: BaseApiService, storageKeys: AuthConfig['storageKeys']) => {
  return ({ children }: { children: ReactNode }) => {
    const config: AuthConfig = {
      userType: 'mechanic',
      appName: 'Rektefe Mechanic App',
      storageKeys,
      apiService
    };
    
    return (
      <SharedAuthProvider config={config}>
        {children}
      </SharedAuthProvider>
    );
  };
};

export default SharedAuthContext;
