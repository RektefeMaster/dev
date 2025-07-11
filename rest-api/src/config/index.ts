import dotenv from 'dotenv';

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// MONGODB_URI için varsayılan değer ekleyelim
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe';

// PORT için varsayılan değer ekleyelim
export const PORT = process.env.PORT || 3000;
export const JWT_SECRET = process.env.JWT_SECRET; 