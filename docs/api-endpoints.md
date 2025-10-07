# API Endpoints - Kapsamlı Dokümantasyon

## 📋 Genel Bakış

Bu dokümantasyon, Rektefe platformunun tüm API endpoint'lerini kapsamlı bir şekilde açıklamaktadır. Platform, Lastik Oteli, Kaporta/Boya ve Oto Yıkama modüllerini içeren çok modüllü bir otomotiv servis platformudur.

## 🏗️ API Mimarisi

### Base URL
```
Production: https://api.rektefe.com
Development: http://localhost:3000
Staging: https://staging-api.rektefe.com
```

### Authentication
Tüm API endpoint'leri JWT token tabanlı kimlik doğrulama kullanır.

**Header:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Response Format
Tüm API yanıtları standart format kullanır:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}
```

## 🔐 Authentication Endpoints

### POST `/api/auth/login`
**Açıklama:** Kullanıcı girişi yapar.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "string",
      "email": "string",
      "name": "string",
      "surname": "string",
      "userType": "mechanic|driver|admin",
      "serviceCategories": ["string"]
    },
    "token": "string",
    "refreshToken": "string"
  },
  "message": "Giriş başarılı"
}
```

### POST `/api/auth/register`
**Açıklama:** Yeni kullanıcı kaydı oluşturur.

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "name": "string",
  "surname": "string",
  "phone": "string",
  "userType": "mechanic|driver",
  "serviceCategories": ["string"]
}
```

### POST `/api/auth/refresh`
**Açıklama:** Token yeniler.

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

### POST `/api/auth/logout`
**Açıklama:** Kullanıcı çıkışı yapar.

## 🚗 Vehicle Endpoints

### GET `/api/vehicles`
**Açıklama:** Kullanıcının araçlarını listeler.

**Query Parameters:**
- `page` (number): Sayfa numarası
- `limit` (number): Sayfa başına kayıt sayısı

**Response:**
```json
{
  "success": true,
  "data": {
    "vehicles": [
      {
        "_id": "string",
        "brand": "string",
        "model": "string",
        "year": number,
        "plateNumber": "string",
        "color": "string",
        "engineType": "string",
        "fuelType": "string",
        "mileage": number,
        "vin": "string"
      }
    ],
    "pagination": {...}
  }
}
```

### POST `/api/vehicles`
**Açıklama:** Yeni araç ekler.

**Request Body:**
```json
{
  "brand": "string",
  "model": "string",
  "year": number,
  "plateNumber": "string",
  "color": "string",
  "engineType": "string",
  "fuelType": "string",
  "mileage": number,
  "vin": "string"
}
```

### GET `/api/vehicles/:vehicleId`
**Açıklama:** Belirli bir aracı getirir.

### PUT `/api/vehicles/:vehicleId`
**Açıklama:** Araç bilgilerini günceller.

### DELETE `/api/vehicles/:vehicleId`
**Açıklama:** Aracı siler.

## 📅 Appointment Endpoints

### GET `/api/appointments`
**Açıklama:** Randevuları listeler.

**Query Parameters:**
- `status` (string): Randevu durumu
- `date` (string): Tarih filtresi
- `page` (number): Sayfa numarası
- `limit` (number): Sayfa başına kayıt sayısı

**Response:**
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "_id": "string",
        "customerId": {...},
        "mechanicId": {...},
        "vehicleId": {...},
        "serviceType": "string",
        "description": "string",
        "scheduledAt": "2024-01-01T00:00:00.000Z",
        "status": "TALEP_EDILDI|PLANLANDI|SERVISTE|ODEME_BEKLIYOR|TAMAMLANDI",
        "estimatedDuration": number,
        "totalCost": number,
        "location": {
          "address": "string",
          "coordinates": {
            "latitude": number,
            "longitude": number
          }
        }
      }
    ],
    "pagination": {...}
  }
}
```

### POST `/api/appointments`
**Açıklama:** Yeni randevu oluşturur.

**Request Body:**
```json
{
  "mechanicId": "string",
  "vehicleId": "string",
  "serviceType": "string",
  "description": "string",
  "scheduledAt": "2024-01-01T00:00:00.000Z",
  "estimatedDuration": number,
  "location": {
    "address": "string",
    "coordinates": {
      "latitude": number,
      "longitude": number
    }
  }
}
```

### PUT `/api/appointments/:appointmentId/status`
**Açıklama:** Randevu durumunu günceller.

