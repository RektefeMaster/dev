import { apiClient } from '../http/client';
import { ApiResponse } from '@/shared/types/common';
import { createErrorResponse, ErrorCode } from '../../../../shared/types';

export const ReportService = {
  async getEndOfDayReport(date: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/end-of-day/report', {
        params: { date }
      });
      return response.data;
    } catch (error: unknown) {
      console.error('Get end of day report error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Günlük rapor alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getDetailedStats(): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/mechanic/reports/detailed-stats');
      return response.data;
    } catch (error: unknown) {
      console.error('Get detailed stats error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Detaylı raporlar alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getSummary(): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/mechanic/reports/summary');
      return response.data;
    } catch (error: unknown) {
      console.error('Get report summary error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Rapor özeti alınamadı',
        err.response?.data?.error?.details
      );
    }
  }
};
