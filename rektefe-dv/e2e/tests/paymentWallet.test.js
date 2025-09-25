const { TestUtils, testData } = require('../utils/testUtils');

describe('Payment and Wallet Tests', () => {
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

  describe('Wallet Screen', () => {
    it('should display wallet balance and transactions', async () => {
      // Cüzdan sekmesine git
      await TestUtils.tapElement('wallet-tab');
      await TestUtils.waitForElement('wallet-screen');

      // Bakiye bilgisini kontrol et
      await TestUtils.waitForElement('wallet-balance');
      await TestUtils.waitForElement('available-balance');

      // İşlem geçmişini kontrol et
      await TestUtils.waitForElement('transaction-list');
      await TestUtils.waitForElement('transaction-item-0');

      // İşlem filtrelerini kontrol et
      await TestUtils.waitForElement('transaction-filter');
    });

    it('should filter transactions by type', async () => {
      // Cüzdan sekmesine git
      await TestUtils.tapElement('wallet-tab');
      await TestUtils.waitForElement('wallet-screen');

      // Filtre butonuna tıkla
      await TestUtils.tapElement('transaction-filter');
      await TestUtils.waitForElement('filter-modal');

      // "Gelen" işlemleri seç
      await TestUtils.tapElement('filter-income');
      await TestUtils.tapElement('apply-filter');

      // Filtrelenmiş sonuçları kontrol et
      await TestUtils.waitForElement('filtered-transactions');
    });

    it('should search transactions', async () => {
      // Cüzdan sekmesine git
      await TestUtils.tapElement('wallet-tab');
      await TestUtils.waitForElement('wallet-screen');

      // Arama kutusuna değer gir
      await TestUtils.clearAndTypeText('transaction-search', 'ödeme');

      // Arama sonuçlarını kontrol et
      await TestUtils.waitForElement('search-results');
      await TestUtils.waitForText('ödeme');
    });
  });

  describe('TEFE Wallet Screen', () => {
    it('should display TEFE points and history', async () => {
      // TEFE Cüzdan sekmesine git
      await TestUtils.tapElement('tefe-wallet-tab');
      await TestUtils.waitForElement('tefe-wallet-screen');

      // TEFE puan bilgisini kontrol et
      await TestUtils.waitForElement('tefe-points-balance');
      await TestUtils.waitForElement('available-points');

      // Puan geçmişi
      await TestUtils.waitForElement('points-history');
      await TestUtils.waitForElement('points-item-0');

      // Puan kazanma yolları
      await TestUtils.waitForElement('earn-points-section');
    });

    it('should display points earning opportunities', async () => {
      // TEFE Cüzdan sekmesine git
      await TestUtils.tapElement('tefe-wallet-tab');
      await TestUtils.waitForElement('tefe-wallet-screen');

      // Puan kazanma butonuna tıkla
      await TestUtils.tapElement('earn-points-button');
      await TestUtils.waitForElement('earn-points-modal');

      // Kazanma seçeneklerini kontrol et
      await TestUtils.waitForElement('referral-program');
      await TestUtils.waitForElement('complete-profile');
      await TestUtils.waitForElement('leave-review');
      await TestUtils.waitForElement('first-service');
    });

    it('should show points expiration info', async () => {
      // TEFE Cüzdan sekmesine git
      await TestUtils.tapElement('tefe-wallet-tab');
      await TestUtils.waitForElement('tefe-wallet-screen');

      // Puan süresi butonuna tıkla
      await TestUtils.tapElement('points-expiration-info');
      await TestUtils.waitForElement('expiration-modal');

      // Süre bilgilerini kontrol et
      await TestUtils.waitForElement('expiring-soon');
      await TestUtils.waitForElement('expiration-dates');
    });
  });

  describe('Payment Process', () => {
    it('should complete payment for appointment', async () => {
      // Ödeme yapılacak randevu detayına git
      await TestUtils.tapElement('appointment-item-pending-payment');
      await TestUtils.waitForElement('appointment-detail-screen');

      // Ödeme butonuna tıkla
      await TestUtils.tapElement('pay-appointment-button');
      await TestUtils.waitForElement('payment-screen');

      // Ödeme bilgilerini kontrol et
      await TestUtils.waitForElement('payment-amount');
      await TestUtils.waitForElement('payment-description');
      await TestUtils.waitForElement('mechanic-info');

      // Ödeme yöntemini seç
      await TestUtils.tapElement('payment-method-selector');
      await TestUtils.waitForElement('payment-method-modal');

      // Kredi kartı seç
      await TestUtils.tapElement('credit-card-option');
      await TestUtils.tapElement('method-confirm');

      // Kart bilgilerini gir
      await TestUtils.clearAndTypeText('card-number', '4111111111111111');
      await TestUtils.clearAndTypeText('card-expiry', '1225');
      await TestUtils.clearAndTypeText('card-cvv', '123');
      await TestUtils.clearAndTypeText('card-holder', 'Test User');

      // Ödeme butonuna tıkla
      await TestUtils.tapElement('complete-payment-button');

      // Ödeme işlemi simülasyonu
      await TestUtils.waitForElement('payment-processing');
      await TestUtils.sleep(3000);

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Ödeme başarıyla tamamlandı');
      await TestUtils.waitForElement('payment-success-screen');
    });

    it('should handle payment failure', async () => {
      // Ödeme ekranına git
      await TestUtils.tapElement('appointment-item-pending-payment');
      await TestUtils.tapElement('pay-appointment-button');
      await TestUtils.waitForElement('payment-screen');

      // Geçersiz kart bilgileri gir
      await TestUtils.clearAndTypeText('card-number', '4000000000000002'); // Declined card
      await TestUtils.clearAndTypeText('card-expiry', '1225');
      await TestUtils.clearAndTypeText('card-cvv', '123');
      await TestUtils.clearAndTypeText('card-holder', 'Test User');

      // Ödeme butonuna tıkla
      await TestUtils.tapElement('complete-payment-button');

      // Ödeme hatası mesajını kontrol et
      await TestUtils.waitForText('Ödeme işlemi başarısız');
      await TestUtils.waitForElement('payment-error-screen');

      // Tekrar dene butonuna tıkla
      await TestUtils.tapElement('retry-payment-button');
      await TestUtils.waitForElement('payment-screen');
    });

    it('should use TEFE points for payment', async () => {
      // Ödeme ekranına git
      await TestUtils.tapElement('appointment-item-pending-payment');
      await TestUtils.tapElement('pay-appointment-button');
      await TestUtils.waitForElement('payment-screen');

      // TEFE puan kullan checkbox'ına tıkla
      await TestUtils.tapElement('use-tefe-points');

      // Kullanılacak puan miktarını kontrol et
      await TestUtils.waitForElement('points-to-use');
      await TestUtils.waitForElement('remaining-amount');

      // Puan miktarını ayarla
      await TestUtils.clearAndTypeText('points-amount', '50');

      // Kalan tutarı kart ile öde
      await TestUtils.clearAndTypeText('card-number', '4111111111111111');
      await TestUtils.clearAndTypeText('card-expiry', '1225');
      await TestUtils.clearAndTypeText('card-cvv', '123');
      await TestUtils.clearAndTypeText('card-holder', 'Test User');

      // Ödeme butonuna tıkla
      await TestUtils.tapElement('complete-payment-button');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Ödeme başarıyla tamamlandı');
      await TestUtils.waitForText('50 TEFE puanı kullanıldı');
    });
  });

  describe('Payment Methods Management', () => {
    it('should add new payment method', async () => {
      // Cüzdan sekmesine git
      await TestUtils.tapElement('wallet-tab');
      await TestUtils.waitForElement('wallet-screen');

      // Ödeme yöntemleri butonuna tıkla
      await TestUtils.tapElement('payment-methods-button');
      await TestUtils.waitForElement('payment-methods-screen');

      // Yeni kart ekle butonuna tıkla
      await TestUtils.tapElement('add-card-button');
      await TestUtils.waitForElement('add-card-screen');

      // Kart bilgilerini gir
      await TestUtils.clearAndTypeText('card-number', '5555555555554444');
      await TestUtils.clearAndTypeText('card-expiry', '0326');
      await TestUtils.clearAndTypeText('card-cvv', '456');
      await TestUtils.clearAndTypeText('card-holder', 'Test User 2');

      // Kaydet butonuna tıkla
      await TestUtils.tapElement('save-card-button');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Kart başarıyla eklendi');

      // Kart listesinde göründüğünü kontrol et
      await TestUtils.waitForElement('card-item-1');
    });

    it('should delete payment method', async () => {
      // Ödeme yöntemleri ekranına git
      await TestUtils.tapElement('wallet-tab');
      await TestUtils.tapElement('payment-methods-button');
      await TestUtils.waitForElement('payment-methods-screen');

      // İlk kartı seç
      await TestUtils.tapElement('card-item-0');
      await TestUtils.waitForElement('card-detail-screen');

      // Sil butonuna tıkla
      await TestUtils.tapElement('delete-card-button');

      // Onay dialog'unu kontrol et
      await TestUtils.waitForText('Kartı silmek istediğinizden emin misiniz?');

      // Evet butonuna tıkla
      await TestUtils.tapElement('confirm-delete-card');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Kart başarıyla silindi');
    });

    it('should set default payment method', async () => {
      // Ödeme yöntemleri ekranına git
      await TestUtils.tapElement('wallet-tab');
      await TestUtils.tapElement('payment-methods-button');
      await TestUtils.waitForElement('payment-methods-screen');

      // İlk kartı seç
      await TestUtils.tapElement('card-item-0');
      await TestUtils.waitForElement('card-detail-screen');

      // Varsayılan yap butonuna tıkla
      await TestUtils.tapElement('set-default-button');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Varsayılan kart güncellendi');

      // Ana listeye geri dön
      await device.pressBack();

      // Varsayılan kart işaretini kontrol et
      await TestUtils.waitForElement('default-card-indicator');
    });
  });

  describe('Transaction History', () => {
    it('should display detailed transaction info', async () => {
      // Cüzdan sekmesine git
      await TestUtils.tapElement('wallet-tab');
      await TestUtils.waitForElement('wallet-screen');

      // İlk işlemi seç
      await TestUtils.tapElement('transaction-item-0');
      await TestUtils.waitForElement('transaction-detail-screen');

      // İşlem detaylarını kontrol et
      await TestUtils.waitForElement('transaction-amount');
      await TestUtils.waitForElement('transaction-date');
      await TestUtils.waitForElement('transaction-type');
      await TestUtils.waitForElement('transaction-description');
      await TestUtils.waitForElement('transaction-reference');
    });

    it('should export transaction history', async () => {
      // Cüzdan sekmesine git
      await TestUtils.tapElement('wallet-tab');
      await TestUtils.waitForElement('wallet-screen');

      // Dışa aktar butonuna tıkla
      await TestUtils.tapElement('export-transactions-button');
      await TestUtils.waitForElement('export-modal');

      // Tarih aralığı seç
      await TestUtils.tapElement('date-range-picker');
      await TestUtils.waitForElement('date-range-modal');
      await TestUtils.tapText('Son 30 gün');
      await TestUtils.tapElement('range-confirm');

      // Format seç
      await TestUtils.tapElement('format-selector');
      await TestUtils.tapText('PDF');
      await TestUtils.tapElement('format-confirm');

      // Dışa aktar butonuna tıkla
      await TestUtils.tapElement('confirm-export');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('İşlem geçmişi dışa aktarıldı');
    });

    it('should handle insufficient balance', async () => {
      // Yetersiz bakiye gerektiren işlem yap
      await TestUtils.tapElement('high-value-service-button');
      await TestUtils.waitForElement('payment-screen');

      // Ödeme butonuna tıkla
      await TestUtils.tapElement('complete-payment-button');

      // Yetersiz bakiye hatasını kontrol et
      await TestUtils.waitForText('Yetersiz bakiye');
      await TestUtils.waitForElement('insufficient-balance-modal');

      // Bakiye yükle butonuna tıkla
      await TestUtils.tapElement('add-balance-button');
      await TestUtils.waitForElement('add-balance-screen');
    });
  });
});
