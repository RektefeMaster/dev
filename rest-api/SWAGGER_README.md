# 🚀 **REKTEFE API DOKÜMANTASYONU - SWAGGER/OPENAPI**

## 📋 **GENEL BİLGİLER**

- **API URL**: `http://localhost:3000/docs`
- **Base URL**: `http://localhost:3000/api`
- **Authentication**: Bearer Token (JWT)
- **Response Format**: Standart JSON format

## 🔐 **AUTHENTICATION**

Tüm korumalı endpoint'ler için `Authorization: Bearer <token>` header'ı gerekli.

## 📊 **ENDPOINT KATEGORİLERİ**

> **🎯 ORTAK ENDPOINT YAKLAŞIMI:** Tüm endpoint'ler `rektefe-dv` (şöför) ve `rektefe-us` (usta) uygulamaları tarafından ortak kullanılır. Bu sayede tutarlılık sağlanır ve bakım kolaylaşır.

### **1. 🔑 AUTH (7 Endpoint)**
- `POST /api/auth/register` - Kullanıcı kaydı ✅ **MEVCUT**
- `POST /api/auth/login` - Kullanıcı girişi ✅ **MEVCUT**
- `POST /api/auth/refresh-token` - Token yenileme ✅ **MEVCUT**
- `POST /api/auth/logout` - Çıkış yapma ✅ **MEVCUT**
- `POST /api/auth/google-login` - Google ile giriş ✅ **YENİ EKLENDİ**
- `GET /api/auth/forgot-password` - Şifre unutma ✅ **YENİ EKLENDİ**
- `POST /api/auth/reset-password` - Şifre sıfırlama ✅ **YENİ EKLENDİ**
- `POST /api/auth/change-password` - Şifre değiştirme ✅ **YENİ EKLENDİ**

### **2. 🚗 VEHICLES (7 Endpoint)**
- `POST /api/vehicles` - Yeni araç ekle ✅ **MEVCUT**
- `GET /api/vehicles` - Kullanıcının araçlarını getir ✅ **MEVCUT**
- `GET /api/vehicles/search` - Araç ara ✅ **YENİ EKLENDİ**
- `GET /api/vehicles/all` - Tüm araçları getir (Admin) ✅ **YENİ EKLENDİ**
- `GET /api/vehicles/:id` - Belirli bir aracı getir ✅ **MEVCUT**
- `PUT /api/vehicles/:id` - Aracı güncelle ✅ **MEVCUT**
- `DELETE /api/vehicles/:id` - Aracı sil ✅ **MEVCUT**

### **3. 👨‍🔧 MECHANIC (12 Endpoint)**
- `GET /api/mechanic/me` - Mekanik profilini getir ✅ **MEVCUT**
- `PUT /api/mechanic/me` - Mekanik profilini güncelle ✅ **MEVCUT**
- `PUT /api/mechanic/availability` - Müsaitlik durumunu güncelle ✅ **YENİ EKLENDİ**
- `PUT /api/mechanic/rating` - Puan güncelle ✅ **YENİ EKLENDİ**
- `GET /api/mechanic/stats` - Mekanik istatistikleri ✅ **YENİ EKLENDİ**
- `GET /api/mechanic/all` - Tüm mekanikleri getir ✅ **YENİ EKLENDİ**
- `GET /api/mechanic/search` - Mekanik ara ✅ **YENİ EKLENDİ**
- `GET /api/mechanic/city/:city` - Şehir bazında mekanikleri getir ✅ **YENİ EKLENDİ**
- `GET /api/mechanic/specialization/:specialization` - Uzmanlık alanına göre mekanikleri getir ✅ **YENİ EKLENDİ**
- `GET /api/mechanic/list` - Mekanik listesi ✅ **YENİ EKLENDİ**
- `GET /api/mechanic/details/:id` - Mekanik detayları ✅ **YENİ EKLENDİ**

### **4. 📅 APPOINTMENTS - ORTAK RANDEVU SİSTEMİ (15+ Endpoint)**
**🔄 Ortak Endpoint Yapısı:** Hem `rektefe-dv` (şöför) hem de `rektefe-us` (usta) uygulamaları aynı endpoint'leri kullanır.

