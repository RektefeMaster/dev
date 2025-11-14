# Railway'de Test Çalıştırma Rehberi

## Seçenek 1: Railway'de Test Komutu Çalıştırma

Railway'de test çalıştırmak için Railway CLI kullanabilirsiniz:

```bash
# Railway CLI ile test çalıştır
railway run npm test -- tests/e2e/fault-report-payment-flow.test.ts
```

## Seçenek 2: Railway Environment Variables

Railway dashboard'da şu environment variable'ları ekleyin:

1. **TEST_MONGODB_URI**: Test için kullanılacak MongoDB URI
   - Eğer aynı database'i kullanacaksanız: `MONGODB_URI` ile aynı değeri kullanın
   - Eğer ayrı test database istiyorsanız: Farklı bir database adı kullanın (örn: `rektefe_test`)

2. **NODE_ENV**: `test` olarak ayarlayın (test ortamında)

## Seçenek 3: Railway'de MongoDB Servisi Ekleme

1. Railway dashboard'a gidin
2. Projenize yeni bir MongoDB servisi ekleyin
3. MongoDB servisinin `MONGO_URL` environment variable'ını kopyalayın
4. Ana servisinizde `TEST_MONGODB_URI` olarak ekleyin

## Seçenek 4: MongoDB Atlas IP Whitelist

Eğer MongoDB Atlas kullanıyorsanız:

1. Railway'in outbound IP adresini öğrenin:
   ```bash
   railway run curl https://api.ipify.org
   ```

2. MongoDB Atlas Network Access'e bu IP'yi ekleyin
3. Veya tüm IP'lere izin verin (sadece test için): `0.0.0.0/0`

## Test Çalıştırma

### Local'de:
```bash
cd rest-api
npm test -- tests/e2e/fault-report-payment-flow.test.ts
```

### Railway'de:
```bash
railway run npm test -- tests/e2e/fault-report-payment-flow.test.ts
```

### Railway Dashboard'dan:
1. Railway dashboard'a gidin
2. Servisinizi seçin
3. "Deployments" sekmesine gidin
4. "Run Command" butonuna tıklayın
5. Şu komutu çalıştırın:
   ```
   npm test -- tests/e2e/fault-report-payment-flow.test.ts
   ```

## Notlar

- Test dosyası MongoDB bağlantısı gerektirir
- Test verileri otomatik olarak temizlenir
- Test timeout'u 60 saniye olarak ayarlanmıştır
- Railway'de test çalıştırırken network latency nedeniyle timeout'lar artırılabilir

