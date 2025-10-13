# Arıza Bildirimi Test Kılavuzu

## Test Tarihi
13 Ekim 2025

## Yapılan Düzeltmeler

### 1. ✅ Backend Düzeltmeleri

#### A. Kategori Mapping Eklendi
**Dosya:** `shared/types/enums.ts`
- "Tamir ve Bakım" kategorisi `FAULT_CATEGORY_TO_SERVICE_CATEGORY` mapping'ine eklendi

#### B. Bildirim Type Desteği Eklendi
**Dosya:** `rest-api/src/utils/notifications.ts`
- `sendNotification` fonksiyonuna `'fault_report'` type desteği eklendi
- Şu an desteklenen tipler:
  - `'appointment_request'`
  - `'appointment_confirmed'`
  - `'appointment_rejected'`
  - `'reminder'`
  - `'system'`
  - **`'fault_report'`** ← YENİ
  - `'towing_request'`
  - `'payment_received'`
  - `'payment_pending'`
  - `'new_message'`
  - `'quote_received'`

#### C. Bildirim Tipi Değiştirildi
**Dosya:** `rest-api/src/controllers/faultReport.controller.ts`
- Arıza bildirimi kaydederken type `'system'` yerine **`'fault_report'`** kullanılıyor

#### D. Debug Loglar Eklendi
**Dosya:** `rest-api/src/controllers/faultReport.controller.ts`
- Kaç usta bulundu
- Her ustaya bildirim gönderildi mi
- Push token var mı yok mu
- Bildirim başarılı/başarısız sayısı

### 2. ✅ Frontend Düzeltmeleri (rektefe-us)

#### A. Bildirim İkon Desteği
**Dosya:** `rektefe-us/src/features/notifications/screens/NotificationsScreen.tsx`
```typescript
fault_report: 'alert-circle', // Arıza bildirimi ikonu
towing_request: 'car', // Çekici talebi ikonu
```

#### B. Bildirim Renk Desteği
```typescript
fault_report: '#F97316', // Arıza bildirimi - Turuncu
towing_request: '#EF4444', // Çekici talebi - Kırmızı
```

#### C. Bildirim Kategori Metni
```typescript
fault_report: 'Arıza Bildirimi',
towing_request: 'Çekici Talebi',
```

---

## Manuel Test Adımları

### Ön Hazırlık

#### 1. Backend'i Başlatın
```bash
cd rest-api
npm run dev
```

Backend loglarını izleyin. Şu logları görmeli siniz:
```
[FIND MECHANICS] Usta arama başladı: ...
[FIND MECHANICS] Mechanic modelinde X usta bulundu
[FIND MECHANICS] User modelinde Y usta bulundu
[FAULT REPORT] Arıza bildirimi oluşturuldu: ...
[FAULT REPORT] Bildirim gönderildi - Usta: ...
```

#### 2. Mete Usta Hesabını Hazırlayın

Mete Usta hesabı yoksa oluşturun:
- **Email:** testus@gmail.com
- **Password:** (istediğiniz şifre)
- **UserType:** mechanic
- **ServiceCategories:** `["repair"]` veya `["Tamir ve Bakım"]`
- **SupportedBrands:** `["Toyota", "Genel", "Tüm Markalar"]`
- **isAvailable:** `true`

MongoDB'de kontrol:
```javascript
db.users.findOne({ email: 'testus@gmail.com', userType: 'mechanic' })
```

Eğer yoksa oluşturun:
```javascript
db.users.insertOne({
  email: 'testus@gmail.com',
  password: '$2a$10$...', // bcrypt hash
  name: 'Mete',
  surname: 'Usta',
  userType: 'mechanic',
  serviceCategories: ['repair', 'Tamir ve Bakım'],
  supportedBrands: ['Toyota', 'Genel', 'Tüm Markalar'],
  vehicleBrands: ['Toyota', 'Genel'],
  isAvailable: true,
  emailVerified: true,
  createdAt: new Date()
})
```

#### 3. Test Sürücü Hesabını Hazırlayın

