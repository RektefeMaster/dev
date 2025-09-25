import { device, expect, element, by, waitFor } from 'detox';

describe('Emergency Towing System', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Emergency Towing Flow', () => {
    it('should navigate to towing request screen', async () => {
      // Ana ekranda hizmetler bölümüne git
      await waitFor(element(by.text('Hizmetler')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.text('Hizmetler')).tap();
      
      // Çekici Hizmeti seçeneğini bul ve tıkla
      await waitFor(element(by.text('Çekici Hizmeti')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.text('Çekici Hizmeti')).tap();
      
      // TowingRequestScreen'e yönlendirildiğini doğrula
      await expect(element(by.text('Çekici Hizmeti Talep Et'))).toBeVisible();
    });

    it('should display emergency towing button', async () => {
      // TowingRequestScreen'e git
      await element(by.text('Hizmetler')).tap();
      await element(by.text('Çekici Hizmeti')).tap();
      
      // Acil durum butonunu kontrol et
      await expect(element(by.id('emergency-towing-button'))).toBeVisible();
      await expect(element(by.text('ACİL DURUM MU?'))).toBeVisible();
      await expect(element(by.text('Hemen çekici çağırmak için bu butona basın'))).toBeVisible();
    });

    it('should handle emergency towing request', async () => {
      // TowingRequestScreen'e git
      await element(by.text('Hizmetler')).tap();
      await element(by.text('Çekici Hizmeti')).tap();
      
      // Acil durum butonuna tıkla
      await element(by.id('emergency-towing-button')).tap();
      
      // Konum izni isteyecek
      await waitFor(element(by.text('Konum izni gerekli')))
        .toBeVisible()
        .withTimeout(3000);
      
      // İzin ver
      await element(by.text('İzin Ver')).tap();
      
      // Acil talep gönderildi mesajını kontrol et
      await waitFor(element(by.text('Acil çekici talebi gönderildi!')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should navigate to emergency tracking screen', async () => {
      // TowingRequestScreen'e git
      await element(by.text('Hizmetler')).tap();
      await element(by.text('Çekici Hizmeti')).tap();
      
      // Acil durum butonuna tıkla
      await element(by.id('emergency-towing-button')).tap();
      
      // Konum izni ver
      await element(by.text('İzin Ver')).tap();
      
      // EmergencyTrackingScreen'e yönlendirildiğini kontrol et
      await waitFor(element(by.id('emergency-tracking-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      // Talep durumunu kontrol et
      await expect(element(by.text('Beklemede'))).toBeVisible();
    });

    it('should display emergency request details', async () => {
      // TowingRequestScreen'e git
      await element(by.text('Hizmetler')).tap();
      await element(by.text('Çekici Hizmeti')).tap();
      
      // Acil durum butonuna tıkla
      await element(by.id('emergency-towing-button')).tap();
      
      // Konum izni ver
      await element(by.text('İzin Ver')).tap();
      
      // EmergencyTrackingScreen'de detayları kontrol et
      await waitFor(element(by.id('emergency-tracking-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      // Kullanıcı bilgileri
      await expect(element(by.text('Nurullah Aydın'))).toBeVisible();
      await expect(element(by.text('05060550239'))).toBeVisible();
      
      // Araç bilgileri
      await expect(element(by.text('Audi A3 e-tron'))).toBeVisible();
      await expect(element(by.text('44ABC444'))).toBeVisible();
      
      // Konum bilgileri
      await expect(element(by.text('Konum:'))).toBeVisible();
    });

    it('should handle emergency request error gracefully', async () => {
      // TowingRequestScreen'e git
      await element(by.text('Hizmetler')).tap();
      await element(by.text('Çekici Hizmeti')).tap();
      
      // Acil durum butonuna tıkla
      await element(by.id('emergency-towing-button')).tap();
      
      // Konum iznini reddet
      await element(by.text('Reddet')).tap();
      
      // Hata mesajını kontrol et
      await waitFor(element(by.text('Konum izni gerekli')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Emergency Towing UI/UX', () => {
    it('should have proper emergency button styling', async () => {
      // TowingRequestScreen'e git
      await element(by.text('Hizmetler')).tap();
      await element(by.text('Çekici Hizmeti')).tap();
      
      // Acil durum kartının görünümünü kontrol et
      const emergencyCard = element(by.id('emergency-card'));
      await expect(emergencyCard).toBeVisible();
      
      // Buton metnini kontrol et
      await expect(element(by.text('ACİL DURUM MU?'))).toBeVisible();
      await expect(element(by.text('Hemen çekici çağırmak için bu butona basın'))).toBeVisible();
    });

    it('should show loading state during request', async () => {
      // TowingRequestScreen'e git
      await element(by.text('Hizmetler')).tap();
      await element(by.text('Çekici Hizmeti')).tap();
      
      // Acil durum butonuna tıkla
      await element(by.id('emergency-towing-button')).tap();
      
      // Konum izni ver
      await element(by.text('İzin Ver')).tap();
      
      // Loading state'i kontrol et (kısa süre)
      await waitFor(element(by.type('ActivityIndicator')))
        .toBeVisible()
        .withTimeout(2000);
    });
  });

  describe('Emergency Towing Integration', () => {
    it('should work with real user data', async () => {
      // Önce giriş yap
      await element(by.text('Giriş Yap')).tap();
      await element(by.id('email-input')).typeText('testdv@gmail.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.text('Giriş Yap')).tap();
      
      // Ana ekrana dön
      await waitFor(element(by.text('Hizmetler')))
        .toBeVisible()
        .withTimeout(5000);
      
      // TowingRequestScreen'e git
      await element(by.text('Hizmetler')).tap();
      await element(by.text('Çekici Hizmeti')).tap();
      
      // Acil durum butonuna tıkla
      await element(by.id('emergency-towing-button')).tap();
      
      // Konum izni ver
      await element(by.text('İzin Ver')).tap();
      
      // Gerçek kullanıcı verileri ile talep gönder
      await waitFor(element(by.text('Acil çekici talebi gönderildi!')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should handle network errors gracefully', async () => {
      // TowingRequestScreen'e git
      await element(by.text('Hizmetler')).tap();
      await element(by.text('Çekici Hizmeti')).tap();
      
      // Acil durum butonuna tıkla
      await element(by.id('emergency-towing-button')).tap();
      
      // Konum izni ver
      await element(by.text('İzin Ver')).tap();
      
      // Network hatası durumunda hata mesajını kontrol et
      // (Bu test için network'ü kapatabilirsiniz)
      await waitFor(element(by.text('Ağ hatası')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });
});
