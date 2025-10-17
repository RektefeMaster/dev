# Araç Yıkama Modülü - Uygulama Özeti

## Genel Bakış

Araç yıkama modülü baştan sona yeniden tasarlandı ve uygulandı. Shop (istasyon) ve Mobil yıkama modellerini destekleyen, QA foto sistemi, TefePuan entegrasyonu, TEST modunda escrow ödeme ve gerçek zamanlı takip özellikleri içeren profesyonel bir sistem oluşturuldu.

## ✅ Tamamlanan İşler

### Backend (REST API)

#### Veri Modelleri (7 adet)

1. **WashOrder** (`rest-api/src/models/WashOrder.ts`)
   - Sipariş yaşam döngüsü (14 durum)
   - QA foto sistemi (önce/sonra)
   - Escrow ödeme referansları
   - İş adımları tracking
   - İtiraz yönetimi

2. **WashPackage** (`rest-api/src/models/WashPackage.ts`)
   - Paket tipleri: quick_exterior, standard, detailed_interior, ceramic_protection, engine, custom
   - Segment çarpanları (A/B/C/SUV/Commercial)
   - Hizmetler ve ekstralar
   - QA gereksinimleri
   - Shop/Mobil/Both kullanılabilirlik

3. **WashProvider** (`rest-api/src/models/WashProvider.ts`)
   - İşletme tipi (shop/mobile/both)
   - Shop özellikleri (hatlar, kapasite, çalışma saatleri)
   - Mobil özellikleri (servis alanı, ekipman, mesafe fiyatlandırması)
   - Performans metrikleri
   - İtibar sistemi

4. **WashLane** (`rest-api/src/models/WashLane.ts`)
   - Hat bilgileri ve kapasite
   - Slot tracking (tarih/saat bazlı)
   - Performans metrikleri (P90 süre, kullanım oranı)
   - Bakım durumu

5. **WashInventory** (`rest-api/src/models/WashInventory.ts`)
   - Sarf malzeme stok takibi
   - Kritik eşik uyarıları
   - Tüketim istatistikleri
   - Maliyet tracking

6. **WashPricingRule** (`rest-api/src/models/WashPricingRule.ts`)
   - Şehir/bölge bazlı kurallar
   - Yoğunluk bazlı fiyatlandırma
   - Zaman dilimi çarpanları
   - Mevsimsel çarpanlar
   - Hava durumu bazlı fiyatlandırma

7. **WashDispute** (`rest-api/src/models/WashDispute.ts`)
   - İtiraz türleri (hasar, kalite, eksik hizmet, vb.)
   - Kanıt yönetimi
   - Admin review süreci
   - SLA takibi
   - Escrow çözümü

#### Servisler (3 adet)

1. **EscrowService** (`rest-api/src/services/escrow.service.ts`)
   - ⚠️ **TEST MODU** - Gerçek ödeme yapılmaz
   - `mockHold()` - Ödeme rezerve et
   - `mockCapture()` - Ödemeyi çek
   - `mockRefund()` - İade işlemi
   - `mockFreeze()` - İtiraz durumunda dondur
   - Test kartları kabul edilir (4111111111111111)

2. **WashService** (`rest-api/src/services/wash.service.ts`)
   - `createQuote()` - Dinamik fiyat hesaplama
   - `createOrder()` - Sipariş oluşturma + escrow
   - `acceptOrder()` - Usta kabul
   - `checkIn()` - Giriş yapma
   - `startWork()` - İşi başlatma
   - `updateProgress()` - Adım güncelleme
   - `submitQA()` - Kalite kontrol gönder
   - `approveQA()` - Müşteri onayı
   - `cancelOrder()` - İptal (ceza hesaplama)
   - `calculateDensity()` - Yoğunluk katsayısı
   - `calculateDistance()` - Mesafe hesaplama

3. **WashSlotService** (`rest-api/src/services/washSlot.service.ts`)
   - `getAvailableSlots()` - Müsait slotları getir
   - `reserveSlot()` - Slot rezerve et
   - `releaseSlot()` - Slot serbest bırak
   - `checkSlotAvailability()` - Müsaitlik kontrolü
   - `calculateOccupancyRate()` - Doluluk oranı

#### API Endpoints

