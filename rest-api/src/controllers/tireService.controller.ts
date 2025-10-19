import { Request, Response } from 'express';
import { TireServiceService } from '../services/tireService.service';
import { AuthRequest } from '../types/auth';

export class TireServiceController {
  /**
   * Yeni lastik hizmet talebi oluştur
   */
  static async createRequest(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı kimliği bulunamadı'
        });
      }

      const result = await TireServiceService.createTireServiceRequest({
        userId,
        ...req.body
      });

      res.status(201).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lastik hizmet talebi oluşturulamadı'
      });
    }
  }

  /**
   * Usta için lastik işlerini getir
   */
  static async getJobsForMechanic(req: AuthRequest, res: Response) {
    try {
      const mechanicId = req.user?.userId;
      if (!mechanicId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı kimliği bulunamadı'
        });
      }

      const filters = {
        status: req.query.status as string,
        serviceType: req.query.serviceType as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };

      const result = await TireServiceService.getTireJobsForMechanic(mechanicId, filters);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lastik işleri getirilemedi'
      });
    }
  }

  /**
   * Müşteri için kendi lastik taleplerini getir
   */
  static async getMyRequests(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı kimliği bulunamadı'
        });
      }

      const filters = {
        status: req.query.status as string,
        includeCompleted: req.query.includeCompleted === 'true'
      };

      const result = await TireServiceService.getMyTireRequests(userId, filters);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lastik talepleri getirilemedi'
      });
    }
  }

  /**
   * İşi kabul et
   */
  static async acceptJob(req: AuthRequest, res: Response) {
    try {
      const mechanicId = req.user?.userId;
      if (!mechanicId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı kimliği bulunamadı'
        });
      }

      const { jobId } = req.params;

      const result = await TireServiceService.acceptJob(jobId, mechanicId);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'İş kabul edilemedi'
      });
    }
  }

  /**
   * İşi başlat
   */
  static async startJob(req: AuthRequest, res: Response) {
    try {
      const mechanicId = req.user?.userId;
      if (!mechanicId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı kimliği bulunamadı'
        });
      }

      const { jobId } = req.params;

      const result = await TireServiceService.startJob(jobId, mechanicId);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'İş başlatılamadı'
      });
    }
  }

  /**
   * İşi tamamla
   */
  static async completeJob(req: AuthRequest, res: Response) {
    try {
      const mechanicId = req.user?.userId;
      if (!mechanicId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı kimliği bulunamadı'
        });
      }

      const { jobId } = req.params;
      const completionData = req.body;

      const result = await TireServiceService.completeJob(jobId, mechanicId, completionData);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'İş tamamlanamadı'
      });
    }
  }

  /**
   * Fiyat teklifi gönder
   */
  static async sendPriceQuote(req: AuthRequest, res: Response) {
    try {
      const mechanicId = req.user?.userId;
      if (!mechanicId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı kimliği bulunamadı'
        });
      }

      const { jobId } = req.params;
      const quoteData = req.body;

      const result = await TireServiceService.sendPriceQuote(jobId, mechanicId, quoteData);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Fiyat teklifi gönderilemedi'
      });
    }
  }

  /**
   * Lastik sağlık kontrolü kaydet
   */
  static async saveTireHealthCheck(req: AuthRequest, res: Response) {
    try {
      const mechanicId = req.user?.userId;
      if (!mechanicId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı kimliği bulunamadı'
        });
      }

      const result = await TireServiceService.saveTireHealthCheck({
        mechanicId,
        ...req.body
      });

      res.status(201).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lastik sağlık kontrolü kaydedilemedi'
      });
    }
  }

  /**
   * Araç lastik geçmişini getir
   */
  static async getTireHealthHistory(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı kimliği bulunamadı'
        });
      }

      const { vehicleId } = req.params;

      const result = await TireServiceService.getTireHealthHistory(vehicleId, userId);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lastik geçmişi getirilemedi'
      });
    }
  }

  /**
   * İş durumunu getir
   */
  static async getJobStatus(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı kimliği bulunamadı'
        });
      }

      const { jobId } = req.params;

      const result = await TireServiceService.getJobStatus(jobId, userId);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'İş durumu getirilemedi'
      });
    }
  }
}

