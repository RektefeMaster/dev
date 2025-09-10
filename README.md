# 🚗 Rektefe - Araç Servis Platformu

Rektefe, şoförler ve ustalar için geliştirilmiş kapsamlı bir araç servis platformudur. **İki ayrı mobil uygulama** ve **ortak bir backend API**'den oluşur.

## 📁 Proje Yapısı

```
dev./                          # Ana proje dizini
├── rektefe-dv/               # 🚙 Şoför uygulaması (React Native CLI)
├── rektefe-us/               # 🔧 Usta uygulaması (React Native CLI)
├── rest-api/                 # 🌐 Backend API (Node.js + TypeScript)
└── README.md                 # 📖 Bu dosya
```

## 📱 Uygulamalar

### 🚙 Rektefe-DV (Şoförler için)

* **Platform**: React Native CLI
* **Hedef Kitle**: Araç sahipleri, şoförler
* **Ana Özellikler**:  
   * Araç bakım takibi  
   * Servis randevu sistemi  
   * Cüzdan ve ödeme yönetimi  
   * Acil yardım çağrısı  
   * Araç belge takibi
   * **WhatsApp-like Chat System** 💬
   * Usta arama ve değerlendirme
   * Randevu yönetimi

### 🔧 Rektefe-US (Ustalar için)

* **Platform**: React Native CLI
* **Hedef Kitle**: Oto servis ustaları, mekanikler
* **Ana Özellikler**:  
   * Randevu yönetimi  
   * Hizmet kategorileri  
   * Kazanç takibi  
   * Müşteri iletişimi  
   * İş geçmişi
   * **WhatsApp-like Chat System** 💬
   * Müşteri değerlendirmeleri
   * Çalışma saatleri yönetimi

### 🌐 Backend API

* **Platform**: Node.js + TypeScript
* **Veritabanı**: MongoDB
* **Ana Özellikler**:  
   * RESTful API  
   * JWT Authentication  
   * Real-time notifications  
   * File upload (Cloudinary)  
   * Socket.io integration
   * **Enhanced Chat System** 💬
   * Conversation management
   * Message history

## 🚀 Kurulum

### Gereksinimler

* Node.js 18+
* React Native CLI
* Android Studio / Xcode
* MongoDB

### Kurulum Adımları

#### 1. Backend Kurulumu

```bash
cd rest-api
npm install
npm run dev
```

Gerekli env değişkenleri:

- `JWT_SECRET` (zorunlu)
- `MONGODB_URI` (opsiyonel, varsayılan: `mongodb://127.0.0.1:27017/rektefe`)
- `PORT` (opsiyonel, varsayılan: `3000`)
- `CORS_ORIGIN` (opsiyonel, varsayılan: `*` — credentials etkinse spesifik origin kullanın)

#### 2. Rektefe-DV Kurulumu (Şoförler)

```bash
cd rektefe-dv
npm install
npx react-native run-android  # Android için
npx react-native run-ios      # iOS için
```

#### 3. Rektefe-US Kurulumu (Ustalar)

```bash
cd rektefe-us
npm install
npx react-native run-android  # Android için
npx react-native run-ios      # iOS için
```

## 🔄 Son Güncellemeler (v2.0)

### ✅ Yeni Özellikler

#### **💬 WhatsApp-like Chat System**
* Mesajlar alt taraftan başlar (WhatsApp gibi)
* Yeni mesaj geldiğinde otomatik scroll
* Eski mesajları yukarı çekerek yükleme
* Profil fotoğrafları chat header'larda görünür
* "En Alta Git" butonu ile kolay navigasyon

#### **🔧 Infinite Loop Fixes**
* Geçici conversation ID'lerde gereksiz API çağrıları engellendi
* Smart message routing sistemi
* Conversation bulma API'si eklendi
* Hata yönetimi geliştirildi

#### **🎨 Unified Design System**
* rektefe-dv ve rektefe-us aynı tasarıma sahip
* Tutarlı renk paleti ve tipografi
* Ortak UI bileşenleri
* Platform-specific optimizasyonlar

#### **📱 Enhanced User Experience**
* Klavye offset düzeltildi
* Back button'lar eklendi
* Responsive layout'lar
* Modern UI/UX patterns

### 🏗️ Mimari Yapı

