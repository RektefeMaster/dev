const { TestUtils, testData } = require('../utils/testUtils');

describe('Appointment Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    // Otomatik giriş yap
    await TestUtils.waitForElement('auth-screen');
    await TestUtils.tapElement('login-tab');
    await TestUtils.clearAndTypeText('email-input', testData.auth.validUser.email);
    await TestUtils.clearAndTypeText('password-input', testData.auth.validUser.password);
    await TestUtils.tapElement('login-button');
    await TestUtils.waitForElement('home-screen', 15000);
  });

  describe('Book Appointment', () => {
    it('should book appointment successfully', async () => {
      // Usta ara butonuna tıkla
      await TestUtils.tapElement('find-mechanic-button');
      await TestUtils.waitForElement('mechanic-search-screen');

      // İlk ustayı seç
      await TestUtils.tapElement('mechanic-item-0');
      await TestUtils.waitForElement('mechanic-detail-screen');

      // Randevu al butonuna tıkla
      await TestUtils.tapElement('book-appointment-button');
      await TestUtils.waitForElement('book-appointment-screen');

      // Hizmet tipini seç
      await TestUtils.tapElement('service-type-picker');
      await TestUtils.waitForElement('service-type-modal');
      await TestUtils.tapText('Tamir & Bakım');
      await TestUtils.tapElement('service-type-confirm');

      // Açıklama gir
      await TestUtils.clearAndTypeText('appointment-description', testData.appointment.valid.description);

      // Tarih seç
      await TestUtils.tapElement('date-picker');
      await TestUtils.waitForElement('date-picker-modal');
      await TestUtils.tapText('15'); // 15. günü seç
      await TestUtils.tapElement('date-confirm');

      // Saat seç
      await TestUtils.tapElement('time-picker');
      await TestUtils.waitForElement('time-picker-modal');
      await TestUtils.tapText('09:00');
      await TestUtils.tapElement('time-confirm');

      // Araç seç (varsa)
      if (await TestUtils.elementExists('vehicle-picker')) {
        await TestUtils.tapElement('vehicle-picker');
        await TestUtils.waitForElement('vehicle-modal');
        await TestUtils.tapElement('vehicle-item-0');
        await TestUtils.tapElement('vehicle-confirm');
      }

      // Randevu oluştur butonuna tıkla
      await TestUtils.tapElement('create-appointment-button');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Randevunuz başarıyla oluşturuldu');

      // Randevu detayına yönlendirildiğini kontrol et
      await TestUtils.waitForElement('appointment-detail-screen');
    });

    it('should show validation errors for invalid appointment data', async () => {
      // Randevu oluşturma ekranına git
      await TestUtils.tapElement('find-mechanic-button');
      await TestUtils.tapElement('mechanic-item-0');
      await TestUtils.tapElement('book-appointment-button');
      await TestUtils.waitForElement('book-appointment-screen');

      // Boş form gönder
      await TestUtils.tapElement('create-appointment-button');

      // Validasyon hatalarını kontrol et
      await TestUtils.waitForText('Hizmet tipi seçimi gereklidir');
      await TestUtils.waitForText('Tarih seçimi gereklidir');
      await TestUtils.waitForText('Saat seçimi gereklidir');
    });
  });

  describe('Appointment List', () => {
    it('should display appointments list', async () => {
      // Randevularım sekmesine git
      await TestUtils.tapElement('appointments-button');
      await TestUtils.waitForElement('appointments-screen');

      // Liste elementlerini kontrol et
      await TestUtils.waitForElement('appointment-item-0');

      // İlk randevu detayına git
      await TestUtils.tapElement('appointment-item-0');
      await TestUtils.waitForElement('appointment-detail-screen');

      // Detay bilgilerini kontrol et
      await TestUtils.waitForElement('appointment-date');
      await TestUtils.waitForElement('appointment-time');
      await TestUtils.waitForElement('appointment-service');
      await TestUtils.waitForElement('appointment-status');
      await TestUtils.waitForElement('mechanic-info');
    });

    it('should filter appointments by status', async () => {
      // Randevularım sekmesine git
      await TestUtils.tapElement('appointments-button');
      await TestUtils.waitForElement('appointments-screen');

      // Filtre butonuna tıkla
      await TestUtils.tapElement('appointment-filter-button');
      await TestUtils.waitForElement('filter-modal');

      // "Onaylandı" durumunu seç
      await TestUtils.tapElement('status-confirmed');
      await TestUtils.tapElement('apply-filter');

      // Filtrelenmiş sonuçları kontrol et
      await TestUtils.waitForElement('filtered-appointments');
    });
  });

  describe('Appointment Detail', () => {
    it('should display appointment details', async () => {
      // Randevu detayına git
      await TestUtils.tapElement('appointment-item-0');
      await TestUtils.waitForElement('appointment-detail-screen');

      // Temel bilgileri kontrol et
      await TestUtils.waitForElement('appointment-title');
      await TestUtils.waitForElement('appointment-description');
      await TestUtils.waitForElement('appointment-datetime');
      await TestUtils.waitForElement('appointment-location');
      await TestUtils.waitForElement('appointment-price');
      await TestUtils.waitForElement('mechanic-contact');

      // Durum bilgisini kontrol et
      await TestUtils.waitForElement('appointment-status');
    });

    it('should update appointment', async () => {
      // Randevu detayına git
      await TestUtils.tapElement('appointment-item-0');
      await TestUtils.waitForElement('appointment-detail-screen');

      // Düzenle butonuna tıkla
      await TestUtils.tapElement('edit-appointment-button');
      await TestUtils.waitForElement('edit-appointment-screen');

      // Açıklama güncelle
      await TestUtils.clearAndTypeText('appointment-description', 'Güncellenmiş açıklama');

      // Tarih güncelle
      await TestUtils.tapElement('date-picker');
      await TestUtils.tapText('16'); // 16. günü seç
      await TestUtils.tapElement('date-confirm');

      // Kaydet butonuna tıkla
      await TestUtils.tapElement('save-appointment-button');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Randevunuz güncellendi');
    });

    it('should cancel appointment', async () => {
      // Randevu detayına git
      await TestUtils.tapElement('appointment-item-0');
      await TestUtils.waitForElement('appointment-detail-screen');

      // İptal butonuna tıkla
      await TestUtils.tapElement('cancel-appointment-button');

      // Onay dialog'unu kontrol et
      await TestUtils.waitForText('Randevuyu iptal etmek istediğinizden emin misiniz?');

      // İptal sebebi seç
      await TestUtils.tapElement('cancel-reason-picker');
      await TestUtils.tapText('Tarih değişikliği');
      await TestUtils.tapElement('reason-confirm');

      // İptal et butonuna tıkla
      await TestUtils.tapElement('confirm-cancel');

      // İptal mesajını kontrol et
      await TestUtils.waitForText('Randevunuz iptal edildi');
    });
  });

  describe('Appointment Actions', () => {
    it('should contact mechanic', async () => {
      // Randevu detayına git
      await TestUtils.tapElement('appointment-item-0');
      await TestUtils.waitForElement('appointment-detail-screen');

      // Usta ile iletişime geç butonuna tıkla
      await TestUtils.tapElement('contact-mechanic-button');

      // İletişim seçeneklerini kontrol et
      await TestUtils.waitForElement('contact-modal');
      await TestUtils.waitForElement('call-mechanic');
      await TestUtils.waitForElement('message-mechanic');
      await TestUtils.waitForElement('whatsapp-mechanic');
    });

    it('should navigate to appointment location', async () => {
      // Randevu detayına git
      await TestUtils.tapElement('appointment-item-0');
      await TestUtils.waitForElement('appointment-detail-screen');

      // Yol tarifi butonuna tıkla
      await TestUtils.tapElement('get-directions-button');

      // Harita uygulamasının açıldığını kontrol et (simüle)
      await TestUtils.waitForElement('map-app-simulator');
    });

    it('should rate completed appointment', async () => {
      // Tamamlanmış randevu detayına git
      await TestUtils.tapElement('completed-appointment-item');
      await TestUtils.waitForElement('appointment-detail-screen');

      // Değerlendir butonuna tıkla
      await TestUtils.tapElement('rate-appointment-button');
      await TestUtils.waitForElement('rating-screen');

      // Yıldız derecelendirmesi yap
      await TestUtils.tapElement('star-5'); // 5 yıldız

      // Yorum yaz
      await TestUtils.clearAndTypeText('rating-comment', 'Harika hizmet, teşekkürler!');

      // Gönder butonuna tıkla
      await TestUtils.tapElement('submit-rating');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Değerlendirmeniz gönderildi');
    });
  });

  describe('Maintenance Plan Appointments', () => {
    it('should create appointment from maintenance plan', async () => {
      // Bakım planla butonuna tıkla
      await TestUtils.tapElement('maintenance-plan-button');
      await TestUtils.waitForElement('maintenance-plan-screen');

      // Bakım tipini seç
      await TestUtils.tapElement('maintenance-type-periodic');
      await TestUtils.waitForElement('maintenance-detail-screen');

      // Randevu al butonuna tıkla
      await TestUtils.tapElement('schedule-maintenance-button');

      // Randevu oluşturma ekranına yönlendirildiğini kontrol et
      await TestUtils.waitForElement('book-appointment-screen');

      // Bakım bilgilerinin önceden doldurulduğunu kontrol et
      await TestUtils.waitForText('Periyodik Bakım');
    });
  });
});
