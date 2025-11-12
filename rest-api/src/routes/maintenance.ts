import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { MaintenanceRecordModel } from '../models/HomeRecords';

const router = Router();

// Kullanıcıya ait bakım kayıtlarını getir
router.get('/', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı.',
      });
    }

    const userId = req.user.userId;
    const records = await MaintenanceRecordModel.find({ userId })
      .sort({ date: 'desc' })
      .limit(10)
      .exec();

    const plainRecords = records.map((record) => record.toObject());
    const message = plainRecords.length
      ? 'Bakım kayıtları başarıyla getirildi.'
      : 'Bakım kaydı bulunamadı.';

    return res.json({
      success: true,
      data: plainRecords,
      message,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Bakım kayıtları getirilirken bir hata oluştu.',
      error: error.message,
    });
  }
});

export default router;