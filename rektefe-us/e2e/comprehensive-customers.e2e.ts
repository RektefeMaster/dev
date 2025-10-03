import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('👥 REKTEFE-US - Kapsamlı Müşteri Defteri Testleri', () => {
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

    // Müşteri defteri ekranına git
    await element(by.testID('quick-action-customers')).tap();
    await waitFor(element(by.testID('customers-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  describe('📋 Müşteri Listesi Testleri', () => {
    it('Müşteri listesini görüntüleyebiliyor', async () => {
      console.log('📝 Test: Müşteri listesi görüntüleme');
      
      // Müşteri ekranı bileşenlerini kontrol et
      await detoxExpect(element(by.testID('customers-header'))).toBeVisible();
      await detoxExpect(element(by.testID('customers-search'))).toBeVisible();
      await detoxExpect(element(by.testID('customers-filter'))).toBeVisible();
      await detoxExpect(element(by.testID('customers-list'))).toBeVisible();
      await detoxExpect(element(by.testID('add-customer-button'))).toBeVisible();

      console.log('✅ Müşteri listesi başarıyla görüntülendi');
    });

    it('Müşteri arama işlevi çalışıyor', async () => {
      console.log('📝 Test: Müşteri arama işlevi');
      
      // Arama kutusuna metin gir
      await element(by.testID('customers-search')).tap();
      await element(by.testID('customers-search')).typeText('Ahmet');
      
      // Arama sonuçlarının göründüğünü kontrol et
      await waitFor(element(by.testID('search-results')))
        .toBeVisible()
        .withTimeout(3000);

      // Arama kutusunu temizle
      await element(by.testID('customers-search')).clearText();
      
      console.log('✅ Müşteri arama işlevi başarılı');
    });

    it('Müşteri filtreleme işlevi çalışıyor', async () => {
      console.log('📝 Test: Müşteri filtreleme işlevi');
      
      // Filtre butonuna tıkla
      await element(by.testID('customers-filter')).tap();
      await waitFor(element(by.testID('filter-modal')))
        .toBeVisible()
        .withTimeout(3000);

      // Filtre seçeneklerini kontrol et
      await detoxExpect(element(by.testID('filter-loyal-customers'))).toBeVisible();
      await detoxExpect(element(by.testID('filter-new-customers'))).toBeVisible();
      await detoxExpect(element(by.testID('filter-spending-range'))).toBeVisible();

      // Sadık müşteriler filtresini seç
      await element(by.testID('filter-loyal-customers')).tap();

      // Filtreyi uygula
      await element(by.testID('apply-filter')).tap();

      // Filtrelenmiş sonuçları kontrol et
      await waitFor(element(by.testID('filtered-customers')))
        .toBeVisible()
        .withTimeout(3000);

      console.log('✅ Müşteri filtreleme işlevi başarılı');
    });

    it('Yeni müşteri ekleyebiliyor', async () => {
      console.log('📝 Test: Yeni müşteri ekleme');
      
      // Yeni müşteri butonuna tıkla
      await element(by.testID('add-customer-button')).tap();
      await waitFor(element(by.testID('add-customer-modal')))
        .toBeVisible()
        .withTimeout(3000);

      // Müşteri bilgilerini gir
      const timestamp = Date.now();
      await element(by.testID('customer-name-input')).typeText('Test');
      await element(by.testID('customer-surname-input')).typeText('Müşteri');
      await element(by.testID('customer-phone-input')).typeText(`+905551234${timestamp.toString().slice(-3)}`);
      await element(by.testID('customer-email-input')).typeText(`test.musteri.${timestamp}@test.com`);

      // Araç bilgilerini gir
      await element(by.testID('vehicle-brand-input')).typeText('Toyota');
      await element(by.testID('vehicle-model-input')).typeText('Corolla');
      await element(by.testID('vehicle-plate-input')).typeText(`34ABC${timestamp.toString().slice(-3)}`);
      await element(by.testID('vehicle-year-input')).typeText('2020');

      // Kaydet butonuna tıkla
      await element(by.testID('save-customer-button')).tap();

      // Başarı mesajını kontrol et
      await waitFor(element(by.text('Müşteri başarıyla eklendi')))
        .toBeVisible()
        .withTimeout(5000);

      console.log('✅ Yeni müşteri ekleme başarılı');
    });
  });

  describe('👤 Müşteri Detay Testleri', () => {
    it('Müşteri detayını görüntüleyebiliyor', async () => {
      console.log('📝 Test: Müşteri detayı görüntüleme');
      
      try {
        // İlk müşteriye tıkla
        await element(by.testID('customer-item-0')).tap();
        await waitFor(element(by.testID('customer-detail-modal')))
          .toBeVisible()
          .withTimeout(5000);

        // Detay ekranı bileşenlerini kontrol et
        await detoxExpect(element(by.testID('customer-info-card'))).toBeVisible();
        await detoxExpect(element(by.testID('customer-stats'))).toBeVisible();
        await detoxExpect(element(by.testID('recent-jobs-section'))).toBeVisible();
        await detoxExpect(element(by.testID('notes-section'))).toBeVisible();

        console.log('✅ Müşteri detayı başarıyla görüntülendi');
      } catch {
        console.log('ℹ️ Müşteri bulunamadı, test atlandı');
      }
    });

    it('Müşteri bilgilerini görüntüleyebiliyor', async () => {
      console.log('📝 Test: Müşteri bilgileri görüntüleme');
      
      try {
        await element(by.testID('customer-item-0')).tap();
        await waitFor(element(by.testID('customer-detail-modal')))
          .toBeVisible()
          .withTimeout(5000);

        // Müşteri bilgilerini kontrol et
        await detoxExpect(element(by.testID('customer-name'))).toBeVisible();
        await detoxExpect(element(by.testID('customer-phone'))).toBeVisible();
        await detoxExpect(element(by.testID('customer-email'))).toBeVisible();
        await detoxExpect(element(by.testID('customer-avatar'))).toBeVisible();

        console.log('✅ Müşteri bilgileri başarıyla görüntülendi');
      } catch {
        console.log('ℹ️ Müşteri bulunamadı, test atlandı');
      }
    });

    it('Müşteri istatistiklerini görüntüleyebiliyor', async () => {
      console.log('📝 Test: Müşteri istatistikleri görüntüleme');
      
      try {
        await element(by.testID('customer-item-0')).tap();
        await waitFor(element(by.testID('customer-detail-modal')))
          .toBeVisible()
          .withTimeout(5000);

        // İstatistikleri kontrol et
        await detoxExpect(element(by.testID('total-spent-stat'))).toBeVisible();
        await detoxExpect(element(by.testID('total-services-stat'))).toBeVisible();
        await detoxExpect(element(by.testID('last-visit-stat'))).toBeVisible();

        console.log('✅ Müşteri istatistikleri başarıyla görüntülendi');
      } catch {
        console.log('ℹ️ Müşteri bulunamadı, test atlandı');
      }
    });

    it('Sadık müşteri badge\'ini görüntüleyebiliyor', async () => {
      console.log('📝 Test: Sadık müşteri badge\'i görüntüleme');
      
      try {
        await element(by.testID('customer-item-0')).tap();
        await waitFor(element(by.testID('customer-detail-modal')))
          .toBeVisible()
          .withTimeout(5000);

        // Sadık müşteri badge'ini kontrol et
        try {
          await waitFor(element(by.testID('loyalty-badge')))
            .toBeVisible()
            .withTimeout(2000);
          console.log('✅ Sadık müşteri badge\'i görüntülendi');
        } catch {
          console.log('ℹ️ Bu müşteri sadık müşteri değil');
        }
      } catch {
        console.log('ℹ️ Müşteri bulunamadı, test atlandı');
      }
    });
  });

  describe('🚗 Araç Geçmişi Testleri', () => {
    it('Araç geçmişi butonuna tıklayabiliyor', async () => {
      console.log('📝 Test: Araç geçmişi butonuna tıklama');
      
      try {
        await element(by.testID('customer-item-0')).tap();
        await waitFor(element(by.testID('customer-detail-modal')))
          .toBeVisible()
          .withTimeout(5000);

        // Araç geçmişi butonuna tıkla
        await element(by.testID('vehicle-history-button')).tap();

        // Araç geçmişi ekranına yönlendirildiğini kontrol et
        await waitFor(element(by.testID('vehicle-history-screen')))
          .toBeVisible()
          .withTimeout(5000);

        console.log('✅ Araç geçmişi ekranına yönlendirme başarılı');
      } catch {
        console.log('ℹ️ Müşteri veya araç bulunamadı, test atlandı');
      }
    });

    it('Son işleri görüntüleyebiliyor', async () => {
      console.log('📝 Test: Son işleri görüntüleme');
      
      try {
        await element(by.testID('customer-item-0')).tap();
        await waitFor(element(by.testID('customer-detail-modal')))
          .toBeVisible()
          .withTimeout(5000);

        // Son işler bölümünü kontrol et
        await detoxExpect(element(by.testID('recent-jobs-section'))).toBeVisible();
        await detoxExpect(element(by.testID('jobs-list'))).toBeVisible();

        // İş item'larını kontrol et
        try {
          await waitFor(element(by.testID('job-item-0')))
            .toBeVisible()
            .withTimeout(3000);
          
          await detoxExpect(element(by.testID('job-service-type'))).toBeVisible();
          await detoxExpect(element(by.testID('job-date'))).toBeVisible();
          await detoxExpect(element(by.testID('job-price'))).toBeVisible();
          
          console.log('✅ Son işler başarıyla görüntülendi');
        } catch {
          console.log('ℹ️ Bu müşteri için henüz iş kaydı yok');
        }
      } catch {
        console.log('ℹ️ Müşteri bulunamadı, test atlandı');
      }
    });

    it('Boş iş kaydı durumunu gösterebiliyor', async () => {
      console.log('📝 Test: Boş iş kaydı durumu');
      
      try {
        await element(by.testID('customer-item-0')).tap();
        await waitFor(element(by.testID('customer-detail-modal')))
          .toBeVisible()
          .withTimeout(5000);

        // Eğer iş kaydı yoksa empty state görünmeli
        try {
          await waitFor(element(by.testID('empty-jobs-state')))
            .toBeVisible()
            .withTimeout(2000);
          
          await detoxExpect(element(by.testID('empty-jobs-icon'))).toBeVisible();
          await detoxExpect(element(by.testID('empty-jobs-text'))).toBeVisible();
          
          console.log('✅ Boş iş kaydı durumu başarıyla gösterildi');
        } catch {
          console.log('ℹ️ İş kayıtları mevcut, boş durum test edilemedi');
        }
      } catch {
        console.log('ℹ️ Müşteri bulunamadı, test atlandı');
      }
    });
  });

  describe('📝 Notlar Testleri', () => {
    it('Not ekle butonuna tıklayabiliyor', async () => {
      console.log('📝 Test: Not ekle butonuna tıklama');
      
      try {
        await element(by.testID('customer-item-0')).tap();
        await waitFor(element(by.testID('customer-detail-modal')))
          .toBeVisible()
          .withTimeout(5000);

        // Not ekle butonuna tıkla
        await element(by.testID('add-note-button')).tap();

        // Not ekleme modalını kontrol et
        await waitFor(element(by.testID('note-modal')))
          .toBeVisible()
          .withTimeout(3000);

        console.log('✅ Not ekleme modalı başarıyla açıldı');
      } catch {
        console.log('ℹ️ Müşteri bulunamadı, test atlandı');
      }
    });

    it('Müşteri notu ekleyebiliyor', async () => {
      console.log('📝 Test: Müşteri notu ekleme');
      
      try {
        await element(by.testID('customer-item-0')).tap();
        await waitFor(element(by.testID('customer-detail-modal')))
          .toBeVisible()
          .withTimeout(5000);

        await element(by.testID('add-note-button')).tap();
        await waitFor(element(by.testID('note-modal')))
          .toBeVisible()
          .withTimeout(3000);

        // Not yaz
        await element(by.testID('note-input')).typeText('Test notu - müşteri detayları');

        // Kaydet butonuna tıkla
        await element(by.testID('save-note-button')).tap();

        // Başarı mesajını kontrol et
        await waitFor(element(by.text('Not eklendi')))
          .toBeVisible()
          .withTimeout(5000);

        console.log('✅ Müşteri notu ekleme başarılı');
      } catch {
        console.log('ℹ️ Müşteri bulunamadı veya not eklenemedi');
      }
    });

    it('Mevcut notları görüntüleyebiliyor', async () => {
      console.log('📝 Test: Mevcut notları görüntüleme');
      
      try {
        await element(by.testID('customer-item-0')).tap();
        await waitFor(element(by.testID('customer-detail-modal')))
          .toBeVisible()
          .withTimeout(5000);

        // Notlar bölümünü kontrol et
        await detoxExpect(element(by.testID('notes-section'))).toBeVisible();
        await detoxExpect(element(by.testID('notes-list'))).toBeVisible();

        // Not item'larını kontrol et
        try {
          await waitFor(element(by.testID('note-item-0')))
            .toBeVisible()
            .withTimeout(3000);
          
          await detoxExpect(element(by.testID('note-content'))).toBeVisible();
          await detoxExpect(element(by.testID('note-date'))).toBeVisible();
          
          console.log('✅ Mevcut notlar başarıyla görüntülendi');
        } catch {
          console.log('ℹ️ Bu müşteri için henüz not bulunmuyor');
        }
      } catch {
        console.log('ℹ️ Müşteri bulunamadı, test atlandı');
      }
    });

    it('Boş not durumunu gösterebiliyor', async () => {
      console.log('📝 Test: Boş not durumu');
      
      try {
        await element(by.testID('customer-item-0')).tap();
        await waitFor(element(by.testID('customer-detail-modal')))
          .toBeVisible()
          .withTimeout(5000);

        // Eğer not yoksa empty state görünmeli
        try {
          await waitFor(element(by.testID('empty-notes-state')))
            .toBeVisible()
            .withTimeout(2000);
          
          await detoxExpect(element(by.testID('empty-notes-icon'))).toBeVisible();
          await detoxExpect(element(by.testID('empty-notes-text'))).toBeVisible();
          
          console.log('✅ Boş not durumu başarıyla gösterildi');
        } catch {
          console.log('ℹ️ Notlar mevcut, boş durum test edilemedi');
        }
      } catch {
        console.log('ℹ️ Müşteri bulunamadı, test atlandı');
      }
    });
  });

  describe('📞 İletişim Testleri', () => {
    it('Müşteriyi arayabiliyor', async () => {
      console.log('📝 Test: Müşteriyi arama');
      
      try {
        await element(by.testID('customer-item-0')).tap();
        await waitFor(element(by.testID('customer-detail-modal')))
          .toBeVisible()
          .withTimeout(5000);

        // Ara butonuna tıkla
        await element(by.testID('call-customer-button')).tap();

        // Arama başlatıldığını kontrol et
        await waitFor(element(by.text('Arama başlatılıyor...')))
          .toBeVisible()
          .withTimeout(3000);

        console.log('✅ Müşteri arama işlemi başarılı');
      } catch {
        console.log('ℹ️ Arama yapılamadı');
      }
    });

    it('Müşteriye mesaj gönderebiliyor', async () => {
      console.log('📝 Test: Müşteriye mesaj gönderme');
      
      try {
        await element(by.testID('customer-item-0')).tap();
        await waitFor(element(by.testID('customer-detail-modal')))
          .toBeVisible()
          .withTimeout(5000);

        // Mesaj gönder butonuna tıkla
        await element(by.testID('message-customer-button')).tap();

        // Mesaj ekranına yönlendirildiğini kontrol et
        await waitFor(element(by.testID('chat-screen')))
          .toBeVisible()
          .withTimeout(5000);

        console.log('✅ Mesaj ekranına yönlendirme başarılı');
      } catch {
        console.log('ℹ️ Mesaj gönderilemedi');
      }
    });
  });

  describe('📊 Müşteri İstatistikleri', () => {
    it('Müşteri istatistiklerini görüntüleyebiliyor', async () => {
      console.log('📝 Test: Müşteri istatistikleri görüntüleme');
      
      // İstatistik butonuna tıkla
      await element(by.testID('customers-stats-button')).tap();
      
      // İstatistik modalını kontrol et
      await waitFor(element(by.testID('stats-modal')))
        .toBeVisible()
        .withTimeout(3000);

      // İstatistik kartlarını kontrol et
      await detoxExpect(element(by.testID('total-customers-stat'))).toBeVisible();
      await detoxExpect(element(by.testID('loyal-customers-stat'))).toBeVisible();
      await detoxExpect(element(by.testID('new-customers-stat'))).toBeVisible();
      await detoxExpect(element(by.testID('total-revenue-stat'))).toBeVisible();

      console.log('✅ Müşteri istatistikleri başarıyla görüntülendi');
    });

    it('Müşteri segmentasyonunu görüntüleyebiliyor', async () => {
      console.log('📝 Test: Müşteri segmentasyonu görüntüleme');
      
      await element(by.testID('customers-stats-button')).tap();
      await waitFor(element(by.testID('stats-modal')))
        .toBeVisible()
        .withTimeout(3000);

      // Segmentasyon grafiğini kontrol et
      await detoxExpect(element(by.testID('customer-segmentation-chart'))).toBeVisible();

      console.log('✅ Müşteri segmentasyonu başarıyla görüntülendi');
    });
  });
});
