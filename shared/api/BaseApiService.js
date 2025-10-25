"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseApiService = void 0;
const axios_1 = __importDefault(require("axios"));
// ===== BASE API SERVICE =====
class BaseApiService {
    constructor(config) {
        this.isRefreshing = false;
        this.failedQueue = [];
        this.config = config;
        this.api = axios_1.default.create({
            baseURL: config.baseURL,
            timeout: config.timeout,
            headers: {
                'Content-Type': 'application/json',
                'X-Client-Type': config.userType,
                'X-App-Name': config.appName,
            },
        });
        this.setupInterceptors();
    }
    // ===== INTERCEPTORS SETUP =====
    setupInterceptors() {
        // Request interceptor - add auth token
        this.api.interceptors.request.use(async (config) => {
            try {
                const token = await this.getToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                // Add request ID for tracking
                config.headers['X-Request-ID'] = this.generateRequestId();
                console.log(`Request: ${config.method?.toUpperCase()} ${config.url}`);
            }
            catch (error) {
                console.error('Request interceptor error:', error);
            }
            return config;
        }, (error) => Promise.reject(error));
        // Response interceptor - handle auth and errors
        this.api.interceptors.response.use((response) => {
            return response;
        }, async (error) => {
            const originalRequest = error.config;
            // Handle 401 Unauthorized
            if (error.response?.status === 401 && !originalRequest._retry) {
                if (this.isRefreshing) {
                    // If refresh is in progress, queue this request
                    return new Promise((resolve, reject) => {
                        this.failedQueue.push({ resolve, reject });
                    }).then(token => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return this.api(originalRequest);
                    }).catch(err => {
                        return Promise.reject(err);
                    });
                }
                originalRequest._retry = true;
                this.isRefreshing = true;
                try {
                    // Try to refresh token
                    const newToken = await this.refreshToken();
                    if (newToken) {
                        // Retry original request with new token
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        // Process queued requests
                        this.processQueue(null, newToken);
                        return this.api(originalRequest);
                    }
                    else {
                        // Refresh failed, clear tokens and redirect to login
                        await this.clearTokens();
                        this.processQueue(new Error('Token refresh failed'), null);
                        // Call auth failure callback if provided
                        if (this.config.onAuthFailure) {
                            this.config.onAuthFailure();
                        }
                        throw new Error('Authentication failed');
                    }
                }
                catch (refreshError) {
                    this.processQueue(refreshError, null);
                    await this.clearTokens();
                    // Call auth failure callback if provided
                    if (this.config.onAuthFailure) {
                        this.config.onAuthFailure();
                    }
                    throw refreshError;
                }
                finally {
                    this.isRefreshing = false;
                }
            }
            // Log and format error
            const errorInfo = {
                status: error.response?.status,
                statusText: error.response?.statusText,
                url: error.config?.url,
                method: error.config?.method?.toUpperCase(),
                message: error.response?.data?.message || error.message
            };
            return Promise.reject(error);
        });
    }
    // ===== TOKEN MANAGEMENT =====
    async getToken() {
        // Override in concrete classes
        return null;
    }
    async setToken(token) {
        // Override in concrete classes
    }
    async getUserId() {
        // Override in concrete classes
        return null;
    }
    async setUserId(userId) {
        // Override in concrete classes
    }
    async setRefreshToken(refreshToken) {
        // Override in concrete classes
    }
    async setUserData(userData) {
        // Override in concrete classes
    }
    async clearTokens() {
        // Override in concrete classes
    }
    // ===== PUBLIC API METHODS =====
    async request(method, url, data) {
        try {
            const config = {
                method: method.toLowerCase(),
                url,
                data
            };
            const response = await this.api(config);
            return response.data;
        }
        catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message,
                error: error.response?.data?.error
            };
        }
    }
    // ===== TOKEN VALIDATION =====
    isTokenValid(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                return false;
            }
            const payload = JSON.parse(atob(parts[1]));
            if (!payload.exp) {
                return false;
            }
            const currentTime = Math.floor(Date.now() / 1000);
            return currentTime < payload.exp;
        }
        catch (error) {
            return false;
        }
    }
    async refreshToken() {
        // Override in concrete classes
        return null;
    }
    // ===== QUEUE MANAGEMENT =====
    processQueue(error, token = null) {
        this.failedQueue.forEach(({ resolve, reject }) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(token);
            }
        });
        this.failedQueue = [];
    }
    // ===== ERROR HANDLING =====
    handleError(error) {
        if (error.response?.data) {
            return error.response.data;
        }
        // Network error
        if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
            return {
                success: false,
                message: 'Ağ bağlantısı hatası. Lütfen internet bağlantınızı kontrol edin.',
                error: 'NETWORK_ERROR'
            };
        }
        // Timeout error
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            return {
                success: false,
                message: 'Bağlantı zaman aşımı. Lütfen tekrar deneyin.',
                error: 'TIMEOUT_ERROR'
            };
        }
        return {
            success: false,
            message: error.message || 'Bir hata oluştu',
            error: 'UNKNOWN_ERROR'
        };
    }
    // ===== UTILITY METHODS =====
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async logError(error, context) {
        try {
            const errorLog = {
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                },
                context,
                timestamp: new Date().toISOString(),
                userType: this.config.userType,
                appName: this.config.appName,
            };
            // Log to console for now - concrete classes can implement storage
        }
        catch (logError) {
        }
    }
    // ===== COMMON API METHODS =====
    async get(url, config) {
        try {
            const response = await this.api.get(url, config);
            return response.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async post(url, data, config) {
        try {
            const response = await this.api.post(url, data, config);
            return response.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async put(url, data, config) {
        try {
            const response = await this.api.put(url, data, config);
            return response.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    async delete(url, config) {
        try {
            const response = await this.api.delete(url, config);
            return response.data;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    // ===== AUTHENTICATION METHODS =====
    async login(credentials) {
        try {
            const response = await this.post('/auth/login', credentials);
            if (response.success && response.data) {
                const { token, refreshToken, user } = response.data;
                if (token) {
                    await this.setToken(token);
                }
                if (refreshToken) {
                    await this.setRefreshToken(refreshToken);
                }
                if (user?._id) {
                    await this.setUserId(user._id);
                    await this.setUserData(user);
                }
            }
            return response;
        }
        catch (error) {
            await this.logError(error, 'login');
            return this.handleError(error);
        }
    }
    async register(userData) {
        try {
            return await this.post('/auth/register', {
                ...userData,
                userType: this.config.userType
            });
        }
        catch (error) {
            await this.logError(error, 'register');
            return this.handleError(error);
        }
    }
    async logout() {
        try {
            const response = await this.post('/auth/logout');
            await this.clearTokens();
            return response;
        }
        catch (error) {
            // Even if logout fails, clear local tokens
            await this.clearTokens();
            return this.handleError(error);
        }
    }
    async validateToken() {
        try {
            const token = await this.getToken();
            if (!token)
                return false;
            const response = await this.get('/auth/validate');
            return response.success;
        }
        catch (error) {
            return false;
        }
    }
}
exports.BaseApiService = BaseApiService;
exports.default = BaseApiService;