**Request Body:**
```json
{
  "status": "TALEP_EDILDI|PLANLANDI|SERVISTE|ODEME_BEKLIYOR|TAMAMLANDI",
  "notes": "string"
}
```

## 💰 Payment Endpoints

### GET `/api/payments`
**Açıklama:** Ödemeleri listeler.

**Query Parameters:**
- `status` (string): Ödeme durumu
- `date` (string): Tarih filtresi
- `page` (number): Sayfa numarası
- `limit` (number): Sayfa başına kayıt sayısı

### POST `/api/payments`
**Açıklama:** Yeni ödeme oluşturur.

**Request Body:**
```json
{
  "appointmentId": "string",
  "amount": number,
  "paymentMethod": "credit_card|cash|wallet|bank_transfer",
  "description": "string"
}
```

### POST `/api/payments/:paymentId/process`
**Açıklama:** Ödemeyi işler.

**Request Body:**
```json
{
  "paymentMethod": "credit_card|cash|wallet|bank_transfer",
  "cardInfo": {
    "cardNumber": "string",
    "expiryDate": "string",
    "cvv": "string",
    "cardHolderName": "string"
  }
}
```

## 💳 Wallet Endpoints

### GET `/api/wallet`
**Açıklama:** Cüzdan bilgilerini getirir.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "userId": "string",
    "balance": number,
    "currency": "TRY",
    "transactions": [
      {
        "_id": "string",
        "type": "deposit|withdrawal|payment|refund",
        "amount": number,
        "description": "string",
        "date": "2024-01-01T00:00:00.000Z",
        "status": "pending|completed|failed"
      }
    ]
  }
}
```

### POST `/api/wallet/deposit`
**Açıklama:** Cüzdana para yatırır.

**Request Body:**
```json
{
  "amount": number,
  "paymentMethod": "credit_card|bank_transfer"
}
```

### POST `/api/wallet/withdraw`
**Açıklama:** Cüzdandan para çeker.

**Request Body:**
```json
{
  "amount": number,
  "bankAccount": {
    "bankName": "string",
    "accountNumber": "string",
    "iban": "string"
  }
}
```

## 🏆 TEFE Point Endpoints

### GET `/api/tefe-points`
**Açıklama:** TEFE puanlarını getirir.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "userId": "string",
    "totalPoints": number,
    "availablePoints": number,
    "usedPoints": number,
    "expiredPoints": number,
    "transactions": [
      {
        "_id": "string",
        "type": "earned|used|expired",
        "points": number,
        "description": "string",
        "date": "2024-01-01T00:00:00.000Z",
        "expiryDate": "2024-12-31T00:00:00.000Z"
      }
    ]
  }
}
```

### POST `/api/tefe-points/earn`
**Açıklama:** TEFE puanı kazanır.

**Request Body:**
```json
{
  "points": number,
  "reason": "service_completion|referral|promotion",
  "description": "string"
}
```

### POST `/api/tefe-points/use`
**Açıklama:** TEFE puanı kullanır.

**Request Body:**
```json
{
  "points": number,
  "purpose": "discount|payment",
  "description": "string"
}
```

## 📱 Notification Endpoints

### GET `/api/notifications`
**Açıklama:** Bildirimleri listeler.

**Query Parameters:**
- `unread` (boolean): Okunmamış bildirimler
- `type` (string): Bildirim tipi
- `page` (number): Sayfa numarası
- `limit` (number): Sayfa başına kayıt sayısı

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "string",
        "userId": "string",
        "type": "appointment|payment|promotion|system",
        "title": "string",
        "message": "string",
        "data": {},
        "isRead": boolean,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

### PUT `/api/notifications/:notificationId/read`
**Açıklama:** Bildirimi okundu olarak işaretler.

### POST `/api/notifications/mark-all-read`
**Açıklama:** Tüm bildirimleri okundu olarak işaretler.

## 💬 Message Endpoints

### GET `/api/messages`
**Açıklama:** Mesajları listeler.

**Query Parameters:**
- `conversationId` (string): Konuşma kimliği
- `page` (number): Sayfa numarası
- `limit` (number): Sayfa başına kayıt sayısı

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "_id": "string",
        "conversationId": "string",
        "senderId": "string",
        "receiverId": "string",
        "content": "string",
        "type": "text|image|file",
        "attachments": ["string"],
        "isRead": boolean,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

### POST `/api/messages`
**Açıklama:** Yeni mesaj gönderir.

**Request Body:**
```json
{
  "conversationId": "string",
  "receiverId": "string",
  "content": "string",
  "type": "text|image|file",
  "attachments": ["string"]
}
```

