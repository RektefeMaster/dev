const { TestUtils, testData } = require('../utils/testUtils');

describe('Messaging Tests', () => {
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

  describe('Messages Screen', () => {
    it('should display messages list', async () => {
      // Mesajlar sekmesine git
      await TestUtils.tapElement('messages-tab');
      await TestUtils.waitForElement('messages-screen');

      // Mesaj listesi elementlerini kontrol et
      await TestUtils.waitForElement('conversation-list');
      await TestUtils.waitForElement('conversation-item-0');

      // İlk konuşmadaki bilgileri kontrol et
      await TestUtils.waitForElement('conversation-avatar');
      await TestUtils.waitForElement('conversation-name');
      await TestUtils.waitForElement('last-message');
      await TestUtils.waitForElement('message-time');
      await TestUtils.waitForElement('unread-badge');
    });

    it('should filter conversations by type', async () => {
      // Mesajlar sekmesine git
      await TestUtils.tapElement('messages-tab');
      await TestUtils.waitForElement('messages-screen');

      // Filtre butonuna tıkla
      await TestUtils.tapElement('conversation-filter');
      await TestUtils.waitForElement('filter-modal');

      // "Usta" mesajlarını seç
      await TestUtils.tapElement('filter-mechanics');
      await TestUtils.tapElement('apply-filter');

      // Filtrelenmiş sonuçları kontrol et
      await TestUtils.waitForElement('filtered-conversations');
    });

    it('should search conversations', async () => {
      // Mesajlar sekmesine git
      await TestUtils.tapElement('messages-tab');
      await TestUtils.waitForElement('messages-screen');

      // Arama kutusuna değer gir
      await TestUtils.clearAndTypeText('conversation-search', 'Ahmet');

      // Arama sonuçlarını kontrol et
      await TestUtils.waitForElement('search-results');
      await TestUtils.waitForText('Ahmet');
    });

    it('should show unread message count', async () => {
      // Mesajlar sekmesine git
      await TestUtils.tapElement('messages-tab');
      await TestUtils.waitForElement('messages-screen');

      // Okunmamış mesaj sayısını kontrol et
      await TestUtils.waitForElement('unread-count-badge');

      // Okunmamış konuşmaları kontrol et
      await TestUtils.waitForElement('unread-conversation-item');
    });
  });

  describe('Chat Screen', () => {
    it('should open and display chat', async () => {
      // İlk konuşmaya tıkla
      await TestUtils.tapElement('messages-tab');
      await TestUtils.tapElement('conversation-item-0');
      await TestUtils.waitForElement('chat-screen');

      // Sohbet başlığını kontrol et
      await TestUtils.waitForElement('chat-header');
      await TestUtils.waitForElement('participant-name');
      await TestUtils.waitForElement('participant-avatar');

      // Mesaj listesini kontrol et
      await TestUtils.waitForElement('message-list');
      await TestUtils.waitForElement('message-bubble-0');

      // Mesaj giriş alanını kontrol et
      await TestUtils.waitForElement('message-input');
      await TestUtils.waitForElement('send-button');
    });

    it('should send text message', async () => {
      // Sohbet ekranına git
      await TestUtils.tapElement('messages-tab');
      await TestUtils.tapElement('conversation-item-0');
      await TestUtils.waitForElement('chat-screen');

      // Mesaj yaz
      await TestUtils.clearAndTypeText('message-input', 'Merhaba, test mesajı');

      // Gönder butonuna tıkla
      await TestUtils.tapElement('send-button');

      // Gönderilen mesajı kontrol et
      await TestUtils.waitForElement('sent-message-bubble');
      await TestUtils.waitForText('Merhaba, test mesajı');
    });

    it('should send image message', async () => {
      // Sohbet ekranına git
      await TestUtils.tapElement('messages-tab');
      await TestUtils.tapElement('conversation-item-0');
      await TestUtils.waitForElement('chat-screen');

      // Fotoğraf ekle butonuna tıkla
      await TestUtils.tapElement('attach-image-button');
      await TestUtils.waitForElement('image-picker-modal');

      // Galeriden fotoğraf seç
      await TestUtils.tapElement('gallery-option');
      await TestUtils.waitForElement('photo-picker');
      await TestUtils.tapElement('select-photo-1');

      // Gönder butonuna tıkla
      await TestUtils.tapElement('send-image-button');

      // Gönderilen fotoğrafı kontrol et
      await TestUtils.waitForElement('image-message-bubble');
    });

    it('should send location', async () => {
      // Sohbet ekranına git
      await TestUtils.tapElement('messages-tab');
      await TestUtils.tapElement('conversation-item-0');
      await TestUtils.waitForElement('chat-screen');

      // Konum gönder butonuna tıkla
      await TestUtils.tapElement('send-location-button');
      await TestUtils.waitForElement('location-permission-modal');

      // İzin ver butonuna tıkla
      await TestUtils.tapElement('allow-location');

      // Konum seçiciyi kontrol et
      await TestUtils.waitForElement('location-picker-modal');
      await TestUtils.tapElement('current-location');
      await TestUtils.tapElement('send-location-confirm');

      // Gönderilen konumu kontrol et
      await TestUtils.waitForElement('location-message-bubble');
    });
  });

  describe('Message Actions', () => {
    it('should reply to message', async () => {
      // Sohbet ekranına git
      await TestUtils.tapElement('messages-tab');
      await TestUtils.tapElement('conversation-item-0');
      await TestUtils.waitForElement('chat-screen');

      // Bir mesaja uzun bas (reply için)
      await TestUtils.tapElement('message-bubble-0', { longPress: true });
      await TestUtils.waitForElement('message-actions-modal');

      // Yanıtla seçeneğini seç
      await TestUtils.tapElement('reply-action');

      // Yanıt yaz
      await TestUtils.clearAndTypeText('message-input', 'Teşekkürler!');

      // Gönder butonuna tıkla
      await TestUtils.tapElement('send-button');

      // Yanıt mesajını kontrol et
      await TestUtils.waitForElement('reply-message-bubble');
    });

    it('should forward message', async () => {
      // Sohbet ekranına git
      await TestUtils.tapElement('messages-tab');
      await TestUtils.tapElement('conversation-item-0');
      await TestUtils.waitForElement('chat-screen');

      // Bir mesaja uzun bas
      await TestUtils.tapElement('message-bubble-0', { longPress: true });
      await TestUtils.waitForElement('message-actions-modal');

      // İlet seçeneğini seç
      await TestUtils.tapElement('forward-action');
      await TestUtils.waitForElement('forward-modal');

      // Hedef konuşmayı seç
      await TestUtils.tapElement('forward-target-1');
      await TestUtils.tapElement('confirm-forward');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Mesaj iletildi');
    });

    it('should delete message', async () => {
      // Sohbet ekranına git
      await TestUtils.tapElement('messages-tab');
      await TestUtils.tapElement('conversation-item-0');
      await TestUtils.waitForElement('chat-screen');

      // Bir mesaja uzun bas
      await TestUtils.tapElement('message-bubble-0', { longPress: true });
      await TestUtils.waitForElement('message-actions-modal');

      // Sil seçeneğini seç
      await TestUtils.tapElement('delete-action');

      // Onay dialog'unu kontrol et
      await TestUtils.waitForText('Mesajı silmek istediğinizden emin misiniz?');

      // Evet butonuna tıkla
      await TestUtils.tapElement('confirm-delete-message');

      // Mesajın silindiğini kontrol et
      await TestUtils.waitForElementNotVisible('message-bubble-0');
    });
  });

  describe('New Message', () => {
    it('should start new conversation', async () => {
      // Mesajlar sekmesine git
      await TestUtils.tapElement('messages-tab');
      await TestUtils.waitForElement('messages-screen');

      // Yeni mesaj butonuna tıkla
      await TestUtils.tapElement('new-message-button');
      await TestUtils.waitForElement('new-message-screen');

      // Alıcı seçiciyi kontrol et
      await TestUtils.waitForElement('recipient-selector');

      // Alıcı ara
      await TestUtils.clearAndTypeText('recipient-search', 'Mehmet');
      await TestUtils.waitForElement('recipient-result-0');

      // Alıcıyı seç
      await TestUtils.tapElement('recipient-result-0');

      // Mesaj yaz
      await TestUtils.clearAndTypeText('message-input', 'Yeni sohbet başlatıyorum');

      // Gönder butonuna tıkla
      await TestUtils.tapElement('send-button');

      // Sohbet ekranına yönlendirildiğini kontrol et
      await TestUtils.waitForElement('chat-screen');
      await TestUtils.waitForText('Yeni sohbet başlatıyorum');
    });

    it('should create group conversation', async () => {
      // Yeni mesaj ekranına git
      await TestUtils.tapElement('messages-tab');
      await TestUtils.tapElement('new-message-button');
      await TestUtils.waitForElement('new-message-screen');

      // Grup oluştur butonuna tıkla
      await TestUtils.tapElement('create-group-button');
      await TestUtils.waitForElement('group-create-screen');

      // Grup adını gir
      await TestUtils.clearAndTypeText('group-name-input', 'Test Grubu');

      // Katılımcı ekle
      await TestUtils.tapElement('add-participant-button');
      await TestUtils.clearAndTypeText('participant-search', 'Ahmet');
      await TestUtils.tapElement('participant-result-0');
      await TestUtils.tapElement('participant-result-1');

      // Grup oluştur butonuna tıkla
      await TestUtils.tapElement('create-group-confirm');

      // Grup sohbetine yönlendirildiğini kontrol et
      await TestUtils.waitForElement('chat-screen');
      await TestUtils.waitForText('Test Grubu');
    });
  });

  describe('Message Status and Delivery', () => {
    it('should show message delivery status', async () => {
      // Sohbet ekranına git
      await TestUtils.tapElement('messages-tab');
      await TestUtils.tapElement('conversation-item-0');
      await TestUtils.waitForElement('chat-screen');

      // Mesaj gönder
      await TestUtils.clearAndTypeText('message-input', 'Durum testi');
      await TestUtils.tapElement('send-button');

      // Gönderim durumunu kontrol et
      await TestUtils.waitForElement('message-status-sending');
      await TestUtils.waitForElement('message-status-sent');
      await TestUtils.waitForElement('message-status-delivered');
      await TestUtils.waitForElement('message-status-read');
    });

    it('should handle typing indicator', async () => {
      // Sohbet ekranına git
      await TestUtils.tapElement('messages-tab');
      await TestUtils.tapElement('conversation-item-0');
      await TestUtils.waitForElement('chat-screen');

      // Yazıyor göstergesini kontrol et (simüle)
      await TestUtils.waitForElement('typing-indicator');

      // Yazıyor göstergesinin kaybolduğunu kontrol et
      await TestUtils.waitForElementNotVisible('typing-indicator');
    });
  });

  describe('Message Search', () => {
    it('should search within conversation', async () => {
      // Sohbet ekranına git
      await TestUtils.tapElement('messages-tab');
      await TestUtils.tapElement('conversation-item-0');
      await TestUtils.waitForElement('chat-screen');

      // Arama butonuna tıkla
      await TestUtils.tapElement('search-messages-button');
      await TestUtils.waitForElement('message-search-modal');

      // Arama terimi gir
      await TestUtils.clearAndTypeText('message-search-input', 'test');

      // Arama sonuçlarını kontrol et
      await TestUtils.waitForElement('search-result-0');
      await TestUtils.waitForText('test');
    });

    it('should highlight search results', async () => {
      // Arama sonuçlarına tıkla
      await TestUtils.tapElement('search-result-0');

      // Vurgulanan mesajı kontrol et
      await TestUtils.waitForElement('highlighted-message');
    });
  });

  describe('Chat Settings', () => {
    it('should manage chat settings', async () => {
      // Sohbet ekranına git
      await TestUtils.tapElement('messages-tab');
      await TestUtils.tapElement('conversation-item-0');
      await TestUtils.waitForElement('chat-screen');

      // Sohbet ayarları butonuna tıkla
      await TestUtils.tapElement('chat-settings-button');
      await TestUtils.waitForElement('chat-settings-modal');

      // Bildirim ayarlarını kontrol et
      await TestUtils.tapElement('notification-settings');
      await TestUtils.waitForElement('notification-toggle');
      await TestUtils.tapElement('notification-toggle'); // Aç/kapat

      // Sohbet duvar kağıdını değiştir
      await TestUtils.tapElement('wallpaper-settings');
      await TestUtils.waitForElement('wallpaper-picker');
      await TestUtils.tapElement('wallpaper-option-1');
      await TestUtils.tapElement('apply-wallpaper');

      // Ayarları kaydet
      await TestUtils.tapElement('save-settings');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Ayarlar kaydedildi');
    });
  });
});
