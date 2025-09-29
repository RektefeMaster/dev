import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createAppointmentSchema, updateAppointmentSchema } from '../validators/appointment.validation';
import { AppointmentService } from '../services/appointment.service';
import { Appointment } from '../models/Appointment';
import { AppointmentController } from '../controllers/appointment.controller';

const router = Router();

// Debug endpoint'leri (auth olmadan)
router.get('/debug-all', async (req: Request, res: Response) => {
  try {
    const appointments = await AppointmentService.getAllAppointments();
    res.json({ success: true, data: appointments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/debug-user/:userId', async (req: Request, res: Response) => {
  try {
    const appointments = await AppointmentService.getAppointmentsByUserId(req.params.userId);
    res.json({ success: true, data: appointments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ana endpoint'ler
router.post('/', auth, validate(createAppointmentSchema), async (req: Request, res: Response) => {
  try {
    // req.user'dan userId'yi al ve req.body'ye ekle
    const userId = (req.user as any)?.userId;
    const appointmentData = {
      ...req.body,
      userId: userId
    };
    
    const appointment = await AppointmentService.createAppointment(appointmentData);
    res.status(201).json({ success: true, data: appointment });
  } catch (error: any) {
    // Validation hatası ise 400, diğer hatalar 500
    const statusCode = error.message.includes('validation') || error.message.includes('required') ? 400 : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
});

router.get('/driver', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.userId;
    const appointments = await AppointmentService.getAppointmentsByUserId(userId);
    res.json({ success: true, data: appointments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// FaultReportId ile randevu bulma
router.get('/by-fault-report/:faultReportId', auth, async (req: Request, res: Response) => {
  try {
    const { faultReportId } = req.params;
    const appointment = await AppointmentService.getAppointmentByFaultReportId(faultReportId);
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/mechanic', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req.user as any)?.userId;
    const statusFilter = req.query.status as string;
    const appointments = await AppointmentService.getMechanicAppointments(mechanicId, statusFilter, req.query);
    res.json({ success: true, data: appointments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Dükkan randevuları - ustanın kendi eklediği randevular
router.get('/shop', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req.user as any)?.userId;
    const status = req.query.status as string;
    const appointments = await AppointmentService.getShopAppointments(mechanicId, status);
    res.json({ success: true, data: appointments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/stats', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req.user as any)?.userId;
    const stats = await AppointmentService.getAppointmentStats(mechanicId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.userId;
    const appointment = await AppointmentService.getAppointmentById(req.params.id, userId);
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/approve', auth, async (req: Request, res: Response) => {
  try {
    const appointment = await AppointmentService.updateAppointmentStatus(
      req.params.id,
      'confirmed',
      undefined,
      undefined
    );
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/reject', auth, async (req: Request, res: Response) => {
  try {
    const { rejectionReason } = req.body;
    const appointment = await AppointmentService.updateAppointmentStatus(
      req.params.id,
      'rejected',
      rejectionReason,
      undefined
    );
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/start', auth, async (req: Request, res: Response) => {
  try {
    const appointment = await AppointmentService.updateAppointmentStatus(
      req.params.id,
      'in-progress',
      undefined,
      undefined
    );
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/complete', auth, async (req: Request, res: Response) => {
  try {
    const { completionNotes, price, estimatedDuration } = req.body;
    const appointment = await AppointmentService.completeAppointment(
      req.params.id,
      completionNotes,
      price,
      estimatedDuration
    );
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ödeme linki üret (stub) ve ODEME_BEKLIYOR durumuna geçir
router.put('/:id/payment/link', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appt: any = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ success: false, message: 'Randevu bulunamadı' });
    if (appt.status !== 'ODEME_BEKLIYOR') {
      return res.status(400).json({ success: false, message: 'Ödeme linki sadece ödeme bekleyen işlerde oluşturulur' });
    }
    const token = Math.random().toString(36).slice(2, 10).toUpperCase();
    appt.odemeLink = `https://pay.example.com/${token}`;
    appt.odemeRef = token;
    await appt.save();
    res.json({ success: true, data: { link: appt.odemeLink, ref: appt.odemeRef } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ödemeyi onayla (stub) ve TAMAMLANDI durumuna geçir
router.put('/:id/payment/confirm', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appt: any = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ success: false, message: 'Randevu bulunamadı' });
    if (appt.status !== 'ODEME_BEKLIYOR') {
      return res.status(400).json({ success: false, message: 'Sadece ödeme bekleyen işlerde onay yapılır' });
    }
    appt.paymentStatus = 'completed';
    appt.paymentDate = new Date();
    appt.status = 'TAMAMLANDI';
    await appt.save();

    // TefePuan kazanımı appointment.controller.ts'de yapılıyor

    res.json({ success: true, data: appt });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Parça bekleniyor flip
router.put('/:id/waiting-parts', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { value } = req.body as { value: boolean };
    const appt: any = await Appointment.findByIdAndUpdate(id, { parcaBekleniyor: !!value }, { new: true });
    if (!appt) return res.status(404).json({ success: false, message: 'Randevu bulunamadı' });
    res.json({ success: true, data: appt });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// İş kalemi ekle
router.post('/:id/items', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { ad, adet, birim, tutar, tur } = req.body;
    const appt: any = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ success: false, message: 'Randevu bulunamadı' });
    appt.kalemler = appt.kalemler || [];
    appt.kalemler.push({ id: Date.now().toString(), ad, adet, birim, tutar, tur });
    // Toplamı güncelle
    const total = (appt.kalemler || []).reduce((s: number, k: any) => s + (k.tutar || 0) * (k.adet || 1), 0);
    appt.price = total;
    await appt.save();
    res.json({ success: true, data: appt });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ara onay iste
router.post('/:id/extra-approval', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { aciklama, tutar } = req.body;
    const appt: any = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ success: false, message: 'Randevu bulunamadı' });
    appt.araOnaylar = appt.araOnaylar || [];
    appt.araOnaylar.push({ aciklama, tutar, onay: 'BEKLIYOR', tarih: new Date() });
    await appt.save();
    res.json({ success: true, data: appt });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// No-show işaretle
router.put('/:id/no-show', auth, async (req: Request, res: Response) => {
  try {
    const appt: any = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: 'Randevu bulunamadı' });
    if (appt.status !== 'PLANLANDI') {
      return res.status(400).json({ success: false, message: 'No-show sadece planlı randevularda işaretlenebilir' });
    }
    appt.status = 'NO_SHOW';
    await appt.save();
    res.json({ success: true, data: appt });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/cancel', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı ID bulunamadı' });
    }
    const appointment = await AppointmentService.cancelAppointment(req.params.id, userId);
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/status', auth, async (req: Request, res: Response) => {
  try {
    const { status, rejectionReason, mechanicNotes } = req.body;
    const appointment = await AppointmentService.updateAppointmentStatus(
      req.params.id,
      status,
      rejectionReason,
      mechanicNotes
    );
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fiyat güncelleme endpoint'i
router.put('/:id/price', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { price } = req.body;
    
    if (price === undefined || price === null) {
      return res.status(400).json({ success: false, message: 'Fiyat gerekli' });
    }
    
    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { price: Number(price) },
      { new: true }
    );
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Randevu bulunamadı' });
    }
    
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Payment status endpoint'i ekle
router.put('/:id/payment-status', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı bilgisi bulunamadı' });
    }

    // Ödeme durumunu güncelle
    await AppointmentService.updatePaymentStatus(id, req.body, userId);

    res.json({
      success: true,
      message: 'Ödeme durumu başarıyla güncellendi'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Transfer payment endpoint'i ekle
router.post('/:id/transfer-payment', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, mechanicId } = req.body;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı bilgisi bulunamadı' });
    }

    if (!amount || !mechanicId) {
      return res.status(400).json({ success: false, message: 'Miktar ve usta ID gerekli' });
    }

    // Burada gerçek para transferi işlemi yapılabilir
    // Şimdilik sadece başarılı yanıt döndürüyoruz

    res.json({
      success: true,
      message: 'Para transferi başarılı',
      data: {
        amount,
        mechanicId,
        transferDate: new Date()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Servise al (SERVISTE durumuna geçir)
router.put('/:id/servise-al', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mechanicId = req.user?.userId;
    
    if (!mechanicId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı bilgisi bulunamadı' });
    }

    const appointment = await AppointmentService.updateAppointmentStatus(id, 'SERVISTE');
    
    res.json({
      success: true,
      message: 'Randevu servise alındı',
      data: appointment
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fiyat artırma (opsiyonel ek masraf)
router.put('/:id/price-increase', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      additionalAmount, 
      reason, 
      customReason, 
      kalemler, 
      kdvDahil = true 
    } = req.body;
    const mechanicId = req.user?.userId;
    
    if (!mechanicId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı bilgisi bulunamadı' });
    }

    if (!additionalAmount || additionalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Geçerli bir ek tutar gerekli' });
    }

    if (!reason && !customReason) {
      return res.status(400).json({ success: false, message: 'Fiyat artırma sebebi gerekli' });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Randevu bulunamadı' });
    }

    // Sadece SERVISTE durumundaki randevularda fiyat artırılabilir
    if (appointment.status !== 'SERVISTE') {
      return res.status(400).json({ 
        success: false, 
        message: 'Fiyat artırma sadece serviste olan işlerde yapılabilir' 
      });
    }

    // Mevcut fiyatı al (varsa)
    const currentPrice = appointment.price || 0;
    const newTotalPrice = currentPrice + additionalAmount;

    // Fiyat artırma geçmişini kaydet
    const priceIncreaseHistory = appointment.priceIncreaseHistory || [];
    priceIncreaseHistory.push({
      amount: additionalAmount,
      reason: reason || customReason,
      date: new Date(),
      mechanicId: mechanicId
    });

    // Randevuyu güncelle
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      {
        price: newTotalPrice,
        priceIncreaseHistory,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Fiyat başarıyla artırıldı',
      data: {
        appointment: updatedAppointment,
        priceIncrease: {
          previousPrice: currentPrice,
          additionalAmount,
          newTotalPrice,
          reason: reason || customReason
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ödeme bekliyor durumuna geçir (iş tamamlandı, fiyat belirlendi)
router.put('/:id/odeme-bekliyor', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { kalemler, kdvDahil = true } = req.body;
    const mechanicId = req.user?.userId;
    
    if (!mechanicId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı bilgisi bulunamadı' });
    }

    if (!kalemler || !Array.isArray(kalemler) || kalemler.length === 0) {
      return res.status(400).json({ success: false, message: 'İş kalemleri gerekli' });
    }

    // Toplam fiyatı hesapla
    const toplamFiyat = kalemler.reduce((sum: number, kalem: any) => sum + (kalem.tutar * kalem.adet), 0);
    
    // PayTR simülasyonu - gerçek link oluştur
    const odemeRef = `PAYTR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const odemeLink = `https://paytr.com/odeme/${odemeRef}`;

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      {
        status: 'ODEME_BEKLIYOR',
        kalemler,
        kdvDahil,
        price: toplamFiyat,
        odemeLink,
        odemeRef,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Randevu bulunamadı' });
    }
    
    res.json({
      success: true,
      message: 'Ödeme bekliyor durumuna geçirildi',
      data: {
        ...appointment.toObject(),
        odemeLink,
        odemeRef
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ödeme tamamlandı (PayTR simülasyonu)
router.put('/:id/odeme-tamamlandi', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mechanicId = req.user?.userId;
    
    if (!mechanicId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı bilgisi bulunamadı' });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      {
        status: 'TAMAMLANDI',
        paymentStatus: 'paid',
        paymentDate: new Date(),
        kapatmaZamani: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Randevu bulunamadı' });
    }
    
    res.json({
      success: true,
      message: 'Ödeme tamamlandı, randevu kapatıldı',
      data: appointment
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// No-show işaretle
router.put('/:id/no-show', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mechanicId = req.user?.userId;
    
    if (!mechanicId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı bilgisi bulunamadı' });
    }

    const appointment = await AppointmentService.updateAppointmentStatus(id, 'NO_SHOW');
    
    res.json({
      success: true,
      message: 'No-show olarak işaretlendi',
      data: appointment
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Parça bekleniyor toggle
router.put('/:id/parca-bekleniyor', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { parcaBekleniyor } = req.body;
    const mechanicId = req.user?.userId;
    
    if (!mechanicId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı bilgisi bulunamadı' });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { parcaBekleniyor, updatedAt: new Date() },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Randevu bulunamadı' });
    }
    
    res.json({
      success: true,
      message: parcaBekleniyor ? 'Parça bekleniyor işaretlendi' : 'Parça bekleniyor işareti kaldırıldı',
      data: appointment
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Complete appointment endpoint (eski - geriye uyumluluk için)
router.put('/:id/complete', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { completionNotes, price } = req.body;
    const mechanicId = req.user?.userId;
    
    if (!mechanicId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı bilgisi bulunamadı' });
    }

    if (!completionNotes || !price) {
      return res.status(400).json({ success: false, message: 'Not ve ücret bilgisi gerekli' });
    }

    const appointment = await AppointmentService.completeAppointment(id, completionNotes, price);
    
    res.json({
      success: true,
      message: 'Randevu başarıyla tamamlandı',
      data: appointment
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Eski durumları yeni durumlara çevir (migration)
router.put('/migrate-status', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    
    if (!mechanicId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı bilgisi bulunamadı' });
    }

    // Eski durumları yeni durumlara çevir
    const statusMapping = {
      'pending': 'TALEP_EDILDI',
      'confirmed': 'PLANLANDI',
      'in-progress': 'SERVISTE',
      'completed': 'TAMAMLANDI',
      'cancelled': 'IPTAL',
      'rejected': 'IPTAL'
    };

    const appointments = await Appointment.find({ mechanicId });
    let updatedCount = 0;

    for (const appointment of appointments) {
      const newStatus = statusMapping[appointment.status as keyof typeof statusMapping];
      if (newStatus && newStatus !== appointment.status) {
        appointment.status = newStatus as any;
        await appointment.save();
        updatedCount++;
      }
    }

    res.json({
      success: true,
      message: `${updatedCount} randevu durumu güncellendi`,
      data: { updatedCount }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Today's schedule endpoint
router.get('/today-schedule', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı ID bulunamadı' });
    }
    const appointments = await AppointmentService.getTodaysAppointments(userId);
    res.json({ success: true, data: { appointments } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fiyat yönetimi endpoint'leri
// router.put('/:appointmentId/price', auth, AppointmentController.setAppointmentPrice);
// router.post('/:appointmentId/price-increase', auth, AppointmentController.addPriceIncrease);

// Ödeme endpoint'leri
// router.post('/:appointmentId/payment', auth, (req, res) => AppointmentController.createPayment(req, res));
// router.post('/:appointmentId/confirm-payment', auth, (req, res) => AppointmentController.confirmPayment(req, res));

export default router;
