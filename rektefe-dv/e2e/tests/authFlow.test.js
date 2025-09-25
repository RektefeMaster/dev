const { TestUtils, testData } = require('../utils/testUtils');

describe('Auth Flow Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Onboarding Flow', () => {
    it('should complete onboarding successfully', async () => {
      // Onboarding ekranının görünür olduğunu kontrol et
      await TestUtils.waitForElement('onboarding-screen');

      // İlk onboarding sayfasını kontrol et
      await TestUtils.waitForText('Reklam Rektefe\'ye Hoş Geldiniz');

      // Devam butonuna tıkla
      await TestUtils.tapElement('onboarding-next-1');

      // İkinci sayfa
      await TestUtils.waitForText('Kolay Randevu Sistemi');

      // Devam butonuna tıkla
      await TestUtils.tapElement('onboarding-next-2');

      // Üçüncü sayfa
      await TestUtils.waitForText('Güvenli Ödeme');

      // Başla butonuna tıkla
      await TestUtils.tapElement('onboarding-start');

      // Auth ekranına yönlendirildiğini kontrol et
      await TestUtils.waitForElement('auth-screen');
    });

    it('should skip onboarding if already completed', async () => {
      // Eğer onboarding tamamlanmışsa doğrudan auth ekranına gitmeli
      await TestUtils.waitForElement('auth-screen');
    });
  });

  describe('Login Flow', () => {
    it('should login with valid credentials', async () => {
      // Auth ekranına git
      await TestUtils.waitForElement('auth-screen');

      // Giriş sekmesine tıkla
      await TestUtils.tapElement('login-tab');

      // Email input'una değer gir
      await TestUtils.clearAndTypeText('email-input', testData.auth.validUser.email);

      // Password input'una değer gir
      await TestUtils.clearAndTypeText('password-input', testData.auth.validUser.password);

      // Giriş butonuna tıkla
      await TestUtils.tapElement('login-button');

      // Ana ekran yüklenene kadar bekle
      await TestUtils.waitForElement('home-screen', 15000);

      // Ana ekran elementlerini kontrol et
      await TestUtils.waitForElement('home-greeting');
      await TestUtils.waitForElement('bottom-tab-bar');
    });

    it('should show error for invalid credentials', async () => {
      // Auth ekranına git
      await TestUtils.waitForElement('auth-screen');

      // Giriş sekmesine tıkla
      await TestUtils.tapElement('login-tab');

      // Geçersiz email gir
      await TestUtils.clearAndTypeText('email-input', testData.auth.invalidUser.email);

      // Geçersiz password gir
      await TestUtils.clearAndTypeText('password-input', testData.auth.invalidUser.password);

      // Giriş butonuna tıkla
      await TestUtils.tapElement('login-button');

      // Hata mesajını kontrol et
      await TestUtils.waitForText('Geçersiz kullanıcı adı veya şifre');
    });

    it('should show validation errors for empty fields', async () => {
      // Auth ekranına git
      await TestUtils.waitForElement('auth-screen');

      // Giriş sekmesine tıkla
      await TestUtils.tapElement('login-tab');

      // Email ve password boş bırak
      await TestUtils.clearAndTypeText('email-input', '');
      await TestUtils.clearAndTypeText('password-input', '');

      // Giriş butonuna tıkla
      await TestUtils.tapElement('login-button');

      // Validasyon hatalarını kontrol et
      await TestUtils.waitForText('Email gereklidir');
      await TestUtils.waitForText('Şifre gereklidir');
    });
  });

  describe('Register Flow', () => {
    it('should register new user successfully', async () => {
      // Auth ekranına git
      await TestUtils.waitForElement('auth-screen');

      // Kayıt sekmesine tıkla
      await TestUtils.tapElement('register-tab');

      // İsim gir
      await TestUtils.clearAndTypeText('register-name-input', testData.auth.newUser.name);

      // Soyisim gir
      await TestUtils.clearAndTypeText('register-surname-input', testData.auth.newUser.surname);

      // Email gir
      await TestUtils.clearAndTypeText('register-email-input', testData.auth.newUser.email);

      // Telefon gir
      await TestUtils.clearAndTypeText('register-phone-input', testData.auth.newUser.phone);

      // Şifre gir
      await TestUtils.clearAndTypeText('register-password-input', testData.auth.newUser.password);

      // Şifre tekrar gir
      await TestUtils.clearAndTypeText('register-password-confirm-input', testData.auth.newUser.password);

      // Kullanım koşullarını kabul et
      await TestUtils.tapElement('terms-checkbox');

      // Kayıt butonuna tıkla
      await TestUtils.tapElement('register-button');

      // Başarılı kayıt mesajını kontrol et
      await TestUtils.waitForText('Kayıt başarılı');

      // Ana ekrana yönlendirildiğini kontrol et
      await TestUtils.waitForElement('home-screen');
    });

    it('should show validation errors for invalid registration data', async () => {
      // Auth ekranına git
      await TestUtils.waitForElement('auth-screen');

      // Kayıt sekmesine tıkla
      await TestUtils.tapElement('register-tab');

      // Geçersiz veriler gir
      await TestUtils.clearAndTypeText('register-email-input', 'invalid-email');
      await TestUtils.clearAndTypeText('register-password-input', '123');
      await TestUtils.clearAndTypeText('register-password-confirm-input', '456');

      // Kayıt butonuna tıkla
      await TestUtils.tapElement('register-button');

      // Validasyon hatalarını kontrol et
      await TestUtils.waitForText('Geçerli bir email adresi giriniz');
      await TestUtils.waitForText('Şifre en az 6 karakter olmalıdır');
      await TestUtils.waitForText('Şifreler eşleşmiyor');
    });
  });

  describe('Forgot Password Flow', () => {
    it('should send reset password email successfully', async () => {
      // Auth ekranına git
      await TestUtils.waitForElement('auth-screen');

      // Şifremi unuttum linkine tıkla
      await TestUtils.tapElement('forgot-password-link');

      // Şifre sıfırlama ekranının açıldığını kontrol et
      await TestUtils.waitForElement('forgot-password-screen');

      // Email gir
      await TestUtils.clearAndTypeText('forgot-email-input', testData.auth.validUser.email);

      // Gönder butonuna tıkla
      await TestUtils.tapElement('send-reset-button');

      // Başarılı mesajı kontrol et
      await TestUtils.waitForText('Şifre sıfırlama bağlantısı gönderildi');
    });

    it('should show error for invalid email in forgot password', async () => {
      // Auth ekranına git
      await TestUtils.waitForElement('auth-screen');

      // Şifremi unuttum linkine tıkla
      await TestUtils.tapElement('forgot-password-link');

      // Geçersiz email gir
      await TestUtils.clearAndTypeText('forgot-email-input', 'invalid-email');

      // Gönder butonuna tıkla
      await TestUtils.tapElement('send-reset-button');

      // Hata mesajını kontrol et
      await TestUtils.waitForText('Geçerli bir email adresi giriniz');
    });
  });

  describe('Logout Flow', () => {
    it('should logout successfully', async () => {
      // Giriş yapmış kullanıcı ile ana ekrana git
      await TestUtils.waitForElement('home-screen');

      // Profil ekranına git
      await TestUtils.tapElement('profile-tab');

      // Profil ekranı yüklenene kadar bekle
      await TestUtils.waitForElement('profile-screen');

      // Çıkış yap butonuna tıkla
      await TestUtils.tapElement('logout-button');

      // Onay dialog'unu kontrol et
      await TestUtils.waitForText('Çıkış yapmak istediğinizden emin misiniz?');

      // Evet butonuna tıkla
      await TestUtils.tapElement('logout-confirm-button');

      // Auth ekranına yönlendirildiğini kontrol et
      await TestUtils.waitForElement('auth-screen');
    });
  });
});
