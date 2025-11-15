import { apiClient } from '../http/client';
import { ApiResponse } from '@/shared/types/common';
import { createErrorResponse, ErrorCode } from '../../../../shared/types';

export const VehicleService = {
  async getVehicleHistory(vehicleId: string, limit?: number): Promise<ApiResponse<unknown>> {
    try {
      const params = limit ? { limit } : {};
      const response = await apiClient.get(`/vehicle-history/${vehicleId}`, { params });
      return response.data;
    } catch (error: unknown) {
      console.error('Get vehicle history error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Araç geçmişi alınamadı',
        err.response?.data?.error?.details
      );
    }
  }
};

