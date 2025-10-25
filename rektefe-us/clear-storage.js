/**
 * REKTEFE-US - AsyncStorage Temizleme Script'i
 * 
 * Bu script AsyncStorage'daki tüm verileri temizler.
 * Kullanım: Expo Go'da bu dosyayı çalıştırın veya app başlangıcında aktive edin
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearAllStorage = async () => {
  try {
    console.log('🗑️  AsyncStorage temizleniyor...');
    
    // Önce tüm key'leri al
    const keys = await AsyncStorage.getAllKeys();
    console.log(`📊 Toplam ${keys.length} key bulundu:`, keys);
    
    // Tüm storage'ı tamamen temizle
    await AsyncStorage.clear();
    
    console.log('✅ AsyncStorage tamamen temizlendi!');
    console.log('📱 Uygulamayı yeniden başlatın.');
    
    return true;
  } catch (error) {
    console.error('❌ Storage temizleme hatası:', error);
    return false;
  }
};

// App başlangıcında çalıştır (ihtiyaç olduğunda aktive edin)
// clearAllStorage();
