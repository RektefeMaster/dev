/**
 * Basit E2E Test - Araç Yıkama Modülü
 * 
 * Bu test manuel olarak hazırlanmış test kullanıcıları ile çalışır.
 * Çalıştırmadan ÖNCE: npm run create:test-users
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
import dotenv from 'dotenv';

dotenv.config();

// Test app
const app = express();
app.use(cors());
app.use(express.json());

// Auth middleware bypass - TEST İÇİN
app.use((req: any, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
      // Auth middleware'in beklediği formatta
      req.user = {
        userId: decoded.userId,
        userType: decoded.userType || decoded.role,
        role: decoded.role || decoded.userType
      };
      console.log('🔐 Auth bypass - User:', req.user);
    } catch (error) {
      console.error('❌ Token error:', error);
    }
  }
  next();
});

app.use('/api/wash', washRoutes);

// Test verileri
let driverUser: any;
let mechanicUser: any;
let driverToken: string;
let mechanicToken: string;
let testVehicle: any;
let testPackage: any;
let testProvider: any;

describe('E2E: Araç Yıkama - Basit Test', () => {
  
  beforeAll(async () => {
    // MongoDB bağlan
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    // Test kullanıcılarını bul
    driverUser = await User.findOne({ email: 'testdv@gmail.com' });
    mechanicUser = await User.findOne({ email: 'testus@gmail.com' });

    if (!driverUser || !mechanicUser) {
      throw new Error(`
❌ Test kullanıcıları bulunamadı!
Driver: ${driverUser ? '✅' : '❌'}
Mechanic: ${mechanicUser ? '✅' : '❌'}

Çözüm: npm run create:test-users
      `);
    }

    // Token oluştur
    driverToken = jwt.sign(
      { 
        userId: driverUser._id.toString(), 
        role: (driverUser as any).role || 'şöför',
        userType: (driverUser as any).userType || 'şöför'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    mechanicToken = jwt.sign(
      { 
        userId: mechanicUser._id.toString(), 
        role: (mechanicUser as any).role || 'usta',
        userType: (mechanicUser as any).userType || 'usta'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    console.log('🔑 Token\'lar oluşturuldu');
    console.log('   Driver token length:', driverToken.length);
    console.log('   Mechanic token length:', mechanicToken.length);

    // Araç bul/oluştur
    testVehicle = await Vehicle.findOne({ userId: driverUser._id });
    if (!testVehicle) {
      testVehicle = await Vehicle.create({
        userId: driverUser._id,
        brand: 'Toyota',
        modelName: 'Corolla',
        package: 'Sedan',
        year: 2020,
        plateNumber: '34 TEST E2E',
        fuelType: 'Benzin',
        segment: 'B'
      });
    }

    // Provider bul/oluştur
    testProvider = await WashProvider.findOne({ userId: mechanicUser._id });
    if (!testProvider) {
      testProvider = await WashProvider.create({
        userId: mechanicUser._id,
        businessName: 'E2E Test Yıkama',
        type: 'shop',
        location: {
          address: 'Test Caddesi No:1',
          city: 'İstanbul',
          district: 'Kadıköy',
          coordinates: { latitude: 40.99, longitude: 29.02 }
        },
        shop: {
          hasLanes: true,
          laneCount: 2,
          totalCapacity: 10,
          workingHours: [
            { day: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' }
          ]
        }
      });
    }

    // Paket bul/oluştur
    testPackage = await WashPackage.findOne({ 
      providerId: mechanicUser._id,
      name: 'E2E Test Paketi'
    });
    
    if (!testPackage) {
      testPackage = await WashPackage.create({
        name: 'E2E Test Paketi',
        description: 'Test için basit paket',
        packageType: 'standard',
        basePrice: 100,
        duration: 30,
        services: [
          { name: 'Yıkama', category: 'exterior', order: 1 }
        ],
        workSteps: [
          { step: 'wash', name: 'Yıkama', order: 1, requiresPhoto: true }
        ],
        qaRequirements: {
          photosBefore: ['front'],
          photosAfter: ['front'],
          checklist: ['Temizlik']
        },
        providerId: mechanicUser._id,
        availableFor: 'shop',
        isActive: true
      });
    }

    console.log('✅ Test hazırlığı tamamlandı');
  }, 30000);

  afterAll(async () => {
    // Sadece test order'larını temizle
    if (mongoose.connection.readyState === 1) {
      await WashOrder.deleteMany({
        $or: [
          { driverId: driverUser?._id },
          { providerId: mechanicUser?._id }
        ]
      });
    }
  }, 10000);

  test('✅ Sistem Hazır Kontrolü', () => {
    expect(driverUser).toBeDefined();
    expect(mechanicUser).toBeDefined();
    expect(testVehicle).toBeDefined();
    expect(testPackage).toBeDefined();
    expect(testProvider).toBeDefined();
  });

  test('📦 Paket Listesi Alınabilmeli', async () => {
    const response = await request(app)
      .get(`/api/wash/packages?providerId=${mechanicUser._id}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('💰 Fiyat Teklifi Alınabilmeli', async () => {
    const response = await request(app)
      .post('/api/wash/quote')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        packageId: testPackage._id.toString(),
        vehicleSegment: 'B',
        type: 'shop',
        providerId: mechanicUser._id.toString()
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.pricing).toBeDefined();
    expect(response.body.data.pricing.finalPrice).toBeGreaterThan(0);
  });

  test('📝 Sipariş Oluşturulabilmeli', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const slotStart = new Date(tomorrow.setHours(10, 0, 0, 0));
    const slotEnd = new Date(tomorrow.setHours(10, 35, 0, 0));

    const response = await request(app)
      .post('/api/wash/order')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        providerId: mechanicUser._id.toString(),
        packageId: testPackage._id.toString(),
        vehicleId: testVehicle._id.toString(),
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
        scheduling: { slotStart, slotEnd },
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
    expect(response.body.data).toHaveProperty('orderNumber');
    expect(response.body.data.status).toBe('DRIVER_CONFIRMED');
  });

  test('📋 Siparişler Listelenebilmeli', async () => {
    const response = await request(app)
      .get('/api/wash/my-orders')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('🔧 Usta İşleri Görebilmeli', async () => {
    const response = await request(app)
      .get('/api/wash/jobs')
      .set('Authorization', `Bearer ${mechanicToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});

console.log('✅ Basit E2E Test Suite hazır');

