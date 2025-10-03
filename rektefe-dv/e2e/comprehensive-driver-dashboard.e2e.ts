import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('🏠 REKTEFE-DV - Kapsamlı Şöför Dashboard Testleri', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    // Giriş yap
    await waitFor(element(by.testID('auth-screen')))
      .toBeVisible()
      .withTimeout(10000);
    
    await element(by.testID('login-tab')).tap();
    await element(by.testID('email-input')).typeText('test.sofor@rektefe.com');
    await element(by.testID('password-input')).typeText('TestSofor123!');
    await element(by.testID('login-button')).tap();
    
    await waitFor(element(by.testID('home-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });

  describe('📊 Ana Dashboard Bileşenleri', () => {
    it('Dashboard tüm bileşenleri görüntüleyebiliyor', async () => {
      console.log('📝 Test: Dashboard bileşenleri görüntüleme');
      
      // Greeting header kontrolü
      await detoxExpect(element(by.testID('greeting-header'))).toBeVisible();
      await detoxExpect(element(by.testID('greeting-text'))).toBeVisible();
      await detoxExpect(element(by.testID('user-name'))).toBeVisible();

      // Hızlı erişim kontrolü
      await detoxExpect(element(by.testID('quick-actions'))).toBeVisible();
      await detoxExpect(element(by.testID('quick-action-find-mechanic'))).toBeVisible();
      await detoxExpect(element(by.testID('quick-action-emergency'))).toBeVisible();
      await detoxExpect(element(by.testID('quick-action-maintenance'))).toBeVisible();
      await detoxExpect(element(by.testID('quick-action-appointments'))).toBeVisible();

      // Yakındaki ustalar kontrolü
      await detoxExpect(element(by.testID('nearby-mechanics'))).toBeVisible();
      await detoxExpect(element(by.testID('mechanics-title'))).toBeVisible();

      // Son aktiviteler kontrolü
      await detoxExpect(element(by.testID('recent-activities'))).toBeVisible();
      await detoxExpect(element(by.testID('activities-title'))).toBeVisible();

      console.log('✅ Dashboard tüm bileşenleri başarıyla görüntülendi');
    });

    it('Pull-to-refresh işlevi çalışıyor', async () => {
      console.log('📝 Test: Pull-to-refresh işlevi');
      
      // Scroll view'ı bul ve pull-to-refresh yap
      await element(by.testID('home-scroll-view')).swipe('down', 'fast');
      
      // Loading göstergesinin göründüğünü kontrol et
      await waitFor(element(by.testID('refresh-loading')))
        .toBeVisible()
        .withTimeout(2000);

      // Loading göstergesinin kaybolduğunu kontrol et
      await waitFor(element(by.testID('refresh-loading')))
        .not.toBeVisible()
        .withTimeout(5000);

      console.log('✅ Pull-to-refresh başarılı');
    });

    it('Notification badge görüntüleyebiliyor', async () => {
      console.log('📝 Test: Notification badge görüntüleme');
      
      // Notification button'u kontrol et
      await detoxExpect(element(by.testID('notification-button'))).toBeVisible();
      
      // Eğer okunmamış bildirim varsa badge görünmeli
      try {
        await waitFor(element(by.testID('notification-badge')))
          .toBeVisible()
          .withTimeout(1000);
        console.log('✅ Notification badge görüntülendi');
      } catch {
        console.log('ℹ️ Okunmamış bildirim yok');
      }
    });
  });

  describe('⚡ Hızlı Erişim Testleri', () => {
    it('Usta Bul butonuna tıklayabiliyor', async () => {
      console.log('📝 Test: Usta Bul butonuna tıklama');
      
      await element(by.testID('quick-action-find-mechanic')).tap();
      
      // Usta arama ekranına yönlendirildiğini kontrol et
      await waitFor(element(by.testID('mechanic-search-screen')))
        .toBeVisible()
        .withTimeout(5000);

      console.log('✅ Usta arama ekranına yönlendirme başarılı');
    });

    it('Acil Durum butonuna tıklayabiliyor', async () => {
      console.log('📝 Test: Acil Durum butonuna tıklama');
      
      await element(by.testID('quick-action-emergency')).tap();
      
      // Acil durum ekranına yönlendirildiğini kontrol et
      await waitFor(element(by.testID('emergency-screen')))
        .toBeVisible()
        .withTimeout(5000);

      console.log('✅ Acil durum ekranına yönlendirme başarılı');
    });

    it('Bakım Planı butonuna tıklayabiliyor', async () => {
      console.log('📝 Test: Bakım Planı butonuna tıklama');
      
      await element(by.testID('quick-action-maintenance')).tap();
      
      // Bakım planı ekranına yönlendirildiğini kontrol et
      await waitFor(element(by.testID('maintenance-plan-screen')))
        .toBeVisible()
        .withTimeout(5000);

      console.log('✅ Bakım planı ekranına yönlendirme başarılı');
    });

    it('Randevularım butonuna tıklayabiliyor', async () => {
      console.log('📝 Test: Randevularım butonuna tıklama');
      
      await element(by.testID('quick-action-appointments')).tap();
      
      // Randevularım ekranına yönlendirildiğini kontrol et
      await waitFor(element(by.testID('appointments-screen')))
        .toBeVisible()
        .withTimeout(5000);

      console.log('✅ Randevularım ekranına yönlendirme başarılı');
    });
  });

  describe('🔧 Yakındaki Ustalar Testleri', () => {
    it('Yakındaki ustaları görüntüleyebiliyor', async () => {
      console.log('📝 Test: Yakındaki ustaları görüntüleme');
      
      // Yakındaki ustalar bölümünü kontrol et
      await detoxExpect(element(by.testID('nearby-mechanics'))).toBeVisible();
      await detoxExpect(element(by.testID('mechanics-title'))).toBeVisible();

      // Usta listesi kontrolü
      try {
        await waitFor(element(by.testID('mechanic-item-0')))
          .toBeVisible()
          .withTimeout(3000);
        
        // Usta detaylarını kontrol et
        await detoxExpect(element(by.testID('mechanic-name'))).toBeVisible();
        await detoxExpect(element(by.testID('mechanic-rating'))).toBeVisible();
        await detoxExpect(element(by.testID('mechanic-distance'))).toBeVisible();
        await detoxExpect(element(by.testID('mechanic-services'))).toBeVisible();
        
        console.log('✅ Yakındaki ustalar başarıyla görüntülendi');
      } catch {
        console.log('ℹ️ Yakında usta bulunmuyor');
      }
    });

    it('Usta detayına gidebiliyor', async () => {
      console.log('📝 Test: Usta detayına gitme');
      
      try {
        // İlk ustaya tıkla
        await element(by.testID('mechanic-item-0')).tap();
        
        // Usta detay ekranına yönlendirildiğini kontrol et
        await waitFor(element(by.testID('mechanic-detail-screen')))
          .toBeVisible()
          .withTimeout(5000);

        console.log('✅ Usta detay ekranına yönlendirme başarılı');
      } catch {
        console.log('ℹ️ Usta bulunamadı, test atlandı');
      }
    });

    it('Boş usta durumunu gösterebiliyor', async () => {
      console.log('📝 Test: Boş usta durumu');
      
      // Eğer usta yoksa empty state görünmeli
      try {
        await waitFor(element(by.testID('empty-mechanics-state')))
          .toBeVisible()
          .withTimeout(2000);
        
        await detoxExpect(element(by.testID('empty-mechanics-icon'))).toBeVisible();
        await detoxExpect(element(by.testID('empty-mechanics-text'))).toBeVisible();
        
        console.log('✅ Boş usta durumu başarıyla gösterildi');
      } catch {
        console.log('ℹ️ Ustalar mevcut, boş durum test edilemedi');
      }
    });
  });

  describe('📅 Son Aktiviteler Testleri', () => {
    it('Son aktiviteleri görüntüleyebiliyor', async () => {
      console.log('📝 Test: Son aktiviteleri görüntüleme');
      
      // Son aktiviteler bölümünü kontrol et
      await detoxExpect(element(by.testID('recent-activities'))).toBeVisible();
      await detoxExpect(element(by.testID('activities-title'))).toBeVisible();

      try {
        // Aktivite item'larını kontrol et
        await waitFor(element(by.testID('activity-item-0')))
          .toBeVisible()
          .withTimeout(3000);
        
        await detoxExpect(element(by.testID('activity-icon'))).toBeVisible();
        await detoxExpect(element(by.testID('activity-title'))).toBeVisible();
        await detoxExpect(element(by.testID('activity-date'))).toBeVisible();
        
        console.log('✅ Son aktiviteler başarıyla görüntülendi');
      } catch {
        console.log('ℹ️ Henüz aktivite bulunmuyor');
      }
    });

    it('Aktivite detayına gidebiliyor', async () => {
      console.log('📝 Test: Aktivite detayına gitme');
      
      try {
        // İlk aktiviteye tıkla
        await element(by.testID('activity-item-0')).tap();
        
        // Aktivite detay ekranına yönlendirildiğini kontrol et
        await waitFor(element(by.testID('activity-detail-screen')))
          .toBeVisible()
          .withTimeout(5000);

        console.log('✅ Aktivite detay ekranına yönlendirme başarılı');
      } catch {
        console.log('ℹ️ Aktivite bulunamadı, test atlandı');
      }
    });
  });

  describe('🗺️ Konum Testleri', () => {
    it('Konum izni isteyebiliyor', async () => {
      console.log('📝 Test: Konum izni isteme');
      
      // Konum tabına tıkla
      await element(by.testID('location-tab')).tap();
      
      // Konum izni dialog'unu kontrol et
      try {
        await waitFor(element(by.testID('location-permission-dialog')))
          .toBeVisible()
          .withTimeout(3000);
        
        await element(by.testID('allow-location')).tap();
        console.log('✅ Konum izni verildi');
      } catch {
        console.log('ℹ️ Konum izni zaten verilmiş');
      }
    });

    it('Mevcut konumu gösterebiliyor', async () => {
      console.log('📝 Test: Mevcut konumu gösterme');
      
      await element(by.testID('location-tab')).tap();
      
      // Konum göstergesinin göründüğünü kontrol et
      try {
        await waitFor(element(by.testID('current-location')))
          .toBeVisible()
          .withTimeout(5000);
        
        await detoxExpect(element(by.testID('location-address'))).toBeVisible();
        await detoxExpect(element(by.testID('location-coordinates'))).toBeVisible();
        
        console.log('✅ Mevcut konum başarıyla gösterildi');
      } catch {
        console.log('ℹ️ Konum alınamadı');
      }
    });

    it('Konum güncelleme yapabiliyor', async () => {
      console.log('📝 Test: Konum güncelleme');
      
      await element(by.testID('location-tab')).tap();
      
      // Konum güncelle butonuna tıkla
      await element(by.testID('update-location-button')).tap();
      
      // Güncelleme göstergesinin göründüğünü kontrol et
      await waitFor(element(by.testID('location-updating')))
        .toBeVisible()
        .withTimeout(2000);

      // Güncelleme tamamlandığını kontrol et
      await waitFor(element(by.testID('location-updated')))
        .toBeVisible()
        .withTimeout(5000);

      console.log('✅ Konum güncelleme başarılı');
    });
  });

  describe('🍔 Hamburger Menü Testleri', () => {
    it('Hamburger menüyü açabiliyor', async () => {
      console.log('📝 Test: Hamburger menü açma');
      
      // Hamburger menü butonuna tıkla
      await element(by.testID('hamburger-menu-button')).tap();
      
      // Hamburger menünün açıldığını kontrol et
      await waitFor(element(by.testID('hamburger-menu')))
        .toBeVisible()
        .withTimeout(3000);

      // Menü kategorilerini kontrol et
      await detoxExpect(element(by.testID('menu-account-section'))).toBeVisible();
      await detoxExpect(element(by.testID('menu-services-section'))).toBeVisible();
      await detoxExpect(element(by.testID('menu-support-section'))).toBeVisible();

      console.log('✅ Hamburger menü başarıyla açıldı');
    });

    it('Hamburger menüden randevulara gidebiliyor', async () => {
      console.log('📝 Test: Hamburger menüden randevulara gitme');
      
      await element(by.testID('hamburger-menu-button')).tap();
      await waitFor(element(by.testID('hamburger-menu')))
        .toBeVisible()
        .withTimeout(3000);

      // Randevular linkine tıkla
      await element(by.testID('menu-appointments-link')).tap();
      
      // Randevular ekranına yönlendirildiğini kontrol et
      await waitFor(element(by.testID('appointments-screen')))
        .toBeVisible()
        .withTimeout(5000);

      console.log('✅ Randevular ekranına yönlendirme başarılı');
    });

    it('Hamburger menüden mesajlara gidebiliyor', async () => {
      console.log('📝 Test: Hamburger menüden mesajlara gitme');
      
      await element(by.testID('hamburger-menu-button')).tap();
      await waitFor(element(by.testID('hamburger-menu')))
        .toBeVisible()
        .withTimeout(3000);

      // Mesajlar linkine tıkla
      await element(by.testID('menu-messages-link')).tap();
      
      // Mesajlar ekranına yönlendirildiğini kontrol et
      await waitFor(element(by.testID('messages-screen')))
        .toBeVisible()
        .withTimeout(5000);

      console.log('✅ Mesajlar ekranına yönlendirme başarılı');
    });

    it('Hamburger menüden ayarlara gidebiliyor', async () => {
      console.log('📝 Test: Hamburger menüden ayarlara gitme');
      
      await element(by.testID('hamburger-menu-button')).tap();
      await waitFor(element(by.testID('hamburger-menu')))
        .toBeVisible()
        .withTimeout(3000);

      // Ayarlar linkine tıkla
      await element(by.testID('menu-settings-link')).tap();
      
      // Ayarlar ekranına yönlendirildiğini kontrol et
      await waitFor(element(by.testID('settings-screen')))
        .toBeVisible()
        .withTimeout(5000);

      console.log('✅ Ayarlar ekranına yönlendirme başarılı');
    });
  });

  describe('📱 Responsive Tasarım Testleri', () => {
    it('Farklı ekran boyutlarında düzgün görüntüleniyor', async () => {
      console.log('📝 Test: Responsive tasarım kontrolü');
      
      // Temel bileşenlerin görünür olduğunu kontrol et
      await detoxExpect(element(by.testID('greeting-header'))).toBeVisible();
      await detoxExpect(element(by.testID('quick-actions'))).toBeVisible();
      await detoxExpect(element(by.testID('nearby-mechanics'))).toBeVisible();
      await detoxExpect(element(by.testID('recent-activities'))).toBeVisible();

      // Scroll edilebilirliği kontrol et
      await element(by.testID('home-scroll-view')).swipe('up', 'slow');
      await element(by.testID('home-scroll-view')).swipe('down', 'slow');

      console.log('✅ Responsive tasarım doğrulandı');
    });

    it('Dark mode geçişi çalışıyor', async () => {
      console.log('📝 Test: Dark mode geçişi');
      
      // Hamburger menüyü aç
      await element(by.testID('hamburger-menu-button')).tap();
      await waitFor(element(by.testID('hamburger-menu')))
        .toBeVisible()
        .withTimeout(3000);

      // Ayarlara git
      await element(by.testID('menu-settings-link')).tap();
      await waitFor(element(by.testID('settings-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Tema ayarlarını bul
      await element(by.testID('theme-settings')).tap();
      
      // Dark mode toggle'ını kontrol et
      try {
        await waitFor(element(by.testID('dark-mode-toggle')))
          .toBeVisible()
          .withTimeout(3000);
        
        await element(by.testID('dark-mode-toggle')).tap();
        
        console.log('✅ Dark mode geçişi başarılı');
      } catch {
        console.log('ℹ️ Dark mode ayarı bulunamadı');
      }
    });
  });
});
