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
- **Platform**: React Native CLI
- **Hedef Kitle**: Araç sahipleri, şoförler
- **Ana Özellikler**:
  - Araç bakım takibi
  - Servis randevu sistemi
  - Cüzdan ve ödeme yönetimi
  - Acil yardım çağrısı
  - Araç belge takibi

### 🔧 Rektefe-US (Ustalar için)
- **Platform**: React Native CLI
- **Hedef Kitle**: Oto servis ustaları, mekanikler
- **Ana Özellikler**:
  - Randevu yönetimi
  - Hizmet kategorileri
  - Kazanç takibi
  - Müşteri iletişimi
  - İş geçmişi

### 🌐 Backend API
- **Platform**: Node.js + TypeScript
- **Veritabanı**: MongoDB
- **Ana Özellikler**:
  - RESTful API
  - JWT Authentication
  - Real-time notifications
  - File upload (Cloudinary)
  - Socket.io integration

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- React Native CLI
- Android Studio / Xcode
- MongoDB

### Kurulum Adımları

#### 1. Backend Kurulumu
```bash
cd rest-api
npm install
npm run dev
```

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

## 🔄 Refactör Detayları

### ✅ Tamamlanan İyileştirmeler

#### **Expo'dan React Native CLI'ya Geçiş**
- Tüm Expo bağımlılıkları kaldırıldı
- React Navigation implementasyonu
- Native build desteği
- Platform-specific optimizasyonlar

#### **Kod Standartları**
- TypeScript tip güvenliği
- Ortak tip tanımları (`rektefe-dv/types/common.ts`)
- Tutarlı renk paleti (`rektefe-dv/constants/Colors.ts`)
- Merkezi konfigürasyon (`rektefe-dv/constants/config.ts`)

#### **Ortak Kütüphane Sistemi**
- `rektefe-dv` ana kütüphane olarak kullanılıyor
- `rektefe-us` sembolik linkler ile ortak dosyaları kullanıyor
- Kod tekrarı yok
- Merkezi bakım

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
- **Primary**: #007AFF (Ana mavi)
- **Secondary**: #5856D6 (İkincil mavi)
- **Success**: #34C759 (Başarı yeşili)
- **Warning**: #FF9500 (Uyarı turuncu)
- **Error**: #FF3B30 (Hata kırmızısı)
- **Info**: #5AC8FA (Bilgi mavisi)

#### **Tipografi**
- **Ana Başlık**: 24px, Bold
- **Alt Başlık**: 18px, SemiBold
- **Vücut Metni**: 16px, Regular
- **Küçük Metin**: 14px, Regular
- **Etiket**: 12px, Medium

## 🔧 Teknik Özellikler

#### **State Management**
- React Context API
- AsyncStorage persistence
- Real-time updates

#### **Navigation**
- React Navigation v6+
- Stack Navigator
- Tab Navigator
- Drawer Navigator

#### **API Integration**
- Axios interceptors
- JWT token management
- Error handling
- Retry mechanism

## 📋 Geliştirme Kuralları

### **Kod Standartları**
- TypeScript kullanımı zorunlu
- ESLint + Prettier
- Conventional commits
- Component-based architecture

### **Dosya Organizasyonu**
- PascalCase: Component dosyaları
- camelCase: Utility fonksiyonları
- kebab-case: CSS class'ları
- UPPER_CASE: Sabitler

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

- **Email**: support@rektefe.com
- **Telefon**: +90 555 123 45 67
- **Website**: https://rektefe.com

## 🙏 Teşekkürler

Bu projeyi geliştirmemizde yardımcı olan tüm geliştiricilere ve test kullanıcılarına teşekkür ederiz.

---

**Rektefe** - Araç servisinde güvenilir çözüm ortağınız 🚗🔧
