"use strict";
/**
 * REKTEFE PROJESİ - STANDART API RESPONSE FORMATLARI
 *
 * Bu dosya, tüm API endpoint'leri için standart response
 * formatlarını tanımlar. Tutarlılık için tüm endpoint'ler
 * bu formatları kullanmalıdır.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorMessage = exports.getErrorCode = exports.isErrorResponse = exports.isSuccessResponse = exports.createPaginatedResponse = exports.createErrorResponse = exports.createSuccessResponse = exports.ERROR_STATUS_MAPPING = exports.ERROR_MESSAGES_TR = exports.ErrorCode = void 0;
// ===== ERROR CODES =====
var ErrorCode;
(function (ErrorCode) {
    // Authentication & Authorization
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["FORBIDDEN"] = "FORBIDDEN";
    ErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    ErrorCode["REFRESH_TOKEN_EXPIRED"] = "REFRESH_TOKEN_EXPIRED";
    ErrorCode["INVALID_TOKEN"] = "INVALID_TOKEN";
    ErrorCode["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    // Validation Errors
    ErrorCode["VALIDATION_FAILED"] = "VALIDATION_FAILED";
    ErrorCode["MISSING_REQUIRED_FIELD"] = "MISSING_REQUIRED_FIELD";
    ErrorCode["INVALID_INPUT_FORMAT"] = "INVALID_INPUT_FORMAT";
    ErrorCode["INVALID_EMAIL_FORMAT"] = "INVALID_EMAIL_FORMAT";
    ErrorCode["INVALID_PHONE_FORMAT"] = "INVALID_PHONE_FORMAT";
    // Resource Errors
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["ALREADY_EXISTS"] = "ALREADY_EXISTS";
    ErrorCode["USER_NOT_FOUND"] = "USER_NOT_FOUND";
    ErrorCode["BAD_REQUEST"] = "BAD_REQUEST";
    ErrorCode["USERTYPE_MISMATCH"] = "USERTYPE_MISMATCH";
    ErrorCode["RESOURCE_CONFLICT"] = "RESOURCE_CONFLICT";
    ErrorCode["RESOURCE_LOCKED"] = "RESOURCE_LOCKED";
    // Business Logic Errors
    ErrorCode["INSUFFICIENT_PERMISSIONS"] = "INSUFFICIENT_PERMISSIONS";
    ErrorCode["OPERATION_NOT_ALLOWED"] = "OPERATION_NOT_ALLOWED";
    ErrorCode["BUSINESS_RULE_VIOLATION"] = "BUSINESS_RULE_VIOLATION";
    ErrorCode["APPOINTMENT_CONFLICT"] = "APPOINTMENT_CONFLICT";
    ErrorCode["PAYMENT_REQUIRED"] = "PAYMENT_REQUIRED";
    // External Service Errors
    ErrorCode["EXTERNAL_SERVICE_ERROR"] = "EXTERNAL_SERVICE_ERROR";
    ErrorCode["PAYMENT_FAILED"] = "PAYMENT_FAILED";
    ErrorCode["NOTIFICATION_FAILED"] = "NOTIFICATION_FAILED";
    ErrorCode["SMS_FAILED"] = "SMS_FAILED";
    ErrorCode["EMAIL_FAILED"] = "EMAIL_FAILED";
    // Database Errors
    ErrorCode["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorCode["CONNECTION_FAILED"] = "CONNECTION_FAILED";
    ErrorCode["QUERY_TIMEOUT"] = "QUERY_TIMEOUT";
    ErrorCode["TRANSACTION_FAILED"] = "TRANSACTION_FAILED";
    // File & Upload Errors
    ErrorCode["FILE_TOO_LARGE"] = "FILE_TOO_LARGE";
    ErrorCode["INVALID_FILE_TYPE"] = "INVALID_FILE_TYPE";
    ErrorCode["UPLOAD_FAILED"] = "UPLOAD_FAILED";
    ErrorCode["FILE_NOT_FOUND"] = "FILE_NOT_FOUND";
    // Server Errors
    ErrorCode["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
    ErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    ErrorCode["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    ErrorCode["MAINTENANCE_MODE"] = "MAINTENANCE_MODE";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
// ===== TURKISH ERROR MESSAGES =====
exports.ERROR_MESSAGES_TR = {
    // Authentication & Authorization
    [ErrorCode.UNAUTHORIZED]: 'Yetkilendirme gerekli. Lütfen giriş yapın.',
    [ErrorCode.FORBIDDEN]: 'Bu işlem için yetkiniz bulunmamaktadır.',
    [ErrorCode.TOKEN_EXPIRED]: 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
    [ErrorCode.REFRESH_TOKEN_EXPIRED]: 'Yenileme token\'ı süresi dolmuş. Lütfen tekrar giriş yapın.',
    [ErrorCode.INVALID_TOKEN]: 'Geçersiz yetkilendirme token\'ı.',
    [ErrorCode.INVALID_CREDENTIALS]: 'Geçersiz email veya şifre.',
    // Validation Errors
    [ErrorCode.VALIDATION_FAILED]: 'Girilen bilgiler geçersiz.',
    [ErrorCode.MISSING_REQUIRED_FIELD]: 'Zorunlu alanlar eksik.',
    [ErrorCode.INVALID_INPUT_FORMAT]: 'Geçersiz veri formatı.',
    [ErrorCode.INVALID_EMAIL_FORMAT]: 'Geçersiz email formatı.',
    [ErrorCode.INVALID_PHONE_FORMAT]: 'Geçersiz telefon formatı.',
    // Resource Errors
    [ErrorCode.NOT_FOUND]: 'İstenen kaynak bulunamadı.',
    [ErrorCode.ALREADY_EXISTS]: 'Bu kayıt zaten mevcut.',
    [ErrorCode.USER_NOT_FOUND]: 'Kullanıcı bulunamadı.',
    [ErrorCode.BAD_REQUEST]: 'Geçersiz istek.',
    [ErrorCode.USERTYPE_MISMATCH]: 'Kullanıcı tipi uyumsuzluğu.',
    [ErrorCode.RESOURCE_CONFLICT]: 'Kaynak çakışması oluştu.',
    [ErrorCode.RESOURCE_LOCKED]: 'Kaynak kilitli, işlem yapılamıyor.',
    // Business Logic Errors
    [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'Yetersiz yetki.',
    [ErrorCode.OPERATION_NOT_ALLOWED]: 'Bu işlem şu anda yapılamaz.',
    [ErrorCode.BUSINESS_RULE_VIOLATION]: 'İş kuralları ihlali.',
    [ErrorCode.APPOINTMENT_CONFLICT]: 'Randevu çakışması oluştu.',
    [ErrorCode.PAYMENT_REQUIRED]: 'Ödeme gerekli.',
    // External Service Errors
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'Harici servis hatası.',
    [ErrorCode.PAYMENT_FAILED]: 'Ödeme işlemi başarısız.',
    [ErrorCode.NOTIFICATION_FAILED]: 'Bildirim gönderilemedi.',
    [ErrorCode.SMS_FAILED]: 'SMS gönderilemedi.',
    [ErrorCode.EMAIL_FAILED]: 'Email gönderilemedi.',
    // Database Errors
    [ErrorCode.DATABASE_ERROR]: 'Veritabanı hatası.',
    [ErrorCode.CONNECTION_FAILED]: 'Bağlantı başarısız.',
    [ErrorCode.QUERY_TIMEOUT]: 'Sorgu zaman aşımı.',
    [ErrorCode.TRANSACTION_FAILED]: 'İşlem başarısız.',
    // File & Upload Errors
    [ErrorCode.FILE_TOO_LARGE]: 'Dosya boyutu çok büyük.',
    [ErrorCode.INVALID_FILE_TYPE]: 'Desteklenmeyen dosya türü.',
    [ErrorCode.UPLOAD_FAILED]: 'Dosya yükleme başarısız.',
    [ErrorCode.FILE_NOT_FOUND]: 'Dosya bulunamadı.',
    // Server Errors
    [ErrorCode.INTERNAL_SERVER_ERROR]: 'Sunucu hatası oluştu.',
    [ErrorCode.SERVICE_UNAVAILABLE]: 'Servis şu anda kullanılamıyor.',
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'İstek limiti aşıldı. Lütfen daha sonra tekrar deneyin.',
    [ErrorCode.MAINTENANCE_MODE]: 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.'
};
// ===== HTTP STATUS CODE MAPPING =====
exports.ERROR_STATUS_MAPPING = {
    // 401 Unauthorized
    [ErrorCode.UNAUTHORIZED]: 401,
    [ErrorCode.TOKEN_EXPIRED]: 401,
    [ErrorCode.REFRESH_TOKEN_EXPIRED]: 401,
    [ErrorCode.INVALID_TOKEN]: 401,
    [ErrorCode.INVALID_CREDENTIALS]: 401,
    // 403 Forbidden
    [ErrorCode.FORBIDDEN]: 403,
    [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
    // 400 Bad Request
    [ErrorCode.VALIDATION_FAILED]: 400,
    [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
    [ErrorCode.INVALID_INPUT_FORMAT]: 400,
    [ErrorCode.INVALID_EMAIL_FORMAT]: 400,
    [ErrorCode.INVALID_PHONE_FORMAT]: 400,
    [ErrorCode.BAD_REQUEST]: 400,
    [ErrorCode.USERTYPE_MISMATCH]: 400,
    [ErrorCode.BUSINESS_RULE_VIOLATION]: 400,
    [ErrorCode.OPERATION_NOT_ALLOWED]: 400,
    [ErrorCode.PAYMENT_REQUIRED]: 400,
    // 404 Not Found
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.USER_NOT_FOUND]: 404,
    [ErrorCode.FILE_NOT_FOUND]: 404,
    // 409 Conflict
    [ErrorCode.ALREADY_EXISTS]: 409,
    [ErrorCode.RESOURCE_CONFLICT]: 409,
    [ErrorCode.APPOINTMENT_CONFLICT]: 409,
    // 423 Locked
    [ErrorCode.RESOURCE_LOCKED]: 423,
    // 413 Payload Too Large
    [ErrorCode.FILE_TOO_LARGE]: 413,
    // 415 Unsupported Media Type
    [ErrorCode.INVALID_FILE_TYPE]: 415,
    // 422 Unprocessable Entity
    [ErrorCode.UPLOAD_FAILED]: 422,
    // 429 Too Many Requests
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
    // 502 Bad Gateway
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
    [ErrorCode.PAYMENT_FAILED]: 502,
    [ErrorCode.NOTIFICATION_FAILED]: 502,
    [ErrorCode.SMS_FAILED]: 502,
    [ErrorCode.EMAIL_FAILED]: 502,
    // 503 Service Unavailable
    [ErrorCode.SERVICE_UNAVAILABLE]: 503,
    [ErrorCode.MAINTENANCE_MODE]: 503,
    [ErrorCode.CONNECTION_FAILED]: 503,
    [ErrorCode.QUERY_TIMEOUT]: 503,
    // 500 Internal Server Error
    [ErrorCode.DATABASE_ERROR]: 500,
    [ErrorCode.TRANSACTION_FAILED]: 500,
    [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
};
// ===== RESPONSE BUILDER FUNCTIONS =====
/**
 * Başarılı API response'u oluşturur
 */
