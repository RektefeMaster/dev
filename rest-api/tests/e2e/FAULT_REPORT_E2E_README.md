# E2E Test Kılavuzu - Arıza Bildirimi Sistemi

## 📋 Genel Bakış

Bu dosya, arıza bildirimi sistemı için EN KAPSAMLI E2E testlerini içerir. Her özellik, fonksiyon, akış, buton, UI element detaylı olarak test edilir.

## 🎯 Test Senaryoları

### 1. **TAM AKIŞ TESTI (10 Adım)**
Ana akış testi - Genel Bakım kategorisi ile

Kapsamlı end-to-end akış testi:

1. **Arıza Bildirimi Oluşturma** ✅
   - Vehicle, service category, priority validasyonu
   - Response structure kontrolü
   - Status: `pending` kontrolü

2. **Usta Teklif Verme** ✅
   - Quote amount, duration, notes validasyonu
   - Status: `pending` kontrolü
   - FaultReport quotes array güncelleme

3. **Şöför Teklif Seçimi** ⚠️ **CRITICAL**
   - **RANDEVU OLUŞTURMAMALI** ✅
   - `nextStep: 'create_appointment'` dönmeli ✅
   - FaultReport status: `accepted` ✅
   - `selectedQuote` set edilmeli ✅

4. **Randevu Tarih/Saat Seçimi** ✅
   - `createAppointmentFromFaultReport` çağrılmalı
   - Status: `TALEP_EDILDI`
   - `faultReportId` link'i
   - Çift randevu önleme kontrolü

5. **Usta Randevu Kabulü** ✅
   - Status: `TALEP_EDILDI` → `PLANLANDI`
   - FaultReport sync: `in_progress`
   - Notification gönderme

6. **Usta İşe Başla** ✅
   - Status: `PLANLANDI` → `SERVISTE`
   - FaultReport status değişmez (hala `in_progress`)

7. **Ek Ücret Ekleme ve Onay** ✅
   - `addExtraCharge` endpoint
   - Müşteri onayı
   - `araOnaylar` array güncellemesi

8. **Usta İşi Tamamlama** ✅
   - Status: `SERVISTE` → `ODEME_BEKLIYOR`
   - `finalPrice` hesaplama (base + ek ücretler)
   - FaultReport: `payment_pending`
   - FaultReport.payment oluşturma

9. **Şöför Ödeme Yapma** ✅ **TRANSACTION TEST**
   - MongoDB transaction atomikliği
   - Status: `ODEME_BEKLIYOR` → `TAMAMLANDI`
   - PaymentStatus: `COMPLETED`
   - Wallet debits/credits
   - FaultReport: `paid`
   - TefePuan hesaplama

10. **Şöför Puanlama** ✅
    - Rating kaydetme
    - Mechanic rating güncelleme
    - Rating count güncelleme

### 2. **4 FARKLI HİZMET KATEGORİSİ TESTI**
Her kategori için tam akış (8 adım):
- **Genel Bakım**: Motor ısınma sorunu (800₺, 2 gün)
- **Araç Yıkama**: İç ve dış yıkama (300₺, 2 saat)
- **Lastik**: Lastik değişimi ve balans (1200₺, 1 gün)
- **Çekici**: Araç çekme hizmeti (500₺, 3 saat)

Her kategori için kontrol edilen adımlar:
1. Arıza bildirimi oluşturma
2. Teklif verme
3. Teklif seçimi
4. Randevu oluşturma
5. Usta kabulü
6. İşe başlama
7. İşi tamamlama
8. Ödeme yapma

### 3. **ÇOKLU TEKLIF SENARYOSU**
- Birden fazla teklif gönderme
- Teklif listesi görüntüleme
- Farklı fiyat ve duration karşılaştırma

### 4. **İPTAL SENARYOLARI**
- **Usta Reddi**: Müsait olmadığında reddetme
- **Şöför İptali**: Ödeme öncesi iptal
- Status transition validation

### 5. **MESAJLAŞMA ENTEGRASYONu**
- Şöför ve Usta arası mesajlaşma
- Conversation oluşturma
- `unreadCount` güncelleme
- Message history

### 6. **HATA YÖNETİMİ**
- Geçersiz teklif seçimi
- Yetkisiz kullanıcı erişimi
- Status transition validation
- Geçersiz endpoint parametreleri

### 7. **PERFORMANS TESTLERİ**
- Arıza bildirimi oluşturma: < 1s
- Teklif listesi (5 teklif): < 500ms
- Randevu oluşturma: < 800ms

### 8. **DATA VALIDATION**
- Eksik zorunlu alanlar
- Geçersiz tarih/saat
- Geçersiz priority
- Geçersiz service category

## 🚀 Testleri Çalıştırma

