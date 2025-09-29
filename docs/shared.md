# Shared (Ortak Modül)

Rektefe ekosistemindeki tüm projeler tarafından kullanılan ortak kodlar ve bileşenler.

## 📁 Klasör Yapısı

```
shared/
├── api/              # Ortak API servisleri
├── components/       # Ortak UI bileşenleri
├── context/          # Ortak React context'leri
├── utils/            # Ortak yardımcı fonksiyonlar
├── index.ts          # Ana export dosyası
└── package.json       # Modül yapılandırması
```

## 📄 Yapılandırma Dosyaları

### `package.json`
**Amaç:** Shared modül yapılandırması
**Ne Zaman Kullanılır:** Modül yönetimi ve bağımlılık kontrolü
**Önemli Ayarlar:**
```json
{
  "name": "@rektefe/shared",
  "version": "1.0.0",
  "description": "Shared components and utilities for Rektefe ecosystem",
  "main": "index.ts",
  "peerDependencies": {
    "react": "^18.0.0",
    "react-native": "^0.76.0"
  }
}
```

**Script'ler:**
```json
{
  "build": "tsc",
  "type-check": "tsc --noEmit"
}
```

### `index.ts`
**Amaç:** Tüm ortak modülleri dışa aktaran ana dosya
**Ne Zaman Kullanılır:** Diğer projelerden import edilirken
**İçerik:**
```typescript
// Shared Components
export * from './components';

// Shared API Services
export * from './api';

// Shared Context
export * from './context';
```

## 🔌 API Servisleri

### `api/` Klasörü
**Amaç:** Ortak API servisleri ve HTTP client'ları
**İçerik:**
- `BaseApiService.ts` - Temel API servis sınıfı
- `DriverApiService.ts` - Şöför API servisleri
- `MechanicApiService.ts` - Usta API servisleri

**Ne Zaman Kullanılır:**
- HTTP istekleri yaparken
- API endpoint'lerine erişim sağlarken
- Ortak API mantığını paylaşırken

**Özellikler:**
- Ortak HTTP client yapılandırması
- Error handling
- Request/response interceptors
- Authentication token yönetimi

## 🧩 UI Bileşenleri

### `components/` Klasörü
**Amaç:** Ortak UI bileşenleri ve widget'ları
**İçerik:**
- 5 farklı bileşen dosyası
- 3 TypeScript dosyası (.ts)
- 2 React bileşen dosyası (.tsx)

**Ne Zaman Kullanılır:**
- Her iki uygulamada da kullanılan UI elementleri
- Tutarlı tasarım sistemi sağlamak için
- Kod tekrarını önlemek için

**Örnek Bileşenler:**
- Ortak butonlar
- Form elemanları
- Loading indicator'ları
- Modal'lar
- List item'ları

## 🎯 Context Yönetimi

### `context/` Klasörü
**Amaç:** Ortak React context'leri ve state yönetimi
**İçerik:**
- 1 context dosyası (.tsx)

**Ne Zaman Kullanılır:**
- Global state yönetimi için
- Ortak veri paylaşımı için
- Authentication state'i için
- Theme yönetimi için

**Özellikler:**
- Ortak state management
- Context provider'ları
- Custom hooks
- Type-safe context

## 🛠️ Yardımcı Fonksiyonlar

### `utils/` Klasörü
**Amaç:** Ortak yardımcı fonksiyonlar ve araçlar
**İçerik:**
- `Logger.ts` - Loglama sistemi

**Ne Zaman Kullanılır:**
- Ortak utility fonksiyonları için
- Loglama işlemleri için
- Veri dönüştürme işlemleri için
- Validation fonksiyonları için

**Özellikler:**
- Centralized logging
- Error handling utilities
- Data transformation helpers
- Common validation functions

## 🔄 Kullanım Senaryoları

### Rektefe-DV'de Kullanım:
```typescript
import { DriverApiService, SharedButton, AuthContext } from '@rektefe/shared';

// API servisi kullanımı
const driverService = new DriverApiService();

// Ortak bileşen kullanımı
<SharedButton title="Kaydet" onPress={handleSave} />

// Context kullanımı
const { user, login } = useContext(AuthContext);
```

### Rektefe-US'de Kullanım:
```typescript
import { MechanicApiService, SharedModal, Logger } from '@rektefe/shared';

// API servisi kullanımı
const mechanicService = new MechanicApiService();

// Ortak bileşen kullanımı
<SharedModal visible={isVisible} onClose={handleClose} />

// Logger kullanımı
Logger.info('Usta giriş yaptı');
```

## 🏗️ Build ve Geliştirme

### TypeScript Build:
```bash
# Type checking
npm run type-check

# Build
npm run build
```

### Diğer Projelerde Kullanım:
```bash
# DV projesinde
cd rektefe-dv
npm install ../shared

# US projesinde  
cd rektefe-us
npm install ../shared
```

## 📦 Modül Yapısı

### Peer Dependencies:
- **React 18.0.0+** - React framework
- **React Native 0.76.0+** - React Native platform

### Dev Dependencies:
- **TypeScript 5.9.2** - Type checking
- **@types/react** - React type definitions
- **@types/react-native** - React Native type definitions

## 🎯 Faydaları

### Kod Tekrarını Önler:
- Ortak bileşenler tek yerden yönetilir
- API servisleri merkezi olarak kontrol edilir
- Utility fonksiyonlar paylaşılır

### Tutarlılık Sağlar:
- Aynı UI bileşenleri her iki uygulamada da kullanılır
- Ortak tasarım sistemi
- Tutarlı API kullanımı

### Bakım Kolaylığı:
- Değişiklikler tek yerden yapılır
- Bug fix'ler tüm projelere yansır
- Versiyon kontrolü kolaylaşır

## 📝 Önemli Notlar

- **Monorepo yapısı** içinde çalışır
- **TypeScript** ile tam tip güvenliği
- **Peer dependencies** ile React/RN uyumluluğu
- **Modüler yapı** ile kolay genişletilebilirlik
- **Version management** ile kontrollü güncellemeler
- **Tree shaking** ile optimize bundle boyutu
