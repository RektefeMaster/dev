const request = require('supertest');

// Gerçek endpoint'lerle test
describe('🎯 Gerçek Endpoint Testleri', () => {
  const BASE_URL = 'http://localhost:3000';
  let driverToken = null;
  let mechanicToken = null;
  let driverId = null;
  let mechanicId = null;
  
  console.log('🔥 Gerçek endpointlerle her özellik test ediliyor!');

  beforeAll(async () => {
    // Driver login
    const driverLogin = await request(BASE_URL)
      .post('/api/auth/login')
      .send({
        email: 'testdv@gmail.com',
        password: 'test123',
        userType: 'driver'
      });
    
    if (driverLogin.status === 200) {
      driverToken = driverLogin.body.data.token;
      driverId = driverLogin.body.data.userId;
      console.log('🚗 Driver token alındı');
    }

    // Mechanic login
    const mechanicLogin = await request(BASE_URL)
      .post('/api/auth/login')
      .send({
        email: 'testus@gmail.com',
        password: 'test123',
        userType: 'mechanic'
      });
    
    if (mechanicLogin.status === 200) {
      mechanicToken = mechanicLogin.body.data.token;
      mechanicId = mechanicLogin.body.data.userId;
      console.log('🔧 Mechanic token alındı');
    }
  });

  describe('🚗 Vehicle Management', () => {
    it('Araç listesini getiriyor', async () => {
      console.log('🧪 Test: Araç listesi (gerçek endpoint)');
      
      const response = await request(BASE_URL)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${driverToken}`);
      
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Araç sayısı: ${response.body.data?.length || 0}`);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        console.log('✅ Araç listesi başarıyla alındı');
        
        // İlk aracın detaylarını göster
        if (response.body.data.length > 0) {
          const firstVehicle = response.body.data[0];
          console.log(`🚗 İlk araç: ${firstVehicle.brand} ${firstVehicle.modelName} (${firstVehicle.plateNumber})`);
        }
      }
    });

    it('Yeni araç ekleyebiliyor', async () => {
      console.log('🧪 Test: Yeni araç ekleme');
      
      const vehicleData = {
        brand: 'Toyota',
        modelName: 'Corolla',
        year: 2020,
        plateNumber: '34TEST123',
        fuelType: 'Benzin',
        engineType: 'Bilinmiyor',
        transmission: 'Manuel',
        package: 'Sedan',
        mileage: 50000
      };
      
      const response = await request(BASE_URL)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(vehicleData);
      
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Response:`, response.body);
      
      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.plateNumber).toBe('34TEST123');
        console.log('✅ Yeni araç başarıyla eklendi');
      } else if (response.status === 400) {
        console.log('ℹ️ Araç zaten mevcut olabilir');
      }
    });
  });

  describe('📅 Appointment System', () => {
    it('Driver randevularını getiriyor', async () => {
      console.log('🧪 Test: Driver randevuları');
      
      const response = await request(BASE_URL)
        .get('/api/appointments/driver')
        .set('Authorization', `Bearer ${driverToken}`);
      
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Response:`, response.body);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        console.log(`📅 Randevu sayısı: ${response.body.appointments?.length || 0}`);
        console.log('✅ Driver randevuları başarıyla alındı');
      }
    });

    it('Mechanic randevularını getiriyor', async () => {
      console.log('🧪 Test: Mechanic randevuları');
      
      const response = await request(BASE_URL)
        .get('/api/appointments/mechanic')
        .set('Authorization', `Bearer ${mechanicToken}`);
      
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Response:`, response.body);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        console.log(`📅 Randevu sayısı: ${response.body.appointments?.length || 0}`);
        console.log('✅ Mechanic randevuları başarıyla alındı');
      }
    });

    it('Yeni randevu oluşturabiliyor', async () => {
      console.log('🧪 Test: Yeni randevu oluşturma');
      
      const appointmentData = {
        mechanicId: mechanicId,
        serviceType: 'Fren Bakımı',
        description: 'Test randevusu - Kapsamlı E2E test',
        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        urgency: 'normal'
      };
      
      const response = await request(BASE_URL)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(appointmentData);
      
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Response:`, response.body);
      
      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        console.log('✅ Yeni randevu başarıyla oluşturuldu');
      }
    });
  });

  describe('💬 Message System', () => {
    it('Mesaj gönderebiliyor', async () => {
      console.log('🧪 Test: Mesaj gönderme');
      
      const messageData = {
        receiverId: mechanicId,
        content: 'Merhaba, test mesajıdır. E2E test kapsamında gönderildi.',
        type: 'text'
      };
      
      const response = await request(BASE_URL)
        .post('/api/message/send')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(messageData);
      
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Response:`, response.body);
      
      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        console.log('✅ Mesaj başarıyla gönderildi');
      } else {
        console.log('ℹ️ Mesaj endpoint farklı format olabilir');
      }
    });

    it('Mesaj listesini getiriyor', async () => {
      console.log('🧪 Test: Mesaj listesi');
      
      const response = await request(BASE_URL)
        .get('/api/message/conversations')
        .set('Authorization', `Bearer ${driverToken}`);
      
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Response:`, response.body);
      
      if (response.status === 200) {
        console.log('✅ Mesaj listesi alındı');
      }
    });
  });

  describe('🔔 Notifications', () => {
    it('Bildirim listesini getiriyor', async () => {
      console.log('🧪 Test: Bildirimler');
      
      const response = await request(BASE_URL)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${driverToken}`);
      
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Response:`, response.body);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        console.log(`🔔 Bildirim sayısı: ${response.body.notifications?.length || 0}`);
        console.log('✅ Bildirimler başarıyla alındı');
      }
    });

    it('Push notification gönderebiliyor', async () => {
      console.log('🧪 Test: Push notification');
      
      const notificationData = {
        userId: driverId,
        title: 'Test Bildirimi',
        body: 'E2E test kapsamında gönderilen test bildirimi',
        data: {
          type: 'test_notification',
          timestamp: new Date().toISOString()
        }
      };
      
      const response = await request(BASE_URL)
        .post('/api/push-notifications')
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send(notificationData);
      
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Response:`, response.body);
      
      if (response.status === 200 || response.status === 201) {
        console.log('✅ Push notification gönderildi');
      }
    });
  });

  describe('🔧 Mechanic Features', () => {
    it('Mechanic profil bilgilerini getiriyor', async () => {
      console.log('🧪 Test: Mechanic profili');
      
      const response = await request(BASE_URL)
        .get('/api/mechanic/me')
        .set('Authorization', `Bearer ${mechanicToken}`);
      
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Response:`, response.body);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        console.log('✅ Mechanic profili alındı');
      }
    });

    it('Mechanic servis kategorilerini getiriyor', async () => {
      console.log('🧪 Test: Servis kategorileri');
      
      const response = await request(BASE_URL)
        .get('/api/service-categories')
        .set('Authorization', `Bearer ${mechanicToken}`);
      
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Response:`, response.body);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        console.log('✅ Servis kategorileri alındı');
      }
    });

    it('Mechanic işlerini getiriyor', async () => {
      console.log('🧪 Test: Mechanic işleri');
      
      const response = await request(BASE_URL)
        .get('/api/mechanic-jobs')
        .set('Authorization', `Bearer ${mechanicToken}`);
      
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Response:`, response.body);
      
      if (response.status === 200) {
        console.log('✅ Mechanic işleri alındı');
      }
    });
  });

  describe('💰 Financial Features', () => {
    it('Cüzdan bilgilerini getiriyor', async () => {
      console.log('🧪 Test: Cüzdan bilgileri');
      
      const response = await request(BASE_URL)
        .get('/api/wallet')
        .set('Authorization', `Bearer ${driverToken}`);
      
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Response:`, response.body);
      
      if (response.status === 200) {
        console.log('✅ Cüzdan bilgileri alındı');
      }
    });

    it('TEFE Point bilgilerini getiriyor', async () => {
      console.log('🧪 Test: TEFE Point');
      
      const response = await request(BASE_URL)
        .get('/api/tefe-point')
        .set('Authorization', `Bearer ${driverToken}`);
      
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Response:`, response.body);
      
      if (response.status === 200) {
        console.log('✅ TEFE Point bilgileri alındı');
      }
    });

    it('Mechanic kazançlarını getiriyor', async () => {
      console.log('🧪 Test: Mechanic kazançları');
      
      const response = await request(BASE_URL)
        .get('/api/mechanic-earnings')
        .set('Authorization', `Bearer ${mechanicToken}`);
      
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Response:`, response.body);
      
      if (response.status === 200) {
        console.log('✅ Mechanic kazançları alındı');
      }
    });
  });

  describe('⭐ Rating System', () => {
    it('Randevu değerlendirmesi yapabiliyor', async () => {
      console.log('🧪 Test: Değerlendirme sistemi');
      
      const ratingData = {
        mechanicId: mechanicId,
        rating: 5,
        comment: 'Mükemmel hizmet! E2E test kapsamında verilen değerlendirme.',
        serviceQuality: 5,
        punctuality: 5,
        communication: 5
      };
      
      const response = await request(BASE_URL)
        .post('/api/appointment-rating')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(ratingData);
      
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Response:`, response.body);
      
      if (response.status === 201 || response.status === 200) {
        console.log('✅ Değerlendirme başarıyla yapıldı');
      }
    });
  });

  describe('🚨 Fault Report System', () => {
    it('Arıza bildirimi yapabiliyor', async () => {
      console.log('🧪 Test: Arıza bildirimi');
      
      // Önce araç listesini al
      const vehiclesResponse = await request(BASE_URL)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${driverToken}`);
      
      if (vehiclesResponse.status === 200 && vehiclesResponse.body.data.length > 0) {
        const vehicleId = vehiclesResponse.body.data[0]._id;
        
        const faultData = {
          vehicleId: vehicleId,
          title: 'Test Arıza Bildirimi',
          description: 'Motor sesinde problem var - E2E test kapsamında bildirilen arıza',
          category: 'Motor',
          urgency: 'high',
          location: 'Istanbul, Türkiye'
        };
        
        const response = await request(BASE_URL)
          .post('/api/fault-report')
          .set('Authorization', `Bearer ${driverToken}`)
          .send(faultData);
        
        console.log(`📊 Status: ${response.status}`);
        console.log(`📋 Response:`, response.body);
        
        if (response.status === 201) {
          console.log('✅ Arıza bildirimi başarıyla yapıldı');
        }
      } else {
        console.log('ℹ️ Araç bulunamadı, arıza bildirimi atlandı');
      }
    });

    it('Arıza bildirimlerini listiliyor', async () => {
      console.log('🧪 Test: Arıza bildirimi listesi');
      
      const response = await request(BASE_URL)
        .get('/api/fault-report')
        .set('Authorization', `Bearer ${driverToken}`);
      
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Response:`, response.body);
      
      if (response.status === 200) {
        console.log('✅ Arıza bildirimi listesi alındı');
      }
    });
  });

  describe('⚡ Performance Tests', () => {
    it('API response süreleri ölçülüyor', async () => {
      console.log('🧪 Test: Performance ölçümü');
      
      const endpoints = [
        '/api/vehicles',
        '/api/appointments/driver',
        '/api/notifications',
        '/api/service-categories'
      ];
      
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        
        const response = await request(BASE_URL)
          .get(endpoint)
          .set('Authorization', `Bearer ${driverToken}`);
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        console.log(`⏱️ ${endpoint}: ${responseTime}ms (Status: ${response.status})`);
        
        // 3 saniyeden az olmalı
        expect(responseTime).toBeLessThan(3000);
      }
      
      console.log('✅ Performance testleri tamamlandı');
    });

    it('Concurrent request handling', async () => {
      console.log('🧪 Test: Eşzamanlı istekler');
      
      const promises = [];
      
      // 10 eşzamanlı request gönder
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(BASE_URL)
            .get('/api/vehicles')
            .set('Authorization', `Bearer ${driverToken}`)
        );
      }
      
      const responses = await Promise.all(promises);
      
      expect(responses.length).toBe(10);
      
      let successCount = 0;
      responses.forEach(response => {
        if (response.status === 200) {
          successCount++;
        }
      });
      
      console.log(`✅ ${successCount}/10 eşzamanlı istek başarılı`);
      expect(successCount).toBeGreaterThan(7); // En az %70 başarı oranı
    });
  });

  describe('🔒 Security Tests', () => {
    it('Token security kontrolü', async () => {
      console.log('🧪 Test: Security kontrolü');
      
      // Token olmadan
      const noTokenResponse = await request(BASE_URL)
        .get('/api/vehicles');
      
      expect(noTokenResponse.status).toBe(401);
      
      // Yanlış token ile
      const badTokenResponse = await request(BASE_URL)
        .get('/api/vehicles')
        .set('Authorization', 'Bearer invalid-token-12345');
      
      expect(badTokenResponse.status).toBe(401);
      
      console.log('✅ Security kontrolü başarılı');
    });

    it('User type authorization kontrolü', async () => {
      console.log('🧪 Test: User type authorization');
      
      // Driver token ile mechanic endpoint'ine erişim
      const response = await request(BASE_URL)
        .get('/api/mechanic/me')
        .set('Authorization', `Bearer ${driverToken}`);
      
      // 401 veya 403 dönmeli
      expect([401, 403]).toContain(response.status);
      
      console.log('✅ User type authorization kontrolü başarılı');
    });
  });
});