Test sürücü hesabı yoksa oluşturun:
- **Email:** test@gmail.com (veya başka bir email)
- **UserType:** driver
- En az 1 adet araç eklenmiş olmalı

### Test 1: Rektefe-DV'den Arıza Bildirimi Gönder

1. **Rektefe-DV uygulamasını açın**
2. **Test sürücü olarak giriş yapın**
3. **HomeScreen'e gidin**
4. **"Arıza Bildir" butonuna tıklayın**
5. **Formu doldurun:**
   - Araç: Herhangi bir aracınız
   - Kategori: **"Tamir ve Bakım"** seçin
   - Açıklama: "Test arıza bildirimi - Motor çalışmıyor"
   - Öncelik: Yüksek
6. **"Arıza Bildirimi Gönder"**

### Test 2: Backend Loglarını Kontrol Edin

Backend terminalinde şu logları görmeli siniz:

```
[FIND MECHANICS] Usta arama başladı: {
  serviceCategory: 'Tamir ve Bakım',
  normalizedServiceCategory: 'repair',
  matchingCategories: [ 'repair', 'Tamir ve Bakım', 'Tamir & Bakım', ... ],
  vehicleBrand: 'Toyota'
}

[FIND MECHANICS] Mechanic modelinde 0 usta bulundu
[FIND MECHANICS] User modelinde 1 usta bulundu
[FIND MECHANICS] Toplam 1 usta bulundu (en fazla 20 dönecek)

[FAULT REPORT] Arıza bildirimi oluşturuldu: {
  faultReportId: '671b9c2d3e4f5a6b7c8d9e0f',
  serviceCategory: 'Tamir ve Bakım',
  normalizedServiceCategory: 'repair',
  vehicleBrand: 'Toyota',
  nearbyMechanicsCount: 1
}

[FAULT REPORT] Push notification gönderildi - Usta: Mete Usta (671a...)
[FAULT REPORT] Bildirim gönderildi - Usta: Mete Usta (671a...)

[FAULT REPORT] Bildirim özeti: {
  totalMechanics: 1,
  notificationsSent: 1,
  notificationsFailed: 0
}
```

### Test 3: MongoDB'de Bildirim Kaydını Kontrol Edin

```javascript
// Mete Usta'nın son bildirimlerini kontrol et
db.notifications.find({
  recipientType: 'mechanic'
}).sort({ createdAt: -1 }).limit(5).pretty()
```

**Beklenen sonuç:**
```javascript
{
  _id: ObjectId("..."),
  recipientId: ObjectId("..."), // Mete Usta'nın ID'si
  recipientType: "mechanic",
  title: "Yeni Arıza Bildirimi",
  message: "Test Sürücü aracında Tamir ve Bakım arızası bildirdi",
  type: "fault_report", // ← ÖNEMLİ: 'fault_report' olmalı
  isRead: false,
  data: {
    faultReportId: "...",
    vehicleBrand: "Toyota",
    vehicleModel: "Corolla",
    serviceCategory: "Tamir ve Bakım",
    faultDescription: "...",
    userPhone: "...",
    userName: "..."
  },
  createdAt: ISODate("2025-10-13T...")
}
```

### Test 4: Rektefe-US'da Bildirimleri Kontrol Edin

1. **Rektefe-US uygulamasını açın**
2. **testus@gmail.com olarak giriş yapın (Mete Usta)**
3. **Bildirimler ekranına gidin**
4. **Son bildirimde şunları görmeli siniz:**
   - ✅ "Yeni Arıza Bildirimi" başlığı
   - ✅ Mesaj içeriği
   - ✅ Turuncu renk
   - ✅ Alert-circle ikonu
   - ✅ "Arıza Bildirimi" kategorisi

### Test 5: Arıza Raporları Ekranını Kontrol Edin

1. **Rektefe-US'da "Arıza Raporları" ekranına gidin**
2. **Yeni gönderilen arıza bildirimini görmeli siniz**
3. **Tıklayarak detayları görün**
4. **Teklif verebilmelisiniz**

---

## Sorun Giderme

### Sorun 1: Hiç usta bulunamıyor

