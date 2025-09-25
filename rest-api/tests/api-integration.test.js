const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/index');

// Test veritabanı bağlantısı
const MONGODB_TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/rektefe_test';

describe('🔌 Backend API Integration Tests', () => {
  let server;
  let driverToken;
  let mechanicToken;
  let testDriverId;
  let testMechanicId;
  let testAppointmentId;

  beforeAll(async () => {
    console.log('🚀 API Integration testleri başlıyor...');
    
    // Test veritabanına bağlan
    await mongoose.connect(MONGODB_TEST_URI);
    
    // Test veritabanını temizle
    await mongoose.connection.db.dropDatabase();
    
    // Test sunucusunu başlat
    server = app.listen(0);
    
    console.log('✅ Test ortamı hazırlandı');
  });

  afterAll(async () => {
    console.log('🏁 Test ortamı temizleniyor...');
    
    // Veritabanını temizle
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
    
    // Sunucuyu kapat
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    
    console.log('✅ Test ortamı temizlendi');
  });

  describe('🔐 Authentication Endpoints', () => {
    describe('POST /api/auth/register', () => {
      it('Driver kullanıcısı kaydı oluşturuyor', async () => {
        console.log('🧪 Test: Driver kaydı');
        
        const driverData = {
          name: 'Test',
          surname: 'Driver',
          email: 'testdv@gmail.com',
          password: 'test123',
          phone: '+905551234567',
          userType: 'driver'
        };
        
        const response = await request(app)
          .post('/api/auth/register')
          .send(driverData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('başarıyla');
        expect(response.body.token).toBeDefined();
        expect(response.body.user.userType).toBe('driver');
        
        // Test için token'ı sakla
        driverToken = response.body.token;
        testDriverId = response.body.user._id;
        
        console.log('✅ Driver kaydı başarılı');
      });

      it('Mechanic kullanıcısı kaydı oluşturuyor', async () => {
        console.log('🧪 Test: Mechanic kaydı');
        
        const mechanicData = {
          name: 'Test',
          surname: 'Mechanic',
          email: 'testus@gmail.com',
          password: 'test123',
          phone: '+905551234568',
          userType: 'mechanic',
          selectedServices: ['Fren Bakımı', 'Motor Onarımı']
        };
        
        const response = await request(app)
          .post('/api/auth/register')
          .send(mechanicData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.user.userType).toBe('mechanic');
        
        mechanicToken = response.body.token;
        testMechanicId = response.body.user._id;
        
        console.log('✅ Mechanic kaydı başarılı');
      });

      it('Geçersiz email formatı ile kayıt reddediyor', async () => {
        console.log('🧪 Test: Geçersiz email ile kayıt');
        
        const invalidData = {
          name: 'Test',
          surname: 'User',
          email: 'gecersiz-email',
          password: 'Test123!',
          phone: '+905551234569',
          userType: 'driver'
        };
        
        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('email');
        
        console.log('✅ Geçersiz email hatası döndü');
      });

      it('Duplicate email ile kayıt reddediyor', async () => {
        console.log('🧪 Test: Duplicate email ile kayıt');
        
        const duplicateData = {
          name: 'Another',
          surname: 'User',
          email: 'test.driver@rektefe.com', // Zaten kayıtlı
          password: 'Test123!',
          phone: '+905551234570',
          userType: 'driver'
        };
        
        const response = await request(app)
          .post('/api/auth/register')
          .send(duplicateData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('kayıtlı');
        
        console.log('✅ Duplicate email hatası döndü');
      });
    });

    describe('POST /api/auth/login', () => {
      it('Geçerli bilgilerle driver girişi yapıyor', async () => {
        console.log('🧪 Test: Driver login');
        
        const loginData = {
          email: 'testdv@gmail.com',
          password: 'test123'
        };
        
        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.user.userType).toBe('driver');
        
        console.log('✅ Driver login başarılı');
      });

      it('Geçerli bilgilerle mechanic girişi yapıyor', async () => {
        console.log('🧪 Test: Mechanic login');
        
        const loginData = {
          email: 'testus@gmail.com',
          password: 'test123'
        };
        
        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.user.userType).toBe('mechanic');
        
        console.log('✅ Mechanic login başarılı');
      });

      it('Yanlış şifre ile giriş reddediyor', async () => {
        console.log('🧪 Test: Yanlış şifre ile login');
        
        const wrongPasswordData = {
          email: 'testdv@gmail.com',
          password: 'YanlisPassword123!'
        };
        
        const response = await request(app)
          .post('/api/auth/login')
          .send(wrongPasswordData)
          .expect(401);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('hatalı');
        
        console.log('✅ Yanlış şifre hatası döndü');
      });
    });

    describe('GET /api/auth/validate', () => {
      it('Geçerli token ile validation yapıyor', async () => {
        console.log('🧪 Test: Token validation');
        
        const response = await request(app)
          .get('/api/auth/validate')
          .set('Authorization', `Bearer ${driverToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.user._id).toBe(testDriverId);
        
        console.log('✅ Token validation başarılı');
      });

      it('Geçersiz token ile validation reddediyor', async () => {
        console.log('🧪 Test: Geçersiz token validation');
        
        const response = await request(app)
          .get('/api/auth/validate')
          .set('Authorization', 'Bearer gecersiz-token')
          .expect(401);
        
        expect(response.body.success).toBe(false);
        
        console.log('✅ Geçersiz token hatası döndü');
      });
    });
  });

  describe('📅 Appointment Endpoints', () => {
    describe('POST /api/appointments', () => {
      it('Yeni randevu oluşturuyor', async () => {
        console.log('🧪 Test: Randevu oluşturma');
        
        const appointmentData = {
          mechanicId: testMechanicId,
          serviceType: 'Fren Bakımı',
          description: 'Fren balata değişimi gerekiyor',
          appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Yarın
          location: {
            address: 'Test Mahallesi, Test Sokak No:1',
            coordinates: [29.0167, 41.0053] // Istanbul
          }
        };
        
        const response = await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${driverToken}`)
          .send(appointmentData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.appointment.driverId).toBe(testDriverId);
        expect(response.body.appointment.mechanicId).toBe(testMechanicId);
        expect(response.body.appointment.serviceType).toBe('Fren Bakımı');
        
        testAppointmentId = response.body.appointment._id;
        
        console.log('✅ Randevu oluşturma başarılı');
      });

      it('Geçmiş tarih ile randevu oluşturmuyor', async () => {
        console.log('🧪 Test: Geçmiş tarih ile randevu');
        
        const pastAppointmentData = {
          mechanicId: testMechanicId,
          serviceType: 'Motor Onarımı',
          description: 'Motor kontrolü',
          appointmentDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Dün
          location: {
            address: 'Test Mahallesi',
            coordinates: [29.0167, 41.0053]
          }
        };
        
        const response = await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${driverToken}`)
          .send(pastAppointmentData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('geçmiş');
        
        console.log('✅ Geçmiş tarih hatası döndü');
      });
    });

    describe('GET /api/appointments/driver', () => {
      it('Driver randevularını listiliyor', async () => {
        console.log('🧪 Test: Driver randevuları');
        
        const response = await request(app)
          .get('/api/appointments/driver')
          .set('Authorization', `Bearer ${driverToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.appointments)).toBe(true);
        expect(response.body.appointments.length).toBeGreaterThan(0);
        
        const appointment = response.body.appointments[0];
        expect(appointment.driverId).toBe(testDriverId);
        
        console.log('✅ Driver randevuları listelendi');
      });
    });

    describe('GET /api/appointments/mechanic', () => {
      it('Mechanic randevularını listiliyor', async () => {
        console.log('🧪 Test: Mechanic randevuları');
        
        const response = await request(app)
          .get('/api/appointments/mechanic')
          .set('Authorization', `Bearer ${mechanicToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.appointments)).toBe(true);
        expect(response.body.appointments.length).toBeGreaterThan(0);
        
        const appointment = response.body.appointments[0];
        expect(appointment.mechanicId).toBe(testMechanicId);
        
        console.log('✅ Mechanic randevuları listelendi');
      });
    });

    describe('PUT /api/appointments/:id/status', () => {
      it('Randevu durumunu güncelliyor', async () => {
        console.log('🧪 Test: Randevu durum güncelleme');
        
        const statusData = {
          status: 'confirmed'
        };
        
        const response = await request(app)
          .put(`/api/appointments/${testAppointmentId}/status`)
          .set('Authorization', `Bearer ${mechanicToken}`)
          .send(statusData)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.appointment.status).toBe('confirmed');
        
        console.log('✅ Randevu durum güncelleme başarılı');
      });

      it('Yetkisiz kullanıcı randevu durumu güncelleyemiyor', async () => {
        console.log('🧪 Test: Yetkisiz randevu durum güncelleme');
        
        const statusData = {
          status: 'cancelled'
        };
        
        const response = await request(app)
          .put(`/api/appointments/${testAppointmentId}/status`)
          .set('Authorization', `Bearer ${driverToken}`) // Driver mechanic randevusunu güncelleyemez
          .send(statusData)
          .expect(403);
        
        expect(response.body.success).toBe(false);
        
        console.log('✅ Yetkisiz erişim hatası döndü');
      });
    });
  });

  describe('📱 Message Endpoints', () => {
    let conversationId;

    describe('POST /api/messages/send', () => {
      it('Yeni mesaj gönderiyor', async () => {
        console.log('🧪 Test: Mesaj gönderme');
        
        const messageData = {
          receiverId: testMechanicId,
          content: 'Merhaba, randevu hakkında bilgi almak istiyorum.',
          messageType: 'text'
        };
        
        const response = await request(app)
          .post('/api/messages/send')
          .set('Authorization', `Bearer ${driverToken}`)
          .send(messageData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.message.content).toBe(messageData.content);
        expect(response.body.message.senderId).toBe(testDriverId);
        expect(response.body.message.receiverId).toBe(testMechanicId);
        
        conversationId = response.body.message.conversationId;
        
        console.log('✅ Mesaj gönderme başarılı');
      });

      it('Boş mesaj gönderilmiyor', async () => {
        console.log('🧪 Test: Boş mesaj gönderme');
        
        const emptyMessageData = {
          receiverId: testMechanicId,
          content: '',
          messageType: 'text'
        };
        
        const response = await request(app)
          .post('/api/messages/send')
          .set('Authorization', `Bearer ${driverToken}`)
          .send(emptyMessageData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        
        console.log('✅ Boş mesaj hatası döndü');
      });
    });

    describe('GET /api/messages/conversations', () => {
      it('Kullanıcı konuşmalarını listiliyor', async () => {
        console.log('🧪 Test: Konuşma listesi');
        
        const response = await request(app)
          .get('/api/messages/conversations')
          .set('Authorization', `Bearer ${driverToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.conversations)).toBe(true);
        expect(response.body.conversations.length).toBeGreaterThan(0);
        
        const conversation = response.body.conversations[0];
        expect(conversation.participants).toContain(testDriverId);
        
        console.log('✅ Konuşma listesi başarılı');
      });
    });

    describe('GET /api/messages/:conversationId', () => {
      it('Konuşma mesajlarını getiriyor', async () => {
        console.log('🧪 Test: Konuşma mesajları');
        
        const response = await request(app)
          .get(`/api/messages/${conversationId}`)
          .set('Authorization', `Bearer ${driverToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.messages)).toBe(true);
        expect(response.body.messages.length).toBeGreaterThan(0);
        
        console.log('✅ Konuşma mesajları başarılı');
      });
    });
  });

  describe('🔔 Notification Endpoints', () => {
    describe('GET /api/notifications', () => {
      it('Kullanıcı bildirimlerini listiliyor', async () => {
        console.log('🧪 Test: Bildirim listesi');
        
        const response = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${driverToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.notifications)).toBe(true);
        
        console.log('✅ Bildirim listesi başarılı');
      });
    });

    describe('POST /api/push-notifications/send', () => {
      it('Push notification gönderiyor', async () => {
        console.log('🧪 Test: Push notification');
        
        const notificationData = {
          userId: testDriverId,
          title: 'Test Bildirimi',
          body: 'Bu bir test bildirimidir.',
          data: {
            type: 'test',
            appointmentId: testAppointmentId
          }
        };
        
        const response = await request(app)
          .post('/api/push-notifications/send')
          .set('Authorization', `Bearer ${mechanicToken}`)
          .send(notificationData)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        
        console.log('✅ Push notification başarılı');
      });
    });
  });

  describe('🚗 Vehicle Endpoints', () => {
    let testVehicleId;

    describe('POST /api/vehicles', () => {
      it('Yeni araç ekliyor', async () => {
        console.log('🧪 Test: Araç ekleme');
        
        const vehicleData = {
          plate: '34ABC123',
          brand: 'Toyota',
          model: 'Corolla',
          year: 2020,
          fuelType: 'Benzin',
          color: 'Beyaz'
        };
        
        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${driverToken}`)
          .send(vehicleData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.vehicle.plate).toBe(vehicleData.plate);
        expect(response.body.vehicle.ownerId).toBe(testDriverId);
        
        testVehicleId = response.body.vehicle._id;
        
        console.log('✅ Araç ekleme başarılı');
      });

      it('Duplicate plaka ile araç eklenmiyor', async () => {
        console.log('🧪 Test: Duplicate plaka ile araç');
        
        const duplicateVehicleData = {
          plate: '34ABC123', // Zaten kayıtlı
          brand: 'Honda',
          model: 'Civic',
          year: 2021,
          fuelType: 'Benzin'
        };
        
        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${driverToken}`)
          .send(duplicateVehicleData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('plaka');
        
        console.log('✅ Duplicate plaka hatası döndü');
      });
    });

    describe('GET /api/vehicles', () => {
      it('Kullanıcı araçlarını listiliyor', async () => {
        console.log('🧪 Test: Araç listesi');
        
        const response = await request(app)
          .get('/api/vehicles')
          .set('Authorization', `Bearer ${driverToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.vehicles)).toBe(true);
        expect(response.body.vehicles.length).toBeGreaterThan(0);
        
        const vehicle = response.body.vehicles[0];
        expect(vehicle.ownerId).toBe(testDriverId);
        
        console.log('✅ Araç listesi başarılı');
      });
    });
  });

  describe('🔧 Mechanic Endpoints', () => {
    describe('GET /api/mechanics', () => {
      it('Usta listesini getiriyor', async () => {
        console.log('🧪 Test: Usta listesi');
        
        const response = await request(app)
          .get('/api/mechanics')
          .set('Authorization', `Bearer ${driverToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.mechanics)).toBe(true);
        expect(response.body.mechanics.length).toBeGreaterThan(0);
        
        const mechanic = response.body.mechanics[0];
        expect(mechanic.userType).toBe('mechanic');
        
        console.log('✅ Usta listesi başarılı');
      });
    });

    describe('GET /api/mechanic/me', () => {
      it('Usta profil bilgilerini getiriyor', async () => {
        console.log('🧪 Test: Usta profili');
        
        const response = await request(app)
          .get('/api/mechanic/me')
          .set('Authorization', `Bearer ${mechanicToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.mechanic._id).toBe(testMechanicId);
        expect(response.body.mechanic.userType).toBe('mechanic');
        
        console.log('✅ Usta profili başarılı');
      });

      it('Driver usta profiline erişemiyor', async () => {
        console.log('🧪 Test: Driver usta profil erişimi');
        
        const response = await request(app)
          .get('/api/mechanic/me')
          .set('Authorization', `Bearer ${driverToken}`)
          .expect(403);
        
        expect(response.body.success).toBe(false);
        
        console.log('✅ Yetkisiz erişim hatası döndü');
      });
    });
  });

  describe('⚡ Performance Tests', () => {
    it('API response süreleri kabul edilebilir', async () => {
      console.log('🧪 Test: API performance');
      
      const startTime = Date.now();
      
      await request(app)
        .get('/api/appointments/driver')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(1000); // 1 saniyeden az
      
      console.log(`✅ API response time: ${responseTime}ms`);
    });

    it('Concurrent request handling', async () => {
      console.log('🧪 Test: Concurrent requests');
      
      const promises = [];
      
      // 10 eşzamanlı request gönder
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${driverToken}`)
            .expect(200)
        );
      }
      
      const responses = await Promise.all(promises);
      
      expect(responses.length).toBe(10);
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });
      
      console.log('✅ Concurrent requests başarılı');
    });
  });

  describe('🛡️ Security Tests', () => {
    it('JWT token olmadan protected endpoint erişilemiyor', async () => {
      console.log('🧪 Test: Protected endpoint security');
      
      const response = await request(app)
        .get('/api/appointments/driver')
        .expect(401);
      
      expect(response.body.success).toBe(false);
      
      console.log('✅ Protected endpoint security kontrol edildi');
    });

    it('SQL injection koruması çalışıyor', async () => {
      console.log('🧪 Test: SQL injection protection');
      
      const maliciousData = {
        email: "admin@test.com' OR '1'='1",
        password: "password"
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousData)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      
      console.log('✅ SQL injection koruması çalışıyor');
    });

    it('Rate limiting çalışıyor', async () => {
      console.log('🧪 Test: Rate limiting');
      
      // 100 hızlı request gönder
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({ email: 'test@test.com', password: 'wrong' })
        );
      }
      
      const responses = await Promise.all(promises);
      
      // Bazı requestler 429 (Too Many Requests) dönmeli
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      console.log(`✅ Rate limiting çalışıyor (${rateLimitedResponses.length} request rate limited)`);
    });
  });
});
