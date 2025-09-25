const { TestUtils, testData } = require('../utils/testUtils');

describe('Notifications Tests', () => {
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

  describe('Notifications Screen', () => {
    it('should display notifications list', async () => {
      // Bildirimler ekranına git
      await TestUtils.tapElement('notifications-button');
      await TestUtils.waitForElement('notifications-screen');

      // Bildirim listesini kontrol et
      await TestUtils.waitForElement('notification-list');
      await TestUtils.waitForElement('notification-item-0');

      // İlk bildirimin elementlerini kontrol et
      await TestUtils.waitForElement('notification-icon');
      await TestUtils.waitForElement('notification-title');
      await TestUtils.waitForElement('notification-message');
      await TestUtils.waitForElement('notification-time');
      await TestUtils.waitForElement('notification-unread-indicator');
    });

    it('should filter notifications by type', async () => {
      // Bildirimler ekranına git
      await TestUtils.tapElement('notifications-button');
      await TestUtils.waitForElement('notifications-screen');

      // Filtre butonuna tıkla
      await TestUtils.tapElement('notification-filter-button');
      await TestUtils.waitForElement('filter-modal');

      // "Randevu" bildirimlerini seç
      await TestUtils.tapElement('filter-appointment');
      await TestUtils.tapElement('apply-filter');

      // Filtrelenmiş sonuçları kontrol et
      await TestUtils.waitForElement('filtered-notifications');
    });

    it('should mark notification as read', async () => {
      // Bildirimler ekranına git
      await TestUtils.tapElement('notifications-button');
      await TestUtils.waitForElement('notifications-screen');

      // İlk bildirime tıkla
      await TestUtils.tapElement('notification-item-0');

      // Bildirimin okundu olarak işaretlendiğini kontrol et
      await TestUtils.waitForElementNotVisible('notification-unread-indicator-0');
    });

    it('should mark all notifications as read', async () => {
      // Bildirimler ekranına git
      await TestUtils.tapElement('notifications-button');
      await TestUtils.waitForElement('notifications-screen');

      // Tümünü okundu işaretle butonuna tıkla
      await TestUtils.tapElement('mark-all-read-button');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Tüm bildirimler okundu olarak işaretlendi');

      // Okunmamış bildirim göstergelerinin kaybolduğunu kontrol et
      await TestUtils.waitForElementNotVisible('notification-unread-indicator');
    });
  });

  describe('Notification Actions', () => {
    it('should handle appointment notification', async () => {
      // Randevu bildirimi al (simüle)
      await TestUtils.waitForElement('appointment-notification');

      // Bildirime tıkla
      await TestUtils.tapElement('appointment-notification');
      await TestUtils.waitForElement('appointment-detail-screen');

      // Randevu detaylarını kontrol et
      await TestUtils.waitForElement('appointment-title');
      await TestUtils.waitForElement('appointment-datetime');
      await TestUtils.waitForElement('appointment-mechanic');
    });

    it('should handle payment notification', async () => {
      // Ödeme bildirimi al (simüle)
      await TestUtils.waitForElement('payment-notification');

      // Bildirime tıkla
      await TestUtils.tapElement('payment-notification');
      await TestUtils.waitForElement('payment-detail-screen');

      // Ödeme detaylarını kontrol et
      await TestUtils.waitForElement('payment-amount');
      await TestUtils.waitForElement('payment-status');
      await TestUtils.waitForElement('payment-date');
    });

    it('should handle rating reminder notification', async () => {
      // Değerlendirme hatırlatma bildirimi al (simüle)
      await TestUtils.waitForElement('rating-reminder-notification');

      // Bildirime tıkla
      await TestUtils.tapElement('rating-reminder-notification');
      await TestUtils.waitForElement('rating-screen');

      // Değerlendirme formunu kontrol et
      await TestUtils.waitForElement('rating-stars');
      await TestUtils.waitForElement('rating-comment');
    });

    it('should handle campaign notification', async () => {
      // Kampanya bildirimi al (simüle)
      await TestUtils.waitForElement('campaign-notification');

      // Bildirime tıkla
      await TestUtils.tapElement('campaign-notification');
      await TestUtils.waitForElement('campaign-detail-screen');

      // Kampanya detaylarını kontrol et
      await TestUtils.waitForElement('campaign-title');
      await TestUtils.waitForElement('campaign-description');
      await TestUtils.waitForElement('campaign-discount');
    });
  });

  describe('Push Notifications', () => {
    it('should handle push notification tap', async () => {
      // Push bildirimi simüle et
      await device.launchApp({ newInstance: false, userNotification: {
        title: 'Yeni Randevu Onayı',
        body: 'Randevunuz onaylandı',
        data: {
          type: 'appointment_confirmed',
          appointmentId: '12345'
        }
      }});

      // Uygulamanın ilgili ekrana yönlendirildiğini kontrol et
      await TestUtils.waitForElement('appointment-detail-screen');
      await TestUtils.waitForText('Randevunuz onaylandı');
    });

    it('should request notification permissions', async () => {
      // Bildirim izinleri ekranına git
      await TestUtils.tapElement('notification-permissions-button');
      await TestUtils.waitForElement('permissions-screen');

      // İzin ver butonuna tıkla
      await TestUtils.tapElement('grant-permissions-button');

      // İzin verildiğini kontrol et
      await TestUtils.waitForText('Bildirim izinleri verildi');

      // İzin ayarlarını kontrol et
      await TestUtils.waitForElement('permissions-status-granted');
    });

    it('should handle notification settings', async () => {
      // Bildirim ayarları ekranına git
      await TestUtils.tapElement('notification-settings-button');
      await TestUtils.waitForElement('notification-settings-screen');

      // Farklı bildirim türlerini kontrol et
      await TestUtils.waitForElement('appointment-notifications-toggle');
      await TestUtils.waitForElement('payment-notifications-toggle');
      await TestUtils.waitForElement('campaign-notifications-toggle');
      await TestUtils.waitForElement('system-notifications-toggle');

      // Randevu bildirimlerini kapat
      await TestUtils.tapElement('appointment-notifications-toggle');

      // Ayarları kaydet
      await TestUtils.tapElement('save-notification-settings');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Bildirim ayarları güncellendi');
    });
  });

  describe('Notification History', () => {
    it('should display notification history', async () => {
      // Bildirim geçmişi ekranına git
      await TestUtils.tapElement('notification-history-button');
      await TestUtils.waitForElement('notification-history-screen');

      // Geçmiş bildirimleri kontrol et
      await TestUtils.waitForElement('history-list');
      await TestUtils.waitForElement('history-item-0');

      // Tarih filtresi uygula
      await TestUtils.tapElement('date-filter-button');
      await TestUtils.waitForElement('date-filter-modal');
      await TestUtils.tapText('Son 7 gün');
      await TestUtils.tapElement('apply-date-filter');

      // Filtrelenmiş sonuçları kontrol et
      await TestUtils.waitForElement('filtered-history');
    });

    it('should search notifications', async () => {
      // Bildirimler ekranına git
      await TestUtils.tapElement('notifications-button');
      await TestUtils.waitForElement('notifications-screen');

      // Arama kutusuna değer gir
      await TestUtils.clearAndTypeText('notification-search', 'randevu');

      // Arama sonuçlarını kontrol et
      await TestUtils.waitForElement('search-results');
      await TestUtils.waitForText('randevu');
    });
  });

  describe('Notification Categories', () => {
    it('should categorize notifications', async () => {
      // Bildirimler ekranına git
      await TestUtils.tapElement('notifications-button');
      await TestUtils.waitForElement('notifications-screen');

      // Kategori sekmelerini kontrol et
      await TestUtils.waitForElement('category-tab-all');
      await TestUtils.waitForElement('category-tab-appointments');
      await TestUtils.waitForElement('category-tab-payments');
      await TestUtils.waitForElement('category-tab-campaigns');

      // Randevu kategorisine tıkla
      await TestUtils.tapElement('category-tab-appointments');

      // Sadece randevu bildirimlerini kontrol et
      await TestUtils.waitForElement('appointment-notifications-only');

      // Ödeme kategorisine tıkla
      await TestUtils.tapElement('category-tab-payments');

      // Sadece ödeme bildirimlerini kontrol et
      await TestUtils.waitForElement('payment-notifications-only');
    });

    it('should show notification badges', async () => {
      // Ana ekrana git
      await TestUtils.waitForElement('home-screen');

      // Bildirim rozetini kontrol et
      await TestUtils.waitForElement('notification-badge');
      await TestUtils.waitForElement('badge-count');

      // Bildirimler ekranına git
      await TestUtils.tapElement('notifications-button');

      // Rozetin güncellendiğini kontrol et
      await TestUtils.waitForElement('badge-cleared');
    });
  });

  describe('Emergency Notifications', () => {
    it('should handle emergency notifications', async () => {
      // Acil durum bildirimi al (simüle)
      await TestUtils.waitForElement('emergency-notification');

      // Bildirimin acil olduğunu kontrol et
      await TestUtils.waitForElement('emergency-indicator');
      await TestUtils.waitForElement('high-priority-icon');

      // Bildirime tıkla
      await TestUtils.tapElement('emergency-notification');
      await TestUtils.waitForElement('emergency-detail-screen');

      // Acil durum detaylarını kontrol et
      await TestUtils.waitForElement('emergency-title');
      await TestUtils.waitForElement('emergency-location');
      await TestUtils.waitForElement('emergency-contact');
    });

    it('should show emergency contact options', async () => {
      // Acil durum bildirimi detayına git
      await TestUtils.tapElement('emergency-notification');
      await TestUtils.waitForElement('emergency-detail-screen');

      // İletişim seçeneklerini kontrol et
      await TestUtils.waitForElement('emergency-call-button');
      await TestUtils.waitForElement('emergency-message-button');
      await TestUtils.waitForElement('emergency-location-share');

      // Acil çağrı butonuna tıkla
      await TestUtils.tapElement('emergency-call-button');

      // Arama uygulamasının açıldığını kontrol et
      await TestUtils.waitForElement('phone-app-simulator');
    });
  });

  describe('Notification Preferences', () => {
    it('should manage notification preferences by channel', async () => {
      // Bildirim tercihleri ekranına git
      await TestUtils.tapElement('notification-preferences-button');
      await TestUtils.waitForElement('notification-preferences-screen');

      // Kanal bazlı ayarları kontrol et
      await TestUtils.waitForElement('push-preferences');
      await TestUtils.waitForElement('email-preferences');
      await TestUtils.waitForElement('sms-preferences');

      // Push bildirim tercihlerini düzenle
      await TestUtils.tapElement('push-preferences');
      await TestUtils.waitForElement('push-preferences-modal');

      // Farklı bildirim türlerini aç/kapat
      await TestUtils.tapElement('push-appointments-toggle');
      await TestUtils.tapElement('push-promotions-toggle');

      // Kaydet butonuna tıkla
      await TestUtils.tapElement('save-push-preferences');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Push bildirim tercihleri güncellendi');
    });

    it('should set quiet hours', async () => {
      // Sessiz saat ayarları ekranına git
      await TestUtils.tapElement('quiet-hours-button');
      await TestUtils.waitForElement('quiet-hours-screen');

      // Sessiz saat aralığını ayarla
      await TestUtils.tapElement('start-time-picker');
      await TestUtils.waitForElement('time-picker-modal');
      await TestUtils.tapText('22:00');
      await TestUtils.tapElement('time-confirm');

      await TestUtils.tapElement('end-time-picker');
      await TestUtils.tapText('08:00');
      await TestUtils.tapElement('time-confirm');

      // Hafta içi seç
      await TestUtils.tapElement('weekdays-only-toggle');

      // Kaydet butonuna tıkla
      await TestUtils.tapElement('save-quiet-hours');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Sessiz saat ayarları kaydedildi');
    });
  });

  describe('Notification Archive', () => {
    it('should archive old notifications', async () => {
      // Bildirimler ekranına git
      await TestUtils.tapElement('notifications-button');
      await TestUtils.waitForElement('notifications-screen');

      // Eski bildirimi arşivle
      await TestUtils.tapElement('notification-item-old');
      await TestUtils.waitForElement('notification-detail-screen');

      // Arşivle butonuna tıkla
      await TestUtils.tapElement('archive-notification-button');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Bildirim arşivlendi');
    });

    it('should view archived notifications', async () => {
      // Arşiv ekranına git
      await TestUtils.tapElement('notification-archive-button');
      await TestUtils.waitForElement('notification-archive-screen');

      // Arşivlenmiş bildirimleri kontrol et
      await TestUtils.waitForElement('archived-list');
      await TestUtils.waitForElement('archived-item-0');

      // Arşivden geri yükle
      await TestUtils.tapElement('archived-item-0');
      await TestUtils.waitForElement('archived-detail-screen');

      // Geri yükle butonuna tıkla
      await TestUtils.tapElement('restore-notification-button');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Bildirim geri yüklendi');
    });
  });
});
