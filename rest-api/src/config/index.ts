import dotenv from 'dotenv';

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// MongoDB connection string (env override, fallback to localhost)
export const MONGODB_URI: string = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rektefe';

// Railway MongoDB için optimize edilmiş ayarlar
export const MONGODB_OPTIONS = {
  serverSelectionTimeoutMS: 15000, // Railway için daha uzun timeout
  connectTimeoutMS: 15000,
  socketTimeoutMS: 60000,
  maxPoolSize: 10, // Railway limitlerine uygun
  minPoolSize: 2,  // Minimum connection pool
  maxIdleTimeMS: 30000,
  bufferCommands: false,
  retryWrites: true,
  w: 'majority' as const,
  // Railway MongoDB için TLS ayarları
  tls: process.env.NODE_ENV === 'production' ? true : false,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
  // Railway için özel ayarlar
  authSource: 'admin',
  retryReads: true,
  heartbeatFrequencyMS: 10000,
  // Railway için connection retry ayarları
  maxConnecting: 2,
  // Railway için daha agresif retry (desteklenen seçenekler)
  // retryDelayMS ve maxRetryDelayMS MongoDB driver tarafından desteklenmiyor
} as const;

// Server port
export const PORT: number = Number(process.env.PORT) || 3000;

// JWT secrets - Railway için güvenli
export const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-refresh-secret-key-for-development-only';

// JWT secret kontrolü
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}

// CORS origin - Security fix: No wildcard in production
// Always use environment variable in production
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://rektefe.com,https://app.rektefe.com'
    : 'http://localhost:3000,http://192.168.1.36:3000,http://192.168.1.36:8081,http://192.168.1.36:8082,http://192.168.1.36:8083,http://192.168.1.36:8084,http://localhost:8081,http://localhost:8082,http://localhost:8083,http://localhost:8084');
