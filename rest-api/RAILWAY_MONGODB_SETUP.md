# Railway MongoDB Atlas Kurulum Rehberi

## 1. Railway Static IP Aktif Etme

### Adım 1: Railway Dashboard
1. Railway Dashboard → Projeniz → **Settings**
2. **Static IP** bölümünü bulun
3. **"Enable Static IP"** butonuna tıklayın
4. Size verilen IP adresini not edin (örn: `52.123.45.67`)

### Adım 2: MongoDB Atlas Network Access
1. MongoDB Atlas Dashboard → **Network Access**
2. **"Add IP Address"** butonuna tıklayın
3. Railway'den aldığınız **Static IP**'yi ekleyin
4. **Comment**: "Railway Production Server"
5. **"Confirm"** butonuna tıklayın

## 2. Railway Environment Variables

Railway Dashboard → Projeniz → **Variables** sekmesinde şunları ekleyin:

```bash
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://rektefekadnur09:rektefekadnur09@cluster0.agf6m9t.mongodb.net/rektefe?retryWrites=true&w=majority&appName=Cluster0

# JWT Secrets
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-here

# Environment
NODE_ENV=production
PORT=3000

# CORS Origins (Railway domain'inizi ekleyin)
CORS_ORIGIN=https://your-railway-domain.railway.app,https://rektefe.com,https://app.rektefe.com

# Cloudinary (eğer kullanıyorsanız)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 3. MongoDB Atlas Güvenlik Ayarları

### Database User Permissions
MongoDB Atlas'ta kullanıcı izinlerini kontrol edin:
1. **Database Access** → Kullanıcınızı seçin
2. **Built-in Role**: `readWrite` veya `dbAdmin` olmalı
3. **Database**: `rektefe` olmalı

### Connection String Format
```
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority&appName=Cluster0
```

## 4. Railway Deploy Test

### Health Check Endpoint
Railway deploy sonrası test edin:
```bash
curl https://your-railway-domain.railway.app/health
```

### MongoDB Connection Test
```bash
curl https://your-railway-domain.railway.app/api
```

## 5. Troubleshooting

### IP Whitelist Hatası
```
MongooseServerSelectionError: Could not connect to any servers in your MongoDB Atlas cluster
```

**Çözüm:**
1. Railway Static IP'yi MongoDB Atlas'a eklediğinizden emin olun
2. IP adresinin doğru olduğunu kontrol edin
3. MongoDB Atlas'ta Network Access'te IP'nin aktif olduğunu kontrol edin

### Connection Timeout
```
MongooseServerSelectionError: Server selection timed out
```

**Çözüm:**
1. Railway'de Static IP kullandığınızdan emin olun
2. MongoDB Atlas cluster'ının aktif olduğunu kontrol edin
3. Connection string'deki parametreleri kontrol edin

## 6. Güvenlik Notları

✅ **Yapılması Gerekenler:**
- Railway Static IP kullanın
- MongoDB Atlas'ta sadece gerekli IP'leri whitelist'e ekleyin
- JWT secret'ları güçlü ve unique olsun
- CORS origins'i spesifik domain'lerle sınırlayın

❌ **Yapılmaması Gerekenler:**
- `0.0.0.0/0` IP range'i kullanmayın
- JWT secret'ları environment variable olmadan hardcode etmeyin
- CORS'u `*` wildcard ile açmayın
- MongoDB credentials'ları kod içinde saklamayın

## 7. Monitoring

Railway Dashboard'da şunları izleyin:
- **Deployments**: Başarılı deploy'lar
- **Metrics**: CPU, Memory, Network kullanımı
- **Logs**: MongoDB bağlantı logları
- **Variables**: Environment variables'ların doğru yüklendiği
