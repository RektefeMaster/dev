# Araç Yıkama API Test Kılavuzu

Bu doküman, yeni araç yıkama modülü API'lerini test etmek için Postman/Insomnia örnekleri içerir.

## Gereksinimler

1. Backend çalışıyor olmalı (`npm run dev`)
2. MongoDB bağlantısı aktif
3. Varsayılan paketler seed edilmiş olmalı
4. Authentication token'ı alınmış olmalı

## 1. Authentication

Önce login olup token alın:

```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "5551234567",
  "password": "password123",
  "userType": "şöför"  // veya "usta"
}
```

Response'dan `token`'ı alın ve sonraki isteklerde kullanın.

## 2. Paket İşlemleri

### 2.1 Tüm Paketleri Listele

```http
GET /api/wash/packages
```

### 2.2 Provider'a Özel Paketleri Listele

```http
GET /api/wash/packages?providerId=USER_ID&type=shop
```

### 2.3 Yeni Paket Oluştur (Usta)

```http
POST /api/wash/packages/create
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Premium İç-Dış Yıkama",
  "description": "Kapsamlı iç ve dış temizlik paketi",
  "packageType": "standard",
  "basePrice": 120,
  "duration": 60,
  "services": [
    {
      "name": "Dış Yıkama",
      "category": "exterior",
      "order": 1
    },
    {
      "name": "İç Temizlik",
      "category": "interior",
      "order": 2
    },
    {
      "name": "Vakumlama",
      "category": "interior",
      "order": 3
    }
  ],
  "extras": [
    {
      "name": "Motor Temizliği",
      "description": "Motor bölmesi detaylı temizlik",
      "price": 50,
      "duration": 20
    }
  ],
  "availableFor": "both",
  "requirements": {
    "requiresPower": true,
    "requiresWater": true,
    "requiresCoveredArea": false
  }
}
```

### 2.4 Kendi Paketlerimi Getir (Usta)

```http
GET /api/wash/my-packages
Authorization: Bearer YOUR_TOKEN
```

### 2.5 Paketi Güncelle (Usta)

```http
PUT /api/wash/packages/PACKAGE_ID
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "basePrice": 150,
  "isPopular": true
}
```

### 2.6 Paketi Sil (Usta)

```http
DELETE /api/wash/packages/PACKAGE_ID
Authorization: Bearer YOUR_TOKEN
```

## 3. Sipariş İşlemleri (Sürücü)

### 3.1 Fiyat Teklifi Al

```http
POST /api/wash/quote
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "packageId": "PACKAGE_ID",
  "vehicleSegment": "B",
  "type": "shop",
  "providerId": "PROVIDER_USER_ID",
  "scheduledDate": "2025-10-20T10:00:00.000Z"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "package": {...},
    "pricing": {
      "basePrice": 120,
      "segmentMultiplier": 1.15,
      "densityCoefficient": 0.1,
      "locationMultiplier": 1.0,
      "distanceFee": 0,
      "subtotal": 151.8,
      "finalPrice": 151.8
    },
    "breakdown": {
      "Taban Fiyat": "120 TL",
      "Segment Çarpanı": "x1.15",
      "Yoğunluk": "+%10",
      "Mesafe Ücreti": "Yok"
    }
  }
}
```

### 3.2 Sipariş Oluştur

```http
POST /api/wash/order
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "providerId": "PROVIDER_USER_ID",
  "packageId": "PACKAGE_ID",
  "vehicleId": "VEHICLE_ID",
  "vehicle": {
    "brand": "Toyota",
    "model": "Corolla",
    "year": 2020,
    "plateNumber": "34ABC123",
    "segment": "B"
  },
  "type": "shop",
  "location": {
    "address": "Test Adres, İstanbul",
    "latitude": 41.0082,
    "longitude": 28.9784
  },
  "scheduling": {
    "slotStart": "2025-10-20T10:00:00.000Z",
    "slotEnd": "2025-10-20T11:00:00.000Z"
  },
  "laneId": "LANE_ID",
  "tefePuanUsed": 10,
  "cardInfo": {
    "cardNumber": "4111111111111111",
    "cardHolderName": "TEST USER",
    "expiryMonth": "12",
    "expiryYear": "25",
    "cvv": "123"
  }
}
```

### 3.3 Mobil Yıkama Siparişi

```http
POST /api/wash/order
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "providerId": "PROVIDER_USER_ID",
  "packageId": "PACKAGE_ID",
  "vehicleId": "VEHICLE_ID",
  "vehicle": {
    "brand": "BMW",
    "model": "320i",
    "year": 2021,
    "plateNumber": "34XYZ789",
    "segment": "C"
  },
  "type": "mobile",
  "location": {
    "address": "Kadıköy Moda Cad. No:123, İstanbul",
    "latitude": 40.9876,
    "longitude": 29.0234,
    "requiresPower": true,
    "requiresWater": false,
    "isIndoorParking": true
  },
  "scheduling": {
    "timeWindowStart": "2025-10-20T14:00:00.000Z",
    "timeWindowEnd": "2025-10-20T16:00:00.000Z"
  },
  "tefePuanUsed": 0,
  "cardInfo": {
    "cardNumber": "4111111111111111",
    "cardHolderName": "TEST USER",
    "expiryMonth": "12",
    "expiryYear": "25",
    "cvv": "123"
  }
}
```

