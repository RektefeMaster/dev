# 🚀 **REKTEFE API - DETAYLI ENDPOINT BİLGİ SAYFASI**

## 📋 **GENEL BİLGİLER**

Bu dokümantasyon, Rektefe API'sindeki her endpoint'in detaylı açıklamasını, kullanım amacını, frontend'de nerede kullanıldığını ve nasıl kullanılacağını içerir.

- **Base URL**: `http://localhost:3000/api`
- **Authentication**: Bearer Token (JWT)
- **Response Format**: Standart JSON
- **Frontend Apps**: `rektefe-dv` (şöför), `rektefe-us` (usta)

---

## 🔑 **1. AUTHENTICATION ENDPOINT'LERİ**

### **1.1 POST /api/auth/register - Kullanıcı Kaydı**

**🎯 Ne İşe Yarar:**
- Yeni kullanıcı hesabı oluşturur
- Hem şöför hem usta kaydı yapılabilir
- Email ve şifre ile güvenli hesap oluşturur

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/RegisterScreen.tsx` - Şöför kaydı
- `rektefe-us/screens/RegisterScreen.tsx` - Usta kaydı

**🔧 Nasıl Kullanılır:**
```typescript
// Frontend kullanımı
const response = await apiService.register({
  name: "Ahmet",
  surname: "Yılmaz",
  email: "ahmet@example.com",
  password: "123456",
  userType: "driver" // veya "mechanic"
});
```

**📊 Request Body:**
```json
{
  "name": "string (zorunlu)",
  "surname": "string (zorunlu)",
  "email": "string (zorunlu, unique)",
  "password": "string (zorunlu, min 6 karakter)",
  "userType": "driver | mechanic (zorunlu)",
  "phone": "string (opsiyonel)",
  "city": "string (opsiyonel)"
}
```

**📤 Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "name": "Ahmet",
      "email": "ahmet@example.com",
      "userType": "driver"
    },
    "token": "jwt_token_here"
  },
  "message": "Kullanıcı başarıyla kaydedildi"
}
```

---

### **1.2 POST /api/auth/login - Kullanıcı Girişi**

**🎯 Ne İşe Yarar:**
- Mevcut kullanıcı girişi yapar
- Email ve şifre doğrulaması yapar
- JWT token döner
- Kullanıcı tipine göre farklı dashboard'a yönlendirir

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/LoginScreen.tsx` - Şöför girişi
- `rektefe-us/screens/LoginScreen.tsx` - Usta girişi

**🔧 Nasıl Kullanılır:**
```typescript
// Frontend kullanımı
const response = await apiService.login(email, password, 'driver');
if (response.success) {
  // Token'ı kaydet ve dashboard'a yönlendir
  await AsyncStorage.setItem('token', response.data.token);
  navigation.navigate('Dashboard');
}
```

**📊 Request Body:**
```json
{
  "email": "string (zorunlu)",
  "password": "string (zorunlu)",
  "userType": "driver | mechanic (zorunlu)"
}
```

**📤 Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "name": "Ahmet",
      "email": "ahmet@example.com",
      "userType": "driver"
    },
    "token": "jwt_token_here"
  },
  "message": "Giriş başarılı"
}
```

---

### **1.3 POST /api/auth/google-login - Google ile Giriş**

**🎯 Ne İşe Yarar:**
- Google hesabı ile hızlı giriş yapar
- Google token'ı doğrular
- Mevcut kullanıcıyı bulur veya yeni hesap oluşturur

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/LoginScreen.tsx` - Google giriş butonu
- `rektefe-us/screens/LoginScreen.tsx` - Google giriş butonu

**🔧 Nasıl Kullanılır:**
```typescript
// Google Sign-In'den token al
const { idToken } = await GoogleSignin.signIn();
const response = await fetch(`${API_URL}/auth/google-login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ googleToken: idToken })
});
```

**📊 Request Body:**
```json
{
  "googleToken": "string (zorunlu, Google'dan alınan token)"
}
```

---

### **1.4 GET /api/auth/forgot-password - Şifre Unutma**

**🎯 Ne İşe Yarar:**
- Kullanıcının şifresini unuttuğunda email gönderir
- Şifre sıfırlama linki oluşturur
- Güvenli şifre sıfırlama süreci başlatır

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/ForgotPasswordScreen.tsx` - Şifre unutma ekranı
- `rektefe-us/screens/ForgotPasswordScreen.tsx` - Şifre unutma ekranı

**🔧 Nasıl Kullanılır:**
```typescript
const response = await fetch(`${API_URL}/auth/forgot-password?email=${email}`);
if (response.ok) {
  // Email gönderildi mesajı göster
  Alert.alert('Başarılı', 'Şifre sıfırlama email\'i gönderildi');
}
```

**📊 Query Parameters:**
```
?email=user@example.com (zorunlu)
```

---

### **1.5 POST /api/auth/reset-password - Şifre Sıfırlama**

**🎯 Ne İşe Yarar:**
- Şifre sıfırlama token'ı ile yeni şifre belirler
- Güvenli şifre değişimi sağlar
- Token'ı doğrular ve geçersiz kılar

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/ResetPasswordScreen.tsx` - Yeni şifre belirleme
- `rektefe-us/screens/ResetPasswordScreen.tsx` - Yeni şifre belirleme

**🔧 Nasıl Kullanılır:**
```typescript
const response = await fetch(`${API_URL}/auth/reset-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: resetToken,
    newPassword: newPassword
  })
});
```

**📊 Request Body:**
```json
{
  "token": "string (zorunlu, email'de gönderilen token)",
  "newPassword": "string (zorunlu, yeni şifre)"
}
```

---

### **1.6 POST /api/auth/change-password - Şifre Değiştirme**

**🎯 Ne İşe Yarar:**
- Giriş yapan kullanıcının şifresini değiştirir
- Mevcut şifre doğrulaması yapar
- Güvenli şifre güncelleme

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/ChangePasswordScreen.tsx` - Profil ayarları
- `rektefe-us/screens/ChangePasswordScreen.tsx` - Profil ayarları

