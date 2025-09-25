const { TestUtils, testData } = require('../utils/testUtils');

describe('Service Categories Tests', () => {
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

  describe('Towing Service', () => {
    it('should request towing service successfully', async () => {
      // Ana sayfadan çekici hizmet butonuna tıkla
      await TestUtils.tapElement('towing-service-button');
      await TestUtils.waitForElement('towing-request-screen');

      // Hizmet bilgilerini kontrol et
      await TestUtils.waitForText('Çekici Hizmeti');
      await TestUtils.waitForElement('towing-description');

      // Konum seç
      await TestUtils.tapElement('pickup-location-picker');
      await TestUtils.waitForElement('location-modal');
      await TestUtils.tapText('İstanbul');
      await TestUtils.tapElement('location-confirm');

      // Varış noktası seç
      await TestUtils.tapElement('destination-picker');
      await TestUtils.waitForElement('destination-modal');
      await TestUtils.tapText('Ankara');
      await TestUtils.tapElement('destination-confirm');

      // Araç bilgilerini gir
      await TestUtils.tapElement('vehicle-info-picker');
      await TestUtils.waitForElement('vehicle-modal');
      await TestUtils.tapElement('vehicle-item-0');
      await TestUtils.tapElement('vehicle-confirm');

      // Hizmet aciliyetini seç
      await TestUtils.tapElement('urgency-normal');

      // Açıklama gir
      await TestUtils.clearAndTypeText('towing-description', 'Aracım yolda kaldı, acil çekici gerekiyor');

      // Fotoğraf ekle (opsiyonel)
      await TestUtils.tapElement('add-towing-photo');
      await TestUtils.tapElement('camera-option');
      await TestUtils.sleep(2000); // Fotoğraf çekme simülasyonu

      // Çekici iste butonuna tıkla
      await TestUtils.tapElement('request-towing-button');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Çekici isteğiniz başarıyla gönderildi');

      // İstek detayına yönlendirildiğini kontrol et
      await TestUtils.waitForElement('towing-request-detail');
    });

    it('should show towing request history', async () => {
      // Çekici hizmet ekranına git
      await TestUtils.tapElement('towing-service-button');
      await TestUtils.waitForElement('towing-request-screen');

      // Geçmiş istekler butonuna tıkla
      await TestUtils.tapElement('towing-history-button');
      await TestUtils.waitForElement('towing-history-screen');

      // İstek listesini kontrol et
      await TestUtils.waitForElement('towing-request-item-0');

      // İlk isteği seç
      await TestUtils.tapElement('towing-request-item-0');
      await TestUtils.waitForElement('towing-request-detail');

      // Detayları kontrol et
      await TestUtils.waitForElement('towing-pickup-location');
      await TestUtils.waitForElement('towing-destination');
      await TestUtils.waitForElement('towing-status');
      await TestUtils.waitForElement('towing-mechanic-info');
    });
  });

  describe('Wash Service', () => {
    it('should book wash service successfully', async () => {
      // Ana sayfadan yıkama hizmet butonuna tıkla
      await TestUtils.tapElement('wash-service-button');
      await TestUtils.waitForElement('wash-booking-screen');

      // Hizmet seçeneklerini kontrol et
      await TestUtils.waitForText('Yıkama Hizmeti');
      await TestUtils.waitForElement('wash-service-options');

      // Yıkama tipini seç
      await TestUtils.tapElement('wash-type-full');
      await TestUtils.waitForElement('wash-details-full');

      // Tarih seç
      await TestUtils.tapElement('wash-date-picker');
      await TestUtils.waitForElement('date-picker-modal');
      await TestUtils.tapText('15'); // 15. günü seç
      await TestUtils.tapElement('date-confirm');

      // Saat seç
      await TestUtils.tapElement('wash-time-picker');
      await TestUtils.waitForElement('time-picker-modal');
      await TestUtils.tapText('10:00');
      await TestUtils.tapElement('time-confirm');

      // Konum seç
      await TestUtils.tapElement('wash-location-picker');
      await TestUtils.waitForElement('location-modal');
      await TestUtils.tapText('Ev adresim');
      await TestUtils.tapElement('location-confirm');

      // Özel not ekle
      await TestUtils.clearAndTypeText('wash-notes', 'Lütfen aracın içini de temizleyin');

      // Rezervasyon yap butonuna tıkla
      await TestUtils.tapElement('book-wash-button');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Yıkama rezervasyonunuz başarıyla oluşturuldu');

      // Rezervasyon detayına yönlendirildiğini kontrol et
      await TestUtils.waitForElement('wash-booking-detail');
    });

    it('should display wash service packages', async () => {
      // Yıkama hizmet ekranına git
      await TestUtils.tapElement('wash-service-button');
      await TestUtils.waitForElement('wash-booking-screen');

      // Paket seçeneklerini kontrol et
      await TestUtils.waitForElement('wash-packages-list');
      await TestUtils.waitForElement('package-basic');
      await TestUtils.waitForElement('package-premium');
      await TestUtils.waitForElement('package-deluxe');

      // Premium paketi seç
      await TestUtils.tapElement('package-premium');
      await TestUtils.waitForElement('package-details-modal');

      // Paket detaylarını kontrol et
      await TestUtils.waitForElement('package-price');
      await TestUtils.waitForElement('package-features');
      await TestUtils.waitForElement('package-duration');

      // Paketi seç butonuna tıkla
      await TestUtils.tapElement('select-package-button');
      await TestUtils.waitForElement('wash-booking-form');
    });
  });

  describe('Tire Service', () => {
    it('should request tire service successfully', async () => {
      // Ana sayfadan lastik hizmet butonuna tıkla
      await TestUtils.tapElement('tire-service-button');
      await TestUtils.waitForElement('tire-parts-screen');

      // Hizmet seçeneklerini kontrol et
      await TestUtils.waitForText('Lastik & Parça');
      await TestUtils.waitForElement('tire-service-options');

      // Lastik değişimi seç
      await TestUtils.tapElement('tire-change-service');
      await TestUtils.waitForElement('tire-change-form');

      // Lastik bilgilerini gir
      await TestUtils.tapElement('tire-size-picker');
      await TestUtils.waitForElement('tire-size-modal');
      await TestUtils.tapText('205/55 R16');
      await TestUtils.tapElement('size-confirm');

      // Mevcut lastik durumu
      await TestUtils.tapElement('current-tire-condition');
      await TestUtils.waitForElement('condition-modal');
      await TestUtils.tapText('Yıpranmış');
      await TestUtils.tapElement('condition-confirm');

      // Konum seç
      await TestUtils.tapElement('tire-service-location');
      await TestUtils.waitForElement('location-modal');
      await TestUtils.tapText('İstanbul');
      await TestUtils.tapElement('location-confirm');

      // Tarih ve saat seç
      await TestUtils.tapElement('tire-service-datetime');
      await TestUtils.waitForElement('datetime-picker-modal');
      await TestUtils.tapText('16'); // 16. günü seç
      await TestUtils.tapText('14:00');
      await TestUtils.tapElement('datetime-confirm');

      // İsteği gönder butonuna tıkla
      await TestUtils.tapElement('request-tire-service');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Lastik hizmeti isteğiniz başarıyla gönderildi');

      // İstek detayına yönlendirildiğini kontrol et
      await TestUtils.waitForElement('tire-service-detail');
    });

    it('should browse tire inventory', async () => {
      // Lastik hizmet ekranına git
      await TestUtils.tapElement('tire-service-button');
      await TestUtils.waitForElement('tire-parts-screen');

      // Lastik al butonuna tıkla
      await TestUtils.tapElement('buy-tires-button');
      await TestUtils.waitForElement('tire-inventory-screen');

      // Filtre seçeneklerini kontrol et
      await TestUtils.waitForElement('tire-brand-filter');
      await TestUtils.waitForElement('tire-size-filter');
      await TestUtils.waitForElement('tire-price-filter');

      // Marka filtresi uygula
      await TestUtils.tapElement('tire-brand-filter');
      await TestUtils.waitForElement('brand-modal');
      await TestUtils.tapText('Michelin');
      await TestUtils.tapElement('brand-confirm');

      // Lastik listesini kontrol et
      await TestUtils.waitForElement('tire-item-0');

      // İlk lastiği seç
      await TestUtils.tapElement('tire-item-0');
      await TestUtils.waitForElement('tire-detail-screen');

      // Lastik detaylarını kontrol et
      await TestUtils.waitForElement('tire-name');
      await TestUtils.waitForElement('tire-price');
      await TestUtils.waitForElement('tire-specifications');
      await TestUtils.waitForElement('tire-reviews');
    });
  });

  describe('Service Comparison', () => {
    it('should compare service providers', async () => {
      // Hizmet kategorisi seç
      await TestUtils.tapElement('towing-service-button');
      await TestUtils.waitForElement('towing-request-screen');

      // Hizmet sağlayıcılarını karşılaştır butonuna tıkla
      await TestUtils.tapElement('compare-providers-button');
      await TestUtils.waitForElement('provider-comparison-screen');

      // Karşılaştırma kriterlerini kontrol et
      await TestUtils.waitForElement('comparison-price');
      await TestUtils.waitForElement('comparison-rating');
      await TestUtils.waitForElement('comparison-distance');
      await TestUtils.waitForElement('comparison-availability');

      // İlk sağlayıcıyı seç
      await TestUtils.tapElement('select-provider-0');

      // Seçimin uygulandığını kontrol et
      await TestUtils.waitForElement('selected-provider-indicator');
    });

    it('should show service provider profiles', async () => {
      // Hizmet sağlayıcı profilini görüntüle
      await TestUtils.tapElement('provider-profile-button');
      await TestUtils.waitForElement('provider-profile-screen');

      // Profil bilgilerini kontrol et
      await TestUtils.waitForElement('provider-name');
      await TestUtils.waitForElement('provider-rating');
      await TestUtils.waitForElement('provider-services');
      await TestUtils.waitForElement('provider-reviews');
      await TestUtils.waitForElement('provider-location');

      // Hizmet sağlayıcı ile iletişime geç
      await TestUtils.tapElement('contact-provider-button');
      await TestUtils.waitForElement('contact-modal');
    });
  });

  describe('Service Scheduling', () => {
    it('should schedule recurring services', async () => {
      // Yıkama hizmet ekranına git
      await TestUtils.tapElement('wash-service-button');
      await TestUtils.waitForElement('wash-booking-screen');

      // Düzenli yıkama butonuna tıkla
      await TestUtils.tapElement('recurring-service-button');
      await TestUtils.waitForElement('recurring-service-screen');

      // Düzenli hizmet ayarlarını kontrol et
      await TestUtils.waitForElement('service-frequency');
      await TestUtils.waitForElement('service-duration');

      // Haftalık seç
      await TestUtils.tapElement('frequency-weekly');
      await TestUtils.waitForElement('weekly-settings');

      // Gün seç
      await TestUtils.tapElement('day-selector');
      await TestUtils.waitForElement('day-modal');
      await TestUtils.tapText('Cumartesi');
      await TestUtils.tapElement('day-confirm');

      // Süre seç (3 ay)
      await TestUtils.tapElement('duration-selector');
      await TestUtils.tapText('3 Ay');
      await TestUtils.tapElement('duration-confirm');

      // Düzenli hizmet oluştur butonuna tıkla
      await TestUtils.tapElement('create-recurring-service');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Düzenli hizmet planınız oluşturuldu');
    });

    it('should manage scheduled services', async () => {
      // Düzenli hizmetler ekranına git
      await TestUtils.tapElement('manage-scheduled-services');
      await TestUtils.waitForElement('scheduled-services-screen');

      // Hizmet listesini kontrol et
      await TestUtils.waitForElement('scheduled-service-item-0');

      // İlk hizmeti düzenle
      await TestUtils.tapElement('scheduled-service-item-0');
      await TestUtils.waitForElement('edit-scheduled-service');

      // Frekansı değiştir
      await TestUtils.tapElement('change-frequency');
      await TestUtils.tapText('Aylık');
      await TestUtils.tapElement('frequency-confirm');

      // Kaydet butonuna tıkla
      await TestUtils.tapElement('save-scheduled-service');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Düzenli hizmet güncellendi');
    });
  });

  describe('Emergency Services', () => {
    it('should handle emergency service requests', async () => {
      // Acil çekici butonuna tıkla
      await TestUtils.tapElement('emergency-towing-button');
      await TestUtils.waitForElement('emergency-request-screen');

      // Acil durum bilgilerini kontrol et
      await TestUtils.waitForElement('emergency-indicator');
      await TestUtils.waitForText('ACİL DURUM');

      // Konum paylaşımını etkinleştir
      await TestUtils.tapElement('share-location-emergency');
      await TestUtils.waitForElement('location-permission-modal');
      await TestUtils.tapElement('allow-location-emergency');

      // Durum açıklaması gir
      await TestUtils.clearAndTypeText('emergency-description', 'Aracım kaza yaptı, sürücü yaralı');

      // Acil çağrı butonuna tıkla
      await TestUtils.tapElement('emergency-call-button');

      // Acil servis iletişimini kontrol et
      await TestUtils.waitForElement('emergency-contact-established');
    });

    it('should show emergency service status', async () => {
      // Acil hizmet durumu ekranına git
      await TestUtils.tapElement('emergency-status-button');
      await TestUtils.waitForElement('emergency-status-screen');

      // Durum bilgilerini kontrol et
      await TestUtils.waitForElement('emergency-service-status');
      await TestUtils.waitForElement('estimated-arrival-time');
      await TestUtils.waitForElement('emergency-provider-info');
      await TestUtils.waitForElement('emergency-tracking-map');
    });
  });
});
