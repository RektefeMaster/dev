const { TestUtils, testData } = require('../utils/testUtils');

describe('Fault Report Tests', () => {
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

  describe('Create Fault Report', () => {
    it('should create fault report successfully', async () => {
      // Ana sayfadan arıza bildir butonuna tıkla
      await TestUtils.tapElement('fault-report-button');
      await TestUtils.waitForElement('fault-report-screen');

      // Arıza başlığı gir
      await TestUtils.clearAndTypeText('fault-title-input', testData.faultReport.valid.title);

      // Arıza açıklaması gir
      await TestUtils.clearAndTypeText('fault-description-input', testData.faultReport.valid.description);

      // Aciliyet seviyesini seç
      await TestUtils.tapElement('urgency-high');

      // Konum seç
      await TestUtils.tapElement('location-picker');
      await TestUtils.waitForElement('location-modal');
      await TestUtils.tapText('İstanbul');
      await TestUtils.tapElement('location-confirm');

      // Fotoğraf ekle (opsiyonel)
      await TestUtils.tapElement('add-photo-button');
      // Simüle edilmiş fotoğraf seçimi
      await TestUtils.tapElement('camera-option');
      await TestUtils.sleep(2000); // Fotoğraf çekme simülasyonu

      // Arıza bildir butonuna tıkla
      await TestUtils.tapElement('submit-fault-report');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Arıza bildiriminiz başarıyla gönderildi');

      // Arıza listesine yönlendirildiğini kontrol et
      await TestUtils.waitForElement('fault-reports-list');
    });

    it('should show validation errors for invalid fault report', async () => {
      // Arıza bildir ekranına git
      await TestUtils.tapElement('fault-report-button');
      await TestUtils.waitForElement('fault-report-screen');

      // Boş form gönder
      await TestUtils.tapElement('submit-fault-report');

      // Validasyon hatalarını kontrol et
      await TestUtils.waitForText('Arıza başlığı gereklidir');
      await TestUtils.waitForText('Arıza açıklaması gereklidir');
      await TestUtils.waitForText('Konum seçimi gereklidir');
    });

    it('should handle photo upload', async () => {
      // Arıza bildir ekranına git
      await TestUtils.tapElement('fault-report-button');
      await TestUtils.waitForElement('fault-report-screen');

      // Fotoğraf ekle butonuna tıkla
      await TestUtils.tapElement('add-photo-button');

      // Galeriden fotoğraf seç
      await TestUtils.tapElement('gallery-option');
      await TestUtils.waitForElement('photo-picker');
      await TestUtils.tapElement('select-photo-1');

      // Fotoğrafın eklendiğini kontrol et
      await TestUtils.waitForElement('photo-preview-1');

      // Fotoğrafı kaldır
      await TestUtils.tapElement('remove-photo-1');
      await TestUtils.waitForElementNotVisible('photo-preview-1');
    });
  });

  describe('Fault Report List', () => {
    it('should display fault reports list', async () => {
      // Arıza bildirimleri listesine git
      await TestUtils.tapElement('fault-reports-list-button');
      await TestUtils.waitForElement('fault-reports-list');

      // Liste elementlerini kontrol et
      await TestUtils.waitForElement('fault-report-item-0');

      // İlk arıza bildirimi detayına git
      await TestUtils.tapElement('fault-report-item-0');
      await TestUtils.waitForElement('fault-report-detail');

      // Detay bilgilerini kontrol et
      await TestUtils.waitForElement('fault-title');
      await TestUtils.waitForElement('fault-description');
      await TestUtils.waitForElement('fault-status');
      await TestUtils.waitForElement('fault-date');
    });

    it('should filter fault reports by status', async () => {
      // Arıza bildirimleri listesine git
      await TestUtils.tapElement('fault-reports-list-button');
      await TestUtils.waitForElement('fault-reports-list');

      // Filtre butonuna tıkla
      await TestUtils.tapElement('filter-button');
      await TestUtils.waitForElement('filter-modal');

      // "Bekliyor" durumunu seç
      await TestUtils.tapElement('status-pending');
      await TestUtils.tapElement('apply-filter');

      // Filtrelenmiş sonuçları kontrol et
      await TestUtils.waitForElement('filtered-results');
    });

    it('should search fault reports', async () => {
      // Arıza bildirimleri listesine git
      await TestUtils.tapElement('fault-reports-list-button');
      await TestUtils.waitForElement('fault-reports-list');

      // Arama kutusuna değer gir
      await TestUtils.clearAndTypeText('search-input', 'motor');

      // Arama sonuçlarını kontrol et
      await TestUtils.waitForElement('search-results');
      await TestUtils.waitForText('motor');
    });
  });

  describe('Fault Report Detail', () => {
    it('should display fault report details', async () => {
      // Arıza bildirimi detayına git
      await TestUtils.tapElement('fault-report-item-0');
      await TestUtils.waitForElement('fault-report-detail');

      // Temel bilgileri kontrol et
      await TestUtils.waitForElement('fault-title');
      await TestUtils.waitForElement('fault-description');
      await TestUtils.waitForElement('fault-location');
      await TestUtils.waitForElement('fault-urgency');
      await TestUtils.waitForElement('fault-status');
      await TestUtils.waitForElement('fault-created-date');

      // Fotoğrafları kontrol et (varsa)
      const hasPhotos = await TestUtils.elementExists('fault-photos');
      if (hasPhotos) {
        await TestUtils.waitForElement('fault-photo-0');
      }

      // Zaman çizelgesini kontrol et
      await TestUtils.waitForElement('fault-timeline');
    });

    it('should update fault report status', async () => {
      // Arıza bildirimi detayına git
      await TestUtils.tapElement('fault-report-item-0');
      await TestUtils.waitForElement('fault-report-detail');

      // Durum güncelleme butonuna tıkla
      await TestUtils.tapElement('update-status-button');
      await TestUtils.waitForElement('status-update-modal');

      // Yeni durumu seç
      await TestUtils.tapElement('status-in-progress');
      await TestUtils.tapElement('confirm-status-update');

      // Güncellenmiş durumu kontrol et
      await TestUtils.waitForText('Devam Ediyor');
    });

    it('should add comment to fault report', async () => {
      // Arıza bildirimi detayına git
      await TestUtils.tapElement('fault-report-item-0');
      await TestUtils.waitForElement('fault-report-detail');

      // Yorum ekle butonuna tıkla
      await TestUtils.tapElement('add-comment-button');

      // Yorum yaz
      await TestUtils.clearAndTypeText('comment-input', 'Test yorumu');

      // Gönder butonuna tıkla
      await TestUtils.tapElement('send-comment');

      // Yorumun eklendiğini kontrol et
      await TestUtils.waitForText('Test yorumu');
    });
  });

  describe('Fault Report Actions', () => {
    it('should create appointment from fault report', async () => {
      // Arıza bildirimi detayına git
      await TestUtils.tapElement('fault-report-item-0');
      await TestUtils.waitForElement('fault-report-detail');

      // Randevu oluştur butonuna tıkla
      await TestUtils.tapElement('create-appointment-button');

      // Randevu oluşturma ekranına yönlendirildiğini kontrol et
      await TestUtils.waitForElement('book-appointment-screen');

      // Arıza bilgilerinin önceden doldurulduğunu kontrol et
      await TestUtils.waitForText(testData.faultReport.valid.title);
    });

    it('should share fault report', async () => {
      // Arıza bildirimi detayına git
      await TestUtils.tapElement('fault-report-item-0');
      await TestUtils.waitForElement('fault-report-detail');

      // Paylaş butonuna tıkla
      await TestUtils.tapElement('share-fault-report');

      // Paylaşım seçeneklerini kontrol et
      await TestUtils.waitForElement('share-modal');
      await TestUtils.waitForElement('share-whatsapp');
      await TestUtils.waitForElement('share-email');
      await TestUtils.waitForElement('share-copy-link');
    });

    it('should delete fault report', async () => {
      // Arıza bildirimi detayına git
      await TestUtils.tapElement('fault-report-item-0');
      await TestUtils.waitForElement('fault-report-detail');

      // Sil butonuna tıkla
      await TestUtils.tapElement('delete-fault-report');

      // Onay dialog'unu kontrol et
      await TestUtils.waitForText('Arıza bildiriminizi silmek istediğinizden emin misiniz?');

      // Evet butonuna tıkla
      await TestUtils.tapElement('confirm-delete');

      // Başarı mesajını kontrol et
      await TestUtils.waitForText('Arıza bildiriminiz başarıyla silindi');

      // Liste ekranına geri döndüğünü kontrol et
      await TestUtils.waitForElement('fault-reports-list');
    });
  });
});
