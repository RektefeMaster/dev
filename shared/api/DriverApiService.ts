import { BaseApiService, ApiResponse, ApiConfig } from './BaseApiService';

// ===== DRIVER-SPECIFIC INTERFACES =====

export interface Vehicle {
  _id: string;
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  color?: string;
  fuelType: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  mileage?: number;
}

export interface Appointment {
  _id: string;
  serviceType: string;
  appointmentDate: string;
  timeSlot: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'in-progress' | 'completed' | 'cancelled';
  mechanicId: string;
  vehicleId: string;
  description?: string;
  price?: number;
  rejectionReason?: string;
  completionNotes?: string;
  rating?: number;
  ratingComment?: string;
}

export interface EmergencyTowingRequest {
  _id: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  description: string;
  vehicleInfo: string;
  contactPhone: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedArrival?: string;
  assignedMechanic?: any;
}

export interface Rating {
  _id: string;
  appointmentId: string;
  mechanicId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

// ===== DRIVER API SERVICE =====

export class DriverApiService extends BaseApiService {
  constructor(config: Omit<ApiConfig, 'userType' | 'appName'>) {
    super({
      ...config,
      userType: 'driver',
      appName: 'Rektefe Driver App'
    });
  }

  // ===== TOKEN MANAGEMENT IMPLEMENTATIONS =====

  protected async getToken(): Promise<string | null> {
    // This should be implemented in the frontend app
    return null;
  }

  protected async setToken(token: string): Promise<void> {
    // This should be implemented in the frontend app
    }

  protected async getUserId(): Promise<string | null> {
    // This should be implemented in the frontend app
    return null;
  }

  protected async setUserId(userId: string): Promise<void> {
    // This should be implemented in the frontend app
    }

  protected async setRefreshToken(refreshToken: string): Promise<void> {
    // This should be implemented in the frontend app
    }

  protected async setUserData(userData: any): Promise<void> {
    // This should be implemented in the frontend app
    }

  protected async clearTokens(): Promise<void> {
    // This should be implemented in the frontend app
    }

  protected async refreshToken(): Promise<string | null> {
    // This should be implemented in the frontend app
    return null;
  }

  // ===== PROFILE MANAGEMENT =====

  async getProfile(): Promise<ApiResponse<any>> {
    return this.get('/users/profile');
  }

  async updateProfile(profileData: any): Promise<ApiResponse> {
    return this.put('/users/profile', profileData);
  }

  // ===== VEHICLE MANAGEMENT =====

  async getVehicles(): Promise<ApiResponse<Vehicle[]>> {
    return this.get('/vehicles');
  }

  async addVehicle(vehicleData: Omit<Vehicle, '_id'>): Promise<ApiResponse<Vehicle>> {
    return this.post('/vehicles', vehicleData);
  }

