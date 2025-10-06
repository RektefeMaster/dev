/**
 * REKTEFE PROJESİ - COMPREHENSIVE TEST SUITE
 * 
 * Bu dosya, backend API'leri için kapsamlı test suite'ini içerir.
 * Unit, integration ve performance testleri ile.
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import { app } from '../src/index';
import { User } from '../src/models/User';
import { Mechanic } from '../src/models/Mechanic';
import { Appointment } from '../src/models/Appointment';
import { Vehicle } from '../src/models/Vehicle';
import { Notification } from '../src/models/Notification';
import { JWTService, OptimizedAuthService } from '../src/services/optimizedAuth.service';
import { DatabaseOptimizationService, QueryOptimizationService, PerformanceMonitoringService } from '../src/services/databaseOptimization.service';
import { AppointmentStatus, ServiceType, UserType, ErrorCode } from '../../shared/types';

// ===== TEST CONFIGURATION =====

const TEST_CONFIG = {
  JWT_SECRET: 'test-jwt-secret-key',
  JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-key',
  TIMEOUT: 30000,
  PERFORMANCE_THRESHOLD: 1000 // 1 saniye
};

// ===== TEST DATA FACTORIES =====

class TestDataFactory {
  static createUser(overrides: any = {}) {
    return {
      name: 'Test',
      surname: 'User',
      email: `test${Date.now()}@example.com`,
      password: 'TestPassword123!',
      userType: UserType.DRIVER,
      phone: '+905551234567',
      isActive: true,
      ...overrides
    };
  }

  static createMechanic(overrides: any = {}) {
    return {
      name: 'Test',
      surname: 'Mechanic',
      email: `mechanic${Date.now()}@example.com`,
      password: 'TestPassword123!',
      userType: UserType.MECHANIC,
      phone: '+905551234567',
      experience: 5,
      specialties: ['Engine Repair', 'Brake Service'],
      serviceCategories: [ServiceType.ENGINE_REPAIR, ServiceType.BRAKE_SERVICE],
      location: {
        coordinates: [39.9334, 32.8597], // Ankara
        address: 'Test Address',
        city: 'Ankara',
        district: 'Çankaya',
        neighborhood: 'Kızılay'
      },
      rating: 4.5,
      totalRatings: 10,
      availability: true,
      isActive: true,
      ...overrides
    };
  }

  static createVehicle(overrides: any = {}) {
    return {
      brand: 'Toyota',
      model: 'Corolla',
      year: 2020,
      plateNumber: `34ABC${Date.now()}`,
      color: 'White',
      fuelType: 'gasoline',
      mileage: 50000,
      engineCapacity: 1600,
      transmission: 'automatic',
      isActive: true,
      ...overrides
    };
  }

  static createAppointment(overrides: any = {}) {
    return {
      serviceType: ServiceType.OIL_CHANGE,
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      timeSlot: '10:00',
      status: AppointmentStatus.REQUESTED,
      description: 'Test appointment',
      estimatedDuration: 60,
      price: 500,
      paymentStatus: 'pending',
      ...overrides
    };
  }
}

// ===== TEST UTILITIES =====

class TestUtils {
  static async generateAuthToken(userId: string, userType: UserType): Promise<string> {
    return JWTService.generateAccessToken({ userId, userType });
  }

  static async generateRefreshToken(userId: string, userType: UserType): Promise<string> {
    return JWTService.generateRefreshToken({ 
      userId, 
      userType, 
      tokenVersion: 1 
    });
  }

  static async createAuthenticatedUser(userType: UserType = UserType.DRIVER) {
    const userData = userType === UserType.DRIVER 
      ? TestDataFactory.createUser() 
      : TestDataFactory.createMechanic();
    
    const user = new User(userData);
    await user.save();

    if (userType === UserType.MECHANIC) {
      const mechanic = new Mechanic({
        _id: user._id,
        ...userData
      });
      await mechanic.save();
    }

    const token = await this.generateAuthToken(user._id.toString(), userType);
    const refreshToken = await this.generateRefreshToken(user._id.toString(), userType);
    
    return { user, token, refreshToken };
  }

  static async cleanupDatabase() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }

  static async measurePerformance<T>(
    operation: () => Promise<T>,
    threshold: number = TEST_CONFIG.PERFORMANCE_THRESHOLD
  ): Promise<{ result: T; executionTime: number; isSlow: boolean }> {
    const startTime = Date.now();
    const result = await operation();
    const executionTime = Date.now() - startTime;
    
    return {
      result,
      executionTime,
      isSlow: executionTime > threshold
    };
  }
}

// ===== AUTHENTICATION TESTS =====

describe('Authentication Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await TestUtils.cleanupDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new driver successfully', async () => {
      const userData = TestDataFactory.createUser();

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.userType).toBe(UserType.DRIVER);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should register a new mechanic successfully', async () => {
      const mechanicData = TestDataFactory.createMechanic();

      const response = await request(app)
        .post('/api/auth/register')
        .send(mechanicData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(mechanicData.email);
      expect(response.body.data.user.userType).toBe(UserType.MECHANIC);
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject duplicate email registration', async () => {
      const userData = TestDataFactory.createUser();
      
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.ALREADY_EXISTS);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const userData = TestDataFactory.createUser();
      await OptimizedAuthService.register(userData);
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: TestDataFactory.createUser().email,
        password: 'TestPassword123!',
        userType: UserType.DRIVER
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe(loginData.email);
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: TestDataFactory.createUser().email,
        password: 'WrongPassword',
        userType: UserType.DRIVER
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
    });

    it('should reject wrong user type', async () => {
      const loginData = {
        email: TestDataFactory.createUser().email,
        password: 'TestPassword123!',
        userType: UserType.MECHANIC
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.OPERATION_NOT_ALLOWED);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const { token, refreshToken } = await TestUtils.createAuthenticatedUser();

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.INVALID_TOKEN);
    });
  });
});

// ===== APPOINTMENT TESTS =====

describe('Appointment Tests', () => {
  let mongoServer: MongoMemoryServer;
  let driverToken: string;
  let mechanicToken: string;
  let driverId: string;
  let mechanicId: string;
  let vehicleId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await TestUtils.cleanupDatabase();

    // Create test users
    const driver = await TestUtils.createAuthenticatedUser(UserType.DRIVER);
    const mechanic = await TestUtils.createAuthenticatedUser(UserType.MECHANIC);
    
    driverToken = driver.token;
    driverId = driver.user._id.toString();
    mechanicToken = mechanic.token;
    mechanicId = mechanic.user._id.toString();

    // Create test vehicle
    const vehicle = new Vehicle({
      ...TestDataFactory.createVehicle(),
      userId: driverId
    });
    await vehicle.save();
    vehicleId = vehicle._id.toString();
  });

  describe('POST /api/appointments', () => {
    it('should create appointment successfully', async () => {
      const appointmentData = {
        ...TestDataFactory.createAppointment(),
        mechanicId,
        vehicleId
      };

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(appointmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.appointment.status).toBe(AppointmentStatus.REQUESTED);
      expect(response.body.data.appointment.mechanicId).toBe(mechanicId);
      expect(response.body.data.appointment.userId).toBe(driverId);
    });

    it('should reject unauthorized appointment creation', async () => {
      const appointmentData = TestDataFactory.createAppointment();

      const response = await request(app)
        .post('/api/appointments')
        .send(appointmentData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('should validate appointment data', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    });
  });

  describe('GET /api/appointments', () => {
    beforeEach(async () => {
      // Create test appointments
      const appointments = [
        new Appointment({
          ...TestDataFactory.createAppointment(),
          userId: driverId,
          mechanicId,
          vehicleId
        }),
        new Appointment({
          ...TestDataFactory.createAppointment(),
          userId: driverId,
          mechanicId,
          vehicleId,
          status: AppointmentStatus.COMPLETED
        })
      ];
      await Appointment.insertMany(appointments);
    });

    it('should get driver appointments', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.appointments).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter appointments by status', async () => {
      const response = await request(app)
        .get('/api/appointments?status=TAMAMLANDI')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.appointments).toHaveLength(1);
      expect(response.body.data.appointments[0].status).toBe(AppointmentStatus.COMPLETED);
    });

    it('should paginate appointments', async () => {
      const response = await request(app)
        .get('/api/appointments?page=1&limit=1')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.appointments).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });
  });

  describe('PUT /api/appointments/:id', () => {
    let appointmentId: string;

    beforeEach(async () => {
      const appointment = new Appointment({
        ...TestDataFactory.createAppointment(),
        userId: driverId,
        mechanicId,
        vehicleId
      });
      await appointment.save();
      appointmentId = appointment._id.toString();
    });

    it('should update appointment as mechanic', async () => {
      const updateData = {
        status: AppointmentStatus.SCHEDULED,
        price: 600,
        estimatedDuration: 90
      };

      const response = await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.appointment.status).toBe(AppointmentStatus.SCHEDULED);
      expect(response.body.data.appointment.price).toBe(600);
    });

    it('should reject unauthorized update', async () => {
      const updateData = { status: AppointmentStatus.SCHEDULED };

      const response = await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.FORBIDDEN);
    });
  });
});

// ===== PERFORMANCE TESTS =====

describe('Performance Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    // Create optimized indexes
    await DatabaseOptimizationService.createOptimizedIndexes();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await TestUtils.cleanupDatabase();
  });

  describe('Database Performance', () => {
    it('should create indexes efficiently', async () => {
      const { executionTime } = await TestUtils.measurePerformance(async () => {
        await DatabaseOptimizationService.createOptimizedIndexes();
      });

      expect(executionTime).toBeLessThan(5000); // 5 saniye
    });

    it('should query appointments efficiently', async () => {
      // Create test data
      const driver = await TestUtils.createAuthenticatedUser(UserType.DRIVER);
      const mechanic = await TestUtils.createAuthenticatedUser(UserType.MECHANIC);
      
      const appointments = Array.from({ length: 100 }, (_, i) => ({
        ...TestDataFactory.createAppointment(),
        userId: driver.user._id,
        mechanicId: mechanic.user._id,
        appointmentDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000)
      }));
      
      await Appointment.insertMany(appointments);

      const { executionTime } = await TestUtils.measurePerformance(async () => {
        await QueryOptimizationService.getOptimizedAppointments(
          driver.user._id.toString(),
          'driver',
          { limit: 20 }
        );
      });

      expect(executionTime).toBeLessThan(1000); // 1 saniye
    });

    it('should query nearby mechanics efficiently', async () => {
      // Create test mechanics
      const mechanics = Array.from({ length: 50 }, (_, i) => ({
        ...TestDataFactory.createMechanic(),
        location: {
          coordinates: [39.9334 + (i * 0.001), 32.8597 + (i * 0.001)],
          address: `Test Address ${i}`,
          city: 'Ankara',
          district: 'Çankaya',
          neighborhood: 'Kızılay'
        }
      }));

      await Mechanic.insertMany(mechanics);

      const { executionTime } = await TestUtils.measurePerformance(async () => {
        await QueryOptimizationService.getNearbyMechanics(
          { latitude: 39.9334, longitude: 32.8597 },
          { maxDistance: 10, limit: 20 }
        );
      });

      expect(executionTime).toBeLessThan(1000); // 1 saniye
    });
  });

  describe('API Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      const { user, token } = await TestUtils.createAuthenticatedUser();

      const concurrentRequests = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/appointments')
          .set('Authorization', `Bearer ${token}`)
      );

      const { executionTime } = await TestUtils.measurePerformance(async () => {
        await Promise.all(concurrentRequests);
      });

      expect(executionTime).toBeLessThan(2000); // 2 saniye
    });

    it('should handle large payloads efficiently', async () => {
      const { token } = await TestUtils.createAuthenticatedUser();

      const largeData = {
        name: 'Test'.repeat(100),
        description: 'Test description'.repeat(1000)
      };

      const { executionTime } = await TestUtils.measurePerformance(async () => {
        await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${token}`)
          .send(largeData);
      });

      expect(executionTime).toBeLessThan(3000); // 3 saniye
    });
  });
});

// ===== INTEGRATION TESTS =====

describe('Integration Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await TestUtils.cleanupDatabase();
  });

  describe('Complete Appointment Flow', () => {
    it('should handle complete appointment workflow', async () => {
      // 1. Register users
      const driver = await TestUtils.createAuthenticatedUser(UserType.DRIVER);
      const mechanic = await TestUtils.createAuthenticatedUser(UserType.MECHANIC);

      // 2. Create vehicle
      const vehicle = new Vehicle({
        ...TestDataFactory.createVehicle(),
        userId: driver.user._id
      });
      await vehicle.save();

      // 3. Create appointment
      const appointmentData = {
        ...TestDataFactory.createAppointment(),
        mechanicId: mechanic.user._id,
        vehicleId: vehicle._id
      };

      const createResponse = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${driver.token}`)
        .send(appointmentData)
        .expect(201);

      const appointmentId = createResponse.body.data.appointment._id;

      // 4. Mechanic accepts appointment
      await request(app)
        .patch(`/api/appointments/${appointmentId}/accept`)
        .set('Authorization', `Bearer ${mechanic.token}`)
        .expect(200);

      // 5. Mechanic updates appointment
      await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${mechanic.token}`)
        .send({
          status: AppointmentStatus.IN_SERVICE,
          price: 500
        })
        .expect(200);

      // 6. Mechanic completes appointment
      await request(app)
        .patch(`/api/appointments/${appointmentId}/complete`)
        .set('Authorization', `Bearer ${mechanic.token}`)
        .send({
          completionNotes: 'Service completed successfully'
        })
        .expect(200);

      // 7. Verify final state
      const finalResponse = await request(app)
        .get(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${driver.token}`)
        .expect(200);

      expect(finalResponse.body.data.appointment.status).toBe(AppointmentStatus.COMPLETED);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database connection errors gracefully', async () => {
      // Simulate database disconnection
      await mongoose.disconnect();

      const response = await request(app)
        .get('/api/appointments')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);

      // Reconnect for cleanup
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    });
  });
});

// ===== SECURITY TESTS =====

describe('Security Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await TestUtils.cleanupDatabase();
  });

  describe('JWT Security', () => {
    it('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        { userId: 'test', userType: UserType.DRIVER },
        TEST_CONFIG.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.INVALID_TOKEN);
    });

    it('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.INVALID_TOKEN);
    });

    it('should reject tokens without Bearer prefix', async () => {
      const token = await TestUtils.generateAuthToken('test', UserType.DRIVER);

      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', token)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });
  });

  describe('Input Validation', () => {
    it('should prevent SQL injection attempts', async () => {
      const maliciousInput = "'; DROP TABLE users; --";

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: maliciousInput,
          password: 'test',
          userType: UserType.DRIVER
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should prevent XSS attacks', async () => {
      const xssPayload = '<script>alert("xss")</script>';

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: xssPayload,
          surname: 'Test',
          email: 'test@example.com',
          password: 'TestPassword123!',
          userType: UserType.DRIVER
        })
        .expect(201);

      // XSS payload should be sanitized
      expect(response.body.data.user.name).not.toContain('<script>');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting', async () => {
      const requests = Array.from({ length: 100 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrong',
            userType: UserType.DRIVER
          })
      );

      const responses = await Promise.allSettled(requests);
      const rateLimitedResponses = responses.filter(
        (response) => response.status === 'fulfilled' && 
        (response as any).value.status === 429
      );

      // Some requests should be rate limited
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});

// ===== EXPORT FOR EXTERNAL USE =====
export {
  TestDataFactory,
  TestUtils,
  TEST_CONFIG
};
