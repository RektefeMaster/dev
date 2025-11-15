import { BaseApiService, ApiResponse, ApiConfig } from '@shared/api/BaseApiService';

// ===== MECHANIC-SPECIFIC INTERFACES =====

export interface MechanicProfile {
  _id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  experience: number;
  specialties: string[];
  serviceCategories: string[];
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  rating: number;
  totalRatings: number;
  availability: boolean;
  workingHours: {
    start: string;
    end: string;
    days: string[];
  };
  priceRange: {
    min: number;
    max: number;
  };
}

export interface MechanicAppointment {
  _id: string;
  userId: {
    _id: string;
    name: string;
    surname: string;
    phone: string;
  };
  vehicleId: {
    _id: string;
    brand: string;
    model: string;
    year: number;
    plateNumber: string;
  };
  serviceType: string;
  appointmentDate: string;
  timeSlot: string;
  status: 'TALEP_EDILDI' | 'PLANLANDI' | 'SERVISTE' | 'ODEME_BEKLIYOR' | 'TAMAMLANDI' | 'IPTAL_EDILDI';
  description?: string;
  price?: number;
  autoCancelled?: boolean;
  rejectionReason?: string;
  estimatedDuration?: number;
  mechanicNotes?: string;
  kalemler?: Array<{
    ad: string;
    adet: number;
    birim: string;
    tutar: number;
    tur: 'ISCILIK' | 'PARCA';
  }>;
  kdvDahil?: boolean;
  parcaBekleniyor?: boolean;
  extraApprovalRequests?: Array<{
    aciklama: string;
    tutar: number;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: string;
  }>;
}

export interface ServiceRequest {
  _id: string;
  userId: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  serviceType: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  requestedAt: string;
  estimatedPrice?: number;
}

export interface Earnings {
  daily: number;
  weekly: number;
  monthly: number;
  total: number;
  pendingAmount: number;
  completedJobs: number;
}

// ===== MECHANIC API SERVICE =====

export class MechanicApiService extends BaseApiService {
  constructor(config: Omit<ApiConfig, 'userType' | 'appName'>) {
    super({
      ...config,
      userType: 'mechanic',
      appName: 'Rektefe Mechanic App'
    });
  }

  // ===== PROFILE MANAGEMENT =====

  async getProfile(): Promise<ApiResponse<MechanicProfile>> {
    return this.get('/mechanic/me');
  }

  async updateProfile(profileData: Partial<MechanicProfile>): Promise<ApiResponse<MechanicProfile>> {
    return this.put('/mechanic/me', profileData);
  }

  async updateAvailability(availability: boolean): Promise<ApiResponse> {
    return this.put('/mechanic/availability', { availability });
  }

  async updateLocation(location: { latitude: number; longitude: number; address?: string }): Promise<ApiResponse> {
    return this.put('/mechanic/location', location);
  }

  async updateWorkingHours(workingHours: {
    start: string;
    end: string;
    days: string[];
  }): Promise<ApiResponse> {
    return this.put('/mechanic/working-hours', { workingHours });
  }

  async updateCapabilities(capabilities: string[]): Promise<ApiResponse> {
    return this.put('/users/capabilities', { capabilities });
  }

  // ===== APPOINTMENT MANAGEMENT =====

