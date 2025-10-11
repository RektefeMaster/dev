/**
 * Seed fonksiyonunu manuel çalıştır
 */

import { seedDefaultUsers } from './seedDefaultUsers';

async function runSeed() {
  try {
    console.log('🌱 Seed fonksiyonu çalıştırılıyor...');
    await seedDefaultUsers();
    console.log('✅ Seed tamamlandı!');
  } catch (error) {
    console.error('❌ Seed hatası:', error);
  }
  process.exit(0);
}

runSeed();