#### **📱 Driver (Şöför) Endpoint'leri:**
- `POST /api/appointments` - Yeni randevu talebi oluştur ✅ **MEVCUT**
- `GET /api/appointments/driver` - Şöförün randevularını getir ✅ **MEVCUT**
- `GET /api/appointments/:id` - Belirli bir randevuyu getir ✅ **MEVCUT**
- `PUT /api/appointments/:id/cancel` - Randevuyu iptal et ✅ **MEVCUT**
- `DELETE /api/appointments/:id` - Randevuyu sil ✅ **MEVCUT**
- `PUT /api/appointments/:id/notification-settings` - Bildirim ayarları ✅ **MEVCUT**
- `PUT /api/appointments/:id/payment-status` - Ödeme durumu güncelle ✅ **MEVCUT**

#### **🔧 Mechanic (Usta) Endpoint'leri:**
- `GET /api/appointments/mechanic` - Ustanın randevularını getir ✅ **MEVCUT**
- `PUT /api/appointments/:id/status` - Randevu durumunu güncelle (onay/red) ✅ **MEVCUT**
- `GET /api/appointments/:id/contact` - İletişim bilgilerini paylaş ✅ **MEVCUT**

#### **🔍 Ortak Arama ve Filtreleme:**
- `GET /api/appointments/search` - Randevu ara ✅ **MEVCUT**
- `GET /api/appointments/date-range` - Tarih aralığında randevuları getir ✅ **MEVCUT**
- `GET /api/appointments/today` - Bugünkü randevuları getir ✅ **MEVCUT**
- `GET /api/appointments/stats` - Randevu istatistikleri ✅ **MEVCUT**
- `GET /api/appointments/mechanic-availability` - Usta müsaitlik durumu ✅ **MEVCUT**

### **5. 👤 USERS (10 Endpoint)**
- `GET /api/users/profile` - Kullanıcı profilini getir ✅ **MEVCUT**
- `PUT /api/users/profile` - Kullanıcı profilini güncelle ✅ **MEVCUT**
- `POST /api/users/profile-photo` - Profil fotoğrafını güncelle ✅ **YENİ EKLENDİ**
- `POST /api/users/cover-photo` - Kapak fotoğrafını güncelle ✅ **YENİ EKLENDİ**
- `GET /api/users/notifications` - Kullanıcı bildirimlerini getir ✅ **YENİ EKLENDİ**
- `GET /api/users/{userId}` - Kullanıcı bilgilerini ID ile getir ✅ **MEVCUT**
- `POST /api/users/become-customer/:mechanicId` - Ustanın müşterisi ol ✅ **YENİ EKLENDİ**
- `DELETE /api/users/remove-customer/:mechanicId` - Usta müşteriliğini bırak ✅ **YENİ EKLENDİ**
- `GET /api/users/my-mechanics` - Müşterisi olunan ustaları getir (Şöförler için) ✅ **YENİ EKLENDİ**
- `GET /api/users/my-customers` - Ustanın müşterilerini getir (Ustalar için) ✅ **YENİ EKLENDİ**

### **6. 🛠️ DİĞER ENDPOINT'LER**
- `GET /api/maintenance` - Bakım bilgileri ✅ **MEVCUT**
- `GET /api/insurance` - Sigorta bilgileri ✅ **MEVCUT**
- `GET /api/vehicle-status` - Araç durumu ✅ **MEVCUT**
- `GET /api/tire-status` - Lastik durumu ✅ **MEVCUT**
- `GET /api/service-categories` - Hizmet kategorileri ✅ **MEVCUT**
- `GET /api/mechanic-services` - Mekanik hizmetleri ✅ **MEVCUT**
- `POST /api/upload` - Dosya yükleme ✅ **MEVCUT**

### **7. 💰 WALLET & FINANCIAL (3 Endpoint)**
- `GET /api/wallet/balance` - Cüzdan bakiyesi ✅ **MEVCUT**
- `GET /api/wallet/transactions` - İşlem geçmişi ✅ **MEVCUT**
- `POST /api/wallet/withdraw` - Para çekme ✅ **MEVCUT**