### 3.4 Sipariş Detayı Getir

```http
GET /api/wash/order/ORDER_ID
Authorization: Bearer YOUR_TOKEN
```

### 3.5 Siparişlerimi Listele

```http
GET /api/wash/my-orders
Authorization: Bearer YOUR_TOKEN

# Filtreli:
GET /api/wash/my-orders?status=IN_PROGRESS
```

### 3.6 Siparişi İptal Et

```http
POST /api/wash/order/ORDER_ID/cancel
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "reason": "Planlarım değişti"
}
```

### 3.7 QA Onayla

```http
POST /api/wash/order/ORDER_ID/qa-approve
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "approved": true
}

# Veya düzeltme iste:
{
  "approved": false,
  "feedback": "Sol arka cam temiz değil"
}
```

## 4. İş Yönetimi (Usta)

### 4.1 İşleri Listele

```http
GET /api/wash/jobs
Authorization: Bearer YOUR_TOKEN

# Filtreli:
GET /api/wash/jobs?status=DRIVER_CONFIRMED
```

### 4.2 İşi Kabul Et

```http
POST /api/wash/jobs/JOB_ID/accept
Authorization: Bearer YOUR_TOKEN
```

### 4.3 Check-in Yap

```http
POST /api/wash/jobs/JOB_ID/checkin
Authorization: Bearer YOUR_TOKEN
```

### 4.4 İşi Başlat

```http
POST /api/wash/jobs/JOB_ID/start
Authorization: Bearer YOUR_TOKEN
```

### 4.5 İlerleme Güncelle

```http
POST /api/wash/jobs/JOB_ID/progress
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "stepIndex": 0,
  "photos": ["https://example.com/photo1.jpg"],
  "notes": "Köpükleme tamamlandı",
  "completed": true
}
```

### 4.6 QA Gönder

```http
POST /api/wash/jobs/JOB_ID/qa-submit
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "photosBefore": [
    "https://example.com/before_front.jpg",
    "https://example.com/before_back.jpg",
    "https://example.com/before_left.jpg",
    "https://example.com/before_right.jpg",
    "https://example.com/before_interior_front.jpg",
    "https://example.com/before_interior_back.jpg"
  ],
  "photosAfter": [
    "https://example.com/after_front.jpg",
    "https://example.com/after_back.jpg",
    "https://example.com/after_left.jpg",
    "https://example.com/after_right.jpg",
    "https://example.com/after_interior_front.jpg",
    "https://example.com/after_interior_back.jpg"
  ]
}
```

## 5. Slot Yönetimi

### 5.1 Müsait Slotları Getir

```http
GET /api/wash/slots/available?providerId=PROVIDER_ID&date=2025-10-20&duration=60
Authorization: Bearer YOUR_TOKEN
```

### 5.2 Doluluk Oranı

```http
GET /api/wash/slots/occupancy?date=2025-10-20
Authorization: Bearer YOUR_TOKEN
```

## 6. Provider İşlemleri

### 6.1 Yakındaki İşletmeleri Listele

```http
GET /api/wash/providers?latitude=41.0082&longitude=28.9784&type=shop&maxDistance=10
Authorization: Bearer YOUR_TOKEN
```

## Test Akışı Örneği

### Tam Bir Sipariş Akışı

```bash
# 1. Sürücü login
POST /api/auth/login
{ "phone": "5551234567", "password": "pass123", "userType": "şöför" }
# → Token al

# 2. Paketleri listele
GET /api/wash/packages

# 3. Fiyat teklifi al
POST /api/wash/quote
{ "packageId": "...", "vehicleSegment": "B", ... }

# 4. Sipariş oluştur (ödeme HOLD)
POST /api/wash/order
{ ... }
# → Order ID al

# 5. Usta login
POST /api/auth/login
{ "phone": "5559876543", "password": "pass123", "userType": "usta" }
# → Token al

# 6. Yeni işleri listele
GET /api/wash/jobs?status=DRIVER_CONFIRMED

# 7. İşi kabul et
POST /api/wash/jobs/ORDER_ID/accept

# 8. Check-in yap
POST /api/wash/jobs/ORDER_ID/checkin

# 9. İşi başlat
POST /api/wash/jobs/ORDER_ID/start

# 10. İlerleme güncelle (her adım için)
POST /api/wash/jobs/ORDER_ID/progress
{ "stepIndex": 0, "completed": true }
POST /api/wash/jobs/ORDER_ID/progress
{ "stepIndex": 1, "completed": true }
# ... tüm adımlar

# 11. QA gönder
POST /api/wash/jobs/ORDER_ID/qa-submit
{ "photosBefore": [...], "photosAfter": [...] }

# 12. Sürücü QA'yı onayla (ödeme CAPTURE)
POST /api/wash/order/ORDER_ID/qa-approve
{ "approved": true }

# 13. Sipariş detayını kontrol et
GET /api/wash/order/ORDER_ID
# → status: "PAID" olmalı
# → escrow.status: "captured" olmalı
```

