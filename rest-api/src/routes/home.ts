import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import {
  MaintenanceRecordModel,
  InsurancePolicyModel,
  VehicleStatusRecordModel,
  TireStatusRecordModel,
} from '../models/HomeRecords';
import {
  createSampleInsurancePolicy,
  createSampleMaintenanceRecords,
  createSampleTireStatus,
  createSampleVehicleStatus,
  getSampleAds,
  getSampleCampaigns,
} from '../utils/homeFixtures';

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

    const [maintenanceDocs, insuranceDoc, vehicleStatusDoc, tireStatusDoc] = await Promise.all([
      MaintenanceRecordModel.find({ userId }).sort({ date: -1 }).limit(10).exec(),
      InsurancePolicyModel.findOne({ userId }).sort({ endDate: -1 }).exec(),
      VehicleStatusRecordModel.findOne({ userId }).sort({ lastCheck: -1 }).exec(),
      TireStatusRecordModel.findOne({ userId }).sort({ lastCheck: -1 }).exec(),
    ]);

    const maintenance = maintenanceDocs?.map((doc) => doc.toObject()) ?? [];
    const insurance = insuranceDoc ? insuranceDoc.toObject() : null;
    const vehicleStatus = vehicleStatusDoc ? vehicleStatusDoc.toObject() : null;
    const tireStatus = tireStatusDoc ? tireStatusDoc.toObject() : null;

    const maintenanceRecords =
      maintenance && maintenance.length ? maintenance : createSampleMaintenanceRecords(userId);
    const insurancePolicy = insurance || createSampleInsurancePolicy(userId);
    const vehicleStatusRecord = vehicleStatus || createSampleVehicleStatus(userId);
    const tireStatusRecord = tireStatus || createSampleTireStatus(userId);
    const campaigns = getSampleCampaigns();
    const ads = getSampleAds();

    return res.json({
      success: true,
      data: {
        maintenanceRecords,
        insurancePolicy,
        vehicleStatus: vehicleStatusRecord,
        tireStatus: tireStatusRecord,
        campaigns,
        ads,
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

