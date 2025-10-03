import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('🚗 REKTEFE-DV - Kapsamlı Şöför Kimlik Doğrulama Testleri', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await waitFor(element(by.testID('auth-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });

  describe('👤 Şöför Kayıt İşlemleri', () => {
    it('Yeni şöför kaydı oluşturabiliyor', async () => {
      console.log('📝 Test: Yeni şöför kaydı oluşturma');
      
      // Register sekmesine geç
      await element(by.testID('register-tab')).tap();
      await waitFor(element(by.testID('register-screen')))
        .toBeVisible()
        .withTimeout(3000);

      const timestamp = Date.now();
      const testDriver = {
        name: 'Test',
        surname: 'Şöför',
        email: `test.sofor.${timestamp}@rektefe.com`,
        phone: '+905551234567',
        password: 'TestSofor123!',
        licenseNumber: `B${timestamp.toString().slice(-8)}`,
        licenseClass: 'B',
        vehicleType: 'otomobil'
      };

      // Kişisel bilgiler
      await element(by.testID('register-name-input')).typeText(testDriver.name);
      await element(by.testID('register-surname-input')).typeText(testDriver.surname);
      await element(by.testID('register-email-input')).typeText(testDriver.email);
      await element(by.testID('register-phone-input')).typeText(testDriver.phone);
      await element(by.testID('register-password-input')).typeText(testDriver.password);

      // Ehliyet bilgileri
      await element(by.testID('license-number-input')).typeText(testDriver.licenseNumber);
      await element(by.testID('license-class-input')).tap();
      await element(by.testID('license-class-B')).tap();

      // Araç bilgileri
      await element(by.testID('vehicle-type-input')).tap();
      await element(by.testID('vehicle-type-car')).tap();

      // Şartları kabul et
      await element(by.testID('terms-checkbox')).tap();
      await element(by.testID('privacy-checkbox')).tap();

      // Kayıt ol butonuna tıkla
      await element(by.testID('register-button')).tap();

      // Başarı mesajını bekle
      await waitFor(element(by.text('Kayıt başarıyla tamamlandı')))
        .toBeVisible()
        .withTimeout(10000);

      // Ana ekrana yönlendirildiğini kontrol et
      await waitFor(element(by.testID('home-screen')))
        .toBeVisible()
        .withTimeout(10000);

      console.log('✅ Yeni şöför kaydı başarıyla oluşturuldu');
    });

    it('Ehliyet numarası girmeden kayıt olamıyor', async () => {
      console.log('📝 Test: Ehliyet numarası girmeden kayıt denemesi');
      
      await element(by.testID('register-tab')).tap();
      
      const timestamp = Date.now();
      await element(by.testID('register-name-input')).typeText('Test');
      await element(by.testID('register-surname-input')).typeText('Şöför');
      await element(by.testID('register-email-input')).typeText(`test${timestamp}@test.com`);
      await element(by.testID('register-phone-input')).typeText('+905551234567');
      await element(by.testID('register-password-input')).typeText('TestSofor123!');
      // Ehliyet numarası girmeyi unut

      await element(by.testID('license-class-input')).tap();
      await element(by.testID('license-class-B')).tap();
      await element(by.testID('vehicle-type-input')).tap();
      await element(by.testID('vehicle-type-car')).tap();
      await element(by.testID('terms-checkbox')).tap();
      await element(by.testID('register-button')).tap();

      // Hata mesajını bekle
      await waitFor(element(by.text('Ehliyet numarası gereklidir')))
        .toBeVisible()
        .withTimeout(3000);

      console.log('✅ Ehliyet numarası hatası doğrulandı');
    });

    it('Geçersiz ehliyet sınıfı ile kayıt olamıyor', async () => {
      console.log('📝 Test: Geçersiz ehliyet sınıfı ile kayıt denemesi');
      
      await element(by.testID('register-tab')).tap();
      
      const timestamp = Date.now();
      await element(by.testID('register-name-input')).typeText('Test');
      await element(by.testID('register-surname-input')).typeText('Şöför');
      await element(by.testID('register-email-input')).typeText(`test${timestamp}@test.com`);
      await element(by.testID('register-phone-input')).typeText('+905551234567');
      await element(by.testID('register-password-input')).typeText('TestSofor123!');
      await element(by.testID('license-number-input')).typeText(`B${timestamp.toString().slice(-8)}`);

      // Ehliyet sınıfı seçmeyi unut
      await element(by.testID('vehicle-type-input')).tap();
      await element(by.testID('vehicle-type-car')).tap();
      await element(by.testID('terms-checkbox')).tap();
      await element(by.testID('register-button')).tap();

      // Hata mesajını bekle
      await waitFor(element(by.text('Ehliyet sınıfı seçmelisiniz')))
        .toBeVisible()
        .withTimeout(3000);

      console.log('✅ Ehliyet sınıfı hatası doğrulandı');
    });
  });

  describe('🔑 Şöför Giriş İşlemleri', () => {
    it('Geçerli bilgilerle giriş yapabiliyor', async () => {
      console.log('📝 Test: Geçerli bilgilerle şöför girişi');
      
      const testDriver = {
        email: 'test.sofor@rektefe.com',
        password: 'TestSofor123!'
      };

      await element(by.testID('login-tab')).tap();
      await element(by.testID('email-input')).typeText(testDriver.email);
      await element(by.testID('password-input')).typeText(testDriver.password);
      await element(by.testID('login-button')).tap();

      // Ana ekrana yönlendirildiğini kontrol et
      await waitFor(element(by.testID('home-screen')))
        .toBeVisible()
        .withTimeout(10000);

      // Şöför dashboard'ının göründüğünü kontrol et
      await detoxExpect(element(by.testID('greeting-header'))).toBeVisible();
      await detoxExpect(element(by.testID('quick-actions'))).toBeVisible();
      await detoxExpect(element(by.testID('nearby-mechanics'))).toBeVisible();

      console.log('✅ Şöför girişi başarılı');
    });

    it('Yanlış şifre ile giriş yapamıyor', async () => {
      console.log('📝 Test: Yanlış şifre ile giriş denemesi');
      
      await element(by.testID('login-tab')).tap();
      await element(by.testID('email-input')).typeText('test.sofor@rektefe.com');
      await element(by.testID('password-input')).typeText('YanlisSifre123!');
      await element(by.testID('login-button')).tap();

      // Hata mesajını bekle
      await waitFor(element(by.text('Email veya şifre hatalı')))
        .toBeVisible()
        .withTimeout(5000);

      console.log('✅ Yanlış şifre hatası doğrulandı');
    });

    it('Şifre sıfırlama talebi gönderebiliyor', async () => {
      console.log('📝 Test: Şifre sıfırlama talebi');
      
      await element(by.testID('login-tab')).tap();
      await element(by.testID('forgot-password-link')).tap();

      await waitFor(element(by.testID('forgot-password-screen')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.testID('forgot-email-input')).typeText('test.sofor@rektefe.com');
      await element(by.testID('send-reset-email-button')).tap();

      // Başarı mesajını bekle
      await waitFor(element(by.text('Şifre sıfırlama linki email adresinize gönderildi')))
        .toBeVisible()
        .withTimeout(5000);

      console.log('✅ Şifre sıfırlama talebi başarılı');
    });
  });

  describe('🚪 Çıkış İşlemleri', () => {
    it('Şöför çıkış yapabiliyor', async () => {
      console.log('📝 Test: Şöför çıkış işlemi');
      
      // Önce giriş yap
      await element(by.testID('login-tab')).tap();
      await element(by.testID('email-input')).typeText('test.sofor@rektefe.com');
      await element(by.testID('password-input')).typeText('TestSofor123!');
      await element(by.testID('login-button')).tap();

      await waitFor(element(by.testID('home-screen')))
        .toBeVisible()
        .withTimeout(10000);

      // Profile/Settings sekmesine git
      await element(by.testID('profile-tab')).tap();
      await waitFor(element(by.testID('profile-screen')))
        .toBeVisible()
        .withTimeout(3000);

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

      console.log('✅ Şöför çıkışı başarılı');
    });
  });
});
