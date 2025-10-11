# Konum Bilgisi Feature Gereksinimleri

## Durum: Planlama Aşaması

## Genel Bakış

Şu anda randevu oluştururken konum bilgisi sabit değer (0, 0) olarak gönderiliyor. Bu feature, gerçek GPS koordinatlarını ve adres bilgisini toplamak için gerekli implementasyonu içerir.

## Etkilenen Dosyalar

### Frontend (Driver App)
- `rektefe-dv/src/features/appointments/screens/BookAppointmentScreen.tsx` (satır 253-257)
- Diğer randevu oluşturma ekranları

### Backend
- `rest-api/src/models/Appointment.ts` - Location schema (zaten var)
- `rest-api/src/services/appointment.service.ts` - Konum validasyonu

## Gereksinimler

### 1. Konum İzni (Permission Handling)

**Platform:** iOS & Android

**Gerekli İzinler:**
- iOS: `NSLocationWhenInUseUsageDescription` (Info.plist)
- Android: `ACCESS_FINE_LOCATION` & `ACCESS_COARSE_LOCATION`

**Implementasyon:**
```typescript
import * as Location from 'expo-location';

// İzin iste
const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') {
  // Kullanıcıya bilgi ver: "Konum izni gerekiyor"
  // Manuel adres girişi seçeneği sun
}
```

### 2. GPS Koordinatları Alma

**Library:** `expo-location` (zaten projede var mı kontrol et)

**Implementasyon:**
```typescript
// Geçerli konumu al
const location = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.Balanced, // Pil tasarrufu için
  timeout: 10000, // 10 saniye timeout
});

const { latitude, longitude } = location.coords;
```

### 3. Reverse Geocoding (Koordinat → Adres)

**Library:** `expo-location` veya Google Maps API

**Implementasyon:**
```typescript
// Koordinatlardan adres bilgisi al
const addresses = await Location.reverseGeocodeAsync({
  latitude,
  longitude
});

const address = addresses[0];
// address.city, address.street, address.district vb.
```

### 4. Manuel Adres Girişi (Fallback)

Eğer GPS erişimi reddedilirse veya başarısız olursa:

**UI Bileşenleri:**
- Adres input field'ı
- İl/İlçe dropdown'ları
- Mahalle input
- Sokak/Cadde input

### 5. Harita Seçimi (Opsiyonel, Gelişmiş)

**Library:** `react-native-maps`

Kullanıcı haritada pin ile konumunu işaretleyebilir.

## Veri Modeli

```typescript
location: {
  latitude: number;      // GPS koordinatı
  longitude: number;     // GPS koordinatı
  address: string;       // Tam adres
  city: string;          // İl
  district: string;      // İlçe
  neighborhood: string;  // Mahalle
  street: string;        // Sokak/Cadde (opsiyonel)
  building: string;      // Bina no (opsiyonel)
}
```

## UX Akışı

### Senaryolar

**Senaryo 1: GPS İzni Verildi**
1. Kullanıcı "Randevu Oluştur" butonuna basar
2. Otomatik olarak GPS konumu alınır (loading indicator göster)
3. Konum bilgisi form'da görüntülenir
4. Kullanıcı gerekirse düzeltme yapabilir
5. Randevu oluşturulur

**Senaryo 2: GPS İzni Reddedildi**
1. Kullanıcı "Randevu Oluştur" butonuna basar
2. İzin reddedildiği için manuel adres girişi formu gösterilir
3. Kullanıcı adresini manuel girer
4. Randevu oluşturulur

**Senaryo 3: GPS Hatası (Timeout, Sinyal Yok)**
1. GPS konumu alınmaya çalışılır
2. Timeout olursa (10 saniye) veya hata oluşursa
3. Kullanıcıya hata mesajı gösterilir
4. Manuel adres girişi seçeneği sunulur

## Güvenlik ve Gizlilik

1. **Konum Verisi Hassas Bilgidir:**
   - Kullanıcıya neden konum bilgisi gerektiği açıkça anlatılmalı
   - Sadece randevu için kullanılacağı belirtilmeli

2. **Veri Saklama:**
   - Konum bilgisi sadece ilgili randevuya bağlı olmalı
   - Randevu tamamlandıktan sonra konum geçmişi saklanmamalı (KVKK uyumu)

