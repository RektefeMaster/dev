import { apiService } from '@/shared/services/api';

// Campaign interface - backend'den alınacak
export interface Campaign {
  id: number;
  title: string;
  description: string;
  image: string;
  company: string;
  companyLogo?: string;
  validUntil: string;
  discount: string;
  conditions: string[];
  serviceType: string;
  location: {
    city: string;
    district: string;
  };
  contactInfo: {
    phone: string;
    address: string;
  };
  rating: number;
  reviewCount: number;
  distance?: number;
  isVerified?: boolean;
}

export interface CampaignFilters {
  city?: string;
  serviceType?: string;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}

class CampaignService {
  private baseUrl = '/campaigns';

  /**
   * Tüm kampanyaları getir
   */
  async getCampaigns(filters: CampaignFilters = {}): Promise<Campaign[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filters.city) queryParams.append('city', filters.city);
      if (filters.serviceType) queryParams.append('serviceType', filters.serviceType);
      if (filters.activeOnly !== undefined) queryParams.append('activeOnly', filters.activeOnly.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.offset) queryParams.append('offset', filters.offset.toString());

      const response = await apiService.get(`${this.baseUrl}?${queryParams.toString()}`);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      // Fallback mock data
      return this.getMockCampaigns();
    } catch (error) {
      console.error('Kampanyalar alınamadı:', error);
      // Fallback mock data
      return this.getMockCampaigns();
    }
  }

  /**
   * Aktif kampanyaları getir
   */
  async getActiveCampaigns(filters: Omit<CampaignFilters, 'activeOnly'> = {}): Promise<Campaign[]> {
    return this.getCampaigns({ ...filters, activeOnly: true });
  }

  /**
   * Kampanya detayını getir
   */
  async getCampaignById(id: number): Promise<Campaign | null> {
    try {
      const campaigns = await this.getCampaigns();
      const campaign = campaigns.find(c => c.id === id);
      return campaign || null;
    } catch (error) {
      console.error('Kampanya detayı alınamadı:', error);
      return null;
    }
  }

  /**
   * Şehre göre kampanyaları filtrele
   */
  async getCampaignsByCity(city: string): Promise<Campaign[]> {
    return this.getCampaigns({ city, activeOnly: true });
  }

  /**
   * Hizmet türüne göre kampanyaları filtrele
   */
  async getCampaignsByServiceType(serviceType: string): Promise<Campaign[]> {
    return this.getCampaigns({ serviceType, activeOnly: true });
  }

  /**
   * Kampanya arama
   */
  async searchCampaigns(query: string, filters: CampaignFilters = {}): Promise<Campaign[]> {
    try {
      const campaigns = await this.getCampaigns(filters);
      
      // Frontend'de arama yap
      const searchResults = campaigns.filter(campaign => 
        campaign.title.toLowerCase().includes(query.toLowerCase()) ||
        campaign.description.toLowerCase().includes(query.toLowerCase()) ||
        campaign.company.toLowerCase().includes(query.toLowerCase()) ||
        campaign.serviceType.toLowerCase().includes(query.toLowerCase())
      );
      
      return searchResults;
    } catch (error) {
      console.error('Kampanya araması yapılamadı:', error);
      return [];
    }
  }

  /**
   * Kampanya oluştur (admin için)
   */
  async createCampaign(campaignData: Omit<Campaign, 'id'>): Promise<{
    success: boolean;
    message: string;
    campaign?: Campaign;
  }> {
    try {
      const response = await apiService.post(`${this.baseUrl}`, campaignData);
      
      if (response.success) {
        return {
          success: true,
          message: response.message || 'Kampanya başarıyla oluşturuldu',
          campaign: response.data
        };
      }
      
      return {
        success: false,
        message: response.message || 'Kampanya oluşturulamadı'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Kampanya oluşturulurken hata oluştu'
      };
    }
  }

  /**
   * Kampanya güncelle (admin için)
   */
  async updateCampaign(id: number, campaignData: Partial<Campaign>): Promise<{
    success: boolean;
    message: string;
    campaign?: Campaign;
  }> {
    try {
      const response = await apiService.post(`${this.baseUrl}/${id}`, campaignData);
      
      if (response.success) {
        return {
          success: true,
          message: response.message || 'Kampanya başarıyla güncellendi',
          campaign: response.data
        };
      }
      
      return {
        success: false,
        message: response.message || 'Kampanya güncellenemedi'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Kampanya güncellenirken hata oluştu'
      };
    }
  }

  /**
   * Kampanya sil (admin için)
   */
  async deleteCampaign(id: number): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await apiService.get(`${this.baseUrl}/${id}`, { params: { _method: 'DELETE' } });
      
      if (response.success) {
        return {
          success: true,
          message: response.message || 'Kampanya başarıyla silindi'
        };
      }
      
      return {
        success: false,
        message: response.message || 'Kampanya silinemedi'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Kampanya silinirken hata oluştu'
      };
    }
  }

  /**
   * Kampanya istatistikleri (admin için)
   */
  async getCampaignStats(): Promise<{
    totalCampaigns: number;
    activeCampaigns: number;
    expiredCampaigns: number;
    totalViews: number;
    totalClicks: number;
  }> {
    try {
      const response = await apiService.get(`${this.baseUrl}/stats`);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      // Fallback mock data
      return {
        totalCampaigns: 8,
        activeCampaigns: 6,
        expiredCampaigns: 2,
        totalViews: 1250,
        totalClicks: 89
      };
    } catch (error) {
      console.error('Kampanya istatistikleri alınamadı:', error);
      return {
        totalCampaigns: 0,
        activeCampaigns: 0,
        expiredCampaigns: 0,
        totalViews: 0,
        totalClicks: 0
      };
    }
  }

  /**
   * Mock campaign data
   */
  private getMockCampaigns(): Campaign[] {
    return [
      {
        id: 1,
        title: 'Kış Lastiği Değişim Kampanyası',
        description: 'Tüm marka lastiklerde %25 indirim. Profesyonel montaj ve balans dahil.',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop',
        company: 'Lastik Dünyası',
        companyLogo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop',
        validUntil: '2025-03-31',
        discount: '%25 İndirim',
        conditions: ['Minimum 4 lastik alımı', 'Montaj ve balans dahil', 'Geçerli tarih: 31 Mart 2025'],
        serviceType: 'Lastik Değişimi',
        location: {
          city: 'İstanbul',
          district: 'Kadıköy'
        },
        contactInfo: {
          phone: '+90 216 123 45 67',
          address: 'Moda Caddesi No:123, Kadıköy/İstanbul'
        },
        rating: 4.8,
        reviewCount: 156,
        isVerified: true
      },
      {
        id: 2,
        title: 'Motor Yağı Değişim Paketi',
        description: 'Premium motor yağı + filtre değişimi + kontrol. %20 indirimli fiyat!',
        image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&h=400&fit=crop',
        company: 'Oto Servis Merkezi',
        companyLogo: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=100&h=100&fit=crop',
        validUntil: '2025-02-28',
        discount: '%20 İndirim',
        conditions: ['Premium yağ kullanımı', 'Filtre değişimi dahil', 'Geçerli tarih: 28 Şubat 2025'],
        serviceType: 'Motor Bakımı',
        location: {
          city: 'Ankara',
          district: 'Çankaya'
        },
        contactInfo: {
          phone: '+90 312 555 12 34',
          address: 'Tunalı Hilmi Caddesi No:45, Çankaya/Ankara'
        },
        rating: 4.6,
        reviewCount: 89,
        isVerified: true
      },
      {
        id: 3,
        title: 'Araç Yıkama Paketi',
        description: 'Detaylı araç yıkama + iç temizlik + parlatma. 3 yıkama 2 yıkama fiyatına!',
        image: 'https://images.unsplash.com/photo-1506905925346-14b1e0d0b848?w=800&h=400&fit=crop',
        company: 'Temizlik Merkezi',
        companyLogo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=100&fit=crop',
        validUntil: '2025-04-15',
        discount: '3=2 Kampanyası',
        conditions: ['Detaylı yıkama', 'İç temizlik dahil', 'Geçerli tarih: 15 Nisan 2025'],
        serviceType: 'Araç Yıkama',
        location: {
          city: 'İzmir',
          district: 'Konak'
        },
        contactInfo: {
          phone: '+90 232 444 55 66',
          address: 'Kıbrıs Şehitleri Caddesi No:78, Konak/İzmir'
        },
        rating: 4.4,
        reviewCount: 67,
        isVerified: true
      }
    ];
  }
}

export const campaignService = new CampaignService();
