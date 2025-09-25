import { useState, useEffect } from 'react';
import { Alert } from 'react-native';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

// Basit network connectivity check'i
// Production'da @react-native-community/netinfo kullanılabilir
export const useNetworkStatus = () => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true, // Başlangıçta connected varsay
    isInternetReachable: null,
    type: null,
  });

  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  // Basit connectivity testi
  const checkConnectivity = async (): Promise<boolean> => {
    try {
      // Basit bir GET request ile connectivity test et
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 saniye timeout

      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const updateNetworkState = async () => {
    const isConnected = await checkConnectivity();
    const wasConnected = networkState.isConnected;
    
    setNetworkState(prev => ({
      ...prev,
      isConnected,
      isInternetReachable: isConnected,
    }));

    // Bağlantı durumu değiştiğinde kullanıcıyı bilgilendir
    if (wasConnected && !isConnected) {
      setShowOfflineAlert(true);
      Alert.alert(
        'İnternet Bağlantısı Yok',
        'Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.',
        [{ text: 'Tamam', onPress: () => setShowOfflineAlert(false) }]
      );
    } else if (!wasConnected && isConnected) {
      Alert.alert(
        'Bağlantı Yeniden Kuruldu',
        'İnternet bağlantınız yeniden kuruldu.',
        [{ text: 'Tamam' }]
      );
    }
  };

  useEffect(() => {
    // İlk connectivity check
    updateNetworkState();

    // Periyodik connectivity check (30 saniyede bir)
    const interval = setInterval(updateNetworkState, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return {
    ...networkState,
    refresh: updateNetworkState,
    showOfflineAlert,
  };
};

// API çağrıları için network-aware wrapper
export const withNetworkCheck = async <T>(
  apiCall: () => Promise<T>,
  onNetworkError?: () => void
): Promise<T> => {
  // Basit connectivity check
  const isConnected = await fetch('https://www.google.com/favicon.ico', {
    method: 'HEAD',
    cache: 'no-cache',
  })
    .then(response => response.ok)
    .catch(() => false);

  if (!isConnected) {
    const error = new Error('İnternet bağlantısı yok');
    error.name = 'NetworkError';
    
    if (onNetworkError) {
      onNetworkError();
    } else {
      Alert.alert(
        'İnternet Bağlantısı Yok',
        'Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.'
      );
    }
    
    throw error;
  }

  return apiCall();
};
