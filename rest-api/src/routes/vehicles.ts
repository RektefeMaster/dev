import express, { Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import mongoose from 'mongoose';

const router = express.Router();

// GET /api/vehicles (giriş yapan kullanıcının araçları)
router.get('/', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
    }
    const vehicles = await Vehicle.find({ userId });
    res.json(vehicles);
  } catch (error) {
    console.error('Araçlar getirilirken hata:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST /api/vehicles
router.post('/', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
    }
    const vehicle = new Vehicle({
      ...req.body,
      userId
    });
    const savedVehicle = await vehicle.save();
    res.status(201).json(savedVehicle);
  } catch (error) {
    console.error('Araç eklenirken hata:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PUT /api/vehicles/:id/favorite
router.put('/:id/favorite', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
    }

    const vehicleId = new mongoose.Types.ObjectId(req.params.id);
    const objectUserId = new mongoose.Types.ObjectId(userId);

    // Aracın var olduğunu kontrol et
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Araç bulunamadı' });
    }

    // Kullanıcıyı bul
    const user = await User.findById(objectUserId);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    // Favori güncelle
    let newFavorite: mongoose.Types.ObjectId | null = vehicleId;
    if (user.favoriteVehicle?.toString() === vehicleId.toString()) {
      newFavorite = null;
    }

    await User.findByIdAndUpdate(objectUserId, { favoriteVehicle: newFavorite });

    res.json({ 
      message: newFavorite ? 'Araç favorilere eklendi' : 'Araç favorilerden kaldırıldı',
      favoriteVehicle: newFavorite 
    });
  } catch (error) {
    console.error('Favori araç güncellenirken hata:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

export default router; 