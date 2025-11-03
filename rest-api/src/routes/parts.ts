import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { PartsService } from '../services/parts.service';
import { validate } from '../middleware/validate';
import Logger from '../utils/logger';
import {
  createPartSchema,
  updatePartSchema,
  searchPartsSchema,
  createReservationSchema,
  updateReservationSchema,
  negotiatePriceSchema
} from '../validators/parts.validation';

const router = Router();

// Debug: Tüm parts route'larına log ekle
router.use((req, res, next) => {
  console.log('🔍 [PARTS ROUTER] İstek alındı:', req.method, req.path, 'URL:', req.url, 'OriginalUrl:', req.originalUrl);
  console.log('🔍 [PARTS ROUTER] Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// ==================== US (Mechanic) Endpoints ====================

/**
 * POST /api/parts
 * Usta yeni parça ekler
 */
router.post('/', auth, validate(createPartSchema), async (req: Request, res: Response) => {
  try {
    console.log('🔍 [PARTS ROUTE] POST /api/parts çağrıldı - İSTEK ALINDI');
    console.log('🔍 [PARTS ROUTE] Request body:', JSON.stringify(req.body, null, 2));
    
    const mechanicId = req.user?.userId;
    console.log('🔍 [PARTS ROUTE] MechanicId:', mechanicId);
    
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı'
      });
    }

    console.log('🔍 [PARTS ROUTE] PartsService.createPart çağrılıyor...');
    const result = await PartsService.createPart({
      ...req.body,
      mechanicId
    });
    console.log('✅ [PARTS ROUTE] PartsService.createPart başarılı');

    res.status(201).json(result);
  } catch (error: any) {
    console.error('❌ [PARTS ROUTE] Hata:', error.message);
    console.error('❌ [PARTS ROUTE] Error stack:', error.stack);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Parça oluşturulamadı'
    });
  }
});

/**
 * PUT /api/parts/:id
 * Usta parça günceller
 */
router.put('/:id', auth, validate(updatePartSchema), async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı'
      });
    }

    const result = await PartsService.updatePart(
      req.params.id,
      mechanicId,
      req.body
    );

    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Parça güncellenemedi'
    });
  }
});

/**
 * GET /api/parts/mechanic
 * Usta kendi parçalarını listeler
 */
router.get('/mechanic', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı'
      });
    }

    const result = await PartsService.getMechanicParts(mechanicId);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Parçalar yüklenemedi'
    });
  }
});

/**
 * GET /api/parts/mechanic/reservations
 * Usta rezervasyonlarını listeler
 */
router.get('/mechanic/reservations', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı'
      });
    }

    const result = await PartsService.getMechanicReservations(mechanicId, req.query as any);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Rezervasyonlar yüklenemedi'
    });
  }
});

// ==================== DV (Driver) Endpoints ====================

/**
 * GET /api/parts/market
 * Market'te parça ara
 */
router.get('/market', validate(searchPartsSchema), async (req: Request, res: Response) => {
  try {
    const result = await PartsService.searchParts(req.query as any);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Arama yapılamadı'
    });
  }
});

/**
 * GET /api/parts/my-reservations
 * Kullanıcı rezervasyonlarını listele
 * NOT: Bu route /:id route'undan ÖNCE olmalı (route çakışmasını önlemek için)
 */
router.get('/my-reservations', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı'
      });
    }

    const result = await PartsService.getMyReservations(userId, req.query as any);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Rezervasyonlar yüklenemedi'
    });
  }
});

/**
 * GET /api/parts/:id
 * Parça detayını getir
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { PartsInventory } = require('../models/PartsInventory');
    
    const part = await PartsInventory.findById(req.params.id)
      .populate('mechanicId', 'name surname shopName rating ratingCount location');

    if (!part) {
      return res.status(404).json({
        success: false,
        message: 'Parça bulunamadı'
      });
    }

    // View count artır
    part.stats.views += 1;
    await part.save();

    res.json({
      success: true,
      data: part,
      message: 'Parça detayı'
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Parça yüklenemedi'
    });
  }
});

/**
 * POST /api/parts/reserve
 * Rezervasyon oluştur
 */
router.post('/reserve', auth, validate(createReservationSchema), async (req: Request, res: Response) => {
  try {
    const buyerId = req.user?.userId;
    if (!buyerId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı'
      });
    }

    const result = await PartsService.createReservation({
      ...req.body,
      buyerId
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Rezervasyon oluşturulamadı'
    });
  }
});

/**
 * POST /api/parts/reservations/:id/approve
 * Usta rezervasyonu onayla
 */
router.post('/reservations/:id/approve', auth, async (req: Request, res: Response) => {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı'
      });
    }

    Logger.devOnly('[ROUTE] POST /parts/reservations/:id/approve', {
      reservationId: req.params.id,
      sellerId,
    });

    const result = await PartsService.approveReservation(req.params.id, sellerId);
    
    Logger.devOnly('[ROUTE] Rezervasyon onaylandı:', {
      success: result.success,
      reservationId: req.params.id,
      newStatus: result.data?.status,
    });
    
    res.json(result);
  } catch (error: any) {
    Logger.devOnly('[ROUTE] Rezervasyon onaylama hatası:', {
      reservationId: req.params.id,
      error: error.message,
      statusCode: error.statusCode,
    });
    
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Rezervasyon onaylanamadı'
    });
  }
});

/**
 * POST /api/parts/reservations/:id/cancel
 * Rezervasyonu iptal et
 */
router.post('/reservations/:id/cancel', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı'
      });
    }

    const result = await PartsService.cancelReservation(
      req.params.id,
      userId,
      req.body.reason,
      req.body.cancelledBy
    );
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Rezervasyon iptal edilemedi'
    });
  }
});

/**
 * POST /api/parts/reservations/:id/negotiate
 * Rezervasyon için pazarlık teklifi gönder
 */
router.post('/reservations/:id/negotiate', auth, validate(negotiatePriceSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı'
      });
    }

    const result = await PartsService.negotiateReservationPrice(
      req.params.id,
      userId,
      req.body.requestedPrice,
      req.body.message
    );
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Pazarlık teklifi gönderilemedi'
    });
  }
});

/**
 * POST /api/parts/reservations/:id/negotiation-response
 * Usta pazarlık teklifini kabul/reddet
 */
router.post('/reservations/:id/negotiation-response', auth, async (req: Request, res: Response) => {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı'
      });
    }

    const { action, counterPrice } = req.body;
    if (!action || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz aksiyon'
      });
    }

    const result = await PartsService.respondToNegotiation(
      req.params.id,
      sellerId,
      action,
      counterPrice
    );
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Pazarlık yanıtı verilemedi'
    });
  }
});

/**
 * POST /api/parts/reservations/:id/deliver
 * Usta teslim edildi olarak işaretle
 */
router.post('/reservations/:id/deliver', auth, async (req: Request, res: Response) => {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı'
      });
    }

    const result = await PartsService.markAsDelivered(req.params.id, sellerId);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Teslim işareti verilemedi'
    });
  }
});

/**
 * POST /api/parts/reservations/:id/confirm-delivery
 * Şoför teslim aldığını onayla ve ödemeyi tamamla
 */
router.post('/reservations/:id/confirm-delivery', auth, async (req: Request, res: Response) => {
  try {
    const buyerId = req.user?.userId;
    if (!buyerId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı'
      });
    }

    const { paymentMethod, cardInfo } = req.body;

    const result = await PartsService.confirmDelivery(req.params.id, buyerId, {
      paymentMethod,
      cardInfo
    });
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Teslim onaylanamadı'
    });
  }
});

export default router;

