"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Logger {
    static log(message, ...args) {
        if (process.env.NODE_ENV === 'development') {
            console.log(message, ...args);
        }
    }
    static error(message, ...args) {
        if (process.env.NODE_ENV === 'development') {
            console.error(message, ...args);
        }
        else {
            // Production'da error reporting service'e gönder
            this.reportError(message, args);
        }
    }
    static warn(message, ...args) {
        if (process.env.NODE_ENV === 'development') {
            console.warn(message, ...args);
        }
    }
    static info(message, ...args) {
        if (process.env.NODE_ENV === 'development') {
            console.info(message, ...args);
        }
    }
    static reportError(message, args) {
        // Production error reporting burada implement edilecek
        // Örnek: Sentry, LogRocket, vb.
    }
}
exports.default = Logger;
