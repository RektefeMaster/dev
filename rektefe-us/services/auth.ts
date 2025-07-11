import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MechanicRegisterData {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  shopName?: string;
  shopType?: 'usta' | 'dukkan';
  location?: {
    city?: string;
    district?: string;
    neighborhood?: string;
    street?: string;
    building?: string;
    floor?: string;
    apartment?: string;
  };
  serviceCategories?: string[];
  description?: string;
  workingHours?: {
    monday?: { open?: string; close?: string; isOpen?: boolean };
    tuesday?: { open?: string; close?: string; isOpen?: boolean };
    wednesday?: { open?: string; close?: string; isOpen?: boolean };
    thursday?: { open?: string; close?: string; isOpen?: boolean };
    friday?: { open?: string; close?: string; isOpen?: boolean };
    saturday?: { open?: string; close?: string; isOpen?: boolean };
    sunday?: { open?: string; close?: string; isOpen?: boolean };
  };
}

export interface MechanicLoginData {
  email: string;
  password: string;
}

export interface MechanicProfile {
  _id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  shopName: string;
  location: {
    city: string;
    district: string;
    neighborhood: string;
    street: string;
    building: string;
    floor: string;
    apartment: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  serviceCategories: string[];
  vehicleBrands: string[];
  bio: string;
  rating: number;
  totalServices: number;
  isAvailable: boolean;
  workingHours: any;
  profileImage?: string;
  avatar?: string;
  cover?: string;
  createdAt: string;
  updatedAt: string;
}

// Usta kayıt
export const registerMechanic = async (data: MechanicRegisterData) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

// Usta giriş
export const loginMechanic = async (data: MechanicLoginData) => {
  console.log('loginMechanic çağrıldı', data);
  const response = await api.post('/auth/login', {
    ...data,
    userType: 'mechanic',
  });
  return response.data;
};

// Token kaydet
export const saveToken = async (token: string, userId: string) => {
  await AsyncStorage.setItem('token', token);
  await AsyncStorage.setItem('userId', userId);
};

// Token al
export const getToken = async () => {
  return await AsyncStorage.getItem('token');
};

// User ID al
export const getUserId = async () => {
  return await AsyncStorage.getItem('userId');
};

// Çıkış yap
export const logout = async () => {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('userId');
};

// Profil getir
export const getMechanicProfile = async () => {
  const response = await api.get('/mechanic/me');
  return response.data;
};

// Profil güncelle
export const updateMechanicProfile = async (data: Partial<MechanicProfile>) => {
  const response = await api.put('/mechanic/me', data);
  return response.data;
}; 