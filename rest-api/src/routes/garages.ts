import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

// Araç şeması
const vehicleSchema = new mongoose.Schema({
  userId: String,
  brand: String,
  model: String,
  package: String,
  year: String,
  fuelType: String,
  mileage: String,
  plate: String,
  isFavorite: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', vehicleSchema);

// Tüm araçları getir
router.get('/vehicles/:userId', async (req: Request, res: Response) => {
  try {
    const vehicles = await Vehicle.find({ userId: req.params.userId });
    res.json(vehicles);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Yeni araç ekle
router.post('/vehicles', async (req: Request, res: Response) => {
  const vehicle = new Vehicle({
    userId: req.body.userId,
    brand: req.body.brand,
    model: req.body.model,
    package: req.body.package,
    year: req.body.year,
    fuelType: req.body.fuelType,
    mileage: req.body.mileage,
    plate: req.body.plate
  });

  try {
    const newVehicle = await vehicle.save();
    res.status(201).json(newVehicle);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Araç sil
router.delete('/vehicles/:id', async (req: Request, res: Response) => {
  try {
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Araç başarıyla silindi' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Favori aracı güncelle
router.patch('/vehicles/:id/favorite', async (req: Request, res: Response) => {
  try {
    if (req.body.isFavorite === false) {
      // Sadece favoriliği kaldır
      const updated = await Vehicle.findByIdAndUpdate(req.params.id, { isFavorite: false }, { new: true });
      return res.json(updated);
    }
    // Önce kullanıcının tüm araçlarındaki favori bayrağını kaldır
    await Vehicle.updateMany({ userId: req.body.userId }, { isFavorite: false });
    // Sonra seçilen aracı favori yap
    const updated = await Vehicle.findByIdAndUpdate(req.params.id, { isFavorite: true }, { new: true });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router; 