**🔧 Nasıl Kullanılır:**
```typescript
const response = await fetch(`${API_URL}/auth/change-password`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    currentPassword: currentPassword,
    newPassword: newPassword
  })
});
```

**📊 Request Body:**
```json
{
  "currentPassword": "string (zorunlu, mevcut şifre)",
  "newPassword": "string (zorunlu, yeni şifre)"
}
```

---

### **1.7 POST /api/auth/refresh-token - Token Yenileme**

**🎯 Ne İşe Yarar:**
- Süresi dolan JWT token'ı yeniler
- Kullanıcı oturumunu uzatır
- Güvenli token yönetimi sağlar

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/services/api.ts` - Otomatik token yenileme
- `rektefe-us/src/services/api.ts` - Otomatik token yenileme

**🔧 Nasıl Kullanılır:**
```typescript
// Otomatik olarak interceptor'da çalışır
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      const response = await axios.post(`${API_URL}/auth/refresh-token`, {
        refreshToken
      });
      // Yeni token'ı kaydet
    }
  }
);
```

---

## 🚗 **2. VEHICLES ENDPOINT'LERİ**

### **2.1 POST /api/vehicles - Yeni Araç Ekleme**

**🎯 Ne İşe Yarar:**
- Kullanıcının yeni aracını sisteme ekler
- Araç bilgilerini kaydeder
- Bakım planlaması için gerekli

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/BookAppointmentScreen.tsx` - Araç seçimi
- `rektefe-dv/screens/ProfileScreen.tsx` - Araç yönetimi

**🔧 Nasıl Kullanılır:**
```typescript
const response = await fetch(`${API_URL}/vehicles`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    brand: "BMW",
    modelName: "X5",
    year: 2020,
    plateNumber: "34ABC123",
    fuelType: "Benzin",
    engineType: "2.0L",
    transmission: "Otomatik"
  })
});
```

**📊 Request Body:**
```json
{
  "brand": "string (zorunlu, araç markası)",
  "modelName": "string (zorunlu, model adı)",
  "year": "number (zorunlu, üretim yılı)",
  "plateNumber": "string (zorunlu, plaka)",
  "fuelType": "string (zorunlu, yakıt tipi)",
  "engineType": "string (zorunlu, motor tipi)",
  "transmission": "string (zorunlu, vites tipi)",
  "package": "string (opsiyonel, paket)"
}
```

---

### **2.2 GET /api/vehicles - Kullanıcının Araçlarını Getir**

