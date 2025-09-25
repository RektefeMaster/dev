import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('🔧 Mechanic Ana Sayfa', () => {
  beforeAll(async () => {
    });

  beforeEach(async () => {
    await device.reloadReactNative();
    await global.helpers.skipSplashScreen();
    await global.helpers.skipOnboarding();
    
    // Mechanic kullanıcısı ile giriş yap
    await global.helpers.loginUser(
      global.testData.users.testMechanic.email,
      global.testData.users.testMechanic.password
    );
  });

  describe('Ana Dashboard', () => {
    it('Mechanic dashboard bileşenleri görüntüleniyor', async () => {
      await waitFor(element(by.testID('mechanic-home-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('mechanic_home_loaded');
      
      // İstatistik kartları
      await detoxExpect(element(by.testID('stats-cards'))).toBeVisible();
      
      // Bugünkü randevular
      await detoxExpect(element(by.testID('todays-appointments'))).toBeVisible();
      
      // Hızlı eylemler
      await detoxExpect(element(by.testID('quick-actions'))).toBeVisible();
      
      // Gelir özeti (varsa)
      try {
        await detoxExpect(element(by.testID('earnings-summary'))).toBeVisible();
        } catch {
        }
      
      });

    it('İstatistik kartları doğru bilgileri gösteriyor', async () => {
      await waitFor(element(by.testID('stats-cards')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Bugünkü randevu sayısı
      await detoxExpect(element(by.testID('stat-todays-appointments'))).toBeVisible();
      
      // Bu haftaki iş sayısı
      await detoxExpect(element(by.testID('stat-weekly-jobs'))).toBeVisible();
      
      // Toplam gelir
      await detoxExpect(element(by.testID('stat-total-earnings'))).toBeVisible();
      
      // Müşteri puanı
      await detoxExpect(element(by.testID('stat-rating'))).toBeVisible();
      
      await global.helpers.takeScreenshot('mechanic_stats_cards');
      
      });

    it('Bugünkü randevular listesi çalışıyor', async () => {
      await waitFor(element(by.testID('todays-appointments')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Randevu listesini kontrol et
      try {
        await detoxExpect(element(by.testID('appointment-list'))).toBeVisible();
        
        // İlk randevuya tıkla (varsa)
        try {
          await element(by.testID('appointment-item-0')).tap();
          
          await waitFor(element(by.testID('appointment-detail-screen')))
            .toBeVisible()
            .withTimeout(5000);
          
          await global.helpers.takeScreenshot('appointment_detail_from_home');
          
          await element(by.testID('back-button')).tap();
          
          } catch {
          }
      } catch {
        // Randevu yoksa "Bugün randevunuz yok" mesajı görünmeli
        await detoxExpect(element(by.text('Bugün randevunuz bulunmamaktadır'))).toBeVisible();
        }
      
      await global.helpers.takeScreenshot('todays_appointments');
      
      });
  });

  describe('Hızlı Eylemler', () => {
    it('Randevu takvimi hızlı erişim çalışıyor', async () => {
      await element(by.testID('quick-action-calendar')).tap();
      
      await waitFor(element(by.testID('calendar-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('calendar_from_quick_action');
      
      await element(by.testID('back-button')).tap();
      
      });

    it('Yeni randevu oluşturma çalışıyor', async () => {
      await element(by.testID('quick-action-new-appointment')).tap();
      
      // Yeni randevu formuna yönlendirildiğini kontrol et
      await waitFor(element(by.testID('new-appointment-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('new_appointment_from_quick_action');
      
      await element(by.testID('back-button')).tap();
      
      });

    it('Müşteri mesajları hızlı erişim çalışıyor', async () => {
      await element(by.testID('quick-action-messages')).tap();
      
      await waitFor(element(by.testID('messages-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('messages_from_quick_action');
      
      await element(by.testID('back-button')).tap();
      
      });

    it('Gelir takibi hızlı erişim çalışıyor', async () => {
      await element(by.testID('quick-action-earnings')).tap();
      
      await waitFor(element(by.testID('financial-tracking-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('earnings_from_quick_action');
      
      await element(by.testID('back-button')).tap();
      
      });
  });

  describe('Servis Kategorileri', () => {
    it('Tamir servisi kategorisi çalışıyor', async () => {
      // Scroll down to find service categories
      await global.helpers.scrollTo('mechanic-home-scroll', 'down');
      
      await element(by.testID('service-category-repair')).tap();
      
      await waitFor(element(by.testID('repair-service-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('repair_service_screen');
      
      await element(by.testID('back-button')).tap();
      
      });

    it('Lastik servisi kategorisi çalışıyor', async () => {
      await global.helpers.scrollTo('mechanic-home-scroll', 'down');
      
      await element(by.testID('service-category-tire')).tap();
      
      await waitFor(element(by.testID('tire-service-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('tire_service_screen');
      
      await element(by.testID('back-button')).tap();
      
      });

    it('Çekici servisi kategorisi çalışıyor', async () => {
      await global.helpers.scrollTo('mechanic-home-scroll', 'down');
      
      await element(by.testID('service-category-towing')).tap();
      
      await waitFor(element(by.testID('towing-service-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('towing_service_screen');
      
      await element(by.testID('back-button')).tap();
      
      });

    it('Yıkama servisi kategorisi çalışıyor', async () => {
      await global.helpers.scrollTo('mechanic-home-scroll', 'down');
      
      await element(by.testID('service-category-wash')).tap();
      
      await waitFor(element(by.testID('wash-service-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('wash_service_screen');
      
      await element(by.testID('back-button')).tap();
      
      });
  });

  describe('Bildirimler ve Güncellemeler', () => {
    it('Bildirim butonu çalışıyor', async () => {
      await element(by.testID('notification-button')).tap();
      
      await waitFor(element(by.testID('notifications-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      await global.helpers.takeScreenshot('mechanic_notifications');
      
      await element(by.testID('back-button')).tap();
      
      });

    it('Profil güncellemesi uyarısı çalışıyor', async () => {
      try {
        // Profil güncelleme modalının var olup olmadığını kontrol et
        await waitFor(element(by.testID('profile-update-modal')))
          .toBeVisible()
          .withTimeout(2000);
        
        await global.helpers.takeScreenshot('profile_update_modal');
        
        // "Daha sonra" butonuna tıkla
        await element(by.testID('profile-update-later-button')).tap();
        
        } catch {
        }
    });
  });

  describe('Çevrimdışı Mod', () => {
    it('Çevrimdışı durumda uygun mesaj gösteriyor', async () => {
      // Ağ bağlantısını kapat
      await device.setNetworkConnection('offline');
      
      // Sayfayı yenile
      await element(by.testID('mechanic-home-scroll')).swipe('down', 'fast', 0.8);
      
      // Çevrimdışı mesajını kontrol et
      await waitFor(element(by.text('İnternet bağlantınızı kontrol edin')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('offline_mode');
      
      // Ağ bağlantısını tekrar aç
      await device.setNetworkConnection('wifi');
      
      // Sayfayı tekrar yenile
      await element(by.testID('mechanic-home-scroll')).swipe('down', 'fast', 0.8);
      
      // Normal içeriğin geri döndüğünü kontrol et
      await waitFor(element(by.testID('stats-cards')))
        .toBeVisible()
        .withTimeout(10000);
      
      });
  });

  describe('Pull-to-Refresh', () => {
    it('Ana sayfa yenileme çalışıyor', async () => {
      await waitFor(element(by.testID('mechanic-home-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Pull to refresh
      await element(by.testID('mechanic-home-scroll')).swipe('down', 'fast', 0.8);
      
      // Loading göstergesi görünmeli
      await waitFor(element(by.testID('refresh-loading')))
        .toBeVisible()
        .withTimeout(2000);
      
      // Loading bitmesini bekle
      await waitFor(element(by.testID('refresh-loading')))
        .not.toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('mechanic_home_refreshed');
      
      });
  });

  describe('Responsive Design', () => {
    it('Tablet görünümünde düzgün çalışıyor', async () => {
      // Landscape mode (tablet simulation)
      await device.setOrientation('landscape');
      
      await waitFor(element(by.testID('mechanic-home-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      await global.helpers.takeScreenshot('mechanic_home_landscape');
      
      // Ana bileşenlerin hala görünür olduğunu kontrol et
      await detoxExpect(element(by.testID('stats-cards'))).toBeVisible();
      await detoxExpect(element(by.testID('todays-appointments'))).toBeVisible();
      
      // Portrait moda geri dön
      await device.setOrientation('portrait');
      
      await global.helpers.takeScreenshot('mechanic_home_portrait');
      
      });
  });
});
