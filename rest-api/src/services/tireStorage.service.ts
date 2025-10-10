import { TireStorage, ITireStorage } from '../models/TireStorage';
import { DepotLayout, IDepotLayout } from '../models/DepotLayout';
import { SeasonalReminder, ISeasonalReminder } from '../models/SeasonalReminder';
import { CustomError } from '../middleware/errorHandler';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

export class TireStorageService {
  /**
   * Yeni lastik seti depoya yerleştir
   */
  static async storeTireSet(data: {
    customerId: string;
    vehicleId: string;
    mechanicId: string;
    tireSet: {
      season: 'summer' | 'winter';
      brand: string;
      model: string;
      size: string;
      condition: 'new' | 'used' | 'good' | 'fair' | 'poor';
      treadDepth: number[];
      productionYear?: number;
      notes?: string;
    };
    storageFee: number;
    photos?: string[];
  }) {
    try {
      // Depo düzenini kontrol et
      const depotLayout = await DepotLayout.findOne({ mechanicId: data.mechanicId });
      if (!depotLayout) {
        throw new CustomError('Depo düzeni bulunamadı. Önce depo kurulumunu yapın.', 404);
      }

      // Boş slot bul
      const availableSlot = await this.findAvailableSlot(depotLayout);
      if (!availableSlot) {
        throw new CustomError('Depoda boş slot bulunamadı', 400);
      }

      // Benzersiz barkod oluştur
      const barcode = `TIR_${Date.now()}_${uuidv4().substring(0, 8).toUpperCase()}`;
      
      // QR kod oluştur
      const qrCodeData = {
        barcode,
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        location: availableSlot.fullLocation,
        storageDate: new Date()
      };
      const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrCodeData));