**🎯 Ne İşe Yarar:**
- Giriş yapan kullanıcının tüm araçlarını listeler
- Araç seçimi için kullanılır
- Bakım planlaması için gerekli

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/BookAppointmentScreen.tsx` - Araç seçimi
- `rektefe-dv/screens/ProfileScreen.tsx` - Araç listesi

**🔧 Nasıl Kullanılır:**
```typescript
const response = await fetch(`${API_URL}/vehicles`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const vehicles = await response.json();
// Araç listesini göster
```

---

### **2.3 GET /api/vehicles/search - Araç Arama**

**🎯 Ne İşe Yarar:**
- Belirli kriterlere göre araç arama
- Marka, model, yıl gibi filtreler
- Hızlı araç bulma

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/BookAppointmentScreen.tsx` - Araç arama
- `rektefe-dv/screens/ProfileScreen.tsx` - Araç filtreleme

**🔧 Nasıl Kullanılır:**
```typescript
const response = await fetch(
  `${API_URL}/vehicles/search?brand=BMW&model=X5&year=2020`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

**📊 Query Parameters:**
```
?q=string (opsiyonel, genel arama)
?brand=string (opsiyonel, marka)
?model=string (opsiyonel, model)
?plateNumber=string (opsiyonel, plaka)
```

---

### **2.4 GET /api/vehicles/all - Tüm Araçları Getir (Admin)**

**🎯 Ne İşe Yarar:**
- Sistemdeki tüm araçları listeler
- Admin paneli için gerekli
- İstatistik ve raporlama

**📱 Frontend'de Nerede Kullanılır:**
- Admin paneli (henüz mevcut değil)
- İstatistik ekranları

**🔧 Nasıl Kullanılır:**
```typescript
const response = await fetch(
  `${API_URL}/vehicles/all?page=1&limit=20`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

**📊 Query Parameters:**
```
?page=number (opsiyonel, sayfa numarası)
?limit=number (opsiyonel, sayfa başına araç sayısı)
?brand=string (opsiyonel, marka filtresi)
?year=number (opsiyonel, yıl filtresi)
```

---

## 👨‍🔧 **3. MECHANIC ENDPOINT'LERİ**

### **3.1 GET /api/mechanic/me - Mekanik Profili**

**🎯 Ne İşe Yarar:**
- Giriş yapan ustanın profil bilgilerini getirir
- Dashboard'da profil bilgilerini gösterir
- Profil güncelleme için gerekli

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-us/screens/ProfileScreen.tsx` - Profil bilgileri
- `rektefe-us/screens/HomeScreen.tsx` - Kullanıcı bilgileri

**🔧 Nasıl Kullanılır:**
```typescript
const response = await apiService.getMechanicProfile();
if (response.success) {
  setUserProfile(response.data);
}
```

---

### **3.2 PUT /api/mechanic/me - Profil Güncelleme**

**🎯 Ne İşe Yarar:**
- Ustanın profil bilgilerini günceller
- İletişim bilgileri, adres, uzmanlık alanları
- Profil fotoğrafı ve kapak fotoğrafı

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-us/screens/ProfileScreen.tsx` - Profil düzenleme
- `rektefe-us/screens/EditProfileScreen.tsx` - Profil güncelleme

**🔧 Nasıl Kullanılır:**
```typescript
const response = await apiService.updateMechanicProfile({
  name: "Mehmet",
  surname: "Usta",
  phone: "+905551234567",
  city: "İstanbul",
  specialization: ["Motor", "Şanzıman"],
  address: "Kadıköy, İstanbul"
});
```

---

### **3.3 GET /api/mechanic/list - Mekanik Listesi**

**🎯 Ne İşe Yarar:**
- Sistemdeki tüm mekanikleri listeler
- Şöförlerin usta seçimi için gerekli
- Filtreleme ve arama imkanı

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/MechanicSearchScreen.tsx` - Usta arama
- `rektefe-dv/screens/NewMessageScreen.tsx` - Usta listesi

**🔧 Nasıl Kullanılır:**
```typescript
const response = await fetch(`${API_URL}/mechanic/list?city=İstanbul&specialization=Motor`);
const mechanics = await response.json();
// Usta listesini göster
```

**📊 Query Parameters:**
```
?page=number (opsiyonel, sayfa numarası)
?limit=number (opsiyonel, sayfa başına usta sayısı)
?city=string (opsiyonel, şehir filtresi)
?specialization=string (opsiyonel, uzmanlık alanı)
```

---

### **3.4 GET /api/mechanic/details/:id - Usta Detayları**

**🎯 Ne İşe Yarar:**
- Belirli bir ustanın detaylı bilgilerini getirir
- Puanları, yorumları, son randevuları
- İletişim bilgileri ve müsaitlik durumu

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/MechanicDetailScreen.tsx` - Usta detay sayfası
- `rektefe-dv/screens/BookAppointmentScreen.tsx` - Usta seçimi

**🔧 Nasıl Kullanılır:**
```typescript
const response = await fetch(`${API_URL}/mechanic/details/${mechanicId}`);
const mechanicDetails = await response.json();
// Usta detaylarını göster
```

---

### **3.5 GET /api/mechanic/search - Usta Arama**

**🎯 Ne İşe Yarar:**
- Belirli kriterlere göre usta arama
- İsim, şehir, uzmanlık alanına göre filtreleme
- Hızlı usta bulma

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/MechanicSearchScreen.tsx` - Arama ekranı
- `rektefe-dv/screens/HomeScreen.tsx` - Hızlı usta arama

**🔧 Nasıl Kullanılır:**
```typescript
const response = await fetch(
  `${API_URL}/mechanic/search?q=motor&city=istanbul`
);
```

**📊 Query Parameters:**
```
?q=string (opsiyonel, genel arama)
?name=string (opsiyonel, isim arama)
?specialization=string (opsiyonel, uzmanlık alanı)
?city=string (opsiyonel, şehir)
```

---

### **3.6 PUT /api/mechanic/availability - Müsaitlik Durumu**

**🎯 Ne İşe Yarar:**
- Ustanın müsaitlik durumunu günceller
- Çalışma saatleri ve notlar
- Randevu alma durumu

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-us/screens/ProfileScreen.tsx` - Müsaitlik ayarları
- `rektefe-us/screens/CalendarScreen.tsx` - Takvim ayarları

**🔧 Nasıl Kullanılır:**
```typescript
const response = await apiService.updateAvailability({
  isAvailable: true,
  workingHours: {
    start: "09:00",
    end: "18:00"
  },
  notes: "Pazartesi-Cuma çalışıyorum"
});
```

---

### **3.7 GET /api/mechanic/stats - İstatistikler**

**🎯 Ne İşe Yarar:**
- Ustanın detaylı istatistiklerini getirir
- Toplam randevu sayısı, kazanç, puan
- Aylık ve yıllık performans

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-us/screens/HomeScreen.tsx` - Dashboard istatistikleri
- `rektefe-us/screens/ProfileScreen.tsx` - Performans bilgileri

**🔧 Nasıl Kullanılır:**
```typescript
const response = await apiService.getMechanicRatingStats();
const stats = response.data;
// İstatistikleri göster
```

---

### **3.8 GET /api/mechanic/nearby - En Yakın Ustalar**

**🎯 Ne İşe Yarar:**
- Verilen konuma en yakın ustaları getirir
- Mesafeye göre sıralı liste döndürür
- Konum bazlı usta arama

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/HomeScreen.tsx` - Yakındaki ustalar
- `rektefe-dv/screens/MechanicSearchScreen.tsx` - Konum bazlı arama

**🔧 Nasıl Kullanılır:**
```typescript
const response = await fetch(`${API_URL}/mechanic/nearby?lat=41.0082&lng=28.9784&limit=20`);
const nearbyMechanics = response.data;
// En yakın ustaları göster
```

**📊 Query Parameters:**
```
?lat=number (zorunlu, enlem)
?lng=number (zorunlu, boylam)
?limit=number (opsiyonel, maksimum usta sayısı)
```

---

### **3.9 GET /api/mechanic/city/:city - Şehir Bazında Ustalar**

**🎯 Ne İşe Yarar:**
- Belirli bir şehirdeki ustaları listeler
- Şehir bazlı filtreleme
- Sayfalama desteği

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/MechanicSearchScreen.tsx` - Şehir filtresi
- `rektefe-dv/screens/HomeScreen.tsx` - Şehir seçimi

**🔧 Nasıl Kullanılır:**
```typescript
const response = await fetch(`${API_URL}/mechanic/city/İstanbul?page=1&limit=10`);
const cityMechanics = response.data;
// Şehirdeki ustaları göster
```

---

### **3.10 GET /api/mechanic/specialization/:specialization - Uzmanlık Bazında Ustalar**

**🎯 Ne İşe Yarar:**
- Belirli uzmanlık alanındaki ustaları listeler
- Uzmanlık bazlı filtreleme
- Sayfalama desteği

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/MechanicSearchScreen.tsx` - Uzmanlık filtresi
- `rektefe-dv/screens/ServiceCategoryScreen.tsx` - Hizmet kategorisi

**🔧 Nasıl Kullanılır:**
```typescript
const response = await fetch(`${API_URL}/mechanic/specialization/Motor?page=1&limit=10`);
const specializedMechanics = response.data;
// Uzmanlık alanındaki ustaları göster
```

---

### **3.11 PUT /api/mechanic/availability - Müsaitlik Durumu Güncelleme**

**🎯 Ne İşe Yarar:**
- Ustanın müsaitlik durumunu günceller
- Çalışma saatleri ve notlar
- Randevu alma durumu

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-us/screens/ProfileScreen.tsx` - Müsaitlik ayarları
- `rektefe-us/screens/CalendarScreen.tsx` - Takvim ayarları

**🔧 Nasıl Kullanılır:**
```typescript
const response = await apiService.updateAvailability({
  isAvailable: true,
  availableHours: {
    monday: ["09:00-17:00"],
    tuesday: ["09:00-17:00"]
  },
  notes: "Hafta sonu kapalıyım"
});
```

**📊 Request Body:**
```json
{
  "isAvailable": "boolean (zorunlu, müsaitlik durumu)",
  "availableHours": "object (opsiyonel, çalışma saatleri)",
  "notes": "string (opsiyonel, müsaitlik notları)"
}
```

---

### **3.12 PUT /api/mechanic/rating - Puan Güncelleme**

**🎯 Ne İşe Yarar:**
- Ustanın genel puanını günceller
- Performans takibi
- Kalite değerlendirmesi

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-us/screens/ProfileScreen.tsx` - Puan yönetimi
- `rektefe-us/screens/DashboardScreen.tsx` - Performans takibi

**🔧 Nasıl Kullanılır:**
```typescript
const response = await apiService.updateRating({
  rating: 4.5
});
```

**📊 Request Body:**
```json
{
  "rating": "number (zorunlu, 0-5 arası puan)"
}
```

---

## 📅 **4. APPOINTMENTS ENDPOINT'LERİ**

### **4.1 POST /api/appointments - Yeni Randevu**

**🎯 Ne İşe Yarar:**
- Şöför tarafından yeni randevu talebi oluşturur
- Araç, hizmet tipi, tarih ve saat bilgileri
- Usta seçimi ve notlar

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/BookAppointmentScreen.tsx` - Randevu oluşturma
- `rektefe-dv/screens/HomeScreen.tsx` - Hızlı randevu

**🔧 Nasıl Kullanılır:**
```typescript
const response = await fetch(`${API_URL}/appointments`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    vehicleId: selectedVehicle.id,
    serviceType: "Genel Bakım",
    appointmentDate: selectedDate,
    description: "Motor yağı değişimi gerekli",
    mechanicId: selectedMechanic.id
  })
});
```

**📊 Request Body:**
```json
{
  "vehicleId": "string (zorunlu, araç ID'si)",
  "serviceType": "string (zorunlu, hizmet tipi)",
  "appointmentDate": "string (zorunlu, ISO date)",
  "description": "string (opsiyonel, açıklama)",
  "mechanicId": "string (opsiyonel, usta ID'si)"
}
```

---

### **4.2 GET /api/appointments/driver - Şöförün Randevuları**

**🎯 Ne İşe Yarar:**
- Giriş yapan şöförün tüm randevularını getirir
- Durumlarına göre filtreleme (bekleyen, onaylanan, tamamlanan)
- Randevu yönetimi için gerekli

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/AppointmentsScreen.tsx` - Randevu listesi
- `rektefe-dv/screens/HomeScreen.tsx` - Son randevular

