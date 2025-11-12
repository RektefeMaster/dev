# Akıllı Kilometre (Smart Odometer)

## Özet

Akıllı Kilometre sistemi, son doğrulanmış kilometre ("true" reading) ve kişiye özel günlük kilometre hızını (EWMA) kullanarak **≈ tahmini** gösterir. UI şeffaflığı için ≈ ibaresi, son doğrulama tarihi ve günlük ortalama her ekranda gösterilir. Kullanıcı hızlı modal ile tek alanda km girişi yapabilir, servis/arıza akışlarında gerçek okuma zorunlu tutulur ve tüm kararlar `odometer_audit_log` tablosuna işlenir.

## Formül

```
estimate_km = last_true_km + rate_km_per_day * days_between(now_utc, last_true_ts_utc)
```

- `last_true_km` ve `last_true_ts_utc` her gerçek okuma sonrası güncellenir.
- `rate_km_per_day`, EWMA ile hesaplanır. 
  - Kaynağa/evidence türüne göre `α` değerleri `config/mileage.ts` içinde tanımlıdır.
  - Soft outlier (300–500 km/gün) için `α` yarıya düşer, hard outlier (>500 km/gün) incelemeye alınır.
- İlk kalibrasyon (cold-start) için varsayılan 30 km/gün kullanılır.

## Veri Modeli

### `odometer_event`
- Zorunlu alanlar: `tenant_id`, `vehicle_id`, `series_id`, `km`, `unit`, `timestamp_utc`, `source`, `created_at_utc`.
- Idempotency için `client_request_id` unique index.
- Outlier ve manuel inceleme için `pending_review`, `outlier_class` alanları.
- Sayaç reset senaryosu için `odometer_reset`, yeni seri `series_id` üretilir.

### `mileage_model`
- Araç başına tek satır (`vehicle_id` unique).
- `rate_weekday_json` 0–300 aralığında doğrulanır.
- `shadowRateKmPerDay` alanı gölge mod tahmini için kullanılır.

### `odometer_audit_log`
- Her olay için `action`, `details_json` (α, clamp sonuçları, karar gerekçesi vb.).
- RBAC için tenant ve action index’leri.

## Servis Mantığı

1. **Kilitleme & Idempotency**: Araç bazında Redis SETNX lock, `client_request_id` ile tekrar işleme engellenir.
2. **Doğrulamalar**: Gelecek tarih, azalan km, negatif değer, seri sıfırlama gibi kontroller.
3. **Outlier Politikası**
   - `observed_rate > 500`: Hard outlier → `pending_review=true`, inceleme kuyruğu.
   - `300 < observed_rate ≤ 500`: Soft outlier → `α` yarıya iner, uyarı log’lanır.
4. **Kalibrasyon**: EWMA ile `rate_km_per_day` güncellenir, confidence 0–1 arasında clamp edilir.
5. **Cache**: `odo:est:{tenant}:{vehicle}:{series}` anahtarı 24 saat TTL ile saklanır, event sonrası temizlenir.
6. **Audit**: Eski/yeni rate, confidence, α, clamp ve karar nedeni JSON olarak yazılır.
7. **Gölge Mod**: `shadowRateKmPerDay` ayrı tutulur, fark metriği (`odometer_feature_shadow_abs_error_km`) takip edilir.

## API Sonuçları

- `GET /vehicles/:id/odometer` → ≈ tahmini, ETag ile 304 desteği.
- `POST /vehicles/:id/odometer/events` → idempotent event, hard/soft outlier durumunda 202 ve kodlanmış hata yanıtları.
- `GET /vehicles/:id/odometer/timeline` → Cursor bazlı pagination, source/evidence filtreleri.
- `GET /vehicles/:id/odometer/audit` → RBAC (admin/ops), tarih aralığı ve action filtreleri.

## Entegrasyonlar

