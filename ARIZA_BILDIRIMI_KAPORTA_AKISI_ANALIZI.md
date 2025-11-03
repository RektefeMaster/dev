# Arıza Bildirimi - Kaporta Ustası Akışı Detaylı Analiz Raporu

## ÖZET

Kaporta/boya hizmetleri için mevcut sistemde **iki farklı akış** bulunmaktadır. Bu durum kullanıcı deneyimi açısından karışıklığa neden olmaktadır. Rapor, mevcut durumu analiz edip öneriler sunmaktadır.

---

## 1. MEVCUT DURUM

### 1.1 Driver App (rektefe-dv) - Arıza Bildirimi Akışı

#### FaultReportScreen
**Yol:** HomeScreen → "Arıza Bildir" butonu → FaultReportScreen

**Özellikler:**
- 5 adımlı wizard form
- 4 ana hizmet kategorisi:
  - **Tamir ve Bakım** (İçeriği: Genel bakım, ağır bakım, alt/üst takım, **kaporta/boya**, elektrik-elektronik, yedek parça, egzoz & emisyon)
  - Araç Yıkama
  - Lastik
  - Çekici

**Sorun:**
- "Tamir ve Bakım" kategorisi çok genel
- Kaporta/boya spesifik değil, genel tamir kategorisi içinde
- Backend'de "Tamir ve Bakım" → `ServiceCategory.REPAIR` → Repair ustalarına bildirim gidiyor
- **Kaporta ustalarına (BODYWORK) bildirim gitmiyor çünkü bodywork ayrı bir kategori**

#### Backend Mapping
```typescript
// shared/types/enums.ts
FAULT_CATEGORY_TO_SERVICE_CATEGORY: {
  'Tamir ve Bakım': ServiceCategory.REPAIR,  // ❌ Bodywork değil!
  'Kaporta/Boya': ServiceCategory.BODYWORK,  // ✅ Doğru mapping
}
```

**Sonuç:** "Tamir ve Bakım" seçilince kaporta ustalarına bildirim gitmiyor!

---

### 1.2 Driver App - Direkt Kaporta İşi Oluşturma

#### CreateBodyworkJobScreen
**Yol:** BodyworkJobsScreen → "+" butonu → CreateBodyworkJobScreen

**Özellikler:**
- Multi-step form (araç seçimi, usta seçimi, hasar bilgisi, fotoğraflar)
- Direkt kaporta ustası seçimi yapılıyor
- `apiService.BodyworkService.createBodyworkJob()` kullanılıyor
- BodyworkJob oluşturuluyor (FaultReport değil)

**Avantajlar:**
- Spesifik kaporta/boya odaklı
- Direkt usta seçimi
- Bodywork-specific form alanları (damageType, severity, affectedAreas)

**Dezavantajlar:**
- HomeScreen'den direkt erişim yok
- FaultReport akışından ayrı
- İki farklı sistem kafa karıştırıcı

---

### 1.3 Mechanic App (rektefe-us) - Arıza Bildirimi Görüntüleme

#### FaultReportsScreen
**Yol:** Drawer → "Arıza Bildirimleri"

**Özellikler:**
- Ustaya gelen arıza bildirimlerini listeler
- Filtreleme: All, Pending, Quoted, Accepted, Responded
- Usta serviceCategories'e göre filtreleme yapılıyor
- "Tamir ve Bakım" fault report'ları → Repair ustalarına gösteriliyor
- "Kaporta/Boya" fault report'ları → Bodywork ustalarına gösteriliyor

**Sorun:**
- "Tamir ve Bakım" kategorisindeki kaporta arızaları kaporta ustalarına görünmüyor
- Sadece repair ustaları görebiliyor

#### FaultReportDetailScreen
**Özellikler:**
- Arıza bildirimi detaylarını gösterir
- Teklif verebilir veya yanıt gönderebilir (not_available, check_tomorrow, contact_me)
- Teklif verilince quote oluşturuluyor
- Müşteri teklifi kabul edince Appointment oluşturuluyor

**Eksiklik:**
- FaultReport'tan BodyworkJob'a dönüşüm yok
- Appointment oluşturuluyor ama BodyworkJob oluşturulmuyor

---

### 1.4 Mechanic App - Bodywork İş Yönetimi

#### BodyworkScreen
**Yol:** Drawer → "Kaporta/Boya İşleri"

**Özellikler:**
- Direkt kaporta işlerini listeler (BodyworkJob modeli)
- Aktif/Tamamlanan işler ve şablonlar
- Teklif hazırlama, iş akışı yönetimi
- FaultReport ile entegrasyon yok

---