## Mock Escrow İşlemleri

### Test Konsolu Logları

Backend çalışırken, escrow işlemlerini konsolda görebilirsiniz:

```
🔵 [MOCK ESCROW] HOLD işlemi başlatıldı: { orderId: ..., amount: 151.8, cardLast4: '1111' }
✅ [MOCK ESCROW] HOLD başarılı: { transactionId: 'MOCK_TXN_...', status: 'held' }

🟢 [MOCK ESCROW] CAPTURE işlemi başlatıldı: { transactionId: '...', amount: 151.8 }
✅ [MOCK ESCROW] CAPTURE başarılı: { transactionId: '...', capturedAmount: 151.8 }
```

### İptal Senaryosu

```bash
# Sipariş oluştur
POST /api/wash/order
{ ... }

# İptal et (REFUND)
POST /api/wash/order/ORDER_ID/cancel
{ "reason": "Test iptal" }

# Konsolda:
# 🔴 [MOCK ESCROW] REFUND işlemi başlatıldı
# ✅ [MOCK ESCROW] REFUND başarılı
```

## Hata Senaryoları

### Slot Çakışması

```bash
# İki sipariş aynı slot için
POST /api/wash/order (slot: 10:00-11:00)
POST /api/wash/order (slot: 10:00-11:00)
# → İkincisi 409 Conflict dönmeli
```

### Eksik QA Fotoğrafları

```bash
POST /api/wash/jobs/ORDER_ID/qa-submit
{
  "photosBefore": ["photo1.jpg"],  # Eksik (6 olmalı)
  "photosAfter": []
}
# → 400 Bad Request dönmeli
```

### Geçersiz Durum Geçişi

```bash
# Sipariş CREATED durumundayken
POST /api/wash/jobs/ORDER_ID/qa-submit
# → 404 veya 400 dönmeli (henüz IN_PROGRESS değil)
```

## Beklenen Response Yapıları

### Başarılı Response

```json
{
  "success": true,
  "data": { ... },
  "message": "İşlem başarılı"
}
```

### Hata Response

```json
{
  "success": false,
  "message": "Hata mesajı"
}
```

## Test Checklist

- [ ] Paket oluşturma çalışıyor
- [ ] Fiyat teklifi doğru hesaplanıyor
- [ ] Sipariş oluşturuluyor ve escrow HOLD çalışıyor
- [ ] Usta işi kabul edebiliyor
- [ ] Check-in çalışıyor
- [ ] İş başlatılabiliyor
- [ ] İlerleme güncellenebiliyor
- [ ] QA gönderilebiliyor
- [ ] Sürücü QA'yı onaylayabiliyor
- [ ] Escrow CAPTURE çalışıyor
- [ ] İptal işlemi ve REFUND çalışıyor
- [ ] Slot kontrolü çakışmayı önlüyor
- [ ] Yoğunluk katsayısı hesaplanıyor

## Seed Komutları

### Varsayılan Paketleri Ekle

```bash
cd rest-api
npm run seed:wash-packages
```

Veya manuel:

```bash
node dist/scripts/seedWashPackages.js
```

Bu komut 4 varsayılan paketi ekler:
1. Hızlı Dış Yıkama (50 TL, 15 dk)
2. Standart İç-Dış Yıkama (100 TL, 45 dk)
3. Detaylı İç Temizlik (150 TL, 90 dk)
4. Seramik Koruma Uygulaması (500 TL, 180 dk)

## Troubleshooting

### "Kullanıcı kimliği bulunamadı"
- Token'ın geçerli olduğundan emin olun
- Authorization header'ı doğru eklenmiş mi kontrol edin

### "İşletme bulunamadı"
- providerId geçerli mi?
- User'ın role'ü "usta" mı?
- WashProvider kaydı oluşturulmuş mu?

### "Slot çakışması"
- Aynı tarih/saat için başka rezervasyon var mı kontrol edin
- Lane kapasitesi dolmuş olabilir

### "QA gönderilemedi"
- Tüm work steps completed mi?
- İş IN_PROGRESS durumunda mı?
- Gerekli fotoğraflar var mı?

---

*Not: Tüm örnekler TEST MODU içindir. Gerçek ödeme entegrasyonu yapıldığında escrow servisi güncellenecektir.*