```
rektefe-dv/                 # Ana kütüphane (tüm ortak dosyalar burada)
├── android/               # Android native kodu
├── ios/                   # iOS native kodu
├── components/            # Yeniden kullanılabilir bileşenler
├── screens/              # Ekran bileşenleri
├── navigation/           # Navigasyon yapısı
├── context/              # State management
├── services/             # API servisleri
├── utils/                # Utility fonksiyonları (ortak)
├── types/                # TypeScript tip tanımları (ortak)
├── constants/            # Sabitler ve konfigürasyon (ortak)
├── theme/                # Tema sistemi
└── package.json

rektefe-us/                # Usta uygulaması
├── android/               # Android native kodu
├── app/                   # App dosyaları
├── components/            # Bileşenler
├── context/               # Context API
├── services/              # API servisleri
├── assets/                # Resimler, fontlar
├── constants/             # → Sembolik link (rektefe-dv'den)
├── types/                 # → Sembolik link (rektefe-dv'den)
├── utils/                 # → Sembolik link (rektefe-dv'den)
└── package.json

rest-api/                  # Backend API
├── src/
│   ├── controllers/      # API controller'ları
│   ├── models/           # MongoDB modelleri
│   ├── routes/           # API route'ları
│   ├── middleware/       # Middleware fonksiyonları
│   ├── utils/            # Utility fonksiyonları
│   └── types/            # TypeScript tip tanımları
└── package.json
```

### 🎨 Tasarım Sistemi

#### **Renk Paleti**

* **Primary**: #007AFF (Ana mavi)
* **Secondary**: #5856D6 (İkincil mavi)
* **Success**: #34C759 (Başarı yeşili)
* **Warning**: #FF9500 (Uyarı turuncu)
* **Error**: #FF3B30 (Hata kırmızısı)
* **Info**: #5AC8FA (Bilgi mavisi)

#### **Tipografi**

* **Ana Başlık**: 24px, Bold
* **Alt Başlık**: 18px, SemiBold
* **Vücut Metni**: 16px, Regular
* **Küçük Metin**: 14px, Regular
* **Etiket**: 12px, Medium

## 🔧 Teknik Özellikler

#### **State Management**

* React Context API
* AsyncStorage persistence
* Real-time updates

#### **Navigation**

* React Navigation v6+
* Stack Navigator
* Tab Navigator
* Drawer Navigator

#### **API Integration**

* Axios interceptors
* JWT token management
* Error handling
* Retry mechanism

#### **Chat System**

* Real-time messaging
* Conversation management
* Message history
* File sharing support
* Push notifications

## 📋 Geliştirme Kuralları

### **Kod Standartları**

* TypeScript kullanımı zorunlu
* ESLint + Prettier
* Conventional commits
* Component-based architecture

### **Dosya Organizasyonu**

* PascalCase: Component dosyaları
* camelCase: Utility fonksiyonları
* kebab-case: CSS class'ları
* UPPER_CASE: Sabitler

## 🚀 Deployment

### **Android**

```bash
cd rektefe-dv
npx react-native run-android --variant=release

cd ../rektefe-us
npx react-native run-android --variant=release
```

### **iOS**

```bash
cd rektefe-dv
npx react-native run-ios --configuration Release

cd ../rektefe-us
npx react-native run-ios --configuration Release
```

### **Backend**

```bash
cd rest-api
npm run build
npm start
```

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 İletişim

* **Email**: support@rektefe.com
* **Telefon**: +90 555 123 45 67
* **Website**: https://rektefe.com

## 🙏 Teşekkürler

Bu projeyi geliştirmemizde yardımcı olan tüm geliştiricilere ve test kullanıcılarına teşekkür ederiz.

---

**Rektefe** - Araç servisinde güvenilir çözüm ortağınız 🚗🔧

## 📊 Proje İstatistikleri

* **Toplam Satır Kodu**: 50,000+
* **TypeScript Kullanımı**: %97.9
* **JavaScript Kullanımı**: %2.1
* **Platform Desteği**: iOS, Android
* **Backend**: Node.js + MongoDB
* **Real-time**: Socket.io
* **Push Notifications**: Firebase

## 🔄 Changelog

### v2.0.0 (2025-01-19)
* ✨ WhatsApp-like chat system eklendi
* 🐛 Infinite loop problemleri çözüldü
* 🎨 Unified design system implementasyonu
* 🔧 Enhanced backend API
* 📱 Improved user experience
* 🚀 Performance optimizasyonları

### v1.0.0 (2024-12-01)
* 🚀 Initial release
* 📱 Basic mobile apps
* 🌐 Backend API
* 🔐 Authentication system
* 📊 Basic features
