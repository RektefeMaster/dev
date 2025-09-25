# 🔗 ORTAK ENDPOINT SİSTEMİ

## 📋 Endpoint Mapping Tablosu

### 🎯 **HEDEF: TÜM FRONTEND UYGULAMALARI AYNI ENDPOINT'LERİ KULLANACAK**

| Kategori | Endpoint | Method | Açıklama | rektefe-dv | rektefe-us |
|----------|----------|--------|-----------|------------|------------|
| **Auth** | `/api/auth/login` | POST | Giriş yap | ✅ | ✅ |
| **Auth** | `/api/auth/register` | POST | Kayıt ol | ✅ | ✅ |
| **Auth** | `/api/auth/refresh-token` | POST | Token yenile | ✅ | ✅ |
| **Appointments** | `/api/appointments/driver` | GET | Şöför randevuları | ✅ | ❌ |
| **Appointments** | `/api/appointments/mechanic` | GET | Usta randevuları | ❌ | ✅ |
| **Appointments** | `/api/appointments` | POST | Randevu oluştur | ✅ | ✅ |
| **Appointments** | `/api/appointments/:id` | GET | Randevu detayı | ✅ | ✅ |
| **Appointments** | `/api/appointments/:id/status` | PUT | Durum güncelle | ✅ | ✅ |
| **Appointments** | `/api/appointments/:id/cancel` | PUT | Randevu iptal | ✅ | ✅ |
| **Appointments** | `/api/appointments/today` | GET | Bugünkü randevular | ✅ | ✅ |
| **Appointments** | `/api/appointments/search` | GET | Randevu ara | ✅ | ✅ |
| **Vehicles** | `/api/vehicles` | GET | Araç listesi | ✅ | ❌ |
| **Vehicles** | `/api/vehicles` | POST | Araç ekle | ✅ | ❌ |
| **Mechanics** | `/api/mechanic/list` | GET | Usta listesi | ✅ | ✅ |
| **Mechanics** | `/api/mechanic/me` | GET | Usta profili | ❌ | ✅ |
| **Mechanics** | `/api/mechanic/details/:id` | GET | Usta detayları | ✅ | ✅ |
| **Mechanics** | `/api/mechanic/search` | GET | Usta arama | ✅ | ✅ |
| **Mechanics** | `/api/mechanic/nearby` | GET | En yakın ustalar | ✅ | ❌ |
| **Mechanics** | `/api/mechanic/stats` | GET | Usta istatistikleri | ❌ | ✅ |
| **Mechanics** | `/api/mechanic/availability` | PUT | Müsaitlik durumu | ❌ | ✅ |
| **Mechanics** | `/api/mechanic/rating` | PUT | Puan güncelleme | ❌ | ✅ |
| **Messages** | `/api/message/conversations` | GET | Sohbet listesi | ✅ | ✅ |
| **Messages** | `/api/message/send` | POST | Mesaj gönder | ✅ | ✅ |
| **Messages** | `/api/message/conversation/find/:otherUserId` | GET | Konuşma bul | ✅ | ✅ |
| **Notifications** | `/api/users/notifications` | GET | Bildirimler | ✅ | ✅ |
| **Wallet** | `/api/wallet/balance` | GET | Cüzdan bakiyesi | ❌ | ✅ |
| **Wallet** | `/api/wallet/transactions` | GET | İşlem geçmişi | ❌ | ✅ |
| **Ads** | `/api/ads` | GET | Reklamlar | ✅ | ✅ |
| **Upload** | `/api/upload` | POST | Dosya yükleme | ✅ | ✅ |

## 🚨 **TESPİT EDİLEN SORUNLAR:**

### 1. **Farklı Endpoint Kullanımları:**
- rektefe-dv: `/api/appointments/driver` kullanıyor
- rektefe-us: `/api/appointments/mechanic` kullanıyor
- ✅ **ÇÖZÜM**: Her ikisi de aynı `/api/appointments` endpoint'ini kullanacak, userType'a göre filtreleme yapılacak

### 2. **Eksik Endpoint'ler:**
- rektefe-us'da vehicle endpoint'leri yok
- rektefe-dv'de mechanic profil endpoint'i yok
- ✅ **ÇÖZÜM**: Eksik endpoint'ler eklenecek

### 3. **Inconsistent Response Format:**
- Bazı endpoint'ler farklı response format'ları döndürüyor
- ✅ **ÇÖZÜM**: Tüm endpoint'ler standart format kullanacak

### 4. **URL Uyumsuzlukları:**
- Messages endpoint'lerinde `/api/messages/` vs `/api/message/` karışıklığı
- ✅ **ÇÖZÜM**: Backend'deki gerçek URL'ler kullanılacak

## 🎯 **AKSİYON PLANI:**

1. ✅ Backend'de ortak endpoint'leri tamamla
2. 🔄 rektefe-dv API service'ini güncelle
3. 🔄 rektefe-us API service'ini güncelle  
4. ✅ Response format'larını standardize et
5. ✅ Test ve doğrula

## 📊 **MEVCUT DURUM:**
- Backend: %100 ortak endpoint'ler hazır
- rektefe-dv: %75 ortak endpoint'ler kullanıyor
- rektefe-us: %85 ortak endpoint'ler kullanıyor

**HEDEF**: %100 ortak endpoint kullanımı! 🎯

## 📈 **GÜNCELLENEN ENDPOINT'LER:**
- ✅ Mechanic endpoint'leri tamamlandı
- ✅ Messages URL'leri düzeltildi
- ✅ Wallet endpoint'leri eklendi
- ✅ Ads ve Upload endpoint'leri backend'de mevcut
