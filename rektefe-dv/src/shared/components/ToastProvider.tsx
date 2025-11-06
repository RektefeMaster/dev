import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import Toast from './Toast';
import toastService, { ToastConfig } from '@/shared/services/toastService';

/**
 * Toast Provider - Uygulamanın en üst seviyesinde kullanılmalı
 * Tüm toast mesajlarını yönetir
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastConfig, setToastConfig] = useState<ToastConfig | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = toastService.addListener((config) => {
      if (config) {
        setToastConfig(config);
        setVisible(true);
      } else {
        setVisible(false);
        // Toast gizlendikten sonra config'i temizle
        setTimeout(() => {
          setToastConfig(null);
        }, 300);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {toastConfig && (
        <Toast
          message={toastConfig.message}
          type={toastConfig.type}
          duration={toastConfig.duration}
          visible={visible}
          onClose={() => {
            setVisible(false);
          }}
        />
      )}
    </View>
  );
};

export default ToastProvider;