3. **İzin Yönetimi:**
   - Kullanıcı istediği zaman izni geri çekebilmeli
   - İzin reddedildiğinde uygulama çalışmaya devam etmeli (graceful degradation)

## Test Senaryoları

### Test 1: İzin Verildi + GPS Başarılı
- [ ] Konum izni verildi
- [ ] GPS koordinatları başarıyla alındı
- [ ] Adres bilgisi reverse geocoding ile alındı
- [ ] Randevu doğru konum ile oluşturuldu

### Test 2: İzin Reddedildi
- [ ] Konum izni reddedildi
- [ ] Manuel adres formu gösterildi
- [ ] Kullanıcı manuel adres girdi
- [ ] Randevu manuel konum ile oluşturuldu

### Test 3: GPS Timeout
- [ ] GPS isteği timeout oldu
- [ ] Hata mesajı gösterildi
- [ ] Manuel adres seçeneği sunuldu

### Test 4: Zayıf Sinyal
- [ ] GPS sinyali zayıf
- [ ] Düşük accuracy uyarısı gösterildi
- [ ] Kullanıcı manuel düzeltme yaptı

## Performans Optimizasyonu

1. **Caching:**
   - Son kullanılan konum 5 dakika boyunca cache'lenir
   - Kullanıcı aynı bölgede birden fazla randevu oluşturursa GPS tekrar sorgulanmaz

2. **Battery Optimization:**
   - `Location.Accuracy.Balanced` kullan (High accuracy yerine)
   - Timeout 10 saniye olarak ayarla

3. **Network Optimization:**
   - Reverse geocoding sonuçları cache'le
   - Offline senaryolar için fallback planı

## Implementasyon Planı

### Faz 1: Temel GPS (1-2 gün)
- [ ] expo-location kurulumu
- [ ] Permission handling
- [ ] GPS koordinatları alma
- [ ] BookAppointmentScreen'e entegrasyon

### Faz 2: Reverse Geocoding (1 gün)
- [ ] Koordinatlardan adres alma
- [ ] Adres bilgisi UI'da gösterme
- [ ] Backend'e doğru formatta gönderme

### Faz 3: Manuel Adres (1 gün)
- [ ] Manuel adres formu UI
- [ ] İl/İlçe dropdown'ları
- [ ] Validasyon

### Faz 4: Error Handling (1 gün)
- [ ] Timeout handling
- [ ] İzin reddi durumu
- [ ] Hata mesajları
- [ ] Fallback senaryolar

### Faz 5: Test & Optimizasyon (1 gün)
- [ ] Tüm senaryoları test et
- [ ] Performance optimization
- [ ] UX iyileştirmeleri

**Toplam Süre:** ~5 gün

## Bağımlılıklar

### NPM Paketleri
```json
{
  "expo-location": "^16.x.x", // Kontrol et, zaten var mı?
  "react-native-maps": "^1.x.x" // Opsiyonel
}
```

### Expo Config
```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Randevu konumunu belirlemek için konum izni gerekiyor."
        }
      ]
    ]
  }
}
```

## Alternatif Çözümler

### Alternatif 1: Sadece Manuel Adres
**Pros:** Basit, izin gerektirmez  
**Cons:** UX kötü, kullanıcı her seferinde girmeli

### Alternatif 2: Son Kullanılan Adresler
**Pros:** Hızlı, kullanıcı dostu  
**Cons:** İlk kullanımda yine girmeli

### Alternatif 3: Harita Üzerinden Seçim (Önerilen)
**Pros:** Görsel, net, kullanıcı kontrol ediyor  
**Cons:** Biraz daha karmaşık implementasyon

## Notlar

- Mevcut kod'da satır 254'te `latitude: 0, longitude: 0` var
- Bu sadece placeholder, işlevsel değil
- Mechanic app'de usta konumu zaten alınıyor olabilir (kontrol edilmeli)
- Driver ve Mechanic arasındaki mesafe hesaplaması için bu bilgi kritik

## İlgili Dökümanlar

- [Expo Location Documentation](https://docs.expo.dev/versions/latest/sdk/location/)
- [KVKK Konum Verisi Rehberi](https://www.kvkk.gov.tr/)

## Son Güncelleme

- **Tarih:** 2025-10-11
- **Güncelleyen:** AI Assistant
- **Durum:** Dokümantasyon tamamlandı, implementasyon bekleniyor

