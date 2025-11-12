import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { VehicleStatusRecordModel } from '../models/HomeRecords';
import { createSampleVehicleStatus } from '../utils/homeFixtures';

const router = Router();

// Kullanıcıya ait araç durumunu getir
router.get('/:userId', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId || req.user.userId !== req.params.userId) {
      return res.status(403).json({
        success: false,
        message: 'Araç durumunu görüntülemek için yetkiniz yok.',
      });
    }

    let status = await VehicleStatusRecordModel.findOne({ userId: req.params.userId })
      .sort({ lastCheck: -1 })
      .lean();

    if (!status) {
      status = createSampleVehicleStatus(req.params.userId);
    }

    return res.json({
      success: true,
      data: status,
      message: status ? 'Araç durumu başarıyla getirildi.' : 'Araç durumu kaydı bulunamadı.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Araç durumu getirilirken bir hata oluştu.',
      error: error.message,
    });
  }
});

export default router;