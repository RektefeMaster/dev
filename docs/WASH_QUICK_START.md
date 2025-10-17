# Araç Yıkama Modülü - Hızlı Başlangıç Kılavuzu

## Sistem Gereksinimleri

- Backend çalışıyor olmalı
- MongoDB bağlantısı aktif
- İki kullanıcı hesabı gerekli:
  - 1 Sürücü hesabı (userType: "şöför")
  - 1 Usta hesabı (userType: "usta")

## Adım 1: Backend'i Başlat

```bash
cd rest-api
npm install
npm run dev
```

Backend çalıştığında göreceksiniz:
```
✅ MongoDB bağlantısı başarılı
🚀 Server http://localhost:3000 adresinde çalışıyor
```

## Adım 2: Usta Hesabı ile İşletme Kurulumu

### 2.1 Usta Uygulamasını Başlat

```bash
cd rektefe-us
npm install
npm run ios  # veya npm run android
```

### 2.2 Usta Hesabı ile Giriş Yap

- Kayıt ol veya login ol (userType: "usta")

### 2.3 İşletme Ayarlarını Yap

1. **Yıkama Hizmetleri** ekranına git
2. **Ayarlar** (⚙️) butonuna tıkla (sağ üstte)
3. **İşletme bilgilerini** gir:
   - İşletme Adı: "Parlak Oto Yıkama"
   - Adres, Şehir, İlçe
4. **Hizmet Tipi** seç:
   - Sadece İstasyon
   - Sadece Mobil
   - veya Her İkisi
5. **Shop ayarları** (eğer shop seçtiyseniz):
   - Saat başına kapasite: 8
   - Hat sistemi kullan: AÇIK (opsiyonel)
   - Hat sayısı: 2
6. **Mobil ayarları** (eğer mobil seçtiyseniz):
   - Maksimum mesafe: 20 km
   - Ekipman seçenekleri
7. **KAYDET**

### 2.4 İlk Paketinizi Oluşturun

1. **Yıkama Hizmetleri** → **Paketler** tab
2. **Yeni Paket Yönetim Ekranı** butonuna tıkla
3. **+** butonuna tıkla (sağ üstte)
4. Paket bilgilerini girin:
   - Ad: "Standart İç-Dış Yıkama"
   - Açıklama: "Dış yıkama + İç temizlik + Vakum"
   - Paket Tipi: **Standart** seçin
   - Fiyat: 100 TL (A segment için)
   - Süre: 45 dakika
   - Kullanılabilir Alan: **Her İkisi**

5. **Hizmetler Ekleyin:**
   - "+" butonuna tıkla
   - Hizmet Adı: "Dış Yıkama", Kategori: **Dış Temizlik**
   - Hizmet Adı: "Vakumlama", Kategori: **İç Temizlik**
   - Hizmet Adı: "İç Temizlik", Kategori: **İç Temizlik**
   - Hizmet Adı: "Cam Temizliği", Kategori: **Dış Temizlik**

6. **Ekstra Hizmetler (Opsiyonel):**
   - "+" butonuna tıkla
   - Ad: "Motor Temizliği"
   - Açıklama: "Motor bölmesi detaylı temizlik"
   - Fiyat: 50 TL
   - Süre: 20 dakika

7. **Paketi Oluştur** butonuna tıklayın

✅ İlk paketiniz hazır!

## Adım 3: Sürücü ile Sipariş Oluşturma

### 3.1 Sürücü Uygulamasını Başlat

```bash
cd rektefe-dv
npm install
npm run ios  # veya npm run android
```

### 3.2 Sürücü Hesabı ile Giriş Yap

- Kayıt ol veya login ol (userType: "şöför")

### 3.3 Garajınıza Araç Ekleyin

1. **Garaj** ekranına gidin
2. **+** butonuna tıklayın
3. Araç bilgilerini girin:
   - Marka: Toyota
   - Model: Corolla
   - Yıl: 2020
   - Plaka: 34ABC123
4. **Kaydet**

### 3.4 Yıkama Siparişi Oluşturun

1. **Ana Sayfa** → **Araç Yıkama** kartına tıklayın

2. **Adım 1 - Araç Seçimi:**
   - "Araç Seçin" butonuna tıklayın
   - Garajınızdan aracı seçin
   - Segment otomatik belirlenecek (B segment)
   - "Devam Et"

3. **Adım 2 - Paket Seçimi:**
   - Oluşturduğunuz "Standart İç-Dış Yıkama" paketini seçin
   - İsterseniz ekstra hizmet ekleyin (Motor Temizliği +50 TL)
   - "Devam Et"

4. **Adım 3 - Tip Seçimi:**
   - **İstasyonda Yıkama** veya **Mobil Yıkama** seçin
   - İşletme listesinden ustanızı seçin
   - "Devam Et"

5. **Adım 4 - Zamanlama:**
   - **Shop için:** Tarih seçin (örn: Yarın), Saat seçin (örn: 10:00)
   - **Mobil için:** Adres girin, Zaman penceresi seçin (örn: 14:00-16:00)
   - "Devam Et"

