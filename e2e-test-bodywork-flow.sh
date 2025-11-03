#!/bin/bash

# ========================================
# E2E Test Script - Kaporta/Boya Arıza Bildirimi Akışı
# ========================================
# Bu script, kaporta/boya arıza bildirimi akışını baştan sona test eder
# Tüm adımları sırayla çalıştırır ve sonuçları raporlar

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Base URL (Değiştirilebilir)
API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}E2E Test - Kaporta/Boya Akışı${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Backend kontrolü
echo -e "${YELLOW}[KONTROL] Backend bağlantısı kontrol ediliyor...${NC}"
BACKEND_CHECK=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_BASE_URL/auth/login" -H "Content-Type: application/json" -d '{"email":"test","password":"test","userType":"driver"}' 2>/dev/null || echo "000")
if [ "$BACKEND_CHECK" = "000" ] || [ -z "$BACKEND_CHECK" ] || [ "$BACKEND_CHECK" = "" ]; then
    echo -e "${RED}✗ Backend erişilemiyor!${NC}"
    echo -e "${YELLOW}Lütfen backend'in çalıştığından emin olun:${NC}"
    echo "  cd rest-api && npm start"
    echo ""
    echo -e "${YELLOW}Alternatif olarak Railway/Production URL'i kullanabilirsiniz:${NC}"
    echo "  export API_BASE_URL=https://your-railway-url.com/api"
    echo ""
    if [ -t 0 ]; then
        # Interactive mode
        read -p "Devam etmek istiyor musunuz? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        # Non-interactive mode - otomatik devam et
        echo -e "${YELLOW}Non-interactive mode: Test devam ediyor...${NC}"
    fi
else
    echo -e "${GREEN}✓ Backend erişilebilir (HTTP $BACKEND_CHECK)${NC}"
    echo ""
fi

# Test değişkenleri (Environment variable'dan alınabilir)
DRIVER_EMAIL="${DRIVER_EMAIL:-driver@test.com}"
DRIVER_PASSWORD="${DRIVER_PASSWORD:-test123}"
MECHANIC_EMAIL="${MECHANIC_EMAIL:-mechanic@test.com}"
MECHANIC_PASSWORD="${MECHANIC_PASSWORD:-test123}"

echo -e "${YELLOW}Test Kullanıcıları:${NC}"
echo "  Driver: $DRIVER_EMAIL"
echo "  Mechanic: $MECHANIC_EMAIL"
echo ""
echo -e "${YELLOW}Not: Kullanıcılar veritabanında yoksa test başarısız olacaktır.${NC}"
echo "Farklı kullanıcılar için environment variable kullanın:"
echo "  export DRIVER_EMAIL=\"your-driver@email.com\""
echo "  export MECHANIC_EMAIL=\"your-mechanic@email.com\""
echo ""

DRIVER_TOKEN=""
MECHANIC_TOKEN=""
DRIVER_ID=""
MECHANIC_ID=""
VEHICLE_ID=""
FAULT_REPORT_ID=""
BODYWORK_JOB_ID=""
APPOINTMENT_ID=""

# ========================================
# Helper Functions
# ========================================

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# ========================================
# TEST 1: Driver Login
# ========================================
echo -e "\n${BLUE}[TEST 1] Driver Login${NC}"
DRIVER_LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$DRIVER_EMAIL\",
    \"password\": \"$DRIVER_PASSWORD\",
    \"userType\": \"driver\"
  }")

if echo "$DRIVER_LOGIN_RESPONSE" | grep -q "success.*true"; then
    DRIVER_TOKEN=$(echo "$DRIVER_LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    DRIVER_ID=$(echo "$DRIVER_LOGIN_RESPONSE" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
    print_success "Driver login başarılı"
    echo "Token: ${DRIVER_TOKEN:0:20}..."
    echo "Driver ID: $DRIVER_ID"
else
    print_error "Driver login başarısız"
    echo "$DRIVER_LOGIN_RESPONSE"
    exit 1
fi

# ========================================
# TEST 2: Mechanic Login
# ========================================
echo -e "\n${BLUE}[TEST 2] Mechanic Login${NC}"
MECHANIC_LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$MECHANIC_EMAIL\",
    \"password\": \"$MECHANIC_PASSWORD\",
    \"userType\": \"mechanic\"
  }")