## 2. SORUNLAR

### 2.1 Kategori Mapping Sorunu

**Problem:**
- Driver app'te "Tamir ve Bakım" seçilince backend'de `ServiceCategory.REPAIR` oluyor
- Kaporta ustaları `ServiceCategory.BODYWORK` kullanıyor
- Repair ustalarına bildirim gidiyor, bodywork ustalarına gitmiyor

**Etki:**
- Kaporta arızası olan müşteri "Tamir ve Bakım" seçerse kaporta ustalarına ulaşamıyor
- Sadece genel tamir ustalarına ulaşıyor

### 2.2 İki Farklı Akış Sorunu

**Problem:**
- FaultReport akışı (genel, teklif alma odaklı)
- BodyworkJob akışı (direkt, usta seçimi odaklı)
- İki akış birbiriyle entegre değil

**Etki:**
- Kullanıcı hangisini kullanacağını bilmiyor
- HomeScreen'den direkt kaporta işi oluşturma yok
- FaultReport'tan BodyworkJob'a dönüşüm yok

### 2.3 HomeScreen Navigasyon Eksikliği

**Problem:**
- HomeScreen'de "Arıza Bildir" butonu var
- "Kaporta İşi Oluştur" butonu yok
- BodyworkJobsScreen'e direkt erişim yok

**Etki:**
- Kullanıcı kaporta işi için arıza bildirimi kullanmak zorunda
- Ya da manuel olarak BodyworkJobsScreen'e gitmek zorunda

---

## 3. BACKEND AKIŞI

### 3.1 FaultReport Oluşturma

```
1. Driver: FaultReportScreen → "Tamir ve Bakım" seçer
2. Backend: createFaultReport() çağrılır
3. Backend: serviceCategory = "Tamir ve Bakım" → normalize edilmiyor (doğrudan kullanılıyor)
4. Backend: findNearbyMechanics() → serviceCategory'yi ServiceCategory enum'una çevirir
   - "Tamir ve Bakım" → ServiceCategory.REPAIR
   - REPAIR ustalarına bildirim gider
   - ❌ BODYWORK ustalarına bildirim gitmez!
5. Mechanic: FaultReportsScreen'de görür (sadece REPAIR ustaları)
```

### 3.2 BodyworkJob Oluşturma

```
1. Driver: CreateBodyworkJobScreen → Usta seçer → İş oluşturur
2. Backend: createBodyworkJob() çağrılır
3. Backend: BodyworkJob oluşturulur
4. Mechanic: BodyworkScreen'de görür
```

### 3.3 FaultReport → Appointment Akışı

```
1. Mechanic: FaultReportDetailScreen → Teklif verir
2. Driver: Teklifi kabul eder
3. Driver: createAppointmentFromFaultReport() çağrılır
4. Backend: Appointment oluşturulur
5. ❌ BodyworkJob oluşturulmaz!
```

---

## 4. ÖNERİLER

### 4.1 Kısa Vadeli Çözümler (Hızlı Düzeltmeler)

#### 4.1.1 FaultReportScreen'e Kaporta/Boya Seçeneği Eklenmeli

**Öneri:**
- ServiceCategorySelector'da "Tamir ve Bakım" yerine alt kategoriler gösterilmeli
- Veya "Kaporta/Boya" ayrı bir kategori olarak eklenmeli

**Değişiklik:**
```typescript
// rektefe-dv/src/features/fault-reports/hooks/useFaultReport.ts
const staticServiceCategories = [
  { 
    id: 'Kaporta/Boya',  // ✅ Yeni eklenecek
    name: 'Kaporta/Boya', 
    icon: 'car-repair', 
    color: '#FF9500',
    description: 'Kaporta ve boya hizmetleri'
  },
  { 
    id: 'Tamir ve Bakım', 
    name: 'Tamir ve Bakım', 
    icon: 'wrench', 
    color: '#007AFF',
    description: 'Genel bakım, ağır bakım, alt/üst takım, elektrik-elektronik, yedek parça, egzoz & emisyon'
  },
  // ... diğer kategoriler
];
```

**Backend Mapping:**
```typescript
// shared/types/enums.ts - Zaten var!
FAULT_CATEGORY_TO_SERVICE_CATEGORY: {
  'Kaporta/Boya': ServiceCategory.BODYWORK,  // ✅ Doğru mapping mevcut
}
```

**Sonuç:** Kaporta/boya seçilince bodywork ustalarına bildirim gider.

---

#### 4.1.2 HomeScreen'e Kaporta İşi Oluştur Butonu

