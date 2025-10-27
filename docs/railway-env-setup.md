# Railway Environment Variables Setup

## Kalıcı Veri İçin Gerekli Ayarlar

### 1. MongoDB Connection String
Railway dashboard'da şu environment variable'ı ayarlayın:

**a) Railway MongoDB kullanıyorsanız:**
```
MONGODB_URI=mongodb://mongo:27017/rektefe
```
Not: Bu MongoDB servisi Railway'de aynı projede çalışıyorsa geçerlidir.

**b) MongoDB Atlas kullanıyorsanız:**
```
MONGODB_URI=mongodb+srv://rektefekadnur09:rektefekadnur09@cluster0.agf6m9t.mongodb.net/rektefe?retryWrites=true&w=majority
```
Not: MongoDB Atlas Network Access ayarlarından Railway IP'lerini whitelist'e ekleyin (0.0.0.0/0 tüm IP'ler için).

### 2. Database Persistent Volume
Railway'de MongoDB servisi için:
1. Railway dashboard'a gidin
2. MongoDB servisinizi seçin
3. Settings > Data > "Add Volume" butonuna basın
4. Volume name: `mongodb-data`
5. Mount path: `/data/db`

### 3. Environment Variables Checklist
Railway dashboard'da şu değişkenlerin olduğundan emin olun:

```bash
# Database - MongoDB Atlas
MONGODB_URI=mongodb+srv://rektefekadnur09:rektefekadnur09@cluster0.agf6m9t.mongodb.net/rektefe?retryWrites=true&w=majority

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# CORS
CORS_ORIGIN=https://dev-production-8a3d.up.railway.app

# Environment
NODE_ENV=production
```

### 4. Railway Service Configuration
Her deployment'ta veri kaybını önlemek için:

1. **Restart Policy**: `ON_FAILURE`
2. **Max Retries**: `10`
3. **Health Check**: `/api/health`
4. **Start Command**: `node /app/rest-api/dist/rest-api/src/index.js`

### 5. Database Backup Strategy
Her gün otomatik backup için Railway'de:
1. MongoDB servisine gidin
2. Settings > Backup
3. "Enable Daily Backups" aktif edin

## Test Kullanıcıları
Artık her deployment'ta otomatik oluşturulacak:
- testdv@gmail.com / test123 (Driver)
- testus@gmail.com / test123 (Mechanic)  
- admin@rektefe.com / admin123 (Admin)
