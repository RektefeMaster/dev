import { ToastType } from '@/shared/components/Toast';

export interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
}

class ToastService {
  private listeners: Set<(config: ToastConfig | null) => void> = new Set();
  private currentToast: ToastConfig | null = null;

  /**
   * Toast göster
   */
  show(config: ToastConfig) {
    this.currentToast = config;
    this.notifyListeners(config);
  }

  /**
   * Success toast
   */
  success(message: string, duration?: number) {
    this.show({ message, type: 'success', duration });
  }

  /**
   * Error toast
   */
  error(message: string, duration?: number) {
    this.show({ message, type: 'error', duration });
  }

  /**
   * Info toast
   */
  info(message: string, duration?: number) {
    this.show({ message, type: 'info', duration });
  }

  /**
   * Warning toast
   */
  warning(message: string, duration?: number) {
    this.show({ message, type: 'warning', duration });
  }

  /**
   * Toast'u gizle
   */
  hide() {
    this.currentToast = null;
    this.notifyListeners(null);
  }

  /**
   * Listener ekle
   */
  addListener(callback: (config: ToastConfig | null) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Tüm listener'ları bilgilendir
   */
  private notifyListeners(config: ToastConfig | null) {
    this.listeners.forEach((listener) => {
      listener(config);
    });
  }

  /**
   * Mevcut toast'u al
   */
  getCurrentToast(): ToastConfig | null {
    return this.currentToast;
  }
}

const toastService = new ToastService();

export default toastService;

