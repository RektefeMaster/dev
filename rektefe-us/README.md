# Rektefe US - Ustalar için Mobil Uygulama

Rektefe US, araç sahiplerine hizmet veren ustalar için geliştirilmiş mobil uygulamadır. Bu uygulama, `rektefe-dv` (sürücüler için) uygulaması ile entegre çalışır.

## 🚀 Özellikler

### 🔐 Kimlik Doğrulama
- Usta kayıt ve giriş sistemi
- JWT token tabanlı güvenlik
- Profil yönetimi

### 📅 Randevu Yönetimi
- Gelen randevu taleplerini görüntüleme
- Randevuları kabul/red etme
- Randevu durumu takibi
- Randevu tamamlama

### 💬 Mesajlaşma
- Sürücüler ile birebir mesajlaşma
- Sohbet geçmişi
- Okunmamış mesaj bildirimleri
- Yeni sohbet başlatma

### 💰 Kazanç Takibi
- Toplam kazanç görüntüleme
- Aylık kazanç istatistikleri
- Ödeme geçmişi

### ⭐ Değerlendirme Sistemi
- Müşteri yorumları ve puanları
- Ortalama puan takibi
- Değerlendirme geçmişi

## 🏗️ Teknik Yapı

### 📱 Teknolojiler
- **React Native** + **Expo SDK 52**
- **TypeScript** desteği
- **React Navigation** (Stack, Drawer, Tab)
- **Axios** HTTP client
- **AsyncStorage** veri saklama

### 🎨 UI/UX
- Modern ve temiz tasarım
- Yüksek kontrast renk şeması
- Responsive tasarım
- Türkçe dil desteği

### 🔌 API Entegrasyonu
- RESTful API desteği
- JWT authentication
- Error handling
- Request/Response interceptors

## 📁 Proje Yapısı

```
src/
├── components/          # Yeniden kullanılabilir bileşenler
├── constants/          # Sabitler ve konfigürasyon
├── context/            # React Context'ler
├── hooks/              # Custom React hooks
├── navigation/         # Navigasyon yapısı
├── screens/            # Ekran bileşenleri
├── services/           # API servisleri
├── theme/              # Tema ve stil tanımları
├── types/              # TypeScript tip tanımları
└── utils/              # Yardımcı fonksiyonlar
```

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- npm veya yarn
- Expo CLI
- iOS Simulator veya Android Emulator

### Adımlar

1. **Projeyi klonlayın**
```bash
git clone <repository-url>
cd rektefe-us
```

2. **Bağımlılıkları yükleyin**
```bash
npm install
```

3. **Uygulamayı başlatın**
```bash
npm start
```

4. **QR kodu tarayın veya emülatörde açın**

## 🔗 API Endpoint'leri

### Auth
- `POST /api/auth/login` - Giriş yap
- `POST /api/auth/register` - Kayıt ol

### Mechanic
- `GET /api/mechanic/me` - Profil bilgilerini getir
- `PUT /api/mechanic/me` - Profil güncelle
- `GET /api/mechanic/list` - Tüm ustaları listele

### Appointments
- `GET /api/appointments/mechanic` - Ustanın randevularını getir
- `PATCH /api/appointments/:id/accept` - Randevuyu kabul et
- `PATCH /api/appointments/:id/reject` - Randevuyu reddet
- `PATCH /api/appointments/:id/complete` - Randevuyu tamamla

### Messages
- `GET /api/message/conversations` - Sohbetleri getir
- `GET /api/message/conversations/:id/messages` - Sohbet mesajlarını getir
- `POST /api/message/send` - Mesaj gönder
- `PUT /api/message/mark-read` - Mesajları okundu olarak işaretle

### Ratings
- `GET /api/appointment-ratings/mechanic` - Ustanın değerlendirmelerini getir

### Notifications
- `GET /api/notifications` - Bildirimleri getir
- `PUT /api/notifications/:id/read` - Bildirimi okundu olarak işaretle

## 🔧 Konfigürasyon

### Environment Variables
```bash
# .env dosyasında
API_BASE_URL=http://localhost:3000/api
SOCKET_BASE_URL=http://localhost:3000
```

### API URL'leri
- **Development**: `http://localhost:3000/api`
- **Production**: `https://api.rektefe.com/api`

## 📱 Ekranlar

### Ana Ekranlar
1. **SplashScreen** - Uygulama açılış ekranı
2. **OnboardingScreen** - İlk kullanım tanıtımı
3. **AuthScreen** - Giriş/Kayıt ekranı
4. **HomeScreen** - Ana sayfa (istatistikler, randevular)
5. **MessagesScreen** - Sohbet listesi
6. **ChatScreen** - Birebir mesajlaşma
7. **NewMessageScreen** - Yeni sohbet başlatma

### Navigasyon
- **Stack Navigator**: Ana akış (Splash → Onboarding → Auth → Main)
- **Drawer Navigator**: Sol menü navigasyonu
- **Tab Navigator**: Alt tab navigasyonu

## 🧪 Test

```bash
# Test çalıştır
npm test

# Lint kontrolü
npm run lint

# Type check
npm run type-check
```

## 📦 Build

```bash
# Android APK
expo build:android

# iOS IPA
expo build:ios

# Web build
expo build:web
```

## 🔒 Güvenlik

- JWT token tabanlı kimlik doğrulama
- HTTPS API iletişimi
- Input validation
- Error handling
- Secure storage

## 🌐 Entegrasyon

### Rektefe DV ile
- Aynı backend API kullanır
- Randevu sistemi entegrasyonu
- Mesajlaşma sistemi entegrasyonu
- Değerlendirme sistemi entegrasyonu

### Backend
- RESTful API
- MongoDB veritabanı
- Socket.IO real-time iletişim
- Swagger dokümantasyonu

## 📈 Performans

- Lazy loading
- Image optimization
- Memory management
- Network request caching
- Background task handling

## 🐛 Hata Ayıklama

### Loglar
- Console log'ları aktif
- API request/response log'ları
- Error tracking

### Debug Araçları
- React Native Debugger
- Flipper
- Chrome DevTools

## 📝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 İletişim

- **Proje**: Rektefe US
- **E-posta**: info@rektefe.com
- **Website**: https://rektefe.com

## 🙏 Teşekkürler

- Expo ekibine
- React Native topluluğuna
- Tüm katkıda bulunanlara

---

**Rektefe US** - Ustalar için modern mobil çözüm 🚗🔧
