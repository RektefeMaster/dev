import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { VehicleStatusRecordModel } from '../models/HomeRecords';

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

    const vehicleStatusDoc = await VehicleStatusRecordModel.findOne({ userId: req.params.userId })
      .sort({ lastCheck: 'desc' })
      .exec();

    if (!vehicleStatusDoc) {
      return res.status(404).json({
        success: false,
        message: 'Araç durumu kaydı bulunamadı.',
      });
    }

    const status = vehicleStatusDoc.toObject();

    return res.json({
      success: true,
      data: status,
      message: 'Araç durumu başarıyla getirildi.',
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