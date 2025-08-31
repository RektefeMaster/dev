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
| **Mechanics** | `/api/mechanics` | GET | Usta listesi | ✅ | ✅ |
| **Mechanics** | `/api/mechanic/me` | GET | Usta profili | ❌ | ✅ |
| **Messages** | `/api/messages/conversations` | GET | Sohbet listesi | ✅ | ✅ |
| **Messages** | `/api/messages/send` | POST | Mesaj gönder | ✅ | ✅ |
| **Notifications** | `/api/notifications` | GET | Bildirimler | ✅ | ✅ |

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

## 🎯 **AKSİYON PLANI:**

1. ✅ Backend'de ortak endpoint'leri tamamla
2. 🔄 rektefe-dv API service'ini güncelle
3. 🔄 rektefe-us API service'ini güncelle  
4. ✅ Response format'larını standardize et
5. ✅ Test ve doğrula

## 📊 **MEVCUT DURUM:**
- Backend: %95 ortak endpoint'ler hazır
- rektefe-dv: %80 ortak endpoint'ler kullanıyor
- rektefe-us: %70 ortak endpoint'ler kullanıyor

**HEDEF**: %100 ortak endpoint kullanımı! 🎯
