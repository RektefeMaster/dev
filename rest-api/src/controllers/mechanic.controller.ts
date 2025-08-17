import { Request, Response } from 'express';
import { MechanicService } from '../services/mechanic.service';
import { ResponseHandler } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { requireMechanic } from '../middleware/roleAuth';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    userType: string;
  };
}

export class MechanicController {
  /**
   * Mekanik profili oluştur veya güncelle
   */
  static createOrUpdateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const mechanic = await MechanicService.createOrUpdateProfile(req.body, userId);
    return ResponseHandler.updated(res, mechanic, 'Mekanik profili başarıyla güncellendi');
  });

  /**
   * Mekanik profilini getir
   */
  static getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const mechanic = await MechanicService.getProfile(userId);
    return ResponseHandler.success(res, mechanic, 'Mekanik profili başarıyla getirildi');
  });

  /**
   * Tüm mekanikleri getir
   */
  static getAllMechanics = asyncHandler(async (req: Request, res: Response) => {
    const mechanics = await MechanicService.getAllMechanics();
    return ResponseHandler.success(res, mechanics, 'Tüm mekanikler başarıyla getirildi');
  });

  /**
   * Mekanik arama
   */
  static searchMechanics = asyncHandler(async (req: Request, res: Response) => {
    const { q, city } = req.query;

    if (!q || typeof q !== 'string') {
      return ResponseHandler.badRequest(res, 'Arama terimi gerekli');
    }

    const cityFilter = city && typeof city === 'string' ? city : undefined;
    const mechanics = await MechanicService.searchMechanics(q, cityFilter);
    return ResponseHandler.success(res, mechanics, 'Arama sonuçları başarıyla getirildi');
  });

  /**
   * Mekanik müsaitlik durumunu güncelle
   */
  static updateAvailability = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const { isAvailable } = req.body;
    if (typeof isAvailable !== 'boolean') {
      return ResponseHandler.badRequest(res, 'Müsaitlik durumu boolean olmalıdır');
    }

    const mechanic = await MechanicService.updateAvailability(userId, isAvailable);
    return ResponseHandler.updated(res, mechanic, 'Müsaitlik durumu güncellendi');
  });

  /**
   * Mekanik puanını güncelle
   */
  static updateRating = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const { rating } = req.body;
    if (typeof rating !== 'number') {
      return ResponseHandler.badRequest(res, 'Puan sayı olmalıdır');
    }

    const mechanic = await MechanicService.updateRating(userId, rating);
    return ResponseHandler.updated(res, mechanic, 'Puan güncellendi');
  });

  /**
   * Şehir bazında mekanikleri getir
   */
  static getMechanicsByCity = asyncHandler(async (req: Request, res: Response) => {
    const { city } = req.params;
    
    if (!city) {
      return ResponseHandler.badRequest(res, 'Şehir parametresi gerekli');
    }

    const mechanics = await MechanicService.getMechanicsByCity(city);
    return ResponseHandler.success(res, mechanics, 'Şehir bazında mekanikler getirildi');
  });

  /**
   * Uzmanlık alanına göre mekanikleri getir
   */
  static getMechanicsBySpecialization = asyncHandler(async (req: Request, res: Response) => {
    const { specialization } = req.params;
    
    if (!specialization) {
      return ResponseHandler.badRequest(res, 'Uzmanlık alanı parametresi gerekli');
    }

    const mechanics = await MechanicService.getMechanicsBySpecialization(specialization);
    return ResponseHandler.success(res, mechanics, 'Uzmanlık alanına göre mekanikler getirildi');
  });

  /**
   * Mekanik istatistiklerini getir
   */
  static getMechanicStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    // Bu endpoint için daha sonra istatistik servisi eklenebilir
    return ResponseHandler.success(res, { message: 'İstatistikler yakında eklenecek' }, 'İstatistikler getirildi');
  });
}
