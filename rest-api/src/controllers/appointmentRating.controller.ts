import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AppointmentRating } from '../models/AppointmentRating';
import { Appointment } from '../models/Appointment';
import { Mechanic } from '../models/Mechanic';
import { User } from '../models/User';
import { sendNotificationToUser } from '../utils/socketNotifications';
import { sendResponse } from '../utils/response';
import { AppointmentStatus } from '../../../shared/types/enums';

export class AppointmentRatingController {
  /**
   * Şoförün usta puanlaması oluştur
   */
  static async createRating(req: Request, res: Response) {
    try {
      // appointmentId params veya body'den gelebilir
      const appointmentId = req.params.appointmentId || req.body.appointmentId;
      const { rating, comment, mechanicId: mechanicIdFromBody } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz puan. 1-5 arası olmalıdır'
        });
      }

      // Daha önce puan verilip verilmediğini kontrol et
      const existingRating = await AppointmentRating.findOne({
        appointmentId,
        userId
      });

      if (existingRating) {
        return res.status(400).json({
          success: false,
          message: 'Bu randevu için zaten puan verdiniz'
        });
      }

      // İlgili randevuyu doğrula ve mekanik bilgisini randevudan al
      const appointment = await Appointment.findById(appointmentId).populate('mechanicId', '_id').lean(); // 🚀 OPTIMIZE
      if (!appointment) {
        return res.status(404).json({ success: false, message: 'Randevu bulunamadı' });
      }

      if (appointment.userId.toString() !== userId) {
        return res.status(403).json({ success: false, message: 'Bu randevu için puan veremezsiniz' });
      }
      
      // Mekanik ID'sini al - önce randevudan, sonra body'den
      let mechanicId = '';
      if (appointment.mechanicId) {
        // Populate edilmiş mechanicId'den sadece _id'yi al
        if (typeof appointment.mechanicId === 'object' && appointment.mechanicId._id) {
          mechanicId = appointment.mechanicId._id.toString();
        } else {
          mechanicId = appointment.mechanicId.toString();
        }
      } else if (mechanicIdFromBody) {
        mechanicId = mechanicIdFromBody;
      }
      
      if (!mechanicId) {
        return res.status(400).json({ success: false, message: 'Mekanik bilgisi bulunamadı' });
      }

      // Yeni puan oluştur
      const newRating = new AppointmentRating({
        appointmentId,
        userId,
        mechanicId,
        rating,
        comment: comment || '',
        createdAt: new Date()
      });

      await newRating.save();

      // Ustanın ortalama puanını güncelle
      await AppointmentRatingController.updateMechanicAverageRating(mechanicId);

      // Ödeme sonrası başarı bildirimi ve randevu işaretleme
      try {
        // Randevu durumunu güncelle
        appointment.status = AppointmentStatus.COMPLETED; // Tamamlandı olarak işaretle
        await appointment.save();

        // Wallet transaction oluştur (eğer daha önce oluşturulmadıysa)
        try {
          const Wallet = require('../models/Wallet').Wallet;
          const mechanicWallet = await Wallet.findOne({ userId: mechanicId });
          
          // Bu appointment için daha önce transaction oluşturulmuş mu kontrol et
          const existingTransaction = mechanicWallet?.transactions?.find((t: any) => 
            t.appointmentId && t.appointmentId.toString() === appointment._id.toString()
          );

          if (!existingTransaction && appointment.price && appointment.price > 0) {
            const transaction = {
              type: 'credit' as const,
              amount: appointment.price,
              description: `İş tamamlandı - ${(appointment.userId as any).name || 'Müşteri'}`,
              date: new Date(),
              status: 'completed' as const,
              appointmentId: appointment._id
            };

            await Wallet.findOneAndUpdate(
              { userId: mechanicId },
              {
                $inc: { balance: appointment.price },
                $push: { transactions: transaction },
                $setOnInsert: { userId: mechanicId, createdAt: new Date() }
              },
              { upsert: true, new: true }
            );

            console.log(`✅ Wallet transaction created for appointment ${appointment._id}`);
          }
        } catch (walletError) {
          console.error('Wallet transaction oluşturma hatası:', walletError);
          // Wallet hatası rating işlemini durdurmaz
        }

        // Ustaya bildirim gönder
        sendNotificationToUser(mechanicId.toString(), {
          type: 'appointment_status_update',
          title: 'Yeni Değerlendirme',
          message: 'Bir müşteri işinizi değerlendirdi ve ödeme tamamlandı.',
          appointmentId: appointment._id,
          status: 'completed',
          timestamp: new Date(),
          read: false,
          _id: Date.now().toString()
        });

      } catch (notifyErr) {
        }

      sendResponse(res, 201, { 
        rating: newRating,
        message: 'Değerlendirmeniz kaydedildi ve ustanın puanı güncellendi'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Puanlama oluşturulurken hata oluştu',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * Ustanın ortalama puanını getir
   */
  static async getMechanicRating(req: Request, res: Response) {
    try {
      const { mechanicId } = req.params;

      const result = await AppointmentRating.aggregate([
        { $match: { mechanicId: new mongoose.Types.ObjectId(mechanicId) } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalRatings: { $sum: 1 },
            ratingDistribution: {
              $push: '$rating'
            }
          }
        }
      ]);

      if (result.length === 0) {
        return sendResponse(res, 200, {
          averageRating: 0,
          totalRatings: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        });
      }

      const { averageRating, totalRatings, ratingDistribution } = result[0];
      
      // Puan dağılımını hesapla
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratingDistribution.forEach((rating: number) => {
        distribution[rating as keyof typeof distribution]++;
      });

      sendResponse(res, 200, {
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings,
        ratingDistribution: distribution
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Usta puanı getirilirken hata oluştu'
      });
    }
  }

  /**
   * Ustanın tüm puanlarını getir
   */
  static async getMechanicRatings(req: Request, res: Response) {
    try {
      const { mechanicId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const ratings = await AppointmentRating.find({ mechanicId: new mongoose.Types.ObjectId(mechanicId) })
        .populate('userId', 'name surname')
        .populate('appointmentId', 'serviceType appointmentDate')
        .select('_id appointmentId userId mechanicId rating comment createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(); // 🚀 OPTIMIZE: Memory optimization

      // Null userId'li rating'leri filtrele
      const validRatings = ratings.filter(rating => {
        if (!rating.userId) {
          return false;
        }
        return true;
      });

      const total = await AppointmentRating.countDocuments({ mechanicId: new mongoose.Types.ObjectId(mechanicId) });

      sendResponse(res, 200, {
        ratings: validRatings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Usta puanları getirilirken hata oluştu'
      });
    }
  }

  /**
   * Şoförün verdiği puanları getir
   */
  static async getMyRatings(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      // Önce populate olmadan deneyelim
      const ratings = await AppointmentRating.find({ userId: new mongoose.Types.ObjectId(userId) })
        .select('_id appointmentId mechanicId rating comment createdAt')
        .sort({ createdAt: -1 });

      if (ratings.length > 0) {
  
      }

      // Şimdi populate işlemini ayrı ayrı yapalım
      const populatedRatings = [];
      
      for (const rating of ratings) {
        try {
          // Appointment bilgilerini populate et
          const appointment = await Appointment.findById(rating.appointmentId)
            .select('serviceType appointmentDate vehicleId')
            .populate('vehicleId', 'brand modelName plateNumber');
          
          // Mechanic bilgilerini populate et - Mechanic model'inde user bilgileri direkt var
          const mechanic = await Mechanic.findById(rating.mechanicId)
            .select('shopName name surname');
          
          const populatedRating = {
            _id: rating._id,
            rating: rating.rating,
            comment: rating.comment,
            createdAt: rating.createdAt,
            appointmentId: appointment,
            mechanicId: {
              _id: mechanic?._id || '',
              shopName: mechanic?.shopName || '',
              userId: {
                name: mechanic?.name || '',
                surname: mechanic?.surname || ''
              }
            }
          };
          
          populatedRatings.push(populatedRating);
        } catch (populateError) {
          // Populate hatası olsa bile rating'i ekle
          populatedRatings.push(rating);
        }
      }

      sendResponse(res, 200, {
        ratings: populatedRatings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Puanlarınız getirilirken hata oluştu'
      });
    }
  }

  /**
   * Ustanın ortalama puanını güncelle
   */
  static async updateMechanicAverageRating(mechanicId: string) {
    try {
      if (!mechanicId || typeof mechanicId !== 'string') {
        return;
      }

      const result = await AppointmentRating.aggregate([
        { $match: { mechanicId: new mongoose.Types.ObjectId(mechanicId) } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalRatings: { $sum: 1 }
          }
        }
      ]);

      if (result.length > 0) {
        const { averageRating, totalRatings } = result[0] as { averageRating: number; totalRatings: number };

        const updatedRating = Math.round(averageRating * 10) / 10;
        
        // Hem Mechanic hem User modelinde güncelle
        await Mechanic.updateOne({ _id: mechanicId }, {
          $set: { rating: updatedRating, ratingCount: totalRatings }
        });
        
        await User.updateOne({ _id: mechanicId, userType: 'mechanic' }, {
          $set: { rating: updatedRating, ratingCount: totalRatings }
        });
  
      } else {
        // Hiç puan yoksa sıfırla
        await Mechanic.updateOne({ _id: mechanicId }, { $set: { rating: 0, ratingCount: 0 } });
        await User.updateOne({ _id: mechanicId, userType: 'mechanic' }, { $set: { rating: 0, ratingCount: 0 } });
  
      }
    } catch (error) {
      }
  }

  /**
   * Mevcut usta için istatistikleri getir
   */
  static async getCurrentMechanicStats(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      // User'ı bul
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı'
        });
      }

      // Eğer kullanıcı mechanic değilse boş istatistik döndür
      if (user.userType !== 'mechanic') {
        return res.status(200).json({
          success: true,
          data: {
            averageRating: 0,
            totalRatings: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
          }
        });
      }

      // User ID ile direkt arama yap (yeni sistemde mechanicId = userId)
      const ratings = await AppointmentRating.find({ mechanicId: userId });
      
      if (ratings.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            averageRating: 0,
            totalRatings: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
          }
        });
      }

      const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = totalRating / ratings.length;

      // Puan dağılımını hesapla
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratings.forEach(r => {
        ratingDistribution[r.rating as keyof typeof ratingDistribution]++;
      });

      res.status(200).json({
        success: true,
        data: {
          averageRating: Math.round(averageRating * 10) / 10,
          totalRatings: ratings.length,
          ratingDistribution
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'İstatistikler getirilirken hata oluştu'
      });
    }
  }

  /**
   * Mevcut usta için son puanları getir
   */
  static async getCurrentMechanicRecentRatings(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      // User'ı bul
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı'
        });
      }

      // Eğer kullanıcı mechanic değilse boş array döndür
      if (user.userType !== 'mechanic') {
        return res.status(200).json({
          success: true,
          data: []
        });
      }

      // User ID ile direkt arama yap (yeni sistemde mechanicId = userId)
      const recentRatings = await AppointmentRating.find({ mechanicId: userId })
        .populate('userId', 'name surname')
        .populate('appointmentId', 'serviceType appointmentDate')
        .sort({ createdAt: -1 })
        .limit(10);

      const formattedRatings = recentRatings.map(rating => ({
        id: rating._id,
        rating: rating.rating,
        comment: rating.comment,
        createdAt: rating.createdAt,
        customer: {
          name: (rating.userId as any)?.name || 'Bilinmeyen',
          surname: (rating.userId as any)?.surname || 'Müşteri'
        },
        appointment: {
          serviceType: (rating.appointmentId as any)?.serviceType || 'Bilinmeyen',
          date: (rating.appointmentId as any)?.appointmentDate || 'Bilinmeyen'
        }
      }));

      res.status(200).json({
        success: true,
        data: formattedRatings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Son puanlar getirilirken hata oluştu'
      });
    }
  }
}
