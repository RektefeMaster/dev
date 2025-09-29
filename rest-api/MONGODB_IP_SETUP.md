# MongoDB Atlas IP Otomatik Güncelleme

Bu sistem Render deploy edildiğinde otomatik olarak MongoDB Atlas IP whitelist'ini günceller.

## Gerekli Environment Variables

Render dashboard'da şu environment variable'ları ekleyin:

```
MONGODB_ATLAS_API_KEY=your_atlas_api_key_here
MONGODB_ATLAS_PROJECT_ID=your_project_id_here
```

## MongoDB Atlas API Key Nasıl Alınır?

1. MongoDB Atlas'a giriş yapın
2. Sol menüden "Access Manager" > "API Keys" seçin
3. "Create API Key" butonuna tıklayın
4. Key'e bir isim verin (örn: "Render Auto IP Update")
5. "Project Owner" yetkisi verin
6. API Key'i kopyalayın

## Project ID Nasıl Bulunur?

1. MongoDB Atlas dashboard'da projenizi seçin
2. Sol menüden "Settings" > "General" seçin
3. "Project ID" değerini kopyalayın

## Nasıl Çalışır?

1. Render deploy edildiğinde `npm start` çalışır
2. `npm start` önce `update-mongodb-ip` script'ini çalıştırır
3. Script Render'ın outbound IP'sini bulur
4. MongoDB Atlas API ile bu IP'yi whitelist'e ekler
5. Sonra normal server başlatılır

## Manuel Test

Local'de test etmek için:

```bash
cd rest-api
MONGODB_ATLAS_API_KEY=your_key MONGODB_ATLAS_PROJECT_ID=your_id npm run update-mongodb-ip
```

## Güvenlik

- API Key sadece IP ekleme yetkisine sahip
- Her IP ekleme işlemi loglanır
- Eski IP'ler otomatik temizlenmez (manuel temizlik gerekir)
