# E2E Test Dokümantasyonu - Kaporta/Boya Arıza Bildirimi Akışı

## Genel Bakış

Bu dokümantasyon, Kaporta/Boya arıza bildirimi akışının uçtan uca (end-to-end) test edilmesi için hazırlanmış curl komutlarını içerir.

## Test Senaryoları

### Senaryo 1: Otomatik BodyworkJob Oluşturma Akışı

1. Driver arıza bildirimi oluşturur (Kaporta/Boya)
2. Mechanic teklif verir
3. Driver teklifi seçer
4. Driver randevu oluşturur → **Otomatik olarak BodyworkJob oluşur**

### Senaryo 2: Manuel Dönüşüm Akışı

1. Driver arıza bildirimi oluşturur (Kaporta/Boya)
2. Mechanic teklif verir
3. Driver teklifi seçer
4. Mechanic "Kaporta İşine Dönüştür" butonuna tıklar → **Manuel olarak BodyworkJob oluşur**

## Test Script'leri

### 1. Tam Akış Testi (`e2e-test-bodywork-flow.sh`)

Tüm akışı sırayla test eder:

```bash
# API URL'ini ayarla
export API_BASE_URL=https://your-api-url.com/api

# Test'i çalıştır
bash e2e-test-bodywork-flow.sh
```

**Çıktı:** Tüm test adımlarının sonuçlarını gösterir, başarılı/başarısız durumları raporlar.

### 2. Bireysel Fonksiyon Testleri (`e2e-test-individual.sh`)

Her fonksiyonu bağımsız olarak test etmek için:

```bash
# Driver login testi
bash e2e-test-individual.sh test_driver_login driver@test.com test123

# Arıza bildirimi oluşturma
bash e2e-test-individual.sh test_create_bodywork_fault_report <token> <vehicle_id>

# Teklif verme
bash e2e-test-individual.sh test_submit_quote <token> <fault_report_id> 5000
```

## Manuel Test Komutları

### 1. Driver Login

```bash
curl -X POST "https://your-api-url.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver@test.com",
    "password": "test123",
    "userType": "driver"
  }'
```

**Response:**
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

### 2. Kaporta/Boya Arıza Bildirimi Oluştur

```bash
curl -X POST "https://your-api-url.com/api/fault-reports" \
  -H "Authorization: Bearer <driver_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "vehicle_id",
    "serviceCategory": "Kaporta/Boya",
    "faultDescription": "Ön tampon çizik var, boya gerekiyor",
    "priority": "medium",
    "photos": [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg"
    ],
    "videos": []
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "fault_report_id",
    "serviceCategory": "Kaporta/Boya",
    "status": "pending",
    ...
  }
}
```

### 3. Mechanic - Arıza Bildirimlerini Listele

```bash
curl -X GET "https://your-api-url.com/api/fault-reports/mechanic/reports?status=all" \
  -H "Authorization: Bearer <mechanic_token>"
```

### 4. Mechanic - Teklif Ver

```bash
curl -X POST "https://your-api-url.com/api/fault-reports/<fault_report_id>/quote" \
  -H "Authorization: Bearer <mechanic_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "quoteAmount": 5000,
    "estimatedDuration": "5-7 gün",
    "notes": "Ön tampon boyama ve çizik düzeltme işlemi yapılacak"
  }'
```

### 5. Driver - Teklif Seç

```bash
curl -X POST "https://your-api-url.com/api/fault-reports/<fault_report_id>/select-quote" \
  -H "Authorization: Bearer <driver_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "mechanicId": "mechanic_id",
    "quoteAmount": 5000
  }'
```

### 6. Driver - Randevu Oluştur (Otomatik BodyworkJob)

```bash
curl -X POST "https://your-api-url.com/api/fault-reports/<fault_report_id>/create-appointment" \
  -H "Authorization: Bearer <driver_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "faultReportId": "fault_report_id",
    "appointmentDate": "2024-12-25T10:00:00.000Z",
    "timeSlot": "10:00-12:00"
  }'
```

**Önemli:** Bu endpoint, eğer `serviceCategory` "Kaporta/Boya" ise otomatik olarak BodyworkJob oluşturur.

**Response:**
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

### 7. FaultReport BodyworkJobId Kontrolü

```bash
curl -X GET "https://your-api-url.com/api/fault-reports/<fault_report_id>" \
  -H "Authorization: Bearer <driver_token>"
```

**Response'da kontrol edilecek:**
```json
{
  "success": true,
  "data": {
    "_id": "fault_report_id",
    "bodyworkJobId": {
      "_id": "bodywork_job_id",
      "status": "quote_preparation"
    },
    ...
  }
}
```

### 8. Mechanic - Manuel Dönüşüm (Kaporta İşine Dönüştür)

```bash
curl -X POST "https://your-api-url.com/api/fault-reports/<fault_report_id>/convert-to-bodywork-job" \
  -H "Authorization: Bearer <mechanic_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "mechanicId": "mechanic_id"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Arıza bildirimi kaporta işine dönüştürüldü",
  "data": {
    "bodyworkJob": {
      "_id": "bodywork_job_id",
      "status": "quote_preparation"
    }
  }
}
```

