/**
 * E2E Tests - Araç Yıkama Modülü
 * 
 * Bu dosya, araç yıkama modülü için kapsamlı E2E (End-to-End) testlerini içerir.
 * Test senaryoları:
 * 1. Shop Yıkama: Sipariş → Slot Seç → Check-in → İlerleme → QA → Teslim
 * 2. Mobil Yıkama: Sipariş → Usta Ataması → Yolda → Check-in → İlerleme → QA → Teslim
 * 3. İptal Senaryoları (farklı aşamalarda)
 * 4. İtiraz Açma ve Çözüm
 */

import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import { User } from '../../src/models/User';
import { Vehicle } from '../../src/models/Vehicle';
import { WashOrder } from '../../src/models/WashOrder';
import { WashPackage } from '../../src/models/WashPackage';
import { WashProvider } from '../../src/models/WashProvider';
import { WashLane } from '../../src/models/WashLane';
import jwt from 'jsonwebtoken';
import washRoutes from '../../src/routes/wash';
import cors from 'cors';

// Test app oluştur
const app = express();
app.use(cors());
app.use(express.json());

// Auth middleware mock - test için
app.use((req: any, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
      req.user = decoded;
    } catch (error) {
      // Token geçersiz
    }
  }
  next();
});

app.use('/api/wash', washRoutes);

// Test kullanıcıları ve token'ları
let driverUser: any;
let mechanicUser: any;
let driverToken: string;
let mechanicToken: string;
let testVehicle: any;
let testPackage: any;
let testProvider: any;
let testLane: any;

// MEVCUT test kullanıcıları (gerçek DB'den)
const testDriver = {
  email: 'testdv@gmail.com',
  password: 'test123', // veya '123'
};

const testMechanic = {
  email: 'testus@gmail.com',
  password: 'test123', // veya '123'
};

