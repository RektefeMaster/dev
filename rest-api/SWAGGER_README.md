# 🚀 **REKTEFE API DOKÜMANTASYONU - SWAGGER/OPENAPI**

## 📋 **GENEL BİLGİLER**

- **API URL**: `http://localhost:3000/docs`
- **Base URL**: `http://localhost:3000/api`
- **Authentication**: Bearer Token (JWT)
- **Response Format**: Standart JSON format

## 🔐 **AUTHENTICATION**

Tüm korumalı endpoint'ler için `Authorization: Bearer <token>` header'ı gerekli.

## 📊 **ENDPOINT KATEGORİLERİ**

### **1. 🔑 AUTH (4 Endpoint)**
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi
- `POST /api/auth/refresh-token` - Token yenileme
- `POST /api/auth/logout` - Çıkış yapma

### **2. 🚗 VEHICLES (7 Endpoint)**
- `POST /api/vehicles` - Yeni araç ekle
- `GET /api/vehicles` - Kullanıcının araçlarını getir
- `GET /api/vehicles/search` - Araç ara
- `GET /api/vehicles/all` - Tüm araçları getir (Admin)
- `GET /api/vehicles/:id` - Belirli bir aracı getir
- `PUT /api/vehicles/:id` - Aracı güncelle
- `DELETE /api/vehicles/:id` - Aracı sil

### **3. 👨‍🔧 MECHANIC (10 Endpoint)**
- `GET /api/mechanic/me` - Mekanik profilini getir
- `PUT /api/mechanic/me` - Mekanik profilini güncelle
- `PUT /api/mechanic/availability` - Müsaitlik durumunu güncelle
- `PUT /api/mechanic/rating` - Puan güncelle
- `GET /api/mechanic/stats` - Mekanik istatistikleri
- `GET /api/mechanic/all` - Tüm mekanikleri getir
- `GET /api/mechanic/search` - Mekanik ara
- `GET /api/mechanic/city/:city` - Şehir bazında mekanikleri getir
- `GET /api/mechanic/specialization/:specialization` - Uzmanlık alanına göre mekanikleri getir

### **4. 📅 MAINTENANCE APPOINTMENTS (12 Endpoint)**
- `POST /api/maintenance-appointments` - Yeni bakım randevusu oluştur
- `GET /api/maintenance-appointments` - Kullanıcının randevularını getir
- `GET /api/maintenance-appointments/mechanic` - Mekaniğin randevularını getir
- `GET /api/maintenance-appointments/search` - Randevu ara
- `GET /api/maintenance-appointments/date-range` - Tarih aralığında randevuları getir
- `GET /api/maintenance-appointments/stats` - Randevu istatistikleri
- `GET /api/maintenance-appointments/all` - Tüm randevuları getir (Admin)
- `GET /api/maintenance-appointments/:id` - Belirli bir randevuyu getir
- `PUT /api/maintenance-appointments/:id/status` - Randevu durumunu güncelle (kullanıcı)
- `PUT /api/maintenance-appointments/:id/mechanic-status` - Randevu durumunu güncelle (mekanik)
- `POST /api/maintenance-appointments/:id/cancel` - Randevuyu iptal et

### **5. 👤 USERS (6 Endpoint)**
- `GET /api/users/profile` - Kullanıcı profilini getir
- `PUT /api/users/profile` - Kullanıcı profilini güncelle
- `POST /api/users/profile-photo` - Profil fotoğrafını güncelle
- `POST /api/users/cover-photo` - Kapak fotoğrafını güncelle
- `GET /api/users/notifications` - Kullanıcı bildirimlerini getir
- `GET /api/users/{userId}` - Kullanıcı bilgilerini ID ile getir

### **6. 🛠️ DİĞER ENDPOINT'LER**
- `GET /api/maintenance` - Bakım bilgileri
- `GET /api/insurance` - Sigorta bilgileri
- `GET /api/vehicle-status` - Araç durumu
- `GET /api/tire-status` - Lastik durumu
- `GET /api/service-categories` - Hizmet kategorileri
- `GET /api/mechanic-services` - Mekanik hizmetleri
- `POST /api/upload` - Dosya yükleme

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
- ✅ Auth: Register, Login
- ✅ Vehicles: Create, List
- ✅ Mechanic: Profile Get, Profile Update
- ✅ Maintenance Appointments: Create, List, Update Status
- ✅ Users: Profile Get

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

### **2. Araç Ekleme:**
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

### **3. Randevu Oluşturma:**
```bash
curl -X POST http://localhost:3000/api/maintenance-appointments \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "VEHICLE_ID",
    "serviceType": "Genel Bakım",
    "appointmentDate": "2025-01-20T10:00:00Z",
    "description": "Motor yağı değişimi"
  }'
```

## 📈 **TOPLAM ENDPOINT SAYISI: 39**

## 🎯 **SONRAKI ADIMLAR**

1. **Final Testing**: Tüm endpoint'leri test et
2. **Performance Optimization**: Response time optimizasyonu
3. **Rate Limiting**: API rate limiting ekle
4. **Monitoring**: API monitoring ve logging
5. **Documentation**: Detaylı API kullanım kılavuzu

---

**🔄 Son Güncelleme**: 15 Ağustos 2025 - Refactoring %95 tamamlandı
**👨‍💻 Geliştirici**: Rektefe Backend Team
**📧 İletişim**: API desteği için geliştirici ekibi ile iletişime geçin
