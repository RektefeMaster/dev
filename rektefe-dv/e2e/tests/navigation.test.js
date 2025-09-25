const { TestUtils, testData } = require('../utils/testUtils');

describe('Navigation Tests', () => {
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

  describe('Bottom Tab Navigation', () => {
    it('should navigate between all bottom tabs', async () => {
      // Ana sayfa kontrolü
      await TestUtils.waitForElement('home-screen');
      await TestUtils.waitForElement('home-greeting');

      // Mesajlar sekmesine git
      await TestUtils.tapElement('messages-tab');
      await TestUtils.waitForElement('messages-screen');
      await TestUtils.waitForText('Mesajlar');

      // Garaj sekmesine git
      await TestUtils.tapElement('garage-tab');
      await TestUtils.waitForElement('garage-screen');
      await TestUtils.waitForText('Garajım');

      // Cüzdan sekmesine git
      await TestUtils.tapElement('wallet-tab');
      await TestUtils.waitForElement('wallet-screen');
      await TestUtils.waitForText('Cüzdan');

      // TEFE Cüzdan sekmesine git
      await TestUtils.tapElement('tefe-wallet-tab');
      await TestUtils.waitForElement('tefe-wallet-screen');
      await TestUtils.waitForText('TEFE Puanlarım');

      // Destek sekmesine git
      await TestUtils.tapElement('support-tab');
      await TestUtils.waitForElement('support-screen');
      await TestUtils.waitForText('Destek');

      // Ana sayfaya geri dön
      await TestUtils.tapElement('home-tab');
      await TestUtils.waitForElement('home-screen');
    });

    it('should show correct tab highlights', async () => {
      // Ana sayfa aktif olmalı
      await expect(element(by.id('home-tab'))).toHaveProps({ accessibilityState: { selected: true } });

      // Mesajlar sekmesine git
      await TestUtils.tapElement('messages-tab');
      await expect(element(by.id('messages-tab'))).toHaveProps({ accessibilityState: { selected: true } });

      // Diğer sekmelerin seçili olmadığını kontrol et
      await expect(element(by.id('home-tab'))).toHaveProps({ accessibilityState: { selected: false } });
    });
  });

  describe('Home Screen Navigation', () => {
    it('should navigate to all main features from home screen', async () => {
      await TestUtils.waitForElement('home-screen');

      // Bakım planla butonuna tıkla
      await TestUtils.tapElement('maintenance-plan-button');
      await TestUtils.waitForElement('maintenance-plan-screen');
      await TestUtils.waitForText('Bakım Planla');
      // Geri git
      await device.pressBack();

      // Arıza bildir butonuna tıkla
      await TestUtils.tapElement('fault-report-button');
      await TestUtils.waitForElement('fault-report-screen');
      await TestUtils.waitForText('Arıza Bildir');
      // Geri git
      await device.pressBack();

      // Randevularım butonuna tıkla
      await TestUtils.tapElement('appointments-button');
      await TestUtils.waitForElement('appointments-screen');
      await TestUtils.waitForText('Randevularım');
      // Geri git
      await device.pressBack();

      // Usta ara butonuna tıkla
      await TestUtils.tapElement('find-mechanic-button');
      await TestUtils.waitForElement('mechanic-search-screen');
      await TestUtils.waitForText('Usta Ara');
      // Geri git
      await device.pressBack();
    });

    it('should navigate through campaign carousel', async () => {
      await TestUtils.waitForElement('home-screen');

      // Kampanya carousel'inin varlığını kontrol et
      await TestUtils.waitForElement('campaign-carousel');

      // İlk kampanyaya tıkla
      await TestUtils.tapElement('campaign-item-0');
      await TestUtils.waitForElement('campaign-detail-screen');
      await TestUtils.waitForText('Kampanya Detayı');
      // Geri git
      await device.pressBack();

      // Carousel'da sağa kaydır
      await TestUtils.swipeLeft('campaign-carousel');

      // İkinci kampanyaya tıkla
      await TestUtils.tapElement('campaign-item-1');
      await TestUtils.waitForElement('campaign-detail-screen');
    });
  });

  describe('Service Category Navigation', () => {
    it('should navigate to towing service', async () => {
      await TestUtils.waitForElement('home-screen');

      // Çekici hizmet butonuna tıkla
      await TestUtils.tapElement('towing-service-button');
      await TestUtils.waitForElement('towing-request-screen');
      await TestUtils.waitForText('Çekici Hizmeti');
    });

    it('should navigate to wash service', async () => {
      await TestUtils.waitForElement('home-screen');

      // Yıkama hizmet butonuna tıkla
      await TestUtils.tapElement('wash-service-button');
      await TestUtils.waitForElement('wash-booking-screen');
      await TestUtils.waitForText('Yıkama Hizmeti');
    });

    it('should navigate to tire service', async () => {
      await TestUtils.waitForElement('home-screen');

      // Lastik hizmet butonuna tıkla
      await TestUtils.tapElement('tire-service-button');
      await TestUtils.waitForElement('tire-parts-screen');
      await TestUtils.waitForText('Lastik & Parça');
    });
  });

  describe('Profile Navigation', () => {
    it('should navigate to profile screen', async () => {
      // Profil sekmesine git
      await TestUtils.tapElement('profile-tab');
      await TestUtils.waitForElement('profile-screen');
      await TestUtils.waitForText('Profil');

      // Profil düzenle butonuna tıkla
      await TestUtils.tapElement('edit-profile-button');
      await TestUtils.waitForElement('edit-profile-screen');
      await TestUtils.waitForText('Profili Düzenle');
      // Geri git
      await device.pressBack();

      // Şifre değiştir butonuna tıkla
      await TestUtils.tapElement('change-password-button');
      await TestUtils.waitForElement('change-password-screen');
      await TestUtils.waitForText('Şifre Değiştir');
      // Geri git
      await device.pressBack();

      // Bildirim ayarları butonuna tıkla
      await TestUtils.tapElement('notification-settings-button');
      await TestUtils.waitForElement('notification-settings-screen');
      await TestUtils.waitForText('Bildirim Ayarları');
      // Geri git
      await device.pressBack();
    });
  });

  describe('Support Navigation', () => {
    it('should navigate through support sections', async () => {
      // Destek sekmesine git
      await TestUtils.tapElement('support-tab');
      await TestUtils.waitForElement('support-screen');

      // SSS butonuna tıkla
      await TestUtils.tapElement('faq-button');
      await TestUtils.waitForElement('faq-screen');
      await TestUtils.waitForText('Sık Sorulan Sorular');
      // Geri git
      await device.pressBack();

      // Rehber butonuna tıkla
      await TestUtils.tapElement('guide-button');
      await TestUtils.waitForElement('guide-screen');
      await TestUtils.waitForText('Kullanım Kılavuzu');
      // Geri git
      await device.pressBack();

      // İletişim butonuna tıkla
      await TestUtils.tapElement('contact-button');
      await TestUtils.waitForElement('contact-screen');
      await TestUtils.waitForText('Bize Ulaşın');
      // Geri git
      await device.pressBack();
    });
  });

  describe('Deep Linking Navigation', () => {
    it('should handle notification deep links', async () => {
      // Bildirimden gelen deep link'i simüle et
      await device.launchApp({ newInstance: false, url: 'rektefe://notification/123' });

      // Bildirim detay ekranına yönlendirildiğini kontrol et
      await TestUtils.waitForElement('notification-detail-screen');
    });

    it('should handle appointment deep links', async () => {
      // Randevu deep link'i simüle et
      await device.launchApp({ newInstance: false, url: 'rektefe://appointment/456' });

      // Randevu detay ekranına yönlendirildiğini kontrol et
      await TestUtils.waitForElement('appointment-detail-screen');
    });
  });
});