**🔧 Nasıl Kullanılır:**
```typescript
const response = await apiService.getAppointments('driver');
const appointments = response.data;
// Randevu listesini göster
```

---

### **4.3 GET /api/appointments/mechanic - Ustanın Randevuları**

**🎯 Ne İşe Yarar:**
- Giriş yapan ustanın tüm randevularını getirir
- Durumlarına göre filtreleme
- İş yönetimi için gerekli

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-us/screens/AppointmentsScreen.tsx` - Randevu listesi
- `rektefe-us/screens/CalendarScreen.tsx` - Takvim görünümü

**🔧 Nasıl Kullanılır:**
```typescript
const response = await apiService.getMechanicAppointments();
const appointments = response.data;
// Randevu listesini göster
```

---

### **4.4 PUT /api/appointments/:id/status - Randevu Durumu Güncelleme**

**🎯 Ne İşe Yarar:**
- Usta tarafından randevu durumunu günceller
- Onaylama, reddetme, tamamlama
- Durum değişikliklerini takip etme

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-us/screens/AppointmentDetailScreen.tsx` - Randevu onaylama
- `rektefe-us/screens/AppointmentsScreen.tsx` - Toplu durum güncelleme

**🔧 Nasıl Kullanılır:**
```typescript
// Randevu onaylama
const response = await apiService.approveAppointment(appointmentId);

// Randevu reddetme
const response = await apiService.rejectAppointment(appointmentId, 'Müsait değil');

// Randevu tamamlama
const response = await apiService.completeAppointment(appointmentId, {
  cost: 500,
  notes: 'İş tamamlandı'
});
```

