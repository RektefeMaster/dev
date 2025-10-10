import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/optimizedAuth';

const router = Router();

const insuranceSchema = new mongoose.Schema({
  userId: String,
  company: String,
  type: String,
  startDate: String,
  endDate: String,
  policyNumber: String,
});

const Insurance = mongoose.models.Insurance || mongoose.model('Insurance', insuranceSchema);

// Kullanıcıya ait sigorta bilgisini getir
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const info = await (Insurance as any).findOne({ userId: req.params.userId });
    if (!info) {
      return res.status(200).json(null);
    }
    res.json(info);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router; 