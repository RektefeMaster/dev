# Araç Yıkama Modülü - Manuel Test Kılavuzu

## Hazırlık

### 1. Test Kullanıcıları Oluştur

```bash
npm run create:test-users
```

**Oluşan Kullanıcılar:**
- Şöför: `testdv@gmail.com` / `test123`
- Usta: `testus@gmail.com` / `test123`

### 2. Backend'i Başlat

```bash
npm run dev
```

---

## Test Senaryoları

### 📝 1. Provider Profili Oluştur (US App)

**Endpoint:** `POST /api/wash/provider/setup`

**Headers:**
```
Authorization: Bearer {USTA_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "businessName": "Test Yıkama Merkezi",
  "type": "shop",
  "location": {
    "address": "Test Caddesi No:1 Kadıköy/İstanbul",
    "city": "İstanbul",
    "district": "Kadıköy",
    "coordinates": {
      "latitude": 40.9922,
      "longitude": 29.0219
    }
  },
  "shop": {
    "hasLanes": true,
    "laneCount": 2,
    "totalCapacity": 10,
    "workingHours": [
      {
        "day": 1,
        "isOpen": true,
        "openTime": "09:00",
        "closeTime": "18:00"
      },
      {
        "day": 2,
        "isOpen": true,
        "openTime": "09:00",
        "closeTime": "18:00"
      }
    ]
  }
}
```

**Beklenen Sonuç:** ✅ 200 OK

---

### 📦 2. Yıkama Paketi Oluştur (US App)

**Endpoint:** `POST /api/wash/packages/create`

**Headers:**
```
Authorization: Bearer {USTA_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Standart Yıkama",
  "description": "Dış yıkama ve iç temizlik",
  "packageType": "standard",
  "basePrice": 150,
  "duration": 30,
  "services": [
    { "name": "Köpükleme", "category": "exterior", "order": 1 },
    { "name": "Durulama", "category": "exterior", "order": 2 },
    { "name": "Kurulama", "category": "exterior", "order": 3 },
    { "name": "İç Temizlik", "category": "interior", "order": 4 }
  ],
  "extras": [],
  "availableFor": "shop",
  "requirements": {
    "requiresPower": false,
    "requiresWater": true,
    "requiresCoveredArea": false
  }
}
```

**Beklenen Sonuç:** ✅ 201 Created

---

### 💰 3. Fiyat Teklifi Al (DV App)

**Endpoint:** `POST /api/wash/quote`

**Headers:**
```
Authorization: Bearer {DRIVER_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "packageId": "{PACKAGE_ID}",
  "vehicleSegment": "B",
  "type": "shop",
  "providerId": "{MECHANIC_USER_ID}"
}
```

**Beklenen Sonuç:** ✅ 200 OK
```json
{
  "success": true,
  "data": {
    "pricing": {
      "basePrice": 150,
      "segmentMultiplier": 1.15,
      "finalPrice": 172.5
    }
  }
}
```

---

### 🚗 4. Sipariş Oluştur (DV App)

**Endpoint:** `POST /api/wash/order`

**Headers:**
```
Authorization: Bearer {DRIVER_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "providerId": "{MECHANIC_USER_ID}",
  "packageId": "{PACKAGE_ID}",
  "vehicle": {
    "brand": "Toyota",
    "model": "Corolla",
    "year": 2020,
    "plateNumber": "34 TEST 123",
    "segment": "B"
  },
  "type": "shop",
  "location": {
    "address": "Test Caddesi No:1 Kadıköy/İstanbul"
  },
  "scheduling": {
    "slotStart": "2025-10-18T10:00:00.000Z",
    "slotEnd": "2025-10-18T10:35:00.000Z"
  },
  "tefePuanUsed": 0,
  "cardInfo": {
    "cardNumber": "4111111111111111",
    "cardHolderName": "Test User",
    "expiryMonth": "12",
    "expiryYear": "2025",
    "cvv": "123"
  }
}
```

**Beklenen Sonuç:** ✅ 201 Created
```json
{
  "success": true,
  "data": {
    "orderNumber": "WSH-...",
    "status": "DRIVER_CONFIRMED",
    "escrow": {
      "status": "held",
      "transactionId": "MOCK_TXN_..."
    }
  }
}
```

---

### ✅ 5. Sipariş Kabul Et (US App)

**Endpoint:** `POST /api/wash/jobs/{ORDER_ID}/accept`

**Headers:**
```
Authorization: Bearer {USTA_TOKEN}
```

