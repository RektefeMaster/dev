# Test Stratejisi ve Kademeli Yayın Planı

Bu doküman, kilometre/ bakım modülündeki son geliştirmeler için uygulanacak test adımlarını ve üretim ortamına kademeli yayın sürecini özetler.

## 1. Otomatik Testler

| Alan | Komut | Açıklama |
| --- | --- | --- |
| Backend (tip ve derleme) | `npm run build` | TypeScript derlemesi ve tsc kontrolü |
| Backend (ünite/integrasyon) | `npm run test` | Jest testleri; odometer & maintenance servisi için yeni senaryolar eklenecek |
| Frontend (tip kontrol) | `npx tsc --noEmit` | Mobil sürümde tip hatası kontrolü |

### Önerilen Yeni Testler
- `OdometerService` için: baseline yok, aşırı km artışı, düşük güven senaryoları.
- `MaintenanceRecommendationEngine` için: farklı araç tipleri (benzin/dizel/elektrik, şehir içi vs.).  
- `VehicleStatusService` integrasyonu: araç oluştur → odometre event → `/home/overview` çağrısı → öneri dizisinin dönmesi.

## 2. Manuel QA Kontrol Listesi

1. Yeni araç ekle (km ile/ kmsiz) → kilit durumların UI’daki mesajları.
2. Hızlı km güncelle modalı: normal değer, aşırı değer (>3000 km/gün) denemesi.
3. Bakım önerileri:  
   - Verisiz araç → öneri yok mesajı.  
   - Bakımı gecikmiş araç → kritik öneri görünmesi.
4. `/home/overview` ve `/vehicle-status/:userId` yanıtlarının tavsiye alanlarını doğrula.

## 3. Telemetri Doğrulama

- `maintenance_recommendation_shown` kayıtlarının `AnalyticsEvent` koleksiyonunda oluştuğunu kontrol edin (ör. tenant/user/vehicle bazında).
- Railway loglarında event’lerin hata üretmemesi gerekiyor; schema için `docs/maintenance-telemetry.md`.

## 4. Feature Flag ve Rollout

1. **Seed / env hazırlığı**  
   - `npm run seed:odometer` (ALLOW_SEED=true)  
   - Railway env → `FEATURE_FLAGS_FORCE_ON` temizlenebilir; DB kayıtları asıl kaynak.
2. **Stage ortamı**  
   - `akilli_kilometre`, `akilli_kilometre_shadow`, `akilli_bakim_oneri` flag’leri açık.  
   - Manuel QA tamamlandıktan sonra prod rollout.
3. **Production rollout**  
   - İlk aşamada `akilli_bakim_oneri` flag’ini yalnızca iç test kullanıcıları/tenant’ı için açın.  
   - Telemetri/ log metriklerini izleyin (hata oranı, öneri sayısı, 403 hataları).  
   - Sorun yoksa yüzde bazlı genişletme (örn. `%25 sürücü`, `%25 usta`) ve sonunda tam açılış.

## 5. Gözlem ve Alarm

- **Metricler**  
  - `/vehicles/:id/odometer/events` hata oranı  
  - `maintenance_recommendation_shown` event sayısı / kullanıcı başına  
  - Odometer 403 hataları (flag kaynaklı)  
- **Alert eşiği**  
  - 403 hataları > %2 -> flag/permissions kontrolü  
  - `ERR_ODO_RATE_TOO_HIGH` > günde 5 → kullanıcı eğitim/limit incelemesi

## 6. Rollback Planı

- Feature flag’leri kapatmak (akilli_bakim_oneri, akilli_kilometre vs.) yeterlidir.
- Gerektiğinde Railway’de bir önceki image’a dönün; seed script idempotent olduğu için tekrar koşsa da sorun çıkarmaz.
- Telemetri event’leri sadece insert yaptığı için rollback gerekmez; analizde filtrelenebilir.


