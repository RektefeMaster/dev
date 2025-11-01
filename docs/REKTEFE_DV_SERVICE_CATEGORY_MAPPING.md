# Rektefe Driver App - Hizmet Kategorisi Mapping ve Usta Eşleştirmesi

## 📋 İçindekiler
1. [Driver App'te Seçilen Kategoriler](#driver-appte-seçilen-kategoriler)
2. [Kategori Mapping Akışı](#kategori-mapping-akışı)
3. [Backend Usta Eşleştirmesi](#backend-usta-eşleştirmesi)
4. [Tüm Kategori Detayları](#tüm-kategori-detayları)

---

## 🚗 Driver App'te Seçilen Kategoriler

Driver uygulamasında (`rektefe-dv`) randevu alırken şu kategoriler seçiliyor:

| Frontend ID | Kategori Adı | Backend ServiceCategory |
|------------|-------------|------------------------|
| `agir-bakim` | Ağır Bakım | `repair` |
| `genel-bakim` | Genel Bakım | `repair` |
| `alt-takim` | Alt Takım | `repair` |
| `ust-takim` | Üst Takım | `repair` |
| `kaporta-boya` | Kaporta & Boya | `bodywork` |
| `elektrik-elektronik` | Elektrik-Elektronik | `electrical` |
| `yedek-parca` | Yedek Parça | `parts` |
| `egzoz-emisyon` | Egzoz & Emisyon | `repair` |
| `lastik` | Lastik Servisi | `tire` |
| `arac-yikama` | Araç Yıkama | `wash` |

**Kaynak:** `rektefe-dv/src/features/appointments/screens/MaintenancePlanScreen.tsx:89-99`

---

## 🔄 Kategori Mapping Akışı

### 1. Frontend → Backend Dönüşüm

Driver app'te seçilen kategori, `MaintenancePlanScreen.tsx` içinde backend formatına çevriliyor:

```typescript
const serviceCategoryMapping: { [key: string]: string } = {
  'agir-bakim': 'repair',
  'genel-bakim': 'repair', 
  'alt-takim': 'repair',
  'ust-takim': 'repair',
  'kaporta-boya': 'bodywork',
  'elektrik-elektronik': 'electrical',
  'yedek-parca': 'parts',
  'egzoz-emisyon': 'repair',
  'lastik': 'tire',
  'arac-yikama': 'wash',
  'cekici': 'towing'
};
```

**Kaynak:** `rektefe-dv/src/features/appointments/screens/MaintenancePlanScreen.tsx:208-220`

### 2. Backend ServiceCategory Enum Değerleri

Backend'de 7 ana kategori var:
- `repair` - Tamir & Bakım
- `towing` - Çekici
- `wash` - Araç Yıkama
- `tire` - Lastik
- `bodywork` - Kaporta & Boya
- `electrical` - Elektrik-Elektronik
- `parts` - Yedek Parça

**Kaynak:** `rest-api/src/models/User.ts:309` ve `rest-api/src/models/Mechanic.ts:96`

---

## 🔍 Backend Usta Eşleştirmesi

### Usta Arama Endpoint'i

`GET /mechanic-services/mechanics?serviceCategory={kategori}`

**Kaynak:** `rest-api/src/routes/mechanicService.ts:668-756`

### Eşleştirme Mantığı

1. **Kategori Normalizasyonu:**
   - Frontend'den gelen kategori (`repair`, `bodywork`, vs.) normalize edilir
   - `normalizeToServiceCategory()` fonksiyonu kullanılır

2. **Query Values Oluşturma:**
   - `getCategoryQueryValues()` fonksiyonu ile kategori için tüm varyasyonlar alınır
   - Örnek: `repair` → `['repair', 'Tamir ve Bakım', 'Tamir & Bakım', 'Tamir', 'Bakım']`

3. **Usta Filtreleme:**
   - Ustanın `serviceCategories` array'i ile query values karşılaştırılır
   - Case-insensitive eşleşme yapılır
   - Kısmi eşleşme de kabul edilir (contains)

**Kaynak:** `rest-api/src/routes/mechanicService.ts:693-706`

---

## 📊 Tüm Kategori Detayları

### REPAIR Kategorisi (Tamir & Bakım)

**Frontend Kategorileri:**
- `agir-bakim` → Ağır Bakım
- `genel-bakim` → Genel Bakım
- `alt-takim` → Alt Takım
- `ust-takim` → Üst Takım
- `egzoz-emisyon` → Egzoz & Emisyon

**Backend ServiceCategory:** `repair`

**Query Values (Usta Arama):**
- `'repair'`
- `'Tamir ve Bakım'`
- `'Tamir & Bakım'`
- `'Tamir'`
- `'Bakım'`

**Hangi Ustalara Gidiyor:**
- `serviceCategories` array'inde şu değerlerden herhangi birine sahip ustalar:
  - `'repair'`
  - `'Tamir ve Bakım'`
  - `'Tamir & Bakım'`
  - `'Tamir'`
  - `'Bakım'`
- Veya kategori adında bu kelimeler geçen ustalar (case-insensitive, contains)

**Kaynak:** `shared/types/enums.ts:126`

---

### BODYWORK Kategorisi (Kaporta & Boya)

**Frontend Kategorileri:**
- `kaporta-boya` → Kaporta & Boya

**Backend ServiceCategory:** `bodywork`

**Query Values (Usta Arama):**
- `'bodywork'`
- `'Kaporta & Boya'`
- `'Kaporta'`
- `'Boya'`

**Hangi Ustalara Gidiyor:**
- `serviceCategories` array'inde şu değerlerden herhangi birine sahip ustalar:
  - `'bodywork'`
  - `'Kaporta & Boya'`
  - `'Kaporta'`
  - `'Boya'`

**Kaynak:** `shared/types/enums.ts:130`

---

### TIRE Kategorisi (Lastik)

**Frontend Kategorileri:**
- `lastik` → Lastik Servisi

**Backend ServiceCategory:** `tire`

**Query Values (Usta Arama):**
- `'tire'`
- `'Lastik'`
- `'Lastik Servisi'`
- `'Lastik & Parça'`

**Hangi Ustalara Gidiyor:**
- `serviceCategories` array'inde şu değerlerden herhangi birine sahip ustalar:
  - `'tire'`
  - `'Lastik'`
  - `'Lastik Servisi'`
  - `'Lastik & Parça'`

**Kaynak:** `shared/types/enums.ts:129`

---

### WASH Kategorisi (Araç Yıkama)

**Frontend Kategorileri:**
- `arac-yikama` → Araç Yıkama

**Backend ServiceCategory:** `wash`

**Query Values (Usta Arama):**
- `'wash'`
- `'Araç Yıkama'`
- `'Yıkama'`

**Hangi Ustalara Gidiyor:**
- `serviceCategories` array'inde şu değerlerden herhangi birine sahip ustalar:
  - `'wash'`
  - `'Araç Yıkama'`
  - `'Yıkama'`

**Kaynak:** `shared/types/enums.ts:128`

---

### TOWING Kategorisi (Çekici)

**Frontend Kategorileri:**
- Çekici hizmeti (farklı bir ekrandan)

**Backend ServiceCategory:** `towing`

**Query Values (Usta Arama):**
- `'towing'`
- `'Çekici'`
- `'Çekici Hizmeti'`
- `'Kurtarma'`

**Hangi Ustalara Gidiyor:**
- `serviceCategories` array'inde şu değerlerden herhangi birine sahip ustalar:
  - `'towing'`
  - `'Çekici'`
  - `'Çekici Hizmeti'`
  - `'Kurtarma'`

**Kaynak:** `shared/types/enums.ts:127`

---

### ELECTRICAL Kategorisi (Elektrik-Elektronik)

**Frontend Kategorileri:**
- `elektrik-elektronik` → Elektrik-Elektronik

**Backend ServiceCategory:** `electrical`

**Query Values (Usta Arama):**
- `'electrical'`
- `'Elektrik-Elektronik'`
- `'Elektrik'`
- `'Elektronik'`

**Hangi Ustalara Gidiyor:**
- `serviceCategories` array'inde şu değerlerden herhangi birine sahip ustalar:
  - `'electrical'`
  - `'Elektrik-Elektronik'`
  - `'Elektrik'`
  - `'Elektronik'`

**Kaynak:** `shared/types/enums.ts:141`

---

### PARTS Kategorisi (Yedek Parça)

**Frontend Kategorileri:**
- `yedek-parca` → Yedek Parça

**Backend ServiceCategory:** `parts`

**Query Values (Usta Arama):**
- `'parts'`
- `'Yedek Parça'`
- `'Parça'`

**Hangi Ustalara Gidiyor:**
- `serviceCategories` array'inde şu değerlerden herhangi birine sahip ustalar:
  - `'parts'`
  - `'Yedek Parça'`
  - `'Parça'`

**Kaynak:** `shared/types/enums.ts:142`

---

## 🔄 Tam Akış Özeti

```
1. Driver App: Kullanıcı "Genel Bakım" seçer
   ↓
2. Frontend Mapping: 'genel-bakim' → 'repair' 
   ↓
3. Backend API: GET /mechanic-services/mechanics?serviceCategory=repair
   ↓
4. Backend Normalizasyon: 'repair' → getCategoryQueryValues('repair')
   ↓
5. Query Values: ['repair', 'Tamir ve Bakım', 'Tamir & Bakım', 'Tamir', 'Bakım']
   ↓
6. Usta Filtreleme: serviceCategories içinde bu değerlerden herhangi biri olan ustalar
   ↓
7. Sonuç: 'repair' kategorisine kayıtlı tüm ustalar döndürülür
```

---

## ⚠️ Önemli Notlar

1. **Case-Insensitive Eşleşme:** Kategori eşleştirmesi büyük/küçük harf duyarsızdır
2. **Kısmi Eşleşme:** Kategori adında arama yapılırken `includes()` kullanılır
3. **Default Kategori:** Ustanın hiç kategorisi yoksa varsayılan olarak `'repair'` atanır
4. **Tümü Kategorisi:** Eğer usta `'Tümü'` kategorisine sahipse, tüm randevuları görür
5. **Fault Report Mapping:** Arıza bildirimlerinde de aynı mapping kullanılır (`FAULT_CATEGORY_TO_SERVICE_CATEGORY`)

---

## 📝 Kod Referansları

### Frontend Mapping
- `rektefe-dv/src/features/appointments/screens/MaintenancePlanScreen.tsx:208-220`

### Backend Usta Arama
- `rest-api/src/routes/mechanicService.ts:668-756`
- `rest-api/src/utils/serviceCategoryHelper.ts:84-88`

### Kategori Tanımları
- `shared/types/enums.ts:86-131`
- `rest-api/src/models/User.ts:307-311`
- `rest-api/src/models/Mechanic.ts:94-98`

---

**Son Güncelleme:** 2024

