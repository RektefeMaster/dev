import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Test ortamında JWT_SECRET kontrolünü atla
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
  throw new Error('JWT_SECRET environment variable is required');
}

// MongoDB connection string (env override, fallback to localhost)
export const MONGODB_URI: string = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rektefe';

// Railway MongoDB için optimize edilmiş ayarlar
export const MONGODB_OPTIONS: mongoose.ConnectOptions = {
  // Railway'den MongoDB Atlas'e bağlantı için daha uzun timeout'lar
  serverSelectionTimeoutMS: 60000, // 60 saniye - Railway network latency için
  connectTimeoutMS: 60000, // 60 saniye
  socketTimeoutMS: 90000, // 90 saniye socket timeout
  family: 4 as 4, // IPv4 kullan (Railway IPv6 sorunları olabilir)
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  bufferCommands: true,
  retryWrites: true,
  w: 'majority',
  // Railway için özel ayarlar
  retryReads: true,
  heartbeatFrequencyMS: 10000,
  // NOT: mongodb+srv:// kullandığımızda SRV ayarları yok
  // srvMaxHosts ve srvServiceName sadece normal mongodb:// için kullanılır
  // mongodb+srv:// kullanıldığında otomatik TLS gereklidir
  // TLS ayarlarını sadece production'da force et
  ...(process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI?.includes('mongodb+srv://') ? {
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
  } : {})
};

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
