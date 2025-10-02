import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { User } from '../models/User';
import { Appointment } from '../models/Appointment';
import { Types } from 'mongoose';

const router = Router();

/**
 * @swagger
 * /api/vehicle-history/{vehicleId}:
 *   get:
 *     summary: Araç geçmişini getir
 *     description: Belirli bir aracın servis geçmişini getirir
 *     tags:
 *       - Vehicle History
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Araç ID'si
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Maksimum kayıt sayısı
 *     responses:
 *       200:
 *         description: Araç geçmişi başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Araç bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/:vehicleId', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const { vehicleId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Ustanın profilini getir
    const mechanic = await User.findById(mechanicId);
    if (!mechanic) {
      return res.status(404).json({
        success: false,
        message: 'Usta bulunamadı'
      });
    }

    // Araç geçmişini getir
    const vehicleHistory = mechanic.vehicleHistory?.filter(history => 
      history.vehicleId === vehicleId
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit) || [];

    // Bu araç için yapılan randevuları da getir
    const appointments = await Appointment.find({
      mechanicId: new Types.ObjectId(mechanicId),
      vehicleId: new Types.ObjectId(vehicleId),
      status: 'TAMAMLANDI'
    })
    .populate('userId', 'name surname')
    .sort({ appointmentDate: -1 })
    .limit(limit);

    // Toplam istatistikler
    const totalServices = vehicleHistory.length + appointments.length;
    const totalSpent = vehicleHistory.reduce((sum, h) => sum + h.price, 0) + 
                      appointments.reduce((sum, a) => sum + (a.price || 0), 0);
    const averageSpending = totalServices > 0 ? totalSpent / totalServices : 0;

    // Son servis tarihi
    const lastService = vehicleHistory.length > 0 ? vehicleHistory[0].date : 
                       appointments.length > 0 ? appointments[0].appointmentDate : null;

    res.json({
      success: true,
      data: {
        vehicleId,
        history: vehicleHistory,
        appointments: appointments.map(apt => ({
          id: apt._id,
          date: apt.appointmentDate,
          serviceType: apt.serviceType,
          price: apt.price,
          customer: `${(apt.userId as any)?.name} ${(apt.userId as any)?.surname}`,
          description: apt.description
        })),
        stats: {
          totalServices,
          totalSpent,
          averageSpending: Math.round(averageSpending),
          lastService
        }
      },
      message: 'Araç geçmişi başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Araç geçmişi getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/vehicle-history/{vehicleId}/add:
 *   post:
 *     summary: Araç geçmişine kayıt ekle
 *     description: Araç geçmişine yeni servis kaydı ekler
 *     tags:
 *       - Vehicle History
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Araç ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceType
 *               - description
 *               - price
 *               - mileage
 *             properties:
 *               serviceType:
 *                 type: string
 *                 description: Servis tipi
 *                 example: "Motor Bakımı"
 *               description:
 *                 type: string
 *                 description: Servis açıklaması
 *                 example: "Yağ değişimi ve filtre kontrolü"
 *               price:
 *                 type: number
 *                 description: Servis ücreti
 *                 example: 500
 *               mileage:
 *                 type: number
 *                 description: Kilometre
 *                 example: 150000
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Servis tarihi (varsayılan bugün)
 *     responses:
 *       200:
 *         description: Kayıt başarıyla eklendi
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.post('/:vehicleId/add', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const { vehicleId } = req.params;
    const { serviceType, description, price, mileage, date } = req.body;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    if (!serviceType || !description || !price || !mileage) {
      return res.status(400).json({
        success: false,
        message: 'Servis tipi, açıklama, fiyat ve kilometre gerekli'
      });
    }

    // Yeni geçmiş kaydı oluştur
    const newHistoryEntry = {
      vehicleId,
      serviceType: serviceType.trim(),
      description: description.trim(),
      price: parseFloat(price),
      mileage: parseInt(mileage),
      date: date ? new Date(date) : new Date()
    };

    // Ustanın profilini güncelle
    const updatedUser = await User.findByIdAndUpdate(
      mechanicId,
      {
        $push: {
          vehicleHistory: newHistoryEntry
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Usta bulunamadı'
      });
    }

    res.json({
      success: true,
      data: newHistoryEntry,
      message: 'Araç geçmişi kaydı başarıyla eklendi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Kayıt eklenirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/vehicle-history/{vehicleId}/reminders:
 *   get:
 *     summary: Bakım hatırlatmalarını getir
 *     description: Belirli bir araç için bakım hatırlatmalarını getirir
 *     tags:
 *       - Vehicle History
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Araç ID'si
 *     responses:
 *       200:
 *         description: Hatırlatmalar başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/:vehicleId/reminders', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const { vehicleId } = req.params;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Ustanın profilini getir
    const mechanic = await User.findById(mechanicId);
    if (!mechanic) {
      return res.status(404).json({
        success: false,
        message: 'Usta bulunamadı'
      });
    }

    // Bu araç için hatırlatmaları getir
    const reminders = mechanic.maintenanceReminders?.filter(reminder => 
      reminder.vehicleId === vehicleId && reminder.isActive
    ) || [];

    // Hatırlatmaları tarihe göre sırala
    reminders.sort((a, b) => {
      const dateA = a.targetDate || new Date();
      const dateB = b.targetDate || new Date();
      return dateA.getTime() - dateB.getTime();
    });

    res.json({
      success: true,
      data: reminders,
      message: `${reminders.length} bakım hatırlatması bulundu`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Hatırlatmalar getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/vehicle-history/{vehicleId}/reminders:
 *   post:
 *     summary: Bakım hatırlatması ekle
 *     description: Araç için yeni bakım hatırlatması ekler
 *     tags:
 *       - Vehicle History
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Araç ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - description
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [mileage, date, both]
 *                 description: Hatırlatma tipi
 *               targetMileage:
 *                 type: number
 *                 description: Hedef kilometre (mileage veya both için)
 *               targetDate:
 *                 type: string
 *                 format: date
 *                 description: Hedef tarih (date veya both için)
 *               description:
 *                 type: string
 *                 description: Hatırlatma açıklaması
 *                 example: "Yağ değişimi gerekli"
 *     responses:
 *       200:
 *         description: Hatırlatma başarıyla eklendi
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.post('/:vehicleId/reminders', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const { vehicleId } = req.params;
    const { type, targetMileage, targetDate, description } = req.body;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    if (!type || !description) {
      return res.status(400).json({
        success: false,
        message: 'Tip ve açıklama gerekli'
      });
    }

    // Tip kontrolü
    if (type === 'mileage' && !targetMileage) {
      return res.status(400).json({
        success: false,
        message: 'Kilometre tipi için hedef kilometre gerekli'
      });
    }

    if (type === 'date' && !targetDate) {
      return res.status(400).json({
        success: false,
        message: 'Tarih tipi için hedef tarih gerekli'
      });
    }

    if (type === 'both' && (!targetMileage || !targetDate)) {
      return res.status(400).json({
        success: false,
        message: 'Her iki tip için hem kilometre hem tarih gerekli'
      });
    }

    // Yeni hatırlatma oluştur
    const newReminder = {
      _id: new Types.ObjectId(),
      vehicleId,
      type,
      targetMileage: targetMileage ? parseInt(targetMileage) : undefined,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      description: description.trim(),
      isActive: true,
      createdAt: new Date()
    };

    // Ustanın profilini güncelle
    const updatedUser = await User.findByIdAndUpdate(
      mechanicId,
      {
        $push: {
          maintenanceReminders: newReminder
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Usta bulunamadı'
      });
    }

    res.json({
      success: true,
      data: newReminder,
      message: 'Bakım hatırlatması başarıyla eklendi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Hatırlatma eklenirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/vehicle-history/{vehicleId}/reminders/{reminderId}:
 *   put:
 *     summary: Bakım hatırlatmasını güncelle
 *     description: Mevcut bakım hatırlatmasını günceller
 *     tags:
 *       - Vehicle History
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Araç ID'si
 *       - in: path
 *         name: reminderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hatırlatma ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [mileage, date, both]
 *               targetMileage:
 *                 type: number
 *               targetDate:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Hatırlatma başarıyla güncellendi
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Hatırlatma bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.put('/:vehicleId/reminders/:reminderId', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const { vehicleId, reminderId } = req.params;
    const updateData = req.body;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Güncellenecek alanları hazırla
    const updateFields: any = {};
    if (updateData.type !== undefined) updateFields['maintenanceReminders.$.type'] = updateData.type;
    if (updateData.targetMileage !== undefined) updateFields['maintenanceReminders.$.targetMileage'] = updateData.targetMileage;
    if (updateData.targetDate !== undefined) updateFields['maintenanceReminders.$.targetDate'] = updateData.targetDate ? new Date(updateData.targetDate) : undefined;
    if (updateData.description !== undefined) updateFields['maintenanceReminders.$.description'] = updateData.description.trim();
    if (updateData.isActive !== undefined) updateFields['maintenanceReminders.$.isActive'] = updateData.isActive;

    // Ustanın profilini güncelle
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: mechanicId,
        'maintenanceReminders._id': reminderId,
        'maintenanceReminders.vehicleId': vehicleId
      },
      {
        $set: updateFields
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Hatırlatma bulunamadı'
      });
    }

    // Güncellenmiş hatırlatmayı bul
    const updatedReminder = updatedUser.maintenanceReminders?.find(r => 
      r._id?.toString() === reminderId && r.vehicleId === vehicleId
    );

    res.json({
      success: true,
      data: updatedReminder,
      message: 'Bakım hatırlatması başarıyla güncellendi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Hatırlatma güncellenirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/vehicle-history/{vehicleId}/reminders/{reminderId}:
 *   delete:
 *     summary: Bakım hatırlatmasını sil
 *     description: Mevcut bakım hatırlatmasını siler
 *     tags:
 *       - Vehicle History
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Araç ID'si
 *       - in: path
 *         name: reminderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hatırlatma ID'si
 *     responses:
 *       200:
 *         description: Hatırlatma başarıyla silindi
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Hatırlatma bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.delete('/:vehicleId/reminders/:reminderId', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const { vehicleId, reminderId } = req.params;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Ustanın profilini güncelle
    const updatedUser = await User.findByIdAndUpdate(
      mechanicId,
      {
        $pull: {
          maintenanceReminders: {
            _id: reminderId,
            vehicleId: vehicleId
          }
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Hatırlatma bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Bakım hatırlatması başarıyla silindi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Hatırlatma silinirken hata oluştu',
      error: error.message
    });
  }
});

export default router;
