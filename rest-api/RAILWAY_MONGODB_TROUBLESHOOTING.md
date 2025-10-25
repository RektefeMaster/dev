# Railway MongoDB Atlas Bağlantı Sorun Giderme Kılavuzu

## Sorun
Railway'de deploy edilen uygulama MongoDB Atlas'a bağlanamıyor.

Hata mesajı:
```
MongooseServerSelectionError: Could not connect to any servers in your MongoDB Atlas cluster. 
One common reason is that you're trying to access the database from an IP that isn't whitelisted.
```

## Çözüm Adımları

### 1. MongoDB Atlas Network Access Ayarları

MongoDB Atlas hesabınıza giriş yapın ve şu adımları uygulayın:

1. **MongoDB Atlas Dashboard** → **Network Access** menüsüne gidin
2. **ADD IP ADDRESS** butonuna tıklayın
3. İki seçenek var:
   
   **Seçenek A (Önerilen - Geliştirme/Test):**
   - `0.0.0.0/0` IP adresini ekleyin
   - Bu, tüm IP adreslerinden erişime izin verir
   - ⚠️ **Güvenlik Uyarısı:** Production'da dikkatli kullanın
   
   **Seçenek B (Production - Daha Güvenli):**
   - Railway'in IP aralıklarını araştırın ve manuel olarak ekleyin
   - Ancak bu yöntem Railway'in dinamik IP'leri nedeniyle problem çıkarabilir

4. **CONFIRM** butonuna tıklayın
5. Değişikliklerin aktif olması için 1-2 dakika bekleyin

### 2. MongoDB Atlas Database Access Ayarları

Kullanıcı adı ve şifrenin doğru olduğundan emin olun:

1. **MongoDB Atlas Dashboard** → **Database Access** menüsüne gidin
2. Kullanıcı adınızı kontrol edin
3. Şifreyi yenilemek isterseniz **Edit** → **Edit Password** → Yeni şifre oluşturun

### 3. Railway Environment Variables

Railway dashboard'da aşağıdaki environment variable'ların doğru ayarlandığından emin olun:

```bash
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.agf6m9t.mongodb.net/rektefe?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=<your-secret-key>
NODE_ENV=production
PORT=3000
```

**Not:** `MONGODB_URI` içinde `<username>` ve `<password>` kısımlarını kendi bilgilerinizle değiştirmeyi unutmayın!

### 4. Connection String Format Kontrolü

MongoDB Atlas connection string'iniz şu formatta olmalı:

```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database-name?retryWrites=true&w=majority
```

Önemli noktalar:
- `mongodb+srv://` protokolü kullanılmalı (TLS otomatik etkin)
- `retryWrites=true` parametresi önerilir
- `w=majority` write concern ayarı önerilir

### 5. Railway Deploy Log Kontrolü

Railway'de deploy sonrası logları kontrol edin:

```bash
# Railway dashboard'da "Deployments" → "View Logs" butonuna tıklayın
```

Log'larda şunları kontrol edin:
- ✅ `MongoDB bağlantısı başlatılıyor...` mesajı
- ✅ `MongoDB URI: mongodb+srv://...` mesajı
- ❌ Herhangi bir hata mesajı

### 6. Code Düzeltmeleri

Kodda yapılan iyileştirmeler:

1. **TLS Ayarları:**
   - `mongodb+srv://` protokolü kullanıldığında TLS otomatik etkin
   - Manuel TLS ayarı artık gerekli değil

2. **Timeout Ayarları:**
   - `serverSelectionTimeoutMS: 30000` (30 saniye)
   - Railway'in yavaş başlatma süreleri için optimize edildi

3. **Connection Pool:**
   - `minPoolSize: 1` (minimum bağlantı sayısı)
   - Railway resource limitlerine uygun

4. **Error Handling:**
   - Daha detaylı hata mesajları
   - Otomatik retry mekanizması
   - Masked URI gösterimi (şifre güvenliği)

### 7. Test Etme

Railway'de yeniden deploy yapın:

```bash
git add .
git commit -m "Fix MongoDB connection for Railway"
git push
```

Railway otomatik olarak yeniden deploy edecektir.

## Sık Karşılaşılan Hatalar ve Çözümleri

### Hata 1: "Could not connect to any servers"
**Sebep:** IP whitelist sorunu  
**Çözüm:** MongoDB Atlas Network Access ayarlarından `0.0.0.0/0` ekleyin

### Hata 2: "Authentication failed"
**Sebep:** Yanlış kullanıcı adı veya şifre  
**Çözüm:** MongoDB Atlas Database Access ayarlarından kullanıcı bilgilerini kontrol edin

### Hata 3: "Connection timeout"
**Sebep:** Network veya firewall sorunu  
**Çözüm:** Timeout sürelerini artırın, MongoDB Atlas endpoint'ini kontrol edin

### Hata 4: "TLS handshake failed"
**Sebep:** TLS sertifika sorunu  
**Çözüm:** `mongodb+srv://` protokolünü kullandığınızdan emin olun

## Ek Kaynaklar

- [MongoDB Atlas Connection String](https://www.mongodb.com/docs/atlas/connect-to-cluster/)
- [Railway Documentation](https://docs.railway.app/)
- [Mongoose Connection Options](https://mongoosejs.com/docs/connections.html#options)

## Destek

Sorun devam ederse:
1. Railway deploy loglarını kontrol edin
2. MongoDB Atlas dashboard'dan cluster durumunu kontrol edin
3. Network Access ve Database Access ayarlarını tekrar gözden geçirin