### **8. 💬 MESSAGES (7 Endpoint)**
- `GET /api/message/conversations` - Konuşma listesi ✅ **MEVCUT**
- `GET /api/message/conversation/:id/messages` - Konuşma mesajları ✅ **MEVCUT**
- `POST /api/message/send` - Mesaj gönder ✅ **MEVCUT**
- `DELETE /api/message/:id` - Mesaj sil ✅ **MEVCUT**
- `GET /api/messages/conversation/find/:mechanicId` - Mekanik ile konuşma bul ✅ **YENİ EKLENDİ**
- `POST /api/messages/send` - Mesaj gönder (alternatif) ✅ **YENİ EKLENDİ**
- `DELETE /api/conversations/:id` - Konuşma sil ✅ **YENİ EKLENDİ**

### **9. 📊 ACTIVITY & ANALYTICS (3 Endpoint)**
- `GET /api/activity/recent` - Son aktiviteler ✅ **MEVCUT**
- `GET /api/mechanic-earnings/stats` - Kazanç istatistikleri ✅ **MEVCUT**
- `GET /api/mechanic-earnings/monthly` - Aylık kazançlar ✅ **MEVCUT**

### **10. 📢 ADS & MARKETING (1 Endpoint)**
- `GET /api/ads` - Reklamları getir ✅ **YENİ EKLENDİ**

## 🏗️ **MİMARİ YAPISI**

### **✅ Tamamlanan Refactoring:**
- **Controllers**: Tüm ana modüller için controller'lar oluşturuldu
- **Services**: Business logic service katmanına taşındı
- **Validators**: Joi validation schema'ları ayrıldı
- **Middleware**: Error handling, validation, role-based auth
- **Utils**: Standart response format

### **📁 Yeni Klasör Yapısı:**
```
src/
├── controllers/          ✅ Tamamlandı
│   ├── auth.controller.ts
│   ├── vehicle.controller.ts
│   ├── mechanic.controller.ts
│   └── maintenanceAppointment.controller.ts
├── services/            ✅ Tamamlandı
│   ├── auth.service.ts
│   ├── vehicle.service.ts
│   ├── mechanic.service.ts
│   └── maintenanceAppointment.service.ts
├── validators/          ✅ Tamamlandı
│   ├── auth.validation.ts
│   ├── vehicle.validation.ts
│   └── maintenance.validation.ts
├── middleware/          ✅ Tamamlandı
│   ├── validate.ts
│   ├── errorHandler.ts
│   └── roleAuth.ts
└── utils/               ✅ Tamamlandı
    └── response.ts
```

## 🧪 **TEST DURUMU**

### **✅ Test Edilen Endpoint'ler:**
- ✅ Auth: Register, Login, Refresh Token, Logout, Google Login, Forgot Password, Reset Password, Change Password
- ✅ Vehicles: Create, List, Search, All, Get by ID, Update, Delete
- ✅ Mechanic: Profile Get, Profile Update, Availability, Rating, Stats, All, Search, City, Specialization, List, Details
- ✅ Maintenance Appointments: Create, List, Update Status
- ✅ Users: Profile Get, Profile Update, Profile Photo, Cover Photo, Notifications, Get by ID
- ✅ Messages: Conversations, Messages, Send, Delete, Find Conversation
- ✅ Ads: Get Ads

### **🔧 Test Sonuçları:**
- **Build**: ✅ Başarılı
- **Server**: ✅ Port 3000'de çalışıyor
- **Database**: ✅ MongoDB bağlantısı aktif
- **Validation**: ✅ Joi schema'ları çalışıyor
- **Response Format**: ✅ Standart format aktif

## 🚀 **KULLANIM ÖRNEKLERİ**

### **1. Kullanıcı Kaydı:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "surname": "User",
    "email": "test@example.com",
    "password": "123456",
    "userType": "driver"
  }'
```

### **2. Google ile Giriş:**
```bash
curl -X POST http://localhost:3000/api/auth/google-login \
  -H "Content-Type: application/json" \
  -d '{
    "googleToken": "google_token_here"
  }'
```

### **3. Araç Ekleme:**
```bash
curl -X POST http://localhost:3000/api/vehicles \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "BMW",
    "modelName": "X5",
    "year": 2020,
    "plateNumber": "34ABC123",
    "fuelType": "Benzin",
    "engineType": "2.0L",
    "transmission": "Otomatik",
    "package": "Sport"
  }'
```

### **4. Randevu Oluşturma:**
```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "VEHICLE_ID",
    "serviceType": "Genel Bakım",
    "appointmentDate": "2025-01-20T10:00:00Z",
    "description": "Motor yağı değişimi"
  }'
