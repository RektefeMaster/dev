import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { InsurancePolicyModel } from '../models/HomeRecords';
import { createSampleInsurancePolicy } from '../utils/homeFixtures';

const router = Router();

// Kullanıcıya ait sigorta bilgisini getir
router.get('/:userId', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId || req.user.userId !== req.params.userId) {
      return res.status(403).json({
        success: false,
        message: 'Sigorta bilgilerini görüntülemek için yetkiniz yok.',
      });
    }

    const insuranceDoc = await InsurancePolicyModel.findOne({ userId: req.params.userId })
      .sort({ endDate: -1 })
      .exec();

    const info = insuranceDoc
      ? insuranceDoc.toObject()
      : createSampleInsurancePolicy(req.params.userId);

    return res.json({
      success: true,
      data: info,
      message: insuranceDoc ? 'Sigorta bilgisi getirildi.' : 'Sigorta kaydı bulunamadı.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Sigorta bilgisi getirilirken bir hata oluştu.',
      error: error.message,
    });
  }
});

export default router;