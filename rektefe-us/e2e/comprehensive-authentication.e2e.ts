import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('🔐 REKTEFE-US - Kapsamlı Kimlik Doğrulama Testleri', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await waitFor(element(by.testID('auth-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });

  describe('👤 Usta Kayıt İşlemleri', () => {
    it('Yeni usta kaydı oluşturabiliyor', async () => {
      console.log('📝 Test: Yeni usta kaydı oluşturma');
      
      // Register sekmesine geç
      await element(by.testID('register-tab')).tap();
      await waitFor(element(by.testID('register-screen')))
        .toBeVisible()
        .withTimeout(3000);

      const timestamp = Date.now();
      const testUser = {
        name: 'Test',
        surname: 'Usta',
        email: `test.usta.${timestamp}@rektefe.com`,
        phone: '+905551234567',
        password: 'TestUsta123!',
        businessName: 'Test Oto Servis',
        businessAddress: 'Test Mahallesi, Test Caddesi No:1',
        serviceCategories: ['tamir', 'bakim']
      };

      // Kişisel bilgiler
      await element(by.testID('register-name-input')).typeText(testUser.name);
      await element(by.testID('register-surname-input')).typeText(testUser.surname);
      await element(by.testID('register-email-input')).typeText(testUser.email);
      await element(by.testID('register-phone-input')).typeText(testUser.phone);
      await element(by.testID('register-password-input')).typeText(testUser.password);

      // İş bilgileri
      await element(by.testID('business-name-input')).typeText(testUser.businessName);
      await element(by.testID('business-address-input')).typeText(testUser.businessAddress);

      // Hizmet kategorileri seç
      await element(by.testID('service-category-tamir')).tap();
      await element(by.testID('service-category-bakim')).tap();

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

      console.log('✅ Yeni usta kaydı başarıyla oluşturuldu');
    });

    it('Hizmet kategorisi seçmeden kayıt olamıyor', async () => {
      console.log('📝 Test: Hizmet kategorisi seçmeden kayıt denemesi');
      
      await element(by.testID('register-tab')).tap();
      
      const timestamp = Date.now();
      await element(by.testID('register-name-input')).typeText('Test');
      await element(by.testID('register-surname-input')).typeText('Usta');
      await element(by.testID('register-email-input')).typeText(`test${timestamp}@test.com`);
      await element(by.testID('register-phone-input')).typeText('+905551234567');
      await element(by.testID('register-password-input')).typeText('TestUsta123!');
      await element(by.testID('business-name-input')).typeText('Test Servis');
      await element(by.testID('business-address-input')).typeText('Test Adres');

      // Hizmet kategorisi seçme
      await element(by.testID('terms-checkbox')).tap();
      await element(by.testID('register-button')).tap();

      // Hata mesajını bekle
      await waitFor(element(by.text('En az bir hizmet kategorisi seçmelisiniz')))
        .toBeVisible()
        .withTimeout(3000);

      console.log('✅ Hizmet kategorisi hatası doğrulandı');
    });

    it('İş adresi girmeden kayıt olamıyor', async () => {
      console.log('📝 Test: İş adresi girmeden kayıt denemesi');
      
      await element(by.testID('register-tab')).tap();
      
      const timestamp = Date.now();
      await element(by.testID('register-name-input')).typeText('Test');
      await element(by.testID('register-surname-input')).typeText('Usta');
      await element(by.testID('register-email-input')).typeText(`test${timestamp}@test.com`);
      await element(by.testID('register-phone-input')).typeText('+905551234567');
      await element(by.testID('register-password-input')).typeText('TestUsta123!');
      await element(by.testID('business-name-input')).typeText('Test Servis');
      // İş adresi girmeyi unut

      await element(by.testID('service-category-tamir')).tap();
      await element(by.testID('terms-checkbox')).tap();
      await element(by.testID('register-button')).tap();

      // Hata mesajını bekle
      await waitFor(element(by.text('İş adresi gereklidir')))
        .toBeVisible()
        .withTimeout(3000);

      console.log('✅ İş adresi hatası doğrulandı');
    });
  });

  describe('🔑 Usta Giriş İşlemleri', () => {
    it('Geçerli bilgilerle giriş yapabiliyor', async () => {
      console.log('📝 Test: Geçerli bilgilerle usta girişi');
      
      const testUser = {
        email: 'test.usta@rektefe.com',
        password: 'TestUsta123!'
      };

      await element(by.testID('login-tab')).tap();
      await element(by.testID('email-input')).typeText(testUser.email);
      await element(by.testID('password-input')).typeText(testUser.password);
      await element(by.testID('login-button')).tap();

      // Ana ekrana yönlendirildiğini kontrol et
      await waitFor(element(by.testID('home-screen')))
        .toBeVisible()
        .withTimeout(10000);

      // Usta dashboard'ının göründüğünü kontrol et
      await detoxExpect(element(by.testID('greeting-header'))).toBeVisible();
      await detoxExpect(element(by.testID('quick-actions'))).toBeVisible();
      await detoxExpect(element(by.testID('today-agenda'))).toBeVisible();

      console.log('✅ Usta girişi başarılı');
    });

    it('Yanlış şifre ile giriş yapamıyor', async () => {
      console.log('📝 Test: Yanlış şifre ile giriş denemesi');
      
      await element(by.testID('login-tab')).tap();
      await element(by.testID('email-input')).typeText('test.usta@rektefe.com');
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

      await element(by.testID('forgot-email-input')).typeText('test.usta@rektefe.com');
      await element(by.testID('send-reset-email-button')).tap();

      // Başarı mesajını bekle
      await waitFor(element(by.text('Şifre sıfırlama linki email adresinize gönderildi')))
        .toBeVisible()
        .withTimeout(5000);

      console.log('✅ Şifre sıfırlama talebi başarılı');
    });
  });

  describe('🚪 Çıkış İşlemleri', () => {
    it('Kullanıcı çıkış yapabiliyor', async () => {
      console.log('📝 Test: Usta çıkış işlemi');
      
      // Önce giriş yap
      await element(by.testID('login-tab')).tap();
      await element(by.testID('email-input')).typeText('test.usta@rektefe.com');
      await element(by.testID('password-input')).typeText('TestUsta123!');
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

      console.log('✅ Usta çıkışı başarılı');
    });
  });
});