**DV (Driver) - 7 endpoint:**
- `POST /api/wash/quote` - Fiyat teklifi
- `POST /api/wash/order` - Sipariş oluştur
- `GET /api/wash/order/:id` - Sipariş detayı
- `POST /api/wash/order/:id/cancel` - İptal
- `POST /api/wash/order/:id/qa-approve` - QA onayla
- `GET /api/wash/my-orders` - Siparişlerim
- `GET /api/wash/providers` - Yakındaki işletmeler

**US (Provider) - 6 endpoint:**
- `GET /api/wash/jobs` - İş listesi
- `POST /api/wash/jobs/:id/accept` - Kabul et
- `POST /api/wash/jobs/:id/checkin` - Check-in
- `POST /api/wash/jobs/:id/start` - Başlat
- `POST /api/wash/jobs/:id/progress` - İlerleme güncelle
- `POST /api/wash/jobs/:id/qa-submit` - QA gönder

**Paketler - 5 endpoint:**
- `GET /api/wash/packages` - Tüm paketler
- `POST /api/wash/packages/create` - Paket oluştur (usta)
- `PUT /api/wash/packages/:id` - Güncelle (usta)
- `DELETE /api/wash/packages/:id` - Sil (usta)
- `GET /api/wash/my-packages` - Kendi paketlerim (usta)

**Slot - 2 endpoint:**
- `GET /api/wash/slots/available` - Müsait slotlar
- `GET /api/wash/slots/occupancy` - Doluluk oranı

#### Seed Script
- `rest-api/src/scripts/seedWashPackages.ts` - 4 varsayılan paket

### Frontend - Sürücü App (DV)

#### Ekranlar (2 adet)

1. **WashBookingScreen** (`rektefe-dv/src/features/services/screens/WashBookingScreen.tsx`)
   - ✅ TAMAMEN YENİDEN YAZILDI
   - 5 adımlı rezervasyon süreci:
     1. Araç seçimi (garaj entegrasyonu)
     2. Paket seçimi + ekstralar
     3. Tip seçimi (Shop vs Mobil)
     4. Zamanlama (slot/zaman penceresi)
     5. Ödeme (TEST MODU)
   - Progress bar (hangi adımdasınız)
   - Araç segment otomatik belirleme
   - Dinamik fiyat gösterimi (breakdown)
   - TefePuan kullanımı (maksimum %50)
   - Provider listesi (mesafeye göre sıralı)
   - Slot takvimi (7 günlük)
   - Mobil için özel gereksinimler (elektrik, su, kapalı alan)

2. **WashTrackingScreen** (`rektefe-dv/src/features/services/screens/WashTrackingScreen.tsx`)
   - Sipariş durumu kartı
   - Müşteri, araç, paket bilgileri
   - İş adımları timeline
   - Her adımın durumu (pending/in_progress/completed)
   - Adım fotoğrafları görüntüleme
   - QA onay bölümü
   - Önce/sonra fotoğraf karşılaştırma
   - İptal butonu (ceza hesaplamalı)
   - İşletme ile iletişim (arama)
   - Otomatik yenileme (30 saniye)

#### API Servisleri

`rektefe-dv/src/shared/services/api.ts` - 13 yeni metod:
- `getWashQuote()` - Fiyat teklifi
- `createWashOrder()` - Sipariş oluştur
- `getWashOrder()` - Sipariş detayı
- `cancelWashOrder()` - İptal
- `approveWashQA()` - QA onayla
- `getMyWashOrders()` - Siparişlerim
- `getWashProviders()` - İşletmeler
- `getAvailableWashSlots()` - Slotlar
- `getWashPackages()` - Paketler
- `createWashPackage()` - Paket oluştur
- `getMyWashPackages()` - Paketlerim
- `updateWashPackage()` - Güncelle
- `deleteWashPackage()` - Sil

#### Navigation

- ✅ `WashBooking` route eklendi
- ✅ `WashTracking` route eklendi (parametreli: orderId)

### Frontend - Usta App (US)

#### Ekranlar (5 adet)

1. **WashPackageManagementScreen** (`rektefe-us/src/features/wash/screens/WashPackageManagementScreen.tsx`)
   - Paket listesi (kendi paketleri)
   - Paket oluşturma/düzenleme/silme
   - Paket tipi seçimi (6 tip)
   - Hizmet ekleme (kategorili)
   - Ekstra hizmet tanımlama (fiyat + süre)
   - Kullanılabilir alan (shop/mobile/both)
   - Gereksinim ayarları
   - Segment bazlı fiyatlandırma (otomatik)
   - Empty state

