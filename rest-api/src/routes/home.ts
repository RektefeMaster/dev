import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import {
  MaintenanceRecordModel,
  InsurancePolicyModel,
  VehicleStatusRecordModel,
  TireStatusRecordModel,
} from '../models/HomeRecords';
const router = Router();

router.get('/overview', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı.',
      });
    }

    const userId = req.user.userId;

    const maintenanceDocs = await MaintenanceRecordModel.find({ userId })
      .sort({ date: -1 })
      .limit(10)
      .lean()
      .exec();

    const insuranceDoc = await InsurancePolicyModel.findOne({ userId })
      .sort({ endDate: -1 })
      .lean()
      .exec();

    const vehicleStatusDoc = await VehicleStatusRecordModel.findOne({ userId })
      .sort({ lastCheck: -1 })
      .lean()
      .exec();

    const tireStatusDoc = await TireStatusRecordModel.findOne({ userId })
      .sort({ lastCheck: -1 })
      .lean()
      .exec();

    const maintenanceRecords = maintenanceDocs ?? [];
    const insurancePolicy = insuranceDoc ?? null;
    const vehicleStatus = vehicleStatusDoc ?? null;
    const tireStatus = tireStatusDoc ?? null;

    return res.json({
      success: true,
      data: {
        maintenanceRecords,
        insurancePolicy,
        vehicleStatus,
        tireStatus,
        campaigns: [],
        ads: [],
      },
      message: 'Sürücü ana sayfa verileri başarıyla getirildi.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Ana sayfa verileri getirilirken bir hata oluştu.',
      error: error.message,
    });
  }
});

export default router;

