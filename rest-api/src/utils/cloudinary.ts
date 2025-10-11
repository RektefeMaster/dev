import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// Cloudinary credentials kontrolü
if (!cloudName || !apiKey || !apiSecret) {
  console.error('⚠️ Cloudinary credentials eksik!');
  console.error('CLOUDINARY_CLOUD_NAME:', cloudName ? 'Mevcut' : 'EKSİK');
  console.error('CLOUDINARY_API_KEY:', apiKey ? 'Mevcut' : 'EKSİK');
  console.error('CLOUDINARY_API_SECRET:', apiSecret ? 'Mevcut' : 'EKSİK');
} else {
  console.log('✅ Cloudinary credentials yüklendi');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret
});

// Cloudinary kullanılabilirlik kontrolü
export const isCloudinaryConfigured = () => {
  return !!(cloudName && apiKey && apiSecret);
};

export default cloudinary; 