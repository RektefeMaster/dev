import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export const authService = {
  login: async (data: LoginData) => {
    const response = await api.post('/auth/login', data);
    if (response.data.userId && response.data.token) {
      await AsyncStorage.setItem('userId', response.data.userId);
      await AsyncStorage.setItem('token', response.data.token);
      if (response.data.refreshToken) {
        await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
      }
    }
    return response.data;
  },
  
  register: async (data: RegisterData) => {
    const response = await api.post('/auth/register', data);
    if (response.data.userId && response.data.token) {
      await AsyncStorage.setItem('userId', response.data.userId);
      await AsyncStorage.setItem('token', response.data.token);
      if (response.data.refreshToken) {
        await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
      }
    }
    return response.data;
  },
  
  logout: async () => {
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('refreshToken');
    return api.post('/auth/logout');
  },
  
  forgotPassword: async (email: string) => {
    return api.post('/auth/forgot-password', { email });
  },

  googleLogin: async (accessToken: string) => {
    const response = await api.post('/auth/google-login', { accessToken });
    if (response.data.userId && response.data.token) {
      await AsyncStorage.setItem('userId', response.data.userId);
      await AsyncStorage.setItem('token', response.data.token);
    }
    return response.data;
  }
}; 