import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { MaintenanceRecordModel } from '../models/HomeRecords';
import { createSampleMaintenanceRecords } from '../utils/homeFixtures';

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
    let records = await MaintenanceRecordModel.find({ userId })
      .sort({ date: -1 })
      .limit(10)
      .lean();

    if (!records.length) {
      records = createSampleMaintenanceRecords(userId);
    }

    return res.json({
      success: true,
      data: records,
      message: records.length ? 'Bakım kayıtları başarıyla getirildi.' : 'Kayıt bulunamadı.',
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