if echo "$MECHANIC_LOGIN_RESPONSE" | grep -q "success.*true"; then
    MECHANIC_TOKEN=$(echo "$MECHANIC_LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    MECHANIC_ID=$(echo "$MECHANIC_LOGIN_RESPONSE" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
    print_success "Mechanic login başarılı"
    echo "Token: ${MECHANIC_TOKEN:0:20}..."
    echo "Mechanic ID: $MECHANIC_ID"
else
    print_error "Mechanic login başarısız"
    echo "$MECHANIC_LOGIN_RESPONSE"
    exit 1
fi

# ========================================
# TEST 3: Driver Vehicles Listesi (Vehicle ID almak için)
# ========================================
echo -e "\n${BLUE}[TEST 3] Driver Vehicles Listesi${NC}"
VEHICLES_RESPONSE=$(curl -s -X GET "$API_BASE_URL/vehicles" \
  -H "Authorization: Bearer $DRIVER_TOKEN")

if echo "$VEHICLES_RESPONSE" | grep -q "success.*true\|data.*\["; then
    VEHICLE_ID=$(echo "$VEHICLES_RESPONSE" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
    if [ -z "$VEHICLE_ID" ]; then
        print_warning "Araç bulunamadı, yeni araç oluşturulmalı"
        # Araç oluşturma işlemi eklenebilir
    else
        print_success "Araç bulundu"
        echo "Vehicle ID: $VEHICLE_ID"
    fi
else
    print_error "Araçlar alınamadı"
    echo "$VEHICLES_RESPONSE"
    exit 1
fi

# ========================================
# TEST 4: Kaporta/Boya Arıza Bildirimi Oluşturma
# ========================================
echo -e "\n${BLUE}[TEST 4] Kaporta/Boya Arıza Bildirimi Oluşturma${NC}"
FAULT_REPORT_DATA=$(cat <<EOF
{
  "vehicleId": "$VEHICLE_ID",
  "serviceCategory": "Kaporta/Boya",
  "faultDescription": "Ön tampon çizik var, boya gerekiyor",
  "priority": "medium",
  "photos": [
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg"
  ],
  "videos": []
}
EOF
)

FAULT_REPORT_RESPONSE=$(curl -s -X POST "$API_BASE_URL/fault-reports" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$FAULT_REPORT_DATA")

if echo "$FAULT_REPORT_RESPONSE" | grep -q "success.*true"; then
    # Önce faultReportId field'ını kontrol et
    FAULT_REPORT_ID=$(echo "$FAULT_REPORT_RESPONSE" | grep -o '"faultReportId":"[^"]*' | cut -d'"' -f4)
    # Eğer yoksa _id field'ını kontrol et
    if [ -z "$FAULT_REPORT_ID" ]; then
        FAULT_REPORT_ID=$(echo "$FAULT_REPORT_RESPONSE" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
    fi
    # Eğe hala yoksa data içindeki _id'yi kontrol et
    if [ -z "$FAULT_REPORT_ID" ]; then
        FAULT_REPORT_ID=$(echo "$FAULT_REPORT_RESPONSE" | grep -o '"data":{[^}]*"_id":"[^"]*' | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
    fi
    print_success "Arıza bildirimi oluşturuldu"
    echo "Fault Report ID: $FAULT_REPORT_ID"
    echo "Response: $FAULT_REPORT_RESPONSE"
else
    print_error "Arıza bildirimi oluşturulamadı"
    echo "$FAULT_REPORT_RESPONSE"
    exit 1
fi

# ========================================
# TEST 5: Mechanic - Arıza Bildirimlerini Listeleme
# ========================================
echo -e "\n${BLUE}[TEST 5] Mechanic - Arıza Bildirimlerini Listeleme${NC}"
MECHANIC_REPORTS_RESPONSE=$(curl -s -X GET "$API_BASE_URL/fault-reports/mechanic/reports?status=all" \
  -H "Authorization: Bearer $MECHANIC_TOKEN")

if echo "$MECHANIC_REPORTS_RESPONSE" | grep -q "success.*true\|faultReports"; then
    print_success "Arıza bildirimleri listelendi"
    echo "$MECHANIC_REPORTS_RESPONSE" | head -20
else
    print_error "Arıza bildirimleri alınamadı"
    echo "$MECHANIC_REPORTS_RESPONSE"
fi

# ========================================
# TEST 6: Mechanic - Arıza Bildirimi Detayı
# ========================================
echo -e "\n${BLUE}[TEST 6] Mechanic - Arıza Bildirimi Detayı${NC}"
FAULT_REPORT_DETAIL_RESPONSE=$(curl -s -X GET "$API_BASE_URL/fault-reports/mechanic/$FAULT_REPORT_ID" \
  -H "Authorization: Bearer $MECHANIC_TOKEN")

if echo "$FAULT_REPORT_DETAIL_RESPONSE" | grep -q "success.*true"; then
    print_success "Arıza bildirimi detayı alındı"
    # BodyworkJobId kontrolü
    if echo "$FAULT_REPORT_DETAIL_RESPONSE" | grep -q "bodyworkJobId"; then
        print_warning "BodyworkJobId zaten mevcut (önceki testten kalmış olabilir)"
    fi
    echo "$FAULT_REPORT_DETAIL_RESPONSE" | head -30
else
    print_error "Arıza bildirimi detayı alınamadı"
    echo "$FAULT_REPORT_DETAIL_RESPONSE"
fi

# ========================================
# TEST 7: Mechanic - Teklif Verme
# ========================================
echo -e "\n${BLUE}[TEST 7] Mechanic - Teklif Verme${NC}"
QUOTE_DATA=$(cat <<EOF
{
  "quoteAmount": 5000,
  "estimatedDuration": "5-7 gün",
  "notes": "Ön tampon boyama ve çizik düzeltme işlemi yapılacak"
}
EOF
)

QUOTE_RESPONSE=$(curl -s -X POST "$API_BASE_URL/fault-reports/$FAULT_REPORT_ID/quote" \
  -H "Authorization: Bearer $MECHANIC_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$QUOTE_DATA")

if echo "$QUOTE_RESPONSE" | grep -q "success.*true"; then
    print_success "Teklif verildi"
    echo "$QUOTE_RESPONSE"
else
    print_error "Teklif verilemedi"
    echo "$QUOTE_RESPONSE"
fi

# ========================================
# TEST 8: Driver - Arıza Bildirimi Detayı (Teklifleri görmek için)
# ========================================
echo -e "\n${BLUE}[TEST 8] Driver - Arıza Bildirimi Detayı${NC}"
DRIVER_FAULT_REPORT_DETAIL=$(curl -s -X GET "$API_BASE_URL/fault-reports/$FAULT_REPORT_ID" \
  -H "Authorization: Bearer $DRIVER_TOKEN")

if echo "$DRIVER_FAULT_REPORT_DETAIL" | grep -q "success.*true"; then
    print_success "Driver arıza bildirimi detayı alındı"
    QUOTE_COUNT=$(echo "$DRIVER_FAULT_REPORT_DETAIL" | grep -o '"quotes":\[' | wc -l)
    if [ "$QUOTE_COUNT" -gt 0 ]; then
        print_success "Teklifler mevcut"
    fi
    echo "$DRIVER_FAULT_REPORT_DETAIL" | head -30
else
    print_error "Driver arıza bildirimi detayı alınamadı"
    echo "$DRIVER_FAULT_REPORT_DETAIL"
fi

# ========================================
# TEST 9: Driver - Teklif Seçme
# ========================================
echo -e "\n${BLUE}[TEST 9] Driver - Teklif Seçme${NC}"
# Önce quotes array'inden ilk teklifin index'ini al (0-based)
# Driver fault report detail'de quotes[0] varsa quoteIndex=0
SELECT_QUOTE_DATA='{"quoteIndex": 0}'

SELECT_QUOTE_RESPONSE=$(curl -s -X POST "$API_BASE_URL/fault-reports/$FAULT_REPORT_ID/select-quote" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$SELECT_QUOTE_DATA")

if echo "$SELECT_QUOTE_RESPONSE" | grep -q "success.*true"; then
    print_success "Teklif seçildi"
    echo "$SELECT_QUOTE_RESPONSE"
else
    print_error "Teklif seçilemedi"
    echo "$SELECT_QUOTE_RESPONSE"
fi

# ========================================
# TEST 10: Driver - Randevu Oluşturma (Otomatik BodyworkJob oluşacak)
# ========================================
echo -e "\n${BLUE}[TEST 10] Driver - Randevu Oluşturma (Otomatik BodyworkJob)${NC}"
# Randevu için tarih: 3 gün sonra
APPOINTMENT_DATE=$(date -u -v+3d +"%Y-%m-%dT10:00:00.000Z" 2>/dev/null || date -u -d "+3 days" +"%Y-%m-%dT10:00:00.000Z" 2>/dev/null || date -u +"%Y-%m-%dT10:00:00.000Z")

CREATE_APPOINTMENT_DATA=$(cat <<EOF
{
  "faultReportId": "$FAULT_REPORT_ID",
  "appointmentDate": "$APPOINTMENT_DATE",
  "timeSlot": "10:00-12:00"
}
EOF
)

CREATE_APPOINTMENT_RESPONSE=$(curl -s -X POST "$API_BASE_URL/fault-reports/$FAULT_REPORT_ID/create-appointment" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$CREATE_APPOINTMENT_DATA")

if echo "$CREATE_APPOINTMENT_RESPONSE" | grep -q "success.*true"; then
    print_success "Randevu oluşturuldu"
    APPOINTMENT_ID=$(echo "$CREATE_APPOINTMENT_RESPONSE" | grep -o '"appointment":{[^}]*"_id":"[^"]*' | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
    
    # BodyworkJob kontrolü
    if echo "$CREATE_APPOINTMENT_RESPONSE" | grep -q "bodyworkJob\|kaporta işi"; then
        print_success "✅ Otomatik BodyworkJob oluşturuldu!"
        BODYWORK_JOB_ID=$(echo "$CREATE_APPOINTMENT_RESPONSE" | grep -o '"bodyworkJob":{[^}]*"_id":"[^"]*' | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
        if [ -n "$BODYWORK_JOB_ID" ]; then
            echo "BodyworkJob ID: $BODYWORK_JOB_ID"
        fi
    else
        print_warning "BodyworkJob bilgisi response'da yok"
    fi
    
    echo "$CREATE_APPOINTMENT_RESPONSE"
else
    print_error "Randevu oluşturulamadı"
    echo "$CREATE_APPOINTMENT_RESPONSE"
fi

# ========================================
# TEST 11: FaultReport'u Kontrol Et (BodyworkJobId olmalı)
# ========================================
echo -e "\n${BLUE}[TEST 11] FaultReport BodyworkJobId Kontrolü${NC}"
# BodyworkJob response'da varsa, FaultReport'ta da olmalı
if [ -n "$BODYWORK_JOB_ID" ]; then
    print_success "BodyworkJob ID mevcut: $BODYWORK_JOB_ID"
    echo "FaultReport'ta bodyworkJobId kontrol ediliyor..."
fi
UPDATED_FAULT_REPORT=$(curl -s -X GET "$API_BASE_URL/fault-reports/$FAULT_REPORT_ID" \
  -H "Authorization: Bearer $DRIVER_TOKEN")

if echo "$UPDATED_FAULT_REPORT" | grep -q "bodyworkJobId"; then
    print_success "✅ BodyworkJobId FaultReport'a eklenmiş!"
    BODYWORK_JOB_ID=$(echo "$UPDATED_FAULT_REPORT" | grep -o '"bodyworkJobId":"[^"]*' | cut -d'"' -f4)
    if [ -z "$BODYWORK_JOB_ID" ]; then
        BODYWORK_JOB_ID=$(echo "$UPDATED_FAULT_REPORT" | grep -o '"bodyworkJobId":{[^}]*"_id":"[^"]*' | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
    fi
    echo "BodyworkJob ID: $BODYWORK_JOB_ID"
else
    print_warning "BodyworkJobId bulunamadı (henüz oluşturulmamış olabilir)"
fi

# ========================================
# TEST 12: Mechanic - Bodywork İşlerini Listeleme
# ========================================
echo -e "\n${BLUE}[TEST 12] Mechanic - Bodywork İşlerini Listeleme${NC}"
BODYWORK_JOBS_RESPONSE=$(curl -s -X GET "$API_BASE_URL/bodywork/mechanic-jobs?status=all" \
  -H "Authorization: Bearer $MECHANIC_TOKEN")

if echo "$BODYWORK_JOBS_RESPONSE" | grep -q "success.*true\|data.*\["; then
    print_success "Bodywork işleri listelendi"
    if echo "$BODYWORK_JOBS_RESPONSE" | grep -q "$BODYWORK_JOB_ID"; then
        print_success "✅ Oluşturulan BodyworkJob listede mevcut!"
    fi
    echo "$BODYWORK_JOBS_RESPONSE" | head -30
else
    print_error "Bodywork işleri alınamadı"
    echo "$BODYWORK_JOBS_RESPONSE"
fi

# ========================================
# TEST 13: Mechanic - Manuel Dönüşüm (Alternatif Akış)
# ========================================
echo -e "\n${BLUE}[TEST 13] Yeni Arıza Bildirimi - Manuel Dönüşüm Testi${NC}"
# Yeni bir arıza bildirimi oluştur
NEW_FAULT_REPORT_DATA=$(cat <<EOF
{
  "vehicleId": "$VEHICLE_ID",
  "serviceCategory": "Kaporta/Boya",
  "faultDescription": "Yan kapı çökme var",
  "priority": "high",
  "photos": ["https://example.com/dent.jpg"],
  "videos": []
}
EOF
)

NEW_FAULT_REPORT_RESPONSE=$(curl -s -X POST "$API_BASE_URL/fault-reports" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$NEW_FAULT_REPORT_DATA")

NEW_FAULT_REPORT_ID=$(echo "$NEW_FAULT_REPORT_RESPONSE" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$NEW_FAULT_REPORT_ID" ]; then
    print_success "Yeni arıza bildirimi oluşturuldu: $NEW_FAULT_REPORT_ID"
    
    # Teklif ver
    NEW_QUOTE_RESPONSE=$(curl -s -X POST "$API_BASE_URL/fault-reports/$NEW_FAULT_REPORT_ID/quote" \
      -H "Authorization: Bearer $MECHANIC_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"quoteAmount": 6000, "estimatedDuration": "7-10 gün", "notes": "Yan kapı düzeltme"}')
    
    if echo "$NEW_QUOTE_RESPONSE" | grep -q "success.*true"; then
        print_success "Yeni bildirime teklif verildi"
        
        # Teklif seç
        SELECT_NEW_QUOTE=$(curl -s -X POST "$API_BASE_URL/fault-reports/$NEW_FAULT_REPORT_ID/select-quote" \
          -H "Authorization: Bearer $DRIVER_TOKEN" \
          -H "Content-Type: application/json" \
          -d "{\"mechanicId\": \"$MECHANIC_ID\", \"quoteAmount\": 6000}")
        
        if echo "$SELECT_NEW_QUOTE" | grep -q "success.*true"; then
            print_success "Yeni bildirimde teklif seçildi"
            
            # Manuel dönüşüm testi
            echo -e "\n${BLUE}[TEST 13.1] Mechanic - Manuel Dönüşüm (Kaporta İşine Dönüştür)${NC}"
            CONVERT_RESPONSE=$(curl -s -X POST "$API_BASE_URL/fault-reports/$NEW_FAULT_REPORT_ID/convert-to-bodywork-job" \
              -H "Authorization: Bearer $MECHANIC_TOKEN" \
              -H "Content-Type: application/json" \
              -d "{\"mechanicId\": \"$MECHANIC_ID\"}")
            
            if echo "$CONVERT_RESPONSE" | grep -q "success.*true"; then
                print_success "✅ Manuel dönüşüm başarılı!"
                NEW_BODYWORK_JOB_ID=$(echo "$CONVERT_RESPONSE" | grep -o '"bodyworkJob":{[^}]*"_id":"[^"]*' | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
                if [ -n "$NEW_BODYWORK_JOB_ID" ]; then
                    echo "Yeni BodyworkJob ID: $NEW_BODYWORK_JOB_ID"
                fi
                echo "$CONVERT_RESPONSE"
            else
                print_error "Manuel dönüşüm başarısız"
                echo "$CONVERT_RESPONSE"
            fi
        fi
    fi
fi

# ========================================
# TEST 14: Driver - Bodywork İşlerini Listeleme
# ========================================
echo -e "\n${BLUE}[TEST 14] Driver - Bodywork İşlerini Listeleme${NC}"
DRIVER_BODYWORK_JOBS=$(curl -s -X GET "$API_BASE_URL/bodywork/customer/jobs?status=all" \
  -H "Authorization: Bearer $DRIVER_TOKEN")

if echo "$DRIVER_BODYWORK_JOBS" | grep -q "success.*true\|data.*\["; then
    print_success "Driver bodywork işleri listelendi"
    if [ -n "$BODYWORK_JOB_ID" ] && echo "$DRIVER_BODYWORK_JOBS" | grep -q "$BODYWORK_JOB_ID"; then
        print_success "✅ Oluşturulan BodyworkJob driver listesinde mevcut!"
    fi
    echo "$DRIVER_BODYWORK_JOBS" | head -30
else
    print_error "Driver bodywork işleri alınamadı"
    echo "$DRIVER_BODYWORK_JOBS"
fi

# ========================================
# TEST 15: BodyworkJob Detayı
# ========================================
if [ -n "$BODYWORK_JOB_ID" ]; then
    echo -e "\n${BLUE}[TEST 15] BodyworkJob Detayı${NC}"
    BODYWORK_JOB_DETAIL=$(curl -s -X GET "$API_BASE_URL/bodywork/customer/$BODYWORK_JOB_ID" \
      -H "Authorization: Bearer $DRIVER_TOKEN")
    
    if echo "$BODYWORK_JOB_DETAIL" | grep -q "success.*true"; then
        print_success "BodyworkJob detayı alındı"
        echo "$BODYWORK_JOB_DETAIL" | head -40
    else
        print_error "BodyworkJob detayı alınamadı"
        echo "$BODYWORK_JOB_DETAIL"
    fi
fi

# ========================================
# TEST 16: Mechanic - BodyworkJob Detayı
# ========================================
if [ -n "$BODYWORK_JOB_ID" ]; then
    echo -e "\n${BLUE}[TEST 16] Mechanic - BodyworkJob Detayı${NC}"
    MECHANIC_BODYWORK_DETAIL=$(curl -s -X GET "$API_BASE_URL/bodywork/$BODYWORK_JOB_ID" \
      -H "Authorization: Bearer $MECHANIC_TOKEN")
    
    if echo "$MECHANIC_BODYWORK_DETAIL" | grep -q "success.*true"; then
        print_success "Mechanic bodywork job detayı alındı"
        echo "$MECHANIC_BODYWORK_DETAIL" | head -40
    else
        print_error "Mechanic bodywork job detayı alınamadı"
        echo "$MECHANIC_BODYWORK_DETAIL"
    fi
fi

# ========================================
# ÖZET RAPOR
# ========================================
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}TEST ÖZET RAPORU${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Driver ID: $DRIVER_ID"
echo "Mechanic ID: $MECHANIC_ID"
echo "Vehicle ID: $VEHICLE_ID"
echo "Fault Report ID: $FAULT_REPORT_ID"
echo "Appointment ID: $APPOINTMENT_ID"
echo "Bodywork Job ID: $BODYWORK_JOB_ID"
echo ""
echo -e "${GREEN}✅ Test tamamlandı!${NC}"
echo ""
echo "Not: Gerçek test için API_BASE_URL'i güncelleyin:"
echo "export API_BASE_URL=https://your-api-url.com/api"
echo "bash e2e-test-bodywork-flow.sh"

