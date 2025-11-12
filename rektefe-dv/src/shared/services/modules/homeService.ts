import { apiClient } from '../http/client';

const HOME_ENDPOINTS = {
  overview: '/home/overview',
  maintenance: '/maintenance',
  insurance: (userId: string) => `/insurance/${userId}`,
  vehicleStatus: (userId: string) => `/vehicle-status/${userId}`,
  tireStatus: (userId: string) => `/tire-status/${userId}`,
  campaigns: '/campaigns',
  ads: '/ads',
} as const;

export const HomeService = {
  async getOverview() {
    const response = await apiClient.get(HOME_ENDPOINTS.overview);
    return response.data;
  },

  async getMaintenance() {
    const response = await apiClient.get(HOME_ENDPOINTS.maintenance);
    return response.data;
  },

  async getInsurance(userId: string) {
    const response = await apiClient.get(HOME_ENDPOINTS.insurance(userId));
    return response.data;
  },

  async getVehicleStatus(userId: string) {
    const response = await apiClient.get(HOME_ENDPOINTS.vehicleStatus(userId));
    return response.data;
  },

  async getTireStatus(userId: string) {
    const response = await apiClient.get(HOME_ENDPOINTS.tireStatus(userId));
    return response.data;
  },

  async getCampaigns() {
    const response = await apiClient.get(HOME_ENDPOINTS.campaigns);
    return response.data;
  },

  async getAds() {
    const response = await apiClient.get(HOME_ENDPOINTS.ads);
    return response.data;
  },
};

export type HomeOverviewResponse = Awaited<ReturnType<typeof HomeService.getOverview>>;