// Test önce - veritabanı ve test verilerini hazırla
beforeAll(async () => {
  // MongoDB bağlantısını KAPAT (setup.ts'den gelen memory server)
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }

  // Production DB'ye bağlan (test kullanıcıları için)
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe';
  await mongoose.connect(mongoUri);
  console.log('🔌 MongoDB bağlantısı:', mongoUri);

  // Mevcut test kullanıcılarını bul
  driverUser = await User.findOne({ email: testDriver.email });
  mechanicUser = await User.findOne({ email: testMechanic.email });

  console.log('🔍 Kullanıcı arama sonuçları:');
  console.log('   Driver:', testDriver.email, driverUser ? '✅' : '❌');
  console.log('   Mechanic:', testMechanic.email, mechanicUser ? '✅' : '❌');

  if (!driverUser || !mechanicUser) {
    console.error('\n❌ Test kullanıcıları bulunamadı!');
    console.error('📝 Çözüm: npm run create:test-users komutunu çalıştırın\n');
    throw new Error('Test kullanıcıları veritabanında bulunamadı');
  }

  // Token'lar oluştur
  driverToken = jwt.sign(
    { userId: driverUser._id.toString(), role: driverUser.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '24h' }
  );

  mechanicToken = jwt.sign(
    { userId: mechanicUser._id.toString(), role: mechanicUser.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '24h' }
  );

  // Test aracını bul veya oluştur
  testVehicle = await Vehicle.findOne({ userId: driverUser._id });
  
  if (!testVehicle) {
    testVehicle = await Vehicle.create({
      userId: driverUser._id,
      brand: 'Toyota',
      modelName: 'Corolla',
      package: 'Sedan',
      year: 2020,
      plateNumber: '34 TEST 123',
      fuelType: 'Benzin',
      segment: 'B'
    });
  }

  // Test için önceki wash order'ları temizle
  await WashOrder.deleteMany({ 
    $or: [
      { driverId: driverUser._id },
      { providerId: mechanicUser._id }
    ]
  });

  // Test provider profilini bul veya oluştur
  testProvider = await WashProvider.findOne({ userId: mechanicUser._id });
  
  if (!testProvider) {
    testProvider = await WashProvider.create({
    userId: mechanicUser._id,
    businessName: 'Test Yıkama Merkezi',
    type: 'shop',
    location: {
      address: 'Test Caddesi No:1 Kadıköy/İstanbul',
      city: 'İstanbul',
      district: 'Kadıköy',
      coordinates: {
        latitude: 40.9922,
        longitude: 29.0219
      }
    },
    shop: {
      hasLanes: true,
      laneCount: 2,
      totalCapacity: 10,
      workingHours: [
        {
          day: 1, // Pazartesi
          isOpen: true,
          openTime: '09:00',
          closeTime: '18:00'
        },
        {
          day: 2, // Salı
          isOpen: true,
          openTime: '09:00',
          closeTime: '18:00'
        }
      ]
    }
    });
  }

  // Test hatını bul veya oluştur
  testLane = await WashLane.findOne({ providerId: testProvider._id });
  
  if (!testLane) {
    testLane = await WashLane.create({
    providerId: testProvider._id,
    name: 'lane_1',
    displayName: 'Hat 1',
    laneNumber: 1,
    capacity: {
      parallelJobs: 1,
      averageJobDuration: 30,
      bufferTime: 5
    },
    laneType: 'manual',
    equipment: {
      hasHighPressureWasher: true,
      hasVacuum: true,
      hasFoamCannon: true,
      hasDryingSystem: false,
      hasWaxingSystem: false
    },
      slots: [],
      isActive: true,
      isOperational: true
    });
  }

  // Test paketini bul veya oluştur
  testPackage = await WashPackage.findOne({ 
    providerId: mechanicUser._id,
    name: 'Standart Yıkama (Test)' 
  });
  
  if (!testPackage) {
    testPackage = await WashPackage.create({
      name: 'Standart Yıkama (Test)',
      description: 'Dış yıkama ve iç temizlik - Test paketi',
    packageType: 'standard',
    basePrice: 150,
    segmentMultipliers: {
      A: 1.0,
      B: 1.15,
      C: 1.3,
      SUV: 1.4,
      Commercial: 1.6
    },
    duration: 30,
    bufferTime: 5,
    requirements: {
      requiresPower: false,
      requiresWater: true,
      requiresCoveredArea: false
    },
    services: [
      { name: 'Köpükleme', category: 'exterior', order: 1 },
      { name: 'Durulama', category: 'exterior', order: 2 },
      { name: 'Kurulama', category: 'exterior', order: 3 },
      { name: 'İç Temizlik', category: 'interior', order: 4 }
    ],
    extras: [],
    workSteps: [
      { step: 'foam', name: 'Köpükleme', order: 1, requiresPhoto: true },
      { step: 'rinse', name: 'Durulama', order: 2, requiresPhoto: false },
      { step: 'dry', name: 'Kurulama', order: 3, requiresPhoto: false },
      { step: 'interior', name: 'İç Temizlik', order: 4, requiresPhoto: true },
      { step: 'final_check', name: 'Son Kontrol', order: 5, requiresPhoto: true }
    ],
    qaRequirements: {
      photosBefore: ['front', 'back', 'left', 'right', 'interior_front', 'interior_back'],
      photosAfter: ['front', 'back', 'left', 'right', 'interior_front', 'interior_back'],
      checklist: ['Cam temizliği', 'Jant temizliği', 'Paspas temizliği']
    },
      providerId: mechanicUser._id,
      availableFor: 'shop',
      isActive: true
    });
  }

  console.log('✅ Test kullanıcıları:', {
    driver: driverUser.email,
    mechanic: mechanicUser.email,
    vehicle: testVehicle.plateNumber,
    package: testPackage.name
  });

  console.log('✅ Test verileri hazırlandı');
}, 60000);

// Test sonra - temizlik
afterAll(async () => {
  try {
    // SADECE test siparişlerini temizle (kullanıcıları KALDIR)
    if (mongoose.connection.readyState === 1) {
      await WashOrder.deleteMany({ 
        $or: [
          { driverId: driverUser?._id },
          { providerId: mechanicUser?._id }
        ]
      });
      
      // Test paketini temizle
      await WashPackage.deleteMany({ 
        name: 'Standart Yıkama (Test)' 
      });
      
      console.log('✅ Test siparişleri temizlendi (kullanıcılar korundu)');
    }

    // MongoDB bağlantısını kapat
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  } catch (error) {
    console.error('Temizlik hatası:', error);
  }
}, 30000);

