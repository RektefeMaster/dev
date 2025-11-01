import { useState, useEffect, useCallback } from 'react';
import { campaignService, Campaign as CampaignServiceCampaign } from '@/features/campaigns/services/campaignService';

// Re-export Campaign type from service
export type Campaign = CampaignServiceCampaign;

interface UseCampaignsOptions {
  city?: string;
  serviceType?: string;
  activeOnly?: boolean;
}

interface UseCampaignsReturn {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  refreshCampaigns: () => Promise<void>;
  getCampaignById: (id: number) => Campaign | undefined;
}

export const useCampaigns = (options: UseCampaignsOptions = {}): UseCampaignsReturn => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { city, serviceType, activeOnly = true } = options;

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let fetchedCampaigns: Campaign[];

      if (activeOnly) {
        fetchedCampaigns = await campaignService.getActiveCampaigns();
      } else {
        fetchedCampaigns = await campaignService.getCampaigns();
      }

      // Şehir filtresi
      if (city) {
        fetchedCampaigns = fetchedCampaigns.filter(campaign => {
          const locationCity = typeof campaign.location === 'string' 
            ? campaign.location 
            : campaign.location?.city || '';
          return locationCity.toLowerCase().includes(city.toLowerCase());
        });
      }

      // Hizmet türü filtresi
      if (serviceType) {
        fetchedCampaigns = fetchedCampaigns.filter(campaign =>
          campaign.serviceType.toLowerCase().includes(serviceType.toLowerCase())
        );
      }

      setCampaigns(fetchedCampaigns);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Kampanyalar yüklenirken bir hata oluştu';
      setError(errorMessage);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [city, serviceType, activeOnly]);

  const refreshCampaigns = useCallback(async () => {
    await fetchCampaigns();
  }, [fetchCampaigns]);

  const getCampaignById = useCallback((id: number) => {
    return campaigns.find(campaign => campaign.id === id);
  }, [campaigns]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return {
    campaigns,
    loading,
    error,
    refreshCampaigns,
    getCampaignById
  };
};