      // Saklama süresi hesapla (6 ay)
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 6);

      // Lastik seti kaydet
      const tireStorage = new TireStorage({
        ...data,
        location: availableSlot,
        barcode,
        qrCode: qrCodeUrl,
        expiryDate,
        status: 'stored'
      });

      await tireStorage.save();

      // Depo durumunu güncelle
      await this.updateDepotStatus(depotLayout, availableSlot.fullLocation, 'occupied', tireStorage._id as unknown as mongoose.Types.ObjectId);

      return {
        success: true,
        data: tireStorage,
        message: 'Lastik seti başarıyla depoya yerleştirildi'
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Barkod ile lastik seti bul
   */
  static async findTireSetByBarcode(barcode: string, mechanicId: string) {
    try {
      const tireStorage = await TireStorage.findOne({
        barcode, 
        mechanicId,
        status: 'stored'
      })
      .populate('customerId', 'name surname phone email')
      .populate('vehicleId', 'brand modelName plateNumber year')
      .lean(); // 🚀 OPTIMIZE: Memory optimization

      if (!tireStorage) {
        throw new CustomError('Lastik seti bulunamadı', 404);
      }

      return {
        success: true,
        data: tireStorage,
        message: 'Lastik seti bulundu'
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Lastik seti çıkar (teslim et)
   */
  static async retrieveTireSet(tireStorageId: string, mechanicId: string) {
    try {
      const tireStorage = await TireStorage.findOne({ 
        _id: tireStorageId, 
        mechanicId 
      });

      if (!tireStorage) {
        throw new CustomError('Lastik seti bulunamadı', 404);
      }

      if (tireStorage.status !== 'stored') {
        throw new CustomError('Bu lastik seti zaten teslim edilmiş', 400);
      }

      // Durumu güncelle
      tireStorage.status = 'retrieved';
      tireStorage.lastAccessedDate = new Date();
      await tireStorage.save();

      // Depo durumunu güncelle
      const depotLayout = await DepotLayout.findOne({ mechanicId });
      if (depotLayout) {
        await this.updateDepotStatus(depotLayout, tireStorage.location.fullLocation, 'available');
      }

      return {
        success: true,
        data: tireStorage,
        message: 'Lastik seti başarıyla teslim edildi'
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Depo durumunu getir
   */
  static async getDepotStatus(mechanicId: string) {
    try {
      const depotLayout = await DepotLayout.findOne({ mechanicId });
      if (!depotLayout) {
        throw new CustomError('Depo düzeni bulunamadı', 404);
      }

      // Aktif lastik setlerini getir
      const activeTireSets = await TireStorage.find({
        mechanicId,
        status: 'stored'
      }).populate('customerId', 'name surname phone');

      return {
        success: true,
        data: {
          layout: depotLayout,
          activeTireSets,
          summary: {
            totalCapacity: depotLayout.currentStatus.totalCapacity,
            occupiedSlots: depotLayout.currentStatus.occupiedSlots,
            availableSlots: depotLayout.currentStatus.availableSlots,
            occupancyRate: depotLayout.currentStatus.occupancyRate
          }
        },
        message: 'Depo durumu getirildi'
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Sezonluk hatırlatma gönder
   */
  static async sendSeasonalReminders(mechanicId: string, season: 'summer' | 'winter') {
    try {
      const reminderSettings = await SeasonalReminder.findOne({ mechanicId });
      if (!reminderSettings) {
        throw new CustomError('Hatırlatma ayarları bulunamadı', 404);
      }

      const settings = season === 'summer' 
        ? reminderSettings.settings.summerReminder 
        : reminderSettings.settings.winterReminder;

      if (!settings.enabled) {
        return {
          success: true,
          message: `${season} hatırlatmaları devre dışı`
        };
      }

      // İlgili lastik setlerini bul
      const tireSets = await TireStorage.find({
        mechanicId,
        status: 'stored',
        'tireSet.season': season,
        reminderSent: false
      }).populate('customerId', 'name surname phone');

      const sentReminders = [];

      for (const tireSet of tireSets) {
        const customer = tireSet.customerId as any;
        
        // SMS gönder (burada SMS servisi entegrasyonu yapılacak)
        const smsResult = await this.sendSMSReminder(
          customer.phone,
          settings.message,
          customer.name
        );

        // Hatırlatma kaydı ekle
        const reminderRecord = {
          tireStorageId: tireSet._id,
          customerId: tireSet.customerId._id,
          season,
          sentDate: new Date(),
          message: settings.message,
          status: smsResult.success ? 'delivered' : 'failed',
          smsId: smsResult.smsId
        };

        sentReminders.push(reminderRecord);

        // Lastik seti durumunu güncelle
        tireSet.reminderSent = true;
        tireSet.reminderDate = new Date();
        await tireSet.save();
      }

      // Hatırlatma kayıtlarını ekle
      reminderSettings.sentReminders.push(...sentReminders);
      await reminderSettings.save();

      return {
        success: true,
        data: {
          sentCount: sentReminders.length,
          successfulCount: sentReminders.filter(r => r.status === 'delivered').length,
          failedCount: sentReminders.filter(r => r.status === 'failed').length
        },
        message: `${sentReminders.length} adet ${season} hatırlatması gönderildi`
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Boş slot bul
   */
  private static async findAvailableSlot(depotLayout: IDepotLayout) {
    for (const corridor of depotLayout.layout.corridors) {
      for (let rack = 1; rack <= corridor.racks; rack++) {
        for (let slot = 1; slot <= corridor.slotsPerRack; slot++) {
          const fullLocation = `${corridor.name}-${rack}-${slot}`;
          const slotStatus = depotLayout.slotStatus.get(fullLocation);
          
          if (!slotStatus || slotStatus.status === 'available') {
            return {
              corridor: corridor.name,
              rack,
              slot,
              fullLocation
            };
          }
        }
      }
    }
    return null;
  }

  /**
   * Depo durumunu güncelle
   */
  private static async updateDepotStatus(
    depotLayout: IDepotLayout, 
    location: string, 
    status: 'available' | 'occupied' | 'reserved' | 'maintenance',
    tireStorageId?: mongoose.Types.ObjectId
  ) {
    depotLayout.slotStatus.set(location, {
      status,
      tireStorageId,
      lastUpdated: new Date()
    });

    // İstatistikleri güncelle
    if (status === 'occupied') {
      depotLayout.currentStatus.occupiedSlots += 1;
    } else if (status === 'available') {
      depotLayout.currentStatus.occupiedSlots -= 1;
    }

    await depotLayout.save();
  }

  /**
   * SMS hatırlatma gönder (mock - gerçek SMS servisi entegrasyonu yapılacak)
   */
  private static async sendSMSReminder(phone: string, message: string, customerName: string) {
    // Burada gerçek SMS servisi entegrasyonu yapılacak
    // Şimdilik mock response döndürüyoruz
    return {
      success: Math.random() > 0.1, // %90 başarı oranı
      smsId: `SMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }
}
