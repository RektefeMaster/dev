import { Request, Response } from 'express';
import { sendResponse } from '../utils/response';
import MaintenanceAppointment from '../models/MaintenanceAppointment';
import { Types } from 'mongoose';

export class MechanicEarningsController {
  /**
   * Ustanın kazançlarını getir
   */
  static async getEarnings(req: Request, res: Response) {
    try {
      const { period = 'month', startDate, endDate } = req.query;
      const mechanicId = req.params.mechanicId || req.user?.id;

      if (!mechanicId) {
        return sendResponse(res, 400, 'Mekanik ID gerekli');
      }

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

      // Randevuları getir
      const appointments = await MaintenanceAppointment.find({
        mechanicId: new Types.ObjectId(mechanicId as string),
        appointmentDate: { $gte: start, $lte: end },
        status: { $in: ['completed', 'paid'] }
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
        customer: `${apt.userId?.name || 'Bilinmeyen'} ${apt.userId?.surname || 'Müşteri'}`,
        status: apt.status,
        appointmentId: apt._id,
        vehicleInfo: apt.vehicleId ? `${apt.vehicleId.brand} ${apt.vehicleId.modelName} (${apt.vehicleId.plateNumber})` : 'Araç bilgisi yok'
      }));

      console.log('🔍 Kazanç API - Hesaplanan kazançlar:', earnings);

      return sendResponse(res, 200, 'Kazanç bilgileri başarıyla getirildi', earnings);
    } catch (error) {
      console.error('getEarnings error:', error);
      return sendResponse(res, 500, 'Sunucu hatası');
    }
  }

  /**
   * Kazanç özeti
   */
  static async getEarningsSummary(req: Request, res: Response) {
    try {
      const mechanicId = req.params.mechanicId || req.user?.id;

      if (!mechanicId) {
        return sendResponse(res, 400, 'Mekanik ID gerekli');
      }

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
        MaintenanceAppointment.aggregate([
          { $match: { mechanicId: new Types.ObjectId(mechanicId as string), status: { $in: ['completed', 'paid'] } } },
          { $match: { appointmentDate: { $gte: todayStart, $lte: todayEnd } } },
          { $group: { _id: null, total: { $sum: '$price' } } }
        ]),
        MaintenanceAppointment.aggregate([
          { $match: { mechanicId: new Types.ObjectId(mechanicId as string), status: { $in: ['completed', 'paid'] } } },
          { $match: { appointmentDate: { $gte: weekStart, $lte: weekEnd } } },
          { $group: { _id: null, total: { $sum: '$price' } } }
        ]),
        MaintenanceAppointment.aggregate([
          { $match: { mechanicId: new Types.ObjectId(mechanicId as string), status: { $in: ['completed', 'paid'] } } },
          { $match: { appointmentDate: { $gte: monthStart, $lte: monthEnd } } },
          { $group: { _id: null, total: { $sum: '$price' } } }
        ]),
        MaintenanceAppointment.aggregate([
          { $match: { mechanicId: new Types.ObjectId(mechanicId as string), status: { $in: ['completed', 'paid'] } } },
          { $match: { appointmentDate: { $gte: yearStart, $lte: yearEnd } } },
          { $group: { _id: null, total: { $sum: '$price' } } }
        ]),
        MaintenanceAppointment.aggregate([
          { $match: { mechanicId: new Types.ObjectId(mechanicId as string), status: { $in: ['completed', 'paid'] } } },
          { $match: { appointmentDate: { $gte: allTimeStart } } },
          { $group: { _id: null, total: { $sum: '$price' } } }
        ]),
        MaintenanceAppointment.countDocuments({ mechanicId: new Types.ObjectId(mechanicId as string), status: { $in: ['completed', 'paid'] } })
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
      console.error('getEarningsSummary error:', error);
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
      const { page = 1, limit = 10, type } = req.query;

      // TODO: Implement transactions logic
      const mockTransactions = [
        {
          id: '1',
          type: 'income',
          amount: 450,
          description: 'Motor Bakımı - Ahmet Yılmaz',
          date: new Date(),
          status: 'completed'
        },
        {
          id: '2',
          type: 'income',
          amount: 300,
          description: 'Fren Tamiri - Mehmet Demir',
          date: new Date(Date.now() - 86400000),
          status: 'completed'
        }
      ];

      return sendResponse(res, 200, 'İşlemler başarıyla getirildi', {
        transactions: mockTransactions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: 156
        }
      });
    } catch (error) {
      console.error('getTransactions error:', error);
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
