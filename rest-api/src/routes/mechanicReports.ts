import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { Appointment } from '../models/Appointment';
import { User } from '../models/User';
import { Types } from 'mongoose';

const router = Router();

/**
 * @swagger
 * /api/mechanic/reports/detailed-stats:
 *   get:
 *     summary: Detaylı usta raporları
 *     description: Haftalık, aylık, yıllık kazançlar ve müşteri istatistikleri
 *     tags:
 *       - Mechanic Reports
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detaylı istatistikler başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/detailed-stats', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    const now = new Date();
    
    // ===== TARİH ARALIKLARI =====
    
    // Haftalık (son 7 gün)
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);

    // Aylık (bu ay)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    thisMonthStart.setHours(0, 0, 0, 0);

    // Yıllık (bu yıl)
    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    thisYearStart.setHours(0, 0, 0, 0);

    // Tüm randevuları çek (daha verimli tek sorguda)
    const allAppointments = await Appointment.find({
      mechanicId: new Types.ObjectId(mechanicId)
    }).lean();

    // ===== KAZANÇ HESAPLAMALARI =====
    
    // Haftalık kazanç
    const weeklyAppointments = allAppointments.filter((apt: any) => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate >= oneWeekAgo && apt.status === 'TAMAMLANDI';
    });
    const weeklyEarnings = weeklyAppointments.reduce((sum: number, apt: any) => 
      sum + (apt.finalPrice || apt.price || 0), 0);

    // Aylık kazanç
    const monthlyAppointments = allAppointments.filter((apt: any) => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate >= thisMonthStart && apt.status === 'TAMAMLANDI';
    });
    const monthlyEarnings = monthlyAppointments.reduce((sum: number, apt: any) => 
      sum + (apt.finalPrice || apt.price || 0), 0);

    // Yıllık kazanç
    const yearlyAppointments = allAppointments.filter((apt: any) => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate >= thisYearStart && apt.status === 'TAMAMLANDI';
    });
    const yearlyEarnings = yearlyAppointments.reduce((sum: number, apt: any) => 
      sum + (apt.finalPrice || apt.price || 0), 0);

    // ===== RANDEVU İSTATİSTİKLERİ =====
    
    const totalAppointments = allAppointments.length;
    const completedAppointments = allAppointments.filter((apt: any) => 
      apt.status === 'TAMAMLANDI').length;

    // ===== ORTALAMA PUAN =====
    
    const { AppointmentRating } = await import('../models/AppointmentRating');
    const ratings = await AppointmentRating.find({ 
      mechanicId: new Types.ObjectId(mechanicId) 
    }).lean();
    
    let averageRating = 0;
    if (ratings.length > 0) {
      const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
      averageRating = Math.round((totalRating / ratings.length) * 10) / 10;
    }

    // ===== EN ÇOK YAPILAN HİZMETLER =====
    
    const serviceMap: { [key: string]: { count: number; earnings: number } } = {};
    allAppointments.forEach((apt: any) => {
      if (apt.status === 'TAMAMLANDI' && apt.serviceType) {
        if (!serviceMap[apt.serviceType]) {
          serviceMap[apt.serviceType] = { count: 0, earnings: 0 };
        }
        serviceMap[apt.serviceType].count += 1;
        serviceMap[apt.serviceType].earnings += (apt.finalPrice || apt.price || 0);
      }
    });
    
    const topServices = Object.entries(serviceMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 hizmet

    // ===== MÜŞTERİ İSTATİSTİKLERİ =====
    
    // Tüm zamanların benzersiz müşterileri
    const allTimeCustomers = new Set<string>();
    allAppointments.forEach((apt: any) => {
      if (apt.userId) {
        allTimeCustomers.add(apt.userId.toString());
      }
    });

    // Bu ayki randevular
    const thisMonthAppointments = allAppointments.filter((apt: any) => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate >= thisMonthStart;
    });

    // Bu ayki benzersiz müşteriler
    const thisMonthCustomers = new Set<string>();
    thisMonthAppointments.forEach((apt: any) => {
      if (apt.userId) {
        thisMonthCustomers.add(apt.userId.toString());
      }
    });

    // Yeni müşteriler: Bu ay ilk defa randevu alan müşteriler
    const newCustomers = new Set<string>();
    const returningCustomers = new Set<string>();

    for (const customerId of Array.from(thisMonthCustomers)) {
      // Bu müşterinin bu aydan önceki randevularını kontrol et
      const previousAppointments = allAppointments.filter((apt: any) => {
        const aptDate = new Date(apt.appointmentDate);
        return apt.userId && apt.userId.toString() === customerId && aptDate < thisMonthStart;
      });

      if (previousAppointments.length === 0) {
        newCustomers.add(customerId);
      } else {
        returningCustomers.add(customerId);
      }
    }

    // ===== AYLIK KAZANÇ TRENDİ (Son 6 ay) =====
    
    const earningsByMonth: Array<{ month: string; earnings: number; year: number; monthNum: number }> = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now);
      monthDate.setMonth(monthDate.getMonth() - i);
      
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      
      const monthAppointments = allAppointments.filter((apt: any) => {
        const aptDate = new Date(apt.appointmentDate);
        return aptDate >= monthStart && aptDate <= monthEnd && apt.status === 'TAMAMLANDI';
      });
      
      const monthEarnings = monthAppointments.reduce((sum: number, apt: any) => 
        sum + (apt.finalPrice || apt.price || 0), 0);
      
      // Türkçe ay ismi
      const monthName = monthDate.toLocaleDateString('tr-TR', { month: 'short' });
      
      earningsByMonth.push({
        month: monthName,
        year: monthDate.getFullYear(),
        monthNum: monthDate.getMonth() + 1,
        earnings: monthEarnings
      });
    }

    // ===== HAFTALIK RANDEVU DAĞILIMI (Son 7 gün) =====
    
    const appointmentsByDay: Array<{ day: string; date: string; count: number; dayOfWeek: number }> = [];
    
    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date(now);
      dayDate.setDate(dayDate.getDate() - i);
      dayDate.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(dayDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const dayAppointments = allAppointments.filter((apt: any) => {
        const aptDate = new Date(apt.appointmentDate);
        return aptDate >= dayDate && aptDate < nextDay;
      });
      
      // Türkçe gün ismi
      const dayName = dayDate.toLocaleDateString('tr-TR', { weekday: 'short' });
      const dateStr = dayDate.toISOString().split('T')[0];
      
      appointmentsByDay.push({
        day: dayName,
        date: dateStr,
        dayOfWeek: dayDate.getDay(),
        count: dayAppointments.length
      });
    }

    // ===== GÜNLÜK RANDEVUlar (Bugün) =====
    
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    
    const todayAppointments = allAppointments.filter((apt: any) => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate >= todayStart && aptDate <= todayEnd;
    });

    const todayCompleted = todayAppointments.filter((apt: any) => apt.status === 'TAMAMLANDI');
    const todayEarnings = todayCompleted.reduce((sum: number, apt: any) => 
      sum + (apt.finalPrice || apt.price || 0), 0);

    // ===== RESPONSE =====
    
    const reportData = {
      // Kazanç özeti
      earnings: {
        weekly: weeklyEarnings,
        monthly: monthlyEarnings,
        yearly: yearlyEarnings,
        today: todayEarnings
      },
      
      // Randevu özeti
      appointments: {
        total: totalAppointments,
        completed: completedAppointments,
        today: todayAppointments.length,
        todayCompleted: todayCompleted.length,
        completionRate: totalAppointments > 0 
          ? Math.round((completedAppointments / totalAppointments) * 100) 
          : 0
      },
      
      // Puan
      rating: {
        average: averageRating,
        total: ratings.length
      },
      
      // En çok yapılan hizmetler
      topServices,
      
      // Müşteri istatistikleri
      customerStats: {
        allTime: allTimeCustomers.size,
        thisMonth: thisMonthCustomers.size,
        newCustomers: newCustomers.size,
        returningCustomers: returningCustomers.size,
        retentionRate: thisMonthCustomers.size > 0 
          ? Math.round((returningCustomers.size / thisMonthCustomers.size) * 100) 
          : 0
      },
      
      // Aylık kazanç trendi
      earningsByMonth,
      
      // Haftalık randevu dağılımı
      appointmentsByDay,
      
      // Meta bilgiler
      meta: {
        generatedAt: now.toISOString(),
        mechanicId: mechanicId
      }
    };

    res.json({
      success: true,
      data: reportData,
      message: 'Detaylı istatistikler başarıyla getirildi'
    });

  } catch (error: any) {
    console.error('Detailed stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Detaylı istatistikler alınırken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/mechanic/reports/summary:
 *   get:
 *     summary: Usta rapor özeti
 *     description: Usta için temel rapor özeti
 *     tags:
 *       - Mechanic Reports
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rapor özeti başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/summary', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Bu ayki tamamlanan işler
    const completedJobs = await Appointment.countDocuments({
      mechanicId: new Types.ObjectId(mechanicId),
      status: 'TAMAMLANDI',
      appointmentDate: { $gte: thisMonthStart }
    });

    // Bu ayki toplam kazanç
    const appointments = await Appointment.find({
      mechanicId: new Types.ObjectId(mechanicId),
      status: 'TAMAMLANDI',
      appointmentDate: { $gte: thisMonthStart }
    }).lean();

    const totalEarnings = appointments.reduce((sum, apt) => 
      sum + (apt.finalPrice || apt.price || 0), 0);

    // Ortalama puan
    const { AppointmentRating } = await import('../models/AppointmentRating');
    const ratings = await AppointmentRating.find({ 
      mechanicId: new Types.ObjectId(mechanicId) 
    }).lean();
    
    let averageRating = 0;
    if (ratings.length > 0) {
      const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
      averageRating = Math.round((totalRating / ratings.length) * 10) / 10;
    }

    res.json({
      success: true,
      data: {
        thisMonth: {
          completedJobs,
          totalEarnings,
          averageRating
        }
      },
      message: 'Rapor özeti başarıyla getirildi'
    });

  } catch (error: any) {
    console.error('Summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Rapor özeti alınırken hata oluştu',
      error: error.message
    });
  }
});

export default router;

