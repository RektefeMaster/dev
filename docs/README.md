# Rektefe - Kapsamlı Araç Servis Platformu

Rektefe, şöförler ve ustalar arasında köprü kuran, modern teknolojilerle geliştirilmiş kapsamlı bir araç servis platformudur. Platform, araç sahiplerinin ihtiyaçlarını ustalarla buluşturan, randevu yönetimi, ödeme sistemi ve gerçek zamanlı iletişim özellikleri sunan tam kapsamlı bir ekosistemdir.

## 🎯 Uygulama Nedir ve Ne İşe Yarar?

### Ana Amaç
Rektefe, araç sahiplerinin (şöförler) araçlarının bakım, onarım, yıkama, çekici gibi ihtiyaçlarını güvenilir ustalarla buluşturan bir platformdur. Uygulama, her iki taraf için de optimize edilmiş ayrı mobil uygulamalar ve güçlü bir backend sistemi sunar.

### Çözülen Problemler
- **Şöförler için:** Güvenilir usta bulma, randevu yönetimi, şeffaf fiyatlandırma
- **Ustalar için:** Müşteri portföyü oluşturma, iş takibi, gelir yönetimi
- **Genel:** Güvenli ödeme, şeffaf iletişim, kalite garantisi

## 🏗️ Platform Mimarisi

### Monorepo Yapısı
Rektefe, **monorepo** yapısında organize edilmiştir:

```
rektefe/
├── rektefe-dv/     # Şöför uygulaması (React Native + Expo)
├── rektefe-us/     # Usta uygulaması (React Native + Expo)  
├── rest-api/       # Backend API (Node.js + Express + TypeScript)
├── shared/         # Ortak kodlar ve bileşenler
└── docs/           # Kapsamlı dokümantasyon
```

## 📱 Uygulama Bileşenleri

### 1. Rektefe-DV (Şöför Uygulaması)
**Hedef Kitle:** Araç sahipleri, şöförler
**Platform:** iOS ve Android

#### Ana Özellikler:
- **🔐 Kimlik Doğrulama:** E-posta/şifre, Google OAuth
- **🚗 Araç Yönetimi:** Araç ekleme, düzenleme, favorileme
- **🔍 Usta Arama:** Konum bazlı, uzmanlık bazlı arama
- **📅 Randevu Sistemi:** Randevu oluşturma, takip, iptal
- **💰 Ödeme Sistemi:** Cüzdan, PayTR entegrasyonu
- **🔄 Çekici Hizmeti:** Acil çekici talebi
- **🚿 Yıkama Hizmeti:** Paket bazlı yıkama randevuları
- **🔧 Bakım/Onarım:** Genel araç bakımı
- **💎 TEFE Puan Sistemi:** Harcama bazlı puan kazanma
- **🔔 Bildirimler:** Push notifications, SMS
- **📊 İstatistikler:** Harcama analizi, geçmiş

#### Teknik Özellikler:
- **Harita Entegrasyonu:** React Native Maps ile konum servisleri
- **QR Kod:** Araç tanımlama ve hızlı işlemler
- **Socket.io:** Gerçek zamanlı iletişim
- **Lottie Animasyonlar:** Kullanıcı deneyimi
- **Offline Desteği:** Temel işlemler offline

### 2. Rektefe-US (Usta Uygulaması)
**Hedef Kitle:** Oto tamirciler, yıkama servisleri, çekici şirketleri
**Platform:** iOS ve Android

#### Ana Özellikler:
- **🔐 Kimlik Doğrulama:** E-posta/şifre, Google OAuth
- **👤 Profil Yönetimi:** Dükkan bilgileri, uzmanlık alanları
- **📅 Randevu Yönetimi:** Gelen talepleri onaylama/reddetme
- **⚙️ İş Takibi:** SERVISTE durumu, parça bekleniyor
- **💰 Fiyat Yönetimi:** İş kalemleri, fiyat artırma
- **💳 Ödeme Takibi:** Ödeme linki oluşturma, onaylama
- **📊 Dashboard:** İstatistikler, kazanç analizi
- **⭐ Rating Sistemi:** Müşteri değerlendirmeleri
- **👥 Müşteri Yönetimi:** Müşteri portföyü, takip
- **🔔 Bildirimler:** Yeni talep, ödeme bildirimleri
- **📈 Raporlama:** Aylık, haftalık raporlar

#### Teknik Özellikler:
- **Worklets:** Performans optimizasyonu
- **Katı TypeScript:** Tip güvenliği
- **Çoklu Path Alias'ları:** Organize kod yapısı
- **Real-time Updates:** Anlık güncellemeler

### 3. REST API (Backend)
**Teknoloji:** Node.js + Express + TypeScript
**Veritabanı:** MongoDB + Redis

