import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { Appointment } from '../models/Appointment';
import { User } from '../models/User';
import { Types } from 'mongoose';

const router = Router();

// Durum bildirimi metinleri
const STATUS_MESSAGES = {
  'TALEP_EDILDI': 'Randevu talebiniz alınmıştır. En kısa sürede size dönüş yapacağız.',
  'PLANLANDI': 'Randevunuz planlanmıştır. Belirlenen tarih ve saatte servisimizde olacağız.',
  'SERVISTE': 'Aracınız servisimizde işleme alınmıştır. İşlemler devam etmektedir.',
  'PARCA_BEKLIYOR': 'Aracınızda gerekli parçalar beklenmektedir. Parça geldiğinde işlemlere devam edilecektir.',
  'TEST_EDILIYOR': 'Aracınızda yapılan işlemler test edilmektedir. Test tamamlandığında bilgilendirileceksiniz.',
  'ODEME_BEKLIYOR': 'İşlemler tamamlanmıştır. Ödeme işlemi için beklenmektedir.',
  'TAMAMLANDI': 'Aracınızın tüm işlemleri tamamlanmıştır. Teslim için hazırdır.',
  'IPTAL': 'Randevunuz iptal edilmiştir. Yeni randevu için bizimle iletişime geçebilirsiniz.'
};

/**
 * @swagger
 * /api/status-notifications/{appointmentId}/status:
 *   put:
 *     summary: İş durumunu güncelle
 *     description: Tek tuşla iş durumunu günceller ve müşteriye bildirim gönderir
 *     tags:
 *       - Status Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Randevu ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [TALEP_EDILDI, PLANLANDI, SERVISTE, PARCA_BEKLIYOR, TEST_EDILIYOR, ODEME_BEKLIYOR, TAMAMLANDI, IPTAL]
 *                 description: Yeni durum
 *               notes:
 *                 type: string
 *                 description: Ek notlar
 *     responses:
 *       200:
 *         description: Durum başarıyla güncellendi
 *       400:
 *         description: Geçersiz durum
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Randevu bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.put('/:appointmentId/status', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const { appointmentId } = req.params;
    const { status, notes } = req.body;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    if (!status || !STATUS_MESSAGES[status as keyof typeof STATUS_MESSAGES]) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir durum belirtmelisiniz'
      });
    }

    // Randevuyu bul
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Randevu bulunamadı'
      });
    }

    // Ustanın bu randevuya sahip olduğunu kontrol et
    if (appointment.mechanicId?.toString() !== mechanicId) {
      return res.status(403).json({
        success: false,
        message: 'Bu randevuya erişim yetkiniz yok'
      });
    }

    // Durum geçmişini güncelle
    const statusHistoryEntry = {
      status,
      timestamp: new Date(),
      mechanicId,
      notes: notes || ''
    };

    // Randevuyu güncelle
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        $set: { status },
        $push: { statusHistory: statusHistoryEntry }
      },
      { new: true }
    );

    // Müşteri bilgilerini getir
    const customer = await User.findById(appointment.userId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Müşteri bulunamadı'
      });
    }

    // Bildirim mesajı oluştur
    const message = STATUS_MESSAGES[status as keyof typeof STATUS_MESSAGES];
    const notificationMessage = `Merhaba ${customer.name} ${customer.surname}. ${message}`;

    // Müşteriye bildirim ekle
    await User.findByIdAndUpdate(
      appointment.userId,
      {
        $push: {
          notifications: {
            type: 'appointment_status_update',
            title: 'Randevu Durumu Güncellendi',
            message: notificationMessage,
            data: {
              appointmentId,
              status,
              mechanicId
            },
            read: false,
            createdAt: new Date()
          }
        }
      }
    );

    res.json({
      success: true,
      data: {
        appointmentId,
        status,
        message: notificationMessage,
        timestamp: new Date()
      },
      message: 'Durum başarıyla güncellendi ve müşteriye bildirim gönderildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Durum güncellenirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/status-notifications/{appointmentId}/history:
 *   get:
 *     summary: Durum geçmişini getir
 *     description: Belirli bir randevunun durum geçmişini getirir
 *     tags:
 *       - Status Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Randevu ID'si
 *     responses:
 *       200:
 *         description: Durum geçmişi başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Randevu bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/:appointmentId/history', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const { appointmentId } = req.params;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Randevuyu bul
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Randevu bulunamadı'
      });
    }

    // Ustanın bu randevuya sahip olduğunu kontrol et
    if (appointment.mechanicId?.toString() !== mechanicId) {
      return res.status(403).json({
        success: false,
        message: 'Bu randevuya erişim yetkiniz yok'
      });
    }

    // Durum geçmişini getir
    const statusHistory = appointment.statusHistory || [];

    res.json({
      success: true,
      data: {
        appointmentId,
        currentStatus: appointment.status,
        statusHistory: statusHistory.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      },
      message: 'Durum geçmişi başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Durum geçmişi getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/status-notifications/statuses:
 *   get:
 *     summary: Mevcut durumları getir
 *     description: Sistemdeki tüm mevcut durumları ve açıklamalarını getirir
 *     tags:
 *       - Status Notifications
 *     responses:
 *       200:
 *         description: Durumlar başarıyla getirildi
 *       500:
 *         description: Sunucu hatası
 */
router.get('/statuses', async (req: Request, res: Response) => {
  try {
    const statuses = Object.keys(STATUS_MESSAGES).map(status => ({
      value: status,
      label: status.replace(/_/g, ' '),
      message: STATUS_MESSAGES[status as keyof typeof STATUS_MESSAGES]
    }));

    res.json({
      success: true,
      data: statuses,
      message: 'Durumlar başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Durumlar getirilirken hata oluştu',
      error: error.message
    });
  }
});

export default router;