---

### **4.5 GET /api/appointments/:id - Randevu Detayları**

**🎯 Ne İşe Yarar:**
- Belirli bir randevunun detaylı bilgilerini getirir
- Araç, usta, hizmet bilgileri
- Durum ve notlar

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/AppointmentDetailScreen.tsx` - Randevu detayı
- `rektefe-us/screens/AppointmentDetailScreen.tsx` - Randevu detayı

**🔧 Nasıl Kullanılır:**
```typescript
const response = await apiService.getAppointmentById(appointmentId);
const appointment = response.data;
// Randevu detaylarını göster
```

---

## 💬 **5. MESSAGES ENDPOINT'LERİ**

### **5.1 GET /api/message/conversations - Konuşma Listesi**

**🎯 Ne İşe Yarar:**
- Kullanıcının tüm konuşmalarını listeler
- Son mesaj ve tarih bilgileri
- Okunmamış mesaj sayısı

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/MessagesScreen.tsx` - Mesaj listesi
- `rektefe-us/screens/MessagesScreen.tsx` - Mesaj listesi

**🔧 Nasıl Kullanılır:**
```typescript
const response = await apiService.getConversations();
const conversations = response.data;
// Konuşma listesini göster
```

---

### **5.2 GET /api/message/conversation/:id/messages - Konuşma Mesajları**

**🎯 Ne İşe Yarar:**
- Belirli bir konuşmadaki tüm mesajları getirir
- Sayfalama ve filtreleme
- Mesaj geçmişi

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/ChatScreen.tsx` - Sohbet ekranı
- `rektefe-us/screens/ChatScreen.tsx` - Sohbet ekranı

**🔧 Nasıl Kullanılır:**
```typescript
const response = await apiService.getConversationMessages(conversationId, pageNum, 50);
const messages = response.data;
// Mesajları göster
```

---

### **5.3 POST /api/message/send - Mesaj Gönderme**

**🎯 Ne İşe Yarar:**
- Yeni mesaj gönderir
- Konuşmayı günceller
- Gerçek zamanlı iletişim

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/ChatScreen.tsx` - Mesaj gönderme
- `rektefe-us/screens/ChatScreen.tsx` - Mesaj gönderme

**🔧 Nasıl Kullanılır:**
```typescript
const response = await apiService.sendMessage({
  conversationId: conversationId,
  receiverId: receiverId,
  content: messageText
});
```

---

### **5.4 GET /api/message/conversation/find/:otherUserId - Konuşma Bulma**

**🎯 Ne İşe Yarar:**
- Belirli bir kullanıcı ile konuşma bulur
- Konuşma yoksa yeni oluşturur
- Hızlı mesajlaşma başlatma

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/MechanicDetailScreen.tsx` - Mesaj gönderme
- `rektefe-dv/screens/NewMessageScreen.tsx` - Yeni konuşma
- `rektefe-us/screens/CustomerDetailScreen.tsx` - Müşteri ile konuşma

**🔧 Nasıl Kullanılır:**
```typescript
const response = await fetch(`${API_URL}/message/conversation/find/${otherUserId}`);
const conversation = await response.json();
// Konuşmayı başlat
```

---

## 👤 **6. USERS ENDPOINT'LERİ**

### **6.1 GET /api/users/profile - Kullanıcı Profili**

**🎯 Ne İşe Yarar:**
- Giriş yapan kullanıcının profil bilgilerini getirir
- Kişisel bilgiler ve ayarlar
- Profil düzenleme için gerekli

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/ProfileScreen.tsx` - Profil bilgileri
- `rektefe-dv/navigation/DrawerNavigator.tsx` - Kullanıcı bilgileri

