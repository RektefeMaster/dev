import { apiClient } from '../http/client';
import { ApiResponse } from '@/shared/types/common';
import { createErrorResponse, createSuccessResponse, ErrorCode } from '../../../../shared/types';

export const EarningsService = {
  async getEarningsSummary(): Promise<ApiResponse<{ earnings: unknown }>> {
    try {
      const response = await apiClient.get('/mechanic-earnings/summary');
      return response.data;
    } catch (error: unknown) {
      console.error('Get earnings summary error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kazanç özeti alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getPaymentHistory(): Promise<ApiResponse<{ payments: unknown[] }>> {
    try {
      const response = await apiClient.get('/mechanic-earnings/transactions');
      return response.data;
    } catch (error: unknown) {
      console.error('Get payment history error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Ödeme geçmişi alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getMechanicEarnings(): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/mechanic/wallet');
      if (response.data.success && response.data.data) {
        const wallet = response.data.data;
        return createSuccessResponse({
          thisMonth: wallet.balance || 0,
          completedJobs: 0,
          averagePerJob: 0,
          pendingPayments: wallet.pendingAmount || 0,
          allTime: wallet.totalEarnings || 0
        });
      }
      return response.data;
    } catch (error: unknown) {
      console.error('Get mechanic earnings error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kazanç bilgileri alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getEarningsSummaryByPeriod(period: 'thisMonth' | 'lastMonth' | 'allTime' = 'thisMonth'): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/mechanic/earnings-summary', {
        params: { period }
      });
      return response.data;
    } catch (error: unknown) {
      console.error('Get earnings summary by period error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kazanç özeti alınamadı',
        err.response?.data?.error?.details
      );
    }
  }
};
