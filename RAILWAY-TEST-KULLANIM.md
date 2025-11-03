# Railway Backend Test Kullanım Kılavuzu

## Hızlı Başlangıç

Railway'de çalışan backend'i test etmek için:

### Yöntem 1: URL'i Parametre Olarak Ver

```bash
./run-railway-test.sh https://your-app.railway.app/api
```

### Yöntem 2: Environment Variable Kullan

```bash
export RAILWAY_API_URL="https://your-app.railway.app/api"
./run-railway-test.sh
```

### Yöntem 3: Doğrudan Test Script'i Çalıştır

```bash
export API_BASE_URL="https://your-app.railway.app/api"
./e2e-test-bodywork-flow.sh
```

## Railway URL'i Bulma

### Railway Dashboard'dan

1. Railway dashboard'a gidin: https://railway.app
2. Projenize tıklayın
3. "Settings" > "Networking" bölümünden Public Domain'i kopyalayın
4. URL formatı: `https://<public-domain>/api`

### Railway CLI ile

```bash
cd rest-api
railway status
```

### Railway Environment Variables

Railway'de `RAILWAY_PUBLIC_DOMAIN` environment variable'ı otomatik olarak ayarlanır:

```bash
# Railway servis içinde çalışıyorsa
echo $RAILWAY_PUBLIC_DOMAIN
```

## Test Adımları

1. **Railway URL'i Belirle**
   ```bash
   export RAILWAY_API_URL="https://your-app.railway.app/api"
   ```

2. **Test'i Çalıştır**
   ```bash
   ./run-railway-test.sh
   ```

3. **Sonuçları İncele**
   - Başarılı testler: ✅ işareti
   - Başarısız testler: ❌ işareti
   - Detaylı log'lar terminal'de görüntülenir

## Beklenen Test Sonuçları

### Başarılı Test Senaryosu

1. ✅ Driver login başarılı
2. ✅ Mechanic login başarılı
3. ✅ Kaporta/Boya arıza bildirimi oluşturuldu
4. ✅ Mechanic teklif verdi
5. ✅ Driver teklif seçti
6. ✅ Randevu oluşturuldu
7. ✅ **BodyworkJob otomatik oluşturuldu**
8. ✅ FaultReport'da bodyworkJobId var
9. ✅ Bodywork işleri listelenebiliyor

## Troubleshooting

### Backend Erişilemiyor

**Sorun:** `✗ Backend erişilemiyor (HTTP 000)`

**Çözümler:**
1. Railway dashboard'da servisin "Running" durumunda olduğunu kontrol edin
2. URL'in doğru olduğundan emin olun (örn: `/api` eklendi mi?)
3. Railway networking ayarlarında public domain'in aktif olduğunu kontrol edin

### 401 Unauthorized

**Sorun:** Login başarısız

**Çözümler:**
1. Test kullanıcılarının Railway veritabanında olduğundan emin olun
2. Email/password kombinasyonunu kontrol edin
3. Railway'de MongoDB bağlantısının çalıştığını kontrol edin

### 404 Not Found

**Sorun:** Endpoint bulunamıyor

**Çözümler:**
1. URL'de `/api` prefix'inin olduğundan emin olun
2. Railway'de route'ların doğru tanımlandığını kontrol edin
3. Backend log'larını kontrol edin

## Örnek Çıktı

```
========================================
Railway Backend E2E Test
========================================

API URL: https://your-app.railway.app/api

[KONTROL] Backend bağlantısı...
✓ Backend erişilebilir (HTTP 401)

E2E test başlatılıyor...

========================================
E2E Test - Kaporta/Boya Akışı
========================================

[TEST 1] Driver Login
✓ Driver login başarılı
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6...
Driver ID: 507f1f77bcf86cd799439011

[TEST 2] Mechanic Login
✓ Mechanic login başarılı
...

[TEST 10] Driver - Randevu Oluşturma (Otomatik BodyworkJob)
✓ Randevu oluşturuldu
✅ Otomatik BodyworkJob oluşturuldu!
BodyworkJob ID: 507f1f77bcf86cd799439012
```

## Notlar

- Railway'de port 3000 otomatik olarak expose edilir
- Public domain genellikle `https://<app-name>.railway.app` formatındadır
- Test kullanıcılarının veritabanında olması gerekir
- Railway environment variables'a erişim için Railway CLI kullanılabilir