**🔧 Nasıl Kullanılır:**
```typescript
const response = await fetch(`${API_URL}/users/profile`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const profile = await response.json();
// Profil bilgilerini göster
```

---

### **6.2 PUT /api/users/profile - Profil Güncelleme**

**🎯 Ne İşe Yarar:**
- Kullanıcının profil bilgilerini günceller
- İsim, telefon, adres bilgileri
- Profil fotoğrafı ve kapak fotoğrafı

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/ProfileScreen.tsx` - Profil düzenleme
- `rektefe-us/screens/ProfileScreen.tsx` - Profil düzenleme

**🔧 Nasıl Kullanılır:**
```typescript
const response = await fetch(`${API_URL}/users/profile`, {
  method: 'PUT',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: "Yeni İsim",
    phone: "+905551234567",
    city: "İstanbul"
  })
});
```

---

### **6.3 POST /api/users/profile-photo - Profil Fotoğrafı**

**🎯 Ne İşe Yarar:**
- Kullanıcının profil fotoğrafını günceller
- Dosya yükleme ve Cloudinary entegrasyonu
- Profil görünümü

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/ProfileScreen.tsx` - Fotoğraf değiştirme
- `rektefe-us/screens/ProfileScreen.tsx` - Fotoğraf değiştirme

**🔧 Nasıl Kullanılır:**
```typescript
const formData = new FormData();
formData.append('photo', {
  uri: imageUri,
  type: 'image/jpeg',
  name: 'profile.jpg'
});

const response = await fetch(`${API_URL}/users/profile-photo`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

---

### **6.4 GET /api/users/notifications - Bildirimler**

**🎯 Ne İşe Yarar:**
- Kullanıcının tüm bildirimlerini getirir
- Okunmamış bildirim sayısı
- Bildirim yönetimi

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/HomeScreen/components/GreetingHeader.tsx` - Bildirim sayısı
- `rektefe-dv/screens/NotificationsScreen.tsx` - Bildirim listesi

**🔧 Nasıl Kullanılır:**
```typescript
const response = await axios.get(`${API_URL}/users/notifications`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const notifications = response.data;
// Bildirimleri göster
```

---

## 💰 **7. WALLET ENDPOINT'LERİ**

### **7.1 GET /api/wallet/balance - Cüzdan Bakiyesi**

**🎯 Ne İşe Yarar:**
- Kullanıcının cüzdan bakiyesini getirir
- Toplam bakiye ve işlem geçmişi
- Finansal durum takibi

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-us/screens/HomeScreen.tsx` - Bakiye gösterimi
- `rektefe-us/screens/WalletScreen.tsx` - Cüzdan ekranı

**🔧 Nasıl Kullanılır:**
```typescript
const response = await apiService.getWalletBalance();
const balance = response.data;
// Bakiyeyi göster
```

---

### **7.2 GET /api/wallet/transactions - İşlem Geçmişi**

**🎯 Ne İşe Yarar:**
- Cüzdan işlem geçmişini getirir
- Para yatırma, çekme, ödeme işlemleri
- Tarih ve tutar bilgileri

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-us/screens/WalletScreen.tsx` - İşlem listesi
- `rektefe-us/screens/FinancialTrackingScreen.tsx` - Finansal takip

**🔧 Nasıl Kullanılır:**
```typescript
const response = await apiService.getRecentTransactions();
const transactions = response.data;
// İşlem listesini göster
```

---

## 📢 **8. ADS ENDPOINT'LERİ**

### **8.1 GET /api/ads - Reklamları Getir**

**🎯 Ne İşe Yarar:**
- Sistemdeki tüm reklamları getirir
- Kampanya ve promosyon bilgileri
- Kullanıcı deneyimini artırma

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/components/AdCarousel.tsx` - Reklam carousel'i
- `rektefe-dv/screens/HomeScreen.tsx` - Ana sayfa reklamları

**🔧 Nasıl Kullanılır:**
```typescript
const response = await fetch('http://localhost:3000/ads');
const ads = await response.json();
// Reklamları göster
```

**📤 Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Özel Bakım Kampanyası",
      "description": "Tüm araçlar için %20 indirim",
      "imageUrl": "https://example.com/ad1.jpg",
      "link": "https://example.com/campaign1",
      "active": true,
      "startDate": "2025-01-01",
      "endDate": "2025-12-31"
    }
  ],
  "message": "Reklamlar başarıyla getirildi"
}
```

---

## 📢 **9. ADS ENDPOINT'LERİ**

### **9.1 GET /api/ads - Reklamları Getir**

**🎯 Ne İşe Yarar:**
- Sistemdeki tüm reklamları getirir
- Kampanya ve promosyon bilgileri
- Kullanıcı deneyimini artırma

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/components/AdCarousel.tsx` - Reklam carousel'i
- `rektefe-dv/screens/HomeScreen.tsx` - Ana sayfa reklamları
- `rektefe-us/screens/HomeScreen.tsx` - Usta uygulaması reklamları

**🔧 Nasıl Kullanılır:**
```typescript
const response = await fetch(`${API_URL}/ads`);
const ads = await response.json();
// Reklamları göster
```

**📤 Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Özel Bakım Kampanyası",
      "description": "Tüm araçlar için %20 indirim",
      "imageUrl": "https://example.com/ad1.jpg",
      "link": "https://example.com/campaign1",
      "active": true,
      "startDate": "2025-01-01",
      "endDate": "2025-12-31"
    }
  ],
  "message": "Reklamlar başarıyla getirildi"
}
```