#### Ana Modüller:
- **🔐 Auth Service:** JWT, Google OAuth, şifre sıfırlama
- **👤 User Service:** Profil yönetimi, yetenek güncelleme
- **🔧 Mechanic Service:** Usta yönetimi, arama, filtreleme
- **📅 Appointment Service:** Randevu iş akışı, durum yönetimi
- **🚗 Vehicle Service:** Araç CRUD, arama, filtreleme
- **💰 Payment Service:** PayTR entegrasyonu, cüzdan yönetimi
- **💎 TEFE Point Service:** Puan sistemi, kazanım kuralları
- **🔔 Notification Service:** Push, SMS, email bildirimleri
- **📊 Analytics Service:** İstatistikler, raporlama

#### İş Akışları:
1. **Randevu Süreci:** TALEP_EDILDI → PLANLANDI → SERVISTE → ODEME_BEKLIYOR → TAMAMLANDI
2. **Ödeme Süreci:** Fiyat belirleme → Ödeme linki → Onay → TEFE puan kazanımı
3. **Usta Eşleştirme:** Konum + uzmanlık + müsaitlik bazlı algoritma

### 4. Shared (Ortak Modül)
**Amaç:** Kod tekrarını önleme, tutarlılık sağlama

#### İçerik:
- **🔌 API Services:** HTTP client'ları, error handling
- **🧩 UI Components:** Ortak bileşenler, form elemanları
- **🎯 Context Management:** Global state, authentication
- **🛠️ Utilities:** Logger, validation, helpers

## 🚀 Temel İş Akışları

### Şöför Deneyimi
1. **Kayıt/Giriş:** Google OAuth veya e-posta/şifre
2. **Araç Ekleme:** QR kod veya manuel giriş
3. **Usta Arama:** Konum + ihtiyaç bazlı filtreleme
4. **Randevu Oluşturma:** Tarih, saat, açıklama
5. **Ödeme:** Cüzdan veya PayTR ile ödeme
6. **Takip:** Gerçek zamanlı durum güncellemeleri
7. **Değerlendirme:** Ustayı puanlama ve yorumlama

### Usta Deneyimi
1. **Profil Oluşturma:** Dükkan bilgileri, uzmanlık alanları
2. **Talep Alma:** Şöförlerden gelen randevu talepleri
3. **İş Planlama:** Randevuları onaylama, programlama
4. **İş Takibi:** SERVISTE durumu, parça bekleniyor
5. **Fiyat Belirleme:** İş kalemleri, ek masraflar
6. **Ödeme Alma:** PayTR linki oluşturma, onaylama
7. **Müşteri İlişkileri:** Müşteri portföyü, takip

## 💰 Ödeme ve Puan Sistemi

### Ödeme Yöntemleri
- **Rektefe Cüzdanı:** Uygulama içi cüzdan sistemi
- **PayTR Entegrasyonu:** Kredi kartı, banka kartı
- **TEFE Puan:** Harcama bazlı puan sistemi

### TEFE Puan Sistemi
- **Kazanım:** Her harcamada %1-5 oranında puan
- **Kullanım:** İndirim, ücretsiz hizmetler
- **Kategoriler:** Farklı hizmet türlerinde farklı oranlar

## 🔒 Güvenlik ve Kimlik Doğrulama

### Kimlik Doğrulama
- **JWT Tokens:** Güvenli API erişimi
- **Google OAuth:** Kolay giriş seçeneği
- **Şifre Sıfırlama:** E-posta tabanlı güvenlik
- **Session Management:** Otomatik token yenileme

### Veri Güvenliği
- **HTTPS:** Tüm iletişim şifreli
- **MongoDB Security:** Veritabanı erişim kontrolü
- **Input Validation:** Tüm girdiler doğrulanır
- **Rate Limiting:** API kötüye kullanım koruması

## 📊 Analytics ve Raporlama

### Şöför İstatistikleri
- Aylık harcama analizi
- Hizmet türü dağılımı
- TEFE puan kazanım geçmişi
- Favori ustalar

### Usta İstatistikleri
- Aylık kazanç raporu
- Müşteri sayısı ve sadakat
- Hizmet türü performansı
- Rating ve değerlendirme analizi

## 🌐 Teknoloji Stack

### Frontend (Mobil)
- **React Native 0.76.9:** Cross-platform mobil geliştirme
- **Expo SDK 52:** Geliştirme ve deployment kolaylığı
- **TypeScript 5.9.2:** Tip güvenliği ve kod kalitesi
- **React Navigation 7.x:** Navigasyon yönetimi
- **Lottie:** Smooth animasyonlar
- **React Native Maps:** Harita entegrasyonu
- **Socket.io Client:** Gerçek zamanlı iletişim

