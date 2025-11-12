# Odometer & Bakım Modülü - Ortam ve Log Analizi Kılavuzu

Bu doküman, üretim/stage ortamında kilometre ve bakım modülüne ait hataları izole ederken izlenecek adımları özetler. Planın "Hata Analizi ve Ortam Hazırlığı" maddesini desteklemek üzere hazırlanmıştır.

## 1. Ortam Değişkenleri Fotoğrafı

1. Railway projesinde ilgili servis için aşağıdaki değişkenleri export edin:
   ```bash
   railway variables --service rest-api \
     | grep -E 'FEATURE_FLAGS_FORCE_ON|NODE_ENV|RAILWAY_ENVIRONMENT|ALLOW_SEED|MONGODB_URI'
   ```
2. Sonucu `infra/env-snapshots/<tarih>-rest-api.env` olarak saklayın.
3. Değişiklik olduğunda git’e dahil etmeyin; yalnızca observability açısından saklayın.

## 2. Feature Flag Koleksiyonu Snapshot

MongoDB shell veya Compass üzerinden:

```javascript
db.feature_flag
  .find({ key: { $in: [
    'akilli_kilometre',
    'akilli_kilometre_shadow',
    'akilli_bakim_oneri'
  ]}})
  .project({ key: 1, defaultOn: 1, scopes: 1, updatedAt: 1 })
  .sort({ key: 1 })
  .pretty()
```

Çıktıyı `infra/env-snapshots/<tarih>-feature-flags.json` dosyasında saklayın. Bu, prod/stage için tek kaynaktır.

## 3. Log Korelasyonu (403 & “Kilometre bulunamadı”)

### API Katmanı
- `requestId` başlığının (`X-Request-ID`) her istekte üretildiğinden emin olun.
- Aşağıdaki alanları loglayın:
  - `requestId`
  - `userId`, `userType`
  - `vehicleId`
  - `featureFlags` (istenilen anahtarların enabled durumu)
  - `tenantId`
  - `errorCode`, `httpStatus`

Örnek log payload’ı:
```json
{
  "level": "warn",
  "msg": "Odometer update rejected",
  "requestId": "7f7d6...",
  "userId": "65f5...",
  "vehicleId": "6914...",
  "featureFlags": {
    "akilli_kilometre": false,
    "akilli_kilometre_shadow": false
  },
  "errorCode": "ERR_FEATURE_DISABLED",
  "httpStatus": 403
}
```

### Client (Driver App)
- Aynı `requestId`’yi uygulama tarafında loglayın.
- Kullanıcıya gösterilen hata mesajını ve varsa local validation sonucunu kaydedin.

### Analiz Adımları
1. 403 loglarını istek bazında toplayın (`grep ERR_FEATURE_DISABLED`).
2. Aynı `requestId`’yi client loglarında arayıp kullanıcı tarafındaki davranışı (örn. offline mı, tekrar denedi mi) kontrol edin.

## 4. Standart Test Veri Seti

Stage ortamında aşağıdaki kombinasyonlar oluşturulmalıdır:

| Araç Tipi | MileageModel | Odometer Event | Açıklama |
| --- | --- | --- | --- |
| A | Yok | Yok | Baseline olmayan araç |
| B | Var | Yok | Inicial mileage set edilmiş ama event yok |
| C | Var | Var (≥3) | Normal kullanım senaryosu |

### Oluşturma Akışı
1. `POST /vehicles` ile araç oluştururken farklı km değerleri girin (`0`, `35000`, `78000`).
2. Gerekirse `MileageModel`’i manuel güncelleyin:
   ```javascript
   db.mileage_models.updateOne(
     { vehicleId: ObjectId("<vehicleId>") },
     { $set: { lastTrueKm: 35000, lastTrueTsUtc: ISODate() } },
     { upsert: true }
   );
   ```
3. Odometer event eklemek için:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     https://<stage>/api/vehicles/<id>/odometer/events \
     -d '{"km": 35650, "timestampUtc": "2025-02-01T10:00:00Z", "source": "service", "evidenceType": "none"}'
   ```

### Postman/Thunder Collection
- `Odometer – Baseline`, `Odometer – Valid Update`, `Odometer – Outlier` gibi üç örnek request ekleyin.
- `/home/overview` için aynı araçlarla `GET` isteği oluşturup response’u snapshotlayın.

## 5. Çıktıların Arşivlenmesi
- Tüm snapshot ve log analizlerini `infra/audit/<tarih>/` klasöründe tutun.
- Her deployment öncesi bu klasörü güncelleyip değişiklikleri gözden geçirin.

---

Bu rehber her sprint başında gözden geçirilmeli ve yeni flag / endpoint eklendiğinde güncellenmelidir.

