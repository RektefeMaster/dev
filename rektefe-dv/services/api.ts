import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../constants/config';

if (!API_CONFIG.BASE_URL) {
  console.error('API_URL tanımsız! .env dosyasını ve API_URL değerini kontrol et.');
  throw new Error('API_URL tanımsız!');
}

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
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
        console.log('API İsteği - Token eklendi:', token.substring(0, 20) + '...');
      } else {
        console.log('API İsteği - Token bulunamadı');
      }
      return config;
    } catch (error) {
      console.error('API İsteği - Token hatası:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error('API İsteği - Interceptor hatası:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
          console.log('API Yanıtı - Refresh token bulunamadı');
          throw new Error('Refresh token bulunamadı');
        }

        console.log('API Yanıtı - Token yenileme deneniyor');
        const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh-token`, {
          refreshToken
        });

        if (response.data.token) {
          await AsyncStorage.setItem('token', response.data.token);
          originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
          console.log('API Yanıtı - Token yenilendi');
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('API Yanıtı - Token yenileme hatası:', refreshError);
        await AsyncStorage.multiRemove(['token', 'refreshToken', 'userId']);
        throw refreshError;
      }
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
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Kullanıcı bilgileri getirme hatası:', error);
    throw error;
  }
};

export { api }; 