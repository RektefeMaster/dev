import { apiClient } from '../http/client';
import { ApiResponse } from '@/shared/types/common';
import { createErrorResponse, ErrorCode } from '../../../../shared/types';

export const CustomerService = {
  async getMechanicCustomers(filters?: unknown): Promise<ApiResponse<{ customers: unknown[] }>> {
    try {
      const response = await apiClient.get('/customers', { params: filters });
      return response.data;
    } catch (error: unknown) {
      console.error('Get mechanic customers error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Müşteri listesi alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getCustomerDetails(customerId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get(`/customers/${customerId}`);
      return response.data;
    } catch (error: unknown) {
      console.error('Get customer details error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Müşteri detayları alınamadı', err.response?.data?.error?.details);
    }
  },

  async addCustomerNote(customerId: string, note: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/customers/${customerId}/notes`, { note });
      return response.data;
    } catch (error: unknown) {
      console.error('Add customer note error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Not eklenemedi', err.response?.data?.error?.details);
    }
  }
};
