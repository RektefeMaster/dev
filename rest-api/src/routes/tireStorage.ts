import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { TireStorageService } from '../services/tireStorage.service';
import { validate } from '../middleware/validate';
import Joi from 'joi';
import { DepotLayout } from '../models/DepotLayout';
import { SeasonalReminder } from '../models/SeasonalReminder';

const router = Router();

// Lastik seti depoya yerleştir
router.post('/store', auth, validate(Joi.object({
    customerId: Joi.string().required(),
    vehicleId: Joi.string().required(),
    tireSet: Joi.object({
      season: Joi.string().valid('summer', 'winter').required(),
      brand: Joi.string().required(),
      model: Joi.string().required(),
      size: Joi.string().required(),
      condition: Joi.string().valid('new', 'used', 'good', 'fair', 'poor').default('good'),
      treadDepth: Joi.array().items(Joi.number().min(0).max(20)).length(4).required(),
      productionYear: Joi.number().min(1990).max(new Date().getFullYear()),
      notes: Joi.string()
    }).required(),
    storageFee: Joi.number().min(0).required(),
    photos: Joi.array().items(Joi.string())
  })), async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await TireStorageService.storeTireSet({
      ...req.body,
      mechanicId
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lastik seti yerleştirilirken hata oluştu'
    });
  }
});

// Barkod ile lastik seti bul
router.get('/find/:barcode', auth, async (req: Request, res: Response) => {
  try {
    const { barcode } = req.params;
    const mechanicId = req.user?.userId;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await TireStorageService.findTireSetByBarcode(barcode, mechanicId);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lastik seti bulunurken hata oluştu'
    });
  }
});

// Lastik seti teslim et
router.put('/retrieve/:tireStorageId', auth, async (req: Request, res: Response) => {
  try {
    const { tireStorageId } = req.params;
    const mechanicId = req.user?.userId;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await TireStorageService.retrieveTireSet(tireStorageId, mechanicId);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lastik seti teslim edilirken hata oluştu'
    });
  }
});

// Depo durumunu getir
router.get('/depot-status', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await TireStorageService.getDepotStatus(mechanicId);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Depo durumu getirilirken hata oluştu'
    });
  }
});

// Sezonluk hatırlatma gönder
router.post('/send-seasonal-reminders', auth, validate(Joi.object({
  season: Joi.string().valid('summer', 'winter').required()
})), async (req: Request, res: Response) => {
  try {
    const { season } = req.body;
    const mechanicId = req.user?.userId;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await TireStorageService.sendSeasonalReminders(mechanicId, season);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Hatırlatma gönderilirken hata oluştu'
    });
  }
});

// Depo düzeni oluştur/güncelle
router.post('/setup-depot', auth, validate(Joi.object({
    corridors: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      racks: Joi.number().min(1).required(),
      slotsPerRack: Joi.number().min(1).required()
    })).min(1).required()
  })), async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    const { corridors } = req.body;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    // Depo düzenini oluştur veya güncelle
    const depotLayout = await DepotLayout.findOneAndUpdate(
      { mechanicId },
      {
        mechanicId,
        layout: {
          corridors: corridors.map((corridor: any) => ({
            ...corridor,
            capacity: corridor.racks * corridor.slotsPerRack
          }))
        },
        currentStatus: {
          totalCapacity: corridors.reduce((total: number, corridor: any) => 
            total + (corridor.racks * corridor.slotsPerRack), 0),
          occupiedSlots: 0,
          availableSlots: corridors.reduce((total: number, corridor: any) => 
            total + (corridor.racks * corridor.slotsPerRack), 0),
          occupancyRate: 0
        },
        slotStatus: new Map()
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: depotLayout,
      message: 'Depo düzeni başarıyla oluşturuldu'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Depo düzeni oluşturulurken hata oluştu',
      error: error.message
    });
  }
});

// Hatırlatma ayarlarını oluştur/güncelle
router.post('/setup-reminders', auth, validate(Joi.object({
    summerReminder: Joi.object({
      enabled: Joi.boolean().default(true),
      startDate: Joi.string().pattern(/^\d{2}-\d{2}$/).default('01-04'),
      endDate: Joi.string().pattern(/^\d{2}-\d{2}$/).default('15-04'),
      message: Joi.string().default('Değerli Müşterimiz, yazlık lastiklerinize geçme zamanı geldi. Randevu almak için tıklayınız.')
    }),
    winterReminder: Joi.object({
      enabled: Joi.boolean().default(true),
      startDate: Joi.string().pattern(/^\d{2}-\d{2}$/).default('01-11'),
      endDate: Joi.string().pattern(/^\d{2}-\d{2}$/).default('15-11'),
      message: Joi.string().default('Değerli Müşterimiz, kışlık lastiklerinize geçme zamanı geldi. Randevu almak için tıklayınız.')
    })
  })), async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    const { summerReminder, winterReminder } = req.body;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const reminderSettings = await SeasonalReminder.findOneAndUpdate(
      { mechanicId },
      {
        mechanicId,
        settings: {
          summerReminder,
          winterReminder
        },
        stats: {
          totalRemindersSent: 0,
          successfulDeliveries: 0,
          failedDeliveries: 0
        }
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: reminderSettings,
      message: 'Hatırlatma ayarları başarıyla oluşturuldu'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Hatırlatma ayarları oluşturulurken hata oluştu',
      error: error.message
    });
  }
});

export default router;