6. **Adım 5 - Ödeme:**
   - Fiyat özetini kontrol edin
   - **TEST MODU** uyarısını görün
   - TefePuan kullanın (varsa)
   - Test kart bilgilerini girin:
     ```
     Kart No: 4111111111111111
     Ad Soyad: TEST USER
     Ay: 12
     Yıl: 25
     CVV: 123
     ```
   - **Siparişi Oluştur**

7. **Sipariş Oluşturuldu!**
   - "Siparişi Takip Et" → Tracking ekranına git
   - veya "Ana Sayfaya Dön"

## Adım 4: Usta ile İşi Yönetin

### 4.1 Usta Uygulamasına Geçin

1. **Yıkama Hizmetleri** → **İşler** tab
2. **Detaylı İş Yönetimi** butonuna tıklayın
3. **Yeni Talep** filtresini seçin
4. Gelen siparişi görün

### 4.2 İşi Kabul Edin

1. Siparişe tıklayın → Detay ekranı açılır
2. Müşteri ve araç bilgilerini kontrol edin
3. **İşi Kabul Et** butonuna tıklayın
4. Durum: "Kabul Edildi" olur

### 4.3 Check-in Yapın (Shop için)

1. Müşteri geldiğinde
2. **Check-in Yap** butonuna tıklayın
3. Durum: "Giriş Yapıldı" olur

### 4.4 İşi Başlatın

1. **İşlemi Başlat** butonuna tıklayın
2. İş adımları checklist görünür
3. Durum: "İşlemde" olur

### 4.5 Adımları Tamamlayın

Her adım için:
1. Adımın yanındaki **Tamamla** butonuna tıklayın
2. Not eklemek isterseniz girin (opsiyonel)
3. Adım tamamlanır, sonraki adım otomatik başlar

Örnek adımlar:
- ✅ Köpükleme → Tamamla
- ✅ Durulama → Tamamla  
- ✅ Kurulama → Tamamla
- ✅ Vakumlama → Tamamla
- ✅ İç Temizlik → Tamamla
- ✅ Cam Temizliği → Tamamla
- ✅ Son Kontrol → Tamamla

### 4.6 Kalite Kontrol Gönderin

1. Tüm adımlar tamamlanınca **Kalite Kontrol Gönder** butonu görünür
2. Tıklayın → QA modal açılır
3. **Öncesi Fotoğrafları** çekin (6 açı):
   - Ön
   - Arka
   - Sol
   - Sağ
   - İç Ön
   - İç Arka
4. **Sonrası Fotoğrafları** çekin (aynı 6 açı)
5. **Kalite Kontrol Gönder** butonuna tıklayın
6. Durum: "Kalite Kontrolü Bekliyor" olur

## Adım 5: Sürücü ile QA Onaylama

### 5.1 Sürücü Uygulamasına Geçin

1. Tracking ekranını açın (zaten açıksa otomatik güncellenecek)
2. **Kalite Kontrolü Bekliyor** durumunu görün
3. Bildirim: "İşlem tamamlandı! Fotoğrafları kontrol edin"

### 5.2 Fotoğrafları Kontrol Edin

1. **Öncesi Fotoğraflarına** tıklayın → 6 fotoğrafı görün
2. **Sonrası Fotoğraflarına** tıklayın → 6 fotoğrafı görün
3. Karşılaştırın

### 5.3 Onaylayın veya Düzeltin

**Seçenek 1: Onayla**
- **Onayla** butonuna tıklayın
- ✅ Ödeme otomatik çekilir (TEST MODU - mock)
- Durum: "Ödeme Yapıldı" olur
- Başarılı mesajı görünür

**Seçenek 2: Düzeltme İste**
- **Düzeltme İste** butonuna tıklayın
- Neyin düzeltilmesini istediğinizi yazın
- Usta bilgilendirilir
- İş tekrar "İşlemde" durumuna döner

**Seçenek 3: İtiraz Et**
- **İtiraz Et** butonuna tıklayın (gelecek özellik)
- Ödeme dondurulur
- Admin incelemesi başlar

## 🎯 Önemli Noktalar

### Mock Veri KULLANILMAZ

❌ **Yapılmayan:**
- Mock paket listesi
- Hardcoded fiyatlar
- Dummy işletmeler
- Test müşterileri
- Fake siparişler