```

### **5. Mekanik Arama:**
```bash
curl -X GET "http://localhost:3000/api/mechanic/search?q=motor&city=istanbul" \
  -H "Authorization: Bearer <TOKEN>"
```

### **6. Araç Arama:**
```bash
curl -X GET "http://localhost:3000/api/vehicles/search?brand=BMW&model=X5" \
  -H "Authorization: Bearer <TOKEN>"
```

### **7. Reklamları Getir:**
```bash
curl -X GET "http://localhost:3000/api/ads"
```

### **8. Şifre Sıfırlama:**
```bash
curl -X GET "http://localhost:3000/api/auth/forgot-password?email=user@example.com"
```

## 📈 **TOPLAM ENDPOINT SAYISI: 60+**

## 🎯 **SONRAKI ADIMLAR**

1. **Final Testing**: Tüm endpoint'leri test et ✅ **TAMAMLANDI**
2. **Performance Optimization**: Response time optimizasyonu
3. **Rate Limiting**: API rate limiting ekle
4. **Monitoring**: API monitoring ve logging
5. **Documentation**: Detaylı API kullanım kılavuzu ✅ **GÜNCELLENDİ**

---

**🔄 Son Güncelleme**: 27 Ağustos 2025 - Tüm eksik endpoint'ler eklendi ✅
**👨‍💻 Geliştirici**: Rektefe Backend Team
**📧 İletişim**: API desteği için geliştirici ekibi ile iletişime geçin

## 🆕 **YENİ EKLENEN ENDPOINT'LER**

### **✅ Auth:**
- `POST /api/auth/google-login` - Google ile giriş
- `GET /api/auth/forgot-password` - Şifre unutma
- `POST /api/auth/reset-password` - Şifre sıfırlama
- `POST /api/auth/change-password` - Şifre değiştirme

### **✅ Vehicles:**
- `GET /api/vehicles/search` - Araç arama
- `GET /api/vehicles/all` - Tüm araçlar (Admin)

### **✅ Mechanic:**
- `PUT /api/mechanic/availability` - Müsaitlik durumu
- `PUT /api/mechanic/rating` - Puan güncelleme
- `GET /api/mechanic/stats` - İstatistikler
- `GET /api/mechanic/all` - Tüm mekanikler
- `GET /api/mechanic/search` - Mekanik arama
- `GET /api/mechanic/city/:city` - Şehir bazında
- `GET /api/mechanic/specialization/:specialization` - Uzmanlık bazında
- `GET /api/mechanic/list` - Mekanik listesi
- `GET /api/mechanic/details/:id` - Mekanik detayları

### **✅ Users:**
- `POST /api/users/profile-photo` - Profil fotoğrafı
- `POST /api/users/cover-photo` - Kapak fotoğrafı
- `GET /api/users/notifications` - Bildirimler
- `GET /api/users/{userId}` - ID ile kullanıcı bilgisi

### **✅ Messages:**
- `GET /api/messages/conversation/find/:mechanicId` - Mekanik ile konuşma bul
- `POST /api/messages/send` - Mesaj gönder (alternatif)
- `DELETE /api/conversations/:id` - Konuşma sil

### **✅ Ads:**
- `GET /api/ads` - Reklamları getir

## 🔍 **FRONTEND ENDPOINT KULLANIM ANALİZİ**

### **📱 REKTEFE-US (USTA APP):**
✅ **Tutarlı ve entegre:** `apiService` kullanılıyor
✅ **Tüm endpoint'ler mevcut:** Backend'de karşılığı var

### **🚗 REKTEFE-DV (ŞOFÖR APP):**
❌ **Tutarsız:** Hem `apiService` hem `fetch` hem `axios` kullanılıyor
✅ **Tüm endpoint'ler mevcut:** Backend'de karşılığı var

## 🚨 **ÖNERİLER:**

### **1. REKTEFE-DV'DE TUTARLILIK SAĞLA:**
- Tüm API call'ları `apiService` üzerinden yap
- `fetch` ve `axios` kullanımını kaldır
- Standart error handling ekle

### **2. BACKEND-FRONTEND SENKRONİZASYONU:**
✅ **Tamamlandı:** Tüm frontend endpoint'leri backend'de mevcut

**🎉 Artık SWAGGER_README.md dosyasındaki tüm endpoint'ler backend'de mevcut ve kullanılabilir!**
