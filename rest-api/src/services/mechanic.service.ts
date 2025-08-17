import { Mechanic, IMechanic } from '../models/Mechanic';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { CustomError } from '../middleware/errorHandler';

export class MechanicService {
  /**
   * Mekanik profili oluştur veya güncelle
   */
  static async createOrUpdateProfile(profileData: Partial<IMechanic>, userId: string): Promise<IMechanic> {
    try {
      // Kullanıcının var olduğunu ve mechanic olduğunu kontrol et
      const user = await User.findById(userId);
      if (!user) {
        throw new CustomError('Kullanıcı bulunamadı', 404);
      }
      if (user.userType !== 'mechanic') {
        throw new CustomError('Sadece mekanik kullanıcılar profil oluşturabilir', 403);
      }

      // Mevcut profili bul veya yeni oluştur
      let mechanic = await Mechanic.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      
      if (mechanic) {
        // Mevcut profili güncelle
        const updatedMechanic = await Mechanic.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(userId) },
          profileData,
          { new: true, runValidators: true }
        );
        if (!updatedMechanic) {
          throw new CustomError('Mekanik profili güncellenirken hata oluştu', 500);
        }
        return updatedMechanic;
      } else {
        // Yeni profil oluştur
        mechanic = new Mechanic({
          ...profileData,
          userId: new mongoose.Types.ObjectId(userId)
        });
        await mechanic.save();
        return mechanic;
      }
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Mekanik profili oluşturulurken hata oluştu', 500);
    }
  }

  /**
   * Mekanik profilini getir
   */
  static async getProfile(userId: string): Promise<IMechanic> {
    try {
      const mechanic = await Mechanic.findOne({ userId: new mongoose.Types.ObjectId(userId) })
        .populate('userId', 'name surname email avatar');

      if (!mechanic) {
        throw new CustomError('Mekanik profili bulunamadı', 404);
      }

      return mechanic;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Mekanik profili getirilirken hata oluştu', 500);
    }
  }

  /**
   * Tüm mekanikleri getir
   */
  static async getAllMechanics(): Promise<IMechanic[]> {
    try {
      const mechanics = await Mechanic.find()
        .populate('userId', 'name surname email avatar')
        .sort({ rating: -1, createdAt: -1 });
      
      return mechanics;
    } catch (error) {
      throw new CustomError('Mekanikler getirilirken hata oluştu', 500);
    }
  }

  /**
   * Mekanik arama
   */
  static async searchMechanics(searchTerm: string, city?: string): Promise<IMechanic[]> {
    try {
      const searchQuery: any = {
        $or: [
          { 'userId.name': { $regex: searchTerm, $options: 'i' } },
          { 'userId.surname': { $regex: searchTerm, $options: 'i' } },
          { specialization: { $regex: searchTerm, $options: 'i' } },
          { city: { $regex: searchTerm, $options: 'i' } }
        ]
      };

      if (city) {
        searchQuery.city = { $regex: city, $options: 'i' };
      }

      const mechanics = await Mechanic.find(searchQuery)
        .populate('userId', 'name surname email avatar')
        .sort({ rating: -1, createdAt: -1 });

      return mechanics;
    } catch (error) {
      throw new CustomError('Mekanik arama yapılırken hata oluştu', 500);
    }
  }

  /**
   * Mekanik müsaitlik durumunu güncelle
   */
  static async updateAvailability(userId: string, isAvailable: boolean): Promise<IMechanic> {
    try {
      const mechanic = await Mechanic.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId) },
        { isAvailable },
        { new: true, runValidators: true }
      );

      if (!mechanic) {
        throw new CustomError('Mekanik profili bulunamadı', 404);
      }

      return mechanic;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Müsaitlik durumu güncellenirken hata oluştu', 500);
    }
  }

  /**
   * Mekanik puanını güncelle
   */
  static async updateRating(userId: string, newRating: number): Promise<IMechanic> {
    try {
      if (newRating < 1 || newRating > 5) {
        throw new CustomError('Puan 1-5 arasında olmalıdır', 400);
      }

      const mechanic = await Mechanic.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      if (!mechanic) {
        throw new CustomError('Mekanik profili bulunamadı', 404);
      }

      // Yeni puanı hesapla
      const totalRating = (mechanic.rating * mechanic.ratingCount) + newRating;
      const newRatingCount = mechanic.ratingCount + 1;
      const averageRating = totalRating / newRatingCount;

      const updatedMechanic = await Mechanic.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId) },
        { 
          rating: averageRating,
          ratingCount: newRatingCount
        },
        { new: true, runValidators: true }
      );

      if (!updatedMechanic) {
        throw new CustomError('Mekanik profili güncellenirken hata oluştu', 500);
      }

      return updatedMechanic;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Puan güncellenirken hata oluştu', 500);
    }
  }

  /**
   * Şehir bazında mekanikleri getir
   */
  static async getMechanicsByCity(city: string): Promise<IMechanic[]> {
    try {
      const mechanics = await Mechanic.find({ city: { $regex: city, $options: 'i' } })
        .populate('userId', 'name surname email avatar')
        .sort({ rating: -1, isAvailable: -1 });
      
      return mechanics;
    } catch (error) {
      throw new CustomError('Şehir bazında mekanikler getirilirken hata oluştu', 500);
    }
  }

  /**
   * Uzmanlık alanına göre mekanikleri getir
   */
  static async getMechanicsBySpecialization(specialization: string): Promise<IMechanic[]> {
    try {
      const mechanics = await Mechanic.find({ 
        specialization: { $regex: specialization, $options: 'i' } 
      })
        .populate('userId', 'name surname email avatar')
        .sort({ rating: -1, isAvailable: -1 });
      
      return mechanics;
    } catch (error) {
      throw new CustomError('Uzmanlık alanına göre mekanikler getirilirken hata oluştu', 500);
    }
  }
}