  async updateVehicle(vehicleId: string, vehicleData: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> {
    return this.put(`/vehicles/${vehicleId}`, vehicleData);
  }

  async deleteVehicle(vehicleId: string): Promise<ApiResponse> {
    return this.delete(`/vehicles/${vehicleId}`);
  }

  // ===== MECHANIC SEARCH =====

  async searchMechanics(filters: {
    location?: { latitude: number; longitude: number; radius?: number };
    serviceType?: string;
    availability?: boolean;
    rating?: number;
  }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    
    if (filters.location) {
      params.append('lat', filters.location.latitude.toString());
      params.append('lng', filters.location.longitude.toString());
      if (filters.location.radius) {
        params.append('radius', filters.location.radius.toString());
      }
    }
    
    if (filters.serviceType) params.append('serviceType', filters.serviceType);
    if (filters.availability) params.append('available', 'true');
    if (filters.rating) params.append('minRating', filters.rating.toString());

    return this.get(`/mechanics/search?${params.toString()}`);
  }

  async getMechanicDetails(mechanicId: string): Promise<ApiResponse<any>> {
    return this.get(`/mechanics/${mechanicId}`);
  }

  async getMechanicRatings(mechanicId: string): Promise<ApiResponse<Rating[]>> {
    return this.get(`/mechanics/${mechanicId}/ratings`);
  }

  // ===== APPOINTMENT MANAGEMENT =====

  async getAppointments(status?: string): Promise<ApiResponse<Appointment[]>> {
    const url = status ? `/appointments/driver?status=${status}` : '/appointments/driver';
    return this.get(url);
  }

  async createAppointment(appointmentData: {
    mechanicId: string;
    vehicleId: string;
    serviceType: string;
    appointmentDate: string;
    timeSlot: string;
    description?: string;
  }): Promise<ApiResponse<Appointment>> {
    return this.post('/appointments', appointmentData);
  }

  async getAppointmentDetails(appointmentId: string): Promise<ApiResponse<Appointment>> {
    return this.get(`/appointments/${appointmentId}`);
  }

  async cancelAppointment(appointmentId: string, reason?: string): Promise<ApiResponse> {
    return this.put(`/appointments/${appointmentId}/cancel`, { reason });
  }

  async rescheduleAppointment(appointmentId: string, newData: {
    appointmentDate: string;
    timeSlot: string;
  }): Promise<ApiResponse> {
    return this.put(`/appointments/${appointmentId}/reschedule`, newData);
  }

  // ===== RATING SYSTEM =====

  async rateAppointment(appointmentId: string, ratingData: {
    rating: number;
    comment?: string;
  }): Promise<ApiResponse<Rating>> {
    return this.post(`/appointments/${appointmentId}/rate`, ratingData);
  }

  async updateRating(ratingId: string, ratingData: {
    rating: number;
    comment?: string;
  }): Promise<ApiResponse<Rating>> {
    return this.put(`/ratings/${ratingId}`, ratingData);
  }

  async deleteRating(ratingId: string): Promise<ApiResponse> {
    return this.delete(`/ratings/${ratingId}`);
  }

  // ===== EMERGENCY TOWING =====

  async createEmergencyRequest(requestData: {
    location: {
      latitude: number;
      longitude: number;
      address: string;
    };
    description: string;
    vehicleInfo: string;
    contactPhone: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  }): Promise<ApiResponse<EmergencyTowingRequest>> {
    return this.post('/emergency-towing', {
      ...requestData,
      priority: requestData.priority || 'medium'
    });
  }

  async getEmergencyRequests(): Promise<ApiResponse<EmergencyTowingRequest[]>> {
    return this.get('/emergency-towing/driver');
  }

  async getEmergencyRequestDetails(requestId: string): Promise<ApiResponse<EmergencyTowingRequest>> {
    return this.get(`/emergency-towing/${requestId}`);
  }

  async cancelEmergencyRequest(requestId: string): Promise<ApiResponse> {
    return this.put(`/emergency-towing/${requestId}/cancel`);
  }

  async trackEmergencyRequest(requestId: string): Promise<ApiResponse<{
    status: string;
    mechanicLocation?: { latitude: number; longitude: number };
    estimatedArrival?: string;
    mechanic?: any;
  }>> {
    return this.get(`/emergency-towing/${requestId}/track`);
  }

  // ===== MESSAGING =====

  async getConversations(): Promise<ApiResponse<any[]>> {
    return this.get('/messages/conversations');
  }

  async getMessages(conversationId: string, page: number = 1): Promise<ApiResponse<any[]>> {
    return this.get(`/messages/conversations/${conversationId}?page=${page}`);
  }

  async sendMessage(receiverId: string, content: string, messageType: 'text' | 'image' | 'file' = 'text'): Promise<ApiResponse<any>> {
    return this.post('/messages/send', {
      receiverId,
      content,
      messageType
    });
  }

  async markMessagesAsRead(conversationId: string): Promise<ApiResponse> {
    return this.put(`/messages/conversations/${conversationId}/read`);
  }

  // ===== NOTIFICATIONS =====

  async getNotifications(): Promise<ApiResponse<any[]>> {
    return this.get('/notifications/driver');
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse> {
    return this.put(`/notifications/${notificationId}/read`);
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse> {
    return this.put('/notifications/driver/mark-all-read');
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse> {
    return this.delete(`/notifications/${notificationId}`);
  }

  async updatePushToken(token: string): Promise<ApiResponse> {
    return this.post('/users/push-token', { token });
  }

  // ===== PAYMENT =====

  async getPaymentMethods(): Promise<ApiResponse<any[]>> {
    return this.get('/payment/methods');
  }

  async addPaymentMethod(paymentData: any): Promise<ApiResponse<any>> {
    return this.post('/payment/methods', paymentData);
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<ApiResponse> {
    return this.delete(`/payment/methods/${paymentMethodId}`);
  }

  async makePayment(appointmentId: string, paymentMethodId: string): Promise<ApiResponse<any>> {
    return this.post('/payment/process', {
      appointmentId,
      paymentMethodId
    });
  }

  async getPaymentHistory(): Promise<ApiResponse<any[]>> {
    return this.get('/payment/history');
  }

  // ===== SERVICE CATEGORIES =====

  async getServiceCategories(): Promise<ApiResponse<any[]>> {
    return this.get('/service-categories');
  }

  async getServiceDetails(serviceId: string): Promise<ApiResponse<any>> {
    return this.get(`/service-categories/${serviceId}`);
  }

  // ===== LOCATION SERVICES =====

  async updateLocation(location: { latitude: number; longitude: number }): Promise<ApiResponse> {
    return this.post('/users/location', location);
  }

  async getNearbyMechanics(location: { latitude: number; longitude: number }, radius: number = 10): Promise<ApiResponse<any[]>> {
    return this.get(`/mechanics/nearby?lat=${location.latitude}&lng=${location.longitude}&radius=${radius}`);
  }

  // ===== SETTINGS =====

  async getNotificationSettings(): Promise<ApiResponse<any>> {
    return this.get('/users/notification-settings');
  }

  async updateNotificationSettings(settings: any): Promise<ApiResponse> {
    return this.put('/users/notification-settings', settings);
  }

  async getPrivacySettings(): Promise<ApiResponse<any>> {
    return this.get('/users/privacy-settings');
  }

  async updatePrivacySettings(settings: any): Promise<ApiResponse> {
    return this.put('/users/privacy-settings', settings);
  }

  // ===== MISSING METHODS FOR BACKWARD COMPATIBILITY =====

  async updateProfilePhoto(photoUrl: string): Promise<ApiResponse> {
    return this.post('/users/profile-photo', { photoUrl });
  }

  async updateCoverPhoto(photoUrl: string): Promise<ApiResponse> {
    return this.post('/users/cover-photo', { photoUrl });
  }

  async deleteConversation(conversationId: string): Promise<ApiResponse> {
    return this.delete(`/messages/conversations/${conversationId}`);
  }
}

export default DriverApiService;