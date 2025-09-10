import dotenv from 'dotenv';

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// MongoDB connection string (env override, fallback to localhost)
export const MONGODB_URI: string = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rektefe';

// Server port
export const PORT: number = Number(process.env.PORT) || 3000;
export const JWT_SECRET = process.env.JWT_SECRET;

// CORS origin (optional). Use specific origin when credentials are enabled
export const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
