import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';

// ===== INTERFACES =====

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    version: string;
    responseTime?: number;
  };
}

export interface AuthTokens {
  AUTH_TOKEN: string;
  REFRESH_TOKEN: string;
  USER_ID: string;
  USER_DATA: string;
  ERROR_LOGS: string;
}

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  storageKeys: AuthTokens;
  userType: 'driver' | 'mechanic';
  appName: string;
  onAuthFailure?: () => void; // 401 hatası durumunda çağrılacak callback
}

// ===== BASE API SERVICE =====

export class BaseApiService {
  protected api: AxiosInstance;
  protected config: ApiConfig;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  constructor(config: ApiConfig) {
    this.config = config;
    this.api = axios.create({
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

  private setupInterceptors() {
    // Request interceptor - add auth token
    this.api.interceptors.request.use(
      async (config) => {
        try {
          const token = await this.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          
          // Add request ID for tracking
          config.headers['X-Request-ID'] = this.generateRequestId();
          
          console.log(`Request: ${config.method?.toUpperCase()} ${config.url}`);
        } catch (error) {
          console.error('Request interceptor error:', error);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle auth and errors
    this.api.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
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
            } else {
              // Refresh failed, clear tokens and redirect to login
              await this.clearTokens();
              this.processQueue(new Error('Token refresh failed'), null);
              
              // Call auth failure callback if provided
              if (this.config.onAuthFailure) {
                this.config.onAuthFailure();
              }
              
              throw new Error('Authentication failed');
            }
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            await this.clearTokens();
            
            // Call auth failure callback if provided
            if (this.config.onAuthFailure) {
              this.config.onAuthFailure();
            }
            
            throw refreshError;
          } finally {
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
      }
    );
  }

  // ===== TOKEN MANAGEMENT =====

  protected async getToken(): Promise<string | null> {
    // Override in concrete classes
    return null;
  }

  protected async setToken(token: string): Promise<void> {
    // Override in concrete classes
  }

  protected async getUserId(): Promise<string | null> {
    // Override in concrete classes
    return null;
  }

  protected async setUserId(userId: string): Promise<void> {
    // Override in concrete classes
  }

  protected async setRefreshToken(refreshToken: string): Promise<void> {
    // Override in concrete classes
  }

  protected async setUserData(userData: any): Promise<void> {
    // Override in concrete classes
  }

  protected async clearTokens(): Promise<void> {
    // Override in concrete classes
  }

  // ===== TOKEN VALIDATION =====

  protected isTokenValid(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }
      
      // Base64 decode for React Native (atob doesn't exist)
      const base64Decode = (str: string): string => {
        if (typeof atob !== 'undefined') return atob(str);
        const base64abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '', buffer = 0, bitsCollected = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str[i];
          if (char === '=') break;
          const charIndex = base64abc.indexOf(char);
          if (charIndex === -1) continue;
          buffer = (buffer << 6) | charIndex;
          bitsCollected += 6;
          if (bitsCollected >= 8) {
            bitsCollected -= 8;
            result += String.fromCharCode((buffer >> bitsCollected) & 0xff);
          }
        }
        return result;
      };
      
      const payload = JSON.parse(base64Decode(parts[1]));
      
      if (!payload.exp) {
        return false;
      }
      
      const currentTime = Math.floor(Date.now() / 1000);
      return currentTime < payload.exp;
    } catch (error) {
      return false;
    }
  }

  protected async refreshToken(): Promise<string | null> {
    // Override in concrete classes
    return null;
  }

  // ===== QUEUE MANAGEMENT =====

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  // ===== ERROR HANDLING =====

  public handleError(error: any): ApiResponse {
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

  protected generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected async logError(error: any, context: string) {
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
      } catch (logError) {
      }
  }

  // ===== COMMON API METHODS =====

  public async request(method: string, url: string, data?: any): Promise<ApiResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: method.toLowerCase() as any,
        url,
        data
      };
      
      const response = await this.api(config);
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get(url, config);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  protected async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.post(url, data, config);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  protected async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.put(url, data, config);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  protected async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.delete(url, config);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== AUTHENTICATION METHODS =====

  async login(credentials: {
    email: string;
    password: string;
    userType: 'driver' | 'mechanic';
  }): Promise<ApiResponse> {
    try {
      const response = await this.post('/auth/login', credentials);
      
      if (response.success && response.data) {
        const { token, refreshToken, user } = response.data as any;
        
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
    } catch (error) {
      await this.logError(error, 'login');
      return this.handleError(error);
    }
  }

  async register(userData: any): Promise<ApiResponse> {
    try {
      return await this.post('/auth/register', {
        ...userData,
        userType: this.config.userType
      });
    } catch (error) {
      await this.logError(error, 'register');
      return this.handleError(error);
    }
  }

  async logout(): Promise<ApiResponse> {
    try {
      const response = await this.post('/auth/logout');
      await this.clearTokens();
      return response;
    } catch (error) {
      // Even if logout fails, clear local tokens
      await this.clearTokens();
      return this.handleError(error);
    }
  }

  async validateToken(): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) return false;
      
      const response = await this.get('/auth/validate');
      return response.success;
    } catch (error) {
      return false;
    }
  }
}

export default BaseApiService;