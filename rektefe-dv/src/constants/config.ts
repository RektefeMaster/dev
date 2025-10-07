/**
 * Rektefe DV uygulaması için temel konfigürasyon
 */

// API Konfigürasyonu - Railway URL ile güncellendi (Hardcoded)
export const API_CONFIG = {
  BASE_URL: 'https://dev-production-8a3d.up.railway.app',
  SOCKET_URL: 'https://dev-production-8a3d.up.railway.app',
  TIMEOUT: 30000, // 30 saniye timeout - network gecikmeleri için
};

// Debug log for API configuration (only in development)
if (__DEV__) {
  console.log('🔍 API Config Debug:');
  console.log('EXPO_PUBLIC_API_BASE_URL:', process.env.EXPO_PUBLIC_API_BASE_URL);
  console.log('API_BASE_URL:', process.env.API_BASE_URL);
  console.log('Final BASE_URL:', API_CONFIG.BASE_URL);
  console.log('Final SOCKET_URL:', API_CONFIG.SOCKET_URL);
}

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
  AUTH_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_ID: 'userId',
  USER_DATA: 'userData',
  USER_DATA_LEGACY: 'user_data_legacy', // Legacy support
  THEME: 'app_theme',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ERROR_LOGS: 'error_logs', // Error logging
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
