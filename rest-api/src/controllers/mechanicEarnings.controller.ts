import { Request, Response } from 'express';
import { sendResponse } from '../utils/response';
import { Appointment } from '../models/Appointment';
import { Types } from 'mongoose';

export class MechanicEarningsController {
  /**
   * Ustanın kazançlarını getir
   */
  static async getEarnings(req: Request, res: Response) {
    try {
      console.log('🔍 getEarnings called with:', {
        query: req.query,
        user: req.user,
        userId: req.user?.userId,
        mechanicId: req.params.mechanicId
      });

      console.log('🔍 Appointment model check:', {
        Appointment: typeof Appointment,
        AppointmentFind: typeof Appointment?.find,
        AppointmentModel: Appointment
      });

      const { period = 'month', startDate, endDate } = req.query;
      const mechanicId = req.params.mechanicId || req.user?.userId;

      if (!mechanicId) {
        console.log('❌ No mechanicId found');
        return sendResponse(res, 400, 'Mekanik ID gerekli');
      }

      console.log('✅ Using mechanicId:', mechanicId);

      // Tarih aralığını hesapla
      const now = new Date();
      let start, end;

      switch (period) {
        case 'week':
          start = new Date(now.setDate(now.getDate() - now.getDay()));
          end = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'year':
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear(), 11, 31);
          break;
        default:
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }

      // Randevuları getir - Tüm aktif status'ları dahil et
      const appointments = await Appointment.find({
        mechanicId: new Types.ObjectId(mechanicId as string),
        appointmentDate: { $gte: start, $lte: end },
        status: { $in: ['confirmed', 'completed', 'paid', 'in-progress'] }
      }).populate('userId', 'name surname').populate('vehicleId', 'brand modelName plateNumber');

      console.log('🔍 Kazanç API - Bulunan randevular:', appointments.length);
      console.log('🔍 Kazanç API - Randevu detayları:', appointments.map(apt => ({
        id: apt._id,
        status: apt.status,
        price: apt.price,
        date: apt.appointmentDate
      })));

      // Kazançları hesapla
      const earnings = appointments.map(apt => ({
        date: apt.appointmentDate,
        amount: apt.price || 0,
        jobTitle: apt.serviceType,
        customer: `${(apt.userId as any)?.name || 'Bilinmeyen'} ${(apt.userId as any)?.surname || 'Müşteri'}`,
        status: apt.status,
        appointmentId: apt._id,
        vehicleInfo: apt.vehicleId ? `${(apt.vehicleId as any)?.brand} ${(apt.vehicleId as any)?.modelName} (${(apt.vehicleId as any)?.plateNumber})` : 'Araç bilgisi yok'
      }));

      console.log('🔍 Kazanç API - Hesaplanan kazançlar:', earnings);

      return sendResponse(res, 200, 'Kazanç bilgileri başarıyla getirildi', earnings);
    } catch (error) {
      console.error('❌ getEarnings error:', error);
      console.error('❌ Error details:', {
        message: (error as any).message,
        stack: (error as any).stack,
        name: (error as any).name
      });
      return sendResponse(res, 500, 'Sunucu hatası');
    }
  }

  /**
   * Kazanç özeti
   */
  static async getEarningsSummary(req: Request, res: Response) {
    try {
      console.log('🔍 getEarningsSummary called with:', {
        user: req.user,
        userId: req.user?.userId,
        mechanicId: req.params.mechanicId
      });

      const mechanicId = req.params.mechanicId || req.user?.userId;

      if (!mechanicId) {
        console.log('❌ No mechanicId found in getEarningsSummary');
        return sendResponse(res, 400, 'Mekanik ID gerekli');
      }

      console.log('✅ Using mechanicId in getEarningsSummary:', mechanicId);

      const now = new Date();
      
      // Bugün
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      
      // Bu hafta
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      
      // Bu ay
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      // Bu yıl
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

      // Tüm zamanlar
      const allTimeStart = new Date(0);

      // Paralel olarak tüm sorguları çalıştır
      const [todayEarnings, weekEarnings, monthEarnings, yearEarnings, allTimeEarnings, totalJobs] = await Promise.all([
        Appointment.aggregate([
          { $match: { mechanicId: new Types.ObjectId(mechanicId as string), status: { $in: ['completed', 'paid'] } } },
          { $match: { appointmentDate: { $gte: todayStart, $lte: todayEnd } } },
          { $group: { _id: null, total: { $sum: '$price' } } }
        ]),
        Appointment.aggregate([
          { $match: { mechanicId: new Types.ObjectId(mechanicId as string), status: { $in: ['completed', 'paid'] } } },
          { $match: { appointmentDate: { $gte: weekStart, $lte: weekEnd } } },
          { $group: { _id: null, total: { $sum: '$price' } } }
        ]),
        Appointment.aggregate([
          { $match: { mechanicId: new Types.ObjectId(mechanicId as string), status: { $in: ['completed', 'paid'] } } },
          { $match: { appointmentDate: { $gte: monthStart, $lte: monthEnd } } },
          { $group: { _id: null, total: { $sum: '$price' } } }
        ]),
        Appointment.aggregate([
          { $match: { mechanicId: new Types.ObjectId(mechanicId as string), status: { $in: ['completed', 'paid'] } } },
          { $match: { appointmentDate: { $gte: yearStart, $lte: yearEnd } } },
          { $group: { _id: null, total: { $sum: '$price' } } }
        ]),
        Appointment.aggregate([
          { $match: { mechanicId: new Types.ObjectId(mechanicId as string), status: { $in: ['completed', 'paid'] } } },
          { $match: { appointmentDate: { $gte: allTimeStart } } },
          { $group: { _id: null, total: { $sum: '$price' } } }
        ]),
        Appointment.countDocuments({ mechanicId: new Types.ObjectId(mechanicId as string), status: { $in: ['completed', 'paid'] } })
      ]);

      const summary = {
        today: todayEarnings[0]?.total || 0,
        week: weekEarnings[0]?.total || 0,
        month: monthEarnings[0]?.total || 0,
        year: yearEarnings[0]?.total || 0,
        totalJobs,
        averagePerJob: totalJobs > 0 ? Math.round((allTimeEarnings[0]?.total || 0) / totalJobs) : 0
      };

      console.log('🔍 Kazanç Özeti API - Hesaplanan özet:', summary);
      console.log('🔍 Kazanç Özeti API - Raw data:', {
        todayEarnings,
        weekEarnings,
        monthEarnings,
        yearEarnings,
        allTimeEarnings,
        totalJobs
      });

      return sendResponse(res, 200, 'Kazanç özeti başarıyla getirildi', summary);
    } catch (error) {
      console.error('❌ getEarningsSummary error:', error);
      console.error('❌ Error details:', {
        message: (error as any).message,
        stack: (error as any).stack,
        name: (error as any).name
      });
      return sendResponse(res, 500, 'Sunucu hatası');
    }
  }

  /**
   * Kazanç detayı
   */
  static async getEarningsBreakdown(req: Request, res: Response) {
    try {
      const { period } = req.query;

      // TODO: Implement earnings breakdown logic
      const mockBreakdown = {
        period: period || 'month',
        categories: [
          {
            name: 'Motor Bakımı',
            amount: 4500,
            count: 15
          },
          {
            name: 'Fren Sistemi',
            amount: 3200,
            count: 12
          },
          {
            name: 'Elektrik',
            amount: 2800,
            count: 8
          }
        ],
        total: 10500
      };

      return sendResponse(res, 200, 'Kazanç detayı başarıyla getirildi', mockBreakdown);
    } catch (error) {
      console.error('getEarningsBreakdown error:', error);
      return sendResponse(res, 500, 'Sunucu hatası');
    }
  }

  /**
   * Kazanç işlemleri
   */
  static async getTransactions(req: Request, res: Response) {
    try {
      console.log('🔍 getTransactions called with:', {
        query: req.query,
        user: req.user,
        userId: req.user?.userId,
        mechanicId: req.params.mechanicId
      });

      const { page = 1, limit = 10, type } = req.query;
      const mechanicId = req.params.mechanicId || req.user?.userId;

      if (!mechanicId) {
        console.log('❌ No mechanicId found in getTransactions');
        return sendResponse(res, 400, 'Mekanik ID gerekli');
      }

      console.log('✅ Using mechanicId in getTransactions:', mechanicId);

      // Gerçek işlemleri getir
      const appointments = await Appointment.find({
        mechanicId: new Types.ObjectId(mechanicId as string),
        status: { $in: ['completed', 'paid'] }
      })
      .populate('userId', 'name surname')
      .populate('vehicleId', 'brand modelName plateNumber')
      .sort({ appointmentDate: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

      const total = await Appointment.countDocuments({
        mechanicId: new Types.ObjectId(mechanicId as string),
        status: { $in: ['completed', 'paid'] }
      });

      const transactions = appointments.map(apt => ({
        id: (apt._id as any).toString(),
        type: 'income',
        amount: apt.price || 0,
        description: `${apt.serviceType} - ${(apt.userId as any)?.name || 'Bilinmeyen'} ${(apt.userId as any)?.surname || 'Müşteri'}`,
        date: apt.appointmentDate,
        status: apt.status,
        vehicleInfo: apt.vehicleId ? `${(apt.vehicleId as any)?.brand} ${(apt.vehicleId as any)?.modelName} (${(apt.vehicleId as any)?.plateNumber})` : 'Araç bilgisi yok'
      }));

      console.log('🔍 İşlemler API - Bulunan işlemler:', transactions.length);

      return sendResponse(res, 200, 'İşlemler başarıyla getirildi', {
        transactions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total
        }
      });
    } catch (error) {
      console.error('❌ getTransactions error:', error);
      console.error('❌ Error details:', {
        message: (error as any).message,
        stack: (error as any).stack,
        name: (error as any).name
      });
      return sendResponse(res, 500, 'Sunucu hatası');
    }
  }

  /**
   * Para çekme talebi
   */
  static async requestWithdrawal(req: Request, res: Response) {
    try {
      const { amount, bankAccount, notes } = req.body;

      // TODO: Implement withdrawal request logic
      console.log(`Withdrawal request: ${amount} TL to ${bankAccount.bankName}`);

      const mockWithdrawal = {
        id: Date.now().toString(),
        amount,
        bankAccount,
        notes,
        status: 'pending',
        requestDate: new Date()
      };

      return sendResponse(res, 200, 'Para çekme talebi başarıyla oluşturuldu', mockWithdrawal);
    } catch (error) {
      console.error('requestWithdrawal error:', error);
      return sendResponse(res, 500, 'Sunucu hatası');
    }
  }

  /**
   * Para çekme talepleri
   */
  static async getWithdrawals(req: Request, res: Response) {
    try {
      const { status } = req.query;

      // TODO: Implement withdrawals logic
      const mockWithdrawals = [
        {
          id: '1',
          amount: 5000,
          bankAccount: {
            bankName: 'Garanti BBVA',
            accountNumber: '****1234'
          },
          status: 'pending',
          requestDate: new Date(Date.now() - 86400000),
          notes: 'Acil ihtiyaç'
        },
        {
          id: '2',
          amount: 3000,
          bankAccount: {
            bankName: 'İş Bankası',
            accountNumber: '****5678'
          },
          status: 'completed',
          requestDate: new Date(Date.now() - 172800000),
          completedDate: new Date(Date.now() - 86400000)
        }
      ];

      return sendResponse(res, 200, 'Para çekme talepleri başarıyla getirildi', mockWithdrawals);
    } catch (error) {
      console.error('getWithdrawals error:', error);
      return sendResponse(res, 500, 'Sunucu hatası');
    }
  }
}
