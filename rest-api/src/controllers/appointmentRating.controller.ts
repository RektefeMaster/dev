import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AppointmentRating } from '../models/AppointmentRating';
import { Appointment } from '../models/Appointment';
import { Mechanic } from '../models/Mechanic';
import { sendNotificationToUser } from '../index';
import { sendResponse } from '../utils/response';

export class AppointmentRatingController {
  /**
   * Şoförün usta puanlaması oluştur
   */
  static async createRating(req: Request, res: Response) {
    try {
      const { appointmentId } = req.params;
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
      const appointment = await Appointment.findById(appointmentId).populate('mechanicId', '_id');
      if (!appointment) {
        console.error(`❌ Appointment ${appointmentId} bulunamadı!`);
        return res.status(404).json({ success: false, message: 'Randevu bulunamadı' });
      }
      
      console.log(`✅ Appointment bulundu: ${appointment._id}, Status: ${appointment.status}, User: ${appointment.userId}`);
      
      if (appointment.userId.toString() !== userId) {
        console.error(`❌ User ${userId} bu appointment ${appointmentId} için yetkisiz!`);
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
      console.log(`🔍 Usta ${mechanicId} için rating güncelleniyor...`);
      await AppointmentRatingController.updateMechanicAverageRating(mechanicId);
      console.log(`✅ Usta ${mechanicId} rating güncellemesi tamamlandı`);

      // Ödeme sonrası başarı bildirimi ve randevu işaretleme
      try {
        // Randevu durumunu güncelle
        appointment.status = 'completed'; // Tamamlandı olarak işaretle
        await appointment.save();

        console.log(`✅ Randevu ${appointmentId} tamamlandı ve ödeme işaretlendi`);

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

        console.log(`✅ Usta ${mechanicId} için bildirim gönderildi`);
      } catch (notifyErr) {
        console.error('Ödeme işaretleme/bildirim hatası:', notifyErr);
      }

      console.log(`✅ Puanlama başarıyla kaydedildi: Randevu ${appointmentId}, Usta ${mechanicId}, Puan ${rating}`);
      sendResponse(res, 201, 'Puanlama başarıyla kaydedildi', { 
        rating: newRating,
        message: 'Değerlendirmeniz kaydedildi ve ustanın puanı güncellendi'
      });
    } catch (error) {
      console.error('Puanlama oluşturulurken hata:', error);
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
        return sendResponse(res, 200, 'Henüz puan verilmemiş', {
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

      sendResponse(res, 200, 'Usta puanı başarıyla getirildi', {
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings,
        ratingDistribution: distribution
      });
    } catch (error) {
      console.error('Usta puanı getirilirken hata:', error);
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
        .limit(limit);

      console.log(`🔍 Usta ${mechanicId} için ${ratings.length} değerlendirme bulundu`);

      // Null userId'li rating'leri filtrele
      const validRatings = ratings.filter(rating => {
        if (!rating.userId) {
          console.warn('Rating userId null:', rating._id);
          return false;
        }
        return true;
      });

      console.log(`✅ ${validRatings.length} geçerli rating (${ratings.length} toplam)`);

      const total = await AppointmentRating.countDocuments({ mechanicId: new mongoose.Types.ObjectId(mechanicId) });

      sendResponse(res, 200, 'Usta puanları başarıyla getirildi', {
        ratings: validRatings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Usta puanları getirilirken hata:', error);
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

      console.log(`🔍 Şoför ${userId} için rating aranıyor...`);

      // Önce populate olmadan deneyelim
      const ratings = await AppointmentRating.find({ userId: new mongoose.Types.ObjectId(userId) })
        .select('_id appointmentId mechanicId rating comment createdAt')
        .sort({ createdAt: -1 });

      console.log(`🔍 Şoför ${userId} için ${ratings.length} puan bulundu (populate olmadan)`);

      if (ratings.length > 0) {
        console.log('🔍 İlk rating örneği:', JSON.stringify(ratings[0], null, 2));
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
          console.error(`❌ Rating ${rating._id} populate hatası:`, populateError);
          // Populate hatası olsa bile rating'i ekle
          populatedRatings.push(rating);
        }
      }

      console.log(`🔍 Populate edilmiş rating sayısı: ${populatedRatings.length}`);
      
      if (populatedRatings.length > 0) {
        console.log('🔍 İlk populate edilmiş rating örneği:', JSON.stringify(populatedRatings[0], null, 2));
      }

      sendResponse(res, 200, 'Puanlarınız başarıyla getirildi', {
        ratings: populatedRatings
      });
    } catch (error) {
      console.error('Şoför puanları getirilirken hata:', error);
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
        console.error('Geçersiz mechanicId:', mechanicId);
        return;
      }

      console.log(`🔍 Usta ${mechanicId} için rating hesaplanıyor...`);

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

      console.log(`🔍 Aggregate sonucu:`, result);

      if (result.length > 0) {
        const { averageRating, totalRatings } = result[0] as { averageRating: number; totalRatings: number };
        console.log(`🔍 Hesaplanan rating: ${averageRating} (${totalRatings} puan)`);
        
        const updatedRating = Math.round(averageRating * 10) / 10;
        await Mechanic.updateOne({ _id: mechanicId }, {
          $set: { rating: updatedRating, ratingCount: totalRatings }
        });
        console.log(`✅ Usta ${mechanicId} puanı güncellendi: ${updatedRating}/5 (${totalRatings} puan)`);
      } else {
        // Hiç puan yoksa sıfırla
        await Mechanic.updateOne({ _id: mechanicId }, { $set: { rating: 0, ratingCount: 0 } });
        console.log(`✅ Usta ${mechanicId} puanı sıfırlandı`);
      }
    } catch (error) {
      console.error('Ortalama puan güncellenirken hata:', error);
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

      console.log('🔍 getCurrentMechanicStats - userId:', userId);

      // Usta bilgilerini getir - userId ile arama yap
      const mechanic = await Mechanic.findById(userId);
      if (!mechanic) {
        console.log('❌ getCurrentMechanicStats - Mechanic bulunamadı, userId:', userId);
        return res.status(404).json({
          success: false,
          message: 'Usta bulunamadı'
        });
      }

      console.log('✅ getCurrentMechanicStats - Mechanic bulundu:', mechanic._id);

      // Puan istatistiklerini hesapla
      const ratings = await AppointmentRating.find({ mechanicId: mechanic._id });
      
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
      console.error('Usta istatistikleri getirme hatası:', error);
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

      console.log('🔍 getCurrentMechanicRecentRatings - userId:', userId);

      // Usta bilgilerini getir - userId ile arama yap
      const mechanic = await Mechanic.findById(userId);
      if (!mechanic) {
        console.log('❌ getCurrentMechanicRecentRatings - Mechanic bulunamadı, userId:', userId);
        return res.status(404).json({
          success: false,
          message: 'Usta bulunamadı'
        });
      }

      console.log('✅ getCurrentMechanicRecentRatings - Mechanic bulundu:', mechanic._id);

      // Son 10 puanı getir
      const recentRatings = await AppointmentRating.find({ mechanicId: mechanic._id })
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
      console.error('Son puanları getirme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Son puanlar getirilirken hata oluştu'
      });
    }
  }
}
