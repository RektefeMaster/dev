import mongoose from 'mongoose';
import request from 'supertest';
import { User } from '../../src/models/User';
import { Vehicle } from '../../src/models/Vehicle';
import { FaultReport } from '../../src/models/FaultReport';
import { Appointment } from '../../src/models/Appointment';
import { Wallet } from '../../src/models/Wallet';
import { TefePoint } from '../../src/models/TefePoint';
import { Notification } from '../../src/models/Notification';

// App'i import et (setup.ts'de NODE_ENV zaten test olarak ayarlandı)
import { app } from '../../src/index';

describe('Fault Report and Payment Flow E2E Tests', () => {
  let driverToken: string;
  let mechanicToken: string;
  let driverId: string;
  let mechanicId: string;
  let vehicleId: string;
  let faultReportId: string;
  let appointmentId: string;

  beforeAll(async () => {
    // MongoDB bağlantısının hazır olmasını bekle (setup.ts'de bağlantı yapılıyor)
    // Bağlantı durumunu kontrol et
    const maxWaitTime = 30000; // 30 saniye
    const startTime = Date.now();
    
    while (mongoose.connection.readyState === 0 && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (mongoose.connection.readyState === 0) {
      throw new Error('MongoDB bağlantısı kurulamadı. Test setup dosyasını kontrol edin.');
    }
    
    // Test verilerini temizle (önceki testlerden kalan)
    try {
      await User.deleteMany({ email: { $in: ['testdriver@test.com', 'testmechanic@test.com'] } });
      await Vehicle.deleteMany({ plateNumber: 'TEST123' });
      await FaultReport.deleteMany({ faultDescription: { $regex: 'E2E Test' } });
      await Appointment.deleteMany({ description: { $regex: 'E2E Test' } });
    } catch (error: any) {
      console.warn('Test verileri temizlenirken hata:', error.message);
      // Hata olsa bile testlere devam et
    }
  }, 60000);

  afterAll(async () => {
    // Test verilerini temizle
    await User.deleteMany({ email: { $in: ['testdriver@test.com', 'testmechanic@test.com'] } });
    await Vehicle.deleteMany({ plateNumber: 'TEST123' });
    await FaultReport.deleteMany({ faultDescription: { $regex: 'E2E Test' } });
    await Appointment.deleteMany({ description: { $regex: 'E2E Test' } });
    await Wallet.deleteMany({});
    await TefePoint.deleteMany({});
    await Notification.deleteMany({});
    
    await mongoose.connection.close();
  });

  describe('1. Arıza Bildirimi Verir Driver', () => {
    it('should create driver user', async () => {
      const driverData = {
        email: 'testdriver@test.com',
        password: 'Test123456',
        name: 'Test',
        surname: 'Driver',
        phone: '5551234567',
        userType: 'driver'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(driverData)
        .expect(201);

      expect(response.body.success).toBe(true);
      driverId = response.body.data.user._id;
      driverToken = response.body.data.token;
    });

    it('should create mechanic user', async () => {
      const mechanicData = {
        email: 'testmechanic@test.com',
        password: 'Test123456',
        name: 'Test',
        surname: 'Mechanic',
        phone: '5559876543',
        userType: 'mechanic',
        serviceCategories: ['repair'],
        isAvailable: true
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(mechanicData)
        .expect(201);

      expect(response.body.success).toBe(true);
      mechanicId = response.body.data.user._id;
      mechanicToken = response.body.data.token;
    });

    it('should create vehicle for driver', async () => {
      const vehicleData = {
        brand: 'Toyota',
        modelName: 'Corolla',
        year: 2020,
        plateNumber: 'TEST123',
        fuelType: 'Benzin'
      };

      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(vehicleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      vehicleId = response.body.data._id;
    });

    it('should create fault report', async () => {
      const faultReportData = {
        vehicleId: vehicleId,
        serviceCategory: 'Genel Bakım',
        faultDescription: 'E2E Test - Motor arızası',
        priority: 'medium',
        photos: []
      };

      const response = await request(app)
        .post('/api/fault-reports')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(faultReportData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('pending');
      faultReportId = response.body.data._id;
    });
  });

  describe('2. Usta Görüp Teklif Gönderir', () => {
    it('should submit quote from mechanic', async () => {
      const quoteData = {
        quoteAmount: 5000,
        estimatedDuration: '2-3 gün',
        notes: 'E2E Test teklifi'
      };

      const response = await request(app)
        .post(`/api/fault-reports/${faultReportId}/quote`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send(quoteData)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Fault report'u kontrol et
      const faultReport = await FaultReport.findById(faultReportId);
      expect(faultReport?.status).toBe('quoted');
      expect(faultReport?.quotes.length).toBeGreaterThan(0);
    });
  });

  describe('3. Driver Teklif Seçer', () => {
    it('should select quote', async () => {
      const faultReport = await FaultReport.findById(faultReportId);
      const quoteIndex = 0;

      const response = await request(app)
        .post(`/api/fault-reports/${faultReportId}/select-quote`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ quoteIndex })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.nextStep).toBe('create_appointment');
      
      // Fault report'u kontrol et
      const updatedFaultReport = await FaultReport.findById(faultReportId);
      expect(updatedFaultReport?.status).toBe('accepted');
      expect(updatedFaultReport?.selectedQuote).toBeDefined();
    });
  });

  describe('4. Driver Randevu Oluşturur', () => {
    it('should create appointment from fault report', async () => {
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 1); // Yarın

      const appointmentData = {
        appointmentDate: appointmentDate.toISOString(),
        timeSlot: '10:00'
      };

      const response = await request(app)
        .post(`/api/fault-reports/${faultReportId}/create-appointment`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send(appointmentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      appointmentId = response.body.data.appointment._id;
      
      // Appointment'ı kontrol et
      const appointment = await Appointment.findById(appointmentId);
      expect(appointment?.status).toBe('TALEP_EDILDI');
      expect(appointment?.faultReportId?.toString()).toBe(faultReportId);
    });
  });

  describe('5. Usta Randevuyu Kabul Eder', () => {
    it('should accept appointment', async () => {
      const response = await request(app)
        .put(`/api/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send({ status: 'confirmed' })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Appointment'ı kontrol et
      const appointment = await Appointment.findById(appointmentId);
      expect(appointment?.status).toBe('PLANLANDI');
    });
  });

  describe('6. Usta İşi Başlatır', () => {
    it('should start service (SERVISTE)', async () => {
      const response = await request(app)
        .put(`/api/appointments/${appointmentId}/servise-al`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Appointment'ı kontrol et
      const appointment = await Appointment.findById(appointmentId);
      expect(appointment?.status).toBe('SERVISTE');
    });
  });

  describe('7. Usta Ek Ücret Ekler (Opsiyonel)', () => {
    it('should add extra charge', async () => {
      const extraChargeData = {
        additionalAmount: 1000,
        reason: 'E2E Test - Ek malzeme'
      };

      const response = await request(app)
        .post(`/api/appointments/${appointmentId}/extra-charges`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send(extraChargeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Appointment'ı kontrol et
      const appointment = await Appointment.findById(appointmentId);
      expect(appointment?.araOnaylar?.length).toBeGreaterThan(0);
      expect(appointment?.araOnaylar?.[0].onay).toBe('BEKLIYOR');
    });

    it('should approve extra charge', async () => {
      const appointment = await Appointment.findById(appointmentId);
      const approvalIndex = 0;

      const response = await request(app)
        .put(`/api/appointments/${appointmentId}/extra-charges/approve`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ approvalIndex, approve: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Appointment'ı kontrol et
      const updatedAppointment = await Appointment.findById(appointmentId);
      expect(updatedAppointment?.araOnaylar?.[0].onay).toBe('KABUL');
    });
  });

  describe('8. Usta İşi Bitirir', () => {
    it('should complete appointment', async () => {
      const completionData = {
        completionNotes: 'E2E Test - İş tamamlandı',
        price: 5000,
        estimatedDuration: 2
      };

      const response = await request(app)
        .put(`/api/appointments/${appointmentId}/complete`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send(completionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Appointment'ı kontrol et
      const appointment = await Appointment.findById(appointmentId);
      expect(appointment?.status).toBe('ODEME_BEKLIYOR');
      expect(appointment?.finalPrice).toBe(6000); // 5000 + 1000 ek ücret
      expect(appointment?.priceApproval?.status).toBe('APPROVED'); // Otomatik onaylandı
    });
  });

  describe('9. Driver İndirim İster (Opsiyonel)', () => {
    it('should request discount', async () => {
      const response = await request(app)
        .post(`/api/appointments/${appointmentId}/request-discount`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Appointment'ı kontrol et
      const appointment = await Appointment.findById(appointmentId);
      expect(appointment?.discountRequest?.status).toBe('PENDING');
    });

    it('should not allow payment when discount request is pending', async () => {
      const response = await request(app)
        .post(`/api/appointments/${appointmentId}/payment`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ paymentMethod: 'credit_card' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('indirim isteğiniz var');
    });

    it('should respond to discount request with new price', async () => {
      const response = await request(app)
        .post(`/api/appointments/${appointmentId}/respond-discount`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send({ approve: true, newPrice: 5500 })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Appointment'ı kontrol et
      const appointment = await Appointment.findById(appointmentId);
      expect(appointment?.discountRequest?.status).toBe('APPROVED');
      expect(appointment?.negotiatedPrice).toBe(5500);
      expect(appointment?.priceApproval?.status).toBe('PENDING');
    });

    it('should not allow payment when price approval is pending', async () => {
      const response = await request(app)
        .post(`/api/appointments/${appointmentId}/payment`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ paymentMethod: 'credit_card' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Fiyat onayınız bekleniyor');
    });

    it('should approve final price', async () => {
      const response = await request(app)
        .post(`/api/appointments/${appointmentId}/approve-price`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Appointment'ı kontrol et
      const appointment = await Appointment.findById(appointmentId);
      expect(appointment?.priceApproval?.status).toBe('APPROVED');
      expect(appointment?.finalPrice).toBe(5500); // Negotiated price
    });
  });

  describe('10. Driver Ödeme Yapar', () => {
    it('should create payment', async () => {
      const response = await request(app)
        .post(`/api/appointments/${appointmentId}/payment`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ paymentMethod: 'credit_card' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ready_for_payment');
    });

    it('should confirm payment', async () => {
      const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await request(app)
        .post(`/api/appointments/${appointmentId}/confirm-payment`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ transactionId })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Appointment'ı kontrol et
      const appointment = await Appointment.findById(appointmentId);
      expect(appointment?.paymentStatus).toBe('COMPLETED');
      expect(appointment?.status).toBe('TAMAMLANDI');
      
      // Wallet transaction'ları kontrol et
      const driverWallet = await Wallet.findOne({ userId: driverId });
      expect(driverWallet).toBeDefined();
      const driverTransaction = driverWallet?.transactions.find(
        (t: any) => t.appointmentId?.toString() === appointmentId
      );
      expect(driverTransaction).toBeDefined();
      expect(driverTransaction?.type).toBe('debit');
      expect(driverTransaction?.amount).toBe(5500);
      
      const mechanicWallet = await Wallet.findOne({ userId: mechanicId });
      expect(mechanicWallet).toBeDefined();
      const mechanicTransaction = mechanicWallet?.transactions.find(
        (t: any) => t.appointmentId?.toString() === appointmentId
      );
      expect(mechanicTransaction).toBeDefined();
      expect(mechanicTransaction?.type).toBe('credit');
      expect(mechanicTransaction?.amount).toBe(5500);
    });
  });

  describe('11. TefePuan Kazanımı', () => {
    it('should award TefePuan to driver', async () => {
      const driverTefePoint = await TefePoint.findOne({ userId: driverId });
      expect(driverTefePoint).toBeDefined();
      expect(driverTefePoint?.totalPoints).toBeGreaterThan(0);
      
      const transaction = driverTefePoint?.transactions.find(
        (t: any) => t.appointmentId?.toString() === appointmentId
      );
      expect(transaction).toBeDefined();
      expect(transaction?.type).toBe('service_purchase');
    });

    it('should award TefePuan to mechanic', async () => {
      const mechanicTefePoint = await TefePoint.findOne({ userId: mechanicId });
      expect(mechanicTefePoint).toBeDefined();
      expect(mechanicTefePoint?.totalPoints).toBeGreaterThan(0);
      
      const transaction = mechanicTefePoint?.transactions.find(
        (t: any) => t.appointmentId?.toString() === appointmentId
      );
      expect(transaction).toBeDefined();
      expect(transaction?.type).toBe('service_purchase');
    });
  });

  describe('12. Bildirimler Kontrolü', () => {
    it('should have notifications for driver', async () => {
      const notifications = await Notification.find({ recipientId: driverId });
      expect(notifications.length).toBeGreaterThan(0);
      
      // İş tamamlandı bildirimi
      const completionNotification = notifications.find(
        (n: any) => n.type === 'payment_pending' && n.message.includes('tamamlandı')
      );
      expect(completionNotification).toBeDefined();
      
      // İş başladı bildirimi
      const startNotification = notifications.find(
        (n: any) => n.type === 'appointment_confirmed' && n.message.includes('başladı')
      );
      expect(startNotification).toBeDefined();
    });

    it('should have notifications for mechanic', async () => {
      const notifications = await Notification.find({ recipientId: mechanicId });
      expect(notifications.length).toBeGreaterThan(0);
      
      // Randevu talebi bildirimi
      const requestNotification = notifications.find(
        (n: any) => n.type === 'appointment_request'
      );
      expect(requestNotification).toBeDefined();
      
      // İndirim isteği bildirimi
      const discountNotification = notifications.find(
        (n: any) => n.type === 'discount_requested'
      );
      expect(discountNotification).toBeDefined();
      
      // Ödeme alındı bildirimi
      const paymentNotification = notifications.find(
        (n: any) => n.type === 'payment_received'
      );
      expect(paymentNotification).toBeDefined();
    });
  });

  describe('13. Direkt Ödeme Senaryosu (İndirim İsteği Olmadan)', () => {
    let directAppointmentId: string;
    let directFaultReportId: string;

    it('should create new fault report and appointment for direct payment test', async () => {
      // Yeni fault report oluştur
      const faultReportData = {
        vehicleId: vehicleId,
        serviceCategory: 'Genel Bakım',
        faultDescription: 'E2E Test - Direkt ödeme',
        priority: 'medium',
        photos: []
      };

      const faultReportResponse = await request(app)
        .post('/api/fault-reports')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(faultReportData)
        .expect(201);

      directFaultReportId = faultReportResponse.body.data._id;

      // Teklif gönder
      await request(app)
        .post(`/api/fault-reports/${directFaultReportId}/quote`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send({ quoteAmount: 3000, estimatedDuration: '1 gün', notes: 'Test' })
        .expect(200);

      // Teklif seç
      await request(app)
        .post(`/api/fault-reports/${directFaultReportId}/select-quote`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ quoteIndex: 0 })
        .expect(200);

      // Randevu oluştur
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 1);
      const appointmentResponse = await request(app)
        .post(`/api/fault-reports/${directFaultReportId}/create-appointment`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ appointmentDate: appointmentDate.toISOString(), timeSlot: '14:00' })
        .expect(200);

      directAppointmentId = appointmentResponse.body.data.appointment._id;

      // Randevu kabul et
      await request(app)
        .put(`/api/appointments/${directAppointmentId}/status`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send({ status: 'confirmed' })
        .expect(200);

      // İşi başlat
      await request(app)
        .put(`/api/appointments/${directAppointmentId}/servise-al`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .expect(200);

      // İşi bitir
      await request(app)
        .put(`/api/appointments/${directAppointmentId}/complete`)
        .set('Authorization', `Bearer ${mechanicToken}`)
        .send({ completionNotes: 'Test tamamlandı', price: 3000 })
        .expect(200);
    });

    it('should allow direct payment without discount request', async () => {
      // Appointment'ı kontrol et
      const appointment = await Appointment.findById(directAppointmentId);
      expect(appointment?.status).toBe('ODEME_BEKLIYOR');
      expect(appointment?.priceApproval?.status).toBe('APPROVED'); // Otomatik onaylandı
      expect(appointment?.discountRequest).toBeUndefined();

      // Ödeme yap
      const transactionId = `TXN_DIRECT_${Date.now()}`;
      const response = await request(app)
        .post(`/api/appointments/${directAppointmentId}/confirm-payment`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ transactionId })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Appointment'ı kontrol et
      const updatedAppointment = await Appointment.findById(directAppointmentId);
      expect(updatedAppointment?.paymentStatus).toBe('COMPLETED');
      expect(updatedAppointment?.status).toBe('TAMAMLANDI');
    });
  });
});

