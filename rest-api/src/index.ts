import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// .env dosyasını yükle
dotenv.config();

// API anahtarlarını kontrol et
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Mevcut' : 'Eksik');
console.log('REKAI_API_KEY:', process.env.REKAI_API_KEY ? 'Mevcut' : 'Eksik');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI!)
  .then(() => console.log('MongoDB bağlantısı başarılı!'))
  .catch(err => console.error('MongoDB bağlantı hatası:', err));

// Basit test route'u
app.get('/', (req, res) => {
  res.send('API Çalışıyor!');
});

// Auth route'u ekle
import authRoutes from './routes/auth';
import garagesRoutes from './routes/garages';
import postsRoutes from './routes/posts';
import commentsRoutes from './routes/comments';
import maintenanceRoutes from './routes/maintenance';
import insuranceRoutes from './routes/insurance';
import vehicleStatusRoutes from './routes/vehicleStatus';
import tireStatusRoutes from './routes/tireStatus';
import rekaiRoutes from './routes/rekai';
import userRoutes from './routes/user';
const uploadRoute = require('./routes/upload');
app.use('/api', authRoutes);
app.use('/api', garagesRoutes);
app.use('/api', userRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/vehicle-status', vehicleStatusRoutes);
app.use('/api/tire-status', tireStatusRoutes);
app.use('/api', rekaiRoutes);
app.use('/api', uploadRoute);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
