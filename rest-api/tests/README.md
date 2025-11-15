# Test Rehberi

## MongoDB Bağlantısı

Testler MongoDB bağlantısı gerektirir. Railway'de test çalıştırırken:

1. **MongoDB Atlas IP Whitelist**: Railway'in outbound IP adresini MongoDB Atlas Network Access'e ekleyin
2. **Environment Variables**: Railway'de `MONGODB_URI` environment variable'ı ayarlı olmalı
3. **Test Database (Opsiyonel)**: Eğer ayrı bir test database kullanmak istiyorsanız `TEST_MONGODB_URI` ayarlayın

## Test Çalıştırma

### Local'de:
```bash
npm run test:e2e
```

### Railway'de:
```bash
railway run npm run test:e2e
```

Veya Railway Dashboard'dan "Run Command" ile:
```
npm run test:e2e
```

## Test Setup

Test setup dosyası (`tests/setup.ts`) otomatik olarak:
- MongoDB bağlantısını yönetir
- Test ortamını ayarlar
- Test sonunda bağlantıyı kapatır

## Sorun Giderme

### IP Whitelist Sorunu
Eğer "IP whitelist" hatası alıyorsanız:
1. Railway'in outbound IP'sini öğrenin: `railway run curl https://api.ipify.org`
2. MongoDB Atlas Network Access'e bu IP'yi ekleyin
3. Veya geçici olarak `0.0.0.0/0` ekleyin (tüm IP'lere izin verir)

### MongoDB Bağlantı Timeout
Eğer timeout hatası alıyorsanız:
- Railway'de network latency nedeniyle timeout'lar artırılabilir
- `tests/setup.ts` dosyasındaki `serverSelectionTimeoutMS` değerini artırın

### Test Verileri
Test verileri otomatik olarak temizlenir. Eğer temizlenmemiş veriler varsa:
- Test dosyasındaki `beforeAll` ve `afterAll` hook'ları kontrol edin









