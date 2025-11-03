#!/bin/bash

# ========================================
# Individual Test Functions - Kaporta/Boya Akışı
# ========================================
# Her fonksiyon bağımsız olarak test edilebilir

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api}"

# ========================================
# 1. Driver Login
# ========================================
test_driver_login() {
    echo -e "${BLUE}[TEST] Driver Login${NC}"
    local email="${1:-driver@test.com}"
    local password="${2:-test123}"
    
    curl -s -X POST "$API_BASE_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$email\",
        \"password\": \"$password\",
        \"userType\": \"driver\"
      }" | jq '.'
}

# ========================================
# 2. Mechanic Login
# ========================================
test_mechanic_login() {
    echo -e "${BLUE}[TEST] Mechanic Login${NC}"
    local email="${1:-mechanic@test.com}"
    local password="${2:-test123}"
    
    curl -s -X POST "$API_BASE_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$email\",
        \"password\": \"$password\",
        \"userType\": \"mechanic\"
      }" | jq '.'
}

# ========================================
# 3. Kaporta/Boya Arıza Bildirimi Oluştur
# ========================================
test_create_bodywork_fault_report() {
    echo -e "${BLUE}[TEST] Kaporta/Boya Arıza Bildirimi Oluştur${NC}"
    local token="$1"
    local vehicle_id="$2"
    
    curl -s -X POST "$API_BASE_URL/fault-reports" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "{
        \"vehicleId\": \"$vehicle_id\",
        \"serviceCategory\": \"Kaporta/Boya\",
        \"faultDescription\": \"Ön tampon çizik var, boya gerekiyor\",
        \"priority\": \"medium\",
        \"photos\": [
          \"https://example.com/photo1.jpg\",
          \"https://example.com/photo2.jpg\"
        ],
        \"videos\": []
      }" | jq '.'
}

# ========================================
# 4. Mechanic - Arıza Bildirimlerini Listele
# ========================================
test_get_mechanic_fault_reports() {
    echo -e "${BLUE}[TEST] Mechanic - Arıza Bildirimlerini Listele${NC}"
    local token="$1"
    local status="${2:-all}"
    
    curl -s -X GET "$API_BASE_URL/fault-reports/mechanic/reports?status=$status" \
      -H "Authorization: Bearer $token" | jq '.'
}

# ========================================
# 5. Mechanic - Arıza Bildirimi Detayı
# ========================================
test_get_mechanic_fault_report_detail() {
    echo -e "${BLUE}[TEST] Mechanic - Arıza Bildirimi Detayı${NC}"
    local token="$1"
    local fault_report_id="$2"
    
    curl -s -X GET "$API_BASE_URL/fault-reports/mechanic/$fault_report_id" \
      -H "Authorization: Bearer $token" | jq '.'
}

# ========================================
# 6. Mechanic - Teklif Ver
# ========================================
test_submit_quote() {
    echo -e "${BLUE}[TEST] Mechanic - Teklif Ver${NC}"
    local token="$1"
    local fault_report_id="$2"
    local quote_amount="${3:-5000}"
    local duration="${4:-5-7 gün}"
    local notes="${5:-Ön tampon boyama ve çizik düzeltme işlemi yapılacak}"
    
    curl -s -X POST "$API_BASE_URL/fault-reports/$fault_report_id/quote" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "{
        \"quoteAmount\": $quote_amount,
        \"estimatedDuration\": \"$duration\",
        \"notes\": \"$notes\"
      }" | jq '.'
}

# ========================================
# 7. Driver - Arıza Bildirimi Detayı
# ========================================
test_get_driver_fault_report_detail() {
    echo -e "${BLUE}[TEST] Driver - Arıza Bildirimi Detayı${NC}"
    local token="$1"
    local fault_report_id="$2"
    
    curl -s -X GET "$API_BASE_URL/fault-reports/$fault_report_id" \
      -H "Authorization: Bearer $token" | jq '.'
}

