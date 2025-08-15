# 🔧 Rektefe API - Swagger/OpenAPI Dokümantasyonu

Bu proje, REST API'nizi test etmek ve dokümante etmek için Swagger/OpenAPI kullanır.

## 🚀 Hızlı Başlangıç

### 1. Sunucuyu Başlat
```bash
npm run dev
```

### 2. Swagger UI'a Erişim
Tarayıcınızda şu adresi açın:
```
http://localhost:3000/docs
```

## 📚 Mevcut Endpoint'ler

### 🔐 Auth Endpoints
- `POST /api/auth/register` - Yeni kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi
- `POST /api/auth/logout` - Kullanıcı çıkışı

### 🚗 Vehicles Endpoints
- `GET /api/vehicles` - Kullanıcının araçlarını getir
- `POST /api/vehicles` - Yeni araç ekle
- `PUT /api/vehicles/:id/favorite` - Araç favori durumunu güncelle
- `DELETE /api/vehicles/:id` - Araç sil

### 🔧 Maintenance Appointments Endpoints
- `POST /api/maintenance-appointments` - Bakım randevusu oluştur
- `GET /api/maintenance-appointments/mechanic` - Ustanın randevularını getir
- `PUT /api/maintenance-appointments/:id/mechanic/confirm` - Randevuyu onayla
- `PUT /api/maintenance-appointments/:id/mechanic/complete` - Randevuyu tamamla
- `PUT /api/maintenance-appointments/:id/mechanic/reject` - Randevuyu reddet
- `GET /api/maintenance-appointments/mechanic-availability` - Usta müsaitlik durumu

### 🛠️ Mechanic Services Endpoints
- `GET /api/mechanic-services` - Tüm servis kategorilerini getir
- `GET /api/mechanic-services/type/:type` - Belirli tipteki kategorileri getir
- `GET /api/mechanic-services/mechanic/:id` - Usta profilini getir
- `PUT /api/mechanic-services/mechanic/:id` - Usta profilini güncelle

**📊 Toplam: 17 endpoint**

## 🔑 Kimlik Doğrulama

Çoğu endpoint JWT token gerektirir. Token'ı şu şekilde kullanın:

1. **Login endpoint'ini çağırın** ve `token` alın
2. **Authorization header'ında** `Bearer {token}` formatında gönderin

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/posts
```

## 🛠️ Yeni Endpoint Ekleme

Yeni bir endpoint eklerken, üstüne Swagger dokümantasyonu ekleyin:

```typescript
/**
 * @swagger
 * /api/example:
 *   get:
 *     summary: Örnek endpoint
 *     description: Bu bir örnek endpoint'tir
 *     tags:
 *       - Example
 *     responses:
 *       200:
 *         description: Başarılı
 */
router.get('/example', exampleController);
```

## 📖 Swagger Özellikleri

- **Interactive Testing**: Endpoint'leri doğrudan tarayıcıdan test edin
- **Request/Response Examples**: Her endpoint için örnek veriler
- **Authentication**: JWT token ile güvenli test
- **Schema Validation**: Request/response şemaları
- **Error Codes**: Tüm hata kodları dokümante edilmiş

## 🆕 Yeni Eklenen Endpoint'ler

### 🔧 Maintenance Appointments
- **Randevu Yönetimi**: Müşteri randevu oluşturma, usta onaylama/reddetme/tamamlama
- **Müsaitlik Kontrolü**: Ustanın belirli tarihteki müsaitlik durumu
- **Detaylı Bilgiler**: Tahmini süre, maliyet, yapılan işler, öneriler
- **Durum Takibi**: Pending → Confirmed → In Progress → Completed/Rejected

### 🛠️ Mechanic Services
- **Servis Kategorileri**: Tüm servis türleri ve alt kategorileri
- **Usta Profilleri**: Detaylı profil bilgileri, çalışma saatleri, konum
- **Yetkilendirme**: Sadece kendi profilini güncelleyebilme
- **Çoklu Veri**: Servis kategorileri, araç markaları, sertifikalar

## 🔧 Geliştirme

### Swagger Konfigürasyonu
`src/config/swagger.ts` dosyasında:
- API başlığı ve açıklaması
- Sunucu URL'leri
- Güvenlik şemaları
- Dokümantasyon dosya yolları

### Yeni Schema Ekleme
`components.schemas` altında yeni veri modelleri tanımlayın:

```typescript
/**
 * @swagger
 * components:
 *   schemas:
 *     NewModel:
 *       type: object
 *       properties:
 *         field:
 *           type: string
 */
```

## 🚨 Sorun Giderme

### Swagger UI Açılmıyor
1. Sunucunun çalıştığından emin olun
2. Port 3000'in açık olduğunu kontrol edin
3. Build hatalarını kontrol edin: `npm run build`

### Endpoint'ler Görünmüyor
1. Swagger yorumlarının doğru formatta olduğundan emin olun
2. Dosya yollarının `swagger.ts`'de tanımlı olduğunu kontrol edin
3. Sunucuyu yeniden başlatın

## 📞 Destek

Sorun yaşarsanız:
1. Console log'larını kontrol edin
2. Build çıktısını inceleyin
3. Swagger yorum formatını doğrulayın

---

**Not**: Bu dokümantasyon otomatik olarak güncellenir. Yeni endpoint'ler ekledikçe Swagger UI'da görünecektir.
