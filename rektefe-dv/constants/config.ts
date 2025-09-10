/**
 * Rektefe DV uygulaması için temel konfigürasyon
 */

// API Konfigürasyonu - Env/Expo fallback + Localhost
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000/api',
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_BASE_URL || process.env.SOCKET_BASE_URL || 'http://localhost:3000',
  TIMEOUT: 60000,
};

// Doğrudan export edilen API URL'leri
export const API_URL = API_CONFIG.BASE_URL;
export const SOCKET_URL = API_CONFIG.SOCKET_URL;

// Uygulama Konfigürasyonu
export const APP_CONFIG = {
  NAME: 'Rektefe DV',
  VERSION: '1.0.0',
  DESCRIPTION: 'Şoförler için Rektefe uygulaması',
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
  ONBOARDING_COMPLETED: 'onboarding_completed',
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
  APPOINTMENT_BOOKED: 'Randevu başarıyla oluşturuldu.',
  PAYMENT_SUCCESS: 'Ödeme başarıyla tamamlandı.',
};

// Şoför Özel Konfigürasyonu
export const DRIVER_CONFIG = {
  MIN_APPOINTMENTS_PER_DAY: 5,
  MAX_APPOINTMENTS_PER_DAY: 20,
  RATING_THRESHOLD: 4.0,
  RESPONSE_TIME_LIMIT: 15, // dakika
};
