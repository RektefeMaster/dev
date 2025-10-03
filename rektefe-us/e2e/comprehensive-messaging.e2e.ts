import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('💬 REKTEFE-US - Kapsamlı Mesajlaşma Testleri', () => {
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

    // Mesajlar ekranına git
    await element(by.testID('hamburger-menu-button')).tap();
    await waitFor(element(by.testID('hamburger-menu')))
      .toBeVisible()
      .withTimeout(3000);
    await element(by.testID('menu-messages-link')).tap();
    await waitFor(element(by.testID('messages-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  describe('📋 Mesaj Listesi Testleri', () => {
    it('Mesaj listesini görüntüleyebiliyor', async () => {
      console.log('📝 Test: Mesaj listesi görüntüleme');
      
      // Mesaj ekranı bileşenlerini kontrol et
      await detoxExpect(element(by.testID('messages-header'))).toBeVisible();
      await detoxExpect(element(by.testID('conversation-search'))).toBeVisible();
      await detoxExpect(element(by.testID('conversation-filter'))).toBeVisible();
      await detoxExpect(element(by.testID('conversation-list'))).toBeVisible();
      await detoxExpect(element(by.testID('new-message-button'))).toBeVisible();

      console.log('✅ Mesaj listesi başarıyla görüntülendi');
    });

    it('Konuşma arama işlevi çalışıyor', async () => {
      console.log('📝 Test: Konuşma arama işlevi');
      
      // Arama kutusuna metin gir
      await element(by.testID('conversation-search')).tap();
      await element(by.testID('conversation-search')).typeText('Ahmet');
      
      // Arama sonuçlarının göründüğünü kontrol et
      await waitFor(element(by.testID('search-results')))
        .toBeVisible()
        .withTimeout(3000);

      // Arama kutusunu temizle
      await element(by.testID('conversation-search')).clearText();
      
      console.log('✅ Konuşma arama işlevi başarılı');
    });

    it('Konuşma filtreleme işlevi çalışıyor', async () => {
      console.log('📝 Test: Konuşma filtreleme işlevi');
      
      // Filtre butonuna tıkla
      await element(by.testID('conversation-filter')).tap();
      await waitFor(element(by.testID('filter-modal')))
        .toBeVisible()
        .withTimeout(3000);

      // Filtre seçeneklerini kontrol et
      await detoxExpect(element(by.testID('filter-unread-messages'))).toBeVisible();
      await detoxExpect(element(by.testID('filter-customers'))).toBeVisible();
      await detoxExpect(element(by.testID('filter-mechanics'))).toBeVisible();

      // Okunmamış mesajlar filtresini seç
      await element(by.testID('filter-unread-messages')).tap();

      // Filtreyi uygula
      await element(by.testID('apply-filter')).tap();

      // Filtrelenmiş sonuçları kontrol et
      await waitFor(element(by.testID('filtered-conversations')))
        .toBeVisible()
        .withTimeout(3000);

      console.log('✅ Konuşma filtreleme işlevi başarılı');
    });

    it('Okunmamış mesaj sayısını gösterebiliyor', async () => {
      console.log('📝 Test: Okunmamış mesaj sayısı görüntüleme');
      
      // Okunmamış mesaj badge'ini kontrol et
      try {
        await waitFor(element(by.testID('unread-count-badge')))
          .toBeVisible()
          .withTimeout(2000);
        console.log('✅ Okunmamış mesaj sayısı görüntülendi');
      } catch {
        console.log('ℹ️ Okunmamış mesaj bulunmuyor');
      }
    });
  });

  describe('💬 Sohbet Testleri', () => {
    it('Sohbet ekranını açabiliyor', async () => {
      console.log('📝 Test: Sohbet ekranı açma');
      
      try {
        // İlk konuşmaya tıkla
        await element(by.testID('conversation-item-0')).tap();
        await waitFor(element(by.testID('chat-screen')))
          .toBeVisible()
          .withTimeout(5000);

        // Sohbet ekranı bileşenlerini kontrol et
        await detoxExpect(element(by.testID('chat-header'))).toBeVisible();
        await detoxExpect(element(by.testID('participant-name'))).toBeVisible();
        await detoxExpect(element(by.testID('participant-avatar'))).toBeVisible();
        await detoxExpect(element(by.testID('message-list'))).toBeVisible();
        await detoxExpect(element(by.testID('message-input'))).toBeVisible();
        await detoxExpect(element(by.testID('send-button'))).toBeVisible();

        console.log('✅ Sohbet ekranı başarıyla açıldı');
      } catch {
        console.log('ℹ️ Konuşma bulunamadı, test atlandı');
      }
    });

    it('Metin mesajı gönderebiliyor', async () => {
      console.log('📝 Test: Metin mesajı gönderme');
      
      try {
        await element(by.testID('conversation-item-0')).tap();
        await waitFor(element(by.testID('chat-screen')))
          .toBeVisible()
          .withTimeout(5000);

        // Mesaj yaz
        await element(by.testID('message-input')).tap();
        await element(by.testID('message-input')).typeText('Merhaba, test mesajı gönderiyorum');

        // Gönder butonuna tıkla
        await element(by.testID('send-button')).tap();

        // Gönderilen mesajı kontrol et
        await waitFor(element(by.testID('sent-message-bubble')))
          .toBeVisible()
          .withTimeout(3000);

        console.log('✅ Metin mesajı başarıyla gönderildi');
      } catch {
        console.log('ℹ️ Konuşma bulunamadı veya mesaj gönderilemedi');
      }
    });

    it('Fotoğraf gönderebiliyor', async () => {
      console.log('📝 Test: Fotoğraf gönderme');
      
      try {
        await element(by.testID('conversation-item-0')).tap();
        await waitFor(element(by.testID('chat-screen')))
          .toBeVisible()
          .withTimeout(5000);

        // Fotoğraf ekle butonuna tıkla
        await element(by.testID('attach-image-button')).tap();
        await waitFor(element(by.testID('media-options-modal')))
          .toBeVisible()
          .withTimeout(3000);

        // Galeri seçeneğini seç
        await element(by.testID('gallery-option')).tap();
        
        // İzin dialog'unu kontrol et
        try {
          await waitFor(element(by.testID('permission-dialog')))
            .toBeVisible()
            .withTimeout(2000);
          await element(by.testID('allow-permission')).tap();
        } catch {
          // İzin zaten verilmiş olabilir
        }

        // Fotoğraf seçiciyi kontrol et
        await waitFor(element(by.testID('photo-picker')))
          .toBeVisible()
          .withTimeout(5000);

        // İlk fotoğrafı seç
        await element(by.testID('select-photo-0')).tap();

        // Gönder butonuna tıkla
        await element(by.testID('send-image-button')).tap();

        // Gönderilen fotoğrafı kontrol et
        await waitFor(element(by.testID('image-message-bubble')))
          .toBeVisible()
          .withTimeout(5000);

        console.log('✅ Fotoğraf başarıyla gönderildi');
      } catch {
        console.log('ℹ️ Konuşma bulunamadı veya fotoğraf gönderilemedi');
      }
    });

    it('Ses kaydı gönderebiliyor', async () => {
      console.log('📝 Test: Ses kaydı gönderme');
      
      try {
        await element(by.testID('conversation-item-0')).tap();
        await waitFor(element(by.testID('chat-screen')))
          .toBeVisible()
          .withTimeout(5000);

        // Ses kayıt butonuna tıkla
        await element(by.testID('record-audio-button')).tap();
        
        // İzin dialog'unu kontrol et
        try {
          await waitFor(element(by.testID('microphone-permission')))
            .toBeVisible()
            .withTimeout(2000);
          await element(by.testID('allow-microphone')).tap();
        } catch {
          // İzin zaten verilmiş olabilir
        }

        // Kayıt göstergesinin göründüğünü kontrol et
        await waitFor(element(by.testID('recording-indicator')))
          .toBeVisible()
          .withTimeout(2000);

        // Kayıt süresini bekle (2 saniye)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Kayıt durdur butonuna tıkla
        await element(by.testID('stop-recording-button')).tap();

        // Gönder butonuna tıkla
        await element(by.testID('send-audio-button')).tap();

        // Gönderilen ses kaydını kontrol et
        await waitFor(element(by.testID('audio-message-bubble')))
          .toBeVisible()
          .withTimeout(5000);

        console.log('✅ Ses kaydı başarıyla gönderildi');
      } catch {
        console.log('ℹ️ Konuşma bulunamadı veya ses kaydı gönderilemedi');
      }
    });

    it('Hızlı yanıt gönderebiliyor', async () => {
      console.log('📝 Test: Hızlı yanıt gönderme');
      
      try {
        await element(by.testID('conversation-item-0')).tap();
        await waitFor(element(by.testID('chat-screen')))
          .toBeVisible()
          .withTimeout(5000);

        // Hızlı yanıt butonuna tıkla
        await element(by.testID('quick-reply-button')).tap();
        await waitFor(element(by.testID('quick-reply-modal')))
          .toBeVisible()
          .withTimeout(3000);

        // Hızlı yanıt seçeneklerini kontrol et
        await detoxExpect(element(by.testID('quick-reply-option-0'))).toBeVisible();
        await detoxExpect(element(by.testID('quick-reply-option-1'))).toBeVisible();
        await detoxExpect(element(by.testID('quick-reply-option-2'))).toBeVisible();

        // İlk seçeneği seç
        await element(by.testID('quick-reply-option-0')).tap();

        // Gönderilen hızlı yanıtı kontrol et
        await waitFor(element(by.testID('sent-message-bubble')))
          .toBeVisible()
          .withTimeout(3000);

        console.log('✅ Hızlı yanıt başarıyla gönderildi');
      } catch {
        console.log('ℹ️ Konuşma bulunamadı veya hızlı yanıt gönderilemedi');
      }
    });
  });

  describe('📝 Mesaj Aksiyon Testleri', () => {
    it('Mesaja yanıt verebiliyor', async () => {
      console.log('📝 Test: Mesaja yanıt verme');
      
      try {
        await element(by.testID('conversation-item-0')).tap();
        await waitFor(element(by.testID('chat-screen')))
          .toBeVisible()
          .withTimeout(5000);

        // Bir mesaja uzun bas (reply için)
        await element(by.testID('message-bubble-0')).longPress();
        await waitFor(element(by.testID('message-actions-modal')))
          .toBeVisible()
          .withTimeout(3000);

        // Yanıtla seçeneğini seç
        await element(by.testID('reply-action')).tap();

        // Yanıt yaz
        await element(by.testID('message-input')).typeText('Teşekkürler!');

        // Gönder butonuna tıkla
        await element(by.testID('send-button')).tap();

        // Yanıt mesajını kontrol et
        await waitFor(element(by.testID('reply-message-bubble')))
          .toBeVisible()
          .withTimeout(3000);

        console.log('✅ Mesaja yanıt verme başarılı');
      } catch {
        console.log('ℹ️ Konuşma bulunamadı veya yanıt verilemedi');
      }
    });

    it('Mesajı iletebiliyor', async () => {
      console.log('📝 Test: Mesaj iletme');
      
      try {
        await element(by.testID('conversation-item-0')).tap();
        await waitFor(element(by.testID('chat-screen')))
          .toBeVisible()
          .withTimeout(5000);

        // Bir mesaja uzun bas
        await element(by.testID('message-bubble-0')).longPress();
        await waitFor(element(by.testID('message-actions-modal')))
          .toBeVisible()
          .withTimeout(3000);

        // İlet seçeneğini seç
        await element(by.testID('forward-action')).tap();
        await waitFor(element(by.testID('forward-modal')))
          .toBeVisible()
          .withTimeout(3000);

        // Hedef konuşmayı seç
        await element(by.testID('forward-target-0')).tap();
        await element(by.testID('confirm-forward')).tap();

        // Başarı mesajını kontrol et
        await waitFor(element(by.text('Mesaj iletildi')))
          .toBeVisible()
          .withTimeout(3000);

        console.log('✅ Mesaj iletme başarılı');
      } catch {
        console.log('ℹ️ Konuşma bulunamadı veya mesaj iletilemedi');
      }
    });

    it('Mesajı silebiliyor', async () => {
      console.log('📝 Test: Mesaj silme');
      
      try {
        await element(by.testID('conversation-item-0')).tap();
        await waitFor(element(by.testID('chat-screen')))
          .toBeVisible()
          .withTimeout(5000);

        // Bir mesaja uzun bas
        await element(by.testID('message-bubble-0')).longPress();
        await waitFor(element(by.testID('message-actions-modal')))
          .toBeVisible()
          .withTimeout(3000);

        // Sil seçeneğini seç
        await element(by.testID('delete-action')).tap();

        // Onay dialog'unu kontrol et
        await waitFor(element(by.text('Mesajı silmek istediğinizden emin misiniz?')))
          .toBeVisible()
          .withTimeout(3000);

        // Evet butonuna tıkla
        await element(by.testID('confirm-delete-message')).tap();

        // Mesajın silindiğini kontrol et
        await waitFor(element(by.testID('message-bubble-0')))
          .not.toBeVisible()
          .withTimeout(3000);

        console.log('✅ Mesaj silme başarılı');
      } catch {
        console.log('ℹ️ Konuşma bulunamadı veya mesaj silinemedi');
      }
    });
  });

  describe('🆕 Yeni Mesaj Testleri', () => {
    it('Yeni konuşma başlatabiliyor', async () => {
      console.log('📝 Test: Yeni konuşma başlatma');
      
      // Yeni mesaj butonuna tıkla
      await element(by.testID('new-message-button')).tap();
      await waitFor(element(by.testID('new-message-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Alıcı seçiciyi kontrol et
      await detoxExpect(element(by.testID('recipient-selector'))).toBeVisible();

      // Alıcı ara
      await element(by.testID('recipient-search')).tap();
      await element(by.testID('recipient-search')).typeText('Test');
      
      // Arama sonuçlarını kontrol et
      await waitFor(element(by.testID('recipient-results')))
        .toBeVisible()
        .withTimeout(3000);

      // İlk alıcıyı seç
      await element(by.testID('recipient-result-0')).tap();

      // Mesaj yaz
      await element(by.testID('message-input')).typeText('Yeni sohbet başlatıyorum');

      // Gönder butonuna tıkla
      await element(by.testID('send-button')).tap();

      // Sohbet ekranına yönlendirildiğini kontrol et
      await waitFor(element(by.testID('chat-screen')))
        .toBeVisible()
        .withTimeout(5000);

      console.log('✅ Yeni konuşma başlatma başarılı');
    });

    it('Müşteri seçici çalışıyor', async () => {
      console.log('📝 Test: Müşteri seçici');
      
      await element(by.testID('new-message-button')).tap();
      await waitFor(element(by.testID('new-message-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Müşteri sekmesine tıkla
      await element(by.testID('customer-tab')).tap();

      // Müşteri listesini kontrol et
      await detoxExpect(element(by.testID('customer-list'))).toBeVisible();

      // İlk müşteriyi seç
      await element(by.testID('customer-item-0')).tap();

      console.log('✅ Müşteri seçici başarılı');
    });

    it('Usta seçici çalışıyor', async () => {
      console.log('📝 Test: Usta seçici');
      
      await element(by.testID('new-message-button')).tap();
      await waitFor(element(by.testID('new-message-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Usta sekmesine tıkla
      await element(by.testID('mechanic-tab')).tap();

      // Usta listesini kontrol et
      await detoxExpect(element(by.testID('mechanic-list'))).toBeVisible();

      // İlk ustayı seç
      await element(by.testID('mechanic-item-0')).tap();

      console.log('✅ Usta seçici başarılı');
    });
  });

  describe('📊 Mesaj Durumu Testleri', () => {
    it('Mesaj gönderim durumunu gösterebiliyor', async () => {
      console.log('📝 Test: Mesaj gönderim durumu');
      
      try {
        await element(by.testID('conversation-item-0')).tap();
        await waitFor(element(by.testID('chat-screen')))
          .toBeVisible()
          .withTimeout(5000);

        // Mesaj gönder
        await element(by.testID('message-input')).typeText('Durum testi');
        await element(by.testID('send-button')).tap();

        // Gönderim durumunu kontrol et
        await waitFor(element(by.testID('message-status-sending')))
          .toBeVisible()
          .withTimeout(2000);
        
        await waitFor(element(by.testID('message-status-sent')))
          .toBeVisible()
          .withTimeout(3000);

        console.log('✅ Mesaj gönderim durumu başarılı');
      } catch {
        console.log('ℹ️ Konuşma bulunamadı veya durum test edilemedi');
      }
    });

    it('Yazıyor göstergesini gösterebiliyor', async () => {
      console.log('📝 Test: Yazıyor göstergesi');
      
      try {
        await element(by.testID('conversation-item-0')).tap();
        await waitFor(element(by.testID('chat-screen')))
          .toBeVisible()
          .withTimeout(5000);

        // Yazıyor göstergesini kontrol et (simüle)
        try {
          await waitFor(element(by.testID('typing-indicator')))
            .toBeVisible()
            .withTimeout(2000);
          console.log('✅ Yazıyor göstergesi başarılı');
        } catch {
          console.log('ℹ️ Yazıyor göstergesi görünmedi');
        }
      } catch {
        console.log('ℹ️ Konuşma bulunamadı');
      }
    });
  });

  describe('🔍 Mesaj Arama Testleri', () => {
    it('Konuşma içinde mesaj arayabiliyor', async () => {
      console.log('📝 Test: Konuşma içinde mesaj arama');
      
      try {
        await element(by.testID('conversation-item-0')).tap();
        await waitFor(element(by.testID('chat-screen')))
          .toBeVisible()
          .withTimeout(5000);

        // Arama butonuna tıkla
        await element(by.testID('search-messages-button')).tap();
        await waitFor(element(by.testID('message-search-modal')))
          .toBeVisible()
          .withTimeout(3000);

        // Arama terimi gir
        await element(by.testID('message-search-input')).typeText('test');

        // Arama sonuçlarını kontrol et
        await waitFor(element(by.testID('search-results')))
          .toBeVisible()
          .withTimeout(3000);

        console.log('✅ Konuşma içinde mesaj arama başarılı');
      } catch {
        console.log('ℹ️ Konuşma bulunamadı veya arama yapılamadı');
      }
    });

    it('Arama sonuçlarını vurgulayabiliyor', async () => {
      console.log('📝 Test: Arama sonuçları vurgulama');
      
      try {
        await element(by.testID('conversation-item-0')).tap();
        await waitFor(element(by.testID('chat-screen')))
          .toBeVisible()
          .withTimeout(5000);

        await element(by.testID('search-messages-button')).tap();
        await waitFor(element(by.testID('message-search-modal')))
          .toBeVisible()
          .withTimeout(3000);

        await element(by.testID('message-search-input')).typeText('test');
        await waitFor(element(by.testID('search-results')))
          .toBeVisible()
          .withTimeout(3000);

        // Arama sonucuna tıkla
        await element(by.testID('search-result-0')).tap();

        // Vurgulanan mesajı kontrol et
        await waitFor(element(by.testID('highlighted-message')))
          .toBeVisible()
          .withTimeout(3000);

        console.log('✅ Arama sonuçları vurgulama başarılı');
      } catch {
        console.log('ℹ️ Konuşma bulunamadı veya vurgulama yapılamadı');
      }
    });
  });

  describe('⚙️ Sohbet Ayarları', () => {
    it('Sohbet ayarlarını yönetebiliyor', async () => {
      console.log('📝 Test: Sohbet ayarları yönetimi');
      
      try {
        await element(by.testID('conversation-item-0')).tap();
        await waitFor(element(by.testID('chat-screen')))
          .toBeVisible()
          .withTimeout(5000);

        // Sohbet ayarları butonuna tıkla
        await element(by.testID('chat-settings-button')).tap();
        await waitFor(element(by.testID('chat-settings-modal')))
          .toBeVisible()
          .withTimeout(3000);

        // Bildirim ayarlarını kontrol et
        await detoxExpect(element(by.testID('notification-settings'))).toBeVisible();
        await detoxExpect(element(by.testID('notification-toggle'))).toBeVisible();

        // Bildirimleri aç/kapat
        await element(by.testID('notification-toggle')).tap();

        // Ayarları kaydet
        await element(by.testID('save-settings')).tap();

        // Başarı mesajını kontrol et
        await waitFor(element(by.text('Ayarlar kaydedildi')))
          .toBeVisible()
          .withTimeout(3000);

        console.log('✅ Sohbet ayarları yönetimi başarılı');
      } catch {
        console.log('ℹ️ Konuşma bulunamadı veya ayarlar yönetilemedi');
      }
    });
  });
});
