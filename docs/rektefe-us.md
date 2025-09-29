# Rektefe-US (Usta Uygulaması)

Ustalar için geliştirilmiş React Native mobil uygulaması.

## 📁 Klasör Yapısı

```
rektefe-us/
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
- `react-native-worklets` - Performans optimizasyonu
- `expo-location` - Konum servisleri
- `lottie-react-native` - Animasyonlar

**Script'ler:**
```json
{
  "start": "expo start",
  "android": "expo start --android", 
  "ios": "expo start --ios",
  "web": "expo start --web"
}
```

### `app.json`
**Amaç:** Expo uygulama yapılandırması
**Ne Zaman Kullanılır:** Build ve deployment sırasında
**Önemli Ayarlar:**
- **Bundle ID:** `com.rektefe.us`
- **App Name:** `RektefeUS`
- **Scheme:** `rektefeus`
- **New Architecture:** Aktif
- **Daha basit yapılandırma** (DV'ye göre daha az permission)

### `babel.config.js`
**Amaç:** JavaScript transpilation yapılandırması
**Ne Zaman Kullanılır:** Kod derleme sırasında
**Özellikler:**
- React Native Reanimated plugin
- React Native Worklets plugin (performans için)
- Module resolver ile çoklu alias'lar:
  - `@` → `./src`
  - `@shared` → `./src/shared`
  - `@features` → `./src/features`

### `metro.config.js`
**Amaç:** Metro bundler yapılandırması
**Ne Zaman Kullanılır:** Bundle oluşturma sırasında
**Özellikler:**
- Tüm platform desteği (`ios`, `android`, `native`, `web`)
- `.cjs` dosya uzantısı desteği
- DV'ye göre daha basit yapılandırma

### `tsconfig.json`
**Amaç:** TypeScript derleyici yapılandırması
**Ne Zaman Kullanılır:** Type checking ve derleme sırasında
**Önemli Ayarlar:**
- **Target:** `esnext`
- **Strict:** `true` (katı tip kontrolü)
- **Lib:** `dom`, `esnext`
- **Çoklu path alias'ları:**
  - `@/*` → `src/*`
  - `@shared/*` → `src/shared/*`
  - `@features/*` → `src/features/*`

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
- `rektefe-us-release.keystore` - Release imzalama anahtarı
- Native modül entegrasyonları

### `ios/`
**Amaç:** iOS native kodları ve yapılandırmaları
**İçerik:**
- `RektefeUS.xcodeproj` - Xcode proje dosyası
- `Podfile` - CocoaPods bağımlılıkları
- Native modül entegrasyonları
- iOS-specific yapılandırmalar

## 🎨 Assets Klasörü

**Amaç:** Statik dosyalar ve medya içerikleri
**İçerik:**
- **Resimler:** `icon.png`, `splash-icon.png`, `adaptive-icon.png`
- **Sesler:** `notification.wav`
- **Daha minimal** asset yapısı (DV'ye göre daha az dosya)

## 🧪 E2E Testler

### `e2e/` Klasörü
**Amaç:** End-to-end test senaryoları
**Test Dosyaları:**
- `mechanic-home.e2e.ts` - Usta ana ekran testleri
- Diğer test dosyaları DV'ye göre daha az

## 💻 Kaynak Kodlar

### `src/` Klasörü
**Amaç:** Ana uygulama kodları
**Alt Klasörler:**
- `features/` - Özellik bazlı bileşenler
- `shared/` - Ortak bileşenler ve yardımcılar
- `navigation/` - Navigasyon yapılandırması
- `constants/` - Sabitler ve yapılandırmalar

## 🔄 DV ile Farklar

### Yapılandırma Farkları:
1. **Daha az bağımlılık** (DV'de 56, US'de 37 dependency)
2. **Daha basit app.json** (daha az permission)
3. **Worklets desteği** (performans optimizasyonu)
4. **Katı TypeScript** (strict: true)
5. **Çoklu path alias'ları** (daha organize kod yapısı)

### Özellik Farkları:
1. **Harita entegrasyonu yok** (DV'de var)
2. **QR kod desteği yok** (DV'de var)
3. **Daha az animasyon dosyası**
4. **Socket.io yok** (DV'de var)

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

- **Expo SDK 52** kullanılıyor
- **New Architecture** aktif
- **Worklets** ile performans optimizasyonu
- **Katı TypeScript** kullanımı
- **Daha minimal** yapı (DV'ye göre)
- **Organize kod yapısı** (çoklu alias'lar)
- **Usta odaklı** özellikler
