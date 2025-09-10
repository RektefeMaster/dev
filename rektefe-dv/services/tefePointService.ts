import { api } from './api';

export interface TefePointBalance {
  totalPoints: number;
  availablePoints: number;
  usedPoints: number;
  expiredPoints: number;
}

export interface TefePointTransaction {
  id: string;
  type: 'service_purchase' | 'bonus' | 'referral' | 'promotion' | 'refund';
  amount: number;
  serviceCategory?: string;
  description: string;
  multiplier: number;
  baseAmount: number;
  date: string;
  status: 'earned' | 'used' | 'expired' | 'cancelled';
  expiresAt?: string;
}

export interface ServiceCategory {
  category: string;
  multiplier: number;
  description: string;
}

export interface TefePointStats {
  totalEarned: number;
  totalUsed: number;
  totalExpired: number;
  categoryBreakdown: Array<{
    category: string;
    description: string;
    multiplier: number;
    earnings: number;
    transactionCount: number;
  }>;
  period: string;
}

export interface EarnPointsRequest {
  amount: number;
  serviceCategory: string;
  serviceId?: string;
  appointmentId?: string;
  description?: string;
}

export interface UsePointsRequest {
  points: number;
  description?: string;
  serviceId?: string;
}

export interface GetHistoryParams {
  page?: number;
  limit?: number;
  type?: string;
}

export interface GetStatsParams {
  period?: 'week' | 'month' | 'year';
}

class TefePointService {
  private baseUrl = '/tefe-points';

  /**
   * Kullanıcının TefePuan bakiyesini getir
   */
  async getBalance(): Promise<TefePointBalance> {
    try {
      const response = await api.get(`${this.baseUrl}/balance`);
      return response.data.data;
    } catch (error) {
      console.error('TefePuan bakiyesi getirme hatası:', error);
      throw error;
    }
  }

  /**
   * TefePuan geçmişini getir
   */
  async getHistory(params: GetHistoryParams = {}): Promise<{
    transactions: TefePointTransaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const response = await api.get(`${this.baseUrl}/history`, { params });
      return response.data.data;
    } catch (error) {
      console.error('TefePuan geçmişi getirme hatası:', error);
      throw error;
    }
  }

  /**
   * Hizmet satın alımından TefePuan kazan
   */
  async earnPoints(request: EarnPointsRequest): Promise<{
    earnedPoints: number;
    totalPoints: number;
    availablePoints: number;
    transaction: TefePointTransaction;
  }> {
    try {
      const response = await api.post(`${this.baseUrl}/earn`, request);
      return response.data.data;
    } catch (error) {
      console.error('TefePuan kazanma hatası:', error);
      throw error;
    }
  }

  /**
   * TefePuan kullan
   */
  async usePoints(request: UsePointsRequest): Promise<{
    usedPoints: number;
    remainingPoints: number;
    transaction: TefePointTransaction;
  }> {
    try {
      const response = await api.post(`${this.baseUrl}/use`, request);
      return response.data.data;
    } catch (error) {
      console.error('TefePuan kullanma hatası:', error);
      throw error;
    }
  }

  /**
   * Hizmet kategorilerini getir
   */
  async getServiceCategories(): Promise<ServiceCategory[]> {
    try {
      const response = await api.get(`${this.baseUrl}/categories`);
      return response.data.data.categories;
    } catch (error) {
      console.error('Hizmet kategorileri getirme hatası:', error);
      throw error;
    }
  }

  /**
   * TefePuan istatistiklerini getir
   */
  async getStats(params: GetStatsParams = {}): Promise<TefePointStats> {
    try {
      const response = await api.get(`${this.baseUrl}/stats`, { params });
      return response.data.data;
    } catch (error) {
      console.error('TefePuan istatistikleri getirme hatası:', error);
      throw error;
    }
  }

  /**
   * TefePuan hesaplama yardımcı fonksiyonu
   */
  calculateTefePoints(amount: number, serviceCategory: string): number {
    const categories: Record<string, number> = {
      'towing': 0.02,           // %2
      'tire_service': 0.03,     // %3
      'wash_service': 0.04,     // %4
      'maintenance': 0.05,      // %5
      'engine_repair': 0.07,    // %7
      'transmission_repair': 0.08, // %8
      'electrical_repair': 0.06, // %6
      'body_repair': 0.09       // %9
    };

    const multiplier = categories[serviceCategory] || 0.05; // Varsayılan %5
    return Math.floor(amount * multiplier);
  }

  /**
   * TefePuan formatla (binlik ayırıcı ile)
   */
  formatTefePoints(points: number): string {
    return points.toLocaleString('tr-TR');
  }

  /**
   * Tarih formatla (Türkçe)
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    
    // Gerçek anlık tarih ve saat formatı (salise olmadan)
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * İşlem türü ikonu getir
   */
  getTransactionIcon(type: string, status: string): string {
    if (status === 'used') return 'minus-circle';
    if (status === 'expired') return 'clock-alert';
    if (status === 'cancelled') return 'cancel';
    
    switch (type) {
      case 'service_purchase': return 'wrench';
      case 'bonus': return 'gift';
      case 'referral': return 'account-plus';
      case 'promotion': return 'tag';
      case 'refund': return 'undo';
      default: return 'cash';
    }
  }

  /**
   * İşlem türü rengi getir
   */
  getTransactionColor(type: string, status: string): string {
    if (status === 'used') return '#FF3B30';
    if (status === 'expired') return '#8E8E93';
    if (status === 'cancelled') return '#FF9500';
    
    switch (type) {
      case 'service_purchase': return '#34C759';
      case 'bonus': return '#FF2D92';
      case 'referral': return '#007AFF';
      case 'promotion': return '#FF9500';
      case 'refund': return '#5856D6';
      default: return '#007AFF';
    }
  }

  /**
   * Hizmet kategorisi açıklaması getir
   */
  getServiceDescription(category: string): string {
    const descriptions: Record<string, string> = {
      'towing': 'Çekici Hizmeti',
      'tire_service': 'Lastik Hizmeti',
      'wash_service': 'Araç Yıkama',
      'maintenance': 'Genel Bakım',
      'engine_repair': 'Motor Rektefiyesi',
      'transmission_repair': 'Şanzıman Rektefiyesi',
      'electrical_repair': 'Elektrik Rektefiyesi',
      'body_repair': 'Kaporta Rektefiyesi'
    };

    return descriptions[category] || 'Bilinmeyen Hizmet';
  }
}

export const tefePointService = new TefePointService();
