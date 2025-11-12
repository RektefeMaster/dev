import { Request, Response } from 'express';
import { VehicleService } from '../services/vehicle.service';
import { ResponseHandler } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../types/express';
import { OdometerService } from '../services/odometer.service';

export class VehicleController {
  /**
   * Yeni araç oluştur
   */
  static createVehicle = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const vehicle = await VehicleService.createVehicle(req.body, userId);
    return ResponseHandler.created(res, vehicle, 'Araç başarıyla oluşturuldu');
  });

  /**
   * Kullanıcının araçlarını getir
   */
  static getUserVehicles = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    console.log('🔍 DEBUG: getUserVehicles - userId:', userId);
    console.log('🔍 DEBUG: getUserVehicles - req.user:', req.user);
    
    if (!userId) {
      console.log('🔍 DEBUG: getUserVehicles - No userId found');
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const vehicles = await VehicleService.getUserVehicles(userId);
    const tenantId = req.tenantId || (req.headers['x-tenant-id'] as string) || 'default';
    const vehiclesWithOdometer = await Promise.all(
      vehicles.map(async (vehicle: any) => {
        try {
          const estimate = await OdometerService.getEstimate({
            tenantId,
            vehicleId: vehicle._id.toString(),
            featureFlags: req.featureFlags,
          });
          return {
            ...vehicle,
            odometerEstimate: {
              estimateKm: estimate.estimateKm,
              displayKm: Math.round(estimate.estimateKm),
              lastTrueKm: estimate.lastTrueKm,
              lastTrueTsUtc: estimate.lastTrueTsUtc,
              sinceDays: estimate.sinceDays,
              rateKmPerDay: estimate.rateKmPerDay,
              confidence: estimate.confidence,
              isApproximate: estimate.isApproximate,
              seriesId: estimate.sourceSeriesId,
              status: estimate.status,
              warnings: estimate.warnings,
            },
          };
        } catch (error) {
          return {
            ...vehicle,
            odometerEstimate: null,
          };
        }
      })
    );
    console.log('🔍 DEBUG: getUserVehicles - Found vehicles:', vehicles.length);
    console.log('🔍 DEBUG: getUserVehicles - Vehicles:', vehiclesWithOdometer);
    return ResponseHandler.success(res, vehiclesWithOdometer, 'Araçlar başarıyla getirildi');
  });

  /**
   * Belirli bir aracı getir
   */
  static getVehicleById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const { id } = req.params;
    const vehicle = await VehicleService.getVehicleById(id, userId);
    const tenantId = req.tenantId || (req.headers['x-tenant-id'] as string) || 'default';
    let odometerEstimate = null;
    try {
      const estimate = await OdometerService.getEstimate({
        tenantId,
        vehicleId: vehicle._id.toString(),
        featureFlags: req.featureFlags,
      });
      odometerEstimate = {
        estimateKm: estimate.estimateKm,
        displayKm: Math.round(estimate.estimateKm),
        lastTrueKm: estimate.lastTrueKm,
        lastTrueTsUtc: estimate.lastTrueTsUtc,
        sinceDays: estimate.sinceDays,
        rateKmPerDay: estimate.rateKmPerDay,
        confidence: estimate.confidence,
        isApproximate: estimate.isApproximate,
        seriesId: estimate.sourceSeriesId,
        status: estimate.status,
        warnings: estimate.warnings,
      };
    } catch (error) {
      odometerEstimate = null;
    }
    const vehicleWithEstimate = (vehicle as any).toObject
      ? { ...(vehicle as any).toObject(), odometerEstimate }
      : { ...vehicle, odometerEstimate };
    return ResponseHandler.success(res, vehicleWithEstimate, 'Araç başarıyla getirildi');
  });

  /**
   * Aracı güncelle
   */
  static updateVehicle = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const { id } = req.params;
    const vehicle = await VehicleService.updateVehicle(id, userId, req.body);
    return ResponseHandler.updated(res, vehicle, 'Araç başarıyla güncellendi');
  });

  /**
   * Aracı sil
   */
  static deleteVehicle = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const { id } = req.params;
    await VehicleService.deleteVehicle(id, userId);
    return ResponseHandler.deleted(res, 'Araç başarıyla silindi');
  });

  /**
   * Tüm araçları getir (admin için)
   */
  static getAllVehicles = asyncHandler(async (req: Request, res: Response) => {
    const vehicles = await VehicleService.getAllVehicles();
    return ResponseHandler.success(res, vehicles, 'Tüm araçlar başarıyla getirildi');
  });

  /**
   * Şoför araçlarını getir
   */
  static getDriverVehicles = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const vehicles = await VehicleService.getUserVehicles(userId);
    return ResponseHandler.success(res, vehicles, 'Şoför araçları başarıyla getirildi');
  });

  /**
   * Araç arama
   */
  static searchVehicles = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { q } = req.query;
    const userId = req.user?.userId;

    if (!q || typeof q !== 'string') {
      return ResponseHandler.badRequest(res, 'Arama terimi gerekli');
    }

    const vehicles = await VehicleService.searchVehicles(q, userId);
    return ResponseHandler.success(res, vehicles, 'Arama sonuçları başarıyla getirildi');
  });

  /**
   * Servis edilmiş araçları getir
   */
  static getServicedVehicles = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const vehicles = await VehicleService.getServicedVehicles(userId);
    return ResponseHandler.success(res, vehicles, 'Servis edilmiş araçlar başarıyla getirildi');
  });

  /**
   * Aracı favorile/favoriden çıkar
   */
  static toggleFavorite = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const { id } = req.params;
    const vehicle = await VehicleService.toggleFavorite(id, userId);
    return ResponseHandler.success(res, vehicle, 'Favori durumu başarıyla güncellendi');
  });
}