### Gereksinimler

```bash
# 1. Dependencies yükle
cd rest-api
npm install

# 2. MongoDB çalışıyor olmalı
mongod

# 3. Test kullanıcıları oluşturulmalı
npm run create:test-users
```

### Tüm E2E Testleri

```bash
npm run test:e2e
```

### Sadece Arıza Bildirimi Testleri

```bash
npm run test:e2e -- fault-report-comprehensive
```

### Watch Mode

```bash
npm run test:e2e:watch
```

### Verbose Output

```bash
npm run test:e2e -- --verbose fault-report-comprehensive
```

## 📊 Test Verileri

### Test Kullanıcıları

- **Driver**: `testdv@gmail.com` / `test123`
- **Mechanic**: `testus@gmail.com` / `test123`

### Test Araç

- **Brand**: Toyota
- **Model**: Corolla
- **Segment**: B
- **Plate**: 34 E2E TEST
- **Year**: 2020

### Test Wallet Balances

- **Driver**: 10,000 TL
- **Mechanic**: 0 TL

## ✅ Başarı Kriterleri

### Akış Kriterleri

- ✅ **Çift Randevu Önleme**: selectQuote randevu OLUŞTURMAMALI
- ✅ **Status Transitions**: Tüm geçişler valid olmalı
- ✅ **Transaction Atomikliği**: MongoDB session kullanılmalı
- ✅ **Wallet Sync**: Debit/credit tutarlı olmalı
- ✅ **FaultReport Sync**: Appointment status değişince senkronize olmalı

### UI/UX Kriterleri

- ✅ Response structure tutarlı
- ✅ Error messages açıklayıcı
- ✅ Loading states doğru
- ✅ Notification timing uygun

### Performans Kriterleri

- ✅ Arıza oluşturma: < 1s
- ✅ Teklif listesi: < 500ms
- ✅ Randevu işlemleri: < 800ms
- ✅ Wallet transaction: < 200ms

### Güvenlik Kriterleri

- ✅ JWT token validation
- ✅ Role-based access control
- ✅ Input validation
- ✅ SQL injection koruması (MongoDB)

## 📝 Test Logları

Her test adımında detaylı loglama yapılır:

```
🔌 MongoDB bağlantısı: mongodb://localhost:27017/rektefe
🔍 Test kullanıcıları:
   Driver: testdv@gmail.com ✅
   Mechanic: testus@gmail.com ✅
✅ Test hazırlığı tamamlandı
✅ Arıza bildirimi oluşturuldu: <id>
✅ Usta teklif verdi: 800 ₺
✅ Teklif seçildi, randevu OLUŞTURULMADI: create_appointment
✅ Randevu oluşturuldu: <id>
✅ Usta randevuyu kabul etti
✅ Usta işe başladı
✅ Ek ücret eklendi ve onaylandı
✅ Usta işi tamamladı, finalPrice: 1000
✅ Ödeme tamamlandı, transaction başarılı
✅ Puanlama tamamlandı: 5 yıldız
✅ Test verileri temizlendi
```

## 🐛 Bilinen Sorunlar

### Şu anda Yok

Test kodunda bilinen kritik sorun yok. Tüm bug'lar düzeltildi.

## 🔄 Güncelleme Logları

### 2024-01-XX - İlk Sürüm

- ✅ Tam akış testi (10 adım)
- ✅ Çoklu teklif senaryosu
- ✅ İptal senaryoları
- ✅ Mesajlaşma entegrasyonu
- ✅ Hata yönetimi
- ✅ Performans testleri
- ✅ Data validation

## 📚 İlgili Dokümanlar

- [SISTEM_KONTROL_FINAL.md](../../docs/SISTEM_KONTROL_FINAL.md)
- [ARIZA_BILDIRIMI_AKIS_KONTROL.md](../../docs/ARIZA_BILDIRIMI_AKIS_KONTROL.md)
- [E2E Test README](./README.md)
- [Wash E2E Tests](./wash.e2e.test.ts)

## 🤝 Katkıda Bulunma

Yeni test senaryoları eklerken:

1. Test case'i bu README'ye ekleyin
2. Başarı kriterlerini tanımlayın
3. Test verilerini dokümante edin
4. Log çıktıları için template kullanın

## 📞 Destek

Test hataları için:
1. Log çıktılarını kontrol edin
2. MongoDB bağlantısını kontrol edin
3. Test kullanıcılarını kontrol edin
4. Environment variables kontrol edin

```bash
# Test kullanıcılarını yeniden oluştur
npm run create:test-users

# MongoDB connection test
mongo mongodb://localhost:27017/rektefe

# Environment variables
echo $MONGODB_URI
echo $JWT_SECRET
```
