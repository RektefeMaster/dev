const { TestUtils, testData } = require('../utils/testUtils');

describe('Mechanic Search Tests', () => {
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

  describe('Mechanic Search Screen', () => {
    it('should display mechanic search screen', async () => {
      // Usta ara butonuna tıkla
      await TestUtils.tapElement('find-mechanic-button');
      await TestUtils.waitForElement('mechanic-search-screen');

      // Arama ekranı elementlerini kontrol et
      await TestUtils.waitForElement('search-input');
      await TestUtils.waitForElement('location-picker');
      await TestUtils.waitForElement('service-filter');
      await TestUtils.waitForElement('sort-options');
      await TestUtils.waitForElement('mechanic-list');
    });

    it('should search mechanics by name', async () => {
      // Usta ara ekranına git
      await TestUtils.tapElement('find-mechanic-button');
      await TestUtils.waitForElement('mechanic-search-screen');

      // Arama kutusuna değer gir
      await TestUtils.clearAndTypeText('search-input', 'Ahmet');

      // Arama sonuçlarını kontrol et
      await TestUtils.waitForElement('search-results');
      await TestUtils.waitForText('Ahmet');
    });

    it('should filter mechanics by service type', async () => {
      // Usta ara ekranına git
      await TestUtils.tapElement('find-mechanic-button');
      await TestUtils.waitForElement('mechanic-search-screen');

      // Hizmet filtresi butonuna tıkla
      await TestUtils.tapElement('service-filter');
      await TestUtils.waitForElement('service-filter-modal');

      // Tamir & Bakım seç
      await TestUtils.tapElement('filter-repair-maintenance');
      await TestUtils.tapElement('apply-service-filter');

      // Filtrelenmiş sonuçları kontrol et
      await TestUtils.waitForElement('filtered-mechanics');
      await TestUtils.waitForText('Tamir & Bakım');
    });

    it('should filter mechanics by location', async () => {
      // Usta ara ekranına git
      await TestUtils.tapElement('find-mechanic-button');
      await TestUtils.waitForElement('mechanic-search-screen');

      // Konum seç butonuna tıkla
      await TestUtils.tapElement('location-picker');
      await TestUtils.waitForElement('location-modal');

      // İstanbul'u seç
      await TestUtils.tapText('İstanbul');
      await TestUtils.tapElement('location-confirm');

      // Konum bazlı sonuçları kontrol et
      await TestUtils.waitForElement('location-filtered-results');
      await TestUtils.waitForText('İstanbul');
    });
  });

  describe('Mechanic Detail Screen', () => {
    it('should display mechanic details', async () => {
      // Usta ara ekranına git
      await TestUtils.tapElement('find-mechanic-button');
      await TestUtils.waitForElement('mechanic-search-screen');

      // İlk ustayı seç
      await TestUtils.tapElement('mechanic-item-0');
      await TestUtils.waitForElement('mechanic-detail-screen');

      // Usta bilgilerini kontrol et
      await TestUtils.waitForElement('mechanic-name');
      await TestUtils.waitForElement('mechanic-rating');
      await TestUtils.waitForElement('mechanic-experience');
      await TestUtils.waitForElement('mechanic-specialties');
      await TestUtils.waitForElement('mechanic-location');
      await TestUtils.waitForElement('mechanic-bio');
      await TestUtils.waitForElement('mechanic-reviews');
    });

    it('should display mechanic portfolio', async () => {
      // Usta detayına git
      await TestUtils.tapElement('find-mechanic-button');
      await TestUtils.tapElement('mechanic-item-0');
      await TestUtils.waitForElement('mechanic-detail-screen');

      // Portföy sekmesine tıkla
      await TestUtils.tapElement('portfolio-tab');

      // Portföy elementlerini kontrol et
      await TestUtils.waitForElement('portfolio-photos');
      await TestUtils.waitForElement('completed-works');
      await TestUtils.waitForElement('work-samples');
    });

    it('should display mechanic reviews', async () => {
      // Usta detayına git
      await TestUtils.tapElement('find-mechanic-button');
      await TestUtils.tapElement('mechanic-item-0');
      await TestUtils.waitForElement('mechanic-detail-screen');

      // Değerlendirmeler sekmesine tıkla
      await TestUtils.tapElement('reviews-tab');

      // Değerlendirme elementlerini kontrol et
      await TestUtils.waitForElement('review-list');
      await TestUtils.waitForElement('average-rating');
      await TestUtils.waitForElement('total-reviews');

      // İlk değerlendirmeyi kontrol et
      await TestUtils.waitForElement('review-item-0');
      await TestUtils.waitForElement('review-rating');
      await TestUtils.waitForElement('review-comment');
      await TestUtils.waitForElement('review-date');
    });
  });

  describe('Mechanic Actions', () => {
    it('should favorite/unfavorite mechanic', async () => {
      // Usta detayına git
      await TestUtils.tapElement('find-mechanic-button');
      await TestUtils.tapElement('mechanic-item-0');
      await TestUtils.waitForElement('mechanic-detail-screen');

      // Favorilere ekle butonuna tıkla
      await TestUtils.tapElement('favorite-button');

      // Favorilere eklendiğini kontrol et
      await TestUtils.waitForElement('favorited-icon');

      // Favorilerden çıkar
      await TestUtils.tapElement('favorite-button');
      await TestUtils.waitForElementNotVisible('favorited-icon');
    });

    it('should contact mechanic', async () => {
      // Usta detayına git
      await TestUtils.tapElement('find-mechanic-button');
      await TestUtils.tapElement('mechanic-item-0');
      await TestUtils.waitForElement('mechanic-detail-screen');

      // İletişime geç butonuna tıkla
      await TestUtils.tapElement('contact-mechanic-button');
      await TestUtils.waitForElement('contact-modal');

      // Arama seçeneği
      await TestUtils.tapElement('call-mechanic');
      // Arama uygulamasının açıldığını kontrol et (simüle)
      await TestUtils.waitForElement('phone-app-simulator');

      // Geri dön
      await device.pressBack();
      await TestUtils.waitForElement('mechanic-detail-screen');

      // Mesaj gönderme seçeneği
      await TestUtils.tapElement('contact-mechanic-button');
      await TestUtils.tapElement('message-mechanic');
      await TestUtils.waitForElement('new-message-screen');
    });

    it('should share mechanic profile', async () => {
      // Usta detayına git
      await TestUtils.tapElement('find-mechanic-button');
      await TestUtils.tapElement('mechanic-item-0');
      await TestUtils.waitForElement('mechanic-detail-screen');

      // Paylaş butonuna tıkla
      await TestUtils.tapElement('share-mechanic-button');
      await TestUtils.waitForElement('share-modal');

      // Paylaşım seçeneklerini kontrol et
      await TestUtils.waitForElement('share-whatsapp');
      await TestUtils.waitForElement('share-facebook');
      await TestUtils.waitForElement('share-twitter');
      await TestUtils.waitForElement('share-copy-link');
    });
  });

  describe('Mechanic Availability', () => {
    it('should display mechanic availability', async () => {
      // Usta detayına git
      await TestUtils.tapElement('find-mechanic-button');
      await TestUtils.tapElement('mechanic-item-0');
      await TestUtils.waitForElement('mechanic-detail-screen');

      // Müsaitlik bilgisini kontrol et
      await TestUtils.waitForElement('availability-status');

      // Çalışma saatleri sekmesine tıkla
      await TestUtils.tapElement('working-hours-tab');
      await TestUtils.waitForElement('working-hours-list');

      // Bugünkü çalışma saatlerini kontrol et
      await TestUtils.waitForElement('today-hours');
    });

    it('should show available time slots', async () => {
      // Usta detayına git
      await TestUtils.tapElement('find-mechanic-button');
      await TestUtils.tapElement('mechanic-item-0');
      await TestUtils.waitForElement('mechanic-detail-screen');

      // Müsait saatler butonuna tıkla
      await TestUtils.tapElement('available-slots-button');
      await TestUtils.waitForElement('available-slots-modal');

      // Bugünkü müsait saatleri kontrol et
      await TestUtils.waitForElement('today-slots');

      // Farklı bir gün seç
      await TestUtils.tapElement('date-selector');
      await TestUtils.tapText('16'); // 16. günü seç
      await TestUtils.tapElement('date-confirm');

      // Seçili gündeki saatleri kontrol et
      await TestUtils.waitForElement('selected-date-slots');
    });
  });

  describe('Mechanic Comparison', () => {
    it('should compare multiple mechanics', async () => {
      // Usta ara ekranına git
      await TestUtils.tapElement('find-mechanic-button');
      await TestUtils.waitForElement('mechanic-search-screen');

      // İlk ustayı karşılaştırma için seç
      await TestUtils.tapElement('compare-checkbox-0');

      // İkinci ustayı seç
      await TestUtils.tapElement('compare-checkbox-1');

      // Karşılaştır butonuna tıkla
      await TestUtils.tapElement('compare-button');
      await TestUtils.waitForElement('compare-screen');

      // Karşılaştırma kriterlerini kontrol et
      await TestUtils.waitForElement('comparison-rating');
      await TestUtils.waitForElement('comparison-price');
      await TestUtils.waitForElement('comparison-experience');
      await TestUtils.waitForElement('comparison-reviews');
      await TestUtils.waitForElement('comparison-location');
    });
  });

  describe('Mechanic Map View', () => {
    it('should display mechanics on map', async () => {
      // Usta ara ekranına git
      await TestUtils.tapElement('find-mechanic-button');
      await TestUtils.waitForElement('mechanic-search-screen');

      // Harita görünümü butonuna tıkla
      await TestUtils.tapElement('map-view-button');
      await TestUtils.waitForElement('mechanic-map-screen');

      // Harita elementlerini kontrol et
      await TestUtils.waitForElement('map-container');
      await TestUtils.waitForElement('mechanic-map-marker-0');

      // Harita üzerindeki işaretçiye tıkla
      await TestUtils.tapElement('mechanic-map-marker-0');
      await TestUtils.waitForElement('marker-info-window');

      // Bilgi penceresindeki detay butonuna tıkla
      await TestUtils.tapElement('marker-detail-button');
      await TestUtils.waitForElement('mechanic-detail-screen');
    });
  });
});
