import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, STORAGE_KEYS } from '../constants/config';
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
  ApiResponse 
} from '../types/common';

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
      async (config) => {
        try {
          const token = await this.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('❌ Token ekleme hatası:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - hata yönetimi
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.log('🔍 API Response Interceptor - Hata:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          message: error.response?.data?.message || error.message
        });
        
        if (error.response?.status === 401) {
          // Token geçersiz, AsyncStorage'dan temizle
          console.log('❌ API Service: 401 hatası - Token geçersiz');
          this.clearToken();
        } else if (error.response?.status === 404) {
          console.log('❌ API Service: 404 hatası - Endpoint bulunamadı:', error.config?.url);
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
          console.log('⚠️ API Service: Token geçersiz, temizleniyor...');
          await this.clearToken();
          return null;
        }
      } else {
        console.log('⚠️ getToken - AsyncStorage\'da token bulunamadı');
      }
      return null;
    } catch (error) {
      console.error('❌ API Service: Token alma hatası:', error);
      return null;
    }
  }

  private async clearToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_ID);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      console.log('🧹 API Service: Token ve user data temizlendi');
    } catch (error) {
      console.error('❌ API Service: Token temizleme hatası:', error);
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
      
      // Base64 decode edilebilir mi kontrol et
      const payload = JSON.parse(atob(parts[1]));
      
      // Expiration time kontrolü
      if (payload.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime >= payload.exp) {
          console.log('⚠️ API Service: Token süresi dolmuş');
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ API Service: Token validation hatası:', error);
      return false;
    }
  }

  public handleError(error: any): ApiResponse {
    console.error('❌ API Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      data: error.response?.data
    });
    
    if (error.response?.data) {
      return error.response.data;
    }
    
    // Network hatası kontrolü
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return {
        success: false,
        message: 'Ağ bağlantısı hatası. Lütfen internet bağlantınızı kontrol edin.',
        data: null
      };
    }
    
    // Timeout hatası kontrolü
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        success: false,
        message: 'Bağlantı zaman aşımı. Lütfen tekrar deneyin.',
        data: null
      };
    }
    
    return {
      success: false,
      message: error.message || 'Bir hata oluştu',
      data: null
    };
  }

  // ===== AUTH ENDPOINTS =====
  async login(email: string, password: string, userType: 'mechanic' | 'driver'): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/auth/login', { email, password, userType });
      return response.data;
    } catch (error) {
      console.error('❌ API Service: Login error:', error);
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
  }): Promise<ApiResponse> {
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
  async getMechanicProfile(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/mechanic/me');
      return {
        success: true,
        message: 'Mechanic profile loaded',
        data: response.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateMechanicProfile(profileData: Partial<MechanicProfile>): Promise<ApiResponse> {
    try {
      const response = await this.api.put('/mechanic/me', profileData);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== APPOINTMENT ENDPOINTS =====
  async getMechanicAppointments(status?: string): Promise<ApiResponse<Appointment[]>> {
    try {
      const url = status ? `/appointments/mechanic?status=${status}` : '/appointments/mechanic';
      const response = await this.api.get(url);
      return response.data;
    } catch (error) {
      console.error('❌ API Service: getMechanicAppointments error:', error);
      return this.handleError(error);
    }
  }

  async getAppointmentById(appointmentId: string): Promise<ApiResponse<Appointment>> {
    try {
      const response = await this.api.get(`/appointments/${appointmentId}`);
      return response.data;
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
        const todayAppointments = response.data.data.filter((appointment: any) => {
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
          const activities = response.data.data.map((appointment: any) => ({
            id: appointment._id,
            type: `appointment_${appointment.status}`,
            title: `Randevu ${this.getStatusText(appointment.status)}`,
            description: `${appointment.serviceType} - ${appointment.userId?.name || 'Müşteri'}`,
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
        const totalEarnings = response.data.data.reduce((sum: number, appointment: any) => {
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
        const totalEarnings = appointments.reduce((sum: number, apt: any) => {
          return sum + (apt.price || 0);
        }, 0);
        
        // Bu ay kazanç (şu anki ay)
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthEarnings = appointments
          .filter((apt: any) => new Date(apt.completionDate || apt.updatedAt) >= thisMonthStart)
          .reduce((sum: number, apt: any) => sum + (apt.price || 0), 0);
        
        // Bekleyen ödemeler (completed ama paymentStatus pending olanlar)
        const pendingAmount = appointments
          .filter((apt: any) => apt.paymentStatus === 'pending')
          .reduce((sum: number, apt: any) => sum + (apt.price || 0), 0);
        
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
        const transactions = appointments.map((apt: any) => ({
          _id: apt._id,
          type: 'credit', // Tamamlanmış iş = kazanç
          amount: apt.price || 0,
          description: `${apt.serviceType} - ${apt.description || 'İş tamamlandı'}`,
          date: apt.completionDate || apt.updatedAt || apt.createdAt,
          status: apt.paymentStatus || 'pending',
          customerName: apt.userId?.name || 'Bilinmeyen Müşteri',
          vehicleInfo: apt.vehicleId?.brand ? `${apt.vehicleId.brand} ${apt.vehicleId.modelName}` : 'Araç bilgisi yok',
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
        const totalEarnings = appointments.reduce((sum: number, appointment: any) => {
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

  // ===== RATING ENDPOINTS =====
  async getRecentRatings(): Promise<ApiResponse<Rating[]>> {
    try {
      // Backend'de mevcut olan endpoint'i kullan
      const response = await this.api.get('/appointment-ratings/current/recent');
      
      // Backend'den gelen veriyi doğru formata dönüştür
      if (response.data.success && response.data.data) {
        const ratings = response.data.data.map((rating: any) => ({
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
      console.error('❌ getRecentRatings hatası:', error);
      // Fallback: Mock data döndür
      return {
        success: true,
        message: 'No ratings available',
        data: [
          {
            _id: '1',
            appointmentId: 'Genel Bakım',
            driverId: 'driver1',
            mechanicId: 'mechanic1',
            rating: 5,
            comment: 'Çok iyi iş çıkardı',
            createdAt: new Date().toISOString(),
            customer: {
              name: 'Ahmet',
              surname: 'Yılmaz'
            },
            appointment: {
              serviceType: 'Genel Bakım',
              date: new Date()
            }
          },
          {
            _id: '2',
            appointmentId: 'Ağır Bakım',
            driverId: 'driver2',
            mechanicId: 'mechanic1',
            rating: 4,
            comment: 'Hızlı ve kaliteli',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            customer: {
              name: 'Mehmet',
              surname: 'Demir'
            },
            appointment: {
              serviceType: 'Ağır Bakım',
              date: new Date(Date.now() - 86400000)
            }
          }
        ]
      };
    }
  }

  async getRatingStats(): Promise<ApiResponse<any>> {
    try {
      // Backend'de mevcut olan endpoint'i kullan
      const response = await this.api.get('/appointment-ratings/current/stats');
      return response.data;
    } catch (error) {
      // Fallback: Mock data döndür
      return {
        success: true,
        message: 'Rating stats loaded',
        data: { 
          averageRating: 4.5, 
          totalRatings: 12,
          ratingDistribution: { 1: 0, 2: 0, 3: 1, 4: 5, 5: 6 }
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
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getConversationMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<ApiResponse<Message[]>> {
    try {
      // Gerçek API endpoint'ini kullan
      const response = await this.api.get(`/message/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
      return response.data;
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
      return response.data;
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
      return response.data;
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
      return response.data;
    } catch (error) {
      console.error('❌ API Service: pollMessages error:', error);
      return this.handleError(error);
    }
  }

  // ===== NOTIFICATION ENDPOINTS =====
  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    try {
      // Şimdilik boş array döndür, notification endpoint'i mevcut değil
      return {
        success: true,
        message: 'No notifications available',
        data: []
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse> {
    try {
      // Şimdilik mock response döndür
      return {
        success: true,
        message: 'Notification marked as read',
        data: { marked: true }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== SERVICE CATEGORIES =====
  async getServiceCategories(): Promise<ApiResponse<ServiceCategory[]>> {
    try {
      // Şimdilik mock data döndür, service categories endpoint'i mevcut değil
      return {
        success: true,
        message: 'Service categories loaded',
        data: [
          {
            _id: '1',
            name: 'Genel Bakım',
            description: 'Araç genel bakım hizmetleri',
            icon: 'wrench',
            color: '#007AFF',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            _id: '2',
            name: 'Ağır Bakım',
            description: 'Araç ağır bakım hizmetleri',
            icon: 'gear',
            color: '#FF3B30',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ] as ServiceCategory[]
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== VEHICLE ENDPOINTS =====
  async getCustomerVehicles(customerId: string): Promise<ApiResponse<Vehicle[]>> {
    try {
      // Şimdilik boş array döndür, vehicle endpoint'i mevcut değil
      return {
        success: true,
        message: 'No vehicles available',
        data: []
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== SERVICE MANAGEMENT ENDPOINTS =====
  async getServices(): Promise<ApiResponse<any[]>> {
    try {
      // Şimdilik mock data döndür, services endpoint'i mevcut değil
      return {
        success: true,
        message: 'Services loaded',
        data: []
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getServicePackages(): Promise<ApiResponse<any[]>> {
    try {
      // Şimdilik mock data döndür, packages endpoint'i mevcut değil
      return {
        success: true,
        message: 'Service packages loaded',
        data: []
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async addService(serviceData: any): Promise<ApiResponse<any>> {
    try {
      // Şimdilik mock response döndür
      return {
        success: true,
        message: 'Service added',
        data: { _id: Date.now().toString(), ...serviceData }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createServicePackage(packageData: any): Promise<ApiResponse<any>> {
    try {
      // Şimdilik mock response döndür
      return {
        success: true,
        message: 'Service package created',
        data: { _id: Date.now().toString(), ...packageData }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== CUSTOMER MANAGEMENT ENDPOINTS =====
  async getCustomerList(): Promise<ApiResponse<any[]>> {
    try {
      // Şimdilik mock data döndür, customers endpoint'i mevcut değil
      return {
        success: true,
        message: 'Customers loaded',
        data: []
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getServicedVehicles(): Promise<ApiResponse<any[]>> {
    try {
      // Şimdilik mock data döndür, serviced vehicles endpoint'i mevcut değil
      return {
        success: true,
        message: 'Serviced vehicles loaded',
        data: []
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async addCustomerNote(customerId: string, noteData: any): Promise<ApiResponse<any>> {
    try {
      // Şimdilik mock response döndür
      return {
        success: true,
        message: 'Customer note added',
        data: { _id: Date.now().toString(), customerId, ...noteData }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default new ApiService();
