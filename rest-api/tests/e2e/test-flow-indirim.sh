#!/bin/bash

# E2E Test Flow - İndirim İsteği ile Test Senaryosu
# Bu script indirim isteği akışını curl komutlarıyla test eder

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API Base URL
BASE_URL="${API_URL:-http://localhost:3000}"
API_BASE="${BASE_URL}/api"

echo -e "${GREEN}=== Rektefe E2E Test Flow - İndirim İsteği (Curl) ===${NC}\n"

# Önceki script'teki adımları tekrarlayalım (1-10)
# Burada sadece indirim isteği akışını gösteriyoruz

# Varsayalım ki appointment ID ve token'lar mevcut
# Gerçek kullanımda bunları önceki adımlardan alacaksınız

read -p "Appointment ID girin: " APPOINTMENT_ID
read -p "Driver Token girin: " DRIVER_TOKEN
read -p "Mechanic Token girin: " MECHANIC_TOKEN

if [ -z "$APPOINTMENT_ID" ] || [ -z "$DRIVER_TOKEN" ] || [ -z "$MECHANIC_TOKEN" ]; then
  echo -e "${RED}❌ Gerekli bilgiler eksik${NC}"
  exit 1
fi

# 11. Driver İndirim İster
echo -e "${YELLOW}11. Driver indirim istiyor...${NC}"
DISCOUNT_REQUEST_RESPONSE=$(curl -s -X POST "${API_BASE}/appointments/${APPOINTMENT_ID}/request-discount" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN")

if echo "$DISCOUNT_REQUEST_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ İndirim isteği gönderildi${NC}\n"
else
  echo -e "${RED}❌ İndirim isteği gönderilemedi${NC}"
  echo "$DISCOUNT_REQUEST_RESPONSE" | jq .
  exit 1
fi

# 12. Usta İndirim İsteğine Yanıt Verir
echo -e "${YELLOW}12. Usta indirim isteğine yanıt veriyor...${NC}"
DISCOUNT_RESPONSE=$(curl -s -X POST "${API_BASE}/appointments/${APPOINTMENT_ID}/respond-discount" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MECHANIC_TOKEN" \
  -d '{
    "approve": true,
    "newPrice": 5500
  }')

if echo "$DISCOUNT_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ İndirim yanıtı verildi (Yeni fiyat: 5500₺)${NC}\n"
else
  echo -e "${RED}❌ İndirim yanıtı verilemedi${NC}"
  echo "$DISCOUNT_RESPONSE" | jq .
  exit 1
fi

# 13. Driver Fiyatı Onaylar
echo -e "${YELLOW}13. Driver fiyatı onaylıyor...${NC}"
APPROVE_PRICE_RESPONSE=$(curl -s -X POST "${API_BASE}/appointments/${APPOINTMENT_ID}/approve-price" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN")

if echo "$APPROVE_PRICE_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Fiyat onaylandı${NC}\n"
else
  echo -e "${RED}❌ Fiyat onaylanamadı${NC}"
  echo "$APPROVE_PRICE_RESPONSE" | jq .
  exit 1
fi

# 14. Driver Ödeme Yapar
echo -e "${YELLOW}14. Driver ödeme yapıyor...${NC}"
PAYMENT_RESPONSE=$(curl -s -X POST "${API_BASE}/appointments/${APPOINTMENT_ID}/payment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{
    "paymentMethod": "credit_card"
  }')

if echo "$PAYMENT_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Ödeme oluşturuldu${NC}\n"
else
  echo -e "${RED}❌ Ödeme oluşturulamadı${NC}"
  echo "$PAYMENT_RESPONSE" | jq .
  exit 1
fi

# 15. Ödeme Onaylanır
echo -e "${YELLOW}15. Ödeme onaylanıyor...${NC}"
TRANSACTION_ID="TXN_$(date +%s)_$(openssl rand -hex 4 2>/dev/null || echo $RANDOM)"
CONFIRM_RESPONSE=$(curl -s -X POST "${API_BASE}/appointments/${APPOINTMENT_ID}/confirm-payment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d "{
    \"transactionId\": \"$TRANSACTION_ID\"
  }")

if echo "$CONFIRM_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Ödeme onaylandı${NC}\n"
else
  echo -e "${RED}❌ Ödeme onaylanamadı${NC}"
  echo "$CONFIRM_RESPONSE" | jq .
  exit 1
fi

echo -e "${GREEN}=== İndirim İsteği Akışı Tamamlandı! ===${NC}\n"
echo -e "Appointment ID: $APPOINTMENT_ID"
echo -e "Transaction ID: $TRANSACTION_ID"
echo -e "Final Price: 5500₺ (5000₺'den indirimli)"