2. **WashJobsScreen** (`rektefe-us/src/features/wash/screens/WashJobsScreen.tsx`)
   - İş listesi
   - Durum bazlı filtreleme (6 filtre)
   - Shop/Mobil gösterimi
   - İlerleme progress bar
   - Müşteri ve araç bilgileri
   - Fiyat gösterimi
   - Detaya gitme

3. **WashJobDetailScreen** (`rektefe-us/src/features/wash/screens/WashJobDetailScreen.tsx`)
   - İş detayı
   - Durum kartı
   - Müşteri bilgileri (arama butonu)
   - Araç bilgileri
   - Zamanlama bilgileri
   - İş aksiyonları:
     - Kabul et
     - Check-in yap
     - İşi başlat
     - Adım tamamla
     - QA gönder
   - İş adımları checklist
   - QA foto upload modal (önce/sonra 6 açı)
   - Navigasyon (mobil için)

4. **WashProviderSetupScreen** (`rektefe-us/src/features/wash/screens/WashProviderSetupScreen.tsx`)
   - İşletme bilgileri
   - Tip seçimi (shop/mobile/both)
   - Shop ayarları:
     - Kapasite
     - Hat sistemi (opsiyonel)
     - Hat yönetimi
   - Mobil ayarları:
     - Maksimum mesafe
     - Ekipman (su tankı, jeneratör, vakum)
     - Mesafe fiyatlandırması

5. **InventoryScreen** (`rektefe-us/src/features/wash/screens/InventoryScreen.tsx`)
   - Stok listesi
   - Kategori bazlı sınıflandırma
   - Kritik/sipariş eşik uyarıları
   - Progress bar gösterimi
   - Malzeme ekleme/düzenleme/silme
   - Birim maliyet tracking
   - İş başına ortalama tüketim

#### API Servisleri

`rektefe-us/src/shared/services/api.ts` - CarWashService genişletildi:
- `createWashPackage()` - Paket oluştur
- `getMyWashPackages()` - Paketlerim
- `updateWashPackage()` - Güncelle
- `deleteWashPackage()` - Sil
- `getAllWashPackages()` - Tüm paketler
- `getWashJobs()` - İşler
- `acceptWashJob()` - Kabul et
- `checkInWashJob()` - Check-in
- `startWashJob()` - Başlat
- `updateWashProgress()` - İlerleme
- `submitWashQA()` - QA gönder

#### Entegrasyonlar

1. **CarWashScreen Güncellemesi**
   - Packages tab → Yeni paket yönetim ekranına git butonu
   - Jobs tab → Detaylı iş yönetimi + Stok yönetimi butonları
   - Yeni API kullanımı (fallback ile)
   - Eski ve yeni veri yapılarını destekler

2. **Navigation**
   - 5 yeni ekran route'u eklendi
   - Parametreli route'lar (jobId)

## 🔄 Temel Akışlar

### Sürücü Akışı

```
1. Ana Sayfa → Araç Yıkama
   ↓
2. Araç Seç (Garajdan)
   ↓
3. Paket Seç (+ Ekstralar)
   ↓
4. Tip Seç (Shop veya Mobil)
   ↓
5. İşletme Seç
   ↓
6. Zamanlama (Slot veya Zaman Penceresi)
   ↓
7. Fiyat Özeti + TefePuan
   ↓
8. TEST Ödeme
   ↓
9. Sipariş Oluşturuldu → Takip Ekranı
   ↓
10. QA Bekliyor → Onayla/Düzelt/İtiraz
    ↓
11. Tamamlandı → Ödeme Çekildi
```

### Usta Akışı

```
1. Yıkama Hizmetleri → Paketler Tab
   ↓
2. Yeni Paket Yönetim Ekranı
   ↓
3. Paket Oluştur
   - Hizmetler ekle
   - Ekstralar ekle
   - Gereksinimler ayarla
   ↓
4. Paket Kaydedildi

---

5. İşler Tab → Detaylı İş Yönetimi
   ↓
6. Yeni Talep → İşi Kabul Et
   ↓
7. Check-in Yap (QR/Manuel)
   ↓
8. İşi Başlat
   ↓
9. Adım Adım İlerleme
   - Her adımı tamamla
   - Foto yükle (opsiyonel)
   ↓
10. QA Gönder
    - Öncesi: 6 foto
    - Sonrası: 6 foto
    ↓
11. Müşteri Onayı Bekle
    ↓
12. Onaylandı → Ödeme Alındı
```