const createSuccessResponse = (data, message = 'İşlem başarılı', requestId, pagination, meta) => {
    return {
        success: true,
        data,
        message,
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0',
        pagination,
        meta
    };
};
exports.createSuccessResponse = createSuccessResponse;
/**
 * Hatalı API response'u oluşturur
 */
const createErrorResponse = (errorCode, customMessage, details, requestId, field) => {
    return {
        success: false,
        error: {
            code: errorCode,
            message: customMessage || exports.ERROR_MESSAGES_TR[errorCode],
            details,
            field
        },
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0'
    };
};
exports.createErrorResponse = createErrorResponse;
/**
 * Pagination bilgisi ile başarılı response oluşturur
 */
const createPaginatedResponse = (data, page, limit, total, message = 'Veriler başarıyla getirildi', requestId) => {
    const totalPages = Math.ceil(total / limit);
    return (0, exports.createSuccessResponse)(data, message, requestId, {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
    });
};
exports.createPaginatedResponse = createPaginatedResponse;
// ===== VALIDATION HELPERS =====
/**
 * Response'un başarılı olup olmadığını kontrol eder
 */
const isSuccessResponse = (response) => {
    return response.success === true;
};
exports.isSuccessResponse = isSuccessResponse;
/**
 * Response'un hatalı olup olmadığını kontrol eder
 */
const isErrorResponse = (response) => {
    return response.success === false;
};
exports.isErrorResponse = isErrorResponse;
/**
 * Error response'dan error code'unu alır
 */
const getErrorCode = (response) => {
    return (0, exports.isErrorResponse)(response) ? response.error.code : null;
};
exports.getErrorCode = getErrorCode;
/**
 * Error response'dan error message'unu alır
 */
const getErrorMessage = (response) => {
    return (0, exports.isErrorResponse)(response) ? response.error.message : null;
};
exports.getErrorMessage = getErrorMessage;
// ===== EXPORT ALL =====
exports.default = {
    ErrorCode,
    ERROR_MESSAGES_TR: exports.ERROR_MESSAGES_TR,
    ERROR_STATUS_MAPPING: exports.ERROR_STATUS_MAPPING,
    createSuccessResponse: exports.createSuccessResponse,
    createErrorResponse: exports.createErrorResponse,
    createPaginatedResponse: exports.createPaginatedResponse,
    isSuccessResponse: exports.isSuccessResponse,
    isErrorResponse: exports.isErrorResponse,
    getErrorCode: exports.getErrorCode,
    getErrorMessage: exports.getErrorMessage
};
