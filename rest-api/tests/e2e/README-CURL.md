# Curl ile E2E Test Rehberi

## Kullanım

### Tam Akış Testi

```bash
# Local'de
API_URL=http://localhost:3000 ./tests/e2e/test-flow.sh

# Railway'de (Railway URL'inizi kullanın)
API_URL=https://your-app.railway.app ./tests/e2e/test-flow.sh
```

### İndirim İsteği Akışı

```bash
# Önce tam akışı çalıştırın, sonra appointment ID ve token'ları alın
API_URL=http://localhost:3000 ./tests/e2e/test-flow-indirim.sh
```

## Test Senaryoları

### 1. Tam Akış (Direkt Ödeme)
- Driver kullanıcı oluşturma
- Mechanic kullanıcı oluşturma
- Araç oluşturma
- Arıza bildirimi oluşturma
- Teklif gönderme
- Teklif seçme
- Randevu oluşturma
- Randevu kabul etme
- İş başlatma
- İş bitirme
- Ödeme yapma
- Ödeme onaylama

### 2. İndirim İsteği Akışı
- İndirim isteği gönderme
- Usta yanıt verme
- Fiyat onaylama
- Ödeme yapma

## Gereksinimler

- `curl` komutu
- `jq` (JSON formatı için, opsiyonel)
- API URL'i (local veya Railway)

## Environment Variables

- `API_URL`: API base URL (varsayılan: http://localhost:3000)

## Örnek Çıktı

```
=== Rektefe E2E Test Flow (Curl) ===

1. Driver kullanıcı oluşturuluyor...
✅ Driver oluşturuldu: 507f1f77bcf86cd799439011

2. Mechanic kullanıcı oluşturuluyor...
✅ Mechanic oluşturuldu: 507f1f77bcf86cd799439012

...

=== Tüm Testler Başarılı! ===
```

## Sorun Giderme

### jq komutu bulunamadı
```bash
# macOS
brew install jq

# Linux
sudo apt-get install jq

# Veya jq olmadan çalıştırın (sadece grep kullanır)
```

### API URL hatası
```bash
# Railway URL'inizi kontrol edin
API_URL=https://your-app.railway.app ./tests/e2e/test-flow.sh
```

### Token hatası
- Token'ların geçerli olduğundan emin olun
- Authorization header'ın doğru formatta olduğunu kontrol edin

