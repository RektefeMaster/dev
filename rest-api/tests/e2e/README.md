# E2E (End-to-End) Testler - Araç Yıkama Modülü

Bu dizin, araç yıkama modülü için kapsamlı E2E testlerini içerir.

## Test Senaryoları

### 1. Shop Yıkama - Tam Akış
Sürücünün shop tipi yıkama için sipariş oluşturmasından, ustanın işi tamamlayıp QA göndermesine, sürücünün onaylamasına kadar tüm süreç test edilir.

**Adımlar:**
1. Fiyat teklifi al
2. Sipariş oluştur (escrow ödeme)
3. Sipariş detayı görüntüle
4. Usta tarafından kabul et
5. Check-in yap
6. İşi başlat
7. Adım adım ilerleme güncelle (5 adım)
8. QA gönder (önce/sonra fotolar)
9. Sürücü QA onayla
10. Sipariş tamamlandı ve ödeme çözüldü

### 2. İptal Senaryoları
Farklı aşamalardaki iptal senaryoları test edilir:
- **Erken İptal**: DRIVER_CONFIRMED aşamasında (ücretsiz)
- **Geç İptal**: PROVIDER_ACCEPTED sonrası (cezalı - %30)
- **Usta İptali**: Provider tarafından iptal

### 3. QA Reddi ve Düzeltme
Sürücünün QA'yı reddetmesi durumunda işin tekrar IN_PROGRESS durumuna dönmesi test edilir.

### 4. Paket ve Provider Yönetimi
- Usta yeni paket oluşturma
- Ustanın kendi paketlerini görüntüleme
- Sürücünün provider paketlerini görüntüleme
- Usta provider profilini güncelleme

### 5. Hata Yönetimi
- Geçersiz Package ID
- Yetkisiz erişim
- Tamamlanmamış iş için QA gönderme hatası

## Testleri Çalıştırma

### Tüm E2E Testleri
```bash
npm run test:e2e
```

### Watch Mode (Geliştirme)
```bash
npm run test:e2e:watch
```

### Sadece Belirli Test
```bash
npm run test:e2e -- -t "Shop Yıkama"
```

## Test Ortamı

Testler gerçek bir MongoDB veritabanına bağlanır (test database). Test başlamadan önce:
- Test kullanıcıları oluşturulur (driver ve mechanic)
- Test araç, provider, lane ve package oluşturulur
- Test sonunda tüm veriler temizlenir

## Gereksinimler

- MongoDB çalışıyor olmalı
- JWT_SECRET ortam değişkeni tanımlı olmalı
- Test database'i erişilebilir olmalı

## Test Verileri

### Test Sürücü
- Email: `driver-{timestamp}@test.com`
- Role: şöför

### Test Usta
- Email: `mechanic-{timestamp}@test.com`
- Role: usta
- Business: Test Yıkama Merkezi

### Test Araç
- Brand: Toyota
- Model: Corolla
- Segment: B
- Plate: 34 TEST 123

### Test Paket
- Name: Standart Yıkama
- Base Price: 150 TL
- Duration: 30 dk
- Type: Shop

## Kapsanan API Endpoints

### Driver (DV)
- POST `/api/wash/quote` - Fiyat teklifi
- POST `/api/wash/order` - Sipariş oluştur
- GET `/api/wash/order/:id` - Sipariş detayı
- POST `/api/wash/order/:id/cancel` - İptal
- POST `/api/wash/order/:id/qa-approve` - QA onayla
- GET `/api/wash/my-orders` - Siparişlerim

### Provider (US)
- GET `/api/wash/jobs` - İş listesi
- POST `/api/wash/jobs/:id/accept` - Kabul et
- POST `/api/wash/jobs/:id/checkin` - Check-in
- POST `/api/wash/jobs/:id/start` - Başlat
- POST `/api/wash/jobs/:id/progress` - İlerleme
- POST `/api/wash/jobs/:id/qa-submit` - QA gönder
- POST `/api/wash/packages/create` - Paket oluştur
- GET `/api/wash/my-packages` - Paketlerim
- POST `/api/wash/provider/setup` - Provider kurulum

### Common
- GET `/api/wash/packages` - Paketler (provider ID ile)

## Başarı Kriterleri

Tüm testlerin geçmesi için:
- ✅ Sipariş akışı baştan sona çalışmalı
- ✅ Durum geçişleri doğru olmalı
- ✅ Escrow işlemleri (HOLD → CAPTURE/REFUND) çalışmalı
- ✅ QA fotoğrafları kaydedilmeli
- ✅ İptal senaryoları ceza hesaplamalarıyla çalışmalı
- ✅ Yetkisiz erişimler engellenmel
- ✅ Hata durumları düzgün yönetilmeli

## Notlar

- Testler sıralı çalıştırılır (`--runInBand`)
- Her test bağımsız olarak çalışmalı
- Test verileri her test sonunda temizlenir
- Timeout: 30 saniye (karmaşık akışlar için)

## Gelecek İyileştirmeler

- [ ] Mobil yıkama akışı testleri
- [ ] Slot çakışması testleri
- [ ] Concurrent sipariş testleri
- [ ] Performans testleri
- [ ] Load testing

