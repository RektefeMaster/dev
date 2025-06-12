import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';

console.log('API URL:', API_URL); // API URL'ini kontrol et

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 saniye
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['token', 'userId']);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Profil fotoğrafı güncelleme (sadece backend'e yükleme)
export const updateProfilePhoto = async (uri: string) => {
  try {
    const formData = new FormData();
    formData.append('image', {
      uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);
    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const imageUrl = response.data.url;
    const res = await api.post('/users/profile-photo', { photoUrl: imageUrl });
    return res.data;
  } catch (error) {
    console.error('Profil fotoğrafı güncelleme hatası:', error);
    throw error;
  }
};

// Kapak fotoğrafı güncelleme (sadece backend'e yükleme)
export const updateCoverPhoto = async (uri: string) => {
  try {
    console.log('updateCoverPhoto başladı:', uri);
    const formData = new FormData();
    formData.append('image', {
      uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);
    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    console.log('Upload yanıtı:', response.data);
    const imageUrl = response.data.url;
    console.log('Cloudinary URL:', imageUrl);
    const res = await api.post('/users/cover-photo', { photoUrl: imageUrl });
    console.log('Kapak fotoğrafı güncelleme yanıtı:', res.data);
    return res.data;
  } catch (error) {
    console.error('Kapak fotoğrafı güncelleme hatası:', error);
    throw error;
  }
};

// Kullanıcı bilgilerini getirme
export const getUserProfile = async (userId: string) => {
  try {
    const response = await api.get(`/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Kullanıcı bilgileri getirme hatası:', error);
    throw error;
  }
};

export { api }; 