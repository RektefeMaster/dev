import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, STORAGE_KEYS } from '@/constants/config';
import { 
  Appointment, 
  MechanicProfile, 
  Conversation, 
  Message, 
  Rating,
  Notification,
  Payment,
  Vehicle,
  ServiceCategory,
  ApiResponse,
  User
} from '@/shared/types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - token ekle
    this.api.interceptors.request.use(
      async (config: any) => {
        try {
          const token = await this.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          }
        return config;
      },
      (error: any) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - hata yönetimi
    this.api.interceptors.response.use(
      (response: any) => response,
      (error: any) => {
        if (error.response?.status === 401) {
          // Token geçersiz, AsyncStorage'dan temizle
          this.clearToken();
        } else if (error.response?.status === 404) {
        }
        return Promise.reject(error);
      }
    );
  }

  private async getToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      
      if (token) {
        // Token'ın geçerliliğini kontrol et
        if (this.isTokenValid(token)) {
          return token;
        } else {
          await this.clearToken();
          return null;
        }
      } else {
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private async clearToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_ID);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      } catch (error) {
      }
  }

  // Token'ın geçerliliğini kontrol et
  private isTokenValid(token: string): boolean {
    try {
      // JWT token formatını kontrol et (3 parça olmalı)
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }
      
      // Base64 decode edilebilir mi kontrol et (React Native için)
      const payload = JSON.parse(atob(parts[1]));
      
      // Expiration time kontrolü
      if (payload.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime >= payload.exp) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  public handleError<T = unknown>(error: any): ApiResponse<T> {
    if (error.response?.data) {
      return error.response.data;
    }
    
    // Network hatası kontrolü
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return {
        success: false,
        message: 'Ağ bağlantısı hatası. Lütfen internet bağlantınızı kontrol edin.',
        data: null as T
      };
    }
    
    // Timeout hatası kontrolü
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        success: false,
        message: 'Bağlantı zaman aşımı. Lütfen tekrar deneyin.',
        data: null as T
      };
    }
    
    return {
      success: false,
      message: error.message || 'Bir hata oluştu',
      data: null as T
    };
  }

  // ===== AUTH ENDPOINTS =====
  async login(email: string, password: string, userType: 'mechanic' | 'driver'): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/auth/login', { email, password, userType });
      
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async register(userData: {
    name: string;
    surname: string;
    email: string;
    phone: string;
    password: string;
    userType: 'mechanic' | 'driver';
    experience?: number;
    city?: string;
    specialties?: string[];
    serviceCategories?: string[];
  }): Promise<ApiResponse<MechanicProfile>> {
    try {
      const response = await this.api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async logout(): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/auth/logout');
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== MECHANIC PROFILE ENDPOINTS =====
  async getMechanicProfile(): Promise<ApiResponse<MechanicProfile>> {
    try {
      const response = await this.api.get('/mechanic/me');
      return {
        success: true,
        message: 'Mechanic profile loaded',
        data: response.data as MechanicProfile
      } as ApiResponse<MechanicProfile>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateMechanicProfile(profileData: Partial<MechanicProfile>): Promise<ApiResponse<MechanicProfile>> {
    try {
      const response = await this.api.put('/mechanic/me', profileData);
      return response.data as ApiResponse<MechanicProfile>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateUserCapabilities(capabilities: string[]): Promise<ApiResponse> {
    try {
      const response = await this.api.put('/users/capabilities', { capabilities });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== APPOINTMENT ENDPOINTS =====
  async getMechanicAppointments(status?: string, filters?: Record<string, unknown>): Promise<ApiResponse<Appointment[]>> {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (filters) {
        Object.entries(filters).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
        });
      }
      const url = `/appointments/mechanic${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await this.api.get(url);
      
      return response.data as ApiResponse<Appointment[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getMechanicAppointmentCounts(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/mechanic/appointments/counts');
      
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Yeni durum güncelleme metodları

  async serviseAl(appointmentId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put(`/appointments/${appointmentId}/servise-al`);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async odemeBekliyor(appointmentId: string, kalemler: any[], kdvDahil: boolean): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put(`/appointments/${appointmentId}/odeme-bekliyor`, {
        kalemler,
        kdvDahil
      });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async odemeTamamlandi(appointmentId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put(`/appointments/${appointmentId}/odeme-tamamlandi`);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async noShow(appointmentId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put(`/appointments/${appointmentId}/no-show`);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async parcaBekleniyor(appointmentId: string, parcaBekleniyor: boolean): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put(`/appointments/${appointmentId}/parca-bekleniyor`, {
        parcaBekleniyor
      });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getAppointmentById(appointmentId: string): Promise<ApiResponse<Appointment>> {
    try {
      const response = await this.api.get(`/appointments/${appointmentId}`);
      return response.data as ApiResponse<Appointment>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async approveAppointment(appointmentId: string): Promise<ApiResponse> {
    try {
      const response = await this.api.put(`/appointments/${appointmentId}/status`, { 
        status: 'confirmed' 
      });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateAppointmentStatus(appointmentId: string, body: Record<string, unknown>): Promise<ApiResponse<Appointment>> {
    try {
      const response = await this.api.put(`/appointments/${appointmentId}/status`, body);
      return response.data as ApiResponse<Appointment>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async rejectAppointment(appointmentId: string, rejectionReason: string): Promise<ApiResponse> {
    try {
      const response = await this.api.put(`/appointments/${appointmentId}/status`, { 
        status: 'rejected',
        rejectionReason 
      });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async completeAppointment(appointmentId: string, data: {
    price: number;
    mechanicNotes: string;
  }): Promise<ApiResponse> {
    try {
      const response = await this.api.put(`/appointments/${appointmentId}/complete`, {
        completionNotes: data.mechanicNotes,
        price: data.price
      });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ==== NEW FLOW (TR statuses) =====
  async checkInAppointment(appointmentId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/appointments/${appointmentId}/servise-al`);
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async setPaymentPending(appointmentId: string, payload: { items?: any[]; price?: number; kdvIncluded?: boolean; notes?: string }): Promise<ApiResponse> {
    try {
      // Geriye uyumluluk için complete kullanılıyor; backend ödeme bekliyor durumuna çeviriyor
      const price = payload.price || (payload.items || []).reduce((s: number, k: any) => s + (k.tutar || k.unitPrice || 0) * (k.adet || k.quantity || 1), 0);
      const res = await this.api.put(`/appointments/${appointmentId}/complete`, { completionNotes: payload.notes || '', price });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async generatePaymentLink(appointmentId: string): Promise<ApiResponse<{ link: string; ref: string }>> {
    try {
      const res = await this.api.put(`/appointments/${appointmentId}/payment/link`);
      return res.data as ApiResponse<{ link: string; ref: string }>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async confirmPayment(appointmentId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/appointments/${appointmentId}/payment/confirm`);
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async toggleWaitingParts(appointmentId: string, value: boolean): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/appointments/${appointmentId}/waiting-parts`, { value });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async addItem(appointmentId: string, item: { ad: string; adet: number; birim: string; tutar: number; tur: 'ISCILIK' | 'PARCA' }): Promise<ApiResponse> {
    try {
      const res = await this.api.post(`/appointments/${appointmentId}/items`, item);
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async requestExtraApproval(appointmentId: string, payload: { aciklama: string; tutar: number }): Promise<ApiResponse> {
    try {
      const res = await this.api.post(`/appointments/${appointmentId}/extra-approval`, payload);
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async moveToPaymentPendingWithItems(appointmentId: string, kalemler: any[], kdvDahil: boolean = true): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/appointments/${appointmentId}/odeme-bekliyor`, { kalemler, kdvDahil });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async markPaymentDone(appointmentId: string): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/appointments/${appointmentId}/odeme-tamamlandi`);
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async toggleWaitingPartsTR(appointmentId: string, value: boolean): Promise<ApiResponse> {
    try {
      const res = await this.api.put(`/appointments/${appointmentId}/parca-bekleniyor`, { parcaBekleniyor: value });
      return res.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== DASHBOARD ENDPOINTS =====
  async getAppointmentStats(): Promise<ApiResponse<{
    activeJobs: number;
    todayEarnings: number;
    rating: number;
  }>> {
    try {
      const response = await this.api.get('/appointments/stats');
      if (response.data.success && response.data.data) {
        return {
          success: true,
          message: 'Stats loaded',
          data: response.data.data
        };
      }
      return { success: true, message: 'No stats', data: { activeJobs: 0, todayEarnings: 0, rating: 0 } };
    } catch (error) {
      try {
        const fallbackResponse = await this.api.get('/appointments/mechanic?status=confirmed');
        if (fallbackResponse.data.success && fallbackResponse.data.data) {
          const activeJobs = fallbackResponse.data.data.length;
          return {
            success: true,
            message: 'Stats loaded (fallback)',
            data: {
              activeJobs,
              todayEarnings: 0,
              rating: 0
            }
          };
        }
      } catch (fallbackError) {
        // Fallback hatası sessizce geç
      }
      return { success: true, message: 'No stats', data: { activeJobs: 0, todayEarnings: 0, rating: 0 } };
    }
  }

  async getTodaySchedule(): Promise<ApiResponse<Appointment[]>> {
    try {
      // Mevcut endpoint'i kullan
      const response = await this.api.get('/appointments/mechanic?status=confirmed');
      if (response.data.success && response.data.data) {
        const today = new Date();
        const todayAppointments = response.data.data.filter((appointment: Appointment) => {
          const appointmentDate = new Date(appointment.appointmentDate);
          return appointmentDate.toDateString() === today.toDateString();
        });
        return {
          success: true,
          message: 'Today schedule loaded',
          data: todayAppointments
        };
      }
      return { success: true, message: 'No appointments today', data: [] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getRecentActivity(): Promise<ApiResponse<any[]>> {
    try {
      try {
        const response = await this.api.get('/appointments/mechanic?limit=10');
        if (response.data.success && response.data.data) {
          const activities = response.data.data.map((appointment: Appointment) => ({
            id: appointment._id,
            type: `appointment_${appointment.status}`,
            title: `Randevu ${this.getStatusText(appointment.status)}`,
            description: `${appointment.serviceType} - ${appointment.customer?.name || 'Müşteri'}`,
            time: appointment.updatedAt || appointment.createdAt,
            appointmentId: appointment._id,
            amount: appointment.price,
            status: appointment.status
          }));
          return {
            success: true,
            message: 'Activities loaded',
            data: activities
          };
        }
      } catch (error) {
        // Activity API hatası sessizce geç
      }
      
      return { success: true, message: 'No activities', data: [] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Helper function for status text
  private getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'bekliyor';
      case 'confirmed': return 'onaylandı';
      case 'in-progress': return 'devam ediyor';
      case 'completed': return 'tamamlandı';
      case 'cancelled': return 'iptal edildi';
      default: return status;
    }
  }

  // ===== WALLET ENDPOINTS =====
  async getWalletBalance(): Promise<ApiResponse<{ balance: number }>> {
    try {
      // Mevcut endpoint'i kullan - gerçek işlemler gözüküyordu
      const response = await this.api.get('/appointments/mechanic?status=completed');
      if (response.data.success && response.data.data) {
        const totalEarnings = response.data.data.reduce((sum: number, appointment: Appointment) => {
          return sum + (appointment.price || 0);
        }, 0);
        return {
          success: true,
          message: 'Balance calculated',
          data: { balance: totalEarnings }
        };
      }
      return { success: true, message: 'No earnings', data: { balance: 0 } };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getMechanicWallet(): Promise<ApiResponse<any>> {
    try {
      // Tamamlanmış randevulardan detaylı wallet bilgisi hesapla
      const response = await this.api.get('/appointments/mechanic?status=completed');
      
      if (response.data.success && response.data.data) {
        const appointments = response.data.data.appointments || response.data.data;
        
        // Toplam kazanç
        const totalEarnings = appointments.reduce((sum: number, apt: Appointment) => {
          return sum + (apt.price || 0);
        }, 0);
        
        // Bu ay kazanç (şu anki ay)
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthEarnings = appointments
          .filter((apt: Appointment) => new Date(apt.completionDate || apt.updatedAt) >= thisMonthStart)
          .reduce((sum: number, apt: Appointment) => sum + (apt.price || 0), 0);
        
        // Bekleyen ödemeler (completed ama paymentStatus pending olanlar)
        const pendingAmount = appointments
          .filter((apt: Appointment) => apt.paymentStatus === 'pending')
          .reduce((sum: number, apt: Appointment) => sum + (apt.price || 0), 0);
        
        const result = {
          success: true,
          message: 'Wallet loaded',
          data: {
            balance: totalEarnings,
            totalEarnings: totalEarnings,
            pendingAmount: pendingAmount,
            thisMonthEarnings: thisMonthEarnings,
            transactions: appointments
          }
        };
        
        return result;
      }
      return { 
        success: true, 
        message: 'No wallet data', 
        data: { 
          balance: 0, 
          totalEarnings: 0, 
          pendingAmount: 0, 
          thisMonthEarnings: 0, 
          transactions: [] 
        } 
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getRecentTransactions(): Promise<ApiResponse<any[]>> {
    try {
      // Tamamlanmış randevulardan detaylı transaction bilgileri getir
      const response = await this.api.get('/appointments/mechanic?status=completed');
      if (response.data.success && response.data.data) {
        const appointments = response.data.data.appointments || response.data.data;
        
        // Her randevuyu transaction formatına çevir
        const transactions = appointments.map((apt: Appointment) => ({
          _id: apt._id,
          type: 'credit', // Tamamlanmış iş = kazanç
          amount: apt.price || 0,
          description: `${apt.serviceType} - ${apt.description || 'İş tamamlandı'}`,
          date: apt.completionDate || apt.updatedAt || apt.createdAt,
          status: apt.paymentStatus || 'pending',
          customerName: apt.customer?.name || 'Bilinmeyen Müşteri',
          vehicleInfo: apt.vehicle?.brand ? `${apt.vehicle.brand} ${apt.vehicle.modelName}` : 'Araç bilgisi yok',
          appointmentDate: apt.appointmentDate,
          timeSlot: apt.timeSlot
        }));
        
        return {
          success: true,
          message: 'Transactions loaded',
          data: transactions
        };
      }
      return { success: true, message: 'No transactions', data: [] };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== EARNINGS ENDPOINTS =====
  async getMechanicEarnings(): Promise<ApiResponse<any>> {
    try {
      // Mevcut endpoint'i kullan
      const response = await this.api.get('/appointments/mechanic?status=completed');
      if (response.data.success && response.data.data) {
        const appointments = response.data.data.appointments || response.data.data;
        const totalEarnings = appointments.reduce((sum: number, appointment: Appointment) => {
          return sum + (appointment.price || 0);
        }, 0);
        return {
          success: true,
          message: 'Earnings loaded',
          data: { totalEarnings, appointments: appointments }
        };
      }
      return { success: true, message: 'No earnings', data: { totalEarnings: 0, appointments: [] } };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== SERVICE REQUESTS (ÇEKİCİ) =====
  async getMechanicServiceRequests(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/service-requests/mechanic-requests');
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== RATING ENDPOINTS =====
  async getRecentRatings(): Promise<ApiResponse<Rating[]>> {
    try {
      // Backend'de mevcut olan endpoint'i kullan
      const response = await this.api.get('/appointment-ratings/current/recent');
      
      // Backend'den gelen veriyi doğru formata dönüştür
      if (response.data.success && response.data.data) {
        const ratings = response.data.data.map((rating: Rating) => ({
          _id: rating.id || rating._id,
          appointmentId: rating.appointment?.serviceType || rating.appointmentId,
          driverId: rating.customer ? `${rating.customer.name} ${rating.customer.surname}` : rating.driverId,
          mechanicId: rating.mechanicId,
          rating: rating.rating,
          comment: rating.comment,
          createdAt: rating.createdAt,
          customer: rating.customer,
          appointment: rating.appointment
        }));
        
        return {
          success: true,
          message: 'Ratings loaded successfully',
          data: ratings
        };
      }
      
      return response.data;
    } catch (error) {
      // Hata durumunda boş veri döndür
      return {
        success: false,
        message: 'Puanlama verileri yüklenemedi',
        data: []
      };
    }
  }

  async getRatingStats(): Promise<ApiResponse<any>> {
    try {
      // Backend'de mevcut olan endpoint'i kullan
      const response = await this.api.get('/appointment-ratings/current/stats');
      return response.data;
    } catch (error) {
      // Hata durumunda boş veri döndür
      return {
        success: false,
        message: 'Puanlama verileri yüklenemedi',
        data: { 
          averageRating: 0, 
          totalRatings: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        }
      };
    }
  }

  async getMechanicRatings(mechanicId: string): Promise<ApiResponse<Rating[]>> {
    try {
      // Şimdilik boş array döndür
      return {
        success: true,
        message: 'No ratings available',
        data: []
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getMechanicRating(mechanicId: string): Promise<ApiResponse<any>> {
    try {
      // Şimdilik mock data döndür
      return {
        success: true,
        message: 'Rating loaded',
        data: { averageRating: 0, totalRatings: 0 }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== MESSAGE ENDPOINTS =====
  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    try {
      // Gerçek API endpoint'ini kullan
      const response = await this.api.get('/message/conversations');
      return response.data as ApiResponse<Conversation[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getConversationMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<ApiResponse<Message[]>> {
    try {
      // Gerçek API endpoint'ini kullan
      const response = await this.api.get(`/message/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
      return response.data as ApiResponse<Message[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== SERVICE JOB ENDPOINTS =====
  async getWashJobs(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/mechanic-jobs/wash');
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getTireJobs(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/mechanic-jobs/tire');
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getTowingJobs(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/mechanic-jobs/towing');
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async sendMessage(messageData: {
    receiverId: string;
    content: string;
    messageType?: 'text' | 'image' | 'file';
  }): Promise<ApiResponse<Message>> {
    try {
      // Gerçek API endpoint'ini kullan
      const response = await this.api.post('/message/send', messageData);
      return response.data as ApiResponse<Message>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteMessage(messageId: string): Promise<ApiResponse<Message>> {
    try {
      // Gerçek API endpoint'ini kullan
      const response = await this.api.delete(`/message/${messageId}`);
      return response.data as ApiResponse<Message>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteConversation(conversationId: string): Promise<ApiResponse<any>> {
    try {
      // Gerçek API endpoint'ini kullan
      const response = await this.api.delete(`/message/conversations/${conversationId}`);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getUnreadMessageCount(): Promise<ApiResponse<{ count: number }>> {
    try {
      // Gerçek API endpoint'ini kullan
      const response = await this.api.get('/message/unread-count');
      return response.data as ApiResponse<{ count: number }>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== LONG POLLING ENDPOINT =====
  async pollMessages(lastMessageId?: string): Promise<ApiResponse<Message[]>> {
    try {
      const url = lastMessageId 
        ? `/message/poll-messages?lastMessageId=${lastMessageId}`
        : '/message/poll-messages';
      
      const response = await this.api.get(url);
      return response.data as ApiResponse<Message[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== NOTIFICATION ENDPOINTS =====
  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    try {
      const response = await this.api.get('/notifications/mechanic');
      return response.data as ApiResponse<Notification[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse> {
    try {
      const response = await this.api.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse> {
    try {
      const response = await this.api.put('/notifications/mechanic/mark-all-read');
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse> {
    try {
      const response = await this.api.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== PUSH NOTIFICATION ENDPOINTS =====
  async updatePushToken(token: string): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/users/push-token', { token });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getNotificationSettings(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/users/notification-settings');
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateNotificationSettings(settings: any): Promise<ApiResponse> {
    try {
      const response = await this.api.put('/users/notification-settings', settings);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== SERVICE CATEGORIES =====
  async getServiceCategories(): Promise<ApiResponse<ServiceCategory[]>> {
    return { success: true, message: 'No categories', data: [] } as any;
  }

  // ===== VEHICLE ENDPOINTS =====
  async getCustomerVehicles(customerId: string): Promise<ApiResponse<Vehicle[]>> {
    try {
      // Şimdilik boş array döndür, vehicle endpoint'i mevcut değil
      return {
        success: true,
        message: 'No vehicles available',
        data: []
      } as ApiResponse<Vehicle[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== SERVICE MANAGEMENT ENDPOINTS =====
  async getServices(): Promise<ApiResponse<any[]>> {
    return { success: true, message: 'No services', data: [] };
  }

  async getServicePackages(): Promise<ApiResponse<any[]>> {
    return { success: true, message: 'No packages', data: [] };
  }

  async addService(serviceData: any): Promise<ApiResponse<any>> {
    return { success: false, message: 'Service management disabled' } as any;
  }

  async createServicePackage(packageData: any): Promise<ApiResponse<any>> {
    return { success: false, message: 'Service management disabled' } as any;
  }

  // ===== JOB MANAGEMENT ENDPOINTS =====
  async getJobs(status?: string, query?: string): Promise<ApiResponse<any>> {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (query) params.append('q', query);
      const qs = params.toString();
      const response = await this.api.get(`/mechanic-jobs${qs ? `?${qs}` : ''}`);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getJobDetails(jobId: string): Promise<ApiResponse<any>> {
    // İş yönetimi kaldırıldı
    return { success: false, message: 'Not implemented', data: null } as any;
  }

  async updateJobStatus(jobId: string, payload: { status: string; rejectionReason?: string; mechanicNotes?: string; }): Promise<ApiResponse<any>> {
    // İş yönetimi kaldırıldı
    return { success: false, message: 'Not implemented', data: null } as any;
  }

  async updateJobPrice(jobId: string, price: number): Promise<ApiResponse<any>> {
    // İş yönetimi kaldırıldı
    return { success: false, message: 'Not implemented', data: null } as any;
  }

  async completeJob(jobId: string, data: { finalPrice: number; mechanicNotes?: string; estimatedDuration?: number; }): Promise<ApiResponse<any>> {
    // İş yönetimi kaldırıldı
    return { success: false, message: 'Not implemented', data: null } as any;
  }

  // Servis aç (iş yönetimi) kaldırıldı; randevu akışı kullanılacak

  // ===== FAULT REPORT ENDPOINTS =====
  async getMechanicFaultReports(status?: string, params?: { page?: number; limit?: number }) {
    const queryParams: { page?: number; limit?: number; status?: string } = { ...params };
    if (status) {
      queryParams.status = status;
    }
    const response = await this.api.get('/fault-reports/mechanic/reports', { params: queryParams });
    return response.data;
  }

  async getFaultReportById(faultReportId: string) {
    const response = await this.api.get(`/fault-reports/mechanic/${faultReportId}`);
    return response.data;
  }

  async submitQuote(faultReportId: string, quoteData: any) {
    const response = await this.api.post(`/fault-reports/${faultReportId}/quote`, quoteData);
    return response.data;
  }

  async submitMechanicResponse(faultReportId: string, responseData: any) {
    const response = await this.api.post(`/fault-reports/${faultReportId}/response`, responseData);
    return response.data;
  }

  async finalizeWork(faultReportId: string, data: { notes?: string }) {
    const response = await this.api.post(`/fault-reports/${faultReportId}/finalize`, data);
    return response.data;
  }

  // ===== PRICE INCREASE ENDPOINT =====
  async updateAppointmentPriceIncrease(appointmentId: string, data: { additionalAmount: number; reason?: string; customReason?: string }): Promise<AxiosResponse> {
    try {
      const response = await this.api.put(`/appointments/${appointmentId}/price-increase`, data);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // ===== ACİL ÇEKİCİ ENDPOINT'LERİ =====
  async getEmergencyTowingRequests(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/emergency/mechanic/emergency-requests');
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async respondToEmergencyTowingRequest(requestId: string, response: 'accepted' | 'rejected', estimatedArrival?: number): Promise<ApiResponse<any>> {
    try {
      const responseData = await this.api.post('/emergency/mechanic-response', {
        requestId,
        response,
        estimatedArrival
      });
      return responseData.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getAcceptedEmergencyRequests(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/emergency/mechanic/accepted-requests');
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateEmergencyRequestStatus(requestId: string, status: 'on_the_way' | 'arrived' | 'completed'): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put(`/emergency/towing-request/${requestId}/status`, { status });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== SETTINGS ENDPOINTS =====
  
  /**
   * Kullanıcı ayarlarını getir
   */
  async getUserSettings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/users/settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Kullanıcı ayarlarını güncelle
   */
  async updateUserSettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/settings', settings);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Bildirim ayarlarını getir
   */
  async getNotificationSettings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/users/notification-settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Bildirim ayarlarını güncelle
   */
  async updateNotificationSettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/notification-settings', settings);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Gizlilik ayarlarını getir
   */
  async getPrivacySettings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/users/privacy-settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Gizlilik ayarlarını güncelle
   */
  async updatePrivacySettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/privacy-settings', settings);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * İş ayarlarını getir
   */
  async getJobSettings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/users/job-settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * İş ayarlarını güncelle
   */
  async updateJobSettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/job-settings', settings);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Uygulama ayarlarını getir
   */
  async getAppSettings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/users/app-settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Uygulama ayarlarını güncelle
   */
  async updateAppSettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/app-settings', settings);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Güvenlik ayarlarını getir
   */
  async getSecuritySettings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/users/security-settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Güvenlik ayarlarını güncelle
   */
  async updateSecuritySettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/security-settings', settings);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Şifre değiştir
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/change-password', {
        currentPassword,
        newPassword
      });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Hizmet kategorilerini getir
   */
  async getServiceCategories(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/service-categories');
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Kullanıcının hizmet kategorilerini güncelle
   */
  async updateServiceCategories(categories: string[]): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/service-categories', { categories });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Yardım makalelerini getir
   */
  async getHelpArticles(category?: string): Promise<ApiResponse<any[]>> {
    try {
      const url = category ? `/help/articles?category=${category}` : '/help/articles';
      const response = await this.api.get(url);
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Yardım kategorilerini getir
   */
  async getHelpCategories(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/help/categories');
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Destek talebi oluştur
   */
  async createSupportTicket(subject: string, message: string, priority: string = 'medium'): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/support/tickets', {
        subject,
        message,
        priority
      });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Destek taleplerini getir
   */
  async getSupportTickets(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/support/tickets');
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Uygulama bilgilerini getir
   */
  async getAppInfo(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/app/info');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== SETTINGS ENDPOINTS =====
  async getUserSettings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/users/settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateUserSettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/settings', settings);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getNotificationSettings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/users/notification-settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateNotificationSettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/notification-settings', settings);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getPrivacySettings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/users/privacy-settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updatePrivacySettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/privacy-settings', settings);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getJobSettings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/users/job-settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateJobSettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/job-settings', settings);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getAppSettings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/users/app-settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateAppSettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/app-settings', settings);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getSecuritySettings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/users/security-settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateSecuritySettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/security-settings', settings);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getServiceCategories(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/service-categories');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateServiceCategories(categories: string[]): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/service-categories', { categories });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== SUPPORT ENDPOINTS =====
  async getHelpArticles(category?: string): Promise<ApiResponse<any>> {
    try {
      const params = category ? `?category=${category}` : '';
      const response = await this.api.get(`/support/help-articles${params}`);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getHelpCategories(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/support/help-categories');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createSupportTicket(subject: string, message: string, priority: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/support/tickets', {
        subject,
        message,
        priority
      });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getSupportTickets(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/support/tickets');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getAppInfo(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/support/app-info');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== EMAIL & PHONE VERIFICATION ENDPOINTS =====
  
  /**
   * E-posta doğrulama kodu gönder
   */
  async sendEmailVerification(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/auth/send-email-verification');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * E-posta doğrulama kodunu kontrol et
   */
  async verifyEmail(code: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/auth/verify-email', { code });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Şifre sıfırlama e-postası gönder
   */
  async forgotPassword(email: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/auth/forgot-password', { email });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Şifreyi sıfırla (token ile)
   */
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/auth/reset-password', { token, newPassword });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * E-posta değiştirme başlat
   */
  async changeEmail(newEmail: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/users/change-email', { newEmail });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * E-posta değişikliğini onayla
   */
  async confirmEmailChange(token: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/users/confirm-email-change', { token });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Telefon doğrulama kodu gönder
   */
  async sendPhoneVerification(phone: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/users/send-phone-verification', { phone });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Telefon doğrulama kodunu kontrol et
   */
  async verifyPhone(code: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/users/verify-phone', { code });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default new ApiService();
