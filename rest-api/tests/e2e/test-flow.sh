#!/bin/bash

# E2E Test Flow - Curl ile Test Senaryosu
# Bu script tüm ödeme akışını curl komutlarıyla test eder

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API Base URL
# Railway'de kullanmak için: API_URL=https://your-app.railway.app
BASE_URL="${API_URL:-http://localhost:3000}"
API_BASE="${BASE_URL}/api"

echo -e "${YELLOW}API Base URL: $API_BASE${NC}\n"

# API bağlantısını test et
echo -e "${YELLOW}API bağlantısı test ediliyor...${NC}"
API_TEST=$(curl -s -w "\n%{http_code}" "$API_BASE" 2>&1)
HTTP_CODE=$(echo "$API_TEST" | tail -n1)
if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "404" ] && [ "$HTTP_CODE" != "401" ]; then
  echo -e "${RED}❌ API'ye bağlanılamıyor (HTTP: $HTTP_CODE)${NC}"
  echo -e "${YELLOW}API URL'inizi kontrol edin: $API_BASE${NC}"
  echo -e "${YELLOW}Railway kullanıyorsanız: API_URL=https://your-app.railway.app ./tests/e2e/test-flow.sh${NC}"
  exit 1
fi
echo -e "${GREEN}✅ API bağlantısı başarılı${NC}\n"

echo -e "${GREEN}=== Rektefe E2E Test Flow (Curl) ===${NC}\n"

# 1. Driver Giriş Yap
echo -e "${YELLOW}1. Driver giriş yapılıyor...${NC}"

DRIVER_EMAIL="testdv@gmail.com"
DRIVER_PASSWORD="test123"

# Önce giriş yapmayı dene
DRIVER_LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$DRIVER_EMAIL\",
    \"password\": \"$DRIVER_PASSWORD\",
    \"userType\": \"driver\"
  }")