✅ **Yapılan:**
- Usta gerçek paketlerini oluşturur (UI'dan)
- Fiyatlar dinamik hesaplanır (segment, yoğunluk, mesafe)
- Provider listesi gerçek kayıtlı işletmelerdir
- Siparişler gerçek veritabanına kaydedilir
- Araçlar kullanıcı garajından gelir

### Sadece ÖDEME Mock

⚠️ **TEST MODU - Escrow Ödeme:**
- Gerçek para çekilmez
- Tüm kartlar kabul edilir
- İşlem simüle edilir
- Transaction logları tutulur
- UI'da "TEST MODU" badge'i gösterilir

## 🔧 İlk Kurulum Kontrol Listesi

- [ ] Backend çalışıyor (`npm run dev`)
- [ ] MongoDB bağlı
- [ ] Usta hesabı oluşturuldu
- [ ] Sürücü hesabı oluşturuldu
- [ ] Usta: İşletme ayarları yapıldı
- [ ] Usta: En az 1 paket oluşturuldu
- [ ] Sürücü: En az 1 araç eklendi
- [ ] Test siparişi oluşturuldu
- [ ] Usta: Sipariş kabul edildi
- [ ] İş adımları tamamlandı
- [ ] QA gönderildi
- [ ] Sürücü: QA onaylandı
- [ ] Ödeme tamamlandı (mock)

## ⚠️ Sık Karşılaşılan Sorunlar

### "İşletme henüz paket oluşturmamış"

**Sebep:** Seçtiğiniz usta henüz paket oluşturmamış  
**Çözüm:** 
1. Usta uygulamasıyla giriş yapın
2. Paket yönetim ekranından paket oluşturun
3. Sürücü uygulamasında tekrar deneyin

### "providerId parametresi gerekli"

**Sebep:** API'ye provider seçilmeden istek atılıyor  
**Çözüm:** Önce işletme seçin, sonra paketler yüklenecek

### "Yakınınızda işletme bulunamadı"

**Sebep:** Henüz WashProvider kaydı yok  
**Çözüm:** 
1. Usta uygulamasından "İşletme Ayarları"nı tamamlayın
2. WashProvider kaydı otomatik oluşturulacak

### Fotoğraflar görünmüyor

**Sebep:** Local URI, storage entegrasyonu henüz yok  
**Durum:** Normal, ileriki versiyonda eklenecek

## 🎬 Demo Akışı (5 Dakika)

### Hazırlık (2 dk)
1. Backend başlat
2. US app başlat, usta ile login
3. İşletme ayarlarını yap
4. 1 paket oluştur

### Ana Akış (3 dk)
1. DV app başlat, sürücü ile login
2. Garajdan araç seç
3. Paket seç
4. İşletme seç
5. Slot seç
6. TEST kartla ödeme
7. Sipariş oluştur

8. US app'e geç
9. İşi kabul et
10. Check-in yap
11. İşi başlat
12. Adımları tamamla
13. QA gönder

14. DV app'e geç
15. QA onayla
16. ✅ Tamamlandı!

## 📱 Ekran Ekran Görsel Akış

```
SÜRÜCÜ APP:
Home → Araç Yıkama
  ↓
[1] Araç Seçin (garaj modal)
  ↓
[2] Paket Seçin (horizontal scroll kartları)
  ↓
[3] Tip Seçin (shop vs mobil kartları)
  ↓
[4] Zamanlama (slot takvimi veya zaman penceresi)
  ↓
[5] Ödeme (fiyat breakdown + TEST kart formu)
  ↓
Sipariş Oluşturuldu → Tracking Ekranı

USTA APP:
Yıkama Hizmetleri → Paketler
  ↓
Yeni Paket Yönetim Ekranı
  ↓
+ → Paket Oluştur Form
  ↓
Paket Kaydedildi

---

Yıkama Hizmetleri → İşler
  ↓
Detaylı İş Yönetimi
  ↓
Yeni Talep → İş Detayı
  ↓
İşi Kabul Et
  ↓
Check-in Yap
  ↓
İşlemi Başlat
  ↓
Adımları Tamamla (checklist)
  ↓
Kalite Kontrol Gönder (foto modal)
  ↓
Müşteri Onayı Bekle
  ↓
✅ Ödeme Alındı
```

## 💡 İpuçları

1. **Paket Fiyatları:** A segment için temel fiyat girin, diğer segmentler otomatik hesaplanır
2. **Slot Yönetimi:** Hat sistemi kullanırsanız daha detaylı yönetim yapabilirsiniz
3. **Mobil Hizmet:** Ekipman bilgilerini eksiksiz girin
4. **QA Fotoğrafları:** Net ve aynı açılardan çekin
5. **TefePuan:** Maksimum %50 kullanabilirsiniz

## 🔍 Veri Kontrolü

### MongoDB'de Kontrol

```javascript
// Paketleri kontrol et
db.washpackages.find({ providerId: "USTA_USER_ID" })

// Siparişleri kontrol et
db.washorders.find({ driverId: "DRIVER_USER_ID" })

// Provider'ları kontrol et
db.washproviders.find({ userId: "USTA_USER_ID" })
```

### API ile Kontrol

```bash
# Kendi paketlerimi getir (usta)
curl -H "Authorization: Bearer USTA_TOKEN" \
  http://localhost:3000/api/wash/my-packages

# Siparişlerimi getir (sürücü)
curl -H "Authorization: Bearer DRIVER_TOKEN" \
  http://localhost:3000/api/wash/my-orders
```

---

**Tüm veriler gerçektir, sadece ödeme mock'tur!** 💳✨

