import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { MaintenanceRecordModel, InsurancePolicyModel, TireStatusRecordModel } from '../models/HomeRecords';
import {
  createSampleMaintenanceRecords,
  createSampleInsurancePolicy,
  createSampleTireStatus,
  getSampleCampaigns,
  getSampleAds,
} from '../utils/homeFixtures';
import { Vehicle } from '../models/Vehicle';
import { OdometerService, EstimateResult } from '../services/odometer.service';
import { VehicleStatusService } from '../services/vehicleStatus.service';
import { createErrorResponse, ErrorCode } from '../../../shared/types/apiResponse';
import { logger } from '../utils/monitoring';
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
    const tenantId = req.tenantId || (req.headers['x-tenant-id'] as string) || 'default';

    const maintenanceDocs = await MaintenanceRecordModel.find({ userId })
      .sort({ date: -1 })
      .limit(10)
      .lean();

    const insuranceDoc = await InsurancePolicyModel.findOne({ userId })
      .sort({ endDate: -1 })
      .lean();

    const tireStatusDoc = await TireStatusRecordModel.findOne({ userId })
      .sort({ lastCheck: -1 })
      .lean();

    let odometerEstimate: any = null;
    let odometerEstimateResult: EstimateResult | null = null;
    const primaryVehicle = await Vehicle.findOne({ userId }).sort({ isFavorite: -1, createdAt: -1 }).lean();
    if (primaryVehicle?._id) {
      try {
        const estimate = await OdometerService.getEstimate({
          tenantId,
          vehicleId: primaryVehicle._id.toString(),
          featureFlags: req.featureFlags,
        });
        odometerEstimateResult = estimate;
        odometerEstimate = {
          vehicleId: estimate.vehicleId,
          estimateKm: estimate.estimateKm,
          displayKm: Math.round(estimate.estimateKm),
          lastTrueKm: estimate.lastTrueKm,
          lastTrueTsUtc: estimate.lastTrueTsUtc,
          sinceDays: estimate.sinceDays,
          rateKmPerDay: estimate.rateKmPerDay,
          confidence: estimate.confidence,
          isApproximate: estimate.isApproximate,
          seriesId: estimate.sourceSeriesId,
        };
      } catch (estimateError) {
        const errorResponse = createErrorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          'Kilometre tahmini alınırken hata oluştu.',
          process.env.NODE_ENV === 'development' ? { estimateError } : null,
          req.headers['x-request-id'] as string
        );
        logger.warn('Home overview odometer estimate error', estimateError);
        odometerEstimate = {
          error: errorResponse.error,
        };
      }
    }

    const vehicleStatus =
      primaryVehicle?._id
        ? await VehicleStatusService.getStatusForUser({
            userId,
            tenantId,
            vehicle: primaryVehicle as any,
            odometerEstimate: odometerEstimateResult ?? undefined,
          })
        : null;

    const maintenanceRecords =
      maintenanceDocs && maintenanceDocs.length > 0
        ? maintenanceDocs
        : createSampleMaintenanceRecords(userId);
    const insurancePolicy = insuranceDoc ?? createSampleInsurancePolicy(userId);
    const tireStatus = tireStatusDoc ?? createSampleTireStatus(userId);
    const campaigns = getSampleCampaigns();
    const ads = getSampleAds();

    return res.json({
      success: true,
      data: {
        maintenanceRecords,
        insurancePolicy,
        vehicleStatus,
        tireStatus,
        campaigns,
        ads,
        odometerEstimate,
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

