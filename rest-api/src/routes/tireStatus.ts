import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { TireStatusRecordModel } from '../models/HomeRecords';
import { createSampleTireStatus } from '../utils/homeFixtures';

const router = Router();

// Kullanıcıya ait lastik durumu getir
router.get('/:userId', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId || req.user.userId !== req.params.userId) {
      return res.status(403).json({
        success: false,
        message: 'Lastik durumunu görüntülemek için yetkiniz yok.',
      });
    }

    let status = await TireStatusRecordModel.findOne({ userId: req.params.userId })
      .sort({ lastCheck: -1 })
      .lean()
      .exec();

    if (!status) {
      status = createSampleTireStatus(req.params.userId);
    }

    return res.json({
      success: true,
      data: status,
      message: status ? 'Lastik durumu başarıyla getirildi.' : 'Lastik durumu kaydı bulunamadı.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Lastik durumu getirilirken bir hata oluştu.',
      error: error.message,
    });
  }
});

export default router;
