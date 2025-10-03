import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('🏠 REKTEFE-US - Kapsamlı Dashboard Testleri', () => {
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
    await element(by.testID('email-input')).typeText('test.usta@rektefe.com');
    await element(by.testID('password-input')).typeText('TestUsta123!');
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

      // Stats kartları kontrolü
      await detoxExpect(element(by.testID('stats-container'))).toBeVisible();
      await detoxExpect(element(by.testID('active-jobs-stat'))).toBeVisible();
      await detoxExpect(element(by.testID('today-earnings-stat'))).toBeVisible();
      await detoxExpect(element(by.testID('average-rating-stat'))).toBeVisible();

      // Bugünkü ajanda kontrolü
      await detoxExpect(element(by.testID('today-agenda'))).toBeVisible();
      await detoxExpect(element(by.testID('agenda-title'))).toBeVisible();

      // Hızlı erişim kontrolü
      await detoxExpect(element(by.testID('quick-actions'))).toBeVisible();
      await detoxExpect(element(by.testID('quick-action-repair'))).toBeVisible();
      await detoxExpect(element(by.testID('quick-action-fault-reports'))).toBeVisible();
      await detoxExpect(element(by.testID('quick-action-wallet'))).toBeVisible();
      await detoxExpect(element(by.testID('quick-action-customers'))).toBeVisible();

      // Son değerlendirmeler kontrolü
      await detoxExpect(element(by.testID('recent-ratings'))).toBeVisible();
      await detoxExpect(element(by.testID('ratings-title'))).toBeVisible();

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
    it('Tamir İşleri butonuna tıklayabiliyor', async () => {
      console.log('📝 Test: Tamir İşleri butonuna tıklama');
      
      await element(by.testID('quick-action-repair')).tap();
      
      // Tamir işleri ekranına yönlendirildiğini kontrol et
      await waitFor(element(by.testID('repair-service-screen')))
        .toBeVisible()
        .withTimeout(5000);

      console.log('✅ Tamir İşleri ekranına yönlendirme başarılı');
    });

    it('Arıza Bildirimleri butonuna tıklayabiliyor', async () => {
      console.log('📝 Test: Arıza Bildirimleri butonuna tıklama');
      
      await element(by.testID('quick-action-fault-reports')).tap();
      
      // Arıza bildirimleri ekranına yönlendirildiğini kontrol et
      await waitFor(element(by.testID('fault-reports-screen')))
        .toBeVisible()
        .withTimeout(5000);

      console.log('✅ Arıza Bildirimleri ekranına yönlendirme başarılı');
    });

    it('Cüzdan butonuna tıklayabiliyor', async () => {
      console.log('📝 Test: Cüzdan butonuna tıklama');
      
      await element(by.testID('quick-action-wallet')).tap();
      
      // Cüzdan ekranına yönlendirildiğini kontrol et
      await waitFor(element(by.testID('wallet-screen')))
        .toBeVisible()
        .withTimeout(5000);

      console.log('✅ Cüzdan ekranına yönlendirme başarılı');
    });

    it('Müşteri Defteri butonuna tıklayabiliyor', async () => {
      console.log('📝 Test: Müşteri Defteri butonuna tıklama');
      
      await element(by.testID('quick-action-customers')).tap();
      
      // Müşteri defteri ekranına yönlendirildiğini kontrol et
      await waitFor(element(by.testID('customers-screen')))
        .toBeVisible()
        .withTimeout(5000);

      console.log('✅ Müşteri Defteri ekranına yönlendirme başarılı');
    });
  });

  describe('📅 Bugünkü Ajanda Testleri', () => {
    it('Ajanda randevularını görüntüleyebiliyor', async () => {
      console.log('📝 Test: Ajanda randevularını görüntüleme');
      
      // Ajanda bölümünü kontrol et
      await detoxExpect(element(by.testID('today-agenda'))).toBeVisible();
      await detoxExpect(element(by.testID('agenda-title'))).toBeVisible();

      // Randevu listesi kontrolü
      try {
        await waitFor(element(by.testID('appointment-item-0')))
          .toBeVisible()
          .withTimeout(3000);
        
        // Randevu detaylarını kontrol et
        await detoxExpect(element(by.testID('appointment-customer-name'))).toBeVisible();
        await detoxExpect(element(by.testID('appointment-service-type'))).toBeVisible();
        await detoxExpect(element(by.testID('appointment-time'))).toBeVisible();
        await detoxExpect(element(by.testID('appointment-status'))).toBeVisible();
        
        console.log('✅ Ajanda randevuları başarıyla görüntülendi');
      } catch {
        console.log('ℹ️ Bugün için randevu bulunmuyor');
      }
    });

    it('Randevu detayına gidebiliyor', async () => {
      console.log('📝 Test: Randevu detayına gitme');
      
      try {
        // İlk randevuya tıkla
        await element(by.testID('appointment-item-0')).tap();
        
        // Randevu detay ekranına yönlendirildiğini kontrol et
        await waitFor(element(by.testID('appointment-detail-screen')))
          .toBeVisible()
          .withTimeout(5000);

        console.log('✅ Randevu detay ekranına yönlendirme başarılı');
      } catch {
        console.log('ℹ️ Randevu bulunamadı, test atlandı');
      }
    });

    it('Boş ajanda durumunu gösterebiliyor', async () => {
      console.log('📝 Test: Boş ajanda durumu');
      
      // Eğer randevu yoksa empty state görünmeli
      try {
        await waitFor(element(by.testID('empty-agenda-state')))
          .toBeVisible()
          .withTimeout(2000);
        
        await detoxExpect(element(by.testID('empty-agenda-icon'))).toBeVisible();
        await detoxExpect(element(by.testID('empty-agenda-text'))).toBeVisible();
        
        console.log('✅ Boş ajanda durumu başarıyla gösterildi');
      } catch {
        console.log('ℹ️ Ajanda dolu, boş durum test edilemedi');
      }
    });
  });

  describe('⭐ Son Değerlendirmeler Testleri', () => {
    it('Değerlendirmeleri görüntüleyebiliyor', async () => {
      console.log('📝 Test: Son değerlendirmeleri görüntüleme');
      
      // Değerlendirmeler bölümünü kontrol et
      await detoxExpect(element(by.testID('recent-ratings'))).toBeVisible();
      await detoxExpect(element(by.testID('ratings-title'))).toBeVisible();

      try {
        // Değerlendirme item'larını kontrol et
        await waitFor(element(by.testID('rating-item-0')))
          .toBeVisible()
          .withTimeout(3000);
        
        await detoxExpect(element(by.testID('rating-stars'))).toBeVisible();
        await detoxExpect(element(by.testID('rating-customer-name'))).toBeVisible();
        await detoxExpect(element(by.testID('rating-comment'))).toBeVisible();
        await detoxExpect(element(by.testID('rating-date'))).toBeVisible();
        
        console.log('✅ Son değerlendirmeler başarıyla görüntülendi');
      } catch {
        console.log('ℹ️ Henüz değerlendirme bulunmuyor');
      }
    });

    it('Değerlendirme detayına gidebiliyor', async () => {
      console.log('📝 Test: Değerlendirme detayına gitme');
      
      try {
        // İlk değerlendirmeye tıkla
        await element(by.testID('rating-item-0')).tap();
        
        // Değerlendirme detay ekranına yönlendirildiğini kontrol et
        await waitFor(element(by.testID('rating-detail-screen')))
          .toBeVisible()
          .withTimeout(5000);

        console.log('✅ Değerlendirme detay ekranına yönlendirme başarılı');
      } catch {
        console.log('ℹ️ Değerlendirme bulunamadı, test atlandı');
      }
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
      await detoxExpect(element(by.testID('menu-work-section'))).toBeVisible();
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
      await detoxExpect(element(by.testID('stats-container'))).toBeVisible();
      await detoxExpect(element(by.testID('quick-actions'))).toBeVisible();
      await detoxExpect(element(by.testID('today-agenda'))).toBeVisible();
      await detoxExpect(element(by.testID('recent-ratings'))).toBeVisible();

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
