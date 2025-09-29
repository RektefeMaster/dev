# Rektefe API Endpoint Dokümantasyonu

Bu dokümantasyon, Rektefe REST API'sinin tüm endpoint'lerini detaylı olarak açıklar. Her endpoint'in amacı, kullanım şekli ve parametreleri belirtilmiştir.

## 📋 İçindekiler

- [Kimlik Doğrulama (Auth)](#kimlik-doğrulama-auth)
- [Kullanıcı Yönetimi (Users)](#kullanıcı-yönetimi-users)
- [Usta Yönetimi (Mechanic)](#usta-yönetimi-mechanic)
- [Randevu Yönetimi (Appointments)](#randevu-yönetimi-appointments)
- [Araç Yönetimi (Vehicles)](#araç-yönetimi-vehicles)
- [Hizmet Talepleri (Service Requests)](#hizmet-talepleri-service-requests)
- [Cüzdan ve Ödeme (Wallet & Payment)](#cüzdan-ve-ödeme-wallet--payment)
- [Bildirimler (Notifications)](#bildirimler-notifications)
- [Diğer Endpoint'ler](#diğer-endpointler)

---

## 🔐 Kimlik Doğrulama (Auth)

### `POST /api/auth/register`
**Amaç:** Yeni kullanıcı kaydı oluşturur
**Kimlik Doğrulama:** Gerekli değil
**Request Body:**
```json
{
  "name": "Ahmet",
  "surname": "Yılmaz", 
  "email": "ahmet@example.com",
  "password": "Test123!",
  "userType": "driver" // veya "mechanic"
}
```
**Response:** JWT token ve kullanıcı bilgileri

### `POST /api/auth/login`
**Amaç:** Kullanıcı girişi yapar
**Kimlik Doğrulama:** Gerekli değil
**Request Body:**
```json
{
  "email": "ahmet@example.com",
  "password": "Test123!",
  "userType": "driver" // veya "mechanic"
}
```
**Response:** JWT token ve kullanıcı bilgileri

### `GET /api/auth/validate`
**Amaç:** Token geçerliliğini kontrol eder
**Kimlik Doğrulama:** Bearer token gerekli
**Response:** Token geçerlilik durumu

### `POST /api/auth/refresh-token`
**Amaç:** Refresh token ile yeni access token alır
**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

### `POST /api/auth/logout`
**Amaç:** Kullanıcı çıkışı yapar
**Kimlik Doğrulama:** Bearer token gerekli

### `POST /api/auth/google-login`
**Amaç:** Google ile giriş yapar
**Request Body:**
```json
{
  "accessToken": "google_access_token_here"
}
```

### `POST /api/auth/google-register`
**Amaç:** Google ile kayıt olur
**Request Body:**
```json
{
  "accessToken": "google_access_token_here",
  "userType": "driver" // veya "mechanic"
}
```

### `GET /api/auth/forgot-password`
**Amaç:** Şifre sıfırlama email'i gönderir
**Query Parameters:** `email` (gerekli)

### `POST /api/auth/reset-password`
**Amaç:** Şifre sıfırlama token'ı ile yeni şifre belirler
**Request Body:**
```json
{
  "token": "reset_token_here",
  "newPassword": "newPassword123!"
}
```

### `POST /api/auth/change-password`
**Amaç:** Giriş yapan kullanıcının şifresini değiştirir
**Kimlik Doğrulama:** Bearer token gerekli
**Request Body:**
```json
{
  "currentPassword": "currentPassword123!",
  "newPassword": "newPassword123!"
}
```

---

## 👤 Kullanıcı Yönetimi (Users)

### `GET /api/users/profile`
**Amaç:** Giriş yapan kullanıcının profil bilgilerini getirir
**Kimlik Doğrulama:** Bearer token gerekli
**Response:** Kullanıcı profil bilgileri

### `PUT /api/users/profile`
**Amaç:** Kullanıcı profil bilgilerini günceller
**Kimlik Doğrulama:** Bearer token gerekli
**Request Body:**
```json
{
  "name": "Ahmet",
  "surname": "Yılmaz",
  "bio": "Hakkımda bilgi",
  "phone": "+905551234567",
  "city": "İstanbul",
  "serviceCategories": ["towing", "repair"]
}
```

### `PUT /api/users/capabilities`
**Amaç:** Usta yeteneklerini günceller
**Kimlik Doğrulama:** Bearer token gerekli
**Request Body:**
```json
{
  "capabilities": ["towing", "repair", "wash", "tire"]
}
```

### `POST /api/users/profile-photo`
**Amaç:** Profil fotoğrafını günceller
**Kimlik Doğrulama:** Bearer token gerekli
**Content-Type:** `multipart/form-data`
**Form Data:** `photo` (dosya)

### `POST /api/users/cover-photo`
**Amaç:** Kapak fotoğrafını günceller
**Kimlik Doğrulama:** Bearer token gerekli
**Content-Type:** `multipart/form-data`
**Form Data:** `photo` (dosya)

### `GET /api/users/notifications`
**Amaç:** Kullanıcı bildirimlerini getirir
**Kimlik Doğrulama:** Bearer token gerekli
**Query Parameters:**
- `page` (opsiyonel): Sayfa numarası
- `limit` (opsiyonel): Sayfa başına bildirim sayısı
- `unreadOnly` (opsiyonel): Sadece okunmamış bildirimler

### `PUT /api/users/notifications/read`
**Amaç:** Bildirimi okundu olarak işaretler
**Kimlik Doğrulama:** Bearer token gerekli
**Request Body:**
```json
{
  "notificationId": "notification_id_here"
}
```

### `PUT /api/users/notifications/read-all`
**Amaç:** Tüm bildirimleri okundu olarak işaretler
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/users/{userId}`
**Amaç:** Belirli bir kullanıcının bilgilerini ID ile getirir
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `userId` (gerekli)

### `GET /api/users/me`
**Amaç:** Giriş yapan kullanıcının detaylı bilgilerini getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/users/search`
**Amaç:** İsim, soyisim veya e-posta ile kullanıcı arama
**Kimlik Doğrulama:** Bearer token gerekli
**Query Parameters:**
- `q` (gerekli): Arama terimi
- `userType` (opsiyonel): Kullanıcı tipi filtresi
- `limit` (opsiyonel): Maksimum sonuç sayısı

### `POST /api/users/push-token`
**Amaç:** Push notification token'ı kaydeder
**Request Body:**
```json
{
  "userId": "user_id_here",
  "pushToken": "expo_push_token_here",
  "platform": "ios" // veya "android", "web"
}
```

### `POST /api/users/become-customer/{mechanicId}`
**Amaç:** Şöförün bir ustaya müşteri olmasını sağlar
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `mechanicId` (gerekli)

### `DELETE /api/users/remove-customer/{mechanicId}`
**Amaç:** Belirtilen ustadan müşteriliği bırakır
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `mechanicId` (gerekli)

### `GET /api/users/my-mechanics`
**Amaç:** Müşterisi olunan ustaları getirir
**Kimlik Doğrulama:** Bearer token gerekli

---

## 🔧 Usta Yönetimi (Mechanic)

### `GET /api/mechanic/me`
**Amaç:** Giriş yapan ustanın profil bilgilerini getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `PUT /api/mechanic/me`
**Amaç:** Usta profil bilgilerini günceller
**Kimlik Doğrulama:** Bearer token gerekli
**Request Body:**
```json
{
  "shopName": "Ahmet Oto Servis",
  "city": "İstanbul",
  "experience": 5,
  "vehicleBrands": ["BMW", "Mercedes"],
  "serviceCategories": ["repair", "towing"],
  "isAvailable": true,
  "phone": "+905551234567"
}
```

### `GET /api/mechanic/list`
**Amaç:** Tüm ustaları listeler
**Query Parameters:**
- `page` (opsiyonel): Sayfa numarası
- `limit` (opsiyonel): Sayfa başına usta sayısı
- `city` (opsiyonel): Şehir filtresi
- `specialization` (opsiyonel): Uzmanlık alanı filtresi

### `GET /api/mechanic/appointments/counts`
**Amaç:** Usta için her durumdaki randevu sayılarını getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/mechanic/wallet`
**Amaç:** Usta cüzdan bilgilerini getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/mechanic/wallet/transactions`
**Amaç:** Usta cüzdan işlemlerini getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `PUT /api/mechanic/availability`
**Amaç:** Usta müsaitlik durumunu günceller
**Kimlik Doğrulama:** Bearer token gerekli
**Request Body:**
```json
{
  "isAvailable": true,
  "availableHours": {
    "monday": ["09:00-17:00"],
    "tuesday": ["09:00-17:00"]
  },
  "notes": "Hafta sonu kapalıyım"
}
```

### `PUT /api/mechanic/rating`
**Amaç:** Usta puanını günceller
**Kimlik Doğrulama:** Bearer token gerekli
**Request Body:**
```json
{
  "rating": 4.5
}
```

### `GET /api/mechanic/search`
**Amaç:** Usta adı, uzmanlık alanı veya şehre göre arama
**Query Parameters:**
- `q` (gerekli): Arama terimi
- `name` (opsiyonel): Usta adı
- `specialization` (opsiyonel): Uzmanlık alanı
- `city` (opsiyonel): Şehir

### `GET /api/mechanic/city/{city}`
**Amaç:** Belirli bir şehirdeki ustaları listeler
**Path Parameters:** `city` (gerekli)
**Query Parameters:**
- `page` (opsiyonel): Sayfa numarası
- `limit` (opsiyonel): Sayfa başına usta sayısı

### `GET /api/mechanic/specialization/{specialization}`
**Amaç:** Belirli bir uzmanlık alanındaki ustaları listeler
**Path Parameters:** `specialization` (gerekli)
**Query Parameters:**
- `page` (opsiyonel): Sayfa numarası
- `limit` (opsiyonel): Sayfa başına usta sayısı

### `GET /api/mechanic/details/{mechanicId}`
**Amaç:** Ustanın detaylı bilgilerini getirir
**Path Parameters:** `mechanicId` (gerekli)

### `GET /api/mechanic/nearby`
**Amaç:** Verilen konuma en yakın ustaları mesafeye göre sıralı döndürür
**Query Parameters:**
- `lat` (gerekli): Enlem
- `lng` (gerekli): Boylam
- `limit` (opsiyonel): Döndürülecek usta sayısı

### `GET /api/mechanic/dashboard/stats`
**Amaç:** Usta dashboard istatistiklerini getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/mechanic/dashboard/today-schedule`
**Amaç:** Bugünkü programı getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/mechanic/dashboard/recent-activity`
**Amaç:** Son aktiviteleri getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/mechanic/ratings/stats`
**Amaç:** Rating istatistiklerini getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/mechanic/ratings/recent`
**Amaç:** Son rating'leri getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/mechanic/serviced-vehicles`
**Amaç:** Servis verilen araçları getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/mechanic/{mechanicId}/wash-packages`
**Amaç:** Ustanın yıkama paketlerini getirir
**Path Parameters:** `mechanicId` (gerekli)

---

## 📅 Randevu Yönetimi (Appointments)

### `POST /api/appointments`
**Amaç:** Yeni randevu oluşturur
**Kimlik Doğrulama:** Bearer token gerekli
**Request Body:**
```json
{
  "serviceType": "repair",
  "vehicleId": "vehicle_id_here",
  "mechanicId": "mechanic_id_here",
  "appointmentDate": "2024-01-15T10:00:00Z",
  "timeSlot": "10:00-11:00",
  "description": "Motor arızası",
  "price": 500
}
```

### `GET /api/appointments/driver`
**Amaç:** Şöförün randevularını getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/appointments/mechanic`
**Amaç:** Ustanın randevularını getirir
**Kimlik Doğrulama:** Bearer token gerekli
**Query Parameters:**
- `status` (opsiyonel): Durum filtresi

### `GET /api/appointments/shop`
**Amaç:** Dükkan randevularını getirir (ustanın kendi eklediği)
**Kimlik Doğrulama:** Bearer token gerekli
**Query Parameters:**
- `status` (opsiyonel): Durum filtresi

### `GET /api/appointments/stats`
**Amaç:** Randevu istatistiklerini getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/appointments/{id}`
**Amaç:** Belirli bir randevuyu getirir
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)

### `PUT /api/appointments/{id}/approve`
**Amaç:** Randevuyu onaylar
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)

### `PUT /api/appointments/{id}/reject`
**Amaç:** Randevuyu reddeder
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)
**Request Body:**
```json
{
  "rejectionReason": "Müsait değilim"
}
```

### `PUT /api/appointments/{id}/start`
**Amaç:** Randevuyu başlatır (servise alır)
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)

### `PUT /api/appointments/{id}/complete`
**Amaç:** Randevuyu tamamlar
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)
**Request Body:**
```json
{
  "completionNotes": "İş tamamlandı",
  "price": 500,
  "estimatedDuration": "2 saat"
}
```

### `PUT /api/appointments/{id}/payment/link`
**Amaç:** Ödeme linki üretir
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)

### `PUT /api/appointments/{id}/payment/confirm`
**Amaç:** Ödemeyi onaylar
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)

### `PUT /api/appointments/{id}/waiting-parts`
**Amaç:** Parça bekleniyor durumunu günceller
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)
**Request Body:**
```json
{
  "value": true
}
```

### `POST /api/appointments/{id}/items`
**Amaç:** İş kalemi ekler
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)
**Request Body:**
```json
{
  "ad": "Motor yağı",
  "adet": 1,
  "birim": "litre",
  "tutar": 150,
  "tur": "malzeme"
}
```

### `POST /api/appointments/{id}/extra-approval`
**Amaç:** Ara onay ister
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)
**Request Body:**
```json
{
  "aciklama": "Ek parça gerekli",
  "tutar": 200
}
```

### `PUT /api/appointments/{id}/no-show`
**Amaç:** No-show işaretler
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)

### `PUT /api/appointments/{id}/cancel`
**Amaç:** Randevuyu iptal eder
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)

### `PUT /api/appointments/{id}/status`
**Amaç:** Randevu durumunu günceller
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)
**Request Body:**
```json
{
  "status": "confirmed",
  "rejectionReason": "Sebep",
  "mechanicNotes": "Notlar"
}
```

### `PUT /api/appointments/{id}/price`
**Amaç:** Randevu fiyatını günceller
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)
**Request Body:**
```json
{
  "price": 600
}
```

### `PUT /api/appointments/{id}/payment-status`
**Amaç:** Ödeme durumunu günceller
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)

### `POST /api/appointments/{id}/transfer-payment`
**Amaç:** Para transferi yapar
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)
**Request Body:**
```json
{
  "amount": 500,
  "mechanicId": "mechanic_id_here"
}
```

### `PUT /api/appointments/{id}/servise-al`
**Amaç:** Randevuyu servise alır
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)

### `PUT /api/appointments/{id}/price-increase`
**Amaç:** Fiyat artırır
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)
**Request Body:**
```json
{
  "additionalAmount": 100,
  "reason": "Ek parça",
  "customReason": "Özel sebep",
  "kalemler": [],
  "kdvDahil": true
}
```

### `PUT /api/appointments/{id}/odeme-bekliyor`
**Amaç:** Ödeme bekliyor durumuna geçirir
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)
**Request Body:**
```json
{
  "kalemler": [
    {
      "ad": "Motor yağı",
      "adet": 1,
      "tutar": 150
    }
  ],
  "kdvDahil": true
}
```

### `PUT /api/appointments/{id}/odeme-tamamlandi`
**Amaç:** Ödeme tamamlandı durumuna geçirir
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)

### `PUT /api/appointments/{id}/parca-bekleniyor`
**Amaç:** Parça bekleniyor durumunu günceller
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)
**Request Body:**
```json
{
  "parcaBekleniyor": true
}
```

### `GET /api/appointments/today-schedule`
**Amaç:** Bugünkü programı getirir
**Kimlik Doğrulama:** Bearer token gerekli

---

## 🚗 Araç Yönetimi (Vehicles)

### `POST /api/vehicles`
**Amaç:** Yeni araç ekler
**Kimlik Doğrulama:** Bearer token gerekli
**Request Body:**
```json
{
  "brand": "BMW",
  "model": "X5",
  "year": 2020,
  "plateNumber": "34ABC123",
  "color": "Siyah",
  "engineSize": "2.0L",
  "fuelType": "benzin"
}
```

### `GET /api/vehicles`
**Amaç:** Kullanıcının araçlarını getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/vehicles/driver`
**Amaç:** Şöförün araçlarını getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/vehicles/drivers/vehicles`
**Amaç:** Şöförün araçlarını getirir (frontend uyumluluğu için)
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/vehicles/search`
**Amaç:** Araç markası, modeli veya plaka numarasına göre arama
**Kimlik Doğrulama:** Bearer token gerekli
**Query Parameters:**
- `q` (opsiyonel): Arama terimi
- `brand` (opsiyonel): Araç markası
- `model` (opsiyonel): Araç modeli
- `plateNumber` (opsiyonel): Plaka numarası

### `GET /api/vehicles/all`
**Amaç:** Tüm araçları getirir (Admin)
**Kimlik Doğrulama:** Bearer token gerekli
**Query Parameters:**
- `page` (opsiyonel): Sayfa numarası
- `limit` (opsiyonel): Sayfa başına araç sayısı
- `brand` (opsiyonel): Araç markasına göre filtrele
- `year` (opsiyonel): Üretim yılına göre filtrele

### `GET /api/vehicles/serviced`
**Amaç:** Servis edilmiş araçları getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/vehicles/{id}`
**Amaç:** Belirli bir aracı getirir
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)

### `PUT /api/vehicles/{id}`
**Amaç:** Aracı günceller
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)
**Request Body:** Araç bilgileri (opsiyonel alanlar)

### `DELETE /api/vehicles/{id}`
**Amaç:** Aracı siler
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)

### `PUT /api/vehicles/{id}/favorite`
**Amaç:** Aracı favorile/favoriden çıkarır
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)

---

## 🛠️ Hizmet Talepleri (Service Requests)

### `POST /api/service-requests/towing`
**Amaç:** Çekici talebi oluşturur
**Kimlik Doğrulama:** Bearer token gerekli
**Request Body:**
```json
{
  "vehicleType": "binek",
  "reason": "Motor arızası",
  "pickupLocation": "Kadıköy, İstanbul",
  "dropoffLocation": "Beşiktaş, İstanbul",
  "estimatedPrice": 200,
  "description": "Araç çalışmıyor",
  "emergencyLevel": "medium",
  "towingType": "flatbed"
}
```

### `POST /api/service-requests/wash`
**Amaç:** Yıkama randevusu oluşturur
**Kimlik Doğrulama:** Bearer token gerekli
**Request Body:**
```json
{
  "packageType": "premium",
  "options": ["iç temizlik", "cila"],
  "appointmentDate": "2024-01-15T10:00:00Z",
  "timeSlot": "10:00-11:00",
  "totalPrice": 150,
  "description": "Detaylı yıkama",
  "vehicleType": "binek"
}
```

### `POST /api/service-requests/tire-parts`
**Amaç:** Lastik & Parça talebi oluşturur
**Kimlik Doğrulama:** Bearer token gerekli
**Request Body:**
```json
{
  "partType": "lastik",
  "vehicleInfo": {
    "brand": "BMW",
    "model": "X5"
  },
  "tireSize": "225/55R17",
  "tireBrand": "Michelin",
  "quantity": 4,
  "estimatedPrice": 2000,
  "description": "Kış lastiği"
}
```

### `GET /api/service-requests/mechanic-requests`
**Amaç:** Usta yeteneklerine göre talepleri getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/service-requests/mechanics-by-service/{serviceType}`
**Amaç:** Belirli hizmet türüne göre ustaları getirir
**Path Parameters:** `serviceType` (gerekli) - "towing", "repair", "wash", "tire"

### `GET /api/service-requests/towing/{requestId}`
**Amaç:** Çekici talebi detayını getirir
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `requestId` (gerekli)

---

## 💰 Cüzdan ve Ödeme (Wallet & Payment)

### `GET /api/wallet/balance`
**Amaç:** Cüzdan bakiyesini getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/wallet/transactions`
**Amaç:** Cüzdan işlemlerini getirir
**Kimlik Doğrulama:** Bearer token gerekli
**Query Parameters:**
- `limit` (opsiyonel): İşlem sayısı limiti

### `POST /api/wallet/add-money`
**Amaç:** Cüzdana para ekler
**Kimlik Doğrulama:** Bearer token gerekli
**Request Body:**
```json
{
  "amount": 1000,
  "paymentMethod": "credit_card"
}
```

### `POST /api/payment/simulate-payment`
**Amaç:** Ödeme simülasyonu yapar
**Kimlik Doğrulama:** Bearer token gerekli
**Request Body:**
```json
{
  "amount": 500,
  "serviceType": "repair",
  "description": "Motor tamiri",
  "appointmentId": "appointment_id_here"
}
```

### `GET /api/payment/history`
**Amaç:** Ödeme geçmişini getirir
**Kimlik Doğrulama:** Bearer token gerekli

---

## 🔔 Bildirimler (Notifications)

### `GET /api/notifications`
**Amaç:** Kullanıcı bildirimlerini getirir
**Kimlik Doğrulama:** Bearer token gerekli
**Query Parameters:**
- `page` (opsiyonel): Sayfa numarası
- `limit` (opsiyonel): Sayfa başına bildirim sayısı
- `unreadOnly` (opsiyonel): Sadece okunmamış bildirimler

### `POST /api/notifications/send`
**Amaç:** Bildirim gönderir
**Kimlik Doğrulama:** Bearer token gerekli
**Request Body:**
```json
{
  "userId": "user_id_here",
  "title": "Randevu Onayı",
  "message": "Randevunuz onaylandı",
  "type": "appointment"
}
```

### `PUT /api/notifications/{id}/read`
**Amaç:** Bildirimi okundu olarak işaretler
**Kimlik Doğrulama:** Bearer token gerekli
**Path Parameters:** `id` (gerekli)

---

## 📊 Diğer Endpoint'ler

### `GET /api/analytics/dashboard`
**Amaç:** Dashboard analitik verilerini getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/activity/recent`
**Amaç:** Son aktiviteleri getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/tefe-point/balance`
**Amaç:** TEFE puan bakiyesini getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `GET /api/tefe-point/history`
**Amaç:** TEFE puan geçmişini getirir
**Kimlik Doğrulama:** Bearer token gerekli

### `POST /api/upload/image`
**Amaç:** Resim yükler
**Kimlik Doğrulama:** Bearer token gerekli
**Content-Type:** `multipart/form-data`

---

## 🔒 Kimlik Doğrulama

Çoğu endpoint için Bearer token kimlik doğrulaması gereklidir:

```bash
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

## 📝 Response Formatı

Tüm endpoint'ler aşağıdaki formatı kullanır:

```json
{
  "success": true,
  "message": "İşlem başarılı",
  "data": {
    // Response data
  }
}
```

## ⚠️ Hata Kodları

- **400**: Geçersiz veri
- **401**: Yetkilendirme hatası
- **403**: Yetkisiz erişim
- **404**: Kaynak bulunamadı
- **500**: Sunucu hatası

## 🚀 Kullanım Örnekleri

### Randevu Oluşturma
```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceType": "repair",
    "vehicleId": "vehicle_id",
    "mechanicId": "mechanic_id",
    "appointmentDate": "2024-01-15T10:00:00Z",
    "description": "Motor arızası"
  }'
```

### Usta Arama
```bash
curl -X GET "http://localhost:3000/api/mechanic/search?q=BMW&city=İstanbul" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Bu dokümantasyon, Rektefe API'sinin tüm endpoint'lerini kapsamlı şekilde açıklar. Her endpoint için gerekli parametreler, request/response formatları ve kullanım örnekleri belirtilmiştir.
