import axios from 'axios';
import { AppointmentData, ApiResponse } from '@/shared/types/common';
import { AppointmentStatus, createErrorResponse, ErrorCode } from '../../../../shared/types';
import { apiClient } from '../http/client';

export const AppointmentService = {
  async getAppointments(status?: AppointmentStatus): Promise<ApiResponse<{ appointments: unknown[] }>> {
    try {
      const params = status ? { status } : {};
      const response = await apiClient.get('/appointments/mechanic', { params });
      return response.data;
    } catch (error: unknown) {
      if (axios.isCancel(error)) {
        return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Request cancelled', undefined);
      }
      console.error('❌ Get appointments error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Randevu listesi alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getAppointmentDetails(id: string): Promise<ApiResponse<{ appointment: unknown }>> {
    try {
      const response = await apiClient.get(`/appointments/${id}`);
      return response.data;
    } catch (error: unknown) {
      console.error('Get appointment details error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Randevu detayları alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async updateAppointment(id: string, data: Partial<AppointmentData>): Promise<ApiResponse<{ appointment: unknown }>> {
    try {
      const response = await apiClient.put(`/appointments/${id}`, data);
      return response.data;
    } catch (error: unknown) {
      console.error('Update appointment error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Randevu güncellenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async updateAppointmentStatus(id: string, status: AppointmentStatus, price?: number): Promise<ApiResponse<{ appointment: unknown }>> {
    try {
      const payload: any = { status };
      if (price !== undefined && price > 0) {
        payload.price = price;
        console.log(`💰 Randevu fiyatı ile birlikte güncelleniyor: ${price}₺`);
      }
      
      const response = await apiClient.put(`/appointments/${id}/status`, payload);
      return response.data;
    } catch (error: unknown) {
      console.error('Update appointment status error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Randevu durumu güncellenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async acceptAppointment(id: string): Promise<ApiResponse<{ appointment: unknown }>> {
    try {
      const response = await apiClient.put(`/appointments/${id}/accept`);
      return response.data;
    } catch (error: unknown) {
      console.error('Accept appointment error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Randevu kabul edilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async rejectAppointment(id: string, reason?: string): Promise<ApiResponse<{ appointment: unknown }>> {
    try {
      const response = await apiClient.put(`/appointments/${id}/reject`, { rejectionReason: reason });
      return response.data;
    } catch (error: unknown) {
      console.error('Reject appointment error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Randevu reddedilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async getMechanicAppointments(status?: string, filters?: any): Promise<ApiResponse<{ appointments: unknown[] }>> {
    try {
      const params: any = {};
      if (status) params.status = status;
      if (filters) Object.assign(params, filters);
      
      const response = await apiClient.get('/appointments/mechanic', { params });
      return response.data;
    } catch (error: unknown) {
      if (axios.isCancel(error)) {
        return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Request cancelled', undefined);
      }
      console.error('Get mechanic appointments error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Randevular alınamadı', err.response?.data?.error?.details);
    }
  },

  async getMechanicAppointmentCounts(): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/mechanic/appointments/counts');
      return response.data;
    } catch (error: unknown) {
      console.error('Get appointment counts error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Randevu sayıları alınamadı', err.response?.data?.error?.details);
    }
  },

  async getMechanicServiceRequests(status?: string, serviceType?: string): Promise<ApiResponse<unknown>> {
    try {
      const params: any = {};
      if (status) params.status = status;
      if (serviceType) params.serviceType = serviceType;
      
      const response = await apiClient.get('/appointments/mechanic', { params });
      return response.data;
    } catch (error: unknown) {
      if (axios.isCancel(error)) {
        return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Request cancelled', undefined);
      }
      console.error('❌ Get service requests error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Servis talepleri alınamadı', err.response?.data?.error?.details);
    }
  },

  async getAppointmentById(id: string): Promise<ApiResponse<{ appointment: unknown }>> {
    try {
      const response = await apiClient.get(`/appointments/${id}`);
      return response.data;
    } catch (error: unknown) {
      console.error('Get appointment by ID error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Randevu detayları alınamadı', err.response?.data?.error?.details);
    }
  },

  async approveAppointment(id: string, data?: any): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.put(`/appointments/${id}/approve`, data);
      return response.data;
    } catch (error: unknown) {
      console.error('Approve appointment error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Randevu onaylanamadı', err.response?.data?.error?.details);
    }
  },

  async startAppointment(id: string): Promise<ApiResponse<unknown>> {
    try {
      console.log('🔍 API: Starting appointment:', id);
      const response = await apiClient.put(`/appointments/${id}/start`);
      console.log('✅ API: Appointment started:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Start appointment error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'İş başlatılamadı', err.response?.data?.error?.details);
    }
  },

  async completeAppointment(id: string, data: {
    completionNotes: string;
    price?: number;
    estimatedDuration?: number;
  }): Promise<ApiResponse<unknown>> {
    try {
      console.log('🔍 API: Completing appointment:', id, data);
      const response = await apiClient.put(`/appointments/${id}/complete`, data);
      console.log('✅ API: Appointment completed:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Complete appointment error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'İş tamamlanamadı', err.response?.data?.error?.details);
    }
  },

  async addExtraCharge(id: string, data: {
    amount: number;
    reason: string;
  }): Promise<ApiResponse<unknown>> {
    try {
      console.log('🔍 API: Adding extra charge:', id, data);
      const response = await apiClient.post(`/appointments/${id}/extra-charges`, data);
      console.log('✅ API: Extra charge added:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Add extra charge error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Ek ücret eklenemedi', err.response?.data?.error?.details);
    }
  },

  async updateJobStatus(id: string, status: string, notes?: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.put(`/appointments/${id}/job-status`, { status, notes });
      return response.data;
    } catch (error: unknown) {
      console.error('Update job status error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'İş durumu güncellenemedi', err.response?.data?.error?.details);
    }
  },

  async referJob(id: string, mechanicId?: string, notes?: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/appointments/${id}/refer`, { mechanicId, notes });
      return response.data;
    } catch (error: unknown) {
      console.error('Refer job error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'İş yönlendirilemedi', err.response?.data?.error?.details);
    }
  },

  async sendCustomerApproval(id: string, items?: any[], totalAmount?: number, notes?: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/appointments/${id}/customer-approval`, { items, totalAmount, notes });
      return response.data;
    } catch (error: unknown) {
      console.error('Send customer approval error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Müşteri onayı gönderilemedi', err.response?.data?.error?.details);
    }
  },

  async getJobStory(id: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get(`/appointments/${id}/job-story`);
      return response.data;
    } catch (error: unknown) {
      console.error('Get job story error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'İş hikayesi alınamadı', err.response?.data?.error?.details);
    }
  },

  async addJobStoryPhoto(id: string, photoUri: string, caption?: string): Promise<ApiResponse<unknown>> {
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as unknown as Blob);
      if (caption) formData.append('caption', caption);

      const response = await apiClient.post(`/appointments/${id}/job-story/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error: unknown) {
      console.error('Add job story photo error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Fotoğraf eklenemedi', err.response?.data?.error?.details);
    }
  },

  async deleteJobStoryPhoto(id: string, photoId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.delete(`/appointments/${id}/job-story/photo/${photoId}`);
      return response.data;
    } catch (error: unknown) {
      console.error('Delete job story photo error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Fotoğraf silinemedi', err.response?.data?.error?.details);
    }
  },

  async getAvailableStatuses(): Promise<ApiResponse<{ statuses: string[] }>> {
    try {
      const response = await apiClient.get('/appointments/available-statuses');
      return response.data;
    } catch (error: unknown) {
      console.error('Get available statuses error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Durumlar alınamadı', err.response?.data?.error?.details);
    }
  },

  async getTrustedMechanics(): Promise<ApiResponse<{ mechanics: unknown[] }>> {
    try {
      const response = await apiClient.get('/job-referrals/trusted-mechanics');
      return response.data;
    } catch (error: unknown) {
      console.error('Get trusted mechanics error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Güvenilir ustalar alınamadı', err.response?.data?.error?.details);
    }
  },

  async checkCustomerLoyalty(customerId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get(`/customers/${customerId}/loyalty`);
      return response.data;
    } catch (error: unknown) {
      console.error('Check customer loyalty error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Müşteri sadakat bilgisi alınamadı', err.response?.data?.error?.details);
    }
  },

  async updateAppointmentPriceIncrease(id: string, amount?: number, reason?: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.put(`/appointments/${id}/price-increase`, { amount, reason });
      return response.data;
    } catch (error: unknown) {
      console.error('Update price increase error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Fiyat artışı güncellenemedi', err.response?.data?.error?.details);
    }
  },

  handleError(error: unknown) {
    console.error('API Error:', error);
    const err = error as any;
    if (err.response) {
      return err.response.data;
    }
    return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Bir hata oluştu', null);
  },

  async getRecentActivity(): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/mechanic/dashboard/recent-activity');
      return response.data;
    } catch (error: unknown) {
      console.error('Get recent activity error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Son aktiviteler alınamadı', err.response?.data?.error?.details);
    }
  },

  async getRecentRatings(): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/appointment-ratings/current/recent');
      return response.data;
    } catch (error: unknown) {
      if (axios.isCancel(error)) {
        return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Request cancelled', undefined);
      }
      console.error('Get recent ratings error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Son değerlendirmeler alınamadı', err.response?.data?.error?.details);
    }
  },

  async getRatingStats(): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/appointment-ratings/current/stats');
      return response.data;
    } catch (error: unknown) {
      if (axios.isCancel(error)) {
        return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Request cancelled', undefined);
      }
      console.error('Get rating stats error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Değerlendirme istatistikleri alınamadı', err.response?.data?.error?.details);
    }
  },

  async getAppointmentStats(): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/mechanic/dashboard/stats');
      return response.data;
    } catch (error: unknown) {
      console.error('Get appointment stats error:', error);
      const err = error as any;
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Randevu istatistikleri alınamadı', err.response?.data?.error?.details);
    }
  }
};

