/**
 * Rektefe uygulamaları için temel konfigürasyon
 */

// API Konfigürasyonu
export const API_CONFIG = {
  BASE_URL: process.env.API_URL || 'http://localhost:3000',
  SOCKET_URL: process.env.SOCKET_URL || 'http://localhost:3000',
  TIMEOUT: 60000,
};

// Uygulama Konfigürasyonu
export const APP_CONFIG = {
  NAME: 'Rektefe',
  VERSION: '1.0.0',
};

// Navigasyon Konfigürasyonu
export const NAVIGATION_CONFIG = {
  HEADER_HEIGHT: 56,
  TAB_BAR_HEIGHT: 68,
  DRAWER_WIDTH: '80%',
};

// Depolama Konfigürasyonu
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_ID: 'user_id',
  USER_DATA: 'user_data',
  THEME: 'app_theme',
};

// Hata Mesajları
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Ağ bağlantısı hatası. Lütfen internet bağlantınızı kontrol edin.',
  AUTH_ERROR: 'Kimlik doğrulama hatası. Lütfen tekrar giriş yapın.',
  SERVER_ERROR: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
  UNKNOWN_ERROR: 'Bilinmeyen bir hata oluştu. Lütfen tekrar deneyin.',
};

// Başarı Mesajları
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Başarıyla giriş yapıldı.',
  REGISTER_SUCCESS: 'Hesap başarıyla oluşturuldu.',
  UPDATE_SUCCESS: 'Bilgiler başarıyla güncellendi.',
  SAVE_SUCCESS: 'Başarıyla kaydedildi.',
}; 