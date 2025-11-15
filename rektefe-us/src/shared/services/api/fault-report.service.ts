import { apiClient } from '../http/client';
import { ApiResponse } from '@/shared/types/common';
import { createErrorResponse, ErrorCode } from '../../../../shared/types';

export const FaultReportService = {
  async getMechanicFaultReports(statusFilter?: string): Promise<ApiResponse<unknown[] | { faultReports: unknown[] }>> {
    try {
      const url = statusFilter ? `/fault-reports/mechanic/reports?status=${statusFilter}` : '/fault-reports/mechanic/reports';
      const response = await apiClient.get(url);
      return response.data;
    } catch (error: unknown) {
      console.error('Get mechanic fault reports error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Arıza raporları alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getFaultReportById(id: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get(`/fault-reports/mechanic/${id}`);
      return response.data;
    } catch (error: unknown) {
      console.error('Get fault report by ID error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Arıza raporu detayı alınamadı', err.response?.data?.error?.details);
    }
  },

  async submitQuote(faultReportId: string, quoteData: {
    quoteAmount: number;
    estimatedDuration: string;
    notes: string;
  }): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post(`/fault-reports/${faultReportId}/quote`, quoteData);
      return response.data;
    } catch (error: unknown) {
      console.error('Submit quote error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Teklif gönderilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async submitMechanicResponse(id: string, response: unknown): Promise<ApiResponse<unknown>> {
    try {
      const apiResponse = await apiClient.post(`/fault-reports/${id}/response`, response);
      return apiResponse.data;
    } catch (error: unknown) {
      console.error('Submit mechanic response error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Yanıt gönderilemedi', err.response?.data?.error?.details);
    }
  },

  async finalizeWork(id: string, finalData: unknown): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/fault-reports/${id}/finalize`, finalData);
      return response.data;
    } catch (error: unknown) {
      console.error('Finalize work error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'İş sonlandırılamadı', err.response?.data?.error?.details);
    }
  },

  async convertToBodyworkJob(faultReportId: string, mechanicId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/fault-reports/${faultReportId}/convert-to-bodywork-job`, {
        mechanicId
      });
      return response.data;
    } catch (error: unknown) {
      console.error('Convert to bodywork job error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Dönüştürme işlemi başarısız oldu',
        err.response?.data?.error?.details
      );
    }
  },

  async convertToElectricalJob(faultReportId: string, mechanicId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/fault-reports/${faultReportId}/convert-to-electrical-job`, {
        mechanicId
      });
      return response.data;
    } catch (error: unknown) {
      console.error('Convert to electrical job error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Dönüştürme işlemi başarısız oldu',
        err.response?.data?.error?.details
      );
    }
  }
};
