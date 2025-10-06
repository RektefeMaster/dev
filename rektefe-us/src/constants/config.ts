/**
 * Rektefe US uygulaması için temel konfigürasyon
 */

// API Konfigürasyonu - Railway URL ile güncellendi (Hardcoded)
export const API_CONFIG = {
  BASE_URL: 'https://dev-production-8a3d.up.railway.app',
  SOCKET_URL: 'https://dev-production-8a3d.up.railway.app',
  TIMEOUT: 120000, // 2 dakika (60 saniye yeterli değildi)
};

// Debug logs removed for cleaner output

// Doğrudan export edilen API URL'leri
export const API_URL = API_CONFIG.BASE_URL;
export const SOCKET_URL = API_CONFIG.SOCKET_URL;

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
  AUTH_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_ID: 'userId',
  USER_DATA: 'userData',
  THEME: 'app_theme',
  ONBOARDING_COMPLETED: 'onboardingCompleted',
  ERROR_LOGS: 'error_logs',
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