- **Randevu Kapanışı**: Servis kilometresi zorunlu. Başarısız kalibrasyonda `odometerVerification.status='failed'` mesajı UI’a taşınır.
- **Arıza Finalizasyonu**: Teslim kilometresi alınır, fault report odometer doğrulama alanı güncellenir.
- **Garaj**: Kartlarda ≈ değer, son doğrulama ve günlük ortalama görsel. Hızlı modal tek alanlı.
- **Home**: Favori araç için ≈ bilgi özet kartta gösterilir.

## Analitik & Metrikler

### Prometheus (backend)
- `odometer_events_total{source,outcome}` (accepted/pending/failed).
- `odometer_calibration_duration_seconds{source}`.
- `odometer_outlier_ratio` gauge.
- `odometer_estimate_abs_error_km`, `odometer_feature_shadow_abs_error_km` histogramları.

### Mobil Event’leri
- `odo_view` (home/garage/appointment).
- `odo_update_open`, `odo_update_submit`.
- `odo_update_reject_*` (decreasing, negative, future, outlier soft/hard).
- `odo_calibrated` (başarılı kalibrasyon).

Eventler `src/shared/utils/analytics.ts` vasıtasıyla backend’e gönderiliyor; endpoint yoksa gelişmiş loglama devreye giriyor.

## Test Planı

1. **Cold-start senaryosu**: Yeni araç ekle, 45 gün sonra tahmini kontrol et.
2. **Servis + foto kanıt**: 30 gün sonra yüksek α ile kalibrasyon.
3. **Yalnız kullanıcı girişi**: Düşük ağırlıkla EWMA değişimi.
4. **Outlier**: 10 günde +10.000 km → Hard outlier (202, pending_review, audit kaydı, offline kuyruğa düşmez).
5. **Azalan km**: Reddedilir; `ERR_ODO_DECREASING` mesajı.
6. **Rollover**: `odometer_reset=true` ile yeni seri, audit “closed”.
7. **Zaman Dilimi**: TR istemci, UTC sunucu → days_between doğruluğu.
8. **Randevu/Arıza entegrasyonları**: Cihazdan yeni km, backend kalibrasyon ve UI anında güncellenir.
9. **Offline Kuyruk**: Bağlantı yokken modal submit → sıraya al, bağlantı gelince otomatik gönder.

## Rollout

- `akilli_kilometre_shadow` flag’i ile gölge modda veri topla, fark metriklerini izle.
- Threshold’lar (örn. P90 hata < 15 km) karşılanınca `akilli_kilometre` açılır.
- Sorunda flag kapatıldığında endpoint’ler `ERR_FEATURE_DISABLED` döndürür, eski davranışa geri dönülür.

## UI Metinleri

- Tooltip: “Kilometre her gün değiştiği için son doğrulamadan bugüne akıllı tahmin gösteriyoruz.”
- Uyarı (azalan km): “Yeni km, son doğrulamanın altında olamaz. Sayaç değiştiyse ayarlardan belirtin.”
- Uyarı (gelecek tarih): “Gelecek tarihli okuma kabul edilmez.”
- Uyarı (alışılmadık artış): “Olağandışı km artışı algılandı. Lütfen teyit edin veya belge ekleyin.”

## SSS

- **Neden ≈ ibaresi var?** → Tahmin ile gerçek ayrımını göstermek için.
- **Sayaç değişirse ne olur?** → Ayarlardan “Sayaç sıfırlandı” seçilince yeni seri başlar, eski seri audit’te kapatılır.
- **Gelecek tarih neden reddedildi?** → Doğruluğu korumak için tüm zaman damgaları UTC’de geçmiş veya bugünü temsil etmeli.

## SLO ve Alarmlar

- `GET /odometer` p95 < 150 ms
- `POST /odometer/events` p95 < 300 ms
- Outlier review p95 < 48 saat
- Alarm: `odometer_outlier_ratio > 0.05` (24h moving), `odometer_events_total` artarken `odometer_outlier_ratio` yükselirse inceleme.
- Alarm: `odometer_events_total` mevcut, `odometer_estimate_abs_error_km` P90 > 100 km ise doğruluk analizi.

Bu dosya, sistemin tasarımını, iş akışını ve operasyonel beklentilerini özetler. Yeni değişiklikler yapıldığında güncelleyin.