### GET `/api/conversations`
**Açıklama:** Konuşmaları listeler.

## 📊 Analytics Endpoints

### GET `/api/analytics/dashboard`
**Açıklama:** Dashboard istatistiklerini getirir.

**Response:**
```json
{
  "success": true,
  "data": {
    "todayStats": {
      "appointments": number,
      "earnings": number,
      "customers": number,
      "rating": number
    },
    "weeklyStats": {
      "appointments": number,
      "earnings": number,
      "growth": number
    },
    "monthlyStats": {
      "appointments": number,
      "earnings": number,
      "growth": number
    },
    "topServices": [
      {
        "service": "string",
        "count": number,
        "revenue": number
      }
    ],
    "recentActivity": [
      {
        "type": "string",
        "description": "string",
        "date": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### GET `/api/analytics/revenue`
**Açıklama:** Gelir analizlerini getirir.

**Query Parameters:**
- `period` (string): Dönem (daily|weekly|monthly|yearly)
- `startDate` (string): Başlangıç tarihi
- `endDate` (string): Bitiş tarihi

### GET `/api/analytics/customers`
**Açıklama:** Müşteri analizlerini getirir.

## 🔧 Mechanic Endpoints

### GET `/api/mechanics`
**Açıklama:** Ustaları listeler.

**Query Parameters:**
- `serviceCategory` (string): Hizmet kategorisi
- `location` (string): Konum
- `rating` (number): Minimum puan
- `page` (number): Sayfa numarası
- `limit` (number): Sayfa başına kayıt sayısı

**Response:**
```json
{
  "success": true,
  "data": {
    "mechanics": [
      {
        "_id": "string",
        "name": "string",
        "surname": "string",
        "shopName": "string",
        "serviceCategories": ["string"],
        "rating": number,
        "ratingCount": number,
        "location": {
          "city": "string",
          "district": "string",
          "address": "string",
          "coordinates": {
            "latitude": number,
            "longitude": number
          }
        },
        "isAvailable": boolean,
        "workingHours": "string"
      }
    ],
    "pagination": {...}
  }
}
```

### GET `/api/mechanics/:mechanicId`
**Açıklama:** Belirli bir ustayı getirir.

### GET `/api/mechanics/:mechanicId/services`
**Açıklama:** Ustanın hizmetlerini listeler.

### GET `/api/mechanics/:mechanicId/reviews`
**Açıklama:** Ustanın değerlendirmelerini listeler.

## 📁 Upload Endpoints

### POST `/api/upload/image`
**Açıklama:** Resim yükler.

**Request Body:** Multipart form data
- `file`: Resim dosyası
- `category`: Kategori (profile|vehicle|service|damage)

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "string",
    "filename": "string",
    "size": number,
    "mimeType": "string"
  }
}
```

### POST `/api/upload/document`
**Açıklama:** Belge yükler.

**Request Body:** Multipart form data
- `file`: Belge dosyası
- `category`: Kategori (insurance|license|certificate)

### DELETE `/api/upload/:fileId`
**Açıklama:** Dosyayı siler.

## 🚨 Emergency Endpoints

### POST `/api/emergency/towing`
**Açıklama:** Acil çekici talebi oluşturur.

**Request Body:**
```json
{
  "vehicleId": "string",
  "location": {
    "address": "string",
    "coordinates": {
      "latitude": number,
      "longitude": number
    }
  },
  "description": "string",
  "urgency": "low|medium|high|critical"
}
```

### GET `/api/emergency/towing`
**Açıklama:** Acil çekici taleplerini listeler.

### PUT `/api/emergency/towing/:requestId/status`
**Açıklama:** Acil çekici talep durumunu günceller.

## 🔍 Search Endpoints

### GET `/api/search/mechanics`
**Açıklama:** Usta arama yapar.

**Query Parameters:**
- `q` (string): Arama terimi
- `serviceCategory` (string): Hizmet kategorisi
- `location` (string): Konum
- `radius` (number): Yarıçap (km)

### GET `/api/search/services`
**Açıklama:** Hizmet arama yapar.

**Query Parameters:**
- `q` (string): Arama terimi
- `category` (string): Kategori
- `location` (string): Konum

## 📈 Report Endpoints

### GET `/api/reports/end-of-day`
**Açıklama:** Gün sonu raporu getirir.

