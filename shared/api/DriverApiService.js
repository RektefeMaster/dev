"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverApiService = void 0;
const BaseApiService_1 = require("./BaseApiService");
// ===== DRIVER API SERVICE =====
class DriverApiService extends BaseApiService_1.BaseApiService {
    constructor(config) {
        super({
            ...config,
            userType: 'driver',
            appName: 'Rektefe Driver App'
        });
    }
    // ===== TOKEN MANAGEMENT IMPLEMENTATIONS =====
    async getToken() {
        // This should be implemented in the frontend app
        return null;
    }
    async setToken(token) {
        // This should be implemented in the frontend app
    }
    async getUserId() {
        // This should be implemented in the frontend app
        return null;
    }
    async setUserId(userId) {
        // This should be implemented in the frontend app
    }
    async setRefreshToken(refreshToken) {
        // This should be implemented in the frontend app
    }
    async setUserData(userData) {
        // This should be implemented in the frontend app
    }
    async clearTokens() {
        // This should be implemented in the frontend app
    }
    async refreshToken() {
        // This should be implemented in the frontend app
        return null;
    }
    // ===== PROFILE MANAGEMENT =====
    async getProfile() {
        return this.get('/users/profile');
    }
    async updateProfile(profileData) {
        return this.put('/users/profile', profileData);
    }
    // ===== VEHICLE MANAGEMENT =====
    async getVehicles() {
        return this.get('/vehicles');
    }
    async addVehicle(vehicleData) {
        return this.post('/vehicles', vehicleData);
    }
    async updateVehicle(vehicleId, vehicleData) {
        return this.put(`/vehicles/${vehicleId}`, vehicleData);
    }
    async deleteVehicle(vehicleId) {
        return this.delete(`/vehicles/${vehicleId}`);
    }
    // ===== MECHANIC SEARCH =====
    async searchMechanics(filters) {
        const params = new URLSearchParams();
        if (filters.location) {
            params.append('lat', filters.location.latitude.toString());
            params.append('lng', filters.location.longitude.toString());
            if (filters.location.radius) {
                params.append('radius', filters.location.radius.toString());
            }
        }
        if (filters.serviceType)
            params.append('serviceType', filters.serviceType);
        if (filters.availability)
            params.append('available', 'true');
        if (filters.rating)
            params.append('minRating', filters.rating.toString());
        return this.get(`/mechanics/search?${params.toString()}`);
    }
    async getMechanicDetails(mechanicId) {
        return this.get(`/mechanics/${mechanicId}`);
    }
    async getMechanicRatings(mechanicId) {
        return this.get(`/mechanics/${mechanicId}/ratings`);
    }
    // ===== APPOINTMENT MANAGEMENT =====
    async getAppointments(status) {
        const url = status ? `/appointments/driver?status=${status}` : '/appointments/driver';
        return this.get(url);
    }
    async createAppointment(appointmentData) {
        return this.post('/appointments', appointmentData);
    }
    async getAppointmentDetails(appointmentId) {
        return this.get(`/appointments/${appointmentId}`);
    }
    async cancelAppointment(appointmentId, reason) {
        return this.put(`/appointments/${appointmentId}/cancel`, { reason });
    }
    async rescheduleAppointment(appointmentId, newData) {
        return this.put(`/appointments/${appointmentId}/reschedule`, newData);
    }
    // ===== RATING SYSTEM =====
    async rateAppointment(appointmentId, ratingData) {
        return this.post(`/appointments/${appointmentId}/rate`, ratingData);
    }
    async updateRating(ratingId, ratingData) {
        return this.put(`/ratings/${ratingId}`, ratingData);
    }
    async deleteRating(ratingId) {
        return this.delete(`/ratings/${ratingId}`);
    }
    // ===== EMERGENCY TOWING =====
    async createEmergencyRequest(requestData) {
        return this.post('/emergency-towing', {
            ...requestData,
            priority: requestData.priority || 'medium'
        });
    }
    async getEmergencyRequests() {
        return this.get('/emergency-towing/driver');
    }
    async getEmergencyRequestDetails(requestId) {
        return this.get(`/emergency-towing/${requestId}`);
    }
    async cancelEmergencyRequest(requestId) {
        return this.put(`/emergency-towing/${requestId}/cancel`);
    }
    async trackEmergencyRequest(requestId) {
        return this.get(`/emergency-towing/${requestId}/track`);
    }
    // ===== MESSAGING =====
    async getConversations() {
        return this.get('/messages/conversations');
    }
    async getMessages(conversationId, page = 1) {
        return this.get(`/messages/conversations/${conversationId}?page=${page}`);
    }
    async sendMessage(receiverId, content, messageType = 'text') {
        return this.post('/messages/send', {
            receiverId,
            content,
            messageType
        });
    }
    async markMessagesAsRead(conversationId) {
        return this.put(`/messages/conversations/${conversationId}/read`);
    }
    // ===== NOTIFICATIONS =====
    async getNotifications() {
        return this.get('/notifications/driver');
    }
    async markNotificationAsRead(notificationId) {
        return this.put(`/notifications/${notificationId}/read`);
    }
    async markAllNotificationsAsRead() {
        return this.put('/notifications/driver/mark-all-read');
    }
    async deleteNotification(notificationId) {
        return this.delete(`/notifications/${notificationId}`);
    }
    async updatePushToken(token) {
        return this.post('/users/push-token', { token });
    }
    // ===== PAYMENT =====
    async getPaymentMethods() {
        return this.get('/payment/methods');
    }
    async addPaymentMethod(paymentData) {
        return this.post('/payment/methods', paymentData);
    }
    async deletePaymentMethod(paymentMethodId) {
        return this.delete(`/payment/methods/${paymentMethodId}`);
    }
    async makePayment(appointmentId, paymentMethodId) {
        return this.post('/payment/process', {
            appointmentId,
            paymentMethodId
        });
    }
    async getPaymentHistory() {
        return this.get('/payment/history');
    }
    // ===== SERVICE CATEGORIES =====
    async getServiceCategories() {
        return this.get('/service-categories');
    }
    async getServiceDetails(serviceId) {
        return this.get(`/service-categories/${serviceId}`);
    }
    // ===== LOCATION SERVICES =====
    async updateLocation(location) {
        return this.post('/users/location', location);
    }
    async getNearbyMechanics(location, radius = 10) {
        return this.get(`/mechanics/nearby?lat=${location.latitude}&lng=${location.longitude}&radius=${radius}`);
    }
    // ===== SETTINGS =====
    async getNotificationSettings() {
        return this.get('/users/notification-settings');
    }
    async updateNotificationSettings(settings) {
        return this.put('/users/notification-settings', settings);
    }
    async getPrivacySettings() {
        return this.get('/users/privacy-settings');
    }
    async updatePrivacySettings(settings) {
        return this.put('/users/privacy-settings', settings);
    }
    // ===== MISSING METHODS FOR BACKWARD COMPATIBILITY =====
    async updateProfilePhoto(photoUrl) {
        return this.post('/users/profile-photo', { photoUrl });
    }
    async updateCoverPhoto(photoUrl) {
        return this.post('/users/cover-photo', { photoUrl });
    }
    async deleteConversation(conversationId) {
        return this.delete(`/messages/conversations/${conversationId}`);
    }
}
exports.DriverApiService = DriverApiService;
exports.default = DriverApiService;
