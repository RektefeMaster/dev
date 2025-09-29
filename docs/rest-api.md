# REST API (Backend)

Rektefe ekosistemi için Node.js tabanlı backend API servisi.

## 📁 Klasör Yapısı

```
rest-api/
├── config/            # Yapılandırma dosyaları
├── src/              # Ana kaynak kodları
│   ├── config/       # Uygulama yapılandırmaları
│   ├── controllers/  # API controller'ları
│   ├── middleware/   # Express middleware'leri
│   ├── models/       # MongoDB modelleri
│   ├── routes/       # API route'ları
│   ├── services/     # İş mantığı servisleri
│   ├── types/        # TypeScript tip tanımları
│   ├── utils/        # Yardımcı fonksiyonlar
│   └── validators/   # Veri doğrulama
├── tests/            # Test dosyaları
├── uploads/          # Yüklenen dosyalar
└── [config files]   # Yapılandırma dosyaları
```

## 📄 Yapılandırma Dosyaları

### `package.json`
**Amaç:** Proje bağımlılıkları ve script'leri
**Ne Zaman Kullanılır:** Geliştirme, build ve deployment sırasında
**Önemli Bağımlılıklar:**
- `express: ^4.18.2` - Web framework
- `mongoose: ^8.0.0` - MongoDB ODM
- `socket.io: ^4.7.4` - Gerçek zamanlı iletişim
- `jsonwebtoken: ^9.0.2` - JWT kimlik doğrulama
- `bcryptjs: ^2.4.3` - Şifre hashleme
- `redis: ^4.6.10` - Önbellekleme
- `cloudinary: ^1.41.0` - Medya yönetimi
- `swagger-ui-express: ^5.0.0` - API dokümantasyonu

**Script'ler:**
```json
{
  "build": "tsc",
  "start": "node dist/index.js",
  "dev": "ts-node-dev --respawn --transpile-only -r dotenv/config src/index.ts"
}
```

### `tsconfig.json`
**Amaç:** TypeScript derleyici yapılandırması
**Ne Zaman Kullanılır:** Kod derleme ve type checking sırasında
**Önemli Ayarlar:**
- **Target:** `es2016`
- **Module:** `commonjs`
- **OutDir:** `./dist`
- **Strict:** `true` (katı tip kontrolü)
- **TypeRoots:** `./src/types`, `./node_modules/@types`

### `ecosystem.config.js`
**Amaç:** PM2 process manager yapılandırması
**Ne Zaman Kullanılır:** Production deployment sırasında
**Özellikler:**
- **Cluster mode:** Maksimum CPU kullanımı
- **Auto restart:** Hata durumunda otomatik yeniden başlatma
- **Memory limit:** 1GB bellek limiti
- **Logging:** Detaylı log yönetimi
- **Health checks:** Sistem sağlık kontrolü

### `jest.config.js`
**Amaç:** Test framework yapılandırması
**Ne Zaman Kullanılır:** Unit ve integration testleri çalıştırırken
**Özellikler:**
- **Test Environment:** Node.js
- **Test Match:** `**/tests/**/*.test.js`
- **Timeout:** 30 saniye
- **Setup Files:** Test öncesi hazırlık

## 🏗️ Kaynak Kod Yapısı

### `src/config/`
**Amaç:** Uygulama yapılandırmaları
**İçerik:**
- Database bağlantı ayarları
- JWT secret'ları
- Redis yapılandırması
- Environment variables

### `src/controllers/`
**Amaç:** API endpoint handler'ları
**İçerik:**
- HTTP request/response işlemleri
- Business logic çağrıları
- Error handling
- 14 farklı controller dosyası

### `src/middleware/`
**Amaç:** Express middleware'leri
**İçerik:**
- Authentication middleware
- Authorization middleware
- Error handling middleware
- Request validation middleware
- 7 farklı middleware dosyası

### `src/models/`
**Amaç:** MongoDB veritabanı modelleri
**İçerik:**
- Mongoose schema tanımları
- Veri validasyon kuralları
- Model ilişkileri
- 14 farklı model dosyası

### `src/routes/`
**Amaç:** API route tanımları
**İçerik:**
- RESTful endpoint'ler
- Route parametreleri
- Middleware bağlantıları
- 27 farklı route dosyası

### `src/services/`
**Amaç:** İş mantığı servisleri
**İçerik:**
- Business logic implementasyonu
- External API entegrasyonları
- Data processing
- 14 farklı service dosyası

### `src/types/`
**Amaç:** TypeScript tip tanımları
**İçerik:**
- Interface'ler
- Type alias'ları
- Generic type'lar
- 5 farklı type dosyası

### `src/utils/`
**Amaç:** Yardımcı fonksiyonlar
**İçerik:**
- Utility functions
- Helper methods
- Common operations
- 4 farklı util dosyası

### `src/validators/`
**Amaç:** Veri doğrulama
**İçerik:**
- Joi validation schemas
- Input sanitization
- Data validation rules
- 6 farklı validator dosyası

## 🧪 Test Yapısı

### `tests/` Klasörü
**Amaç:** Test dosyaları
**Test Türleri:**
- `api-integration.test.js` - API entegrasyon testleri
- `comprehensive-api.test.js` - Kapsamlı API testleri
- `real-endpoints.test.js` - Gerçek endpoint testleri
- `simple-api.test.js` - Basit API testleri
- `setup.js` - Test kurulum dosyası

## 📁 Diğer Dosyalar

### `config/production.js`
**Amaç:** Production ortamı yapılandırması
**Ne Zaman Kullanılır:** Production deployment sırasında

### `package.production.json`
**Amaç:** Production bağımlılıkları
**Ne Zaman Kullanılır:** Production build sırasında

### `get-token.js`
**Amaç:** JWT token alma script'i
**Ne Zaman Kullanılır:** Test ve debug amaçlı

### `update-mechanic-categories.js`
**Amaç:** Usta kategorilerini güncelleme script'i
**Ne Zaman Kullanılır:** Veritabanı güncellemeleri sırasında

## 🚀 Çalıştırma Komutları

```bash
# Development mode
npm run dev

# Production build
npm run build

# Production start
npm start

# Testleri çalıştır
npm test

# PM2 ile production start
pm2 start ecosystem.config.js --env production

# PM2 ile restart
pm2 restart rektefe-api

# PM2 ile stop
pm2 stop rektefe-api
```

## 🔧 Önemli Özellikler

### Teknoloji Stack:
- **Node.js** + **Express.js**
- **MongoDB** + **Mongoose**
- **Socket.io** (gerçek zamanlı iletişim)
- **Redis** (önbellekleme)
- **JWT** (kimlik doğrulama)
- **Cloudinary** (medya yönetimi)
- **Swagger** (API dokümantasyonu)

### Güvenlik:
- **Helmet** (güvenlik headers)
- **CORS** (cross-origin requests)
- **JWT** (token-based auth)
- **bcrypt** (şifre hashleme)
- **Input validation** (Joi)

### Performans:
- **PM2 Cluster** (multi-process)
- **Redis caching**
- **Compression** (gzip)
- **Connection pooling**

## 📝 Önemli Notlar

- **TypeScript** ile tam tip güvenliği
- **PM2** ile production process yönetimi
- **Swagger** ile otomatik API dokümantasyonu
- **Socket.io** ile gerçek zamanlı özellikler
- **MongoDB** ile NoSQL veri yönetimi
- **Redis** ile performans optimizasyonu
- **Cloudinary** ile medya yönetimi
- **Jest** ile kapsamlı test coverage
