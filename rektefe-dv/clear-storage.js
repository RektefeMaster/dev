/**
 * REKTEFE-DV - AsyncStorage Temizleme Script'i
 * 
 * Bu script AsyncStorage'daki tüm verileri temizler.
 * Kullanım: Expo Go'da bu dosyayı çalıştırın
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export async function clearAllStorage() {
  try {
    console.log('🗑️  AsyncStorage temizleniyor...');
    
    // Önce tüm key'leri al
    const keys = await AsyncStorage.getAllKeys();
    console.log(`📊 Toplam ${keys.length} key bulundu:`, keys);
    
    // Tüm key'leri sil
    await AsyncStorage.clear();
    
    console.log('✅ AsyncStorage tamamen temizlendi!');
    console.log('📱 Uygulamayı yeniden başlatın.');
    
    return true;
  } catch (error) {
    console.error('❌ AsyncStorage temizlenirken hata:', error);
    return false;
  }
}

// React Native'de kullanım için export
export default clearAllStorage;

// Node.js'de direkt çalıştırma
if (typeof module !== 'undefined' && module.exports) {
  clearAllStorage();
}

