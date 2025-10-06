// Debug Token Script
// Bu scripti app içinde çalıştırabilirsiniz

import AsyncStorage from '@react-native-async-storage/async-storage';
import jwt from 'jsonwebtoken';

export const debugToken = async () => {
  try {
    console.log('🔍 Token Debug Başlatılıyor...');
    
    // Storage'dan token'ı al
    const token = await AsyncStorage.getItem('authToken');
    console.log('Token var mı?', token ? 'EVET' : 'HAYIR');
    
    if (token) {
      console.log('Token preview:', token.substring(0, 30) + '...');
      
      // Token'ı decode et
      const decoded = jwt.decode(token);
      console.log('Decoded token:');
      console.log('User ID:', decoded?.userId);
      console.log('User Type:', decoded?.userType);
      console.log('Expire:', new Date(decoded?.exp * 1000));
      
      // Doğru user ID ile karşılaştır
      const correctUserId = '68e4459cab80420639041fd5';
      const isCorrect = decoded?.userId === correctUserId;
      console.log('Doğru user ID mi?', isCorrect ? 'EVET' : 'HAYIR');
      
      if (!isCorrect) {
        console.log('❌ Yanlış token! Storage temizleniyor...');
        await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userId', 'userData']);
        console.log('✅ Storage temizlendi');
      }
    }
  } catch (error) {
    console.error('❌ Token debug hatası:', error);
  }
};

// debugToken();
