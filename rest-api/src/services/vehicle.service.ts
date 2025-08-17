import { Vehicle, IVehicle } from '../models/Vehicle';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { CustomError } from '../middleware/errorHandler';

export class VehicleService {
  /**
   * Yeni araç oluştur
   */
  static async createVehicle(vehicleData: Partial<IVehicle>, userId: string): Promise<IVehicle> {
    try {
      // Kullanıcının var olduğunu kontrol et
      const user = await User.findById(userId);
      if (!user) {
        throw new CustomError('Kullanıcı bulunamadı', 404);
      }

      // Araç verilerini hazırla
      const vehicle = new Vehicle({
        ...vehicleData,
        userId: new mongoose.Types.ObjectId(userId)
      });

      const savedVehicle = await vehicle.save();
      return savedVehicle;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Araç oluşturulurken hata oluştu', 500);
    }
  }

  /**
   * Kullanıcının araçlarını getir
   */
  static async getUserVehicles(userId: string): Promise<IVehicle[]> {
    try {
      const vehicles = await Vehicle.find({ userId: new mongoose.Types.ObjectId(userId) })
        .populate('userId', 'name surname email')
        .sort({ createdAt: -1 });
      
      return vehicles;
    } catch (error) {
      throw new CustomError('Araçlar getirilirken hata oluştu', 500);
    }
  }

  /**
   * Belirli bir aracı getir
   */
  static async getVehicleById(vehicleId: string, userId: string): Promise<IVehicle> {
    try {
      const vehicle = await Vehicle.findOne({
        _id: new mongoose.Types.ObjectId(vehicleId),
        userId: new mongoose.Types.ObjectId(userId)
      }).populate('userId', 'name surname email');

      if (!vehicle) {
        throw new CustomError('Araç bulunamadı', 404);
      }

      return vehicle;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Araç getirilirken hata oluştu', 500);
    }
  }

  /**
   * Aracı güncelle
   */
  static async updateVehicle(vehicleId: string, userId: string, updateData: Partial<IVehicle>): Promise<IVehicle> {
    try {
      const vehicle = await Vehicle.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(vehicleId),
          userId: new mongoose.Types.ObjectId(userId)
        },
        updateData,
        { new: true, runValidators: true }
      ).populate('userId', 'name surname email');

      if (!vehicle) {
        throw new CustomError('Araç bulunamadı', 404);
      }

      return vehicle;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Araç güncellenirken hata oluştu', 500);
    }
  }

  /**
   * Aracı sil
   */
  static async deleteVehicle(vehicleId: string, userId: string): Promise<void> {
    try {
      const vehicle = await Vehicle.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(vehicleId),
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!vehicle) {
        throw new CustomError('Araç bulunamadı', 404);
      }
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Araç silinirken hata oluştu', 500);
    }
  }

  /**
   * Tüm araçları getir (admin için)
   */
  static async getAllVehicles(): Promise<IVehicle[]> {
    try {
      const vehicles = await Vehicle.find()
        .populate('userId', 'name surname email')
        .sort({ createdAt: -1 });
      
      return vehicles;
    } catch (error) {
      throw new CustomError('Araçlar getirilirken hata oluştu', 500);
    }
  }

  /**
   * Araç arama
   */
  static async searchVehicles(searchTerm: string, userId?: string): Promise<IVehicle[]> {
    try {
      const searchQuery: any = {
        $or: [
          { brand: { $regex: searchTerm, $options: 'i' } },
          { model: { $regex: searchTerm, $options: 'i' } },
          { plateNumber: { $regex: searchTerm, $options: 'i' } }
        ]
      };

      if (userId) {
        searchQuery.userId = new mongoose.Types.ObjectId(userId);
      }

      const vehicles = await Vehicle.find(searchQuery)
        .populate('userId', 'name surname email')
        .sort({ createdAt: -1 });

      return vehicles;
    } catch (error) {
      throw new CustomError('Araç arama yapılırken hata oluştu', 500);
    }
  }
}
