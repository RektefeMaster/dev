import { apiClient } from '../http/client';
import { ApiResponse } from '@/shared/types/common';
import { createErrorResponse, ErrorCode } from '../../../../shared/types';

export const ServiceCatalogService = {
  async getServiceCatalog(searchQuery?: string, category?: string): Promise<ApiResponse<unknown>> {
    try {
      const params: Record<string, unknown> = {};
      if (searchQuery) params.search = searchQuery;
      if (category) params.category = category;
      
      // Service catalog muhtemelen user profilinden geliyor veya ayrı bir endpoint var
      // Önce /users/service-catalog deneyelim, yoksa /mechanic/service-catalog
      const response = await apiClient.get('/users/service-catalog', { params });
      return response.data;
    } catch (error: unknown) {
      // Eğer endpoint yoksa, mechanic profilinden serviceCatalog array'ini al
      try {
        const profileResponse = await apiClient.get('/mechanic/me');
        if (profileResponse.data.success && profileResponse.data.data) {
          let services = profileResponse.data.data.serviceCatalog || [];
          
          // Filter by search query
          if (searchQuery) {
            services = services.filter((service: any) =>
              service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              service.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
          }
          
          // Filter by category
          if (category) {
            services = services.filter((service: any) => service.category === category);
          }
          
          return {
            success: true,
            data: services,
            message: 'Hizmet kataloğu başarıyla getirildi'
          };
        }
      } catch (profileError) {
        // Fallback failed
      }
      
      console.error('Get service catalog error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Hizmet kataloğu alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async createService(serviceData: {
    name: string;
    category: string;
    description?: string;
    price: number;
    duration: number;
    isActive?: boolean;
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post('/users/service-catalog', serviceData);
      return response.data;
    } catch (error: unknown) {
      console.error('Create service error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Hizmet oluşturulamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async updateService(serviceId: string, serviceData: unknown): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.put(`/users/service-catalog/${serviceId}`, serviceData);
      return response.data;
    } catch (error: unknown) {
      console.error('Update service error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Hizmet güncellenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async deleteService(serviceId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete(`/users/service-catalog/${serviceId}`);
      return response.data;
    } catch (error: unknown) {
      console.error('Delete service error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Hizmet silinemedi',
        err.response?.data?.error?.details
      );
    }
  }
};

