import { api } from '@/shared/services/api';

// TefePuan interfaces
export interface TefePointBalance {
  totalPoints: number;
  availablePoints: number;
  usedPoints: number;
  expiredPoints: number;
}

export interface TefePointTransaction {
  id: string;
  type: 'service_purchase' | 'referral' | 'bonus' | 'expiration' | 'redemption';
  amount: number;
  serviceCategory?: string;
  description: string;
  multiplier?: number;
  baseAmount?: number;
  date: string;
  status: 'earned' | 'used' | 'expired' | 'pending';
}

export interface ServiceCategory {
  category: string;
  description: string;
  multiplier: number; // TefePuan çarpanı
}

export interface TefePointHistoryResponse {
  transactions: TefePointTransaction[];
  totalCount: number;
  hasMore: boolean;
}

class TefePointService {
  private baseUrl = '/tefe-points';

  /**
   * TefePuan bakiyesini getir
   */
  async getBalance(): Promise<TefePointBalance> {
    try {
      const response = await api.get(`${this.baseUrl}/balance`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error('TefePuan bakiyesi alınamadı');
    } catch (error) {
      console.error('TefePuan bakiyesi alınamadı:', error);
      throw error;
    }
  }

  /**
   * TefePuan geçmişini getir
   */
  async getHistory(params: {
    limit?: number;
    offset?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<TefePointHistoryResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());
      if (params.type) queryParams.append('type', params.type);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);

      const response = await api.get(`${this.baseUrl}/history?${queryParams.toString()}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error('TefePuan geçmişi alınamadı');
    } catch (error) {
      console.error('TefePuan geçmişi alınamadı:', error);
      throw error;
    }
  }

  /**
   * Servis kategorilerini getir
   */
  async getServiceCategories(): Promise<ServiceCategory[]> {
    try {
      const response = await api.get(`${this.baseUrl}/categories`);
      
      if (response.data.success && response.data.data) {
        // Backend'den gelen format: { categories: [...] }
        const categories = response.data.data.categories || response.data.data;
        return categories;
      }
      
      throw new Error('Servis kategorileri alınamadı');
    } catch (error) {
      console.error('Servis kategorileri alınamadı:', error);
      throw error;
    }
  }

  /**
   * TefePuan hesapla
   */
  calculateTefePoints(amount: number, serviceCategory: string): number {
    const categoryMultipliers: { [key: string]: number } = {
      'engine_repair': 0.07,
      'tire_service': 0.03,
      'wash_service': 0.04,
      'maintenance': 0.05,
      'electrical': 0.06,
      'body_repair': 0.08,
      'brake_service': 0.04,
      'exhaust_service': 0.03,
      'general': 0.02
    };

    const multiplier = categoryMultipliers[serviceCategory] || 0.02;
    return Math.floor(amount * multiplier);
  }

  /**
   * TefePuan kullan
   */
  async usePoints(points: number, description: string): Promise<{
    success: boolean;
    message: string;
    remainingPoints?: number;
  }> {
    try {
      const response = await api.post(`${this.baseUrl}/use`, {
        points,
        description
      });
      
      if (response.data.success) {
        return {
          success: true,
          message: response.data.message || 'TefePuan başarıyla kullanıldı',
          remainingPoints: response.data.data?.remainingPoints
        };
      }
      
      return {
        success: false,
        message: response.data.message || 'TefePuan kullanılamadı'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'TefePuan kullanılırken hata oluştu'
      };
    }
  }

  /**
   * TefePuan transfer et
   */
  async transferPoints(toUserId: string, points: number, description?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await api.post(`${this.baseUrl}/transfer`, {
        toUserId,
        points,
        description: description || 'TefePuan transferi'
      });
      
      if (response.data.success) {
        return {
          success: true,
          message: response.data.message || 'TefePuan başarıyla transfer edildi'
        };
      }
      
      return {
        success: false,
        message: response.data.message || 'TefePuan transfer edilemedi'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'TefePuan transfer edilirken hata oluştu'
      };
    }
  }

  /**
   * TefePuan değerini TL cinsinden hesapla
   */
  calculateTefePointValue(points: number): number {
    // 1 TefePuan = 0.1 TL
    return points * 0.1;
  }

  /**
   * TefePuan ile indirim hesapla
   */
  calculateDiscountWithTefePoints(
    originalAmount: number,
    availablePoints: number,
    maxDiscountPercentage: number = 50
  ): {
    discountAmount: number;
    pointsToUse: number;
    finalAmount: number;
  } {
    const maxDiscountAmount = originalAmount * (maxDiscountPercentage / 100);
    const maxPointsToUse = Math.floor(maxDiscountAmount / 0.1); // 1 TefePuan = 0.1 TL
    
    const pointsToUse = Math.min(availablePoints, maxPointsToUse);
    const discountAmount = pointsToUse * 0.1;
    const finalAmount = Math.max(0, originalAmount - discountAmount);

    return {
      discountAmount,
      pointsToUse,
      finalAmount
    };
  }


  /**
   * İşlem türüne göre renk döndür
   */
  getTransactionColor(type: string, status?: string): string {
    switch (type) {
      case 'service_purchase':
        return '#4CAF50'; // Yeşil - hizmet satın alma
      case 'referral':
        return '#2196F3'; // Mavi - referans
      case 'bonus':
        return '#FF9800'; // Turuncu - bonus
      case 'expiration':
        return '#F44336'; // Kırmızı - süre dolması
      case 'redemption':
        return '#9C27B0'; // Mor - kullanım
      default:
        return '#757575'; // Gri - varsayılan
    }
  }

  // İşlem türü ikonu
  getTransactionIcon(type: string, status: string): string {
    switch (type) {
      case 'service_purchase':
        return 'shopping-cart';
      case 'referral':
        return 'account-plus';
      case 'bonus':
        return 'gift';
      case 'expiration':
        return 'clock-alert';
      case 'redemption':
        return 'wallet';
      default:
        return 'circle';
    }
  }

  // Tarih formatla
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        return 'Bugün';
      } else if (diffDays === 2) {
        return 'Dün';
      } else if (diffDays <= 7) {
        return `${diffDays - 1} gün önce`;
      } else {
        return date.toLocaleDateString('tr-TR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    } catch (error) {
      return dateString;
    }
  }

  // Hizmet kategorisi açıklaması
  getServiceDescription(category: string): string {
    const categoryMap: { [key: string]: string } = {
      'towing': 'Çekici Hizmeti',
      'tire_service': 'Lastik Hizmeti',
      'wash_service': 'Araç Yıkama',
      'maintenance': 'Genel Bakım',
      'engine_repair': 'Motor Rektefiyesi',
      'transmission_repair': 'Şanzıman Rektefiyesi',
      'electrical_repair': 'Elektrik Rektefiyesi',
      'body_repair': 'Kaporta Rektefiyesi'
    };
    
    return categoryMap[category] || 'Bilinmeyen Hizmet';
  }
}

export const tefePointService = new TefePointService();