---

## 🔧 **10. TECHNICAL ENDPOINT'LERİ**

### **10.1 POST /api/upload - Dosya Yükleme**

**🎯 Ne İşe Yarar:**
- Profil fotoğrafı, kapak fotoğrafı yükleme
- Cloudinary entegrasyonu
- Güvenli dosya yönetimi

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/RegisterScreen.tsx` - Profil fotoğrafı
- `rektefe-dv/screens/ProfileScreen.tsx` - Fotoğraf güncelleme
- `rektefe-us/screens/ProfileScreen.tsx` - Usta profil fotoğrafı

**🔧 Nasıl Kullanılır:**
```typescript
const formData = new FormData();
formData.append('image', {
  uri: imageUri,
  type: 'image/jpeg',
  name: 'photo.jpg'
});

const response = await api.post('/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

**📊 Request Body:**
```
Content-Type: multipart/form-data
image: File (zorunlu, yüklenecek dosya)
```

**📤 Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://cloudinary.com/image/upload/v1234567890/photo.jpg",
    "publicId": "photo_1234567890",
    "secureUrl": "https://res.cloudinary.com/image/upload/v1234567890/photo.jpg"
  },
  "message": "Dosya başarıyla yüklendi"
}
```

---

## 👥 **11. MÜŞTERİ SİSTEMİ ENDPOINT'LERİ**

### **11.1 POST /api/users/become-customer/:mechanicId - Ustanın Müşterisi Ol**

**🎯 Ne İşe Yarar:**
- Şöför, belirtilen ustanın müşterisi olur
- Usta-şöför ilişkisi kurulur
- Müşteri listesi güncellenir

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/MechanicDetailScreen.tsx` - Usta detay sayfasında "Müşteri Ol" butonu
- `rektefe-dv/screens/MechanicSearchScreen.tsx` - Usta arama sonuçlarında müşteri olma

**🔧 Nasıl Kullanılır:**
```typescript
// Frontend kullanımı
const becomeCustomer = async (mechanicId: string) => {
  try {
    const response = await apiService.becomeCustomer(mechanicId);
    if (response.success) {
      Alert.alert('Başarılı', 'Ustanın müşterisi oldunuz!');
      // Usta listesini güncelle
      fetchMyMechanics();
    }
  } catch (error) {
    Alert.alert('Hata', 'Müşteri olurken bir hata oluştu');
  }
};
```

**📊 Request:**
- **Method:** POST
- **URL:** `/api/users/become-customer/:mechanicId`
- **Headers:** `Authorization: Bearer <token>`
- **Body:** Boş (mechanicId URL'de)

**📤 Response:**
```json
{
  "success": true,
  "data": {
    "message": "Başarıyla müşteri olundu",
    "mechanicName": "Ahmet Yılmaz",
    "customerCount": 15
  },
  "message": "Müşteri olundu"
}
```

---

### **11.2 DELETE /api/users/remove-customer/:mechanicId - Müşteriliği Bırak**

**🎯 Ne İşe Yarar:**
- Şöför, belirtilen ustanın müşterisi olmaktan çıkar
- Usta-şöför ilişkisi kaldırılır
- Müşteri listesi güncellenir

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/MechanicDetailScreen.tsx` - Usta detay sayfasında "Müşteriliği Bırak" butonu
- `rektefe-dv/screens/MyMechanicsScreen.tsx` - Ustalarım sayfasında

**🔧 Nasıl Kullanılır:**
```typescript
// Frontend kullanımı
const removeCustomer = async (mechanicId: string) => {
  try {
    const response = await apiService.removeCustomer(mechanicId);
    if (response.success) {
      Alert.alert('Başarılı', 'Müşterilik bırakıldı');
      // Usta listesini güncelle
      fetchMyMechanics();
    }
  } catch (error) {
    Alert.alert('Hata', 'Müşterilik bırakılırken bir hata oluştu');
  }
};
```

**📊 Request:**
- **Method:** DELETE
- **URL:** `/api/users/remove-customer/:mechanicId`
- **Headers:** `Authorization: Bearer <token>`

**📤 Response:**
```json
{
  "success": true,
  "data": {
    "message": "Müşterilik başarıyla bırakıldı",
    "mechanicName": "Ahmet Yılmaz"
  },
  "message": "Müşterilik bırakıldı"
}
```

---

### **11.3 GET /api/users/my-mechanics - Müşterisi Olunan Ustalar**

**🎯 Ne İşe Yarar:**
- Şöförün müşterisi olduğu ustaları listeler
- Favori ustaları gösterir
- Hızlı erişim sağlar

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-dv/screens/MyMechanicsScreen.tsx` - "Ustalarım" sayfası
- `rektefe-dv/screens/HomeScreen.tsx` - Ana sayfada favori ustalar
- `rektefe-dv/navigation/DrawerNavigator.tsx` - Drawer menüde

**🔧 Nasıl Kullanılır:**
```typescript
// Frontend kullanımı
const fetchMyMechanics = async () => {
  try {
    const response = await apiService.getMyMechanics();
    if (response.success) {
      setMyMechanics(response.data);
    }
  } catch (error) {
    console.error('Ustalar getirilemedi:', error);
  }
};

// useEffect ile sayfa yüklendiğinde çağır
useEffect(() => {
  fetchMyMechanics();
}, []);
```

**📊 Request:**
- **Method:** GET
- **URL:** `/api/users/my-mechanics`
- **Headers:** `Authorization: Bearer <token>`

**📤 Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "mechanic_id",
      "name": "Ahmet",
      "surname": "Yılmaz",
      "email": "ahmet@example.com",
      "avatar": "avatar_url",
      "city": "İstanbul",
      "bio": "20 yıllık deneyim",
      "experience": 20,
      "rating": 4.8,
      "ratingCount": 150,
      "shopName": "Ahmet Usta Oto Servis"
    }
  ],
  "message": "Müşterisi olunan ustalar başarıyla getirildi"
}
```

---

### **11.4 GET /api/users/my-customers - Ustanın Müşterileri**

**🎯 Ne İşe Yarar:**
- Ustanın müşterisi olan şöförleri listeler
- Müşteri yönetimi sağlar
- İletişim bilgilerine erişim verir

**📱 Frontend'de Nerede Kullanılır:**
- `rektefe-us/screens/MyCustomersScreen.tsx` - "Müşterilerim" sayfası
- `rektefe-us/screens/DashboardScreen.tsx` - Dashboard'da müşteri sayısı
- `rektefe-us/navigation/DrawerNavigator.tsx` - Drawer menüde

**🔧 Nasıl Kullanılır:**
```typescript
// Frontend kullanımı
const fetchMyCustomers = async () => {
  try {
    const response = await apiService.getMyCustomers();
    if (response.success) {
      setMyCustomers(response.data);
      setCustomerCount(response.data.length);
    }
  } catch (error) {
    console.error('Müşteriler getirilemedi:', error);
  }
};

