// React Native Storage Temizleme Scripti
// Bu scripti app başlangıcında çalıştırabilirsiniz

import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearAllStorage = async () => {
  try {
    console.log('🧹 Storage temizleniyor...');
    
    // Tüm auth related key'leri temizle
    await AsyncStorage.multiRemove([
      'authToken',
      'refreshToken', 
      'userId',
      'userData',
      'onboardingCompleted',
      // Eski key formatları
      'auth_token',
      'refresh_token',
      'user_id',
      'user_data'
    ]);
    
    console.log('✅ Storage temizlendi');
  } catch (error) {
    console.error('❌ Storage temizleme hatası:', error);
  }
};

// App başlangıcında çalıştır
// clearAllStorage();
