import dotenv from 'dotenv';

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// MONGODB_URI için varsayılan değer ekleyelim
// MongoDB Atlas IP whitelist sorunu var, local MongoDB kullan
export const MONGODB_URI = 'mongodb://127.0.0.1:27017/rektefe';

// PORT için varsayılan değer ekleyelim
export const PORT = process.env.PORT || 3000;
export const JWT_SECRET = process.env.JWT_SECRET; 