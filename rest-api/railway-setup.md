# Railway.app Kurulum Rehberi

## 1. Railway.app'e Kaydol
- [railway.app](https://railway.app) → Sign Up
- GitHub ile kaydol

## 2. Proje Oluştur
- "New Project" → "Deploy from GitHub repo"
- `dev` repo'yu seç
- Root directory: `rest-api`

## 3. Environment Variables
```
MONGODB_URI=mongodb+srv://rektefekadnur09:rektefekadnur09@cluster0.agf6m9t.mongodb.net/rektefe?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your_jwt_secret_here
NODE_ENV=production
PORT=3000
```

## 4. Sabit IP Aktif Et
- Settings → "Static IP" → Enable
- IP adresini al

## 5. MongoDB Atlas'a IP Ekle
- Railway'den aldığınız IP'yi MongoDB Atlas'a ekle
- Network Access → Add IP Address

## 6. Domain (Opsiyonel)
- Railway Dashboard → Settings → Domains
- Custom domain ekle

## Avantajlar
✅ Sabit IP
✅ Otomatik deploy
✅ Kolay environment variables
✅ MongoDB Atlas uyumlu
✅ Ücretsiz tier
✅ Hızlı kurulum
