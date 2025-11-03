# Test Başlatma Kılavuzu

## Backend'i Başlatma

Testleri çalıştırmadan önce backend'in çalıştığından emin olun:

```bash
# Backend'i başlat
cd rest-api
npm start

# veya development mode
npm run dev
```

Backend başladıktan sonra şu URL'ler erişilebilir olmalı:
- `http://localhost:3000/api/health` (eğer health endpoint varsa)
- `http://localhost:3000/api/auth/login`

## Testleri Çalıştırma

### 1. Tam Akış Testi

```bash
# Local backend için
export API_BASE_URL="http://localhost:3000/api"
./e2e-test-bodywork-flow.sh

# Railway/Production için
export API_BASE_URL="https://your-railway-url.com/api"
./e2e-test-bodywork-flow.sh
```

### 2. Bireysel Test Fonksiyonları

```bash
# Driver login testi
./e2e-test-individual.sh test_driver_login driver@test.com test123

# Arıza bildirimi oluşturma (token ve vehicle_id gerekli)
./e2e-test-individual.sh test_create_bodywork_fault_report <token> <vehicle_id>
```

### 3. Dry-Run Modu (Komutları Göster)

```bash
./test-run-dry.sh
```

## Test Kullanıcıları

Test için gerekli kullanıcıların veritabanında olması gerekir:

**Driver:**
- Email: `driver@test.com`
- Password: `test123`
- UserType: `driver`
- En az bir aracı olmalı

**Mechanic:**
- Email: `mechanic@test.com`
- Password: `test123`
- UserType: `mechanic`
- ServiceCategories: `["bodywork"]` içermeli

## Test Adımları

1. ✅ Backend çalışıyor mu kontrol et
2. ✅ Test kullanıcıları var mı kontrol et
3. ✅ API_BASE_URL'i ayarla
4. ✅ Test script'ini çalıştır
5. ✅ Sonuçları kontrol et

## Hata Giderme

### Backend Erişilemiyor

```bash
# Backend'in çalışıp çalışmadığını kontrol et
lsof -ti:3000

# Backend log'larını kontrol et
cd rest-api
tail -f logs/*.log
```

### Kullanıcı Bulunamıyor

```bash
# MongoDB'de kullanıcıları kontrol et
# veya test kullanıcılarını oluştur
```

### Token Geçersiz

```bash
# Yeni login yaparak token al
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "driver@test.com", "password": "test123"}'
```

## Test Sonuçları

Test başarılı olduğunda:
- ✅ BodyworkJob otomatik oluşturuldu
- ✅ FaultReport'da bodyworkJobId var
- ✅ Mechanic ve Driver bodywork işlerini görüyor

Test başarısız olduğunda:
- Backend log'larını kontrol edin
- API response'larını inceleyin
- Veritabanı durumunu kontrol edin