// useEffect ile sayfa yüklendiğinde çağır
useEffect(() => {
  fetchMyCustomers();
}, []);
```

**📊 Request:**
- **Method:** GET
- **URL:** `/api/users/my-customers`
- **Headers:** `Authorization: Bearer <token>`

**📤 Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "customer_id",
      "name": "Mehmet",
      "surname": "Demir",
      "email": "mehmet@example.com",
      "avatar": "avatar_url",
      "city": "Ankara",
      "phone": "+90 555 123 4567"
    }
  ],
  "message": "Müşteriler başarıyla getirildi"
}
```

---

## 📊 **12. ENDPOINT KULLANIM ÖZETİ**

### **🔄 Frontend-Backend Entegrasyonu:**

#### **✅ REKTEFE-US (USTA APP):**
- **API Service Kullanımı:** %100
- **Endpoint Uyumu:** %100
- **Error Handling:** %100
- **Authentication:** %100

#### **⚠️ REKTEFE-DV (ŞOFÖR APP):**
- **API Service Kullanımı:** %40
- **Endpoint Uyumu:** %100
- **Error Handling:** %60
- **Authentication:** %100

### **🎯 Kullanım Önerileri:**

#### **1. REKTEFE-DV'DE TUTARLILIK SAĞLA:**
```typescript
// ❌ Mevcut karışık kullanım:
const response = await fetch(`${API_URL}/vehicles`);
const response = await axios.get(`${API_URL}/users/notifications`);

// ✅ Önerilen tutarlı kullanım:
const response = await apiService.getVehicles();
const response = await apiService.getNotifications();
```

#### **2. STANDART ERROR HANDLING:**
```typescript
// ❌ Mevcut:
try {
  const response = await fetch(url);
  const data = await response.json();
} catch (error) {
  console.error(error);
}

// ✅ Önerilen:
try {
  const response = await apiService.getData();
  if (response.success) {
    setData(response.data);
  } else {
    showError(response.message);
  }
} catch (error) {
  const errorMessage = apiService.handleError(error);
  showError(errorMessage);
}
```

---

## 🚀 **13. SONRAKI ADIMLAR**

### **1. Frontend Tutarlılığı:**
- `rektefe-dv`'de tüm API call'ları `apiService` üzerinden yap
- `fetch` ve `axios` kullanımını kaldır
- Standart error handling ekle

### **2. API Monitoring:**
- Endpoint response time'larını takip et
- Error rate'leri izle
- Performance optimizasyonu yap

### **3. Documentation:**
- Swagger UI'ı güncel tut
- API changelog oluştur
- Versioning ekle

---

## 📞 **14. DESTEK VE İLETİŞİM**

- **API Desteği**: Backend geliştirici ekibi
- **Frontend Desteği**: React Native geliştirici ekibi
- **Dokümantasyon**: Bu dosya ve SWAGGER_README.md
- **Test**: Postman collection'ları

---

**🎉 Bu dokümantasyon ile tüm endpoint'lerin ne işe yaradığı, nasıl kullanıldığı ve nerede kullanıldığı detaylıca açıklanmıştır!**

**Son Güncelleme**: 27 Ağustos 2025
**Versiyon**: 1.0.0
**Durum**: Tamamlandı ✅