# ========================================
# 8. Driver - Teklif Seç
# ========================================
test_select_quote() {
    echo -e "${BLUE}[TEST] Driver - Teklif Seç${NC}"
    local token="$1"
    local fault_report_id="$2"
    local mechanic_id="$3"
    local quote_amount="${4:-5000}"
    
    curl -s -X POST "$API_BASE_URL/fault-reports/$fault_report_id/select-quote" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "{
        \"mechanicId\": \"$mechanic_id\",
        \"quoteAmount\": $quote_amount
      }" | jq '.'
}

# ========================================
# 9. Driver - Randevu Oluştur (Otomatik BodyworkJob)
# ========================================
test_create_appointment_from_fault_report() {
    echo -e "${BLUE}[TEST] Driver - Randevu Oluştur (Otomatik BodyworkJob)${NC}"
    local token="$1"
    local fault_report_id="$2"
    
    # 3 gün sonra
    local appointment_date=$(date -u -v+3d +"%Y-%m-%dT10:00:00.000Z" 2>/dev/null || date -u -d "+3 days" +"%Y-%m-%dT10:00:00.000Z" 2>/dev/null || date -u +"%Y-%m-%dT10:00:00.000Z")
    
    curl -s -X POST "$API_BASE_URL/fault-reports/$fault_report_id/create-appointment" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "{
        \"faultReportId\": \"$fault_report_id\",
        \"appointmentDate\": \"$appointment_date\",
        \"timeSlot\": \"10:00-12:00\"
      }" | jq '.'
}

# ========================================
# 10. Mechanic - Manuel Dönüşüm (Kaporta İşine Dönüştür)
# ========================================
test_convert_to_bodywork_job() {
    echo -e "${BLUE}[TEST] Mechanic - Manuel Dönüşüm (Kaporta İşine Dönüştür)${NC}"
    local token="$1"
    local fault_report_id="$2"
    local mechanic_id="$3"
    
    curl -s -X POST "$API_BASE_URL/fault-reports/$fault_report_id/convert-to-bodywork-job" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "{
        \"mechanicId\": \"$mechanic_id\"
      }" | jq '.'
}

# ========================================
# 11. Mechanic - Bodywork İşlerini Listele
# ========================================
test_get_mechanic_bodywork_jobs() {
    echo -e "${BLUE}[TEST] Mechanic - Bodywork İşlerini Listele${NC}"
    local token="$1"
    local status="${2:-all}"
    local page="${3:-1}"
    local limit="${4:-10}"
    
    curl -s -X GET "$API_BASE_URL/bodywork/mechanic-jobs?status=$status&page=$page&limit=$limit" \
      -H "Authorization: Bearer $token" | jq '.'
}

# ========================================
# 12. Driver - Bodywork İşlerini Listele
# ========================================
test_get_driver_bodywork_jobs() {
    echo -e "${BLUE}[TEST] Driver - Bodywork İşlerini Listele${NC}"
    local token="$1"
    local status="${2:-all}"
    local page="${3:-1}"
    local limit="${4:-10}"
    
    curl -s -X GET "$API_BASE_URL/bodywork/customer/jobs?status=$status&page=$page&limit=$limit" \
      -H "Authorization: Bearer $token" | jq '.'
}

# ========================================
# 13. Driver - BodyworkJob Detayı
# ========================================
test_get_driver_bodywork_job_detail() {
    echo -e "${BLUE}[TEST] Driver - BodyworkJob Detayı${NC}"
    local token="$1"
    local job_id="$2"
    
    curl -s -X GET "$API_BASE_URL/bodywork/customer/$job_id" \
      -H "Authorization: Bearer $token" | jq '.'
}

# ========================================
# 14. Mechanic - BodyworkJob Detayı
# ========================================
test_get_mechanic_bodywork_job_detail() {
    echo -e "${BLUE}[TEST] Mechanic - BodyworkJob Detayı${NC}"
    local token="$1"
    local job_id="$2"
    
    curl -s -X GET "$API_BASE_URL/bodywork/$job_id" \
      -H "Authorization: Bearer $token" | jq '.'
}