## 💰 Fiyatlandırma Formülü

```typescript
finalPrice = basePrice 
  * segmentMultiplier       // A:1.0, B:1.15, C:1.3, SUV:1.4, Ticari:1.6
  * (1 + densityCoefficient) // 0-0.5 (doluluk %70+ → lineer artış)
  * locationMultiplier       // Bölge çarpanı (şimdilik 1.0)
  + distanceFee             // Mobil için mesafe ücreti
  - tefePuanDiscount        // Maksimum %50'ye kadar
```

## 🔐 Güvenlik - TEST MODU

### Escrow Ödeme Simülasyonu

- ✅ Tüm ödeme işlemleri mock
- ✅ Gerçek para çekilmez
- ✅ UI'da "TEST MODU" badge'i
- ✅ Her kart numarası kabul edilir
- ✅ CVV kontrolü minimal
- ✅ Transaction logları tutulur
- ✅ Durum akışı gerçeğiyle aynı

### Güvenlik Özellikleri

- JWT token bazlı auth
- Role bazlı yetkilendirme (driver/usta)
- Slot çakışma önleme
- Race condition koruması

## 📊 Durum Makinesi

```
CREATED
  ↓
PRICED (opsiyonel)
  ↓
DRIVER_CONFIRMED (ödeme HOLD)
  ↓
PROVIDER_ACCEPTED
  ↓ (mobil)        ↓ (shop)
EN_ROUTE        CHECK_IN
  ↓                 ↓
  └─────→ IN_PROGRESS
           ↓
        QA_PENDING (foto kontrolü)
           ↓ (onay)
        COMPLETED
           ↓ (ödeme CAPTURE)
         PAID
           ↓ (değerlendirme)
       REVIEWED

İptal Kolları:
- CREATED/PRICED/DRIVER_CONFIRMED → CANCELLED_BY_DRIVER (ücretsiz)
- PROVIDER_ACCEPTED+ → CANCELLED_BY_DRIVER (30% ceza, ödeme REFUND)
- PROVIDER_ACCEPTED+ → CANCELLED_BY_PROVIDER (itibar düşer, REFUND)

İtiraz Kolu:
- IN_PROGRESS/COMPLETED → DISPUTED (ödeme FREEZE)
```

## 🎯 Özellikler

### Dinamik Fiyatlandırma
- ✅ Segment bazlı çarpanlar
- ✅ Yoğunluk bazlı artış
- ✅ Mesafe ücreti (mobil)
- ✅ TefePuan indirimi

### QA Sistemi
- ✅ Zorunlu önce/sonra fotoğraflar
- ✅ 6 açı (front, back, left, right, interior_front, interior_back)
- ✅ 15 dakika otomatik onay
- ✅ Düzeltme talebi
- ✅ İtiraz açma

### Slot Yönetimi
- ✅ Hat bazında slot tracking
- ✅ Doluluk kontrolü
- ✅ Çakışma önleme
- ✅ Çalışma saatleri entegrasyonu
- ✅ Mola saatleri desteği

### Garaj Entegrasyonu
- ✅ Kayıtlı araçları göster
- ✅ Segment otomatik belirleme
- ✅ Araç bilgilerini otomatik doldur
- ✅ Garaj boşsa yönlendirme

### İşletme Özellikleri
- ✅ Shop/Mobil/Both tip desteği
- ✅ Hat sistemi (opsiyonel)
- ✅ Özel paketler oluşturma
- ✅ Ekstra hizmetler
- ✅ Stok takibi (uyarılı)

## 📱 UI/UX Özellikleri

### Sürücü Uygulaması
- Modern, adım adım wizard
- Progress göstergesi
- Responsive kartlar
- Fiyat breakdown
- TEST MODU göstergesi
- Empty states
- Loading states
- Error handling

### Usta Uygulaması
- Paket yönetimi (CRUD)
- İş checklist sistemi
- Foto upload sistemi
- Durum bazlı filtreleme
- İlerleme tracking
- Stok uyarıları

## 🔧 Teknik Detaylar

### Backend Stack
- Node.js + Express
- MongoDB + Mongoose
- TypeScript
- Joi validation
- JWT auth

### Frontend Stack
- React Native (Expo)
- TypeScript
- React Navigation
- Theme system
- Custom components

### Veri Akışı
- REST API
- Axios client
- Error handling
- Type safety
- Response normalization

## 📝 Kullanım Talimatları