**Query Parameters:**
- `date` (string): Tarih

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2024-01-01",
    "summary": {
      "totalAppointments": number,
      "completedAppointments": number,
      "cancelledAppointments": number,
      "totalRevenue": number,
      "totalExpenses": number,
      "netProfit": number
    },
    "appointments": [...],
    "payments": [...],
    "expenses": [...]
  }
}
```

### GET `/api/reports/monthly`
**Açıklama:** Aylık rapor getirir.

**Query Parameters:**
- `month` (string): Ay
- `year` (number): Yıl

### POST `/api/reports/generate`
**Açıklama:** Özel rapor oluşturur.

**Request Body:**
```json
{
  "type": "revenue|customer|service|expense",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "format": "pdf|excel|csv"
}
```

## 🔧 Configuration Endpoints

### GET `/api/config/service-categories`
**Açıklama:** Hizmet kategorilerini getirir.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "icon": "string",
      "color": "string",
      "isActive": boolean
    }
  ]
}
```

### GET `/api/config/vehicle-brands`
**Açıklama:** Araç markalarını getirir.

### GET `/api/config/locations`
**Açıklama:** Konum bilgilerini getirir.

## 🧪 Test Endpoints

### GET `/api/health`
**Açıklama:** Sistem sağlık durumunu kontrol eder.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0",
    "uptime": number,
    "database": "connected",
    "redis": "connected"
  }
}
```

### GET `/api/version`
**Açıklama:** API versiyonunu getirir.

## 📊 Rate Limiting

API endpoint'leri rate limiting ile korunur:

- **Authentication:** 5 istek/dakika
- **General API:** 100 istek/dakika
- **Upload:** 10 istek/dakika
- **Search:** 50 istek/dakika

## 🔒 Error Codes

### HTTP Status Codes
- `200` - Başarılı
- `201` - Oluşturuldu
- `400` - Geçersiz istek
- `401` - Yetkisiz erişim
- `403` - Yasaklı
- `404` - Bulunamadı
- `409` - Çakışma
- `422` - İşlenemeyen varlık
- `429` - Çok fazla istek
- `500` - Sunucu hatası

### Custom Error Codes
- `VALIDATION_ERROR` - Doğrulama hatası
- `AUTHENTICATION_FAILED` - Kimlik doğrulama başarısız
- `AUTHORIZATION_FAILED` - Yetkilendirme başarısız
- `RESOURCE_NOT_FOUND` - Kaynak bulunamadı
- `DUPLICATE_RESOURCE` - Kaynak zaten mevcut
- `PAYMENT_FAILED` - Ödeme başarısız
- `SERVICE_UNAVAILABLE` - Servis kullanılamıyor

## 📚 SDK ve Örnekler

### JavaScript/TypeScript SDK
```typescript
import { RektefeAPI } from '@rektefe/api-client';

const api = new RektefeAPI({
  baseURL: 'https://api.rektefe.com',
  apiKey: 'your-api-key'
});

// Örnek kullanım
const appointments = await api.appointments.list({
  status: 'TALEP_EDILDI',
  page: 1,
  limit: 10
});
```

### cURL Örnekleri
```bash
# Giriş yapma
curl -X POST https://api.rektefe.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Randevu listeleme
curl -X GET https://api.rektefe.com/api/appointments \
  -H "Authorization: Bearer <token>"

# Yeni randevu oluşturma
curl -X POST https://api.rektefe.com/api/appointments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"mechanicId":"123","vehicleId":"456","serviceType":"oil_change"}'
```

## 🔄 WebSocket Endpoints

### Real-time Notifications
```
ws://api.rektefe.com/ws/notifications
```

### Real-time Messages
```
ws://api.rektefe.com/ws/messages
```

### Real-time Appointments
```
ws://api.rektefe.com/ws/appointments
```

## 📱 Mobile API Endpoints

### Push Notifications
- `POST /api/mobile/push-token` - Push token kaydetme
- `DELETE /api/mobile/push-token` - Push token silme
- `POST /api/mobile/push-send` - Push bildirim gönderme

### Location Services
- `POST /api/mobile/location` - Konum güncelleme
- `GET /api/mobile/nearby-mechanics` - Yakındaki ustalar

## 🚀 Deployment ve Monitoring

### Health Checks
- `GET /api/health` - Sistem sağlığı
- `GET /api/metrics` - Sistem metrikleri
- `GET /api/logs` - Sistem logları

### Monitoring
- Application Performance Monitoring (APM)
- Error Tracking
- Uptime Monitoring
- Database Performance Monitoring

---

*Bu dokümantasyon Rektefe platformunun tüm API endpoint'lerini kapsamaktadır. Güncellemeler için lütfen dokümantasyonu takip ediniz.*