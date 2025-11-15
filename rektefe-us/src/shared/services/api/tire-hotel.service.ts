import { apiClient } from '../http/client';
import { ApiResponse } from '@/shared/types/common';
import { createSuccessResponse, createErrorResponse, ErrorCode } from '../../../../shared/types';

export const TireHotelService = {
  async createTireStorage(data: {
    customerId: string;
    vehicleId: string;
    tireInfo: {
      brand: string;
      model: string;
      size: string;
      season: 'summer' | 'winter' | 'all-season';
      condition: 'new' | 'used' | 'refurbished';
      quantity: number;
      photos?: string[];
    };
    storagePeriod: {
      startDate: Date;
      endDate: Date;
    };
    location?: {
      address: string;
      coordinates: { lat: number; lng: number };
    };
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post('/tire-hotel/storage', data);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Create tire storage error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Lastik depolama oluşturulamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getTireStorages(status?: string): Promise<ApiResponse<unknown>> {
    try {
      const params = status ? { status } : {};
      const response = await apiClient.get('/tire-hotel/storage', { params });
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Get tire storages error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Lastik depoları getirilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async getTireStorageById(storageId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get(`/tire-hotel/storage/${storageId}`);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Get tire storage error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Lastik depolama detayı getirilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async updateTireStorage(storageId: string, data: unknown): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.put(`/tire-hotel/storage/${storageId}`, data);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Update tire storage error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Lastik depolama güncellenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async returnTireStorage(storageId: string, returnData: {
    returnDate: Date;
    condition: string;
    notes?: string;
    photos?: string[];
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/tire-hotel/storage/${storageId}/return`, returnData);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Return tire storage error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Lastik iade edilemedi',
        err.response?.data?.error?.details
      );
    }
  }
};