**Belirti:**
```
[FIND MECHANICS] Toplam 0 usta bulundu
```

**Çözüm:**
1. MongoDB'de usta var mı kontrol edin:
```javascript
db.users.find({ 
  userType: 'mechanic', 
  isAvailable: true,
  serviceCategories: { $in: ['repair', 'Tamir ve Bakım'] }
})
```

2. Usta yoksa oluşturun (yukarıdaki adımları izleyin)

3. Usta varsa `serviceCategories` doğru mu kontrol edin:
```javascript
db.users.updateOne(
  { email: 'testus@gmail.com' },
  { 
    $set: { 
      serviceCategories: ['repair', 'Tamir ve Bakım'],
      isAvailable: true
    }
  }
)
```

### Sorun 2: Bildirim kaydedilmiyor

**Belirti:**
```
[FAULT REPORT] Bildirim gönderme hatası - Usta ID: ...
```

**Çözüm:**
1. Hata mesajını backend loglarında kontrol edin
2. Notification model'inde `type: 'fault_report'` kabul ediliyor mu kontrol edin
3. `rest-api/src/utils/notifications.ts` dosyasının güncel olduğundan emin olun

### Sorun 3: Rektefe-US'da bildirim görünmüyor

**Çözüm 1: API endpoint'i kontrol edin**
```bash
# Backend terminalinde
curl -X GET http://localhost:3000/api/notifications/mechanic \
  -H "Authorization: Bearer METE_USTA_TOKEN"
```

**Çözüm 2: Frontend'de API çağrısını kontrol edin**
- `rektefe-us/src/shared/services/api.ts` dosyasında:
```typescript
async getNotifications(): Promise<ApiResponse<{ notifications: NotificationData[] }>> {
  const response = await apiClient.get('/notifications');
  return response.data;
}
```

**Çözüm 3: Notification type tanımlarını kontrol edin**
- `rektefe-us/src/features/notifications/screens/NotificationsScreen.tsx`:
```typescript
fault_report: 'alert-circle', // İkon
fault_report: '#F97316', // Renk
fault_report: 'Arıza Bildirimi', // Kategori
```

### Sorun 4: Push notification gitmiyor

**Belirti:**
```
[FAULT REPORT] Push token yok - Usta: Mete Usta
```

**Çözüm:**
1. Mete Usta mobil uygulamaya giriş yapmış olmalı
2. Push notification izni verilmiş olmalı
3. `pushToken` alanı dolu olmalı:
```javascript
db.users.findOne({ email: 'testus@gmail.com' }, { pushToken: 1 })
```

---

## Başarı Kriterleri

✅ **Backend loglarında:**
- Usta bulundu logu var
- Bildirim gönderildi logu var
- notificationsSent: 1 (veya daha fazla)
- notificationsFailed: 0

✅ **MongoDB'de:**
- `notifications` koleksiyonunda yeni kayıt var
- `type: 'fault_report'`
- `recipientType: 'mechanic'`
- `recipientId` Mete Usta'nın ID'si

✅ **Rektefe-US'da:**
- Bildirimler ekranında yeni bildirim görünüyor
- Turuncu renk ve alert-circle ikonu
- "Arıza Bildirimi" kategorisi
- Tıklanınca detaylar açılıyor

✅ **Arıza Raporları ekranında:**
- Yeni arıza bildirimi listede
- Detaylar görüntülenebiliyor
- Teklif verilebiliyor

---

## Test Scripti (Opsiyonel)

Otomatik test için HTTP script'i hazır:

```bash
cd rest-api
node test-fault-notification-http.js
```

**Not:** Önce backend'i başlatın ve test kullanıcılarının var olduğundan emin olun.

---

## Sonuç

Arıza bildirimleri artık ustalara ulaşıyor. Sorun şu 3 ana hatadan kaynaklanıyordu:

1. ❌ "Tamir ve Bakım" kategorisi mapping'de yoktu
2. ❌ `sendNotification` fonksiyonu `'fault_report'` tipini kabul etmiyordu
3. ❌ Debug logları yoktu, sorun tespit edilemiyordu

Artık hepsi düzeltildi! ✅