  async getAppointments(status?: string, filters?: Record<string, any>): Promise<ApiResponse<MechanicAppointment[]>> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
      });
    }
    const url = `/appointments/mechanic${params.toString() ? `?${params.toString()}` : ''}`;
    return this.get(url);
  }

  async getAppointmentDetails(appointmentId: string): Promise<ApiResponse<MechanicAppointment>> {
    return this.get(`/appointments/${appointmentId}`);
  }

  async getAppointmentCounts(): Promise<ApiResponse<any>> {
    return this.get('/mechanic/appointments/counts');
  }

  // ===== APPOINTMENT STATUS UPDATES =====

  async acceptAppointment(appointmentId: string): Promise<ApiResponse> {
    return this.put(`/appointments/${appointmentId}/status`, { status: 'PLANLANDI' });
  }

  async rejectAppointment(appointmentId: string, rejectionReason: string): Promise<ApiResponse> {
    return this.put(`/appointments/${appointmentId}/status`, { 
      status: 'IPTAL_EDILDI',
      rejectionReason 
    });
  }

  async startService(appointmentId: string): Promise<ApiResponse> {
    return this.put(`/appointments/${appointmentId}/servise-al`);
  }

  async setPaymentPending(appointmentId: string, kalemler: any[], kdvDahil: boolean = true): Promise<ApiResponse> {
    return this.put(`/appointments/${appointmentId}/odeme-bekliyor`, { kalemler, kdvDahil });
  }

  async confirmPayment(appointmentId: string): Promise<ApiResponse> {
    return this.put(`/appointments/${appointmentId}/odeme-tamamlandi`);
  }

  async toggleWaitingParts(appointmentId: string, parcaBekleniyor: boolean): Promise<ApiResponse> {
    return this.put(`/appointments/${appointmentId}/parca-bekleniyor`, { parcaBekleniyor });
  }

  async markNoShow(appointmentId: string): Promise<ApiResponse> {
    return this.put(`/appointments/${appointmentId}/no-show`);
  }

  // ===== APPOINTMENT ITEMS MANAGEMENT =====

  async addAppointmentItem(appointmentId: string, item: {
    ad: string;
    adet: number;
    birim: string;
    tutar: number;
    tur: 'ISCILIK' | 'PARCA';
  }): Promise<ApiResponse> {
    return this.post(`/appointments/${appointmentId}/items`, item);
  }

  async updateAppointmentItem(appointmentId: string, itemId: string, item: {
    ad?: string;
    adet?: number;
    birim?: string;
    tutar?: number;
    tur?: 'ISCILIK' | 'PARCA';
  }): Promise<ApiResponse> {
    return this.put(`/appointments/${appointmentId}/items/${itemId}`, item);
  }

  async deleteAppointmentItem(appointmentId: string, itemId: string): Promise<ApiResponse> {
    return this.delete(`/appointments/${appointmentId}/items/${itemId}`);
  }

  // ===== EXTRA APPROVAL REQUESTS =====

  async requestExtraApproval(appointmentId: string, request: {
    aciklama: string;
    tutar: number;
  }): Promise<ApiResponse> {
    return this.post(`/appointments/${appointmentId}/extra-approval`, request);
  }

  async getExtraApprovalRequests(appointmentId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/appointments/${appointmentId}/extra-approvals`);
  }

  // ===== PAYMENT LINKS =====

  async generatePaymentLink(appointmentId: string): Promise<ApiResponse<{ link: string; ref: string }>> {
    return this.put(`/appointments/${appointmentId}/payment/link`);
  }

  async confirmPaymentReceived(appointmentId: string): Promise<ApiResponse> {
    return this.put(`/appointments/${appointmentId}/payment/confirm`);
  }

  // ===== EMERGENCY SERVICES =====

  async getEmergencyRequests(): Promise<ApiResponse<ServiceRequest[]>> {
    return this.get('/service-requests/mechanic-requests');
  }

  async acceptEmergencyRequest(requestId: string, estimatedArrival?: Date): Promise<ApiResponse> {
    return this.post(`/service-requests/${requestId}/accept`, {
      estimatedArrival: estimatedArrival?.toISOString()
    });
  }

  async updateEmergencyStatus(requestId: string, status: string, notes?: string): Promise<ApiResponse> {
    return this.put(`/service-requests/${requestId}/status`, { status, notes });
  }

  async completeEmergencyService(requestId: string, completionData: {
    finalPrice: number;
    notes?: string;
    duration?: number;
  }): Promise<ApiResponse> {
    return this.put(`/service-requests/${requestId}/complete`, completionData);
  }

  // ===== DASHBOARD & STATISTICS =====

  async getDashboardStats(): Promise<ApiResponse<{
    activeJobs: number;
    todayEarnings: number;
    rating: number;
    totalJobs: number;
    pendingRequests: number;
  }>> {
    return this.get('/appointments/stats');
  }

  async getTodaySchedule(): Promise<ApiResponse<MechanicAppointment[]>> {
    const today = new Date().toISOString().split('T')[0];
    return this.get(`/appointments/mechanic?date=${today}&status=PLANLANDI,SERVISTE`);
  }

  async getRecentActivity(): Promise<ApiResponse<any[]>> {
    return this.get('/appointments/mechanic?limit=10');
  }

  // ===== EARNINGS & WALLET =====

  async getEarnings(): Promise<ApiResponse<Earnings>> {
    return this.get('/mechanic/earnings');
  }

  async getWalletBalance(): Promise<ApiResponse<{ balance: number }>> {
    return this.get('/mechanic/wallet/balance');
  }

  async getWalletDetails(): Promise<ApiResponse<any>> {
    return this.get('/mechanic/wallet');
  }

  async getRecentTransactions(): Promise<ApiResponse<any[]>> {
    return this.get('/mechanic/wallet/transactions');
  }

  async requestWithdrawal(amount: number, bankDetails: any): Promise<ApiResponse> {
    return this.post('/mechanic/wallet/withdraw', { amount, bankDetails });
  }

  // ===== RATINGS & REVIEWS =====

  async getRecentRatings(): Promise<ApiResponse<any[]>> {
    return this.get('/appointment-ratings/current/recent');
  }

  async getRatingStats(): Promise<ApiResponse<{
    averageRating: number;
    totalRatings: number;
    ratingDistribution: Record<number, number>;
  }>> {
    return this.get('/appointment-ratings/current/stats');
  }

  async getAllRatings(page: number = 1, limit: number = 20): Promise<ApiResponse<any[]>> {
    return this.get(`/appointment-ratings/current?page=${page}&limit=${limit}`);
  }

  async respondToRating(ratingId: string, response: string): Promise<ApiResponse> {
    return this.post(`/appointment-ratings/${ratingId}/respond`, { response });
  }

  // ===== MESSAGING =====

  async getConversations(): Promise<ApiResponse<any[]>> {
    return this.get('/message/conversations');
  }

  async getConversationMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<ApiResponse<any[]>> {
    return this.get(`/message/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
  }

  async sendMessage(receiverId: string, content: string, messageType: 'text' | 'image' | 'file' = 'text'): Promise<ApiResponse<any>> {
    return this.post('/message/send', {
      receiverId,
      content,
      messageType
    });
  }

  async deleteConversation(conversationId: string): Promise<ApiResponse> {
    return this.delete(`/message/conversations/${conversationId}`);
  }

  async getUnreadMessageCount(): Promise<ApiResponse<{ count: number }>> {
    return this.get('/message/unread-count');
  }

  async pollMessages(lastMessageId?: string): Promise<ApiResponse<any[]>> {
    const url = lastMessageId 
      ? `/message/poll-messages?lastMessageId=${lastMessageId}`
      : '/message/poll-messages';
    return this.get(url);
  }

  // ===== NOTIFICATIONS =====

  async getNotifications(): Promise<ApiResponse<any[]>> {
    return this.get('/notifications/mechanic');
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse> {
    return this.put(`/notifications/${notificationId}/read`);
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse> {
    return this.put('/notifications/mechanic/mark-all-read');
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse> {
    return this.delete(`/notifications/${notificationId}`);
  }

  async updatePushToken(token: string): Promise<ApiResponse> {
    return this.post('/users/push-token', { token });
  }

  async getNotificationSettings(): Promise<ApiResponse<any>> {
    return this.get('/users/notification-settings');
  }

  async updateNotificationSettings(settings: any): Promise<ApiResponse> {
    return this.put('/users/notification-settings', settings);
  }

  // ===== SERVICE MANAGEMENT =====

  async getServiceCategories(): Promise<ApiResponse<any[]>> {
    return this.get('/service-categories');
  }

  async updateServicePricing(serviceId: string, pricing: {
    basePrice: number;
    pricePerHour?: number;
    estimatedDuration?: number;
  }): Promise<ApiResponse> {
    return this.put(`/mechanic/services/${serviceId}/pricing`, pricing);
  }

  async getServiceHistory(): Promise<ApiResponse<any[]>> {
    return this.get('/mechanic/services/history');
  }

  // ===== FAULT REPORTS =====

  async getFaultReports(status?: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams();
    if (status) queryParams.append('status', status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    return this.get(`/fault-reports/mechanic/reports?${queryParams.toString()}`);
  }

  async getFaultReportDetails(faultReportId: string): Promise<ApiResponse<any>> {
    return this.get(`/fault-reports/mechanic/${faultReportId}`);
  }

  async submitQuote(faultReportId: string, quoteData: {
    estimatedPrice: number;
    estimatedDuration: number;
    description: string;
    partsCost?: number;
    laborCost?: number;
  }): Promise<ApiResponse> {
    return this.post(`/fault-reports/${faultReportId}/quote`, quoteData);
  }

  async submitResponse(faultReportId: string, responseData: {
    response: string;
    canFix: boolean;
    estimatedCost?: number;
  }): Promise<ApiResponse> {
    return this.post(`/fault-reports/${faultReportId}/response`, responseData);
  }

  async finalizeWork(faultReportId: string, data: { notes?: string }): Promise<ApiResponse> {
    return this.post(`/fault-reports/${faultReportId}/finalize`, data);
  }

  // ===== PRICE MANAGEMENT =====

  async updateAppointmentPrice(appointmentId: string, data: {
    additionalAmount: number;
    reason?: string;
    customReason?: string;
  }): Promise<ApiResponse> {
    return this.put(`/appointments/${appointmentId}/price-increase`, data);
  }

  // ===== PERFORMANCE METRICS =====

  async getPerformanceMetrics(): Promise<ApiResponse<{
    completionRate: number;
    averageRating: number;
    responseTime: number;
    customerSatisfaction: number;
    monthlyGrowth: number;
  }>> {
    return this.get('/mechanic/performance');
  }

  async getMonthlyReport(year: number, month: number): Promise<ApiResponse<any>> {
    return this.get(`/mechanic/reports/monthly?year=${year}&month=${month}`);
  }
}

export default MechanicApiService;