### Backend
- **Node.js + Express:** Hızlı ve ölçeklenebilir API
- **TypeScript 5.9.2:** Backend tip güvenliği
- **MongoDB + Mongoose:** NoSQL veritabanı
- **Redis:** Önbellekleme ve session yönetimi
- **Socket.io:** Gerçek zamanlı iletişim
- **JWT:** Token tabanlı kimlik doğrulama
- **PayTR:** Ödeme gateway entegrasyonu

### DevOps ve Araçlar
- **PM2:** Production process yönetimi
- **Prettier:** Kod formatlama
- **Detox:** End-to-end testler
- **Jest:** Unit testler
- **Swagger:** API dokümantasyonu

## 📁 Dosya Yapısı Detayları

### Root Seviyesi
- `package.json` - Monorepo bağımlılıkları
- `package-lock.json` - Bağımlılık kilitleme
- `app.json` - Expo monorepo yapılandırması
- `.prettierrc` - Kod formatlama kuralları

### Rektefe-DV (Şöför)
- `src/features/` - Özellik bazlı bileşenler
- `src/navigation/` - Navigasyon yapılandırması
- `src/shared/` - Ortak bileşenler
- `assets/` - Resimler, animasyonlar, sesler
- `e2e/` - End-to-end testler

### Rektefe-US (Usta)
- `src/features/` - Usta özel özellikler
- `src/navigation/` - Usta navigasyonu
- `src/shared/` - Ortak bileşenler
- `assets/` - Usta özel varlıklar

### REST API
- `src/controllers/` - API endpoint handler'ları
- `src/models/` - MongoDB şemaları
- `src/services/` - İş mantığı servisleri
- `src/routes/` - API route tanımları
- `src/middleware/` - Express middleware'leri

### Shared
- `api/` - Ortak API servisleri
- `components/` - Ortak UI bileşenleri
- `context/` - Ortak React context'leri
- `utils/` - Yardımcı fonksiyonlar

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- Node.js 18+
- npm veya yarn
- iOS Simulator (iOS için)
- Android Studio (Android için)
- MongoDB (Backend için)
- Redis (Önbellekleme için)

### Kurulum
```bash
# Projeyi klonla
git clone <repository-url>
cd rektefe

# Bağımlılıkları kur
npm install

# Her modül için ayrı ayrı
cd rektefe-dv && npm install
cd rektefe-us && npm install
cd rest-api && npm install
cd shared && npm install
```

### Çalıştırma
```bash
# Backend API
cd rest-api
npm run dev

# Şöför uygulaması
cd rektefe-dv
npm run ios    # iOS için
npm run android # Android için

# Usta uygulaması
cd rektefe-us
npm run ios    # iOS için
npm run android # Android için
```

## 📚 Detaylı Dokümantasyon

- [Root Seviyesi Dosyalar](./root-files.md) - Ana dizindeki yapılandırma dosyaları
- [Rektefe-DV (Şöför Uygulaması)](./rektefe-dv.md) - Şöför uygulaması detayları
- [Rektefe-US (Usta Uygulaması)](./rektefe-us.md) - Usta uygulaması detayları
- [REST API](./rest-api.md) - Backend API detayları
- [Shared (Ortak Modül)](./shared.md) - Paylaşılan kodlar
- [API Endpoints](./api-endpoints.md) - Tüm endpoint'lerin detaylı listesi

## 🎯 Gelecek Özellikler

### Planlanan Özellikler
- **AI Destekli Usta Önerisi:** Makine öğrenmesi ile akıllı eşleştirme
- **Video Call:** Usta-müşteri arası video görüşme
- **Blockchain:** Güvenli ödeme ve sözleşme sistemi
- **IoT Entegrasyonu:** Araç sensörleri ile otomatik arıza tespiti
- **Multi-language:** Çoklu dil desteği
- **Web Dashboard:** Yönetim paneli

### Teknik İyileştirmeler
- **Microservices:** Backend'i mikroservislere bölme
- **GraphQL:** API optimizasyonu
- **Kubernetes:** Container orchestration
- **CI/CD Pipeline:** Otomatik deployment

## 🤝 Katkıda Bulunma

### Geliştirme Süreci
1. Fork yapın
2. Feature branch oluşturun
3. Değişikliklerinizi commit edin
4. Pull request açın
5. Code review sürecini bekleyin

### Kod Standartları
- TypeScript strict mode
- Prettier ile kod formatlama
- ESLint kurallarına uyum
- Unit test yazma
- Dokümantasyon güncelleme

## 📞 Destek ve İletişim

### Teknik Destek
- GitHub Issues: Bug raporları ve özellik istekleri
- Email: support@rektefe.com
- Dokümantasyon: Bu klasördeki detaylı dokümanlar

### Topluluk
- Discord: Geliştirici topluluğu
- Blog: Teknik yazılar ve güncellemeler
- Newsletter: Haftalık güncellemeler

---

**Rektefe** - Modern teknoloji ile araç servis dünyasını birleştiren, güvenilir ve kullanıcı dostu platform. 🚗✨
