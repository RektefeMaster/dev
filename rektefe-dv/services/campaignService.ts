import { api } from './api';

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
  isVerified: boolean;
}

export interface CampaignResponse {
  success: boolean;
  data: Campaign[];
  message: string;
}

export const campaignService = {
  /**
   * Tüm kampanyaları getir
   */
  getCampaigns: async (): Promise<Campaign[]> => {
    try {
      const response = await api.get<CampaignResponse>('/campaigns');
      return response.data.data;
    } catch (error) {
      console.error('Kampanyalar getirme hatası:', error);
      throw error;
    }
  },

  /**
   * Belirli bir kampanyayı getir
   */
  getCampaignById: async (id: number): Promise<Campaign | null> => {
    try {
      const campaigns = await campaignService.getCampaigns();
      return campaigns.find(campaign => campaign.id === id) || null;
    } catch (error) {
      console.error('Kampanya getirme hatası:', error);
      throw error;
    }
  },

  /**
   * Aktif kampanyaları getir (geçerli tarih kontrolü ile)
   */
  getActiveCampaigns: async (): Promise<Campaign[]> => {
    try {
      const campaigns = await campaignService.getCampaigns();
      const today = new Date();
      
      return campaigns.filter(campaign => {
        const validUntil = new Date(campaign.validUntil);
        return validUntil >= today;
      });
    } catch (error) {
      console.error('Aktif kampanyalar getirme hatası:', error);
      throw error;
    }
  },

  /**
   * Şehre göre kampanyaları filtrele
   */
  getCampaignsByCity: async (city: string): Promise<Campaign[]> => {
    try {
      const campaigns = await campaignService.getCampaigns();
      return campaigns.filter(campaign => 
        campaign.location.city.toLowerCase().includes(city.toLowerCase())
      );
    } catch (error) {
      console.error('Şehre göre kampanyalar getirme hatası:', error);
      throw error;
    }
  },

  /**
   * Hizmet türüne göre kampanyaları filtrele
   */
  getCampaignsByServiceType: async (serviceType: string): Promise<Campaign[]> => {
    try {
      const campaigns = await campaignService.getCampaigns();
      return campaigns.filter(campaign => 
        campaign.serviceType.toLowerCase().includes(serviceType.toLowerCase())
      );
    } catch (error) {
      console.error('Hizmet türüne göre kampanyalar getirme hatası:', error);
      throw error;
    }
  }
};
