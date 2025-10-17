/**
 * ÖRNEK PAKET SEED SCRIPT
 * 
 * Bu script örnek yıkama paketlerini veritabanına ekler.
 * Her yıkama ustası kendi paketlerini UI üzerinden oluşturmalıdır.
 */

import mongoose from 'mongoose';
import { WashPackage } from '../models/WashPackage';
import { MONGODB_URI, MONGODB_OPTIONS } from '../config';

// Örnek paketler (reference olarak)
const defaultPackages = [
  {
    name: 'Hızlı Dış Yıkama',
    nameEn: 'Quick Exterior Wash',
    description: 'Hızlı dış yıkama ve kurulama',
    descriptionEn: 'Quick exterior wash and drying',
    packageType: 'quick_exterior',
    basePrice: 50,
    segmentMultipliers: {
      A: 1.0,
      B: 1.15,
      C: 1.3,
      SUV: 1.4,
      Commercial: 1.6,
    },
    duration: 15,
    bufferTime: 5,
    requirements: {
      requiresPower: false,
      requiresWater: true,
      requiresCoveredArea: false,
    },
    services: [
      { name: 'Dış Yıkama', category: 'exterior', order: 1 },
      { name: 'Kurulama', category: 'exterior', order: 2 },
    ],
    extras: [],
    workSteps: [
      { step: 'foam', name: 'Köpükleme', order: 1, requiresPhoto: false },
      { step: 'rinse', name: 'Durulama', order: 2, requiresPhoto: false },
      { step: 'dry', name: 'Kurulama', order: 3, requiresPhoto: false },
      { step: 'final_check', name: 'Son Kontrol', order: 4, requiresPhoto: true },
    ],
    qaRequirements: {
      photosBefore: ['front', 'back', 'left', 'right'],
      photosAfter: ['front', 'back', 'left', 'right'],
      checklist: ['Cam temizliği', 'Su lekesi kontrolü'],
    },
    isActive: true,
    isPopular: false,
    sortOrder: 1,
    availableFor: 'both',
  },
  {
    name: 'Standart İç-Dış Yıkama',
    nameEn: 'Standard Interior & Exterior',
    description: 'Dış yıkama + İç temizlik + Vakum',
    descriptionEn: 'Exterior wash + Interior cleaning + Vacuum',
    packageType: 'standard',
    basePrice: 100,
    segmentMultipliers: {
      A: 1.0,
      B: 1.15,
      C: 1.3,
      SUV: 1.4,
      Commercial: 1.6,
    },
    duration: 45,
    bufferTime: 5,
    requirements: {
      requiresPower: true,
      requiresWater: true,
      requiresCoveredArea: false,
    },
    services: [
      { name: 'Dış Yıkama', category: 'exterior', order: 1 },
      { name: 'Kurulama', category: 'exterior', order: 2 },
      { name: 'Vakum', category: 'interior', order: 3 },
      { name: 'İç Temizlik', category: 'interior', order: 4 },
      { name: 'Cam Temizliği', category: 'exterior', order: 5 },
    ],
    extras: [
      {
        name: 'Motor Temizliği',
        description: 'Motor bölmesi detaylı temizliği',
        price: 50,
        duration: 20,
      },
      {
        name: 'Jant Parlatma',
        description: 'Jantların özel ürünlerle parlatılması',
        price: 30,
        duration: 15,
      },
    ],
    workSteps: [
      { step: 'foam', name: 'Köpükleme', order: 1, requiresPhoto: false },
      { step: 'rinse', name: 'Durulama', order: 2, requiresPhoto: false },
      { step: 'dry', name: 'Kurulama', order: 3, requiresPhoto: false },
      { step: 'vacuum', name: 'Vakumlama', order: 4, requiresPhoto: false },
      { step: 'interior_clean', name: 'İç Temizlik', order: 5, requiresPhoto: true },
      { step: 'glass_clean', name: 'Cam Temizliği', order: 6, requiresPhoto: false },
      { step: 'final_check', name: 'Son Kontrol', order: 7, requiresPhoto: true },
    ],
    qaRequirements: {
      photosBefore: ['front', 'back', 'left', 'right', 'interior_front', 'interior_back'],
      photosAfter: ['front', 'back', 'left', 'right', 'interior_front', 'interior_back'],
      checklist: [
        'Cam temizliği',
        'Jant temizliği',
        'Paspas temizliği',
        'Su lekesi kontrolü',
        'Koltuk/kumaş kontrolü',
      ],
    },
    isActive: true,
    isPopular: true,
    sortOrder: 2,
    availableFor: 'both',
  },
  {
    name: 'Detaylı İç Temizlik',
    nameEn: 'Detailed Interior Cleaning',
    description: 'Kapsamlı iç temizlik ve detaylandırma',
    descriptionEn: 'Comprehensive interior cleaning and detailing',
    packageType: 'detailed_interior',
    basePrice: 150,
    segmentMultipliers: {
      A: 1.0,
      B: 1.15,
      C: 1.3,
      SUV: 1.5,
      Commercial: 1.8,
    },
    duration: 90,
    bufferTime: 10,
    requirements: {
      requiresPower: true,
      requiresWater: true,
      requiresCoveredArea: true,
    },
    services: [
      { name: 'Detaylı Vakum', category: 'interior', order: 1 },
      { name: 'Koltuk Yıkama', category: 'interior', order: 2 },
      { name: 'Tavan Temizliği', category: 'interior', order: 3 },
      { name: 'Torpido/Konsol Temizliği', category: 'interior', order: 4 },
      { name: 'Havalandırma İzgaraları', category: 'interior', order: 5 },
      { name: 'Cam Temizliği', category: 'interior', order: 6 },
    ],
    extras: [
      {
        name: 'Koltuk Ozon Tedavisi',
        description: 'Koltuk ve iç mekan ozon ile dezenfeksiyon',
        price: 100,
        duration: 30,
      },
      {
        name: 'Pet Tüyü Temizliği',
        description: 'Hayvan tüylerinin özel ekipmanla temizliği',
        price: 75,
        duration: 30,
      },
    ],
    workSteps: [
      { step: 'deep_vacuum', name: 'Detaylı Vakumlama', order: 1, requiresPhoto: true },
      { step: 'seat_wash', name: 'Koltuk Yıkama', order: 2, requiresPhoto: true },
      { step: 'ceiling_clean', name: 'Tavan Temizliği', order: 3, requiresPhoto: true },
      { step: 'dashboard_clean', name: 'Torpido Temizliği', order: 4, requiresPhoto: false },
      { step: 'vent_clean', name: 'Havalandırma', order: 5, requiresPhoto: false },
      { step: 'glass_clean', name: 'Cam Temizliği', order: 6, requiresPhoto: false },
      { step: 'final_check', name: 'Son Kontrol', order: 7, requiresPhoto: true },
    ],
    qaRequirements: {
      photosBefore: ['interior_front', 'interior_back', 'seats', 'ceiling', 'dashboard'],
      photosAfter: ['interior_front', 'interior_back', 'seats', 'ceiling', 'dashboard'],
      checklist: [
        'Koltuk temizliği',
        'Tavan lekesi kontrolü',
        'Torpido ve konsol',
        'Kapı döşemeleri',
        'Bagaj temizliği',
      ],
    },
    isActive: true,
    isPopular: false,
    sortOrder: 3,
    availableFor: 'shop',
  },
  {
    name: 'Seramik Koruma Uygulaması',
    nameEn: 'Ceramic Protection',
    description: 'Profesyonel seramik kaplama ve koruma',
    descriptionEn: 'Professional ceramic coating and protection',
    packageType: 'ceramic_protection',
    basePrice: 500,
    segmentMultipliers: {
      A: 1.0,
      B: 1.2,
      C: 1.4,
      SUV: 1.6,
      Commercial: 2.0,
    },
    duration: 180,
    bufferTime: 15,
    requirements: {
      requiresPower: true,
      requiresWater: true,
      requiresCoveredArea: true,
      minTemperature: 15,
    },
    services: [
      { name: 'Detaylı Yıkama', category: 'exterior', order: 1 },
      { name: 'Kil Uygulaması', category: 'special', order: 2 },
      { name: 'Pasta', category: 'special', order: 3 },
      { name: 'Yüzey Hazırlığı', category: 'special', order: 4 },
      { name: 'Seramik Uygulama', category: 'special', order: 5 },
      { name: 'Kurulama', category: 'special', order: 6 },
    ],
    extras: [
      {
        name: 'Cam Seramik',
        description: 'Camlara özel seramik kaplama',
        price: 200,
        duration: 30,
      },
      {
        name: 'Jant Seramik',
        description: 'Jantlara özel seramik kaplama',
        price: 150,
        duration: 45,
      },
    ],
    workSteps: [
      { step: 'detailed_wash', name: 'Detaylı Yıkama', order: 1, requiresPhoto: true },
      { step: 'clay_bar', name: 'Kil Uygulaması', order: 2, requiresPhoto: true },
      { step: 'polish', name: 'Pasta', order: 3, requiresPhoto: true },
      { step: 'surface_prep', name: 'Yüzey Hazırlığı', order: 4, requiresPhoto: true },
      { step: 'ceramic_apply', name: 'Seramik Uygulama', order: 5, requiresPhoto: true },
      { step: 'curing', name: 'Kurulama', order: 6, requiresPhoto: true },
      { step: 'final_check', name: 'Son Kontrol', order: 7, requiresPhoto: true },
    ],
    qaRequirements: {
      photosBefore: ['front', 'back', 'left', 'right', 'hood', 'roof'],
      photosAfter: ['front', 'back', 'left', 'right', 'hood', 'roof'],
      checklist: [
        'Yüzey düzgünlüğü',
        'Seramik kalınlığı',
        'Homojen dağılım',
        'Kusur kontrolü',
        'Parlaklık seviyesi',
      ],
    },
    isActive: true,
    isPopular: true,
    sortOrder: 4,
    availableFor: 'shop',
  },
];

async function seedWashPackages() {
  try {
    console.log('🌱 Örnek yıkama paketleri ekleniyor...');
    
    // MongoDB'ye bağlan
    await mongoose.connect(MONGODB_URI, MONGODB_OPTIONS);
    console.log('✅ MongoDB bağlantısı başarılı');

    // Mevcut paketleri kontrol et
    const existingPackages = await WashPackage.countDocuments();
    
    if (existingPackages > 0) {
      console.log(`⚠️  Zaten ${existingPackages} paket var.`);
      process.exit(0);
    }

    console.log('📦 Örnek paketler ekleniyor...\n');

    // Paketleri ekle (providerId olmadan - örnek olarak)
    for (const packageData of defaultPackages) {
      const newPackage = new WashPackage({
        ...packageData,
        providerId: null, // Genel örnek paket
      });
      await newPackage.save();
      console.log(`✅ "${packageData.name}" paketi eklendi`);
    }

    console.log('\n🎉 İşlem tamamlandı!');
    console.log(`📦 ${defaultPackages.length} örnek paket eklendi`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

// Script çalıştırıldığında
if (require.main === module) {
  seedWashPackages();
}

export { seedWashPackages };

