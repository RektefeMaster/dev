# Root Seviyesi Dosyalar

Bu dosyalar projenin ana dizininde bulunur ve **monorepo yapılandırması** için kullanılır.

## 📁 Dosya Listesi

### `package.json`
**Amaç:** Monorepo ana yapılandırma dosyası
**Ne Zaman Kullanılır:** Tüm projeleri yönetmek için
**İçerik:**
```json
{
  "dependencies": {
    "expo-print": "~14.0.3",
    "gsap": "^3.13.0"
  }
}
```
**Açıklama:** 
- Ortak bağımlılıkları tanımlar
- Tüm alt projeler için geçerli olan paketleri içerir
- Workspace yönetimi için kullanılır

### `package-lock.json`
**Amaç:** Bağımlılık kilitleme dosyası
**Ne Zaman Kullanılır:** Tutarlı kurulum sağlamak için
**Açıklama:**
- Root seviyesindeki `package.json`'ın bağımlılık versiyonlarını sabitler
- Tüm workspace'lerin ortak bağımlılıklarının versiyonlarını kontrol eder
- `npm install` komutu çalıştırıldığında otomatik güncellenir

### `app.json`
**Amaç:** Expo monorepo yapılandırması
**Ne Zaman Kullanılır:** Expo CLI ile monorepo yönetimi için
**İçerik:**
```json
{
  "expo": {}
}
```
**Açıklama:**
- Şu anda boş bir placeholder
- Gelecekte workspace tanımları eklenebilir
- Alt projelerin (`rektefe-dv`, `rektefe-us`) konumlarını belirtir

### `.prettierrc`
**Amaç:** Kod formatlama kuralları
**Ne Zaman Kullanılır:** Kod yazarken ve commit öncesi
**İçerik:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```
**Açıklama:**
- Prettier kod formatlayıcısının yapılandırması
- Tüm projelerde tutarlı kod stili sağlar
- IDE entegrasyonu ile otomatik formatlama yapar

## 🔧 Kullanım Örnekleri

### Tüm Projeleri Kurmak
```bash
# Root seviyesinde
npm install
```

### Kod Formatlamak
```bash
# Tüm projelerde formatlama
npx prettier --write .
```

### Monorepo Yönetimi
```bash
# Tüm workspace'leri listele
npm run workspaces

# Belirli bir workspace'te komut çalıştır
npm run --workspace=rektefe-dv start
```

## 📝 Notlar

- Root seviyesi dosyalar **tüm projeleri etkiler**
- Değişiklik yapmadan önce tüm alt projelerin etkilenip etkilenmediğini kontrol edin
- `package-lock.json` dosyasını manuel olarak düzenlemeyin
- `.prettierrc` ayarları tüm TypeScript/JavaScript dosyaları için geçerlidir
