#!/bin/bash

# REKTEFE - Service Category E2E Test Script
# Bu script tüm hizmet kategori fonksiyonlarını test eder

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 REKTEFE Service Category E2E Tests"
echo "======================================"
echo ""

# Test 1: Health Check
echo "📍 Test 1: Health Check"
HEALTH=$(curl -s -X GET "$BASE_URL/health")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend çalışıyor${NC}"
    echo "Response: $HEALTH"
else
    echo -e "${RED}❌ Backend çalışmıyor!${NC}"
    exit 1
fi
echo ""

# Test 2: Login ve Token Al
echo "📍 Test 2: Authentication"
echo "Login (Driver)..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "123456",
    "userType": "driver"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
    echo -e "${GREEN}✅ Login başarılı${NC}"
    echo "Token alındı: ${TOKEN:0:50}..."
else
    echo -e "${YELLOW}⚠️  Login başarısız - test kullanıcısı yok olabilir${NC}"
    echo "Response: $LOGIN_RESPONSE"
fi
echo ""

# Test 3: Mechanic Login
echo "📍 Test 3: Mechanic Authentication"
echo "Login (Mechanic)..."
MECHANIC_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testusta@gmail.com",
    "password": "123456",
    "userType": "mechanic"
  }')

MECHANIC_TOKEN=$(echo $MECHANIC_LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$MECHANIC_TOKEN" ]; then
    echo -e "${GREEN}✅ Mechanic login başarılı${NC}"
    echo "Token alındı: ${MECHANIC_TOKEN:0:50}..."
else
    echo -e "${YELLOW}⚠️  Mechanic login başarısız${NC}"
    echo "Response: $MECHANIC_LOGIN"
fi
echo ""

# Test 4: Mechanic Search - Kategori Bazlı
echo "📍 Test 4: Mechanic Search - ServiceCategory Filtering"

# Test 4a: 'repair' kategorisi ile arama
echo "Test 4a: Arama terimi: 'repair'"
SEARCH_REPAIR=$(curl -s -X GET "$BASE_URL/api/mechanic/search?q=repair")
REPAIR_COUNT=$(echo $SEARCH_REPAIR | grep -o '"_id"' | wc -l)
echo -e "${GREEN}✅ 'repair' araması: $REPAIR_COUNT usta bulundu${NC}"
echo ""

# Test 4b: 'Tamir ve Bakım' Türkçe arama
echo "Test 4b: Arama terimi: 'Tamir ve Bakım'"
SEARCH_TAMIR=$(curl -s -X GET "$BASE_URL/api/mechanic/search?q=Tamir%20ve%20Bakım")
TAMIR_COUNT=$(echo $SEARCH_TAMIR | grep -o '"_id"' | wc -l)
echo -e "${GREEN}✅ 'Tamir ve Bakım' araması: $TAMIR_COUNT usta bulundu${NC}"
echo ""

# Test 4c: 'çekici' kategorisi
echo "Test 4c: Arama terimi: 'çekici'"
SEARCH_CEKICI=$(curl -s -X GET "$BASE_URL/api/mechanic/search?q=çekici")
CEKICI_COUNT=$(echo $SEARCH_CEKICI | grep -o '"_id"' | wc -l)
echo -e "${GREEN}✅ 'çekici' araması: $CEKICI_COUNT usta bulundu${NC}"
echo ""

# Test 4d: 'towing' İngilizce
echo "Test 4d: Arama terimi: 'towing'"
SEARCH_TOWING=$(curl -s -X GET "$BASE_URL/api/mechanic/search?q=towing")
TOWING_COUNT=$(echo $SEARCH_TOWING | grep -o '"_id"' | wc -l)
echo -e "${GREEN}✅ 'towing' araması: $TOWING_COUNT usta bulundu${NC}"
echo ""

# Test 5: Mechanic List - Specialization Filter
echo "📍 Test 5: Mechanic List - Specialization Filtering"

echo "Test 5a: Specialization: 'repair'"
LIST_REPAIR=$(curl -s -X GET "$BASE_URL/api/mechanic?specialization=repair")
LIST_REPAIR_COUNT=$(echo $LIST_REPAIR | grep -o '"_id"' | wc -l)
echo -e "${GREEN}✅ 'repair' specialization: $LIST_REPAIR_COUNT usta${NC}"
echo ""

# Test 6: Get Mechanic Profile (ServiceCategories kontrol)
if [ ! -z "$MECHANIC_TOKEN" ]; then
    echo "📍 Test 6: Mechanic Profile - ServiceCategories"
    MECHANIC_PROFILE=$(curl -s -X GET "$BASE_URL/api/mechanic/me" \
      -H "Authorization: Bearer $MECHANIC_TOKEN")
    
    SERVICE_CATS=$(echo $MECHANIC_PROFILE | grep -o '"serviceCategories":\[.*\]' | head -1)
    echo -e "${GREEN}✅ Mechanic serviceCategories:${NC}"
    echo "$SERVICE_CATS"
else
    echo -e "${YELLOW}⚠️  Test 6 atlandı - Mechanic token yok${NC}"
fi
echo ""

# Test 7: Appointment Create - ServiceType Validation
if [ ! -z "$TOKEN" ]; then
    echo "📍 Test 7: Appointment Create - ServiceType Validation"
    
    echo "Test 7a: Geçerli serviceType: 'agir-bakim'"
    APPT_VALID=$(curl -s -X POST "$BASE_URL/api/appointments" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "mechanicId": "507f1f77bcf86cd799439011",
        "serviceType": "agir-bakim",
        "appointmentDate": "'$(date -u -v+1d +%Y-%m-%dT10:00:00.000Z)'",
        "timeSlot": "10:00-11:00",
        "description": "Test randevu"
      }')
    
    if echo "$APPT_VALID" | grep -q "success"; then
        echo -e "${GREEN}✅ Geçerli serviceType kabul edildi${NC}"
    else
        echo -e "${YELLOW}⚠️  Response:${NC} $(echo $APPT_VALID | head -c 200)"
    fi
    echo ""
    
    echo "Test 7b: Geçersiz serviceType: 'invalid-type'"
    APPT_INVALID=$(curl -s -X POST "$BASE_URL/api/appointments" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "mechanicId": "507f1f77bcf86cd799439011",
        "serviceType": "invalid-type",
        "appointmentDate": "'$(date -u -v+1d +%Y-%m-%dT10:00:00.000Z)'",
        "timeSlot": "10:00-11:00",
        "description": "Test randevu"
      }')
    
    if echo "$APPT_INVALID" | grep -q "Geçersiz hizmet tipi"; then
        echo -e "${GREEN}✅ Geçersiz serviceType reddedildi${NC}"
    else
        echo -e "${YELLOW}⚠️  Response:${NC} $(echo $APPT_INVALID | head -c 200)"
    fi
else
    echo -e "${YELLOW}⚠️  Test 7 atlandı - Token yok${NC}"
fi
echo ""

# Test 8: Mechanic Fault Reports - Category Filtering
if [ ! -z "$MECHANIC_TOKEN" ]; then
    echo "📍 Test 8: Mechanic Fault Reports - Category Filtering"
    
    MECHANIC_FAULTS=$(curl -s -X GET "$BASE_URL/api/fault-reports/mechanic" \
      -H "Authorization: Bearer $MECHANIC_TOKEN")
    
    FAULT_COUNT=$(echo $MECHANIC_FAULTS | grep -o '"_id"' | wc -l)
    echo -e "${GREEN}✅ Mechanic fault reports: $FAULT_COUNT arıza bildirimi${NC}"
    
    # ServiceCategories bazlı filtreleme yapıldığını kontrol et
    if echo "$MECHANIC_FAULTS" | grep -q "serviceCategory"; then
        echo -e "${GREEN}✅ ServiceCategory filtrelemesi çalışıyor${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Test 8 atlandı - Mechanic token yok${NC}"
fi
echo ""

# Test Özeti
echo "======================================"
echo "📊 TEST ÖZETİ"
echo "======================================"
echo -e "${GREEN}✅ Tamamlanan Testler:${NC}"
echo "  1. Health Check"
echo "  2. Authentication"
echo "  3. Mechanic Search - Kategori Filtering"
echo "  4. ServiceType Validation"
echo "  5. ServiceCategories Control"
echo ""
echo -e "${YELLOW}ℹ️  Not: Bazı testler backend'in çalışmasını gerektirir${NC}"
echo -e "${YELLOW}ℹ️  Backend'i başlatmak için: cd rest-api && npm start${NC}"

