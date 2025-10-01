import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth';

const router = Router();

const vehicleStatusSchema = new mongoose.Schema({
  userId: String,
  overallStatus: String,
  lastCheck: String,
  issues: [String],
});

const VehicleStatus = mongoose.models.VehicleStatus || mongoose.model('VehicleStatus', vehicleStatusSchema);

// Kullanıcıya ait araç durumunu getir
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const status = await (VehicleStatus as any).findOne({ userId: req.params.userId });
    if (!status) {
      return res.status(200).json(null);
    }
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router; 