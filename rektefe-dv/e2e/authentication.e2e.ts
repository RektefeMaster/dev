import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('🔐 Authentication (Kimlik Doğrulama)', () => {
  beforeAll(async () => {
    });

  beforeEach(async () => {
    await device.reloadReactNative();
    await global.helpers.skipSplashScreen();
    await global.helpers.skipOnboarding();
  });

  describe('Kullanıcı Girişi (Login)', () => {
    it('Geçerli bilgilerle giriş yapabiliyor', async () => {
      const testUser = global.testData.users.testDriver;
      
      // Login sekmesinin aktif olduğunu kontrol et
      await detoxExpect(element(by.testID('login-tab'))).toBeVisible();
      await element(by.testID('login-tab')).tap();
      
      await global.helpers.takeScreenshot('login_form_empty');
      
      // Form doldur
      await element(by.testID('email-input')).typeText(testUser.email);
      await element(by.testID('password-input')).typeText(testUser.password);
      
      await global.helpers.takeScreenshot('login_form_filled');
      
      // Giriş yap butonuna tıkla
      await element(by.testID('login-button')).tap();
      
      // Loading göstergesi görünmeli
      await waitFor(element(by.testID('login-loading')))
        .toBeVisible()
        .withTimeout(2000);
      
      // Ana ekrana yönlendirilmeyi bekle
      await waitFor(element(by.testID('home-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await global.helpers.takeScreenshot('login_success_home');
      
      // Ana ekran elementlerini kontrol et
      await detoxExpect(element(by.testID('greeting-header'))).toBeVisible();
      await detoxExpect(element(by.testID('quick-actions'))).toBeVisible();
      
      });

    it('Geçersiz email ile giriş yapamıyor', async () => {
      await element(by.testID('login-tab')).tap();
      
      // Geçersiz email formatı
      await element(by.testID('email-input')).typeText('gecersiz-email');
      await element(by.testID('password-input')).typeText('TestPassword123!');
      
      await element(by.testID('login-button')).tap();
      
      // Hata mesajının göründüğünü kontrol et
      await waitFor(element(by.testID('email-error-message')))
        .toBeVisible()
        .withTimeout(3000);
      
      await global.helpers.takeScreenshot('login_invalid_email_error');
      
      });

    it('Yanlış şifre ile giriş yapamıyor', async () => {
      const testUser = global.testData.users.testDriver;
      
      await element(by.testID('login-tab')).tap();
      
      await element(by.testID('email-input')).typeText(testUser.email);
      await element(by.testID('password-input')).typeText('YanlisPassword123!');
      
      await element(by.testID('login-button')).tap();
      
      // Hata mesajını bekle
      await waitFor(element(by.text('Email veya şifre hatalı')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('login_wrong_password_error');
      
      });

    it('Boş alanlarla giriş yapamıyor', async () => {
      await element(by.testID('login-tab')).tap();
      
      // Boş form ile giriş yapmaya çalış
      await element(by.testID('login-button')).tap();
      
      // Validation hata mesajlarını kontrol et
      await waitFor(element(by.testID('email-error-message')))
        .toBeVisible()
        .withTimeout(2000);
      
      await waitFor(element(by.testID('password-error-message')))
        .toBeVisible()
        .withTimeout(2000);
      
      await global.helpers.takeScreenshot('login_empty_form_errors');
      
      });

    it('Şifre göster/gizle işlevi çalışıyor', async () => {
      await element(by.testID('login-tab')).tap();
      
      await element(by.testID('password-input')).typeText('TestPassword123!');
      
      // Şifre gizli olduğunu kontrol et (secure text entry)
      await detoxExpect(element(by.testID('password-input'))).toHaveToggleValue(true);
      
      // Şifre göster butonuna tıkla
      await element(by.testID('password-toggle-button')).tap();
      
      // Şifre görünür olduğunu kontrol et
      await detoxExpect(element(by.testID('password-input'))).toHaveToggleValue(false);
      
      await global.helpers.takeScreenshot('password_visible');
      
      // Tekrar gizle
      await element(by.testID('password-toggle-button')).tap();
      await detoxExpect(element(by.testID('password-input'))).toHaveToggleValue(true);
      
      });
  });

  describe('Kullanıcı Kaydı (Register)', () => {
    it('Yeni kullanıcı kaydı oluşturabiliyor', async () => {
      // Register sekmesine geç
      await element(by.testID('register-tab')).tap();
      
      await global.helpers.takeScreenshot('register_form_empty');
      
      // Benzersiz email için timestamp ekle
      const timestamp = Date.now();
      const testUser = {
        name: 'Test',
        surname: 'User',
        email: `test.user.${timestamp}@rektefe.com`,
        phone: '+905551234567',
        password: 'TestUser123!'
      };
      
      // Form doldur
      await element(by.testID('register-name-input')).typeText(testUser.name);
      await element(by.testID('register-surname-input')).typeText(testUser.surname);
      await element(by.testID('register-email-input')).typeText(testUser.email);
      await element(by.testID('register-phone-input')).typeText(testUser.phone);
      await element(by.testID('register-password-input')).typeText(testUser.password);
      
      // Kullanım şartlarını kabul et
      await element(by.testID('terms-checkbox')).tap();
      
      await global.helpers.takeScreenshot('register_form_filled');
      
      // Kayıt ol butonuna tıkla
      await element(by.testID('register-button')).tap();
      
      // Loading göstergesi
      await waitFor(element(by.testID('register-loading')))
        .toBeVisible()
        .withTimeout(2000);
      
      // Başarı mesajı veya ana ekrana yönlendirme
      try {
        // Başarı mesajı varsa bekle
        await waitFor(element(by.text('Kayıt başarıyla tamamlandı')))
          .toBeVisible()
          .withTimeout(5000);
        
        await global.helpers.takeScreenshot('register_success_message');
        
        // Ana ekrana yönlendirilmeyi bekle
        await waitFor(element(by.testID('home-screen')))
          .toBeVisible()
          .withTimeout(10000);
      } catch {
        // Direkt ana ekrana yönlendirilmiş olabilir
        await waitFor(element(by.testID('home-screen')))
          .toBeVisible()
          .withTimeout(10000);
      }
      
      await global.helpers.takeScreenshot('register_success_home');
      
      });

    it('Zaten kayıtlı email ile kayıt olamıyor', async () => {
      const existingUser = global.testData.users.testDriver;
      
      await element(by.testID('register-tab')).tap();
      
      // Mevcut kullanıcının email'ini kullan
      await element(by.testID('register-name-input')).typeText('Test');
      await element(by.testID('register-surname-input')).typeText('User');
      await element(by.testID('register-email-input')).typeText(existingUser.email);
      await element(by.testID('register-phone-input')).typeText('+905551234568');
      await element(by.testID('register-password-input')).typeText('TestUser123!');
      
      await element(by.testID('terms-checkbox')).tap();
      await element(by.testID('register-button')).tap();
      
      // Hata mesajını bekle
      await waitFor(element(by.text('Bu email adresi zaten kayıtlı')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('register_duplicate_email_error');
      
      });

    it('Geçersiz telefon numarası ile kayıt olamıyor', async () => {
      await element(by.testID('register-tab')).tap();
      
      const timestamp = Date.now();
      await element(by.testID('register-name-input')).typeText('Test');
      await element(by.testID('register-surname-input')).typeText('User');
      await element(by.testID('register-email-input')).typeText(`test${timestamp}@test.com`);
      await element(by.testID('register-phone-input')).typeText('123'); // Geçersiz format
      await element(by.testID('register-password-input')).typeText('TestUser123!');
      
      await element(by.testID('terms-checkbox')).tap();
      await element(by.testID('register-button')).tap();
      
      // Telefon validation hatası
      await waitFor(element(by.testID('phone-error-message')))
        .toBeVisible()
        .withTimeout(3000);
      
      await global.helpers.takeScreenshot('register_invalid_phone_error');
      
      });

    it('Şartları kabul etmeden kayıt olamıyor', async () => {
      await element(by.testID('register-tab')).tap();
      
      const timestamp = Date.now();
      await element(by.testID('register-name-input')).typeText('Test');
      await element(by.testID('register-surname-input')).typeText('User');
      await element(by.testID('register-email-input')).typeText(`test${timestamp}@test.com`);
      await element(by.testID('register-phone-input')).typeText('+905551234567');
      await element(by.testID('register-password-input')).typeText('TestUser123!');
      
      // Şartları kabul etme
      await element(by.testID('register-button')).tap();
      
      // Hata mesajı
      await waitFor(element(by.text('Kullanım şartlarını kabul etmelisiniz')))
        .toBeVisible()
        .withTimeout(3000);
      
      await global.helpers.takeScreenshot('register_terms_not_accepted_error');
      
      });
  });

  describe('Şifre Sıfırlama', () => {
    it('Şifremi unuttum linki çalışıyor', async () => {
      await element(by.testID('login-tab')).tap();
      
      // Şifremi unuttum linkine tıkla
      await element(by.testID('forgot-password-link')).tap();
      
      // Şifre sıfırlama ekranına yönlendirildiğini kontrol et
      await waitFor(element(by.testID('forgot-password-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      await global.helpers.takeScreenshot('forgot_password_screen');
      
      });

    it('Geçerli email ile şifre sıfırlama talebi gönderiyor', async () => {
      await element(by.testID('login-tab')).tap();
      await element(by.testID('forgot-password-link')).tap();
      
      const testUser = global.testData.users.testDriver;
      
      // Email gir
      await element(by.testID('forgot-email-input')).typeText(testUser.email);
      
      await global.helpers.takeScreenshot('forgot_password_email_entered');
      
      // Gönder butonuna tıkla
      await element(by.testID('send-reset-email-button')).tap();
      
      // Başarı mesajını bekle
      await waitFor(element(by.text('Şifre sıfırlama linki email adresinize gönderildi')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('forgot_password_success');
      
      });
  });

  describe('Logout İşlemi', () => {
    it('Kullanıcı çıkış yapabiliyor', async () => {
      // Önce giriş yap
      await global.helpers.loginUser(
        global.testData.users.testDriver.email,
        global.testData.users.testDriver.password
      );
      
      // Profile/Settings ekranına git
      await global.helpers.navigateToTab('support');
      
      // Çıkış yap butonunu bul ve tıkla
      await element(by.testID('logout-button')).tap();
      
      // Onay dialog'unu kontrol et
      await waitFor(element(by.text('Çıkış yapmak istediğinizden emin misiniz?')))
        .toBeVisible()
        .withTimeout(3000);
      
      await element(by.text('Evet')).tap();
      
      // Auth ekranına yönlendirildiğini kontrol et
      await waitFor(element(by.testID('auth-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('logout_success');
      
      });
  });
});
