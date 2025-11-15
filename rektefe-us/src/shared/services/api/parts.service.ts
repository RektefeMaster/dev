import { ApiResponse } from '@/shared/types/common';
import { createErrorResponse, ErrorCode } from '../../../../shared/types';
import { apiClient } from '../http/client';

export const PartsService = {
  async getMechanicParts(filters?: { isPublished?: boolean; isActive?: boolean; category?: string }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/parts/mechanic', { params: filters });
      return response.data;
    } catch (error: unknown) {
      console.error('Get mechanic parts error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Parçalar yüklenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async createPart(data: {
    partName: string;
    brand: string;
    partNumber?: string;
    description?: string;
    photos?: string[];
    category: string;
    compatibility: {
      makeModel: string[];
      years: { start: number; end: number };
      engine?: string[];
      vinPrefix?: string[];
      notes?: string;
    };
    stock: {
      quantity: number;
      lowThreshold: number;
    };
    pricing: {
      unitPrice: number;
      oldPrice?: number;
      currency: string;
      isNegotiable: boolean;
    };
    condition: string;
    warranty?: {
      months: number;
      description: string;
    };
    isPublished?: boolean;
  }): Promise<ApiResponse<unknown>> {
    try {
      if (__DEV__) {
        console.log('🔍 [API] createPart çağrıldı:', {
          partName: data.partName,
          category: data.category,
          stockQuantity: data.stock.quantity,
          unitPrice: data.pricing.unitPrice,
          photosCount: data.photos?.length || 0,
        });
      }
      
      const payload = {
        ...data,
        photos: data.photos && data.photos.length > 0 ? data.photos : [],
      };
      
      const response = await apiClient.post('/parts', payload);
      
      if (__DEV__) {
        console.log('✅ [API] createPart başarılı:', {
          success: response.data?.success,
          message: response.data?.message,
          partId: response.data?.data?._id,
        });
      }
      
      return response.data;
    } catch (error: unknown) {
      if (__DEV__) {
        const err = error as any;
        console.error('❌ [API] createPart error:', {
          status: err.response?.status,
          message: err.response?.data?.message || err.message,
          url: err.config?.url,
          errorDetails: err.response?.data,
        });
      }
      
      const err = error as any;
      if (err.response?.status === 401) {
        return createErrorResponse(
          ErrorCode.UNAUTHORIZED,
          err.response?.data?.message || 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
          err.response?.data?.error?.details
        );
      }
      
      return createErrorResponse(
        err.response?.status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.BAD_REQUEST,
        err.response?.data?.message || 'Parça oluşturulamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async updatePart(partId: string, data: unknown): Promise<ApiResponse<unknown>> {
    try {
      if (__DEV__) {
        const dataObj = data as Record<string, unknown>;
        console.log('🔍 [API] updatePart çağrıldı:', {
          partId,
          dataKeys: Object.keys(dataObj),
          hasStock: !!dataObj.stock,
          stockData: dataObj.stock,
        });
      }
      
      const response = await apiClient.put(`/parts/${partId}`, data);
      
      if (__DEV__) {
        console.log('✅ [API] updatePart başarılı:', {
          success: response.data?.success,
          message: response.data?.message,
        });
      }
      
      return response.data;
    } catch (error: unknown) {
      if (__DEV__) {
        const err = error as any;
        console.error('❌ [API] updatePart error:', {
          status: err.response?.status,
          message: err.response?.data?.message || err.message,
          url: err.config?.url,
          errorDetails: err.response?.data,
        });
      }
      
      const err = error as any;
      if (err.response?.status === 401) {
        return createErrorResponse(
          ErrorCode.UNAUTHORIZED,
          err.response?.data?.message || 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
          err.response?.data?.error?.details
        );
      }
      
      return createErrorResponse(
        err.response?.status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.BAD_REQUEST,
        err.response?.data?.message || 'Parça güncellenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async searchParts(filters?: {
    query?: string;
    category?: string;
    makeModel?: string;
    year?: number;
    vin?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/parts/market', { params: filters });
      return response.data;
    } catch (error: unknown) {
      console.error('Search parts error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Arama yapılamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getPartDetail(partId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get(`/parts/${partId}`);
      return response.data;
    } catch (error: unknown) {
      console.error('Get part detail error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Parça detayı yüklenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async uploadPartPhoto(photoUri: string): Promise<ApiResponse<unknown>> {
    try {
      const formData = new FormData();
      const fileData: { uri: string; type: string; name: string } = {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      };
      formData.append('image', fileData as unknown as Blob);

      const response = await apiClient.post('/upload/parts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error: unknown) {
      console.error('Upload part photo error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR, 
        'Fotoğraf yüklenemedi', 
        err.response?.data?.error?.details
      );
    }
  },

  async createReservation(data: {
    partId: string;
    vehicleId?: string;
    quantity: number;
    delivery: {
      method: string;
      address?: string;
    };
    payment: {
      method: string;
    };
  }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post('/parts/reserve', data);
      return response.data;
    } catch (error: unknown) {
      console.error('Create reservation error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Rezervasyon oluşturulamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async deliverReservation(reservationId: string): Promise<ApiResponse<unknown>> {
    try {
      if (__DEV__) {
        console.log('🔍 [API] deliverReservation çağrıldı:', reservationId);
      }

      const response = await apiClient.post(`/parts/reservations/${reservationId}/deliver`);

      return response.data;
    } catch (error: unknown) {
      if (__DEV__) {
        const err = error as any;
        console.error('❌ [API] deliverReservation error:', {
          status: err.response?.status,
          message: err.response?.data?.message || err.message,
          url: err.config?.url,
        });
      }

      const err = error as any;
      if (err.response?.status === 401) {
        return createErrorResponse(
          ErrorCode.UNAUTHORIZED,
          err.response?.data?.message || 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
          err.response?.data?.error?.details
        );
      }

      return createErrorResponse(
        err.response?.status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.BAD_REQUEST,
        err.response?.data?.message || 'Teslim işareti verilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async approveReservation(reservationId: string): Promise<ApiResponse<unknown>> {
    try {
      if (__DEV__) {
        console.log('🔍 [API] approveReservation çağrıldı:', reservationId);
      }
      
      const response = await apiClient.post(`/parts/reservations/${reservationId}/approve`);
      
      if (__DEV__) {
        console.log('✅ [API] approveReservation başarılı:', {
          success: response.data?.success,
          message: response.data?.message,
          dataStatus: response.data?.data?.status,
        });
      }
      
      return response.data;
    } catch (error: unknown) {
      if (__DEV__) {
        const err = error as any;
        console.error('❌ [API] approveReservation error:', {
          status: err.response?.status,
          message: err.response?.data?.message || err.message,
          url: err.config?.url,
        });
      }
      
      const err = error as any;
      if (err.response?.status === 401) {
        return createErrorResponse(
          ErrorCode.UNAUTHORIZED,
          err.response?.data?.message || 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
          err.response?.data?.error?.details
        );
      }
      
      if (err.response?.status === 409) {
        return createErrorResponse(
          ErrorCode.BAD_REQUEST,
          err.response?.data?.message || 'Rezervasyon onaylanamadı. Stok yetersiz olabilir.',
          err.response?.data?.error?.details
        );
      }
      
      return createErrorResponse(
        err.response?.status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.BAD_REQUEST,
        err.response?.data?.message || 'Rezervasyon onaylanamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async cancelReservation(reservationId: string, reason?: string, cancelledBy?: string): Promise<ApiResponse<unknown>> {
    try {
      if (__DEV__) {
        console.log('🔍 [API] cancelReservation çağrıldı:', {
          reservationId,
          reason,
          cancelledBy,
        });
      }
      
      const response = await apiClient.post(`/parts/reservations/${reservationId}/cancel`, {
        reason,
        cancelledBy
      });
      
      if (__DEV__) {
        console.log('✅ [API] cancelReservation başarılı:', {
          success: response.data?.success,
          message: response.data?.message,
        });
      }
      
      return response.data;
    } catch (error: unknown) {
      if (__DEV__) {
        const err = error as any;
        console.error('❌ [API] cancelReservation error:', {
          status: err.response?.status,
          message: err.response?.data?.message || err.message,
          url: err.config?.url,
        });
      }
      
      const err = error as any;
      if (err.response?.status === 401) {
        return createErrorResponse(
          ErrorCode.UNAUTHORIZED,
          err.response?.data?.message || 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
          err.response?.data?.error?.details
        );
      }
      
      return createErrorResponse(
        err.response?.status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.BAD_REQUEST,
        err.response?.data?.message || 'Rezervasyon iptal edilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async getMechanicReservations(filters?: { status?: string }): Promise<ApiResponse<unknown>> {
    try {
      if (__DEV__) {
        console.log('🔍 [API] getMechanicReservations çağrıldı, filters:', filters);
      }
      
      const response = await apiClient.get('/parts/mechanic/reservations', { params: filters });
      
      if (__DEV__) {
        console.log('✅ [API] getMechanicReservations başarılı:', {
          success: response.data?.success,
          hasData: !!response.data?.data,
          dataLength: Array.isArray(response.data?.data) ? response.data.data.length : 0,
        });
      }
      
      return response.data;
    } catch (error: unknown) {
      if (__DEV__) {
        const err = error as any;
        console.error('❌ [API] getMechanicReservations error:', {
          status: err.response?.status,
          message: err.response?.data?.message || err.message,
          url: err.config?.url,
        });
      }
      
      const err = error as any;
      if (err.response?.status === 401) {
        return createErrorResponse(
          ErrorCode.UNAUTHORIZED,
          err.response?.data?.message || 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
          err.response?.data?.error?.details
        );
      }
      
      return createErrorResponse(
        err.response?.status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.BAD_REQUEST,
        err.response?.data?.message || 'Rezervasyonlar yüklenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async getMyReservations(filters?: { status?: string }): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/parts/my-reservations', { params: filters });
      return response.data;
    } catch (error: unknown) {
      console.error('Get my reservations error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Rezervasyonlar yüklenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async negotiateReservationPrice(
    reservationId: string,
    requestedPrice: number,
    message?: string
  ): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post(`/parts/reservations/${reservationId}/negotiate`, {
        requestedPrice,
        message
      });
      return response.data;
    } catch (error: unknown) {
      console.error('Negotiate reservation price error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Pazarlık teklifi gönderilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async respondToNegotiation(
    reservationId: string,
    action: 'accept' | 'reject',
    counterPrice?: number
  ): Promise<ApiResponse<unknown>> {
    try {
      if (__DEV__) {
        console.log('🔍 [API] respondToNegotiation çağrıldı:', {
          reservationId,
          action,
          counterPrice,
        });
      }
      
      const response = await apiClient.post(`/parts/reservations/${reservationId}/negotiation-response`, {
        action,
        counterPrice
      });
      
      if (__DEV__) {
        console.log('✅ [API] respondToNegotiation başarılı:', {
          success: response.data?.success,
          message: response.data?.message,
        });
      }
      
      return response.data;
    } catch (error: unknown) {
      if (__DEV__) {
        const err = error as any;
        console.error('❌ [API] respondToNegotiation error:', {
          status: err.response?.status,
          message: err.response?.data?.message || err.message,
          url: err.config?.url,
        });
      }
      
      const err = error as any;
      if (err.response?.status === 401) {
        return createErrorResponse(
          ErrorCode.UNAUTHORIZED,
          err.response?.data?.message || 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
          err.response?.data?.error?.details
        );
      }
      
      return createErrorResponse(
        err.response?.status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.BAD_REQUEST,
        err.response?.data?.message || 'Pazarlık yanıtı verilemedi',
        err.response?.data?.error?.details
      );
    }
  }
};

