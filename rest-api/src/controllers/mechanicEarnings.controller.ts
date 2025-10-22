import { Request, Response } from 'express';
import { sendResponse } from '../utils/response';
import { Appointment } from '../models/Appointment';
import { Types } from 'mongoose';
import WithdrawalRequest from '../models/WithdrawalRequest';

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
      }).populate('userId', 'name surname').populate('vehicleId', 'brand modelName plateNumber').lean(); // 🚀 OPTIMIZE

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

      return sendResponse(res, 200, earnings);
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

      return sendResponse(res, 200, summary);
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

      return sendResponse(res, 200, mockBreakdown);
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

      return sendResponse(res, 200, {
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

      return sendResponse(res, 200, mockWithdrawal);
    } catch (error) {
      return sendResponse(res, 500, 'Sunucu hatası');
    }
  }

  /**
   * Para çekme talepleri
   */
  static async getWithdrawals(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId || (req as any).userId;
      const { status } = req.query;

      if (!userId) {
        return sendResponse(res, 401, 'Kullanıcı kimliği bulunamadı');
      }

      // Gerçek para çekme taleplerini getir
      const query: any = { mechanicId: userId };
      if (status && status !== 'all') {
        query.status = status;
      }

      const withdrawals = await WithdrawalRequest.find(query)
        .sort({ requestDate: -1 })
        .lean();

      return sendResponse(res, 200, withdrawals);
    } catch (error) {
      return sendResponse(res, 500, 'Sunucu hatası');
    }
  }
}