# ========================================
# 15. FaultReport BodyworkJobId Kontrolü
# ========================================
test_check_fault_report_bodywork_job_id() {
    echo -e "${BLUE}[TEST] FaultReport BodyworkJobId Kontrolü${NC}"
    local token="$1"
    local fault_report_id="$2"
    
    local response=$(curl -s -X GET "$API_BASE_URL/fault-reports/$fault_report_id" \
      -H "Authorization: Bearer $token")
    
    echo "$response" | jq '.'
    
    if echo "$response" | grep -q "bodyworkJobId"; then
        echo -e "${GREEN}✅ BodyworkJobId mevcut!${NC}"
        echo "$response" | jq '.data.bodyworkJobId'
    else
        echo -e "${YELLOW}⚠ BodyworkJobId bulunamadı${NC}"
    fi
}

# ========================================
# 16. BodyworkJob Teklif Hazırlama
# ========================================
test_prepare_bodywork_quote() {
    echo -e "${BLUE}[TEST] BodyworkJob Teklif Hazırlama${NC}"
    local token="$1"
    local job_id="$2"
    local mechanic_id="$3"
    
    curl -s -X POST "$API_BASE_URL/bodywork/$job_id/prepare-quote" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "{
        \"partsToReplace\": [
          {
            \"partName\": \"Ön Tampon\",
            \"brand\": \"Orijinal\",
            \"quantity\": 1,
            \"unitPrice\": 2000,
            \"notes\": \"Orijinal yedek parça\"
          }
        ],
        \"partsToRepair\": [
          {
            \"partName\": \"Ön Tampon Düzeltme\",
            \"laborHours\": 4,
            \"laborRate\": 500,
            \"notes\": \"Çizik düzeltme ve boya\"
          }
        ],
        \"paintMaterials\": [
          {
            \"materialName\": \"Boya\",
            \"quantity\": 2,
            \"unitPrice\": 500,
            \"notes\": \"Araç rengi\"
          }
        ],
        \"validityDays\": 30
      }" | jq '.'
}

# ========================================
# 17. BodyworkJob Teklif Gönderme
# ========================================
test_send_bodywork_quote() {
    echo -e "${BLUE}[TEST] BodyworkJob Teklif Gönderme${NC}"
    local token="$1"
    local job_id="$2"
    
    curl -s -X POST "$API_BASE_URL/bodywork/$job_id/send-quote" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "{}" | jq '.'
}

# ========================================
# 18. BodyworkJob Teklif Onaylama/Reddetme
# ========================================
test_respond_to_bodywork_quote() {
    echo -e "${BLUE}[TEST] BodyworkJob Teklif Onaylama/Reddetme${NC}"
    local token="$1"
    local job_id="$2"
    local action="${3:-accept}"  # accept veya reject
    local rejection_reason="${4:-}"
    
    local data="{\"action\": \"$action\"}"
    if [ "$action" = "reject" ] && [ -n "$rejection_reason" ]; then
        data="{\"action\": \"$action\", \"rejectionReason\": \"$rejection_reason\"}"
    fi
    
    curl -s -X POST "$API_BASE_URL/bodywork/$job_id/respond-to-quote" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "$data" | jq '.'
}

# ========================================
# Kullanım Örnekleri
# ========================================
usage() {
    echo "Kullanım:"
    echo "  $0 <function_name> [parameters...]"
    echo ""
    echo "Örnekler:"
    echo "  $0 test_driver_login driver@test.com test123"
    echo "  $0 test_create_bodywork_fault_report <token> <vehicle_id>"
    echo "  $0 test_submit_quote <token> <fault_report_id> 5000"
    echo "  $0 test_convert_to_bodywork_job <token> <fault_report_id> <mechanic_id>"
    echo ""
    echo "Tüm fonksiyonlar:"
    grep "^test_.*()" "$0" | sed 's/() {/'
}

# Main
if [ "$#" -eq 0 ]; then
    usage
    exit 1
fi

# Fonksiyonu çağır
"$@"

