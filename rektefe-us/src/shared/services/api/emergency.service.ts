import { apiClient } from '../http/client';
import { ApiResponse } from '@/shared/types/common';
import { createErrorResponse, ErrorCode } from '../../../../shared/types';

export const EmergencyService = {
  async getEmergencyTowingRequests(status?: string): Promise<ApiResponse<unknown>> {
    try {
      const url = status ? `/emergency/mechanic/emergency-requests?status=${status}` : '/emergency/mechanic/emergency-requests';
      const response = await apiClient.get(url);
      return response.data;
    } catch (error: unknown) {
      console.error('Get emergency towing requests error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Acil talepler alınamadı', err.response?.data?.error?.details);
    }
  },

  async respondToEmergencyTowingRequest(id: string, responseData: unknown): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post('/emergency/mechanic-response', { requestId: id, ...responseData as any });
      return response.data;
    } catch (error: unknown) {
      console.error('Respond to emergency towing request error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Yanıt gönderilemedi', err.response?.data?.error?.details);
    }
  }
};