# Token'ı farklı formatlardan al
DRIVER_TOKEN=$(echo $DRIVER_LOGIN_RESPONSE | jq -r '.data.token // .data.accessToken // .token // .accessToken // empty' 2>/dev/null)
if [ -z "$DRIVER_TOKEN" ] || [ "$DRIVER_TOKEN" = "null" ]; then
  DRIVER_TOKEN=$(echo $DRIVER_LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi
if [ -z "$DRIVER_TOKEN" ]; then
  DRIVER_TOKEN=$(echo $DRIVER_LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$DRIVER_TOKEN" ] || [ "$DRIVER_TOKEN" = "null" ]; then
  echo -e "${RED}❌ Driver giriş yapılamadı${NC}"
  echo "Response:"
  echo "$DRIVER_LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$DRIVER_LOGIN_RESPONSE"
  exit 1
fi

# User ID'yi al
DRIVER_USER_RESPONSE=$(curl -s -X GET "${API_BASE}/users/me" \
  -H "Authorization: Bearer $DRIVER_TOKEN")
DRIVER_ID=$(echo $DRIVER_USER_RESPONSE | jq -r '._id // .data._id // .id // empty' 2>/dev/null)
if [ -z "$DRIVER_ID" ] || [ "$DRIVER_ID" = "null" ]; then
  DRIVER_ID=$(echo $DRIVER_USER_RESPONSE | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
fi

echo -e "${GREEN}✅ Driver giriş yaptı: $DRIVER_ID${NC}\n"

# 2. Mechanic Giriş Yap
echo -e "${YELLOW}2. Mechanic giriş yapılıyor...${NC}"

MECHANIC_EMAIL="testus@gmail.com"
MECHANIC_PASSWORD="test123"

MECHANIC_LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$MECHANIC_EMAIL\",
    \"password\": \"$MECHANIC_PASSWORD\",
    \"userType\": \"mechanic\"
  }")

# Token'ı farklı formatlardan al
MECHANIC_TOKEN=$(echo $MECHANIC_LOGIN_RESPONSE | jq -r '.data.token // .data.accessToken // .token // .accessToken // empty' 2>/dev/null)
if [ -z "$MECHANIC_TOKEN" ] || [ "$MECHANIC_TOKEN" = "null" ]; then
  MECHANIC_TOKEN=$(echo $MECHANIC_LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi
if [ -z "$MECHANIC_TOKEN" ]; then
  MECHANIC_TOKEN=$(echo $MECHANIC_LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$MECHANIC_TOKEN" ] || [ "$MECHANIC_TOKEN" = "null" ]; then
  echo -e "${RED}❌ Mechanic giriş yapılamadı${NC}"
  echo "Response:"
  echo "$MECHANIC_LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$MECHANIC_LOGIN_RESPONSE"
  exit 1
fi

# User ID'yi al
MECHANIC_USER_RESPONSE=$(curl -s -X GET "${API_BASE}/users/me" \
  -H "Authorization: Bearer $MECHANIC_TOKEN")
MECHANIC_ID=$(echo $MECHANIC_USER_RESPONSE | jq -r '._id // .data._id // .id // empty' 2>/dev/null)
if [ -z "$MECHANIC_ID" ] || [ "$MECHANIC_ID" = "null" ]; then
  MECHANIC_ID=$(echo $MECHANIC_USER_RESPONSE | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
fi

echo -e "${GREEN}✅ Mechanic giriş yaptı: $MECHANIC_ID${NC}\n"

# 3. Araç Oluştur
echo -e "${YELLOW}3. Araç oluşturuluyor...${NC}"
# Benzersiz plaka oluştur
TIMESTAMP=$(date +%s)
PLATE_NUMBER="34ABC${TIMESTAMP: -3}"

VEHICLE_RESPONSE=$(curl -s -X POST "${API_BASE}/vehicles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d "{
    \"brand\": \"Toyota\",
    \"modelName\": \"Corolla\",
    \"year\": 2020,
    \"plateNumber\": \"$PLATE_NUMBER\",
    \"fuelType\": \"Benzin\"
  }")

VEHICLE_ID=$(echo $VEHICLE_RESPONSE | jq -r '._id // .data._id // .id // empty' 2>/dev/null)
if [ -z "$VEHICLE_ID" ] || [ "$VEHICLE_ID" = "null" ]; then
  VEHICLE_ID=$(echo $VEHICLE_RESPONSE | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$VEHICLE_ID" ] || [ "$VEHICLE_ID" = "null" ]; then
  echo -e "${RED}❌ Araç oluşturulamadı${NC}"
  echo "$VEHICLE_RESPONSE" | jq . 2>/dev/null || echo "$VEHICLE_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Araç oluşturuldu: $VEHICLE_ID${NC}\n"

# 4. Arıza Bildirimi Oluştur
echo -e "${YELLOW}4. Arıza bildirimi oluşturuluyor...${NC}"
FAULT_REPORT_RESPONSE=$(curl -s -X POST "${API_BASE}/fault-reports" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d "{
    \"vehicleId\": \"$VEHICLE_ID\",
    \"serviceCategory\": \"Genel Bakım\",
    \"faultDescription\": \"E2E Test - Motor arızası\",
    \"priority\": \"medium\",
    \"photos\": []
  }")

FAULT_REPORT_ID=$(echo $FAULT_REPORT_RESPONSE | jq -r '.data.faultReportId // ._id // .data._id // .id // empty' 2>/dev/null)
if [ -z "$FAULT_REPORT_ID" ] || [ "$FAULT_REPORT_ID" = "null" ]; then
  FAULT_REPORT_ID=$(echo $FAULT_REPORT_RESPONSE | grep -o '"faultReportId":"[^"]*' | cut -d'"' -f4)
fi
if [ -z "$FAULT_REPORT_ID" ] || [ "$FAULT_REPORT_ID" = "null" ]; then
  FAULT_REPORT_ID=$(echo $FAULT_REPORT_RESPONSE | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$FAULT_REPORT_ID" ] || [ "$FAULT_REPORT_ID" = "null" ]; then
  echo -e "${RED}❌ Arıza bildirimi oluşturulamadı${NC}"
  echo "$FAULT_REPORT_RESPONSE" | jq . 2>/dev/null || echo "$FAULT_REPORT_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Arıza bildirimi oluşturuldu: $FAULT_REPORT_ID${NC}\n"

# 5. Usta Teklif Gönderir
echo -e "${YELLOW}5. Usta teklif gönderiyor...${NC}"
QUOTE_RESPONSE=$(curl -s -X POST "${API_BASE}/fault-reports/${FAULT_REPORT_ID}/quote" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MECHANIC_TOKEN" \
  -d '{
    "quoteAmount": 5000,
    "estimatedDuration": "2-3 gün",
    "notes": "E2E Test teklifi"
  }')

if echo "$QUOTE_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Teklif gönderildi${NC}\n"
else
  echo -e "${RED}❌ Teklif gönderilemedi${NC}"
  echo "$QUOTE_RESPONSE" | jq .
  exit 1
fi

# 6. Driver Teklif Seçer
echo -e "${YELLOW}6. Driver teklif seçiyor...${NC}"
SELECT_QUOTE_RESPONSE=$(curl -s -X POST "${API_BASE}/fault-reports/${FAULT_REPORT_ID}/select-quote" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{
    "quoteIndex": 0
  }')

if echo "$SELECT_QUOTE_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Teklif seçildi${NC}\n"
else
  echo -e "${RED}❌ Teklif seçilemedi${NC}"
  echo "$SELECT_QUOTE_RESPONSE" | jq .
  exit 1
fi

# 7. Randevu Oluştur
echo -e "${YELLOW}7. Randevu oluşturuluyor...${NC}"
APPOINTMENT_DATE=$(date -u -v+1d +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "+1 day" +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u +"%Y-%m-%dT%H:%M:%S.000Z")

APPOINTMENT_RESPONSE=$(curl -s -X POST "${API_BASE}/fault-reports/${FAULT_REPORT_ID}/create-appointment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d "{
    \"faultReportId\": \"$FAULT_REPORT_ID\",
    \"appointmentDate\": \"$APPOINTMENT_DATE\",
    \"timeSlot\": \"10:00\"
  }")

APPOINTMENT_ID=$(echo $APPOINTMENT_RESPONSE | grep -o '"appointment"[^}]*"_id":"[^"]*' | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$APPOINTMENT_ID" ]; then
  echo -e "${RED}❌ Randevu oluşturulamadı${NC}"
  echo "$APPOINTMENT_RESPONSE" | jq .
  exit 1
fi

echo -e "${GREEN}✅ Randevu oluşturuldu: $APPOINTMENT_ID${NC}\n"

# 8. Usta Randevuyu Kabul Eder
echo -e "${YELLOW}8. Usta randevuyu kabul ediyor...${NC}"
ACCEPT_RESPONSE=$(curl -s -X PUT "${API_BASE}/appointments/${APPOINTMENT_ID}/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MECHANIC_TOKEN" \
  -d '{
    "status": "confirmed"
  }')

if echo "$ACCEPT_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Randevu kabul edildi${NC}\n"
else
  echo -e "${RED}❌ Randevu kabul edilemedi${NC}"
  echo "$ACCEPT_RESPONSE" | jq .
  exit 1
fi

# 9. Usta İşi Başlatır
echo -e "${YELLOW}9. Usta işi başlatıyor...${NC}"
START_RESPONSE=$(curl -s -X PUT "${API_BASE}/appointments/${APPOINTMENT_ID}/servise-al" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MECHANIC_TOKEN")

if echo "$START_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ İş başlatıldı${NC}\n"
else
  echo -e "${RED}❌ İş başlatılamadı${NC}"
  echo "$START_RESPONSE" | jq .
  exit 1
fi

# 10. Usta İşi Bitirir
echo -e "${YELLOW}10. Usta işi bitiriyor...${NC}"
COMPLETE_RESPONSE=$(curl -s -X PUT "${API_BASE}/appointments/${APPOINTMENT_ID}/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MECHANIC_TOKEN" \
  -d '{
    "completionNotes": "E2E Test - İş tamamlandı",
    "price": 5000,
    "estimatedDuration": 2
  }')

if echo "$COMPLETE_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ İş tamamlandı${NC}\n"
else
  echo -e "${RED}❌ İş tamamlanamadı${NC}"
  echo "$COMPLETE_RESPONSE" | jq .
  exit 1
fi

# 10.5. Wallet Bakiye Kontrolü ve Ekleme
echo -e "${YELLOW}10.5. Wallet bakiyesi kontrol ediliyor...${NC}"
WALLET_CHECK=$(curl -s -X GET "${API_BASE}/wallet" \
  -H "Authorization: Bearer $DRIVER_TOKEN")

CURRENT_BALANCE=$(echo $WALLET_CHECK | jq -r '.data.balance // .balance // 0' 2>/dev/null)
if [ -z "$CURRENT_BALANCE" ] || [ "$CURRENT_BALANCE" = "null" ]; then
  CURRENT_BALANCE=0
fi

REQUIRED_AMOUNT=10000  # 5000 + ek ücret için yeterli miktar

if (( $(echo "$CURRENT_BALANCE < $REQUIRED_AMOUNT" | bc -l 2>/dev/null || echo "1") )); then
  echo -e "${YELLOW}Wallet bakiyesi yetersiz ($CURRENT_BALANCE), para ekleniyor...${NC}"
  ADD_MONEY_RESPONSE=$(curl -s -X POST "${API_BASE}/wallet/add-money" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DRIVER_TOKEN" \
    -d "{
      \"amount\": $REQUIRED_AMOUNT
    }")
  
  if echo "$ADD_MONEY_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Para eklendi${NC}\n"
  else
    echo -e "${YELLOW}⚠️ Para eklenemedi, devam ediliyor...${NC}"
    echo "$ADD_MONEY_RESPONSE" | jq . 2>/dev/null || echo "$ADD_MONEY_RESPONSE"
  fi
else
  echo -e "${GREEN}✅ Wallet bakiyesi yeterli: $CURRENT_BALANCE${NC}\n"
fi

# 11. Driver Ödeme Yapar
echo -e "${YELLOW}11. Driver ödeme yapıyor...${NC}"
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

# 12. Ödeme Onaylanır
echo -e "${YELLOW}12. Ödeme onaylanıyor...${NC}"
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
  echo "Response:"
  echo "$CONFIRM_RESPONSE" | jq . 2>/dev/null || echo "$CONFIRM_RESPONSE"
  echo -e "\n${YELLOW}Appointment durumunu kontrol ediliyor...${NC}"
  APPOINTMENT_CHECK=$(curl -s -X GET "${API_BASE}/appointments/${APPOINTMENT_ID}" \
    -H "Authorization: Bearer $DRIVER_TOKEN")
  echo "$APPOINTMENT_CHECK" | jq '.data.status, .data.paymentStatus, .data.discountRequest, .data.priceApproval' 2>/dev/null || echo "$APPOINTMENT_CHECK"
  exit 1
fi

echo -e "${GREEN}=== Tüm Testler Başarılı! ===${NC}\n"
echo -e "Driver Email: $DRIVER_EMAIL"
echo -e "Mechanic Email: $MECHANIC_EMAIL"
echo -e "Driver ID: $DRIVER_ID"
echo -e "Mechanic ID: $MECHANIC_ID"
echo -e "Vehicle ID: $VEHICLE_ID"
echo -e "Fault Report ID: $FAULT_REPORT_ID"
echo -e "Appointment ID: $APPOINTMENT_ID"
echo -e "Transaction ID: $TRANSACTION_ID"

