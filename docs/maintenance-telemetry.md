# Bakım Önerisi Telemetri Şeması

Akıllı bakım motoru devreye alındıktan sonra hangi önerilerin üretildiğini ve kullanıcı davranışını izlemek için aşağıdaki olaylar kullanılır. Bu doküman hem backend hem de istemci tarafında hangi verilerin gönderileceğini ve nasıl anonimleştirileceğini açıklar.

## Olay İsimleri

| Event | Üretilme Noktası | Açıklama |
| --- | --- | --- |
| `maintenance_recommendation_shown` | Backend – `VehicleStatusService` | Kullanıcıya bakım özetinde öneri listesi dönüldüğünde kaydedilir. |
| `maintenance_recommendation_clicked` | (Planlı) UI | Kullanıcı öneriden detay aksiyonu tetiklediğinde gönderilecek. |
| `maintenance_recommendation_dismissed` | (Planlı) UI | Kullanıcı öneriyi kapattığında gönderilecek. |
| `maintenance_recommendation_completed` | (Planlı) UI/Backend | Kullanıcı öneriyi gerçekleştirdiğinde (ör. randevu oluşturduğunda) kaydedilecek. |

Şimdilik yalnızca `shown` olayı backend tarafından otomatik kaydedilir; diğerleri UI entegrasyonu tamamlandığında devreye alınacaktır.

## `maintenance_recommendation_shown` Payload

Backend, `AnalyticsEvent` modeline aşağıdaki alanlarla kayıt ekler:

```json
{
  "tenantId": "default",
  "userId": "65f5…",
  "event": "maintenance_recommendation_shown",
  "timestamp": "2025-02-12T18:30:00.000Z",
  "properties": {
    "vehicleId": "6914…",
    "recommendationCount": 2,
    "severities": {
      "critical": 1,
      "warning": 1
    },
    "ruleIds": [
      "engine_oil_service",
      "brake_system_check"
    ],
    "odometerStatus": "STALE"
  }
}
```

### Alan Açıklamaları

- `vehicleId`: Kullanıcının favori aracı veya özetlenen araç. (PII olmayan, Mongo ObjectId)
- `recommendationCount`: Liste uzunluğu.
- `severities`: Kritikite dağılımı, karar verme metrikleri için kullanılır.
- `ruleIds`: Üretilen öneri kuralları (anonim, kodlu isimler).
- `odometerStatus`: Kilometre tahmin durum kodu (`OK`, `NO_BASELINE`, `STALE`, `LOW_CONFIDENCE`).

`userId` yalnızca geçerli Mongo ObjectId ise loglanır; aksi durumda anonim kalır.

## Gizlilik

- Plaka, kullanıcı adı gibi PII değerler gönderilmez.
- `ruleIds` sadece sistem içi kodlardır.
- Olaylar, ihtiyaç halinde `tenantId` ve `vehicleId` üzerinden topluluk düzeyinde analiz edilebilir.

## İleriye Dönük Geliştirme

- UI entegrasyonu tamamlandığında `clicked`, `dismissed`, `completed` olayları eklenmeli; payload’larda kullanıcı aksiyon süresi, tetiklenen aksiyon tipi gibi alanlar toplanmalıdır.
- Olaylar özel bir analiz deposuna aktarılacaksa (ör. BigQuery), `AnalyticsEvent` pipeline’ı güncellenmelidir.
- ML modeli için etiketli veri gereksinimleri (öneri → aksiyon) bu olayların türevlerinden üretilecektir.