**Beklenen Sonuç:** ✅ 200 OK
```json
{
  "success": true,
  "data": {
    "status": "PROVIDER_ACCEPTED"
  }
}
```

---

### 🔔 6. Check-in Yap (US App)

**Endpoint:** `POST /api/wash/jobs/{ORDER_ID}/checkin`

**Headers:**
```
Authorization: Bearer {USTA_TOKEN}
```

**Beklenen Sonuç:** ✅ 200 OK
```json
{
  "success": true,
  "data": {
    "status": "CHECK_IN",
    "scheduling": {
      "actualStartTime": "..."
    }
  }
}
```

---

### 🚀 7. İşi Başlat (US App)

**Endpoint:** `POST /api/wash/jobs/{ORDER_ID}/start`

**Headers:**
```
Authorization: Bearer {USTA_TOKEN}
```

**Beklenen Sonuç:** ✅ 200 OK
```json
{
  "success": true,
  "data": {
    "status": "IN_PROGRESS",
    "workSteps[0].status": "in_progress"
  }
}
```

---

### 📸 8. İlerleme Güncelle (US App)

**Endpoint:** `POST /api/wash/jobs/{ORDER_ID}/progress`

**Headers:**
```
Authorization: Bearer {USTA_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "stepIndex": 0,
  "photos": ["https://test.com/photo1.jpg"],
  "notes": "Köpükleme tamamlandı",
  "completed": true
}
```

**Her Adım İçin Tekrarla:** stepIndex 0-4

**Beklenen Sonuç:** ✅ 200 OK

---

### 📋 9. QA Gönder (US App)

**Endpoint:** `POST /api/wash/jobs/{ORDER_ID}/qa-submit`

**Headers:**
```
Authorization: Bearer {USTA_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "photosBefore": [
    "https://test.com/before-front.jpg",
    "https://test.com/before-back.jpg",
    "https://test.com/before-left.jpg",
    "https://test.com/before-right.jpg",
    "https://test.com/before-interior-front.jpg",
    "https://test.com/before-interior-back.jpg"
  ],
  "photosAfter": [
    "https://test.com/after-front.jpg",
    "https://test.com/after-back.jpg",
    "https://test.com/after-left.jpg",
    "https://test.com/after-right.jpg",
    "https://test.com/after-interior-front.jpg",
    "https://test.com/after-interior-back.jpg"
  ]
}
```

**Beklenen Sonuç:** ✅ 200 OK
```json
{
  "success": true,
  "data": {
    "status": "QA_PENDING",
    "qa": {
      "approvalStatus": "pending",
      "autoApproveAt": "..." // 15 dk sonra
    }
  }
}
```

---

### ✅ 10. QA Onayla (DV App)

**Endpoint:** `POST /api/wash/order/{ORDER_ID}/qa-approve`

**Headers:**
```
Authorization: Bearer {DRIVER_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "approved": true
}
```

**Beklenen Sonuç:** ✅ 200 OK
```json
{
  "success": true,
  "data": {
    "status": "PAID",
    "qa": {
      "approvalStatus": "approved"
    },
    "escrow": {
      "status": "captured"
    }
  }
}
```

---

## 🧪 Test Sonuçları

### Geçmesi Gerekenler:
- ✅ Sistem Hazır Kontrolü
- ✅ Paket Listesi Alınabilmeli
- 💰 Fiyat Teklifi
- 📝 Sipariş Oluştur
- 📋 Siparişler Listele
- 🔧 Usta İşleri Görüntüle

### Postman/Insomnia ile Test:

1. `POST /api/auth/login` ile token al (testdv ve testus için)
2. Yukarıdaki endpoint'leri sırasıyla test et
3. Her adımda response'u kaydet
4. Hataları not al

---

## 🔍 Sorun Giderme

### 401 Unauthorized
- Token doğru mu kontrol et
- JWT_SECRET doğru mu kontrol et
- Token expired olabilir (1 saat geçerli)

### 404 Not Found
- ID'leri doğru mu kontrol et
- İlişkili veriler oluşturuldu mu

### 400 Bad Request
- JSON formatı doğru mu
- Gerekli alanlar dolu mu
- Validation hatalarını oku

---

## 📊 E2E Test Durumu

**Otomatik Testler:** ⚠️ Auth middleware sorunu (401)
**Manuel Testler:** ✅ Bu kılavuzu kullan

**Öneri:** Postman/Insomnia ile manuel test yapılması önerilir.

