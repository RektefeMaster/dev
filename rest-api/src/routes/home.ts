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
      .sort({ date: 'desc' })
      .limit(10)
      .exec();

    const insuranceDoc = await InsurancePolicyModel.findOne({ userId })
      .sort({ endDate: 'desc' })
      .exec();

    const vehicleStatusDoc = await VehicleStatusRecordModel.findOne({ userId })
      .sort({ lastCheck: 'desc' })
      .exec();

    const tireStatusDoc = await TireStatusRecordModel.findOne({ userId })
      .sort({ lastCheck: 'desc' })
      .exec();

    const maintenanceRecords = maintenanceDocs.map((doc) => doc.toObject());
    const insurancePolicy = insuranceDoc ? insuranceDoc.toObject() : null;
    const vehicleStatus = vehicleStatusDoc ? vehicleStatusDoc.toObject() : null;
    const tireStatus = tireStatusDoc ? tireStatusDoc.toObject() : null;

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

