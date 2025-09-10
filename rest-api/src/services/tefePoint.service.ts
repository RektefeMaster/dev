import { TefePoint, calculateTefePoints, SERVICE_CATEGORIES } from '../models/TefePoint';

export interface PaymentTefePointData {
  userId: string;
  amount: number;
  paymentType: 'appointment' | 'fault_report' | 'wallet_topup' | 'credit_card' | 'other';
  serviceCategory?: string;
  description?: string;
  serviceId?: string;
  appointmentId?: string;
}

export class TefePointService {
  /**
   * Tüm ödeme türleri için TefePuan işleme
   */
  static async processPaymentTefePoints(data: PaymentTefePointData): Promise<{
    success: boolean;
    earnedPoints?: number;
    error?: string;
  }> {
    try {
      const { userId, amount, paymentType, serviceCategory, description, serviceId, appointmentId } = data;

      // Ödeme türüne göre hizmet kategorisi belirle
      const finalServiceCategory = serviceCategory || this.getDefaultServiceCategory(paymentType);
      
      // TefePuan hesapla
      const earnedPoints = calculateTefePoints(amount, finalServiceCategory);
      
      if (earnedPoints <= 0) {
        return { success: true, earnedPoints: 0 };
      }

      // Kullanıcının TefePuan kaydını bul veya oluştur
      let tefePoint = await TefePoint.findOne({ userId });
      
      if (!tefePoint) {
        tefePoint = new TefePoint({
          userId,
          totalPoints: 0,
          availablePoints: 0,
          usedPoints: 0,
          expiredPoints: 0,
          transactions: []
        });
      }

      // Hizmet kategorisi bilgisini al
      const category = SERVICE_CATEGORIES.find(cat => cat.category === finalServiceCategory);
      const multiplier = category ? category.multiplier : 0.05;

      // Yeni işlem ekle
      const newTransaction = {
        type: 'service_purchase' as const,
        amount: earnedPoints,
        serviceCategory: finalServiceCategory,
        serviceId,
        appointmentId,
        description: description || this.getPaymentDescription(paymentType, category?.description),
        multiplier,
        baseAmount: amount,
        date: new Date(),
        status: 'earned' as const,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 yıl
      };

      tefePoint.transactions.push(newTransaction);
      tefePoint.totalPoints += earnedPoints;
      tefePoint.availablePoints += earnedPoints;

      await tefePoint.save();

      console.log(`✅ TefePuan eklendi: ${earnedPoints} puan (${(multiplier * 100).toFixed(1)}%), Kullanıcı: ${userId}, Ödeme Türü: ${paymentType}`);

      return {
        success: true,
        earnedPoints
      };

    } catch (error: any) {
      console.error('❌ TefePuan işleme hatası:', error);
      return {
        success: false,
        error: error.message || 'TefePuan işlenirken hata oluştu'
      };
    }
  }

  /**
   * Ödeme türüne göre varsayılan hizmet kategorisi belirle
   */
  private static getDefaultServiceCategory(paymentType: string): string {
    switch (paymentType) {
      case 'appointment':
        return 'maintenance'; // Genel bakım
      case 'fault_report':
        return 'maintenance'; // Genel bakım
      case 'wallet_topup':
        return 'maintenance'; // Bakiye yükleme için genel bakım
      case 'credit_card':
        return 'maintenance'; // Kredi kartı ödemesi için genel bakım
      default:
        return 'maintenance';
    }
  }

  /**
   * Ödeme türüne göre açıklama oluştur
   */
  private static getPaymentDescription(paymentType: string, serviceDescription?: string): string {
    switch (paymentType) {
      case 'appointment':
        return `Randevu ödemesi - ${serviceDescription || 'Genel Bakım'}`;
      case 'fault_report':
        return `Arıza bildirimi ödemesi - ${serviceDescription || 'Genel Bakım'}`;
      case 'wallet_topup':
        return `Cüzdan bakiye yükleme - ${serviceDescription || 'Genel Bakım'}`;
      case 'credit_card':
        return `Kredi kartı ödemesi - ${serviceDescription || 'Genel Bakım'}`;
      default:
        return `Ödeme - ${serviceDescription || 'Genel Bakım'}`;
    }
  }

  /**
   * Özel TefePuan kampanyaları için bonus puan ekleme
   */
  static async addBonusPoints(
    userId: string, 
    points: number, 
    description: string,
    serviceId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let tefePoint = await TefePoint.findOne({ userId });
      
      if (!tefePoint) {
        tefePoint = new TefePoint({
          userId,
          totalPoints: 0,
          availablePoints: 0,
          usedPoints: 0,
          expiredPoints: 0,
          transactions: []
        });
      }

      const bonusTransaction = {
        type: 'bonus' as const,
        amount: points,
        serviceId,
        description,
        multiplier: 0.01, // Bonus için minimum değer
        baseAmount: 0,
        date: new Date(),
        status: 'earned' as const,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 yıl
      };

      tefePoint.transactions.push(bonusTransaction);
      tefePoint.totalPoints += points;
      tefePoint.availablePoints += points;

      await tefePoint.save();

      console.log(`🎁 Bonus TefePuan eklendi: ${points} puan, Kullanıcı: ${userId}`);

      return { success: true };

    } catch (error: any) {
      console.error('❌ Bonus TefePuan ekleme hatası:', error);
      return {
        success: false,
        error: error.message || 'Bonus TefePuan eklenirken hata oluştu'
      };
    }
  }

  /**
   * Referans puanı ekleme
   */
  static async addReferralPoints(
    userId: string, 
    points: number, 
    referredUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let tefePoint = await TefePoint.findOne({ userId });
      
      if (!tefePoint) {
        tefePoint = new TefePoint({
          userId,
          totalPoints: 0,
          availablePoints: 0,
          usedPoints: 0,
          expiredPoints: 0,
          transactions: []
        });
      }

      const referralTransaction = {
        type: 'referral' as const,
        amount: points,
        description: `Arkadaş davet bonusu - ${referredUserId}`,
        multiplier: 0.01,
        baseAmount: 0,
        date: new Date(),
        status: 'earned' as const,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 yıl
      };

      tefePoint.transactions.push(referralTransaction);
      tefePoint.totalPoints += points;
      tefePoint.availablePoints += points;

      await tefePoint.save();

      console.log(`👥 Referans TefePuan eklendi: ${points} puan, Kullanıcı: ${userId}`);

      return { success: true };

    } catch (error: any) {
      console.error('❌ Referans TefePuan ekleme hatası:', error);
      return {
        success: false,
        error: error.message || 'Referans TefePuan eklenirken hata oluştu'
      };
    }
  }
}