### 9. Mechanic - Bodywork İşlerini Listele

```bash
curl -X GET "https://your-api-url.com/api/bodywork/mechanic-jobs?status=all&page=1&limit=10" \
  -H "Authorization: Bearer <mechanic_token>"
```

### 10. Driver - Bodywork İşlerini Listele

```bash
curl -X GET "https://your-api-url.com/api/bodywork/customer/jobs?status=all&page=1&limit=10" \
  -H "Authorization: Bearer <driver_token>"
```

### 11. BodyworkJob Detayı (Driver)

```bash
curl -X GET "https://your-api-url.com/api/bodywork/customer/<job_id>" \
  -H "Authorization: Bearer <driver_token>"
```

### 12. BodyworkJob Detayı (Mechanic)

```bash
curl -X GET "https://your-api-url.com/api/bodywork/<job_id>" \
  -H "Authorization: Bearer <mechanic_token>"
```

## Test Checklist

### Otomatik BodyworkJob Oluşturma Akışı

- [ ] Driver login başarılı
- [ ] Mechanic login başarılı
- [ ] Kaporta/Boya arıza bildirimi oluşturuldu
- [ ] Mechanic arıza bildirimini görüyor
- [ ] Mechanic teklif verdi
- [ ] Driver teklif seçti
- [ ] Driver randevu oluşturdu
- [ ] **BodyworkJob otomatik oluşturuldu** ✅
- [ ] FaultReport'da bodyworkJobId var ✅
- [ ] Mechanic bodywork işlerini görüyor
- [ ] Driver bodywork işlerini görüyor

### Manuel Dönüşüm Akışı

- [ ] Driver arıza bildirimi oluşturdu
- [ ] Mechanic teklif verdi
- [ ] Driver teklif seçti
- [ ] Mechanic "Kaporta İşine Dönüştür" endpoint'ini çağırdı
- [ ] **BodyworkJob manuel oluşturuldu** ✅
- [ ] FaultReport'da bodyworkJobId var ✅
- [ ] Mechanic bodywork işlerini görüyor
- [ ] Driver bodywork işlerini görüyor

## Beklenen Davranışlar

### 1. Otomatik BodyworkJob Oluşturma

**Koşullar:**
- `serviceCategory` = "Kaporta/Boya" veya "Kaporta & Boya" veya "kaporta-boya"
- Randevu oluşturulurken `mechanicId` mevcut

**Sonuç:**
- BodyworkJob otomatik oluşturulur
- FaultReport'a `bodyworkJobId` eklenir
- Response'da `bodyworkJob` bilgisi döner

### 2. Manuel Dönüşüm

**Koşullar:**
- `serviceCategory` = "Kaporta/Boya"
- `selectedQuote` mevcut
- `bodyworkJobId` henüz yok

**Sonuç:**
- BodyworkJob manuel oluşturulur
- FaultReport'a `bodyworkJobId` eklenir

### 3. Hata Durumları

**Tekrar Dönüşüm Denemesi:**
- Eğer `bodyworkJobId` zaten varsa, hata döner: "Bu arıza bildirimi zaten kaporta işine dönüştürülmüş"

**Yanlış Kategori:**
- Eğer `serviceCategory` "Kaporta/Boya" değilse, hata döner: "Bu arıza bildirimi Kaporta/Boya kategorisinde değil"

## Test Verileri

### Örnek Kullanıcılar

**Driver:**
- Email: `driver@test.com`
- Password: `test123`
- UserType: `driver`

**Mechanic:**
- Email: `mechanic@test.com`
- Password: `test123`
- UserType: `mechanic`
- ServiceCategories: `["bodywork"]`

### Örnek Araç Bilgileri

- Brand: `Toyota`
- Model: `Corolla`
- Year: `2020`
- PlateNumber: `34ABC123`

## Debug İpuçları

1. **Token Expire:** Eğer 401 hatası alıyorsanız, token yenileyin
2. **Vehicle ID:** Önce driver'ın araçlarını listeleyin
3. **BodyworkJobId Kontrolü:** FaultReport detayını kontrol ederek `bodyworkJobId`'nin eklenip eklenmediğini görün
4. **Response Format:** `jq` kullanarak response'ları formatlayın: `curl ... | jq '.'`

## Troubleshooting

### Problem: BodyworkJob oluşturulmuyor

**Çözüm:**
1. FaultReport'un `serviceCategory`'sini kontrol edin
2. Randevu oluştururken `mechanicId`'nin mevcut olduğundan emin olun
3. Backend log'larını kontrol edin

### Problem: Manuel dönüşüm çalışmıyor

**Çözüm:**
1. FaultReport'un zaten dönüştürülmüş olmadığını kontrol edin
2. `selectedQuote`'un mevcut olduğundan emin olun
3. Mechanic'in doğru token'ını kullandığınızdan emin olun

