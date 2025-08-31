/**
 * Rektefe US uygulaması için temel konfigürasyon
 */

// API Konfigürasyonu - Backend port'unu kontrol et
export const API_CONFIG = {
  BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000/api',
  TIMEOUT: 60000,
};

// Doğrudan export edilen API URL'leri
export const API_URL = API_CONFIG.BASE_URL;

// Uygulama Konfigürasyonu
export const APP_CONFIG = {
  NAME: 'Rektefe US',
  VERSION: '1.0.0',
  DESCRIPTION: 'Ustalar için Rektefe uygulaması',
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
  ONBOARDING_COMPLETED: 'onboardingCompleted',
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
  APPOINTMENT_ACCEPTED: 'Randevu kabul edildi.',
  APPOINTMENT_REJECTED: 'Randevu reddedildi.',
};

// Usta Özel Konfigürasyonu
export const MECHANIC_CONFIG = {
  MIN_EXPERIENCE_YEARS: 1,
  MAX_SERVICES_PER_DAY: 10,
  RATING_THRESHOLD: 4.0,
  RESPONSE_TIME_LIMIT: 30, // dakika
};
