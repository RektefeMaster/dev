import { WashLane, IWashLane } from '../models/WashLane';
import { WashProvider } from '../models/WashProvider';
import { WashOrder } from '../models/WashOrder';
import { CustomError } from '../middleware/errorHandler';
import mongoose from 'mongoose';

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  laneId?: string;
  laneName?: string;
}

export class WashSlotService {
  /**
   * Müsait slotları getir (shop için)
   */
  static async getAvailableSlots(data: {
    providerId: string;
    date: Date;
    duration: number; // dakika
  }): Promise<{
    success: boolean;
    data: TimeSlot[];
    message: string;
  }> {
    try {
      // Provider'ı getir
      const provider = await WashProvider.findOne({ 
        userId: data.providerId,
        isActive: true 
      });

      if (!provider) {
        throw new CustomError('İşletme bulunamadı', 404);
      }

      if (!provider.shop || !provider.shop.hasLanes) {
        throw new CustomError('Bu işletme shop tipi değil', 400);
      }

      // Hatları getir
      const lanes = await WashLane.find({
        providerId: provider._id,
        isActive: true,
        isOperational: true,
      }).sort({ sortOrder: 1 });

      if (lanes.length === 0) {
        throw new CustomError('Aktif hat bulunamadı', 404);
      }

      // Çalışma saatlerini al
      const dayOfWeek = data.date.getDay();
      const workingHours = provider.shop.workingHours.find(wh => wh.day === dayOfWeek);

      if (!workingHours || !workingHours.isOpen) {
        return {
          success: true,
          data: [],
          message: 'Bu gün kapalı',
        };
      }

      // Slot listesi oluştur
      const availableSlots: TimeSlot[] = [];
      const bufferTime = 5; // Geçiş süresi

      // Her hat için slotları hesapla
      for (const lane of lanes) {
        const slots = this.generateTimeSlots(
          workingHours.openTime!,
          workingHours.closeTime!,
          data.duration + bufferTime,
          workingHours.breaks || []
        );

        // Her slot için müsaitlik kontrolü
        for (const slot of slots) {
          const isAvailable = await this.checkSlotAvailability(
            lane._id.toString(),
            data.date,
            slot.startTime,
            slot.endTime
          );

          if (isAvailable) {
            availableSlots.push({
              ...slot,
              laneId: lane._id.toString(),
              laneName: lane.displayName,
            });
          }
        }
      }

      return {
        success: true,
        data: availableSlots,
        message: 'Müsait slotlar getirildi',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Slot rezerve et
   */
  static async reserveSlot(data: {
    laneId: string;
    orderId: string;
    date: Date;
    startTime: string;
    endTime: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const lane = await WashLane.findById(data.laneId);
      if (!lane) {
        throw new CustomError('Hat bulunamadı', 404);
      }

      // Slot'un müsait olduğunu kontrol et
      const isAvailable = await this.checkSlotAvailability(
        data.laneId,
        data.date,
        data.startTime,
        data.endTime
      );

      if (!isAvailable) {
        throw new CustomError('Bu slot artık müsait değil', 409);
      }

      // Slot'u rezerve et
      const dateStr = data.date.toISOString().split('T')[0];
      let daySlots = lane.slots.find(
        s => s.date.toISOString().split('T')[0] === dateStr
      );

      if (!daySlots) {
        daySlots = {
          date: data.date,
          timeSlots: [],
        };
        lane.slots.push(daySlots);
      }

      daySlots.timeSlots.push({
        startTime: data.startTime,
        endTime: data.endTime,
        isAvailable: false,
        orderId: new mongoose.Types.ObjectId(data.orderId),
        status: 'reserved',
        reservedAt: new Date(),
      });

      await lane.save();

      return {
        success: true,
        message: 'Slot rezerve edildi',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Slot serbest bırak
   */
  static async releaseSlot(data: {
    laneId: string;
    orderId: string;
    date: Date;
    startTime: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const lane = await WashLane.findById(data.laneId);
      if (!lane) {
        throw new CustomError('Hat bulunamadı', 404);
      }

      const dateStr = data.date.toISOString().split('T')[0];
      const daySlots = lane.slots.find(
        s => s.date.toISOString().split('T')[0] === dateStr
      );

      if (!daySlots) {
        return {
          success: true,
          message: 'Slot bulunamadı',
        };
      }

      // Slot'u bul ve sil
      const slotIndex = daySlots.timeSlots.findIndex(
        ts => 
          ts.startTime === data.startTime &&
          ts.orderId?.toString() === data.orderId
      );

      if (slotIndex !== -1) {
        daySlots.timeSlots.splice(slotIndex, 1);
        await lane.save();
      }

      return {
        success: true,
        message: 'Slot serbest bırakıldı',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Slot müsaitliğini kontrol et
   */
  static async checkSlotAvailability(
    laneId: string,
    date: Date,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    try {
      const lane = await WashLane.findById(laneId);
      if (!lane) {
        return false;
      }

      const dateStr = date.toISOString().split('T')[0];
      const daySlots = lane.slots.find(
        s => s.date.toISOString().split('T')[0] === dateStr
      );

      if (!daySlots) {
        return true; // Gün için henüz rezervasyon yok
      }

      // Çakışan slot var mı kontrol et
      const hasConflict = daySlots.timeSlots.some(ts => {
        if (ts.status === 'available') {
          return false;
        }

        const tsStart = this.timeToMinutes(ts.startTime);
        const tsEnd = this.timeToMinutes(ts.endTime);
        const reqStart = this.timeToMinutes(startTime);
        const reqEnd = this.timeToMinutes(endTime);

        // Çakışma kontrolü
        return (
          (reqStart >= tsStart && reqStart < tsEnd) ||
          (reqEnd > tsStart && reqEnd <= tsEnd) ||
          (reqStart <= tsStart && reqEnd >= tsEnd)
        );
      });

      return !hasConflict;
    } catch (error) {
      console.error('Slot müsaitlik kontrolü hatası:', error);
      return false;
    }
  }

  /**
   * Doluluk oranını hesapla
   */
  static async calculateOccupancyRate(
    providerId: string,
    date: Date
  ): Promise<{
    success: boolean;
    data: {
      totalCapacity: number;
      bookedSlots: number;
      occupancyRate: number;
      availableSlots: number;
    };
    message: string;
  }> {
    try {
      const provider = await WashProvider.findOne({ userId: providerId });
      if (!provider || !provider.shop) {
        throw new CustomError('İşletme bulunamadı', 404);
      }

      const lanes = await WashLane.find({
        providerId: provider._id,
        isActive: true,
        isOperational: true,
      });

      const dateStr = date.toISOString().split('T')[0];
      
      let totalSlots = 0;
      let bookedSlots = 0;

      for (const lane of lanes) {
        const daySlots = lane.slots.find(
          s => s.date.toISOString().split('T')[0] === dateStr
        );

        // Çalışma saatlerine göre maksimum slot sayısı
        const workingHours = provider.shop.workingHours.find(
          wh => wh.day === date.getDay()
        );

        if (workingHours && workingHours.isOpen) {
          const openMinutes = this.timeToMinutes(workingHours.openTime!);
          const closeMinutes = this.timeToMinutes(workingHours.closeTime!);
          const workingMinutes = closeMinutes - openMinutes;
          
          // Ortalama 45 dakikalık slotlar varsayalım
          const maxSlots = Math.floor(workingMinutes / 45);
          totalSlots += maxSlots;

          if (daySlots) {
            bookedSlots += daySlots.timeSlots.filter(
              ts => ts.status !== 'available'
            ).length;
          }
        }
      }

      const occupancyRate = totalSlots > 0 
        ? Math.round((bookedSlots / totalSlots) * 100) 
        : 0;

      return {
        success: true,
        data: {
          totalCapacity: totalSlots,
          bookedSlots,
          occupancyRate,
          availableSlots: totalSlots - bookedSlots,
        },
        message: 'Doluluk oranı hesaplandı',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Zaman aralıkları oluştur
   */
  private static generateTimeSlots(
    startTime: string,
    endTime: string,
    duration: number, // dakika
    breaks: Array<{ startTime: string; endTime: string }>
  ): Array<{ startTime: string; endTime: string; isAvailable: boolean }> {
    const slots: Array<{ startTime: string; endTime: string; isAvailable: boolean }> = [];
    
    let currentMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    while (currentMinutes + duration <= endMinutes) {
      const slotStart = this.minutesToTime(currentMinutes);
      const slotEnd = this.minutesToTime(currentMinutes + duration);

      // Mola saatlerinde değil mi kontrol et
      const isDuringBreak = breaks.some(brk => {
        const brkStart = this.timeToMinutes(brk.startTime);
        const brkEnd = this.timeToMinutes(brk.endTime);
        return (
          (currentMinutes >= brkStart && currentMinutes < brkEnd) ||
          (currentMinutes + duration > brkStart && currentMinutes + duration <= brkEnd)
        );
      });

      if (!isDuringBreak) {
        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: true,
        });
      }

      currentMinutes += duration;
    }

    return slots;
  }

  /**
   * Saat formatını dakikaya çevir
   */
  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Dakikayı saat formatına çevir
   */
  private static minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}

