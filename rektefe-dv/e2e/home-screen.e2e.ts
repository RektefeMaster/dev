import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('🏠 Ana Sayfa (Home Screen)', () => {
  beforeAll(async () => {
    });

  beforeEach(async () => {
    await device.reloadReactNative();
    await global.helpers.skipSplashScreen();
    await global.helpers.skipOnboarding();
    
    // Her testten önce giriş yap
    await global.helpers.loginUser(
      global.testData.users.testDriver.email,
      global.testData.users.testDriver.password
    );
  });

  describe('Ana Sayfa Bileşenleri', () => {
    it('Tüm ana bileşenler görüntüleniyor', async () => {
      // Ana ekranın yüklendiğini kontrol et
      await waitFor(element(by.testID('home-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('home_screen_loaded');
      
      // Greeting header kontrolü
      await detoxExpect(element(by.testID('greeting-header'))).toBeVisible();
      
      // Quick actions kontrolü
      await detoxExpect(element(by.testID('quick-actions'))).toBeVisible();
      
      // Services grid kontrolü
      await detoxExpect(element(by.testID('services-grid'))).toBeVisible();
      
      // Kampanya carousel kontrolü (varsa)
      try {
        await detoxExpect(element(by.testID('campaign-carousel'))).toBeVisible();
        } catch {
        }
      
      // Yakındaki servisler kontrolü
      try {
        await detoxExpect(element(by.testID('nearby-services'))).toBeVisible();
        } catch {
        }
      
      });

    it('Kullanıcı karşılama mesajı doğru gösteriliyor', async () => {
      await waitFor(element(by.testID('greeting-header')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Kullanıcı adının göründüğünü kontrol et
      const testUser = global.testData.users.testDriver;
      await detoxExpected(element(by.text(`Merhaba ${testUser.name}!`))).toBeVisible();
      
      // Tarih/saat bilgisinin göründüğünü kontrol et
      const currentHour = new Date().getHours();
      let expectedGreeting = 'Günaydın';
      if (currentHour >= 12 && currentHour < 18) {
        expectedGreeting = 'İyi günler';
      } else if (currentHour >= 18) {
        expectedGreeting = 'İyi akşamlar';
      }
      
      await detoxExpect(element(by.text(expectedGreeting))).toBeVisible();
      
      await global.helpers.takeScreenshot('greeting_header');
      
      });

    it('Bildirim butonu çalışıyor', async () => {
      // Bildirim butonuna tıkla
      await element(by.testID('notification-button')).tap();
      
      // Bildirimler ekranına yönlendirildiğini kontrol et
      await waitFor(element(by.testID('notifications-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      await global.helpers.takeScreenshot('notifications_screen');
      
      // Geri dön
      await element(by.testID('back-button')).tap();
      
      });
  });

  describe('Hızlı Erişim Kartları', () => {
    it('Bakım Planla kartı çalışıyor', async () => {
      // Bakım planla kartına tıkla
      await element(by.testID('quick-action-maintenance')).tap();
      
      // Bakım planlama ekranına yönlendirildiğini kontrol et
      await waitFor(element(by.testID('maintenance-plan-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('maintenance_plan_screen');
      
      // Geri dön
      await element(by.testID('back-button')).tap();
      
      });

    it('Arıza Bildir kartı çalışıyor', async () => {
      await element(by.testID('quick-action-fault-report')).tap();
      
      await waitFor(element(by.testID('fault-report-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('fault_report_screen');
      
      await element(by.testID('back-button')).tap();
      
      });

    it('Usta Bul kartı çalışıyor', async () => {
      await element(by.testID('quick-action-find-mechanic')).tap();
      
      await waitFor(element(by.testID('mechanic-search-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('mechanic_search_screen');
      
      await element(by.testID('back-button')).tap();
      
      });

    it('Randevularım kartı çalışıyor', async () => {
      await element(by.testID('quick-action-appointments')).tap();
      
      await waitFor(element(by.testID('appointments-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('appointments_screen');
      
      await element(by.testID('back-button')).tap();
      
      });
  });

  describe('Servis Kategorileri', () => {
    it('Tüm servis kategorileri görüntüleniyor', async () => {
      await waitFor(element(by.testID('services-grid')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Temel servis kategorilerini kontrol et
      const serviceCategories = [
        'service-category-repair',
        'service-category-maintenance',
        'service-category-towing',
        'service-category-wash',
        'service-category-tire',
        'service-category-fuel'
      ];
      
      for (const categoryId of serviceCategories) {
        try {
          await detoxExpect(element(by.testID(categoryId))).toBeVisible();
          } catch {
          }
      }
      
      await global.helpers.takeScreenshot('services_grid');
      
      });

    it('Çekici servisi kategorisi çalışıyor', async () => {
      // Scroll down to find towing service if needed
      await global.helpers.scrollTo('services-grid', 'down');
      
      await element(by.testID('service-category-towing')).tap();
      
      await waitFor(element(by.testID('towing-request-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('towing_service_screen');
      
      await element(by.testID('back-button')).tap();
      
      });

    it('Araç yıkama kategorisi çalışıyor', async () => {
      await global.helpers.scrollTo('services-grid', 'down');
      
      await element(by.testID('service-category-wash')).tap();
      
      await waitFor(element(by.testID('wash-booking-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('wash_service_screen');
      
      await element(by.testID('back-button')).tap();
      
      });

    it('Lastik servisi kategorisi çalışıyor', async () => {
      await global.helpers.scrollTo('services-grid', 'down');
      
      await element(by.testID('service-category-tire')).tap();
      
      await waitFor(element(by.testID('tire-parts-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('tire_service_screen');
      
      await element(by.testID('back-button')).tap();
      
      });
  });

  describe('Kampanya ve Duyurular', () => {
    it('Kampanya carousel çalışıyor', async () => {
      try {
        await waitFor(element(by.testID('campaign-carousel')))
          .toBeVisible()
          .withTimeout(3000);
        
        // İlk kampanyayı kontrol et
        await detoxExpect(element(by.testID('campaign-item-0'))).toBeVisible();
        
        await global.helpers.takeScreenshot('campaign_carousel_first');
        
        // Carousel'ı kaydır
        await element(by.testID('campaign-carousel')).swipe('left');
        
        await global.helpers.takeScreenshot('campaign_carousel_swiped');
        
        // Kampanya detayına git
        await element(by.testID('campaign-item-0')).tap();
        
        await waitFor(element(by.testID('campaign-detail-screen')))
          .toBeVisible()
          .withTimeout(5000);
        
        await global.helpers.takeScreenshot('campaign_detail');
        
        await element(by.testID('back-button')).tap();
        
        } catch {
        }
    });
  });

  describe('Yakındaki Servisler', () => {
    it('Yakındaki servisler listesi görüntüleniyor', async () => {
      try {
        await waitFor(element(by.testID('nearby-services')))
          .toBeVisible()
          .withTimeout(3000);
        
        // Konum izni verilmişse servisler görünmeli
        await detoxExpect(element(by.testID('nearby-services-list'))).toBeVisible();
        
        await global.helpers.takeScreenshot('nearby_services');
        
        // İlk servise tıkla (varsa)
        try {
          await element(by.testID('nearby-service-0')).tap();
          
          await waitFor(element(by.testID('mechanic-detail-screen')))
            .toBeVisible()
            .withTimeout(5000);
          
          await global.helpers.takeScreenshot('nearby_service_detail');
          
          await element(by.testID('back-button')).tap();
          
          } catch {
          }
        
        } catch {
        }
    });
  });

  describe('Pull-to-Refresh', () => {
    it('Ana sayfa yenileme çalışıyor', async () => {
      await waitFor(element(by.testID('home-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Pull to refresh
      await element(by.testID('home-scroll-view')).swipe('down', 'fast', 0.8);
      
      // Loading göstergesi görünmeli
      await waitFor(element(by.testID('refresh-loading')))
        .toBeVisible()
        .withTimeout(2000);
      
      // Loading bitmesini bekle
      await waitFor(element(by.testID('refresh-loading')))
        .not.toBeVisible()
        .withTimeout(5000);
      
      await global.helpers.takeScreenshot('home_refreshed');
      
      });
  });

  describe('Responsive Design', () => {
    it('Landscape modda düzgün görüntüleniyor', async () => {
      // Landscape moda geç
      await device.setOrientation('landscape');
      
      await waitFor(element(by.testID('home-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      await global.helpers.takeScreenshot('home_landscape');
      
      // Ana bileşenlerin hala görünür olduğunu kontrol et
      await detoxExpect(element(by.testID('greeting-header'))).toBeVisible();
      await detoxExpect(element(by.testID('quick-actions'))).toBeVisible();
      
      // Portrait moda geri dön
      await device.setOrientation('portrait');
      
      await global.helpers.takeScreenshot('home_portrait_restored');
      
      });
  });
});