### Backend'i Başlatma

```bash
cd rest-api
npm install
npm run dev

# Varsayılan paketleri eklemek için:
npm run seed:wash-packages
# veya
node dist/scripts/seedWashPackages.js
```

### Frontend'leri Başlatma

```bash
# Sürücü App
cd rektefe-dv
npm install
npm run ios  # veya npm run android

# Usta App
cd rektefe-us
npm install  
npm run ios  # veya npm run android
```

### Test Kartı Bilgileri

```
Kart Numarası: 4111111111111111 (veya herhangi bir numara)
Kart Sahibi: TEST USER
Ay: 12
Yıl: 25
CVV: 123
```

## ⚠️ Önemli Notlar

1. **TEST MODU** - Ödeme sistemi simüledir, gerçek ödeme yapılmaz
2. **Fotoğraf Upload** - Şu an local URI kullanılıyor, S3/Firebase entegrasyonu eklenecek
3. **Harita** - Provider listesi var ama harita görünümü gelecek versiyonda
4. **Real-time** - Socket.io entegrasyonu eklenecek
5. **Provider Profil** - WashProvider kaydı manuel oluşturulmalı (UI gelecek)

## 🚀 Sonraki Adımlar (Opsiyonel)

1. Provider profil UI completion
2. Gerçek fotoğraf storage (S3/Firebase)
3. Socket.io real-time updates
4. Yandex Maps entegrasyonu
5. Push notifications
6. QR kod check-in sistemi
7. Admin panel
8. Unit/E2E testler
9. Performans optimizasyonu
10. Gerçek PayTR entegrasyonu

## 📊 Test Senaryoları

### Temel Test

1. **Sürücü:**
   - Garajdan araç seç
   - Standart paket seç
   - Shop seç
   - Yarın için slot seç
   - TEST kartla ödeme yap
   - Sipariş tracking'e git

2. **Usta:**
   - Yeni paket oluştur
   - İşler listesinde yeni talebi gör
   - İşi kabul et
   - Check-in yap
   - İşi başlat
   - Her adımı tamamla
   - QA fotoğraflarını çek ve gönder
   - Müşteri onayını bekle

3. **QA Onay:**
   - Tracking ekranında QA bekliyor durumunu gör
   - Fotoğrafları karşılaştır
   - Onayla
   - Ödeme çekildi durumunu gör

### İptal Senaryoları

1. Sürücü erken iptal (ücretsiz)
2. Sürücü geç iptal (cezalı)
3. Usta iptal (itibar düşer)

## 📁 Dosya Yapısı

```
rest-api/src/
├── models/
│   ├── WashOrder.ts
│   ├── WashPackage.ts
│   ├── WashProvider.ts
│   ├── WashLane.ts
│   ├── WashInventory.ts
│   ├── WashPricingRule.ts
│   └── WashDispute.ts
├── services/
│   ├── wash.service.ts
│   ├── washSlot.service.ts
│   └── escrow.service.ts
├── routes/
│   └── wash.ts
└── scripts/
    └── seedWashPackages.ts

rektefe-dv/src/features/services/screens/
├── WashBookingScreen.tsx (YENİ - Tamamen yeniden yazıldı)
└── WashTrackingScreen.tsx (YENİ)

rektefe-us/src/features/wash/screens/
├── WashPackageManagementScreen.tsx (YENİ)
├── WashJobsScreen.tsx (YENİ)
├── WashJobDetailScreen.tsx (YENİ)
├── WashProviderSetupScreen.tsx (YENİ)
├── InventoryScreen.tsx (YENİ)
└── index.ts
```

## 🎉 Özet

Araç yıkama modülü **tamamen yeniden tasarlandı** ve **profesyonel bir seviyeye** getirildi:

- ✅ 7 backend model
- ✅ 3 backend servis
- ✅ 20+ API endpoint
- ✅ 2 sürücü ekranı (tamamen yeni)
- ✅ 5 usta ekranı (tamamen yeni)
- ✅ TEST modu escrow ödeme
- ✅ QA foto sistemi
- ✅ Dinamik fiyatlandırma
- ✅ Slot yönetimi
- ✅ Garaj entegrasyonu
- ✅ TefePuan entegrasyonu
- ✅ Durum makinesi

Sistem **temel akışları çalıştırmaya hazır** durumda ve gelecekte kolayca genişletilebilir bir altyapıya sahip.

---

*Son Güncelleme: 17 Ekim 2025*

