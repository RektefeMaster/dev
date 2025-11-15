import { ApiResponse } from '@/shared/types/common';
import { createSuccessResponse, createErrorResponse, ErrorCode } from '../../../../shared/types';
import { apiClient } from '../http/client';

export const BodyworkService = {
  async createBodyworkJob(data: {
    customerId: string;
    vehicleId: string;
    damageInfo: {
      description: string;
      photos: string[];
      videos?: string[];
      damageType: 'collision' | 'scratch' | 'dent' | 'rust' | 'paint_damage' | 'other';
      severity: 'minor' | 'moderate' | 'major' | 'severe';
      affectedAreas: string[];
      estimatedRepairTime: number;
    };
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post('/bodywork/create', data);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Create bodywork job error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kaporta işi oluşturulamadı',
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
    paintMaterials: Array<{
      materialName: string;
      quantity: number;
      unitPrice: number;
      notes?: string;
    }>;
    validityDays?: number;
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/bodywork/${jobId}/prepare-quote`, quoteData);
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
      const response = await apiClient.post(`/bodywork/${jobId}/send-quote`);
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
      const response = await apiClient.put(`/bodywork/${jobId}/workflow-stage`, stageData);
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

  async uploadBodyworkMedia(fileUri: string, fileType: 'image' | 'video'): Promise<ApiResponse<{ url: string }>> {
    try {
      const formData = new FormData();
      const filename = fileUri.split('/').pop() || 'media';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1] : 'jpg';
      
      const isVideo = fileType === 'video' || fileUri.includes('video') || fileUri.includes('.mp4') || fileUri.includes('.mov');
      const mimeType = isVideo 
        ? `video/${ext === 'mov' ? 'quicktime' : 'mp4'}` 
        : `image/${ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext}`;

      const fileData: { uri: string; type: string; name: string } = {
        uri: fileUri,
        type: mimeType,
        name: filename,
      };
      formData.append('media', fileData as unknown as Blob);

      const response = await apiClient.post('/upload/bodywork', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      return response.data;
    } catch (error: unknown) {
      console.error('Upload bodywork media error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Dosya yüklenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async requestCustomerApproval(jobId: string, stage: string, photos?: string[]): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/bodywork/${jobId}/request-approval`, {
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
      const response = await apiClient.post(`/bodywork/${jobId}/quality-check`, qualityData);
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

  async getBodyworkJobs(status?: string, page?: number, limit?: number): Promise<ApiResponse<unknown>> {
    try {
      const params: Record<string, unknown> = {};
      if (status) params.status = status;
      if (page) params.page = page;
      if (limit) params.limit = limit;
      const response = await apiClient.get('/bodywork/mechanic-jobs', { params });
      return createSuccessResponse(response.data.data, response.data.pagination);
    } catch (error: unknown) {
      console.error('Get bodywork jobs error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kaporta işleri getirilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async getBodyworkJobById(jobId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get(`/bodywork/${jobId}`);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Get bodywork job error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş detayı getirilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async createTemplate(data: {
    name: string;
    description: string;
    damageType: 'collision' | 'scratch' | 'dent' | 'rust' | 'paint_damage' | 'other';
    severity: 'minor' | 'moderate' | 'major' | 'severe';
    workflowTemplate: Array<{
      stage: string;
      stageName: string;
      estimatedHours: number;
      requiredPhotos: number;
      description: string;
      order: number;
    }>;
    standardParts: Array<{
      partName: string;
      partNumber?: string;
      brand: string;
      estimatedPrice: number;
      notes?: string;
    }>;
    standardMaterials: Array<{
      materialName: string;
      estimatedQuantity: number;
      estimatedPrice: number;
      notes?: string;
    }>;
    laborRates: {
      hourlyRate: number;
      overtimeRate: number;
      weekendRate: number;
    };
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post('/bodywork/templates', data);
      if (response.data && response.data.success) {
        return createSuccessResponse(response.data.data || response.data);
      }
      return createSuccessResponse(response.data.data || response.data);
    } catch (error: unknown) {
      console.error('Create template error:', error);
      const err = error as any;
      return createErrorResponse(
        err.response?.status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.BAD_REQUEST,
        err.response?.data?.message || 'Şablon oluşturulamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getTemplates(damageType?: string, severity?: string): Promise<ApiResponse<unknown>> {
    try {
      const params: Record<string, unknown> = {};
      if (damageType) params.damageType = damageType;
      if (severity) params.severity = severity;
      
      const response = await apiClient.get('/bodywork/templates', { params });
      if (response.data && response.data.success && response.data.data) {
        return createSuccessResponse(response.data.data);
      }
      return createSuccessResponse(response.data.data || response.data || []);
    } catch (error: unknown) {
      console.error('Get templates error:', error);
      const err = error as any;
      return createErrorResponse(
        err.response?.status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.BAD_REQUEST,
        err.response?.data?.message || 'Şablonlar getirilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async getTemplateById(templateId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get(`/bodywork/templates/${templateId}`);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Get template error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Şablon detayı getirilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async updateTemplate(templateId: string, data: unknown): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.put(`/bodywork/templates/${templateId}`, data);
      return createSuccessResponse(response.data.data);
    } catch (error: unknown) {
      console.error('Update template error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Şablon güncellenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async deleteTemplate(templateId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.delete(`/bodywork/templates/${templateId}`);
      return createSuccessResponse(response.data);
    } catch (error: unknown) {
      console.error('Delete template error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Şablon silinemedi',
        err.response?.data?.error?.details
      );
    }
  }
};

