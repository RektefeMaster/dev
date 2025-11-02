# Yedek Parça E2E Test Script

Bu script, tüm yedek parça fonksiyonlarını curl ile E2E test eder.

## Kullanım

### Local Development

1. Backend'i başlatın:
```bash
cd rest-api
npm run dev
```

2. Test script'ini çalıştırın:
```bash
cd tests/e2e
bash test-parts-e2e.sh
```

### Production/Staging

```bash
export BASE_URL="https://your-api-url.com/api"
bash test-parts-e2e.sh
```

## Test Senaryoları

### 1. Authentication (Kimlik Doğrulama)
- ✅ Usta (mechanic) login/register
- ✅ Şoför (driver) login/register

### 2. Usta İşlemleri
- ✅ Parça oluşturma
- ✅ Usta parçalarını listeleme
- ✅ Parça güncelleme

### 3. Market İşlemleri (Public)
- ✅ Markette parça arama
- ✅ Parça detayını getirme

### 4. Şoför İşlemleri
- ✅ Rezervasyon oluşturma
- ✅ Şoför rezervasyonlarını listeleme
- ✅ Pazarlık teklifi gönderme

### 5. Usta Rezervasyon İşlemleri
- ✅ Usta rezervasyonlarını listeleme
- ✅ Pazarlık yanıtı (Kabul/Karşı Teklif/Red)
- ✅ Rezervasyon onaylama
- ✅ Rezervasyon iptal

## Test Output

Script renkli çıktı üretir:
- 🟢 Yeşil: Başarılı testler
- 🔴 Kırmızı: Başarısız testler
- 🟡 Sarı: Test bilgileri
- 🔵 Mavi: Bölüm başlıkları

## Örnek Çıktı

```
========================================
  YEDEK PARÇA E2E TEST BAŞLATIYOR
========================================

[TEST] 1.1 Usta login (mechanic)
✓ PASS Usta login başarılı

[TEST] 2.1 Parça oluştur (Usta)
✓ PASS Parça oluşturuldu (ID: 507f1f77bcf86cd799439011)

...

========================================
  TEST SONUÇLARI
========================================

Başarılı Testler: 15
Başarısız Testler: 0

✓ TÜM TESTLER BAŞARILI!
```

## Notlar

- Test kullanıcıları otomatik oluşturulur (yoksa)
- Test verileri gerçek veritabanına yazılır
- Her test çalışmasında yeni test kullanıcıları kullanılır
- Script hata durumunda durur (set -e)

## Troubleshooting

### Backend bağlantı hatası
```
Backend bağlantısı başarısız!
```
Çözüm: Backend'in çalıştığından emin olun ve BASE_URL'i kontrol edin.

### Authentication hatası
```
Usta login/register başarısız
```
Çözüm: Backend'in auth endpoint'lerinin çalıştığından emin olun.

### Token extraction hatası
```
Token: ...
```
Çözüm: Response formatını kontrol edin. Script JSON response bekliyor.

