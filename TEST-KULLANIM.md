# Test Kullanım Kılavuzu - Railway Backend

## Hızlı Başlangıç

### 1. Railway URL'i Ayarla

```bash
export API_BASE_URL="https://dev-production-8a3d.up.railway.app/api"
```

### 2. Test Kullanıcılarını Ayarla (Opsiyonel)

```bash
# Gerçek kullanıcılarınız varsa
export DRIVER_EMAIL="your-driver@email.com"
export DRIVER_PASSWORD="your-password"
export MECHANIC_EMAIL="your-mechanic@email.com"
export MECHANIC_PASSWORD="your-password"
```

### 3. Test'i Çalıştır

```bash
./e2e-test-bodywork-flow.sh
```

## Test Senaryoları

### Senaryo 1: Otomatik BodyworkJob Oluşturma

**Adımlar:**
1. Driver arıza bildirimi oluşturur (Kaporta/Boya)
2. Mechanic teklif verir
3. Driver teklif seçer
4. Driver randevu oluşturur → **BodyworkJob otomatik oluşur**

**Beklenen Sonuç:**
- ✅ BodyworkJob ID oluşur
- ✅ FaultReport'da bodyworkJobId field'ı doldurulur
- ✅ Response'da bodyworkJob bilgisi döner

### Senaryo 2: Manuel Dönüşüm

**Adımlar:**
1. Driver arıza bildirimi oluşturur
2. Mechanic teklif verir
3. Driver teklif seçer
4. Mechanic "Kaporta İşine Dönüştür" endpoint'ini çağırır

**Beklenen Sonuç:**
- ✅ BodyworkJob ID oluşur
- ✅ FaultReport'da bodyworkJobId field'ı doldurulur

## Test Komutları

### Tam Akış Testi

```bash
export API_BASE_URL="https://dev-production-8a3d.up.railway.app/api"
./e2e-test-bodywork-flow.sh
```

### Bireysel Test Fonksiyonları

```bash
# Login testi
./e2e-test-individual.sh test_driver_login driver@test.com test123

# Arıza bildirimi oluşturma
./e2e-test-individual.sh test_create_bodywork_fault_report <token> <vehicle_id>

# Teklif verme
./e2e-test-individual.sh test_submit_quote <token> <fault_report_id> 5000

# Manuel dönüşüm
./e2e-test-individual.sh test_convert_to_bodywork_job <token> <fault_report_id> <mechanic_id>
```

## Test Checklist

### Ön Hazırlık
- [ ] Backend Railway'de çalışıyor
- [ ] API URL doğru (`https://dev-production-8a3d.up.railway.app/api`)
- [ ] Test kullanıcıları mevcut (veya gerçek kullanıcılar ayarlandı)
- [ ] Driver'ın en az bir aracı var

### Otomatik BodyworkJob Akışı
- [ ] Driver login başarılı
- [ ] Mechanic login başarılı
- [ ] Kaporta/Boya arıza bildirimi oluşturuldu
- [ ] Mechanic arıza bildirimini görüyor
- [ ] Mechanic teklif verdi
- [ ] Driver teklif seçti
- [ ] Driver randevu oluşturdu
- [ ] **BodyworkJob otomatik oluşturuldu** ✅
- [ ] FaultReport'da bodyworkJobId var ✅

### Manuel Dönüşüm Akışı
- [ ] Driver arıza bildirimi oluşturdu
- [ ] Mechanic teklif verdi
- [ ] Driver teklif seçti
- [ ] Mechanic manuel dönüşüm endpoint'ini çağırdı
- [ ] **BodyworkJob manuel oluşturuldu** ✅
- [ ] FaultReport'da bodyworkJobId var ✅

## Beklenen Response Formatları

### Login Response
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "user_id",
      "email": "driver@test.com",
      "userType": "driver"
    }
  }
}
```

### FaultReport Response (BodyworkJobId ile)
```json
{
  "success": true,
  "data": {
    "_id": "fault_report_id",
    "serviceCategory": "Kaporta/Boya",
    "bodyworkJobId": {
      "_id": "bodywork_job_id",
      "status": "quote_preparation"
    }
  }
}
```

### Create Appointment Response (Otomatik BodyworkJob)
```json
{
  "success": true,
  "message": "Randevu başarıyla oluşturuldu ve kaporta işi oluşturuldu",
  "data": {
    "appointment": {
      "_id": "appointment_id",
      "price": 5000,
      "status": "TALEP_EDILDI"
    },
    "bodyworkJob": {
      "_id": "bodywork_job_id",
      "status": "quote_preparation"
    }
  }
}
```

## Troubleshooting

### "Kullanıcı bulunamadı" Hatası

**Çözüm:** Test kullanıcılarını oluşturun veya gerçek kullanıcıları kullanın:
```bash
export DRIVER_EMAIL="your-real-driver@email.com"
export DRIVER_PASSWORD="your-password"
```

### "Kullanıcı tipi zorunludur" Hatası

**Çözüm:** Login request'ine `userType` ekleyin (script'te zaten var).

### BodyworkJob Oluşmuyor

**Kontrol:**
1. `serviceCategory` = "Kaporta/Boya" mi?
2. Randevu oluştururken `mechanicId` mevcut mu?
3. Backend log'larını kontrol edin

### FaultReport'da bodyworkJobId Yok

**Kontrol:**
1. Randevu oluşturma başarılı mıydı?
2. Backend'de hata oluştu mu?
3. FaultReport'u yeniden yükleyin

