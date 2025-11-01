class Logger {
  static log(message: string, ...args: unknown[]): void {
    if (__DEV__ || process.env.NODE_ENV === 'development') {
      console.log(message, ...args);
    }
  }
  
  static error(message: string, ...args: unknown[]): void {
    if (__DEV__ || process.env.NODE_ENV === 'development') {
      console.error(message, ...args);
    } else {
      // Production'da error reporting service'e gönder
      this.reportError(message, args);
    }
  }
  
  static warn(message: string, ...args: unknown[]): void {
    if (__DEV__ || process.env.NODE_ENV === 'development') {
      console.warn(message, ...args);
    }
  }
  
  static info(message: string, ...args: unknown[]): void {
    if (__DEV__ || process.env.NODE_ENV === 'development') {
      console.info(message, ...args);
    }
  }
  
  static reportError(message: string, args: unknown[]): void {
    // Production error reporting burada implement edilecek
    // Örnek: Sentry, LogRocket, vb.
  }
}

export default Logger;
