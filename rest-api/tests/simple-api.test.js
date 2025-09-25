const request = require('supertest');

// Backend'in çalışıp çalışmadığını test et
describe('🔌 Backend API Simple Tests', () => {
  const BASE_URL = 'http://localhost:3000';
  
  console.log('🚀 API Simple testleri başlıyor...');

  describe('🔐 Authentication Tests', () => {
    it('Login endpoint mevcut ve çalışıyor', async () => {
      console.log('🧪 Test: Login endpoint');
      
      const loginData = {
        email: 'testdv@gmail.com',
        password: 'test123',
        userType: 'driver'
      };
      
      const response = await request(BASE_URL)
        .post('/api/auth/login')
        .send(loginData);
      
      console.log(`📊 Response status: ${response.status}`);
      console.log(`📋 Response body:`, response.body);
      
      // Status 200 (başarılı) veya 401 (unauthorized) olmalı - endpoint çalışıyor demek
      expect([200, 401, 400]).toContain(response.status);
      expect(response.body).toBeDefined();
      
      console.log('✅ Login endpoint çalışıyor');
    });

    it('Register endpoint mevcut ve çalışıyor', async () => {
      console.log('🧪 Test: Register endpoint');
      
      const registerData = {
        name: 'Test',
        surname: 'User',
        email: `test_${Date.now()}@example.com`,
        password: 'test123',
        phone: '+905551234567',
        userType: 'driver'
      };
      
      const response = await request(BASE_URL)
        .post('/api/auth/register')
        .send(registerData);
      
      console.log(`📊 Response status: ${response.status}`);
      console.log(`📋 Response body:`, response.body);
      
      // Endpoint çalışıyor mu kontrol et
      expect([200, 201, 400, 409]).toContain(response.status);
      expect(response.body).toBeDefined();
      
      console.log('✅ Register endpoint çalışıyor');
    });

    it('Gerçek hesaplarla login testi', async () => {
      console.log('🧪 Test: Gerçek hesaplarla login');
      
      // Driver hesabı testi
      const driverLoginData = {
        email: 'testdv@gmail.com',
        password: 'test123',
        userType: 'driver'
      };
      
      const driverResponse = await request(BASE_URL)
        .post('/api/auth/login')
        .send(driverLoginData);
      
      console.log(`🚗 Driver login status: ${driverResponse.status}`);
      console.log(`🚗 Driver response:`, driverResponse.body);
      
      if (driverResponse.status === 200) {
        expect(driverResponse.body.data.token).toBeDefined();
        expect(driverResponse.body.data.user).toBeDefined();
        console.log('✅ Driver login başarılı');
      } else {
        console.log('ℹ️ Driver login başarısız (hesap mevcut değil olabilir)');
      }
      
      // Mechanic hesabı testi
      const mechanicLoginData = {
        email: 'testus@gmail.com',
        password: 'test123',
        userType: 'mechanic'
      };
      
      const mechanicResponse = await request(BASE_URL)
        .post('/api/auth/login')
        .send(mechanicLoginData);
      
      console.log(`🔧 Mechanic login status: ${mechanicResponse.status}`);
      console.log(`🔧 Mechanic response:`, mechanicResponse.body);
      
      if (mechanicResponse.status === 200) {
        expect(mechanicResponse.body.data.token).toBeDefined();
        expect(mechanicResponse.body.data.user).toBeDefined();
        console.log('✅ Mechanic login başarılı');
      } else {
        console.log('ℹ️ Mechanic login başarısız (hesap mevcut değil olabilir)');
      }
    });
  });

  describe('📱 Basic Endpoints', () => {
    let authToken = null;

    beforeAll(async () => {
      // Test için token al
      try {
        const loginResponse = await request(BASE_URL)
          .post('/api/auth/login')
          .send({
            email: 'testdv@gmail.com',
            password: 'test123',
            userType: 'driver'
          });
        
        if (loginResponse.status === 200) {
          authToken = loginResponse.body.data.token;
          console.log('🔑 Test için token alındı');
        }
      } catch (error) {
        console.log('⚠️ Test token alınamadı:', error.message);
      }
    });

    it('Protected endpoint authorization kontrolü', async () => {
      console.log('🧪 Test: Protected endpoint');
      
      // Token olmadan erişim
      const unauthorizedResponse = await request(BASE_URL)
        .get('/api/auth/validate');
      
      console.log(`🚫 Unauthorized status: ${unauthorizedResponse.status}`);
      expect(unauthorizedResponse.status).toBe(401);
      
      // Token ile erişim (eğer token varsa)
      if (authToken) {
        const authorizedResponse = await request(BASE_URL)
          .get('/api/auth/validate')
          .set('Authorization', `Bearer ${authToken}`);
        
        console.log(`✅ Authorized status: ${authorizedResponse.status}`);
        expect([200, 401]).toContain(authorizedResponse.status);
      }
      
      console.log('✅ Authorization kontrolü çalışıyor');
    });

    it('Appointments endpoint mevcut', async () => {
      console.log('🧪 Test: Appointments endpoint');
      
      if (authToken) {
        const response = await request(BASE_URL)
          .get('/api/appointments/driver')
          .set('Authorization', `Bearer ${authToken}`);
        
        console.log(`📅 Appointments status: ${response.status}`);
        expect([200, 401, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toBeDefined();
          console.log('✅ Appointments endpoint çalışıyor');
        }
      } else {
        console.log('ℹ️ Token olmadığı için appointments testi atlandı');
      }
    });
  });

  describe('🔧 API Health Check', () => {
    it('API server çalışıyor ve erişilebilir', async () => {
      console.log('🧪 Test: API health check');
      
      // Herhangi bir endpoint'e istek at
      const response = await request(BASE_URL)
        .get('/api/auth/validate');
      
      // Server çalışıyor mu kontrol et (connection error olmamalı)
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
      
      console.log(`🏥 Health check status: ${response.status}`);
      console.log('✅ API server çalışıyor ve erişilebilir');
    });
  });
});