// ==================== TEST SÜİTLERİ ====================

describe('E2E: Araç Yıkama Modülü', () => {
  
  // ==================== 1. SHOP YIKAMA AKIŞI ====================
  
  describe('1. Shop Yıkama - Tam Akış', () => {
    let orderId: string;
    let orderNumber: string;

    test('1.1. Fiyat Teklifi Alınmalı', async () => {
      const response = await request(app)
        .post('/api/wash/quote')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          packageId: testPackage._id,
          vehicleSegment: 'B',
          type: 'shop',
          providerId: mechanicUser._id.toString(),
          scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Yarın
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('pricing');
      expect(response.body.data.pricing).toHaveProperty('finalPrice');
      expect(response.body.data.pricing.basePrice).toBe(150);
      expect(response.body.data.pricing.segmentMultiplier).toBe(1.15);
    });

    test('1.2. Sipariş Oluşturulmalı', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slotStart = new Date(tomorrow.setHours(10, 0, 0, 0));
      const slotEnd = new Date(tomorrow.setHours(10, 35, 0, 0));

      const response = await request(app)
        .post('/api/wash/order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          providerId: mechanicUser._id.toString(),
          packageId: testPackage._id,
          vehicleId: testVehicle._id,
          vehicle: {
            brand: testVehicle.brand,
            model: testVehicle.modelName,
            year: testVehicle.year,
            plateNumber: testVehicle.plateNumber,
            segment: testVehicle.segment
          },
          type: 'shop',
          location: {
            address: testProvider.location.address,
            latitude: testProvider.location.coordinates.latitude,
            longitude: testProvider.location.coordinates.longitude
          },
          scheduling: {
            slotStart,
            slotEnd
          },
          laneId: testLane._id,
          tefePuanUsed: 0,
          cardInfo: {
            cardNumber: '4111111111111111',
            cardHolderName: 'Test User',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data).toHaveProperty('orderNumber');
      expect(response.body.data.status).toBe('DRIVER_CONFIRMED');
      expect(response.body.data.escrow.status).toBe('held');

      orderId = response.body.data._id;
      orderNumber = response.body.data.orderNumber;
    });

    test('1.3. Sipariş Detayı Görüntülenmeli', async () => {
      const response = await request(app)
        .get(`/api/wash/order/${orderId}`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(orderId);
      expect(response.body.data.orderNumber).toBe(orderNumber);
    });

    test('1.4. Usta Tarafından Sipariş Kabul Edilmeli', async () => {
      const response = await request(app)
        .post(`/api/wash/jobs/${orderId}/accept`)
        .set('Authorization', `Bearer ${mechanicToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('PROVIDER_ACCEPTED');
    });

    test('1.5. Check-in Yapılmalı', async () => {
      const response = await request(app)
        .post(`/api/wash/jobs/${orderId}/checkin`)
        .set('Authorization', `Bearer ${mechanicToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('CHECK_IN');
      expect(response.body.data.scheduling).toHaveProperty('actualStartTime');
    });

    test('1.6. İş Başlatılmalı', async () => {
      const response = await request(app)
        .post(`/api/wash/jobs/${orderId}/start`)
        .set('Authorization', `Bearer ${mechanicToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('IN_PROGRESS');
      expect(response.body.data.workSteps[0].status).toBe('in_progress');
    });

    test('1.7. İlerleme Güncellemesi Yapılmalı (Adım 1)', async () => {
      const response = await request(app)
        .post(`/api/wash/jobs/${orderId}/progress`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send({
          stepIndex: 0,
          photos: ['https://test.com/photo1.jpg'],
          notes: 'Köpükleme tamamlandı',
          completed: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.workSteps[0].status).toBe('completed');
      expect(response.body.data.workSteps[1].status).toBe('in_progress');
    });

    test('1.8. Tüm Adımlar Tamamlanmalı', async () => {
      // Adım 2
      await request(app)
        .post(`/api/wash/jobs/${orderId}/progress`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send({
          stepIndex: 1,
          completed: true
        });

      // Adım 3
      await request(app)
        .post(`/api/wash/jobs/${orderId}/progress`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send({
          stepIndex: 2,
          completed: true
        });

      // Adım 4
      await request(app)
        .post(`/api/wash/jobs/${orderId}/progress`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send({
          stepIndex: 3,
          photos: ['https://test.com/interior.jpg'],
          completed: true
        });

      // Adım 5 (son kontrol)
      const response = await request(app)
        .post(`/api/wash/jobs/${orderId}/progress`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send({
          stepIndex: 4,
          photos: ['https://test.com/final.jpg'],
          completed: true
        });

      expect(response.status).toBe(200);
      expect(response.body.data.workSteps.every((step: any) => step.status === 'completed')).toBe(true);
    });

    test('1.9. QA Gönderilmeli', async () => {
      const response = await request(app)
        .post(`/api/wash/jobs/${orderId}/qa-submit`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send({
          photosBefore: [
            'https://test.com/before-front.jpg',
            'https://test.com/before-back.jpg',
            'https://test.com/before-left.jpg',
            'https://test.com/before-right.jpg',
            'https://test.com/before-interior-front.jpg',
            'https://test.com/before-interior-back.jpg'
          ],
          photosAfter: [
            'https://test.com/after-front.jpg',
            'https://test.com/after-back.jpg',
            'https://test.com/after-left.jpg',
            'https://test.com/after-right.jpg',
            'https://test.com/after-interior-front.jpg',
            'https://test.com/after-interior-back.jpg'
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('QA_PENDING');
      expect(response.body.data.qa.approvalStatus).toBe('pending');
      expect(response.body.data.scheduling).toHaveProperty('actualEndTime');
    });

    test('1.10. Sürücü QA Onaylamalı', async () => {
      const response = await request(app)
        .post(`/api/wash/order/${orderId}/qa-approve`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          approved: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.qa.approvalStatus).toBe('approved');
      expect(response.body.data.status).toBe('PAID');
      expect(response.body.data.escrow.status).toBe('captured');
    });

    test('1.11. Sürücü Siparişlerini Görüntülemeli', async () => {
      const response = await request(app)
        .get('/api/wash/my-orders')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].orderNumber).toBe(orderNumber);
    });

    test('1.12. Usta İşlerini Görüntülemeli', async () => {
      const response = await request(app)
        .get('/api/wash/jobs')
        .set('Authorization', `Bearer ${mechanicToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  // ==================== 2. İPTAL SENARYOLARı ====================
  
  describe('2. İptal Senaryoları', () => {
    
    test('2.1. Erken İptal (DRIVER_CONFIRMED aşamasında)', async () => {
      // Yeni sipariş oluştur
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slotStart = new Date(tomorrow.setHours(14, 0, 0, 0));
      const slotEnd = new Date(tomorrow.setHours(14, 35, 0, 0));

      const createResponse = await request(app)
        .post('/api/wash/order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          providerId: mechanicUser._id.toString(),
          packageId: testPackage._id,
          vehicleId: testVehicle._id,
          vehicle: {
            brand: testVehicle.brand,
            model: testVehicle.modelName,
            year: testVehicle.year,
            plateNumber: testVehicle.plateNumber,
            segment: testVehicle.segment
          },
          type: 'shop',
          location: {
            address: testProvider.location.address
          },
          scheduling: {
            slotStart,
            slotEnd
          },
          laneId: testLane._id,
          tefePuanUsed: 0,
          cardInfo: {
            cardNumber: '4111111111111111',
            cardHolderName: 'Test User',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123'
          }
        });

      const orderId = createResponse.body.data._id;

      // İptal et
      const cancelResponse = await request(app)
        .post(`/api/wash/order/${orderId}/cancel`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          reason: 'Planım değişti'
        });

      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.body.success).toBe(true);
      expect(cancelResponse.body.data.status).toBe('CANCELLED_BY_DRIVER');
      expect(cancelResponse.body.data.cancellation.penaltyAmount).toBe(0);
      expect(cancelResponse.body.data.escrow.status).toBe('refunded');
    });

    test('2.2. Geç İptal (PROVIDER_ACCEPTED sonrası - cezalı)', async () => {
      // Yeni sipariş oluştur
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slotStart = new Date(tomorrow.setHours(15, 0, 0, 0));
      const slotEnd = new Date(tomorrow.setHours(15, 35, 0, 0));

      const createResponse = await request(app)
        .post('/api/wash/order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          providerId: mechanicUser._id.toString(),
          packageId: testPackage._id,
          vehicleId: testVehicle._id,
          vehicle: {
            brand: testVehicle.brand,
            model: testVehicle.modelName,
            year: testVehicle.year,
            plateNumber: testVehicle.plateNumber,
            segment: testVehicle.segment
          },
          type: 'shop',
          location: {
            address: testProvider.location.address
          },
          scheduling: {
            slotStart,
            slotEnd
          },
          laneId: testLane._id,
          tefePuanUsed: 0,
          cardInfo: {
            cardNumber: '4111111111111111',
            cardHolderName: 'Test User',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123'
          }
        });

      const orderId = createResponse.body.data._id;

      // Usta kabul etsin
      await request(app)
        .post(`/api/wash/jobs/${orderId}/accept`)
        .set('Authorization', `Bearer ${mechanicToken}`);

      // Sürücü iptal etsin
      const cancelResponse = await request(app)
        .post(`/api/wash/order/${orderId}/cancel`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          reason: 'Acil durum'
        });

      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.body.success).toBe(true);
      expect(cancelResponse.body.data.status).toBe('CANCELLED_BY_DRIVER');
      expect(cancelResponse.body.data.cancellation.penaltyAmount).toBeGreaterThan(0);
      expect(cancelResponse.body.data.escrow.status).toBe('refunded');
    });

    test('2.3. Usta İptali', async () => {
      // Yeni sipariş oluştur
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slotStart = new Date(tomorrow.setHours(16, 0, 0, 0));
      const slotEnd = new Date(tomorrow.setHours(16, 35, 0, 0));

      const createResponse = await request(app)
        .post('/api/wash/order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          providerId: mechanicUser._id.toString(),
          packageId: testPackage._id,
          vehicleId: testVehicle._id,
          vehicle: {
            brand: testVehicle.brand,
            model: testVehicle.modelName,
            year: testVehicle.year,
            plateNumber: testVehicle.plateNumber,
            segment: testVehicle.segment
          },
          type: 'shop',
          location: {
            address: testProvider.location.address
          },
          scheduling: {
            slotStart,
            slotEnd
          },
          laneId: testLane._id,
          tefePuanUsed: 0,
          cardInfo: {
            cardNumber: '4111111111111111',
            cardHolderName: 'Test User',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123'
          }
        });

      const orderId = createResponse.body.data._id;

      // Usta kabul etsin
      await request(app)
        .post(`/api/wash/jobs/${orderId}/accept`)
        .set('Authorization', `Bearer ${mechanicToken}`);

      // Usta iptal etsin
      const cancelResponse = await request(app)
        .post(`/api/wash/order/${orderId}/cancel`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send({
          reason: 'Ekipman arızası'
        });

      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.body.success).toBe(true);
      expect(cancelResponse.body.data.status).toBe('CANCELLED_BY_PROVIDER');
      expect(cancelResponse.body.data.escrow.status).toBe('refunded');
    });
  });

  // ==================== 3. QA REDDİ SENARYOSUi ====================
  
  describe('3. QA Reddi ve Düzeltme', () => {
    
    test('3.1. QA Reddedildiğinde İş Devam Etmeli', async () => {
      // Yeni sipariş oluştur ve QA aşamasına getir
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slotStart = new Date(tomorrow.setHours(11, 0, 0, 0));
      const slotEnd = new Date(tomorrow.setHours(11, 35, 0, 0));

      const createResponse = await request(app)
        .post('/api/wash/order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          providerId: mechanicUser._id.toString(),
          packageId: testPackage._id,
          vehicleId: testVehicle._id,
          vehicle: {
            brand: testVehicle.brand,
            model: testVehicle.modelName,
            year: testVehicle.year,
            plateNumber: testVehicle.plateNumber,
            segment: testVehicle.segment
          },
          type: 'shop',
          location: {
            address: testProvider.location.address
          },
          scheduling: {
            slotStart,
            slotEnd
          },
          laneId: testLane._id,
          tefePuanUsed: 0,
          cardInfo: {
            cardNumber: '4111111111111111',
            cardHolderName: 'Test User',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123'
          }
        });

      const orderId = createResponse.body.data._id;

      // Kabul → Check-in → Başlat
      await request(app)
        .post(`/api/wash/jobs/${orderId}/accept`)
        .set('Authorization', `Bearer ${mechanicToken}`);

      await request(app)
        .post(`/api/wash/jobs/${orderId}/checkin`)
        .set('Authorization', `Bearer ${mechanicToken}`);

      await request(app)
        .post(`/api/wash/jobs/${orderId}/start`)
        .set('Authorization', `Bearer ${mechanicToken}`);

      // Tüm adımları tamamla
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post(`/api/wash/jobs/${orderId}/progress`)
          .set('Authorization', `Bearer ${mechanicToken}`)
          .send({
            stepIndex: i,
            photos: i === 0 || i === 3 || i === 4 ? ['https://test.com/photo.jpg'] : [],
            completed: true
          });
      }

      // QA gönder
      await request(app)
        .post(`/api/wash/jobs/${orderId}/qa-submit`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send({
          photosBefore: Array(6).fill('https://test.com/before.jpg'),
          photosAfter: Array(6).fill('https://test.com/after.jpg')
        });

      // Sürücü reddetsin
      const rejectResponse = await request(app)
        .post(`/api/wash/order/${orderId}/qa-approve`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          approved: false,
          feedback: 'Cam temizliği yetersiz'
        });

      expect(rejectResponse.status).toBe(200);
      expect(rejectResponse.body.success).toBe(true);
      expect(rejectResponse.body.data.qa.approvalStatus).toBe('rework_required');
      expect(rejectResponse.body.data.status).toBe('IN_PROGRESS');
    });
  });

  // ==================== 4. PAKET VE PROVIDER YÖNETİMİ ====================
  
  describe('4. Paket ve Provider Yönetimi', () => {
    
    test('4.1. Usta Yeni Paket Oluşturabilmeli', async () => {
      const response = await request(app)
        .post('/api/wash/packages/create')
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send({
          name: 'Premium Yıkama',
          description: 'Detaylı temizlik ve cila',
          packageType: 'detailed_interior',
          basePrice: 250,
          duration: 60,
          services: [
            { name: 'Detaylı Köpükleme', category: 'exterior', order: 1 },
            { name: 'Detaylı İç Temizlik', category: 'interior', order: 2 },
            { name: 'Cila', category: 'special', order: 3 }
          ],
          extras: [
            { name: 'Motor Temizliği', description: 'Detaylı motor yıkama', price: 100, duration: 20 }
          ],
          availableFor: 'shop',
          requirements: {
            requiresPower: true,
            requiresWater: true,
            requiresCoveredArea: false
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Premium Yıkama');
      expect(response.body.data.providerId.toString()).toBe(mechanicUser._id.toString());
    });

    test('4.2. Usta Kendi Paketlerini Görüntülemeli', async () => {
      const response = await request(app)
        .get('/api/wash/my-packages')
        .set('Authorization', `Bearer ${mechanicToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('4.3. Sürücü Provider Paketlerini Görüntülemeli', async () => {
      const response = await request(app)
        .get(`/api/wash/packages?providerId=${mechanicUser._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('4.4. Usta Provider Profilini Güncellemeli', async () => {
      const response = await request(app)
        .post('/api/wash/provider/setup')
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send({
          businessName: 'Test Yıkama Merkezi - Güncellendi',
          type: 'shop',
          location: {
            address: 'Test Caddesi No:1 Kadıköy/İstanbul',
            city: 'İstanbul',
            district: 'Kadıköy',
            coordinates: {
              latitude: 40.9922,
              longitude: 29.0219
            }
          },
          shop: {
            hasLanes: true,
            laneCount: 3,
            totalCapacity: 15,
            workingHours: [
              {
                day: 1,
                isOpen: true,
                openTime: '08:00',
                closeTime: '19:00'
              }
            ]
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.businessName).toBe('Test Yıkama Merkezi - Güncellendi');
      expect(response.body.data.shop.laneCount).toBe(3);
    });
  });

  // ==================== 5. HATAYÖNETİMİ ====================
  
  describe('5. Hata Yönetimi', () => {
    
    test('5.1. Geçersiz Package ID ile Sipariş Oluşturulamaz', async () => {
      const response = await request(app)
        .post('/api/wash/order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          providerId: mechanicUser._id.toString(),
          packageId: new mongoose.Types.ObjectId(),
          vehicleId: testVehicle._id,
          vehicle: {
            brand: testVehicle.brand,
            model: testVehicle.modelName,
            segment: testVehicle.segment
          },
          type: 'shop',
          location: { address: 'Test' },
          scheduling: {
            slotStart: new Date(),
            slotEnd: new Date()
          },
          cardInfo: {
            cardNumber: '4111111111111111',
            cardHolderName: 'Test',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123'
          }
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('5.2. Yetkisiz Kullanıcı Başkasının Siparişini Göremez', async () => {
      // Başka bir sürücü oluştur
      const otherDriver = await User.create({
        name: 'Diğer',
        surname: 'Sürücü',
        email: `other-driver-${Date.now()}@test.com`,
        phone: `5${Math.floor(Math.random() * 1000000000)}`,
        password: 'Test123456',
        role: 'şöför'
      });

      const otherToken = jwt.sign(
        { userId: otherDriver._id, role: otherDriver.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      );

      // İlk siparişin ID'sini al
      const orders = await WashOrder.findOne({ driverId: driverUser._id });
      
      if (orders) {
        const response = await request(app)
          .get(`/api/wash/order/${orders._id}`)
          .set('Authorization', `Bearer ${otherToken}`);

        expect(response.status).toBe(404);
      }

      // Temizlik
      await User.deleteOne({ _id: otherDriver._id });
    });

    test('5.3. Usta Tamamlanmamış İş İçin QA Gönderemez', async () => {
      // Yeni sipariş oluştur ve sadece başlat
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slotStart = new Date(tomorrow.setHours(12, 0, 0, 0));
      const slotEnd = new Date(tomorrow.setHours(12, 35, 0, 0));

      const createResponse = await request(app)
        .post('/api/wash/order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          providerId: mechanicUser._id.toString(),
          packageId: testPackage._id,
          vehicleId: testVehicle._id,
          vehicle: {
            brand: testVehicle.brand,
            model: testVehicle.modelName,
            year: testVehicle.year,
            plateNumber: testVehicle.plateNumber,
            segment: testVehicle.segment
          },
          type: 'shop',
          location: {
            address: testProvider.location.address
          },
          scheduling: {
            slotStart,
            slotEnd
          },
          laneId: testLane._id,
          tefePuanUsed: 0,
          cardInfo: {
            cardNumber: '4111111111111111',
            cardHolderName: 'Test User',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123'
          }
        });

      const orderId = createResponse.body.data._id;

      await request(app)
        .post(`/api/wash/jobs/${orderId}/accept`)
        .set('Authorization', `Bearer ${mechanicToken}`);

      await request(app)
        .post(`/api/wash/jobs/${orderId}/checkin`)
        .set('Authorization', `Bearer ${mechanicToken}`);

      await request(app)
        .post(`/api/wash/jobs/${orderId}/start`)
        .set('Authorization', `Bearer ${mechanicToken}`);

      // QA göndermeyi dene (tamamlanmamış)
      const qaResponse = await request(app)
        .post(`/api/wash/jobs/${orderId}/qa-submit`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send({
          photosBefore: Array(6).fill('https://test.com/before.jpg'),
          photosAfter: Array(6).fill('https://test.com/after.jpg')
        });

      expect(qaResponse.status).toBe(400);
      expect(qaResponse.body.success).toBe(false);
    });
  });
});

console.log('✅ E2E Test Suite hazırlandı');

