import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

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
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const records = await Maintenance.find({ userId: req.params.userId });
    if (!records || records.length === 0) {
      return res.status(200).json([]);
    }
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router; 