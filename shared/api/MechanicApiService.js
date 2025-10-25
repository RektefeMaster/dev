"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MechanicApiService = void 0;
const BaseApiService_1 = require("./BaseApiService");
// ===== MECHANIC API SERVICE =====
class MechanicApiService extends BaseApiService_1.BaseApiService {
    constructor(config) {
        super({
            ...config,
            userType: 'mechanic',
            appName: 'Rektefe Mechanic App'
        });
    }
    // ===== PROFILE MANAGEMENT =====
    async getProfile() {
        return this.get('/mechanic/me');
    }
    async updateProfile(profileData) {
        return this.put('/mechanic/me', profileData);
    }
    async updateAvailability(availability) {
        return this.put('/mechanic/availability', { availability });
    }
    async updateLocation(location) {
        return this.put('/mechanic/location', location);
    }
    async updateWorkingHours(workingHours) {
        return this.put('/mechanic/working-hours', { workingHours });
    }
    async updateCapabilities(capabilities) {
        return this.put('/users/capabilities', { capabilities });
    }
    // ===== APPOINTMENT MANAGEMENT =====
    async getAppointments(status, filters) {
        const params = new URLSearchParams();
        if (status)
            params.append('status', status);
        if (filters) {
            Object.entries(filters).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '')
                    params.append(k, String(v));
            });
        }
        const url = `/appointments/mechanic${params.toString() ? `?${params.toString()}` : ''}`;
        return this.get(url);
    }
    async getAppointmentDetails(appointmentId) {
        return this.get(`/appointments/${appointmentId}`);
    }
    async getAppointmentCounts() {
        return this.get('/mechanic/appointments/counts');
    }
    // ===== APPOINTMENT STATUS UPDATES =====
    async acceptAppointment(appointmentId) {
        return this.put(`/appointments/${appointmentId}/status`, { status: 'PLANLANDI' });
    }
    async rejectAppointment(appointmentId, rejectionReason) {
        return this.put(`/appointments/${appointmentId}/status`, {
            status: 'IPTAL_EDILDI',
            rejectionReason
        });
    }
    async startService(appointmentId) {
        return this.put(`/appointments/${appointmentId}/servise-al`);
    }
    async setPaymentPending(appointmentId, kalemler, kdvDahil = true) {
        return this.put(`/appointments/${appointmentId}/odeme-bekliyor`, { kalemler, kdvDahil });
    }
    async confirmPayment(appointmentId) {
        return this.put(`/appointments/${appointmentId}/odeme-tamamlandi`);
    }
    async toggleWaitingParts(appointmentId, parcaBekleniyor) {
        return this.put(`/appointments/${appointmentId}/parca-bekleniyor`, { parcaBekleniyor });
    }
    async markNoShow(appointmentId) {
        return this.put(`/appointments/${appointmentId}/no-show`);
    }
    // ===== APPOINTMENT ITEMS MANAGEMENT =====
    async addAppointmentItem(appointmentId, item) {
        return this.post(`/appointments/${appointmentId}/items`, item);
    }
    async updateAppointmentItem(appointmentId, itemId, item) {
        return this.put(`/appointments/${appointmentId}/items/${itemId}`, item);
    }
    async deleteAppointmentItem(appointmentId, itemId) {
        return this.delete(`/appointments/${appointmentId}/items/${itemId}`);
    }
    // ===== EXTRA APPROVAL REQUESTS =====
    async requestExtraApproval(appointmentId, request) {
        return this.post(`/appointments/${appointmentId}/extra-approval`, request);
    }
    async getExtraApprovalRequests(appointmentId) {
        return this.get(`/appointments/${appointmentId}/extra-approvals`);
    }
    // ===== PAYMENT LINKS =====
    async generatePaymentLink(appointmentId) {
        return this.put(`/appointments/${appointmentId}/payment/link`);
    }
    async confirmPaymentReceived(appointmentId) {
        return this.put(`/appointments/${appointmentId}/payment/confirm`);
    }
    // ===== EMERGENCY SERVICES =====
    async getEmergencyRequests() {
        return this.get('/service-requests/mechanic-requests');
    }
    async acceptEmergencyRequest(requestId, estimatedArrival) {
        return this.post(`/service-requests/${requestId}/accept`, {
            estimatedArrival: estimatedArrival?.toISOString()
        });
    }
    async updateEmergencyStatus(requestId, status, notes) {
        return this.put(`/service-requests/${requestId}/status`, { status, notes });
    }
    async completeEmergencyService(requestId, completionData) {
        return this.put(`/service-requests/${requestId}/complete`, completionData);
    }
    // ===== DASHBOARD & STATISTICS =====
    async getDashboardStats() {
        return this.get('/appointments/stats');
    }
    async getTodaySchedule() {
        const today = new Date().toISOString().split('T')[0];
        return this.get(`/appointments/mechanic?date=${today}&status=PLANLANDI,SERVISTE`);
    }
    async getRecentActivity() {
        return this.get('/appointments/mechanic?limit=10');
    }
    // ===== EARNINGS & WALLET =====
    async getEarnings() {
        return this.get('/mechanic/earnings');
    }
    async getWalletBalance() {
        return this.get('/mechanic/wallet/balance');
    }
    async getWalletDetails() {
        return this.get('/mechanic/wallet');
    }
    async getRecentTransactions() {
        return this.get('/mechanic/wallet/transactions');
    }
    async requestWithdrawal(amount, bankDetails) {
        return this.post('/mechanic/wallet/withdraw', { amount, bankDetails });
    }
    // ===== RATINGS & REVIEWS =====
    async getRecentRatings() {
        return this.get('/appointment-ratings/current/recent');
    }
    async getRatingStats() {
        return this.get('/appointment-ratings/current/stats');
    }
    async getAllRatings(page = 1, limit = 20) {
        return this.get(`/appointment-ratings/current?page=${page}&limit=${limit}`);
    }
    async respondToRating(ratingId, response) {
        return this.post(`/appointment-ratings/${ratingId}/respond`, { response });
    }
    // ===== MESSAGING =====
    async getConversations() {
        return this.get('/message/conversations');
    }
    async getConversationMessages(conversationId, page = 1, limit = 50) {
        return this.get(`/message/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
    }
    async sendMessage(receiverId, content, messageType = 'text') {
        return this.post('/message/send', {
            receiverId,
            content,
            messageType
        });
    }
    async deleteConversation(conversationId) {
        return this.delete(`/message/conversations/${conversationId}`);
    }
    async getUnreadMessageCount() {
        return this.get('/message/unread-count');
    }
    async pollMessages(lastMessageId) {
        const url = lastMessageId
            ? `/message/poll-messages?lastMessageId=${lastMessageId}`
            : '/message/poll-messages';
        return this.get(url);
    }
    // ===== NOTIFICATIONS =====
    async getNotifications() {
        return this.get('/notifications/mechanic');
    }
    async markNotificationAsRead(notificationId) {
        return this.put(`/notifications/${notificationId}/read`);
    }
    async markAllNotificationsAsRead() {
        return this.put('/notifications/mechanic/mark-all-read');
    }
    async deleteNotification(notificationId) {
        return this.delete(`/notifications/${notificationId}`);
    }
    async updatePushToken(token) {
        return this.post('/users/push-token', { token });
    }
    async getNotificationSettings() {
        return this.get('/users/notification-settings');
    }
    async updateNotificationSettings(settings) {
        return this.put('/users/notification-settings', settings);
    }
    // ===== SERVICE MANAGEMENT =====
    async getServiceCategories() {
        return this.get('/service-categories');
    }
    async updateServicePricing(serviceId, pricing) {
        return this.put(`/mechanic/services/${serviceId}/pricing`, pricing);
    }
    async getServiceHistory() {
        return this.get('/mechanic/services/history');
    }
    // ===== FAULT REPORTS =====
    async getFaultReports(status, params) {
        const queryParams = new URLSearchParams();
        if (status)
            queryParams.append('status', status);
        if (params?.page)
            queryParams.append('page', params.page.toString());
        if (params?.limit)
            queryParams.append('limit', params.limit.toString());
        return this.get(`/fault-reports/mechanic/reports?${queryParams.toString()}`);
    }
    async getFaultReportDetails(faultReportId) {
        return this.get(`/fault-reports/mechanic/${faultReportId}`);
    }
    async submitQuote(faultReportId, quoteData) {
        return this.post(`/fault-reports/${faultReportId}/quote`, quoteData);
    }
    async submitResponse(faultReportId, responseData) {
        return this.post(`/fault-reports/${faultReportId}/response`, responseData);
    }
    async finalizeWork(faultReportId, data) {
        return this.post(`/fault-reports/${faultReportId}/finalize`, data);
    }
    // ===== PRICE MANAGEMENT =====
    async updateAppointmentPrice(appointmentId, data) {
        return this.put(`/appointments/${appointmentId}/price-increase`, data);
    }
    // ===== PERFORMANCE METRICS =====
    async getPerformanceMetrics() {
        return this.get('/mechanic/performance');
    }
    async getMonthlyReport(year, month) {
        return this.get(`/mechanic/reports/monthly?year=${year}&month=${month}`);
    }
}
exports.MechanicApiService = MechanicApiService;
exports.default = MechanicApiService;
