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

      const { period = 'month', startDate, endDate } = req.query;
      const mechanicId = req.params.mechanicId || req.user?.userId;

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

      // Randevuları getir - Tüm aktif status'ları dahil et
      const appointments = await Appointment.find({
        mechanicId: new Types.ObjectId(mechanicId as string),
        appointmentDate: { $gte: start, $lte: end },
        status: { $in: ['PLANLANDI', 'TAMAMLANDI', 'SERVISTE'] }
      }).populate('userId', 'name surname').populate('vehicleId', 'brand modelName plateNumber');

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

      return sendResponse(res, 200, 'Kazanç bilgileri başarıyla getirildi', earnings);
    } catch (error) {
      // Error handling - log in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Earnings error:', {
          message: (error as any).message,
          stack: (error as any).stack,
          name: (error as any).name
        });
      }
      return sendResponse(res, 500, 'Sunucu hatası');
    }
  }

  /**
   * Kazanç özeti
   */
  static async getEarningsSummary(req: Request, res: Response) {
    try {
      const mechanicId = req.params.mechanicId || req.user?.userId;

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

      // Single optimized aggregate query - Performance fix
      const [earningsSummary] = await Appointment.aggregate([
        {
          $match: {
            mechanicId: new Types.ObjectId(mechanicId as string),
            status: 'TAMAMLANDI',
            price: { $exists: true, $gt: 0 }
          }
        },
        {
          $group: {
            _id: null,
            totalJobs: { $sum: 1 },
            allTimeEarnings: { $sum: '$price' },
            todayEarnings: {
              $sum: {
                $cond: [
                  { $and: [
                    { $gte: ['$appointmentDate', todayStart] },
                    { $lte: ['$appointmentDate', todayEnd] }
                  ]},
                  '$price',
                  0
                ]
              }
            },
            weekEarnings: {
              $sum: {
                $cond: [
                  { $and: [
                    { $gte: ['$appointmentDate', weekStart] },
                    { $lte: ['$appointmentDate', weekEnd] }
                  ]},
                  '$price',
                  0
                ]
              }
            },
            monthEarnings: {
              $sum: {
                $cond: [
                  { $and: [
                    { $gte: ['$appointmentDate', monthStart] },
                    { $lte: ['$appointmentDate', monthEnd] }
                  ]},
                  '$price',
                  0
                ]
              }
            },
            yearEarnings: {
              $sum: {
                $cond: [
                  { $and: [
                    { $gte: ['$appointmentDate', yearStart] },
                    { $lte: ['$appointmentDate', yearEnd] }
                  ]},
                  '$price',
                  0
                ]
              }
            }
          }
        }
      ]);

      const summary = {
        today: earningsSummary?.todayEarnings || 0,
        week: earningsSummary?.weekEarnings || 0,
        month: earningsSummary?.monthEarnings || 0,
        year: earningsSummary?.yearEarnings || 0,
        totalJobs: earningsSummary?.totalJobs || 0,
        averagePerJob: earningsSummary?.totalJobs > 0 
          ? Math.round((earningsSummary?.allTimeEarnings || 0) / earningsSummary.totalJobs) 
          : 0
      };

      return sendResponse(res, 200, 'Kazanç özeti başarıyla getirildi', summary);
    } catch (error) {
      // Error handled silently in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Earnings summary error:', {
          message: (error as any).message,
          stack: (error as any).stack,
          name: (error as any).name
        });
      }
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
      return sendResponse(res, 500, 'Sunucu hatası');
    }
  }

  /**
   * Kazanç işlemleri
   */
  static async getTransactions(req: Request, res: Response) {
    try {

      const { page = 1, limit = 10, type } = req.query;
      const mechanicId = req.params.mechanicId || req.user?.userId;

      if (!mechanicId) {
        return sendResponse(res, 400, 'Mekanik ID gerekli');
      }

      // Gerçek işlemleri getir
      const appointments = await Appointment.find({
        mechanicId: new Types.ObjectId(mechanicId as string),
        status: { $in: ['TAMAMLANDI'] }
      })
      .populate('userId', 'name surname')
      .populate('vehicleId', 'brand modelName plateNumber')
      .sort({ appointmentDate: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

      const total = await Appointment.countDocuments({
        mechanicId: new Types.ObjectId(mechanicId as string),
        status: { $in: ['TAMAMLANDI'] }
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

      return sendResponse(res, 200, 'İşlemler başarıyla getirildi', {
        transactions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total
        }
      });
    } catch (error) {
      // Error handled silently in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Earnings breakdown error:', {
          message: (error as any).message,
          stack: (error as any).stack,
          name: (error as any).name
        });
      }
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
          status: 'TAMAMLANDI',
          requestDate: new Date(Date.now() - 172800000),
          completedDate: new Date(Date.now() - 86400000)
        }
      ];

      return sendResponse(res, 200, 'Para çekme talepleri başarıyla getirildi', mockWithdrawals);
    } catch (error) {
      return sendResponse(res, 500, 'Sunucu hatası');
    }
  }
}
