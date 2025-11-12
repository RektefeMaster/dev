# Araç Sağlık Özeti Servisi

Bu doküman, sürücü uygulamasındaki **Araç Durumu Özeti** bileşenini besleyen yeni servis katmanını açıklar. Servis, araçla ilgili gerçek verileri toplayarak skor üretir, kilit metrikleri hesaplar ve API üzerinden kullanılabilir hâle getirir.

## Genel Mimari

| Katman | Açıklama |
| --- | --- |
| `VehicleStatusService` (`rest-api/src/services/vehicleStatus.service.ts`) | Tüm hesaplama ve veri toparlama mantığını içerir. |
| `GET /api/home/overview` | Ana sayfada kullanılan özet verinin üretildiği uç nokta. |
| `GET /api/vehicle-status/:userId` | İsteğe göre (ör. profil sekmesi) durumun ayrıca çekilebildiği uç nokta. |

Servis, aşağıdaki veri kaynaklarını kullanır:

- `Appointment` koleksiyonu: Tamamlanan, planlanan veya serviste devam eden işlemler.
- `FaultReport` koleksiyonu: Hâlen açık olan arıza kayıtları.
- `Vehicle` kaydı: Son bakım ve planlanan bakım tarihleri.
- `OdometerService`: Mevcut kilometre tahmini ve güven skoru.

## Hesaplanan Alanlar

`VehicleStatusService.getStatusForUser` çağrısı aşağıdaki yapıyı döndürür:

```ts
type VehicleStatusSummary = {
  vehicleId: string;
  overallStatus: 'excellent' | 'good' | 'warning' | 'critical';
  score: number;                    // 0-100 arası puan
  lastCheck: Date;                  // Son bakım / işlem tarihi
  nextServiceDate: Date | null;     // Planlanan ilk servis
  mileage: number | null;           // Tahmini kilometre
  issues: string[];                 // Gösterilecek uyarı listesi
  metrics: {
    daysSinceLastCheck: number | null;
    upcomingServiceInDays: number | null;
    activeFaults: number;
    odometerConfidence: number | null;
    pendingAppointments: number;
  };
  details: {
    upcomingAppointments: Array<{ id: string; service: string; date: Date | null; status: string }>;
    activeFaults: Array<{ id: string; description: string; priority: string; createdAt: Date | null }>;
    lastCompletedServiceId?: string;
  };
};
```

### Skor ve Durum Mantığı

- Başlangıç puanı `92` olarak kabul edilir ve veriler geldikçe puan artırılır veya düşürülür.
- **Bonus** örnekleri:
  - Son bakım ilk 60 gün içinde yapılmışsa +4 puan.
  - Odometer güveni 0.75 üzerindeyse ve bakım süresi 90 günden azsa +3 puan.
- **Ceza** örnekleri:
  - 150 günden uzun süredir bakım yapılmadıysa artan ceza (10/18/28 puan).
  - Servis hâlâ devam ediyorsa (status=`SERVISTE`) 8 puan.
  - Açık arıza raporları önceliğe göre 6–26 puan.
  - Kilometre güveni <0.55 ise ceza; <0.35 ise yüksek ceza.
- Nihai puan aralığına göre durum (`overallStatus`) belirlenir:
  - ≥85 → `excellent`
  - ≥70 → `good`
  - ≥55 → `warning`
  - <55 → `critical`

### Uyarı Mesajları

`issues` listesi doğrudan arayüze iletilir. Başlıca senaryolar:

- hiç tamamlanmış servis yoksa,
- 210 günden uzun süredir bakım yapılmadıysa,
- planlanan bakım tarihi geçmişse,
- araç servis statüsünde ise,
- açık arıza raporları varsa (öncelik etiketiyle),
- kilometre güven skoru düşükse.

Hiç uyarı üretilmezse ve skor ≥85 ise “Araç sağlığı iyi görünüyor.” mesajı eklenir.

## Persist Edilen Veriler

Hesaplanan özet, `VehicleStatusRecordModel` ile (koleksiyon: `vehicle_status`) saklanır:

- `overallStatus`, `lastCheck`, `nextServiceDate`, `mileage`, `issues`
- Kullanıcı bazında tek kayıt tutularak sonraki sorgularda hızlı erişim sağlanır.

## Kullanım Şekilleri

### Ana Sayfa

`GET /api/home/overview` yanıtı artık `vehicleStatus` alanında gerçek değeri döndürür:

```json
{
  "success": true,
  "data": {
    "vehicleStatus": {
      "vehicleId": "...",
      "overallStatus": "warning",
      "score": 63,
      "issues": [
        "Araç serviste: Genel Bakım.",
        "Son bakım 180 gün önce yapılmış. Takipte kalın."
      ],
      "recommendations": [
        {
          "ruleId": "engine_oil_service",
          "title": "Motor Yağı ve Filtre Değişimi",
          "severity": "critical",
          "message": "Motor yağının düzenli aralıklarla değiştirilmesi motor sağlığı için kritik öneme sahiptir.",
          "dueInKm": 0,
          "dueInDays": 0,
          "recommendedActions": [
            "Motor yağı ve yağ filtresi değişimi",
            "Hava filtresi kontrolü"
          ],
          "reasonCodes": ["NO_SERVICE_HISTORY"],
          "relatedServiceTypes": ["genel-bakim"]
        }
      ],
      "metrics": {
        "daysSinceLastCheck": 180,
        "activeFaults": 1,
        "odometerConfidence": 0.42,
        "pendingAppointments": 0
      },
      "details": {
        "upcomingAppointments": [],
        "activeFaults": [
          {
            "id": "...",
            "description": "Motor arızası nedeniyle titreşim",
            "priority": "Yüksek",
            "createdAt": "2025-02-01T08:30:00.000Z"
          }
        ],
        "recommendations": [
          {
            "ruleId": "engine_oil_service",
            "title": "Motor Yağı ve Filtre Değişimi",
            "severity": "critical",
            "message": "Motor yağını ve filtrelerini yenileyin.",
            "dueInKm": 0,
            "dueInDays": 0,
            "recommendedActions": [
              "Motor yağı ve yağ filtresi değişimi",
              "Hava filtresi kontrolü"
            ],
            "reasonCodes": ["NO_SERVICE_HISTORY"],
            "relatedServiceTypes": ["genel-bakim"]
          }
        ]
      }
    },
    "...": "..."
  }
}
```

### Tekil Sorgu

`GET /api/vehicle-status/:userId` yine aynı servisi kullanır. Çağrı yetkilendirme (`auth` middleware) altında yapılır; sadece kendi ID’niz ile sorgu atabilirsiniz.

```bash
curl -H "Authorization: Bearer <TOKEN>" \
     https://api.rektefe.com/api/vehicle-status/USER_ID
```

### Odometer Feature Flag’leri

Araç durumu hesabı, odometre tahminlerine erişim gerektirir. Geliştirme ortamında `akilli_kilometre` ve `akilli_kilometre_shadow` flag’leri varsayılan olarak etkinleştirilir. Üretimde devreye alma stratejisi için:

- MongoDB’de `feature_flag` kaydını güncelleyin **veya**
- Ortam değişkeni kullanın:
  - `FEATURE_FLAGS_FORCE_ON=akilli_kilometre,akilli_kilometre_shadow`
  - `FORCE_FLAG_AKILLI_KILOMETRE=true`

Varsayılan davranış üretim ortamında flag’lerin açık olmasına bağlıdır.

## Bakım ve Genişletme

- **Yeni veri kaynağı ekleme:** `computeSummary` içinde ilgili veri `Promise.all` bloğuna eklenmeli ve skor/metrics hesapları güncellenmeli.
- **Skor ağırlıklarını değiştirme:** `score` ve `addIssue` / `applyBonus` yardımıyla ceza-bonus katsayıları ayarlanabilir.
- **UI üzerinde yeni metrikler gösterme:** `metrics` ve `details.recommendations` alanlarına yeni öğeler ekleyip frontend’de tüketebilirsiniz.
- **Telemetry:** `maintenance_recommendation_shown` olayı `AnalyticsEvent` kaydına düşer; ayrıntılar için `docs/maintenance-telemetry.md`.
- **Persist davranışı:** `persist` parametresi varsayılan true. Sadece hesaplama yapmak istediğiniz (ör. ön tarafta test) senaryolarda `persist: false` geçebilirsiniz.

## Test / Doğrulama

1. `npm run build` komutu backend derlemesinin geçtiğini doğrular.
2. Postman veya benzeri araçla `/api/home/overview` çağrısı yapın; `vehicleStatus` alanının dolu olduğunu ve `issues` listesinin beklenen uyarıları içerdiğini doğrulayın.
3. Randevu veya arıza kaydı ekleyip isteği tekrar çalıştırın; skor değişikliğinin yansıdığını kontrol edin.
4. Odometer feature flag’ini kapatarak (env üzerinden) `akilli_kilometre` devre dışı kaldığında 403 döndüğünü, varsayılan override mekanizmasıyla tekrar açıldığını test edin.

## Bilinen Kısıtlar

- Henüz randevu veya arıza verisi olmayan araçlarda skor, “ilk servis yapılmadı” uyarısı ile düşer; bu beklenen davranıştır.
- Fault report öncelikleri `low/medium/high/urgent` değerlerine göre değerlendirilir; farklı bir değer gelirse “Orta” varsayılır.
- Tek araç varsayımı vardır (favori veya en yeni kayıt). Çoklu araç desteği planlanıyorsa servis signature’ı genişletilmelidir.

Sorular için: `backend/vehicleStatus.service.ts` üzerinde çalışma yapmadan önce bu dokümanı güncelleyin; ön yüz ekibiyle ortak karar alın. Daha ileri otomasyon (ör. cron job ile düzenli re-evaluate) için `persist` çağrıları planlanabilir.

