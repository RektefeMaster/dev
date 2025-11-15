import { ApiResponse } from '@/shared/types/common';
import { createSuccessResponse, createErrorResponse, ErrorCode } from '../../../../shared/types';
import { apiClient } from '../http/client';

export const CarWashService = {
  async createCarWashPackage(data: {
    name: string;
    description: string;
    packageType: 'basic' | 'premium' | 'deluxe' | 'detailing' | 'custom';
    services: Array<{
      serviceName: string;
      serviceType: 'exterior' | 'interior' | 'engine' | 'special';
      duration: number;
      price: number;
      description: string;
      isOptional: boolean;
      order: number;
    }>;
    basePrice: number;
    vehicleTypeMultipliers: {
      car: number;
      suv: number;
      truck: number;
      motorcycle: number;
      van: number;
    };
    features: {
      includesInterior: boolean;
      includesExterior: boolean;
      includesEngine: boolean;
      includesWaxing: boolean;
      includesPolishing: boolean;
      includesDetailing: boolean;
      ecoFriendly: boolean;
      premiumProducts: boolean;
    };
    images?: string[];
    thumbnail?: string;
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post('/carwash/packages', data);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Create car wash package error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Paket oluşturulamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getCarWashPackages(packageType?: string): Promise<ApiResponse<unknown>> {
    try {
      const params = packageType ? { packageType } : {};
      const response = await apiClient.get('/carwash/packages', { params });
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Get car wash packages error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Paketler getirilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async createCarWashJob(data: {
    customerId: string;
    vehicleId: string;
    packageId: string;
    vehicleInfo: {
      brand: string;
      model: string;
      year: number;
      plateNumber: string;
      vehicleType: 'car' | 'suv' | 'truck' | 'motorcycle' | 'van';
      color: string;
      size: 'small' | 'medium' | 'large' | 'extra_large';
    };
    location: {
      address: string;
      coordinates: { lat: number; lng: number };
      isMobile: boolean;
    };
    specialRequests?: string[];
    notes?: string;
    scheduledAt?: Date;
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post('/carwash/jobs', data);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Create car wash job error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Yıkama işi oluşturulamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async startCarWashJob(jobId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/carwash/jobs/${jobId}/start`);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Start car wash job error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş başlatılamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async completeCarWashService(jobId: string, serviceName: string, photos?: string[], notes?: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/carwash/jobs/${jobId}/services/${serviceName}/complete`, {
        photos,
        notes
      });
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Complete car wash service error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Hizmet tamamlanamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async completeCarWashJob(jobId: string, qualityData: {
    passed: boolean;
    checkedBy: string;
    issues?: string[];
    photos?: string[];
    customerRating?: number;
    customerFeedback?: string;
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/carwash/jobs/${jobId}/complete`, qualityData);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Complete car wash job error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş tamamlanamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getCarWashJobs(status?: string, date?: string): Promise<ApiResponse<unknown>> {
    try {
      const params: Record<string, unknown> = {};
      if (status) params.status = status;
      if (date) params.date = date;
      
      const response = await apiClient.get('/carwash/jobs', { params });
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Get car wash jobs error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Yıkama işleri getirilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async getCarWashJobById(jobId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get(`/carwash/jobs/${jobId}`);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Get car wash job error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş detayı getirilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async setupLoyaltyProgram(data: {
    programName: string;
    description: string;
    loyaltyLevels: Array<{
      level: 'bronze' | 'silver' | 'gold' | 'platinum';
      levelName: string;
      minVisits: number;
      minSpent: number;
      benefits: {
        discountPercentage: number;
        priorityService: boolean;
        freeUpgrades: boolean;
        specialOffers: boolean;
        birthdayDiscount: number;
      };
      color: string;
      icon: string;
    }>;
    campaigns?: unknown[];
    referralProgram?: unknown;
    birthdayCampaign?: unknown;
    pointsSystem?: unknown;
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post('/carwash/loyalty-program', data);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Setup loyalty program error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Sadakat programı oluşturulamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getLoyaltyProgram(): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/carwash/loyalty-program');
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Get loyalty program error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Sadakat programı getirilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async createWashPackage(data: {
    name: string;
    description: string;
    packageType: 'quick_exterior' | 'standard' | 'detailed_interior' | 'ceramic_protection' | 'engine' | 'custom';
    basePrice: number;
    duration: number;
    services: Array<{
      name: string;
      category: 'exterior' | 'interior' | 'engine' | 'special';
      order: number;
    }>;
    extras?: Array<{
      name: string;
      description: string;
      price: number;
      duration: number;
    }>;
    availableFor?: 'shop' | 'mobile' | 'both';
    requirements?: {
      requiresPower?: boolean;
      requiresWater?: boolean;
      requiresCoveredArea?: boolean;
    };
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post('/wash/packages/create', data);
      return response.data;
    } catch (error: unknown) {
      console.error('Create wash package error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Paket oluşturulamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getMyWashPackages(): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/wash/my-packages');
      return response.data;
    } catch (error: unknown) {
      console.error('Get my wash packages error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Paketler getirilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async updateWashPackage(packageId: string, data: unknown): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.put(`/wash/packages/${packageId}`, data);
      return response.data;
    } catch (error: unknown) {
      console.error('Update wash package error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Paket güncellenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async deleteWashPackage(packageId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.delete(`/wash/packages/${packageId}`);
      return response.data;
    } catch (error: unknown) {
      console.error('Delete wash package error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Paket silinemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async getAllWashPackages(params?: { providerId?: string; type?: string }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/wash/packages', { params });
      return response.data;
    } catch (error: unknown) {
      console.error('Get all wash packages error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Paketler getirilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async getWashJobs(status?: string): Promise<ApiResponse<unknown>> {
    try {
      const params = status ? { status } : {};
      const response = await apiClient.get('/wash/jobs', { params });
      return response.data;
    } catch (error: unknown) {
      console.error('Get wash jobs error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İşler getirilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async acceptWashJob(jobId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/wash/jobs/${jobId}/accept`);
      return response.data;
    } catch (error: unknown) {
      console.error('Accept wash job error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş kabul edilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async checkInWashJob(jobId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/wash/jobs/${jobId}/checkin`);
      return response.data;
    } catch (error: unknown) {
      console.error('Check-in wash job error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Check-in yapılamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async startWashJob(jobId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/wash/jobs/${jobId}/start`);
      return response.data;
    } catch (error: unknown) {
      console.error('Start wash job error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş başlatılamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async updateWashProgress(jobId: string, data: {
    stepIndex: number;
    photos?: string[];
    notes?: string;
    completed?: boolean;
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/wash/jobs/${jobId}/progress`, data);
      return response.data;
    } catch (error: unknown) {
      console.error('Update wash progress error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İlerleme güncellenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async submitWashQA(jobId: string, data: {
    photosBefore: string[];
    photosAfter: string[];
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/wash/jobs/${jobId}/qa-submit`, data);
      return response.data;
    } catch (error: unknown) {
      console.error('Submit wash QA error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'QA gönderilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async setupWashProvider(data: unknown): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post('/wash/provider/setup', data);
      return response.data;
    } catch (error: unknown) {
      console.error('Setup wash provider error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İşletme ayarları kaydedilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async getMyWashProvider(): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/wash/provider/my-profile');
      return response.data;
    } catch (error: unknown) {
      console.error('Get my wash provider error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İşletme profili getirilemedi',
        err.response?.data?.error?.details
      );
    }
  }
};

