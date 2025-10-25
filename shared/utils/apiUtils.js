"use strict";
/**
 * Ortak API yardımcı fonksiyonları
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanApiUrl = exports.requiresAuth = exports.createErrorResponse = exports.createSuccessResponse = exports.createApiResponse = exports.getErrorMessage = exports.processTokenQueue = void 0;
/**
 * Token queue'yu işler
 */
const processTokenQueue = (failedQueue, error, token = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        }
        else {
            resolve(token);
        }
    });
};
exports.processTokenQueue = processTokenQueue;
/**
 * API hata mesajını standardize eder
 */
const getErrorMessage = (error) => {
    if (error && typeof error === 'object') {
        if ('response' in error) {
            const axiosError = error;
            return axiosError.response?.data?.message || axiosError.message || 'API hatası oluştu';
        }
        if ('message' in error) {
            return error.message;
        }
    }
    return 'Bilinmeyen hata oluştu';
};
exports.getErrorMessage = getErrorMessage;
/**
 * API response'unu standardize eder
 */
const createApiResponse = (success, data = null, message = '', status) => {
    return {
        success,
        data: data || undefined,
        message,
        status
    };
};
exports.createApiResponse = createApiResponse;
/**
 * Başarılı API response'u oluşturur
 */
const createSuccessResponse = (data, message = 'İşlem başarılı') => {
    return (0, exports.createApiResponse)(true, data, message);
};
exports.createSuccessResponse = createSuccessResponse;
/**
 * Hatalı API response'u oluşturur
 */
const createErrorResponse = (message, status) => {
    return (0, exports.createApiResponse)(false, null, message, status);
};
exports.createErrorResponse = createErrorResponse;
/**
 * Endpoint'in auth gerektirip gerektirmediğini kontrol eder
 */
const requiresAuth = (url) => {
    const authRequiredEndpoints = [
        '/mechanic/', '/appointments/', '/notifications/',
        '/message/', '/wallet/', '/settings', '/profile',
        '/vehicles/', '/customers/', '/emergency/'
    ];
    return authRequiredEndpoints.some(endpoint => url.includes(endpoint));
};
exports.requiresAuth = requiresAuth;
/**
 * API URL'ini temizler
 */
const cleanApiUrl = (url) => {
    return url.startsWith('/') ? url : `/${url}`;
};
exports.cleanApiUrl = cleanApiUrl;
