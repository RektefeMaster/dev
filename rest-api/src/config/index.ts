import dotenv from 'dotenv';

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// MongoDB connection string (env override, fallback to localhost)
export const MONGODB_URI: string = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rektefe';
export const MONGODB_OPTIONS = {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  maxPoolSize: 20, // Connection pool'u artır
  minPoolSize: 5,  // Minimum connection pool
  maxIdleTimeMS: 30000, // Idle connection timeout
  bufferCommands: false,
  retryWrites: true,
  w: 'majority' as const,
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false
} as const;

// Server port
export const PORT: number = Number(process.env.PORT) || 3000;
// JWT secrets
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

// CORS origin - Security fix: No wildcard in production
// Always use environment variable in production
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://rektefe.com,https://app.rektefe.com'
    : 'http://localhost:3000,http://192.168.1.36:3000,http://192.168.1.36:8081,http://192.168.1.36:8082,http://192.168.1.36:8083,http://192.168.1.36:8084,http://localhost:8081,http://localhost:8082,http://localhost:8083,http://localhost:8084');
