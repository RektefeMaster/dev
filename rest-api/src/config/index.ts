import dotenv from 'dotenv';

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// MongoDB connection string (env override, fallback to localhost)
export const MONGODB_URI: string = process.env.MONGODB_URI || 'mongodb+srv://rektefekadnur09:rektefekadnur09@cluster0.agf6m9t.mongodb.net/rektefe?retryWrites=true&w=majority&appName=Cluster0&tls=true&tlsAllowInvalidCertificates=true';
export const MONGODB_OPTIONS = {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  maxPoolSize: 10,
  bufferCommands: false,
  retryWrites: true,
  w: 'majority'
};

// Server port
export const PORT: number = Number(process.env.PORT) || 3000;
export const JWT_SECRET = process.env.JWT_SECRET;

// CORS origin - Security fix: No wildcard in production
export const CORS_ORIGIN = process.env.NODE_ENV === 'production' 
  ? process.env.CORS_ORIGIN || 'https://rektefe.com,https://app.rektefe.com'
  : 'http://localhost:3000,http://192.168.1.36:3000,http://192.168.1.36:8081,http://192.168.1.36:8082,http://192.168.1.36:8083,http://192.168.1.36:8084,http://localhost:8081,http://localhost:8082,http://localhost:8083,http://localhost:8084';
