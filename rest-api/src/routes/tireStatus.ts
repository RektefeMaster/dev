import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth';

const router = Router();

const tireStatusSchema = new mongoose.Schema({
  userId: String,
  status: String, // İyi, Orta, Değişmeli vb.
  lastCheck: String,
  issues: [String],
});

const TireStatus = mongoose.models.TireStatus || mongoose.model('TireStatus', tireStatusSchema);

// Kullanıcıya ait lastik servisi durumunu getir
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const status = await (TireStatus as any).findOne({ userId: req.params.userId });
    if (!status) {
      return res.status(200).json(null);
    }
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router; 