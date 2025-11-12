import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { VehicleStatusService } from '../services/vehicleStatus.service';

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

    const tenantId = req.tenantId || (req.headers['x-tenant-id'] as string) || 'default';

    const status = await VehicleStatusService.getStatusForUser({
      userId: req.params.userId,
      tenantId,
    });

    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Araç durumu kaydı bulunamadı.',
      });
    }

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