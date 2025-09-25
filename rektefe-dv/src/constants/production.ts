/**
 * Production Environment Configuration for Rektefe-US
 */

export const PRODUCTION_CONFIG = {
  API_BASE_URL: 'https://api.rektefe.com/api',
  SOCKET_BASE_URL: 'https://api.rektefe.com',
  ENV: 'production' as const,
  APP_NAME: 'Rektefe Usta',
  APP_VERSION: '1.0.0',
  TIMEOUT: 60000,
  DEBUG: false,
};

export const API_CONFIG = {
  BASE_URL: PRODUCTION_CONFIG.API_BASE_URL,
  SOCKET_URL: PRODUCTION_CONFIG.SOCKET_BASE_URL,
  TIMEOUT: PRODUCTION_CONFIG.TIMEOUT,
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_ID: 'userId',
  USER_TYPE: 'userType',
  REFRESH_TOKEN: 'refreshToken',
  NOTIFICATION_TOKEN: 'notificationToken',
  THEME: 'theme',
  LANGUAGE: 'language',
  ONBOARDING_COMPLETED: 'onboardingCompleted',
  LAST_ACTIVE_CHAT: 'lastActiveChat',
};

export const API_ENDPOINTS = {
  AUTH: 'auth',
  USERS: 'users',
  MECHANICS: 'mechanics',
  NOTIFICATIONS: 'notifications',
  LOCATION: 'location',
  APPOINTMENTS: 'appointments',
  MESSAGES: 'message',
  RATINGS: 'ratings',
  CUSTOMERS: 'customers',
  EARNINGS: 'earnings',
};