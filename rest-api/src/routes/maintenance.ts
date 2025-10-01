import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth';

const router = Router();

const maintenanceSchema = new mongoose.Schema({
  userId: String,
  date: String,
  mileage: String,
  type: String,
  details: [String],
  serviceName: String,
});

const Maintenance = mongoose.models.Maintenance || mongoose.model('Maintenance', maintenanceSchema);

// Kullanıcıya ait bakım kayıtlarını getir
router.get('/', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Kullanıcı doğrulanamadı.' });
    }
    const userId = req.user.userId;
    const records = await (Maintenance as any).find({ userId });
    if (!records || records.length === 0) {
      return res.status(200).json([]);
    }
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router; 