**Öneri:**
- HomeScreen'e "Kaporta İşi Oluştur" butonu eklenmeli
- Direkt CreateBodyworkJobScreen'e yönlendirmeli

**Değişiklik:**
```typescript
// rektefe-dv/src/features/home/HomeScreen.tsx
const handleCreateBodyworkJob = () => {
  navigation.navigate('CreateBodyworkJob');
};

// UI'da buton ekle
<TouchableOpacity
  style={styles.bodyworkButton}
  onPress={handleCreateBodyworkJob}
>
  <Text>Kaporta İşi Oluştur</Text>
</TouchableOpacity>
```

---

### 4.2 Orta Vadeli Çözümler (İyileştirmeler)

#### 4.2.1 FaultReport'tan BodyworkJob'a Dönüşüm

**Öneri:**
- FaultReport'ta serviceCategory = "Kaporta/Boya" ise
- Müşteri teklifi kabul edince otomatik BodyworkJob oluşturulsun

**Değişiklik:**
```typescript
// rest-api/src/controllers/faultReport.controller.ts
export const createAppointmentFromFaultReport = async (req: Request, res: Response) => {
  // ... mevcut kod ...
  
  // Eğer Kaporta/Boya ise BodyworkJob oluştur
  if (faultReport.serviceCategory === 'Kaporta/Boya' || 
      faultReport.serviceCategory === 'Kaporta & Boya') {
    
    await BodyworkService.createBodyworkJob({
      customerId: userId,
      vehicleId: faultReport.vehicleId,
      mechanicId: mechanicId,
      damageInfo: {
        description: faultReport.faultDescription,
        photos: faultReport.photos,
        videos: faultReport.videos || [],
        damageType: 'other', // Varsayılan
        severity: 'moderate', // Varsayılan
        affectedAreas: [],
        estimatedRepairTime: 7 // Varsayılan
      }
    });
  }
  
  // ... mevcut Appointment oluşturma kodu ...
};
```

**Sonuç:** FaultReport'tan BodyworkJob'a otomatik dönüşüm.

---

#### 4.2.2 FaultReportDetailScreen'e BodyworkJob'a Dönüştür Butonu

**Öneri:**
- Mechanic, FaultReportDetailScreen'de "Kaporta İşine Dönüştür" butonu görebilmeli
- Bu buton BodyworkJob oluşturur

**Değişiklik:**
```typescript
// rektefe-us/src/features/fault-reports/screens/FaultReportDetailScreen.tsx
const handleConvertToBodyworkJob = async () => {
  // Backend'e istek gönder
  // BodyworkJob oluştur
};
```

---

### 4.3 Uzun Vadeli Çözümler (Yeniden Yapılandırma)

#### 4.3.1 Unified Service Request System

**Öneri:**
- Tüm hizmet talepleri tek bir sistem altında toplansın
- FaultReport ve BodyworkJob ayrı sistemler yerine unified request sistemi

**Avantajlar:**
- Tek bir akış
- Daha iyi kullanıcı deneyimi
- Daha kolay yönetim

**Dezavantajlar:**
- Büyük refactoring gerekir
- Mevcut verilerin migration'ı gerekir

---

## 5. ÖNCELİKLENDİRME

### Yüksek Öncelik (Hemen Yapılmalı)
1. ✅ FaultReportScreen'e "Kaporta/Boya" kategori seçeneği ekle
2. ✅ HomeScreen'e "Kaporta İşi Oluştur" butonu ekle

### Orta Öncelik (Yakında Yapılmalı)
3. ✅ FaultReport'tan BodyworkJob'a dönüşüm (serviceCategory = "Kaporta/Boya" ise)
4. ✅ Mechanic app'te "Kaporta İşine Dönüştür" butonu

### Düşük Öncelik (Gelecekte Düşünülebilir)
5. Unified Service Request System (büyük refactoring)

---

## 6. SONUÇ

Mevcut sistemde kaporta/boya hizmetleri için **iki ayrı akış** bulunmaktadır:
1. **FaultReport akışı:** Genel, teklif alma odaklı, ancak "Tamir ve Bakım" kategorisi bodywork ustalarına ulaşmıyor
2. **BodyworkJob akışı:** Direkt, usta seçimi odaklı, ancak HomeScreen'den erişilemiyor

**Önerilen çözüm:**
- Kısa vadede: FaultReportScreen'e "Kaporta/Boya" seçeneği eklemek ve HomeScreen'e direkt kaporta işi oluşturma butonu eklemek
- Orta vadede: FaultReport'tan BodyworkJob'a otomatik dönüşüm eklemek

Bu çözümlerle hem mevcut sistem korunur hem de kullanıcı deneyimi iyileştirilir.

