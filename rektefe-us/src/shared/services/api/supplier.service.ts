import { apiClient } from '../http/client';
import { ApiResponse } from '@/shared/types/common';
import { createErrorResponse, ErrorCode } from '../../../../shared/types';

export const SupplierService = {
  async getSuppliers(searchQuery?: string, specialty?: string): Promise<ApiResponse<unknown>> {
    try {
      const params: Record<string, unknown> = {};
      if (searchQuery) params.search = searchQuery;
      if (specialty) params.specialty = specialty;
      
      const response = await apiClient.get('/suppliers', { params });
      return response.data;
    } catch (error: unknown) {
      console.error('Get suppliers error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Tedarikçiler alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getSupplierSpecialties(): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/suppliers/specialties');
      return response.data;
    } catch (error: unknown) {
      console.error('Get supplier specialties error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Tedarikçi uzmanlık alanları alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async createSupplier(supplierData: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    specialties?: string[];
    notes?: string;
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post('/suppliers', supplierData);
      return response.data;
    } catch (error: unknown) {
      console.error('Create supplier error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Tedarikçi oluşturulamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async updateSupplier(supplierId: string, supplierData: unknown): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.put(`/suppliers/${supplierId}`, supplierData);
      return response.data;
    } catch (error: unknown) {
      console.error('Update supplier error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Tedarikçi güncellenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async deleteSupplier(supplierId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete(`/suppliers/${supplierId}`);
      return response.data;
    } catch (error: unknown) {
      console.error('Delete supplier error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Tedarikçi silinemedi',
        err.response?.data?.error?.details
      );
    }
  }
};

