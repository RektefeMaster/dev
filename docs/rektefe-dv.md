# Rektefe-DV (Şöför Uygulaması)

Şöförler için geliştirilmiş React Native mobil uygulaması.

## 📁 Klasör Yapısı

```
rektefe-dv/
├── android/           # Android native kodları
├── ios/              # iOS native kodları  
├── assets/           # Statik dosyalar (resimler, animasyonlar)
├── e2e/              # End-to-end testler
├── src/              # Ana kaynak kodları
└── [config files]    # Yapılandırma dosyaları
```

## 📄 Yapılandırma Dosyaları

### `package.json`
**Amaç:** Proje bağımlılıkları ve script'leri
**Ne Zaman Kullanılır:** Geliştirme ve build süreçlerinde
**Önemli Bağımlılıklar:**
- `expo: ~52.0.0` - Expo SDK
- `react-native: 0.76.9` - React Native
- `@react-navigation/*` - Navigasyon
- `socket.io-client` - Gerçek zamanlı iletişim
- `react-native-maps` - Harita entegrasyonu
- `expo-location` - Konum servisleri

**Script'ler:**
```json
{
  "start": "expo start",
  "android": "expo run:android", 
  "ios": "expo run:ios",
  "web": "expo start --web"
}
```

### `app.json`
**Amaç:** Expo uygulama yapılandırması
**Ne Zaman Kullanılır:** Build ve deployment sırasında
**Önemli Ayarlar:**
- **Bundle ID:** `com.rektefe.dv`
- **App Name:** `RektefeDV`
- **Scheme:** `rektefedv`
- **Permissions:** Konum, telefon arama, bildirimler
- **New Architecture:** Aktif

### `babel.config.js`
**Amaç:** JavaScript transpilation yapılandırması
**Ne Zaman Kullanılır:** Kod derleme sırasında
**Özellikler:**
- Module resolver ile `@` alias'ı (`./src` klasörü için)
- React Native Reanimated plugin
- Expo preset

### `metro.config.js`
**Amaç:** Metro bundler yapılandırması
**Ne Zaman Kullanılır:** Bundle oluşturma sırasında
**Özellikler:**
- Shared klasörünü watchFolders'a ekler
- Node modules path'leri yapılandırır
- Shared modülü resolver'a ekler

### `tsconfig.json`
**Amaç:** TypeScript derleyici yapılandırması
**Ne Zaman Kullanılır:** Type checking ve derleme sırasında
**Önemli Ayarlar:**
- **Target:** `esnext`
- **Strict:** `false` (gevşek tip kontrolü)
- **Base URL:** `./src`
- **Paths:** `@/*` alias'ı

### `eas.json`
**Amaç:** Expo Application Services yapılandırması
**Ne Zaman Kullanılır:** Build ve store submission sırasında
**Build Profilleri:**
- **Development:** Development client ile debug build
- **Preview:** Internal distribution için APK
- **Production:** Store release için optimize edilmiş build

### `detox.config.js`
**Amaç:** E2E test framework yapılandırması
**Ne Zaman Kullanılır:** Otomatik test çalıştırma sırasında
**Özellikler:**
- iOS ve Android simulator/emulator desteği
- Debug ve release build konfigürasyonları
- Jest test runner entegrasyonu

## 📱 Native Klasörler

### `android/`
**Amaç:** Android native kodları ve yapılandırmaları
**İçerik:**
- `app/build.gradle` - Android build yapılandırması
- `gradle.properties` - Gradle ayarları
- `rektefe-dv-release.keystore` - Release imzalama anahtarı
- Native modül entegrasyonları

### `ios/`
**Amaç:** iOS native kodları ve yapılandırmaları
**İçerik:**
- `RektefeDV.xcodeproj` - Xcode proje dosyası
- `Podfile` - CocoaPods bağımlılıkları
- Native modül entegrasyonları
- iOS-specific yapılandırmalar

## 🎨 Assets Klasörü

**Amaç:** Statik dosyalar ve medya içerikleri
**İçerik:**
- **Resimler:** `icon.png`, `splash-icon.png`, `adaptive-icon.png`
- **Animasyonlar:** Lottie JSON dosyaları (`baslayalım.json`, `chatarkaplan.json`, vb.)
- **Fontlar:** Custom font dosyaları
- **Sesler:** `notification.wav`

## 🧪 E2E Testler

### `e2e/` Klasörü
**Amaç:** End-to-end test senaryoları
**Test Dosyaları:**
- `authentication.e2e.ts` - Giriş/çıkış testleri
- `emergency-towing.e2e.ts` - Acil çekici testleri
- `home-screen.e2e.ts` - Ana ekran testleri
- `onboarding.e2e.ts` - Tanıtım ekranları testleri
- `ui-ux-accessibility.e2e.ts` - Erişilebilirlik testleri

## 💻 Kaynak Kodlar

### `src/` Klasörü
**Amaç:** Ana uygulama kodları
**Alt Klasörler:**
- `features/` - Özellik bazlı bileşenler
- `shared/` - Ortak bileşenler ve yardımcılar
- `navigation/` - Navigasyon yapılandırması
- `context/` - React Context'leri
- `constants/` - Sabitler ve yapılandırmalar
- `theme/` - Tema ve stil ayarları

## 🚀 Çalıştırma Komutları

```bash
# Development server başlat
npm start

# iOS simulator'da çalıştır
npm run ios

# Android emulator'da çalıştır  
npm run android

# Web browser'da çalıştır
npm run web

# E2E testleri çalıştır
detox test --configuration ios.sim.debug
```

## 📝 Önemli Notlar

- **Expo SDK 52** kullanılıyor (downgrade yapılmamalı)
- **New Architecture** aktif (React Native'in yeni mimarisi)
- **Shared modül** entegrasyonu mevcut
- **Konum servisleri** için özel izinler gerekli
- **Socket.io** ile gerçek zamanlı iletişim
- **Lottie** animasyonları için özel dosyalar mevcut
