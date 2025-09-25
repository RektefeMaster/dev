const { TestUtils, testData } = require('../utils/testUtils');

describe('Profile Tests', () => {
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

  describe('Profile Screen', () => {
    it('should display profile information', async () => {
      // Profil sekmesine git
      await TestUtils.tapElement('profile-tab');
      await TestUtils.waitForElement('profile-screen');

      // Profil bilgilerini kontrol et
      await TestUtils.waitForElement('profile-avatar');
      await TestUtils.waitForElement('profile-name');
      await TestUtils.waitForElement('profile-email');
      await TestUtils.waitForElement('profile-phone');
      await TestUtils.waitForElement('profile-join-date');
      await TestUtils.waitForElement('profile-stats');
    });

    it('should navigate to profile sections', async () => {
      // Profil sekmesine git
      await TestUtils.tapElement('profile-tab');
      await TestUtils.waitForElement('profile-screen');

      // Profil düzenle butonuna tıkla
      await TestUtils.tapElement('edit-profile-button');
      await TestUtils.waitForElement('edit-profile-screen');
      await device.pressBack();

      // Şifre değiştir butonuna tıkla
      await TestUtils.tapElement('change-password-button');
      await TestUtils.waitForElement('change-password-screen');
      await device.pressBack();

      // Adreslerim butonuna tıkla
      await TestUtils.tapElement('addresses-button');
      await TestUtils.waitForElement('addresses-screen');
      await device.pressBack();

      // Araçlarım butonuna tıkla
      await TestUtils.tapElement('vehicles-button');
      await TestUtils.waitForElement('vehicles-screen');
      await device.pressBack();

      // Bildirim ayarları butonuna tıkla
      await TestUtils.tapElement('notification-settings-button');
      await TestUtils.waitForElement('notification-settings-screen');
      await device.pressBack();
    });
  });

  describe('Edit Profile', () => {
    it('should update profile information successfully', async () => {
      // Profil düzenle ekranına git
      await TestUtils.tapElement('profile-tab');
      await TestUtils.tapElement('edit-profile-button');
      await TestUtils.waitForElement('edit-profile-screen');

      // İsim güncelle
      await TestUtils.clearAndTypeText('edit-first-name', testData.profile.valid.name);

      // Soyisim güncelle
      await TestUtils.clearAndTypeText('edit-last-name', testData.profile.valid.surname);

      // Telefon güncelle
      await TestUtils.clearAndTypeText('edit-phone', testData.profile.valid.phone);

      // Adres güncelle
      await TestUtils.clearAndTypeText('edit-address', testData.profile.valid.address);

      // Profil fotoğrafı değiştir
      await TestUtils.tapElement('change-avatar-button');
      await TestUtils.waitForElement('avatar-picker-modal');
      await TestUtils.tapElement('gallery-option');
      await TestUtils.waitForElement('photo-picker');
      await TestUtils.tapElement('select-avatar-photo');

      // Kaydet butonuna tıkla
      await TestUtils.tapElement('save-profile-button');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Profil bilgileriniz güncellendi');

      // Profil ekranına geri döndüğünü kontrol et
      await TestUtils.waitForElement('profile-screen');

      // Güncellenmiş bilgileri kontrol et
      await TestUtils.waitForText(testData.profile.valid.name);
    });

    it('should validate profile update form', async () => {
      // Profil düzenle ekranına git
      await TestUtils.tapElement('profile-tab');
      await TestUtils.tapElement('edit-profile-button');
      await TestUtils.waitForElement('edit-profile-screen');

      // Geçersiz telefon numarası gir
      await TestUtils.clearAndTypeText('edit-phone', 'invalid-phone');

      // Boş isim gir
      await TestUtils.clearAndTypeText('edit-first-name', '');

      // Kaydet butonuna tıkla
      await TestUtils.tapElement('save-profile-button');

      // Validasyon hatalarını kontrol et
      await TestUtils.waitForText('İsim gereklidir');
      await TestUtils.waitForText('Geçerli bir telefon numarası giriniz');
    });
  });

  describe('Change Password', () => {
    it('should change password successfully', async () => {
      // Şifre değiştir ekranına git
      await TestUtils.tapElement('profile-tab');
      await TestUtils.tapElement('change-password-button');
      await TestUtils.waitForElement('change-password-screen');

      // Mevcut şifre gir
      await TestUtils.clearAndTypeText('current-password', testData.auth.validUser.password);

      // Yeni şifre gir
      await TestUtils.clearAndTypeText('new-password', 'NewTest123456');

      // Yeni şifre tekrar gir
      await TestUtils.clearAndTypeText('confirm-new-password', 'NewTest123456');

      // Değiştir butonuna tıkla
      await TestUtils.tapElement('change-password-button');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Şifreniz başarıyla değiştirildi');

      // Otomatik çıkış yapıldığını kontrol et
      await TestUtils.waitForElement('auth-screen');
    });

    it('should validate password change form', async () => {
      // Şifre değiştir ekranına git
      await TestUtils.tapElement('profile-tab');
      await TestUtils.tapElement('change-password-button');
      await TestUtils.waitForElement('change-password-screen');

      // Geçersiz mevcut şifre gir
      await TestUtils.clearAndTypeText('current-password', 'wrongpassword');

      // Kısa yeni şifre gir
      await TestUtils.clearAndTypeText('new-password', '123');

      // Eşleşmeyen şifre tekrarı gir
      await TestUtils.clearAndTypeText('confirm-new-password', '456');

      // Değiştir butonuna tıkla
      await TestUtils.tapElement('change-password-button');

      // Validasyon hatalarını kontrol et
      await TestUtils.waitForText('Mevcut şifre yanlış');
      await TestUtils.waitForText('Şifre en az 6 karakter olmalıdır');
      await TestUtils.waitForText('Şifreler eşleşmiyor');
    });
  });

  describe('Addresses Management', () => {
    it('should add new address', async () => {
      // Adresler ekranına git
      await TestUtils.tapElement('profile-tab');
      await TestUtils.tapElement('addresses-button');
      await TestUtils.waitForElement('addresses-screen');

      // Yeni adres ekle butonuna tıkla
      await TestUtils.tapElement('add-address-button');
      await TestUtils.waitForElement('add-address-screen');

      // Adres başlığı gir
      await TestUtils.clearAndTypeText('address-title', 'Ev Adresim');

      // Adres detaylarını gir
      await TestUtils.clearAndTypeText('address-street', 'Atatürk Caddesi No: 123');
      await TestUtils.clearAndTypeText('address-city', 'İstanbul');
      await TestUtils.clearAndTypeText('address-district', 'Kadıköy');
      await TestUtils.clearAndTypeText('address-postal-code', '34700');

      // Harita ile konum seç
      await TestUtils.tapElement('select-location-map');
      await TestUtils.waitForElement('map-picker-modal');
      await TestUtils.tapElement('confirm-map-location');

      // Kaydet butonuna tıkla
      await TestUtils.tapElement('save-address-button');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Adres başarıyla eklendi');

      // Adres listesinde göründüğünü kontrol et
      await TestUtils.waitForElement('address-item-0');
      await TestUtils.waitForText('Ev Adresim');
    });

    it('should edit existing address', async () => {
      // Adresler ekranına git
      await TestUtils.tapElement('profile-tab');
      await TestUtils.tapElement('addresses-button');
      await TestUtils.waitForElement('addresses-screen');

      // İlk adresi düzenle
      await TestUtils.tapElement('address-item-0');
      await TestUtils.waitForElement('edit-address-screen');

      // Adres başlığını güncelle
      await TestUtils.clearAndTypeText('address-title', 'Güncellenmiş Ev Adresim');

      // Kaydet butonuna tıkla
      await TestUtils.tapElement('save-address-button');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Adres güncellendi');

      // Güncellenmiş adresi kontrol et
      await TestUtils.waitForText('Güncellenmiş Ev Adresim');
    });

    it('should delete address', async () => {
      // Adresler ekranına git
      await TestUtils.tapElement('profile-tab');
      await TestUtils.tapElement('addresses-button');
      await TestUtils.waitForElement('addresses-screen');

      // İlk adresi sil
      await TestUtils.tapElement('address-item-0');
      await TestUtils.waitForElement('edit-address-screen');

      // Sil butonuna tıkla
      await TestUtils.tapElement('delete-address-button');

      // Onay dialog'unu kontrol et
      await TestUtils.waitForText('Adresi silmek istediğinizden emin misiniz?');

      // Evet butonuna tıkla
      await TestUtils.tapElement('confirm-delete-address');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Adres silindi');
    });

    it('should set default address', async () => {
      // Adresler ekranına git
      await TestUtils.tapElement('profile-tab');
      await TestUtils.tapElement('addresses-button');
      await TestUtils.waitForElement('addresses-screen');

      // İlk adresi varsayılan yap
      await TestUtils.tapElement('address-item-0');
      await TestUtils.waitForElement('edit-address-screen');

      // Varsayılan yap butonuna tıkla
      await TestUtils.tapElement('set-default-address');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Varsayılan adres güncellendi');

      // Varsayılan işaretini kontrol et
      await TestUtils.waitForElement('default-address-indicator');
    });
  });

  describe('Vehicles Management', () => {
    it('should add new vehicle', async () => {
      // Araçlar ekranına git
      await TestUtils.tapElement('profile-tab');
      await TestUtils.tapElement('vehicles-button');
      await TestUtils.waitForElement('vehicles-screen');

      // Yeni araç ekle butonuna tıkla
      await TestUtils.tapElement('add-vehicle-button');
      await TestUtils.waitForElement('add-vehicle-screen');

      // Araç bilgilerini gir
      await TestUtils.clearAndTypeText('vehicle-brand', 'Toyota');
      await TestUtils.clearAndTypeText('vehicle-model', 'Corolla');
      await TestUtils.clearAndTypeText('vehicle-year', '2020');
      await TestUtils.clearAndTypeText('vehicle-license-plate', '34 ABC 123');

      // Yakıt tipini seç
      await TestUtils.tapElement('fuel-type-picker');
      await TestUtils.waitForElement('fuel-type-modal');
      await TestUtils.tapText('Benzin');
      await TestUtils.tapElement('fuel-confirm');

      // Vites tipini seç
      await TestUtils.tapElement('transmission-picker');
      await TestUtils.tapText('Otomatik');
      await TestUtils.tapElement('transmission-confirm');

      // Araç fotoğrafı ekle
      await TestUtils.tapElement('add-vehicle-photo');
      await TestUtils.tapElement('camera-option');
      await TestUtils.sleep(2000); // Fotoğraf çekme simülasyonu

      // Kaydet butonuna tıkla
      await TestUtils.tapElement('save-vehicle-button');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Araç başarıyla eklendi');

      // Araç listesinde göründüğünü kontrol et
      await TestUtils.waitForElement('vehicle-item-0');
      await TestUtils.waitForText('Toyota Corolla');
    });

    it('should edit vehicle information', async () => {
      // Araçlar ekranına git
      await TestUtils.tapElement('profile-tab');
      await TestUtils.tapElement('vehicles-button');
      await TestUtils.waitForElement('vehicles-screen');

      // İlk aracı düzenle
      await TestUtils.tapElement('vehicle-item-0');
      await TestUtils.waitForElement('edit-vehicle-screen');

      // Araç modelini güncelle
      await TestUtils.clearAndTypeText('vehicle-model', 'Camry');

      // Kaydet butonuna tıkla
      await TestUtils.tapElement('save-vehicle-button');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Araç bilgileri güncellendi');

      // Güncellenmiş aracı kontrol et
      await TestUtils.waitForText('Toyota Camry');
    });
  });

  describe('Notification Settings', () => {
    it('should update notification preferences', async () => {
      // Bildirim ayarları ekranına git
      await TestUtils.tapElement('profile-tab');
      await TestUtils.tapElement('notification-settings-button');
      await TestUtils.waitForElement('notification-settings-screen');

      // Push bildirimlerini aç
      await TestUtils.tapElement('push-notifications-toggle');

      // Email bildirimlerini kapat
      await TestUtils.tapElement('email-notifications-toggle');

      // SMS bildirimlerini aç
      await TestUtils.tapElement('sms-notifications-toggle');

      // Randevu hatırlatmalarını aç
      await TestUtils.tapElement('appointment-reminders-toggle');

      // Kampanya bildirimlerini kapat
      await TestUtils.tapElement('campaign-notifications-toggle');

      // Kaydet butonuna tıkla
      await TestUtils.tapElement('save-notification-settings');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Bildirim ayarlarınız güncellendi');
    });

    it('should configure notification schedules', async () => {
      // Bildirim ayarları ekranına git
      await TestUtils.tapElement('profile-tab');
      await TestUtils.tapElement('notification-settings-button');
      await TestUtils.waitForElement('notification-settings-screen');

      // Sessiz saat ayarı butonuna tıkla
      await TestUtils.tapElement('quiet-hours-button');
      await TestUtils.waitForElement('quiet-hours-modal');

      // Başlangıç saatini ayarla
      await TestUtils.tapElement('quiet-start-time');
      await TestUtils.tapText('22:00');
      await TestUtils.tapElement('time-confirm');

      // Bitiş saatini ayarla
      await TestUtils.tapElement('quiet-end-time');
      await TestUtils.tapText('08:00');
      await TestUtils.tapElement('time-confirm');

      // Kaydet butonuna tıkla
      await TestUtils.tapElement('save-quiet-hours');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Sessiz saat ayarları güncellendi');
    });
  });

  describe('Privacy Settings', () => {
    it('should manage privacy settings', async () => {
      // Profil ekranına git
      await TestUtils.tapElement('profile-tab');
      await TestUtils.waitForElement('profile-screen');

      // Gizlilik ayarları butonuna tıkla
      await TestUtils.tapElement('privacy-settings-button');
      await TestUtils.waitForElement('privacy-settings-screen');

      // Profil görünürlüğünü ayarla
      await TestUtils.tapElement('profile-visibility-picker');
      await TestUtils.waitForElement('visibility-modal');
      await TestUtils.tapText('Sadece ustalar');
      await TestUtils.tapElement('visibility-confirm');

      // Konum paylaşımını kapat
      await TestUtils.tapElement('location-sharing-toggle');

      // Kişisel bilgileri gizle
      await TestUtils.tapElement('personal-info-toggle');

      // Kaydet butonuna tıkla
      await TestUtils.tapElement('save-privacy-settings');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Gizlilik ayarlarınız güncellendi');
    });
  });

  describe('Account Deletion', () => {
    it('should handle account deletion request', async () => {
      // Profil ekranına git
      await TestUtils.tapElement('profile-tab');
      await TestUtils.waitForElement('profile-screen');

      // Hesabı sil butonuna tıkla
      await TestUtils.tapElement('delete-account-button');
      await TestUtils.waitForElement('delete-account-screen');

      // Silme nedenini seç
      await TestUtils.tapElement('deletion-reason-picker');
      await TestUtils.waitForElement('reason-modal');
      await TestUtils.tapText('Artık kullanmıyorum');
      await TestUtils.tapElement('reason-confirm');

      // Onay kutusunu işaretle
      await TestUtils.tapElement('deletion-confirmation-checkbox');

      // Şifre gir
      await TestUtils.clearAndTypeText('deletion-password', testData.auth.validUser.password);

      // Hesabı sil butonuna tıkla
      await TestUtils.tapElement('confirm-delete-account');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Hesabınız silinmek üzere işleme alındı');

      // Auth ekranına yönlendirildiğini kontrol et
      await TestUtils.waitForElement('auth-screen');
    });
  });
});
