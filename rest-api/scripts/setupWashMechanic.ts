/**
 * Test Yıkama Ustası - Tam Profil Oluşturma
 */

import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { WashProvider } from '../src/models/WashProvider';
import { WashPackage } from '../src/models/WashPackage';
import { WashLane } from '../src/models/WashLane';
import dotenv from 'dotenv';

dotenv.config();

async function setupWashMechanic() {
  try {
    console.log('🔌 MongoDB bağlanılıyor...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Bağlandı\n');

    const mechanic = await User.findOne({ email: 'testus@gmail.com' });
    if (!mechanic) throw new Error('testus@gmail.com bulunamadı!');

    console.log(`👤 Usta: ${mechanic.email}\n`);

    // Provider temizle ve oluştur
    await WashProvider.deleteMany({ userId: mechanic._id });
    await WashPackage.deleteMany({ providerId: mechanic._id });
    await WashLane.deleteMany({});

    const provider = await WashProvider.create({
      userId: mechanic._id,
      businessName: 'Premium Oto Yıkama - Test Merkezi',
      type: 'both',
      location: {
        address: 'İnönü Caddesi No:123 Battalgazi/Malatya',
        city: 'Malatya',
        district: 'Battalgazi',
        coordinates: { latitude: 38.3552, longitude: 38.3095 }
      },
      shop: {
        hasLanes: true,
        laneCount: 3,
        totalCapacity: 20,
        workingHours: [
          { day: 0, isOpen: false },
          { day: 1, isOpen: true, openTime: '08:00', closeTime: '19:00' },
          { day: 2, isOpen: true, openTime: '08:00', closeTime: '19:00' },
          { day: 3, isOpen: true, openTime: '08:00', closeTime: '19:00' },
          { day: 4, isOpen: true, openTime: '08:00', closeTime: '19:00' },
          { day: 5, isOpen: true, openTime: '08:00', closeTime: '20:00' },
          { day: 6, isOpen: true, openTime: '09:00', closeTime: '18:00' }
        ]
      },
      mobile: {
        serviceArea: {
          type: 'Point',
          coordinates: [38.3095, 38.3552],
          radius: 15
        },
        maxDistance: 20,
        equipment: {
          hasWaterTank: true,
          waterCapacity: 200,
          hasGenerator: true,
          generatorPower: 3000,
          hasVacuum: true,
          hasCompressor: true
        },
        pricing: {
          baseDistanceFee: 5,
          perKmFee: 10
        }
      },
      metrics: {
        averageRating: 4.8,
        totalReviews: 127
      },
      reputation: {
        score: 95,
        tier: 'gold'
      },
      isActive: true,
      isVerified: true,
      isPremium: true,
      features: ['Çevre Dostu', 'Premium Kimyasallar', '7/24 Mobil']
    });

    console.log(`✅ Provider: ${provider.businessName}\n`);

    // Hatlar
    const laneData = [
      { num: 1, name: 'Hat 1 - Express', type: 'automatic', dur: 20 },
      { num: 2, name: 'Hat 2 - Standart', type: 'manual', dur: 30 },
      { num: 3, name: 'Hat 3 - Premium', type: 'hybrid', dur: 60 }
    ];

    for (const l of laneData) {
      await WashLane.create({
        providerId: provider._id,
        name: `lane_${l.num}`,
        displayName: l.name,
        laneNumber: l.num,
        laneType: l.type,
        capacity: { parallelJobs: 1, averageJobDuration: l.dur, bufferTime: 5 },
        equipment: { hasHighPressureWasher: true, hasVacuum: true, hasFoamCannon: true, hasDryingSystem: true, hasWaxingSystem: false },
        slots: [],
        isActive: true,
        isOperational: true
      });
      console.log(`✅ ${l.name}`);
    }

    console.log('');

    // Paketler
    const pkgs = [
      { name: 'Hızlı Dış Yıkama', price: 80, dur: 15, type: 'quick_exterior', for: 'shop' },
      { name: 'Standart Yıkama', price: 150, dur: 30, type: 'standard', for: 'both' },
      { name: 'Detaylı İç Temizlik', price: 250, dur: 60, type: 'detailed_interior', for: 'shop' },
      { name: 'Premium Full Paket', price: 500, dur: 120, type: 'ceramic_protection', for: 'shop' },
      { name: 'Mobil Express', price: 120, dur: 25, type: 'quick_exterior', for: 'mobile' }
    ];

    for (const p of pkgs) {
      await WashPackage.create({
        name: p.name,
        description: `${p.name} paketi`,
        packageType: p.type,
        basePrice: p.price,
        duration: p.dur,
        bufferTime: 5,
        segmentMultipliers: { A: 1.0, B: 1.15, C: 1.3, SUV: 1.4, Commercial: 1.6 },
        services: [{ name: 'Yıkama', category: 'exterior', order: 1 }],
        workSteps: [
          { step: 'wash', name: 'Yıkama', order: 1, requiresPhoto: true },
          { step: 'final', name: 'Kontrol', order: 2, requiresPhoto: true }
        ],
        qaRequirements: {
          photosBefore: ['front', 'back'],
          photosAfter: ['front', 'back'],
          checklist: ['Temizlik kontrol']
        },
        extras: [],
        providerId: mechanic._id,
        availableFor: p.for,
        isActive: true,
        isPopular: p.price === 150
      });
      console.log(`✅ ${p.name} - ${p.price} TL`);
    }

    console.log('\n🎉 KURULUM TAMAMLANDI!\n');
    console.log('📊 Oluşturulan:');
    console.log(`   Provider ID: ${provider._id}`);
    console.log(`   Hatlar: 3 adet`);
    console.log(`   Paketler: 5 adet\n`);
    console.log('🔑 Test:');
    console.log('   Email: testus@gmail.com');
    console.log('   Şifre: test123\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

setupWashMechanic();

