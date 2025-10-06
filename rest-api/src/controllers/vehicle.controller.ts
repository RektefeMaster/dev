import { Request, Response } from 'express';
import { VehicleService } from '../services/vehicle.service';
import { ResponseHandler } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../types/express';

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
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const vehicles = await VehicleService.getUserVehicles(userId);
    return ResponseHandler.success(res, vehicles, 'Araçlar başarıyla getirildi');
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
    return ResponseHandler.success(res, vehicle, 'Araç başarıyla getirildi');
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
