import { ApiResponse } from '@/shared/types/common';
import { createSuccessResponse, createErrorResponse, ErrorCode } from '../../../../shared/types';
import { apiClient } from '../http/client';

export const TireService = {
  async getTireJobs(filters?: { status?: string; serviceType?: string }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/tire-service/jobs', { params: filters });
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Get tire jobs error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Lastik işleri getirilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async acceptTireJob(jobId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.patch(`/tire-service/${jobId}/accept`);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Accept tire job error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş kabul edilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async startTireJob(jobId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.patch(`/tire-service/${jobId}/start`);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Start tire job error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş başlatılamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async completeTireJob(jobId: string, data: {
    notes?: string;
    finalPrice?: number;
    warrantyInfo?: {
      duration: number;
      conditions: string[];
    };
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.patch(`/tire-service/${jobId}/complete`, data);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Complete tire job error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş tamamlanamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async sendTirePriceQuote(jobId: string, quoteData: {
    amount: number;
    breakdown?: {
      labor?: number;
      parts?: number;
      tax?: number;
    };
    notes?: string;
    estimatedDuration?: number;
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/tire-service/${jobId}/price-quote`, quoteData);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Send tire price quote error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Fiyat teklifi gönderilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async saveTireHealthCheck(data: {
    vehicleId: string;
    userId: string;
    checkDate?: Date;
    treadDepth: [number, number, number, number];
    pressure: [number, number, number, number];
    condition: [string, string, string, string];
    overallCondition: string;
    photos?: string[];
    recommendations: string[];
    issues?: string[];
    notes?: string;
    nextCheckDate?: Date;
    nextCheckKm?: number;
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post('/tire-service/health-check', data);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Save tire health check error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Lastik sağlık kontrolü kaydedilemedi',
        err.response?.data?.error?.details
      );
    }
  }
};

