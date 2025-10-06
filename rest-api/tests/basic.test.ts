/**
 * REKTEFE PROJESİ - BASIC TESTS
 * 
 * Bu dosya, temel API endpoint'leri için testleri içerir.
 */

import request from 'supertest';
import { app } from '../src/index';
import { User } from '../src/models/User';
import { AppointmentStatus, ServiceType, UserType } from '../../shared/types';

// UserType enum'larını doğrudan tanımla
const USER_TYPES = {
  DRIVER: 'driver',
  MECHANIC: 'mechanic'
} as const;

describe('Basic API Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Metrics Endpoint', () => {
    it('should return system metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      // Metrics endpoint Prometheus format'ında dönüyor, JSON değil
      expect(response.text).toContain('process_cpu_user_seconds_total');
      expect(response.text).toContain('process_resident_memory_bytes');
      expect(response.text).toContain('rektefe-rest-api');
    });
  });

  describe('API Documentation', () => {
    it('should serve Swagger documentation', async () => {
      const response = await request(app)
        .get('/docs')
        .expect(301); // Expect 301 redirect to /docs/

      // Redirect response'u kontrol et
      expect(response.headers.location).toBe('/docs/');
    });
  });

  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .expect(401);

      expect(response.body.message).toBe('Yetkilendirme token\'ı bulunamadı');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toBe('Geçersiz veya süresi dolmuş token');
    });
  });

  describe('User Registration', () => {
    it('should register a new user', async () => {
      const userData = {
        name: 'Test',
        surname: 'User',
        email: `test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        userType: USER_TYPES.DRIVER,
        phone: '+905551234567'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      const userData = {
        name: 'Test',
        surname: 'User',
        email: 'duplicate@example.com',
        password: 'TestPassword123!',
        userType: USER_TYPES.DRIVER,
        phone: '+905551234567'
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400); // Duplicate email returns 400, not 409

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Bu e-posta zaten kayıtlı.');
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      const userData = {
        name: 'Test',
        surname: 'User',
        email: 'login@example.com',
        password: 'TestPassword123!',
        userType: USER_TYPES.DRIVER,
        phone: '+905551234567'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'TestPassword123!',
        userType: USER_TYPES.DRIVER
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(loginData.email);
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'WrongPassword',
        userType: USER_TYPES.DRIVER
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Geçersiz şifre.');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation Error');
    });
  });
});
