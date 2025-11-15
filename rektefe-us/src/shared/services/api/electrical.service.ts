import { ApiResponse } from '@/shared/types/common';
import { createSuccessResponse, createErrorResponse, ErrorCode } from '../../../../shared/types';
import { apiClient } from '../http/client';

export const ElectricalService = {
  async createElectricalJob(data: {
    customerId: string;
    vehicleId: string;
    electricalInfo: {
      description: string;
      photos: string[];
      videos?: string[];
      systemType: 'klima' | 'far' | 'alternator' | 'batarya' | 'elektrik-araci' | 'sinyal' | 'diger';
      problemType: 'calismiyor' | 'arizali-bos' | 'ariza-gostergesi' | 'ses-yapiyor' | 'isinma-sorunu' | 'kisa-devre' | 'tetik-atmiyor' | 'diger';
      urgencyLevel: 'normal' | 'acil';
      isRecurring: boolean;
      lastWorkingCondition?: string;
      estimatedRepairTime: number;
    };
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post('/electrical', data);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Create electrical job error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Elektrik işi oluşturulamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async prepareQuote(jobId: string, quoteData: {
    partsToReplace: Array<{
      partName: string;
      partNumber?: string;
      brand: string;
      quantity: number;
      unitPrice: number;
      notes?: string;
    }>;
    partsToRepair: Array<{
      partName: string;
      laborHours: number;
      laborRate: number;
      notes?: string;
    }>;
    diagnosisCost: number;
    testingCost: number;
    validityDays?: number;
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/electrical/${jobId}/quote`, quoteData);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Prepare quote error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Teklif hazırlanamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async sendQuote(jobId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/electrical/${jobId}/quote/send`);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Send quote error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Teklif gönderilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async updateWorkflowStage(jobId: string, stageData: {
    stage: string;
    status: 'in_progress' | 'completed' | 'skipped';
    photos?: string[];
    notes?: string;
    assignedTo?: string;
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.put(`/electrical/${jobId}/workflow`, stageData);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Update workflow stage error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş akışı güncellenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async requestCustomerApproval(jobId: string, stage: string, photos?: string[]): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/electrical/${jobId}/request-approval`, {
        stage,
        photos
      });
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Request customer approval error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Müşteri onayı istenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async performQualityCheck(jobId: string, qualityData: {
    passed: boolean;
    checkedBy: string;
    issues?: string[];
    photos?: string[];
    notes?: string;
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/electrical/${jobId}/quality-check`, qualityData);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Perform quality check error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kalite kontrol yapılamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getElectricalJobs(status?: string, page?: number, limit?: number): Promise<ApiResponse<unknown>> {
    try {
      const params: Record<string, unknown> = {};
      if (status) params.status = status;
      if (page) params.page = page;
      if (limit) params.limit = limit;
      const response = await apiClient.get('/electrical/mechanic', { params });
      if (response.data && response.data.success) {
        return createSuccessResponse(response.data.data || [], response.data.pagination);
      }
      return createSuccessResponse([], undefined);
    } catch (error: unknown) {
      console.error('Get electrical jobs error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Elektrik işleri getirilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async getElectricalJobById(jobId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get(`/electrical/${jobId}`);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Get electrical job by id error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Elektrik işi detayı getirilemedi',
        err.response?.data?.error?.details
      );
    }
  }
};

